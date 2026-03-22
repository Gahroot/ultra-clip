import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useStore } from '../store'

/**
 * Displays a compact banner at the top of the app when offline.
 * Automatically switches to a "Back online" success message for 3s
 * when connectivity is restored, then disappears.
 */
export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus()
  const setIsOnline = useStore((s) => s.setIsOnline)
  const [showBackOnline, setShowBackOnline] = useState(false)

  // Keep the store's isOnline in sync
  useEffect(() => {
    setIsOnline(isOnline)
  }, [isOnline, setIsOnline])

  // When we come back online and had previously been offline, show success briefly
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowBackOnline(true)
      const timer = setTimeout(() => setShowBackOnline(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const showBanner = !isOnline || showBackOnline

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          key={isOnline ? 'back-online' : 'offline'}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 32, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden shrink-0"
        >
          {isOnline ? (
            // Back online success state
            <div className="h-8 flex items-center justify-center gap-2 bg-green-500/10 border-b border-green-500/30 text-green-600 dark:text-green-400">
              <Wifi className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-medium">Back online</span>
            </div>
          ) : (
            // Offline warning state
            <div className="h-8 flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-600 dark:text-amber-400">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-medium">
                You're offline — YouTube downloads and AI features require an internet connection
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
