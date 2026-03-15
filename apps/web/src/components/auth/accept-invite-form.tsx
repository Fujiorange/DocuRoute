'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { SYSTEM_ROLE_DESCRIPTIONS, PERMISSION_LABELS } from '@docuroute/types'

interface InvitationData {
  email: string
  roleName: string
  isSystemRole: boolean
  systemRoleKey?: string
  permissions?: string[]
  companyName: string
  expiresAt: string
}

export default function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  // Validate invitation token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please check the link in your email.')
      setValidating(false)
      setLoading(false)
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      setValidating(true)
      const response = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Invalid or expired invitation')
      }

      const data = await response.json()
      setInvitation(data.invitation)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to validate invitation')
    } finally {
      setValidating(false)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to accept invitation')
      }

      const data = await response.json()

      // Auto sign-in using NextAuth v4
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: invitation?.email,
        callbackUrl: '/dashboard',
      })

      if (signInResult?.error) {
        throw new Error('Account created but sign-in failed. Please log in manually.')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
      setSubmitting(false)
    }
  }

  if (loading || validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => router.push('/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation?.companyName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* Role information */}
            <div className="space-y-2">
              <Label>Your Role</Label>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">{invitation?.roleName}</p>
                {invitation?.isSystemRole && invitation.systemRoleKey && (
                  <p className="mt-2 text-sm text-blue-700">
                    {SYSTEM_ROLE_DESCRIPTIONS[invitation.systemRoleKey as keyof typeof SYSTEM_ROLE_DESCRIPTIONS]}
                  </p>
                )}
                {!invitation?.isSystemRole && invitation?.permissions && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                      Permissions:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {invitation.permissions.slice(0, 5).map((permission) => (
                        <li key={permission} className="text-sm text-blue-700">
                          " {PERMISSION_LABELS[permission] || permission}
                        </li>
                      ))}
                      {invitation.permissions.length > 5 && (
                        <li className="text-sm text-blue-600 italic">
                          + {invitation.permissions.length - 5} more permissions
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
                maxLength={100}
              />
            </div>

            {/* Expiry warning */}
            {invitation?.expiresAt && (
              <Alert>
                <AlertDescription className="text-sm">
                  This invitation expires on{' '}
                  <strong>
                    {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Error message */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
