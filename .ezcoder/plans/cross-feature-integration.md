# Cross-Feature Integration Plan

## Goal
Wire up inter-feature data dependencies so each feature enriches the next through the render pipeline's prepare phase. Emphasis runs before captions and zoom. B-Roll emits edit events for sound design. Registration order enforces dependency ordering. Every feature degrades gracefully when upstream data is absent.

## Current State

### Feature Registration Order (pipeline.ts:109-119)
1. filler-removal → mutates sourceVideoPath, startTime, endTime, wordTimestamps
2. brand-kit → writes job.brandKit
3. sound-design → validates job.soundPlacements (only logging)
4. captions → computes emphasis + emphasisKeyframes + generates ASS
5. hook-title → generates ASS overlay
6. rehook → reads hook duration for appear time
7. progress-bar → injects config
8. auto-zoom → reads job.emphasisKeyframes (from captions)
9. broll → postProcess only (no prepare phase)

### Problems
1. **Emphasis is embedded in captions** (captions.feature.ts:82-112). Auto-zoom needs emphasisKeyframes but captions computes them — tight coupling.
2. **B-Roll edit events only flow through IPC handler** (render-handlers.ts:241-249), not through the feature pipeline. The broll feature has no prepare() phase.
3. **Sound design prepare() ignores edit events** — the IPC handler pre-computes everything. The feature system doesn't drive the B-Roll→sound-design data flow.
4. **Registration order is suboptimal** — sound-design runs before captions (which computes emphasis), and broll has no prepare to emit edit events.

## Changes

### 1. New Feature: `src/main/render/features/word-emphasis.feature.ts`

Create a dedicated feature that computes word emphasis data during prepare():

```typescript
// word-emphasis.feature.ts
import type { RenderFeature, PrepareResult } from './feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'
import { analyzeEmphasisHeuristic } from '../../word-emphasis'
import type { EmphasisKeyframe } from '../../auto-zoom'

export const wordEmphasisFeature: RenderFeature = {
  name: 'word-emphasis',

  async prepare(job: RenderClipJob, batchOptions: RenderBatchOptions): Promise<PrepareResult> {
    // Need word timestamps to compute emphasis
    const words = (job.wordTimestamps ?? []).filter(
      (w) => w.start >= job.startTime && w.end <= job.endTime
    )
    if (words.length === 0) {
      return { tempFiles: [], modified: false }
    }

    // Shift to 0-based clip-relative timestamps
    const localWords = words.map((w) => ({
      text: w.text,
      start: w.start - job.startTime,
      end: w.end - job.startTime
    }))

    // Resolve emphasis: prefer pre-computed > AI override > heuristic
    if (!job.wordEmphasis || job.wordEmphasis.length === 0) {
      if (job.wordEmphasisOverride && job.wordEmphasisOverride.length > 0) {
        job.wordEmphasis = localWords.map((w) => {
          const override = job.wordEmphasisOverride!.find(
            (ov) => Math.abs(ov.start - w.start) < 0.05
          )
          return { ...w, emphasis: (override?.emphasis ?? 'normal') as 'normal' | 'emphasis' | 'supersize' }
        })
      } else {
        job.wordEmphasis = analyzeEmphasisHeuristic(localWords)
      }
    }

    // Compute emphasis keyframes for reactive zoom (if not already provided)
    if (!job.emphasisKeyframes || job.emphasisKeyframes.length === 0) {
      if (job.emphasisKeyframesInput && job.emphasisKeyframesInput.length > 0) {
        job.emphasisKeyframes = job.emphasisKeyframesInput
      } else {
        job.emphasisKeyframes = job.wordEmphasis
          .filter((w) => w.emphasis === 'emphasis' || w.emphasis === 'supersize')
          .map((w) => ({ time: w.start, end: w.end, level: w.emphasis as 'emphasis' | 'supersize' }))
      }
    }

    const emphCount = job.wordEmphasis.filter(w => w.emphasis === 'emphasis').length
    const superCount = job.wordEmphasis.filter(w => w.emphasis === 'supersize').length
    if (emphCount > 0 || superCount > 0) {
      console.log(
        `[WordEmphasis] Clip ${job.clipId}: ${emphCount} emphasis, ${superCount} supersize, ` +
        `${job.emphasisKeyframes.length} keyframes`
      )
    }

    return { tempFiles: [], modified: emphCount > 0 || superCount > 0 }
  }
}
```

