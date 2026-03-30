# Audit: AI Scoring & Edit Plan System vs. Segment-Based Editing

**Date:** 2025-03-30  
**Scope:** Conflict analysis for Captions.ai-style editing (4–7 segments per clip, each with own layout/zoom/caption style)

---

## 1. `src/main/ai-scoring.ts` — AI Scoring Module

### What it produces
- **`ScoringResult`** containing `ScoredSegment[]`, `summary`, `keyTopics`
- Each `ScoredSegment` has: `startTime`, `endTime`, `text`, `score` (69–100), `hookText`, `reasoning`
- Segments are **clip-level** — they represent entire clips to extract from a video (15–120s each)
- No word emphasis data — purely clip selection + viral scoring
- Uses `gemini-2.5-flash-lite` via single prompt call with retry
- Also exports `rescoreSingleClip()` (re-score after boundary edit) and `generateHookText()`

### Mapping to segment boundaries
- **No conflict.** These are clip-selection segments, NOT edit segments within a clip
- The scoring segments define clip boundaries; the new segment-based editing would operate *within* each of these clips
- Clean hierarchical fit: `ScoredSegment` → clip → 4–7 edit segments within clip

### Can word emphasis data drive zoom keyframes?
- **ai-scoring.ts produces NO word emphasis data** — it only scores/selects clips
- Word emphasis is produced by `src/main/ai/edit-plan.ts` (`AIEditPlanWordEmphasis[]`)
- The word emphasis data already has `start`/`end` timestamps per word — **YES, it can drive zoom keyframes**
- The emphasis `level` field (`'emphasis' | 'supersize' | 'box'`) naturally maps to zoom intensity tiers

---

## 2. Per-File Analysis: `src/main/ai/` Directory

### 2.1 `edit-plan.ts` (15.1K) — ⚠️ HIGH CONFLICT

**What it does:** Single Gemini call per clip → returns 3 edit layers:
1. **Word emphasis** — which words to supersize/emphasize in captions (`AIEditPlanWordEmphasis[]`)
2. **B-Roll suggestions** — visual cuts with timestamp, duration, display_mode, transition (`AIEditPlanBRollSuggestion[]`)
3. **SFX recommendations** — sound effect placement (`AIEditPlanSFXSuggestion[]`)

Style-calibrated via `STYLE_CATEGORY_GUIDANCE` (viral/educational/cinematic/minimal/branded/custom).

**Conflict with segment-based editing:**
- **B-Roll suggestions** have their own `displayMode` (`fullscreen | split-top | split-bottom | pip`) and `transition` (`hard-cut | crossfade | swipe-up | swipe-down`) — these DIRECTLY OVERLAP with per-segment layout/zoom/caption config
- The edit plan is **flat** (one list per clip), not segment-aware — B-Roll at timestamp 5.0s doesn't know which segment it falls in
- Word emphasis data is also flat — needs to be partitioned into segments

**Action:** **MODIFY** — Needs segment-awareness. Options:
  - A) Generate edit plan per-segment instead of per-clip (more API calls but cleaner)
  - B) Post-process: partition flat edit plan data into segments by timestamp ranges
  - C) Merge: make the segment generator consume edit plan output to inform its layout decisions

### 2.2 `edit-plan-cache.ts` (6.1K) — ✅ KEEP (modify cache key)

**What it does:** File-based SHA-256 cache for edit plan results. Cache key = `words + clip boundaries + style preset ID`. LRU eviction (50MB, 30 days).

**Conflict:** Cache key doesn't include segment boundaries. If edit plans become segment-aware, the cache key must incorporate segment configuration.

**Action:** **MODIFY** — Add segment count or segment boundaries to cache key when segment-based editing is active.

### 2.3 `edit-plan.test.ts` (18.0K) — ✅ KEEP (extend)

**What it does:** Comprehensive tests for `formatWordsForPrompt`, `parseEditPlanResponse`, `buildEditPlanPrompt`. Covers word emphasis parsing, B-Roll validation, SFX validation, edge cases.

**Conflict:** None currently — tests are for the existing flat structure.

**Action:** **EXTEND** — Add tests for segment-partitioned output when edit-plan.ts gains segment awareness.

### 2.4 `clip-stitcher.ts` (43.7K) — ✅ NO CONFLICT

**What it does:** Creates composite clips from **non-contiguous** segments scattered across the entire video. Each `StitchedClip` has `StitchSegment[]` with roles (hook, rehook, payoff, etc.) and frameworks (hook-escalate-payoff, why-what-how).

