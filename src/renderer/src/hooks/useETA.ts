import { useRef, useCallback, useMemo } from 'react'
import { MAX_ETA_HISTORY } from '@shared/constants'

interface ETAResult {
  /** Estimated seconds remaining, or null if not enough data */
  etaSeconds: number | null
  /** Human-readable elapsed time, e.g. "2m 30s" */
  elapsed: string
  /** Human-readable remaining time, e.g. "~3m remaining" */
  remaining: string
}

interface DataPoint {
  time: number
  progress: number
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return '< 1s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hrs}h ${remainMins}m`
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

/**
 * Hook that tracks progress over time and estimates time remaining.
 * Returns a `getETA(progress)` function rather than reactive state,
 * so callers can invoke it during render without causing extra re-renders.
 *
 * Call `reset()` when the tracked task changes (e.g. pipeline stage changes).
 */
export function useETA(): {
  getETA: (progress: number) => ETAResult
  reset: () => void
} {
  const historyRef = useRef<DataPoint[]>([])
  const startTimeRef = useRef<number | null>(null)

  const reset = useCallback(() => {
    historyRef.current = []
    startTimeRef.current = null
  }, [])

  const getETA = useCallback((progress: number): ETAResult => {
    const now = Date.now()

    // Initialize start time on first call
    if (startTimeRef.current === null) {
      startTimeRef.current = now
    }

    const elapsedMs = now - startTimeRef.current
    const elapsedStr = elapsedMs < 1000 ? '< 1s' : formatDuration(elapsedMs / 1000)

    // Don't record duplicate progress values back-to-back
    const history = historyRef.current
    const last = history[history.length - 1]
    if (!last || last.progress !== progress) {
      history.push({ time: now, progress })
      // Keep only last MAX_ETA_HISTORY entries
      if (history.length > MAX_ETA_HISTORY) {
        history.shift()
      }
    }

    // Need at least 2 data points and > 3% progress to estimate
    if (history.length < 2 || progress < 3) {
      return {
        etaSeconds: null,
        elapsed: elapsedStr,
        remaining: progress < 3 ? `Started ${elapsedStr} ago` : 'Calculating…'
      }
    }

    // Calculate rate using oldest and newest points in the window (moving average)
    const oldest = history[0]
    const newest = history[history.length - 1]
    const deltaProgress = newest.progress - oldest.progress
    const deltaTime = (newest.time - oldest.time) / 1000 // seconds

    if (deltaProgress <= 0 || deltaTime <= 0) {
      return {
        etaSeconds: null,
        elapsed: elapsedStr,
        remaining: 'Calculating…'
      }
    }

    const rate = deltaProgress / deltaTime // percent per second
    const remaining = (100 - progress) / rate // seconds

    // Cap at 24 hours to avoid absurd estimates
    const cappedRemaining = Math.min(remaining, 86400)

    let remainingStr: string
    if (cappedRemaining < 5) {
      remainingStr = 'Almost done…'
    } else if (cappedRemaining < 60) {
      remainingStr = '< 1m remaining'
    } else {
      remainingStr = `~${formatDuration(cappedRemaining)} remaining`
    }

    return {
      etaSeconds: cappedRemaining,
      elapsed: elapsedStr,
      remaining: remainingStr
    }
  }, [])

  return useMemo(() => ({ getETA, reset }), [getETA, reset])
}
