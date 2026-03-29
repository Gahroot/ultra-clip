# Type System Exploration

## File Map

| File | Role |
|------|------|
| `src/shared/types.ts` | IPC-boundary types shared between main & renderer |
| `src/renderer/src/store/types.ts` | UI/store types — full AppState, ClipCandidate, CaptionStyle, settings interfaces, EditStylePreset |
| `src/renderer/src/store/helpers.ts` | Default values, CAPTION_PRESETS, BUILT_IN_EDIT_STYLE_PRESETS ref |
| `src/renderer/src/store/edit-style-presets.ts` | Curated built-in EditStylePreset[] definitions |
| `src/main/render/types.ts` | RenderBatchOptions, RenderClipJob — render pipeline input shapes |
| `src/main/render/shot-style-resolver.ts` | StylePresetForResolution, resolveShotStyles() |
| `src/main/captions.ts` | CaptionStyleInput (render-side caption config) |
| `src/main/auto-zoom.ts` | ZoomSettings (main-side), EmphasisKeyframe |
| `src/main/broll-placement.ts` | BRollDisplayMode, BRollTransition, BRollPlacement, BRollSettings |

---

## ShotStyleConfig (shared/types.ts:482–519)

Resolved per-shot rendering parameters — concrete values ready for FFmpeg.

```ts
interface ShotStyleConfig {
  shotIndex: number              // 0-based index into clip.shots
  startTime: number              // clip-relative seconds
  endTime: number                // clip-relative seconds
  captionStyle?: {               // null = use global
    animation: CaptionAnimation
    primaryColor: string
    highlightColor: string
    outlineColor: string
    emphasisColor?: string
    supersizeColor?: string
    fontSize: number
    outline: number
    shadow: number
    borderStyle: number
    wordsPerLine: number
    fontName: string
    backColor: string
  } | null
  zoom?: {                       // null = use global
    mode: ZoomMode
    intensity: ZoomIntensity
    intervalSeconds: number
  } | null
  colorGrade?: ColorGradeConfig | null
  transitionIn?: ShotTransitionConfig | null
  transitionOut?: ShotTransitionConfig | null
  brollMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip' | null
}
```

**Built by:** `resolveShotStyles()` in `src/main/render/shot-style-resolver.ts`  
**Consumed by:** `RenderClipJob.shotStyleConfigs` — render features read this for piecewise style.

---

## ShotStyleAssignment (shared/types.ts:464–473)

Raw user assignment — maps a shot index to a style preset ID.

```ts
interface ShotStyleAssignment {
  shotIndex: number    // 0-based into clip's shots array
  presetId: string     // ID of EditStylePreset from store
}
```

**Stored on:** `ClipCandidate.shotStyles`  
**Resolved to:** `ShotStyleConfig[]` by `resolveShotStyles()` at IPC time.  
**Unassigned shots:** fall back to global batch style.

---

## ShotSegment (shared/types.ts:274–289)

A 4–6 second "shot" — a coherent visual thought unit within a clip.

```ts
type ShotBreakReason = 'sentence-end' | 'pause' | 'clause-boundary' | 'topic-shift' | 'max-duration' | 'start' | 'end'

interface ShotSegment {
  startTime: number        // clip-relative (0 = clip start)
  endTime: number
  text: string
  startWordIndex: number   // index into clip's wordTimestamps
  endWordIndex: number     // exclusive end index
  breakReason: ShotBreakReason
  confidence: number       // 0–1, higher = more natural break
}

interface ShotSegmentationResult {
  shots: ShotSegment[]
  shotCount: number
  avgDuration: number
}
```

**Stored on:** `ClipCandidate.shots`  
**Used by:** shot-style resolution, per-shot rendering, AI edit plans.

---

## ClipCandidate (renderer/src/store/types.ts:164–212)

The central UI-side clip entity. Contains everything about a discovered clip.

```ts
interface ClipCandidate {
  id: string
  sourceId: string
  startTime: number
  endTime: number
  duration: number
  text: string
  score: number                           // 0–100 viral score
  originalScore?: number                  // immutable first score
  hookText: string
  reasoning: string
  status: 'pending' | 'approved' | 'rejected'
  cropRegion?: CropRegion
  thumbnail?: string
  customThumbnail?: string
  wordTimestamps?: WordTimestamp[]
  loopScore?: number
  loopStrategy?: string
  loopOptimized?: boolean
  crossfadeDuration?: number
  variants?: ClipVariantUI[]
  partInfo?: PartInfoUI
  overrides?: ClipRenderSettings          // per-clip feature toggles
  aiStartTime?: number                    // original AI boundaries (immutable)
  aiEndTime?: number
  aiEditPlan?: AIEditPlan                 // from shared/types
  shots?: ShotSegment[]                   // from shared/types
  shotStyles?: ShotStyleAssignment[]      // from shared/types
}
```

**NOTE:** This is a **renderer-only** type. The shared/types.ts has `CuriosityClipCandidate` (a lightweight subset for AI analysis). There is NO `ClipCandidate` in shared/types or main — the main process receives data via `RenderClipJob`.

**Stored in:** `AppState.clips: Record<string, ClipCandidate[]>` (keyed by sourceId)

---

## CaptionStyle (renderer/src/store/types.ts:246–265)

UI-side caption appearance configuration. Used in settings and style presets.

```ts
interface CaptionStyle {
  id: string
  label: string
  fontName: string
  fontFile: string
  fontSize: number            // fraction of frame height, e.g. 0.07
  primaryColor: string        // hex
  highlightColor: string      // hex
  outlineColor: string        // hex
  backColor: string           // hex with optional alpha
  outline: number
  shadow: number
  borderStyle: number         // 1 = outline+shadow, 3 = opaque box
  wordsPerLine: number
  animation: CaptionAnimation
  emphasisColor?: string      // for emphasis-level words
  supersizeColor?: string     // for supersize-level words, defaults '#FFD700'
}
```

**Stored in:** `AppSettings.captionStyle`  
**Presets:** 7 built-in presets in `CAPTION_PRESETS` (helpers.ts):
- `captions-ai`, `hormozi-bold`, `tiktok-glow`, `reels-clean`, `clarity-boxes`, `classic-karaoke`, `impact-two`

### CaptionStyleInput (main/captions.ts:12–28)

The **render-side** caption config — nearly identical but lacks `id`, `label`, `fontFile`.

```ts
interface CaptionStyleInput {
  fontName: string
  fontSize: number
  primaryColor: string
  highlightColor: string
  outlineColor: string
  backColor: string
  outline: number
  shadow: number
  borderStyle: number
  wordsPerLine: number
  animation: CaptionAnimation
  emphasisColor?: string
  supersizeColor?: string
}
```

**Used in:** `RenderBatchOptions.captionStyle`, `RenderStitchedClipJob.captionStyle`

### CaptionAnimation (shared/types.ts:159)

```ts
type CaptionAnimation = 'captions-ai' | 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow' | 'word-box' | 'elastic-bounce' | 'typewriter' | 'impact-two' | 'cascade'
```

### ShotCaptionOverride (main/captions.ts:47–54)

Per-shot caption style override for time-ranged ASS generation:

```ts
interface ShotCaptionOverride {
  startTime: number       // clip-relative
  endTime: number         // clip-relative
  style: CaptionStyleInput
}
```

---

## BRollDisplayMode

Defined in **two** identical places (duplicated):
- `src/main/broll-placement.ts:5` — canonical for main process
- `src/renderer/src/store/types.ts:421` — canonical for renderer

```ts
type BRollDisplayMode = 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
type BRollTransition = 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
```

**Also used in:** `ShotStyleConfig.brollMode`, `AIEditPlanBRollSuggestion.displayMode`, `RenderBatchOptions.broll.displayMode`, `EditStyleBRoll.displayMode`

---

## ZoomSettings

Defined in **two** identical places (duplicated):
- `src/main/auto-zoom.ts:20–42` — canonical for main/render
- `src/renderer/src/store/types.ts:304–326` — canonical for renderer/store

```ts
interface ZoomSettings {
  enabled: boolean
  mode: ZoomMode           // 'ken-burns' | 'reactive' | 'jump-cut'
  intensity: ZoomIntensity // 'subtle' | 'medium' | 'dynamic'
  intervalSeconds: number  // default 4 (full cycle every 8s)
}
```

**Defaults:** `{ enabled: false, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 }`

### EmphasisKeyframe (main/auto-zoom.ts:55–62)

```ts
interface EmphasisKeyframe {
  time: number     // clip-relative start seconds
  end: number      // clip-relative end seconds
  level: 'emphasis' | 'supersize'
}
```

---

## RenderBatchOptions (main/render/types.ts:320–470)

Top-level batch render configuration — sent from renderer to main via IPC.

```ts
interface RenderBatchOptions {
  jobs: RenderClipJob[]
  outputDirectory: string
  soundDesign?: SoundDesignOptions
  autoZoom?: ZoomSettings
  brandKit?: { enabled, logoPath, logoPosition, logoScale, logoOpacity, introBumperPath, outroBumperPath }
  hookTitleOverlay?: HookTitleConfig
  rehookOverlay?: RehookConfig
  progressBarOverlay?: ProgressBarConfig
  fillerRemoval?: FillerDetectionSettings & { enabled: boolean }
  captionStyle?: CaptionStyleInput
  captionsEnabled?: boolean
  broll?: { enabled, pexelsApiKey, intervalSeconds, clipDuration, displayMode: BRollDisplayMode, transition: BRollTransition, pipSize, pipPosition }
  sourceMeta?: { name, path, duration }
  developerMode?: boolean
  renderConcurrency?: number           // 1–4
  renderQuality?: { preset, customCrf, outputResolution, outputFormat, encodingPreset }
  outputAspectRatio?: OutputAspectRatio
  templateLayout?: { titleText: {x,y}, subtitles: {x,y}, rehookText: {x,y} }
  filenameTemplate?: string
  stylePresets?: Array<{               // for per-shot style resolution
    id: string
    captions: { enabled, style: { animation, primaryColor, highlightColor, outlineColor, emphasisColor?, supersizeColor?, fontSize, outline, shadow, borderStyle, wordsPerLine, fontName, backColor } }
    zoom: { enabled, mode, intensity, intervalSeconds }
    colorGrade?: ColorGradeConfig
    transitionIn?: ShotTransitionConfig
    transitionOut?: ShotTransitionConfig
    brollMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
  }>
}
```

**Key note:** `stylePresets` on RenderBatchOptions is a **serialized** subset of `EditStylePreset` — only the render-relevant fields, with direct `import()` type references to `@shared/types`.

---

## RenderClipJob (main/render/types.ts:56–282)

Per-clip job configuration within a batch. Massive interface.

Key fields:
- `clipId`, `sourceVideoPath`, `startTime`, `endTime`, `cropRegion?`
- `assFilePath?` — pre-generated ASS subtitle file
- `outputFileName?`
- `wordTimestamps?` — for sound design (source-relative)
- `soundPlacements?` — pre-computed SFX placements
- `brandKit?` — BrandKitRenderOptions
- `hookTitleText?`, `hookTitleConfig?` — hook overlay
- `rehookText?`, `rehookConfig?`, `rehookAppearTime?` — mid-clip re-hook
- `progressBarConfig?`
- `description?` — ClipDescription for export
- `brollPlacements?` — BRollPlacement[]
- `emphasisKeyframes?` — EmphasisKeyframe[]
- `loopStrategy?`, `crossfadeDuration?`
- `clipOverrides?` — per-clip feature toggles
- `manifestMeta?` — { score, reasoning, transcriptText, loopScore? }
- `stitchedSegments?` — multi-segment stitched clips
- `wordEmphasisOverride?` — EmphasizedWord[] from AI edit plan
- `aiSfxSuggestions?` — Array<{ timestamp, type }>
- `brollSuggestions?` — Array<{ timestamp, duration, keyword, displayMode, transition }>
- `wordEmphasis?` — pre-computed emphasis (canonical source for captions/zoom/sound)
- `emphasisKeyframesInput?` — pre-computed for reactive zoom
- `editEvents?` — EditEvent[] for sound design
- `stylePresetId?` — informational
- **`shotStyleConfigs?: ShotStyleConfig[]`** — resolved per-shot styles
- `shotStyles?` — raw assignments (resolved to shotStyleConfigs by IPC handler)
- `shots?` — shot segmentation time ranges

---

## EditStylePreset (renderer/src/store/types.ts:703–739)

Complete named creative style for one-click application.

```ts
type EditStyleCategory = 'viral' | 'educational' | 'cinematic' | 'minimal' | 'branded' | 'custom'

interface EditStylePreset {
  id: string                  // slug for built-in, UUID for user-created
  name: string
  description: string
  thumbnail: string           // emoji for built-in, base64/path for custom
  category: EditStyleCategory
  tags?: string[]
  builtIn: boolean
  captions: EditStyleCaptions
  zoom: EditStyleZoom
  broll: EditStyleBRoll
  sound: EditStyleSound
  overlays: EditStyleOverlays
}
```

### Sub-interfaces:

- **EditStyleCaptions** — `{ enabled, style: CaptionStyle }`
- **EditStyleZoom** — `{ enabled, mode: ZoomMode, intensity: ZoomIntensity, intervalSeconds }`
- **EditStyleBRoll** — `{ enabled, displayMode: BRollDisplayMode, transition: BRollTransition, pipSize, pipPosition, intervalSeconds, clipDuration }`
- **EditStyleSound** — `{ enabled, sfxStyle: SFXStyle, backgroundMusicTrack, sfxVolume, musicVolume, musicDucking, musicDuckLevel }`
- **EditStyleOverlays** — `{ hookTitle: EditStyleHookTitle, rehook: EditStyleRehook, progressBar: EditStyleProgressBar }`
  - EditStyleHookTitle: `{ enabled, style, displayDuration, fontSize, textColor, outlineColor, outlineWidth }`
  - EditStyleRehook: `{ enabled, style, displayDuration }`
  - EditStyleProgressBar: `{ enabled, style, position, height, color, opacity }`

**Built-in presets defined in:** `src/renderer/src/store/edit-style-presets.ts` (EDIT_STYLE_PRESETS array)  
**Applied via:** `applyEditStylePresetToSettings()` in helpers.ts — copies preset values onto AppSettings.

---

## StylePresetForResolution (main/render/shot-style-resolver.ts:55–63)

Minimal preset shape needed by the main process to resolve shot styles — avoids importing renderer types.

```ts
interface StylePresetForResolution {
  id: string
  captions: { enabled: boolean; style: { animation, primaryColor, highlightColor, outlineColor, emphasisColor?, supersizeColor?, fontSize, outline, shadow, borderStyle, wordsPerLine, fontName, backColor } }
  zoom: { enabled: boolean; mode: ZoomMode; intensity: ZoomIntensity; intervalSeconds: number }
  colorGrade?: ColorGradeConfig
  transitionIn?: ShotTransitionConfig
  transitionOut?: ShotTransitionConfig
  brollMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
}
```

---

## ColorGradeConfig & ShotTransitionConfig (shared/types.ts)

```ts
type ColorGradePreset = 'none' | 'warm' | 'cool' | 'cinematic' | 'vintage' | 'high-contrast' | 'bw' | 'film'

interface ColorGradeConfig {
  preset: ColorGradePreset
  brightness?: number   // -1.0 to 1.0
  contrast?: number     // 0.0 to 3.0
  saturation?: number   // 0.0 to 3.0
}

type ShotTransitionType = 'none' | 'crossfade' | 'dip-black' | 'swipe-left' | 'swipe-up' | 'zoom-in'

interface ShotTransitionConfig {
  type: ShotTransitionType
  duration?: number     // 0.15–1.0 seconds, default 0.3
}
```

---

## Word Emphasis Types (shared/types.ts)

```ts
type EmphasisLevel = 'normal' | 'emphasis' | 'supersize'

interface EmphasizedWord {
  text: string
  start: number    // seconds
  end: number      // seconds
  emphasis: EmphasisLevel
}

interface WordEmphasisResult {
  words: EmphasizedWord[]
  usedAI: boolean
}
```

---

## SettingsProfile (renderer/src/store/types.ts:512–529)

Snapshot of all render-related settings — used for settings lock, save/load profiles.

```ts
interface SettingsProfile {
  captionStyle: CaptionStyle
  captionsEnabled: boolean
  soundDesign: SoundDesignSettings
  autoZoom: ZoomSettings
  brandKit: BrandKit
  hookTitleOverlay: HookTitleOverlaySettings
  rehookOverlay: RehookOverlaySettings
  progressBarOverlay: ProgressBarOverlaySettings
  broll: Omit<BRollSettings, 'pexelsApiKey'>
  fillerRemoval: FillerRemovalSettings
  renderQuality: RenderQualitySettings
  outputAspectRatio: OutputAspectRatio
  filenameTemplate: string
  renderConcurrency: number
  minScore: number
  enableNotifications: boolean
}
```

---

## Type Flow: Renderer → IPC → Main

```
ClipCandidate (store)
  ├── .shotStyles: ShotStyleAssignment[]     (user picks presets per shot)
  ├── .shots: ShotSegment[]                  (segmentation data)
  └── .aiEditPlan: AIEditPlan                (AI word emphasis + B-Roll + SFX)
           │
    [IPC handler: startBatchRender]
           │
           ▼
RenderBatchOptions
  ├── .stylePresets: serialized EditStylePreset subset
  ├── .captionStyle: CaptionStyleInput
  ├── .autoZoom: ZoomSettings
  └── .jobs: RenderClipJob[]
              ├── .shotStyleConfigs: ShotStyleConfig[]   ← resolved by resolveShotStyles()
              ├── .wordEmphasis: EmphasizedWord[]
              ├── .brollSuggestions / .brollPlacements
              └── .emphasisKeyframes: EmphasisKeyframe[]
```

---

## Notable Duplications

1. **ZoomSettings** — defined identically in `main/auto-zoom.ts` and `renderer/src/store/types.ts`
2. **BRollDisplayMode / BRollTransition** — defined identically in `main/broll-placement.ts` and `renderer/src/store/types.ts`
3. **CaptionStyle vs CaptionStyleInput** — near-identical shapes; CaptionStyle has extra `id`, `label`, `fontFile` fields; CaptionStyleInput is the render-side subset
4. **EditStylePreset** (store) vs `stylePresets` on RenderBatchOptions (inline shape) vs `StylePresetForResolution` (shot-style-resolver) — three parallel shapes for the same concept at different boundaries