### 2. Modify: `src/main/render/features/captions.feature.ts`

Remove the emphasis computation logic from prepare(). Instead, read `job.wordEmphasis` and `job.emphasisKeyframes` populated by the upstream word-emphasis feature. Add graceful fallback if upstream data is missing.

**Lines to change** (captions.feature.ts:82-112):
- Remove the `if (job.wordEmphasis...)` / `else if (job.wordEmphasisOverride...)` / `else analyzeEmphasisHeuristic()` block
- Instead read `job.wordEmphasis` directly. If empty, fall back to heuristic (graceful degradation)
- Remove the `job.emphasisKeyframes = ...` computation (upstream feature does this now)

New logic for emphasis resolution (simplified):
```typescript
// Read emphasis from upstream word-emphasis feature, or fall back to own heuristic
const emphasized = job.wordEmphasis && job.wordEmphasis.length > 0
  ? localWordsBase.map((w) => {
      const match = job.wordEmphasis!.find((ov) => Math.abs(ov.start - w.start) < 0.05)
      return { ...w, emphasis: match?.emphasis ?? 'normal' }
    })
  : analyzeEmphasisHeuristic(localWordsBase)

const localWords = localWordsBase.map((w, i) => ({
  ...w,
  emphasis: (emphasized as Array<{ emphasis?: string }>)[i]?.emphasis ?? 'normal' as 'normal' | 'emphasis' | 'supersize'
}))

// If upstream didn't provide emphasisKeyframes, compute them here as fallback
if (!job.emphasisKeyframes || job.emphasisKeyframes.length === 0) {
  job.emphasisKeyframes = localWords
    .filter((w) => w.emphasis === 'emphasis' || w.emphasis === 'supersize')
    .map((w) => ({ time: w.start, end: w.end, level: w.emphasis as 'emphasis' | 'supersize' }))
}
```

### 3. Modify: `src/main/render/features/broll.feature.ts`

Add a `prepare()` phase that emits edit events from pre-computed B-Roll placements:

```typescript
async prepare(job: RenderClipJob, _batchOptions: RenderBatchOptions): Promise<PrepareResult> {
  // Emit edit events from B-Roll placements so downstream features
  // (sound-design) can synchronise SFX to B-Roll transitions
  if (!job.brollPlacements || job.brollPlacements.length === 0) {
    return { tempFiles: [], modified: false }
  }

  // Initialize editEvents array if not present
  if (!job.editEvents) {
    job.editEvents = []
  }

  // Derive broll-transition edit events from each placement
  let emitted = 0
  for (const br of job.brollPlacements) {
    // Check if an edit event for this time already exists (from IPC handler pre-computation)
    const alreadyExists = job.editEvents.some(
      (e) => e.type === 'broll-transition' && Math.abs(e.time - br.startTime) < 0.05
    )
    if (!alreadyExists) {
      job.editEvents.push({
        type: 'broll-transition',
        time: br.startTime,
        transition: br.transition
      })
      emitted++
    }
  }

  if (emitted > 0) {
    console.log(
      `[B-Roll] Clip ${job.clipId}: emitted ${emitted} edit event(s) from ${job.brollPlacements.length} placement(s)`
    )
  }

  return { tempFiles: [], modified: emitted > 0 }
},
```

Need to add the EditEvent import to broll.feature.ts (from `../../sound-design`).

### 4. Modify: `src/main/render/features/sound-design.feature.ts`

Enhance prepare() to log edit events received from upstream features (B-Roll, etc.):

