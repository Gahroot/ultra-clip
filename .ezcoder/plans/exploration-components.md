# Component Exploration — src/renderer/src/components/ & App.tsx

## Architecture Overview

```
App.tsx (AppWithBoundary)
├── ErrorBoundary          ← wraps entire app
├── Header                 ← save/load/settings/theme/help/onboarding
├── Body (flex row)
│   ├── Sidebar (w-80)     ← SourceInput
│   └── Main content       ← ProcessingPanel | ClipGrid | empty state
├── ErrorLog               ← bottom bar
├── ResourceMonitor
├── SetupWizard / OnboardingWizard / KeyboardShortcuts / WhatsNew
└── Autosave toast / Recovery dialog
```

---

## App.tsx

**File:** `src/renderer/src/App.tsx` (~533 lines)

**What it renders:**
- Full-screen flex-col layout: header → body (sidebar + main) → error log
- Header: app title (with dirty indicator), Open/Save/recent projects, TemplateEditor, AiUsageIndicator, theme dropdown, onboarding, keyboard shortcuts, settings dialog (wraps `SettingsPanel`)
- Sidebar (`<aside class="w-80">`): contains `<SourceInput />`
- Main area: conditionally shows `ProcessingPanel`, `ClipGrid`, or empty state with `RecentProjectsList`
- Overlays: `SetupWizard`, `OnboardingWizard`, `KeyboardShortcutsDialog`, `WhatsNew`, autosave toast, crash recovery AlertDialog

**Store state used:**
- `getActiveSource()`, `activeSourceId`, `pipeline`, `errorLog.length`, `isDirty`
- `pythonStatus`, `setPythonStatus`, `undo`, `redo`
- `theme`, `setTheme`, `hasCompletedOnboarding`, `setOnboardingComplete`
- `trackTokenUsage`, `lastSeenVersion`, `setLastSeenVersion`

**Content switching logic:**
- `showProcessingPanel` = activeSource exists && pipeline not in ready/rendering/done
- `showGrid` = activeSource exists && pipeline in ready/rendering/done
- Content area keyed by `${activeSourceId}-${panelType}` for AnimatePresence transitions

**Props:** None (root component)

**Key connections:**
- Wraps App in `ErrorBoundary` + `TooltipProvider`
- Uses `useKeyboardShortcuts`, `useTheme`, `useAutosave` hooks
- Uses `saveProject`/`loadProject`/`loadProjectFromPath`/`loadRecovery`/`clearRecovery` from project-service

---

## ClipCard.tsx

**File:** `src/renderer/src/components/ClipCard.tsx` (~1037 lines)

**What it renders:**
A card for a single clip candidate with:
- **Score badge** (color-coded circle: green ≥90, blue ≥80, yellow ≥70, orange below) with tooltip showing label+description+reasoning. Shows delta if `originalScore` differs.
- **Multi-select checkbox** (top-right, visible on hover or when any selection active)
- **Override indicator badge** (amber pill showing count of per-clip render overrides)
- **Thumbnail/video area** (aspect-video, click-to-play with `<video>` element using `file://` protocol with time fragment)
- **Single-clip render overlay** (progress bar, done checkmark, error display)
- **Inline trim times** (`EditableTime` for In/Out points)
- **Hook text** (with copy button, search highlighting)
- **Duration badge**, estimated file size, loop score badge, AI Edit Plan badge
- **Transcript preview** (line-clamped, with copy, search highlighting)
- **Collapsible AI reasoning**
- **Story Arc part info** (if `partInfo` exists — shows part number, title, end card text)
- **Variant pills** (selectable buttons per variant, with approve/reject per variant, shows hook text + description + overlays)
- **Action buttons:** Edit (opens ClipPreview), Render (single-clip, only for approved), Compare (in compare mode), Approve, Reject
- **Context menu:** Preview & Edit, Approve/Reject/Pending, Copy Hook/Transcript, Re-score, Reset Boundaries, Render, Compare
- **ClipPreview dialog** (opened on Edit click or context menu)

**Props:**
```ts
interface ClipCardProps {
  clip: ClipCandidate
  sourceId: string
  sourcePath: string
  sourceDuration: number
  compareMode?: boolean
  onCompare?: (clipId: string) => void
  isCompareSelected?: boolean
}
```

