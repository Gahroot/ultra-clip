# Filler Removal UI & Seamless Crossfade Cuts

## Overview

The filler detection engine (`src/main/filler-detection.ts`) and cut builder (`src/main/filler-cuts.ts`) already exist and work well in the render pipeline via `src/main/render/features/filler-removal.feature.ts`. The render pipeline currently uses trim+concat with hard cuts.

**What's missing:**
1. **No IPC channel** to detect fillers from the renderer before rendering
2. **No per-clip filler state** in the store (detected fillers, restored fillers)
3. **No UI** showing struck-through filler words in the clip editor
4. **No crossfades** at cut points — currently hard cuts via trim+concat
5. **Silence detection is gap-based only** — no amplitude/energy analysis

## Implementation Plan

### Step 1: Add IPC channel for filler detection
**Files:** `src/main/index.ts`, `src/preload/index.ts`, `src/preload/index.d.ts`

Add `filler:detect` IPC handler that takes word timestamps + settings and returns `FillerDetectionResult` (segments, timeSaved, counts). This lets the renderer detect fillers after transcription without waiting for render.

In `src/main/index.ts`:
```ts
import { detectFillers, DEFAULT_FILLER_WORDS } from './filler-detection'
import type { FillerDetectionSettings, FillerDetectionResult, FillerSegment } from './filler-detection'

ipcMain.handle('filler:detect', async (_, words, settings) => {
  return detectFillers(words, settings)
})
```

In `src/preload/index.ts` — add `detectFillers` to the exposed API.

In `src/preload/index.d.ts` — add `FillerSegment` type and `detectFillers` method to the Api interface.

### Step 2: Add per-clip filler state to the store
**Files:** `src/renderer/src/store/types.ts`, `src/renderer/src/store/clips-slice.ts`

Add to `ClipCandidate`:
```ts
/** Detected filler segments for this clip (absolute timestamps from source) */
fillerSegments?: FillerSegment[]
/** IDs/indices of filler segments the user has restored (won't be cut) */
restoredFillerIndices?: Set<number> // serialized as number[]
/** Time saved by filler removal (seconds) */
fillerTimeSaved?: number
```

Add store actions:
```ts
setClipFillers: (sourceId: string, clipId: string, segments: FillerSegment[], timeSaved: number) => void
toggleFillerRestore: (sourceId: string, clipId: string, segmentIndex: number) => void
clearClipFillers: (sourceId: string, clipId: string) => void
```

### Step 3: Auto-detect fillers after transcription in the pipeline
**Files:** `src/renderer/src/hooks/usePipeline.ts`

After the transcription stage completes and clips are scored, run `window.api.detectFillers()` for each clip's word timestamps using the global filler removal settings. Store results on each clip via `setClipFillers()`.

### Step 4: Show filler words in ClipPreview transcript display
**File:** `src/renderer/src/components/ClipPreview.tsx`

In the "Words — click to seek" section (line ~1400), enhance the word buttons:
- For each word, check if it falls inside any filler segment (using the same overlap logic from `filler-cuts.ts`)
- If the word is a detected filler AND not restored: show with `line-through` decoration + red-ish tint + a small restore button on hover
- If the word is a restored filler: show with a subtle dashed underline + amber tint indicating it was detected but user kept it
- For silence segments: show a small pause icon between words with the duration

Add a summary bar above the word list:
```
Fillers detected: 5 words, 2 silences · Saving 2.3s | [Restore All] [Remove All]
```

### Step 5: Pass restored fillers to the render pipeline
**Files:** `src/renderer/src/components/ClipGrid.tsx`, `src/renderer/src/components/ClipCard.tsx`

When building render jobs, filter out restored fillers from the segments passed to the render pipeline. Add `restoredFillerIndices` to the render job or filter segments client-side before passing.

Modify the `fillerRemoval` in `RenderBatchOptions` to include per-clip excluded segments, or better: add `fillerSegments` directly to `RenderClipJob` so the render feature can skip its own detection and use pre-computed + user-curated segments.

In `src/main/render/types.ts`, add to `RenderClipJob`:
```ts
/** Pre-computed filler segments (user-curated, with restored ones already excluded) */
precomputedFillerSegments?: FillerSegment[]
```

In `src/main/render/features/filler-removal.feature.ts`, check for `job.precomputedFillerSegments` and use those instead of running detection if present.

### Step 6: Add crossfades to filler cut points
**File:** `src/main/render/features/filler-removal.feature.ts`

Replace the current hard-cut trim+concat approach with one that adds very short audio crossfades at cut points to prevent pops:

1. Keep the trim-each-segment approach (it's correct for frame-accurate cuts)
2. Instead of stream-copy concat, use re-encode concat with:
   - Audio: `acrossfade` filter with 20-30ms duration between each pair of adjacent segments
   - Video: 1-2 frame dissolve at cut points (or just use trim overlap)

Alternatively, a simpler approach: add tiny audio fades (10ms fade-out at end of each segment, 10ms fade-in at start of next) during the trim step. This is simpler and prevents pops without needing crossfade filters between segments:

```ts
// In trimSegment, add audio fade-in/out:
.audioFilters([
  `afade=t=in:st=0:d=0.015`,
  `afade=t=out:st=${duration - 0.015}:d=0.015`
])
```

### Step 7: Add silence detection via amplitude analysis (enhancement)
**File:** `src/main/filler-detection.ts`

The current silence detection is gap-based (uses word timestamp gaps). This works well for most cases since the ASR model already identifies word boundaries. However, for more accurate silence detection, we could add FFmpeg-based silence detection as a fallback:

This is a **nice-to-have** — the current gap-based detection already catches silences > threshold. The word timestamps from Parakeet TDT are accurate enough. Skip this for now.

## File Change Summary

| File | Change |
|------|--------|
| `src/main/index.ts` | Add `filler:detect` IPC handler |
| `src/preload/index.ts` | Expose `detectFillers` in contextBridge |
| `src/preload/index.d.ts` | Add `FillerSegment` type + `detectFillers` method |
| `src/renderer/src/store/types.ts` | Add filler fields to `ClipCandidate`, new actions |
| `src/renderer/src/store/clips-slice.ts` | Implement `setClipFillers`, `toggleFillerRestore`, `clearClipFillers` |
| `src/renderer/src/hooks/usePipeline.ts` | Auto-detect fillers after transcription |
| `src/renderer/src/components/ClipPreview.tsx` | Struck-through filler word UI with restore |
| `src/renderer/src/components/ClipGrid.tsx` | Pass pre-computed filler segments to render jobs |
| `src/renderer/src/components/ClipCard.tsx` | Pass filler segments in single-clip render, show filler badge |
| `src/main/render/types.ts` | Add `precomputedFillerSegments` to `RenderClipJob` |
| `src/main/render/features/filler-removal.feature.ts` | Use precomputed segments, add audio micro-fades |

## Verification

1. `npx electron-vite build` — must pass with no errors
2. `npm test` — existing tests must pass
3. Manual test: transcribe a video, observe filler detection in clip editor, restore a filler, render with filler removal enabled
