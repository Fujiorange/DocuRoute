import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitations = await prisma.invitation.findMany({
    where: { companyId: user.companyId, acceptedAt: null },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        companyId: user.companyId,
        invitedById: user.id,
      },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Stub: In production, send real email
    console.log(`[DocuRoute] Invitation email would be sent to ${email}`);
    console.log(`[DocuRoute] Invitation link: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`);

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An invitation for this email already exists" }, { status: 409 });
    }
    console.error("Create invitation error:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
