/**
 * Email sending utilities using Resend
 */

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InviteEmail } from '@docuroute/emails'
import { SYSTEM_ROLE_DESCRIPTIONS } from '@docuroute/types'
import type { ImportConflict } from '@docuroute/core/src/bim-import'

// Lazy initialization
let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

export interface SendInvitationEmailParams {
  to: string
  companyName: string
  inviterName: string
  roleName: string
  isSystemRole: boolean
  systemRoleKey?: string
  acceptUrl: string
  expiresAt: Date
}

/**
 * sendInvitationEmail
 *
 * Sends an invitation email using Resend and react-email templates.
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
  const resend = getResend()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@docuroute.com'

  // Get role description for system roles
  const roleDescription = params.isSystemRole && params.systemRoleKey
    ? SYSTEM_ROLE_DESCRIPTIONS[params.systemRoleKey as keyof typeof SYSTEM_ROLE_DESCRIPTIONS]
    : undefined

  // Render email HTML
  const emailHtml = render(
    InviteEmail({
      companyName: params.companyName,
      inviterName: params.inviterName,
      roleName: params.roleName,
      roleDescription,
      acceptUrl: params.acceptUrl,
      expiresAt: params.expiresAt.toISOString(),
    })
  )

  // Send email
  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `You've been invited to ${params.companyName} on DocuRoute`,
    html: emailHtml,
  })
}

export interface SendBIMImportEmailParams {
  companyName: string
  projectName: string
  projectId: string
  imported: number
  conflicts: ImportConflict[]
  processedFiles: string[]
}

/**
 * sendBIMImportEmail
 *
 * Sends a notification email after BIM CSV import with conflicts or successful imports.
 */
export async function sendBIMImportEmail(params: SendBIMImportEmailParams): Promise<void> {
  const resend = getResend()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@docuroute.com'
  const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL

  if (!platformAdminEmail) {
    console.warn('[BIM_EMAIL] PLATFORM_ADMIN_EMAIL not set, skipping BIM import notification')
    return
  }

  // Build email HTML
  const conflictList = params.conflicts.length > 0
    ? `
    <h3>Conflicts (${params.conflicts.length})</h3>
    <ul>
      ${params.conflicts.slice(0, 10).map(c => `
        <li><strong>Row ${c.row}</strong>: Tag "${c.tag}" - ${c.issue} (${c.severity})</li>
      `).join('')}
      ${params.conflicts.length > 10 ? `<li>...and ${params.conflicts.length - 10} more conflicts</li>` : ''}
    </ul>
    `
    : ''

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>BIM Import Report: ${params.projectName}</h2>
      <p><strong>Company:</strong> ${params.companyName}</p>
      <p><strong>Project:</strong> ${params.projectName}</p>
      <p><strong>Files Processed:</strong> ${params.processedFiles.length}</p>
      <p><strong>Records Imported:</strong> ${params.imported}</p>
      ${conflictList}
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard/projects/${params.projectId}"
           style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Project
        </a>
      </p>
    </div>
  `

  const subject = params.conflicts.length > 0
    ? `BIM Import Conflicts: ${params.projectName} (${params.conflicts.length} issues)`
    : `BIM Import Success: ${params.projectName} (${params.imported} records)`

  await resend.emails.send({
    from: fromEmail,
    to: platformAdminEmail,
    subject,
    html: emailHtml,
  })
}

export interface SendBIMImportErrorEmailParams {
  companyName: string
  projectName: string
  projectId: string
  folderPath: string
  error: string
}

/**
 * sendBIMImportErrorEmail
 *
 * Sends an error notification email when BIM import fails.
 */
export async function sendBIMImportErrorEmail(params: SendBIMImportErrorEmailParams): Promise<void> {
  const resend = getResend()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@docuroute.com'
  const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL

  if (!platformAdminEmail) {
    console.warn('[BIM_EMAIL] PLATFORM_ADMIN_EMAIL not set, skipping BIM error notification')
    return
  }

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">BIM Import Failed</h2>
      <p><strong>Company:</strong> ${params.companyName}</p>
      <p><strong>Project:</strong> ${params.projectName}</p>
      <p><strong>Folder Path:</strong> ${params.folderPath}</p>
      <div style="background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
        <strong>Error:</strong><br>
        <code style="white-space: pre-wrap;">${params.error}</code>
      </div>
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard/projects/${params.projectId}/settings"
           style="background: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Check Project Settings
        </a>
      </p>
    </div>
  `

  await resend.emails.send({
    from: fromEmail,
    to: platformAdminEmail,
    subject: `BIM Import Failed: ${params.projectName}`,
    html: emailHtml,
  })
}
