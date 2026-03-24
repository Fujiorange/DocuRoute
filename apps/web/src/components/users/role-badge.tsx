'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SystemRoleKey } from '@docuroute/types'

interface RoleBadgeProps {
  roleName: string
  isSystemRole: boolean
  systemRoleKey?: SystemRoleKey | null
  className?: string
}

/**
 * RoleBadge component for consistent role display across the application.
 *
 * System roles are color-coded by systemRoleKey:
 * - COMPANY_OWNER: indigo
 * - COMPANY_ADMIN: violet
 * - DOCUMENT_CONTROLLER: blue
 * - AUDITOR: amber
 * - BILLING_CONTACT: slate
 * - PLATFORM_ADMIN: red
 *
 * Custom roles: neutral slate with "Custom" chip
 */
export function RoleBadge({ roleName, isSystemRole, systemRoleKey, className }: RoleBadgeProps) {
  // System role color mapping
  const systemRoleColors: Record<string, string> = {
    COMPANY_OWNER: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200',
    COMPANY_ADMIN: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200',
    DOCUMENT_CONTROLLER: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200',
    AUDITOR: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200',
    BILLING_CONTACT: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-950 dark:text-slate-200',
    PLATFORM_ADMIN: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200',
  }

  const customRoleColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300'

  if (isSystemRole && systemRoleKey) {
    const colorClass = systemRoleColors[systemRoleKey] || customRoleColor
    return (
      <Badge
        className={cn(
          'inline-flex items-center gap-1.5 border px-2.5 py-0.5',
          colorClass,
          className
        )}
      >
        {roleName}
      </Badge>
    )
  }

  // Custom role
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Badge
        className={cn(
          'border px-2.5 py-0.5',
          customRoleColor
        )}
      >
        {roleName}
      </Badge>
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0"
      >
        Custom
      </Badge>
    </div>
  )
}
