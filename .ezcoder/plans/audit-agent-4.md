# Audit: Store, Pipeline, and Type Definitions — Segment-Based Editing Readiness

**Date:** 2025-01-XX  
**Auditor:** Agent 4  
**Scope:** `store.ts` (barrel + slices), `usePipeline.ts`, `preload/index.d.ts`, `preload/index.ts`

---

## 1. Zustand Store — Full State Shape

### 1.1 Architecture

The store is split into domain slices assembled in `src/renderer/src/store/index.ts`:
- `createClipsSlice` → `clips-slice.ts` (18.1K)
- `createSettingsSlice` → `settings-slice.ts` (11.8K)
- `createPipelineSlice` → `pipeline-slice.ts` (2.9K)
- `createProjectSlice` → `project-slice.ts` (1.0K)
- `createHistorySlice` → `history-slice.ts` (7.2K)
- `createErrorsSlice` → `errors-slice.ts` (798B)

Uses `zustand/middleware/immer` with `enableMapSet()` for Set/Map support.

### 1.2 Complete State Properties (from `AppState` interface in `types.ts`)

#### Source Videos
| Property | Type | Notes |
|---|---|---|
| `sources` | `SourceVideo[]` | List of imported videos |
| `activeSourceId` | `string \| null` | Currently selected source |

#### Transcriptions
| Property | Type | Notes |
|---|---|---|
| `transcriptions` | `Record<string, TranscriptionData>` | Keyed by source ID |

#### Clip Candidates
| Property | Type | Notes |
|---|---|---|
| `clips` | `Record<string, ClipCandidate[]>` | Keyed by source ID |

#### Pipeline
| Property | Type | Notes |
|---|---|---|
| `pipeline` | `PipelineProgress` | `{stage, message, percent}` |
| `failedPipelineStage` | `PipelineStage \| null` | For retry UI |
| `completedPipelineStages` | `Set<PipelineStage>` | Skip on retry |
| `cachedSourcePath` | `string \| null` | Avoids re-download |

#### Render
| Property | Type | Notes |
|---|---|---|
| `renderProgress` | `RenderProgress[]` | Per-clip render status |
| `isRendering` | `boolean` | |
| `activeEncoder` | `{encoder, isHardware} \| null` | |
| `renderStartedAt` | `number \| null` | |
| `renderCompletedAt` | `number \| null` | |
| `clipRenderTimes` | `Record<string, {started, completed, duration}>` | |
| `renderErrors` | `Record<string, string>` | Keyed by clipId |
| `singleRenderClipId` | `string \| null` | |
| `singleRenderProgress` | `number` | |
| `singleRenderStatus` | `'idle' \| 'rendering' \| 'done' \| 'error'` | |
| `singleRenderOutputPath` | `string \| null` | |
| `singleRenderError` | `string \| null` | |

#### Settings
| Property | Type | Notes |
|---|---|---|
| `settings` | `AppSettings` | Global settings (see below) |
| `processingConfig` | `ProcessingConfig` | Pipeline toggles |
| `autoMode` | `AutoModeConfig` | Auto-approve + auto-render |
| `autoModeResult` | `{sourceId, approved, threshold, didRender} \| null` | |
| `settingsSnapshot` | `SettingsProfile \| null` | Locked at pipeline start |
| `settingsChanged` | `boolean` | Drift detection |

#### AppSettings (global settings object)
| Property | Type | ⚠️ Scope |
|---|---|---|
| `geminiApiKey` | `string` | Global |
| `outputDirectory` | `string \| null` | Global |
| `minScore` | `number` | Global |
| `captionStyle` | `CaptionStyle` | **⚠️ GLOBAL — single style for all clips** |
| `captionsEnabled` | `boolean` | **⚠️ GLOBAL** |
| `soundDesign` | `SoundDesignSettings` | **⚠️ GLOBAL** |
| `autoZoom` | `ZoomSettings` | **⚠️ GLOBAL** |
| `brandKit` | `BrandKit` | Global |
| `hookTitleOverlay` | `HookTitleOverlaySettings` | **⚠️ GLOBAL** |
| `rehookOverlay` | `RehookOverlaySettings` | **⚠️ GLOBAL** |
| `progressBarOverlay` | `ProgressBarOverlaySettings` | **⚠️ GLOBAL** |
| `broll` | `BRollSettings` | **⚠️ GLOBAL** |
| `fillerRemoval` | `FillerRemovalSettings` | Global |
| `enableNotifications` | `boolean` | Global |
| `developerMode` | `boolean` | Global |
| `renderQuality` | `RenderQualitySettings` | Global |
| `outputAspectRatio` | `OutputAspectRatio` | Global |
| `filenameTemplate` | `string` | Global |
| `renderConcurrency` | `number` | Global |

#### Stitched Clips & Story Arcs
| Property | Type | Notes |
|---|---|---|
| `stitchedClips` | `Record<string, StitchedClipCandidate[]>` | Keyed by source ID |
| `storyArcs` | `Record<string, StoryArcUI[]>` | Keyed by source ID |

#### Error Log
| Property | Type |
|---|---|
| `errorLog` | `ErrorLogEntry[]` |

#### Clip Selection & Ordering
| Property | Type |
|---|---|
| `selectedClipIndex` | `number` |
| `clipOrder` | `Record<string, string[]>` |
| `customOrder` | `boolean` |
| `clipViewMode` | `'grid' \| 'timeline'` |
| `searchQuery` | `string` |
| `selectedClipIds` | `Set<string>` |

