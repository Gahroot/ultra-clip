# Zustand Store Exploration

## Architecture Overview

The store uses **Zustand + Immer** with a **slice pattern**. The barrel export is at `src/renderer/src/store.ts` which re-exports everything from `src/renderer/src/store/index.ts`.

### File Map

| File | Purpose |
|---|---|
| `store/index.ts` | Creates the Zustand store, merges all slices, adds source/render/theme/queue/AI-usage state |
| `store/types.ts` | All interfaces & type definitions (AppState, ClipCandidate, EditStylePreset, etc.) |
| `store/helpers.ts` | Defaults, persistence functions, caption presets, built-in edit style presets, profile utils |
| `store/clips-slice.ts` | All clip CRUD, shot style operations, stitched clips, story arcs, batch operations |
| `store/settings-slice.ts` | All settings setters, profiles, hook templates, settings lock, edit style preset application |
| `store/pipeline-slice.ts` | Pipeline progress, stage tracking, retry logic, Python setup state |
| `store/project-slice.ts` | isDirty, lastSavedAt, reset() |
| `store/history-slice.ts` | Undo/redo stacks, snapshot capture (clips + stitchedClips + minScore) |
| `store/errors-slice.ts` | Error log append/clear |
| `store/selectors.ts` | Memoized `selectActiveClips` selector (sorts by score desc) |
| `store/edit-style-presets.ts` | 10 built-in `EditStylePreset` objects (Impact, Clarity, Velocity, Growth, Volt, Film, Ember, Rebel, Neon, Prime) |

---

## Key Types

### `ClipCandidate` (types.ts:164–212)
Core clip data model. Fields:
- **Identity**: `id`, `sourceId`
- **Timing**: `startTime`, `endTime`, `duration`, `aiStartTime?`, `aiEndTime?`
- **Content**: `text`, `hookText`, `reasoning`, `score`, `originalScore?`
- **Status**: `status: 'pending' | 'approved' | 'rejected'`
- **Visual**: `cropRegion?`, `thumbnail?`, `customThumbnail?`
- **Loop**: `loopScore?`, `loopStrategy?`, `loopOptimized?`, `crossfadeDuration?`
- **Variants**: `variants?: ClipVariantUI[]`
- **Multi-part**: `partInfo?: PartInfoUI`
- **Render overrides**: `overrides?: ClipRenderSettings`
- **AI Edit**: `aiEditPlan?: AIEditPlan`
- **Shot Segmentation**: `shots?: ShotSegment[]`
- **Shot Styles**: `shotStyles?: ShotStyleAssignment[]`
- **Word data**: `wordTimestamps?: WordTimestamp[]`

### `ClipRenderSettings` (types.ts:153–162)
Per-clip render overrides (all optional booleans + layout):
- `enableCaptions?`, `enableHookTitle?`, `enableProgressBar?`, `enableAutoZoom?`, `enableSoundDesign?`, `enableBrandKit?`
- `layout?: 'default' | 'blur-background'`

### `EditStylePreset` (types.ts:703–739)
Complete named creative style for one-click application:
- **Meta**: `id`, `name`, `description`, `thumbnail`, `category: EditStyleCategory`, `tags?`, `builtIn`
- **Sub-objects**: `captions: EditStyleCaptions`, `zoom: EditStyleZoom`, `broll: EditStyleBRoll`, `sound: EditStyleSound`, `overlays: EditStyleOverlays`
- `EditStyleOverlays` bundles: `hookTitle: EditStyleHookTitle`, `rehook: EditStyleRehook`, `progressBar: EditStyleProgressBar`

### `EditStyleCategory` (types.ts:548–554)
`'viral' | 'educational' | 'cinematic' | 'minimal' | 'branded' | 'custom'`

### `ShotStyleAssignment` (shared/types.ts:464–473)
Maps a shot to a style preset:
- `shotIndex: number` — 0-based index into clip's `shots` array
- `presetId: string` — EditStylePreset ID

### `ShotSegment` (shared/types.ts:274–289)
Shot segmentation unit:
- `startTime`, `endTime` (clip-relative seconds)
- `text`, `startWordIndex`, `endWordIndex`
- `breakReason: ShotBreakReason` (sentence-end | pause | clause-boundary | topic-shift | max-duration | start | end)
- `confidence: number` (0–1)

### `CaptionStyle` (types.ts:246–265)
Full caption appearance config:
- `id`, `label`, `fontName`, `fontFile`, `fontSize`
- Colors: `primaryColor`, `highlightColor`, `outlineColor`, `backColor`, `emphasisColor?`, `supersizeColor?`
- Layout: `outline`, `shadow`, `borderStyle`, `wordsPerLine`
- `animation: CaptionAnimation`

