# Clip Editing / Preview Experience — Exploration Findings

## Overview

The clip editing experience is centered around a **ClipCard → ClipPreview dialog** pattern. Clips are displayed in a grid, and clicking "Edit" on a card opens a full-featured modal dialog with video playback, trim controls, word-level transcript interaction, per-clip render overrides, and inline rendering.

---

## Key Components & Files

### 1. ClipCard (`src/renderer/src/components/ClipCard.tsx`)
- **Purpose:** Grid card for each clip candidate. Shows thumbnail, score badge, hook text, duration, loop badge, AI edit plan badge, inline trim times, and action buttons.
- **Opens preview via:** `setShowPreview(true)` — triggered by "Edit" button (line 817), context menu "Edit clip" (line 913), or keyboard shortcut `E` (via `useKeyboardShortcuts`).
- **Inline editing:** Has `EditableTime` components for in/out times directly on the card (lines 566–582), plus a Copy hook button.
- **Renders ClipPreview:** Conditionally at line 1022: `{showPreview && <ClipPreview ... open={showPreview} onClose={() => setShowPreview(false)} />}`
- **AI Edit Plan panel:** Toggle via `showEditPlanPanel` state — shows word emphasis, B-Roll suggestions, SFX hits.
- **Single-clip render:** Can render one clip from the card with progress overlay.

### 2. ClipPreview (`src/renderer/src/components/ClipPreview.tsx`, ~1713 lines)
- **Purpose:** Full-featured modal dialog for editing a single clip.
- **Props:** `clip: ClipCandidate`, `sourceId`, `sourcePath`, `sourceDuration`, `open`, `onClose`.
- **Wrapped in:** `<Dialog>` from `@/components/ui/dialog` (Radix-based).

#### Video Source
- `videoSrc = showPreview && previewPath ? \`file://${previewPath}\` : \`file://${sourcePath}\``
- Source video loaded via `file://` protocol directly from local filesystem.
- **Three view modes:**
  - **Source 16:9** — full source video with crop region overlay
  - **Output 9:16** — CSS-cropped to face-centred 9:16
  - **With Overlays** — renders a fast 540×960 preview via `window.api.renderPreview()` with all active overlays (captions, hook title, progress bar, auto-zoom, brand kit)

#### Trim Controls
- **DualSlider** (defined in same file, lines 74–146): Radix two-thumb range slider for start/end trim.
- Slider bounds: ±10s from original AI-selected boundaries, clamped to video duration.
- **EditableTime** components for precise numeric in/out editing (click-to-type, `mm:ss.s` format).
- **WaveformDisplay** canvas component shows audio waveform with trim range highlighting and click-to-seek.
- "Reset to Original" button restores AI-detected boundaries.
- Re-score hint when boundaries changed >2s.

#### Hook Text Editing
- Inline editable `<input>` in the dialog header (line 779). Click the hook text to switch to edit mode.
- Hook template selector (Select dropdown, line 831–852) — combines built-in + user templates.
- Copy hook text button (plain and templated versions).

#### Word-Level Transcript (Caption) Interaction
- **Word timestamps** rendered as clickable buttons (lines 1399–1416): each word shows `w.text`, highlights when `currentTime` is between `w.start` and `w.end`, and seeking to that word's start time on click.
- **NOT editable** — words are read-only, used for seeking and visual feedback. No editing of word text or timing.
- Copy transcript button (full text).

#### Per-Clip Render Overrides
- Collapsible "Override Global Settings" section (lines 1482–1611).
- **OverrideRow** component (lines 152–217): Switch toggle for each feature, with "global"/"ON"/"OFF" badge and "reset" link.
- Overridable features: Captions, Hook Title, Progress Bar, Auto-Zoom, Sound Design, Brand Kit.
- **Layout picker:** Default Crop vs Blur Background (lines 1511–1546).
- "Clear all overrides" button.

#### Single-Clip Render
- "Render This Clip" button at bottom (lines 1656–1688).
- Applies pending edits, then calls `window.api.startBatchRender()` with a single job.
- Progress bar, done state with "Open folder" link, error handling.

#### Other Features
- **Re-score:** Sends clip transcript + current boundaries to Gemini for fresh scoring (lines 472–507).
- **Thumbnail capture:** Draws current video frame to canvas, saves as data URL (lines 457–470).
- **AI Reasoning:** Expandable section showing AI's scoring rationale.
- **Copy for Social Media:** Combines hook + transcript for posting.

### 3. ClipGrid (`src/renderer/src/components/ClipGrid.tsx`)
- Manages the grid of ClipCards with sorting, filtering, searching, multi-select.
- **selectedClipIndex** (store state): tracks which clip is focused for keyboard navigation.
- **selectedClipIds** (Set<string>): tracks multi-select checkbox state for batch operations.
- **Batch operations bar** (lines 1943+): appears when `selectedClipIds.size > 0`, offers bulk approve/reject, trim offset, enable/disable captions, enable/disable hook titles, reset status.
- **Render progress:** tracks per-clip rendering within the grid with `currentClip` (line 1301) derived from render state.

### 4. ClipTimeline (`src/renderer/src/components/ClipTimeline.tsx`)
- Alternative view: horizontal timeline of clips along the source video's duration.
- Each clip segment is clickable, opens `ClipPreview` dialog (lines 377–386).

