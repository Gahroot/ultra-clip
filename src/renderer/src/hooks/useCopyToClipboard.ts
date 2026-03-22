import { useState, useCallback, useRef } from 'react'

interface UseCopyToClipboardReturn {
  copy: (text: string) => Promise<void>
  copied: boolean
}

/**
 * Hook that provides clipboard copy with a 2-second "copied" feedback state.
 * copied=true for 2 seconds after a successful copy, then resets to false.
 */
export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setCopied(false)
        timerRef.current = null
      }, 2000)
    } catch {
      // Clipboard write failed silently — no feedback
    }
  }, [])

  return { copy, copied }
}
