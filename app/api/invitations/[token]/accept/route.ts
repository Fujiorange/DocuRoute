import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json()
  const { name, password } = body

  if (!name || !password) {
    return NextResponse.json({ error: 'Name and password are required' }, { status: 400 })
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { company: true },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  if (invitation.acceptedAt) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email: invitation.email,
      passwordHash,
      name,
      role: invitation.role,
      companyId: invitation.companyId,
    },
  })

  await prisma.invitation.update({
    where: { token },
    data: { acceptedAt: new Date() },
  })

  await createSession(user)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    },
  })
}
