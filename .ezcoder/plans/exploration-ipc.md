# IPC Wiring Exploration: Render Pipeline & Shot Styles

## 1. Channel Wiring Overview

### Channel Definition
- **Channel name**: `'render:startBatch'` defined at `src/shared/ipc-channels.ts:57` as `Ch.Invoke.RENDER_START_BATCH`

### Preload Bridge
- `src/preload/index.ts:81` — `startBatchRender: invoke(I.RENDER_START_BATCH)`
- Exposes `window.api.startBatchRender(options: RenderBatchOptions)` to renderer
- Generic `invoke()` helper at line 10 wraps `ipcRenderer.invoke(channel, ...args)`

### Main Handler
- `src/main/ipc/render-handlers.ts:51` — `ipcMain.handle(Ch.Invoke.RENDER_START_BATCH, ...)`
- Wrapped in `wrapHandler()` for error logging
- Receives `(event, options: RenderBatchOptions)` where `RenderBatchOptions` comes from `src/main/render/types.ts`

---

## 2. Handler Phases (render-handlers.ts)

The `RENDER_START_BATCH` handler runs 3 phases before calling `startBatchRender()`:

1. **Phase 1 (lines 59–161)**: B-Roll placement generation — iterates `options.jobs`, extracts keywords, downloads Pexels footage, builds `job.brollPlacements`
2. **Phase 1.5 (lines 163–190)**: Shot style resolution — resolves `job.shotStyles` + `job.shots` into `job.shotStyleConfigs` using `resolveShotStyles()`
3. **Phase 2 (lines 196–299)**: Sound design — computes `job.soundPlacements` using word emphasis + edit events

Then: `startBatchRender(options, win)` kicks off the actual FFmpeg pipeline (line 302).

---

## 3. Style Presets: Renderer → Main Data Flow

### How style presets are supposed to flow:

```
Renderer: clip.shotStyles (ShotStyleAssignment[]) + clip.shots (ShotSegment[])
  → included per-job in startBatchRender({ jobs: [...], stylePresets: [...] })
    → Main: RenderBatchOptions.stylePresets + each job.shotStyles/job.shots
      → resolveShotStyles() → job.shotStyleConfigs (ShotStyleConfig[])
```

### Renderer side (ClipGrid.tsx)

- **Line 263–269**: `stylePresetsForRender` is computed via `useMemo` from `BUILT_IN_EDIT_STYLE_PRESETS`, extracting `{ id, captions, zoom }` for each preset
- **Line 607–608**: Per-job, `shotStyles` and `shots` ARE included:
  ```ts
  shotStyles: clip.shotStyles && clip.shotStyles.length > 0 ? clip.shotStyles : undefined,
  shots: clip.shots && clip.shots.length > 0 ? clip.shots : undefined,
  ```

### 🐛 BUG: `stylePresetsForRender` is NEVER passed to `startBatchRender()`

The `startBatchRender()` call at **line 802** does NOT include `stylePresets: stylePresetsForRender`. The variable is computed but unused. Same issue in:
- **Line 1040** (retry failed path) — also missing `stylePresets`
- `ClipCard.tsx:193` — single-clip render, no `stylePresets`
- `ClipPreview.tsx:555` — preview render, no `stylePresets`

This means `options.stylePresets` on the main side is always `undefined`, and Phase 1.5 at line 166 (`if (options.stylePresets && options.stylePresets.length > 0)`) is **always false**. `resolveShotStyles()` is never actually called at runtime.

### Preload type also missing `stylePresets`

`src/preload/index.d.ts` `RenderBatchOptions` (lines 201–270) does NOT include:
- `stylePresets` — missing entirely
- `RenderClipJob` (lines 141–199) does NOT include `shotStyles` or `shots` fields

So even if the renderer tried to pass them, TypeScript would flag it (though `invoke()` is loosely typed as `(...args: unknown[])` so it would work at runtime via the IPC bridge).

---

## 4. `resolveShotStyles()` Call Sites

| Location | Called? | Notes |
|---|---|---|
| `src/main/ipc/render-handlers.ts:175` | ✅ Code exists | But guarded by `options.stylePresets` which is always undefined → **dead code** |
| `src/main/render/shot-style-resolver.ts:73` | Definition | Pure function: `(assignments, shots, presets) → ShotStyleConfig[]` |

