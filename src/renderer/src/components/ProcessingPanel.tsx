import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Mic,
  Bot,
  UserRound,
  CheckCircle2,
  Loader2,
  XCircle,
  Play,
  RefreshCw,
  Key,
  ExternalLink,
  BookOpen,
  Layers,
  Combine,
  Clock,
  Zap,
  ListChecks,
  Pause,
  SkipForward,
  X,
  AlertCircle,
  Brain,
  Wand2,
  Film
} from 'lucide-react'
import { useStore } from '../store'
import type { PipelineStage, ClipCandidate } from '../store'

/** Stable empty array to avoid new references in selectors. */
const EMPTY_CLIPS: ClipCandidate[] = []
import { usePipeline } from '../hooks/usePipeline'
import { useQueueProcessor } from '../hooks/useQueueProcessor'
import { useETA } from '../hooks/useETA'
import { PreProcessingConfig } from './PreProcessingConfig'
import { ConfirmDialog } from './ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '../lib/utils'

// ── Step definitions ──────────────────────────────────────────────────────────

interface PipelineStepDef {
  id: PipelineStage
  label: string
  description: string
  icon: React.ReactNode
  youtubeOnly?: boolean
  /** Only show this step when Perfect Loop is enabled */
  loopOnly?: boolean
  /** Only show this step when Multi-Part Series is enabled */
  multiPartOnly?: boolean
  /** Only show this step when Variants is enabled */
  variantsOnly?: boolean
  /** Only show this step when Clip Stitching is enabled */
  stitchingOnly?: boolean
  /** Only show this step when AI Edit is enabled */
  aiEditOnly?: boolean
}

const STEPS: PipelineStepDef[] = [
  {
    id: 'downloading',
    label: 'Download',
    description: 'Fetch video from YouTube',
    icon: <Download className="w-4 h-4" />,
    youtubeOnly: true
  },
  {
    id: 'transcribing',
    label: 'Transcribe',
    description: 'Extract audio and run Parakeet ASR',
    icon: <Mic className="w-4 h-4" />
  },
  {
    id: 'scoring',
    label: 'Score',
    description: 'AI analysis for viral clip candidates',
    icon: <Bot className="w-4 h-4" />
  },
  {
    id: 'optimizing-loops',
    label: 'Loop Optimize',
    description: 'Adjusting clip boundaries for seamless looping',
    icon: <RefreshCw className="w-4 h-4" />,
    loopOnly: true
  },
  {
    id: 'generating-variants',
    label: 'Variants',
    description: 'Generating A/B/C packaging variations',
    icon: <Layers className="w-4 h-4" />,
    variantsOnly: true
  },
  {
    id: 'stitching',
    label: 'Clip Stitching',
    description: 'AI composing multi-segment clips',
    icon: <Combine className="w-4 h-4" />,
    stitchingOnly: true
  },
  {
    id: 'detecting-faces',
    label: 'Detect Faces',
    description: 'Find face crop regions for 9:16',
    icon: <UserRound className="w-4 h-4" />
  },
  {
    id: 'detecting-arcs',
    label: 'Story Arcs',
    description: 'Detecting multi-part narrative arcs',
    icon: <BookOpen className="w-4 h-4" />,
    multiPartOnly: true
  },
  {
    id: 'ai-editing',
    label: 'AI Edit',
    description: 'Orchestrating word emphasis, B-Roll & SFX for every clip',
    icon: <Wand2 className="w-4 h-4" />,
    aiEditOnly: true
  },
  {
    id: 'segmenting',
    label: 'Segments',
    description: 'Splitting clips into styled segments',
    icon: <Film className="w-4 h-4" />
  },
  {
    id: 'ready',
    label: 'Ready',
    description: 'Clips ready for review',
    icon: <CheckCircle2 className="w-4 h-4" />
  }
]

const STAGE_ORDER: PipelineStage[] = [
  'idle',
  'downloading',
  'transcribing',
  'scoring',
  'optimizing-loops',
  'generating-variants',
  'stitching',
  'detecting-faces',
  'detecting-arcs',
  'ai-editing',
  'segmenting',
  'ready',
  'rendering',
  'done'
]

