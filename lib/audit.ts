import { prisma } from "./prisma";

export interface AuditLogOptions {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userId?: string;
  companyId: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  if (process.env.ENABLE_AUDIT_LOG === "false") {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        details: options.details,
        ipAddress: options.ipAddress,
        userId: options.userId,
        companyId: options.companyId,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Prisma middleware for automatic audit logging
 *
 * NOTE: This function is deprecated and no longer functional in Prisma v7.
 * The $use middleware API was removed in Prisma v7.
 *
 * For audit logging, use the createAuditLog() function directly in your API routes
 * after database operations that need to be tracked.
 *
 * @deprecated Use createAuditLog() directly instead
 */
export function registerAuditLogMiddleware() {
  // No-op: Prisma v7 removed the $use middleware API
  // Audit logging must be done manually by calling createAuditLog() after operations
  console.warn(
    "Warning: registerAuditLogMiddleware() is deprecated. Prisma v7 removed the $use middleware API. " +
    "Please use createAuditLog() directly in your API routes."
  );
}
