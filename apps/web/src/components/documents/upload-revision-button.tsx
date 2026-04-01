'use client'

import { useState } from 'react'
import { Permission } from '@docuroute/types'
import { PermissionGate } from '@/components/roles/permission-gate'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2 } from 'lucide-react'
import crypto from 'crypto'

interface UploadRevisionButtonProps {
  documentId: string
  onRevisionUploaded: () => void
}

/**
 * Upload Revision Button Component
 *
 * Allows users with UPLOAD_DOCUMENT permission to upload new revisions.
 *
 * Flow:
 * 1. User selects file
 * 2. Client calculates SHA-256 hash
 * 3. Request presigned URL from /api/upload/presign
 * 4. Upload file directly to R2 using presigned URL
 * 5. Call /api/documents/[id]/upload-revision to create revision record
 *
 * This follows the same upload pattern as initial document upload but
 * creates a new revision instead of a new document.
 */
export function UploadRevisionButton({ documentId, onRevisionUploaded }: UploadRevisionButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      // Step 1: Calculate file hash
      const sha256Hash = await calculateFileHash(file)

      // Step 2: Get presigned URL
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          sha256Hash,
          isRevision: true, // Indicate this is a revision upload
        }),
      })

      if (!presignRes.ok) {
        const error = await presignRes.json()
        throw new Error(error.error?.message || 'Failed to get upload URL')
      }

      const { uploadUrl, fileKey } = await presignRes.json()

      // Step 3: Upload file directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage')
      }

      // Step 4: Create revision record
      const revisionRes = await fetch(`/api/documents/${documentId}/upload-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          filename: file.name,
          sha256Hash,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })

      if (!revisionRes.ok) {
        const error = await revisionRes.json()
        throw new Error(error.error?.message || 'Failed to create revision')
      }

      const { revision, previousRevisionCode } = await revisionRes.json()

      toast({
        title: 'Revision uploaded successfully',
        description: `New revision ${revision.revisionCode} created (previous: ${previousRevisionCode})`,
      })

      // Reset state and close dialog
      setFile(null)
      setIsOpen(false)
      onRevisionUploaded() // Refresh document data
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <PermissionGate requiredPermissions={[Permission.UPLOAD_DOCUMENT]}>
      <Button onClick={() => setIsOpen(true)} size="sm">
        <Upload className="h-4 w-4 mr-2" />
        Upload New Revision
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload New Revision</DialogTitle>
            <DialogDescription>
              Upload a new version of this document. The current revision will be marked as
              superseded, and a new revision code will be automatically assigned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The current revision will be automatically superseded. Only
                one revision can be current at a time.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Revision
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  )
}
