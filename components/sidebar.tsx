'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Settings,
  LogOut,
  HardHat,
  ChevronDown,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/settings/team', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-stone-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-stone-200">
        <HardHat className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <span className="font-bold text-base tracking-tight text-blue-900">DocuRoute</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active =
            item.href === '/settings'
              ? pathname === '/settings'
              : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                )}
              >
                <item.icon
                  className={cn('h-4 w-4 flex-shrink-0', active ? 'text-blue-600' : 'text-stone-400')}
                />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-stone-200 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-stone-100 transition-colors text-left">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-blue-100 text-blue-700">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{user.name}</p>
                  <p className="text-xs text-stone-500 truncate">{user.company.name}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-stone-900">{user.name}</p>
                <p className="text-xs text-stone-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-3.5 w-3.5" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-rose-600 cursor-pointer focus:text-rose-600 focus:bg-rose-50">
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  )
}

/* Mobile top bar for small screens */
export function MobileTopBar() {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()

  const currentNav = navItems.find((item) =>
    item.href === '/settings' ? pathname === '/settings' : pathname.startsWith(item.href)
  )

  return (
    <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <HardHat className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-sm tracking-tight text-blue-900">DocuRoute</span>
      </div>
      <p className="text-sm font-medium text-stone-700">{currentNav?.label}</p>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs font-semibold bg-blue-100 text-blue-700">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-rose-600">
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
