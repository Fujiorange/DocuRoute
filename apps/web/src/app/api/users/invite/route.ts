import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requireLivePermission } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import { Permission, AuditAction, PLAN_LIMITS, PlanTier } from '@docuroute/types'
import { validationError, notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { inviteUserSchema } from '@/lib/validations/user'
import { sendInvitationEmail } from '@/lib/email'
import crypto from 'crypto'

/**
 * POST /api/users/invite
 *
 * Creates an invitation for a new user to join the company.
 *
 * Permission required: INVITE_USERS (live check)
 *
 * Body: { email: string, roleId: string, name?: string }
 *
 * Validation:
 * - email: valid email format
 * - roleId: must belong to this company (getPrismaForCompany ensures isolation)
 * - Seat limit check: count active users, exclude BILLING_CONTACT system role
 *
 * Returns 402 { code: 'SEAT_LIMIT_REACHED' } if at limit
 *
 * Audit: USER_INVITED, permissionsUsed: [Permission.INVITE_USERS]
 */
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
    'invite user',
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  )

  // Parse and validate body
  const body = await req.json()
  const parseResult = inviteUserSchema.safeParse(body)

  if (!parseResult.success) {
    throw validationError(
      'body',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    )
  }

  const { email, roleId, name } = parseResult.data

  const prisma = getPrismaForCompany(session.user.companyId)

  // Validate roleId belongs to this company
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      name: true,
      isSystemRole: true,
      systemRoleKey: true,
    },
  })

  if (!role) {
    throw notFound('role')
  }

  // Check if user already exists or has pending invitation
  const existingUser = await prisma.user.findFirst({
    where: { email, companyId: session.user.companyId },
  })

  if (existingUser) {
    throw validationError('email', 'User with this email already exists in your company')
  }

  // Uses prismaAdmin: need to check invitations across all companies
  const existingInvitation = await prismaAdmin.invitation.findFirst({
    where: {
      email,
      companyId: session.user.companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existingInvitation) {
    throw validationError('email', 'An active invitation already exists for this email')
  }

  // Seat limit check - fetch company to get plan tier
  // Uses prismaAdmin: need to look up Company without companyId filter
  const company = await prismaAdmin.company.findUnique({
    where: { id: session.user.companyId },
    select: { planTier: true },
  })

  if (!company) {
    throw notFound('company')
  }

  const planTier = company.planTier as PlanTier
  const planLimit = PLAN_LIMITS[planTier]

  // Count active users, excluding BILLING_CONTACT system role
  const activeUserCount = await prisma.user.count({
    where: {
      companyId: session.user.companyId,
      isActive: true,
      role: {
        NOT: {
          isSystemRole: true,
          systemRoleKey: 'BILLING_CONTACT',
        },
      },
    },
  })

  if (activeUserCount >= planLimit.users) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'SEAT_LIMIT_REACHED',
          message: `Your plan allows ${planLimit.users} seats. You currently have ${activeUserCount} active users.`,
          limit: planLimit.users,
          current: activeUserCount,
        },
      }),
      {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Generate invitation token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Create invitation - uses prismaAdmin because Invitation table doesn't have companyId extension
  const invitation = await prismaAdmin.invitation.create({
    data: {
      email,
      companyId: session.user.companyId,
      roleId,
      token,
      expiresAt,
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
      email,
      roleId,
      roleName: role.name,
      invitationId: invitation.id,
      expiresAt: expiresAt.toISOString(),
    },
  })

  // Get company name for email
  const company = await prismaAdmin.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  // Send invitation email via Resend
  const magicLink = `${process.env.NEXTAUTH_URL}/auth/accept-invite?token=${token}`

  try {
    await sendInvitationEmail({
      to: email,
      companyName: company?.name || 'DocuRoute',
      inviterName: session.user.name || session.user.email,
      roleName: role.name,
      isSystemRole: role.isSystemRole,
      systemRoleKey: role.systemRoleKey || undefined,
      acceptUrl: magicLink,
      expiresAt,
    })
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError)
    // Don't fail the invitation creation if email fails
    // The invitation is created and can be resent
  }

  return new Response(
    JSON.stringify({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        roleId: invitation.roleId,
        roleName: role.name,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
