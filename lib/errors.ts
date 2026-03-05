import { NextResponse } from "next/server";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict") {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super("Validation failed", 422);
    this.errors = errors;
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Send to Sentry in production
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error instanceof ValidationError && { errors: error.errors }),
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: any };

    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this value already exists" },
        { status: 409 }
      );
    }

    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (prismaError.code === "P2003") {
      return NextResponse.json({ error: "Related record not found" }, { status: 400 });
    }
  }

  // Generic error
  return NextResponse.json(
    {
      error: "Internal server error",
      ...(process.env.NODE_ENV !== "production" &&
        error instanceof Error && { details: error.message }),
    },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API routes
 */
export function catchAsync(
  handler: (...args: any[]) => Promise<NextResponse>
): (...args: any[]) => Promise<NextResponse> {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
