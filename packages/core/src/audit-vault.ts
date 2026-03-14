import { prismaAdmin } from '@docuroute/db'
import { AuditVaultEventType, Permission } from '@docuroute/types'
import { hashSHA256 } from './utils'

/**
 * HASH COMPUTATION  IMPORTANT:
 * The hash is computed over a createdAt value that must be set by the caller
 * and passed explicitly to the INSERT. Do NOT use @default(now()) on
 * AuditVaultEntry.createdAt  the DB clock and the application clock differ
 * by milliseconds, making the hash non-reproducible.
 *
 * Pattern:
 *   const createdAt = new Date()
 *   const hash = SHA-256(companyId + eventType + userId + createdAt.toISOString() + JSON.stringify(metadata))
 *   prisma.auditVaultEntry.create({ data: { ...fields, createdAt, hash } })
 *
 * This ensures verifyVaultIntegrity() can reproduce and verify the hash.
 */

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
    const metadataStr = JSON.stringify(params.metadata || {})

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
  endDate: Date
): Promise<{ valid: boolean; tampered: string[] }> {
  try {
    // Uses prismaAdmin: vault integrity checks are compliance operations
    const entries = await prismaAdmin.auditVaultEntry.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const tampered: string[] = []

    for (const entry of entries) {
      const metadataStr = JSON.stringify(entry.metadata || {})
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

    return {
      valid: tampered.length === 0,
      tampered,
    }
  } catch (error) {
    console.error('Failed to verify vault integrity:', error)
    return { valid: false, tampered: [] }
  }
}
