# Render Pipeline & FFmpeg Module Audit — Segment-Based Editing Compatibility

**Date**: 2025-01-XX  
**Scope**: Evaluate conflicts between existing render system and a new Captions.ai-style segment-based editing feature (4-7 segments per clip, ~8-10s each, per-segment layout/zoom/caption style, independent render + concatenation with transitions).

---

## 1. `src/main/render-pipeline.ts` (Re-export Shim)

### What it does
Pure re-export shim. Forwards `startBatchRender`, `cancelRender`, `renderStitchedClip`, `resolveFilenameTemplate` and all type exports from `src/main/render/`. Exists solely for backward compatibility.

### Exports
```ts
export { startBatchRender, cancelRender } from './render/pipeline'
export { renderStitchedClip } from './render/stitched-render'
export { resolveFilenameTemplate } from './render/filename'
export type { RenderClipJob, RenderBatchOptions, BrandKitRenderOptions,
  RenderStitchedClipSegment, RenderStitchedClipJob, SoundPlacementData,
  ZoomSettings, HookTitleConfig, RehookConfig, ProgressBarConfig }
```

### Conflicts
None. It's a pass-through. New segment exports can be added here.

### Action: **Leave alone** — add new re-exports as segment system is built.

---

## 2. `src/main/render/pipeline.ts` (Main Orchestrator)

### What it does
Batch render orchestrator. Iterates `RenderClipJob[]` with concurrent worker pool (1-4 workers). For each clip:
1. Routes `stitchedSegments` jobs to `renderStitchedClip()` (early return)
2. Runs 13 registered `RenderFeature` instances through lifecycle: `prepare()` → `videoFilter()` → `overlayPass()` → `renderClip()` → `postProcess()`
3. Manages temp files, progress IPC, cancellation, metadata caching, manifest generation

### Key architectural facts
- **Feature registration is ordered** — hardcoded array of 13 features in dependency order (filler-removal → brand-kit → accent-color → word-emphasis → captions → hook-title → rehook → progress-bar → auto-zoom → broll → color-grade → shot-transition → sound-design)
- **Cross-feature data flow via job mutation** — features write to `job.*` fields that downstream features read (e.g., word-emphasis writes `job.emphasisKeyframes` → auto-zoom reads it)
- **"One clip = one render" assumption is SOFT** — the stitched clip path already breaks this pattern. But progress reporting, IPC events, and manifest tracking all operate at clip granularity
- **`processJob()` is a single closure** — ~330 lines. All clip-level logic lives here
- **Concurrency model** — shared `nextJobIndex` counter, concurrent workers pop from queue. GPU encoders capped at 2 concurrent

### Conflicts with segment-based editing

| Conflict | Severity | Detail |
|----------|----------|--------|
| **Progress reporting is per-clip** | MEDIUM | IPC sends `RENDER_CLIP_START`, `RENDER_CLIP_PROGRESS`, `RENDER_CLIP_DONE` keyed by `clipId`. Segment-based rendering needs sub-clip progress (e.g., "segment 3/6 encoding"). The stitched-render path already solves this with weighted `onProgress` callbacks, so the pattern exists. |
| **Feature pipeline runs once per clip** | HIGH | All 13 features prepare/filter/overlay for the entire clip. Segment-based editing needs each segment to get its own feature pipeline pass (different zoom, captions, layout per segment). The current architecture would require either: (a) running the full feature pipeline N times with segment-scoped jobs, or (b) adding segment-awareness to every feature. |
| **Stitched render bypass is primitive** | HIGH | `stitchedSegments` short-circuits to `renderStitchedClip()` which has its own hardcoded caption/hook/rehook/progress-bar logic — it does NOT use the feature system. It duplicates ASS generation, crop logic, overlay timing. Segment-based editing would need to either massively expand this or replace it with a proper per-segment feature pipeline. |
| **Accent-color restore is clip-scoped** | LOW | `restoreBatchOptions()` runs after each clip. No issue if segments are processed within a single `processJob()` call. |
| **Temp file cleanup is per-clip** | LOW | `allTempFiles[]` collected per clip, cleaned in `finally`. Segment rendering will produce more temp files but the pattern works — just push more paths. |

