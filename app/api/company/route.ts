import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    include: {
      _count: { select: { users: true, projects: true, documents: true } },
    },
  })

  return NextResponse.json({ company })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'it_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, subdomain } = body

  try {
    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: {
        ...(name ? { name } : {}),
        ...(subdomain !== undefined ? { subdomain: subdomain || null } : {}),
      },
    })
    return NextResponse.json({ company })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