type StepStatus = 'pending' | 'active' | 'done' | 'error'

function getStepStatus(
  stepId: PipelineStage,
  currentStage: PipelineStage,
  failedStage: PipelineStage | null,
  isYouTube: boolean
): StepStatus {
  // Skip download step for non-YouTube sources — show as done (invisible connector)
  if (stepId === 'downloading' && !isYouTube) return 'done'

  if (currentStage === 'error' && failedStage) {
    const failedIdx = STAGE_ORDER.indexOf(failedStage)
    const stepIdx = STAGE_ORDER.indexOf(stepId)
    if (stepIdx < failedIdx) return 'done'
    if (stepIdx === failedIdx) return 'error'
    return 'pending'
  }

  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const stepIdx = STAGE_ORDER.indexOf(stepId)

  if (currentStage === stepId) return 'active'
  if (stepIdx < currentIdx) return 'done'
  return 'pending'
}

// ── StepRow ───────────────────────────────────────────────────────────────────

interface StepRowProps {
  step: PipelineStepDef
  status: StepStatus
  progress: number
  message: string
  etaText?: string
  /** True when the transcribe step is in model-download sub-phase */
  isModelDownloading?: boolean
  /** 0–100 download progress within the model download phase */
  modelDownloadPercent?: number
}

function StepRow({ step, status, progress, message, etaText, isModelDownloading, modelDownloadPercent }: StepRowProps) {
  const isActive = status === 'active'

  return (
    <motion.div
      layout
      className={cn(
        'flex items-start gap-3 rounded-lg px-4 py-3 transition-colors duration-200',
        isActive && 'bg-primary/5 ring-1 ring-primary/20',
        status === 'error' && 'bg-destructive/5 ring-1 ring-destructive/20'
      )}
    >
      {/* Status icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200',
          status === 'pending' && 'bg-muted text-muted-foreground/40',
          status === 'active' && 'bg-primary/15 text-primary',
          status === 'done' && 'bg-green-500/15 text-green-500',
          status === 'error' && 'bg-destructive/15 text-destructive'
        )}
      >
        {status === 'active' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'done' ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : status === 'error' ? (
          <XCircle className="w-4 h-4" />
        ) : (
          step.icon
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'text-sm font-medium leading-none transition-colors duration-200',
              status === 'pending' && 'text-muted-foreground/50',
              status === 'active' && 'text-foreground',
              status === 'done' && 'text-muted-foreground',
              status === 'error' && 'text-destructive'
            )}
          >
            {step.label}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {isActive && etaText && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {etaText}
              </span>
            )}
            {isActive && progress > 0 && (
              <span className="text-xs font-mono text-primary tabular-nums">
                {progress}%
              </span>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isActive && message ? (
            <motion.p
              key={message}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-muted-foreground truncate"
            >
              {message}
            </motion.p>
          ) : (
            <p
              className={cn(
                'text-xs transition-colors duration-200',
                status === 'pending' && 'text-muted-foreground/30',
                status === 'done' && 'text-muted-foreground/40',
                status === 'error' && 'text-destructive/70'
              )}
            >
              {step.description}
            </p>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden space-y-1.5"
            >
              <Progress value={progress} className="h-1" />

              {/* Model download sub-indicator */}
              {isModelDownloading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-md bg-amber-500/5 border border-amber-500/20 px-2.5 py-2 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-medium text-amber-500">
                      Downloading AI Model (~1.2 GB) — first time only
                    </span>
                  </div>
                  <Progress
                    value={modelDownloadPercent ?? 0}
                    className="h-1 [&>div]:bg-amber-500"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    The model will be cached locally after first download.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── GeminiKeyPrompt ───────────────────────────────────────────────────────────

function GeminiKeyPrompt({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSave() {
    const key = value.trim()
    if (!key) return
    setValidating(true)
    setValidationError(null)
    try {
      const result = await window.api.validateGeminiKey(key)
      if (result.valid) {
        onSave(key)
      } else {
        setValidationError(result.error ?? 'Invalid key — check and try again')
      }
    } catch {
      // Network or unexpected error — still allow saving so the user isn't blocked
      onSave(key)
    } finally {
      setValidating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <Key className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-500">Gemini API Key Required</p>
          <p className="text-xs text-muted-foreground">
            AI scoring requires a Gemini API key.{' '}
            <button
              className="inline-flex items-center gap-0.5 text-primary hover:underline text-xs"
              onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
            >
              Get a free key
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="AIza…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setValidationError(null)
          }}
          className="text-xs h-8 font-mono flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) handleSave()
          }}
        />
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1.5"
          onClick={handleSave}
          disabled={!value.trim() || validating}
        >
          {validating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          {validating ? 'Checking…' : 'Save & Test'}
        </Button>
      </div>
      {validationError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="w-3 h-3 shrink-0" /> {validationError}
        </p>
      )}
    </motion.div>
  )
}

// ── StatsSkeleton ─────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-4 gap-2"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col items-center gap-1.5">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-2.5 w-full" />
        </div>
      ))}
    </motion.div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function Stats({ sourceId }: { sourceId: string }) {
  const clips = useStore((s) => s.clips[sourceId] ?? EMPTY_CLIPS)
  const minScore = useStore((s) => s.settings.minScore)

  if (clips.length === 0) return null

  const aboveThreshold = clips.filter((c) => c.score >= minScore).length
  const avgScore = Math.round(clips.reduce((sum, c) => sum + c.score, 0) / clips.length)
  const totalSec = clips.reduce((sum, c) => sum + c.duration, 0)
  const mins = Math.floor(totalSec / 60)
  const secs = Math.round(totalSec % 60)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-4 gap-2"
    >
      {[
        { label: 'Clips Found', value: clips.length, accent: false },
        { label: `Score ≥ ${minScore}`, value: aboveThreshold, accent: true },
        { label: 'Avg Score', value: avgScore, accent: false },
        { label: 'Duration', value: `${mins}m ${secs}s`, accent: false }
      ].map(({ label, value, accent }) => (
        <div
          key={label}
          className={cn(
            'rounded-lg border p-3 text-center',
            accent ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/30'
          )}
        >
          <div className={cn('text-xl font-bold tabular-nums', accent && 'text-green-500')}>
            {value}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
        </div>
      ))}
    </motion.div>
  )
}

