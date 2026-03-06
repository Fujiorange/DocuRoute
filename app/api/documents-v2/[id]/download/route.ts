import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/storage";
import { catchAsync } from "@/lib/errors";
import { hasPermission, Permission } from "@/lib/permissions";

export const GET = catchAsync(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, Permission.DOCUMENT_DOWNLOAD)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const document = await prisma.document.findFirst({
    where: {
      id: resolvedParams.id,
      companyId: user.companyId,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Generate signed URL for download
  const downloadUrl = await getDownloadUrl(document.s3Key, 3600); // 1 hour expiry

  return NextResponse.json({
    downloadUrl,
    fileName: document.fileName,
    fileSize: document.fileSize.toString(),
    mimeType: document.mimeType,
  });
});