### resolveShotStyles function (shot-style-resolver.ts)

- Takes `ShotStyleAssignment[]`, `ShotSegment[]`, and `Map<string, StylePresetForResolution>`
- For each assignment, looks up the shot by index + the preset by ID
- Produces `ShotStyleConfig` with concrete caption style, zoom config, colorGrade, transitions, brollMode
- Helper `buildPresetLookup()` converts flat array to Map for O(1) lookup

---

## 5. RenderClipJob Types — Main vs Preload

### Main-side `RenderClipJob` (src/main/render/types.ts)

Includes all fields, notably:
- `shotStyles?: Array<{ shotIndex: number; presetId: string }>` (line 275)
- `shots?: Array<{ startTime: number; endTime: number }>` (line 281)
- `shotStyleConfigs?: ShotStyleConfig[]` (line 269) — written by Phase 1.5
- `brollPlacements?: BRollPlacement[]` (line 124) — written by Phase 1
- `soundPlacements?: SoundPlacement[]` — written by Phase 2
- `clipOverrides?: { ... }` (line 153) — per-clip feature toggles

### Preload-side `RenderClipJob` (src/preload/index.d.ts)

**Missing** (compared to main):
- `shotStyles` — not declared
- `shots` — not declared
- `shotStyleConfigs` — not declared (computed server-side, shouldn't be in preload)
- `brollPlacements` — not declared (computed server-side)
- `soundPlacements` — not declared (computed server-side)
- `clipOverrides` — not declared

### Main-side `RenderBatchOptions` (src/main/render/types.ts:320–470)

Includes:
- `stylePresets?: Array<{ id, captions, zoom, colorGrade?, transitionIn?, transitionOut?, brollMode? }>` (lines 439–469)

### Preload-side `RenderBatchOptions` (src/preload/index.d.ts:201–270)

**Missing**:
- `stylePresets` — not declared
- `broll` config — IS present (lines 249–259)

---

## 6. Shared Type Definitions

| Type | File | Purpose |
|---|---|---|
| `ShotSegment` | `src/shared/types.ts` | Time range + text + break reason for a shot |
| `ShotStyleAssignment` | `src/shared/types.ts:464` | `{ shotIndex, presetId }` mapping |
| `ShotStyleConfig` | `src/shared/types.ts:482` | Resolved render config per shot |
| `ShotTransitionConfig` | `src/shared/types.ts:440` | `{ type, duration }` for shot transitions |
| `StylePresetForResolution` | `src/main/render/shot-style-resolver.ts:55` | Minimal preset shape needed by resolver |

---

## 7. Store ↔ Clip Data

- `src/renderer/src/store/types.ts:204` — `ClipCandidate.shots?: ShotSegment[]`
- `src/renderer/src/store/types.ts:211` — `ClipCandidate.shotStyles?: ShotStyleAssignment[]`
- `src/renderer/src/store/clips-slice.ts` — `setClipShotStyles()`, `setClipShots()` mutations exist
- `src/renderer/src/store/helpers.ts` — `BUILT_IN_EDIT_STYLE_PRESETS` source for preset data

---

## 8. Summary of Issues

### Critical: `stylePresets` not passed through IPC
**3 gaps must be fixed** to make per-shot styling work end-to-end:

1. **`src/preload/index.d.ts` `RenderBatchOptions`** — add `stylePresets?` field
2. **`src/preload/index.d.ts` `RenderClipJob`** — add `shotStyles?`, `shots?`, `clipOverrides?` fields
3. **`src/renderer/src/components/ClipGrid.tsx`** — pass `stylePresets: stylePresetsForRender` in ALL `startBatchRender()` calls (lines 802, 1040) 
4. **(Optional)** `ClipCard.tsx:193` and `ClipPreview.tsx:555` — add `stylePresets` if those paths should support per-shot styles

### Result
`resolveShotStyles()` is fully implemented and imported but is effectively dead code because its prerequisite data (`options.stylePresets`) never arrives from the renderer. The renderer correctly attaches `shotStyles` and `shots` to each job, but the batch-level `stylePresets` lookup table is never sent.