**Store state used:**
- Actions: `updateClipStatus`, `updateClipTrim`, `updateVariantStatus`, `resetClipBoundaries`, `rescoreClip`, `setClipAIEditPlan`, `clearClipAIEditPlan`, `setSingleRenderState`, `addError`, `toggleClipSelection`
- Read: `activeStylePresetId`, `isRendering`, `singleRenderClipId`, `singleRenderProgress`, `singleRenderStatus`, `singleRenderOutputPath`, `singleRenderError`, `settings`, `searchQuery`, `selectedClipIds`

**Key behaviors:**
- **Approve/Reject** toggles: clicking an already-approved clip sets it back to 'pending'
- **Inline trim** via `EditableTime` component (±10s from current, clamped to video)
- **Re-score** calls `window.api.rescoreSingleClip` with Gemini API key
- **AI Edit Plan** calls `window.api.generateEditPlan`, stores result via `setClipAIEditPlan`
- **Single render** uses `window.api.startBatchRender` with a single job, listens to render events
- **Search highlighting** via `highlightText()` on hook text and transcript

---

## ClipGrid.tsx

**File:** `src/renderer/src/components/ClipGrid.tsx` (~large, 500+ lines read)

**What it renders:**
- **Toolbar:** filter tabs (All/Approved/Rejected/Pending with counts), sort dropdown (Score/Time/Duration/Custom), min-score slider, search bar, undo/redo, batch actions, compare mode toggle
- **Batch action bar** (when multi-select active): approve/reject selection, apply trim offset, clear selection
- **Approve shortcuts dropdown:** "Approve All", "Approve ≥ N" for thresholds [90, 85, 80, 75, 70] with counts
- **Grid of `SortableClipCard`s** in DnD context (drag-to-reorder with @dnd-kit)
- **Stitched clip cards** (`StitchedClipCard`)
- **ClipTimeline** (when clipViewMode === 'timeline')
- **ClipStats** component
- **Render progress** area (when `isRendering`)
- **ClipComparison** dialog (when two clips selected for comparison)
- **Settings changed warning** dialog (detects drift between processing config snapshot and current settings)
- **Batch result** notification
- **Description export** functionality (AI-generated descriptions per clip)

**Props:** None (reads everything from store)

**Store state used (extensive):**
- `activeSourceId`, `clips`, `sources`, `settings`, `templateLayout`
- `approveAll`, `approveClipsAboveScore`, `rejectAll`
- `isRendering`, `setIsRendering`, `renderProgress`, `setRenderProgress`
- `storyArcs`, `stitchedClips`, `updateStitchedClipStatus`
- `selectedClipIndex`, `setSelectedClipIndex`, `canUndo`, `canRedo`, `undo`, `redo`
- `renderStartedAt`, `renderCompletedAt`, `clipRenderTimes`, `activeEncoder`
- `clipOrder`, `customOrder`, `reorderClips`, `setCustomOrder`
- `clipViewMode`, `setClipViewMode`, `searchQuery`, `setSearchQuery`
- `autoModeResult`, `setAutoModeResult`, `pipeline`, `setRenderError`
- `transcriptions`, `activeStylePresetId`
- `selectedClipIds`, `selectAllVisible`, `clearSelection`, `toggleClipSelection`, `batchUpdateClips`
- `settingsChanged`, `revertToSnapshot`, `getSettingsDiff`
- Uses `BUILT_IN_EDIT_STYLE_PRESETS` from store/helpers

**Types:**
- `FilterTab = 'all' | 'approved' | 'rejected' | 'pending'`
- `SortMode = 'score' | 'time' | 'duration' | 'custom'`

**Key behaviors:**
- **SortableClipCard** wrapper: uses `@dnd-kit/sortable` for drag handles, wraps `ClipCard`
- **Filter + Sort + Search pipeline:** clips filtered by minScore → status tab → search query → sorted by mode
- **Search:** debounced 200ms, matches against `text`, `hookText`, `reasoning`
- **DnD reorder:** switches to 'custom' sort mode, persists order via `reorderClips`
- **Render flow:** starts batch render via `window.api.startBatchRender`, listens to progress/done/error events
- **Settings change detection:** warns user if settings changed since processing, offers revert

---

## ClipPreview.tsx

**File:** `src/renderer/src/components/ClipPreview.tsx` (~large)

