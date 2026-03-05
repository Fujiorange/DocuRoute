import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";
import { hasPermission, Permission } from "@/lib/permissions";
import { sendApprovalRequestNotification } from "@/lib/email";

export const POST = catchAsync(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, Permission.DOCUMENT_APPROVE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const { status } = await req.json(); // "pending", "approved", "rejected"

  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const document = await prisma.document.findFirst({
    where: {
      id: resolvedParams.id,
      companyId: user.companyId,
    },
    include: {
      uploadedBy: true,
      project: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Update document status
  const updated = await prisma.document.update({
    where: { id: resolvedParams.id },
    data: {
      status,
      ...(status === "approved" && {
        approvedById: user.id,
        approvedAt: new Date(),
      }),
    },
    include: {
      approvedBy: { select: { id: true, name: true } },
    },
  });

  // Send notification if requesting approval
  if (status === "pending" && document.project) {
    // Find project admin or IT admin to notify
    const admins = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: { in: ["it_admin", "project_admin"] },
        isActive: true,
      },
      take: 5,
    });

    for (const admin of admins) {
      await sendApprovalRequestNotification(
        admin.email,
        user.name,
        document.title,
        document.project.name
      );
    }
  }

  return NextResponse.json({ document: updated });
});
