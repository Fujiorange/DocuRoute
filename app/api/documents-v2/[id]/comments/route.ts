import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";
import { hasPermission, Permission } from "@/lib/permissions";

export const GET = catchAsync(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;

  const comments = await prisma.comment.findMany({
    where: {
      documentId: resolvedParams.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ comments });
});

export const POST = catchAsync(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, Permission.COMMENT_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const { content, parentId } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Comment content required" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      documentId: resolvedParams.id,
      userId: user.id,
      parentId: parentId || undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
});
