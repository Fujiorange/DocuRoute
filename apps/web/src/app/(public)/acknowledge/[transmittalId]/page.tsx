'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Download, Send } from 'lucide-react'

interface Document {
  id: string
  documentId: string
  documentCode?: string
  title?: string
  filename: string
  revisionCode: string
  discipline?: string
  issuePurpose?: string
}

interface TransmittalData {
  transmittal: {
    id: string
    number: string
    subject: string
    message?: string
    status: string
    sentAt: string | null
    expiresAt: string | null
    documents: Document[]
  }
  recipient: {
    email: string
    name?: string
    company?: string
    status: string
    viewedAt: string | null
    acknowledgedAt: string | null
  }
}

export default function AcknowledgePage({ params }: { params: { transmittalId: string } }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [data, setData] = useState<TransmittalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<'acknowledge' | 'return' | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing authentication token')
      setLoading(false)
      return
    }

    fetch(`/api/public/transmittals/${params.transmittalId}/acknowledge?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load transmittal')
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [params.transmittalId, token])

  const handleSubmit = async () => {
    if (!action || !token) return

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/public/transmittals/${params.transmittalId}/acknowledge?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, message: message.trim() || undefined }),
        }
      )

      if (!res.ok) throw new Error('Failed to submit response')

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transmittal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {action === 'acknowledge' ? 'Acknowledged!' : 'Returned'}
          </h1>
          <p className="text-gray-600 text-lg">
            {action === 'acknowledge'
              ? 'Thank you for acknowledging this transmittal.'
              : 'The transmittal has been returned to the sender.'}
          </p>
        </div>
      </div>
    )
  }

  const isAlreadyAcknowledged = data.recipient.status === 'ACKNOWLEDGED'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold">Document Transmittal</h1>
            <p className="text-blue-100">
              Transmittal {data.transmittal.number}
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="border-l-4 border-blue-600 bg-blue-50 p-4">
              <h2 className="font-semibold text-lg text-gray-900 mb-1">
                {data.transmittal.subject}
              </h2>
              {data.transmittal.message && (
                <p className="text-gray-700 whitespace-pre-wrap">{data.transmittal.message}</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Documents ({data.transmittal.documents.length})
              </h3>
              <div className="space-y-2">
                {data.transmittal.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {doc.documentCode || doc.title || doc.filename}
                      </p>
                      <p className="text-sm text-blue-600 font-semibold">Rev {doc.revisionCode}</p>
                      {doc.discipline && (
                        <p className="text-sm text-gray-500">{doc.discipline}</p>
                      )}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {!isAlreadyAcknowledged ? (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Response</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setAction('acknowledge')}
                        className={`flex-1 p-4 border-2 rounded-lg transition ${
                          action === 'acknowledge'
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        <CheckCircle
                          className={`h-6 w-6 mx-auto mb-2 ${
                            action === 'acknowledge' ? 'text-green-600' : 'text-gray-400'
                          }`}
                        />
                        <p className="font-semibold">Acknowledge</p>
                      </button>
                      <button
                        onClick={() => setAction('return')}
                        className={`flex-1 p-4 border-2 rounded-lg transition ${
                          action === 'return'
                            ? 'border-amber-600 bg-amber-50'
                            : 'border-gray-300 hover:border-amber-400'
                        }`}
                      >
                        <XCircle
                          className={`h-6 w-6 mx-auto mb-2 ${
                            action === 'return' ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        />
                        <p className="font-semibold">Return</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Message {action === 'return' && '(required for returns)'}
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        action === 'return'
                          ? 'Please explain why you are returning this transmittal'
                          : 'Optional: Add any comments or notes'
                      }
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!action || submitting || (action === 'return' && !message.trim())}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    <Send className="h-5 w-5" />
                    {submitting
                      ? 'Submitting...'
                      : action === 'acknowledge'
                      ? 'Acknowledge Receipt'
                      : 'Return to Sender'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t pt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                  <p className="font-semibold text-green-900">
                    This transmittal has already been acknowledged
                  </p>
                  {data.recipient.acknowledgedAt && (
                    <p className="text-sm text-green-700 mt-1">
                      Acknowledged on{' '}
                      {new Date(data.recipient.acknowledgedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm mt-6">
          <p>DocuRoute  Document Management for Heavy Industries</p>
          <p className="mt-1">No login required " Secure access via unique link</p>
        </div>
      </div>
    </div>
  )
}
