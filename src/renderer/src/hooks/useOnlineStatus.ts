import { useEffect, useRef, useState } from 'react'

export interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnline: Date | null
}

/**
 * Tracks network connectivity using navigator.onLine + window events.
 * Also does a periodic lightweight HEAD fetch every 30s when offline to
 * detect recovery when the browser event is delayed.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnline, setLastOnline] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  )

  // Track whether we've ever gone offline during this session
  const wentOfflineRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function markOnline() {
    setIsOnline(true)
    setLastOnline(new Date())
    if (wentOfflineRef.current) {
      setWasOffline(true)
    }
    // Clear polling interval — we're back online
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function markOffline() {
    wentOfflineRef.current = true
    setIsOnline(false)
    startPolling()
  }

  function startPolling() {
    if (intervalRef.current !== null) return
    intervalRef.current = setInterval(async () => {
      try {
        // Tiny HEAD request to a reliable, fast endpoint
        const res = await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          cache: 'no-store',
          mode: 'no-cors'
        })
        // no-cors opaque responses have status 0 but count as success
        if (res.ok || res.type === 'opaque') {
          markOnline()
        }
      } catch {
        // Still offline — keep polling
      }
    }, 30_000)
  }

  useEffect(() => {
    const handleOnline = () => markOnline()
    const handleOffline = () => markOffline()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // If we start offline, begin polling immediately
    if (!navigator.onLine) {
      wentOfflineRef.current = true
      startPolling()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isOnline, wasOffline, lastOnline }
}
