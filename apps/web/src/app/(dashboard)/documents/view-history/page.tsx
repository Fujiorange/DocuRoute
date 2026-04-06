'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Permission, ViewType } from '@docuroute/types'
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
import { ArrowLeft, Eye, Download, QrCode, FileText, User, Globe, Clock } from 'lucide-react'

interface DocumentViewEntry {
  id: string
  documentId: string
  userId: string | null
  viewType: ViewType
  ipAddress: string | null
  userAgent: string | null
  viewedAt: string
  sessionId: string | null
}

/**
 * Document View History Page
 *
 * Admin/compliance page for viewing document access logs.
 * Shows all views, previews, downloads, and QR scans for ITAR/export-control compliance.
 *
 * Permission required: VIEW_AUDIT_LOG
 */
export default function DocumentViewHistoryPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [views, setViews] = useState<DocumentViewEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [documentFilter, setDocumentFilter] = useState<string>('')
  const [viewTypeFilter, setViewTypeFilter] = useState<ViewType | 'ALL'>('ALL')

  const fetchViews = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (documentFilter) params.append('documentId', documentFilter)
      if (viewTypeFilter !== 'ALL') params.append('viewType', viewTypeFilter)

      const res = await fetch(`/api/documents/view-history?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Failed to fetch view history')
      }

      const data = await res.json()
      setViews(data.views || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load view history. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchViews()
  }, [documentFilter, viewTypeFilter])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  const getViewTypeIcon = (viewType: ViewType) => {
    switch (viewType) {
      case ViewType.DETAIL_PAGE:
        return <FileText className="h-4 w-4" />
      case ViewType.PREVIEW:
        return <Eye className="h-4 w-4" />
      case ViewType.DOWNLOAD:
        return <Download className="h-4 w-4" />
      case ViewType.QR_SCAN:
        return <QrCode className="h-4 w-4" />
    }
  }

  const getViewTypeBadgeVariant = (viewType: ViewType) => {
    switch (viewType) {
      case ViewType.DETAIL_PAGE:
        return 'secondary'
      case ViewType.PREVIEW:
        return 'default'
      case ViewType.DOWNLOAD:
        return 'default'
      case ViewType.QR_SCAN:
        return 'outline'
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/audit-log')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audit Log
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Document View History</h1>
          <p className="text-muted-foreground mt-1">
            ITAR/export-control compliance tracking for all document access
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Document ID
            </label>
            <input
              type="text"
              placeholder="Filter by document ID..."
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              View Type
            </label>
            <select
              value={viewTypeFilter}
              onChange={(e) => setViewTypeFilter(e.target.value as ViewType | 'ALL')}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="ALL">All Types</option>
              <option value={ViewType.DETAIL_PAGE}>Detail Page</option>
              <option value={ViewType.PREVIEW}>Preview</option>
              <option value={ViewType.DOWNLOAD}>Download</option>
              <option value={ViewType.QR_SCAN}>QR Scan</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={fetchViews}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {/* View History Table */}
      <Card>
        <CardHeader>
          <CardTitle>View History ({views.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-6 text-muted-foreground">Loading view history...</p>
          ) : views.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No view entries found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>View Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Viewed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map((view) => (
                  <TableRow key={view.id}>
                    <TableCell className="font-mono text-sm">{view.documentId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getViewTypeBadgeVariant(view.viewType)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getViewTypeIcon(view.viewType)}
                        {view.viewType}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      {view.userId ? (
                        <>
                          <User className="h-4 w-4" />
                          <span className="font-mono text-sm">{view.userId}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Public (QR Scan)</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {view.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDate(view.viewedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card>
        <CardHeader>
          <CardTitle>About Document View Auditing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>DETAIL_PAGE:</strong> User opened the document details page
          </p>
          <p>
            <strong>PREVIEW:</strong> User previewed the PDF in their browser
          </p>
          <p>
            <strong>DOWNLOAD:</strong> User downloaded the document file
          </p>
          <p>
            <strong>QR_SCAN:</strong> Public QR code verification scan (no authentication)
          </p>
          <p className="mt-4 pt-4 border-t">
            View logs are retained for 90 days by default (configurable per company). This data
            is required for ITAR/export-control compliance in regulated industries.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
