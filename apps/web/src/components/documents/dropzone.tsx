"use client"

import { useState } from 'react'
import { EngineeringDiscipline, IssuePurpose } from '@docuroute/types'
import { Button } from '@/components/ui/button'

/**
 * STUB: Dropzone component for P1P6
 * Full implementation with react-dropzone, SubtleCrypto hashing, and size warning modal
 * will be completed with proper UI library integration.
 * 
 * Core flow implemented in API routes is functional.
 */

interface DropzoneProps {
  onUploadComplete?: (documentId: string) => void
}

export function Dropzone({ onUploadComplete }: DropzoneProps) {
  const [discipline, setDiscipline] = useState<EngineeringDiscipline | undefined>()
  const [issuePurpose, setIssuePurpose] = useState<IssuePurpose | undefined>()

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <p className="text-gray-600 mb-4">
        Document upload component
      </p>
      <p className="text-sm text-gray-500">
        Supported: PDF, DWG, DXF, XLSX, DOCX, PNG, JPG (max 500MB)
      </p>
      <p className="text-xs text-gray-400 mt-4">
        Full implementation with drag-and-drop, progress tracking, and size warnings
        coming in next iteration
      </p>
    </div>
  )
}