#### Undo/Redo
| Property | Type |
|---|---|
| `_undoStack` | `UndoableSnapshot[]` |
| `_redoStack` | `UndoableSnapshot[]` |
| `canUndo` / `canRedo` | `boolean` |
| `_clipUndoStacks` | `Record<string, ClipUndoEntry[]>` |
| `_clipRedoStacks` | `Record<string, ClipUndoEntry[]>` |
| `_lastEditedClipId` | `string \| null` |
| `_lastEditedSourceId` | `string \| null` |

#### UI State
| Property | Type |
|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` |
| `isOnline` | `boolean` |
| `hasCompletedOnboarding` | `boolean` |
| `lastSeenVersion` | `string \| null` |
| `templateLayout` | `TemplateLayout` |
| `targetPlatform` | `Platform` |

#### Batch Queue
| Property | Type |
|---|---|
| `processingQueue` | `string[]` |
| `queueMode` | `boolean` |
| `queuePaused` | `boolean` |
| `queueResults` | `Record<string, QueueResult>` |

#### Hook Templates
| Property | Type |
|---|---|
| `hookTemplates` | `HookTextTemplate[]` |
| `activeHookTemplateId` | `string \| null` |

#### Clip Comparison
| Property | Type |
|---|---|
| `comparisonClipIds` | `[string, string] \| null` |

#### AI Token Usage
| Property | Type |
|---|---|
| `aiUsage` | `{totalPromptTokens, totalCompletionTokens, totalCalls, callHistory[], sessionStarted}` |

#### Settings Profiles
| Property | Type |
|---|---|
| `settingsProfiles` | `Record<string, SettingsProfile>` |
| `activeProfileName` | `string \| null` |

#### Edit Style Presets (from settings-slice)
| Property | Type | Notes |
|---|---|---|
| `activeStylePresetId` | `string \| null` | Active style preset |
| `activeVariantId` | `string \| null` | Active variant within preset |

#### 🆕 Segment Editor (ALREADY EXISTS)
| Property | Type | Notes |
|---|---|---|
| `segments` | `Record<string, VideoSegment[]>` | Keyed by clipId |
| `editStyles` | `EditStyle[]` | Available edit styles |
| `selectedEditStyleId` | `string \| null` | Active edit style |

#### Dirty State
| Property | Type |
|---|---|
| `isDirty` | `boolean` |
| `lastSavedAt` | `number \| null` |

#### Python Setup
| Property | Type |
|---|---|
| `pythonStatus` | `PythonSetupState` |
| `pythonSetupError` | `string \| null` |
| `pythonSetupProgress` | `{stage, message, percent, ...} \| null` |

---

### 1.3 ClipCandidate — Full Shape (Critical for Segment Feature)

```typescript
interface ClipCandidate {
  id: string
  sourceId: string
  startTime: number
  endTime: number
  duration: number
  text: string
  score: number
  originalScore?: number
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
  overrides?: ClipRenderSettings  // ⚠️ Per-clip but NOT per-segment
  aiStartTime?: number
  aiEndTime?: number
  aiEditPlan?: AIEditPlan          // ⚠️ One plan per clip, not per segment
  shots?: ShotSegment[]            // ✅ ALREADY per-segment segmentation
  shotStyles?: ShotStyleAssignment[] // ✅ ALREADY per-shot style mapping
  fillerSegments?: FillerSegmentUI[]
  restoredFillerIndices?: number[]
  fillerTimeSaved?: number
}
```

### 1.4 ClipRenderSettings — Per-Clip Overrides

```typescript
interface ClipRenderSettings {
  enableCaptions?: boolean       // ⚠️ One toggle per clip, not per-segment
  enableHookTitle?: boolean
  enableProgressBar?: boolean
  enableAutoZoom?: boolean       // ⚠️ One zoom setting per clip
  enableSoundDesign?: boolean
  enableBrandKit?: boolean
  layout?: 'default' | 'blur-background'  // ⚠️ One layout per clip
  accentColor?: string           // ⚠️ One accent per clip
}
```

---

### 1.5 State That Assumes One-Style-Per-Clip ⚠️

1. **`settings.captionStyle`** — Single global `CaptionStyle` object. All clips share one caption style unless overridden by `ClipRenderSettings` (which also has no per-segment granularity).

2. **`settings.autoZoom`** — Single global `ZoomSettings`. One zoom mode/intensity for all content.

3. **`ClipCandidate.overrides`** (`ClipRenderSettings`) — Per-clip but not per-segment. Has one `accentColor`, one `layout`, one toggle for captions/zoom.

4. **`ClipCandidate.aiEditPlan`** — One `AIEditPlan` per clip. Contains word emphasis, B-Roll suggestions, and SFX suggestions at clip level. No concept of segment boundaries.

5. **`settings.hookTitleOverlay` / `rehookOverlay` / `progressBarOverlay`** — Global overlay settings. No per-segment variation concept.

6. **`settings.broll`** — Global B-Roll settings. B-Roll display mode is per-clip at best.

### 1.6 State That ALREADY Supports Segments ✅

1. **`ClipCandidate.shots`** (`ShotSegment[]`) — Per-clip shot segmentation with time boundaries, word indices, and break reasons. **This is the foundation** for segment-based editing.

2. **`ClipCandidate.shotStyles`** (`ShotStyleAssignment[]`) — Maps each shot index to a style preset ID. The render pipeline already resolves these to concrete `ShotStyleConfig` objects.

3. **`AppState.segments`** (`Record<string, VideoSegment[]>`) — Per-clip `VideoSegment` arrays with full style information (zoomKeyframes, transitions, captionText, segmentStyleId). **This store section already exists but appears to be a parallel/newer system alongside shots/shotStyles.**

4. **`AppState.editStyles`** — Array of `EditStyle` objects.

5. **`AppState.selectedEditStyleId`** — Currently selected edit style.

### 1.7 CONFLICT: Two Parallel Segment Systems

**Critical finding:** The store has TWO segment-based systems that coexist with overlapping responsibilities:

| System | Location | Granularity |
|---|---|---|
| **Shots + ShotStyles** | `ClipCandidate.shots` + `ClipCandidate.shotStyles` | Shot segmentation → per-shot style preset assignment. Shot times are clip-relative. Resolved at render time via `shot-style-resolver.ts`. |
| **VideoSegments** | `AppState.segments[clipId]` | Full `VideoSegment` objects with their own zoomKeyframes, transitions, captionText, segmentStyleId. A separate namespace, not on ClipCandidate. |

These two systems need to be **unified or clearly layered**. Currently, `shots` + `shotStyles` on `ClipCandidate` is the one that's wired into the render pipeline (`ShotStyleConfig` is resolved via `shot-style-resolver.ts`). The `segments` state + `VideoSegment` type appears to be a newer, richer model (with `zoomKeyframes`, `transitionIn/Out`, `captionText`) that is NOT yet wired into the render pipeline.

### 1.8 Store Actions — Complete List

#### Clip Actions
| Action | Conflicts with Segments? |
|---|---|
| `setClips(sourceId, clips)` | No — sets initial clip data |
| `updateClipStatus(sourceId, clipId, status)` | No |
| `updateClipTrim(sourceId, clipId, start, end)` | ⚠️ **YES** — Changing clip boundaries should invalidate/recalculate segments |
| `updateClipThumbnail` | No |
| `setClipCustomThumbnail` | No |
| `updateClipCrop(sourceId, clipId, crop)` | ⚠️ Crop is one region — segments may want different crops |
| `updateClipHookText` | No |
| `updateClipLoop` | No |
| `setClipVariants` | No |
| `updateVariantStatus` | No |
| `setClipPartInfo` | No |
| `setClipOverride(sourceId, clipId, key, value)` | ⚠️ **YES** — Overrides are per-clip, not per-segment |
| `clearClipOverrides` | ⚠️ Same |
| `resetClipBoundaries` | ⚠️ Should invalidate segments |
| `rescoreClip` | No |
| `setClipAIEditPlan` | ⚠️ One plan per clip — may need per-segment plans |
| `clearClipAIEditPlan` | Same |
| `setClipShots(sourceId, clipId, shots)` | ✅ Already segment-aware |
| `clearClipShots` | ✅ |
| `setShotStyle(sourceId, clipId, shotIndex, presetId)` | ✅ Already per-shot |
| `clearShotStyle` | ✅ |
| `setClipShotStyles(sourceId, clipId, assignments)` | ✅ |
| `clearAllShotStyles` | ✅ |
| `setClipFillers` | No |
| `toggleFillerRestore` | No |
| `clearClipFillers` | No |
| `approveAll` / `rejectAll` | No |
| `approveClipsAboveScore` | No |
| `batchUpdateClips` | ⚠️ Batch overrides are per-clip only |

#### Segment Editor Actions (already exist)
| Action | Notes |
|---|---|
| `setSegments(clipId, segments)` | Sets VideoSegment[] for a clip |
| `updateSegment(clipId, segmentId, updates)` | Partial update of one VideoSegment |
| `setEditStyles(styles)` | Sets available EditStyle[] |
| `setSelectedEditStyleId(styleId)` | Sets active edit style |

#### Settings Actions (all global — potential segment conflicts)
`setCaptionStyle`, `setCaptionsEnabled`, `setAutoZoomEnabled`, `setAutoZoomIntensity`, `setAutoZoomInterval`, `setHookTitleEnabled`, `setRehookEnabled`, `setProgressBarEnabled`, `setBRollEnabled`, etc. — **All operate on global settings. None have per-segment variants.**

---

## 2. Pipeline Hook — `usePipeline.ts`

### 2.1 Complete Pipeline Step Sequence

```
Step 1:  downloading        → downloadStage(ctx)
Step 2:  transcribing       → transcriptionStage(ctx, sourcePath)
Step 3:  scoring            → clipMappingStage(ctx, transcription)
Step 3.1: (no stage change) → thumbnailStage(ctx, sourcePath, clips)
Step 3.2: (scoring stage)   → Filler detection (inline, not a separate stage module)
Step 3.5: optimizing-loops  → loopOptimizationStage(ctx, transcription, clips)
Step 3.6: generating-variants → variantGenerationStage(ctx, transcription, clips)
Step 3.7: stitching         → stitchGenerationStage(ctx, transcription)
Step 4:  detecting-faces    → faceDetectionStage(ctx, sourcePath, clips)
Step 5:  detecting-arcs     → storyArcStage(ctx, transcription, clips)
Step 6:  ai-editing         → aiEditStage(ctx, clips)
Done:    (no stage)         → notificationStage(ctx, clips, autoModeRanRef)
```

### 2.2 Pipeline Stage Order Constant

```typescript
const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'downloading',
  'transcribing',
  'scoring',
  'optimizing-loops',
  'generating-variants',
  'stitching',
  'detecting-faces',
  'detecting-arcs',
  'ai-editing'
]
```

### 2.3 Pipeline Architecture

- **Linear flow** — Each stage runs sequentially. Stages can be skipped via `shouldSkip()` for resume-from-stage support.
- **Stage modules** — Each stage is a separate async function in `src/renderer/src/hooks/pipeline-stages/`.
- **Context pattern** — All stages receive a `PipelineContext` with store setters, cancellation check, and pipeline progress updater.
- **State reads** — `useStore.getState()` is called imperatively at pipeline start for settings/config. Stages can also call `ctx.getState()` for fresh reads.
- **IPC calls** — Each stage makes IPC calls via `window.api.*` to the main process.
- **Error handling** — Shared `handleStageError()` rethrows cancellation, logs everything else. The outer try/catch in `processVideo` captures the failed stage.

### 2.4 PipelineContext Shape

```typescript
interface PipelineContext {
  source: SourceVideo
  check: () => void                           // Cancellation
  setPipeline: (progress) => void             // Progress UI
  addError: (entry) => void                   // Error log
  markStageCompleted: (stage) => void         // Resume support
  shouldSkip: (stage) => boolean              // Resume support
  getState: () => AppState                    // Fresh state reads
  store: {                                    // Store setters
    setTranscription, setClips, updateClipCrop, updateClipLoop,
    updateClipTrim, updateClipThumbnail, setClipVariants,
    setStitchedClips, setStoryArcs, setClipPartInfo,
    setCachedSourcePath, setClipAIEditPlan, setClipFillers
  }
  geminiApiKey: string                        // Snapshot at start
  processingConfig: {                         // Snapshot at start
    targetDuration, enablePerfectLoop, clipEndMode,
    enableVariants, enableClipStitching, enableMultiPart,
    enableAiEdit
  }
}
```

### 2.5 Where Segment Splitting + Style Assignment Would Fit

**Recommended insertion point: Between Step 6 (ai-editing) and Done (notification)**

```
Step 6:   ai-editing         → aiEditStage(ctx, clips)
Step 6.5: segment-splitting  → segmentSplitStage(ctx, clips)  ← NEW
Step 6.6: style-assignment   → segmentStyleStage(ctx, clips)  ← NEW
Done:     notification       → notificationStage(...)
```

**Rationale:**
- Needs transcription (Step 2) for word timestamps
- Needs clips with word timestamps (Step 3)
- Needs face detection (Step 4) for crop data to inform segment framing
- Can use AI edit plans (Step 6) to inform segment style choices
- Should run AFTER all analysis but BEFORE notification/render

**Alternative:** Could also slot between face detection (Step 4) and story arcs (Step 5), since it doesn't depend on arcs. But running after ai-editing makes more sense because the AI edit plan's B-Roll/SFX suggestions can inform segment style assignment.

### 2.6 Required Pipeline Changes

1. **Add `PipelineStage` values:** `'segmenting'` and/or `'assigning-styles'` to the union type
2. **Add to `PIPELINE_STAGE_ORDER`** for resume support
3. **Add `isProcessing()` check** for new stage values
4. **Add store setter to `PipelineContext.store`:** `setClipShots`, `setClipShotStyles`, `setSegments`
5. **Add `processingConfig.enableSegmentEditing`** toggle
6. **Create `segment-split-stage.ts`** and `segment-style-stage.ts` in `pipeline-stages/`
7. **Add IPC calls:** `window.api.segmentClipIntoShots()` is already available, `window.api.splitSegmentsForEditor()` and `window.api.assignSegmentStyles()` also exist
8. **Wire up in `usePipeline.ts`:** Import new stages, add to the sequential flow

### 2.7 Tight Coupling Assessment

The pipeline is **moderately coupled** to a linear flow but **well-factored for extension:**
- ✅ Each stage is an independent module
- ✅ Context pattern makes it easy to add new stages
- ✅ Resume-from-stage support means stages can be skipped
- ⚠️ The `clips` variable is passed between stages and mutated along the way (loop optimization modifies clip boundaries)
- ⚠️ `PipelineStage` is a union type that needs updating
- ⚠️ `isProcessing()` is a hardcoded list of stage values

---

## 3. Type Definitions — `src/preload/index.d.ts`

### 3.1 All Types/Interfaces Defined

#### Core Media Types
- `VideoMetadata` — `{duration, width, height, codec, fps, audioCodec}`
- `YouTubeDownloadResult` — `{path, title, duration}`
- `WordTimestamp` — `{text: string, start: number, end: number}`
- `SegmentTimestamp` — `{text: string, start: number, end: number}`
- `TranscriptionResult` — `{text, words: WordTimestamp[], segments: SegmentTimestamp[]}`
- `TranscriptionProgress` — `{stage, message, percent?}`

#### Scoring
- `ScoredSegment` — `{startTime, endTime, text, score, hookText, reasoning}`
- `ScoringResult` — `{segments: ScoredSegment[], summary, keyTopics}`
- `ScoringProgress` — `{stage, message}`

#### Face/Crop
- `CropRegion` — `{x, y, width, height, faceDetected}`
- `FaceDetectionProgress` — `{segment, total}`

#### Sound/Audio
- `SoundDesignSettings` — `{enabled, backgroundMusicTrack, sfxVolume, musicVolume, musicDucking, musicDuckLevel, sfxStyle}`

#### Auto-Zoom
- `AutoZoomSettings` — `{enabled, mode, intensity, intervalSeconds}`

#### Brand Kit
- `BrandKitSettings` — `{enabled, logoPath, logoPosition, logoScale, logoOpacity, introBumperPath, outroBumperPath}`

#### Overlay Settings
- `HookTitleOverlaySettings` — `{enabled, style, displayDuration, fadeIn, fadeOut, fontSize, textColor, outlineColor, outlineWidth}`
- `RehookOverlaySettings` — `{enabled, style, displayDuration, fadeIn, fadeOut, positionFraction}`
- `ProgressBarOverlaySettings` — `{enabled, position, height, color, opacity, style}`

#### Render Types
- `RenderClipJob` — **Comprehensive render job descriptor** (see detailed analysis below)
- `RenderBatchOptions` — **Batch render config** (see detailed analysis below)
- `RenderClipStartEvent` — `{clipId, index, total, encoder, encoderIsHardware}`
- `RenderClipProgressEvent` — `{clipId, percent}`
- `RenderClipDoneEvent` — `{clipId, outputPath}`
- `RenderClipErrorEvent` — `{clipId, error, ffmpegCommand?}`
- `RenderBatchResultEvent` — `{completed, failed, total}`

#### Caption Types
- `CaptionStyleInput` — `{fontName, fontSize, primaryColor, highlightColor, outlineColor, backColor, outline, shadow, borderStyle, wordsPerLine, animation, emphasisColor?, supersizeColor?}`

#### Story Arc Types
- `StoryArcClip` — `{startTime, endTime, score, text?, hookText?, reasoning?, curiosityScore?, combinedScore?}`
- `StoryArc` — `{id, title, clips: StoryArcClip[], narrativeDescription}`
- `PartInfo` — `{partNumber, totalParts, title, endCardText}`
- `SeriesMetadata` — `{seriesTitle, parts: PartInfo[]}`
- `PartNumberConfig` — `{position?, fontSize?, textColor?, bgColor?, bgOpacity?, padding?, fontFilePath?}`
- `EndCardConfig` — `{bgColor?, bgOpacity?, fontSize?, textColor?, fadeDuration?, position?, fontFilePath?}`

#### Curiosity Gap Types
- `CuriosityGap` — `{openTimestamp, resolveTimestamp, type, score, description}`
- `ClipBoundary` — `{start, end, reason}`
- `CuriosityClipCandidate` — `{startTime, endTime, score, text?, hookText?, reasoning?, curiosityScore?, combinedScore?}`

#### Split-Screen Layout Types
- `SplitScreenVideoSource` — `{path, sourceWidth, sourceHeight, crop?}`
- `SplitScreenConfig` — `{ratio, divider?, pipPosition?, pipSize?, pipCornerRadius?}`
- `SplitScreenFilterResult` — `{filterComplex, inputCount}`

#### Loop Optimizer Types
- `LoopStrategy` — `'hard-cut' | 'thematic' | 'audio-match' | 'crossfade' | 'none'`
- `LoopAnalysis` — `{loopScore, strategy, suggestedEndAdjust, suggestedStartAdjust, reason}`
- `LoopOptimizedClip` — `{start, end, strategy, crossfadeDuration?}`

#### Safe Zone Types
- `Platform` — `'tiktok' | 'reels' | 'shorts' | 'universal'`
- `ElementType` — Various element placement types
- `SafeZoneRect` — `{x, y, width, height}`
- `PlatformDeadZones` — `{top, bottom, left, right}`
- `PlatformSafeZone` — `{name, safeRect, deadZones, engagementButtonColumn}`
- `AssMargins` — `{MarginL, MarginR, MarginV}`

#### Description Generator Types
- `PlatformDescription` — `{platform, text, hashtags}`
- `ClipDescription` — `{shortDescription, hashtag, longDescription?, platforms}`
- `DescriptionClipInput` — `{transcript, hookText?, reasoning?}`

#### Word Emphasis Types
- `EmphasizedWord` — `{text, start, end, emphasis: 'normal' | 'emphasis' | 'supersize'}`
- `WordEmphasisResult` — `{words, usedAI}`

#### AI Edit Plan Types
- `AIEditPlanSFXType` — Union of 9 SFX type strings
- `AIEditPlanWordEmphasis` — `{wordIndex, text, start, end, level}`
- `AIEditPlanBRollSuggestion` — `{timestamp, duration, keyword, displayMode, transition, reason}`
- `AIEditPlanSFXSuggestion` — `{timestamp, type, reason}`
- `AIEditPlan` — `{clipId, stylePresetId, stylePresetName, wordEmphasis[], brollSuggestions[], sfxSuggestions[], reasoning, generatedAt}`
- `BatchEditPlanInput` — `{clipId, clipStart, clipEnd, words, transcriptText}`
- `BatchEditPlanProgress` — `{clipIndex, totalClips, clipId, stage, message}`

#### Clip Variant Types
- `OverlayType` — `'hook-title' | 'rehook' | 'progress-bar'`
- `VariantOverlayConfig` — `{type, style?, text?, color?}`
- `CaptionStylePreset` — `'bold' | 'minimal' | 'none' | 'default'`
- `VariantLayout` — `'standard' | 'blur-background'`
- `ClipVariant` — `{id, label, startTime, endTime, overlays, captionStyle, layout, hookText?, description}`
- `VariantRenderConfig` — `{clipId, outputFileName, startTime, endTime, hookTitleText?, ...}`
- `VariantLabel` — `{id, label, description, badge}`
- `OverlayCapabilities` — `{hookTitle, rehook, progressBar}`

#### Fake Comment Overlay Types
- `FakeCommentData` — `{username, text, emoji?, profileColor, likeCount}`
- `FakeCommentConfig` — `{enabled, style, position, appearTime, displayDuration, fadeIn, fadeOut}`

#### Emoji Burst Types
- `EmojiPreset` — `'funny' | 'fire' | 'shock' | 'love' | 'custom'`
- `EmojiMoment` — `{timestamp, duration, emojis, intensity}`
- `EmojiBurstConfig` — `{enabled, preset, customEmojis?, fontSize, floatDistance, burstCount, spread, startY}`

#### Blur Background Types
- `BlurBackgroundConfig` — `{blurIntensity, darken, vignette, borderShadow}`

#### Python Setup Types
- `PythonSetupStatus` — `{ready, stage, venvPath, embeddedPythonAvailable}`
- `PythonSetupProgress` — `{stage, message, percent, package?, currentPackage?, totalPackages?}`

#### Clip Stitcher Types
- `StitchSegmentRole` — Union of 10 role strings
- `StitchFramework` — `'hook-escalate-payoff' | 'why-what-how'`
- `StitchSegment` — `{startTime, endTime, text, role, overlayText?}`
- `StitchedClip` — `{id, segments, totalDuration, narrative, hookText, score, reasoning, framework, rehookText?}`
- `StitchingResult` — `{clips, summary}`
- `StitchingProgress` — `{stage, message}`

#### Segment Editor Types (ALREADY EXIST in index.d.ts)
- `SegmentStyleCategory` — `'main-video' | 'main-video-text' | 'main-video-images' | 'fullscreen-image' | 'fullscreen-text'`
- `SegmentStyleVariant` — `{id, category, name, description, zoomStyle, zoomIntensity, captionPosition, imageLayout?, imagePlacement?}`
- `ZoomKeyframe` — `{time, scale, x, y, easing}`
- `TransitionType` — `'none' | 'hard-cut' | 'crossfade' | 'flash-cut' | 'color-wash'`
- `VideoSegment` — `{id, clipId, index, startTime, endTime, captionText, words, segmentStyleId, segmentStyleCategory, zoomKeyframes, transitionIn, transitionOut}`
- `EditStyle` — `{id, name, energy, accentColor, captionBgOpacity, letterbox, defaultZoomStyle, defaultZoomIntensity, defaultTransition, flashColor, targetEditsPerSecond, captionStyle, availableSegmentStyles}`

#### Shot Segmentation Types (ALREADY EXIST in index.d.ts)
- `ShotBreakReason` — Union of 7 reason strings
- `ShotSegment` — `{startTime, endTime, text, startWordIndex, endWordIndex, breakReason, confidence}`
- `ShotSegmentationResult` — `{shots, shotCount, avgDuration}`

#### Recent Projects
- `RecentProjectEntry` — `{path, name, lastOpened, clipCount, sourceCount}`

#### Filler Detection
- `FillerSegment` — `{start, end, type, label}`
- `FillerDetectionSettings` — `{removeFillerWords, trimSilences, removeRepeats, silenceThreshold, silenceTargetGap, fillerWords}`
- `FillerDetectionResult` — `{segments, timeSaved, counts}`

---

### 3.2 Api Interface — All IPC Channels

#### File Dialogs (3)
`openFiles`, `openDirectory`, `getPathForFile`

#### FFmpeg (5)
`getMetadata`, `extractAudio`, `getThumbnail`, `getWaveform`, `splitSegments`

#### YouTube (2)
`downloadYouTube`, `onYouTubeProgress`

#### Transcription (3)
`transcribeVideo`, `formatTranscriptForAI`, `onTranscribeProgress`

#### AI Scoring & Generation (5)
`scoreTranscript`, `onScoringProgress`, `generateHookText`, `rescoreSingleClip`, `generateRehookText`

#### Validation (2)
`validateGeminiKey`, `validatePexelsKey`

#### Face Detection (2)
`detectFaceCrops`, `onFaceDetectionProgress`

#### Captions (1)
`generateCaptions`

#### Brand Kit (5)
`selectBrandLogo`, `selectIntroBumper`, `selectOutroBumper`, `copyBrandLogo`, `copyBrandBumper`

#### Render (10)
`startBatchRender`, `cancelRender`, `onRenderClipStart`, `onRenderClipPrepare`, `onRenderClipProgress`, `onRenderClipDone`, `onRenderClipError`, `onRenderBatchDone`, `onRenderCancelled`, `renderPreview`

#### Preview (1)
`cleanupPreview`

#### Safe Zones (7)
`getSafeZonePlacement`, `getSafeZoneRect`, `getSafeZoneDeadZones`, `clampToSafeZone`, `isInsideSafeZone`, `safeZoneToAssMargins`, `getAllPlatformSafeZones`

#### Layouts (2)
`buildSplitScreenFilter`, `buildBlurBackgroundFilter`

#### Curiosity Gap (4)
`detectCuriosityGaps`, `optimizeClipBoundaries`, `optimizeClipEndpoints`, `rankClipsByCuriosity`

#### Loop Optimizer (4)
`analyzeLoopPotential`, `optimizeForLoop`, `buildLoopCrossfadeFilter`, `scoreLoopQuality`

#### Story Arc (4)
`detectStoryArcs`, `generateSeriesMetadata`, `buildPartNumberFilter`, `buildEndCardFilter`

#### Clip Variants (3)
`generateClipVariants`, `buildVariantRenderConfigs`, `generateVariantLabels`

#### Description Generator (2)
`generateClipDescription`, `generateBatchDescriptions`

#### Word Emphasis (1)
`analyzeWordEmphasis`

#### AI Edit Plan (5)
`generateEditPlan`, `generateBatchEditPlans`, `onAiEditProgress`, `clearEditPlanCache`, `getEditPlanCacheSize`

#### B-Roll (3)
`generateBRollPlacements`, `generateBRollImage`, `regenerateBRollImage`

#### Segment Editor (4) — ALREADY EXIST ✅
`splitSegmentsForEditor`, `assignSegmentStyles`, `updateSegmentCaption`, `updateSegmentStyle`

#### Shot Segmentation (1) — ALREADY EXISTS ✅
`segmentClipIntoShots`

#### Emoji Burst (2)
`identifyEmojiMoments`, `buildEmojiBurstFilters`

#### Fake Comment (2)
`generateFakeComment`, `buildFakeCommentFilter`

#### Clip Stitcher (2)
`generateStitchedClips`, `onStitchingProgress`

#### Export (2)
`generateManifest`, `exportDescriptions`

#### Project (8)
`saveProject`, `loadProject`, `loadProjectFromPath`, `autoSaveProject`, `loadRecovery`, `clearRecovery`, `getRecentProjects`, `addRecentProject`, `removeRecentProject`, `clearRecentProjects`

#### System (12)
`getDiskSpace`, `getEncoder`, `getAvailableFonts`, `getFontData`, `sendNotification`, `getTempSize`, `cleanupTemp`, `getCacheSize`, `setAutoCleanup`, `getLogPath`, `getLogSize`, `exportLogs`, `openLogFolder`, `getResourceUsage`

#### Shell (2)
`openPath`, `showItemInFolder`

#### Python Setup (3)
`getPythonStatus`, `startPythonSetup`, `onPythonSetupProgress`, `onPythonSetupDone`

#### AI Token Usage (1)
`onAiTokenUsage`

#### Filler Detection (1)
`detectFillers`

#### Settings Window (4)
`openSettingsWindow`, `closeSettingsWindow`, `isSettingsWindowOpen`, `onSettingsWindowClosed`

**Total: ~100+ IPC channels**

### 3.3 ScoredSegment Type

```typescript
interface ScoredSegment {
  startTime: number
  endTime: number
  text: string
  score: number
  hookText: string
  reasoning: string
}
```

**Assessment:** This is the AI scoring output type. It does NOT have segment/shot sub-divisions. For segment-based editing, scoring doesn't need to change — scoring produces clip candidates, segmentation happens afterwards.

### 3.4 Conflicts with New Segment Types

**No conflicts — the types already exist.** The `index.d.ts` already defines:
- `VideoSegment` — full per-segment data model
- `EditStyle` — edit style with segment style references
- `SegmentStyleCategory` / `SegmentStyleVariant` — style taxonomy
- `ZoomKeyframe` / `TransitionType` — per-segment rendering primitives
- `ShotSegment` / `ShotSegmentationResult` — shot-level transcript segmentation
- IPC channels: `splitSegmentsForEditor`, `assignSegmentStyles`, `updateSegmentCaption`, `updateSegmentStyle`, `segmentClipIntoShots`

**What's MISSING from index.d.ts:**
1. No `ShotStyleAssignment` or `ShotStyleConfig` types (these live in `shared/types.ts` but aren't re-declared in the preload types file — they travel on `RenderClipJob` which does exist)
2. No progress event type for segment splitting/style assignment
3. No batch version of segment-splitting API (currently per-clip only)

---

## 4. Preload Bridge — `src/preload/index.ts`

### 4.1 IPC Forwarding Pattern

Two factory helpers eliminate boilerplate:

```typescript
// Request-response (renderer → main → renderer)
function invoke<T = unknown>(channel: string) {
  return (...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)
}