**What it renders:**
A full-screen Dialog for detailed clip editing:
- **Video player** (`<video>` element) with play/pause/seek controls
- **DualSlider** — Radix-based two-thumb range slider for trim with visual indicator of original AI-selected range
- **Waveform display** behind the slider (fetched via `window.api.getWaveform`, cached in module-level Map)
- **EditableTime** for start/end with Apply/Reset to Original buttons
- **Hook text editor** (editable input, copy button, hook template selection & preview)
- **Score badge** with re-score button (calls Gemini API)
- **AI reasoning** (collapsible)
- **Transcript** with copy
- **Per-clip render overrides** panel (OverrideRow toggles for captions, hook title, progress bar, auto-zoom, sound design, brand kit, layout)
- **Custom thumbnail capture** (from current video frame)
- **View mode toggle** (source vs output aspect ratio preview)
- **Preview with overlays** (renders a quick preview via backend)
- **Single-clip render** button

**Props:**
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

**Store state used:**
- Actions: `updateClipTrim`, `updateClipHookText`, `setClipCustomThumbnail`, `setClipOverride`, `clearClipOverrides`, `rescoreClip`, `setSingleRenderState`, `addError`
- Read: `isRendering`, `singleRenderClipId`, `singleRenderProgress`, `singleRenderStatus`, `singleRenderOutputPath`, `settings`, `hookTemplates`, `activeHookTemplateId`

**Sub-components defined in file:**
- `DualSlider` — two-thumb Radix slider with original-range overlay
- `OverrideRow` — toggle row for per-clip render setting overrides

**Key behaviors:**
- Local state for start/end/hook (not committed to store until Apply)
- Slider bounds: ±10s from original AI range, clamped to source duration
- Waveform fetched on dialog open, cached in module-level `Map<string, number[]>`
- Re-sync local state when clip prop changes (via useEffect on clip.id)
- Hook template applied via `applyHookTemplate()` for preview

---

## SettingsPanel.tsx

**File:** `src/renderer/src/components/SettingsPanel.tsx` (~very large)

**What it renders:**
A comprehensive settings form inside a Dialog (rendered by App.tsx). Organized in tabs/sections:
- **Captions:** enable toggle, style preset, font, colors (primary, highlight, emphasis, supersize, outline, back), animation, font size, outline width, words per line, position, border style. Includes `CaptionPhonePreview` — a mini 9:16 phone frame rendering styled sample text.
- **Sound Design:** enable toggle, music track, SFX volume, music volume, music ducking, SFX style
- **Auto-Zoom:** enable toggle, mode, intensity, interval
- **Hook Title:** enable toggle, style, display duration, font size, text color, outline color/width, fade in/out
- **Rehook:** enable toggle, display duration, style, position
- **Progress Bar:** enable toggle, position, height, color, opacity, style
- **Brand Kit:** enable toggle, logo path (with DropZone), logo position/scale/opacity, intro/outro bumper paths
- **B-Roll:** enable toggle, Pexels API key, interval, clip duration, display mode, transition, PiP size/position
- **Filler Removal:** enable toggle, filler words/silences/repeats toggles, silence threshold
- **AI Settings:** Gemini API key (with validation), output directory, min score
- **Render Quality:** quality preset, output resolution, format, encoding preset, aspect ratio, filename template, concurrency, notifications, developer mode
- **Profiles:** save/load/reset settings profiles (built-in + user-created)

**Props:** None

**Store state used:** Enormous — uses `useShallow` to destructure ~70+ setters from the store. Key ones:
- All of `settings` object
- All individual setters for every sub-setting
- `hookTemplates`, `activeHookTemplateId`, template CRUD actions
- `resetSettings`, `resetSection`
- Profile management: `settingsProfiles`, `activeProfileId`, `saveSettingsProfile`, `loadSettingsProfile`, `deleteSettingsProfile`, `setActiveProfileId`

**Sub-components defined in file:**
- `SectionHeader` — styled uppercase label
- `FieldRow` — label + children + optional hint
- `SectionResetButton` — resets individual section to defaults
- `CaptionPhonePreview` — mini phone frame showing styled captions

---

## ProcessingPanel.tsx

**File:** `src/renderer/src/components/ProcessingPanel.tsx` (~931 lines)

