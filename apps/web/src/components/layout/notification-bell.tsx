'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationDropdown } from './notification-dropdown'

/**
 * NotificationBell component
 *
 * Displays a bell icon with unread notification badge.
 * Opens dropdown on click with recent notifications.
 * Automatically polls for new notifications every 30 seconds (tab visible only).
 *
 * Features:
 * - Red dot badge when unreadCount > 0
 * - Number badge when unreadCount > 9
 * - Polls every 30s using Page Visibility API
 * - Opens dropdown on click
 */
export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  )
}
