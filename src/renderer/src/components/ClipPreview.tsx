import { useState, useRef, useCallback, useEffect } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Settings2,
  Copy,
  RefreshCw,
  Sparkles,
  Info,
  Loader2,
  FolderOpen
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, getScoreDescription } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useStore, DEFAULT_HOOK_TEMPLATES, applyHookTemplate } from '../store'
import type { ClipCandidate, ClipRenderSettings } from '../store'
import { EditableTime, formatTime } from './EditableTime'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { WaveformDisplay } from './WaveformDisplay'

// ---------------------------------------------------------------------------
// Module-level waveform cache — persists across dialog open/close
// key: `${sourcePath}:${startTime}:${endTime}`
// ---------------------------------------------------------------------------
const waveformCache = new Map<string, number[]>()

// ---------------------------------------------------------------------------
// Score badge colour
// ---------------------------------------------------------------------------

function scoreBadgeClass(score: number): string {
  if (score >= 90)
    return 'bg-green-500/20 text-green-400 border-green-500/40'
  if (score >= 80)
    return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
  if (score >= 70)
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
  return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
}

// ---------------------------------------------------------------------------
// DualSlider — two-thumb range slider built from Radix primitives
// ---------------------------------------------------------------------------

interface DualSliderProps {
  min: number
  max: number
  start: number
  end: number
  step?: number
  onStartChange: (v: number) => void
  onEndChange: (v: number) => void
  originalStart: number
  originalEnd: number
}

