import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoSegment, SegmentStyleCategory, Archetype } from '../store'

// ---------------------------------------------------------------------------
// Category metadata — icon + label for each segment style category
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<SegmentStyleCategory, { icon: string; label: string }> = {
  'main-video':        { icon: '🎥', label: 'Video' },
  'main-video-text':   { icon: '📝', label: 'Text' },
  'main-video-images': { icon: '🖼️', label: 'Images' },
  'fullscreen-image':  { icon: '🌄', label: 'Image' },
  'fullscreen-text':   { icon: '💬', label: 'Full Text' },
}

// ---------------------------------------------------------------------------
// Archetype labels — short, user-facing name shown on each timeline card.
// Kept compact so it fits under the thumbnail; the picker uses the full name.
// ---------------------------------------------------------------------------

const ARCHETYPE_LABEL: Record<Archetype, string> = {
  'talking-head':        'Talking',
  'tight-punch':         'Punch',
  'wide-breather':       'Wide',
  'quote-lower':         'Quote ↓',
  'split-image':         'Split',
  'fullscreen-image':    'FS Image',
  'fullscreen-quote':    'FS Quote',
  'fullscreen-headline': 'Headline',
}

// ---------------------------------------------------------------------------
// Thumbnail cache — persists across component mounts
// key: `${sourcePath}:${midpointSeconds}`
// ---------------------------------------------------------------------------

const thumbnailCache = new Map<string, string>()

// ---------------------------------------------------------------------------
// SegmentTimeline
// ---------------------------------------------------------------------------

export interface SegmentTimelineProps {
  /** ID of the clip these segments belong to. */
  clipId: string
  /** Source video file path (for generating thumbnails via FFmpeg). */
  sourcePath: string
  /** Segments to display in the strip. */
  segments: VideoSegment[]
  /** Index of the currently selected segment. */
  selectedIndex: number
  /** Callback when user clicks a segment thumbnail. */
  onSelectSegment: (index: number) => void
  /** Accent color for the selected segment border (from EditStyle). */
  accentColor?: string
  /** Optional: the current playback time (seconds) — auto-highlights the playing segment. */
  currentTime?: number
}

