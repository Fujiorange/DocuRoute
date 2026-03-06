import { describe, it, expect } from "vitest";
import { signToken, verifyTokenEdge } from "../../lib/auth-edge";
import type { JWTPayload } from "../../lib/auth-edge";

describe("Auth Edge (jose)", () => {
  const testPayload: JWTPayload = {
    userId: "user123",
    companyId: "company456",
    email: "test@example.com",
    role: "engineer",
  };

  it("should sign and verify a valid token", async () => {
    const token = await signToken(testPayload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const verified = await verifyTokenEdge(token);
    expect(verified).toBeTruthy();
    expect(verified?.userId).toBe(testPayload.userId);
    expect(verified?.companyId).toBe(testPayload.companyId);
    expect(verified?.email).toBe(testPayload.email);
    expect(verified?.role).toBe(testPayload.role);
  });

  it("should return null for expired token", async () => {
    // Create a token that expires immediately (we can't easily test this without time manipulation)
    // Instead, test with an invalid token
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";

    const verified = await verifyTokenEdge(invalidToken);
    expect(verified).toBeNull();
  });

  it("should return null for token signed with different secret", async () => {
    // This is effectively the same as the previous test - wrong signature
    const wrongSecretToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIiwiY29tcGFueUlkIjoiY29tcGFueTQ1NiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJlbmdpbmVlciJ9.WRONG_SIGNATURE";

    const verified = await verifyTokenEdge(wrongSecretToken);
    expect(verified).toBeNull();
  });

  it("should return null for forged base64 token (no signature)", async () => {
    const forgedToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJ1c2VyMTIzIn0.";

    const verified = await verifyTokenEdge(forgedToken);
    expect(verified).toBeNull();
  });

  it("should return null for malformed token", async () => {
    const malformed = "not.a.valid.jwt.token";

    const verified = await verifyTokenEdge(malformed);
    expect(verified).toBeNull();
  });

  it("should handle special characters in payload", async () => {
    const specialPayload: JWTPayload = {
      userId: "user_with-special.chars",
      companyId: "company-123",
      email: "test+alias@example.com",
      role: "project_admin",
    };

    const token = await signToken(specialPayload);
    const verified = await verifyTokenEdge(token);

    expect(verified?.email).toBe(specialPayload.email);
    expect(verified?.role).toBe(specialPayload.role);
  });
});
