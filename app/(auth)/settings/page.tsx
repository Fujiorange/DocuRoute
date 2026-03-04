'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/auth'

export default function SettingsPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<{ name: string; subdomain: string | null } | null>(null)
  const [form, setForm] = useState({ name: '', subdomain: '' })

  useEffect(() => {
    fetch('/api/company')
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setCompany(data.company)
          setForm({ name: data.company.name, subdomain: data.company.subdomain || '' })
        }
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Saved', description: 'Company settings updated' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Tabs defaultValue="company">
        <TabsList className="mb-6">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="team" asChild>
            <Link href="/settings/team">Team</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
              <CardDescription>Manage your company information</CardDescription>
            </CardHeader>
            <CardContent>
              {user?.role === 'it_admin' ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain (optional)</Label>
                    <Input
                      id="subdomain"
                      value={form.subdomain}
                      onChange={(e) => setForm((p) => ({ ...p, subdomain: e.target.value }))}
                      placeholder="acme"
                    />
                    <p className="text-xs text-gray-500">Your URL: {form.subdomain || 'company'}.docuroute.com</p>
                  </div>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Company Name</Label>
                    <p className="mt-1 text-gray-700">{company?.name}</p>
                  </div>
                  <p className="text-sm text-gray-500">Contact your IT admin to change company settings.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
