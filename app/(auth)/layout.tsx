import { Sidebar, MobileTopBar } from '@/components/sidebar'
import { AuthProvider } from '@/components/providers'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-stone-50">
        {/* Sidebar — visible md+ */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        {/* Mobile top bar */}
        <MobileTopBar />
        {/* Main content offset by sidebar width on md+ */}
        <main className="md:pl-60">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>
    </AuthProvider>
  )
}
