import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "docuroute-dev-secret-change-in-production";

// Convert secret to Uint8Array for jose
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
}

/**
 * Sign a JWT token using jose (Edge-compatible)
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET_KEY);
}

/**
 * Verify a JWT token using jose (Edge-compatible)
 * Returns the payload if valid, null if invalid/expired
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