**What it renders:**
A vertical stepper showing the video processing pipeline:
- **Source header** (name, type, duration) with AnimatePresence transitions between sources
- **Queue progress panel** (when `queueMode`): overall progress, per-source status, pause/resume/skip/cancel
- **Step rows** for each pipeline stage: Download (YouTube only), Transcribe, Score, Loop Optimize (optional), Variants (optional), Clip Stitching (optional), Detect Faces, Story Arcs (optional), AI Edit (optional), Ready
- **Error banner** with Retry from Failed Stage + Start Over buttons
- **Pre-processing config** (`PreProcessingConfig` component, visible when idle)
- **Gemini key prompt** (when no API key set)
- **Stats** (clip count, score≥threshold, avg score, total duration) — shown when ready
- **StatsSkeleton** (during face/arc detection)
- **Primary actions:** "Process Video" / "Process All" (queue) / Cancel / Reprocess
- **Queue progress sub-panel** with per-source list, pause/resume/skip/cancel

**Props:** None

**Store state used:**
- `getActiveSource()`, `pipeline`, `settings`, `sources`
- `queueMode`, `queueResults`, `setGeminiApiKey`, `setPipeline`
- `enqueueSources`, `isOnline`
- `processingConfig.enablePerfectLoop`, `.enableMultiPart`, `.enableVariants`, `.enableClipStitching`, `.enableAiEdit`
- `failedPipelineStage`, `clearPipelineCache`

**Hooks:** `usePipeline` (processVideo, cancelProcessing), `useQueueProcessor` (cancelQueue), `useETA`

**Sub-components defined in file:**
- `StepRow` — single pipeline step with icon, progress, ETA, model download indicator
- `GeminiKeyPrompt` — API key input with validation
- `Stats` — 4-col grid with clip stats
- `StatsSkeleton` — loading placeholder
- `QueueProgressPanel` — multi-source queue progress

---

## SourceInput.tsx

**File:** `src/renderer/src/components/SourceInput.tsx` (~593 lines)

**What it renders:**
The left sidebar content with:
- **Tabs:** Local File | YouTube | Scripts
- **Local File tab:** drag-and-drop zone with click-to-browse, video file validation (mp4, mov, avi, mkv, webm)
- **YouTube tab:** URL input with download button, progress bar, validation, offline warning
- **Scripts tab:** "Script Cue Splitter" button that opens `ScriptCueSplitter` dialog
- **Source list:** scrollable list of added sources with:
  - Thumbnail (or FileVideo icon)
  - Name, duration, origin badge (YT/File)
  - Queue status badges (Processing/Done/Error/Skipped/queue position)
  - Active source highlight (animated via `layoutId="active-source-highlight"`)
  - Remove button (with confirmation dialog if clips exist)
  - Skeleton card while loading/downloading

**Props:** None

**Store state used:**
- `sources`, `activeSourceId`, `clips`
- `addSource`, `removeSource`, `setActiveSource`, `setClips`, `setPipeline`
- `queueMode`, `queueResults`, `processingQueue`, `isOnline`

**Key behaviors:**
- File processing: gets path → `window.api.getMetadata` + `window.api.getThumbnail` → creates SourceVideo → adds to store
- YouTube: validates URL → `window.api.downloadYouTube` with progress listener → metadata → adds to store
- Script cue splitter: `handlePushToGrid` adds source + clips to store and sets pipeline to 'ready'
- Source removal: confirms if clips exist, removes source (and its clips implicitly)

---

## ScriptCueSplitter.tsx

**File:** `src/renderer/src/components/ScriptCueSplitter.tsx` (~large)

**What it renders:**
A multi-step Dialog:
- **Step 1 (upload):** drag-and-drop or browse for video file
- **Step 2 (transcribing):** progress bar during transcription
- **Step 3 (review):** 
  - Timeline bar with colored segments per cue
  - Video preview player
  - Editable cue list (label, start/end times, remove button)
  - Manual cue addition form
  - "Split into Clips" or "Push to Grid" buttons
- **Step 4 (splitting):** progress during ffmpeg splitting
- **Step 5 (done):** list of split output files, "Push to Grid" button

**Props:**
```ts
interface Props {
  open: boolean
  onClose: () => void
  onPushToGrid: (source: SourceVideo, clips: ClipCandidate[]) => void
}
```

**Store state used:** None directly — receives callbacks via props. Uses `window.api` for transcription and metadata.

**Key behaviors:**
- Uses `detectScriptCues()` from `@/lib/script-cue-detection` to auto-detect cues from word timestamps
- Cues are editable (labels, removal, manual addition)
- Resets all state when dialog closes
- Segment colors cycle through 8 colors

---

## EditableTime.tsx

**File:** `src/renderer/src/components/EditableTime.tsx` (77 lines)

**What it renders:**
- **Display mode:** monospaced button showing `MM:SS.s` — click to edit
- **Edit mode:** inline `<input>` with auto-focus, commits on blur/Enter, cancels on Escape

