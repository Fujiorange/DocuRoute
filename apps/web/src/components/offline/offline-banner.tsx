'use client'

import { useState, useEffect } from 'react'
import { X, Wifi, WifiOff, RefreshCw } from 'lucide-react'

/**
 * Offline Banner Component
 *
 * Listens to window online/offline events.
 * Pings /api/health every 30s to distinguish device offline vs server unreachable.
 * Shows amber banner when offline: "You are offline  changes will sync when connected"
 * Dismissible per session only (re-shows on next offline event)
 * Includes sync-status indicator
 */

type ConnectionStatus = 'online' | 'offline' | 'checking'

export function OfflineBanner() {
  const [status, setStatus] = useState<ConnectionStatus>('online')
  const [isDismissed, setIsDismissed] = useState(false)
  const [syncQueueSize, setSyncQueueSize] = useState(0)

  useEffect(() => {
    // Initial check
    setStatus(navigator.onLine ? 'online' : 'offline')

    // Listen to browser online/offline events
    const handleOnline = () => {
      setStatus('online')
      setIsDismissed(false) // Re-show banner when coming back online
    }

    const handleOffline = () => {
      setStatus('offline')
      setIsDismissed(false) // Always show when going offline
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Ping /api/health every 30s to verify server connectivity
    const healthCheckInterval = setInterval(async () => {
      if (navigator.onLine) {
        setStatus('checking')
        try {
          const response = await fetch('/api/health', {
            method: 'GET',
            cache: 'no-store',
          })

          if (response.ok) {
            setStatus('online')
          } else {
            setStatus('offline')
            setIsDismissed(false)
          }
        } catch (error) {
          // Server unreachable
          setStatus('offline')
          setIsDismissed(false)
        }
      }
    }, 30000) // 30 seconds

    // TODO: Check offline sync queue size
    // const checkSyncQueue = async () => {
    //   const queue = await offlineDB?.actions.where('status').equals('pending').count()
    //   setSyncQueueSize(queue || 0)
    // }
    // checkSyncQueue()
    // const syncInterval = setInterval(checkSyncQueue, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(healthCheckInterval)
      // clearInterval(syncInterval)
    }
  }, [])

  // Don't show banner if online or dismissed
  if (status === 'online' || isDismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'checking' ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <WifiOff className="h-5 w-5" />
          )}
          <div>
            <p className="font-medium">
              {status === 'checking'
                ? 'Checking connection...'
                : 'You are offline'}
            </p>
            <p className="text-sm text-amber-100">
              Changes will sync automatically when you reconnect
              {syncQueueSize > 0 && ` (${syncQueueSize} pending)`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-amber-600 rounded transition-colors"
          aria-label="Dismiss offline banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
