'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { HardHat, ArrowRight, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Sign in failed', description: data.error, variant: 'destructive' })
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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(145deg, #1e3a8a 0%, #2563eb 60%, #1d4ed8 100%)' }}
      >
        <div className="flex items-center gap-2">
          <HardHat className="h-6 w-6 text-white" />
          <span className="font-bold text-xl tracking-tight">DocuRoute</span>
        </div>

        <div>
          {/* Blueprint grid decorative */}
          <div className="mb-8 w-56 h-40 rounded-xl border border-white/20 bg-white/5 p-4 relative overflow-hidden">
            {[20, 40, 60, 80, 100, 120].map((y) => (
              <div key={y} className="absolute left-0 right-0 border-t border-white/10" style={{ top: y }} />
            ))}
            {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220].map((x) => (
              <div key={x} className="absolute top-0 bottom-0 border-l border-white/10" style={{ left: x } } />
            ))}
            <div className="absolute bottom-4 left-4 right-4 space-y-1.5">
              <div className="h-2 w-4/5 rounded bg-white/30" />
              <div className="h-2 w-3/5 rounded bg-white/20" />
              <div className="h-2 w-2/3 rounded bg-white/20" />
            </div>
            <div className="absolute top-4 left-4 h-6 w-20 rounded bg-white/20" />
          </div>

          <blockquote className="text-xl font-semibold leading-relaxed mb-3">
            &ldquo;DocuRoute cut our document retrieval time by 80%. What used to take hours now takes seconds.&rdquo;
          </blockquote>
          <p className="text-blue-200 text-sm">— Project Director, Woh Hup Construction</p>
        </div>

        <div className="flex items-center gap-1">
          <span className="h-1 w-6 rounded-full bg-rose-400" />
          <span className="h-1 w-6 rounded-full bg-white/40" />
          <span className="text-xs text-blue-200 ml-2">Singapore&apos;s Construction Document Platform</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-stone-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <HardHat className="h-7 w-7 text-blue-600" />
          <span className="font-bold text-2xl tracking-tight text-blue-900">DocuRoute</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Welcome back</h1>
            <p className="text-stone-500 mt-1 text-sm">Sign in to your company account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-stone-700">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-9 h-10 border-stone-200 bg-white focus-visible:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-stone-700">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 border-stone-200 bg-white focus-visible:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 font-semibold gap-2 shadow-sm transition-all"
              disabled={loading}
            >
              {loading ? 'Signing in…' : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            New to DocuRoute?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
              Create a company account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
