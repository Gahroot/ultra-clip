# Audit Agent 5 — Segment-Based Editing Feature Conflict Analysis

## 1. ClipPreview.tsx — Full Breakdown

### File Stats
- **2,440 lines** — the largest UI component in the project
- Contains **5 sub-components** defined inline: `DualSlider`, `OverrideRow`, `CaptionStyleMiniThumb`, `StylePickerTabs`, and the main `ClipPreview`

### Props
```ts
interface ClipPreviewProps {
  clip: ClipCandidate
  sourceId: string
  sourcePath: string
  sourceDuration: number
  open: boolean
  onClose: () => void
}
```

### Store Hooks Used (from `useStore`)
- `updateClipTrim`, `updateClipHookText`, `setClipCustomThumbnail`
- `setClipOverride`, `clearClipOverrides`
- `rescoreClip`
- `setSingleRenderState`, `addError`
- `isRendering`, `singleRenderClipId`, `singleRenderProgress`, `singleRenderStatus`, `singleRenderOutputPath`
- `settings` (entire settings object)
- `hookTemplates`, `activeHookTemplateId`
- `toggleFillerRestore`
- `BUILT_IN_EDIT_STYLE_PRESETS` (imported constant, mapped for `stylePresetsForRender`)

### Local State (19 useState hooks)
| State | Type | Purpose |
|-------|------|---------|
| `localStart` | number | Pending trim in-point |
| `localEnd` | number | Pending trim out-point |
| `localHook` | string | Pending hook text edit |
| `localTemplateId` | string\|null | Hook template override |
| `editingHook` | boolean | Inline hook editing toggle |
| `isPlaying` | boolean | Video playback state |
| `currentTime` | number | Video scrub position |
| `showReasoning` | boolean | AI reasoning accordion |
| `showOverrides` | boolean | Override panel accordion |
| `viewMode` | 'source'\|'output' | Video crop view |
| `isRescoring` | boolean | Re-score loading |
| `rescoreError` | string\|null | Re-score error |
| `lastRescoreResult` | object\|null | Score comparison |
| `thumbnailCaptured` | boolean | Thumbnail flash feedback |
| `previewPath` | string\|null | Rendered overlay preview |
| `previewLoading` | boolean | Preview render loading |
| `previewError` | string\|null | Preview error |
| `showPreview` | boolean | Toggle overlay preview mode |
| `origStart`/`origEnd` | number | Immutable original boundaries |

Plus: `videoRef`, `videoDims`, `waveformData`, `waveformLoading`

### Render Structure (top → bottom in JSX)
1. **Dialog** (`<Dialog>` wrapping `<DialogContent>` — max-w-2xl, scrollable)
2. **DialogHeader** — Score badge + inline-editable hook text + copy button + template selector
3. **View Mode Toggle Bar** — 3-button toggle: Source 16:9 / Output 9:16 / With Overlays
4. **Video Player** — Single `<video>` element with CSS crop per view mode, overlay preview mode, crop region overlay on source view, play/pause button, time overlay
5. **Overlay Pills** — Shows which overlays are active when in preview mode, re-render button
6. **Thumbnail Capture Toolbar** — "Set as Thumbnail" button + reset
7. **Trim Controls Section** — Waveform display, DualSlider, editable in/out times, play/pause + re-score buttons, keyboard shortcut hints, boundary change warnings, re-score result
8. **Info Panel** — AI reasoning (collapsible), word timestamps (clickable, filler segments with right-click restore), transcript copy, "Copy for Social Media"
9. **Override Settings** (collapsible accordion) — Layout picker (Default Crop / Blur Background), Accent Color picker, 6× OverrideRow toggles (Captions, Hook Title, Progress Bar, Auto-Zoom, Sound Design, Brand Kit), "Clear all overrides"
10. **StylePickerTabs** (collapsible accordion) — Two tabs: "AI Edit Styles" (premium presets horizontal scroll + variant grid) and "Captions Only" (60 caption preset grid)
11. **Actions Footer** — Render progress bar (when active), render-done link, Reset to Original, Render This Clip, Cancel, Apply Changes

### Keyboard Shortcuts (global when dialog open)
- `Space` → play/pause
- `←/→` → ±5s seek (±1s with Shift)
- `I/O` → set in/out point to current time
- `1-9` → apply first 9 premium style presets
- `C` → switch to Captions tab
- `S` → switch to Styles tab
- `R` → mark clip as ready (approved)
- `N/P` → navigate to next/prev clip
- `Delete` → clear active style preset

### Conflicts for Segment Editor
| Issue | Severity | Detail |
|-------|----------|--------|
| **Single-clip trim model** | 🔴 Critical | All trim state (`localStart`, `localEnd`, `origStart`, `origEnd`) is clip-level. Segments need per-segment start/end within the clip. |
| **Single video playback** | 🔴 Critical | One `<video>` element plays the whole clip. Segment editing needs playback constrained to active segment, with segment boundary indicators. |
| **Flat override model** | 🟠 Major | `ClipRenderSettings` overrides are clip-level. Per-segment overrides (layout, zoom, caption style) would require a different data structure (`overrides[segmentIndex]`). |
| **Style picker is clip-global** | 🟠 Major | `StylePickerTabs` applies one style to the entire clip. Per-segment styles need: (a) segment selection, (b) style applied per-segment. |
| **Layout is narrow modal** | 🟠 Major | Dialog is `max-w-2xl` (~672px) with vertical scroll. Segment editor needs a wider layout: video center + timeline bottom + sidebar right. Should become full-screen or near-full-screen panel. |
| **Waveform is clip-wide** | 🟡 Moderate | Waveform shows the full trim range. Segment boundaries need to be overlaid on the waveform as segment markers. |
| **Preview render is clip-level** | 🟡 Moderate | `handlePreviewWithOverlays` renders the entire clip. Per-segment preview needs segment-scoped rendering. |
| **Keyboard shortcuts** | 🟡 Moderate | N/P navigate between clips. Need additional shortcuts to navigate between segments within a clip. |
| **No segment state** | 🔴 Critical | Zero segment-related state exists. Need: `segments[]`, `activeSegmentIndex`, per-segment style assignments. |

---

## 2. ClipCard.tsx — Analysis

### File Stats
- **1,072 lines** — a card component shown in the clip grid

### AI Edit / Edit Plan References
- Imports and uses `setClipAIEditPlan`, `clearClipAIEditPlan` from store
- Shows an "AI Edit" badge when `clip.aiEditPlan` exists (line 670-689)
- `handleGenerateEditPlan` callback generates edit plan via `window.api.generateEditPlan()` (line 267-308)
- Shows `showEditPlanPanel` toggle but **no edit plan detail panel is rendered in this file** — it just stores the flag
- Resolves `activeStylePresetId` to pass to `generateEditPlan` for prompt calibration

### Edit Style Info Shown
- No direct style info shown on the card itself
- Override indicator badge shows when `clip.overrides` has keys (layout, accent color, feature toggles)
- Loop badge shows `clip.loopScore`
- AI Edit badge shows emphasis count, B-Roll suggestion count, SFX count

### Changes Needed for Segment Awareness
| Change | Detail |
|--------|--------|
| **Segment count badge** | Show "N segments" badge next to duration, similar to AI Edit badge |
| **Segment thumbnails** | Could show segment strip preview on card hover |
| **ClipPreview invocation** | Currently opens ClipPreview as-is. Would need to open the segment editor instead |
| **Single-clip render** | `handleRenderSingleClip` builds a single `job` object. Would need to include segment data (shotStyles, shots) in the job |
| **AI Edit Plan** | Already generates edit plans — these could be the source of segment data. The `generateEditPlan` handler returns emphasis + B-Roll + SFX, which maps to segment concepts |

---

## 3. SettingsPanel.tsx — Analysis

