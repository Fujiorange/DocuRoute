import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DocumentStatus, IssuePurpose } from '@docuroute/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function hashSHA256(data: string): Promise<string> {
  // Node.js environment
  if (typeof window === 'undefined') {
    const crypto = await import('crypto')
    return crypto.createHash('sha256').update(data).digest('hex')
  }
  // Browser environment
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function getParserConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high'
  if (score >= 0.65) return 'medium'
  return 'low'
}

/**
 * Core safety predicate for QR verification.
 * SAFE only when: status === ACTIVE AND issuePurpose === FOR_CONSTRUCTION.
 * Any other combination is unsafe. Non-negotiable.
 */
export function isDocumentSafeForConstruction(
  status: DocumentStatus,
  issuePurpose: IssuePurpose
): boolean {
  return status === DocumentStatus.ACTIVE && issuePurpose === IssuePurpose.FOR_CONSTRUCTION
}
