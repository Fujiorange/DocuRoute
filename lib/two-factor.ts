import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";

/**
 * Generate a TOTP secret for 2FA
 */
export function generateTwoFactorSecret(email: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `DocuRoute (${email})`,
    issuer: "DocuRoute",
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url || "",
  };
}

/**
 * Generate QR code for 2FA setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify a TOTP token
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before and after for clock drift
  });
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }

  return codes;
}
