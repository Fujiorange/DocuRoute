import { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/auth'
import { prismaAdmin } from '@docuroute/db'
import { AuditVaultEventType } from '@docuroute/types'
import { validationError, notFound, unauthorized } from '@docuroute/core/src/errors'
import { logVaultEvent } from '@docuroute/core/src/audit'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { TransmittalReturnEmail } from '@docuroute/emails'

const resendApiKey = process.env.RESEND_API_KEY
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@docuroute.com'

export const POST = withApiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const transmittalId = params.id
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    throw validationError('token', 'Token is required')
  }

  const body = await req.json()
  const { action, message } = body

  if (!action || !['acknowledge', 'return'].includes(action)) {
    throw validationError('action', 'Action must be either "acknowledge" or "return"')
  }

  const recipient = await prismaAdmin.transmittalRecipient.findFirst({
    where: {
      transmittalId,
      token,
    },
    include: {
      transmittal: {
        select: {
          id: true,
          companyId: true,
          number: true,
          subject: true,
          createdBy: true,
        },
      },
    },
  })

  if (!recipient) {
    throw unauthorized('Invalid transmittal ID or token')
  }

  if (recipient.status === 'ACKNOWLEDGED') {
    throw validationError('status', 'Transmittal has already been acknowledged')
  }

  const now = new Date()

  if (action === 'acknowledge') {
    await prismaAdmin.transmittalRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: now,
        message: message || null,
      },
    })

    await logVaultEvent({
      userId: null,
      userEmail: recipient.email,
      companyId: recipient.transmittal.companyId,
      eventType: AuditVaultEventType.TRANSMITTAL_ACKNOWLEDGED,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      permissionsUsed: [],
      metadata: {
        transmittalId: recipient.transmittalId,
        transmittalNumber: recipient.transmittal.number,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientCompany: recipient.company,
        message: message || null,
      },
      documentFingerprint: null,
    }).catch((err) => console.error('Failed to log vault event:', err))

    return Response.json({
      success: true,
      message: 'Transmittal acknowledged successfully',
    })
  } else {
    await prismaAdmin.transmittalRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: now,
        message: message || 'Transmittal returned',
      },
    })

    await prismaAdmin.transmittal.update({
      where: { id: transmittalId },
      data: { status: 'RETURNED' },
    })

    await logVaultEvent({
      userId: null,
      userEmail: recipient.email,
      companyId: recipient.transmittal.companyId,
      eventType: AuditVaultEventType.TRANSMITTAL_RETURNED,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      permissionsUsed: [],
      metadata: {
        transmittalId: recipient.transmittalId,
        transmittalNumber: recipient.transmittal.number,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientCompany: recipient.company,
        returnReason: message || 'No reason provided',
      },
      documentFingerprint: null,
    }).catch((err) => console.error('Failed to log vault event:', err))

    const sender = await prismaAdmin.user.findUnique({
      where: { id: recipient.transmittal.createdBy },
      select: { name: true, email: true },
    })

    if (sender?.email && resendApiKey) {
      const resend = new Resend(resendApiKey)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const viewUrl = `${baseUrl}/transmittals/${transmittalId}`

      const emailHtml = render(
        TransmittalReturnEmail({
          transmittalNumber: recipient.transmittal.number,
          subject: recipient.transmittal.subject,
          senderName: sender.name || sender.email,
          recipientEmail: recipient.email,
          recipientName: recipient.name || undefined,
          recipientCompany: recipient.company || undefined,
          returnMessage: message || undefined,
          viewUrl,
        })
      )

      try {
        await resend.emails.send({
          from: resendFromEmail,
          to: sender.email,
          subject: `Transmittal ${recipient.transmittal.number} has been returned`,
          html: emailHtml,
        })
      } catch (error) {
        console.error('Failed to send return notification email:', error)
      }
    }

    return Response.json({
      success: true,
      message: 'Transmittal returned successfully',
    })
  }
})

export const GET = withApiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const transmittalId = params.id
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    throw validationError('token', 'Token is required')
  }

  const recipient = await prismaAdmin.transmittalRecipient.findFirst({
    where: {
      transmittalId,
      token,
    },
    include: {
      transmittal: {
        select: {
          id: true,
          number: true,
          subject: true,
          message: true,
          status: true,
          sentAt: true,
          expiresAt: true,
        },
      },
    },
  })

  if (!recipient) {
    throw unauthorized('Invalid transmittal ID or token')
  }

  if (!recipient.viewedAt) {
    await prismaAdmin.transmittalRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'VIEWED',
        viewedAt: new Date(),
      },
    })
  }

  const transmittalDocuments = await prismaAdmin.transmittalDocument.findMany({
    where: { transmittalId },
    select: {
      id: true,
      documentId: true,
      revisionId: true,
    },
  })

  const documentIds = transmittalDocuments.map((d) => d.documentId)
  const revisionIds = transmittalDocuments.map((d) => d.revisionId)

  const documents = await prismaAdmin.document.findMany({
    where: { id: { in: documentIds } },
    select: {
      id: true,
      documentCode: true,
      title: true,
      filename: true,
    },
  })

  const revisions = await prismaAdmin.documentRevision.findMany({
    where: { id: { in: revisionIds } },
    select: {
      id: true,
      documentId: true,
      revisionCode: true,
      discipline: true,
      issuePurpose: true,
    },
  })

  const revisionMap = new Map(revisions.map((r) => [r.id, r]))
  const documentMap = new Map(documents.map((d) => [d.id, d]))

  const enrichedDocuments = transmittalDocuments.map((td) => {
    const revision = revisionMap.get(td.revisionId)!
    const document = documentMap.get(td.documentId)!
    return {
      id: td.id,
      documentId: td.documentId,
      documentCode: document.documentCode,
      title: document.title,
      filename: document.filename,
      revisionCode: revision.revisionCode,
      discipline: revision.discipline,
      issuePurpose: revision.issuePurpose,
    }
  })

  return Response.json({
    transmittal: {
      id: recipient.transmittal.id,
      number: recipient.transmittal.number,
      subject: recipient.transmittal.subject,
      message: recipient.transmittal.message,
      status: recipient.transmittal.status,
      sentAt: recipient.transmittal.sentAt?.toISOString() || null,
      expiresAt: recipient.transmittal.expiresAt?.toISOString() || null,
      documents: enrichedDocuments,
    },
    recipient: {
      email: recipient.email,
      name: recipient.name,
      company: recipient.company,
      status: recipient.status,
      viewedAt: recipient.viewedAt?.toISOString() || null,
      acknowledgedAt: recipient.acknowledgedAt?.toISOString() || null,
    },
  })
})
