import { prismaAdmin } from '@docuroute/db'
import { ViewType } from '@docuroute/types'

/**
 * logDocumentView
 *
 * Records a document view event for compliance auditing.
 * Required for ITAR/export-control industries (maritime, defense, aerospace).
 *
 * Fire-and-forget pattern: Never throws errors to avoid blocking main operations.
 * Uses prismaAdmin to bypass RLS since we explicitly pass companyId.
 *
 * @param options - View logging parameters
 * @param options.documentId - ID of document being viewed
 * @param options.userId - ID of user viewing (null for public QR scans)
 * @param options.companyId - Company ID (required for RLS)
 * @param options.viewType - Type of view (DETAIL_PAGE, PREVIEW, DOWNLOAD, QR_SCAN)
 * @param options.ipAddress - Client IP address (from x-forwarded-for)
 * @param options.userAgent - Client user agent string
 * @param options.sessionId - Optional session ID for grouping views
 */
export async function logDocumentView(options: {
  documentId: string
  userId: string | null
  companyId: string
  viewType: ViewType
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}): Promise<void> {
  try {
    // Use prismaAdmin for INSERT operation - we're explicitly passing companyId
    // RLS policies will still enforce isolation on SELECT queries
    await prismaAdmin.documentView.create({
      data: {
        documentId: options.documentId,
        userId: options.userId,
        companyId: options.companyId,
        viewType: options.viewType,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        sessionId: options.sessionId || null,
      },
    })
  } catch (error) {
    // Never throw - view logging failures should not block document access
    // Log error for monitoring but continue
    console.error('[DocumentViewAudit] Failed to log document view:', {
      documentId: options.documentId,
      userId: options.userId,
      viewType: options.viewType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * extractRequestMetadata
 *
 * Helper function to extract IP address and user agent from Next.js Request object.
 * Handles various proxy configurations (x-forwarded-for, x-real-ip).
 *
 * @param request - Next.js Request or NextRequest object
 * @returns Object containing ipAddress and userAgent
 */
export function extractRequestMetadata(request: {
  headers: {
    get: (name: string) => string | null
  }
}): {
  ipAddress: string | undefined
  userAgent: string | undefined
} {
  // Try multiple headers for IP address (different proxy configs)
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    undefined

  const userAgent = request.headers.get('user-agent') || undefined

  return {
    ipAddress,
    userAgent,
  }
}

/**
 * generateSessionId
 *
 * Generates or retrieves session ID for grouping document views.
 * In Phase 1, we generate a simple UUID. In Phase 2, this could be tied
 * to NextAuth session or a cookie-based session identifier.
 *
 * @returns Session ID string
 */
export function generateSessionId(): string {
  // Simple implementation for Phase 1
  // In production, you might want to use a more sophisticated session tracking
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
}
