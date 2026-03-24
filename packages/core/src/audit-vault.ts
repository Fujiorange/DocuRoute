import { prismaAdmin } from '@docuroute/db'
import { AuditVaultEventType, Permission } from '@docuroute/types'
import { hashSHA256 } from './utils'

/**
 * HASH COMPUTATION — IMPORTANT:
 * The hash is computed over a createdAt value that must be set by the caller
 * and passed explicitly to the INSERT. Do NOT use @default(now()) on
 * AuditVaultEntry.createdAt — the DB clock and the application clock differ
 * by milliseconds, making the hash non-reproducible.
 *
 * CRITICAL FIX: Use deterministic JSON serialization to prevent hash collisions
 * from property order variations. This ensures backward compatibility while
 * fixing the special character collision vulnerability.
 *
 * Pattern:
 *   const createdAt = new Date()
 *   const metadataStr = JSON.stringify(sortObjectKeys(metadata || {}))
 *   const hash = SHA-256(companyId + eventType + userId + createdAt.toISOString() + metadataStr)
 *   prisma.auditVaultEntry.create({ data: { ...fields, createdAt, hash } })
 *
 * This ensures verifyVaultIntegrity() can reproduce and verify the hash.
 */

/**
 * Sort object keys recursively for deterministic JSON serialization
 *
 * @param obj - Object to sort
 * @returns Object with sorted keys
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }

  const sorted: any = {}
  const keys = Object.keys(obj).sort()

  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key])
  }

  return sorted
}

export async function writeVaultEntry(params: {
  companyId: string
  eventType: AuditVaultEventType
  userId: string | null
  userEmail: string
  ipAddress?: string
  userAgent?: string
  permissionsUsed?: Permission[]
  metadata?: object
  documentFingerprint?: string
}): Promise<void> {
  try {
    const createdAt = new Date()

    // CRITICAL FIX: Use deterministic JSON serialization with sorted keys
    const sortedMetadata = sortObjectKeys(params.metadata || {})
    const metadataStr = JSON.stringify(sortedMetadata)

    // Compute hash
    const hashInput = [
      params.companyId,
      params.eventType,
      params.userId || '',
      createdAt.toISOString(),
      metadataStr,
    ].join('|')
    const hash = await hashSHA256(hashInput)

    // Uses prismaAdmin: vault entries are immutable and queried during compliance audits
    await prismaAdmin.auditVaultEntry.create({
      data: {
        companyId: params.companyId,
        eventType: params.eventType,
        userId: params.userId,
        userEmail: params.userEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        permissionsUsed: params.permissionsUsed || [],
        metadata: params.metadata || {},
        documentFingerprint: params.documentFingerprint,
        hash,
        createdAt,
      },
    })
  } catch (error) {
    // Never throw - vault logging failures should not block business operations
    console.error('Failed to write vault entry:', error)
  }
}

export async function verifyVaultIntegrity(
  companyId: string,
  startDate: Date,
  endDate: Date,
  batchSize = 1000 // PERFORMANCE: Process in batches to prevent memory exhaustion
): Promise<{ valid: boolean; tampered: string[]; totalChecked: number }> {
  try {
    // Uses prismaAdmin: vault integrity checks are compliance operations
    // PERFORMANCE: Paginate through entries instead of loading all at once
    let cursor: string | undefined
    let totalChecked = 0
    const tampered: string[] = []

    while (true) {
      const entries = await prismaAdmin.auditVaultEntry.findMany({
        where: {
          companyId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: 'asc' },
        take: batchSize,
      })

      if (entries.length === 0) break

      // PERFORMANCE: Consider parallel hash verification within batch
      // Current implementation: sequential for simplicity
      // For optimization, see docs/PERFORMANCE_ANALYSIS.md section 2.2
      for (const entry of entries) {
        // Use deterministic JSON serialization for verification
        const sortedMetadata = sortObjectKeys(entry.metadata || {})
        const metadataStr = JSON.stringify(sortedMetadata)

        const hashInput = [
          entry.companyId,
          entry.eventType,
          entry.userId || '',
          entry.createdAt.toISOString(),
          metadataStr,
        ].join('|')
        const computedHash = await hashSHA256(hashInput)

        if (computedHash !== entry.hash) {
          tampered.push(entry.id)
        }
      }

      totalChecked += entries.length
      cursor = entries[entries.length - 1].id

      // Optional: If this needs to be long-running, consider adding progress callbacks
    }

    return {
      valid: tampered.length === 0,
      tampered,
      totalChecked,
    }
  } catch (error) {
    console.error('Failed to verify vault integrity:', error)
    return { valid: false, tampered: [], totalChecked: 0 }
  }
}
