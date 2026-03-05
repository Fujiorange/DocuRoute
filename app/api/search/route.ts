import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";

export const GET = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: {
      companyId: user.companyId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { fileName: { contains: query, mode: "insensitive" } },
        { tags: { hasSome: [query] } },
        { phase: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true } },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ query, results: documents, count: documents.length });
});
