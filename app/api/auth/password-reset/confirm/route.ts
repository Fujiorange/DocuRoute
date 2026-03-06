import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";
import { withRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export const POST = withRateLimit(
  catchAsync(async (req: NextRequest) => {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password required" }, { status: 400 });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find valid reset token
    const resetRequest = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRequest || resetRequest.usedAt || resetRequest.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: {
        companyId_email: {
          companyId: resetRequest.companyId,
          email: resetRequest.email,
        },
      },
      data: { passwordHash },
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  })
);
