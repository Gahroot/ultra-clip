// ---------------------------------------------------------------------------
// Re-export shim — the actual implementation lives in src/main/render/
// This file preserves backward compatibility for all existing imports.
// ---------------------------------------------------------------------------

export { startBatchRender, cancelRender } from './render/pipeline'
export { assembleStitchedVideo } from './render/stitched-render'
export { renderSegmentedClip } from './render/segment-render'
export type { SegmentRenderConfig, ResolvedSegment } from './render/segment-render'
export { resolveFilenameTemplate } from './render/filename'

export type {
  RenderClipJob,
  RenderBatchOptions,
  BrandKitRenderOptions,
  RenderStitchedClipSegment,
  RenderStitchedClipJob,
  SegmentedSegment,
  // Pass-through re-exports
  SoundPlacementData,
  ZoomSettings,
  HookTitleConfig,
  RehookConfig
} from './render/types'
