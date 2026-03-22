import { useCallback, useMemo, useRef, useState } from 'react'
import { Check, Clock, Minus, Plus, X, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useStore } from '../store'
import type { ClipCandidate } from '../store'
import { ClipPreview } from './ClipPreview'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

function statusColor(status: ClipCandidate['status']): string {
  switch (status) {
    case 'approved': return 'bg-green-500'
    case 'rejected': return 'bg-red-500'
    default: return 'bg-muted-foreground/60'
  }
}

function statusBorderColor(status: ClipCandidate['status']): string {
  switch (status) {
    case 'approved': return 'border-green-500/60'
    case 'rejected': return 'border-red-500/40'
    default: return 'border-border'
  }
}

function statusBarBg(status: ClipCandidate['status']): string {
  switch (status) {
    case 'approved': return 'bg-green-500/20 hover:bg-green-500/30'
    case 'rejected': return 'bg-red-500/15 hover:bg-red-500/25'
    default: return 'bg-muted/40 hover:bg-muted/60'
  }
}

function scoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-500/30 text-green-400 border-green-500/50'
  if (score >= 80) return 'bg-blue-500/30 text-blue-400 border-blue-500/50'
  if (score >= 70) return 'bg-yellow-500/30 text-yellow-400 border-yellow-500/50'
  return 'bg-orange-500/30 text-orange-400 border-orange-500/50'
}

/** Compute a nice tick interval for the ruler based on total duration & zoom */
function computeTickInterval(totalDuration: number, pixelsPerSecond: number): number {
  // We want ~1 tick every 80–160px
  const targetPx = 120
  const rawInterval = targetPx / pixelsPerSecond
  // Snap to nice values: 5s, 10s, 15s, 30s, 60s, 120s, 300s, 600s
  const niceValues = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]
  for (const nice of niceValues) {
    if (nice >= rawInterval) return nice
  }
  return 3600
}

// ---------------------------------------------------------------------------
// Zoom levels: pixels per second
// ---------------------------------------------------------------------------

const ZOOM_LEVELS = [0.5, 1, 2, 4, 8, 16, 32, 64]
const DEFAULT_ZOOM_INDEX = 2 // 2px/s

// ---------------------------------------------------------------------------
// ClipTimeline
// ---------------------------------------------------------------------------

interface ClipTimelineProps {
  clips: ClipCandidate[]
  sourceId: string
  sourcePath: string
  sourceDuration: number
}

