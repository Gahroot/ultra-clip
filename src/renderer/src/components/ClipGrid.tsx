import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCheck,
  ChevronDown,
  XCircle,
  SlidersHorizontal,
  LayoutGrid,
  GanttChart,
  Film,
  BookOpen,
  Loader2,
  Square,
  CheckCircle2,
  AlertCircle,
  Combine,
  Undo2,
  Redo2,
  FolderOpen,
  GripVertical,
  Clock,
  HardDrive,
  Cpu,
  Zap,
  Search,
  X,
  Wand2,
  FileText,
  ClipboardList,
  Check,
  Info,
  Bug,
  Download,
  RefreshCw,
  GitCompare,
  CheckSquare,
  ShieldAlert
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useStore } from '../store'
import { BUILT_IN_EDIT_STYLE_PRESETS } from '../store/helpers'
import { useShallow } from 'zustand/react/shallow'
import type { ClipCandidate, RenderProgress } from '../store'
import { ConfirmDialog } from './ConfirmDialog'
import { ClipComparison } from './ClipComparison'
import { ClipCard } from './ClipCard'
import { ClipCardSkeleton } from './ClipCardSkeleton'
import { ClipTimeline } from './ClipTimeline'
import { StitchedClipCard } from './StitchedClipCard'
import { ClipStats } from './ClipStats'
import { cn, estimateClipSize, formatFileSize, getScoreDescription } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useETA } from '../hooks/useETA'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format milliseconds as a human-readable duration: "45s", "4m 23s", "1h 2m" */
function formatRenderDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'approved' | 'rejected' | 'pending'
type SortMode = 'score' | 'time' | 'duration' | 'custom'

// ---------------------------------------------------------------------------
// SortableClipCard — wrapper for drag-to-reorder
// ---------------------------------------------------------------------------

