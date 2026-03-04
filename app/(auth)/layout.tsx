import { Nav } from '@/components/nav'
import { AuthProvider } from '@/components/providers'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main>{children}</main>
      </div>
    </AuthProvider>
  )
}
