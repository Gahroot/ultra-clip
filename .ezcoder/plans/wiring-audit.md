# BatchContent Wiring Audit — Full Results

## Summary

Comprehensive audit of UI ↔ Store ↔ IPC ↔ Main process wiring. Checked every settings toggle, button, render option, and event listener to ensure they're properly connected end-to-end.

**Bottom line**: The app is functionally sound — all settings make it to the main process and are applied during render. The main issues are **type-safety gaps in the preload types** (masked by `as` casts) and **a handful of store actions with no UI controls**.

---

## 🟠 Type-Safety Issues (Functional but fragile)

### 1. Preload `RenderBatchOptions` missing 6 fields

**Files**: `src/preload/index.d.ts` lines 179–213

The preload type definition for `RenderBatchOptions` is **missing these fields** that the renderer sends and the main process reads:

| Missing Field | Renderer sends it? | Main process reads it? | Actually works? |
|---|---|---|---|
| `captionsEnabled` | ✅ ClipGrid L773 | ✅ pipeline.ts L204 | ✅ Yes (cast bypasses TS) |
| `captionStyle` | ✅ ClipGrid L774 | ✅ pipeline.ts L205 | ✅ Yes |
| `fillerRemoval` | ✅ ClipGrid L775 | ✅ filler-removal.feature.ts L107 | ✅ Yes |
| `sourceMeta` | ✅ ClipGrid L778-780 | ✅ pipeline.ts L449-471 | ✅ Yes |
| `outputAspectRatio` | ✅ ClipGrid L783 | ✅ pipeline.ts L108 | ✅ Yes |
| `filenameTemplate` | ✅ ClipGrid L784 | ✅ pipeline.ts L164 | ✅ Yes |

**Why it works anyway**: All 4 render call sites (ClipGrid ×2, ClipCard ×1, ClipPreview ×1) use `as Parameters<typeof window.api.startBatchRender>[0]` to force-cast the object, so TypeScript never complains. The IPC bridge passes the full object through to the main process unmodified.

**Risk**: If someone renames a field on only one side, it silently breaks with no compiler error.

**Fix**: Add the 6 missing fields to `RenderBatchOptions` in `src/preload/index.d.ts`, then remove the `as` casts from all 4 call sites so TS enforces correctness.

### 2. Preload `RenderClipJob` missing `clipOverrides`

**File**: `src/preload/index.d.ts` lines 137–177

The preload `RenderClipJob` doesn't declare `clipOverrides`, but ClipGrid passes it (lines 561, 843) and all render features check it:
- `captions.feature.ts` → `job.clipOverrides?.enableCaptions`
- `hook-title.feature.ts` → `job.clipOverrides?.enableHookTitle`
- `progress-bar.feature.ts` → `job.clipOverrides?.enableProgressBar`
- `auto-zoom.feature.ts` → `job.clipOverrides?.enableAutoZoom`
- `brand-kit.feature.ts` → `job.clipOverrides?.enableBrandKit`
- `render-handlers.ts` → `job.clipOverrides?.enableSoundDesign`

**Same situation**: Works because of the `as` cast. Just needs the type added.

**Fix**: Add `clipOverrides?: { enableCaptions?: boolean; enableHookTitle?: boolean; enableProgressBar?: boolean; enableAutoZoom?: boolean; enableSoundDesign?: boolean; enableBrandKit?: boolean; layout?: 'default' | 'blur-background' }` to preload `RenderClipJob`.

---

## 🟡 Medium Issues (Store actions with no UI controls)

### 3. Re-hook `style` selector missing from Settings UI

**Store**: `setRehookStyle(style: RehookStyle)` — `settings-slice.ts` L260  
**Store type**: `style: 'bar' | 'text-only' | 'slide-up'` on `RehookOverlaySettings`  
**UI**: SettingsPanel re-hook section has enable toggle + display duration slider only  
**Impact**: Users are stuck on the default rehook style. The setting IS passed to render (`rehookOverlay` includes the full object), so if the default is what you want, it works fine. But the user has no way to change it.

### 4. Re-hook `positionFraction` slider missing from Settings UI

**Store**: `setRehookPositionFraction(fraction: number)` — `settings-slice.ts` L270  
**Type**: `positionFraction: number` (0.4–0.6 range, default 0.45)  
**UI**: No control exists. Always uses default 0.45 (45% through the clip).  
**Impact**: Re-hook always appears at the same relative position. Low impact — 0.45 is a reasonable default.

### 5. Hook Title `outlineWidth` control missing from Settings UI

**Store**: `setHookTitleOutlineWidth(px: number)` — `settings-slice.ts` L248  
**UI**: Color pickers for text/outline exist, but no width slider.  
**Impact**: Outline width stuck at default. The hook title phone preview DOES render with the current outlineWidth value (SettingsPanel L251), so the preview shows what you'd get — you just can't change it.

### 6. Hook Title `fadeIn`/`fadeOut` controls missing from Settings UI

**Store type**: `fadeIn: number`, `fadeOut: number` on `HookTitleOverlaySettings`  
**UI**: No controls. Defaults (0.3s in, 0.4s out) always used.  
**Impact**: Minimal — these are subtle animation timings most users won't care about.

---

## 🟢 Verified Working — Full Checklist

### All settings wired Store → UI → IPC → Main:

| Setting | Store | UI Control | Sent to Render | Main Reads It |
|---------|-------|------------|----------------|---------------|
| Gemini API Key | ✅ | ✅ Input + test | ✅ Pipeline | ✅ |
| Output Directory | ✅ | ✅ Browse | ✅ | ✅ |
| Min Score | ✅ | ✅ Slider | N/A (filter) | N/A |
| Captions Enabled | ✅ | ✅ Switch | ✅ | ✅ |
| Caption Style (all sub-fields) | ✅ | ✅ Full UI | ✅ | ✅ |
| Sound Design (enabled/track/volumes) | ✅ | ✅ Full UI | ✅ | ✅ |
| Auto-Zoom (enabled/intensity/interval) | ✅ | ✅ Full UI | ✅ | ✅ |
| Hook Title (enabled/style/duration/fontSize/colors) | ✅ | ✅ Mostly | ✅ | ✅ |
| Re-hook (enabled/duration) | ✅ | ⚠️ Partial | ✅ | ✅ |
| Progress Bar (all fields) | ✅ | ✅ Full UI | ✅ | ✅ |
| Brand Kit (logo/pos/scale/opacity/bumpers) | ✅ | ✅ Full UI | ✅ | ✅ |
| B-Roll (enabled/key/interval/duration) | ✅ | ✅ Full UI | ✅ | ✅ |
| Filler Removal (all toggles/threshold) | ✅ | ✅ Full UI | ✅ | ✅ |
| Render Quality (preset/CRF/res/format/encoding) | ✅ | ✅ Full UI | ✅ | ✅ |
| Output Aspect Ratio | ✅ | ✅ Grid buttons | ✅ | ✅ |
| Output Format | ✅ | ✅ Grid buttons | ✅ | ✅ |
| Filename Template | ✅ | ✅ Input + pills | ✅ | ✅ |
| Render Concurrency | ✅ | ✅ Slider | ✅ | ✅ |
| Developer Mode | ✅ | ✅ Switch | ✅ | ✅ |
| Notifications | ✅ | ✅ Switch | N/A (client) | N/A |
| Template Layout | ✅ | ✅ Phone preview | ✅ | ✅ |
| Settings Profiles | ✅ | ✅ Save/Load/Del | N/A (client) | N/A |
| Section Reset | ✅ | ✅ Per-section | N/A (client) | N/A |
| Reset All | ✅ | ✅ Confirm dialog | N/A (client) | N/A |
| Hook Templates | ✅ | ✅ CRUD dialog | ✅ Applied | N/A |
| Settings Snapshot/Revert | ✅ | ✅ Warning banner | N/A (client) | N/A |

### Pipeline stages wired correctly:

| Stage | IPC invoke | Progress listener | Store update |
|-------|-----------|-------------------|-------------|
| YouTube Download | `youtube:download` | `onYouTubeProgress` | `addSource` ✅ |
| Transcription | `transcribe:video` | `onTranscribeProgress` | `setTranscription` ✅ |
| AI Scoring | `ai:scoreTranscript` | `onScoringProgress` | `setClips` ✅ |
| Face Detection | `face:detectCrops` | `onFaceDetectionProgress` | `updateClipCrop` ✅ |
| Batch Render | `render:startBatch` | 6 event listeners | `setRenderProgress` ✅ |

### Render event listeners — all properly attached AND cleaned up:

| Event | Handler | Cleanup on unmount |
|-------|---------|-------------------|
| `render:clipStart` | Updates status → 'rendering', captures encoder | ✅ via cleanupRef |
| `render:clipProgress` | Updates percent | ✅ |
| `render:clipDone` | Sets status 'done', stores outputPath | ✅ |
| `render:clipError` | Sets error, logs to ErrorLog | ✅ |
| `render:batchDone` | Sets isRendering=false, computes result | ✅ |
| `render:cancelled` | Same cleanup as batchDone | ✅ |

### Settings don't interfere with each other:

- Each overlay (hook title, re-hook, progress bar) has an independent `enabled` toggle — only sent to render when enabled ✅
- Brand kit, sound design, auto-zoom each gated by `enabled` ✅
- Filler removal gated by `enabled` ✅
- Per-clip overrides (`clipOverrides`) can disable any global feature for individual clips ✅
- Caption style only sent when `captionsEnabled` is true ✅
- Template layout positions are independent percentages, no overlap logic needed ✅
- Render quality preset correctly pre-fills CRF/resolution/encoding but custom values override ✅

---

## 🔵 Low Priority / Cosmetic

### 7. No reset button for Render Quality section

`SectionKey` type in SettingsPanel doesn't include `'renderQuality'`, so there's no per-section reset button. The store's `resetSection` supports it. Reset All covers it.

### 8. Inconsistent action binding pattern

`setEnableNotifications` and `setDeveloperMode` use `useStore.getState().setAction` inline instead of destructuring from `useShallow`. Works fine but creates a new function reference each render.

---

## Recommended Fix Priority

| Priority | Fix | Effort |
|----------|-----|--------|
| 1 | Add 6 missing fields to preload `RenderBatchOptions` + `clipOverrides` to `RenderClipJob` in `src/preload/index.d.ts` | 15 min |
| 2 | Remove `as Parameters<...>` casts from all 4 render call sites | 5 min |
| 3 | Add re-hook style `<Select>` + position fraction `<Slider>` to SettingsPanel | 30 min |
| 4 | Add hook title outline width `<Slider>` to SettingsPanel | 10 min |
| 5 | Add hook title fadeIn/fadeOut `<Slider>`s to SettingsPanel | 15 min |
| 6 | Add renderQuality to `SectionKey` + reset button | 5 min |
| 7 | Standardize getState() calls to destructured pattern | 5 min |

**Total estimated effort**: ~1.5 hours