### `StitchedClipCandidate` (types.ts:121–133)
Multi-segment narrative clip:
- `id`, `sourceId`, `segments: StitchSegment[]`, `totalDuration`, `narrative`, `hookText`, `score`, `reasoning`, `status`, `cropRegion?`

### `ClipVariantUI` (types.ts:87–98)
Alternative clip version:
- `id`, `label`, `shortLabel`, `hookText`, `startTime`, `endTime`, `overlays`, `captionStyle?`, `description`, `status`

---

## State Fields (by Domain)

### Clips State (clips-slice.ts)
```
clips: Record<string, ClipCandidate[]>        // keyed by sourceId
stitchedClips: Record<string, StitchedClipCandidate[]>  // keyed by sourceId
storyArcs: Record<string, StoryArcUI[]>       // keyed by sourceId
selectedClipIndex: number                      // keyboard nav
selectedClipIds: Set<string>                   // batch multi-select
clipOrder: Record<string, string[]>            // drag-to-reorder
customOrder: boolean
clipViewMode: 'grid' | 'timeline'
searchQuery: string
```

### Settings State (settings-slice.ts)
```
settings: AppSettings                          // ALL render/app settings
processingConfig: ProcessingConfig             // pipeline options
autoMode: AutoModeConfig                       // auto-approve/render
autoModeResult: { ... } | null
settingsProfiles: Record<string, SettingsProfile>
activeProfileName: string | null
hookTemplates: HookTextTemplate[]
activeHookTemplateId: string | null
settingsSnapshot: SettingsProfile | null       // settings lock
settingsChanged: boolean
activeStylePresetId: string | null             // active EditStylePreset
```

### Source/Transcription State (index.ts)
```
sources: SourceVideo[]
activeSourceId: string | null
transcriptions: Record<string, TranscriptionData>
```

### Render State (index.ts)
```
renderProgress: RenderProgress[]
isRendering: boolean
activeEncoder: { encoder: string; isHardware: boolean } | null
renderStartedAt: number | null
renderCompletedAt: number | null
clipRenderTimes: Record<string, { started, completed, duration }>
renderErrors: Record<string, string>
singleRenderClipId: string | null
singleRenderProgress: number
singleRenderStatus: 'idle' | 'rendering' | 'done' | 'error'
singleRenderOutputPath: string | null
singleRenderError: string | null
```

### Pipeline State (pipeline-slice.ts)
```
pipeline: PipelineProgress                     // { stage, message, percent }
failedPipelineStage: PipelineStage | null
completedPipelineStages: Set<PipelineStage>
cachedSourcePath: string | null
pythonStatus: PythonSetupState
pythonSetupError: string | null
pythonSetupProgress: { ... } | null
```

### Undo/Redo (history-slice.ts)
```
_undoStack: UndoableSnapshot[]                 // captures clips, stitchedClips, minScore
_redoStack: UndoableSnapshot[]
canUndo: boolean
canRedo: boolean
```

### Other (index.ts)
```
theme: 'light' | 'dark' | 'system'
isOnline: boolean
hasCompletedOnboarding: boolean
lastSeenVersion: string | null
comparisonClipIds: [string, string] | null
templateLayout: TemplateLayout
targetPlatform: Platform
aiUsage: { totalPromptTokens, totalCompletionTokens, totalCalls, callHistory, sessionStarted }
processingQueue: string[]
queueMode: boolean
queuePaused: boolean
queueResults: Record<string, QueueResult>
isDirty: boolean
lastSavedAt: number | null
errorLog: ErrorLogEntry[]
```

---

## Actions/Methods by Domain

### Clip Mutation (clips-slice.ts)

