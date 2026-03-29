import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, ChevronDown, ChevronUp, Clock, Check, X, Pencil, RefreshCw, BookOpen, Layers, SlidersHorizontal, Copy, Eye, FileText, RotateCcw, GitCompare, Loader2, FolderOpen, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn, estimateClipSize, formatFileSize, getScoreDescription } from '@/lib/utils'
import { useStore } from '../store'
import type { ClipCandidate, ClipRenderSettings } from '../store'
import { EditableTime, formatTime } from './EditableTime'
import { ClipPreview } from './ClipPreview'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

function scoreBadgeClass(score: number): string {
  if (score >= 90)
    return 'bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
  if (score >= 80)
    return 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
  if (score >= 70)
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
  return 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.3)]'
}

/** Human-readable label for each ClipRenderSettings key */
const OVERRIDE_LABELS: Record<keyof ClipRenderSettings, string> = {
  enableCaptions: 'Captions',
  enableHookTitle: 'Hook Title',
  enableProgressBar: 'Progress Bar',
  enableAutoZoom: 'Auto-Zoom',
  enableSoundDesign: 'Sound Design',
  enableBrandKit: 'Brand Kit',
  layout: 'Layout'
}

// ---------------------------------------------------------------------------
// ClipCard
// ---------------------------------------------------------------------------

interface ClipCardProps {
  clip: ClipCandidate
  sourceId: string
  sourcePath: string
  sourceDuration: number
  /** If set, shows a compare overlay/button on this card. */
  compareMode?: boolean
  /** Called when user clicks "Compare" on this card in compare mode. */
  onCompare?: (clipId: string) => void
  /** Whether this clip is already the first comparison selection. */
  isCompareSelected?: boolean
}

