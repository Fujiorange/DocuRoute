'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Permission } from '@docuroute/types'
import { DocumentStatusBadge } from '@/components/documents/document-status-badge'
import { DisciplineBadge } from '@/components/documents/discipline-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Clock, User, FileText } from 'lucide-react'

interface DocumentRevision {
  id: string
  revisionCode: string
  status: string
  discipline: string | null
  issuePurpose: string | null
  watermarkStatus: string
  uploadedBy: string
  createdAt: string
}

interface DocumentDetail {
  id: string
  documentCode: string | null
  title: string | null
  filename: string
  fileKey: string
  fileSize: number
  mimeType: string
  status: string
  discipline: string | null
  issuePurpose: string | null
  watermarkStatus: string
  uploadedBy: string
  createdAt: string
  updatedAt: string
  revisions: DocumentRevision[]
}

interface AuditEntry {
  id: string
  action: string
  userId: string | null
  createdAt: string
  metadata: any
}

/**
 * Document Detail Page
 *
 * Displays complete document information including:
 * - Document metadata
 * - All revisions with current revision highlighted
 * - Basic audit history
 *
 * Logs document view to audit log when accessed.
 */
export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const documentId = params?.id as string

  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!documentId) return

    const fetchDocument = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/documents/' + documentId)

        if (!res.ok) {
          throw new Error('Failed to fetch document')
        }

        const data = await res.json()
        setDocument(data.document)
        setAuditLog(data.auditLog || [])
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load document. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [documentId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">Loading document...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Document not found</p>
          <Button onClick={() => router.push('/documents')} className="mt-4">
            Back to Documents
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/documents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{document.documentCode || document.filename}</h1>
          <p className="text-muted-foreground mt-1">{document.title || 'No title'}</p>
        </div>
      </div>

      {/* Document Info */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Document Code</label>
            <p className="text-lg">{document.documentCode || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <p className="text-lg">{document.title || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Filename</label>
            <p className="text-sm font-mono">{document.filename}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">File Size</label>
            <p>{formatFileSize(document.fileSize)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              <DocumentStatusBadge
                status={document.status as any}
                issuePurpose={document.issuePurpose as any}
                watermarkStatus={document.watermarkStatus as any}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Discipline</label>
            <div className="mt-1">
              <DisciplineBadge discipline={document.discipline} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created At</label>
            <p className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              {formatDate(document.createdAt)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
            <p className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              {formatDate(document.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revisions */}
      <Card>
        <CardHeader>
          <CardTitle>Revision History</CardTitle>
        </CardHeader>
        <CardContent>
          {document.revisions.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No revisions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revision Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discipline</TableHead>
                  <TableHead>Watermark</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.revisions.map((revision) => (
                  <TableRow
                    key={revision.id}
                    className={revision.status === 'CURRENT' ? 'bg-green-50' : ''}
                  >
                    <TableCell className="font-medium font-mono">
                      {revision.revisionCode}
                      {revision.status === 'CURRENT' && (
                        <Badge className="ml-2 bg-green-600 text-white">CURRENT</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={revision.status === 'CURRENT' ? 'default' : 'secondary'}>
                        {revision.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DisciplineBadge discipline={revision.discipline} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{revision.watermarkStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(revision.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History (Recent)</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No audit entries found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {entry.userId || 'System'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
