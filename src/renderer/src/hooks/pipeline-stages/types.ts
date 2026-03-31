import type {
  SourceVideo,
  ClipCandidate,
  PipelineStage,
  PipelineProgress,
  TranscriptionData,
  ClipVariantUI,
  StitchedClipCandidate,
  StoryArcUI,
  PartInfoUI,
  CropRegion,
  TargetDuration,
  ClipEndMode,
  VideoSegment,
} from '../../store'
import type { useStore } from '../../store'

/** Shared dependencies passed to every pipeline stage. */
export interface PipelineContext {
  source: SourceVideo
  /** Cancellation check — throws if cancelled. */
  check: () => void
  /** Update pipeline progress in the store. */
  setPipeline: (progress: PipelineProgress) => void
  /** Add an error entry to the error log. */
  addError: (entry: { source: string; message: string }) => void
  /** Mark a pipeline stage as completed (for resume support). */
  markStageCompleted: (stage: PipelineStage) => void
  /** Check if a stage should be skipped (was already completed in a prior run). */
  shouldSkip: (stage: PipelineStage) => boolean
  /** Intentionally reading latest state at execution time — use for cached
   *  data lookups and settings that should reflect the value at the moment
   *  the stage runs, not the moment the component last rendered. */
  getState: () => ReturnType<typeof useStore.getState>
  /** Store setters — grouped to avoid passing 15 individual functions. */
  store: {
    setTranscription: (sourceId: string, data: TranscriptionData) => void
    setClips: (sourceId: string, clips: ClipCandidate[]) => void
    updateClipCrop: (sourceId: string, clipId: string, crop: CropRegion) => void
    updateClipLoop: (sourceId: string, clipId: string, data: Partial<ClipCandidate>) => void
    updateClipTrim: (sourceId: string, clipId: string, start: number, end: number) => void
    updateClipThumbnail: (sourceId: string, clipId: string, thumbnail: string) => void
    setClipVariants: (sourceId: string, clipId: string, variants: ClipVariantUI[]) => void
    setStitchedClips: (sourceId: string, clips: StitchedClipCandidate[]) => void
    setStoryArcs: (sourceId: string, arcs: StoryArcUI[]) => void
    setClipPartInfo: (sourceId: string, clipId: string, info: PartInfoUI) => void
    setCachedSourcePath: (path: string) => void
    setClipAIEditPlan: (sourceId: string, clipId: string, plan: import('@shared/types').AIEditPlan) => void
    setSegments: (clipId: string, segments: VideoSegment[]) => void
    updateSegment: (clipId: string, segmentId: string, updates: Partial<VideoSegment>) => void
  }
  /** Settings snapshot — read once at pipeline start. */
  geminiApiKey: string
  /** fal.ai API key — empty string if not configured. */
  falApiKey: string
  /** Processing config values. */
  processingConfig: {
    targetDuration: TargetDuration
    enablePerfectLoop: boolean
    clipEndMode: ClipEndMode | undefined
    enableVariants: boolean
    enableClipStitching: boolean
    enableMultiPart: boolean
    enableAiEdit: boolean
  }
}

/** Shared error handler — rethrows cancellations, logs everything else. */
export function handleStageError(err: unknown, label: string, addError: (entry: { source: string; message: string }) => void): void {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg === 'Processing cancelled') throw err
  addError({ source: 'pipeline', message: `${label}: ${msg}` })
}
