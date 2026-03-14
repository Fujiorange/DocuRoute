export type ErrorCategory = 'SYSTEM_ERROR' | 'COMPLIANCE_VIOLATION'

export class DocuRouteError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public category: ErrorCategory = 'SYSTEM_ERROR',
    public metadata?: object
  ) {
    super(message)
    this.name = 'DocuRouteError'
  }
}

/**
 * COMPLIANCE_VIOLATION errors trigger an immediate AuditVaultEntry
 * when caught by withApiHandler.
 *
 * SYSTEM_ERROR: infrastructure failure  IT problem.
 * COMPLIANCE_VIOLATION: permission/regulatory boundary crossed  legal problem.
 */

export function notFound(resource: string): DocuRouteError {
  return new DocuRouteError(
    'NOT_FOUND',
    `${resource} not found`,
    404,
    'SYSTEM_ERROR'
  )
}

export function forbidden(operation: string): DocuRouteError {
  return new DocuRouteError(
    'FORBIDDEN',
    `You do not have permission to ${operation}`,
    403,
    'COMPLIANCE_VIOLATION'
  )
}

export function unauthorized(): DocuRouteError {
  return new DocuRouteError(
    'UNAUTHORIZED',
    'You must be logged in to access this resource',
    401,
    'COMPLIANCE_VIOLATION'
  )
}

export function validationError(field: string, message: string): DocuRouteError {
  return new DocuRouteError(
    'VALIDATION_ERROR',
    `${field}: ${message}`,
    422,
    'SYSTEM_ERROR',
    { field }
  )
}

export function legalHoldActive(holdIds: string[]): DocuRouteError {
  return new DocuRouteError(
    'LEGAL_HOLD_ACTIVE',
    'This operation is blocked by an active legal hold',
    409,
    'COMPLIANCE_VIOLATION',
    { holdIds }
  )
}

export function transmittalLinked(transmittalIds: string[]): DocuRouteError {
  return new DocuRouteError(
    'TRANSMITTAL_LINKED',
    'Cannot modify document that is linked to active transmittals',
    409,
    'COMPLIANCE_VIOLATION',
    { transmittalIds }
  )
}

export function seatLimitReached(limit: number, current: number): DocuRouteError {
  return new DocuRouteError(
    'SEAT_LIMIT_REACHED',
    `Your plan allows ${limit} users. You currently have ${current} users.`,
    402,
    'SYSTEM_ERROR',
    { limit, current }
  )
}

export function rateLimitExceeded(retryAfter: number): DocuRouteError {
  return new DocuRouteError(
    'RATE_LIMIT_EXCEEDED',
    'Too many requests. Please try again later.',
    429,
    'SYSTEM_ERROR',
    { retryAfter }
  )
}

export function undoWindowExpired(): DocuRouteError {
  return new DocuRouteError(
    'UNDO_WINDOW_EXPIRED',
    'The undo window for this operation has expired',
    410,
    'SYSTEM_ERROR'
  )
}

export function complianceViolation(
  code: string,
  message: string,
  metadata?: object
): DocuRouteError {
  return new DocuRouteError(
    code,
    message,
    403,
    'COMPLIANCE_VIOLATION',
    metadata
  )
}
