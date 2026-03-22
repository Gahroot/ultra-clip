import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface WaveformDisplayProps {
  /** Normalized [0,1] amplitude values (one per bar) */
  data: number[]
  /** Absolute start time of the waveform window (seconds) */
  startTime: number
  /** Absolute end time of the waveform window (seconds) */
  endTime: number
  /** Current video playback position (seconds) */
  currentTime: number
  /** Trim-in point (seconds) — everything before this is dimmed */
  trimStart: number
  /** Trim-out point (seconds) — everything after this is dimmed */
  trimEnd: number
  /** Original AI-selected range start — rendered as a faint highlight band */
  originalStart?: number
  /** Original AI-selected range end */
  originalEnd?: number
  /** Canvas height in px (default 56) */
  height?: number
  /** Called when the user clicks the waveform — seeks to that time */
  onSeek?: (time: number) => void
  className?: string
}

/**
 * Canvas-based audio waveform visualization for the clip trim editor.
 *
 * Visual regions:
 * - Inside trim range    → primary color (indigo/violet) at full opacity
 * - Outside trim range   → muted color at 30% opacity
 * - Current time cursor  → bright white vertical rule
 * - AI original range    → subtle tinted band behind the bars
 */
export function WaveformDisplay({
  data,
  startTime,
  endTime,
  currentTime,
  trimStart,
  trimEnd,
  originalStart,
  originalEnd,
  height = 56,
  onSeek,
  className
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = container.clientWidth
    const cssHeight = height

    // Resize canvas backing store to match display size × dpr
    if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.scale(dpr, dpr)

    const W = cssWidth
    const H = cssHeight
    const duration = endTime - startTime || 1

    // Clear
    ctx.clearRect(0, 0, W, H)

    // ----- AI original range background band -----
    if (originalStart !== undefined && originalEnd !== undefined) {
      const bandLeft = ((originalStart - startTime) / duration) * W
      const bandRight = ((originalEnd - startTime) / duration) * W
      ctx.fillStyle = 'rgba(99,102,241,0.08)'  // faint indigo tint
      ctx.fillRect(bandLeft, 0, bandRight - bandLeft, H)
    }

    // ----- Waveform bars -----
    const numBars = data.length
    if (numBars === 0) {
      ctx.restore()
      return
    }

    const BAR_GAP = 1
    const barWidth = Math.max(1, (W / numBars) - BAR_GAP)
    const centerY = H / 2

    // Derive colors from CSS variables if available (fallback to hard-coded)
    // primary: hsl(var(--primary)) — indigo-ish in this dark theme
    const colorActive = 'rgba(99,102,241,0.85)'   // indigo-500
    const colorDim    = 'rgba(120,113,108,0.30)'  // muted-foreground-like

    const trimStartX = ((trimStart - startTime) / duration) * W
    const trimEndX   = ((trimEnd   - startTime) / duration) * W

    for (let i = 0; i < numBars; i++) {
      const x = (i / numBars) * W
      const amplitude = data[i]
      // Minimum bar height so even silence has a thin line
      const barHalfH = Math.max(1.5, amplitude * (H / 2 - 3))

      // Is this bar inside the trim range?
      const barCenterX = x + barWidth / 2
      const inTrim = barCenterX >= trimStartX && barCenterX <= trimEndX

      ctx.fillStyle = inTrim ? colorActive : colorDim
      ctx.beginPath()
      // Rounded bar: draw as rounded rect if width is large enough
      const bx = x + BAR_GAP / 2
      const bw = barWidth
      const bh = barHalfH * 2
      const by = centerY - barHalfH
      const radius = Math.min(bw / 2, 2)

      if (ctx.roundRect) {
        ctx.roundRect(bx, by, bw, bh, radius)
      } else {
        ctx.rect(bx, by, bw, bh)
      }
      ctx.fill()
    }

    // ----- Playback cursor -----
    const cursorX = ((currentTime - startTime) / duration) * W
    if (cursorX >= 0 && cursorX <= W) {
      ctx.strokeStyle = 'rgba(255,255,255,0.90)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(cursorX, 0)
      ctx.lineTo(cursorX, H)
      ctx.stroke()

      // Small triangle handle at top
      ctx.fillStyle = 'rgba(255,255,255,0.90)'
      ctx.beginPath()
      ctx.moveTo(cursorX - 4, 0)
      ctx.lineTo(cursorX + 4, 0)
      ctx.lineTo(cursorX, 6)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }, [data, startTime, endTime, currentTime, trimStart, trimEnd, originalStart, originalEnd, height])

  // Redraw whenever data or times change
  useEffect(() => {
    draw()
  }, [draw])

  // Redraw on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  // ---------------------------------------------------------------------------
  // Click to seek
  // ---------------------------------------------------------------------------

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const fraction = (e.clientX - rect.left) / rect.width
      const duration = endTime - startTime
      const seekTime = startTime + Math.max(0, Math.min(1, fraction)) * duration
      onSeek(seekTime)
    },
    [onSeek, startTime, endTime]
  )

  return (
    <div ref={containerRef} className={cn('w-full', className)} style={{ height }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: onSeek ? 'pointer' : 'default' }}
        onClick={handleClick}
      />
    </div>
  )
}