### 5. ClipComparison (`src/renderer/src/components/ClipComparison.tsx`)
- Side-by-side dialog comparing two clips. Uses `Dialog` from Radix UI.
- Synced playback option.

---

## Store State (Zustand)

### Clips Slice (`src/renderer/src/store/clips-slice.ts`)
- `selectedClipIndex: number` — keyboard-navigated focus index (default 0).
- `selectedClipIds: Set<string>` — multi-select checkboxes.
- `setSelectedClipIndex(index)`, `toggleClipSelection(clipId)`, `selectAllClips(clipIds)`, `clearSelection()`.

### Types (`src/renderer/src/store/types.ts`)
- `ClipCandidate` has `wordTimestamps?: WordTimestamp[]` (imported from shared types).
- `ClipRenderSettings` — per-clip override interface with keys: `enableCaptions`, `enableHookTitle`, `enableProgressBar`, `enableAutoZoom`, `enableSoundDesign`, `enableBrandKit`, `layout`.

---

## Hooks Directory (`src/renderer/src/hooks/`)

| File | Purpose |
|------|---------|
| `usePipeline.ts` | Orchestrates the full processing pipeline (download → transcribe → score → thumbnails → loop optimize → variants → stitch → face detect → story arcs → AI edit) |
| `useKeyboardShortcuts.ts` | Maps keyboard shortcuts (↑/↓ navigate clips, A approve, R reject, E open preview, P reset) |
| `useAutosave.ts` | Persists state automatically |
| `useCopyToClipboard.ts` | Clipboard helper with "copied" feedback state |
| `useETA.ts` | Estimated time remaining for pipeline |
| `useOnlineStatus.ts` | Connectivity detection |
| `useQueueProcessor.ts` | Queue-based batch processing |
| `useTheme.ts` | Dark/light theme |
| `pipeline-stages/` | Individual pipeline stage implementations |

### usePipeline.ts Details
- **Pipeline stages (in order):**
  1. `downloading` — YouTube download (if URL source)
  2. `transcribing` — Audio transcription
  3. `scoring` — AI clip scoring + mapping
  4. Thumbnail generation (sub-step of scoring)
  5. `optimizing-loops` — Loop boundary optimization
  6. `generating-variants` — Alternative clip versions
  7. `stitching` — Multi-clip stitching
  8. `detecting-faces` — Face detection for crop regions
  9. `detecting-arcs` — Story arc detection
  10. `ai-editing` — AI edit plan generation
- Supports `resumeFrom` for re-running from a specific stage.
- Reads settings imperatively via `useStore.getState()` to avoid stale closures.
- Cancellation via `cancelledRef`.

---

## Style / Preset Selection

### Edit Style Presets
- **File:** `src/renderer/src/store/edit-style-presets.ts` — `EDIT_STYLE_PRESETS: EditStylePreset[]`
- **Re-exported as** `BUILT_IN_EDIT_STYLE_PRESETS` from `src/renderer/src/store/helpers.ts` (line 674).
- **UI:** `StylePresetPicker` component in `SettingsPanel.tsx` (line 467) — horizontal scrollable strip of preset cards with emoji thumbnails, gradient backgrounds, category badges.
- Applied via `applyEditStylePreset(presetId)` action.
- Categories: `entertaining`, `educational`, `cinematic`, `minimal`, `branded`, `custom`.
- Tracked as `activeStylePresetId` in store.

### Caption Presets
- **File:** `src/renderer/src/store/` (imported as `CAPTION_PRESETS`).
- **UI:** In `SettingsPanel.tsx` — `selectedPresetId` state (line 757), applies caption style config.
- `CaptionPhonePreview` component (line 156): real-time preview of caption styling in a phone-shaped frame.
- Caption settings include: font, size, colors (primary, highlight, outline, back), animation style, words-per-line, border style.
- **Animation options:** Array of `CaptionAnimation` values defined at line 70.
- Includes `captions-ai` preset/animation.

---

## What Does NOT Exist

1. **No word-level text editing** — Words in the transcript are clickable (seek-to-time) but NOT editable. You cannot change word text, adjust word timing, split/merge words, or correct transcription errors.
2. **No per-word timing adjustment** — The only timing controls are clip-level in/out trim (DualSlider + EditableTime). Individual word start/end times are read-only.
3. **No caption styling per-clip** — Caption style is global (set in SettingsPanel). Per-clip overrides only toggle captions on/off, not change their style.
4. **No inline video editor** — No timeline track editor, no cut/splice, no multi-track composition. The ClipPreview is a review/trim tool, not an NLE.
5. **No drag-to-reorder clips** — ClipGrid is sorted by score or filter, not manually reorderable.

---

## Data Flow Summary

```
Source Video → usePipeline (transcribe → score → detect faces)
    ↓
Store: clips[sourceId] = ClipCandidate[]
    ↓
ClipGrid → maps to ClipCard[]
    ↓
ClipCard → "Edit" button → ClipPreview dialog
    ↓
ClipPreview:
  - videoSrc = file://${sourcePath}  (or file://${previewPath} for overlay preview)
  - DualSlider + EditableTime → local trim state
  - Word buttons → click to seek
  - Override toggles → per-clip settings
  - "Apply Changes" → updateClipTrim() + updateClipHookText() → store
  - "Render This Clip" → window.api.startBatchRender([singleJob])
```
