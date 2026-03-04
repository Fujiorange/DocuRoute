import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  companyId: string
  company: {
    id: string
    name: string
    subdomain: string | null
  }
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
    window.location.href = '/login'
  },
}))
