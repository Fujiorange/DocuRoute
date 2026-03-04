'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { HardHat, ArrowRight, Building2, User, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, label: 'Company', icon: Building2 },
  { id: 2, label: 'Account', icon: User },
  { id: 3, label: 'Done', icon: CheckCircle2 },
]

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault()
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Registration failed', description: data.error, variant: 'destructive' })
        return
      }
      setUser(data.user)
      setStep(3)
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <HardHat className="h-7 w-7 text-blue-600" />
        <span className="font-bold text-2xl tracking-tight text-blue-900">DocuRoute</span>
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10 w-full max-w-sm">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                  step > s.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : step === s.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-stone-200 text-stone-400 bg-white'
                )}
              >
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5 font-medium',
                  step === s.id ? 'text-blue-600' : 'text-stone-400'
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn('flex-1 h-0.5 mb-5 mx-1', step > s.id ? 'bg-blue-600' : 'bg-stone-200')}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        {/* Step 1 — Company Details */}
        {step === 1 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">Company Details</h1>
              <p className="text-stone-500 mt-1 text-sm">Tell us about your construction company</p>
            </div>
            <form onSubmit={nextStep} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm font-medium text-stone-700">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Acme Construction Pte Ltd"
                  className="h-10 border-stone-200 bg-stone-50 focus-visible:ring-blue-500"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 font-semibold gap-2 mt-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}

        {/* Step 2 — Admin Account */}
        {step === 2 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">Admin Account</h1>
              <p className="text-stone-500 mt-1 text-sm">
                Create the IT Admin account for <strong className="text-stone-700">{form.companyName}</strong>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-stone-700">Your Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Tan"
                  className="h-10 border-stone-200 bg-stone-50 focus-visible:ring-blue-500"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-stone-700">Work Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@company.com.sg"
                  className="h-10 border-stone-200 bg-stone-50 focus-visible:ring-blue-500"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-stone-700">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min 8 characters"
                  className="h-10 border-stone-200 bg-stone-50 focus-visible:ring-blue-500"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 border-stone-200 text-stone-600"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 font-semibold gap-2"
                  disabled={loading}
                >
                  {loading ? 'Creating…' : 'Create Account'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="text-center py-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
              <CheckCircle2 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Account Created!</h1>
            <p className="text-stone-500 text-sm">Redirecting you to your dashboard…</p>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-stone-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
