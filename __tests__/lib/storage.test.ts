import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// Set env vars before module import
const TEST_KEY = crypto.randomBytes(32).toString("hex");
process.env.ENCRYPTION_KEY = TEST_KEY;
process.env.AWS_ACCESS_KEY_ID = "test-key";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
process.env.AWS_S3_BUCKET = "test-bucket";
process.env.AWS_REGION = "ap-southeast-1";

// Create hoisted mock so it's available in vi.mock factory AND in tests
const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = mockSend;
  }
  class MockPutObjectCommand {
    params: unknown;
    constructor(p: unknown) { this.params = p; }
  }
  class MockGetObjectCommand {
    params: unknown;
    constructor(p: unknown) { this.params = p; }
  }
  class MockDeleteObjectCommand {
    params: unknown;
    constructor(p: unknown) { this.params = p; }
  }
  class MockHeadObjectCommand {
    params: unknown;
    constructor(p: unknown) { this.params = p; }
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
    GetObjectCommand: MockGetObjectCommand,
    DeleteObjectCommand: MockDeleteObjectCommand,
    HeadObjectCommand: MockHeadObjectCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/signed-url"),
}));

const {
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
  getDownloadUrl,
  validateEncryptionConfig,
  DecryptionError,
} = await import("../../lib/storage");

beforeEach(() => {
  mockSend.mockReset();
});

// ---- uploadFile ----
describe("uploadFile", () => {
  it("uploads with encryption (default) and returns s3Key, iv, authTag", async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await uploadFile({
      companyId: "c1",
      fileName: "drawing.pdf",
      fileContent: Buffer.from("PDF content"),
      mimeType: "application/pdf",
    });

    expect(result.s3Key).toMatch(/^c1\//);
    expect(result.s3Bucket).toBe("test-bucket");
    expect(result.iv).toBeDefined();
    expect(result.authTag).toBeDefined();
    expect(result.fileSize).toBeGreaterThan(0);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("uploads without encryption when encrypt=false", async () => {
    mockSend.mockResolvedValueOnce({});
    const content = Buffer.from("plain text");

    const result = await uploadFile({
      companyId: "c2",
      fileName: "readme.txt",
      fileContent: content,
      mimeType: "text/plain",
      encrypt: false,
    });

    expect(result.iv).toBeUndefined();
    expect(result.authTag).toBeUndefined();
    expect(result.fileSize).toBe(content.length);
  });

  it("sanitizes file name path traversal characters", async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await uploadFile({
      companyId: "co",
      fileName: "../../etc/passwd",
      fileContent: Buffer.from("data"),
      mimeType: "text/plain",
    });

    // Should not contain the traversal path
    expect(result.s3Key).not.toContain("../../etc/passwd");
    expect(result.s3Key.startsWith("co/")).toBe(true);
  });
});

// ---- downloadFile ----
describe("downloadFile", () => {
  it("downloads and decrypts a file correctly", async () => {
    const plaintext = Buffer.from("Sensitive document");
    const key = Buffer.from(TEST_KEY, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    mockSend.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => new Uint8Array(encrypted) },
    });

    const result = await downloadFile(
      "co/test.pdf",
      iv.toString("hex"),
      authTag.toString("hex")
    );
    expect(result.toString()).toBe("Sensitive document");
  });

  it("downloads without decryption when no iv/authTag provided", async () => {
    const content = Buffer.from("plain file");
    mockSend.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => new Uint8Array(content) },
    });

    const result = await downloadFile("co/plain.txt");
    expect(result.toString()).toBe("plain file");
  });

  it("throws DecryptionError on tampered ciphertext", async () => {
    const key = Buffer.from(TEST_KEY, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from("data")), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const tampered = Buffer.from(encrypted);
    tampered[0] = tampered[0] ^ 0xff;

    mockSend.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => new Uint8Array(tampered) },
    });

    await expect(
      downloadFile("co/tampered.pdf", iv.toString("hex"), authTag.toString("hex"))
    ).rejects.toBeInstanceOf(DecryptionError);
  });

  it("throws when S3 returns no body", async () => {
    mockSend.mockResolvedValueOnce({ Body: null });

    await expect(downloadFile("co/missing.pdf")).rejects.toThrow(
      "Failed to download file from S3"
    );
  });
});

// ---- deleteFile ----
describe("deleteFile", () => {
  it("resolves successfully and calls S3 send", async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(deleteFile("co/doc.pdf")).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

// ---- fileExists ----
describe("fileExists", () => {
  it("returns true when HeadObject succeeds", async () => {
    mockSend.mockResolvedValueOnce({ ContentLength: 100 });
    expect(await fileExists("co/existing.pdf")).toBe(true);
  });

  it("returns false when HeadObject throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("NoSuchKey"));
    expect(await fileExists("co/missing.pdf")).toBe(false);
  });
});

// ---- getDownloadUrl ----
describe("getDownloadUrl", () => {
  it("returns a presigned URL", async () => {
    const url = await getDownloadUrl("co/doc.pdf");
    expect(typeof url).toBe("string");
    expect(url).toContain("s3.example.com");
  });

  it("accepts a custom expiry", async () => {
    const url = await getDownloadUrl("co/doc.pdf", 3600);
    expect(typeof url).toBe("string");
  });
});

// ---- validateEncryptionConfig ----
describe("validateEncryptionConfig", () => {
  it("does not throw with a valid 32-byte key", () => {
    expect(() => validateEncryptionConfig()).not.toThrow();
  });
});

// ---- DecryptionError ----
describe("DecryptionError", () => {
  it("is an instance of Error with correct name", () => {
    const err = new DecryptionError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DecryptionError");
  });

  it("uses a custom message", () => {
    const err = new DecryptionError("custom msg");
    expect(err.message).toBe("custom msg");
  });
});
