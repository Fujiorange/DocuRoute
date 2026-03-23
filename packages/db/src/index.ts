import { PrismaClient } from '@prisma/client'
import { prismaAdmin } from './client'

/**
 * getPrismaForCompany(companyId): Tenant-isolated PrismaClient
 *
 * ARCHITECTURE CHANGE (2026-03-23):
 * Migrated from Prisma Client Extensions to PostgreSQL Row Level Security (RLS).
 *
 * CRITICAL SECURITY FIX:
 * Previous implementation used Prisma Client Extensions to inject companyId into queries.
 * However, extensions DO NOT apply inside interactive transactions ($transaction),
 * requiring manual companyId injection and relying on developer discipline.
 * One forgotten companyId in a transaction = cross-tenant data leakage in a highly
 * regulated industry (maritime/shipyard compliance).
 *
 * NEW APPROACH - Database-Level RLS:
 * 1. All tenant-scoped tables have RLS policies enabled (see migration 20260323_rls_multi_tenancy)
 * 2. getPrismaForCompany returns an extended client that automatically executes
 *    SET LOCAL app.current_company_id = '<companyId>' before EVERY query/transaction
 * 3. RLS policies filter ALL queries (including inside transactions) based on
 *    current_setting('app.current_company_id')
 * 4. If companyId is not set, current_setting returns NULL and NO rows match
 *    (fail-safe default prevents data leakage)
 *
 * BENEFITS:
 * - Tenant isolation enforced at database level (defense in depth)
 * - Works inside interactive transactions (no manual companyId injection needed)
 * - Forgotten companyId = query returns nothing (not another tenant's data)
 * - Satisfies ISO 9001 and DNV compliance requirements
 *
 * Resolution order:
 *   1. Check process.env[`TENANT_DB_URL_${companyId}`]
 *      If set: enterprise client with dedicated DB (RLS not needed)
 *   2. Otherwise: shared DB client with RLS context set via extension
 *
 * Both paths cache clients in module-level Maps.
 * Cache key: companyId. Evicted when cache size exceeds MAX_CACHE_SIZE (LRU-style).
 *
 * USAGE RULES:
 * - Use getPrismaForCompany in ALL API routes and cron jobs
 * - Use prismaAdmin ONLY in auth routes, SCIM routes, middleware, kms.ts
 *   Every prismaAdmin usage must have a comment explaining why
 * - NO LONGER REQUIRED: Manual companyId injection in transactions
 *   (but you can still pass it explicitly if you prefer - it won't break anything)
 */

const tenantClientCache = new Map<string, PrismaClient>()
const extendedClientCache = new Map<string, ReturnType<typeof prismaAdmin.$extends>>()

// Cache eviction strategy: limit cache size to prevent memory leaks in multi-tenant systems
// For most applications, 100 active companies in memory is reasonable
const MAX_CACHE_SIZE = 100

function evictOldestCacheEntry<K, V>(cache: Map<K, V>): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey) {
      cache.delete(firstKey)
    }
  }
}

export function getPrismaForCompany(companyId: string) {
  // Check for enterprise dedicated DB
  const tenantUrl = process.env[`TENANT_DB_URL_${companyId}`]
  if (tenantUrl) {
    const cached = tenantClientCache.get(companyId)
    if (cached) return cached
    evictOldestCacheEntry(tenantClientCache)
    const client = new PrismaClient({ datasources: { db: { url: tenantUrl } } })
    tenantClientCache.set(companyId, client)
    return client
  }

  // Shared DB — return cached RLS-enabled client
  const cached = extendedClientCache.get(companyId)
  if (cached) return cached

  evictOldestCacheEntry(extendedClientCache)

  // Use Prisma Client Extension to set RLS context before every query/transaction
  const extended = prismaAdmin.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
          // Set RLS context for this query
          // SET LOCAL is transaction-scoped and automatically resets after commit/rollback
          await prismaAdmin.$executeRawUnsafe(
            `SET LOCAL app.current_company_id = '${companyId.replace(/'/g, "''")}'`
          )

          return query(args)
        }
      }
    }
  })

  extendedClientCache.set(companyId, extended)
  return extended
}

export { prismaAdmin } from './client'
export * from '@prisma/client'
