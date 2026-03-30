# UNIFIED AUDIT REPORT — Segment-Based Editing

## 🚨 CRITICAL DISCOVERY: THE BACKEND ALREADY EXISTS

All 5 agents found the same thing: **a segment/shot system already exists in the codebase but the UI never exposes it.**

### What Already Exists:
- **Store actions**: `setClipShots()`, `setShotStyleAssignment()`, `setBatchShotStyles()`, `clearAllShotStyles()`
- **Types**: `ClipCandidate.shots` (ShotSegment[]), `ClipCandidate.shotStyles` (ShotStyleAssignment[])
- **Types**: `VideoSegment`, `EditStyle`, `SegmentStyleCategory`, `ZoomKeyframe`, `TransitionType` — all defined
- **IPC**: `SHOT_SEGMENT_CLIP` handler exists, `splitSegmentsForEditor`, `assignSegmentStyles`, `updateSegmentCaption`, `updateSegmentStyle` — 5 channels already wired
- **Render**: `buildPerShotZoomFilter`, `buildPiecewiseColorGradeFilter`, shot style resolution — working
- **AI**: `shot-segmentation.ts`, `shot-style-resolver.ts` exist
- **Settings**: Pexels API key field already in SettingsPanel (line 1694)
- **Store state**: `segments: Record<string, VideoSegment[]>`, `editStyles`, `selectedEditStyleId` — all in store

### What's ACTUALLY Missing:
1. **UI** — ClipPreview.tsx (2,440 lines, monolithic) has ZERO segment awareness. It needs to become a segment editor.
2. **Two parallel segment systems** need unification:
   - System A: `ClipCandidate.shots` + `shotStyles` (ShotSegment[] + ShotStyleAssignment[]) — wired to render
   - System B: `AppState.segments` (Record<string, VideoSegment[]>) — richer model, NOT wired to render
3. **Pipeline** has no `'segmenting'` stage in `PipelineStage` union
4. **Global settings** (captionStyle, autoZoom, hookTitleOverlay) are single-value, no per-segment override concept in UI
5. **Timing-sensitive overlays** (progress-bar, hook-title, rehook) must be post-concat only
6. **split-screen.ts** lacks image-as-secondary-source, behind-speaker layout, fullscreen image layout
7. **ClipPreview trim changes** don't invalidate segments

## Action Items by File

### 🔴 REPLACE / MAJOR REWRITE
- `src/renderer/src/components/ClipPreview.tsx` — Transform from narrow dialog to full-width segment editor (timeline + sidebar + video)

### 🟡 MODIFY
- `src/renderer/src/store.ts` — Unify shot system A + segment system B. Add `updateClipTrim` segment invalidation
- `src/renderer/src/hooks/usePipeline.ts` — Add segmenting stage after ai-editing
- `src/main/layouts/split-screen.ts` — Add image-as-secondary, behind-speaker, fullscreen layouts
- `src/main/ai/edit-plan.ts` — Post-process flat output into per-segment buckets
- `src/main/ai/clip-variants.ts` — Generate per-segment style arrays instead of clip-level overrides
- `src/renderer/src/components/ClipCard.tsx` — Add segment count badge
- `src/main/index.ts` — IPC handlers mostly exist, may need minor additions

### ✅ LEAVE ALONE (reusable as-is)
- `src/main/captions.ts` — Pure function, supports subset words. Call per-segment with rebased times.
- `src/main/ffmpeg.ts` — No conflicts
- `src/main/layouts/blur-background.ts` — Pure spatial filter, reusable per-segment
- `src/main/ai-scoring.ts` — Clip-level scoring, orthogonal to segments
- `src/main/ai/curiosity-gap.ts` — Useful signal for segment boundaries
- `src/main/ai/description-generator.ts` — Orthogonal
- `src/main/ai/story-arc.ts` — Multi-clip level, no conflict
- `src/main/overlays/progress-bar.ts` — Apply post-concat
- `src/main/hook-title.ts` — Apply to segment 0 or post-concat
- `src/main/overlays/rehook.ts` — Apply post-concat
- `src/renderer/src/components/SettingsPanel.tsx` — Pexels API key already exists
- `src/renderer/src/components/ProcessingPanel.tsx` — Minor progress message additions

### 🟡 EVOLVE (don't deprecate)
- `src/main/auto-zoom.ts` — Existing zoom works but only drift. Extend with snap/pulse/zoom-out (new zoom-filters.ts)
- `src/main/ai/edit-plan.ts` — B-Roll displayMode/transition overlap with per-segment config. Evolve output into segment buckets.

## REVISED TASK PLAN

Given that much of the backend exists, the 18 tasks need revision:
- Tasks 1-2 (data model, splitter): **PARTIALLY DONE** — unify existing systems instead of creating from scratch
- Tasks 3-5 (zoom, transitions, caption bg): **STILL NEEDED** — new filter builders
- Tasks 6-7 (style variants, presets): **PARTIALLY DONE** — ShotStyleConfig exists but needs the 15 analyzed presets
- Task 8 (AI assigner): **PARTIALLY DONE** — shot-style-resolver exists
- Task 9 (layout builders): **PARTIALLY DONE** — split-screen exists, needs extension
- Task 10 (per-segment render): **MOSTLY DONE** — render pipeline already does per-shot rendering
- Tasks 11-15 (UI): **NOT DONE** — this is the real gap
- Task 16 (wire pipeline): **PARTIALLY DONE** — backend wiring exists
- Task 17 (AI images): **NOT DONE** but Pexels field exists in settings
- Task 18 (tests): **NOT DONE**
