import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { catchAsync } from "@/lib/errors";
import { hasPermission, Permission } from "@/lib/permissions";
import { getClientIp } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";

export const GET = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, Permission.DOCUMENT_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const projectId = formData.get("projectId") as string | null;
  const folderId = formData.get("folderId") as string | null;
  const tagsStr = formData.get("tags") as string | null;
  const phase = formData.get("phase") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "File and title are required" }, { status: 400 });
  }

  // Check file size
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "209715200", 10); // 200 MB
  if (file.size > maxFileSize) {
    return NextResponse.json(
      { error: `File size exceeds maximum of ${maxFileSize / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // Upload to S3
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { s3Key, s3Bucket, fileSize, iv } = await uploadFile({
    companyId: user.companyId,
    fileName: file.name,
    fileContent: buffer,
    mimeType: file.type,
    encrypt: true,
  });

  // Parse tags
  const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [];

  // Create document record
  const document = await prisma.document.create({
    data: {
      title,
      description: description || undefined,
      s3Key,
      s3Bucket,
      fileName: file.name,
      fileSize: BigInt(fileSize),
      mimeType: file.type,
      isEncrypted: true,
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
    details: { title, s3Key, fileSize },
    ipAddress: getClientIp(req),
    userId: user.id,
    companyId: user.companyId,
  });

  return NextResponse.json({ document }, { status: 201 });
});
