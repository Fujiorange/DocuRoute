'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user)
        else setUser(null)
      })
      .catch(() => setUser(null))
  }, [setUser])

  return <>{children}</>
}
