/**
 * @docuroute/core — Shared business logic
 *
 * ZERO Next.js/React imports. This package must work in both
 * Node.js (worker) and browser (PWA offline) environments.
 *
 * Re-exports from @docuroute/types for convenience.
 */

export * from './errors'
export * from './utils'
export * from './audit'
export * from './audit-vault'
export * from './qr-verification'
export * from './watermark'

// Re-export types for convenience
export type { Permission, SystemRoleKey, QRVerificationStatus } from '@docuroute/types'
