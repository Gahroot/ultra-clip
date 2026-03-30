# Segment-Based Render Pipeline

## Goal

Create `src/main/segment-render.ts` with `renderSegmentedClip()` that renders each segment independently with its own layout, zoom, and caption settings, then concatenates them with configurable transitions.

## Architecture Overview

The new pipeline sits **alongside** the existing render pipeline (not replacing it). It is invoked when a `RenderClipJob` contains a `segmentedSegments` array (similar to how `stitchedSegments` already routes to `renderStitchedClip`).

**Flow per clip:**
1. For each segment: resolve layout → build zoom filter → build caption ASS → encode segment as temp file
2. Concatenate all segment temp files using FFmpeg concat demuxer (hard cuts) or xfade (crossfade/flash/color-wash transitions)
3. Apply post-concat overlays (progress bar, brand logo)
4. Clean up temp files

## Files to Create/Modify

### 1. NEW: `src/main/render/segment-render.ts` (~350 lines)

Main implementation file.

**Types:**
```typescript
export interface SegmentRenderConfig {
  /** Source video path */
  sourceVideoPath: string
  /** Per-segment render instructions */
  segments: ResolvedSegment[]
  /** Edit style providing defaults for zoom/transition/caption bg */
  editStyle: EditStyle
  /** Target output dimensions */
  width: number
  height: number
  /** Video FPS */
  fps: number
  /** Source video metadata */
  sourceWidth: number
  sourceHeight: number
  /** Face detection crop rect (fallback when segment has none) */
  defaultCropRect?: { x: number; y: number; width: number; height: number }
  /** Word timestamps (absolute, for caption generation) */
  wordTimestamps?: WordTimestamp[]
  /** Word emphasis data */
  wordEmphasis?: EmphasizedWord[]
  /** Caption style */
  captionStyle?: CaptionStyleInput
  /** Whether captions are enabled */
  captionsEnabled?: boolean
  /** Brand kit settings */
  brandKit?: BrandKitRenderOptions
  /** Progress bar config */
  progressBarConfig?: ProgressBarConfig
  /** Template layout positions */
  templateLayout?: { titleText: { x: number; y: number }; subtitles: { x: number; y: number }; rehookText: { x: number; y: number } }
}

export interface ResolvedSegment {
  /** Segment time range in source video (absolute seconds) */
  startTime: number
  endTime: number
  /** Segment style variant (from segment-styles.ts) */
  styleVariant: SegmentStyleVariant
  /** Zoom parameters resolved from style + edit style */
  zoom: {
    style: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
    intensity: number
  }
  /** Transition IN to this segment (hard-cut on first segment is ignored) */
  transitionIn: TransitionType
  /** Overlay text for text-based layouts */
  overlayText?: string
  /** Accent color for this segment */
  accentColor?: string
  /** Caption bg opacity for this segment */
  captionBgOpacity?: number
  /** Contextual image path (for image-based layouts) */
  imagePath?: string
  /** Per-segment face crop override */
  cropRect?: { x: number; y: number; width: number; height: number }
}
```

**Main function:**
```typescript
export async function renderSegmentedClip(
  config: SegmentRenderConfig,
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<string>
```

**Implementation phases:**

1. **Per-segment encoding** (80% of progress)
   - For each segment:
     a. Build layout filter via `buildSegmentLayout()` from `segment-layouts.ts`
     b. Build zoom filter via appropriate builder from `zoom-filters.ts`
     c. Generate per-segment caption ASS via `generateCaptions()` from `captions.ts`
     d. Build caption background + letterbox via `caption-background.ts`
     e. Combine filters: layout → zoom → caption bg → letterbox → ASS subtitles
     f. Encode segment as temp MP4 (simple path - no sound design)
     g. Report per-segment progress

2. **Concatenation** (5% of progress)
   - If all transitions are hard-cut: use concat demuxer (stream copy, fast)
   - If any transition is crossfade/flash/color-wash: use xfade filter_complex
   - For xfade path: chain segments pairwise with transition filters

3. **Post-concat passes** (15% of progress)
   - Progress bar overlay via `applyFilterComplexPass`
   - Brand logo overlay
   - Cleanup all temp files

### 2. MODIFY: `src/main/render/types.ts`

Add `SegmentedSegment` type and add it to `RenderClipJob`:

```typescript
export interface SegmentedSegment {
  startTime: number
  endTime: number
  styleVariantId: string
  zoomStyle: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
  zoomIntensity: number
  transitionIn: TransitionType
  overlayText?: string
  accentColor?: string
  captionBgOpacity?: number
  imagePath?: string
  cropRect?: { x: number; y: number; width: number; height: number }
}
```

Add to `RenderClipJob`:
```typescript
segmentedSegments?: SegmentedSegment[]
```

### 3. MODIFY: `src/main/render/pipeline.ts`

In `processJob()`, add routing for `segmentedSegments` (similar to existing `stitchedSegments` routing around line 241). When `job.segmentedSegments` is present, resolve the segment style variants and delegate to `renderSegmentedClip()`.

### 4. MODIFY: `src/main/render-pipeline.ts` (shim)

Re-export `renderSegmentedClip` and types:
```typescript
export { renderSegmentedClip } from './render/segment-render'
export type { SegmentRenderConfig, ResolvedSegment } from './render/segment-render'
```

## Key Design Decisions

1. **Separate from stitched-render**: `stitched-render.ts` handles AI-selected non-contiguous segments with a fixed render style. The new segment render handles user/AI-styled contiguous segments with per-segment visual treatment.

2. **Transition handling**: 
   - Hard cuts → concat demuxer (stream copy, zero quality loss, fast)
   - Crossfade/flash/color-wash → xfade filter_complex (requires re-encode)
   - If ANY transition is non-hard-cut, use the xfade path for the entire clip (can't mix concat demuxer with xfade)

3. **Zoom filters**: Use existing builders from `zoom-filters.ts`. Each segment gets its own zoom params resolved from its style variant + the edit style defaults.

4. **Layout filters**: Use existing `buildSegmentLayout()` from `segment-layouts.ts`. The layout produces a `[outv]` labeled stream that's further processed with zoom + caption overlays.

5. **Caption generation**: Per-segment captions using words that fall within the segment's time range, similar to `stitched-render.ts`.

6. **No sound design in per-segment path**: Sound design is applied at the clip level (not per-segment). It can be added to the post-concat phase later if needed.

7. **Encoder selection**: Use `getEncoder()` with quality params from batch options, with GPU→CPU fallback on error (matching existing patterns).

## Implementation Order

1. Add types to `src/main/render/types.ts`
2. Create `src/main/render/segment-render.ts`
3. Add routing in `src/main/render/pipeline.ts`
4. Update shim in `src/main/render-pipeline.ts`
5. Build and verify: `npx electron-vite build`

## Risk Assessment

- **Complexity**: The xfade transition path is the most complex part. For clips with many segments + non-hard transitions, the filter_complex gets large. Mitigation: limit to 7 segments max (from segments.ts), and for the xfade path, chain pairwise.
- **Performance**: Per-segment encoding means N separate FFmpeg invocations + concat. For 7 segments this is ~7x the encoding time. Mitigation: segment encoding is on trimmed sub-clips (short duration), so each is fast.
- **Compatibility**: All filter builders used (zoom-filters, segment-layouts, caption-background, transition-filters) already exist and are tested. The new code just orchestrates them.