**Conflict:** These "segments" are **video-level stitching segments** (picking moments from across an hour-long video), NOT within-clip edit segments. Completely different abstraction level.

**Notable:** The `StitchSegment` already has a `role` concept and `overlayText` — the segment-based editing feature could learn from this pattern for assigning per-segment roles.

**Action:** **KEEP AS-IS.** No conflict. The stitcher produces clips; segment-based editing operates within clips.

### 2.5 `clip-variants.ts` (18.0K) — ⚠️ MODERATE CONFLICT

**What it does:** Generates 3 packaging variants per clip (A: Hook-first, B: Cold open, C: Curiosity builder). Each variant has: adjusted start/end times, overlay configs, caption style preset, layout type.

**Conflict:**
- `CaptionStylePreset` (`'bold' | 'minimal' | 'none' | 'default'`) and `VariantLayout` (`'standard' | 'blur-background'`) are **clip-level** overrides
- Segment-based editing applies layout/caption per-segment, not per-clip
- `OverlayConfig` (hook-title, rehook, progress-bar) is clip-level — doesn't conflict but doesn't integrate

**Action:** **MODIFY** — Variants should either:
  - Generate per-segment layout/style assignments instead of clip-level overrides
  - OR remain as they are but be applied as default starting configs that segments override

### 2.6 `curiosity-gap.ts` (22.8K) — ✅ NO CONFLICT

**What it does:** Detects "curiosity gap" moments (question, story, claim, pivot, tease) in transcripts. Used for clip boundary optimization and re-ranking. Exports `optimizeClipBoundaries()`, `rankClipsByCuriosity()`, `snapToSentenceBoundary()`, `optimizeForCliffhanger()`.

**Conflict:** None — this operates at clip boundary level, adjusting where clips start/end. Segment-based editing operates within those boundaries.

**Action:** **KEEP AS-IS.** Could be a useful signal for segment boundary placement (e.g., curiosity gap open/resolve timestamps could inform segment breaks).

### 2.7 `description-generator.ts` (10.5K) — ✅ NO CONFLICT

**What it does:** Generates platform-specific descriptions (YouTube Shorts, Instagram Reels, TikTok) and hashtags for clips. Single and batch modes. Writes `.txt` files alongside rendered clips.

**Conflict:** None — operates at clip output level, completely orthogonal to within-clip editing.

**Action:** **KEEP AS-IS.**

### 2.8 `loop-optimizer.ts` (19.5K) — ✅ MINIMAL CONFLICT

**What it does:** Analyzes clips for loop potential (TikTok rewatchability). Returns `LoopAnalysis` with loop score, strategy (hard-cut/thematic/audio-match/crossfade/none), and boundary adjustments. Generates FFmpeg crossfade filters.

**Conflict:** Loop optimization adjusts clip start/end boundaries. If segment-based editing has already configured the first/last segment, loop boundary adjustments could invalidate those segment configs.

**Action:** **KEEP** — but ensure loop optimization runs BEFORE segment generation, or that segment generation respects loop-adjusted boundaries.

### 2.9 `story-arc.ts` (18.3K) — ✅ NO CONFLICT

**What it does:** Groups multiple clips into multi-part story arcs (series). Generates series metadata, FFmpeg part-number badges, and end-card overlays.

**Conflict:** None — operates at the multi-clip/series level, above individual clip editing.

**Action:** **KEEP AS-IS.**

---

## 3. Old AI Edit System — Complete Reference Map

### 3.1 Shared Types (`src/shared/types.ts`)

| Line | Symbol | Description |
|------|--------|-------------|
| 444 | `ShotSegment` | A coherent visual thought unit within a clip (2–8s). Has `startTime`, `endTime`, `text`, `startWordIndex`, `endWordIndex`, `breakReason`, `confidence` |
| 462 | `ShotSegmentationResult` | `{ shots: ShotSegment[], shotCount, avgDuration }` |
| 479 | `AIEditPlanWordEmphasis` | Word emphasis tag with `wordIndex`, `text`, `start`, `end`, `level` |
| 493 | `AIEditPlanBRollSuggestion` | B-Roll placement with `timestamp`, `duration`, `keyword`, `displayMode`, `transition`, `reason` |
| 509 | `AIEditPlanSFXType` | Union of 9 SFX type strings |
| 521 | `AIEditPlanSFXSuggestion` | SFX placement with `timestamp`, `type`, `reason` |
| 537 | `AIEditPlan` | Full edit plan: `clipId`, `stylePresetId`, `wordEmphasis[]`, `brollSuggestions[]`, `sfxSuggestions[]`, `reasoning`, `generatedAt` |
| 655 | `ShotStyleAssignment` | Maps `shotIndex` → `presetId` for per-shot style override |
| 673 | `ShotStyleConfig` | Resolved rendering params per shot (caption style, zoom, color grade, transitions, B-Roll mode, music) |