### Action: **Modify** — extend to support segment-level rendering

### Reusable parts
- **Feature system architecture** (`RenderFeature` interface, lifecycle phases) — excellent. Per-segment rendering should reuse this, running features with a segment-scoped `RenderClipJob`.
- **Concurrent worker pool** — reusable as-is for parallel segment rendering
- **Metadata caching** (`metadataCache`) — reusable
- **Manifest generation** — reusable, just needs segment count metadata
- **Cancellation infrastructure** (`cancelRequested`, `activeCommands`) — reusable

### Dependencies that will be tricky
- **13 features all mutate `RenderClipJob`** — if segments share a job object, features will clobber each other's state. Each segment needs its own job copy.
- **`accent-color` mutates batch options** — needs careful scoping for per-segment runs

---

## 3. `src/main/render/base-render.ts` (Core FFmpeg Encoding)

### What it does
Contains two core functions:
1. **`buildVideoFilter()`** — constructs crop→scale filter chain. Supports face crop region or center-crop fallback. Optionally uses CUDA GPU scale (`hwupload_cuda,scale_cuda,...,hwdownload,format=nv12`).
2. **`renderClip()`** — executes FFmpeg with three render paths:
   - **Sound design path** — `filter_complex` with N audio inputs + optional logo overlay
   - **Logo-only path** — `filter_complex` with video + logo
   - **Simple path** — basic `-vf` filter chain
   
   After base encode: optional bumper concat → optional multi-pass overlays

### Conflicts with segment-based editing

| Conflict | Severity | Detail |
|----------|----------|--------|
| **`buildVideoFilter()` — no segment awareness** | LOW | Stateless function. Takes a job + dimensions → returns filter string. Per-segment calls just need segment-scoped crop regions. **Actually fine as-is.** |
| **`renderClip()` — tightly coupled to full clip** | MEDIUM | Uses `job.startTime/endTime` for seeking, `job.soundPlacements` for audio, `job.brandKit` for logo. All of these are clip-scoped. For segments, we'd pass segment-scoped sub-jobs. The function itself is reusable — its signature already accepts `videoFilter`, `overlaySteps`, `onProgress`. |
| **GPU fallback is per-invocation** | NONE | `fallbackAttempted` flag is local to each render call. Segments rendered as separate invocations will each get their own fallback logic. Perfect. |
| **Bumper concat is per-clip** | LOW | Bumpers should only appear on final concatenated output, not per-segment. Need to skip bumpers for segment renders and apply them in a final pass. |
| **Overlay multi-pass runs per-clip** | MEDIUM | `overlaySteps` are applied after base encode via `runOverlayPasses()`. For segment-based editing, captions/overlays should be burned into each segment before concat (so different segments can have different styles). This means overlays move from post-render to per-segment render. |

### Action: **Modify lightly** — mostly reusable. Add a `skipBumpers` flag or create a `renderSegment()` wrapper.

### Reusable parts
- **`buildVideoFilter()`** — 100% reusable for per-segment crop+scale
- **Three render paths** (sound, logo, simple) — all reusable with segment-scoped parameters
- **GPU fallback logic** — reusable, self-contained per invocation
- **`activeCommands` tracking** — reusable

---

## 4. `src/main/render/stitched-render.ts` (Existing Multi-Segment Render)

### What it does
Renders "stitched" clips by encoding each segment independently, then concatenating via FFmpeg concat demuxer. Per-segment: crop→scale→overlays→captions→hook-title→rehook. Post-concat: progress bar pass.

### THIS IS THE CLOSEST EXISTING ANALOG TO SEGMENT-BASED EDITING

### Conflicts

| Conflict | Severity | Detail |
|----------|----------|--------|
| **Does NOT use the feature system** | CRITICAL | Completely bypasses the 13-feature pipeline. Has its own hardcoded caption generation, hook title ASS, rehook ASS, crop logic. This is a parallel implementation that will diverge further. |
| **Hardcoded 1080×1920** | MEDIUM | `filterChain: ['crop=...', 'scale=1080:1920']` — no aspect ratio parameter. Segment-based editing needs configurable resolution. |
| **No auto-zoom** | HIGH | Stitched segments get no zoom at all. Ken Burns, reactive, jump-cut — all skipped. |
| **No color grading** | HIGH | No per-shot color grade applied. |
| **No shot transitions between segments** | HIGH | Uses hard-cut concat only (concat demuxer with `-c copy`). No crossfades, swipes, or zoom transitions between segments. |
| **No B-Roll** | HIGH | B-Roll post-processing is skipped entirely. |
| **No sound design** | HIGH | No audio mixing, no SFX, no background music per segment. |
| **No brand kit (logo)** | MEDIUM | Logo overlay skipped. Only bumpers are missing (which is correct for segments). |
| **Concat uses stream copy** | MEDIUM | `-c copy` in concat step means no transition effects possible. Transitions require re-encoding at boundaries. |

### Action: **Replace** — this should be rebuilt on top of the feature pipeline rather than duplicating everything.