### File Stats
- **3,806 lines** — the largest file in the project

### Settings Related to Captions/Editing/Styles
Organized by section key (`SectionKey` type):
- `captions` — captionStyle (60 presets), animation, fontSize, fontName, colors, outline, wordsPerLine, position, emphasis colors/scale, supersize colors/scale, word-box settings
- `soundDesign` — enabled, music track, volume, SFX style
- `autoZoom` — enabled, mode (ken-burns | jump-cut), intensity, interval
- `hookTitle` — enabled, style, position, duration
- `rehook` — enabled, style, timing
- `progressBar` — enabled, style, position, color
- `broll` — enabled, Pexels API key, source mode (stock | ai-generated | auto), interval, clip duration, display mode, transition, PIP size/position
- `aiSettings` — Gemini API key
- `renderQuality` — resolution, format, quality preset, encoding preset, aspect ratio
- `brandKit` — logo, intro/outro bumpers
- `fillerRemoval` — filler detection settings

### Pexels API Key Location
Already exists at **line 1694-1771** inside the B-Roll section. It has:
- Input field with show/hide toggle
- Test validation button
- Link to pexels.com/api
- Validation state display

### Global vs Per-Segment Conflicts
| Global Setting | Conflict | Resolution |
|----------------|----------|------------|
| `captionStyle` | One style for all clips/segments | Per-segment caption style override needed |
| `autoZoom` mode/intensity | One zoom config globally | Per-segment zoom intensity, or at minimum per-segment zoom enable/disable |
| `broll` settings | Global B-Roll intervals | Per-segment B-Roll placement (already partially supported via `brollSuggestions` in AI edit plan) |
| `soundDesign` | Global SFX style | Per-segment SFX suggestions (already in AI edit plan) |
| `captionsEnabled` | Global toggle | Per-segment caption enable — needed for segments where you might want no captions |
| Layout (blur-background etc.) | Per-clip override exists | Extend to per-segment layout override |

**Key finding**: The AI Edit Plan (`generateEditPlan`) already produces per-word emphasis, B-Roll suggestions, and SFX suggestions — this is the natural data source for segment-level editing. The gap is that there's no UI to view/edit these at the segment level.

---

## 4. ProcessingPanel.tsx — Analysis

### File Stats
- **930 lines**

### How Render Progress is Shown
- ProcessingPanel shows a **pipeline of discrete steps** (Download → Transcribe → Score → Loop Optimize → Variants → Stitching → AI Edit → Face Detection → Review)
- Each step has a `StepRow` component with: icon, label, status indicator, progress percentage, ETA text
- Progress is shown via a `<Progress>` bar component (0-100)
- The **rendering step is NOT shown in ProcessingPanel** — rendering happens after the pipeline, triggered from the clip grid / batch render flow
- Render progress is tracked separately via `isRendering`, `renderProgress`, `renderingClipId` in the store, shown inline on `ClipCard` and `ClipPreview`

### Per-Segment Progress Capability
- The pipeline step model (`PipelineStage`) is a flat list — no nesting
- Render progress events emit `clipId` + `percent` per clip
- **For per-segment progress**: Would need `RENDER_CLIP_PROGRESS` events to include `segmentIndex` or the pipeline to show segment-level sub-steps
- The `RENDER_CLIP_PREPARE` event already has `message` and `percent` fields that could convey segment prep status

### Changes Needed
| Change | Detail |
|--------|--------|
| **AI Edit step** | Already exists as `aiEditOnly` pipeline step. Could show per-clip segment generation progress |
| **Render progress** | Would need segment index in progress events. UI could show "Rendering clip X, segment 3/6" |
| **Sub-step model** | Current flat step list doesn't support nested progress. Could add segment sub-rows under the active render step |

---

## 5. IPC Handler Inventory — Complete

