'use client'

import { formatDistanceToNow } from 'date-fns'
import { Check, Bell, AlertCircle, FileText, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationType } from '@docuroute/types'
import Link from 'next/link'

/**
 * NotificationDropdown component
 *
 * Displays recent notifications in a dropdown.
 * Features:
 * - Recent notifications list (unread highlighted)
 * - "Mark all read" button
 * - Links to relevant resources
 * - Icon based on notification type
 */
export function NotificationDropdown() {
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications()

  const unreadNotifications = notifications.filter((n) => !n.isRead)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case NotificationType.WORKFLOW_ACTION_REQUIRED:
      case NotificationType.WORKFLOW_COMPLETED:
      case NotificationType.WORKFLOW_REJECTED:
        return FileText
      case NotificationType.DOCUMENT_QUARANTINED:
      case NotificationType.LEGAL_HOLD_PLACED:
        return AlertCircle
      case NotificationType.TRANSMITTAL_ACKNOWLEDGED:
      case NotificationType.TRANSMITTAL_RETURNED:
        return FileText
      case NotificationType.STORAGE_LIMIT_WARNING:
      case NotificationType.API_KEY_EXPIRING:
        return Settings
      default:
        return Bell
    }
  }

  const getNotificationLink = (notification: any) => {
    const metadata = notification.metadata || {}

    switch (notification.type) {
      case NotificationType.WORKFLOW_ACTION_REQUIRED:
      case NotificationType.WORKFLOW_COMPLETED:
      case NotificationType.WORKFLOW_REJECTED:
        return metadata.documentId ? `/dashboard/documents/${metadata.documentId}` : '/dashboard/approvals'
      case NotificationType.DOCUMENT_QUARANTINED:
        return metadata.documentId ? `/dashboard/documents/${metadata.documentId}` : '/dashboard/documents'
      case NotificationType.LEGAL_HOLD_PLACED:
        return '/dashboard/settings/legal-holds'
      case NotificationType.TRANSMITTAL_ACKNOWLEDGED:
      case NotificationType.TRANSMITTAL_RETURNED:
        return metadata.transmittalId
          ? `/dashboard/transmittals/${metadata.transmittalId}`
          : '/dashboard/transmittals'
      case NotificationType.STORAGE_LIMIT_WARNING:
        return '/dashboard/settings/billing'
      case NotificationType.API_KEY_EXPIRING:
        return '/dashboard/settings/api-keys'
      default:
        return '/dashboard'
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading notifications...
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold">Notifications</h3>
        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs"
          >
            Mark all read
          </Button>
        )}
      </div>
      <Separator />
      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <p className="mt-4 text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <div className="flex flex-col">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              const link = getNotificationLink(notification)

              return (
                <Link
                  key={notification.id}
                  href={link}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification.id)
                    }
                  }}
                  className={`flex gap-3 p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-muted/20' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
