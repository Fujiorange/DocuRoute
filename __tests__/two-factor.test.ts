import { describe, it, expect } from "vitest";
import {
  verifyTwoFactorToken,
  generateTwoFactorSecret,
  generateQRCode,
  generateBackupCodes,
} from "@/lib/two-factor";
import speakeasy from "speakeasy";

describe("Two-Factor Authentication", () => {
  it("should verify valid TOTP token", () => {
    const secret = speakeasy.generateSecret();
    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
    });

    const isValid = verifyTwoFactorToken(token, secret.base32);
    expect(isValid).toBe(true);
  });

  it("should reject invalid TOTP token", () => {
    const secret = speakeasy.generateSecret();
    const invalidToken = "000000";

    const isValid = verifyTwoFactorToken(invalidToken, secret.base32);
    expect(isValid).toBe(false);
  });

  it("should generate a valid TOTP secret for an email", () => {
    const result = generateTwoFactorSecret("user@example.com");

    expect(result.secret).toBeDefined();
    expect(typeof result.secret).toBe("string");
    expect(result.secret.length).toBeGreaterThan(0);
    expect(result.otpauthUrl).toBeDefined();
    expect(result.otpauthUrl).toContain("DocuRoute");
    expect(result.otpauthUrl).toContain("user%40example.com");
  });

  it("should generate different secrets for different emails", () => {
    const result1 = generateTwoFactorSecret("user1@example.com");
    const result2 = generateTwoFactorSecret("user2@example.com");

    expect(result1.secret).not.toBe(result2.secret);
  });

  it("should generate a QR code data URL from an otpauth URL", async () => {
    const { otpauthUrl } = generateTwoFactorSecret("qrtest@example.com");
    const dataUrl = await generateQRCode(otpauthUrl);

    expect(dataUrl).toBeDefined();
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it("should generate the default 10 backup codes", () => {
    const codes = generateBackupCodes();

    expect(codes).toHaveLength(10);
    codes.forEach((code) => {
      expect(typeof code).toBe("string");
      expect(code.length).toBe(8);
    });
  });

  it("should generate the requested number of backup codes", () => {
    const codes = generateBackupCodes(5);

    expect(codes).toHaveLength(5);
  });

  it("should generate uppercase alphanumeric backup codes", () => {
    const codes = generateBackupCodes(20);

    codes.forEach((code) => {
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });
  });

  it("generated secret should produce a verifiable TOTP token", () => {
    const { secret } = generateTwoFactorSecret("verify@example.com");

    const token = speakeasy.totp({ secret, encoding: "base32" });
    expect(verifyTwoFactorToken(token, secret)).toBe(true);
  });
});
