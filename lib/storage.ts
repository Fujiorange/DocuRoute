import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "docuroute-documents";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production";

/**
 * Encrypt data using AES-256-CBC
 */
function encrypt(data: Buffer): { encrypted: Buffer; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return {
    encrypted,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt data using AES-256-CBC
 */
function decrypt(data: Buffer, ivHex: string): Buffer {
  const iv = Buffer.from(ivHex, "hex");
  const key = Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
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
}

/**
 * Upload a file to S3 with optional encryption
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { companyId, fileName, fileContent, mimeType, encrypt: shouldEncrypt = true } = options;

  let finalContent = fileContent;
  let iv: string | undefined;

  // Encrypt if enabled
  if (shouldEncrypt) {
    const encrypted = encrypt(fileContent);
    finalContent = encrypted.encrypted;
    iv = encrypted.iv;
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
export async function downloadFile(s3Key: string, iv?: string): Promise<Buffer> {
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

  // Decrypt if IV is provided
  if (iv) {
    return decrypt(buffer, iv);
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
