import { notFound } from 'next/navigation'
import { QRVerificationStatus } from '@docuroute/types'

interface VerifyPageProps {
  params: {
    documentId: string
  }
}

async function getVerificationStatus(documentId: string): Promise<QRVerificationStatus | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/documents/${documentId}/verify`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return null
    }

    return await res.json()
  } catch (error) {
    console.error('Failed to fetch verification status:', error)
    return null
  }
}

function getBackgroundColor(color: 'green' | 'red' | 'amber' | 'blue'): string {
  switch (color) {
    case 'green':
      return 'bg-green-600'
    case 'red':
      return 'bg-red-600'
    case 'amber':
      return 'bg-amber-500'
    case 'blue':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const status = await getVerificationStatus(params.documentId)

  if (!status) {
    notFound()
  }

  const bgColor = getBackgroundColor(status.headlineColour)

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bgColor}`}>
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 space-y-6">
        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-center text-gray-900">
          {status.headline}
        </h1>

        {/* Document Details */}
        <div className="space-y-3 text-center">
          <div>
            <p className="text-sm text-gray-600">Document Code</p>
            <p className="text-xl font-semibold">{status.documentCode}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Revision</p>
            <p className="text-xl font-semibold">{status.revisionCode}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Issue Purpose</p>
            <p className="text-lg">{status.issuePurpose}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Discipline</p>
            <p className="text-lg">{status.discipline}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Project</p>
            <p className="text-lg">{status.projectName}</p>
          </div>
        </div>

        {/* Latest Revision */}
        {status.latestRevisionCode && status.latestRevisionCode !== status.revisionCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-sm font-semibold text-amber-900">
              Latest revision: {status.latestRevisionCode}
            </p>
          </div>
        )}

        {/* Watermark Skipped Warning */}
        {status.watermarkSkipped && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-900">
              Note: This document does not have an embedded QR code. This verification was
              performed by document ID lookup.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4 border-t">
          Verified at {new Date(status.verifiedAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