// Event stream (main → renderer)
function listen<C extends SendChannel>(channel: C) {
  return (callback: (data: IpcSendChannelMap[C]) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, data) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}
```

Channel constants come from `@shared/ipc-channels` via `Ch.Invoke.*` and `Ch.Send.*`.

### 4.2 Pattern for Adding New Channels

1. Add channel constant to `@shared/ipc-channels` (`Ch.Invoke.NEW_CHANNEL` or `Ch.Send.NEW_CHANNEL`)
2. For send channels, add the payload type to `IpcSendChannelMap`
3. Add the method to the `api` object in `preload/index.ts` using `invoke()` or `listen()`
4. Add the type signature to the `Api` interface in `preload/index.d.ts`
5. Implement the handler in the main process

### 4.3 Segment Editor Channels Already Wired

```typescript
// Segment Editor
splitSegmentsForEditor: invoke(I.SEGMENTS_SPLIT),
assignSegmentStyles: invoke(I.SEGMENTS_ASSIGN_STYLES),
updateSegmentCaption: invoke(I.SEGMENTS_UPDATE_CAPTION),
updateSegmentStyle: invoke(I.SEGMENTS_UPDATE_STYLE),

// Shot Segmentation
segmentClipIntoShots: invoke(I.SHOT_SEGMENT_CLIP),
```

### 4.4 Limitations

- All IPC is one-way request/response (invoke) or one-way push (send). No bidirectional streaming.
- `invoke()` args are `unknown[]` — type safety is at the `Api` interface level only, no runtime validation.
- Context isolation is required (`process.contextIsolated` check).

---

## 5. Conflicts Summary

### 5.1 Critical Conflicts ❌

| # | Location | Conflict |
|---|---|---|
| 1 | **Two parallel segment systems** | `ClipCandidate.shots` + `shotStyles` vs `AppState.segments` + `VideoSegment`. Both model the same concept with different shapes. The shots system is wired to rendering; the segments system is richer but not wired. |
| 2 | **`updateClipTrim` ignores segments** | Changing clip start/end doesn't invalidate or recalculate segment boundaries. Segments could end up outside the clip's time range. |
| 3 | **`ClipRenderSettings` has no per-segment granularity** | `overrides` on ClipCandidate affect the whole clip. A user can't override zoom or captions for one segment. |
| 4 | **`AIEditPlan` is per-clip, not per-segment** | The AI edit plan generates word emphasis, B-Roll, and SFX for the entire clip. For segment-based editing, the plan should be segment-aware (different B-Roll strategy per segment, etc.). |

### 5.2 Moderate Conflicts ⚠️

| # | Location | Conflict |
|---|---|---|
| 5 | **Global `settings.captionStyle`** | One caption style for all clips/segments. The `ShotStyleConfig` already has per-shot caption overrides, but the global default has no segment concept. |
| 6 | **Global `settings.autoZoom`** | One zoom setting globally. Per-segment zoom is modeled in `VideoSegment.zoomKeyframes` and `ShotStyleConfig.zoom` but the global fallback doesn't account for segment boundaries. |
| 7 | **Pipeline has no segment stage** | `PIPELINE_STAGE_ORDER` and `PipelineStage` don't include segment splitting or style assignment. These need to be added. |
| 8 | **`PipelineContext.store` missing segment setters** | `setClipShots`, `setClipShotStyles`, `setSegments` not in the context's store object. |
| 9 | **`processingConfig` has no segment toggle** | No `enableSegmentEditing` flag. |
| 10 | **Dirty tracking watches `segments`** | Already wired — `state.segments !== prevState.segments` triggers dirty. ✅ Good. |
| 11 | **`activeStylePresetId` read in ai-edit-stage** | `ctx.getState().activeStylePresetId` — this property is defined in the settings slice but NOT in the `AppState` interface in types.ts. It works at runtime but is a type gap. |

### 5.3 No Conflicts ✅

| # | Location | Status |
|---|---|---|
| A | Preload types | `VideoSegment`, `EditStyle`, `SegmentStyleCategory`, `SegmentStyleVariant`, `ZoomKeyframe`, `TransitionType` all defined |
| B | IPC channels | `splitSegmentsForEditor`, `assignSegmentStyles`, `updateSegmentCaption`, `updateSegmentStyle`, `segmentClipIntoShots` all wired |
| C | Store segment state | `segments`, `editStyles`, `selectedEditStyleId` all exist with actions |
| D | Shared types | `ShotStyleAssignment`, `ShotStyleConfig`, `ColorGradeConfig`, `ShotTransitionConfig` all defined |
| E | Render pipeline | `RenderClipJob` already supports `stylePresets[]` and `stylePresetId` per job |
| F | Shot-style-resolver | `src/main/render/shot-style-resolver.ts` already resolves `ShotStyleAssignment[]` to concrete `ShotStyleConfig[]` |

---

## 6. Required Changes for Segment-Based Editing

### 6.1 Unify the Two Segment Systems (HIGHEST PRIORITY)

**Decision needed:** Use `shots` + `shotStyles` (simpler, already wired to render) OR `segments` + `VideoSegment` (richer, has zoom keyframes + transitions + caption text)?

**Recommendation:** Evolve the `shots` + `shotStyles` system as the canonical pipeline representation, and use `VideoSegment` as the UI editing model that produces `ShotStyleAssignment[]` for the render pipeline. The relationship should be:

```
ShotSegment[] (from pipeline) → VideoSegment[] (enriched for UI editing) → ShotStyleAssignment[] (for rendering)
```

### 6.2 Store Changes

1. Add `enableSegmentEditing` to `ProcessingConfig`
2. Add `setClipShots`, `setClipShotStyles`, `setSegments` to `PipelineContext.store`
3. Add segment invalidation logic to `updateClipTrim` and `resetClipBoundaries`
4. Consider per-segment overrides (extend or replace `ClipRenderSettings`)
5. Add `activeStylePresetId` to the `AppState` interface in `types.ts` (it's in the settings slice but missing from the interface)

### 6.3 Pipeline Changes

1. Add `'segmenting'` to `PipelineStage` union
2. Add to `PIPELINE_STAGE_ORDER` after `'ai-editing'`
3. Create `segment-split-stage.ts` — calls `window.api.segmentClipIntoShots()` per clip
4. Create `segment-style-stage.ts` — calls `window.api.assignSegmentStyles()` per clip
5. Add to `isProcessing()` check
6. Wire new store setters into `PipelineContext`

### 6.4 Type Changes

1. Add progress event type for segment operations (e.g. `SegmentSplitProgress`)
2. Add batch version of `segmentClipIntoShots` if performance requires it
3. Consider adding segment-level `AIEditPlan` variant
4. Add `ShotStyleAssignment` / `ShotStyleConfig` to `preload/index.d.ts` if needed for any direct IPC usage

### 6.5 IPC Changes

Minimal — the channels already exist. May need:
1. A batch `segmentAllClipsIntoShots` channel for pipeline efficiency
2. A progress event channel for segment operations
3. Update `RenderClipJob` to carry segment-level style configs (it already has `stylePresets[]`)
