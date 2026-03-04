'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()
  const token = params.token as string

  const [inviteData, setInviteData] = useState<{ company: { name: string }; email: string; role: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', password: '' })

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.invitation) setInviteData(data.invitation)
        else toast({ title: 'Error', description: 'Invalid invitation', variant: 'destructive' })
      })
  }, [token, toast])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      setUser(data.user)
      router.push('/dashboard')
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-bold text-2xl text-blue-600">DocuRoute</div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re Invited!</CardTitle>
            {inviteData && (
              <CardDescription>
                Join {inviteData.company.name} as a {inviteData.role.replace('_', ' ')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {inviteData ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={inviteData.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Joining...' : 'Accept Invitation'}
                </Button>
              </form>
            ) : (
              <p className="text-center text-gray-500">Loading invitation...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