### 3.2 IPC Channels (`src/shared/ipc-channels.ts`)

| Line | Channel | Purpose |
|------|---------|---------|
| 48 | `AI_GENERATE_EDIT_PLAN` | `'ai:generateEditPlan'` — single clip edit plan |
| 49 | `AI_GENERATE_BATCH_EDIT_PLANS` | `'ai:generateBatchEditPlans'` — batch |
| 50 | `AI_EDIT_PLAN_CACHE_CLEAR` | `'ai:editPlanCacheClear'` |
| 51 | `AI_EDIT_PLAN_CACHE_SIZE` | `'ai:editPlanCacheSize'` |

### 3.3 IPC Handlers (`src/main/ipc/ai-handlers.ts`)

| Line | Reference | Purpose |
|------|-----------|---------|
| 36 | `import { generateEditPlan }` | Imports edit plan generator |
| 37 | `import { clearEditPlanCache, getEditPlanCacheSize }` | Cache management |
| 38 | `import { segmentClipIntoShots }` | Shot segmentation |
| 218 | `AI_GENERATE_EDIT_PLAN` handler | Single clip edit plan IPC handler |
| 247 | `AI_GENERATE_BATCH_EDIT_PLANS` handler | Batch edit plan IPC handler |
| 376 | Shot segmentation handler | Calls `segmentClipIntoShots()` |

### 3.4 System Handlers (`src/main/ipc/system-handlers.ts`)

| Line | Reference | Purpose |
|------|-----------|---------|
| 11 | `import { getEditPlanCacheSize }` | Shows cache size in settings |

### 3.5 Shot Segmentation (`src/main/shot-segmentation.ts`)

Existing heuristic-based shot segmentation: splits clips into 2–8s shots based on pauses, topic shifts, sentence boundaries. Config: `targetDuration: 5`, `minDuration: 2`, `maxDuration: 8`. Produces `ShotSegment[]` with `breakReason` and `confidence`.

**KEY OBSERVATION:** This existing `ShotSegment` system is conceptually THE SAME as "4–7 segments per clip" in the new feature. The main differences:
- Current: heuristic-based (pauses, topic shifts)
- New: should be AI-driven (or AI-enhanced) for creative intent
- Current: segments mapped to `ShotStyleAssignment` → different presets per shot
- New: segments should also carry layout, zoom keyframes, caption style per segment

### 3.6 Shot Style Resolver (`src/main/render/shot-style-resolver.ts`)

Resolves `ShotStyleAssignment[]` → `ShotStyleConfig[]`. Each shot gets: `captionStyle`, `zoom` (mode, intensity, interval), `colorGrade`, `transitionIn`, `transitionOut`, `brollMode`, `musicTrack`.

**KEY OBSERVATION:** This is ALREADY a segment-based editing system! It maps per-shot style presets to concrete render configs. The new feature should BUILD ON this, not replace it.

### 3.7 Preload / API Bridge (`src/preload/index.ts` + `index.d.ts`)

| Line | API Method | Purpose |
|------|------------|---------|
| 135 | `generateEditPlan` | Single clip edit plan |
| 136 | `generateBatchEditPlans` | Batch edit plans |
| 138 | `clearEditPlanCache` | Clear cache |
| 139 | `getEditPlanCacheSize` | Get cache size |
| d.ts:605 | `AIEditPlan` interface | Type definition |
| d.ts:617 | `BatchEditPlanInput` | Batch input type |
| d.ts:626 | `BatchEditPlanProgress` | Progress callback type |
| d.ts:938 | `ShotSegment` interface | Type definition |
| d.ts:1382 | Shot segmentation API | Returns `ShotSegmentationResult` |

### 3.8 Renderer Store (`src/renderer/src/store/`)

**clips-slice.ts:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 13 | `import { AIEditPlan, ShotSegment, ShotStyleAssignment }` | Type imports |
| 49 | `setClipAIEditPlan` | Store action — sets plan on clip |
| 50 | `clearClipAIEditPlan` | Store action — clears plan |
| 51 | `setClipShots` | Store action — sets shot segments |
| 353–364 | Implementation | Zustand mutators for edit plan + shots |

**types.ts:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 226 | `aiEditPlan?: AIEditPlan` | On `ClipItem` — the stored edit plan |
| 232 | `shots?: ShotSegment[]` | On `ClipItem` — the shot segments |
| 266 | `'ai-editing'` pipeline stage | In pipeline stage union type |
| 741–811 | `EditStylePreset` | Full named creative style (captions, zoom, effects, sound) |
| 1034–1036 | Store action types | `setClipAIEditPlan`, `clearClipAIEditPlan` |
| 1038 | `setClipShots` | Store action type |

**helpers.ts:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 1780–1783 | `resolvePresetVariant()` | Resolves preset + variant → concrete `EditStylePreset` |
| 1809–1847 | `applyEditStylePresetToSettings()` | Applies preset to app settings |
| 1849+ | `BUILT_IN_EDIT_STYLE_PRESETS` | Array of all built-in style presets (exported from `edit-style-presets.ts`) |

**settings-slice.ts:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 616 | `applyEditStylePreset` | Applies a preset globally |

**edit-style-presets.ts:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 13 | `EDIT_STYLE_PRESETS` | Master array of all built-in presets |
| 3718 | `BUILT_IN_EDIT_STYLE_PRESET_IDS` | ID list of built-in presets |
| 3724 | `getEditStylePreset()` | Lookup by ID |

### 3.9 Pipeline Stage (`src/renderer/src/hooks/pipeline-stages/ai-edit-stage.ts`)

| Line | Reference | Purpose |
|------|-----------|---------|
| 15 | `import { BUILT_IN_EDIT_STYLE_PRESETS }` | Gets preset list |
| 18 | `aiEditStage()` | Pipeline stage function |
| 33 | `createStageReporter(setPipeline, 'ai-editing')` | Progress reporting |
| 40 | Finds active preset | Looks up in `BUILT_IN_EDIT_STYLE_PRESETS` |
| 69–71 | `generateBatchEditPlans` | Calls API for all clips |
| 89 | `store.setClipAIEditPlan` | Stores results |

### 3.10 UI Components

**ClipCard.tsx:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 97–98 | `setClipAIEditPlan`, `clearClipAIEditPlan` | Store hooks |
| 133–134 | `isGeneratingEditPlan`, `showEditPlanPanel` | Local state |
| 267–313 | `handleGenerateEditPlan`, `handleClearEditPlan` | UI handlers for single-clip edit plan gen |
| 670–684 | Edit plan display | Shows word emphasis count, B-Roll count, SFX count |

**ClipGrid.tsx:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 606–644 | Edit plan → render job mapping | Maps `aiEditPlan` fields to render job: `wordEmphasisOverride`, `aiSfxSuggestions`, `brollSuggestions`, `emphasisKeyframesInput`, `stylePresetId` |

**ClipPreview.tsx:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 230 | `QUICK_STYLE_PRESETS` | First 9 presets for quick picker |
| 371–504 | Style preset picker | Full preset gallery with variant selector |
| 1203–1325 | Compact preset picker | Applies presets via `applyEditStylePreset()` |

**ClipSidebar.tsx:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 256 | `!!clip.aiEditPlan` | Used to determine if clip has overrides |

**ProcessingPanel.tsx:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 116–120 | `'ai-editing'` stage definition | Pipeline stage with `aiEditOnly: true` flag |
| 679–704 | Stage display | Maps stage to display label "AI Edit" |

**SettingsPanel.tsx:**
| Line | Reference | Purpose |
|------|-----------|---------|
| 662–712 | Style preset section | Preset gallery in settings with apply buttons |
| 802 | Variant selection | Applies preset + variant |

---

## 4. Existing Segment-Based Infrastructure

**Critical discovery:** The codebase ALREADY HAS the foundation for segment-based editing:

1. **`ShotSegment`** (shared/types.ts:444) — clips are already split into shots (2–8s segments)
2. **`ShotStyleAssignment`** (shared/types.ts:655) — per-shot style preset assignment
3. **`ShotStyleConfig`** (shared/types.ts:673) — resolved per-shot rendering config with caption style, zoom, color grade, transitions, B-Roll mode, music
4. **`shot-segmentation.ts`** — heuristic segmentation engine (pause/topic/sentence detection)
5. **`shot-style-resolver.ts`** — resolves assignments → concrete render configs
6. **`setClipShots`** — store action already exists

