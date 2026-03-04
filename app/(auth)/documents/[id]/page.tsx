'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { FileText, Download, Trash2, ArrowLeft, Edit } from 'lucide-react'

interface Document {
  id: string
  title: string
  description: string | null
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { name: string }
  project: { id: string; name: string } | null
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '' })

  useEffect(() => {
    fetch(`/api/documents/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.document) {
          setDoc(data.document)
          setEditForm({ title: data.document.title, description: data.document.description || '' })
        }
        setLoading(false)
      })
  }, [params.id])

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/documents/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }
    setDoc(data.document)
    setEditOpen(false)
    toast({ title: 'Success', description: 'Document updated' })
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this document?')) return
    setDeleting(true)
    const res = await fetch(`/api/documents/${params.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Deleted', description: 'Document deleted' })
      router.push('/documents')
    } else {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Document not found</p>
        <Link href="/documents"><Button variant="outline" className="mt-4">Back to Documents</Button></Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/documents">
        <Button variant="ghost" size="sm" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Documents
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">{doc.title}</CardTitle>
                {doc.description && <p className="text-gray-600 mt-1">{doc.description}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit Document</DialogTitle></DialogHeader>
                  <form onSubmit={handleEdit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={editForm.description}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">File Name</span>
              <p className="font-medium">{doc.fileName}</p>
            </div>
            <div>
              <span className="text-gray-500">File Size</span>
              <p className="font-medium">{(doc.fileSize / 1024).toFixed(2)} KB</p>
            </div>
            <div>
              <span className="text-gray-500">Type</span>
              <p className="font-medium">{doc.mimeType}</p>
            </div>
            <div>
              <span className="text-gray-500">Uploaded By</span>
              <p className="font-medium">{doc.uploadedBy.name}</p>
            </div>
            {doc.project && (
              <div>
                <span className="text-gray-500">Project</span>
                <p className="font-medium">
                  <Link href={`/projects/${doc.project.id}`} className="text-blue-600 hover:underline">
                    {doc.project.name}
                  </Link>
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Uploaded</span>
              <p className="font-medium">{new Date(doc.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <a href={`/api/documents/${doc.id}/download`}>
              <Button className="gap-2">
                <Download className="h-4 w-4" /> Download File
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
