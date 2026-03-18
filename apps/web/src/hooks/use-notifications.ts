'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export interface Notification {
  id: string
  companyId: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  metadata: any
  createdAt: string
}

/**
 * useNotifications hook
 *
 * Fetches and manages notifications for the authenticated user.
 * Automatically polls for new notifications every 30 seconds when tab is visible.
 *
 * Returns:
 * - notifications: Notification[] - Array of notifications
 * - unreadCount: number - Count of unread notifications
 * - isLoading: boolean - Whether notifications are loading
 * - markAsRead: (id: string) => Promise<void> - Mark a notification as read
 * - markAllAsRead: () => Promise<void> - Mark all notifications as read
 * - refetch: () => Promise<void> - Manually refetch notifications
 */
export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    if (!session?.user) return

    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      const data = await response.json()
      setNotifications(data.notifications)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to mark notification as read')

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to mark all notifications as read')

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [session])

  // Poll for new notifications every 30 seconds when tab is visible
  useEffect(() => {
    if (!session?.user) return

    const pollInterval = 30000 // 30 seconds

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications()
      }
    }

    // Set up polling
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications()
      }
    }, pollInterval)

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
