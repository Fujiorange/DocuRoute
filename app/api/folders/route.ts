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

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const folders = await prisma.folder.findMany({
    where: {
      companyId: user.companyId,
      ...(projectId && { projectId }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      _count: {
        select: {
          documents: true,
          children: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ folders });
});

export const POST = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, Permission.FOLDER_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, projectId, parentId } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Folder name required" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: {
      name,
      description,
      companyId: user.companyId,
      projectId: projectId || undefined,
      parentId: parentId || undefined,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ folder }, { status: 201 });
});
