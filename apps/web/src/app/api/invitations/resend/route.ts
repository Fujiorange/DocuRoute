import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requireLivePermission } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import { Permission, AuditAction } from '@docuroute/types'
import { validationError, notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { checkRateLimit } from '@docuroute/core/src/rate-limit'
import { sendInvitationEmail } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

/**
 * POST /api/invitations/resend
 *
 * Resends an invitation email.
 *
 * Permission required: INVITE_USERS (live check)
 *
 * Body: { invitationId: string }
 *
 * Rate limit: 3 resends per email per 24 hours (Upstash Redis)
 *
 * On expired/invalid token, logs PERMISSION_DENIED to AuditLog:
 *   permissionsUsed: []
 *   metadata: { reason: 'INVALID_INVITATION_TOKEN', tokenPrefix: token.slice(0, 8) }
 *   NOTE: Store only tokenPrefix (first 8 chars) — never the full token
 *
 * Audit: USER_INVITED (resend), permissionsUsed: [Permission.INVITE_USERS]
 */

const resendInvitationSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required'),
})

export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Live permission check (required for mutations)
  await requireLivePermission(
    {
      userId: session.user.userId,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.INVITE_USERS],
    'resend invitation',
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  )

  // Parse and validate body
  const body = await req.json()
  const parseResult = resendInvitationSchema.safeParse(body)

  if (!parseResult.success) {
    throw validationError(
      'body',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    )
  }

  const { invitationId } = parseResult.data

  // Uses prismaAdmin: Invitation table doesn't have companyId extension
  const invitation = await prismaAdmin.invitation.findUnique({
    where: { id: invitationId },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          companyId: true,
          isSystemRole: true,
          systemRoleKey: true,
        },
      },
    },
  })

  if (!invitation || invitation.role.companyId !== session.user.companyId) {
    throw notFound('invitation')
  }

  // Check if already accepted
  if (invitation.acceptedAt) {
    throw validationError('invitation', 'This invitation has already been accepted')
  }

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    // Log expired invitation resend attempt
    await logAuditEvent({
      userId: session.user.userId,
      companyId: session.user.companyId,
      action: AuditAction.PERMISSION_DENIED,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      permissionsUsed: [],
      metadata: {
        reason: 'EXPIRED_INVITATION_TOKEN',
        tokenPrefix: invitation.token.slice(0, 8),
        email: invitation.email,
        invitationId,
      },
    })
    throw validationError('invitation', 'This invitation has expired')
  }

  // Rate limit: 3 resends per email per 24 hours
  const rateLimitKey = `invite-resend:${invitation.email}`
  await checkRateLimit({
    key: rateLimitKey,
    limit: 3,
    windowSeconds: 86400, // 24 hours
  })

  // Generate new token and extend expiration
  const newToken = crypto.randomBytes(32).toString('hex')
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  // Update invitation with new token and expiration
  const updatedInvitation = await prismaAdmin.invitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt: newExpiresAt,
    },
  })

  // Log audit event
  await logAuditEvent({
    userId: session.user.userId,
    companyId: session.user.companyId,
    action: AuditAction.USER_INVITED,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.INVITE_USERS],
    metadata: {
      email: invitation.email,
      roleId: invitation.roleId,
      roleName: invitation.role.name,
      invitationId: invitation.id,
      resent: true,
      newExpiresAt: newExpiresAt.toISOString(),
    },
  })

  // Get company name for email
  const company = await prismaAdmin.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  // Send invitation email via Resend
  const magicLink = `${process.env.NEXTAUTH_URL}/auth/accept-invite?token=${newToken}`

  try {
    await sendInvitationEmail({
      to: invitation.email,
      companyName: company?.name || 'DocuRoute',
      inviterName: session.user.name || session.user.email,
      roleName: invitation.role.name,
      isSystemRole: invitation.role.isSystemRole,
      systemRoleKey: invitation.role.systemRoleKey || undefined,
      acceptUrl: magicLink,
      expiresAt: newExpiresAt,
    })
  } catch (emailError) {
    console.error('Failed to resend invitation email:', emailError)
    // Don't fail if email fails - invitation token is updated
  }

  return new Response(
    JSON.stringify({
      success: true,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        roleId: updatedInvitation.roleId,
        roleName: invitation.role.name,
        expiresAt: updatedInvitation.expiresAt.toISOString(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
