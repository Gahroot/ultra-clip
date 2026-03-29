# Per-Shot Style System — Data Model + Render Logic

## Summary

Build the complete per-shot style variation system: expand the data model so each shot within a clip can have its own caption animation, zoom mode, color treatment, B-Roll behavior, and transition style. Then wire the rendering logic so the FFmpeg pipeline applies different style configurations to different time ranges within a single clip render.

## Current State (What Already Exists)

### Data Model (partial — captions + zoom only)
- `ShotStyleConfig` in `src/shared/types.ts:431-460` — has `captionStyle` and `zoom` fields
- `ShotStyleAssignment` in `src/shared/types.ts:413-422` — maps `shotIndex` → `presetId`
- `ShotSegment` in `src/shared/types.ts:274-289` — shot time ranges with break reasons
- `ClipCandidate.shots` and `ClipCandidate.shotStyles` in `src/renderer/src/store/types.ts:204-211`
- `RenderClipJob.shotStyleConfigs`, `.shotStyles`, `.shots` in `src/main/render/types.ts:253-279`
- `RenderBatchOptions.stylePresets` in `src/main/render/types.ts:431-463`

### Resolver (exists but NOT wired into IPC)
- `src/main/render/shot-style-resolver.ts` — `resolveShotStyles()` + `buildPresetLookup()`
- Only resolves `captionStyle` and `zoom` from presets

### Render Features (partial per-shot support)
- **Captions**: `src/main/render/features/captions.feature.ts` — `buildShotCaptionOverrides()` converts `ShotStyleConfig.captionStyle` → `ShotCaptionOverride[]` for ASS builder. **Working.**
- **Auto-Zoom**: `src/main/render/features/auto-zoom.feature.ts` — calls `generatePiecewiseZoomFilter()` when `shotStyleConfigs` with zoom overrides exist. **Working.**
- **Color Grade**: Does NOT exist anywhere
- **Transitions**: Does NOT exist (between shots)
- **B-Roll per-shot**: B-Roll currently applied globally in `postProcess` phase. No per-shot behavior.

### IPC Wiring
- `resolveShotStyles()` is NOT called anywhere in `src/main/index.ts`
- No IPC handler passes `shotStyleConfigs` to render jobs

## Implementation Plan

### Step 1: Expand Shared Types (`src/shared/types.ts`)

Add new types for color grading, transitions, and B-Roll per-shot behavior:

```typescript
// Color Treatment
export type ColorGradePreset =
  | 'none'           // No color treatment
  | 'warm'           // Warm golden tones (eq brightness=0.04, saturation=1.3, gamma_r=1.1)
  | 'cool'           // Cool blue-shifted (eq brightness=0.02, saturation=1.1, gamma_b=1.15)
  | 'cinematic'      // Desaturated, crushed blacks (eq contrast=1.2, saturation=0.8, brightness=-0.03)
  | 'vintage'        // Faded, lifted blacks (curves + desaturation)
  | 'high-contrast'  // Punchy, vivid (eq contrast=1.4, saturation=1.2)
  | 'bw'             // Black and white (hue s=0)
  | 'film'           // Film grain look (slight desaturation + warm shift)

export interface ColorGradeConfig {
  preset: ColorGradePreset
  /** Fine-tune brightness adjustment (-1.0 to 1.0). Default: 0 */
  brightness?: number
  /** Fine-tune contrast adjustment (0.0 to 3.0). Default: 1.0 */
  contrast?: number
  /** Fine-tune saturation adjustment (0.0 to 3.0). Default: 1.0 */
  saturation?: number
}

// Shot Transitions
export type ShotTransitionType =
  | 'none'         // Hard cut (no transition)
  | 'crossfade'    // Alpha dissolve between shots
  | 'dip-black'    // Fade to black then fade up
  | 'swipe-left'   // Horizontal wipe
  | 'swipe-up'     // Vertical wipe
  | 'zoom-in'      // Zoom transition into next shot

export interface ShotTransitionConfig {
  type: ShotTransitionType
  /** Transition duration in seconds (0.15–1.0). Default: 0.3 */
  duration?: number
}
```

Expand `ShotStyleConfig` to include:
```typescript
export interface ShotStyleConfig {
  shotIndex: number
  startTime: number
  endTime: number
  captionStyle?: { ... } | null
  zoom?: { ... } | null
  // NEW:
  /** Color treatment for this shot. `null` = use global. */
  colorGrade?: ColorGradeConfig | null
  /** Transition INTO this shot (from previous shot). `null` = hard cut. */
  transitionIn?: ShotTransitionConfig | null
  /** Transition OUT of this shot (to next shot). `null` = hard cut. */
  transitionOut?: ShotTransitionConfig | null
  /** B-Roll display mode override for this shot. `null` = use global. */
  brollMode?: import('./types').BRollDisplayMode | null
}
```

### Step 2: Add Color Grade Filter Builder (`src/main/color-grade.ts`)

New file. Generates FFmpeg `eq`/`hue`/`colorbalance` filter strings for each preset:

```typescript
export function buildColorGradeFilter(
  config: ColorGradeConfig,
  startTime: number,
  endTime: number
): string
// Returns: eq=brightness=...:contrast=...:saturation=...:enable='between(t,s,e)'
// or: hue=s=0:enable='between(t,s,e)' for B&W

export function buildPiecewiseColorGradeFilter(
  shots: ShotStyleConfig[],
  globalGrade?: ColorGradeConfig
): string
// Returns chained eq filters with enable expressions for each shot's time range
```

Each preset maps to concrete FFmpeg eq/hue/colorbalance parameters:
- `warm`: `eq=brightness=0.04:saturation=1.3:gamma_r=1.1:gamma_b=0.9`
- `cool`: `eq=brightness=0.02:saturation=1.1:gamma_r=0.9:gamma_b=1.15`
- `cinematic`: `eq=contrast=1.2:saturation=0.8:brightness=-0.03`
- `vintage`: `eq=contrast=0.9:saturation=0.7:brightness=0.06:gamma_r=1.05`
- `high-contrast`: `eq=contrast=1.4:saturation=1.2`
- `bw`: `hue=s=0`
- `film`: `eq=saturation=0.85:brightness=0.02:gamma_r=1.08:gamma_b=0.95`
- `none`: empty string

### Step 3: Add Shot Transition Builder (`src/main/shot-transitions.ts`)

New file. Generates FFmpeg filter expressions for transitions between shots:

```typescript
export function buildShotTransitionFilters(
  shots: ShotStyleConfig[],
  clipDuration: number
): string
// For crossfade/dip-black: uses fade filters with enable expressions
// For swipe: uses overlay with animated position
// For zoom-in: uses zoompan/crop animation at boundaries
```

Transitions are implemented as time-limited filter effects:
- `crossfade`: At the shot boundary, fade out the previous shot's last frames and fade in the next shot's first frames. In a single-encode pipeline, this means applying `fade=t=out:st=X:d=D` and `fade=t=in:st=X:d=D` at boundary points.
- `dip-black`: `fade=t=out:st=(boundary-dur/2):d=dur/2,fade=t=in:st=boundary:d=dur/2`
- `swipe-left/up`: Overlay-based position animation at the boundary
- `zoom-in`: Brief zoom push at the boundary using crop expressions

Since FFmpeg processes a single video stream, transitions between shots within the same clip are implemented as **overlay effects on the base video stream** using `enable='between(t,...)'` expressions. This avoids segment splitting.

### Step 4: Create Color Grade Render Feature (`src/main/render/features/color-grade.feature.ts`)

New render feature that plugs into the pipeline's `videoFilter()` phase:

```typescript
export const colorGradeFeature: RenderFeature = {
  name: 'color-grade',
  
  videoFilter(job, context): string | null {
    // When shotStyleConfigs have color grades, build piecewise filter
    // Otherwise check for global color grade on the batch options
    return buildPiecewiseColorGradeFilter(job.shotStyleConfigs, globalGrade)
  }
}
```

### Step 5: Create Shot Transition Render Feature (`src/main/render/features/shot-transition.feature.ts`)

New render feature for the `overlayPass()` phase (separate FFmpeg pass because transitions need complex filter_complex with multiple streams):

```typescript
export const shotTransitionFeature: RenderFeature = {
  name: 'shot-transition',
  
  overlayPass(job, context): OverlayPassResult | null {
    // Build transition filters for shot boundaries
    return { name: 'shot-transition', filter: ..., filterComplex: true }
  }
}
```

### Step 6: Expand Style Preset Types and Resolver

**`src/renderer/src/store/types.ts`** — expand `EditStylePreset`:
```typescript
export interface EditStylePreset {
  id: string
  name: string
  category: EditStyleCategory
  // existing: captions, zoom
  captions: { enabled: boolean; style: CaptionStyle }
  zoom: ZoomSettings
  // NEW:
  colorGrade?: ColorGradeConfig
  transitionIn?: ShotTransitionConfig
  transitionOut?: ShotTransitionConfig
  brollMode?: BRollDisplayMode
}
```

**`src/main/render/shot-style-resolver.ts`** — expand resolution:
```typescript
// Add colorGrade, transitionIn, transitionOut, brollMode to resolved config
configs.push({
  shotIndex: assignment.shotIndex,
  startTime: shot.startTime,
  endTime: shot.endTime,
  captionStyle: ...,
  zoom: ...,
  colorGrade: preset.colorGrade ?? null,
  transitionIn: preset.transitionIn ?? null,
  transitionOut: preset.transitionOut ?? null,
  brollMode: preset.brollMode ?? null,
})
```

**`src/main/render/types.ts`** — expand `RenderBatchOptions.stylePresets`:
Add `colorGrade`, `transitionIn`, `transitionOut`, `brollMode` to the preset shape.

### Step 7: Wire Into IPC Handler (`src/main/index.ts`)

