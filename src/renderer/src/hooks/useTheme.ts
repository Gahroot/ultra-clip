import { useEffect } from 'react'
import { useStore } from '@/store'

export function useTheme(): void {
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    function applyTheme(isDark: boolean): void {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const handler = (e: MediaQueryListEvent): void => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])
}