function SortableClipCard({
  clip,
  sourceId,
  sourcePath,
  sourceDuration,
  index,
  isSelected,
  onClick,
  isDragActive,
  compareMode,
  onCompare,
  isCompareSelected
}: {
  clip: ClipCandidate
  sourceId: string
  sourcePath: string
  sourceDuration: number
  index: number
  isSelected: boolean
  onClick: (e?: React.MouseEvent) => void
  isDragActive: boolean
  compareMode?: boolean
  onCompare?: (clipId: string) => void
  isCompareSelected?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: clip.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-clip-index={index}
      className={cn(
        'rounded-lg group/sortable',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        compareMode && isCompareSelected && 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background'
      )}
      onClick={(e) => onClick(e)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded bg-background/80 border border-border/50 opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <ClipCard
        clip={clip}
        sourceId={sourceId}
        sourcePath={sourcePath}
        sourceDuration={sourceDuration}
        compareMode={compareMode}
        onCompare={onCompare}
        isCompareSelected={isCompareSelected}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClipGrid
// ---------------------------------------------------------------------------

interface BatchResult {
  completed: number
  failed: number
  total: number
}

export function ClipGrid() {
  const activeSourceId = useStore((s) => s.activeSourceId)
  const clips = useStore((s) => s.clips)
  const sources = useStore((s) => s.sources)
  const approveAll = useStore((s) => s.approveAll)
  const approveClipsAboveScore = useStore((s) => s.approveClipsAboveScore)
  const rejectAll = useStore((s) => s.rejectAll)
  const minScore = useStore((s) => s.settings.minScore)
  const settings = useStore((s) => s.settings)
  const templateLayout = useStore((s) => s.templateLayout)
  const isRendering = useStore((s) => s.isRendering)
  const setIsRendering = useStore((s) => s.setIsRendering)
  const renderProgress = useStore((s) => s.renderProgress)
  const setRenderProgress = useStore((s) => s.setRenderProgress)
  const addError = useStore((s) => s.addError)
  const storyArcs = useStore(useShallow((s) => activeSourceId ? (s.storyArcs[activeSourceId] ?? []) : []))
  const stitchedClips = useStore(useShallow((s) => activeSourceId ? (s.stitchedClips[activeSourceId] ?? []) : []))
  const updateStitchedClipStatus = useStore((s) => s.updateStitchedClipStatus)
  const selectedClipIndex = useStore((s) => s.selectedClipIndex)
  const setSelectedClipIndex = useStore((s) => s.setSelectedClipIndex)
  const canUndo = useStore((s) => s.canUndo)
  const canRedo = useStore((s) => s.canRedo)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

  const renderStartedAt = useStore((s) => s.renderStartedAt)
  const renderCompletedAt = useStore((s) => s.renderCompletedAt)
  const clipRenderTimes = useStore((s) => s.clipRenderTimes)

  const activeEncoder = useStore((s) => s.activeEncoder)

  const clipOrder = useStore(useShallow((s) => activeSourceId ? (s.clipOrder[activeSourceId] ?? []) : []))
  const customOrder = useStore((s) => s.customOrder)
  const reorderClips = useStore((s) => s.reorderClips)
  const setCustomOrder = useStore((s) => s.setCustomOrder)

  const clipViewMode = useStore((s) => s.clipViewMode)
  const setClipViewMode = useStore((s) => s.setClipViewMode)

  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)

  const autoModeResult = useStore((s) => s.autoModeResult)
  const setAutoModeResult = useStore((s) => s.setAutoModeResult)
  const pipeline = useStore((s) => s.pipeline)
  const setRenderError = useStore((s) => s.setRenderError)
  const transcriptions = useStore((s) => s.transcriptions)
  const activeStylePresetId = useStore((s) => s.activeStylePresetId)

  // Style presets for per-shot style resolution at render time
  const stylePresetsForRender = useMemo(() =>
    BUILT_IN_EDIT_STYLE_PRESETS.map((p) => ({
      id: p.id,
      captions: p.captions,
      zoom: p.zoom
    })),
    []
  )

  // Batch multi-select
  const selectedClipIds = useStore((s) => s.selectedClipIds)
  const selectAllVisible = useStore((s) => s.selectAllVisible)
  const clearSelection = useStore((s) => s.clearSelection)
  const toggleClipSelection = useStore((s) => s.toggleClipSelection)
  const batchUpdateClips = useStore((s) => s.batchUpdateClips)

  // Settings lock — detect changes between processing and render
  const settingsChanged = useStore((s) => s.settingsChanged)
  const revertToSnapshot = useStore((s) => s.revertToSnapshot)
  const getSettingsDiff = useStore((s) => s.getSettingsDiff)

  const [filter, setFilter] = useState<FilterTab>('all')
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [localMinScore, setLocalMinScore] = useState(minScore)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [manifestSaved, setManifestSaved] = useState(false)
  const [isExportingReport, setIsExportingReport] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [scoreNotification, setScoreNotification] = useState<string | null>(null)
  const scoreNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Description export state
  // Map from clipId → ClipDescription (generated on demand via batch AI call)
  type ClipDescriptionData = {
    shortDescription: string
    hashtag: string
    platforms: Array<{ platform: string; text: string; hashtags: string[] }>
  }
  const [clipDescriptions, setClipDescriptions] = useState<Map<string, ClipDescriptionData>>(new Map())
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false)
  const [isExportingDescriptions, setIsExportingDescriptions] = useState(false)
  const [exportNotification, setExportNotification] = useState<string | null>(null)
  const exportNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Confirmation dialog state
  const [showRejectAllConfirm, setShowRejectAllConfirm] = useState(false)
  const [showCancelRenderConfirm, setShowCancelRenderConfirm] = useState(false)
  const [showSettingsWarning, setShowSettingsWarning] = useState(false)

  // Batch toolbar state
  const [batchTrimOffset, setBatchTrimOffset] = useState<string>('0')
  const lastSelectedIndexRef = useRef<number | null>(null)

  // Compare mode state
  const [compareModeActive, setCompareModeActive] = useState(false)
  const [compareSelectedId, setCompareSelectedId] = useState<string | null>(null)
  const [compareDialogClips, setCompareDialogClips] = useState<[string, string] | null>(null)

  const handleCompareClick = useCallback((clipId: string) => {
    if (!compareModeActive) return
    if (compareSelectedId === clipId) {
      // Deselect
      setCompareSelectedId(null)
      return
    }
    if (!compareSelectedId) {
      // First selection
      setCompareSelectedId(clipId)
    } else {
      // Second selection — open dialog
      setCompareDialogClips([compareSelectedId, clipId])
      setCompareSelectedId(null)
    }
  }, [compareModeActive, compareSelectedId])

  const { copy: copyBatch, copied: batchCopied } = useCopyToClipboard()

  // DnD sensors — require 8px distance before starting drag to avoid conflicts with clicks
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Track listener cleanups
  const cleanupRef = useRef<Array<() => void>>([])

  // Keep localMinScore in sync when settings.minScore changes externally (e.g. SettingsPanel)
  useEffect(() => {
    setLocalMinScore(minScore)
  }, [minScore])

  const allClips = useMemo(() => {
    if (!activeSourceId) return []
    const sourceClips = clips[activeSourceId] ?? []
    return [...sourceClips].sort((a, b) => b.score - a.score)
  }, [clips, activeSourceId])

  const approvedClips = useMemo(
    () => allClips.filter((c) => c.status === 'approved'),
    [allClips]
  )

  const approvedVariants = useMemo(() => {
    return allClips.reduce((sum, c) => {
      if (!c.variants) return sum
      return sum + c.variants.filter(v => v.status === 'approved').length
    }, 0)
  }, [allClips])

  const approvedStitchedClips = useMemo(
    () => stitchedClips.filter((c) => c.status === 'approved'),
    [stitchedClips]
  )

  // Estimated total output size for all approved clips + variants + stitched
  const estimatedTotalSize = useMemo(() => {
    let total = 0
    for (const clip of approvedClips) {
      total += estimateClipSize(clip.duration)
      if (clip.variants) {
        for (const v of clip.variants) {
          if (v.status === 'approved') {
            total += estimateClipSize(v.endTime - v.startTime)
          }
        }
      }
    }
    for (const sc of approvedStitchedClips) {
      total += estimateClipSize(sc.totalDuration)
    }
    return total
  }, [approvedClips, approvedStitchedClips])

  const activeSource = sources.find((s) => s.id === activeSourceId) ?? null
  const sourcePath = activeSource?.path ?? ''
  const sourceDuration = activeSource?.duration ?? 0

  // Counts
  const approved = approvedClips.length
  const rejected = allClips.filter((c) => c.status === 'rejected').length
  const pending = allClips.filter((c) => c.status === 'pending').length

  // Average score across all clips
  const avgScore = useMemo(() => {
    if (allClips.length === 0) return null
    const total = allClips.reduce((sum, c) => sum + c.score, 0)
    return Math.round(total / allClips.length)
  }, [allClips])

  // Score threshold counts for dropdown menu
  const SCORE_THRESHOLDS = [90, 85, 80, 75, 70] as const
  const scoreThresholdCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const t of SCORE_THRESHOLDS) {
      counts[t] = allClips.filter((c) => c.score >= t).length
    }
    return counts
  }, [allClips])

  const handleApproveAboveScore = useCallback((threshold: number) => {
    if (!activeSourceId) return
    const result = approveClipsAboveScore(activeSourceId, threshold)
    if (scoreNotifyTimerRef.current) clearTimeout(scoreNotifyTimerRef.current)
    setScoreNotification(`Approved ${result.approved} clip${result.approved !== 1 ? 's' : ''}, rejected ${result.rejected}`)
    scoreNotifyTimerRef.current = setTimeout(() => setScoreNotification(null), 3000)
  }, [activeSourceId, approveClipsAboveScore])

  // Cleanup notification timer
  useEffect(() => {
    return () => {
      if (scoreNotifyTimerRef.current) clearTimeout(scoreNotifyTimerRef.current)
    }
  }, [])

  // Switch to custom sort mode when customOrder becomes true
  useEffect(() => {
    if (customOrder && sortMode !== 'custom') {
      setSortMode('custom')
    }
  }, [customOrder])

  // Debounced search — update store 200ms after typing stops
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 200)
  }, [setSearchQuery])

  const handleClearSearch = useCallback(() => {
    setLocalSearch('')
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setSearchQuery('')
  }, [setSearchQuery])

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  // Filter + sort + search
  const displayedClips = useMemo(() => {
    let filtered: ClipCandidate[] = allClips.filter((c) => c.score >= localMinScore)

    if (filter !== 'all') {
      filtered = filtered.filter((c) => c.status === filter)
    }

    // Search filter — match against transcript text, hookText, and reasoning
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((c) =>
        c.text.toLowerCase().includes(q) ||
        c.hookText.toLowerCase().includes(q) ||
        c.reasoning.toLowerCase().includes(q)
      )
    }

    if (sortMode === 'custom' && clipOrder.length > 0) {
      const orderMap = new Map(clipOrder.map((id, idx) => [id, idx]))
      filtered = [...filtered].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? Infinity
        const bi = orderMap.get(b.id) ?? Infinity
        return ai - bi
      })
    } else if (sortMode === 'score') {
      filtered = [...filtered].sort((a, b) => b.score - a.score)
    } else if (sortMode === 'time') {
      filtered = [...filtered].sort((a, b) => a.startTime - b.startTime)
    } else if (sortMode === 'duration') {
      filtered = [...filtered].sort((a, b) => b.duration - a.duration)
    }

    return filtered
  }, [allClips, filter, sortMode, localMinScore, clipOrder, searchQuery])

  // Ctrl+A to select all visible clips
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        // Only if focus is not in an input/textarea
        const tag = (document.activeElement as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        selectAllVisible(displayedClips.map((c) => c.id))
      }
      if (e.key === 'Escape' && selectedClipIds.size > 0) {
        clearSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [displayedClips, selectAllVisible, clearSelection, selectedClipIds])

  const handleApproveAll = () => {
    if (activeSourceId) approveAll(activeSourceId)
    if (activeSourceId) {
      for (const sc of stitchedClips) {
        updateStitchedClipStatus(activeSourceId, sc.id, 'approved')
      }
    }
  }

  const handleRejectAll = () => {
    if (activeSourceId) rejectAll(activeSourceId)
    if (activeSourceId) {
      for (const sc of stitchedClips) {
        updateStitchedClipStatus(activeSourceId, sc.id, 'rejected')
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render logic
  // ---------------------------------------------------------------------------

  const detachListeners = useCallback(() => {
    for (const cleanup of cleanupRef.current) cleanup()
    cleanupRef.current = []
  }, [])

  // Clean up listeners on unmount
  useEffect(() => detachListeners, [detachListeners])

  const handleStartRender = useCallback(async () => {
    if (!activeSourceId || approved === 0) return

    // Need an output directory
    let outputDir = settings.outputDirectory
    if (!outputDir) {
      outputDir = await window.api.openDirectory()
      if (!outputDir) return
    }

    // Build render jobs from approved clips
    const jobs = approvedClips.map((clip) => ({
      clipId: clip.id,
      sourceVideoPath: sourcePath,
      startTime: clip.startTime,
      endTime: clip.endTime,
      cropRegion: clip.cropRegion
        ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
        : undefined,
      wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
      hookTitleText: clip.hookText || undefined,
      // Pass per-clip render overrides so the main process can respect them
      clipOverrides: clip.overrides && Object.keys(clip.overrides).length > 0 ? clip.overrides : undefined,
      // Manifest metadata for export report generation
      manifestMeta: {
        score: clip.score,
        reasoning: clip.reasoning,
        transcriptText: clip.text,
        loopScore: clip.loopScore
      },
      // AI Edit Plan word emphasis — when present, bypasses heuristic analysis
      wordEmphasisOverride: clip.aiEditPlan?.wordEmphasis?.length
        ? clip.aiEditPlan.wordEmphasis.map((e) => ({
            text: e.text,
            start: e.start,
            end: e.end,
            emphasis: e.level as 'emphasis' | 'supersize'
          }))
        : undefined,
      // AI Edit Plan SFX suggestions — injected into sound design engine
      aiSfxSuggestions: clip.aiEditPlan?.sfxSuggestions?.length
        ? clip.aiEditPlan.sfxSuggestions.map((s) => ({ timestamp: s.timestamp, type: s.type }))
        : undefined,
      // Pre-computed word emphasis from AI Edit Plan — bypasses heuristic at render time
      wordEmphasis: clip.aiEditPlan?.wordEmphasis?.length
        ? clip.aiEditPlan.wordEmphasis.map((e) => ({
            text: e.text,
            start: e.start,
            end: e.end,
            emphasis: e.level as 'emphasis' | 'supersize'
          }))
        : undefined,
      // Active style preset ID — informational, recorded in manifest
      stylePresetId: clip.aiEditPlan?.stylePresetId ?? activeStylePresetId ?? undefined,
      // Per-shot style assignments — when present, the render pipeline applies
      // different style presets to different shot segments within this clip
      shotStyles: clip.shotStyles && clip.shotStyles.length > 0 ? clip.shotStyles : undefined,
      shots: clip.shots && clip.shots.length > 0 ? clip.shots : undefined,
    }))

    // Add variant render jobs
    for (const clip of approvedClips) {
      if (!clip.variants) continue
      for (const variant of clip.variants) {
        if (variant.status !== 'approved') continue
        jobs.push({
          clipId: `${clip.id}_${variant.id}`,
          sourceVideoPath: sourcePath,
          startTime: variant.startTime,
          endTime: variant.endTime,
          cropRegion: clip.cropRegion
            ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
            : undefined,
          wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
          hookTitleText: variant.hookText || clip.hookText || undefined,
          outputFileName: `clip_${clip.hookText?.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_') || clip.id.slice(0, 8)}_${variant.shortLabel}_${variant.label.replace(/\s+/g, '-')}`
        })
      }
    }

    // Add stitched clip render jobs — include ALL segments so the pipeline
    // routes them through renderStitchedClip() for proper concatenation.
    // Get full transcription words for stitched clips (they span multiple segments)
    const transcriptionWords = activeSourceId && transcriptions[activeSourceId]
      ? transcriptions[activeSourceId].words.map((w) => ({ text: w.text, start: w.start, end: w.end }))
      : undefined

    for (const sc of approvedStitchedClips) {
      const firstSeg = sc.segments[0]
      if (!firstSeg) continue
      jobs.push({
        clipId: sc.id,
        sourceVideoPath: sourcePath,
        // startTime/endTime set to first segment for compatibility (ignored by stitched path)
        startTime: firstSeg.startTime,
        endTime: firstSeg.endTime,
        cropRegion: sc.cropRegion
          ? { x: sc.cropRegion.x, y: sc.cropRegion.y, width: sc.cropRegion.width, height: sc.cropRegion.height }
          : undefined,
        hookTitleText: sc.hookText || undefined,
        wordTimestamps: transcriptionWords,
        outputFileName: `stitched_${sc.hookText?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || sc.id}`,
        stitchedSegments: sc.segments.map((seg) => ({
          startTime: seg.startTime,
          endTime: seg.endTime,
          overlayText: seg.overlayText ?? (seg.role === 'hook' ? sc.hookText : undefined),
          role: seg.role
        }))
      })
    }

    // Initialize per-clip render progress
    const initial: RenderProgress[] = jobs.map((job) => ({
      clipId: job.clipId,
      percent: 0,
      status: 'queued' as const
    }))
    setRenderProgress(initial)
    setIsRendering(true)
    setBatchResult(null)
    setManifestSaved(false)

    // Initialize render timing
    const batchStartTime = Date.now()
    useStore.setState({ renderStartedAt: batchStartTime, renderCompletedAt: null, clipRenderTimes: {} })

    // Attach listeners
    detachListeners()

    cleanupRef.current.push(
      window.api.onRenderClipStart((data) => {
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId ? { ...rp, status: 'rendering' as const, percent: 0 } : rp
          )
        )
        // Update active encoder from the clip start event
        useStore.setState({ activeEncoder: { encoder: data.encoder, isHardware: data.encoderIsHardware } })
        // Record clip start time
        const now = Date.now()
        useStore.setState((state) => ({
          clipRenderTimes: {
            ...state.clipRenderTimes,
            [data.clipId]: { started: now, completed: 0, duration: 0 }
          }
        }))
      })
    )

    cleanupRef.current.push(
      window.api.onRenderClipProgress((data) => {
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId ? { ...rp, percent: data.percent } : rp
          )
        )
      })
    )

    cleanupRef.current.push(
      window.api.onRenderClipDone((data) => {
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId
              ? { ...rp, status: 'done' as const, percent: 100, outputPath: data.outputPath }
              : rp
          )
        )
        // Record clip completion time
        const now = Date.now()
        useStore.setState((state) => {
          const existing = state.clipRenderTimes[data.clipId]
          const started = existing?.started ?? now
          return {
            clipRenderTimes: {
              ...state.clipRenderTimes,
              [data.clipId]: { started, completed: now, duration: now - started }
            }
          }
        })
      })
    )

    let lastErrorNotifyTime = 0

    cleanupRef.current.push(
      window.api.onRenderClipError((data) => {
        // Developer mode: clipId has __devmode suffix — log the command to error log
        if (data.clipId.endsWith('__devmode')) {
          if (data.ffmpegCommand) {
            addError({ source: 'render', message: data.error, details: data.ffmpegCommand })
          }
          return
        }
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId
              ? { ...rp, status: 'error' as const, error: data.error, ffmpegCommand: data.ffmpegCommand }
              : rp
          )
        )
        // Track error in store so retry can identify failed clips
        setRenderError(data.clipId, data.error)
        addError({
          source: 'render',
          message: `Clip ${data.clipId}: ${data.error}`,
          details: data.ffmpegCommand
        })

        // Debounced error notification — max 1 per 10 seconds
        const now = Date.now()
        if (useStore.getState().settings.enableNotifications && !document.hasFocus() && now - lastErrorNotifyTime > 10_000) {
          lastErrorNotifyTime = now
          window.api.sendNotification({
            title: 'Render Error',
            body: `Failed to render clip ${data.clipId.slice(0, 8)}`
          })
        }
      })
    )

    cleanupRef.current.push(
      window.api.onRenderBatchDone((data) => {
        useStore.setState({ renderCompletedAt: Date.now() })
        setIsRendering(false)
        setBatchResult({ completed: data.completed, failed: data.failed, total: data.total })
        // Manifest was auto-generated by the main process (sourceMeta was passed)
        if (activeSource) setManifestSaved(true)
        detachListeners()

        // Render complete notification
        if (useStore.getState().settings.enableNotifications && !document.hasFocus()) {
          window.api.sendNotification({
            title: 'Render Complete',
            body: `${data.completed} of ${data.total} clips rendered successfully`
          })
        }
      })
    )

    cleanupRef.current.push(
      window.api.onRenderCancelled((data) => {
        useStore.setState({ renderCompletedAt: Date.now() })
        setIsRendering(false)
        setBatchResult({ completed: data.completed, failed: data.failed, total: data.total })
        detachListeners()
      })
    )

    // Kick off the render
    try {
      await window.api.startBatchRender({
        jobs,
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
        fillerRemoval: settings.fillerRemoval.enabled ? settings.fillerRemoval : undefined,
        renderConcurrency: settings.renderConcurrency,
        // Source metadata enables auto-manifest generation at batch end
        sourceMeta: activeSource
          ? { name: activeSource.name, path: activeSource.path, duration: activeSource.duration }
          : undefined,
        developerMode: settings.developerMode,
        renderQuality: settings.renderQuality,
        outputAspectRatio: settings.outputAspectRatio,
        filenameTemplate: settings.filenameTemplate,
        templateLayout: {
          titleText: templateLayout.titleText,
          subtitles: templateLayout.subtitles,
          rehookText: templateLayout.rehookText
        }
      })
    } catch (err) {
      setIsRendering(false)
      detachListeners()
      addError({ source: 'render', message: `Failed to start render: ${err instanceof Error ? err.message : String(err)}` })
    }
  }, [
    activeSourceId, activeSource, approved, approvedClips, approvedVariants, approvedStitchedClips,
    stitchedClips, updateStitchedClipStatus, sourcePath, settings, templateLayout,
    setRenderProgress, setIsRendering, detachListeners, addError, setRenderError
  ])

  // ---------------------------------------------------------------------------
  // Retry failed clips
  // ---------------------------------------------------------------------------

  /**
   * Re-render only the clips that previously failed.
   * Rebuilds jobs from renderProgress entries with status 'error'.
   * Optionally pass a specific clipId to retry just one clip.
   */
  const handleRetryFailed = useCallback(async (singleClipId?: string) => {
    if (isRendering) return

    const failedEntries = singleClipId
      ? useStore.getState().renderProgress.filter((rp) => rp.clipId === singleClipId && rp.status === 'error')
      : useStore.getState().renderProgress.filter((rp) => rp.status === 'error')

    if (failedEntries.length === 0) return

    let outputDir = settings.outputDirectory
    if (!outputDir) {
      outputDir = await window.api.openDirectory()
      if (!outputDir) return
    }

    const failedClipIds = new Set(failedEntries.map((rp) => rp.clipId))

    // Rebuild jobs for failed clip IDs only, from approvedClips + stitchedClips
    const jobs: Parameters<typeof window.api.startBatchRender>[0]['jobs'] = []

    for (const clip of approvedClips) {
      if (failedClipIds.has(clip.id)) {
        jobs.push({
          clipId: clip.id,
          sourceVideoPath: sourcePath,
          startTime: clip.startTime,
          endTime: clip.endTime,
          cropRegion: clip.cropRegion
            ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
            : undefined,
          wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
          hookTitleText: clip.hookText || undefined,
          clipOverrides: clip.overrides && Object.keys(clip.overrides).length > 0 ? clip.overrides : undefined
        })
      }
      // Check variant job IDs
      if (clip.variants) {
        for (const variant of clip.variants) {
          const variantJobId = `${clip.id}_${variant.id}`
          if (failedClipIds.has(variantJobId)) {
            jobs.push({
              clipId: variantJobId,
              sourceVideoPath: sourcePath,
              startTime: variant.startTime,
              endTime: variant.endTime,
              cropRegion: clip.cropRegion
                ? { x: clip.cropRegion.x, y: clip.cropRegion.y, width: clip.cropRegion.width, height: clip.cropRegion.height }
                : undefined,
              wordTimestamps: clip.wordTimestamps?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
              hookTitleText: variant.hookText || clip.hookText || undefined,
              outputFileName: `clip_${clip.hookText?.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_') || clip.id.slice(0, 8)}_${variant.shortLabel}_${variant.label.replace(/\s+/g, '-')}`
            })
          }
        }
      }
    }

    // Check stitched clip IDs — include ALL segments for proper concatenation
    const retryTranscriptionWords = activeSourceId && transcriptions[activeSourceId]
      ? transcriptions[activeSourceId].words.map((w) => ({ text: w.text, start: w.start, end: w.end }))
      : undefined
    const approvedStitched = stitchedClips.filter((c) => c.status === 'approved')
    for (const sc of approvedStitched) {
      if (failedClipIds.has(sc.id)) {
        const firstSeg = sc.segments[0]
        if (!firstSeg) continue
        jobs.push({
          clipId: sc.id,
          sourceVideoPath: sourcePath,
          startTime: firstSeg.startTime,
          endTime: firstSeg.endTime,
          cropRegion: sc.cropRegion
            ? { x: sc.cropRegion.x, y: sc.cropRegion.y, width: sc.cropRegion.width, height: sc.cropRegion.height }
            : undefined,
          hookTitleText: sc.hookText || undefined,
          wordTimestamps: retryTranscriptionWords,
          outputFileName: `stitched_${sc.hookText?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || sc.id}`,
          stitchedSegments: sc.segments.map((seg) => ({
            startTime: seg.startTime,
            endTime: seg.endTime,
            overlayText: seg.overlayText ?? (seg.role === 'hook' ? sc.hookText : undefined),
            role: seg.role
          }))
        })
      }
    }

    if (jobs.length === 0) return

    // Clear the errors for the clips we're retrying, keep progress for others
    const retryingIds = new Set(jobs.map((j) => j.clipId))
    const updatedProgress = useStore.getState().renderProgress.map((rp) =>
      retryingIds.has(rp.clipId) ? { ...rp, status: 'queued' as const, error: undefined, percent: 0 } : rp
    )
    setRenderProgress(updatedProgress)
    setIsRendering(true)
    setBatchResult(null)

    // Clear retry'd clip errors from the store
    for (const id of retryingIds) {
      const updated = { ...useStore.getState().renderErrors }
      delete updated[id]
      useStore.setState({ renderErrors: updated })
    }

    useStore.setState({ renderStartedAt: Date.now(), renderCompletedAt: null })

    detachListeners()

    cleanupRef.current.push(
      window.api.onRenderClipStart((data) => {
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId ? { ...rp, status: 'rendering' as const, percent: 0 } : rp
          )
        )
        useStore.setState({ activeEncoder: { encoder: data.encoder, isHardware: data.encoderIsHardware } })
      })
    )

    cleanupRef.current.push(
      window.api.onRenderClipProgress((data) => {
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId ? { ...rp, percent: data.percent } : rp
          )
        )
      })
    )

    cleanupRef.current.push(
      window.api.onRenderClipDone((data) => {
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId
              ? { ...rp, status: 'done' as const, percent: 100, outputPath: data.outputPath }
              : rp
          )
        )
      })
    )

    cleanupRef.current.push(
      window.api.onRenderClipError((data) => {
        if (data.clipId.endsWith('__devmode')) return
        setRenderProgress(
          useStore.getState().renderProgress.map((rp) =>
            rp.clipId === data.clipId
              ? { ...rp, status: 'error' as const, error: data.error, ffmpegCommand: data.ffmpegCommand }
              : rp
          )
        )
        setRenderError(data.clipId, data.error)
        addError({
          source: 'render',
          message: `Clip ${data.clipId}: ${data.error}`,
          details: data.ffmpegCommand
        })
      })
    )

    cleanupRef.current.push(
      window.api.onRenderBatchDone((data) => {
        useStore.setState({ renderCompletedAt: Date.now() })
        setIsRendering(false)
        // Merge retry result with previous batch — recalculate from renderProgress
        const finalProgress = useStore.getState().renderProgress
        const totalDone = finalProgress.filter((rp) => rp.status === 'done').length
        const totalError = finalProgress.filter((rp) => rp.status === 'error').length
        setBatchResult({
          completed: totalDone,
          failed: totalError,
          total: finalProgress.length
        })
        if (activeSource) setManifestSaved(true)
        detachListeners()
      })
    )

    cleanupRef.current.push(
      window.api.onRenderCancelled((data) => {
        useStore.setState({ renderCompletedAt: Date.now() })
        setIsRendering(false)
        setBatchResult({ completed: data.completed, failed: data.failed, total: data.total })
        detachListeners()
      })
    )

    try {
      await window.api.startBatchRender({
        jobs,
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
        fillerRemoval: settings.fillerRemoval.enabled ? settings.fillerRemoval : undefined,
        renderConcurrency: settings.renderConcurrency,
        sourceMeta: activeSource
          ? { name: activeSource.name, path: activeSource.path, duration: activeSource.duration }
          : undefined,
        developerMode: settings.developerMode,
        renderQuality: settings.renderQuality,
        outputAspectRatio: settings.outputAspectRatio,
        filenameTemplate: settings.filenameTemplate,
        templateLayout: {
          titleText: templateLayout.titleText,
          subtitles: templateLayout.subtitles,
          rehookText: templateLayout.rehookText
        }
      })
    } catch (err) {
      setIsRendering(false)
      detachListeners()
      addError({ source: 'render', message: `Failed to start retry render: ${err instanceof Error ? err.message : String(err)}` })
    }
  }, [
    isRendering, activeSource, approvedClips, stitchedClips, sourcePath, settings, templateLayout,
    setRenderProgress, setIsRendering, detachListeners, addError, setRenderError
  ])

  // Auto-mode: when didRender is true, trigger handleStartRender after clips are set
  // We use a ref to prevent double-fire and defer until handleStartRender is stable
  const autoRenderFiredRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      autoModeResult &&
      autoModeResult.didRender &&
      autoModeResult.sourceId === activeSourceId &&
      autoRenderFiredRef.current !== autoModeResult.sourceId &&
      !isRendering
    ) {
      autoRenderFiredRef.current = autoModeResult.sourceId
      // Small delay to ensure clip status updates have propagated to React state
      const timer = setTimeout(() => {
        handleStartRender()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [autoModeResult, activeSourceId, isRendering, handleStartRender])

  const handleCancelRender = useCallback(async () => {
    try {
      await window.api.cancelRender()
    } catch {
      // Ignore cancel errors
    }
  }, [])

  const dismissResult = useCallback(() => setBatchResult(null), [])

  // Export report manually (re-generates manifest from current clip data)
  const handleExportReport = useCallback(async () => {
    const outputDir = settings.outputDirectory
    if (!outputDir || !activeSource) return
    setIsExportingReport(true)
    try {
      const clipMeta = approvedClips.map((clip) => ({
        clipId: clip.id,
        score: clip.score,
        hookText: clip.hookText ?? '',
        reasoning: clip.reasoning,
        transcriptText: clip.text,
        loopScore: clip.loopScore
      }))
      const jobs = approvedClips.map((clip) => ({
        clipId: clip.id,
        sourceVideoPath: sourcePath,
        startTime: clip.startTime,
        endTime: clip.endTime
      }))
      await window.api.generateManifest(
        outputDir,
        jobs,
        clipMeta,
        { name: activeSource.name, path: activeSource.path, duration: activeSource.duration }
      )
      setManifestSaved(true)
    } catch (err) {
      addError({ source: 'render', message: `Failed to export report: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsExportingReport(false)
    }
  }, [settings.outputDirectory, activeSource, approvedClips, sourcePath, addError])

  // Cleanup export notification timer
  useEffect(() => {
    return () => {
      if (exportNotifyTimerRef.current) clearTimeout(exportNotifyTimerRef.current)
    }
  }, [])

  // Build the export clip payload from clips + cached descriptions.
  // Clips with no cached description get a minimal stub (hookText only).
  const buildExportPayload = useCallback((clipsToExport: typeof approvedClips) => {
    return clipsToExport.map((clip, i) => {
      const desc = clipDescriptions.get(clip.id)
      const clipName = clip.hookText
        ? clip.hookText.slice(0, 60).replace(/[^a-zA-Z0-9 ]/g, '').trim() || `clip_${i + 1}`
        : `clip_${i + 1}`
      if (desc) {
        return {
          clipName,
          score: clip.score,
          duration: clip.duration,
          hookText: clip.hookText,
          shortDescription: desc.shortDescription,
          hashtag: desc.hashtag,
          platforms: desc.platforms
        }
      }
      // Fallback: no description yet — use hook text as the description stub
      const stub = clip.hookText || clip.text.slice(0, 100)
      return {
        clipName,
        score: clip.score,
        duration: clip.duration,
        hookText: clip.hookText,
        shortDescription: stub,
        hashtag: 'shorts',
        platforms: [
          { platform: 'youtube-shorts', text: `${stub}\n#shorts`, hashtags: ['shorts'] },
          { platform: 'instagram-reels', text: `${stub}\n#shorts #reels`, hashtags: ['shorts', 'reels'] },
          { platform: 'tiktok', text: `${stub} #shorts`, hashtags: ['shorts'] }
        ]
      }
    })
  }, [approvedClips, clipDescriptions])

  // Generate descriptions for all approved clips via batch AI call, then export
  const handleGenerateAndExport = useCallback(async (format: 'csv' | 'json' | 'txt') => {
    const apiKey = settings.geminiApiKey
    if (!apiKey) {
      addError({ source: 'scoring', message: 'Gemini API key required to generate descriptions. Add it in Settings.' })
      return
    }
    const clipsToExport = approvedClips.length > 0 ? approvedClips : allClips
    if (clipsToExport.length === 0) return

    // Prompt for output directory if not set
    let outputDir = settings.outputDirectory
    if (!outputDir) {
      outputDir = await window.api.openDirectory()
      if (!outputDir) return
    }

    // If we already have descriptions cached for all clips, skip generation
    const allDescribed = clipsToExport.every((c) => clipDescriptions.has(c.id))
    if (!allDescribed) {
      setIsGeneratingDescriptions(true)
      try {
        const inputs = clipsToExport.map((clip) => ({
          transcript: clip.text,
          hookText: clip.hookText || undefined,
          reasoning: clip.reasoning || undefined
        }))
        const results = await window.api.generateBatchDescriptions(apiKey, inputs)
        const newMap = new Map(clipDescriptions)
        clipsToExport.forEach((clip, i) => {
          const r = results[i]
          if (r) newMap.set(clip.id, r)
        })
        setClipDescriptions(newMap)
      } catch (err) {
        addError({ source: 'scoring', message: `Failed to generate descriptions: ${err instanceof Error ? err.message : String(err)}` })
        setIsGeneratingDescriptions(false)
        return
      }
      setIsGeneratingDescriptions(false)
    }

    // Now export
    setIsExportingDescriptions(true)
    try {
      // Re-read the latest descriptions (state update may be async, so rebuild payload with latest data)
      const freshDescriptions = clipDescriptions
      const payload = clipsToExport.map((clip, i) => {
        const desc = freshDescriptions.get(clip.id)
        const clipName = clip.hookText
          ? clip.hookText.slice(0, 60).replace(/[^a-zA-Z0-9 ]/g, '').trim() || `clip_${i + 1}`
          : `clip_${i + 1}`
        const stub = clip.hookText || clip.text.slice(0, 100)
        return {
          clipName,
          score: clip.score,
          duration: clip.duration,
          hookText: clip.hookText,
          shortDescription: desc?.shortDescription ?? stub,
          hashtag: desc?.hashtag ?? 'shorts',
          platforms: desc?.platforms ?? [
            { platform: 'youtube-shorts', text: `${stub}\n#shorts`, hashtags: ['shorts'] },
            { platform: 'instagram-reels', text: `${stub}\n#shorts #reels`, hashtags: ['shorts', 'reels'] },
            { platform: 'tiktok', text: `${stub} #shorts`, hashtags: ['shorts'] }
          ]
        }
      })
      const outputPath = await window.api.exportDescriptions(payload, outputDir, format)
      const filename = outputPath.split('/').pop() ?? `descriptions.${format}`
      if (exportNotifyTimerRef.current) clearTimeout(exportNotifyTimerRef.current)
      setExportNotification(`Exported ${filename} to output folder`)
      exportNotifyTimerRef.current = setTimeout(() => setExportNotification(null), 4000)
    } catch (err) {
      addError({ source: 'scoring', message: `Export failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsExportingDescriptions(false)
    }
  }, [settings.geminiApiKey, settings.outputDirectory, approvedClips, allClips, clipDescriptions, addError])

  // Export using already-cached descriptions (no generation step)
  const handleExportDescriptions = useCallback(async (format: 'csv' | 'json' | 'txt') => {
    const clipsToExport = approvedClips.length > 0 ? approvedClips : allClips
    if (clipsToExport.length === 0) return

    let outputDir = settings.outputDirectory
    if (!outputDir) {
      outputDir = await window.api.openDirectory()
      if (!outputDir) return
    }

    setIsExportingDescriptions(true)
    try {
      const payload = buildExportPayload(clipsToExport)
      const outputPath = await window.api.exportDescriptions(payload, outputDir, format)
      const filename = outputPath.split('/').pop() ?? `descriptions.${format}`
      if (exportNotifyTimerRef.current) clearTimeout(exportNotifyTimerRef.current)
      setExportNotification(`Exported ${filename} to output folder`)
      exportNotifyTimerRef.current = setTimeout(() => setExportNotification(null), 4000)
    } catch (err) {
      addError({ source: 'scoring', message: `Export failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsExportingDescriptions(false)
    }
  }, [settings.outputDirectory, approvedClips, allClips, buildExportPayload, addError])

  // ---------------------------------------------------------------------------
  // Render progress helpers
  // ---------------------------------------------------------------------------

  const overallPercent = useMemo(() => {
    if (renderProgress.length === 0) return 0
    const total = renderProgress.reduce((sum, rp) => sum + rp.percent, 0)
    return Math.round(total / renderProgress.length)
  }, [renderProgress])

  const currentClip = useMemo(
    () => renderProgress.find((rp) => rp.status === 'rendering'),
    [renderProgress]
  )

  const doneCount = useMemo(
    () => renderProgress.filter((rp) => rp.status === 'done').length,
    [renderProgress]
  )

  const errorCount = useMemo(
    () => renderProgress.filter((rp) => rp.status === 'error').length,
    [renderProgress]
  )

  // Render ETA tracking
  const { getETA: getRenderETA, reset: resetRenderETA } = useETA()

  // Reset render ETA when rendering starts/stops
  useEffect(() => {
    if (isRendering) {
      resetRenderETA()
    }
  }, [isRendering, resetRenderETA])

  // Compute render ETA from overall percent
  const renderETA = useMemo(() => {
    if (!isRendering || renderProgress.length === 0) return null
    return getRenderETA(overallPercent)
  }, [isRendering, overallPercent, getRenderETA, renderProgress.length])

  // Average time per clip from completed clips
  const avgClipTime = useMemo(() => {
    const completedTimes = Object.values(clipRenderTimes).filter((t) => t.duration > 0)
    if (completedTimes.length === 0) return null
    const total = completedTimes.reduce((sum, t) => sum + t.duration, 0)
    return total / completedTimes.length
  }, [clipRenderTimes])

  // Find clip name for progress display
  const clipNameFor = useCallback(
    (clipId: string) => {
      const clip = approvedClips.find((c) => c.id === clipId)
      if (!clip) return clipId.slice(0, 8)
      return clip.hookText ? clip.hookText.slice(0, 40) : `Clip ${clipId.slice(0, 8)}`
    },
    [approvedClips]
  )

  // Empty state — show skeleton grid briefly when pipeline just turned ready (clips still populating),
  // or show the "no clips" message when clips have genuinely not been found.
  if (allClips.length === 0) {
    // If stage is 'ready'/'rendering'/'done', the pipeline finished but produced no clips
    // Show skeletons only for the very brief window right after the pipeline transitions (percent < 100
    // or stage just changed). To keep it simple, always show 5 skeleton cards while stage is 'ready'
    // and there are no clips yet — this handles the brief flash between stage change and store update.
    if (pipeline.stage === 'ready' || pipeline.stage === 'rendering') {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <ClipCardSkeleton key={i} index={i} />
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <LayoutGrid className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No clips found</p>
        <p className="text-muted-foreground/60 text-sm">
          Try processing a different video or lowering the minimum score.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm space-y-3">
        {/* Top row: counts + actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
            {allClips.length} clips
          </Badge>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {approved} approved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {rejected} rejected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
              {pending} pending
            </span>
            {avgScore != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default border-l border-border/50 pl-2">
                    Avg <span className="font-semibold text-foreground tabular-nums">{avgScore}</span>
                    <Info className="w-3 h-3 text-muted-foreground/40" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-56">
                  <div className="space-y-1">
                    <p className="font-semibold">Avg Score: {avgScore}/100</p>
                    <p className="text-muted-foreground">{getScoreDescription(avgScore).label} — {getScoreDescription(avgScore).description}</p>
                    <p className="text-muted-foreground/70 text-[11px]">Average AI viral potential score across all {allClips.length} clip{allClips.length !== 1 ? 's' : ''}.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {approvedVariants > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                {approvedVariants} variants
              </span>
            )}
            {storyArcs.length > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                {storyArcs.length} arc{storyArcs.length !== 1 ? 's' : ''}
              </span>
            )}
            {stitchedClips.length > 0 && (
              <span className="flex items-center gap-1">
                <Combine className="w-3 h-3 text-cyan-400" />
                {approvedStitchedClips.length}/{stitchedClips.length} stitched
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Inline notification for score-based approve */}
            <AnimatePresence>
              {scoreNotification && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-xs text-green-400 font-medium whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3 h-3 inline-block mr-1" />
                  {scoreNotification}
                </motion.span>
              )}
            </AnimatePresence>
            <div className="flex items-center">
              <Button
                size="sm"
                variant="outline"
                onClick={handleApproveAll}
                disabled={isRendering}
                className="gap-1.5 text-xs border-green-600/40 text-green-500 hover:bg-green-600/10 rounded-r-none border-r-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Approve All
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRendering}
                    className="px-1.5 border-green-600/40 text-green-500 hover:bg-green-600/10 rounded-l-none"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleApproveAll} className="text-xs gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Approve all visible
                    <span className="ml-auto text-muted-foreground tabular-nums">({allClips.length})</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {SCORE_THRESHOLDS.map((threshold) => (
                    <DropdownMenuItem
                      key={threshold}
                      onClick={() => handleApproveAboveScore(threshold)}
                      className="text-xs gap-2"
                      disabled={scoreThresholdCounts[threshold] === 0}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Approve ≥ {threshold}
                      <span className="ml-auto text-muted-foreground tabular-nums">
                        ({scoreThresholdCounts[threshold]} clip{scoreThresholdCounts[threshold] !== 1 ? 's' : ''})
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRejectAllConfirm(true)}
              disabled={isRendering}
              className="gap-1.5 text-xs border-red-600/40 text-red-500 hover:bg-red-600/10"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject All
            </Button>

            {/* Batch copy dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    'gap-1.5 text-xs',
                    batchCopied ? 'text-green-500 border-green-500/40' : 'text-muted-foreground'
                  )}
                  title="Copy clip metadata to clipboard"
                  disabled={allClips.length === 0}
                >
                  {batchCopied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <ClipboardList className="w-3.5 h-3.5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    const hooks = approvedClips.length > 0
                      ? approvedClips
                      : allClips
                    const text = hooks
                      .filter((c) => c.hookText)
                      .map((c, i) => `${i + 1}. ${c.hookText}`)
                      .join('\n')
                    if (text) copyBatch(text)
                  }}
                  className="text-xs gap-2"
                  disabled={allClips.every((c) => !c.hookText)}
                >
                  <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                  Copy all hook texts
                  <span className="ml-auto text-muted-foreground tabular-nums text-[10px]">
                    ({(approvedClips.length > 0 ? approvedClips : allClips).filter((c) => c.hookText).length})
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const clips = approvedClips.length > 0 ? approvedClips : allClips
                    const text = clips
                      .filter((c) => c.hookText || c.text)
                      .map((c, i) => {
                        const parts: string[] = [`${i + 1}.`]
                        if (c.hookText) parts.push(c.hookText)
                        if (c.text) parts.push(c.text)
                        return parts.join(' — ')
                      })
                      .join('\n\n')
                    if (text) copyBatch(text)
                  }}
                  className="text-xs gap-2"
                  disabled={allClips.length === 0}
                >
                  <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                  Copy hooks + transcripts
                  <span className="ml-auto text-muted-foreground tabular-nums text-[10px]">
                    ({(approvedClips.length > 0 ? approvedClips : allClips).length})
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export descriptions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    'gap-1.5 text-xs',
                    exportNotification ? 'text-green-500 border-green-500/40' : 'text-muted-foreground'
                  )}
                  disabled={allClips.length === 0 || isGeneratingDescriptions || isExportingDescriptions}
                  title="Export AI descriptions for social media scheduling"
                >
                  {isGeneratingDescriptions || isExportingDescriptions ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : exportNotification ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Export Descriptions
                </div>
                <DropdownMenuItem
                  onClick={() => handleGenerateAndExport('csv')}
                  className="text-xs gap-2"
                  disabled={isGeneratingDescriptions || isExportingDescriptions}
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Export as CSV</span>
                    <span className="text-[10px] text-muted-foreground font-normal">For Later, Buffer, Hootsuite</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleGenerateAndExport('json')}
                  className="text-xs gap-2"
                  disabled={isGeneratingDescriptions || isExportingDescriptions}
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Export as JSON</span>
                    <span className="text-[10px] text-muted-foreground font-normal">For custom integrations</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleGenerateAndExport('txt')}
                  className="text-xs gap-2"
                  disabled={isGeneratingDescriptions || isExportingDescriptions}
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Export as Text</span>
                    <span className="text-[10px] text-muted-foreground font-normal">For manual posting</span>
                  </div>
                </DropdownMenuItem>
                {clipDescriptions.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Quick Export (cached)
                    </div>
                    <DropdownMenuItem
                      onClick={() => handleExportDescriptions('csv')}
                      className="text-xs gap-2"
                      disabled={isExportingDescriptions}
                    >
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      CSV (no AI call)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExportDescriptions('json')}
                      className="text-xs gap-2"
                      disabled={isExportingDescriptions}
                    >
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      JSON (no AI call)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExportDescriptions('txt')}
                      className="text-xs gap-2"
                      disabled={isExportingDescriptions}
                    >
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      Text (no AI call)
                    </DropdownMenuItem>
                  </>
                )}
                {exportNotification && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-[10px] text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {exportNotification}
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Render button */}
            {isRendering ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCancelRenderConfirm(true)}
                className="gap-1.5 text-xs"
              >
                <Square className="w-3.5 h-3.5" />
                Cancel Render
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  if (settingsChanged) {
                    setShowSettingsWarning(true)
                  } else {
                    handleStartRender()
                  }
                }}
                disabled={approved === 0}
                className={cn(
                  'gap-1.5 text-xs',
                  approved > 0
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : ''
                )}
                title={approved === 0 ? 'Approve at least one clip to render' : undefined}
              >
                <Film className="w-3.5 h-3.5" />
                Render {approved + approvedVariants + approvedStitchedClips.length} Clip{(approved + approvedVariants + approvedStitchedClips.length) !== 1 ? 's' : ''}
              </Button>
            )}
            {estimatedTotalSize > 0 && !isRendering && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Estimated total output size">
                <HardDrive className="w-3 h-3" />
                ~{formatFileSize(estimatedTotalSize)}
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: filter tabs + sort + score slider */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-xs px-2 h-5">All</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs px-2 h-5">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs px-2 h-5">Rejected</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-2 h-5">Pending</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={sortMode} onValueChange={(v) => {
            const mode = v as SortMode
            setSortMode(mode)
            if (mode !== 'custom') setCustomOrder(false)
          }}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score" className="text-xs">By Score</SelectItem>
              <SelectItem value="time" className="text-xs">By Time</SelectItem>
              <SelectItem value="duration" className="text-xs">By Duration</SelectItem>
              <SelectItem value="custom" className="text-xs" disabled={!customOrder && clipOrder.length === 0}>
                Custom
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Transcript search */}
          <div className="relative flex items-center">
            <Search className="absolute left-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search transcript…"
              className="h-7 w-44 text-xs pl-7 pr-7"
            />
            {localSearch && (
              <button
                onClick={handleClearSearch}
                className="absolute right-1.5 p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {displayedClips.length} clip{displayedClips.length !== 1 ? 's' : ''} match{displayedClips.length === 1 ? 'es' : ''} &lsquo;{searchQuery.trim()}&rsquo;
            </span>
          )}

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 ml-auto px-2 py-1 rounded-md bg-muted/50 border border-border/50">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="text-xs text-muted-foreground whitespace-nowrap cursor-default flex items-center gap-1">
                  Min score: <span className="font-semibold text-foreground tabular-nums">{localMinScore}</span>
                  <Info className="w-3 h-3 text-muted-foreground/40" />
                </label>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-52">
                <div className="space-y-1">
                  <p>Hides clips scoring below this threshold. Only clips scoring ≥ <span className="font-semibold tabular-nums">{localMinScore}</span> are shown.</p>
                  {localMinScore > 0 && (
                    <p className="text-muted-foreground">{allClips.filter((c) => c.score < localMinScore).length} clip{allClips.filter((c) => c.score < localMinScore).length !== 1 ? 's' : ''} hidden by this filter.</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[localMinScore]}
              onValueChange={([v]) => setLocalMinScore(v)}
              className={cn('w-28')}
            />
          </div>

          {/* Compare mode toggle */}
          <Button
            variant={compareModeActive ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'h-7 w-7',
              compareModeActive
                ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              setCompareModeActive((v) => !v)
              setCompareSelectedId(null)
            }}
            title={compareModeActive ? 'Exit compare mode' : 'Compare two clips side-by-side'}
            disabled={allClips.length < 2}
          >
            <GitCompare className="w-3.5 h-3.5" />
          </Button>

          {/* View toggle: Grid / Timeline */}
          <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-none',
                clipViewMode === 'grid' && 'bg-muted text-foreground'
              )}
              onClick={() => setClipViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-none',
                clipViewMode === 'timeline' && 'bg-muted text-foreground'
              )}
              onClick={() => setClipViewMode('timeline')}
              title="Timeline view"
            >
              <GanttChart className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Clip distribution stats */}
      <ClipStats clips={allClips} />

      {/* Compare mode banner */}
      <AnimatePresence>
        {compareModeActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="shrink-0 px-4 py-2.5 border-b border-violet-500/30 bg-violet-950/20 flex items-center gap-2"
          >
            <GitCompare className="w-4 h-4 text-violet-400 shrink-0" />
            <p className="text-xs text-violet-200 flex-1">
              <span className="font-semibold text-violet-400">Compare Mode</span>
              {compareSelectedId
                ? ' — Click a second clip to compare.'
                : ' — Click any two clips to open a side-by-side comparison.'}
            </p>
            <button
              onClick={() => { setCompareModeActive(false); setCompareSelectedId(null) }}
              className="p-0.5 rounded-sm hover:bg-violet-500/20 text-violet-500/70 hover:text-violet-400 transition-colors shrink-0"
              title="Exit compare mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-mode result banner */}
      <AnimatePresence>
        {autoModeResult && autoModeResult.sourceId === activeSourceId && !isRendering && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="shrink-0 px-4 py-2.5 border-b border-amber-500/30 bg-amber-500/10 flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-200 flex-1">
              <span className="font-semibold text-amber-400">Hands-Free Mode</span>
              {' '}approved{' '}
              <span className="font-semibold">{autoModeResult.approved} clip{autoModeResult.approved !== 1 ? 's' : ''}</span>
              {' '}(score ≥ {autoModeResult.threshold})
              {autoModeResult.didRender ? ' and started rendering.' : '.'}
            </p>
            <button
              onClick={() => setAutoModeResult(null)}
              className="p-0.5 rounded-sm hover:bg-amber-500/20 text-amber-500/70 hover:text-amber-400 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch action toolbar — slides up when clips are selected */}
      <AnimatePresence>
        {selectedClipIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="shrink-0 px-4 py-2.5 border-b border-primary/30 bg-primary/5 backdrop-blur-sm flex items-center gap-2 flex-wrap"
          >
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary whitespace-nowrap">
              {selectedClipIds.size} clip{selectedClipIds.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => selectAllVisible(displayedClips.map((c) => c.id))}
              className="text-xs text-primary/70 hover:text-primary underline-offset-2 hover:underline transition-colors"
            >
              Select All ({displayedClips.length})
            </button>
            <span className="text-muted-foreground/30">·</span>
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              Clear
            </button>

            <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />

            {/* Approve Selected */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7 border-green-600/40 text-green-500 hover:bg-green-600/10"
              onClick={() => {
                if (!activeSourceId) return
                batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { status: 'approved' })
                clearSelection()
              }}
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </Button>

            {/* Reject Selected */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7 border-red-600/40 text-red-500 hover:bg-red-600/10"
              onClick={() => {
                if (!activeSourceId) return
                batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { status: 'rejected' })
                clearSelection()
              }}
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>

            <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />

            {/* Extend All by N seconds */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Extend by</span>
              <Input
                value={batchTrimOffset}
                onChange={(e) => setBatchTrimOffset(e.target.value)}
                className="h-7 w-14 text-xs text-center px-1"
                placeholder="±s"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && activeSourceId) {
                    const offset = parseFloat(batchTrimOffset)
                    if (!isNaN(offset) && offset !== 0) {
                      batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { trimOffsetSeconds: offset })
                    }
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">s</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => {
                  if (!activeSourceId) return
                  const offset = parseFloat(batchTrimOffset)
                  if (!isNaN(offset) && offset !== 0) {
                    batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { trimOffsetSeconds: offset })
                  }
                }}
                title="Apply trim offset to selected clips (positive = extend, negative = trim)"
              >
                Apply
              </Button>
            </div>

            <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />

            {/* Apply to Selected dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-7"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Apply…
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Overrides for Selected
                </div>
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeSourceId) return
                    batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { overrides: { enableCaptions: true } })
                  }}
                  className="text-xs gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  Enable Captions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeSourceId) return
                    batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { overrides: { enableCaptions: false } })
                  }}
                  className="text-xs gap-2"
                >
                  <X className="w-3.5 h-3.5 text-red-500" />
                  Disable Captions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeSourceId) return
                    batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { overrides: { enableHookTitle: true } })
                  }}
                  className="text-xs gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  Enable Hook Title
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeSourceId) return
                    batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { overrides: { enableHookTitle: false } })
                  }}
                  className="text-xs gap-2"
                >
                  <X className="w-3.5 h-3.5 text-red-500" />
                  Disable Hook Title
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeSourceId) return
                    batchUpdateClips(activeSourceId, Array.from(selectedClipIds), { status: 'pending' })
                    clearSelection()
                  }}
                  className="text-xs gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Set as Pending
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Deselect All */}
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs h-7 ml-auto text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
            >
              <XCircle className="w-3.5 h-3.5" />
              Deselect All
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render progress banner */}
      {isRendering && (
        <div className="shrink-0 px-4 py-3 border-b border-violet-500/30 bg-violet-950/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              <span className="text-sm font-medium text-violet-300">
                Rendering clips… {doneCount + errorCount}/{renderProgress.length}
              </span>
              {activeEncoder && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors',
                    activeEncoder.isHardware
                      ? activeEncoder.encoder === 'h264_nvenc'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  )}
                  title={
                    activeEncoder.encoder === 'h264_nvenc'
                      ? 'Using NVIDIA hardware encoder'
                      : activeEncoder.encoder === 'h264_qsv'
                        ? 'Using Intel QuickSync hardware encoder'
                        : 'Using software encoder (slower)'
                  }
                >
                  {activeEncoder.isHardware ? (
                    <Zap className="w-2.5 h-2.5" />
                  ) : (
                    <Cpu className="w-2.5 h-2.5" />
                  )}
                  {activeEncoder.encoder === 'h264_nvenc'
                    ? 'NVENC'
                    : activeEncoder.encoder === 'h264_qsv'
                      ? 'QSV'
                      : 'CPU'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {renderETA && (
                <span className="flex items-center gap-1 text-xs text-violet-400/80">
                  <Clock className="w-3 h-3" />
                  {renderETA.remaining}
                </span>
              )}
              <span className="text-sm font-semibold text-violet-300 tabular-nums">
                {overallPercent}%
              </span>
            </div>
          </div>
          <Progress value={overallPercent} className="h-2 bg-violet-950/50" />
          {currentClip && (
            <div className="flex items-center gap-2 text-xs text-violet-400/80">
              <Film className="w-3 h-3" />
              <span className="truncate">{clipNameFor(currentClip.clipId)}</span>
              <span className="tabular-nums">{currentClip.percent}%</span>
              {avgClipTime && (
                <span className="text-violet-400/60">
                  · ~{formatRenderDuration(avgClipTime)} per clip
                </span>
              )}
            </div>
          )}
          {/* Per-clip status list */}
          {renderProgress.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {renderProgress.map((rp) => (
                <span
                  key={rp.clipId}
                  className={cn(
                    'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
                    rp.status === 'done' && 'bg-green-500/20 text-green-400',
                    rp.status === 'rendering' && 'bg-violet-500/20 text-violet-300',
                    rp.status === 'error' && 'bg-red-500/20 text-red-400',
                    rp.status === 'queued' && 'bg-muted/30 text-muted-foreground/50'
                  )}
                  title={rp.error || undefined}
                >
                  {rp.status === 'done' && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {rp.status === 'rendering' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {rp.status === 'error' && <AlertCircle className="w-2.5 h-2.5" />}
                  {clipNameFor(rp.clipId).slice(0, 20)}
                  {rp.status === 'error' && rp.ffmpegCommand && (
                    <button
                      title="Copy FFmpeg command"
                      className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(rp.ffmpegCommand!)
                      }}
                    >
                      <Bug className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {/* Retry failed during render — shown while still rendering other clips */}
          {errorCount > 0 && isRendering && (
            <p className="text-[10px] text-red-400/70">
              {errorCount} clip{errorCount !== 1 ? 's' : ''} failed — you can retry after the batch completes.
            </p>
          )}
        </div>
      )}

      {/* Batch result banner */}
      {!isRendering && batchResult && (() => {
        // Compute render timing stats
        const totalMs = (renderStartedAt && renderCompletedAt) ? renderCompletedAt - renderStartedAt : 0
        const completedDurations = Object.values(clipRenderTimes).filter((t) => t.duration > 0).map((t) => t.duration)
        const avgMs = completedDurations.length > 0 ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length : 0
        const fastestMs = completedDurations.length > 0 ? Math.min(...completedDurations) : 0
        const slowestMs = completedDurations.length > 0 ? Math.max(...completedDurations) : 0

        // Collect failed clips from renderProgress for the expandable list
        const failedRenderEntries = renderProgress.filter((rp) => rp.status === 'error')

        return (
          <div
            className={cn(
              'shrink-0 px-4 py-3 border-b space-y-1.5',
              batchResult.failed === 0
                ? 'border-green-500/30 bg-green-950/30'
                : 'border-yellow-500/30 bg-yellow-950/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {batchResult.failed === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-sm font-medium">
                  Render complete —{' '}
                  <span className="text-green-400">{batchResult.completed} succeeded</span>
                  {batchResult.failed > 0 && (
                    <>, <span className="text-red-400">{batchResult.failed} failed</span></>
                  )}
                  {' '}of {batchResult.total} clips
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Retry Failed button — shown when there are failures */}
                {batchResult.failed > 0 && failedRenderEntries.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryFailed()}
                    className="gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    title={`Retry ${batchResult.failed} failed clip${batchResult.failed !== 1 ? 's' : ''}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Failed ({batchResult.failed})
                  </Button>
                )}
                {settings.outputDirectory && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.api.openPath(settings.outputDirectory!)}
                    className="gap-1.5 text-xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open Output Folder
                  </Button>
                )}
                {settings.outputDirectory && activeSource && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportReport}
                    disabled={isExportingReport}
                    className="gap-1.5 text-xs"
                    title="Export clip manifest (JSON + CSV)"
                  >
                    {isExportingReport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Export Report
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={dismissResult} className="text-xs">
                  Dismiss
                </Button>
              </div>
            </div>
            {totalMs > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Total: <span className="text-foreground font-medium tabular-nums">{formatRenderDuration(totalMs)}</span></span>
                {avgMs > 0 && (
                  <span>Avg per clip: <span className="text-foreground font-medium tabular-nums">{formatRenderDuration(avgMs)}</span></span>
                )}
                {completedDurations.length >= 3 && (
                  <>
                    <span>Fastest: <span className="text-green-400 font-medium tabular-nums">{formatRenderDuration(fastestMs)}</span></span>
                    <span>Slowest: <span className="text-yellow-400 font-medium tabular-nums">{formatRenderDuration(slowestMs)}</span></span>
                  </>
                )}
                {manifestSaved && (
                  <span className="flex items-center gap-1 text-green-400/80">
                    <FileText className="w-3 h-3" />
                    Report saved to output folder
                  </span>
                )}
              </div>
            )}
            {/* Failed clip details */}
            {failedRenderEntries.length > 0 && (
              <div className="space-y-1 pt-0.5">
                {failedRenderEntries.map((rp) => (
                  <div key={rp.clipId} className="flex items-start gap-2 text-xs text-red-400/80 bg-red-500/10 rounded px-2 py-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{clipNameFor(rp.clipId)}</span>
                      {rp.error && (
                        <span className="text-red-400/60 ml-1 truncate block text-[10px]">
                          {rp.error.slice(0, 120)}{rp.error.length > 120 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleRetryFailed(rp.clipId)}
                          className="shrink-0 p-0.5 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-300 transition-colors"
                          title="Retry this clip"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Retry this clip</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Content: Grid or Timeline */}
      {clipViewMode === 'timeline' ? (
        <div className="flex-1 overflow-hidden">
          {displayedClips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <GanttChart className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No clips to show on the timeline</p>
              <p className="text-muted-foreground/60 text-sm">
                Adjust your filters or lower the minimum score threshold.
              </p>
            </div>
          ) : (
            <ClipTimeline
              clips={displayedClips}
              sourceId={activeSourceId ?? ''}
              sourcePath={sourcePath}
              sourceDuration={sourceDuration}
            />
          )}
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-4">
        {displayedClips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <SlidersHorizontal className="w-10 h-10 text-muted-foreground/30" />
            {allClips.filter((c) => c.score >= localMinScore).length === 0 ? (
              <>
                <p className="text-muted-foreground font-medium">
                  No clips match the current score threshold (≥ {localMinScore})
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  All {allClips.length} clips scored below {localMinScore}. Lower the minimum score to see more clips.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocalMinScore(0)}
                  className="mt-1"
                >
                  Reset minimum score to 0
                </Button>
              </>
            ) : searchQuery.trim() ? (
              <>
                <Search className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">
                  No clips contain &lsquo;{searchQuery.trim()}&rsquo;
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  Try a different search term or clear the search to see all clips.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearSearch}
                  className="mt-1"
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground font-medium">No clips match your filters</p>
                <p className="text-muted-foreground/60 text-sm">
                  Try a different status filter or lower the minimum score threshold.
                </p>
              </>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event: DragStartEvent) => {
              setActiveDragId(event.active.id as string)
            }}
            onDragEnd={(event: DragEndEvent) => {
              setActiveDragId(null)
              const { active, over } = event
              if (!over || active.id === over.id || !activeSourceId) return
              // If we don't have a custom order yet, initialize from current displayed order
              if (clipOrder.length === 0) {
                const currentIds = displayedClips.map((c) => c.id)
                useStore.setState((state) => ({
                  clipOrder: { ...state.clipOrder, [activeSourceId]: currentIds }
                }))
              }
              reorderClips(activeSourceId, active.id as string, over.id as string)
              setSortMode('custom')
            }}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext
              items={displayedClips.map((c) => c.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
                }}
              >
                {displayedClips.map((clip, i) => (
                  <SortableClipCard
                    key={clip.id}
                    clip={clip}
                    sourceId={activeSourceId ?? ''}
                    sourcePath={sourcePath}
                    sourceDuration={sourceDuration}
                    index={i}
                    isSelected={selectedClipIndex === i}
                    onClick={(e?: React.MouseEvent) => {
                      setSelectedClipIndex(i)
                      if (!e) return
                      if (e.shiftKey && lastSelectedIndexRef.current !== null) {
                        // Range select
                        const start = Math.min(lastSelectedIndexRef.current, i)
                        const end = Math.max(lastSelectedIndexRef.current, i)
                        const rangeIds = displayedClips.slice(start, end + 1).map((c) => c.id)
                        const next = new Set(selectedClipIds)
                        for (const id of rangeIds) next.add(id)
                        selectAllVisible(Array.from(next))
                      } else if (e.ctrlKey || e.metaKey) {
                        // Toggle individual
                        toggleClipSelection(clip.id)
                        lastSelectedIndexRef.current = i
                      }
                    }}
                    isDragActive={activeDragId !== null}
                    compareMode={compareModeActive}
                    onCompare={compareModeActive ? handleCompareClick : undefined}
                    isCompareSelected={compareSelectedId === clip.id}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (() => {
                const clip = displayedClips.find((c) => c.id === activeDragId)
                if (!clip) return null
                return (
                  <div
                    className="rounded-lg shadow-lg"
                    style={{
                      transform: 'rotate(2deg) scale(1.02)',
                      opacity: 0.9,
                      maxWidth: 320
                    }}
                  >
                    <ClipCard
                      clip={clip}
                      sourceId={activeSourceId ?? ''}
                      sourcePath={sourcePath}
                      sourceDuration={sourceDuration}
                    />
                  </div>
                )
              })() : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Stitched Clips Section */}
        {stitchedClips.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Combine className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-foreground">Stitched Clips</h3>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {stitchedClips.length}
              </Badge>
              <span className="text-xs text-muted-foreground">
                AI-composed clips from multiple segments
              </span>
            </div>
            <motion.div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
              }}
            >
              <AnimatePresence mode="popLayout">
                {stitchedClips.map((clip, i) => (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <StitchedClipCard
                      clip={clip}
                      sourceId={activeSourceId ?? ''}
                      sourceDuration={sourceDuration}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>
      )}

      {/* Confirmation dialogs */}
      <ConfirmDialog
        open={showRejectAllConfirm}
        title="Reject All Clips"
        description={`Reject all ${allClips.length} clip${allClips.length !== 1 ? 's' : ''}? You can undo this action.`}
        confirmText="Reject All"
        onConfirm={() => { setShowRejectAllConfirm(false); handleRejectAll() }}
        onCancel={() => setShowRejectAllConfirm(false)}
      />
      <ConfirmDialog
        open={showCancelRenderConfirm}
        title="Cancel Render"
        description={`Cancel the current render batch? ${renderProgress.filter((rp) => rp.status === 'queued').length} clip${renderProgress.filter((rp) => rp.status === 'queued').length !== 1 ? 's' : ''} are still queued.`}
        confirmText="Cancel Render"
        onConfirm={() => { setShowCancelRenderConfirm(false); handleCancelRender() }}
        onCancel={() => setShowCancelRenderConfirm(false)}
      />

      {/* Settings changed warning dialog */}
      <AlertDialog open={showSettingsWarning} onOpenChange={setShowSettingsWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Settings have changed since processing
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>The following settings were modified:</p>
                <ul className="list-disc list-inside text-sm text-amber-500/90">
                  {getSettingsDiff().map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  These changes will affect the rendered output.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                revertToSnapshot()
                setShowSettingsWarning(false)
                handleStartRender()
              }}
            >
              Revert &amp; Render
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                setShowSettingsWarning(false)
                handleStartRender()
              }}
            >
              Render with New Settings
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clip comparison dialog */}
      {compareDialogClips && (() => {
        const clipA = allClips.find((c) => c.id === compareDialogClips[0])
        const clipB = allClips.find((c) => c.id === compareDialogClips[1])
        if (!clipA || !clipB) return null
        return (
          <ClipComparison
            open={true}
            onClose={() => setCompareDialogClips(null)}
            clipA={clipA}
            clipB={clipB}
            sourceId={activeSourceId ?? ''}
            sourcePath={sourcePath}
          />
        )
      })()}
    </div>
  )
}