```typescript
async prepare(job: RenderClipJob, _batchOptions: RenderBatchOptions): Promise<PrepareResult> {
  // Per-clip override can disable sound design
  const perClipOverride = job.clipOverrides?.enableSoundDesign
  if (perClipOverride === false) {
    job.soundPlacements = undefined
    return { tempFiles: [], modified: false }
  }

  const hasPlacements = Array.isArray(job.soundPlacements) && job.soundPlacements.length > 0
  if (!hasPlacements) {
    return { tempFiles: [], modified: false }
  }

  // Log edit events from upstream features (B-Roll transitions, jump-cuts)
  const editEventCount = job.editEvents?.length ?? 0
  const brollEvents = job.editEvents?.filter(e => e.type === 'broll-transition').length ?? 0
  const jumpCutEvents = job.editEvents?.filter(e => e.type === 'jump-cut').length ?? 0

  const musicCount = job.soundPlacements!.filter(p => p.type === 'music').length
  const sfxPlacements = job.soundPlacements!.filter(p => p.type === 'sfx')

  // ... existing categorisation ...

  console.log(
    `[SoundDesign] Clip ${job.clipId}: ${musicCount} music, ${sfxPlacements.length} sfx ` +
    `(${categories.pops} pops, ${categories.impacts} impacts, ${categories.tension} tension, ` +
    `${categories.transitions} transitions, ${categories.shutters} shutters, ${categories.whooshes} whooshes)` +
    (editEventCount > 0 ? ` — synced to ${editEventCount} edit events (${brollEvents} broll, ${jumpCutEvents} jump-cut)` : '')
  )

  return { tempFiles: [], modified: true }
}
```

### 5. Modify: `src/main/render/features/auto-zoom.feature.ts`

Simplify prepare() since emphasis keyframes are now guaranteed by the upstream word-emphasis feature. Keep fallback for graceful degradation but simplify the logic:

In the current prepare() (lines 54-83), the fallback logic for reactive mode when `!job.emphasisKeyframes`:
- Check `emphasisKeyframesInput` → use directly
- Else compute from word timestamps using heuristic

Now that word-emphasis feature runs first, `job.emphasisKeyframes` should already be populated. Simplify:
```typescript
if (globalSettings.mode === 'reactive') {
  if (job.emphasisKeyframes && job.emphasisKeyframes.length > 0) {
    console.log(
      `[AutoZoom] Reactive mode — using ${job.emphasisKeyframes.length} emphasis keyframes ` +
      `from upstream feature for clip ${job.clipId}`
    )
  } else {
    // Fallback: no emphasis data available (e.g. no word timestamps)
    console.log(
      `[AutoZoom] Reactive mode — no emphasis keyframes available for clip ${job.clipId}, ` +
      `falling back to ken-burns behavior`
    )
  }
}
```

### 6. Modify: `src/main/render/pipeline.ts`

Update feature registration order and add word-emphasis import:

```typescript
import { wordEmphasisFeature } from './features/word-emphasis.feature'

// Registration order (line 109-119):
const features: RenderFeature[] = [
  createFillerRemovalFeature(),    // 1. mutates source, timestamps
  brandKitFeature,                 // 2. config injection
  wordEmphasisFeature,             // 3. computes emphasis + keyframes
  createCaptionsFeature(),         // 4. reads emphasis, generates ASS
  createHookTitleFeature(),        // 5. generates ASS overlay
  createRehookFeature(),           // 6. reads hook duration for appear time
  progressBarFeature,              // 7. injects config
  brollFeature,                    // 8. emits edit events from placements
  soundDesignFeature,              // 9. reads edit events, validates placements
  autoZoomFeature                  // 10. reads emphasisKeyframes for reactive zoom
]
```

Update the comment block (lines 92-108) documenting the cross-feature data flow:
```
// Cross-feature data flow:
//   filler-removal ──wordTimestamps──▸ word-emphasis (remapped timestamps)
//   word-emphasis ──wordEmphasis──▸ captions (emphasis tags for ASS)
//   word-emphasis ──emphasisKeyframes──▸ auto-zoom (reactive mode)
//   word-emphasis ──wordEmphasis──▸ sound-design (via IPC handler pre-computation)
//   IPC handler ──brollPlacements──▸ broll (postProcess + edit event emission)
//   broll ──editEvents──▸ sound-design (B-Roll transitions SFX sync)
//   IPC handler ──soundPlacements──▸ sound-design (base render filter_complex)
```

### 7. Update: `src/main/render/__tests__/features.test.ts`

Add tests for the new word-emphasis feature and the B-Roll edit event emission:

```typescript
// WordEmphasisFeature tests
describe('WordEmphasisFeature', () => {
  it('computes emphasis from word timestamps', async () => {
    const job = makeJob()
    const result = await wordEmphasisFeature.prepare!(job, makeOptions())
    expect(result).toBeDefined()
    expect(job.wordEmphasis).toBeDefined()
    expect(job.emphasisKeyframes).toBeDefined()
  })

  it('uses pre-computed wordEmphasis when available', async () => {
    const job = makeJob({
      wordEmphasis: [
        { text: 'Hello', start: 0, end: 0.5, emphasis: 'emphasis' },
        { text: 'world', start: 0.5, end: 1, emphasis: 'normal' }
      ]
    })
    const result = await wordEmphasisFeature.prepare!(job, makeOptions())
    expect(job.wordEmphasis).toHaveLength(2)
    expect(job.emphasisKeyframes).toBeDefined()
  })

  it('skips when no word timestamps', async () => {
    const job = makeJob({ wordTimestamps: [] })
    const result = await wordEmphasisFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(false)
  })
})

// BRoll edit event emission tests
describe('BRollFeature', () => {
  it('emits edit events from broll placements', async () => {
    const job = makeJob({
      brollPlacements: [
        { startTime: 5, duration: 3, videoPath: '/broll.mp4', keyword: 'test',
          displayMode: 'fullscreen', transition: 'crossfade' }
      ]
    })
    const result = await brollFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(true)
    expect(job.editEvents).toHaveLength(1)
    expect(job.editEvents![0].type).toBe('broll-transition')
    expect(job.editEvents![0].time).toBe(5)
  })

  it('does not duplicate existing edit events', async () => {
    const job = makeJob({
      brollPlacements: [
        { startTime: 5, duration: 3, videoPath: '/broll.mp4', keyword: 'test',
          displayMode: 'fullscreen', transition: 'crossfade' }
      ],
      editEvents: [{ type: 'broll-transition', time: 5 }]
    })
    const result = await brollFeature.prepare!(job, makeOptions())
    expect(job.editEvents).toHaveLength(1) // not duplicated
  })

  it('skips when no broll placements', async () => {
    const job = makeJob()
    const result = await brollFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(false)
  })
})
```

## New Registration Order

```
1. filler-removal     → mutates source, timestamps, wordTimestamps
2. brand-kit          → writes job.brandKit (consumed by base-render)
3. word-emphasis      → writes job.wordEmphasis + job.emphasisKeyframes
4. captions           → reads job.wordEmphasis, generates ASS, fallback emphasis
5. hook-title         → generates ASS overlay
6. rehook             → reads hookTitleOverlay.displayDuration for appear time
7. progress-bar       → injects job.progressBarConfig
8. broll              → reads job.brollPlacements, emits job.editEvents
9. sound-design       → reads job.editEvents, validates job.soundPlacements
10. auto-zoom         → reads job.emphasisKeyframes for reactive zoom
```

## Cross-Feature Data Flow Diagram

```
filler-removal ──remapped wordTimestamps──▸ word-emphasis
word-emphasis ──wordEmphasis──▸ captions (emphasis tags)
word-emphasis ──emphasisKeyframes──▸ auto-zoom (reactive zoom)
IPC handler ──brollPlacements──▸ broll.prepare()
broll ──editEvents──▸ sound-design (SFX sync)
IPC handler ──soundPlacements──▸ sound-design (audio mixing)
```

## Files to Change

| File | Action |
|------|--------|
| `src/main/render/features/word-emphasis.feature.ts` | **CREATE** — new emphasis feature |
| `src/main/render/features/captions.feature.ts` | **EDIT** — remove emphasis computation, read from upstream |
| `src/main/render/features/broll.feature.ts` | **EDIT** — add prepare() that emits edit events |
| `src/main/render/features/sound-design.feature.ts` | **EDIT** — log edit event info in prepare() |
| `src/main/render/features/auto-zoom.feature.ts` | **EDIT** — simplify fallback, trust upstream emphasis |
| `src/main/render/pipeline.ts` | **EDIT** — add word-emphasis import, reorder features, update comments |
| `src/main/render/__tests__/features.test.ts` | **EDIT** — add tests for new feature + broll edit events |

## Verification

1. `npx electron-vite build` — must compile with zero errors
2. `npm test` — all existing + new tests pass
3. Verify graceful degradation: each feature works independently when upstream data is absent
4. Cross-feature data: emphasis → captions → zoom, broll → sound-design