**Props:**
```ts
interface EditableTimeProps {
  value: number        // seconds
  onChange: (v: number) => void
  min: number
  max: number
  className?: string
}
```

**Store state used:** None

**Exported helpers:**
- `formatTime(seconds)` → `MM:SS.s` string
- `parseTimeInput(value)` → parses `M:SS.s` or raw seconds → number | null

**Used by:** ClipCard (inline trim), ClipPreview (trim editor)

---

## ErrorBoundary.tsx

**File:** `src/renderer/src/components/ErrorBoundary.tsx` (89 lines)

**What it renders:**
- **Normal:** renders children
- **Error state:** centered Card with error message, stack trace (pre block), Copy Error + Reload App buttons

**Props:** `{ children: ReactNode }`

**Store state used:** None (class component)

**Key behaviors:**
- Class component using `getDerivedStateFromError` + `componentDidCatch`
- Copies error + componentStack to clipboard
- Reload button calls `window.location.reload()`

---

## ErrorLog.tsx

**File:** `src/renderer/src/components/ErrorLog.tsx` (233 lines)

**What it renders:**
- **Collapsed:** bottom bar showing "Errors" with count badge (hidden when no errors)
- **Expanded:** scrollable list of error entries, each showing:
  - Timestamp
  - Source badge (color-coded: PIPE/ASR/AI/FF/YT/FACE/REN)
  - Error message (click to copy)
  - Optional FFmpeg command details (expandable)
- **Header actions:** Export full log, Copy all, Clear (with confirm dialog)

**Props:** None

**Store state used:**
- `errorLog` (array of `ErrorLogEntry`)
- `clearErrors`

**Key behaviors:**
- Auto-expands when first error arrives
- Auto-scrolls to newest error
- Export calls `window.api.exportLogs` → shows in folder
- Source labels mapped: pipeline→PIPE, transcription→ASR, scoring→AI, ffmpeg→FF, youtube→YT, face-detection→FACE, render→REN

---

## Clip Display, Selection & Editing Flow

### Display Flow
1. **ClipGrid** reads `clips[activeSourceId]` from store, applies filter/sort/search → `displayedClips`
2. Each clip rendered as `SortableClipCard` (drag wrapper) → `ClipCard` (actual card UI)
3. Cards show thumbnail, score, hook text, transcript, duration, status indicators

### Selection Flow
- **Single click on card body:** handled by `SortableClipCard.onClick` → `setSelectedClipIndex`
- **Checkbox (top-right):** `toggleClipSelection(clip.id)` → adds/removes from `selectedClipIds` Set in store
- **Batch toolbar** appears when `selectedClipIds.size > 0` — bulk approve/reject/trim
- **Compare mode:** toggle in toolbar, first click sets `compareSelectedId`, second click opens `ClipComparison` dialog

### Editing Flow
- **Inline trim (ClipCard):** `EditableTime` components → `updateClipTrim(sourceId, clipId, start, end)` — immediate store update
- **Full edit (ClipPreview dialog):** local state for start/end/hook → Apply commits to store via `updateClipTrim` + `updateClipHookText`
- **Status changes:** `updateClipStatus(sourceId, clipId, 'approved'|'rejected'|'pending')` — toggle behavior
- **Per-clip overrides:** `setClipOverride(sourceId, clipId, key, value)` in ClipPreview's OverrideRow
- **Re-score:** `window.api.rescoreSingleClip` → `rescoreClip(sourceId, clipId, score, reasoning, hookText)`
- **AI Edit Plan:** `window.api.generateEditPlan` → `setClipAIEditPlan(sourceId, clipId, plan)`
- **Reset boundaries:** `resetClipBoundaries(sourceId, clipId)` — reverts to AI-selected times
- **Variant status:** `updateVariantStatus(sourceId, clipId, variantId, status)`
- **DnD reorder:** `reorderClips(sourceId, activeId, overId)` + `setCustomOrder(true)`

### Rendering Flow
- **Single clip:** ClipCard calls `window.api.startBatchRender` with 1 job, tracks via `singleRenderClipId`/`singleRenderProgress`/`singleRenderStatus`
- **Batch render:** ClipGrid starts render for all approved clips, tracks via `renderProgress` map + `isRendering` flag
- Both listen to IPC events: `onRenderClipProgress`, `onRenderClipDone`, `onRenderClipError`, `onRenderBatchDone`, `onRenderCancelled`
