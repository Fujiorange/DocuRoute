import { PrismaClient } from '@prisma/client'
import { prismaAdmin } from './client'

/**
 * getPrismaForCompany(companyId): Extended PrismaClient
 *
 * IMPORTANT — extended client caching:
 * $extends() must NOT be called on every request — it creates a new object
 * each call and causes GC pressure and memory leaks under concurrent load.
 * The extended client for the shared DB path is cached in extendedClientCache
 * keyed by companyId, exactly like the enterprise path.
 *
 * Resolution order:
 *   1. Check process.env[`TENANT_DB_URL_${companyId}`]
 *      If set: enterprise client — return isolated PrismaClient for that DB.
 *   2. Otherwise: standard/pilot client — return cached extended PrismaClient
 *      with Prisma Client Extension injecting companyId into every query.
 *
 * Both enterprise and shared clients are cached in module-level Maps.
 * Cache key: companyId. Never evicted — process restart clears cache.
 *
 * RULE: Use getPrismaForCompany in ALL API routes and cron jobs.
 * RULE: Use prismaAdmin ONLY in auth routes, SCIM routes, middleware, kms.ts.
 *       Every prismaAdmin usage must have a comment explaining why.
 *
 * TRANSACTION RULE — CRITICAL:
 *   Interactive transactions ($transaction(async tx => { ... })) pass a raw
 *   PrismaClient as `tx`. The companyId extension DOES NOT apply to `tx`.
 *   In every transaction callback, pass companyId EXPLICITLY in all
 *   data objects and where clauses. Never rely on the extension inside a tx.
 */

const tenantClientCache = new Map<string, PrismaClient>()
const extendedClientCache = new Map<string, ReturnType<typeof prismaAdmin.$extends>>()

export function getPrismaForCompany(companyId: string) {
  // Check for enterprise dedicated DB
  const tenantUrl = process.env[`TENANT_DB_URL_${companyId}`]
  if (tenantUrl) {
    const cached = tenantClientCache.get(companyId)
    if (cached) return cached
    const client = new PrismaClient({ datasources: { db: { url: tenantUrl } } })
    tenantClientCache.set(companyId, client)
    return client
  }

  // Shared DB — return cached extended client (NOT a new $extends() call each time)
  const cached = extendedClientCache.get(companyId)
  if (cached) return cached

  const extended = prismaAdmin.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          if (args.where !== undefined) {
            args.where = { ...args.where, companyId }
          }
          if (args.data !== undefined && !Array.isArray(args.data)) {
            args.data = { ...args.data, companyId }
          }
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
