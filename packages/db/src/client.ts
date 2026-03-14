import { PrismaClient } from '@prisma/client'

/**
 * Standard PrismaClient singleton for admin operations.
 *
 * Use only in:
 * - auth routes (session creation, token validation)
 * - SCIM routes (cross-company user provisioning)
 * - KMS operations (encryption keys are global)
 * - middleware (request-level tenant resolution)
 *
 * Every usage must have a comment explaining why prismaAdmin is required
 * instead of getPrismaForCompany.
 *
 * For all other operations, use getPrismaForCompany(companyId) from packages/db/src/index.ts
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prismaAdmin = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaAdmin
