/**
 * Barrel re-export — all imports from '@/store' continue to work.
 *
 * The actual store implementation has been split into domain slices
 * under src/renderer/src/store/.
 */

// The Zustand store hook
export { useStore } from './store/index'

// All types
export type {
  AppState,
  TemplateLayout,
  SourceVideo,
  TranscriptionData,
  ClipVariantUI,
  StitchSegmentRole,
  StitchSegment,
  StitchedClipCandidate,
  PartInfoUI,
  StoryArcUI,
  ClipRenderSettings,
  ClipCandidate,
  PipelineStage,
  PipelineProgress,
  RenderProgress,
  CaptionStyle,
  SoundDesignSettings,
  BrandKit,
  ZoomSettings,
  HookTitleOverlaySettings,
  RehookOverlaySettings,
  ProgressBarOverlaySettings,
  BRollSettings,
  FillerRemovalSettings,
  RenderQualityPreset,
  OutputResolution,
  OutputFormat,
  EncodingPreset,
  RenderQualitySettings,
  AppSettings,
  SettingsProfile,
  ProcessingConfig,
  AutoModeConfig,
  ErrorLogEntry,
  QueueItemStatus,
  QueueResult,
  HookTextTemplate,
  PythonSetupState,
} from './store/types'

// Re-export the BUILT_IN_PROFILE_NAMES const (it's a value, not just a type)
export { BUILT_IN_PROFILE_NAMES } from './store/types'

// Re-export shared types that were previously re-exported from store.ts
export type {
  WordTimestamp,
  SegmentTimestamp,
  TranscriptionResult,
  CropRegion,
  TargetDuration,
  ClipEndMode,
  CaptionAnimation,
  MusicTrack,
  Platform,
  OutputAspectRatio,
  ZoomIntensity,
  HookTitleStyle,
  RehookStyle,
  ProgressBarStyle,
  ProgressBarPosition,
  LogoPosition,
  ScoredSegment,
  ScoringResult,
  ScoringProgress,
  FaceDetectionProgress,
  CuriosityGap,
  ClipBoundary,
  CuriosityClipCandidate,
} from './store/types'

// Constants and helpers
export {
  CAPTION_PRESETS,
  DEFAULT_HOOK_TEMPLATES,
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATE_LAYOUT,
  applyHookTemplate,
  extractProfileFromSettings,
} from './store/helpers'

export type { ProjectFileData } from './store/helpers'

// Memoized selectors
export { selectActiveClips } from './store/selectors'
