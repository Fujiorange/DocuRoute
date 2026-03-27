import { PrismaClient } from '@prisma/client'

/**
 * Development-mode middleware to validate companyId in transactions
 *
 * This middleware adds an extra layer of validation during development to catch
 * missing companyId values in transaction operations before they reach the database.
 *
 * IMPORTANT: This is a development aid, not a security control. The real security
 * is enforced by:
 * 1. RLS policies at the database level
 * 2. Database triggers that reject NULL companyId on INSERT
 *
 * In production, this middleware logs warnings but doesn't throw errors, allowing
 * RLS and triggers to be the authoritative enforcement mechanisms.
 */

const TENANT_SCOPED_MODELS = [
  'role',
  'user',
  'project',
  'document',
  'documentRevision',
  'auditLog',
  'auditVaultEntry',
  'invitation',
  'notification',
  'transmittalCounter',
  'companyOnboarding',
]

export function createCompanyIdValidationMiddleware(prisma: PrismaClient) {
  return prisma.$use(async (params, next) => {
    // Only validate tenant-scoped models
    const modelName = params.model?.toLowerCase()
    if (!modelName || !TENANT_SCOPED_MODELS.includes(modelName)) {
      return next(params)
    }

    // Check if we're in a transaction context
    // Note: This is a heuristic - Prisma doesn't expose transaction state directly
    const isInTransaction = (params as any).runInTransaction === true

    // Only validate create and update operations
    if (params.action === 'create' || params.action === 'update' || params.action === 'createMany') {
      const data = params.args.data

      // For createMany, data is an array
      const dataArray = Array.isArray(data) ? data : [data]

      for (const item of dataArray) {
        const hasCompanyId = item?.companyId !== undefined && item?.companyId !== null

        if (!hasCompanyId) {
          const errorMessage = `CRITICAL: Missing companyId in ${params.model}.${params.action}${isInTransaction ? ' (inside transaction)' : ''}. ` +
            `RLS policies require explicit companyId for data integrity. ` +
            `This will be rejected by database trigger.`

          // In development, throw error loudly to catch issues during testing
          if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
            throw new Error(errorMessage)
          }

          // In production, log warning but continue (RLS and trigger will enforce)
          console.warn(`[RLS_VALIDATION_WARNING] ${errorMessage}`)
        }
      }
    }

    return next(params)
  })
}

/**
 * Apply validation middleware to a Prisma client
 *
 * Usage:
 * ```typescript
 * import { applyCompanyIdValidation } from '@docuroute/db/src/middleware'
 *
 * const prisma = new PrismaClient()
 * applyCompanyIdValidation(prisma)
 * ```
 */
export function applyCompanyIdValidation(prisma: PrismaClient): PrismaClient {
  createCompanyIdValidationMiddleware(prisma)
  return prisma
}
