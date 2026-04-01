import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import { Permission, AuditAction, AuditVaultEventType } from '@docuroute/types'
import { unauthorized, notFound, conflict } from '@docuroute/core/src/errors'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { TransmittalEmail } from '@docuroute/emails'

const resendApiKey = process.env.RESEND_API_KEY
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@docuroute.com'

export const POST = withApiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
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
    [Permission.SEND_TRANSMITTAL]
  )

  const transmittalId = params.id
  const prisma = getPrismaForCompany(session.user.companyId)

  const transmittal = await prisma.transmittal.findUnique({
    where: { id: transmittalId },
    include: {
      documents: {
        select: {
          id: true,
          documentId: true,
          revisionId: true,
        },
      },
      recipients: {
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          token: true,
          status: true,
        },
      },
    },
  })

  if (!transmittal) {
    throw notFound('Transmittal not found')
  }

  if (transmittal.status !== 'DRAFT') {
    throw conflict('Transmittal has already been sent')
  }

  const documentIds = transmittal.documents.map((d) => d.documentId)
  const revisionIds = transmittal.documents.map((d) => d.revisionId)

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
    },
  })

  const revisionMap = new Map(revisions.map((r) => [r.id, r]))
  const documentMap = new Map(documents.map((d) => [d.id, d]))

  const enrichedDocuments = transmittal.documents.map((td) => {
    const revision = revisionMap.get(td.revisionId)!
    const document = documentMap.get(td.documentId)!
    return {
      documentCode: document.documentCode,
      title: document.title,
      filename: document.filename,
      revisionCode: revision.revisionCode,
    }
  })

  const company = await prismaAdmin.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  const user = await prismaAdmin.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured - skipping email send')
  } else {
    const resend = new Resend(resendApiKey)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const recipient of transmittal.recipients) {
      const acknowledgeUrl = `${baseUrl}/acknowledge/${transmittalId}?token=${recipient.token}`

      const emailHtml = render(
        TransmittalEmail({
          transmittalNumber: transmittal.number,
          subject: transmittal.subject,
          message: transmittal.message || undefined,
          senderCompany: company?.name || 'Unknown Company',
          senderName: user?.name || user?.email || 'Unknown User',
          recipientName: recipient.name || undefined,
          documentCount: enrichedDocuments.length,
          documents: enrichedDocuments,
          acknowledgeUrl,
          expiresAt: transmittal.expiresAt?.toISOString(),
        })
      )

      try {
        await resend.emails.send({
          from: resendFromEmail,
          to: recipient.email,
          subject: `Document Transmittal ${transmittal.number} from ${company?.name}`,
          html: emailHtml,
        })
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error)
      }
    }
  }

  await prisma.transmittal.update({
    where: { id: transmittalId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  logAuditEvent({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: AuditAction.TRANSMITTAL_SENT,
    resourceType: 'Transmittal',
    resourceId: transmittalId,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    permissionsUsed: [Permission.SEND_TRANSMITTAL],
    metadata: {
      transmittalNumber: transmittal.number,
      subject: transmittal.subject,
      documentCount: enrichedDocuments.length,
      recipientCount: transmittal.recipients.length,
      recipientEmails: transmittal.recipients.map((r) => r.email),
    },
  }).catch((err) => console.error('Failed to log audit event:', err))

  return Response.json({
    transmittal: {
      id: transmittal.id,
      number: transmittal.number,
      subject: transmittal.subject,
      status: 'SENT',
      sentAt: new Date().toISOString(),
    },
  })
})
