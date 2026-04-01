import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import { Permission, AuditAction } from '@docuroute/types'
import { unauthorized, validationError } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'

/**
 * GET /api/company/transmittal-config
 *
 * Returns transmittal configuration for the company
 * Creates default config if none exists
 *
 * No permission required - all authenticated users can view config
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  // Get or create default config
  let config = await prisma.companyTransmittalConfig.findUnique({
    where: { companyId: session.user.companyId },
  })

  if (!config) {
    // Create default config
    config = await prisma.companyTransmittalConfig.create({
      data: {
        companyId: session.user.companyId,
      },
    })
  }

  return Response.json({
    config: {
      id: config.id,
      numberPrefix: config.numberPrefix,
      numberPadding: config.numberPadding,
      columns: config.columns,
      headerFields: config.headerFields,
      footerText: config.footerText,
      updatedAt: config.updatedAt.toISOString(),
    },
  })
})

/**
 * PUT /api/company/transmittal-config
 *
 * Updates transmittal configuration for the company
 *
 * Permission required: MANAGE_CUSTOM_ROLES (company admin level)
 *
 * Request body:
 * {
 *   numberPrefix?: string (2-10 chars, alphanumeric)
 *   numberPadding?: number (1-6)
 *   columns?: object
 *   headerFields?: object
 *   footerText?: string (max 500 chars)
 * }
 */
export const PUT = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  // Require admin-level permission
  requirePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.MANAGE_CUSTOM_ROLES]
  )

  const body = await req.json()
  const { numberPrefix, numberPadding, columns, headerFields, footerText } = body

  // Validation
  if (numberPrefix !== undefined) {
    if (typeof numberPrefix !== 'string') {
      throw validationError('numberPrefix', 'Must be a string')
    }
    if (numberPrefix.length < 2 || numberPrefix.length > 10) {
      throw validationError('numberPrefix', 'Must be between 2 and 10 characters')
    }
    if (!/^[A-Z0-9]+$/.test(numberPrefix)) {
      throw validationError('numberPrefix', 'Must contain only uppercase letters and numbers')
    }
  }

  if (numberPadding !== undefined) {
    if (typeof numberPadding !== 'number' || !Number.isInteger(numberPadding)) {
      throw validationError('numberPadding', 'Must be an integer')
    }
    if (numberPadding < 1 || numberPadding > 6) {
      throw validationError('numberPadding', 'Must be between 1 and 6')
    }
  }

  if (columns !== undefined) {
    if (typeof columns !== 'object' || columns === null) {
      throw validationError('columns', 'Must be an object')
    }
    // Validate column structure
    const validColumnKeys = ['documentCode', 'title', 'revisionCode', 'status', 'discipline']
    for (const [key, value] of Object.entries(columns)) {
      if (!validColumnKeys.includes(key)) {
        throw validationError('columns', `Invalid column key: ${key}`)
      }
      const col = value as any
      if (typeof col !== 'object' || col === null) {
        throw validationError('columns', `Column ${key} must be an object`)
      }
      if (typeof col.enabled !== 'boolean') {
        throw validationError('columns', `Column ${key}.enabled must be a boolean`)
      }
      if (typeof col.label !== 'string') {
        throw validationError('columns', `Column ${key}.label must be a string`)
      }
      if (typeof col.order !== 'number' || !Number.isInteger(col.order)) {
        throw validationError('columns', `Column ${key}.order must be an integer`)
      }
    }
  }

  if (headerFields !== undefined) {
    if (typeof headerFields !== 'object' || headerFields === null) {
      throw validationError('headerFields', 'Must be an object')
    }
    // Validate header field structure
    const validHeaderKeys = ['projectName', 'attentionTo', 'subject']
    for (const [key, value] of Object.entries(headerFields)) {
      if (!validHeaderKeys.includes(key)) {
        throw validationError('headerFields', `Invalid header field key: ${key}`)
      }
      const field = value as any
      if (typeof field !== 'object' || field === null) {
        throw validationError('headerFields', `Header field ${key} must be an object`)
      }
      if (typeof field.enabled !== 'boolean') {
        throw validationError('headerFields', `Header field ${key}.enabled must be a boolean`)
      }
      if (typeof field.label !== 'string') {
        throw validationError('headerFields', `Header field ${key}.label must be a string`)
      }
    }
  }

  if (footerText !== undefined) {
    if (footerText !== null && typeof footerText !== 'string') {
      throw validationError('footerText', 'Must be a string or null')
    }
    if (footerText && footerText.length > 500) {
      throw validationError('footerText', 'Must be 500 characters or less')
    }
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  // Upsert configuration
  const config = await prisma.companyTransmittalConfig.upsert({
    where: { companyId: session.user.companyId },
    create: {
      companyId: session.user.companyId,
      ...(numberPrefix !== undefined && { numberPrefix }),
      ...(numberPadding !== undefined && { numberPadding }),
      ...(columns !== undefined && { columns }),
      ...(headerFields !== undefined && { headerFields }),
      ...(footerText !== undefined && { footerText }),
    },
    update: {
      ...(numberPrefix !== undefined && { numberPrefix }),
      ...(numberPadding !== undefined && { numberPadding }),
      ...(columns !== undefined && { columns }),
      ...(headerFields !== undefined && { headerFields }),
      ...(footerText !== undefined && { footerText }),
    },
  })

  // Log audit event
  logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.CUSTOM_ROLE_UPDATED, // Reuse existing audit action for settings changes
    resourceType: 'CompanyTransmittalConfig',
    resourceId: config.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.MANAGE_CUSTOM_ROLES],
    metadata: {
      changes: {
        numberPrefix,
        numberPadding,
        columnsUpdated: columns !== undefined,
        headerFieldsUpdated: headerFields !== undefined,
        footerTextUpdated: footerText !== undefined,
      },
    },
  }).catch((err) => console.error('Failed to log audit event:', err))

  return Response.json({
    config: {
      id: config.id,
      numberPrefix: config.numberPrefix,
      numberPadding: config.numberPadding,
      columns: config.columns,
      headerFields: config.headerFields,
      footerText: config.footerText,
      updatedAt: config.updatedAt.toISOString(),
    },
  })
})