Find the `render:startBatch` handler. Before calling `startBatchRender()`, resolve shot styles:

```typescript
import { resolveShotStyles, buildPresetLookup } from './render/shot-style-resolver'

// In the render:startBatch handler:
const presetMap = buildPresetLookup(options.stylePresets ?? [])
for (const job of options.jobs) {
  if (job.shotStyles && job.shots) {
    const shots = job.shots.map(s => ({
      startTime: s.startTime,
      endTime: s.endTime,
      text: '', startWordIndex: 0, endWordIndex: 0,
      breakReason: 'start' as const, confidence: 1
    }))
    job.shotStyleConfigs = resolveShotStyles(job.shotStyles, shots, presetMap)
  }
}
```

### Step 8: Register New Features in Pipeline (`src/main/render/pipeline.ts`)

Add the new features to the feature array in `startBatchRender()`:

```typescript
import { colorGradeFeature } from './features/color-grade.feature'
import { shotTransitionFeature } from './features/shot-transition.feature'

const features: RenderFeature[] = [
  createFillerRemovalFeature(),
  brandKitFeature,
  soundDesignFeature,
  createCaptionsFeature(),
  createHookTitleFeature(),
  createRehookFeature(),
  progressBarFeature,
  autoZoomFeature,
  colorGradeFeature,        // NEW — after zoom, before captions overlay
  shotTransitionFeature,     // NEW — applied as overlay pass
  brollFeature
]
```

### Step 9: Add Built-in Style Presets (`src/renderer/src/store/helpers.ts`)

Expand `BUILT_IN_EDIT_STYLE_PRESETS` with color grade and transition defaults for each preset (Velocity, Film, Clarity, etc.).

### Step 10: Tests

- `src/main/color-grade.test.ts` — unit tests for filter generation
- `src/main/shot-transitions.test.ts` — unit tests for transition filters
- `src/main/render/__tests__/shot-style-resolver.test.ts` — test expanded resolver
- Update `src/main/render/__tests__/features.test.ts` — test new features

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/main/color-grade.ts` | Color grade FFmpeg filter builder |
| `src/main/shot-transitions.ts` | Shot transition FFmpeg filter builder |
| `src/main/render/features/color-grade.feature.ts` | Color grade render feature |
| `src/main/render/features/shot-transition.feature.ts` | Shot transition render feature |
| `src/main/color-grade.test.ts` | Color grade unit tests |
| `src/main/shot-transitions.test.ts` | Shot transition unit tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/shared/types.ts` | Add `ColorGradePreset`, `ColorGradeConfig`, `ShotTransitionType`, `ShotTransitionConfig`; expand `ShotStyleConfig` |
| `src/main/render/types.ts` | Expand `RenderBatchOptions.stylePresets` shape; add color/transition imports |
| `src/main/render/shot-style-resolver.ts` | Resolve new fields (colorGrade, transition, brollMode) |
| `src/main/render/pipeline.ts` | Register `colorGradeFeature` and `shotTransitionFeature` |
| `src/main/index.ts` | Wire `resolveShotStyles()` into render:startBatch IPC handler |
| `src/renderer/src/store/types.ts` | Expand `EditStylePreset` with new fields |
| `src/renderer/src/store/helpers.ts` | Add color/transition defaults to built-in presets |

## Implementation Order (by dependency)

1. **Types first** — `src/shared/types.ts` (everything depends on these)
2. **Color grade builder** — `src/main/color-grade.ts` (standalone)
3. **Shot transition builder** — `src/main/shot-transitions.ts` (standalone)
4. **Render features** — `color-grade.feature.ts`, `shot-transition.feature.ts`
5. **Resolver expansion** — `shot-style-resolver.ts`
6. **Render types expansion** — `render/types.ts`
7. **Pipeline registration** — `pipeline.ts`
8. **IPC wiring** — `index.ts`
9. **Store types + presets** — `store/types.ts`, `store/helpers.ts`
10. **Tests**

## Risks

1. **FFmpeg expression complexity**: Piecewise `enable='between(t,...)'` filters for 8+ shots in a single clip could create very long filter chains. Mitigation: Each feature's filter is a separate expression segment, not nested.
2. **Transition rendering**: True crossfade transitions between shots within a single-pass encode require splitting the video into segments and using `xfade` filter, which is complex. Simpler approach: use `fade` + `overlay` which achieves 90% of the visual effect without segment splitting.
3. **Windows FFmpeg compatibility**: Comma escaping issues. Mitigation: Use the established `\\,` pattern and `between()` expressions per existing zoom/caption code.
4. **Per-shot B-Roll**: Currently B-Roll is a post-process pass. Per-shot B-Roll mode changes would need to be passed through to the B-Roll feature. This is lower priority — initial implementation can just pass the mode through to existing placement logic.

## Verification

1. `npx electron-vite build` — must compile without errors
2. `npm test` — all existing + new tests pass
3. Manual verification: Create a clip with 3+ shots, assign different presets to each, render, and confirm visual differences in the output
