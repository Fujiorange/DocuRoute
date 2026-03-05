import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyTwoFactorToken } from "@/lib/two-factor";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";

export const POST = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Get user's secret
  const secret2FA = await prisma.twoFactorSecret.findUnique({
    where: { userId: user.id },
  });

  if (!secret2FA) {
    return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
  }

  // Verify token
  const isValid = verifyTwoFactorToken(token, secret2FA.secret);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Enable 2FA for user
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });

  return NextResponse.json({ message: "2FA enabled successfully" });
});
