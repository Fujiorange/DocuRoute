import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      uploadedBy: { select: { name: true } },
      project: { select: { id: true, name: true } },
    },
  })

  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  return NextResponse.json({ document })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const document = await prisma.document.findFirst({
    where: { id, companyId: user.companyId },
  })
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: body.title ?? document.title,
      description: body.description ?? document.description,
    },
  })

  return NextResponse.json({ document: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, companyId: user.companyId },
  })
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  try {
    const fullPath = path.join(process.cwd(), document.filePath)
    await unlink(fullPath)
  } catch {
    // File may not exist, continue
  }

  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