| Action | Undo? | Description |
|---|---|---|
| `setClips(sourceId, clips)` | No | Bulk set clips for source; stamps `aiStartTime`/`aiEndTime` on first set |
| `updateClipStatus(sourceId, clipId, status)` | ✅ | Set pending/approved/rejected |
| `updateClipTrim(sourceId, clipId, startTime, endTime)` | ✅ | Adjust clip boundaries, recalculates duration |
| `updateClipThumbnail(sourceId, clipId, thumbnail)` | No | Set auto-generated thumbnail |
| `setClipCustomThumbnail(sourceId, clipId, thumbnail)` | No | Set user-provided thumbnail |
| `updateClipCrop(sourceId, clipId, crop)` | No | Set crop region |
| `updateClipHookText(sourceId, clipId, hookText)` | ✅ | Edit hook text |
| `updateClipLoop(sourceId, clipId, loopData)` | No | Set loop optimization results |
| `setClipVariants(sourceId, clipId, variants)` | No | Set variant array |
| `updateVariantStatus(sourceId, clipId, variantId, status)` | ✅ | Approve/reject a variant |
| `setClipPartInfo(sourceId, clipId, partInfo)` | No | Set multi-part info |
| `setClipOverride(sourceId, clipId, key, value)` | No | Set one per-clip render override |
| `clearClipOverrides(sourceId, clipId)` | No | Remove all per-clip overrides |
| `resetClipBoundaries(sourceId, clipId)` | ✅ | Restore AI-original start/end times |
| `rescoreClip(sourceId, clipId, newScore, newReasoning, newHookText?)` | No | Update score + reasoning, preserves `originalScore` |
| `approveAll(sourceId)` | ✅ | Set all clips to 'approved' |
| `approveClipsAboveScore(sourceId, minScore)` | ✅ | Approve >= threshold, reject below; returns counts |
| `rejectAll(sourceId)` | ✅ | Set all clips to 'rejected' |
| `setSelectedClipIndex(index)` | No | Keyboard navigation |
| `reorderClips(sourceId, activeId, overId)` | No | Drag-to-reorder clip order |
| `setCustomOrder(custom)` | No | Toggle custom ordering |

### AI Edit Plan (clips-slice.ts)

| Action | Description |
|---|---|
| `setClipAIEditPlan(sourceId, clipId, plan)` | Store AI-generated edit plan (word emphasis, B-Roll suggestions, SFX) |
| `clearClipAIEditPlan(sourceId, clipId)` | Remove plan (for regeneration) |

### Shot Segmentation (clips-slice.ts)

| Action | Description |
|---|---|
| `setClipShots(sourceId, clipId, shots)` | Store shot segmentation array |
| `clearClipShots(sourceId, clipId)` | Remove shots |

### Shot Style Assignment (clips-slice.ts)

| Action | Description |
|---|---|
| `setShotStyle(sourceId, clipId, shotIndex, presetId)` | Assign style preset to specific shot (replaces existing for that index) |
| `clearShotStyle(sourceId, clipId, shotIndex)` | Remove style for one shot (falls back to global) |
| `setClipShotStyles(sourceId, clipId, assignments)` | Replace all shot style assignments at once |
| `clearAllShotStyles(sourceId, clipId)` | Revert clip to global style only |

### Batch Multi-Select (clips-slice.ts)

| Action | Description |
|---|---|
| `toggleClipSelection(clipId)` | Toggle single clip in selection set |
| `selectAllVisible(clipIds)` | Select all provided clip IDs |
| `clearSelection()` | Clear selection set |
| `batchUpdateClips(sourceId, clipIds, updates)` | ✅ Undo. Batch update status, trim offset, and/or render overrides |

### Stitched Clips (clips-slice.ts)

| Action | Undo? | Description |
|---|---|---|
| `setStitchedClips(sourceId, clips)` | No | Bulk set stitched clips |
| `updateStitchedClipStatus(sourceId, clipId, status)` | ✅ | Approve/reject stitched clip |
| `setStoryArcs(sourceId, arcs)` | No | Set story arc groupings |

### Computed (clips-slice.ts)

| Getter | Description |
|---|---|
| `getApprovedClips(sourceId)` | Filter clips by status === 'approved' |
| `getActiveClips()` | Clips for activeSourceId, sorted by score desc |

### Settings (settings-slice.ts)

**Caption editing:**
- `setCaptionStyle(style: CaptionStyle)` — full caption style object
- `setCaptionsEnabled(enabled)` — toggle captions

**Style preset application:**
- `activeStylePresetId: string | null` — currently active edit style
- `applyEditStylePreset(id)` — looks up preset from `BUILT_IN_EDIT_STYLE_PRESETS`, calls `applyEditStylePresetToSettings()`, persists ID to localStorage

**Sound design:** `setSoundDesignEnabled`, `setSoundDesignTrack`, `setSoundDesignSfxVolume`, `setSoundDesignMusicVolume`, `setSoundDesignMusicDucking`, `setSoundDesignMusicDuckLevel`, `setSoundDesignSfxStyle`

**Auto-zoom:** `setAutoZoomEnabled`, `setAutoZoomMode`, `setAutoZoomIntensity`, `setAutoZoomInterval`