export function ClipTimeline({ clips, sourceId, sourcePath, sourceDuration }: ClipTimelineProps) {
  const updateClipStatus = useStore((s) => s.updateClipStatus)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [previewClip, setPreviewClip] = useState<ClipCandidate | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pixelsPerSecond = ZOOM_LEVELS[zoomIndex]
  const totalWidth = Math.max(sourceDuration * pixelsPerSecond, 400)

  const tickInterval = useMemo(
    () => computeTickInterval(sourceDuration, pixelsPerSecond),
    [sourceDuration, pixelsPerSecond]
  )

  // Compute vertical lanes for overlapping clips
  const lanes = useMemo(() => {
    // Sort by startTime for lane assignment
    const sorted = [...clips].sort((a, b) => a.startTime - b.startTime)
    const laneEnds: number[] = [] // end time of the last clip in each lane
    const assignment = new Map<string, number>()

    for (const clip of sorted) {
      let placed = false
      for (let lane = 0; lane < laneEnds.length; lane++) {
        if (clip.startTime >= laneEnds[lane]) {
          laneEnds[lane] = clip.endTime
          assignment.set(clip.id, lane)
          placed = true
          break
        }
      }
      if (!placed) {
        assignment.set(clip.id, laneEnds.length)
        laneEnds.push(clip.endTime)
      }
    }

    return { assignment, laneCount: Math.max(laneEnds.length, 1) }
  }, [clips])

  const BAR_HEIGHT = 56
  const LANE_GAP = 4
  const RULER_HEIGHT = 28
  const PADDING_TOP = 8
  const laneHeight = BAR_HEIGHT + LANE_GAP
  const trackHeight = lanes.laneCount * laneHeight + PADDING_TOP

  const handleZoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0))
  }, [])

  const handleFitAll = useCallback(() => {
    if (!scrollRef.current || sourceDuration <= 0) return
    const containerWidth = scrollRef.current.clientWidth - 32 // padding
    const idealPxPerSec = containerWidth / sourceDuration
    // Find closest zoom level
    let bestIdx = 0
    let bestDiff = Math.abs(ZOOM_LEVELS[0] - idealPxPerSec)
    for (let i = 1; i < ZOOM_LEVELS.length; i++) {
      const diff = Math.abs(ZOOM_LEVELS[i] - idealPxPerSec)
      if (diff < bestDiff) {
        bestDiff = diff
        bestIdx = i
      }
    }
    setZoomIndex(bestIdx)
  }, [sourceDuration])

  // Generate ruler ticks
  const ticks = useMemo(() => {
    const result: { time: number; x: number; label: string; major: boolean }[] = []
    for (let t = 0; t <= sourceDuration; t += tickInterval) {
      result.push({
        time: t,
        x: t * pixelsPerSecond,
        label: formatTime(t),
        major: true
      })
    }
    return result
  }, [sourceDuration, tickInterval, pixelsPerSecond])

  return (
    <div className="flex flex-col h-full">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card/30">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={handleZoomOut}
          disabled={zoomIndex === 0}
          title="Zoom out"
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums w-14 text-center">
          {pixelsPerSecond}px/s
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={handleZoomIn}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          title="Zoom in"
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={handleFitAll}
          title="Fit all clips in view"
        >
          <ZoomIn className="w-3 h-3" />
          Fit
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {clips.length} clip{clips.length !== 1 ? 's' : ''} · {formatTime(sourceDuration)} total
        </span>
      </div>

      {/* Scrollable timeline area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div
          className="relative select-none"
          style={{ width: totalWidth + 32, minHeight: RULER_HEIGHT + trackHeight + 16 }}
        >
          {/* Ruler */}
          <div
            className="sticky top-0 z-10 border-b border-border/30 bg-background/95 backdrop-blur-sm"
            style={{ height: RULER_HEIGHT }}
          >
            {ticks.map((tick) => (
              <div
                key={tick.time}
                className="absolute top-0 flex flex-col items-start"
                style={{ left: tick.x + 16 }}
              >
                <div className="w-px h-3 bg-border/60" />
                <span className="text-[9px] text-muted-foreground/60 mt-0.5 -translate-x-1/2 whitespace-nowrap">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>

          {/* Clip bars */}
          <TooltipProvider delayDuration={200}>
            <div
              className="relative"
              style={{ height: trackHeight, marginTop: 4 }}
            >
              {clips.map((clip) => {
                const lane = lanes.assignment.get(clip.id) ?? 0
                const left = clip.startTime * pixelsPerSecond + 16
                const width = Math.max(clip.duration * pixelsPerSecond, 24) // min 24px so small clips are clickable
                const top = lane * laneHeight + PADDING_TOP
                const opacity = 0.5 + (clip.score / 100) * 0.5

                return (
                  <Tooltip key={clip.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'absolute rounded-md border transition-all duration-150 cursor-pointer overflow-hidden',
                          'flex items-center gap-1.5 px-2',
                          statusBarBg(clip.status),
                          statusBorderColor(clip.status)
                        )}
                        style={{
                          left,
                          width,
                          top,
                          height: BAR_HEIGHT,
                          opacity
                        }}
                        onClick={() => setPreviewClip(clip)}
                      >
                        {/* Score badge */}
                        <span
                          className={cn(
                            'shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border text-[10px] font-bold tabular-nums',
                            scoreBadgeClass(clip.score)
                          )}
                        >
                          {clip.score}
                        </span>

                        {/* Hook text */}
                        {width > 80 && (
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[10px] font-medium text-foreground leading-tight truncate">
                              {clip.hookText || '—'}
                            </p>
                            <p className="text-[9px] text-muted-foreground leading-tight truncate">
                              {formatDuration(clip.duration)}
                            </p>
                          </div>
                        )}

                        {/* Status dot */}
                        <span className={cn('shrink-0 w-2 h-2 rounded-full', statusColor(clip.status))} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('text-xs', scoreBadgeClass(clip.score))}>
                            {clip.score}
                          </Badge>
                          <span className="text-xs font-medium">
                            {clip.hookText || 'No hook text'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                          <span>({formatDuration(clip.duration)})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={cn('w-2 h-2 rounded-full', statusColor(clip.status))} />
                          <span className="capitalize">{clip.status}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {clip.text}
                        </p>
                        {/* Quick approve/reject */}
                        <div className="flex gap-1 pt-1">
                          <Button
                            size="sm"
                            variant={clip.status === 'approved' ? 'default' : 'outline'}
                            className={cn(
                              'h-5 text-[10px] px-2 gap-0.5',
                              clip.status === 'approved'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'border-green-600/40 text-green-500 hover:bg-green-600/10'
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateClipStatus(sourceId, clip.id, clip.status === 'approved' ? 'pending' : 'approved')
                            }}
                          >
                            <Check className="w-2.5 h-2.5" />
                            {clip.status === 'approved' ? 'Approved' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant={clip.status === 'rejected' ? 'default' : 'outline'}
                            className={cn(
                              'h-5 text-[10px] px-2 gap-0.5',
                              clip.status === 'rejected'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'border-red-600/40 text-red-500 hover:bg-red-600/10'
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateClipStatus(sourceId, clip.id, clip.status === 'rejected' ? 'pending' : 'rejected')
                            }}
                          >
                            <X className="w-2.5 h-2.5" />
                            {clip.status === 'rejected' ? 'Rejected' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Full preview dialog */}
      {previewClip && (
        <ClipPreview
          clip={previewClip}
          sourceId={sourceId}
          sourcePath={sourcePath}
          sourceDuration={sourceDuration}
          open={true}
          onClose={() => setPreviewClip(null)}
        />
      )}
    </div>
  )
}
