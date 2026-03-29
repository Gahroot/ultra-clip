# Render Pipeline & Style System — Exploration Notes

## Architecture Overview

The render system is a **composable feature pipeline** in `src/main/render/`. Each visual/audio effect is a self-contained `RenderFeature` that hooks into a 4-phase lifecycle. The pipeline orchestrator (`pipeline.ts`) iterates features in registration order across all phases for each clip.

```
Shot Style Resolver → Pipeline Orchestrator → Per-Clip Processing
                          │
                          ├── Phase 1: prepare()      (pre-render setup)
                          ├── Phase 2: videoFilter()   (FFmpeg -vf chain)
                          ├── Phase 3: overlayPass()   (separate FFmpeg re-encode)
                          └── Phase 4: postProcess()   (post-encode transforms)
```

---

## Core Interface: RenderFeature

**File:** `src/main/render/features/feature.ts`

```ts
interface RenderFeature {
  readonly name: string
  prepare?(job: RenderClipJob, batchOptions: RenderBatchOptions): Promise<PrepareResult>
  videoFilter?(job: RenderClipJob, context: FilterContext): string | null
  overlayPass?(job: RenderClipJob, context: OverlayContext): OverlayPassResult | null
  postProcess?(job: RenderClipJob, renderedPath: string, context: PostProcessContext): Promise<string>
}
```

All methods are **optional** — features implement only the phases they need.

### Phase Contexts
- **`FilterContext`**: sourceWidth/Height, targetWidth/Height, clipDuration, outputAspectRatio
- **`OverlayContext`**: clipDuration, targetWidth, targetHeight
- **`PostProcessContext`**: clipDuration, outputPath

### Return Types
- **`PrepareResult`**: `{ tempFiles: string[], modified: boolean }` — temp files cleaned up after render
- **`OverlayPassResult`**: `{ name: string, filter: string, filterComplex?: boolean }` — the FFmpeg filter string + whether it's a `-vf` or `-filter_complex`

---

## Feature Registration (pipeline.ts)

Features are instantiated in a fixed array in `startBatchRender()`. **Order matters** — earlier features mutate the `RenderClipJob` object, later features read those mutations.

```
Registration Order:
 1. filler-removal    ← mutates sourceVideoPath, startTime, endTime, wordTimestamps
 2. brand-kit         ← writes job.brandKit
 3. sound-design      ← validates job.soundPlacements
 4. captions          ← writes job.emphasisKeyframes, job.assFilePath
 5. hook-title        ← generates ASS overlay file
 6. rehook            ← reads hookTitleOverlay.displayDuration for timing
 7. progress-bar      ← injects job.progressBarConfig
 8. auto-zoom         ← reads job.emphasisKeyframes from captions
 9. color-grade       ← reads job.shotStyleConfigs
10. shot-transition   ← reads job.shotStyleConfigs
11. broll             ← reads job.brollPlacements, emits editEvents for sound-design
```

### Cross-Feature Data Flow (via job mutation)
- `captions` → `emphasisKeyframes` → `auto-zoom` (reactive zoom mode)
- `filler-removal` → `wordTimestamps` (remapped) → `captions`
- `broll.prepare()` → `editEvents` → `sound-design` (SFX sync)
- IPC handler pre-computes: `brollPlacements`, `soundPlacements`, `editEvents`

### Instantiation Patterns
- **Factory functions** (closures with cached state): `createFillerRemovalFeature()`, `createCaptionsFeature()`, `createHookTitleFeature()`, `createRehookFeature()`
- **Class instances**: `autoZoomFeature` (uses `AutoZoomFeature` class with `clipZoomSettings` Map)
- **Plain objects**: `brandKitFeature`, `soundDesignFeature`, `progressBarFeature`, `colorGradeFeature`, `shotTransitionFeature`, `brollFeature`

---

## How Each Phase Works

### Phase 1: `prepare()` — Pre-Render Setup
Called sequentially for each feature before FFmpeg runs. Can:
- Generate temp files (ASS subtitles, trimmed video segments)
- Mutate `job` properties (paths, timestamps, config injection)
- Return temp files for cleanup

**Example (filler-removal):** Detects filler words → trims keep-segments → concatenates → replaces `job.sourceVideoPath`, `job.startTime=0`, `job.endTime=totalKeptDuration` → re-syncs captions

### Phase 2: `videoFilter()` — Filter Chain Contribution
Returns a filter string segment appended to the base `-vf` chain with commas.

```
Base: crop=W:H:X:Y,scale=1080:1920
 + auto-zoom: crop=w=EXPR:h=EXPR:x=EXPR:y=EXPR,scale=1080:1920
 + color-grade: eq=brightness=...:contrast=...,hue=...
 + shot-transition: fade=...:enable='between(t,...)'
```

Only **auto-zoom**, **color-grade**, and **shot-transition** use this phase. The filter string is concatenated directly into the base FFmpeg `-vf` option.

### Phase 3: `overlayPass()` — Separate FFmpeg Re-encode
Returns `OverlayPassResult` with a filter string. Each overlay runs as its own FFmpeg invocation (to avoid Windows escaping issues with huge combined filter strings).

Two execution modes in `overlay-runner.ts`:
- **Simple `-vf`** (default): `applyFilterPass()` — e.g., `ass='path.ass'` for subtitle burn-in
- **`-filter_complex`** (`filterComplex: true`): `applyFilterComplexPass()` — for multi-input filters (e.g., progress bar with color source)

The overlay runner (`runOverlayPasses()`) chains passes sequentially with intermediate temp files, then renames the final output.

**Features using overlayPass:**
- `captions` → `ass='escaped_path':fontsdir='fonts_dir'`
- `hook-title` → `ass='hook_title.ass'`
- `rehook` → `ass='rehook.ass'`
- `progress-bar` → filter_complex with `color` source → `crop` (animated width) → `overlay`

### Phase 4: `postProcess()` — Post-Encode
Only **broll** uses this. Copies the rendered clip, overlays B-Roll footage via `filter_complex`, replaces the output file.

---

## Feature Details

### Captions (`captions.feature.ts`)
- **Phase:** prepare + overlayPass
- `prepare()`: Filters word timestamps to clip range → shifts to 0-based → computes emphasis (heuristic or upstream) → writes `job.emphasisKeyframes` → calls `generateCaptions()` → stores `job.assFilePath`
- `overlayPass()`: Returns ASS filter string via `buildASSFilter()`
- Supports **per-shot caption style overrides** via `shotStyleConfigs` → `ShotCaptionOverride[]`
- Factory function caches `fontsDir` across clips

### Auto-Zoom (`auto-zoom.feature.ts`)
- **Phase:** prepare + videoFilter
- `prepare()`: Stores effective zoom settings per clipId in a Map → computes emphasis keyframes for reactive mode if missing
- `videoFilter()`: Calls `generateZoomFilter()` or `generatePiecewiseZoomFilter()` (for per-shot zoom overrides)
- Class instance with `clipZoomSettings` Map for concurrent safety
- Cleans up Map entry after consumption

### Hook Title (`hook-title.feature.ts`)
- **Phase:** prepare + overlayPass
- Self-contained ASS generation (title text with fade, positioned at top-center)
- Uses BorderStyle 3 (opaque box) for filled rounded-rect appearance
- Template layout support for Y position

### Rehook (`rehook.feature.ts`)
- **Phase:** prepare + overlayPass
- Mid-clip "pattern interrupt" overlay appearing after hook title ends
- `appearTime = hookTitleOverlay.displayDuration` (cross-feature dependency)
- Default phrases from curated list, deterministic per clipId

### Filler Removal (`filler-removal.feature.ts`)
- **Phase:** prepare only (heaviest pre-render feature)
- Detects fillers → builds keep segments → trims each via FFmpeg re-encode → concatenates via concat demuxer
- Replaces job's source path with clean intermediate file
- Re-syncs captions by remapping word timestamps
- Gracefully falls back (renders without filler removal) on error

### Brand Kit (`brand-kit.feature.ts`)
- **Phase:** prepare only
- Injects `job.brandKit` config from batch options
- Validates file existence (logo, bumpers)
- Logo overlay is actually applied in `base-render.ts` via exported `buildLogoOnlyFilterComplex()`

### Sound Design (`sound-design.feature.ts`)
- **Phase:** prepare only (validation + logging)
- Actual audio mixing done by exported `buildSoundFilterComplex()` consumed by `base-render.ts`
- Supports music (looped + volume ducking) + SFX (delayed + positioned)

### Progress Bar (`progress-bar.feature.ts`)
- **Phase:** prepare + overlayPass
- `prepare()`: Injects config → `overlayPass()`: Returns filter_complex string (`filterComplex: true`)
- Uses animated `crop` width expression (evaluates `t` per frame)

### B-Roll (`broll.feature.ts`)
- **Phase:** prepare + postProcess
- `prepare()`: Emits `broll-transition` edit events for sound-design sync
- `postProcess()`: Builds complex `filter_complex` with display modes: fullscreen, split-top, split-bottom, pip
- Transitions: crossfade (alpha fade), hard-cut, swipe-up, swipe-down

### Color Grade (`color-grade.feature.ts`)
- **Phase:** videoFilter only
- Delegates to `buildPiecewiseColorGradeFilter()` from `../../color-grade`
- Per-shot color treatment using `eq`/`hue` filters

### Shot Transition (`shot-transition.feature.ts`)
- **Phase:** videoFilter only
- Delegates to `buildShotTransitionFilters()` from `../../shot-transitions`
- Visual transitions (fade, etc.) at shot boundaries

### Word Emphasis (`word-emphasis.feature.ts`)
- **Phase:** prepare only
- **Not registered in pipeline** (computed within captions/auto-zoom instead)
- Computes emphasis levels: pre-computed (AI) > manual override > heuristic
- Writes `job.wordEmphasis` and `job.emphasisKeyframes`

---

## Shot Style Resolver (`shot-style-resolver.ts`)

Maps `ShotStyleAssignment[]` (per-shot preset IDs) → `ShotStyleConfig[]` (concrete render params).

```ts
resolveShotStyles(assignments, shots, presets) → ShotStyleConfig[]
```

Each `ShotStyleConfig` contains:
- `shotIndex`, `startTime`, `endTime`
- `captionStyle` (nullable) — animation, colors, font
- `zoom` (nullable) — mode, intensity, interval
- `colorGrade` (nullable)
- `transitionIn/transitionOut` (nullable)
- `brollMode` (nullable)

Used by: captions, auto-zoom, color-grade, shot-transition features via `job.shotStyleConfigs`.

---

## Captions System (`src/main/captions.ts`)

Generates ASS (Advanced SubStation Alpha) subtitle files from word-level timestamps.

### 10 Animation Types
1. **`captions-ai`** — Signature style: normal=gentle fade, emphasis=POP snap, supersize=MASSIVE hold
2. **`karaoke-fill`** — Words fill with highlight color using `\kf` tags
3. **`word-pop`** — Words appear at timestamp with scale-up effect (`\fscx`/`\fscy`)
4. **`fade-in`** — Sequential alpha fade per word
5. **`glow`** — Active word gets colored border glow (`\3c` + `\bord`)
6. **`word-box`** — Per-word positioned dialogue events with BorderStyle=3 opaque boxes
7. **`elastic-bounce`** — Spring overshoot animation (oversized → undershoot → overshoot → settle)
8. **`typewriter`** — Per-character reveal, timing derived from word duration
9. **`impact-two`** — Two-line layout: small context words above + MASSIVE key word below
10. **`cascade`** — Wave motion: words float up from below with stagger delay using `\move`

### Emphasis System
Three levels: `normal`, `emphasis`, `supersize`
- **emphasis**: 125% font size, emphasisColor
- **supersize**: 160% font size, bold, supersizeColor (default gold #FFD700)
- Applied via inline ASS override tags (`\fs`, `\1c`, `\b1`, `\r`)

### Per-Shot Style Switching
`shotOverrides` parameter → each word group's effective style determined by shot time range containing group midpoint. Creates separate ASS Style entries per animation.

---

## Auto-Zoom System (`src/main/auto-zoom.ts`)

Generates FFmpeg `crop+scale` filter strings with time-based expressions.

### 3 Zoom Modes
1. **`ken-burns`** — Cosine-wave breathing zoom. `z(t) = 1 + A*(0.5 + 0.5*cos(2πt/T))`. Optional horizontal drift (sine, quarter-phase offset).
2. **`reactive`** — Keyframe-driven. Piecewise-linear segments: ramp-in → hold → ramp-out per emphasis word. Uses nested `if(between(t,...))` expressions.
3. **`jump-cut`** — Step-function zoom simulating multi-camera. Cuts aligned to sentence boundaries when word timestamps available. Alternates wide (1.0) and punched-in.

### Intensity Levels
- `subtle`: ±5% zoom, no pan
- `medium`: ±9% zoom, gentle horizontal drift
- `dynamic`: ±13% zoom, noticeable drift

### Implementation
Uses `crop` filter with evaluated expressions (not `zoompan`) for performance. Face-tracking Y with abs()-based clamp (avoids commas for Windows compatibility). Deterministic PRNG for jump-cut randomness.

### Piecewise Per-Shot Zoom
`generatePiecewiseZoomFilter()` composites different zoom modes per shot using nested `if(between(t,s,e), ...)` for each crop parameter.

---

## Overlay Execution (`overlay-runner.ts`)

Each overlay pass is a separate FFmpeg process. Two modes:
- `applyFilterPass()` — simple `-vf` filter
- `applyFilterComplexPass()` — `-filter_complex` with `[0:v]→[outv]` mapping

Multi-pass runner chains passes with temp files, uses CRF 15 ultrafast for minimal generation loss. Supports GPU→software fallback on session exhaustion.

---

## Base Render (`base-render.ts`)

Three code paths:
1. **Sound design path**: `filter_complex` with video + audio nodes + optional logo
2. **Logo-only path**: `filter_complex` with 2 inputs (video + logo)
3. **Simple path**: just `-vf` with crop+scale+zoom

After base encode: optional bumper concat → overlay passes → post-process.

---

## Pipeline Execution Flow (per clip)

```
1. Get source video metadata (ffprobe, cached)
2. FOR each feature: feature.prepare(job, batchOptions)
   - May mutate job (paths, timestamps, config)
   - Returns temp files for cleanup
3. Re-fetch metadata if source changed (filler removal)
4. Build base videoFilter: crop + scale
5. FOR each feature: videoFilter += feature.videoFilter(job, filterContext)
6. Collect overlaySteps: FOR each feature: overlayPass(job, overlayContext)
7. renderClip(job, outputPath, videoFilter, ..., overlaySteps)
   - Base FFmpeg encode (one of 3 paths)
   - Bumper concat
   - Run overlay passes sequentially
8. FOR each feature: feature.postProcess(job, renderedPath, context)
9. Cleanup temp files
```

Supports concurrent rendering (up to 4 workers for CPU, 2 for GPU encoders).

---

## Key Files

| File | Purpose |
|------|---------|
| `render/pipeline.ts` | Orchestrator, feature registration, batch render loop |
| `render/features/feature.ts` | `RenderFeature` interface + context types |
| `render/features/*.feature.ts` | Individual feature implementations |
| `render/base-render.ts` | Core FFmpeg encoding (3 paths) |
| `render/overlay-runner.ts` | Multi-pass FFmpeg overlay execution |
| `render/shot-style-resolver.ts` | Per-shot preset → concrete config resolution |
| `render/types.ts` | `RenderClipJob`, `RenderBatchOptions`, re-exports |
| `render/helpers.ts` | ASS helpers, path escaping |
| `render/quality.ts` | CRF/preset resolution |
| `render/bumpers.ts` | Intro/outro bumper concatenation |
| `render/stitched-render.ts` | Multi-segment clip rendering |
| `captions.ts` | ASS subtitle document generation (10 animations) |
| `auto-zoom.ts` | Zoom filter expression generation (3 modes) |
| `word-emphasis.ts` | Heuristic emphasis analysis |
| `color-grade.ts` | Color grade filter generation |
| `shot-transitions.ts` | Shot transition filter generation |
