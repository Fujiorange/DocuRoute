import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";
import { hasPermission, Permission } from "@/lib/permissions";

export const GET = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only IT admins can view analytics
  if (!hasPermission(user.role, Permission.AUDIT_LOG_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get company statistics
  const [totalUsers, totalProjects, totalDocuments, totalFolders] = await Promise.all([
    prisma.user.count({ where: { companyId: user.companyId, isActive: true } }),
    prisma.project.count({ where: { companyId: user.companyId } }),
    prisma.document.count({ where: { companyId: user.companyId } }),
    prisma.folder.count({ where: { companyId: user.companyId } }),
  ]);

  // Get storage usage
  const storageResult = await prisma.document.aggregate({
    where: { companyId: user.companyId },
    _sum: { fileSize: true },
  });

  const storageUsed = storageResult._sum.fileSize || BigInt(0);

  // Get company settings
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { storageLimit: true },
  });

  const storageLimit = company?.storageLimit || BigInt(107374182400); // 100 GB default

  // Get document status breakdown
  const documentsByStatus = await prisma.document.groupBy({
    by: ["status"],
    where: { companyId: user.companyId },
    _count: { status: true },
  });

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentActivity = await prisma.auditLog.groupBy({
    by: ["action"],
    where: {
      companyId: user.companyId,
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: { action: true },
    orderBy: { _count: { action: "desc" } },
    take: 10,
  });

  // Get top uploaders
  const topUploaders = await prisma.document.groupBy({
    by: ["uploadedById"],
    where: { companyId: user.companyId },
    _count: { uploadedById: true },
    orderBy: { _count: { uploadedById: "desc" } },
    take: 10,
  });

  const uploaderDetails = await prisma.user.findMany({
    where: { id: { in: topUploaders.map((u) => u.uploadedById) } },
    select: { id: true, name: true, email: true },
  });

  const topUploadersWithNames = topUploaders.map((u) => ({
    ...u,
    user: uploaderDetails.find((d) => d.id === u.uploadedById),
  }));

  return NextResponse.json({
    overview: {
      totalUsers,
      totalProjects,
      totalDocuments,
      totalFolders,
      storageUsed: storageUsed.toString(),
      storageLimit: storageLimit.toString(),
      storageUsedPercentage: Number((storageUsed * BigInt(100)) / storageLimit),
    },
    documentsByStatus,
    recentActivity,
    topUploaders: topUploadersWithNames,
  });
});
