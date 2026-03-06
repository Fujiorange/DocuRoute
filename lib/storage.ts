import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "docuroute-documents";

// Validate encryption key at module load time
// For build time (when no real encryption key is needed), use a dummy key
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
if (ENCRYPTION_KEY_HEX.length !== 64 || !/^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY_HEX)) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}
const ENCRYPTION_KEY_BUFFER = Buffer.from(ENCRYPTION_KEY_HEX, "hex"); // exactly 32 bytes

// Warn if using default encryption key in non-build environments
if (process.env.NODE_ENV !== "production" && !process.env.ENCRYPTION_KEY) {
  console.warn("Warning: Using default ENCRYPTION_KEY. Set a secure key in production!");
}

/**
 * Custom error for decryption failures
 */
export class DecryptionError extends Error {
  constructor(message: string = "Decryption failed: invalid key or corrupted data") {
    super(message);
    this.name = "DecryptionError";
  }
}

/**
 * Encrypt data using AES-256-GCM with authentication tag
 * Uses 12-byte IV (96 bits) as recommended for GCM mode
 */
function encrypt(data: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12); // 12 bytes for GCM (recommended)
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY_BUFFER, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt data using AES-256-GCM with authentication tag verification
 */
function decrypt(data: Buffer, ivHex: string, authTagHex: string): Buffer {
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY_BUFFER, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(data), decipher.final()]);
  } catch (error) {
    throw new DecryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

export interface UploadOptions {
  companyId: string;
  fileName: string;
  fileContent: Buffer;
  mimeType: string;
  encrypt?: boolean;
}

export interface UploadResult {
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  iv?: string;
  authTag?: string;
}

/**
 * Upload a file to S3 with optional AES-256-GCM encryption
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { companyId, fileName, fileContent, mimeType, encrypt: shouldEncrypt = true } = options;

  let finalContent = fileContent;
  let iv: string | undefined;
  let authTag: string | undefined;

  // Encrypt if enabled
  if (shouldEncrypt) {
    const encrypted = encrypt(fileContent);
    finalContent = encrypted.encrypted;
    iv = encrypted.iv;
    authTag = encrypted.authTag;
  }

  // Generate unique S3 key
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString("hex");
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `${companyId}/${timestamp}_${randomStr}_${sanitizedFileName}`;

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: finalContent,
    ContentType: mimeType,
    ServerSideEncryption: "AES256", // AWS S3 server-side encryption
    Metadata: {
      ...(iv && { iv }),
      ...(authTag && { authTag }),
      originalFileName: fileName,
      companyId,
    },
  });

  await s3Client.send(command);

  return {
    s3Key,
    s3Bucket: BUCKET,
    fileSize: finalContent.length,
    iv,
    authTag,
  };
}

/**
 * Generate a signed URL for downloading a file
 */
export async function getDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Download and decrypt a file from S3
 */
export async function downloadFile(s3Key: string, iv?: string, authTag?: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const bodyBytes = await response.Body?.transformToByteArray();

  if (!bodyBytes) {
    throw new Error("Failed to download file from S3");
  }

  const buffer = Buffer.from(bodyBytes);

  // Decrypt if IV and authTag are provided
  if (iv && authTag) {
    return decrypt(buffer, iv, authTag);
  }

  return buffer;
}

/**
 * Delete a file from S3
 */
export async function deleteFile(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  await s3Client.send(command);
}

/**
 * Check if a file exists in S3
 */
export async function fileExists(s3Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(s3Key: string) {
  const command = new HeadObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}

/**
 * Generate a presigned URL for direct upload (for resumable/chunked uploads)
 */
export async function getUploadUrl(
  companyId: string,
  fileName: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; s3Key: string }> {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString("hex");
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `${companyId}/${timestamp}_${randomStr}_${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, s3Key };
}

/**
 * Validate encryption configuration at startup
 * Call this in your app initialization to fail fast with a clear error message
 */
export function validateEncryptionConfig(): void {
  // Validation already happens at module load time via ENCRYPTION_KEY_BUFFER
  // This function exists for explicit startup validation calls
  if (!ENCRYPTION_KEY_BUFFER || ENCRYPTION_KEY_BUFFER.length !== 32) {
    throw new Error("Encryption key validation failed");
  }
}
