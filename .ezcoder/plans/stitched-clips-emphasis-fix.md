# Fix: Stitched Clips Missing Emphasis/Supersize/Highlighting

## Problem
Stitched (multi-segment) clips do NOT receive word emphasis (emphasis, supersize, box highlighting) because the stitched render path bypasses the feature pipeline that computes and applies emphasis data.

## Root Cause Analysis

### Normal clips (working correctly)
The normal render pipeline runs features in order:
1. **`word-emphasis.feature.ts`** — computes `job.wordEmphasis` via heuristic or AI edit plan
2. **`captions.feature.ts`** — reads `job.wordEmphasis`, merges emphasis levels onto word timestamps, passes to `generateCaptions()` with full emphasis data

### Stitched clips (broken)
`src/main/render/stitched-render.ts` lines 320-340 does its own inline caption generation that **skips the word-emphasis feature entirely**:

```typescript
// Lines 320-330 in stitched-render.ts
if (job.captionsEnabled && job.captionStyle && job.wordTimestamps) {
  const segWords = job.wordTimestamps.filter(
    (w) => w.start >= seg.startTime && w.end <= seg.endTime
  )
  if (segWords.length > 0) {
    const localWords = segWords.map((w) => ({
      text: w.text,
      start: w.start - seg.startTime,
      end: w.end - seg.startTime
      // ❌ NO emphasis field — it's stripped/never computed
    }))
    const captionAssPath = await generateCaptions(localWords, job.captionStyle, ...)
```

**Three problems:**
1. `RenderStitchedClipJob.wordTimestamps` type is `{ text: string; start: number; end: number }[]` — **no emphasis field**
2. No call to `analyzeEmphasisHeuristic()` or any emphasis resolution
3. No support for `wordEmphasis`, `wordEmphasisOverride`, or `shotStyleConfigs` on stitched jobs

## Fix Plan

### Step 1: Add emphasis fields to `RenderStitchedClipJob` type
**File:** `src/main/render/types.ts` (lines 305-332)

Add to `RenderStitchedClipJob`:
```typescript
/** Pre-computed word emphasis data (from AI edit plan or heuristic). */
wordEmphasis?: EmphasizedWord[]
/** AI Edit Plan word emphasis override. */
wordEmphasisOverride?: EmphasizedWord[]
```

### Step 2: Compute and apply emphasis in stitched-render.ts
**File:** `src/main/render/stitched-render.ts` (lines 320-340)

Import `analyzeEmphasisHeuristic` from `../../word-emphasis` and update the per-segment captions block:

```typescript
import { analyzeEmphasisHeuristic } from '../word-emphasis'

// Inside the per-segment captions block:
if (segWords.length > 0) {
  const localWordsBase = segWords.map((w) => ({
    text: w.text,
    start: w.start - seg.startTime,
    end: w.end - seg.startTime
  }))

  // Resolve emphasis: prefer pre-computed > override > heuristic
  let emphasized: Array<{ text: string; start: number; end: number; emphasis: string }>
  if (job.wordEmphasis && job.wordEmphasis.length > 0) {
    emphasized = localWordsBase.map((w) => {
      const match = job.wordEmphasis!.find(
        (ov) => Math.abs(ov.start - (w.start + seg.startTime)) < 0.05
            || Math.abs(ov.start - w.start) < 0.05
      )
      return { ...w, emphasis: match?.emphasis ?? 'normal' }
    })
  } else if (job.wordEmphasisOverride && job.wordEmphasisOverride.length > 0) {
    emphasized = localWordsBase.map((w) => {
      const match = job.wordEmphasisOverride!.find(
        (ov) => Math.abs(ov.start - w.start) < 0.05
      )
      return { ...w, emphasis: match?.emphasis ?? 'normal' }
    })
  } else {
    emphasized = analyzeEmphasisHeuristic(localWordsBase)
  }

  const localWords = localWordsBase.map((w, i) => ({
    ...w,
    emphasis: emphasized[i]?.emphasis ?? 'normal' as 'normal' | 'emphasis' | 'supersize'
  }))

  const captionAssPath = await generateCaptions(localWords, job.captionStyle, ...)
}
```

### Step 3: Propagate emphasis data from IPC handler to stitched jobs
**File:** `src/main/index.ts` — find the `render:startBatch` IPC handler where stitched jobs are built.

Ensure that when a `RenderStitchedClipJob` is created from a `RenderClipJob` with `stitchedSegments`, the `wordEmphasis` and `wordEmphasisOverride` fields are carried over.

### Step 4: Verify shot style configs for stitched clips (optional, lower priority)
The stitched render also lacks `shotStyleConfigs` support (per-shot caption animation switching). This is a separate enhancement but should be noted.

## Files to Modify
1. `src/main/render/types.ts` — add emphasis fields to `RenderStitchedClipJob`
2. `src/main/render/stitched-render.ts` — import emphasis heuristic, compute emphasis per segment
3. `src/main/index.ts` (or wherever stitched jobs are built) — propagate emphasis data

## Verification
1. `npx electron-vite build` — must compile clean
2. Render a stitched clip → captions should show emphasis/supersize/box styling
3. Compare rendered stitched clip captions to a normal clip with same text — styles should match

## Risk
- Low risk: the fix adds emphasis computation to an existing code path
- The heuristic emphasis analyzer is already well-tested on normal clips
- No changes to the ASS generation or caption animation code itself

## Session Context (for future reference)
- Also fixed `clipDuration` TDZ error in `ClipPreview.tsx` (moved const above useCallback refs)
- Also fixed `FACE_DETECTION_TIMEOUT_MS` missing import in `face-detection.ts`
- Also fixed transcription CUDA OOM with subprocess chunking in `python/transcribe.py`
- Deploy: `bash scripts/deploy-windows.sh` (fast) or `--full`
- Build: `npx electron-vite build`
