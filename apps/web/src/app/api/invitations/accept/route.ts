import { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import { AuditAction } from '@docuroute/types'
import { validationError, notFound, forbidden } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { signIn } from 'next-auth/react'
import { z } from 'zod'

/**
 * POST /api/invitations/accept
 *
 * Accepts an invitation and creates a user account.
 *
 * NO AUTHENTICATION REQUIRED — token is the authentication.
 *
 * Body: { token: string, name: string }
 *
 * Flow:
 * 1. Validate token (not expired, not already accepted)
 * 2. Show role name and description/permissions
 * 3. Create User with roleId from Invitation (FK)
 * 4. Mark invitation as accepted
 * 5. Update CompanyOnboarding.completedSteps (add 'FIRST_TEAM_MEMBER_INVITED')
 * 6. Log audit event: USER_INVITED (acceptance)
 * 7. Return success — client will trigger auto sign-in
 *
 * TRANSACTION RULE: Pass companyId explicitly in all tx operations
 *
 * Audit: USER_INVITED, permissionsUsed: [] (no permission needed — token is auth)
 */

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
})

export const POST = withApiHandler(async (req: NextRequest) => {
  // Parse and validate body
  const body = await req.json()
  const parseResult = acceptInvitationSchema.safeParse(body)

  if (!parseResult.success) {
    throw validationError(
      'body',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    )
  }

  const { token, name } = parseResult.data

  // Uses prismaAdmin: Invitation table doesn't have companyId extension
  const invitation = await prismaAdmin.invitation.findUnique({
    where: { token },
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

  if (!invitation) {
    // Log failed attempt to audit log
    await logAuditEvent({
      userId: null,
      companyId: null,
      action: AuditAction.PERMISSION_DENIED,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      permissionsUsed: [],
      metadata: {
        reason: 'INVALID_INVITATION_TOKEN',
        tokenPrefix: token.slice(0, 8),
      },
    })
    throw notFound('invitation')
  }

  // Check if already accepted
  if (invitation.acceptedAt) {
    throw validationError('token', 'This invitation has already been accepted')
  }

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    // Log expired token attempt
    await logAuditEvent({
      userId: null,
      companyId: invitation.role.companyId,
      action: AuditAction.PERMISSION_DENIED,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      permissionsUsed: [],
      metadata: {
        reason: 'EXPIRED_INVITATION_TOKEN',
        tokenPrefix: token.slice(0, 8),
        email: invitation.email,
      },
    })
    throw validationError('token', 'This invitation has expired')
  }

  const companyId = invitation.role.companyId
  const prisma = getPrismaForCompany(companyId)

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: invitation.email },
  })

  if (existingUser) {
    throw validationError('email', 'A user with this email already exists')
  }

  // Create user and mark invitation as accepted in a transaction
  // TRANSACTION RULE: Pass companyId explicitly in all data objects
  const user = await prismaAdmin.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        email: invitation.email,
        name,
        companyId,
        roleId: invitation.roleId,
        isActive: true, // User is active immediately upon accepting invitation
      },
    })

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    })

    // Update CompanyOnboarding.completedSteps
    const onboarding = await tx.companyOnboarding.findUnique({
      where: { companyId },
      select: { completedSteps: true },
    })

    if (onboarding) {
      const steps = onboarding.completedSteps || []
      if (!steps.includes('FIRST_TEAM_MEMBER_INVITED')) {
        await tx.companyOnboarding.update({
          where: { companyId },
          data: {
            completedSteps: [...steps, 'FIRST_TEAM_MEMBER_INVITED'],
          },
        })
      }
    } else {
      // Create onboarding record if it doesn't exist
      await tx.companyOnboarding.create({
        data: {
          companyId,
          completedSteps: ['FIRST_TEAM_MEMBER_INVITED'],
        },
      })
    }

    return newUser
  })

  // Log audit event
  await logAuditEvent({
    userId: user.id,
    companyId,
    action: AuditAction.USER_INVITED,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [],
    metadata: {
      email: invitation.email,
      roleId: invitation.roleId,
      roleName: invitation.role.name,
      invitationAccepted: true,
      name,
    },
  })

  return new Response(
    JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        roleId: user.roleId,
      },
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
