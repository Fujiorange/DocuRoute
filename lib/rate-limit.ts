import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10); // 15 minutes

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis for distributed rate limiting
 */
export function rateLimit(identifier: string): {
  success: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const record = store[identifier];

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }

  // Create new record or reset if window expired
  if (!record || record.resetTime < now) {
    store[identifier] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };

    return {
      success: true,
      remaining: MAX_REQUESTS - 1,
      resetTime: store[identifier].resetTime,
    };
  }

  // Increment counter
  if (record.count < MAX_REQUESTS) {
    record.count++;
    return {
      success: true,
      remaining: MAX_REQUESTS - record.count,
      resetTime: record.resetTime,
    };
  }

  // Rate limit exceeded
  return {
    success: false,
    remaining: 0,
    resetTime: record.resetTime,
  };
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get identifier (IP address or user ID)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown";

    const result = rateLimit(ip);

    // Add rate limit headers
    const headers = {
      "X-RateLimit-Limit": MAX_REQUESTS.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    };

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "You have exceeded the rate limit. Please try again later.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Call the handler
    const response = await handler(req);

    // Add rate limit headers to successful response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}
