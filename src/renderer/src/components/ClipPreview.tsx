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
  FolderOpen,
  Monitor,
  Smartphone,
  Camera,
  Eye,
  RotateCw,
  Palette,
  Type
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
import { useStore, DEFAULT_HOOK_TEMPLATES, applyHookTemplate, CAPTION_PRESETS } from '../store'
import type { ClipCandidate, ClipRenderSettings, CaptionStyle } from '../store'

import { EditableTime, formatTime } from './EditableTime'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { WaveformDisplay } from './WaveformDisplay'
import { SegmentTimeline } from './SegmentTimeline'
import { SegmentStylePicker } from './SegmentStylePicker'
import { SegmentCaptionEditor, type SidebarTab } from './SegmentCaptionEditor'
import { EditStyleSelector } from './EditStyleSelector'
import type { VideoSegment, EditStyle as EditStyleType } from '../store'

// ---------------------------------------------------------------------------
// Module-level waveform cache — persists across dialog open/close
// key: `${sourcePath}:${startTime}:${endTime}`
// ---------------------------------------------------------------------------
const waveformCache = new Map<string, number[]>()

/** Stable empty array to avoid creating new references in selectors. */
const EMPTY_SEGMENTS: import('../store').VideoSegment[] = []

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
// ---------------------------------------------------------------------------
// Editor keyboard shortcut helpers — style presets for 1-9 quick-apply
// ---------------------------------------------------------------------------

/** Returns true if the active element is a text input, textarea, or contenteditable. */
function isTypingInField(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}


// ---------------------------------------------------------------------------
// CaptionStyleMiniThumb — compact thumbnail for basic caption styles
// ---------------------------------------------------------------------------

const MINI_W = 68
const MINI_H = 54
const MINI_PREVIEW_H = MINI_H - 16
const MINI_SCALE = MINI_W / 1080

