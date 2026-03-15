'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { EngineeringDiscipline, IssuePurpose } from '@docuroute/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, FileIcon, AlertTriangle } from 'lucide-react'

type UploadState = 'idle' | 'hashing' | 'checking' | 'uploading' | 'confirming' | 'pending_scan' | 'success' | 'error'

interface DropzoneProps {
  onUploadComplete?: (documentId: string) => void
  projectId?: string
}

export function DocumentDropzone({ onUploadComplete, projectId }: DropzoneProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [discipline, setDiscipline] = useState<EngineeringDiscipline | ''>('')
  const [issuePurpose, setIssuePurpose] = useState<IssuePurpose | ''>('')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningMessage, setWarningMessage] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    setSelectedFile(acceptedFiles[0])
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/vnd.dwg': ['.dwg'],
      'image/vnd.dxf': ['.dxf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: false,
  })

  const computeSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const handleUpload = async () => {
    if (!selectedFile || !discipline || !issuePurpose) {
      setError('Please select a file, discipline, and issue purpose')
      return
    }

    try {
      // Step 1: Hash file
      setState('hashing')
      const sha256Hash = await computeSHA256(selectedFile)

      // Step 2: Get presigned URL
      setState('checking')
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          discipline,
          issuePurpose,
        }),
      })

      if (!presignRes.ok) {
        const errorData = await presignRes.json()
        throw new Error(errorData.error?.message || 'Failed to get upload URL')
      }

      const presignData = await presignRes.json()

      // Check for watermark warning
      if (presignData.warning) {
        setWarningMessage(presignData.warning.message)
        setShowWarningModal(true)
        // Store presign data for later use if user confirms
        ;(window as any).__presignData = presignData
        ;(window as any).__sha256Hash = sha256Hash
        setState('idle')
        return
      }

      // Step 3: Upload to R2
      setState('uploading')
      await uploadToR2(selectedFile, presignData.uploadUrl)

      // Step 4: Confirm upload
      setState('confirming')
      await confirmUpload(presignData.fileKey, selectedFile, sha256Hash, false)
    } catch (err: any) {
      setState('error')
      setError(err.message || 'Upload failed')
    }
  }

  const uploadToR2 = async (file: File, uploadUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error('Upload failed'))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Upload failed')))
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  const confirmUpload = async (
    fileKey: string,
    file: File,
    sha256Hash: string,
    acknowledgedWatermarkSkip: boolean
  ) => {
    const confirmRes = await fetch('/api/upload/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileKey,
        filename: file.name,
        sha256Hash,
        fileSize: file.size,
        mimeType: file.type,
        discipline,
        issuePurpose,
        projectId,
        acknowledgedWatermarkSkip,
      }),
    })

    if (!confirmRes.ok) {
      const errorData = await confirmRes.json()
      throw new Error(errorData.error?.message || 'Failed to confirm upload')
    }

    const confirmData = await confirmRes.json()

    setState('success')
    if (onUploadComplete) {
      onUploadComplete(confirmData.documentId)
    }

    // Reset after 2 seconds
    setTimeout(() => {
      setSelectedFile(null)
      setDiscipline('')
      setIssuePurpose('')
      setState('idle')
      setUploadProgress(0)
    }, 2000)
  }

  const handleWarningConfirm = async () => {
    setShowWarningModal(false)
    const presignData = (window as any).__presignData
    const sha256Hash = (window as any).__sha256Hash

    if (!selectedFile || !presignData || !sha256Hash) {
      setError('Upload session expired. Please try again.')
      return
    }

    try {
      // Continue with upload
      setState('uploading')
      await uploadToR2(selectedFile, presignData.uploadUrl)

      setState('confirming')
      await confirmUpload(presignData.fileKey, selectedFile, sha256Hash, true)
    } catch (err: any) {
      setState('error')
      setError(err.message || 'Upload failed')
    }
  }

  const handleWarningCancel = () => {
    setShowWarningModal(false)
    setSelectedFile(null)
    setState('idle')
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${state !== 'idle' && state !== 'error' ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {selectedFile ? (
            <>
              <FileIcon className="h-12 w-12 text-primary" />
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Drop files here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                PDF, DWG, DXF, XLSX, DOCX, PNG, JPG (max 500MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Metadata selectors */}
      {selectedFile && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discipline">Engineering Discipline *</Label>
            <Select value={discipline} onValueChange={(v) => setDiscipline(v as EngineeringDiscipline)}>
              <SelectTrigger id="discipline">
                <SelectValue placeholder="Select discipline" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(EngineeringDiscipline).map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="issuePurpose">Issue Purpose *</Label>
            <Select value={issuePurpose} onValueChange={(v) => setIssuePurpose(v as IssuePurpose)}>
              <SelectTrigger id="issuePurpose">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(IssuePurpose).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* FOR_CONSTRUCTION warning */}
      {issuePurpose === IssuePurpose.FOR_CONSTRUCTION && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This authorises physical work on site. Ensure document is approved and current.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload progress */}
      {state !== 'idle' && state !== 'error' && state !== 'success' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">{state.replace('_', ' ')}</span>
            {state === 'uploading' && <span>{uploadProgress}%</span>}
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Success message */}
      {state === 'success' && (
        <Alert>
          <AlertDescription>Upload successful! Document is pending scan.</AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload button */}
      {selectedFile && state === 'idle' && (
        <Button onClick={handleUpload} disabled={!discipline || !issuePurpose} className="w-full">
          Upload Document
        </Button>
      )}

      {/* Warning modal for oversized FOR_CONSTRUCTION files */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Verification Unavailable</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>{warningMessage}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleWarningCancel}>
              Cancel Upload
            </Button>
            <Button onClick={handleWarningConfirm}>I Understand  Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
