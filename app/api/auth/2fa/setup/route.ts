import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateTwoFactorSecret, generateQRCode } from "@/lib/two-factor";
import { prisma } from "@/lib/prisma";
import { catchAsync } from "@/lib/errors";

export const POST = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate secret
  const { secret, otpauthUrl } = generateTwoFactorSecret(user.email);

  // Generate QR code
  const qrCode = await generateQRCode(otpauthUrl);

  // Store secret (not enabled yet)
  await prisma.twoFactorSecret.upsert({
    where: { userId: user.id },
    update: { secret },
    create: { userId: user.id, secret },
  });

  return NextResponse.json({
    secret,
    qrCode,
    otpauthUrl,
  });
});
