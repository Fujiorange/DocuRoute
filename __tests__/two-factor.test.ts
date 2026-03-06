import { describe, it, expect } from "vitest";
import { verifyTwoFactorToken } from "@/lib/two-factor";
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
});