// ── QueueProgressPanel ────────────────────────────────────────────────────────

function QueueProgressPanel({ onCancelQueue }: { onCancelQueue: () => void }) {
  const sources = useStore((s) => s.sources)
  const queueResults = useStore((s) => s.queueResults)
  const processingQueue = useStore((s) => s.processingQueue)
  const queuePaused = useStore((s) => s.queuePaused)
  const activeSourceId = useStore((s) => s.activeSourceId)
  const pauseQueue = useStore((s) => s.pauseQueue)
  const resumeQueue = useStore((s) => s.resumeQueue)
  const skipQueueItem = useStore((s) => s.skipQueueItem)

  // All source IDs that are part of this queue run (processing + pending + done + error)
  const allQueueSourceIds = sources
    .map((s) => s.id)
    .filter((id) => id in queueResults)

  const doneCount = allQueueSourceIds.filter(
    (id) => queueResults[id]?.status === 'done' || queueResults[id]?.status === 'error'
  ).length
  const total = allQueueSourceIds.length
  const currentIndex = doneCount + 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium">
            {queuePaused
              ? 'Queue Paused'
              : doneCount >= total
              ? 'Queue Complete'
              : `Processing source ${Math.min(currentIndex, total)} of ${total}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!queuePaused ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Pause queue"
              onClick={pauseQueue}
            >
              <Pause className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary"
              title="Resume queue"
              onClick={resumeQueue}
            >
              <Play className="w-3 h-3 fill-current" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Skip current source"
            onClick={skipQueueItem}
            disabled={processingQueue.length === 0 && doneCount >= total}
          >
            <SkipForward className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            title="Cancel queue"
            onClick={onCancelQueue}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Overall progress bar */}
      <Progress value={total > 0 ? (doneCount / total) * 100 : 0} className="h-1.5" />

      {/* Source list */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
        {allQueueSourceIds.map((id, idx) => {
          const source = sources.find((s) => s.id === id)
          const result = queueResults[id]
          const isActive = id === activeSourceId && result?.status === 'processing'

          return (
            <div key={id} className="flex items-center gap-2">
              {/* Status icon */}
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {result?.status === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : result?.status === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground/50 w-3.5 text-center">
                    {idx + 1}
                  </span>
                )}
              </div>

              {/* Name */}
              <span
                className={cn(
                  'text-xs truncate flex-1',
                  result?.status === 'done' && 'text-muted-foreground',
                  result?.status === 'error' && 'text-destructive',
                  isActive && 'text-foreground font-medium',
                  result?.status === 'pending' && 'text-muted-foreground/50'
                )}
              >
                {source?.name ?? id}
              </span>

              {/* Right-side label */}
              <span className="text-[10px] shrink-0 tabular-nums text-muted-foreground">
                {result?.status === 'done' && result.clipCount !== undefined
                  ? `${result.clipCount} clips`
                  : result?.status === 'error'
                  ? result.error === 'Skipped'
                    ? 'Skipped'
                    : 'Error'
                  : isActive
                  ? 'Processing…'
                  : ''}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── ProcessingPanel ───────────────────────────────────────────────────────────

export function ProcessingPanel() {
  const activeSource = useStore((s) => s.getActiveSource())
  const pipeline = useStore((s) => s.pipeline)
  const settings = useStore((s) => s.settings)
  const sources = useStore((s) => s.sources)
  const queueMode = useStore((s) => s.queueMode)
  const queueResults = useStore((s) => s.queueResults)
  const setGeminiApiKey = useStore((s) => s.setGeminiApiKey)
  const setPipeline = useStore((s) => s.setPipeline)
  const enqueueSources = useStore((s) => s.enqueueSources)
  const isOnline = useStore((s) => s.isOnline)
  const enablePerfectLoop = useStore((s) => s.processingConfig.enablePerfectLoop)
  const enableMultiPart = useStore((s) => s.processingConfig.enableMultiPart)
  const enableVariants = useStore((s) => s.processingConfig.enableVariants)
  const enableClipStitching = useStore((s) => s.processingConfig.enableClipStitching)
  const enableAiEdit = useStore((s) => s.processingConfig.enableAiEdit)
  const failedPipelineStage = useStore((s) => s.failedPipelineStage)
  const clearPipelineCache = useStore((s) => s.clearPipelineCache)

  const { processVideo, cancelProcessing } = usePipeline()
  const { cancelQueue } = useQueueProcessor()
  const { getETA, reset: resetETA } = useETA()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showCancelQueueConfirm, setShowCancelQueueConfirm] = useState(false)
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false)

  // Track which stage was active right before an error
  const lastActiveStageRef = useRef<PipelineStage>('idle')
  const prevStageRef = useRef<PipelineStage>('idle')

  useEffect(() => {
    // Reset ETA when pipeline stage changes
    if (pipeline.stage !== prevStageRef.current) {
      resetETA()
      prevStageRef.current = pipeline.stage
    }
    if (
      pipeline.stage !== 'idle' &&
      pipeline.stage !== 'error' &&
      pipeline.stage !== 'ready' &&
      pipeline.stage !== 'done' &&
      pipeline.stage !== 'rendering'
    ) {
      lastActiveStageRef.current = pipeline.stage
    }
  }, [pipeline.stage, resetETA])

  if (!activeSource) return null

  const isYouTube = activeSource.origin === 'youtube'
  const stage = pipeline.stage
  const isIdle = stage === 'idle'
  const isError = stage === 'error'
  const isReady = stage === 'ready' || stage === 'rendering' || stage === 'done'
  const isProcessing =
    stage === 'downloading' ||
    stage === 'transcribing' ||
    stage === 'scoring' ||
    stage === 'optimizing-loops' ||
    stage === 'generating-variants' ||
    stage === 'stitching' ||
    stage === 'detecting-faces' ||
    stage === 'detecting-arcs' ||
    stage === 'ai-editing' ||
    stage === 'segmenting'

  const needsGeminiKey = !settings.geminiApiKey
  const failedStage = isError ? lastActiveStageRef.current : null

  const visibleSteps = STEPS.filter((s) => {
    if (s.youtubeOnly && !isYouTube) return false
    if (s.loopOnly && !enablePerfectLoop) return false
    if (s.multiPartOnly && !enableMultiPart) return false
    if (s.variantsOnly && !enableVariants) return false
    if (s.stitchingOnly && !enableClipStitching) return false
    if (s.aiEditOnly && !enableAiEdit) return false
    return true
  })

  // Human-readable labels for pipeline stages
  const stageLabels: Partial<Record<PipelineStage, string>> = {
    downloading: 'Download',
    transcribing: 'Transcription',
    scoring: 'Scoring',
    'optimizing-loops': 'Loop Optimization',
    'generating-variants': 'Variant Generation',
    stitching: 'Clip Stitching',
    'detecting-faces': 'Face Detection',
    'detecting-arcs': 'Story Arcs',
    'ai-editing': 'AI Edit',
    segmenting: 'Segment Splitting'
  }

  const handleStart = async () => {
    console.log('[ProcessingPanel] handleStart called', { needsGeminiKey, isOnline, activeSourceId: activeSource.id })
    if (needsGeminiKey) return
    lastActiveStageRef.current = 'idle'
    await processVideo(activeSource)
    console.log('[ProcessingPanel] processVideo returned')
  }

  const handleRetryFromStage = async () => {
    if (!activeSource || !failedPipelineStage) return
    lastActiveStageRef.current = 'idle'
    await processVideo(activeSource, failedPipelineStage)
  }

  const handleReset = () => {
    clearPipelineCache()
    setPipeline({ stage: 'idle', message: '', percent: 0 })
  }

  // "Process All" — enqueue all sources that haven't been done yet
  const handleProcessAll = () => {
    if (needsGeminiKey) return
    // Determine which sources to enqueue: sources not yet in queueResults as 'done'
    const toProcess = sources
      .map((s) => s.id)
      .filter((id) => {
        const result = queueResults[id]
        return !result || (result.status !== 'done' && result.status !== 'processing')
      })
    if (toProcess.length === 0) return
    // Reset pipeline to idle first
    setPipeline({ stage: 'idle', message: '', percent: 0 })
    enqueueSources(toProcess)
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-lg mx-auto w-full max-h-full overflow-y-auto">
      {/* Source header — crossfades when the active source changes */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSource.id}
          className="text-center space-y-1"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <h2 className="text-sm font-semibold truncate px-8">{activeSource.name}</h2>
          <p className="text-xs text-muted-foreground">
            {isYouTube ? 'YouTube' : 'Local file'} ·{' '}
            {Math.floor(activeSource.duration / 60)}m {Math.round(activeSource.duration % 60)}s
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Queue progress panel */}
      <AnimatePresence>
        {queueMode && <QueueProgressPanel onCancelQueue={() => setShowCancelQueueConfirm(true)} />}
      </AnimatePresence>

      {/* Stepper */}
      <div className="space-y-0.5">
        {visibleSteps.map((step, i) => {
          const status = getStepStatus(step.id, stage, failedStage, isYouTube)
          const isActiveStep = status === 'active'
          const eta = isActiveStep ? getETA(pipeline.percent) : null
          // Detect model download: transcribing step, percent in 20–50 range, message includes "Downloading"
          const isModelDownloading =
            isActiveStep &&
            step.id === 'transcribing' &&
            pipeline.percent >= 20 &&
            pipeline.percent <= 50 &&
            /download/i.test(pipeline.message)
          // Reverse-calculate download progress from the 20–50 band
          const modelDownloadPercent = isModelDownloading
            ? Math.round(((pipeline.percent - 20) / 30) * 100)
            : 0
          return (
            <div key={step.id}>
              <StepRow
                step={step}
                status={status}
                progress={isActiveStep ? pipeline.percent : 0}
                message={isActiveStep ? pipeline.message : ''}
                etaText={eta?.remaining}
                isModelDownloading={isModelDownloading}
                modelDownloadPercent={modelDownloadPercent}
              />
              {i < visibleSteps.length - 1 && (
                <div className="h-3 flex items-center" style={{ paddingLeft: '27px' }}>
                  <div className="w-px h-full bg-border" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
          >
            <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm text-destructive leading-snug">{pipeline.message}</p>
              <div className="flex gap-2 flex-wrap">
                {failedPipelineStage && (
                  <Button
                    size="sm"
                    onClick={handleRetryFromStage}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Retry from {stageLabels[failedPipelineStage] ?? failedPipelineStage}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 h-7 text-xs">
                  <RefreshCw className="w-3 h-3" />
                  Start Over
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-processing config (visible when idle) */}
      {isIdle && !queueMode && <PreProcessingConfig />}

      {/* Gemini key prompt */}
      <AnimatePresence>
        {needsGeminiKey && (isIdle || isError) && (
          <GeminiKeyPrompt onSave={setGeminiApiKey} />
        )}
      </AnimatePresence>

      {/* Stats skeleton — shown while detecting faces/arcs (clips exist but pipeline still running) */}
      <AnimatePresence>
        {(stage === 'detecting-faces' || stage === 'detecting-arcs') && !queueMode && (
          <StatsSkeleton />
        )}
      </AnimatePresence>

      {/* Stats */}
      <AnimatePresence>
        {isReady && !queueMode && <Stats sourceId={activeSource.id} />}
      </AnimatePresence>

      {/* Primary action */}
      <div className="flex justify-center gap-3 flex-wrap">
        {isIdle && !queueMode && (
          <>
            <Button
              size="lg"
              onClick={handleStart}
              disabled={needsGeminiKey}
              className="gap-2 px-10"
            >
              <Play className="w-4 h-4 fill-current" />
              Process Video
            </Button>
            {sources.length > 1 && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleProcessAll}
                disabled={needsGeminiKey}
                className="gap-2 px-6"
                title={`Process all ${sources.length} sources sequentially`}
              >
                <ListChecks className="w-4 h-4" />
                Process All ({sources.length})
              </Button>
            )}
          </>
        )}

        {isProcessing && !queueMode && (
          <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(true)}>
            Cancel
          </Button>
        )}

        {isReady && !queueMode && (
          <Button variant="outline" size="sm" onClick={() => setShowReprocessConfirm(true)} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Reprocess
          </Button>
        )}
      </div>

      {/* Confirmation dialogs */}
      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Processing"
        description="Cancel processing? You'll need to start over."
        confirmText="Cancel"
        onConfirm={() => { setShowCancelConfirm(false); cancelProcessing() }}
        onCancel={() => setShowCancelConfirm(false)}
      />
      <ConfirmDialog
        open={showCancelQueueConfirm}
        title="Cancel Queue"
        description="Cancel the processing queue? All remaining sources will be skipped."
        confirmText="Cancel Queue"
        onConfirm={() => { setShowCancelQueueConfirm(false); cancelQueue() }}
        onCancel={() => setShowCancelQueueConfirm(false)}
      />
      <ConfirmDialog
        open={showReprocessConfirm}
        title="Reprocess Video"
        description="This will discard all clips and restart processing from scratch. Are you sure?"
        confirmText="Reprocess"
        onConfirm={() => { setShowReprocessConfirm(false); handleReset() }}
        onCancel={() => setShowReprocessConfirm(false)}
      />
    </div>
  )
}
