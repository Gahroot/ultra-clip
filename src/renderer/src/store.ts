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
  SoundDesignSettings,
  BrandKit,
  ZoomSettings,
  HookTitleOverlaySettings,
  RehookOverlaySettings,
  BRollSettings,
  BRollDisplayMode,
  BRollTransition,
  SFXStyle,
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
  LogoPosition,
  ScoredSegment,
  ScoringResult,
  ScoringProgress,
  FaceDetectionProgress,
  CuriosityGap,
  ClipBoundary,
  CuriosityClipCandidate,
  VideoSegment,
  EditStyle,
  SegmentStyleCategory,
  SegmentStyleVariant,
  ZoomKeyframe,
  TransitionType,
} from './store/types'

// Constants and helpers
export {
  DEFAULT_HOOK_TEMPLATES,
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATE_LAYOUT,
  applyHookTemplate,
  extractProfileFromSettings,
} from './store/helpers'

export type { ProjectFileData } from './store/helpers'

// Memoized selectors
export { selectActiveClips } from './store/selectors'
