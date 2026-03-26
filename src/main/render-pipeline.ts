// ---------------------------------------------------------------------------
// Re-export shim — the actual implementation lives in src/main/render/
// This file preserves backward compatibility for all existing imports.
// ---------------------------------------------------------------------------

export { startBatchRender, cancelRender } from './render/pipeline'
export { renderStitchedClip } from './render/stitched-render'
export { resolveFilenameTemplate } from './render/filename'

export type {
  RenderClipJob,
  RenderBatchOptions,
  BrandKitRenderOptions,
  RenderStitchedClipSegment,
  RenderStitchedClipJob,
  // Pass-through re-exports
  SoundPlacementData,
  ZoomSettings,
  HookTitleConfig,
  RehookConfig,
  ProgressBarConfig
} from './render/types'
