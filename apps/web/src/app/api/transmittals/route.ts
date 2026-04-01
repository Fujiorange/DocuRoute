import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { Permission, AuditAction } from '@docuroute/types'
import { unauthorized, validationError, notFound } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import crypto from 'crypto'

export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  requirePermission(
    {
      userId: session.user.id,
      companyId: session.user.companyId,
      permissions: session.user.permissions,
      systemRoleKey: session.user.systemRoleKey,
      roleName: session.user.roleName,
    },
    [Permission.CREATE_TRANSMITTAL]
  )

  const body = await req.json()
  const { subject, message, documentIds, recipients, expiresAt } = body

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    throw validationError('subject', 'Subject is required')
  }

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw validationError('documentIds', 'At least one document is required')
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw validationError('recipients', 'At least one recipient is required')
  }

  for (const recipient of recipients) {
    if (!recipient.email || typeof recipient.email !== 'string') {
      throw validationError('recipients', 'All recipients must have an email address')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
      throw validationError('recipients', `Invalid email address: ${recipient.email}`)
    }
  }

  const prisma = getPrismaForCompany(session.user.companyId)
  const currentYear = new Date().getFullYear()

  const transmittalData = await prisma.$transaction(async (tx) => {
    const counter = await tx.transmittalCounter.upsert({
      where: {
        companyId_year: {
          companyId: session.user.companyId,
          year: currentYear,
        },
      },
      update: {
        sequence: { increment: 1 },
      },
      create: {
        companyId: session.user.companyId,
        year: currentYear,
        sequence: 1,
      },
    })

    const transmittalNumber = `TR-${currentYear}-${String(counter.sequence).padStart(3, '0')}`

    const documents = await tx.document.findMany({
      where: {
        id: { in: documentIds },
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        documentCode: true,
        title: true,
        filename: true,
      },
    })

    if (documents.length !== documentIds.length) {
      throw notFound('One or more documents not found')
    }

    const revisions = await tx.documentRevision.findMany({
      where: {
        documentId: { in: documentIds },
        companyId: session.user.companyId,
        status: 'CURRENT',
      },
      select: {
        id: true,
        documentId: true,
        revisionCode: true,
      },
    })

    if (revisions.length !== documentIds.length) {
      throw validationError(
        'documentIds',
        'One or more documents do not have a current revision'
      )
    }

    const revisionMap = new Map(revisions.map((r) => [r.documentId, r]))

    const transmittal = await tx.transmittal.create({
      data: {
        companyId: session.user.companyId,
        number: transmittalNumber,
        subject: subject.trim(),
        message: message?.trim() || null,
        status: 'DRAFT',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.user.id,
      },
    })

    const transmittalDocuments = await Promise.all(
      documents.map((doc) => {
        const revision = revisionMap.get(doc.id)!
        return tx.transmittalDocument.create({
          data: {
            transmittalId: transmittal.id,
            documentId: doc.id,
            revisionId: revision.id,
          },
        })
      })
    )

    const transmittalRecipients = await Promise.all(
      recipients.map((recipient: any) => {
        const token = crypto.randomBytes(32).toString('hex')
        return tx.transmittalRecipient.create({
          data: {
            transmittalId: transmittal.id,
            email: recipient.email.toLowerCase().trim(),
            name: recipient.name?.trim() || null,
            company: recipient.company?.trim() || null,
            token,
            status: 'PENDING',
          },
        })
      })
    )

    return {
      transmittal,
      documents: transmittalDocuments.map((td) => {
        const doc = documents.find((d) => d.id === td.documentId)!
        const revision = revisionMap.get(td.documentId)!
        return {
          documentId: td.documentId,
          revisionId: td.revisionId,
          revisionCode: revision.revisionCode,
          documentCode: doc.documentCode,
          title: doc.title,
          filename: doc.filename,
        }
      }),
      recipients: transmittalRecipients,
    }
  })

  logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.TRANSMITTAL_CREATED,
    resourceType: 'Transmittal',
    resourceId: transmittalData.transmittal.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.CREATE_TRANSMITTAL],
    metadata: {
      transmittalNumber: transmittalData.transmittal.number,
      subject: transmittalData.transmittal.subject,
      documentCount: transmittalData.documents.length,
      recipientCount: transmittalData.recipients.length,
    },
  }).catch((err) => console.error('Failed to log audit event:', err))

  return Response.json({
    transmittal: {
      id: transmittalData.transmittal.id,
      number: transmittalData.transmittal.number,
      subject: transmittalData.transmittal.subject,
      message: transmittalData.transmittal.message,
      status: transmittalData.transmittal.status,
      createdBy: transmittalData.transmittal.createdBy,
      createdAt: transmittalData.transmittal.createdAt.toISOString(),
      expiresAt: transmittalData.transmittal.expiresAt?.toISOString() || null,
      documents: transmittalData.documents,
      recipients: transmittalData.recipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        company: r.company,
        status: r.status,
      })),
    },
  })
})