**Hook title overlay:** `setHookTitleEnabled`, `setHookTitleStyle`, `setHookTitleDisplayDuration`, `setHookTitleFontSize`, `setHookTitleTextColor`, `setHookTitleOutlineColor`, `setHookTitleOutlineWidth`, `setHookTitleFadeIn`, `setHookTitleFadeOut`

**Re-hook overlay:** `setRehookEnabled`, `setRehookStyle`, `setRehookDisplayDuration`, `setRehookPositionFraction`

**Progress bar:** `setProgressBarEnabled`, `setProgressBarPosition`, `setProgressBarHeight`, `setProgressBarColor`, `setProgressBarOpacity`, `setProgressBarStyle`

**Brand kit:** `setBrandKitEnabled`, `setBrandKitLogoPath`, `setBrandKitLogoPosition`, `setBrandKitLogoScale`, `setBrandKitLogoOpacity`, `setBrandKitIntroBumperPath`, `setBrandKitOutroBumperPath`

**B-Roll:** `setBRollEnabled`, `setBRollPexelsApiKey`, `setBRollIntervalSeconds`, `setBRollClipDuration`, `setBRollDisplayMode`, `setBRollTransition`, `setBRollPipSize`, `setBRollPipPosition`

**Filler removal:** `setFillerRemovalEnabled`, `setFillerRemovalFillerWords`, `setFillerRemovalSilences`, `setFillerRemovalRepeats`, `setFillerRemovalSilenceThreshold`, `setFillerRemovalWordList`

**Render quality:** `setRenderQuality(Partial<RenderQualitySettings>)`, `setOutputAspectRatio`, `setFilenameTemplate`, `setRenderConcurrency`

**Other settings:** `setGeminiApiKey`, `setOutputDirectory`, `setMinScore` (✅ undo), `setEnableNotifications`, `setDeveloperMode`

**Reset:** `resetSettings()`, `resetSection(section)` — supports 11 section names

**Processing config:** `setProcessingConfig(Partial<ProcessingConfig>)`, `resetProcessingConfig()`

### Settings Profiles (settings-slice.ts)
- `saveProfile(name)` — extracts current settings into a profile, persists
- `loadProfile(name)` — applies profile onto settings (preserving API keys)
- `deleteProfile(name)` — blocked for built-in names
- `renameProfile(oldName, newName)` — blocked for built-in names

### Settings Lock / Snapshot (settings-slice.ts)
- `snapshotSettings()` — capture current settings for comparison
- `clearSettingsSnapshot()` — clear snapshot
- `revertToSnapshot()` — restore settings from snapshot
- `dismissSettingsWarning()` — clear the changed flag without reverting
- `getSettingsDiff()` — returns array of human-readable changed section names

### Hook Templates (settings-slice.ts)
- `setActiveHookTemplateId(id)` — set active template
- `addHookTemplate(template)` — add user template (auto UUID)
- `editHookTemplate(id, updates)` — edit non-builtIn template
- `removeHookTemplate(id)` — remove non-builtIn template

---

## Edit Style Preset System

### Two Preset Registries

1. **`BUILT_IN_EDIT_STYLE_PRESETS`** (helpers.ts:674–894) — 10 presets exported from helpers, used by `applyEditStylePreset` in settings-slice. IDs: `hormozi-fire`, `tiktok-hype`, `edu-clear`, `podcast-cuts`, `cinematic-dark`, `chill-vibes`, `ghost-clean`, `reels-minimal`, `premium-brand`, `creator-mode`

2. **`EDIT_STYLE_PRESETS`** (edit-style-presets.ts:13–883) — 10 different presets in a separate file. IDs: `impact`, `clarity`, `velocity`, `growth`, `volt`, `film`, `ember`, `rebel`, `neon`, `prime`. Exported separately but NOT referenced by the settings-slice `applyEditStylePreset` action.

### Application Flow
`applyEditStylePreset(id)` in settings-slice:
1. Finds preset from `BUILT_IN_EDIT_STYLE_PRESETS` (the helpers.ts set)
2. Calls `applyEditStylePresetToSettings(settings, preset)` which maps preset fields onto `AppSettings`
3. Persists `activeStylePresetId` to localStorage
4. Updates `settings` and `activeStylePresetId` in store

### `applyEditStylePresetToSettings` (helpers.ts:642–671)
Maps EditStylePreset → AppSettings:
- `preset.captions.style` → `settings.captionStyle`
- `preset.captions.enabled` → `settings.captionsEnabled`
- `preset.zoom` → `settings.autoZoom`
- `preset.sound` → `settings.soundDesign`
- `preset.broll` → `settings.broll` (preserves pexelsApiKey)
- `preset.overlays.hookTitle.*` → `settings.hookTitleOverlay.*` (preserves fadeIn/fadeOut)
- `preset.overlays.rehook.*` → `settings.rehookOverlay.*` (preserves fadeIn/fadeOut/positionFraction)
- `preset.overlays.progressBar` → `settings.progressBarOverlay`

---

## Shot Styles Flow

### Data Flow
1. **Segmentation**: `setClipShots(sourceId, clipId, shots: ShotSegment[])` stores array on clip
2. **Assignment**: `setShotStyle(sourceId, clipId, shotIndex, presetId)` creates/updates `ShotStyleAssignment` in clip's `shotStyles` array
3. **Render resolution**: At IPC time, `ShotStyleAssignment[]` + preset definitions → `ShotStyleConfig[]` (concrete render params per shot)

### Shot Style Assignment Logic (clips-slice.ts:429–488)
- `setShotStyle`: filters out existing assignment for same shotIndex, pushes new `{shotIndex, presetId}`
- `clearShotStyle`: filters out assignment for shotIndex; sets `shotStyles` to `undefined` if empty
- `setClipShotStyles`: replaces entire array; `undefined` if empty
- `clearAllShotStyles`: sets `shotStyles` to `undefined`

---

## Persistence

| Data | Storage Key | Mechanism |
|---|---|---|
| Settings | `batchcontent-settings` | Auto-persisted via `useStore.subscribe` in index.ts |
| Processing config | `batchcontent-processing-config` | Auto-persisted via `useStore.subscribe` |
| Gemini API key | `batchcontent-gemini-key` | localStorage (excluded from settings blob) |
| Pexels API key | `batchcontent-pexels-key` | localStorage (excluded from settings blob) |
| Settings profiles | `batchcontent-settings-profiles` | Explicit persist on save/delete/rename |
| Active profile | `batchcontent-active-profile` | localStorage |
| Hook templates | `batchcontent-hook-templates` | Explicit persist on add/edit/remove |
| Active hook template | `batchcontent-active-hook-template` | localStorage |
| Active style preset | `batchcontent-active-style-preset` | localStorage |
| Theme | `batchcontent-theme` | localStorage |
| Onboarding | `batchcontent-onboarding-done` | localStorage |
| Last seen version | `batchcontent-last-seen-version` | localStorage |
| Project file | `.batchcontent` files | Via services/project-service.ts (not in store) |

---

## Undo/Redo System

**Tracked state** (UndoableSnapshot): `clips`, `stitchedClips`, `minScore`

**Actions that push undo**: `updateClipStatus`, `updateClipTrim`, `updateClipHookText`, `updateVariantStatus`, `approveAll`, `approveClipsAboveScore`, `rejectAll`, `batchUpdateClips`, `updateStitchedClipStatus`, `setMinScore`, `resetClipBoundaries`

**Max stack**: Imported from `@shared/constants` as `MAX_UNDO`

---

## Dirty Tracking

The store subscribes to itself (index.ts:270–279) and marks `isDirty = true` when `clips`, `stitchedClips`, or `settings.minScore` references change.

---

## Notable Observations

1. **Two disjoint edit style preset registries**: `BUILT_IN_EDIT_STYLE_PRESETS` in helpers.ts (10 presets) and `EDIT_STYLE_PRESETS` in edit-style-presets.ts (10 different presets). The settings-slice `applyEditStylePreset` action only uses the helpers.ts set. The edit-style-presets.ts file exports a `getEditStylePreset(id)` function but it's unclear where it's consumed for shot style resolution.

2. **Shot style assignment references presetId** but the shot-style resolution (from `ShotStyleAssignment` to `ShotStyleConfig`) happens outside the store, at IPC/render time.

3. **No user-created EditStylePresets in the store**: There's no state field or action for managing user-created edit style presets (category: 'custom'). The current system only supports built-in presets.

4. **`applyEditStylePresetToSettings` preserves some overlay sub-fields** (fadeIn/fadeOut for hookTitle, fadeIn/fadeOut/positionFraction for rehook) by spreading from existing settings first.

5. **Caption presets** in helpers.ts (`CAPTION_PRESETS`) are referenced by the built-in edit style presets and as defaults. 7 presets: `captions-ai`, `hormozi-bold`, `tiktok-glow`, `reels-clean`, `clarity-boxes`, `classic-karaoke`, `impact-two`.

6. **Project reset** (project-slice.ts) clears sources, transcriptions, clips, pipeline, render, errors, settings snapshot, and undo stacks — but does NOT reset settings, processingConfig, or theme.