function DualSlider({
  min,
  max,
  start,
  end,
  step = 0.1,
  onStartChange,
  onEndChange,
  originalStart,
  originalEnd
}: DualSliderProps) {
  const range = max - min || 1

  // Percentages for the "original AI range" overlay
  const origStartPct = ((originalStart - min) / range) * 100
  const origEndPct = ((originalEnd - min) / range) * 100
  const origWidthPct = origEndPct - origStartPct

  const handleValueChange = useCallback(
    ([newStart, newEnd]: number[]) => {
      if (newStart !== start) onStartChange(newStart)
      if (newEnd !== end) onEndChange(newEnd)
    },
    [start, end, onStartChange, onEndChange]
  )

  return (
    <div className="relative w-full">
      {/* Original AI range indicator (behind the slider) */}
      <div className="relative h-2 mb-1">
        <div
          className="absolute top-0 h-2 rounded-full bg-primary/20 border border-primary/30"
          style={{
            left: `${origStartPct}%`,
            width: `${origWidthPct}%`
          }}
          title="Original AI-selected range"
        />
      </div>

      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[start, end]}
        minStepsBetweenThumbs={1}
        onValueChange={handleValueChange}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {/* Start thumb */}
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
        {/* End thumb */}
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OverrideRow — a single override toggle row
// ---------------------------------------------------------------------------

interface OverrideRowProps {
  label: string
  overrideKey: keyof ClipRenderSettings
  globalValue: boolean
  overrides: ClipRenderSettings | undefined
  onChange: (key: keyof ClipRenderSettings, value: boolean | undefined) => void
}

function OverrideRow({ label, overrideKey, globalValue, overrides, onChange }: OverrideRowProps) {
  const overrideValue = overrides?.[overrideKey] as boolean | undefined
  const isOverridden = overrideValue !== undefined
  const effectiveValue = isOverridden ? overrideValue : globalValue

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          'text-xs truncate',
          isOverridden ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}>
          {label}
        </span>
        {isOverridden && (
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] px-1 py-0 leading-tight shrink-0',
              effectiveValue
                ? 'border-green-500/50 text-green-500 bg-green-500/10'
                : 'border-red-500/50 text-red-500 bg-red-500/10'
            )}
          >
            {effectiveValue ? 'ON' : 'OFF'}
          </Badge>
        )}
        {!isOverridden && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 leading-tight shrink-0 border-muted-foreground/30 text-muted-foreground/50"
          >
            global
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isOverridden && (
          <button
            onClick={() => onChange(overrideKey, undefined)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-2"
            title="Reset to global"
          >
            reset
          </button>
        )}
        <Switch
          checked={effectiveValue}
          onCheckedChange={(checked) => onChange(overrideKey, checked)}
          className={cn(
            'scale-75 origin-right',
            isOverridden && effectiveValue && '[&>span]:bg-green-500',
            isOverridden && !effectiveValue && '[&>span]:bg-red-500/80'
          )}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClipPreview dialog
// ---------------------------------------------------------------------------

interface ClipPreviewProps {
  clip: ClipCandidate
  sourceId: string
  sourcePath: string
  sourceDuration: number
  open: boolean
  onClose: () => void
}

export function ClipPreview({
  clip,
  sourceId,
  sourcePath,
  sourceDuration,
  open,
  onClose
}: ClipPreviewProps) {
  const updateClipTrim = useStore((s) => s.updateClipTrim)
  const updateClipHookText = useStore((s) => s.updateClipHookText)
  const setClipOverride = useStore((s) => s.setClipOverride)
  const clearClipOverrides = useStore((s) => s.clearClipOverrides)
  const rescoreClip = useStore((s) => s.rescoreClip)
  const setSingleRenderState = useStore((s) => s.setSingleRenderState)
  const addError = useStore((s) => s.addError)
  const isRendering = useStore((s) => s.isRendering)
  const singleRenderClipId = useStore((s) => s.singleRenderClipId)
  const singleRenderProgress = useStore((s) => s.singleRenderProgress)
  const singleRenderStatus = useStore((s) => s.singleRenderStatus)
  const singleRenderOutputPath = useStore((s) => s.singleRenderOutputPath)
  const settings = useStore((s) => s.settings)
  const hookTemplates = useStore((s) => s.hookTemplates)
  const activeHookTemplateId = useStore((s) => s.activeHookTemplateId)

  // Single-clip render derived state
  const isThisClipRendering = singleRenderClipId === clip.id && singleRenderStatus === 'rendering'
  const isThisClipDone = singleRenderClipId === clip.id && singleRenderStatus === 'done'
  const isSingleRenderActive = singleRenderClipId !== null && singleRenderStatus === 'rendering'

  // All templates combined (built-in + user)
  const allTemplates = [...DEFAULT_HOOK_TEMPLATES, ...hookTemplates]

  const { copy: copyHook, copied: hookCopied } = useCopyToClipboard()
  const { copy: copyTranscript, copied: transcriptCopied } = useCopyToClipboard()
  const { copy: copySocial, copied: socialCopied } = useCopyToClipboard()

  // Local state — tracks pending edits, not committed to store until Apply
  const [localStart, setLocalStart] = useState(clip.startTime)
  const [localEnd, setLocalEnd] = useState(clip.endTime)
  const [localHook, setLocalHook] = useState(clip.hookText)

  // Local template override for this clip (starts from global active template)
  const [localTemplateId, setLocalTemplateId] = useState<string | null>(activeHookTemplateId)
  const localTemplate = allTemplates.find((t) => t.id === localTemplateId) ?? null

  // Templated version of the hook text (for preview and "copy templated" actions)
  const templatedHook = localTemplate && localHook
    ? applyHookTemplate(localTemplate.template, localHook, clip.score, localEnd - localStart)
    : localHook
  const [editingHook, setEditingHook] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(clip.startTime)
  const [showReasoning, setShowReasoning] = useState(false)
  const [showOverrides, setShowOverrides] = useState(false)

  // Re-score state
  const [isRescoring, setIsRescoring] = useState(false)
  const [rescoreError, setRescoreError] = useState<string | null>(null)
  const [lastRescoreResult, setLastRescoreResult] = useState<{ score: number; previousScore: number } | null>(null)

  // Original AI-selected boundaries (fixed for "Reset to Original")
  const [origStart] = useState(clip.startTime)
  const [origEnd] = useState(clip.endTime)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Waveform state — keyed on the slider window (sliderMin..sliderMax)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [waveformLoading, setWaveformLoading] = useState(false)

  // Slider bounds: ±10s from original, clamped to video duration
  const sliderMin = Math.max(0, origStart - 10)
  const sliderMax = Math.min(sourceDuration > 0 ? sourceDuration : origEnd + 10, origEnd + 10)

  // Re-sync local state when clip prop changes (e.g. if dialog re-opens for a different clip)
  useEffect(() => {
    setLocalStart(clip.startTime)
    setLocalEnd(clip.endTime)
    setLocalHook(clip.hookText)
    setCurrentTime(clip.startTime)
    setIsPlaying(false)
  }, [clip.id, clip.startTime, clip.endTime, clip.hookText])

  // When dialog opens, seek video to startTime
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.currentTime = localStart
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch waveform data when the dialog opens (cached per source+window)
  useEffect(() => {
    if (!open) return
    const cacheKey = `${sourcePath}:${sliderMin.toFixed(2)}:${sliderMax.toFixed(2)}`
    const cached = waveformCache.get(cacheKey)
    if (cached) {
      setWaveformData(cached)
      return
    }
    let cancelled = false
    setWaveformLoading(true)
    window.api.getWaveform(sourcePath, sliderMin, sliderMax, 500)
      .then((data) => {
        if (cancelled) return
        waveformCache.set(cacheKey, data)
        setWaveformData(data)
      })
      .catch(() => {
        if (!cancelled) setWaveformData([])
      })
      .finally(() => {
        if (!cancelled) setWaveformLoading(false)
      })
    return () => { cancelled = true }
  }, [open, sourcePath, sliderMin, sliderMax]) // eslint-disable-line react-hooks/exhaustive-deps

  // Waveform click-to-seek handler
  const handleWaveformSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  // Auto-pause when playback reaches endTime
  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    setCurrentTime(vid.currentTime)
    if (vid.currentTime >= localEnd) {
      vid.pause()
      setIsPlaying(false)
    }
  }, [localEnd])

  const handlePlayPause = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (isPlaying) {
      vid.pause()
      setIsPlaying(false)
    } else {
      // If we're past end, restart from localStart
      if (vid.currentTime >= localEnd) {
        vid.currentTime = localStart
      }
      vid.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [isPlaying, localStart, localEnd])

  const handleVideoClick = useCallback(() => {
    handlePlayPause()
  }, [handlePlayPause])

  // When trim handles change, seek video to the moved handle position
  const handleStartChange = useCallback(
    (v: number) => {
      const clamped = Math.min(v, localEnd - 0.5)
      setLocalStart(clamped)
      if (videoRef.current) {
        videoRef.current.currentTime = clamped
        setCurrentTime(clamped)
      }
    },
    [localEnd]
  )

  const handleEndChange = useCallback(
    (v: number) => {
      const clamped = Math.max(v, localStart + 0.5)
      setLocalEnd(clamped)
      if (videoRef.current) {
        videoRef.current.currentTime = clamped
        setCurrentTime(clamped)
      }
    },
    [localStart]
  )

  const handleApply = useCallback(() => {
    updateClipTrim(sourceId, clip.id, localStart, localEnd)
    if (localHook !== clip.hookText) {
      updateClipHookText(sourceId, clip.id, localHook)
    }
    onClose()
  }, [sourceId, clip.id, clip.hookText, localStart, localEnd, localHook, updateClipTrim, updateClipHookText, onClose])

  const handleReset = useCallback(() => {
    setLocalStart(origStart)
    setLocalEnd(origEnd)
    if (videoRef.current) {
      videoRef.current.currentTime = origStart
      setCurrentTime(origStart)
    }
  }, [origStart, origEnd])

  const handleWordClick = useCallback((wordStart: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = wordStart
      setCurrentTime(wordStart)
    }
  }, [])

  // Re-score handler
  const handleRescore = useCallback(async () => {
    const apiKey = settings.geminiApiKey
    if (!apiKey) {
      setRescoreError('No Gemini API key set — add one in Settings.')
      return
    }
    // Use word timestamps filtered to the current trim range, or fall back to clip.text
    const transcriptText = clip.wordTimestamps && clip.wordTimestamps.length > 0
      ? clip.wordTimestamps
          .filter((w) => w.start >= localStart && w.end <= localEnd)
          .map((w) => w.text)
          .join(' ')
      : clip.text
    if (!transcriptText.trim()) {
      setRescoreError('No transcript text available for this clip range.')
      return
    }
    setIsRescoring(true)
    setRescoreError(null)
    setLastRescoreResult(null)
    try {
      const result = await window.api.rescoreSingleClip(apiKey, transcriptText, localEnd - localStart)
      const previousScore = clip.score
      rescoreClip(sourceId, clip.id, result.score, result.reasoning, result.hookText || undefined)
      setLastRescoreResult({ score: result.score, previousScore })
      // Update local hook if AI returned one
      if (result.hookText) {
        setLocalHook(result.hookText)
      }
    } catch (err) {
      setRescoreError(err instanceof Error ? err.message : 'Re-score failed. Check your API key and try again.')
    } finally {
      setIsRescoring(false)
    }
  }, [settings.geminiApiKey, clip, localStart, localEnd, sourceId, rescoreClip])

  // Render this clip (applies pending edits first, then starts render)
  const handleRenderThisClip = useCallback(async () => {
    if (isRendering || isSingleRenderActive) return
    // Apply pending edits to store first
    updateClipTrim(sourceId, clip.id, localStart, localEnd)
    if (localHook !== clip.hookText) {
      updateClipHookText(sourceId, clip.id, localHook)
    }
    let outputDir = settings.outputDirectory
    if (!outputDir) {
      outputDir = await window.api.openDirectory()
      if (!outputDir) return
    }
    const job = {
      clipId: clip.id,
      sourceVideoPath: sourcePath,
      startTime: localStart,
      endTime: localEnd,
      cropRegion: clip.cropRegion
        ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
        : undefined,
      wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
      hookTitleText: localHook || undefined,
    }
    setSingleRenderState({ clipId: clip.id, progress: 0, status: 'rendering', outputPath: null, error: null })
    const cleanups: Array<() => void> = []
    cleanups.push(window.api.onRenderClipProgress((data) => {
      if (data.clipId !== clip.id) return
      setSingleRenderState({ progress: data.percent })
    }))
    cleanups.push(window.api.onRenderClipDone((data) => {
      if (data.clipId !== clip.id) return
      setSingleRenderState({ status: 'done', progress: 100, outputPath: data.outputPath })
    }))
    cleanups.push(window.api.onRenderClipError((data) => {
      if (data.clipId !== clip.id) return
      setSingleRenderState({ status: 'error', error: data.error })
    }))
    cleanups.push(window.api.onRenderBatchDone(() => {
      for (const cleanup of cleanups) cleanup()
    }))
    cleanups.push(window.api.onRenderCancelled(() => {
      setSingleRenderState({ clipId: null, status: 'idle', progress: 0, outputPath: null, error: null })
      for (const cleanup of cleanups) cleanup()
    }))
    try {
      await window.api.startBatchRender({
        jobs: [job],
        outputDirectory: outputDir,
        soundDesign: settings.soundDesign.enabled ? settings.soundDesign : undefined,
        autoZoom: settings.autoZoom.enabled
          ? { enabled: true, intensity: settings.autoZoom.intensity, intervalSeconds: settings.autoZoom.intervalSeconds }
          : undefined,
        brandKit: settings.brandKit.enabled ? settings.brandKit : undefined,
        hookTitleOverlay: settings.hookTitleOverlay.enabled ? settings.hookTitleOverlay : undefined,
        rehookOverlay: settings.rehookOverlay.enabled ? settings.rehookOverlay : undefined,
        progressBarOverlay: settings.progressBarOverlay.enabled ? settings.progressBarOverlay : undefined,
        captionsEnabled: settings.captionsEnabled,
        captionStyle: settings.captionsEnabled ? settings.captionStyle : undefined,
      } as Parameters<typeof window.api.startBatchRender>[0])
    } catch (err) {
      setSingleRenderState({ status: 'error', error: err instanceof Error ? err.message : String(err) })
      for (const cleanup of cleanups) cleanup()
      addError({ source: 'render', message: `Failed to render clip: ${err instanceof Error ? err.message : String(err)}` })
    }
  }, [isRendering, isSingleRenderActive, settings, clip, sourceId, sourcePath, localStart, localEnd, localHook, updateClipTrim, updateClipHookText, setSingleRenderState, addError])

  // Boundary change magnitude (vs original AI boundaries)
  const boundaryChangedSignificantly =
    Math.abs(localStart - origStart) > 2 || Math.abs(localEnd - origEnd) > 2

  // Handle override toggle changes
  const handleOverrideChange = useCallback(
    (key: keyof ClipRenderSettings, value: boolean | undefined) => {
      if (value === undefined) {
        // Remove this specific key from overrides
        const current = clip.overrides ?? {}
        const updated = { ...current }
        delete updated[key]
        if (Object.keys(updated).length === 0) {
          clearClipOverrides(sourceId, clip.id)
        } else {
          // We need to set each remaining key individually — build from scratch
          clearClipOverrides(sourceId, clip.id)
          for (const [k, v] of Object.entries(updated)) {
            setClipOverride(sourceId, clip.id, k as keyof ClipRenderSettings, v as ClipRenderSettings[keyof ClipRenderSettings])
          }
        }
      } else {
        setClipOverride(sourceId, clip.id, key, value)
      }
    },
    [sourceId, clip.id, clip.overrides, setClipOverride, clearClipOverrides]
  )

  // Handle layout override
  const handleLayoutChange = useCallback(
    (layout: 'default' | 'blur-background') => {
      const currentLayout = clip.overrides?.layout
      if (currentLayout === layout) {
        // Toggle off — reset to global
        const current = clip.overrides ?? {}
        const updated = { ...current }
        delete updated.layout
        if (Object.keys(updated).length === 0) {
          clearClipOverrides(sourceId, clip.id)
        } else {
          clearClipOverrides(sourceId, clip.id)
          for (const [k, v] of Object.entries(updated)) {
            setClipOverride(sourceId, clip.id, k as keyof ClipRenderSettings, v as ClipRenderSettings[keyof ClipRenderSettings])
          }
        }
      } else {
        setClipOverride(sourceId, clip.id, 'layout', layout)
      }
    },
    [sourceId, clip.id, clip.overrides, setClipOverride, clearClipOverrides]
  )

  const hasOverrides = clip.overrides && Object.keys(clip.overrides).length > 0

  // Current time relative to clip start
  const relativeTime = Math.max(0, currentTime - localStart)
  const clipDuration = localEnd - localStart

  const videoSrc = `file://${sourcePath}`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex flex-col items-center shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-default">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-bold tabular-nums',
                          scoreBadgeClass(clip.score)
                        )}
                      >
                        {clip.score}
                      </span>
                      <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs max-w-56">
                    {(() => {
                      const { label, description } = getScoreDescription(clip.score)
                      const firstSentence = clip.reasoning
                        ? clip.reasoning.split(/[.!?]/)[0].trim()
                        : null
                      return (
                        <div className="space-y-1">
                          <p className="font-semibold">{label} ({clip.score}/100)</p>
                          <p className="text-muted-foreground">{description}</p>
                          {firstSentence && (
                            <p className="text-muted-foreground/80 italic border-t border-border pt-1 mt-1">
                              {firstSentence}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {clip.originalScore != null && clip.originalScore !== clip.score && (
                <span className="text-[9px] text-muted-foreground/50 tabular-nums mt-0.5">
                  was {clip.originalScore}
                </span>
              )}
            </div>
            {editingHook ? (
              <input
                autoFocus
                className="flex-1 text-base font-semibold bg-transparent border-b border-primary outline-none text-foreground"
                value={localHook}
                onChange={(e) => setLocalHook(e.target.value)}
                onBlur={() => setEditingHook(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingHook(false)
                }}
              />
            ) : (
              <DialogTitle
                className="flex-1 text-base leading-snug cursor-pointer hover:text-muted-foreground group flex items-center gap-1.5"
                onClick={() => setEditingHook(true)}
              >
                {localHook || '—'}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </DialogTitle>
            )}
            {/* Copy hook text button */}
            {localHook && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => copyHook(templatedHook)}
                      className={cn(
                        'shrink-0 p-1 rounded transition-colors',
                        hookCopied
                          ? 'text-green-500'
                          : 'text-muted-foreground/50 hover:text-muted-foreground'
                      )}
                      aria-label="Copy hook text"
                    >
                      {hookCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {hookCopied ? 'Copied!' : 'Copy hook text'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Template selector row */}
          <div className="flex items-center gap-2 mt-1.5">
            <Sparkles className="w-3 h-3 text-muted-foreground shrink-0" />
            <Select
              value={localTemplateId ?? '__none__'}
              onValueChange={(v) => setLocalTemplateId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No template</SelectItem>
                {allTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.emoji ? `${t.emoji} ` : ''}{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localTemplate && localHook && localTemplate.template !== '{hookText}' && (
              <p className="text-xs text-muted-foreground/70 truncate max-w-[10rem]" title={templatedHook}>
                → {templatedHook}
              </p>
            )}
          </div>
        </DialogHeader>

        {/* Video player */}
        <div
          className="relative w-full bg-black cursor-pointer"
          style={{ aspectRatio: '16/9' }}
          onClick={handleVideoClick}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = localStart
              }
            }}
          />

          {/* Play/Pause overlay button */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/0 hover:bg-black/20 transition-colors duration-200',
              !isPlaying && 'bg-black/10'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/30 flex items-center justify-center',
                'transition-opacity duration-200',
                isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
              )}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              )}
            </div>
          </div>

          {/* Time overlay */}
          <div className="absolute bottom-2 right-3 text-xs font-mono text-white/80 bg-black/50 px-1.5 py-0.5 rounded tabular-nums">
            {formatTime(relativeTime)} / {formatTime(clipDuration)}
          </div>
        </div>

        {/* Trim controls */}
        <div className="px-5 py-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-foreground text-xs">Trim</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums font-mono">{formatTime(clipDuration)}</span>
              {(localStart !== origStart || localEnd !== origEnd) && (
                <span className="text-primary ml-1 text-[10px]">(modified)</span>
              )}
            </span>
          </div>

          {/* Waveform visualization */}
          {waveformLoading && (
            <div className="w-full h-14 rounded bg-muted/30 animate-pulse" />
          )}
          {!waveformLoading && waveformData.length > 0 && (
            <WaveformDisplay
              data={waveformData}
              startTime={sliderMin}
              endTime={sliderMax}
              currentTime={currentTime}
              trimStart={localStart}
              trimEnd={localEnd}
              originalStart={origStart}
              originalEnd={origEnd}
              height={56}
              onSeek={handleWaveformSeek}
              className="rounded overflow-hidden"
            />
          )}

          {/* Dual-handle slider */}
          <DualSlider
            min={sliderMin}
            max={sliderMax}
            start={localStart}
            end={localEnd}
            step={0.1}
            onStartChange={handleStartChange}
            onEndChange={handleEndChange}
            originalStart={origStart}
            originalEnd={origEnd}
          />

          {/* Time labels */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">In</span>
              <EditableTime
                value={localStart}
                onChange={handleStartChange}
                min={sliderMin}
                max={localEnd - 0.5}
              />
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Out</span>
              <EditableTime
                value={localEnd}
                onChange={handleEndChange}
                min={localStart + 0.5}
                max={sliderMax}
              />
            </div>
          </div>

          {/* Playback controls + Re-score row */}
          <div className="flex items-center gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlayPause}
              className="gap-1.5 text-xs w-28"
            >
              {isPlaying ? (
                <><Pause className="w-3.5 h-3.5" /> Pause</>
              ) : (
                <><Play className="w-3.5 h-3.5 fill-current" /> Play Clip</>
              )}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRescore}
                    disabled={isRescoring || !settings.geminiApiKey}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', isRescoring && 'animate-spin')} />
                    {isRescoring ? 'Scoring…' : 'Re-score'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-52">
                  {!settings.geminiApiKey
                    ? 'Add a Gemini API key in Settings to re-score'
                    : 'Re-score this clip with AI based on the current transcript and boundaries'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Re-score hint: boundaries changed significantly */}
          {boundaryChangedSignificantly && !lastRescoreResult && !isRescoring && (
            <p className="text-[11px] text-amber-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Boundaries changed significantly — re-score recommended
            </p>
          )}

          {/* Re-score result comparison */}
          {lastRescoreResult && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Score updated:</span>
              <span className="font-mono tabular-nums text-muted-foreground/70">{lastRescoreResult.previousScore}</span>
              <span className="text-muted-foreground">→</span>
              <span className={cn(
                'font-mono tabular-nums font-semibold',
                lastRescoreResult.score > lastRescoreResult.previousScore ? 'text-green-500' : 'text-red-400'
              )}>
                {lastRescoreResult.score}
              </span>
              <span className={cn(
                'text-[10px] font-medium px-1 rounded',
                lastRescoreResult.score > lastRescoreResult.previousScore
                  ? 'bg-green-500/15 text-green-500'
                  : 'bg-red-500/15 text-red-400'
              )}>
                {lastRescoreResult.score > lastRescoreResult.previousScore ? '+' : ''}
                {lastRescoreResult.score - lastRescoreResult.previousScore}
              </span>
            </div>
          )}

          {/* Re-score error */}
          {rescoreError && (
            <p className="text-[11px] text-destructive">{rescoreError}</p>
          )}
        </div>

        {/* Info panel */}
        <div className="px-5 py-3 space-y-2 overflow-y-auto max-h-48">
          {/* Reasoning */}
          {clip.reasoning && (
            <div>
              <button
                onClick={() => setShowReasoning((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                AI reasoning
              </button>
              {showReasoning && (
                <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed italic">
                  {clip.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Word timestamps */}
          {clip.wordTimestamps && clip.wordTimestamps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                  Words — click to seek
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => copyTranscript(clip.wordTimestamps!.map((w) => w.text).join(' '))}
                        className={cn(
                          'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                          transcriptCopied
                            ? 'text-green-500 border-green-500/40 bg-green-500/10'
                            : 'text-muted-foreground/60 border-border/50 hover:text-muted-foreground hover:border-border'
                        )}
                      >
                        {transcriptCopied ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {transcriptCopied ? 'Copied!' : 'Copy transcript'}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {transcriptCopied ? 'Copied to clipboard!' : 'Copy full transcript text'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap gap-1">
                {clip.wordTimestamps.map((w, i) => {
                  const isActive = currentTime >= w.start && currentTime < w.end
                  return (
                    <button
                      key={i}
                      onClick={() => handleWordClick(w.start)}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded border transition-colors',
                        isActive
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                      )}
                      title={`${formatTime(w.start)} – ${formatTime(w.end)}`}
                    >
                      {w.text}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Copy transcript from clip.text if no word timestamps */}
          {clip.text && (!clip.wordTimestamps || clip.wordTimestamps.length === 0) && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Transcript</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => copyTranscript(clip.text)}
                      className={cn(
                        'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                        transcriptCopied
                          ? 'text-green-500 border-green-500/40 bg-green-500/10'
                          : 'text-muted-foreground/60 border-border/50 hover:text-muted-foreground hover:border-border'
                      )}
                    >
                      {transcriptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {transcriptCopied ? 'Copied!' : 'Copy transcript'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Copy transcript text</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Copy for Social Media — hook text + transcript as a ready-to-post block */}
          {(clip.hookText || clip.text) && (
            <div className="pt-1 border-t border-border/40">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const parts: string[] = []
                        if (clip.hookText) parts.push(clip.hookText)
                        if (clip.text) parts.push(clip.text)
                        copySocial(parts.join('\n\n'))
                      }}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors w-full justify-center',
                        socialCopied
                          ? 'text-green-500 border-green-500/40 bg-green-500/10'
                          : 'text-muted-foreground/70 border-border/50 hover:text-foreground hover:border-border bg-muted/30 hover:bg-muted/50'
                      )}
                    >
                      {socialCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {socialCopied ? 'Copied!' : 'Copy for Social Media'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Copies hook text and transcript as a formatted block ready to post
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Clip-level render overrides */}
        <div className="border-t border-border">
          <button
            onClick={() => setShowOverrides((v) => !v)}
            className={cn(
              'flex items-center gap-2 w-full px-5 py-3 text-left hover:bg-muted/30 transition-colors',
              showOverrides && 'bg-muted/20'
            )}
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground flex-1">
              Override Global Settings
            </span>
            {hasOverrides && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-amber-500/50 text-amber-500 bg-amber-500/10"
              >
                {Object.keys(clip.overrides!).length} override{Object.keys(clip.overrides!).length !== 1 ? 's' : ''}
              </Badge>
            )}
            {showOverrides ? (
              <ChevronUp className="w-3 h-3 text-muted-foreground/60" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
            )}
          </button>

          {showOverrides && (
            <div className="px-5 pb-4 space-y-1 border-t border-border/50 pt-3">
              {/* Layout picker */}
              <div className="mb-3">
                <Label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-2 block">
                  Layout
                </Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLayoutChange('default')}
                    className={cn(
                      'flex-1 text-xs py-1.5 px-2.5 rounded border transition-colors text-center',
                      clip.overrides?.layout === 'default'
                        ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                        : clip.overrides?.layout === undefined
                          ? 'border-border/60 text-muted-foreground bg-muted/30 ring-1 ring-muted-foreground/20'
                          : 'border-border/40 text-muted-foreground/60 hover:bg-muted/20'
                    )}
                    title="Standard face-centred 9:16 crop"
                  >
                    Default Crop
                    {clip.overrides?.layout === undefined && (
                      <span className="block text-[9px] text-muted-foreground/40 mt-0.5">using global</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleLayoutChange('blur-background')}
                    className={cn(
                      'flex-1 text-xs py-1.5 px-2.5 rounded border transition-colors text-center',
                      clip.overrides?.layout === 'blur-background'
                        ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                        : 'border-border/40 text-muted-foreground/60 hover:bg-muted/20'
                    )}
                    title="Letterboxed with blurred background fill"
                  >
                    Blur Background
                  </button>
                </div>
              </div>

              {/* Toggle overrides */}
              <Label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1 block">
                Feature Overrides
              </Label>
              <div className="divide-y divide-border/30">
                <OverrideRow
                  label="Captions"
                  overrideKey="enableCaptions"
                  globalValue={settings.captionsEnabled}
                  overrides={clip.overrides}
                  onChange={handleOverrideChange}
                />
                <OverrideRow
                  label="Hook Title Overlay"
                  overrideKey="enableHookTitle"
                  globalValue={settings.hookTitleOverlay.enabled}
                  overrides={clip.overrides}
                  onChange={handleOverrideChange}
                />
                <OverrideRow
                  label="Progress Bar"
                  overrideKey="enableProgressBar"
                  globalValue={settings.progressBarOverlay.enabled}
                  overrides={clip.overrides}
                  onChange={handleOverrideChange}
                />
                <OverrideRow
                  label="Auto-Zoom (Ken Burns)"
                  overrideKey="enableAutoZoom"
                  globalValue={settings.autoZoom.enabled}
                  overrides={clip.overrides}
                  onChange={handleOverrideChange}
                />
                <OverrideRow
                  label="Sound Design"
                  overrideKey="enableSoundDesign"
                  globalValue={settings.soundDesign.enabled}
                  overrides={clip.overrides}
                  onChange={handleOverrideChange}
                />
                <OverrideRow
                  label="Brand Kit"
                  overrideKey="enableBrandKit"
                  globalValue={settings.brandKit.enabled}
                  overrides={clip.overrides}
                  onChange={handleOverrideChange}
                />
              </div>

              {/* Clear all overrides */}
              {hasOverrides && (
                <div className="pt-2">
                  <button
                    onClick={() => clearClipOverrides(sourceId, clip.id)}
                    className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors underline underline-offset-2"
                  >
                    Clear all overrides
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-0 border-t border-border bg-card/50">
          {/* Render progress bar — shown when this clip is rendering */}
          {isThisClipRendering && (
            <div className="px-5 pt-3 pb-0 flex items-center gap-3">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${singleRenderProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums font-mono shrink-0">
                {Math.round(singleRenderProgress)}%
              </span>
            </div>
          )}
          {/* Render done — show open folder link */}
          {isThisClipDone && singleRenderOutputPath && (
            <div className="px-5 pt-3 pb-0 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span className="text-xs text-green-500 font-medium">Rendered!</span>
              <button
                onClick={() => window.api.showItemInFolder(singleRenderOutputPath)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <FolderOpen className="w-3 h-3" />
                Open folder
              </button>
            </div>
          )}
          <div className="flex gap-2 px-5 py-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="gap-1.5 text-xs"
              disabled={localStart === origStart && localEnd === origEnd}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Original
            </Button>
            <div className="flex-1" />
            {/* Render This Clip button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleRenderThisClip}
                    disabled={isRendering || (isSingleRenderActive && !isThisClipRendering)}
                    className={cn(
                      'gap-1.5 text-xs',
                      isThisClipRendering
                        ? 'bg-primary/80'
                        : 'bg-primary hover:bg-primary/90'
                    )}
                  >
                    {isThisClipRendering ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    {isThisClipRendering ? 'Rendering…' : 'Render This Clip'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-48">
                  {isRendering
                    ? 'A batch render is already running'
                    : isSingleRenderActive && !isThisClipRendering
                      ? 'Another clip is rendering'
                      : 'Apply changes and render this clip immediately'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="gap-1.5 text-xs"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleApply}
              className="gap-1.5 text-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