The new "4–7 segments" feature is an **evolution** of this existing shot system, not a greenfield build.

---

## 5. Recommendations

### 5.1 Do NOT deprecate the old system — EVOLVE it

The existing `ShotSegment` + `ShotStyleAssignment` + `ShotStyleConfig` pipeline is exactly the right architecture for Captions.ai-style editing. The work needed is:

1. **Enhance `shot-segmentation.ts`** — add an AI-driven mode that targets 4–7 segments per clip (vs. the current heuristic's 2–8s target which can produce too many/few). Add creative intent to segmentation decisions.

2. **Extend `ShotStyleConfig`** — add zoom keyframe data, caption animation overrides, and layout mode per segment (some of this is already there via `zoom` and `captionStyle` fields).

3. **Connect `AIEditPlan` to segments** — the word emphasis, B-Roll, and SFX data should be partitioned into segments. Each segment gets its own subset of these layers.

### 5.2 `AIEditPlan` → segment-aware

**Option B (recommended):** Keep the single Gemini call per clip but post-process the flat output into per-segment buckets:
- For each `AIEditPlanWordEmphasis`, assign to the segment whose time range contains `emphasis.start`
- For each `AIEditPlanBRollSuggestion`, assign to the segment whose time range contains `suggestion.timestamp`  
- For each `AIEditPlanSFXSuggestion`, same partitioning

This avoids extra API calls while giving each segment its own edit layer data.

### 5.3 Zoom keyframes from word emphasis

**Yes, this works.** The mapping:
- `supersize` words → zoom IN keyframe (high intensity) at `emphasis.start`
- `emphasis` words → subtle zoom pulse at `emphasis.start`
- Gaps between emphasis words → zoom OUT / reset
- Per-segment zoom baseline from `ShotStyleConfig.zoom`

### 5.4 `clip-variants.ts` should become segment-aware

Instead of per-clip `captionStyle` and `layout`, variants should produce per-segment overrides. Each variant becomes a different arrangement of segment-level styles rather than a clip-level style swap.

### 5.5 Edit style presets remain valid

`BUILT_IN_EDIT_STYLE_PRESETS` and `EditStylePreset` are already consumed per-shot via `ShotStyleAssignment`. The segment-based editor should let users assign different presets to different segments (this is already architecturally supported via `ShotStyleAssignment[]`).

### 5.6 Pipeline stage order

Ensure stages run in this order:
1. **Scoring** (`ai-scoring.ts`) → clip selection
2. **Loop optimization** (`loop-optimizer.ts`) → boundary adjustment
3. **Curiosity gap** (`curiosity-gap.ts`) → boundary refinement
4. **Shot segmentation** (`shot-segmentation.ts`) → split clip into 4–7 segments
5. **AI Edit Plan** (`edit-plan.ts`) → generate emphasis/B-Roll/SFX
6. **Partition edit plan into segments** → new step
7. **Segment-level style assignment** → per-segment layout/zoom/caption

---

## 6. Summary Table

| File | Conflict Level | Action |
|------|---------------|--------|
| `ai-scoring.ts` | ✅ None | Keep — clip selection is above segment level |
| `ai/edit-plan.ts` | ⚠️ High | Modify — add segment partitioning of output |
| `ai/edit-plan-cache.ts` | 🟡 Low | Modify — extend cache key with segment config |
| `ai/edit-plan.test.ts` | ✅ None | Extend — add segment-aware tests |
| `ai/clip-stitcher.ts` | ✅ None | Keep — different abstraction level |
| `ai/clip-variants.ts` | ⚠️ Moderate | Modify — segment-aware variant generation |
| `ai/curiosity-gap.ts` | ✅ None | Keep — useful signal for segment boundaries |
| `ai/description-generator.ts` | ✅ None | Keep — orthogonal |
| `ai/loop-optimizer.ts` | 🟡 Low | Keep — run before segmentation |
| `ai/story-arc.ts` | ✅ None | Keep — different level |
| `shot-segmentation.ts` | ⚠️ High | Modify — add AI-driven 4–7 segment mode |
| `shot-style-resolver.ts` | 🟡 Low | Extend — add zoom keyframes, layout mode |
| `EditStylePreset` system | ✅ None | Keep — already per-shot compatible |
| `ShotStyleAssignment` system | ✅ None | Keep — this IS the segment-style system |
| `BUILT_IN_EDIT_STYLE_PRESETS` | ✅ None | Keep — presets work per-segment already |
