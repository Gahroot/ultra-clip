# Plan: Kill BUILT_IN_EDIT_STYLE_PRESETS, Make EDIT_STYLES the Single Style System

## Goal
Remove the renderer-side `BUILT_IN_EDIT_STYLE_PRESETS` (Hormozi Fire, TikTok Hype, etc.) and make the 15 Captions.ai-derived `EDIT_STYLES` from `src/main/edit-styles.ts` (Ember, Clarity, Volt, Impact, etc.) the **only** style system in the app. One style picker, one decision point.

## Current State: Two Competing Style Systems

### System 1: `BUILT_IN_EDIT_STYLE_PRESETS` (renderer-side, KILL THIS)
- **Defined in:** `src/renderer/src/store/helpers.ts` line ~1849 (10+ presets like Hormozi Fire, TikTok Hype, Edu Clear, etc.)
- **Also in:** `src/renderer/src/store/edit-style-presets.ts` (3700+ line file with `EDIT_STYLE_PRESETS` array — huge)
- **Type:** `EditStylePreset` from `src/renderer/src/store/types.ts` line ~595
- **UI:** `StylePresetPicker` component inside `SettingsPanel.tsx` lines ~654–848, also duplicated in `ClipPreview.tsx` lines ~377–640+
- **Store state:** `activeStylePresetId`, `activeVariantId`, `applyEditStylePreset` in settings-slice
- **What it does:** Bundles feature toggle settings (captions on/off, zoom mode, sound design, overlays) and overwrites `AppSettings` when selected. A convenience preset that just toggles the ~15 individual settings.

### System 2: `EDIT_STYLES` (main-process, KEEP THIS)
- **Defined in:** `src/main/edit-styles.ts` — 15 styles reverse-engineered from Captions.ai
- **Type:** `EditStyle` from `src/preload/index.d.ts` line 927 and `src/shared/types.ts` line 779
- **UI:** `EditStyleSelector` component in `src/renderer/src/components/EditStyleSelector.tsx` — used in ClipPreview style modal
- **Store state:** `selectedEditStyleId` in store
- **IPC:** `editStyles:getAll`, `editStyles:getById` in media-handlers.ts
- **What it does:** Controls the **segmented rendering pipeline** — energy tier, segment styles, zoom type, transition type, accent color, letterbox, caption bg opacity. Used by `segment-splitting-stage.ts` and `render/pipeline.ts`.

## Changes Required

### Phase 1: Remove BUILT_IN_EDIT_STYLE_PRESETS from store & helpers

**File: `src/renderer/src/store/helpers.ts`**
- Delete the entire `BUILT_IN_EDIT_STYLE_PRESETS` array (starts ~line 1849, contains 10+ preset objects)
- Delete `resolvePresetVariant()` function (~line 1783)
- Delete `applyEditStylePresetToSettings()` function (~line 1812)
- Keep all other helpers (CAPTION_PRESETS, profile helpers, etc.)

