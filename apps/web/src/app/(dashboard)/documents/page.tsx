'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Permission, DocumentStatus, EngineeringDiscipline } from '@docuroute/types'
import { PermissionGate } from '@/components/roles/permission-gate'
import { DocumentStatusBadge } from '@/components/documents/document-status-badge'
import { DisciplineBadge } from '@/components/documents/discipline-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw } from 'lucide-react'

interface DocumentItem {
  id: string
  documentCode: string
  title: string
  revisionCode: string
  status: string
  discipline: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
  hasMore: boolean
}

/**
 * Document Register Page
 *
 * Fast, searchable table view of all documents with current revisions.
 * Replaces Excel-style document tracking with real-time database view.
 *
 * Features:
 * - Search by document code or title
 * - Filter by status and discipline
 * - Paginated results (50 per page)
 * - Click row to view document details
 *
 * Performance target: <1s load time for 1000 records
 */
export default function DocumentsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      })

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      if (disciplineFilter !== 'all') {
        params.set('discipline', disciplineFilter)
      }

      const res = await fetch('/api/documents?' + params.toString())

      if (!res.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await res.json()
      setDocuments(data.data)
      setPagination(data.pagination)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load documents. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [currentPage, statusFilter, disciplineFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchDocuments()
  }

  const handleRowClick = (documentId: string) => {
    router.push('/documents/' + documentId)
  }

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Register</h1>
          <p className="text-muted-foreground mt-1">
            Fast, searchable document table with current revisions
          </p>
        </div>
        <PermissionGate requiredPermissions={[Permission.UPLOAD_DOCUMENT]}>
          <Button onClick={() => router.push('/upload')}>Upload Document</Button>
        </PermissionGate>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-end">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by document code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="mt-auto">
            Search
          </Button>
        </form>

        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={DocumentStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={DocumentStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={DocumentStatus.SUPERSEDED}>Superseded</SelectItem>
              <SelectItem value={DocumentStatus.ARCHIVED}>Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Discipline</label>
          <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All disciplines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              {Object.values(EngineeringDiscipline).map((discipline) => (
                <SelectItem key={discipline} value={discipline}>
                  {discipline.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Results Count */}
      {pagination && (
        <div className="text-sm text-muted-foreground">
          Showing {documents.length} of {pagination.total} documents
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Revision</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Discipline</TableHead>
              <TableHead>Updated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading documents...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No documents found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => handleRowClick(doc.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{doc.documentCode}</TableCell>
                  <TableCell>{doc.title}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{doc.revisionCode}</span>
                  </TableCell>
                  <TableCell>
                    <DocumentStatusBadge status={doc.status as any} />
                  </TableCell>
                  <TableCell>
                    <DisciplineBadge discipline={doc.discipline} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pagination.hasMore || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