export function SegmentTimeline({
  clipId,
  sourcePath,
  segments,
  selectedIndex,
  onSelectSegment,
  accentColor = '#3B82F6',
  currentTime,
}: SegmentTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Per-segment thumbnail state (base64 or null while loading)
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  // Determine which segment is "active" (playing) based on currentTime
  const activeIndex = useMemo(() => {
    if (currentTime == null) return -1
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (currentTime >= seg.startTime && currentTime <= seg.endTime) return i
    }
    return -1
  }, [currentTime, segments])

  // Stable key from segment boundaries — doesn't change when style/caption updates
  const segmentBoundsKey = useMemo(
    () => segments.map(s => `${s.startTime.toFixed(2)}-${s.endTime.toFixed(2)}`).join(','),
    [segments]
  )
  // Keep a ref to segments so we can read them inside the effect without triggering re-runs
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments

  // Generate thumbnails for all segments on mount / when segment boundaries change
  useEffect(() => {
    if (!sourcePath || segmentBoundsKey === '') return

    const segs = segmentsRef.current
    const entries: Record<number, string> = {}
    let cancelled = false

    async function loadThumbnails() {
      for (let i = 0; i < segs.length; i++) {
        if (cancelled) return
        const seg = segs[i]
        const midTime = (seg.startTime + seg.endTime) / 2
        const cacheKey = `${sourcePath}:${midTime.toFixed(2)}`

        // Check cache first
        const cached = thumbnailCache.get(cacheKey)
        if (cached) {
          entries[i] = cached
          continue
        }

        try {
          const base64 = await window.api.getThumbnail(sourcePath, midTime)
          if (cancelled) return
          thumbnailCache.set(cacheKey, base64)
          entries[i] = base64
        } catch {
          // Thumbnail generation failed for this segment — leave blank
        }
      }
      if (!cancelled) {
        setThumbnails((prev) => {
          // Merge with any previously loaded thumbnails
          const merged = { ...prev, ...entries }
          return merged
        })
      }
    }

    loadThumbnails()
    return () => { cancelled = true }
  }, [sourcePath, segmentBoundsKey, clipId])

  // Scroll selected segment into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedIndex])

  // Handle keyboard navigation when the timeline is focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.min(selectedIndex + 1, segments.length - 1)
        onSelectSegment(next)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = Math.max(selectedIndex - 1, 0)
        onSelectSegment(prev)
      }
    },
    [selectedIndex, segments.length, onSelectSegment]
  )

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
        No segments — split this clip to begin editing
      </div>
    )
  }

  return (
    <div
      className="relative"
      role="listbox"
      aria-label="Segment timeline"
      aria-orientation="horizontal"
    >
      {/* Horizontal scrollable strip */}
      <div
        ref={scrollRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={cn(
          'flex gap-2 overflow-x-auto py-2 px-1',
          'scroll-smooth snap-x snap-mandatory',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-md'
        )}
        style={{ scrollbarWidth: 'thin' }}
      >
        {segments.map((seg, i) => {
          const isSelected = i === selectedIndex
          const isActive = i === activeIndex
          const duration = seg.endTime - seg.startTime
          const meta = CATEGORY_META[seg.segmentStyleCategory] ?? CATEGORY_META['main-video']
          const thumb = thumbnails[i]

          return (
            <button
              key={seg.id}
              ref={isSelected ? selectedRef : undefined}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectSegment(i)}
              className={cn(
                'flex-none flex flex-col rounded-lg overflow-hidden cursor-pointer select-none',
                'snap-start transition-all duration-150',
                'hover:ring-2 hover:ring-primary/30',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                // Size: wider for longer segments, minimum width
                'w-28',
                // Selected state
                isSelected
                  ? 'scale-105 ring-2 shadow-lg'
                  : 'ring-1 ring-border/50 opacity-70 hover:opacity-90',
                // Active (playing) state indicator — subtle highlight even if not selected
                isActive && !isSelected && 'ring-1 ring-primary/40 opacity-85'
              )}
              style={{
                // Dynamic accent border for selected state
                ...(isSelected
                  ? {
                      ringColor: accentColor,
                      boxShadow: `0 0 0 2px ${accentColor}, 0 4px 12px rgba(0,0,0,0.3)`,
                    }
                  : {}),
              }}
              title={`Segment ${i + 1}: ${meta.label} — ${duration.toFixed(1)}s`}
            >
              {/* Thumbnail frame */}
              <div className="relative w-full aspect-video bg-black/60 overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`Segment ${i + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground/30 text-lg">{meta.icon}</span>
                  </div>
                )}

                {/* Segment index badge — top-left */}
                <div
                  className={cn(
                    'absolute top-1 left-1 flex items-center justify-center',
                    'w-5 h-5 rounded-full text-[10px] font-bold leading-none',
                    'bg-black/70 text-white/90 backdrop-blur-sm',
                    isSelected && 'bg-black/80'
                  )}
                >
                  {i + 1}
                </div>

                {/* Category icon — top-right */}
                <div
                  className={cn(
                    'absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] leading-none',
                    'bg-black/70 backdrop-blur-sm'
                  )}
                  title={meta.label}
                >
                  {meta.icon}
                </div>

                {/* Duration label — bottom */}
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 px-1.5 py-0.5',
                    'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
                    'text-[10px] font-mono tabular-nums text-white/90 text-right'
                  )}
                >
                  {duration.toFixed(1)}s
                </div>

                {/* Playing indicator — pulsing dot when active */}
                {isActive && (
                  <div className="absolute bottom-1 left-1.5">
                    <div className="relative flex items-center justify-center w-2 h-2">
                      <div
                        className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75"
                      />
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Archetype label + fallback chip */}
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-1 bg-card',
                  'text-[9px] font-semibold leading-tight',
                  seg.fallbackReason
                    ? 'text-amber-500'
                    : 'text-foreground/80'
                )}
              >
                {seg.fallbackReason && (
                  <AlertTriangle
                    className="w-2.5 h-2.5 shrink-0"
                    aria-label={`Fell back: ${seg.fallbackReason}`}
                  />
                )}
                <span className="truncate">
                  {ARCHETYPE_LABEL[seg.archetype] ?? meta.label}
                </span>
              </div>

              {/* Caption preview strip — first ~20 chars */}
              {seg.captionText && (
                <div className="px-1.5 pb-1 bg-card text-[9px] text-muted-foreground/60 truncate leading-tight">
                  {seg.captionText.slice(0, 30)}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Left/right scroll fade indicators */}
      <ScrollFadeEdge side="left" scrollRef={scrollRef} />
      <ScrollFadeEdge side="right" scrollRef={scrollRef} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScrollFadeEdge — subtle gradient fade at left/right edges to hint at overflow
// ---------------------------------------------------------------------------

function ScrollFadeEdge({
  side,
  scrollRef,
}: {
  side: 'left' | 'right'
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function check() {
      if (!el) return
      if (side === 'left') {
        setVisible(el.scrollLeft > 10)
      } else {
        setVisible(el.scrollLeft + el.clientWidth < el.scrollWidth - 10)
      }
    }

    check()
    el.addEventListener('scroll', check, { passive: true })
    // Also check on resize
    const ro = new ResizeObserver(check)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [side, scrollRef])

  if (!visible) return null

  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 w-8 pointer-events-none z-10',
        side === 'left'
          ? 'left-0 bg-gradient-to-r from-background to-transparent'
          : 'right-0 bg-gradient-to-l from-background to-transparent'
      )}
    />
  )
}