/** Highlight all occurrences of `query` in `text` (case-insensitive). */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-yellow-200/50 dark:bg-yellow-800/50 text-inherit rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export function ClipCard({ clip, sourceId, sourcePath, sourceDuration, compareMode, onCompare, isCompareSelected }: ClipCardProps) {
  const updateClipStatus = useStore((s) => s.updateClipStatus)
  const updateClipTrim = useStore((s) => s.updateClipTrim)
  const updateVariantStatus = useStore((s) => s.updateVariantStatus)
  const resetClipBoundaries = useStore((s) => s.resetClipBoundaries)
  const rescoreClip = useStore((s) => s.rescoreClip)
  const setSingleRenderState = useStore((s) => s.setSingleRenderState)
  const addError = useStore((s) => s.addError)
  const isRendering = useStore((s) => s.isRendering)
  const singleRenderClipId = useStore((s) => s.singleRenderClipId)
  const singleRenderProgress = useStore((s) => s.singleRenderProgress)
  const singleRenderStatus = useStore((s) => s.singleRenderStatus)
  const singleRenderOutputPath = useStore((s) => s.singleRenderOutputPath)
  const singleRenderError = useStore((s) => s.singleRenderError)
  const settings = useStore((s) => s.settings)
  const searchQuery = useStore((s) => s.searchQuery)
  const selectedClipIds = useStore((s) => s.selectedClipIds)
  const toggleClipSelection = useStore((s) => s.toggleClipSelection)
  const isMultiSelectActive = selectedClipIds.size > 0
  const isChecked = selectedClipIds.has(clip.id)

  const { copy: copyHook, copied: hookCopied } = useCopyToClipboard()
  const { copy: copyTranscript, copied: transcriptCopied } = useCopyToClipboard()

  const [showVideo, setShowVideo] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isRescoring, setIsRescoring] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Whether the current trim differs from the AI-selected boundaries
  const boundariesModified = useMemo(() => {
    const aiStart = clip.aiStartTime
    const aiEnd = clip.aiEndTime
    if (aiStart == null || aiEnd == null) return false
    return Math.abs(clip.startTime - aiStart) > 0.1 || Math.abs(clip.endTime - aiEnd) > 0.1
  }, [clip.startTime, clip.endTime, clip.aiStartTime, clip.aiEndTime])

  // Whether a single-clip render is active on this clip
  const isThisClipRendering = singleRenderClipId === clip.id && singleRenderStatus === 'rendering'
  // Whether any single-clip render is running (blocks new renders on other clips)
  const isSingleRenderActive = singleRenderClipId !== null && singleRenderStatus === 'rendering'

  // Auto-reset "done" overlay after 3s
  useEffect(() => {
    if (singleRenderClipId !== clip.id || singleRenderStatus !== 'done') return
    const timer = setTimeout(() => {
      setSingleRenderState({ clipId: null, status: 'idle', progress: 0, outputPath: null, error: null })
    }, 3000)
    return () => clearTimeout(timer)
  }, [singleRenderClipId, singleRenderStatus, clip.id, setSingleRenderState])

  // Render this clip only (separate from batch render)
  const handleRenderSingleClip = useCallback(async () => {
    if (isRendering || isSingleRenderActive) return
    let outputDir = settings.outputDirectory
    if (!outputDir) {
      outputDir = await window.api.openDirectory()
      if (!outputDir) return
    }
    const job = {
      clipId: clip.id,
      sourceVideoPath: sourcePath,
      startTime: clip.startTime,
      endTime: clip.endTime,
      cropRegion: clip.cropRegion
        ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
        : undefined,
      wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
      hookTitleText: clip.hookText || undefined,
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
      })
    } catch (err) {
      setSingleRenderState({ status: 'error', error: err instanceof Error ? err.message : String(err) })
      for (const cleanup of cleanups) cleanup()
      addError({ source: 'render', message: `Failed to render clip: ${err instanceof Error ? err.message : String(err)}` })
    }
  }, [isRendering, isSingleRenderActive, settings, clip, sourcePath, setSingleRenderState, addError])

  // Re-score this clip
  const handleRescore = useCallback(async () => {
    if (!settings.geminiApiKey || isRescoring) return
    const transcriptText = clip.wordTimestamps && clip.wordTimestamps.length > 0
      ? clip.wordTimestamps
          .filter((w) => w.start >= clip.startTime && w.end <= clip.endTime)
          .map((w) => w.text)
          .join(' ')
      : clip.text
    if (!transcriptText.trim()) return
    setIsRescoring(true)
    try {
      const result = await window.api.rescoreSingleClip(settings.geminiApiKey, transcriptText, clip.endTime - clip.startTime)
      rescoreClip(sourceId, clip.id, result.score, result.reasoning, result.hookText || undefined)
    } catch (err) {
      addError({ source: 'scoring', message: `Re-score failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsRescoring(false)
    }
  }, [settings.geminiApiKey, isRescoring, clip, sourceId, rescoreClip, addError])

  const handleToggleApprove = useCallback(() => {
    updateClipStatus(sourceId, clip.id, clip.status === 'approved' ? 'pending' : 'approved')
  }, [sourceId, clip.id, clip.status, updateClipStatus])

  const handleToggleReject = useCallback(() => {
    updateClipStatus(sourceId, clip.id, clip.status === 'rejected' ? 'pending' : 'rejected')
  }, [sourceId, clip.id, clip.status, updateClipStatus])

  const handlePlayClick = useCallback(() => {
    setShowVideo(true)
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = clip.startTime
        videoRef.current.play().catch(() => {/* ignore autoplay errors */})
      }
    }, 100)
  }, [clip.startTime])

  // Inline trim bounds: ±10s from current times, clamped to video
  const trimMin = Math.max(0, clip.startTime - 10)
  const trimMax = Math.min(sourceDuration > 0 ? sourceDuration : clip.endTime + 10, clip.endTime + 10)

  const handleInlineStartChange = useCallback(
    (v: number) => {
      updateClipTrim(sourceId, clip.id, v, clip.endTime)
    },
    [sourceId, clip.id, clip.endTime, updateClipTrim]
  )

  const handleInlineEndChange = useCallback(
    (v: number) => {
      updateClipTrim(sourceId, clip.id, clip.startTime, v)
    },
    [sourceId, clip.id, clip.startTime, updateClipTrim]
  )

  const isApproved = clip.status === 'approved'
  const isRejected = clip.status === 'rejected'

  // Video src with time fragment for card preview
  const videoSrc = `file://${sourcePath}#t=${clip.startTime},${clip.endTime}`

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: isRejected ? 0.45 : 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative flex flex-col rounded-lg border bg-card overflow-hidden group/card',
          'transition-colors duration-200',
          isApproved && 'border-l-4 border-l-green-500 border-t-green-500/30 border-r-green-500/30 border-b-green-500/30',
          isRejected && 'border border-red-500/40',
          isChecked && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
          !isApproved && !isRejected && !isChecked && 'border-border'
        )}
      >
        {/* Multi-select checkbox — top-right corner, visible on hover or when any clip is selected */}
        <div
          className={cn(
            'absolute top-2 right-2 z-20 transition-opacity duration-150',
            isMultiSelectActive || isChecked ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
          )}
          onClick={(e) => { e.stopPropagation(); toggleClipSelection(clip.id) }}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => toggleClipSelection(clip.id)}
            className="h-4 w-4 border-2 bg-background/80 shadow"
            aria-label="Select clip"
          />
        </div>

        {/* Score Badge */}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-center gap-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-10 h-10 rounded-full border-2',
                    'text-base font-bold tabular-nums cursor-default',
                    scoreBadgeClass(clip.score)
                  )}
                >
                  {clip.score}
                </span>
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
            <span
              className={cn(
                'text-[9px] font-semibold tabular-nums px-1 rounded leading-none',
                clip.score > clip.originalScore
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              )}
              title={`Original score: ${clip.originalScore}`}
            >
              {clip.score > clip.originalScore ? '+' : ''}{clip.score - clip.originalScore}
            </span>
          )}
        </div>

        {/* Override indicator badge — shifted down when checkbox is visible */}
        {clip.overrides && Object.keys(clip.overrides).length > 0 && (
          <div className={cn('absolute right-2 z-10', isMultiSelectActive || isChecked ? 'top-8' : 'top-2')}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-full px-1.5 py-0.5">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span className="text-[10px] font-semibold leading-none">
                      {Object.keys(clip.overrides).length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-48">
                  <p className="font-medium mb-1">Custom settings:</p>
                  <ul className="space-y-0.5">
                    {(Object.keys(clip.overrides) as (keyof ClipRenderSettings)[]).map((k) => {
                      const val = clip.overrides![k]
                      return (
                        <li key={k} className="flex items-center gap-1.5">
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            k === 'layout'
                              ? 'bg-blue-400'
                              : val === true ? 'bg-green-400' : 'bg-red-400'
                          )} />
                          <span>
                            {OVERRIDE_LABELS[k]}
                            {k !== 'layout' && (
                              <span className="text-muted-foreground">
                                {' '}{val === true ? '(on)' : '(off)'}
                              </span>
                            )}
                            {k === 'layout' && (
                              <span className="text-muted-foreground">
                                {' '}= {val as string}
                              </span>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Thumbnail / Video Preview */}
        <div className="relative w-full aspect-video bg-black/40 overflow-hidden">
          {(clip.customThumbnail || clip.thumbnail) && !showVideo && (
            <img
              src={clip.customThumbnail ?? clip.thumbnail}
              alt="clip thumbnail"
              className="w-full h-full object-cover"
            />
          )}

          {/* Custom thumbnail badge */}
          {clip.customThumbnail && !showVideo && (
            <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-0.5 bg-black/60 text-white/80 px-1.5 py-0.5 rounded text-[9px] backdrop-blur-sm pointer-events-none">
              <ImageIcon className="w-2.5 h-2.5" />
              Custom
            </div>
          )}

          {showVideo ? (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              className="w-full h-full object-contain bg-black"
              onEnded={() => {
                if (videoRef.current) videoRef.current.pause()
              }}
            />
          ) : (
            /* Play overlay */
            <button
              onClick={handlePlayClick}
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-200',
                !clip.customThumbnail && !clip.thumbnail && 'opacity-100'
              )}
              aria-label="Preview clip"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </button>
          )}

          {/* Single-clip render progress overlay */}
          {singleRenderClipId === clip.id && singleRenderStatus !== 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 gap-2">
              {singleRenderStatus === 'rendering' && (
                <>
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                  <div className="w-28 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${singleRenderProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/80 tabular-nums font-mono">
                    {Math.round(singleRenderProgress)}%
                  </span>
                </>
              )}
              {singleRenderStatus === 'done' && (
                <>
                  <div className="w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 font-semibold">Done!</span>
                  {singleRenderOutputPath && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.api.showItemInFolder(singleRenderOutputPath) }}
                      className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Open folder
                    </button>
                  )}
                </>
              )}
              {singleRenderStatus === 'error' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-1 cursor-default">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center">
                          <X className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-xs text-red-400 font-semibold">Error</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-52 text-destructive">
                      {singleRenderError || 'Render failed — check error log'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        {/* Inline trim times */}
        <div className="flex items-center justify-between px-3 pt-2 pb-0">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide leading-none">In</span>
            <EditableTime
              value={clip.startTime}
              onChange={handleInlineStartChange}
              min={trimMin}
              max={clip.endTime - 0.5}
            />
          </div>
          <div className="flex-1 mx-2 h-px bg-border/50" />
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide leading-none">Out</span>
            <EditableTime
              value={clip.endTime}
              onChange={handleInlineEndChange}
              min={clip.startTime + 0.5}
              max={trimMax}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 gap-2">
          {/* Hook text + Duration + Loop badge */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 group/hook">
              <div className="flex items-start gap-1">
                <p className="flex-1 font-semibold text-sm leading-snug text-foreground line-clamp-2">
                  {clip.hookText ? highlightText(clip.hookText, searchQuery.trim()) : '—'}
                </p>
                {clip.hookText && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyHook(clip.hookText) }}
                          className={cn(
                            'shrink-0 p-0.5 rounded opacity-0 group-hover/hook:opacity-100 transition-all duration-150',
                            hookCopied
                              ? 'text-green-500 opacity-100'
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
                      <TooltipContent side="top" className="text-xs">
                        {hookCopied ? 'Copied!' : 'Copy hook text'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {clip.loopOptimized && clip.loopScore != null && (
                <Badge
                  variant="outline"
                  className="text-xs flex items-center gap-1 border-purple-500/40 text-purple-400 bg-purple-500/10"
                  title={`Loop: ${clip.loopStrategy} (score ${clip.loopScore})`}
                >
                  <RefreshCw className="w-3 h-3" />
                  {clip.loopScore}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(clip.duration)}
              </Badge>
              <span className="text-[10px] text-muted-foreground" title="Estimated output file size">
                ~{formatFileSize(estimateClipSize(clip.duration))}
              </span>
            </div>
          </div>

          {/* Transcript preview */}
          {clip.text && (
            <div className="group/transcript">
              <div className="flex items-start gap-1">
                <p className={cn(
                  'flex-1 text-xs text-muted-foreground leading-relaxed',
                  searchQuery.trim() ? 'line-clamp-4' : 'line-clamp-2'
                )}>
                  {highlightText(clip.text, searchQuery.trim())}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyTranscript(clip.text) }}
                        className={cn(
                          'shrink-0 p-0.5 rounded opacity-0 group-hover/transcript:opacity-100 transition-all duration-150 mt-0.5',
                          transcriptCopied
                            ? 'text-green-500 opacity-100'
                            : 'text-muted-foreground/40 hover:text-muted-foreground'
                        )}
                        aria-label="Copy transcript"
                      >
                        {transcriptCopied ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {transcriptCopied ? 'Copied!' : 'Copy transcript'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* AI Reasoning (collapsible) */}
          {clip.reasoning && (
            <div>
              <button
                onClick={() => setShowReasoning((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                {showReasoning ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                AI reasoning
              </button>
              {showReasoning && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-muted-foreground/60 mt-1 leading-relaxed italic"
                >
                  {clip.reasoning}
                </motion.p>
              )}
            </div>
          )}

          {/* Story Arc Part Info */}
          {clip.partInfo && (
            <div className="rounded-md border border-indigo-500/30 bg-indigo-500/5 px-2.5 py-1.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-indigo-500/40 text-indigo-400 bg-indigo-500/10 px-1.5 py-0"
                >
                  Part {clip.partInfo.partNumber}/{clip.partInfo.totalParts}
                </Badge>
                <span className="text-[11px] text-indigo-300 font-medium truncate">{clip.partInfo.partTitle}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 italic">{clip.partInfo.endCardText}</p>
            </div>
          )}

          {/* Variant pills */}
          {clip.variants && clip.variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Variants</span>
                <div className="flex gap-1 ml-auto">
                  {clip.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant === v.id ? null : v.id)}
                      className={cn(
                        'w-6 h-6 rounded text-[10px] font-bold border transition-colors',
                        selectedVariant === v.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : v.status === 'approved'
                            ? 'bg-green-500/20 text-green-400 border-green-500/40'
                            : v.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {v.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {selectedVariant && (() => {
                const v = clip.variants!.find(x => x.id === selectedVariant)
                if (!v) return null
                return (
                  <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{v.label}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateVariantStatus(sourceId, clip.id, v.id, v.status === 'approved' ? 'pending' : 'approved')}
                          className={cn('w-5 h-5 rounded flex items-center justify-center',
                            v.status === 'approved' ? 'bg-green-600 text-white' : 'bg-muted hover:bg-green-600/20 text-muted-foreground')}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => updateVariantStatus(sourceId, clip.id, v.id, v.status === 'rejected' ? 'pending' : 'rejected')}
                          className={cn('w-5 h-5 rounded flex items-center justify-center',
                            v.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-muted hover:bg-red-600/20 text-muted-foreground')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {v.hookText && <p className="text-[11px] text-foreground/80 italic">&ldquo;{v.hookText}&rdquo;</p>}
                    <p className="text-[10px] text-muted-foreground">{v.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                      <span>{formatTime(v.startTime)} → {formatTime(v.endTime)}</span>
                      {v.overlays.length > 0 && <span>· {v.overlays.join(', ')}</span>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-border/50 mt-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground"
            title="Edit trim & preview (E)"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          {/* Single-clip render button — visible for approved clips when no batch render is running */}
          {isApproved && !isRendering && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRenderSingleClip}
                    disabled={isSingleRenderActive && !isThisClipRendering}
                    className={cn(
                      'gap-1.5 text-xs',
                      isThisClipRendering
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isThisClipRendering ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Render
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isThisClipRendering
                    ? 'Rendering…'
                    : isSingleRenderActive
                      ? 'Another clip is rendering'
                      : 'Render this clip immediately'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {compareMode && (
            <Button
              size="sm"
              variant={isCompareSelected ? 'default' : 'outline'}
              onClick={(e) => { e.stopPropagation(); onCompare?.(clip.id) }}
              className={cn(
                'gap-1.5 text-xs',
                isCompareSelected
                  ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600'
                  : 'border-violet-500/40 text-violet-400 hover:bg-violet-500/10'
              )}
              title="Select for comparison"
            >
              <GitCompare className="w-3.5 h-3.5" />
              {isCompareSelected ? 'Selected' : 'Compare'}
            </Button>
          )}
          <Button
            size="sm"
            variant={isApproved ? 'default' : 'outline'}
            onClick={handleToggleApprove}
            className={cn(
              'flex-1 gap-1.5 text-xs',
              isApproved
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                : 'border-green-600/40 text-green-500 hover:bg-green-600/10'
            )}
            title="Approve (A)"
          >
            <Check className="w-3.5 h-3.5" />
            {isApproved ? 'Approved' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant={isRejected ? 'default' : 'outline'}
            onClick={handleToggleReject}
            className={cn(
              'flex-1 gap-1.5 text-xs',
              isRejected
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                : 'border-red-600/40 text-red-500 hover:bg-red-600/10'
            )}
            title="Reject (R)"
          >
            <X className="w-3.5 h-3.5" />
            {isRejected ? 'Rejected' : 'Reject'}
          </Button>
        </div>
      </motion.div>
        </ContextMenuTrigger>

        {/* Context menu */}
        <ContextMenuContent className="w-52">
          {/* Preview */}
          <ContextMenuItem onSelect={() => setShowPreview(true)} className="gap-2">
            <Eye className="w-4 h-4" />
            Preview &amp; Edit
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Status actions */}
          <ContextMenuItem
            onSelect={() => updateClipStatus(sourceId, clip.id, 'approved')}
            className="gap-2"
            disabled={isApproved}
          >
            <Check className="w-4 h-4 text-green-500" />
            Approve
            <ContextMenuShortcut>A</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => updateClipStatus(sourceId, clip.id, 'rejected')}
            className="gap-2"
            disabled={isRejected}
          >
            <X className="w-4 h-4 text-red-500" />
            Reject
            <ContextMenuShortcut>R</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => updateClipStatus(sourceId, clip.id, 'pending')}
            className="gap-2"
            disabled={clip.status === 'pending'}
          >
            <RefreshCw className="w-4 h-4" />
            Set Pending
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Copy actions */}
          <ContextMenuItem
            onSelect={() => copyHook(clip.hookText)}
            className="gap-2"
            disabled={!clip.hookText}
          >
            <Copy className="w-4 h-4" />
            Copy Hook Text
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => copyTranscript(clip.text)}
            className="gap-2"
            disabled={!clip.text}
          >
            <FileText className="w-4 h-4" />
            Copy Transcript
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Advanced actions */}
          <ContextMenuItem
            onSelect={handleRescore}
            className="gap-2"
            disabled={!settings.geminiApiKey || isRescoring || isRendering}
          >
            <RefreshCw className={cn('w-4 h-4', isRescoring && 'animate-spin')} />
            {isRescoring ? 'Re-scoring…' : 'Re-score Clip'}
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => resetClipBoundaries(sourceId, clip.id)}
            className="gap-2"
            disabled={!boundariesModified}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Boundaries
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Single render */}
          <ContextMenuItem
            onSelect={handleRenderSingleClip}
            className="gap-2"
            disabled={isRendering || (isSingleRenderActive && !isThisClipRendering)}
          >
            {isThisClipRendering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isThisClipRendering ? 'Rendering…' : 'Render This Clip Only'}
          </ContextMenuItem>

          {onCompare && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => onCompare(clip.id)}
                className="gap-2"
              >
                <GitCompare className="w-4 h-4 text-violet-400" />
                {isCompareSelected ? 'Deselect from Comparison' : 'Select for Comparison'}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Full preview dialog */}
      {showPreview && (
        <ClipPreview
          clip={clip}
          sourceId={sourceId}
          sourcePath={sourcePath}
          sourceDuration={sourceDuration}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}

// Re-export formatTime for use in ClipGrid if needed
export { formatTime }
