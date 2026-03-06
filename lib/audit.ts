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
 */
export function registerAuditLogMiddleware() {
  prisma.$use(async (params, next) => {
    const result = await next(params);

    // Skip audit logging for certain models
    const skipModels = ["AuditLog", "TwoFactorSecret", "PasswordReset"];
    if (skipModels.includes(params.model || "")) {
      return result;
    }

    // Only log mutations (create, update, delete)
    const mutations = ["create", "update", "updateMany", "delete", "deleteMany"];
    if (!mutations.includes(params.action)) {
      return result;
    }

    // Extract data for audit log
    const entity = params.model || "Unknown";
    let action = `${entity.toLowerCase()}.${params.action}`;
    let entityId: string | undefined;
    let details: Record<string, any> = {};

    if (params.action === "create" && result?.id) {
      entityId = result.id;
      details = { data: params.args?.data };
    } else if (params.action === "update" && params.args?.where?.id) {
      entityId = params.args.where.id;
      details = { changes: params.args?.data };
    } else if (params.action === "delete" && params.args?.where?.id) {
      entityId = params.args.where.id;
    }

    // Try to extract companyId from the operation
    let companyId: string | undefined;
    if (params.args?.data?.companyId) {
      companyId = params.args.data.companyId;
    } else if (result?.companyId) {
      companyId = result.companyId;
    }

    // If we have a companyId, create the audit log
    if (companyId) {
      await createAuditLog({
        action,
        entity,
        entityId,
        details,
        companyId,
      });
    }

    return result;
  });
}
