import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const skip = (page - 1) * limit;

  const isAdminRole =
    user.role === "it_admin" || user.role === "project_admin";

  const [members, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        email: isAdminRole ? true : false,
        role: true,
        isActive: true,
        createdAt: true,
        twoFactorEnabled: isAdminRole ? true : false,
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { companyId: user.companyId } }),
  ]);

  const activeCount = await prisma.user.count({
    where: { companyId: user.companyId, isActive: true },
  });

  return NextResponse.json({
    members,
    totalCount,
    activeCount,
    page,
    limit,
  });
}
