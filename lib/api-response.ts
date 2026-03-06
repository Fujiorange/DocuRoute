import { NextResponse } from "next/server";

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Structured error response helper for consistent API error handling
 */
export function errorResponse(
  message: string,
  status: number = 400,
  options?: {
    code?: string;
    details?: unknown;
  }
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: options?.code,
      details: options?.details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Success response helper with optional data
 */
export function successResponse<T = unknown>(
  data?: T,
  status: number = 200
): NextResponse<T> {
  return NextResponse.json(data as T, { status });
}

/**
 * Validation error response (400)
 */
export function validationError(message: string, details?: unknown): NextResponse<ErrorResponse> {
  return errorResponse(message, 400, {
    code: "VALIDATION_ERROR",
    details,
  });
}

/**
 * Unauthorized error response (401)
 */
export function unauthorizedError(message: string = "Unauthorized"): NextResponse<ErrorResponse> {
  return errorResponse(message, 401, {
    code: "UNAUTHORIZED",
  });
}

/**
 * Forbidden error response (403)
 */
export function forbiddenError(message: string = "Forbidden"): NextResponse<ErrorResponse> {
  return errorResponse(message, 403, {
    code: "FORBIDDEN",
  });
}

/**
 * Not found error response (404)
 */
export function notFoundError(message: string = "Not found"): NextResponse<ErrorResponse> {
  return errorResponse(message, 404, {
    code: "NOT_FOUND",
  });
}

/**
 * Rate limit error response (429)
 */
export function rateLimitError(message: string = "Too many requests"): NextResponse<ErrorResponse> {
  return errorResponse(message, 429, {
    code: "RATE_LIMIT_EXCEEDED",
  });
}

/**
 * Internal server error response (500)
 */
export function internalServerError(
  message: string = "Internal server error",
  details?: unknown
): NextResponse<ErrorResponse> {
  return errorResponse(message, 500, {
    code: "INTERNAL_SERVER_ERROR",
    details: process.env.NODE_ENV === "development" ? details : undefined,
  });
}
