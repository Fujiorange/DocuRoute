/**
 * Email sending utilities using Resend
 */

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InviteEmail } from '@docuroute/emails'
import { SYSTEM_ROLE_DESCRIPTIONS } from '@docuroute/types'

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
