import { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/auth'
import { prismaAdmin } from '@docuroute/db'
import { validationError, notFound } from '@docuroute/core/src/errors'
import { resolvePermissionsFromRole } from '@/lib/auth'
import { z } from 'zod'

/**
 * POST /api/invitations/validate
 *
 * Validates an invitation token and returns invitation details.
 *
 * NO AUTHENTICATION REQUIRED — used to display invitation details before acceptance.
 *
 * Body: { token: string }
 *
 * Returns:
 * - email
 * - roleName
 * - isSystemRole
 * - systemRoleKey (if system role)
 * - permissions (if custom role)
 * - companyName
 * - expiresAt
 */

const validateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export const POST = withApiHandler(async (req: NextRequest) => {
  // Parse and validate body
  const body = await req.json()
  const parseResult = validateTokenSchema.safeParse(body)

  if (!parseResult.success) {
    throw validationError(
      'body',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    )
  }

  const { token } = parseResult.data

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
          permissions: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  if (!invitation) {
    throw notFound('invitation')
  }

  // Check if already accepted
  if (invitation.acceptedAt) {
    throw validationError('token', 'This invitation has already been accepted')
  }

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    throw validationError('token', 'This invitation has expired')
  }

  // Resolve permissions for the role
  const permissions = resolvePermissionsFromRole({
    isSystemRole: invitation.role.isSystemRole,
    systemRoleKey: invitation.role.systemRoleKey,
    permissions: invitation.role.permissions,
  })

  return new Response(
    JSON.stringify({
      invitation: {
        email: invitation.email,
        roleName: invitation.role.name,
        isSystemRole: invitation.role.isSystemRole,
        systemRoleKey: invitation.role.systemRoleKey,
        permissions: invitation.role.isSystemRole ? undefined : permissions,
        companyName: invitation.role.company.name,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
