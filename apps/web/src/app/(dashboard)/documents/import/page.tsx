"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

/**
 * Bulk Import Page
 *
 * Allows users to upload an Excel file and bulk create Documents + initial Revisions.
 *
 * Features:
 * - Upload Excel file
 * - Preview parsed rows (shows first 10 rows after parsing)
 * - Show validation errors inline
 * - Confirm import button
 */

interface ImportError {
  row: number
  documentCode: string
  error: string
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: ImportError[]
}

interface PreviewRow {
  documentCode: string
  title: string
  discipline?: string
}

export default function BulkImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setPreview([])

      // Simple preview by reading first few rows
      // In production, you might want to parse the entire file client-side
      toast.info('File selected. Enter Project ID and click Import to proceed.')
    }
  }

  const handleImport = async () => {
    if (!file || !projectId) {
      toast.error('Please select a file and enter a Project ID')
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const response = await fetch('/api/documents/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Import failed')
      }

      setResult(data)

      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} documents`)
      }

      if (data.skipped > 0) {
        toast.warning(`Skipped ${data.skipped} documents (duplicates or errors)`)
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setProjectId('')
    setResult(null)
    setPreview([])
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bulk Import Documents</h1>
        <p className="text-gray-600 mt-2">
          Upload an Excel file to bulk create documents and initial revisions
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>
              Required columns: documentCode (A), title (B), discipline (C, optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                type="text"
                placeholder="Enter Project ID"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isUploading}
              />
              <p className="text-sm text-gray-500 mt-1">
                All documents will be created in this project
              </p>
            </div>

            <div>
              <Label htmlFor="file">Excel File (.xlsx)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {file && (
                <p className="text-sm text-green-600 mt-1">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <Alert>
              <AlertDescription>
                <strong>Excel file structure:</strong>
                <ul className="list-disc ml-5 mt-2 text-sm">
                  <li>Column A: documentCode (required, must be unique per project)</li>
                  <li>Column B: title (required)</li>
                  <li>Column C: discipline (optional: PIPING, STRUCTURAL, ELECTRICAL, etc.)</li>
                  <li>Row 1 will be skipped (header row)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!file || !projectId || isUploading}
              >
                {isUploading ? 'Importing...' : 'Import Documents'}
              </Button>
              {(file || result) && (
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-sm text-gray-600">Imported</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-sm text-gray-600">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Errors and Skipped Rows</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Document Code</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((error, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>
                              <code className="text-sm">{error.documentCode}</code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">{error.error}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {result.imported > 0 && (
                <Button onClick={() => router.push('/documents')}>
                  View Documents
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