### Main Entry (src/main/index.ts)
Registers 7 handler modules + settings window handlers:
```
registerFfmpegHandlers()
registerAiHandlers()
registerRenderHandlers()
registerProjectHandlers()
registerSystemHandlers()
registerMediaHandlers()
registerExportHandlers()
registerSettingsWindowHandlers(mainWindow)
```

### render-handlers.ts (669 lines, 19 handlers)
| Handler | Channel | Purpose |
|---------|---------|---------|
| `RENDER_START_BATCH` | invoke | **Core render entry** — Phase 1: B-Roll generation, Phase 1.5: Shot style resolution, Phase 2: Sound design, then calls `startBatchRender()` |
| `RENDER_CANCEL` | invoke | Cancel active render |
| `RENDER_PREVIEW` | invoke | Fast low-quality preview render (540×960) |
| `RENDER_CLEANUP_PREVIEW` | invoke | Delete preview temp file |
| `LAYOUT_BUILD_BLUR_BACKGROUND` | invoke | Build blur-background FFmpeg filter |
| `LAYOUT_BUILD_SPLIT_SCREEN` | invoke | Build split-screen FFmpeg filter |
| `LOOP_ANALYZE_LOOP_POTENTIAL` | invoke | Analyze loop potential with AI |
| `LOOP_OPTIMIZE_FOR_LOOP` | invoke | Apply loop optimization |
| `LOOP_BUILD_CROSSFADE_FILTER` | invoke | Build crossfade FFmpeg filter |
| `LOOP_SCORE_LOOP_QUALITY` | invoke | Composite loop quality score |
| `VARIANTS_GENERATE` | invoke | Generate A/B/C clip variants |
| `VARIANTS_BUILD_RENDER_CONFIGS` | invoke | Convert variants to render configs |
| `VARIANTS_GENERATE_LABELS` | invoke | Generate variant UI labels |
| `STORYARC_DETECT` | invoke | Detect multi-clip story arcs |
| `STORYARC_GENERATE_SERIES_METADATA` | invoke | Series metadata from arc |
| `STORYARC_BUILD_PART_NUMBER_FILTER` | invoke | Part N/M badge FFmpeg filter |
| `STORYARC_BUILD_END_CARD_FILTER` | invoke | End card overlay FFmpeg filter |
| `STITCH_GENERATE_COMPOSITE_CLIPS` | invoke | Generate composite stitched clips |
| `EXPORT_GENERATE_MANIFEST` | invoke | Export manifest.json + manifest.csv |

#### RENDER_START_BATCH Deep Dive
```
Input: RenderBatchOptions {
  jobs: RenderClipJob[]        // Array of clips to render
  outputDirectory: string
  soundDesign?: SoundDesignConfig
  autoZoom?: AutoZoomConfig
  brandKit?: BrandKitConfig
  hookTitleOverlay?: HookTitleConfig
  rehookOverlay?: RehookConfig
  progressBarOverlay?: ProgressBarConfig
  captionsEnabled?: boolean
  captionStyle?: CaptionStyle
  broll?: BRollConfig
  geminiApiKey?: string
  stylePresets?: StylePresetForResolution[]  // ← KEY for segments
  styleCategory?: string
}

Each RenderClipJob: {
  clipId, sourceVideoPath, startTime, endTime,
  cropRegion?, wordTimestamps?, hookTitleText?,
  clipOverrides?: ClipRenderSettings,
  precomputedFillerSegments?,
  brollPlacements?, brollSuggestions?,
  wordEmphasis?, editEvents?, aiSfxSuggestions?,
  shotStyles?,        // ← Per-shot style preset IDs (already exists!)
  shots?,             // ← Shot segments (already exists!)
  shotStyleConfigs?,  // ← Resolved style configs (populated by Phase 1.5)
  soundPlacements?
}
```

**Critical finding**: `RenderClipJob` already has `shotStyles` and `shots` fields! Phase 1.5 in `RENDER_START_BATCH` already resolves per-shot style assignments using `resolveShotStyles()` from `render/shot-style-resolver.ts`. This means **the render pipeline already supports per-segment styles** — it's the UI that's missing.

### ai-handlers.ts (380 lines, 22 handlers)
| Handler | Channel | Purpose |
|---------|---------|---------|
| `AI_SCORE_TRANSCRIPT` | invoke | Score transcript segments for viral potential |
| `AI_GENERATE_HOOK_TEXT` | invoke | Generate hook text for a clip |
| `AI_GENERATE_REHOOK_TEXT` | invoke | Generate re-hook / pattern interrupt text |
| `AI_RESCORE_SINGLE_CLIP` | invoke | Re-score a single clip after user edits |
| `AI_VALIDATE_GEMINI_KEY` | invoke | Validate Gemini API key |
| `AI_VALIDATE_PEXELS_KEY` | invoke | Validate Pexels API key |
| `AI_DETECT_CURIOSITY_GAPS` | invoke | Detect curiosity gaps in transcript |
| `AI_OPTIMIZE_CLIP_BOUNDARIES` | invoke | Optimize clip boundaries around curiosity gap |
| `AI_OPTIMIZE_CLIP_ENDPOINTS` | invoke | Optimize clip endpoints using mode strategy |
| `AI_RANK_CLIPS_BY_CURIOSITY` | invoke | Re-rank clips by curiosity gap score |
| `AI_GENERATE_CLIP_DESCRIPTION` | invoke | Generate description for single clip |
| `AI_GENERATE_BATCH_DESCRIPTIONS` | invoke | Batch description generation |
| `AI_ANALYZE_WORD_EMPHASIS` | invoke | Analyze words for emphasis/supersize styling |
| `AI_GENERATE_EDIT_PLAN` | invoke | **Single clip edit plan** (emphasis + B-Roll + SFX) |
| `AI_GENERATE_BATCH_EDIT_PLANS` | invoke | **Batch edit plans** — iterates clips, sends progress per clip |
| `AI_EDIT_PLAN_CACHE_CLEAR` | invoke | Clear cached edit plans |
| `AI_EDIT_PLAN_CACHE_SIZE` | invoke | Get edit plan cache size |
| `OVERLAY_IDENTIFY_EMOJI_MOMENTS` | invoke | Identify emoji burst moments via AI |
| `OVERLAY_BUILD_EMOJI_BURST_FILTERS` | invoke | Build emoji burst FFmpeg filters |
| `OVERLAY_GENERATE_FAKE_COMMENT` | invoke | Generate fake viewer comment |
| `OVERLAY_BUILD_FAKE_COMMENT_FILTER` | invoke | Build fake comment FFmpeg filter |
| `SHOT_SEGMENT_CLIP` | invoke | **Segment a clip into 4-6 second shots** |

**Critical finding**: `SHOT_SEGMENT_CLIP` already exists! It calls `segmentClipIntoShots()` which takes word timestamps and clip boundaries and returns `ShotSegmentationResult`. This is exactly the segmentation engine needed.

### ffmpeg-handlers.ts (5 handlers)
| Handler | Channel | Purpose |
|---------|---------|---------|
| `FFMPEG_GET_METADATA` | invoke | Get video metadata |
| `FFMPEG_EXTRACT_AUDIO` | invoke | Extract audio track |
| `FFMPEG_THUMBNAIL` | invoke | Generate thumbnail at timestamp |
| `FFMPEG_GET_WAVEFORM` | invoke | Get waveform data for range |
| `FFMPEG_CAPTURE_FRAME` | invoke | Capture a frame as image |

### project-handlers.ts (10 handlers)
| Handler | Channel | Purpose |
|---------|---------|---------|
| `PROJECT_GET_RECENT` | invoke | Get recent project list |
| `PROJECT_ADD_RECENT` | invoke | Add to recent projects |
| `PROJECT_REMOVE_RECENT` | invoke | Remove from recent |
| `PROJECT_CLEAR_RECENT` | invoke | Clear all recent |
| `PROJECT_SAVE` | invoke | Save project to disk |
| `PROJECT_LOAD` | invoke | Load project from dialog |
| `PROJECT_AUTO_SAVE` | invoke | Auto-save recovery |
| `PROJECT_LOAD_RECOVERY` | invoke | Load recovery file |
| `PROJECT_CLEAR_RECOVERY` | invoke | Clear recovery data |
| `PROJECT_LOAD_FROM_PATH` | invoke | Load from specific path |

### system-handlers.ts (20+ handlers)
Key ones: `DIALOG_OPEN_FILES`, `DIALOG_OPEN_DIRECTORY`, `SYSTEM_GET_DISK_SPACE`, `SYSTEM_GET_ENCODER`, `SYSTEM_GET_AVAILABLE_FONTS`, `SYSTEM_GET_FONT_DATA`, `SHELL_OPEN_PATH`, `SHELL_SHOW_ITEM_IN_FOLDER`, `SYSTEM_GET_TEMP_SIZE`, `SYSTEM_GET_LOG_PATH`, `SYSTEM_GET_LOG_SIZE`, `SYSTEM_OPEN_LOG_FOLDER`, `SYSTEM_GET_CACHE_SIZE`, `SYSTEM_GET_RESOURCE_USAGE`, `SYSTEM_SET_AUTO_CLEANUP`

### media-handlers.ts (20+ handlers)
Key ones: `YOUTUBE_DOWNLOAD`, `TRANSCRIBE_VIDEO`, `TRANSCRIBE_FORMAT_FOR_AI`, `BRANDKIT_SELECT_LOGO`, `BRANDKIT_SELECT_INTRO_BUMPER`, `BRANDKIT_SELECT_OUTRO_BUMPER`, `BRANDKIT_COPY_LOGO`, `BRANDKIT_COPY_BUMPER`, `SAFEZONES_GET_ALL_PLATFORMS`, `PYTHON_GET_STATUS`, `PYTHON_START_SETUP`

### export-handlers.ts (1 handler)
`EXPORT_GENERATE_MANIFEST` (also listed in render-handlers — they share export logic)

---

## 6. Conflict Summary Per File

### ClipPreview.tsx — 🔴 MAJOR RESTRUCTURING REQUIRED
- Must transform from narrow scrollable modal → wide segment editor panel
- Must add: segment timeline, per-segment state management, segment-scoped playback
- Current architecture (19 useState hooks for one clip) doesn't scale to segments
- Recommendation: Extract to a new `SegmentEditor.tsx` component, keep `ClipPreview` as a thin wrapper

### ClipCard.tsx — 🟡 MODERATE CHANGES
- Already has AI Edit Plan support and single-clip render
- Needs: segment count display, segment data passed to render job
- The `handleRenderSingleClip` callback already builds the job object — just needs `shots` and `shotStyles` fields added

### SettingsPanel.tsx — 🟢 MINIMAL CONFLICTS
- Global settings are fine as defaults; per-segment overrides layer on top
- Pexels API key field already exists in the B-Roll section
- No new section needed — segment styles are per-clip, not global settings

### ProcessingPanel.tsx — 🟢 MINIMAL CHANGES
- Flat pipeline model works — just needs richer progress messages during render
- Already has `aiEditOnly` step flag for AI Edit pipeline stage

### IPC Handlers — 🟢 ALREADY PARTIALLY SUPPORTS SEGMENTS
- `SHOT_SEGMENT_CLIP` handler already exists for segmentation
- `RENDER_START_BATCH` Phase 1.5 already resolves per-shot styles
- `RenderClipJob` already has `shots` and `shotStyles` fields
- `AI_GENERATE_EDIT_PLAN` generates per-word emphasis that maps to segments
- **What's missing**: A handler to persist/update segment style assignments (currently done client-side)

---

## 7. UI Restructuring Plan