### Reusable parts
- **Concat demuxer pattern** — the list file generation + `ffmpeg -f concat -safe 0` approach is correct for segment joining (when transitions aren't needed)
- **Per-segment progress weighting** — good pattern: `segmentProgressWeight / job.segments.length`
- **Per-segment caption generation** — the word-timestamp filtering + 0-basing logic is correct

### Dependencies that will be tricky
- Current callers of `renderStitchedClip()` (pipeline.ts routes there when `job.stitchedSegments` is present) need migration
- The stitched render has its own ASS generation functions that duplicate hook-title.feature.ts and rehook.feature.ts

---

## 5. `src/main/render/overlay-runner.ts` (Multi-Pass Overlay Engine)

### What it does
Executes overlay passes as separate FFmpeg re-encode operations. Three functions:
- `applyFilterPass()` — simple `-vf` pass
- `applyFilterComplexPass()` — `filter_complex` pass with `[outv]` mapping
- `runOverlayPasses()` — sequential multi-pass runner with temp file management

### Conflicts

| Conflict | Severity | Detail |
|----------|----------|--------|
| **Multi-pass re-encoding = quality loss** | MEDIUM | Each overlay pass re-encodes at CRF 15 ultrafast. With 4+ overlays per segment, generation loss accumulates. For segments this gets worse (N segments × M passes). Could be mitigated by combining all overlays into one filter_complex. |
| **Operates on files, not streams** | NONE | File-based pipeline is actually ideal for segment rendering — each segment produces a file, overlays transform files, concat joins files. |

### Action: **Leave alone** for now, but consider combining overlay passes into a single filter_complex per segment to reduce re-encode cycles.

### Reusable parts
- **`applyFilterPass()` / `applyFilterComplexPass()`** — fully reusable for per-segment overlay burns
- **`runOverlayPasses()`** — reusable for per-segment overlay chains
- **`activeCommands` set** — shared cancellation infrastructure

---

## 6. `src/main/render/features/feature.ts` (Feature Interface)

### What it does
Defines the `RenderFeature` interface with 4 lifecycle phases: `prepare()`, `videoFilter()`, `overlayPass()`, `postProcess()`.

### Conflicts
- **`FilterContext` has `clipDuration`** — needs to become `segmentDuration` when rendering segments. Could be renamed to `duration` or a `segmentIndex` field added.
- **`PostProcessContext` has `outputPath`** — for segments this should be the segment's temp file, not the final clip output.

### Action: **Modify lightly** — add optional segment context fields to `FilterContext` and `PostProcessContext`.

### Reusable parts
- The entire interface is the right abstraction. Per-segment rendering = running features with segment-scoped contexts.

---

## 7. `src/main/ffmpeg.ts` (FFmpeg Binary Setup & Utilities)

### What it does
- **Binary resolution** — finds ffmpeg/ffprobe binaries across packaged, npm, and system PATH locations
- **Hardware encoder detection** — probes h264_nvenc, h264_qsv, falls back to libx264. Caches result.
- **CUDA scale filter detection** — probes for scale_cuda availability. Caches result.
- **`getEncoder()`** — returns encoder name + preset flags for given quality params. Maps CRF/preset across nvenc/qsv/libx264.
- **`getSoftwareEncoder()`** — always returns libx264 config
- **`isGpuSessionError()`** — pattern matcher for GPU failure strings
- **`stripCudaScaleFilter()`** — regex replacement of CUDA scale pipeline with CPU scale
- **Utility functions** — `getVideoMetadata()`, `extractAudio()`, `trimVideo()`, `trimVideoReencode()`, `cropAndExport()`, `generateThumbnail()`, `splitSegments()`, `getWaveformPeaks()`

### Exports (18 total)
```ts
setupFFmpeg()                    // Initialize binaries + detect hardware
getEncoder(quality?)             // → EncoderConfig { encoder, presetFlag }
getSoftwareEncoder(quality?)     // → EncoderConfig (always libx264)
hasScaleCuda()                   // → boolean
isGpuSessionError(msg)           // → boolean
stripCudaScaleFilter(filter)     // → string
isFFmpegAvailable()              // → boolean
getVideoMetadata(path)           // → Promise<{duration, width, height, codec, fps, audioCodec}>
extractAudio(videoPath, outPath) // → Promise<string>
trimVideo(in, out, start, end)   // → Promise<string> (stream copy + fallback)
trimVideoReencode(in, out, s, e) // → Promise<string>
cropAndExport(in, out, crop, res)// → Promise<string>
generateThumbnail(videoPath, t)  // → Promise<string> (base64 data URI)
splitSegments(in, segments, dir) // → Promise<SplitResult[]>
getWaveformPeaks(path, s, e, n)  // → number[]
getResolvedFfmpegPath()          // → string | null
ffmpeg                           // fluent-ffmpeg instance (re-export)
// Types: EncoderConfig, QualityParams, CropRect, SplitSegment, SplitResult
```

### Conflicts with segment-based editing

| Conflict | Severity | Detail |
|----------|----------|--------|
| **None of the utility functions assume one-clip-at-a-time** | NONE | All are stateless functions. `getEncoder()` uses cached encoder detection. Thread-safe (single-threaded JS anyway). |
| **`splitSegments()`** already exists | USEFUL | Sequentially trims input video into labeled segments. Currently uses `trimVideo()` (stream copy). For segment-based editing, we need re-encoding with filters, so this function isn't directly usable but the pattern is. |
| **`trimVideo()` uses stream copy first** | LOW | Stream copy won't work if we need to apply filters. `trimVideoReencode()` is available for this case. |
| **GPU encoder session limits** | MEDIUM | NVENC has limited concurrent sessions (~3-5). If we render multiple segments in parallel with GPU encoding, we could hit session limits. The pipeline already handles this (cap concurrency to 2 for GPU), but segment-level parallelism adds another dimension. |

### Action: **Leave alone** — this module is a clean utility layer.

### Reusable parts
- **`getEncoder()` / `getSoftwareEncoder()`** — critical for per-segment encoding
- **`isGpuSessionError()` + `stripCudaScaleFilter()`** — critical for per-segment GPU fallback
- **`getVideoMetadata()`** — needed for source probing before segmentation
- **`hasScaleCuda()`** — needed for per-segment filter chain construction
- **`getWaveformPeaks()`** — could be useful for segment boundary detection
- **`getResolvedFfmpegPath()`** — needed for direct ffmpeg spawning if bypassing fluent-ffmpeg
- **`ffmpeg` re-export** — needed everywhere

### Hardcoded assumptions
- `trimVideo()` defaults to `getEncoder()` on fallback — no quality param passthrough. Minor.
- `cropAndExport()` defaults to 1080×1920 resolution — parameterized, not an issue.
- `generateThumbnail()` temp file prefix is `batchcontent-thumb-` — no namespace collision risk.

---

## 8. `src/main/auto-zoom.ts` (Zoom Engine)

### What it does
Generates FFmpeg crop+scale filter expressions for animated zoom/pan. Three modes:
1. **Ken Burns** — smooth sinusoidal cosine breathing zoom. Face-aware Y tracking.
2. **Reactive** — piecewise-linear zoom that pushes in on emphasis/supersize words, returns to base between them. Driven by `EmphasisKeyframe[]`.
3. **Jump-cut** — step-function zoom simulating multi-camera editing. Sentence-boundary-aware cut points when word timestamps available.
4. **Piecewise per-shot** — `generatePiecewiseZoomFilter()` composites different zoom modes for different time ranges within a single clip using nested `if(between(t,...))` expressions.

### Architecture
- All modes produce `crop=w=...:h=...:x=...:y=...,scale=W:H` filter strings
- Uses time-based expressions (`t` variable) evaluated per-frame by FFmpeg
- Avoids `zoompan` filter (slow) in favor of `crop` (native, optimized)
- Windows-safe: avoids commas in filter option values using abs()-based clamp instead of min/max
- Deterministic PRNG (`mulberry32`) for jump-cut randomness (same clip duration = same cuts)
- Face Y-position tracking with clamped bounds

### Exports
```ts
generateZoomFilter(duration, settings, faceYNorm?, outW?, outH?, wordTimestamps?, emphasisKeyframes?)
generatePiecewiseZoomFilter(duration, globalSettings, shotStyleConfigs, faceYNorm?, outW?, outH?, wordTimestamps?, emphasisKeyframes?)
getZoomKeyframes(duration, settings, faceYNorm?)  // for preview/debug
// Types: ZoomSettings, ZoomKeyframe, EmphasisKeyframe, ZoomIntensity, ZoomMode
```

### Conflicts with segment-based editing

| Conflict | Severity | Detail |
|----------|----------|--------|
| **Ken Burns uses clip-scoped time expressions** | MEDIUM | The cosine formula `cos(2*PI*t/T)` uses absolute `t` from FFmpeg. When rendering a segment, `t` starts from 0 for that segment's encode, so this naturally works — each segment gets its own zoom cycle starting at t=0. **Actually fine.** |
| **Reactive zoom needs segment-scoped emphasis keyframes** | MEDIUM | `buildReactiveSegments()` takes `clipDuration` and `emphasisKeyframes[]` with clip-relative times. For segments, we'd pass segment duration and segment-relative keyframes. The function is parameterized correctly — just needs the right inputs. |
| **Jump-cut determinism is duration-based** | LOW | `clipSeed(duration)` means two segments with similar durations get similar cut patterns. Not a real problem since segments have different content. |
| **`generatePiecewiseZoomFilter()` already supports per-shot zoom** | POSITIVE | This is essentially segment-level zoom! It already builds nested `if(between(t,...))` expressions for different time ranges with different zoom modes. For segment-based editing where each segment renders independently, we don't even need this complexity — just call `generateZoomFilter()` per segment. |
| **No snap-zoom support** | GAP | Current modes are ken-burns (smooth), reactive (keyword-driven), jump-cut (step-function). Missing: snap-zoom (fast ramp to target + slow return), word-pulse (brief pop on every word), zoom-out-reveal (start tight, slowly widen). |
| **No zoom-out-reveal** | GAP | All modes oscillate around a center or step between levels. No monotonic zoom-out-from-tight-to-wide pattern. |

### Can it be extended for snap-zoom, word-pulse, zoom-out-reveal?

**Yes, cleanly.** The architecture supports it:
1. **Snap-zoom** — add a new mode in `generateZoomFilter()` that builds piecewise segments with fast ramp-in (0.1s) and slow ramp-out (0.5s). Use `buildReactiveSegments()` pattern but with asymmetric ramp durations.
2. **Word-pulse** — similar to reactive mode but triggers on EVERY word (not just emphasis). Generate `EmphasisKeyframe` for each word timestamp, use shorter ramp (0.05s) and smaller zoom delta.
3. **Zoom-out-reveal** — simplest: monotonic `z(t) = zMax - (zMax - 1) * (t / duration)`. Single crop expression, no piecewise logic needed.

All three can be added as new `ZoomMode` values in the existing switch/case in `generateZoomFilter()`.

### Action: **Extend** — add new zoom modes (snap-zoom, word-pulse, zoom-out-reveal). The existing architecture supports this cleanly.

### Reusable parts
- **`generateZoomFilter()`** — call per-segment with segment duration and segment-relative keyframes
- **`buildReactiveSegments()`** — pattern for piecewise zoom segments (reusable for snap-zoom)
- **`buildStepExpr()`** — generic step-function expression builder
- **Windows-safe clamping pattern** — abs()-based min/max avoids FFmpeg comma escaping issues
- **PRNG** — `mulberry32()` for deterministic per-segment randomness

### Dependencies that will be tricky
- `ZoomMode` type lives in `@shared/types` — adding new modes requires updating the shared type + any UI that presents mode options
- `INTENSITY_CONFIG` / `REACTIVE_CONFIG` need entries for new modes

---

## 9. `src/main/render/features/auto-zoom.feature.ts` (Zoom Feature Integration)

### What it does
Bridges `auto-zoom.ts` engine with the feature pipeline. Caches per-clip zoom settings during `prepare()`, generates filter string during `videoFilter()`.

### Conflicts
- **Per-clip settings cache keyed by `clipId`** — if segments share a clipId, need per-segment keys. Easy fix: key by `${clipId}-${segmentIndex}`.
- **Already supports piecewise zoom** via `job.shotStyleConfigs` → `generatePiecewiseZoomFilter()`. For segments rendered independently, this becomes simpler — just `generateZoomFilter()` per segment.

### Action: **Modify lightly** — adjust cache key for segment awareness.

---

## 10. `src/main/render/features/captions.feature.ts` (Captions Feature)

### What it does
Generates ASS subtitle files during `prepare()`, returns `ass=` filter string during `overlayPass()`. Supports per-shot caption style overrides via `ShotCaptionOverride[]`.

### Conflicts
- **One ASS file per clip** — `job.assFilePath` is a single path. For segments, each segment needs its own ASS file with segment-relative timestamps. The stitched-render already does this (per-segment caption generation). The feature would need to produce per-segment ASS files.
- **Word timestamp filtering uses `job.startTime/endTime`** — for segments, these would be segment boundaries. If we pass segment-scoped sub-jobs, this works naturally.
- **Per-shot caption overrides already exist** — `buildShotCaptionOverrides()` maps `ShotStyleConfig` to `ShotCaptionOverride[]`. For per-segment rendering, each segment just uses its own caption style directly (no need for piecewise overrides).

### Action: **Modify** — when called with segment-scoped job, it naturally produces per-segment ASS. The key change is ensuring `job.assFilePath` doesn't collide across segments.

---

## 11. Supporting Files Summary

### `src/main/render/helpers.ts`
Pure utilities: `toFFmpegPath()`, `sanitizeFilename()`, `formatASSTimestamp()`, `cssHexToASS()`, `buildASSFilter()`. **Leave alone** — all reusable.

### `src/main/render/bumpers.ts`
Bumper concatenation with stream compatibility checking. Has `canUseConcatDemuxer()` (checks codec/resolution/fps match across segments) — **directly reusable** for segment concatenation quality checks.

### `src/main/render/shot-style-resolver.ts`
Resolves `ShotStyleAssignment[]` → `ShotStyleConfig[]` using preset definitions. **Extend** — could map segments to presets directly. Currently maps shots within a clip; segment-based editing could treat each segment as a "shot".

### `src/main/render/quality.ts`
Quality parameter resolution. **Leave alone** — reusable.

### `src/main/render/features/shot-transition.feature.ts`
Emits `shot-transition` edit events and generates fade/swipe/zoom filter expressions at shot boundaries. **Key for segment transitions.** Currently operates within a single clip's filter chain (using time-based expressions). For segment-based editing, transitions between segments happen at the concat stage — this needs a different approach (e.g., FFmpeg xfade filter between segment files, or overlap regions at segment boundaries).

---

## Summary: Conflict Heat Map

```
CRITICAL  ████ stitched-render.ts — parallel implementation, needs replacement
HIGH      ███░ pipeline.ts — feature pipeline runs once per clip, not per segment  
HIGH      ███░ stitched-render.ts — missing zoom, color-grade, broll, sound design, transitions
MEDIUM    ██░░ pipeline.ts — progress reporting is clip-scoped
MEDIUM    ██░░ base-render.ts — bumpers + overlays are clip-scoped
MEDIUM    ██░░ overlay-runner.ts — multi-pass quality loss compounds with segments
MEDIUM    ██░░ captions.feature.ts — one ASS file per clip assumption
LOW       █░░░ auto-zoom — fine per-segment, needs new modes added
NONE      ░░░░ ffmpeg.ts — clean utility layer, fully reusable
NONE      ░░░░ helpers.ts — pure utilities
NONE      ░░░░ quality.ts — reusable
```

## Recommended Architecture for Segment-Based Editing

### Option A: "Segment as Sub-Job" (RECOMMENDED)
1. **Split clip into segments** at the orchestrator level (pipeline.ts)
2. **Create segment sub-jobs** — clone `RenderClipJob` per segment with segment-scoped `startTime`, `endTime`, `wordTimestamps`, `emphasisKeyframes`, zoom settings, caption style
3. **Run full feature pipeline per segment** — each segment gets `prepare()` → `videoFilter()` → `overlayPass()` → base render → `postProcess()` 
4. **Concat segments** with optional transitions (FFmpeg xfade/concat)
5. **Apply clip-level post-processing** — bumpers, progress bar (these span the full clip)

**Why**: Maximizes reuse of existing feature system. Each feature "just works" with a segment-scoped job. No feature needs to know it's operating on a segment vs a full clip.

### Option B: "Feature-Level Segment Awareness"
Add segment iteration inside each feature. Rejected — violates separation of concerns, every feature needs modification.

### Key New Components Needed
1. **`SegmentSplitter`** — takes clip + AI analysis → segment boundaries + per-segment style configs
2. **`renderSegmentBatch()`** — orchestrates per-segment feature pipeline + concat
3. **`SegmentTransitionEngine`** — xfade/concat between rendered segments (new, not in existing shot-transition code)
4. **New zoom modes** — snap-zoom, word-pulse, zoom-out-reveal in `auto-zoom.ts`
5. **`renderStitchedClip()` migration** — route existing stitched clips through the new segment pipeline

### Files to Modify
| File | Change |
|------|--------|
| `src/main/render/pipeline.ts` | Add segment-based routing + per-segment feature pipeline |
| `src/main/render/base-render.ts` | Add `skipBumpers` option for segment renders |
| `src/main/auto-zoom.ts` | Add snap-zoom, word-pulse, zoom-out-reveal modes |
| `src/main/render/features/feature.ts` | Add optional `segmentIndex` to `FilterContext` |
| `src/main/render/features/captions.feature.ts` | Segment-scoped ASS generation (mostly works already) |
| `src/main/render/features/auto-zoom.feature.ts` | Segment-scoped cache key |
| `@shared/types` | Add new `ZoomMode` values |

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/render/segment-render.ts` | Per-segment feature pipeline runner |
| `src/main/render/segment-concat.ts` | Segment concatenation with transitions (xfade) |
| `src/main/render/segment-splitter.ts` | Clip → segment boundary computation |

### Files to Deprecate
| File | Why |
|------|-----|
| `src/main/render/stitched-render.ts` | Replace with segment pipeline. Migration path: route stitched jobs through new segment system. |
