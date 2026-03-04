import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const documents = await prisma.document.findMany({
    where: {
      companyId: user.companyId,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      uploadedBy: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const projectId = formData.get('projectId') as string | null

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'uploads', user.companyId)
    await mkdir(uploadDir, { recursive: true })

    const uniqueFileName = `${Date.now()}-${file.name}`
    const filePath = path.join('uploads', user.companyId, uniqueFileName)
    const fullPath = path.join(process.cwd(), filePath)

    await writeFile(fullPath, buffer)

    const document = await prisma.document.create({
      data: {
        title,
        description: description || null,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        companyId: user.companyId,
        projectId: projectId || null,
        uploadedById: user.id,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
