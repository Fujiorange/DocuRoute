import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { catchAsync } from "@/lib/errors";
import { withRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export const POST = withRateLimit(
  catchAsync(async (req: NextRequest) => {
    const { email, companyId } = await req.json();

    if (!email || !companyId) {
      return NextResponse.json({ error: "Email and company ID required" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email, companyId, isActive: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.passwordReset.create({
      data: {
        token,
        email,
        companyId,
        expiresAt,
      },
    });

    // Send email
    await sendPasswordResetEmail(user.email, user.name, token);

    return NextResponse.json({
      message: "If an account exists, a password reset link has been sent",
    });
  })
);
