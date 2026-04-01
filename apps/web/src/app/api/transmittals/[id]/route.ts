import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler, requirePermission } from '@/lib/auth'
import { getPrismaForCompany, prismaAdmin } from '@docuroute/db'
import { Permission } from '@docuroute/types'
import { unauthorized, notFound } from '@docuroute/core/src/errors'

export const GET = withApiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
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
    [Permission.VIEW_TRANSMITTAL]
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
          addedAt: true,
        },
      },
      recipients: {
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          status: true,
          viewedAt: true,
          acknowledgedAt: true,
          message: true,
          createdAt: true,
        },
      },
    },
  })

  if (!transmittal) {
    throw notFound('Transmittal not found')
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
      discipline: true,
      issuePurpose: true,
    },
  })

  const revisionMap = new Map(revisions.map((r) => [r.id, r]))
  const documentMap = new Map(documents.map((d) => [d.id, d]))

  const enrichedDocuments = transmittal.documents.map((td) => {
    const revision = revisionMap.get(td.revisionId)!
    const document = documentMap.get(td.documentId)!
    return {
      id: td.id,
      documentId: td.documentId,
      revisionId: td.revisionId,
      documentCode: document.documentCode,
      title: document.title,
      filename: document.filename,
      revisionCode: revision.revisionCode,
      discipline: revision.discipline,
      issuePurpose: revision.issuePurpose,
      addedAt: td.addedAt.toISOString(),
    }
  })

  return Response.json({
    transmittal: {
      id: transmittal.id,
      number: transmittal.number,
      subject: transmittal.subject,
      message: transmittal.message,
      status: transmittal.status,
      sentAt: transmittal.sentAt?.toISOString() || null,
      expiresAt: transmittal.expiresAt?.toISOString() || null,
      createdBy: transmittal.createdBy,
      createdAt: transmittal.createdAt.toISOString(),
      updatedAt: transmittal.updatedAt.toISOString(),
      documents: enrichedDocuments,
      recipients: transmittal.recipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        company: r.company,
        status: r.status,
        viewedAt: r.viewedAt?.toISOString() || null,
        acknowledgedAt: r.acknowledgedAt?.toISOString() || null,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  })
})
