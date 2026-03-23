/**
 * Permission Cache using Upstash Redis
 *
 * ARCHITECTURE FIX (2026-03-23):
 * Addresses JWT cookie bloat by storing permissions in Redis instead of JWT.
 *
 * PROBLEM:
 * With 41 distinct permissions stored as array of strings in JWT:
 * - Permission array alone: ~902 bytes
 * - Total JWT payload: ~1,082 bytes
 * - Base64 encoded JWT: ~1,440+ bytes
 * - Risk: Approaching 4KB cookie limit as permission set grows
 *
 * SOLUTION:
 * 1. Store permission array in Redis with user roleId as key
 * 2. JWT contains only: userId, companyId, roleId, permissionVersion
 * 3. Middleware looks up permissions from Redis on each request
 * 4. TTL = 30 days (matches JWT maxAge)
 * 5. Invalidate on role permission change (increment permissionVersion)
 *
 * BENEFITS:
 * - JWT size reduced from ~1,440 bytes to ~400 bytes
 * - Can store 200+ permissions without cookie limit concerns
 * - Permission revocation takes effect immediately (no stale JWT problem)
 * - Already using Upstash Redis for rate limiting
 */

import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const PERMISSION_CACHE_TTL = 30 * 24 * 60 * 60 // 30 days (matches JWT maxAge)
const PERMISSION_VERSION_TTL = 365 * 24 * 60 * 60 // 1 year

/**
 * Generate cache key for user permissions
 */
function getPermissionCacheKey(companyId: string, roleId: string, version: number): string {
  return `permissions:${companyId}:${roleId}:v${version}`
}

/**
 * Generate cache key for permission version counter
 */
function getPermissionVersionKey(companyId: string, roleId: string): string {
  return `permission-version:${companyId}:${roleId}`
}

/**
 * Cache permissions in Redis
 *
 * @param companyId - Company ID
 * @param roleId - Role ID
 * @param permissions - Array of permission strings
 * @param version - Permission version number
 */
export async function cachePermissions(
  companyId: string,
  roleId: string,
  permissions: string[],
  version: number
): Promise<void> {
  const key = getPermissionCacheKey(companyId, roleId, version)

  await redis.setex(key, PERMISSION_CACHE_TTL, JSON.stringify(permissions))
}

/**
 * Get cached permissions from Redis
 *
 * @param companyId - Company ID
 * @param roleId - Role ID
 * @param version - Permission version number
 * @returns Array of permission strings, or null if not found
 */
export async function getCachedPermissions(
  companyId: string,
  roleId: string,
  version: number
): Promise<string[] | null> {
  const key = getPermissionCacheKey(companyId, roleId, version)

  try {
    const cached = await redis.get<string>(key)

    if (!cached) {
      return null
    }

    // Parse JSON array
    return JSON.parse(cached) as string[]
  } catch (error) {
    console.error('Failed to get cached permissions:', error)
    return null
  }
}

/**
 * Get current permission version for a role
 *
 * @param companyId - Company ID
 * @param roleId - Role ID
 * @returns Current version number (starts at 1)
 */
export async function getPermissionVersion(companyId: string, roleId: string): Promise<number> {
  const key = getPermissionVersionKey(companyId, roleId)

  try {
    const version = await redis.get<number>(key)

    if (!version) {
      // Initialize version to 1
      await redis.setex(key, PERMISSION_VERSION_TTL, 1)
      return 1
    }

    return version
  } catch (error) {
    console.error('Failed to get permission version:', error)
    return 1 // Default to version 1 on error
  }
}

/**
 * Increment permission version (invalidates all cached permissions for this role)
 *
 * Call this when:
 * - Role permissions are updated
 * - Role is deleted
 * - System role mapping changes
 *
 * @param companyId - Company ID
 * @param roleId - Role ID
 * @returns New version number
 */
export async function incrementPermissionVersion(
  companyId: string,
  roleId: string
): Promise<number> {
  const key = getPermissionVersionKey(companyId, roleId)

  try {
    const newVersion = await redis.incr(key)

    // Reset TTL on increment
    await redis.expire(key, PERMISSION_VERSION_TTL)

    console.log(`Permission version incremented for role ${roleId} in company ${companyId}: v${newVersion}`)

    return newVersion
  } catch (error) {
    console.error('Failed to increment permission version:', error)
    throw error
  }
}

/**
 * Invalidate all permission caches for a company
 *
 * Use this sparingly - only when system-wide permission changes occur
 * (e.g., adding new permission to system role definitions)
 *
 * @param companyId - Company ID
 */
export async function invalidateCompanyPermissions(companyId: string): Promise<void> {
  try {
    // Scan for all permission version keys for this company
    const pattern = `permission-version:${companyId}:*`
    const keys = await redis.keys(pattern)

    // Increment all version counters
    for (const key of keys) {
      await redis.incr(key)
      await redis.expire(key, PERMISSION_VERSION_TTL)
    }

    console.log(`Invalidated permissions for ${keys.length} roles in company ${companyId}`)
  } catch (error) {
    console.error('Failed to invalidate company permissions:', error)
    throw error
  }
}

/**
 * Delete all cached permissions and versions for a role
 *
 * Call this when a role is permanently deleted
 *
 * @param companyId - Company ID
 * @param roleId - Role ID
 */
export async function deleteRolePermissions(companyId: string, roleId: string): Promise<void> {
  try {
    // Delete version counter
    const versionKey = getPermissionVersionKey(companyId, roleId)
    await redis.del(versionKey)

    // Delete all permission cache entries for this role
    // Pattern: permissions:${companyId}:${roleId}:v*
    const pattern = `permissions:${companyId}:${roleId}:v*`
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await redis.del(...keys)
    }

    console.log(`Deleted permissions for role ${roleId} in company ${companyId}`)
  } catch (error) {
    console.error('Failed to delete role permissions:', error)
    throw error
  }
}
