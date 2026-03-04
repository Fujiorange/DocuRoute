'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Search, Download } from 'lucide-react'

interface Document {
  id: string
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { name: string }
  project: { name: string } | null
}

interface Project {
  id: string
  name: string
}

function DocumentsContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ title: '', description: '', projectId: '' })

  const projectIdFilter = searchParams.get('projectId')

  useEffect(() => {
    fetchDocuments()
    fetchProjects()
  }, [projectIdFilter])

  async function fetchDocuments() {
    const url = projectIdFilter ? `/api/documents?projectId=${projectIdFilter}` : '/api/documents'
    const res = await fetch(url)
    const data = await res.json()
    setDocuments(data.documents || [])
    setLoading(false)
  }

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data.projects || [])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !form.title) {
      toast({ title: 'Error', description: 'File and title are required', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', form.title)
      if (form.description) fd.append('description', form.description)
      if (form.projectId) fd.append('projectId', form.projectId)

      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      setDialogOpen(false)
      setForm({ title: '', description: '', projectId: '' })
      if (fileRef.current) fileRef.current.value = ''
      fetchDocuments()
      toast({ title: 'Success', description: 'Document uploaded successfully' })
    } finally {
      setUploading(false)
    }
  }

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.fileName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">All your project documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Document title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project (optional)</Label>
                <select
                  id="project"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.projectId}
                  onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input id="file" type="file" ref={fileRef} required />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search documents..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No documents found</h3>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 mt-4"><Plus className="h-4 w-4" /> Upload First Document</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <Link href={`/documents/${doc.id}`} className="font-medium hover:text-blue-600">{doc.title}</Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{doc.fileName}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">by {doc.uploadedBy.name}</span>
                    {doc.project && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <Badge variant="outline" className="text-xs py-0">{doc.project.name}</Badge>
                      </>
                    )}
                  </div>
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

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-8 w-64 mb-4" /></div>}>
      <DocumentsContent />
    </Suspense>
  )
}