**File: `src/renderer/src/store/edit-style-presets.ts`**
- Delete this entire file (3700+ lines of `EDIT_STYLE_PRESETS` that are not even used — the helpers.ts version is what's imported)

**File: `src/renderer/src/store/types.ts`**
- Remove `EditStylePreset`, `EditStyleVariant`, `EditStyleCategory` types and all the sub-interfaces (`EditStyleCaptions`, `EditStyleZoom`, `EditStyleBRoll`, `EditStyleSound`, `EditStyleHookTitle`, `EditStyleRehook`, `EditStyleProgressBar`) — lines ~595–724
- Keep `EditStyle` type (re-exported from shared/types)

**File: `src/renderer/src/store/settings-slice.ts`**
- Remove `applyEditStylePreset` action (line ~616)
- Remove imports of `BUILT_IN_EDIT_STYLE_PRESETS`, `applyEditStylePresetToSettings`
- Remove `persistActiveStylePresetId`, `persistActiveVariantId` localStorage functions

**File: `src/renderer/src/store/index.ts`**
- Remove `activeStylePresetId` and `activeVariantId` from initial state (line ~157)
- Remove `applyEditStylePreset` from actions
- Remove these from exports

### Phase 2: Remove StylePresetPicker from SettingsPanel

**File: `src/renderer/src/components/SettingsPanel.tsx`**
- Delete `CATEGORY_META` constant (~line 645)
- Delete entire `StylePresetPicker` component (~lines 654–848)
- Remove `<StylePresetPicker />` from the returned JSX (~line 1291)
- Remove imports: `BUILT_IN_EDIT_STYLE_PRESETS`, `EditStyleCategory`, `Palette`, `ChevronDown`
- The settings panel should still have its tabs (Style, Effects, Overlays, Settings) for fine-tuning — those stay

### Phase 3: Replace style picker in ClipPreview.tsx

**File: `src/renderer/src/components/ClipPreview.tsx`**
- Remove the duplicate `StylePresetPicker` / `CATEGORY_META` / variant picker (~lines 238–640)
- Remove imports of `BUILT_IN_EDIT_STYLE_PRESETS`
- The `EditStyleSelector` (line ~1791) already shows the 15 AI edit styles — keep this
- Wire the edit style selection to `selectedEditStyleId` store state (already done at line ~769)
- Remove references to `activeStylePresetId`, `activeVariantId`, `applyEditStylePreset`

### Phase 4: Clean up ClipCard.tsx

**File: `src/renderer/src/components/ClipCard.tsx`**
- Remove import of `BUILT_IN_EDIT_STYLE_PRESETS` (line 17)
- Remove `activeStylePresetId` store selector (line 99)
- Remove the edit plan generation code that references `BUILT_IN_EDIT_STYLE_PRESETS` to get preset name/category (lines ~113, 276–277)
- Instead, use `selectedEditStyleId` and the `EditStyle` from the IPC to get the style name for the edit plan prompt

### Phase 5: Clean up ClipGrid.tsx

**File: `src/renderer/src/components/ClipGrid.tsx`**
- Remove import of `BUILT_IN_EDIT_STYLE_PRESETS` (line 85)
- Remove `activeStylePresetId` store selector (line 261)
- Remove style preset map (line 265)
- The render job's `stylePresetId` (line 645) should use `selectedEditStyleId` instead of `activeStylePresetId`

### Phase 6: Clean up SegmentStylePicker.tsx

**File: `src/renderer/src/components/SegmentStylePicker.tsx`**
- Remove import of `BUILT_IN_EDIT_STYLE_PRESETS` (line 3)
- Remove `activeStylePresetId`, `activeVariantId` selectors (lines 298–299)
- Remove preset lookup for variant name display (lines 324–326)

### Phase 7: Clean up project save/load

**File: `src/renderer/src/services/project-service.ts`**
- Remove `activeStylePresetId` and `activeVariantId` from save/load (lines 30–31, 77–78)
- Add `selectedEditStyleId` to save/load if not already there

**File: `src/renderer/src/App.tsx`**
- Remove `activeStylePresetId` and `activeVariantId` from project load (lines 248–249)

### Phase 8: Clean up store exports

**File: `src/renderer/src/store.ts`** (barrel export)
- Remove re-exports of deleted types: `EditStylePreset`, `EditStyleVariant`, `EditStyleCategory`, etc.
- Remove re-export of `BUILT_IN_EDIT_STYLE_PRESETS`

### Phase 9: Make selectedEditStyleId mandatory (default to 'cinematic')

**File: `src/renderer/src/store/index.ts`**
- Change `selectedEditStyleId` initial value from `null` to `'cinematic'`
- This means the segmented pipeline always runs — no more "skip if no style selected"

**File: `src/renderer/src/hooks/pipeline-stages/segment-splitting-stage.ts`**
- Remove the early-return when `selectedEditStyleId` is null (lines 27–31) — it will always be set now

### Phase 10: Add EditStyleSelector to SettingsPanel

**File: `src/renderer/src/components/SettingsPanel.tsx`**
- Where `<StylePresetPicker />` was, add a new section that:
  1. Fetches edit styles via `window.api.getEditStyles()` (IPC call to `editStyles:getAll`)
  2. Shows the `EditStyleSelector` component with `selectedEditStyleId` and `setSelectedEditStyleId`
  3. Compact horizontal scroll strip at the top (similar to the old StylePresetPicker but using the 15 AI styles grouped by energy tier)

## Files Changed Summary

| File | Action |
|------|--------|
| `src/renderer/src/store/helpers.ts` | Delete ~120 lines (BUILT_IN_EDIT_STYLE_PRESETS + helper functions) |
| `src/renderer/src/store/edit-style-presets.ts` | **Delete entire file** (3700+ lines) |
| `src/renderer/src/store/types.ts` | Remove ~130 lines of EditStylePreset types |
| `src/renderer/src/store/settings-slice.ts` | Remove applyEditStylePreset action + imports |
| `src/renderer/src/store/index.ts` | Remove activeStylePresetId/activeVariantId, default selectedEditStyleId to 'cinematic' |
| `src/renderer/src/store.ts` | Remove re-exports of deleted types |
| `src/renderer/src/components/SettingsPanel.tsx` | Delete StylePresetPicker (~200 lines), add EditStyleSelector |
| `src/renderer/src/components/ClipPreview.tsx` | Remove duplicate StylePresetPicker, keep EditStyleSelector modal |
| `src/renderer/src/components/ClipCard.tsx` | Remove BUILT_IN_EDIT_STYLE_PRESETS references |
| `src/renderer/src/components/ClipGrid.tsx` | Use selectedEditStyleId instead of activeStylePresetId |
| `src/renderer/src/components/SegmentStylePicker.tsx` | Remove BUILT_IN_EDIT_STYLE_PRESETS references |
| `src/renderer/src/services/project-service.ts` | Remove activeStylePresetId/activeVariantId from save/load |
| `src/renderer/src/App.tsx` | Remove activeStylePresetId/activeVariantId from project load |
| `src/renderer/src/hooks/pipeline-stages/segment-splitting-stage.ts` | Remove null check (always runs now) |

## Risks
- **Settings tabs still reference individual settings** (captionsEnabled, autoZoom, etc.) — these still work as fine-tuning overrides. The edit style controls the segmented render, settings control the feature pipeline. They're complementary now, not competing.
- **Project files** saved with old `activeStylePresetId` will have that field ignored on load — harmless.
- **Tests** in `src/renderer/src/store.test.ts` reference `selectedEditStyleId` (lines 746–782) — these should still pass since we're keeping that field, just defaulting it to 'cinematic' instead of null.

## Verification
1. `npx electron-vite build` — must compile with zero errors
2. `npm test` — all tests pass
3. Manual: Open app → Settings panel shows the 15 AI edit styles where StylePresetPicker was → pick one → process → clips get segmented
