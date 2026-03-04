'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, ArrowLeft, Download } from 'lucide-react'

interface Document {
  id: string
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { name: string }
}

interface Project {
  id: string
  name: string
  description: string | null
  createdBy: { name: string }
  documents: Document[]
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.project) setProject(data.project)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Project not found</p>
        <Link href="/projects"><Button variant="outline" className="mt-4">Back to Projects</Button></Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
        <p className="text-sm text-gray-500 mt-1">Created by {project.createdBy.name}</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Documents ({project.documents.length})</h2>
        <Link href={`/documents?projectId=${project.id}`}>
          <Button size="sm" className="gap-2">View in Documents</Button>
        </Link>
      </div>

      {project.documents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No documents in this project yet</p>
          <Link href={`/documents?projectId=${project.id}`}>
            <Button variant="outline" className="mt-3 gap-2">Upload Document</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {project.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <Link href={`/documents/${doc.id}`} className="font-medium hover:text-blue-600">{doc.title}</Link>
                  <p className="text-sm text-gray-500">{doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB · {doc.uploadedBy.name}</p>
                </div>
              </div>
              <a href={`/api/documents/${doc.id}/download`}>
                <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
