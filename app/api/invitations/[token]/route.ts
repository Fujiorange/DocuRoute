import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      company: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
  }

  if (invitation.acceptedAt) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
  }

  return NextResponse.json({
    invitation: {
      email: invitation.email,
      role: invitation.role,
      company: invitation.company,
      invitedBy: invitation.invitedBy,
    },
  })
}
