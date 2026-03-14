import { prismaAdmin } from '@docuroute/db'
import { AuditAction, Permission } from '@docuroute/types'

/**
 * logAuditEvent
 *
 * Records an audit event in the AuditLog table.
 * INSERT only. Never throws. No Next.js imports.
 *
 * Used for standard auditing (non-compliance events).
 * For compliance-critical events, use writeVaultEntry from audit-vault.ts instead.
 */
export async function logAuditEvent(params: {
  userId?: string
  companyId: string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  permissionsUsed?: Permission[]
  metadata?: object
}): Promise<void> {
  try {
    // Uses prismaAdmin: audit logs are cross-company queries during investigations
    await prismaAdmin.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        permissionsUsed: params.permissionsUsed || [],
        metadata: params.metadata || {},
      },
    })
  } catch (error) {
    // Never throw - audit logging failures should not block business operations
    console.error('Failed to log audit event:', error)
  }
}