### Phase 1: Data Model — ALREADY EXISTS ✅
The store already has everything needed:
- `ClipCandidate.shots?: ShotSegment[]` — detected shot segments
- `ClipCandidate.shotStyles?: ShotStyleAssignment[]` — per-shot style preset IDs
- Store actions: `setClipShots()`, `setShotStyleAssignment()`, `removeShotStyleAssignment()`, `setBatchShotStyles()`, `clearAllShotStyles()`
- Separate segments cache: `store.segments[clipId]`, `store.setSegments()`, `store.getSegments()`
- IPC: `SHOT_SEGMENT_CLIP` handler already segments clips into shots
- **No data model work needed** — only UI to expose these existing capabilities

### Phase 2: Segment Editor Component (replaces ClipPreview modal)
**New layout**: Full-width panel (not a small dialog)

```
┌─────────────────────────────────────────────────────────────┐
│ Header: clip hook text, score, template, view mode toggle   │
├───────────────────────────────────────┬─────────────────────┤
│                                       │ Style Picker Sidebar│
│          Video Player                 │ • Per-segment styles│
│          (9:16 preview)               │ • Premium presets   │
│                                       │ • Caption presets   │
│                                       │ • Override toggles  │
│                                       │ • Accent color      │
├───────────────────────────────────────┤ • Layout picker     │
│ Segment Timeline                      │                     │
│ [seg1|seg2|seg3|seg4|seg5|seg6]       │                     │
│  ▲ active segment highlighted         │                     │
│  Waveform underneath                  │                     │
├───────────────────────────────────────┴─────────────────────┤
│ Caption Editor: word timestamps for active segment          │
│ Actions: Apply, Reset, Render This Clip, Cancel             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Component Extraction
1. Extract `StylePickerTabs` → standalone `StylePickerSidebar.tsx` (already a sub-component)
2. Extract `OverrideRow` panel → `SegmentOverrides.tsx` (per-segment version)
3. Create `SegmentTimeline.tsx` — horizontal strip with segment markers, drag-to-resize, click-to-select
4. Create `SegmentCaptionEditor.tsx` — word timestamps scoped to active segment with emphasis editing
5. Refactor `ClipPreview` into `SegmentEditor` — wide layout, three-panel (video / timeline / sidebar)

### Phase 4: Render Pipeline Integration
- `RenderClipJob.shots` and `RenderClipJob.shotStyles` already exist
- When rendering, populate these from the store's per-segment data
- Phase 1.5 in `RENDER_START_BATCH` already resolves shot styles — no backend changes needed
- Add segment index to `RENDER_CLIP_PROGRESS` events for per-segment progress display

### New IPC Handlers Needed
| Handler | Purpose |
|---------|---------|
| *(none strictly required)* | `SHOT_SEGMENT_CLIP` already exists for segmentation |
| Optional: `RENDER_SEGMENT_PREVIEW` | Preview a single segment instead of full clip (optimization) |
| Optional: `AI_GENERATE_SEGMENT_PLAN` | Generate per-segment edit plans (could reuse `AI_GENERATE_EDIT_PLAN` with segment bounds) |

### Key Architectural Insight
The **entire backend is ready** — render pipeline, IPC handlers, store actions, and data types all support per-shot/segment styles. Specifically:
- **IPC**: `SHOT_SEGMENT_CLIP` segments clips into shots
- **Store**: `setClipShots()`, `setShotStyleAssignment()`, `setBatchShotStyles()`, `clearAllShotStyles()`
- **Render**: Phase 1.5 in `RENDER_START_BATCH` resolves `shotStyles` → `shotStyleConfigs` via `resolveShotStyles()`
- **FFmpeg**: `auto-zoom.ts` already has `buildPerShotZoomFilter()` that reads `shotStyleConfigs`
- **Color**: `color-grade.ts` has `buildPiecewiseColorGradeFilter()` for per-shot color grading

The **ONLY** missing piece is the UI — `ClipPreview.tsx` doesn't expose any shot/segment editing. Building the segment editor is purely a frontend UI task, wiring into existing infrastructure.