function CaptionStyleMiniThumb({
  style,
  isSelected,
  onClick
}: {
  style: CaptionStyle
  isSelected: boolean
  onClick: () => void
}) {
  const scaledFontSize = Math.max(5, Math.round(style.fontSize * 1920 * MINI_SCALE))
  const isWordBox = style.animation === 'word-box'
  const hasBox = style.borderStyle === 3 && !isWordBox
  const outlineWidth = Math.max(1, Math.round(style.outline * MINI_SCALE))

  const baseTextStyle: React.CSSProperties = {
    fontFamily: `"${style.fontName}", sans-serif`,
    fontSize: `${scaledFontSize}px`,
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: 'center',
    WebkitTextStroke: hasBox ? undefined : `${outlineWidth}px ${style.outlineColor}`,
    textShadow: hasBox ? undefined : `1px 1px 1px ${style.outlineColor}`
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center rounded-md overflow-hidden transition-all cursor-pointer',
        'hover:ring-2 hover:ring-primary/50 active:scale-95',
        isSelected ? 'ring-2 ring-primary shadow-md shadow-primary/20' : 'ring-1 ring-border/50'
      )}
      style={{ width: MINI_W }}
      title={style.label}
    >
      <div
        className="flex items-center justify-center w-full"
        style={{
          width: MINI_W,
          height: MINI_PREVIEW_H,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}
      >
        <div
          className="flex flex-col items-center gap-0"
          style={hasBox ? { padding: '1px 2px', backgroundColor: style.backColor, borderRadius: '2px' } : {}}
        >
          {isWordBox ? (
            <span style={{
              fontFamily: `"${style.fontName}", sans-serif`,
              fontSize: `${scaledFontSize}px`,
              fontWeight: 700,
              color: style.primaryColor,
              backgroundColor: style.outlineColor,
              borderRadius: '2px',
              padding: '0px 2px',
              lineHeight: 1.3,
            }}>
              Abc
            </span>
          ) : (
            <span style={{
              ...baseTextStyle,
              color: style.highlightColor
            }}>
              Abc
            </span>
          )}
        </div>
      </div>
      <div
        className="w-full text-center truncate px-0.5 py-0.5 text-[8px] text-muted-foreground bg-card leading-tight"
        title={style.label}
      >
        {style.label}
      </div>
    </button>
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
  const setClipCustomThumbnail = useStore((s) => s.setClipCustomThumbnail)
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
  const toggleFillerRestore = useStore((s) => s.toggleFillerRestore)

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
  const [viewMode, setViewMode] = useState<'source' | 'output'>('output')

  // Re-score state
  const [isRescoring, setIsRescoring] = useState(false)
  const [rescoreError, setRescoreError] = useState<string | null>(null)
  const [lastRescoreResult, setLastRescoreResult] = useState<{ score: number; previousScore: number } | null>(null)

  // Thumbnail capture feedback
  const [thumbnailCaptured, setThumbnailCaptured] = useState(false)

  // Preview with overlays state
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Original AI-selected boundaries (fixed for "Reset to Original")
  const [origStart] = useState(clip.startTime)
  const [origEnd] = useState(clip.endTime)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Source video native dimensions (set on loadedmetadata)
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null)

  // ── Segment Editor state ──
  const clipSegments = useStore((s) => s.segments[clip.id] ?? EMPTY_SEGMENTS)
  const editStyles = useStore((s) => s.editStyles)
  const selectedEditStyleId = useStore((s) => s.selectedEditStyleId)
  const selectedSegmentIndex = useStore((s) => s.selectedSegmentIndex)
  const storeSetSegments = useStore((s) => s.setSegments)
  const storeUpdateSegment = useStore((s) => s.updateSegment)
  const storeSetSelectedSegmentIndex = useStore((s) => s.setSelectedSegmentIndex)
  const storeSetSelectedEditStyleId = useStore((s) => s.setSelectedEditStyleId)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('style')
  const [segmentLoading, setSegmentLoading] = useState(false)
  const [showStyleModal, setShowStyleModal] = useState(false)
  const [useOldLayout, setUseOldLayout] = useState(false)
  const hasSegments = clipSegments.length > 0
  const selectedSegment = hasSegments && selectedSegmentIndex < clipSegments.length
    ? clipSegments[selectedSegmentIndex]
    : null
  const activeEditStyle = editStyles.find((s: EditStyleType) => s.id === selectedEditStyleId) ?? null

  // Waveform state — keyed on the slider window (sliderMin..sliderMax)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [waveformLoading, setWaveformLoading] = useState(false)

  // Clip duration (must be defined before callbacks that reference it)
  const clipDuration = localEnd - localStart

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

  // ── Auto-split into segments when dialog opens ──
  useEffect(() => {
    if (!open) return
    // Already have segments → show editor immediately
    if (clipSegments.length > 0) return
    // Need word timestamps to split
    const words = clip.wordTimestamps?.filter((w) => w.start >= localStart && w.end <= localEnd)
    if (!words || words.length === 0) {
      setUseOldLayout(true)
      return
    }
    let cancelled = false
    setSegmentLoading(true)
    window.api.splitSegmentsForEditor(clip.id, words)
      .then((segs: VideoSegment[]) => {
        if (cancelled) return
        storeSetSegments(clip.id, segs)
        setSegmentLoading(false)
        // If no edit styles loaded yet, or no selected style, show style picker
        if (!selectedEditStyleId) {
          setShowStyleModal(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUseOldLayout(true)
          setSegmentLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-update selectedSegmentIndex when video plays through boundary ──
  useEffect(() => {
    if (clipSegments.length === 0) return
    for (let i = 0; i < clipSegments.length; i++) {
      if (currentTime >= clipSegments[i].startTime && currentTime <= clipSegments[i].endTime) {
        if (i !== selectedSegmentIndex) {
          storeSetSelectedSegmentIndex(i)
        }
        break
      }
    }
  }, [currentTime, clipSegments, selectedSegmentIndex, storeSetSelectedSegmentIndex])

  // ── Reset segment editor state when dialog closes ──
  useEffect(() => {
    if (!open) {
      setShowStyleModal(false)
      setSegmentLoading(false)
    }
  }, [open])

  // Waveform click-to-seek handler
  const handleWaveformSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  // Auto-pause when playback reaches the end of the clip
  // In preview mode: stop at clipDuration (video starts at 0)
  // In source mode: stop at localEnd (video is the full source)
  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    setCurrentTime(vid.currentTime)
    const stopPoint = showPreview ? clipDuration : localEnd
    if (vid.currentTime >= stopPoint) {
      vid.pause()
      setIsPlaying(false)
    }
  }, [localEnd, showPreview, clipDuration])

  const handlePlayPause = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (isPlaying) {
      vid.pause()
      setIsPlaying(false)
    } else {
      // If we're past end, restart from the beginning of the clip
      const stopPoint = showPreview ? clipDuration : localEnd
      const startPoint = showPreview ? 0 : localStart
      if (vid.currentTime >= stopPoint) {
        vid.currentTime = startPoint
      }
      vid.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [isPlaying, localStart, localEnd, showPreview, clipDuration])

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

  // ── Segment editor handlers ──

  const handleSelectSegment = useCallback((index: number) => {
    storeSetSelectedSegmentIndex(index)
    // Seek video to segment start
    const seg = clipSegments[index]
    if (seg && videoRef.current) {
      const seekTo = showPreview ? Math.max(0, seg.startTime - localStart) : seg.startTime
      videoRef.current.currentTime = seekTo
      setCurrentTime(seg.startTime)
    }
  }, [clipSegments, showPreview, localStart, storeSetSelectedSegmentIndex])

  const handleSegmentStyleChange = useCallback((segmentId: string, variantId: string) => {
    window.api.updateSegmentStyle(segmentId, variantId)
      .then((updated: VideoSegment) => {
        storeUpdateSegment(clip.id, segmentId, updated)
      })
      .catch(() => {
        // Optimistic: still update locally
        storeUpdateSegment(clip.id, segmentId, { segmentStyleId: variantId })
      })
  }, [clip.id, storeUpdateSegment])

  const handleSegmentCaptionUpdate = useCallback((segmentId: string, newText: string) => {
    window.api.updateSegmentCaption(segmentId, newText)
      .then((updated: VideoSegment) => {
        storeUpdateSegment(clip.id, segmentId, updated)
      })
      .catch(() => {
        // Optimistic update
        storeUpdateSegment(clip.id, segmentId, { captionText: newText })
      })
  }, [clip.id, storeUpdateSegment])

  const handleEditStyleSelect = useCallback((styleId: string) => {
    storeSetSelectedEditStyleId(styleId)
    if (clipSegments.length > 0) {
      window.api.assignSegmentStyles(clipSegments, styleId, settings.geminiApiKey || undefined)
        .then((styled: VideoSegment[]) => {
          storeSetSegments(clip.id, styled)
        })
        .catch(() => {})
    }
    setShowStyleModal(false)
  }, [clipSegments, clip.id, storeSetSegments, storeSetSelectedEditStyleId, settings.geminiApiKey])

  /** Check if a word overlaps with any filler segment. Returns the segment index or -1. */
  const getWordFillerIndex = useCallback(
    (word: { start: number; end: number }): number => {
      const segs = clip?.fillerSegments
      if (!segs || segs.length === 0) return -1
      for (let i = 0; i < segs.length; i++) {
        // Word overlaps segment if word.start < seg.end && word.end > seg.start
        if (word.start < segs[i].end && word.end > segs[i].start) return i
      }
      return -1
    },
    [clip?.fillerSegments]
  )

  // Capture current video frame and save as custom thumbnail
  const handleCaptureThumbnail = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const canvas = document.createElement('canvas')
    canvas.width = vid.videoWidth || 1280
    canvas.height = vid.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setClipCustomThumbnail(sourceId, clip.id, dataUrl)
    setThumbnailCaptured(true)
    setTimeout(() => setThumbnailCaptured(false), 2000)
  }, [sourceId, clip.id, setClipCustomThumbnail])

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
      clipOverrides: clip.overrides && Object.keys(clip.overrides).length > 0 ? clip.overrides : undefined,
      precomputedFillerSegments: clip.fillerSegments && clip.fillerSegments.length > 0
        ? clip.fillerSegments.filter((_, i) => !(clip.restoredFillerIndices ?? []).includes(i))
        : undefined,
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
          ? { enabled: true, mode: settings.autoZoom.mode, intensity: settings.autoZoom.intensity, intervalSeconds: settings.autoZoom.intervalSeconds }
          : undefined,
        brandKit: settings.brandKit.enabled ? settings.brandKit : undefined,
        hookTitleOverlay: settings.hookTitleOverlay.enabled ? settings.hookTitleOverlay : undefined,
        rehookOverlay: settings.rehookOverlay.enabled ? settings.rehookOverlay : undefined,
        progressBarOverlay: settings.progressBarOverlay.enabled ? settings.progressBarOverlay : undefined,
        captionsEnabled: settings.captionsEnabled,
        captionStyle: settings.captionsEnabled ? settings.captionStyle : undefined,
        broll: settings.broll.enabled ? settings.broll : undefined,
        geminiApiKey: settings.geminiApiKey || undefined,
      })
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

  // ── Effective overlay settings (global settings + per-clip overrides applied) ──
  const effectiveCaptionsEnabled =
    clip.overrides?.enableCaptions !== undefined
      ? clip.overrides.enableCaptions
      : settings.captionsEnabled
  const effectiveHookTitleEnabled =
    clip.overrides?.enableHookTitle !== undefined
      ? clip.overrides.enableHookTitle
      : settings.hookTitleOverlay?.enabled ?? false
  const effectiveProgressBarEnabled =
    clip.overrides?.enableProgressBar !== undefined
      ? clip.overrides.enableProgressBar
      : settings.progressBarOverlay?.enabled ?? false
  const effectiveAutoZoomEnabled =
    clip.overrides?.enableAutoZoom !== undefined
      ? clip.overrides.enableAutoZoom
      : settings.autoZoom?.enabled ?? false
  const effectiveBrandKitEnabled =
    clip.overrides?.enableBrandKit !== undefined
      ? clip.overrides.enableBrandKit
      : settings.brandKit?.enabled ?? false

  // ── Preview cleanup — delete temp file when dialog closes ──────────────────
  useEffect(() => {
    if (!open && previewPath) {
      window.api.cleanupPreview(previewPath)
      setPreviewPath(null)
      setShowPreview(false)
      setPreviewError(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview with overlays handler ──────────────────────────────────────────
  const handlePreviewWithOverlays = useCallback(async () => {
    setPreviewLoading(true)
    setPreviewError(null)

    // Clean up any existing preview temp file
    if (previewPath) {
      await window.api.cleanupPreview(previewPath)
      setPreviewPath(null)
    }

    try {
      const result = await window.api.renderPreview({
        sourceVideoPath: sourcePath,
        startTime: localStart,
        endTime: localEnd,
        cropRegion: clip.cropRegion
          ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
          : undefined,
        wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
        hookTitleText: localHook || undefined,
        captionsEnabled: effectiveCaptionsEnabled,
        captionStyle: effectiveCaptionsEnabled ? settings.captionStyle : undefined,
        hookTitleOverlay: effectiveHookTitleEnabled ? settings.hookTitleOverlay : undefined,
        progressBarOverlay: effectiveProgressBarEnabled ? settings.progressBarOverlay : undefined,
        autoZoom: effectiveAutoZoomEnabled
          ? { enabled: true, intensity: settings.autoZoom?.intensity, intervalSeconds: settings.autoZoom?.intervalSeconds }
          : undefined,
        brandKit:
          effectiveBrandKitEnabled && settings.brandKit?.logoPath
            ? {
                logoPath: settings.brandKit.logoPath,
                logoPosition: settings.brandKit.logoPosition,
                logoScale: settings.brandKit.logoScale,
                logoOpacity: settings.brandKit.logoOpacity
              }
            : undefined,
        accentColor: clip.overrides?.accentColor
      })
      setPreviewPath(result.previewPath)
      setShowPreview(true)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview render failed')
    } finally {
      setPreviewLoading(false)
    }
  }, [
    sourcePath,
    localStart,
    localEnd,
    localHook,
    clip.cropRegion,
    clip.wordTimestamps,
    previewPath,
    effectiveCaptionsEnabled,
    effectiveHookTitleEnabled,
    effectiveProgressBarEnabled,
    effectiveAutoZoomEnabled,
    effectiveBrandKitEnabled,
    settings
  ])

  // Current time relative to clip start
  // In preview mode the video starts at 0, so currentTime IS the relative time
  const relativeTime = showPreview ? currentTime : Math.max(0, currentTime - localStart)

  const videoSrc = showPreview && previewPath ? `file://${previewPath}` : `file://${sourcePath}`

  // ---------------------------------------------------------------------------
  // Editor keyboard shortcuts — active only when dialog is open & not typing
  // ---------------------------------------------------------------------------
  const updateClipStatus = useStore((s) => s.updateClipStatus)

  useEffect(() => {
    if (!open) return

    function handleEditorKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in a text field
      if (isTypingInField()) return

      const mod = e.metaKey || e.ctrlKey

      // Space: play/pause preview
      if (e.key === ' ' && !mod) {
        e.preventDefault()
        handlePlayPause()
        return
      }

      // Left/Right arrows: seek ±1s in video
      if (e.key === 'ArrowLeft' && !mod) {
        e.preventDefault()
        const vid = videoRef.current
        if (vid) {
          const seekTo = Math.max(showPreview ? 0 : localStart, vid.currentTime - 1)
          vid.currentTime = seekTo
          setCurrentTime(seekTo)
        }
        return
      }
      if (e.key === 'ArrowRight' && !mod) {
        e.preventDefault()
        const vid = videoRef.current
        if (vid) {
          const stopPoint = showPreview ? clipDuration : localEnd
          const seekTo = Math.min(stopPoint, vid.currentTime + 1)
          vid.currentTime = seekTo
          setCurrentTime(seekTo)
        }
        return
      }

      // R: mark clip as ready for render (approve)
      if (e.key === 'r' && !mod) {
        e.preventDefault()
        updateClipStatus(sourceId, clip.id, 'approved')
        return
      }

      // N: next clip
      if (e.key === 'n' && !mod) {
        e.preventDefault()
        // Apply pending edits first, then navigate
        updateClipTrim(sourceId, clip.id, localStart, localEnd)
        if (localHook !== clip.hookText) {
          updateClipHookText(sourceId, clip.id, localHook)
        }
        window.dispatchEvent(new CustomEvent('editor:navigate-clip', { detail: { direction: 'next', clipId: clip.id } }))
        return
      }

      // P: previous clip
      if (e.key === 'p' && !mod) {
        e.preventDefault()
        updateClipTrim(sourceId, clip.id, localStart, localEnd)
        if (localHook !== clip.hookText) {
          updateClipHookText(sourceId, clip.id, localHook)
        }
        window.dispatchEvent(new CustomEvent('editor:navigate-clip', { detail: { direction: 'prev', clipId: clip.id } }))
        return
      }

    }

    window.addEventListener('keydown', handleEditorKeyDown)
    return () => window.removeEventListener('keydown', handleEditorKeyDown)
  }, [
    open,
    handlePlayPause,
    showPreview,
    localStart,
    localEnd,
    localHook,
    clipDuration,
    clip.id,
    clip.hookText,
    sourceId,
    updateClipStatus,
    updateClipTrim,
    updateClipHookText,
  ])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className={cn('w-full p-0 overflow-hidden gap-0 max-h-[90vh]', hasSegments && !useOldLayout ? 'max-w-5xl' : 'max-w-2xl overflow-y-auto')}>
        {/* Segment loading overlay */}
        {segmentLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Splitting clip into segments…</span>
          </div>
        )}
        {!segmentLoading && hasSegments && !useOldLayout ? (
          <>
            {/* ── Compact header for segment editor ── */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
              {/* Score badge */}
              <div className="flex flex-col items-center shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold tabular-nums cursor-default',
                          scoreBadgeClass(clip.score)
                        )}
                      >
                        {clip.score}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-56">
                      <p className="font-semibold">{getScoreDescription(clip.score).label} ({clip.score}/100)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* Hook text (editable) */}
              {editingHook ? (
                <input
                  autoFocus
                  className="flex-1 text-sm font-semibold bg-transparent border-b border-primary outline-none text-foreground min-w-0"
                  value={localHook}
                  onChange={(e) => setLocalHook(e.target.value)}
                  onBlur={() => setEditingHook(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingHook(false) }}
                />
              ) : (
                <DialogTitle
                  className="flex-1 text-sm leading-snug cursor-pointer hover:text-muted-foreground group flex items-center gap-1.5 truncate min-w-0"
                  onClick={() => setEditingHook(true)}
                >
                  <span className="truncate">{localHook || '—'}</span>
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                </DialogTitle>
              )}
              {/* Edit style pill */}
              {activeEditStyle && (
                <Badge variant="outline" className="text-[9px] px-2 py-0.5 shrink-0" style={{ borderColor: activeEditStyle.accentColor || undefined }}>
                  {activeEditStyle.name}
                </Badge>
              )}
              {/* Change style button */}
              <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-1 shrink-0" onClick={() => setShowStyleModal(true)}>
                <Palette className="w-3 h-3" />
                Style
              </Button>
            </div>

            {/* ── Main content area: video + sidebar ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: Video preview */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* View mode toggle (compact) */}
                <div className="flex items-center gap-1 px-3 py-1.5 bg-muted/30 border-b border-border">
                  <button
                    onClick={() => { setShowPreview(false); setViewMode('output') }}
                    className={cn(
                      'flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors',
                      !showPreview && viewMode === 'output'
                        ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Smartphone className="w-3 h-3" /> 9:16
                  </button>
                  <button
                    onClick={() => { setShowPreview(false); setViewMode('source') }}
                    className={cn(
                      'flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors',
                      !showPreview && viewMode === 'source'
                        ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Monitor className="w-3 h-3" /> Source
                  </button>
                  <button
                    onClick={() => { previewPath ? setShowPreview(true) : handlePreviewWithOverlays() }}
                    disabled={previewLoading}
                    className={cn(
                      'flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors',
                      showPreview
                        ? 'bg-violet-500/15 border-violet-500/50 text-violet-400 font-medium'
                        : 'border-border text-muted-foreground hover:text-foreground',
                      previewLoading && 'opacity-60 cursor-wait'
                    )}
                  >
                    {previewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Preview
                  </button>
                </div>

                {/* Video player */}
                {(() => {
                  const isOutputView = showPreview || viewMode === 'output'
                  const crop = !showPreview && clip.cropRegion && videoDims && videoDims.w > 0 && videoDims.h > 0
                    ? {
                        xPct: (clip.cropRegion.x / videoDims.w) * 100,
                        yPct: (clip.cropRegion.y / videoDims.h) * 100,
                        wPct: (clip.cropRegion.width / videoDims.w) * 100,
                        hPct: (clip.cropRegion.height / videoDims.h) * 100,
                      }
                    : null
                  return (
                    <div
                      className="relative flex-1 bg-black flex items-center justify-center cursor-pointer min-h-0"
                      onClick={handleVideoClick}
                    >
                      <div
                        className={cn(
                          'relative overflow-hidden',
                          isOutputView ? 'mx-auto rounded-sm border border-border/30' : 'w-full'
                        )}
                        style={isOutputView
                          ? { aspectRatio: '9/16', maxHeight: 'calc(100vh - 320px)' }
                          : { aspectRatio: '16/9' }
                        }
                      >
                        <video
                          ref={videoRef}
                          src={videoSrc}
                          className={cn(
                            showPreview ? 'w-full h-full object-contain'
                              : isOutputView
                                ? (crop ? 'absolute' : 'w-full h-full object-cover')
                                : 'w-full h-full object-contain'
                          )}
                          style={!showPreview && isOutputView && crop ? {
                            width: `${100 / (crop.wPct / 100)}%`,
                            height: `${100 / (crop.hPct / 100)}%`,
                            left: `${-(crop.xPct / crop.wPct) * 100}%`,
                            top: `${-(crop.yPct / crop.hPct) * 100}%`,
                          } : undefined}
                          onTimeUpdate={handleTimeUpdate}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onLoadedMetadata={() => {
                            if (videoRef.current) {
                              const seekTo = showPreview ? 0 : localStart
                              videoRef.current.currentTime = seekTo
                              setCurrentTime(seekTo)
                              if (!showPreview) {
                                setVideoDims({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight })
                              }
                            }
                          }}
                        />
                        {/* Play/Pause overlay */}
                        <div className={cn(
                          'absolute inset-0 flex items-center justify-center pointer-events-none',
                          'bg-black/0 transition-colors duration-200',
                          !isPlaying && 'bg-black/10'
                        )}>
                          <div className={cn(
                            isOutputView ? 'w-10 h-10' : 'w-12 h-12',
                            'rounded-full bg-black/40 backdrop-blur-sm border border-white/30 flex items-center justify-center',
                            'transition-opacity duration-200',
                            isPlaying ? 'opacity-0' : 'opacity-100'
                          )}>
                            {isPlaying ? (
                              <Pause className={cn(isOutputView ? 'w-4 h-4' : 'w-5 h-5', 'text-white')} />
                            ) : (
                              <Play className={cn(isOutputView ? 'w-4 h-4' : 'w-5 h-5', 'text-white fill-white ml-0.5')} />
                            )}
                          </div>
                        </div>
                        {/* Time overlay */}
                        <div className={cn(
                          'absolute font-mono text-white/80 bg-black/50 px-1.5 py-0.5 rounded tabular-nums',
                          isOutputView ? 'bottom-2 right-2 text-[10px]' : 'bottom-2 right-3 text-xs'
                        )}>
                          {formatTime(relativeTime)} / {formatTime(clipDuration)}
                        </div>
                        {/* Preview badge */}
                        {showPreview && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 text-[9px] text-violet-300 bg-violet-900/70 px-1.5 py-0.5 rounded pointer-events-none z-10 backdrop-blur-sm">
                            <Eye className="w-2.5 h-2.5" /> Preview
                          </div>
                        )}
                        {/* Preview loading overlay */}
                        {previewLoading && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
                            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                            <span className="text-[11px] text-white/80">Rendering preview…</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Playback controls (compact) */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50">
                  <Button size="sm" variant="outline" onClick={handlePlayPause} className="gap-1 text-[10px] h-6 px-2">
                    {isPlaying ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3 fill-current" /> Play</>}
                  </Button>
                  <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
                    {formatTime(relativeTime)}
                  </span>
                </div>
              </div>

              {/* Right: Style + Caption sidebar */}
              <div className="w-72 border-l border-border flex flex-col overflow-hidden shrink-0">
                {/* Tab bar */}
                <div className="flex border-b border-border shrink-0">
                  <button
                    onClick={() => setSidebarTab('style')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors',
                      sidebarTab === 'style'
                        ? 'text-foreground border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Palette className="w-3.5 h-3.5" /> Style
                  </button>
                  <button
                    onClick={() => setSidebarTab('captions')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors',
                      sidebarTab === 'captions'
                        ? 'text-foreground border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Type className="w-3.5 h-3.5" /> Captions
                  </button>
                </div>

                {/* Sidebar content */}
                <div className="flex-1 overflow-y-auto">
                  {sidebarTab === 'style' && selectedSegment && (
                    <SegmentStylePicker
                      segment={selectedSegment}
                      onStyleChange={handleSegmentStyleChange}
                      accentColor={activeEditStyle?.accentColor ?? undefined}
                    />
                  )}
                  {sidebarTab === 'captions' && (
                    <SegmentCaptionEditor
                      clipId={clip.id}
                      segments={clipSegments}
                      selectedIndex={selectedSegmentIndex}
                      onSelectSegment={handleSelectSegment}
                      onUpdateCaption={handleSegmentCaptionUpdate}
                      accentColor={activeEditStyle?.accentColor ?? undefined}
                    />
                  )}
                  {!selectedSegment && sidebarTab === 'style' && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 text-xs">
                      <Palette className="w-6 h-6 mb-2 opacity-50" />
                      Select a segment to edit its style
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Segment timeline (bottom) ── */}
            <div className="border-t border-border shrink-0">
              <SegmentTimeline
                clipId={clip.id}
                sourcePath={sourcePath}
                segments={clipSegments}
                selectedIndex={selectedSegmentIndex}
                onSelectSegment={handleSelectSegment}
                accentColor={activeEditStyle?.accentColor ?? undefined}
                currentTime={currentTime}
              />
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-card/50 shrink-0">
              {isThisClipRendering && (
                <div className="flex items-center gap-2 flex-1">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${singleRenderProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(singleRenderProgress)}%</span>
                </div>
              )}
              {isThisClipDone && singleRenderOutputPath && (
                <div className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-green-500 font-medium">Rendered!</span>
                  <button onClick={() => window.api.showItemInFolder(singleRenderOutputPath)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                    <FolderOpen className="w-3 h-3" /> Open
                  </button>
                </div>
              )}
              <div className="flex-1" />
              <Button size="sm" variant="default" onClick={handleRenderThisClip} disabled={isRendering || (isSingleRenderActive && !isThisClipRendering)} className="gap-1 text-[10px] h-7">
                {isThisClipRendering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                {isThisClipRendering ? 'Rendering…' : 'Render'}
              </Button>
              <Button size="sm" variant="outline" onClick={onClose} className="gap-1 text-[10px] h-7">
                <X className="w-3 h-3" /> Cancel
              </Button>
              <Button size="sm" variant="outline" onClick={handleApply} className="gap-1 text-[10px] h-7">
                <Check className="w-3 h-3" /> Apply
              </Button>
            </div>

            {/* ── Edit style modal overlay ── */}
            {showStyleModal && (
              <div className="absolute inset-0 bg-background/95 z-50 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold">Choose an Edit Style</h3>
                  <Button size="sm" variant="ghost" onClick={() => setShowStyleModal(false)} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <EditStyleSelector
                    styles={editStyles}
                    selectedStyleId={selectedEditStyleId}
                    onSelectStyle={handleEditStyleSelect}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
        <>
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

        {/* View mode toggle */}
        <div className="flex items-center justify-center gap-1 px-5 py-2 bg-muted/30 border-b border-border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowPreview(false); setViewMode('source') }}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-l-md border transition-colors',
                    !showPreview && viewMode === 'source'
                      ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Source 16:9
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Original source video (horizontal)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowPreview(false); setViewMode('output') }}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 border border-l-0 transition-colors',
                    !showPreview && viewMode === 'output'
                      ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Output 9:16
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {clip.cropRegion ? 'Vertical output preview with face-centred crop' : 'Vertical output preview (centre crop)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (previewPath) {
                      setShowPreview(true)
                    } else {
                      handlePreviewWithOverlays()
                    }
                  }}
                  disabled={previewLoading}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-r-md border border-l-0 transition-colors',
                    showPreview
                      ? 'bg-violet-500/15 border-violet-500/50 text-violet-400 font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    previewLoading && 'opacity-60 cursor-wait'
                  )}
                >
                  {previewLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {previewLoading ? 'Rendering…' : 'With Overlays'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-52">
                {previewLoading
                  ? 'Rendering preview at 540×960…'
                  : showPreview
                    ? 'Showing rendered preview with all overlays applied'
                    : previewPath
                      ? 'Switch to rendered overlay preview'
                      : 'Render a fast preview at 540×960 with all overlays applied (~3–5 seconds)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Video player — single <video> element, CSS-cropped per view mode */}
        {(() => {
          // In preview mode: always show as 9:16 without CSS crop (video is pre-rendered)
          // In source/output mode: apply CSS crop or centre-crop as normal
          const isOutputView = showPreview || viewMode === 'output'

          // Compute crop percentages from pixel-based cropRegion + video native dims
          // (only used in non-preview modes)
          const crop = !showPreview && clip.cropRegion && videoDims && videoDims.w > 0 && videoDims.h > 0
            ? {
                xPct: (clip.cropRegion.x / videoDims.w) * 100,
                yPct: (clip.cropRegion.y / videoDims.h) * 100,
                wPct: (clip.cropRegion.width / videoDims.w) * 100,
                hPct: (clip.cropRegion.height / videoDims.h) * 100,
              }
            : null

          return (
            <div
              className="relative w-full bg-black flex items-center justify-center cursor-pointer"
              style={{ minHeight: isOutputView ? 340 : undefined }}
              onClick={handleVideoClick}
            >
              {/* Outer wrapper controls the visible shape */}
              <div
                className={cn(
                  'relative overflow-hidden',
                  isOutputView ? 'mx-auto rounded-sm border border-border/30' : 'w-full'
                )}
                style={isOutputView
                  ? { aspectRatio: '9/16', height: 340 }
                  : { aspectRatio: '16/9' }
                }
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className={cn(
                    // Preview mode: fill the 9:16 box (video is already the right dimensions)
                    showPreview
                      ? 'w-full h-full object-contain'
                      : isOutputView
                        ? (crop
                            // Crop region: scale video up so the crop fills the container
                            ? 'absolute'
                            // No crop data: centre-crop via object-cover
                            : 'w-full h-full object-cover')
                        : 'w-full h-full object-contain'
                  )}
                  style={!showPreview && isOutputView && crop ? {
                    width: `${100 / (crop.wPct / 100)}%`,
                    height: `${100 / (crop.hPct / 100)}%`,
                    left: `${-(crop.xPct / crop.wPct) * 100}%`,
                    top: `${-(crop.yPct / crop.hPct) * 100}%`,
                  } : undefined}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      // In preview mode: video starts at 0 (pre-rendered clip)
                      // In source mode: seek to localStart
                      const seekTo = showPreview ? 0 : localStart
                      videoRef.current.currentTime = seekTo
                      setCurrentTime(seekTo)
                      if (!showPreview) {
                        setVideoDims({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight })
                      }
                    }
                  }}
                />

                {/* Source view: crop region overlay */}
                {!showPreview && !isOutputView && crop && (
                  <>
                    {/* Dim mask: top, bottom, left, right around the crop */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Top */}
                      <div className="absolute left-0 right-0 top-0 bg-black/50" style={{ height: `${crop.yPct}%` }} />
                      {/* Bottom */}
                      <div className="absolute left-0 right-0 bottom-0 bg-black/50" style={{ height: `${100 - crop.yPct - crop.hPct}%` }} />
                      {/* Left (between top and bottom) */}
                      <div className="absolute bg-black/50" style={{ top: `${crop.yPct}%`, height: `${crop.hPct}%`, left: 0, width: `${crop.xPct}%` }} />
                      {/* Right (between top and bottom) */}
                      <div className="absolute bg-black/50" style={{ top: `${crop.yPct}%`, height: `${crop.hPct}%`, right: 0, width: `${100 - crop.xPct - crop.wPct}%` }} />
                    </div>
                    {/* Crop rectangle outline */}
                    <div
                      className="absolute border-2 border-primary/70 rounded-sm pointer-events-none"
                      style={{ left: `${crop.xPct}%`, top: `${crop.yPct}%`, width: `${crop.wPct}%`, height: `${crop.hPct}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-primary bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap">
                        9:16 crop
                      </span>
                    </div>
                  </>
                )}

                {/* Output view: no crop data hint */}
                {!showPreview && isOutputView && !crop && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-amber-400 bg-black/60 px-2 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
                    Centre crop (no face detection data)
                  </div>
                )}

                {/* Preview mode badge */}
                {showPreview && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 text-[9px] text-violet-300 bg-violet-900/70 px-1.5 py-0.5 rounded pointer-events-none z-10 backdrop-blur-sm">
                    <Eye className="w-2.5 h-2.5" />
                    Preview · 540×960
                  </div>
                )}

                {/* Preview loading overlay (while rendering) */}
                {previewLoading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                    <span className="text-[11px] text-white/80">Rendering overlay preview…</span>
                    <span className="text-[10px] text-white/50">540×960 · ultrafast · ~3–5 sec</span>
                  </div>
                )}
              </div>

              {/* Play/Pause overlay button */}
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center pointer-events-none',
                  'bg-black/0 transition-colors duration-200',
                  !isPlaying && 'bg-black/10'
                )}
              >
                <div
                  className={cn(
                    isOutputView ? 'w-10 h-10' : 'w-12 h-12',
                    'rounded-full bg-black/40 backdrop-blur-sm border border-white/30 flex items-center justify-center',
                    'transition-opacity duration-200',
                    isPlaying ? 'opacity-0' : 'opacity-100'
                  )}
                >
                  {isPlaying ? (
                    <Pause className={cn(isOutputView ? 'w-4 h-4' : 'w-5 h-5', 'text-white')} />
                  ) : (
                    <Play className={cn(isOutputView ? 'w-4 h-4' : 'w-5 h-5', 'text-white fill-white ml-0.5')} />
                  )}
                </div>
              </div>

              {/* Time overlay */}
              <div className={cn(
                'absolute font-mono text-white/80 bg-black/50 px-1.5 py-0.5 rounded tabular-nums',
                isOutputView ? 'bottom-2 right-2 text-[10px]' : 'bottom-2 right-3 text-xs'
              )}>
                {formatTime(relativeTime)} / {formatTime(clipDuration)}
              </div>
            </div>
          )
        })()}

        {/* Preview: active overlay pills + error */}
        {(showPreview || previewError) && (
          <div className="border-b border-border/50">
            {/* Overlay pills — shown when preview is active */}
            {showPreview && (
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-violet-500/5">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide mr-0.5">
                  Applied:
                </span>
                {effectiveCaptionsEnabled && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    Captions
                  </Badge>
                )}
                {effectiveHookTitleEnabled && localHook && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    Hook Title
                  </Badge>
                )}
                {effectiveProgressBarEnabled && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    Progress Bar
                  </Badge>
                )}
                {effectiveAutoZoomEnabled && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    Auto-Zoom
                  </Badge>
                )}
                {effectiveBrandKitEnabled && settings.brandKit?.logoPath && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/40 text-violet-400 bg-violet-500/10">
                    Logo
                  </Badge>
                )}
                {!effectiveCaptionsEnabled && !effectiveHookTitleEnabled && !effectiveProgressBarEnabled && !effectiveAutoZoomEnabled && !effectiveBrandKitEnabled && (
                  <span className="text-[10px] text-muted-foreground/50 italic">no overlays enabled</span>
                )}
                <button
                  onClick={handlePreviewWithOverlays}
                  disabled={previewLoading}
                  className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-violet-400 transition-colors"
                  title="Re-render preview (picks up any overlay setting changes)"
                >
                  <RotateCw className="w-3 h-3" />
                  Re-render
                </button>
              </div>
            )}
            {/* Preview render error */}
            {previewError && (
              <div className="flex items-start gap-2 px-4 py-2 bg-destructive/10">
                <X className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <span className="text-[11px] text-destructive leading-relaxed">
                  Preview failed: {previewError}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Thumbnail capture toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCaptureThumbnail}
                  className={cn(
                    'gap-1.5 text-xs h-7',
                    thumbnailCaptured && 'border-green-500/50 text-green-500 bg-green-500/10'
                  )}
                >
                  {thumbnailCaptured ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                  {thumbnailCaptured ? 'Thumbnail set!' : 'Set as Thumbnail'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Capture the current frame as the clip thumbnail shown in the grid
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {clip.customThumbnail && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setClipCustomThumbnail(sourceId, clip.id, null)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Reset thumbnail
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Revert to the auto-generated thumbnail
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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

          {/* Keyboard shortcut hint — subtle, always visible */}
          <div className="flex items-center justify-center gap-3 py-1 text-[9px] text-muted-foreground/40 select-none">
            <span><kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono text-[8px]">Space</kbd> play</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono text-[8px]">←→</kbd> seek</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono text-[8px]">1-9</kbd> style</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono text-[8px]">N</kbd>/<kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono text-[8px]">P</kbd> clips</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono text-[8px]">?</kbd> all</span>
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

              {/* Filler summary bar */}
              {clip.fillerSegments && clip.fillerSegments.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1">
                  <span>
                    Fillers: {clip.fillerSegments.filter((s) => s.type === 'filler').length} words,{' '}
                    {clip.fillerSegments.filter((s) => s.type === 'silence').length} silences
                    {clip.fillerSegments.filter((s) => s.type === 'repeat').length > 0 &&
                      `, ${clip.fillerSegments.filter((s) => s.type === 'repeat').length} repeats`}
                    {clip.fillerTimeSaved != null && ` · Saving ${clip.fillerTimeSaved.toFixed(1)}s`}
                  </span>
                  <button
                    className="ml-auto text-xs text-amber-400 hover:text-amber-300"
                    onClick={() => {
                      const segs = clip.fillerSegments ?? []
                      const restored = clip.restoredFillerIndices ?? []
                      const allRestored = segs.length > 0 && restored.length === segs.length
                      // Toggle: restore all or clear all
                      for (let idx = 0; idx < segs.length; idx++) {
                        const isRestored = restored.includes(idx)
                        if (allRestored && isRestored) {
                          toggleFillerRestore(sourceId, clip.id, idx)
                        } else if (!allRestored && !isRestored) {
                          toggleFillerRestore(sourceId, clip.id, idx)
                        }
                      }
                    }}
                  >
                    {(clip.restoredFillerIndices ?? []).length === (clip.fillerSegments ?? []).length
                      ? 'Remove All'
                      : 'Restore All'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {clip.wordTimestamps.map((w, i) => {
                  const isActive = currentTime >= w.start && currentTime < w.end
                  const fillerIdx = getWordFillerIndex(w)
                  const isRestored =
                    fillerIdx >= 0 && (clip.restoredFillerIndices ?? []).includes(fillerIdx)
                  return (
                    <button
                      key={i}
                      onClick={() => handleWordClick(w.start)}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded border transition-colors',
                        isActive
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                        fillerIdx >= 0 &&
                          !isRestored &&
                          'line-through text-red-400/70 border-red-500/30',
                        fillerIdx >= 0 &&
                          isRestored &&
                          'underline decoration-dashed decoration-amber-400/50 text-amber-300/70 border-amber-500/30'
                      )}
                      title={
                        fillerIdx >= 0
                          ? `${formatTime(w.start)} – ${formatTime(w.end)} · ${isRestored ? 'Restored filler' : 'Filler (right-click to restore)'}`
                          : `${formatTime(w.start)} – ${formatTime(w.end)}`
                      }
                      onContextMenu={(e) => {
                        if (fillerIdx >= 0) {
                          e.preventDefault()
                          toggleFillerRestore(sourceId, clip.id, fillerIdx)
                        }
                      }}
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

              {/* Accent color picker — one color paints the whole edit */}
              <div className="mb-3">
                <Label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-2 block">
                  Accent Color
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={clip.overrides?.accentColor ?? settings.captionStyle.highlightColor}
                      onChange={(e) => setClipOverride(sourceId, clip.id, 'accentColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border bg-transparent p-0.5 transition-shadow hover:shadow-[0_0_12px_var(--accent-glow)] focus:shadow-[0_0_16px_var(--accent-glow)]"
                      style={{ '--accent-glow': clip.overrides?.accentColor ?? 'transparent' } as React.CSSProperties}
                      title="Pick an accent color — tints captions, overlays, and progress bar"
                    />
                    {clip.overrides?.accentColor && (
                      <span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-background"
                        style={{ backgroundColor: clip.overrides.accentColor }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-snug">
                      {clip.overrides?.accentColor ? (
                        <>
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5 border border-white/20"
                            style={{ backgroundColor: clip.overrides.accentColor }}
                          />
                          <span className="font-mono text-[10px]">{clip.overrides.accentColor.toUpperCase()}</span>
                          <span className="text-muted-foreground/50"> · captions · overlays · progress bar</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/50">
                          Using preset default · pick a color to tint everything
                        </span>
                      )}
                    </p>
                  </div>
                  {clip.overrides?.accentColor && (
                    <button
                      onClick={() => {
                        const current = clip.overrides ?? {}
                        const updated = { ...current }
                        delete updated.accentColor
                        if (Object.keys(updated).length === 0) {
                          clearClipOverrides(sourceId, clip.id)
                        } else {
                          clearClipOverrides(sourceId, clip.id)
                          for (const [k, v] of Object.entries(updated)) {
                            setClipOverride(sourceId, clip.id, k as keyof ClipRenderSettings, v as ClipRenderSettings[keyof ClipRenderSettings])
                          }
                        }
                      }}
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-2 shrink-0"
                      title="Reset to preset default"
                    >
                      reset
                    </button>
                  )}
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
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
