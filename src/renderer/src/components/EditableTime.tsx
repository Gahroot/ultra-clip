import { useState } from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

export function parseTimeInput(value: string): number | null {
  const mmss = value.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (mmss) return parseInt(mmss[1]) * 60 + parseFloat(mmss[2])
  const secs = parseFloat(value)
  return isNaN(secs) ? null : secs
}

// ---------------------------------------------------------------------------
// EditableTime
// ---------------------------------------------------------------------------

interface EditableTimeProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  className?: string
}

export function EditableTime({ value, onChange, min, max, className }: EditableTimeProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')

  if (!editing) {
    return (
      <button
        className={cn(
          'font-mono text-xs text-muted-foreground hover:text-foreground hover:underline cursor-text tabular-nums',
          className
        )}
        onClick={() => {
          setText(formatTime(value))
          setEditing(true)
        }}
      >
        {formatTime(value)}
      </button>
    )
  }

  return (
    <input
      autoFocus
      className={cn(
        'font-mono w-16 text-xs bg-transparent border-b border-primary outline-none text-center tabular-nums',
        className
      )}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = parseTimeInput(text)
        if (parsed !== null) {
          onChange(Math.max(min, Math.min(max, parsed)))
        }
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
