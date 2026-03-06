import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { catchAsync } from "@/lib/errors";
import { hasPermission, Permission } from "@/lib/permissions";
import { getClientIp } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { validationError, forbiddenError, unauthorizedError } from "@/lib/api-response";

// Zod schema for document upload validation
const documentUploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional().nullable(),
  projectId: z.string().uuid("Invalid project ID").optional().nullable(),
  folderId: z.string().uuid("Invalid folder ID").optional().nullable(),
  tags: z.string().optional().nullable(),
  phase: z.enum(["design", "construction", "handover"]).optional().nullable(),
});

// Allowed MIME types for documents
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];

// Sanitize filename to prevent path traversal and other issues
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace non-alphanumeric chars
    .replace(/\.+/g, ".") // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, "") // Remove leading/trailing dots
    .slice(0, 255); // Limit length
}

export const GET = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedError();
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = {
    companyId: user.companyId,
    ...(projectId && { projectId }),
    ...(folderId && { folderId }),
    ...(status && { status }),
  };

  // Basic search on title and description
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      _count: {
        select: {
          comments: true,
          versions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
});

export const POST = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedError();
  }

  if (!hasPermission(user.role, Permission.DOCUMENT_CREATE)) {
    return forbiddenError("You do not have permission to create documents");
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  // Validate file exists
  if (!file) {
    return validationError("File is required");
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return validationError(
      `File type ${file.type} is not allowed. Allowed types: PDF, Word, Excel, images, text, and ZIP files.`,
      { allowedTypes: ALLOWED_MIME_TYPES }
    );
  }

  // Check file size
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "209715200", 10); // 200 MB
  if (file.size > maxFileSize) {
    return validationError(
      `File size exceeds maximum of ${maxFileSize / 1024 / 1024}MB`,
      { maxSize: maxFileSize, actualSize: file.size }
    );
  }

  // Validate form data with Zod
  const formDataObj = {
    title: formData.get("title") as string,
    description: formData.get("description") as string | null,
    projectId: formData.get("projectId") as string | null,
    folderId: formData.get("folderId") as string | null,
    tags: formData.get("tags") as string | null,
    phase: formData.get("phase") as string | null,
  };

  const validation = documentUploadSchema.safeParse(formDataObj);
  if (!validation.success) {
    return validationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const { title, description, projectId, folderId, tags: tagsStr, phase } = validation.data;

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  // Upload to S3
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { s3Key, s3Bucket, fileSize, iv, authTag } = await uploadFile({
    companyId: user.companyId,
    fileName: sanitizedFilename,
    fileContent: buffer,
    mimeType: file.type,
    encrypt: true,
  });

  // Parse tags
  const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // Create document record
  const document = await prisma.document.create({
    data: {
      title,
      description: description || undefined,
      s3Key,
      s3Bucket,
      fileName: sanitizedFilename,
      fileSize: BigInt(fileSize),
      mimeType: file.type,
      isEncrypted: true,
      encryptionIV: iv,
      encryptionAuthTag: authTag,
      tags,
      phase: phase || undefined,
      companyId: user.companyId,
      projectId: projectId || undefined,
      folderId: folderId || undefined,
      uploadedById: user.id,
      status: "draft",
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  // Create audit log
  await createAuditLog({
    action: "document.upload",
    entity: "Document",
    entityId: document.id,
    details: { title, s3Key, fileSize, sanitizedFilename },
    ipAddress: getClientIp(req),
    userId: user.id,
    companyId: user.companyId,
  });

  return NextResponse.json({ document }, { status: 201 });
});
