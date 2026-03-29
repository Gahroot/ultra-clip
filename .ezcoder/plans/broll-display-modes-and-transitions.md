# B-Roll Display Modes & Transitions

## Summary
Add four B-Roll display modes (fullscreen, split-top, split-bottom, picture-in-picture) and four transition types (hard-cut, crossfade, swipe-up, swipe-down) to the B-Roll overlay system. Split-top becomes the default.

## Current Architecture
- **Types**: `BRollPlacement` in `src/main/broll-placement.ts` (startTime, duration, videoPath, keyword)
- **Settings**: `BRollSettings` in `src/renderer/src/store/types.ts` (enabled, pexelsApiKey, intervalSeconds, clipDuration)
- **Rendering**: `src/main/render/features/broll.feature.ts` — post-process phase that:
  1. Copies rendered clip to temp
  2. Builds filter_complex: for each placement, trim B-Roll → shift PTS → scale/crop 1080×1920 → alpha fade in/out → overlay at 0:0 (fullscreen)
  3. Uses `overlay=0:0:eof_action=pass:enable='...'` with time-gated enable
- **Settings UI**: `src/renderer/src/components/SettingsPanel.tsx` lines 1960–2109
- **Store setters**: `src/renderer/src/store/settings-slice.ts` lines 356–378
- **Defaults**: `src/renderer/src/store/helpers.ts` line 265
- **Reference**: `src/main/layouts/split-screen.ts` has excellent examples of vstack, overlay, and PiP with rounded corners

## Changes

### 1. Add types for display mode & transition

**File: `src/renderer/src/store/types.ts`** (after line 363)
```ts
export type BRollDisplayMode = 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
export type BRollTransition = 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
```

Add to `BRollSettings` interface (lines 348–363):
```ts
  /** Display mode for B-Roll overlays. Default: 'split-top' */
  displayMode: BRollDisplayMode
  /** Transition type for B-Roll entry/exit. Default: 'crossfade' */
  transition: BRollTransition
  /** PiP size as fraction of canvas width (0.2–0.4). Default: 0.25 */
  pipSize: number
  /** PiP corner position. Default: 'bottom-right' */
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
```

**File: `src/main/broll-placement.ts`** — Add matching types:
```ts
export type BRollDisplayMode = 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
export type BRollTransition = 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
```

Add to `BRollSettings`:
```ts
  displayMode: BRollDisplayMode
  transition: BRollTransition
  pipSize: number
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
```

Add to `BRollPlacement`:
```ts
  displayMode: BRollDisplayMode
  transition: BRollTransition
  pipSize: number
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
```

### 2. Update placement builders to pass display/transition config

**File: `src/main/broll-placement.ts`**
- In `buildBRollPlacements` and `buildSimpleBRollPlacements`, propagate `settings.displayMode`, `settings.transition`, `settings.pipSize`, `settings.pipPosition` into each `BRollPlacement`.

### 3. Rewrite the FFmpeg filter builder in `broll.feature.ts`

**File: `src/main/render/features/broll.feature.ts`**

Replace the single `applyBRollOverlay` function with a mode-aware version. The key changes per mode:

#### Fullscreen (existing behavior)
- Scale B-Roll to 1080×1920, overlay at 0:0

#### Split-Top (default)
- B-Roll fills top ~65% (1248px), speaker shrinks to bottom 35% (672px)
- For each B-Roll time window:
  - Scale B-Roll: `scale=1080:1248:force_original_aspect_ratio=increase,crop=1080:1248`
  - Scale speaker (main): During the B-Roll window, the main video needs to be composited as the bottom strip
  - Use `overlay` with enable to composite both during the B-Roll window
- Implementation approach: For each placement, build a filter that:
  1. Crops/scales B-Roll to 1080×topH
  2. Crops/scales a copy of the main video to 1080×botH
  3. Vstacks them during the B-Roll window
  4. Overlays the combined split on top of the main video (enabled only during the window)

#### Split-Bottom (inverse)
- Speaker fills top ~65%, B-Roll fills bottom ~35%
- Same approach as split-top but inverted positions

#### PiP (Picture-in-Picture)
- B-Roll goes fullscreen (1080×1920), speaker in small window in corner
- Scale B-Roll fullscreen, scale main to pipW×pipH
- Overlay main on top of B-Roll in the chosen corner position
- Use the PiP overlay pattern from `split-screen.ts` (with drawbox border)

#### Transition Implementation

For each display mode, the transition determines how the B-Roll enters/exits:

- **hard-cut**: No fade. B-Roll appears/disappears instantly. Just use `enable='between(t,start,end)'` with no fade filters.
- **crossfade**: Current behavior — alpha fade in/out on the B-Roll layer. `fade=t=in:st=...:d=...:alpha=1,fade=t=out:st=...:d=...:alpha=1`
- **swipe-up**: Animate overlay Y position from `H` (off bottom) to `0` (in position) over transition duration. Use `overlay=0:'if(between(t,ST,ST+D),H*(1-(t-ST)/D),0)'` for entry. Reverse for exit (0 → -H or similar).
- **swipe-down**: Same as swipe-up but from `-H` (off top) to `0`. Use `overlay=0:'if(between(t,ST,ST+D),-H+H*(t-ST)/D,0)'`.

For swipe transitions in split modes, animate the Y positions of both the B-Roll panel and speaker panel.

**Critical filter_complex design:**

The challenge is that split/PiP modes require compositing the main video at a different scale during B-Roll windows. The approach:

1. Pre-compose each B-Roll segment as a complete 1080×1920 frame (B-Roll + scaled speaker in the appropriate layout)
2. Apply transition animation to the composed frame
3. Overlay onto the main video with enable gating

This is the cleanest approach because it keeps the overlay pattern identical to the existing fullscreen mode — just the content of the overlay frame changes.

```
For each placement i:
  // Step 1: Build the composed frame based on display mode
  [inputIdx:v] → trim, scale → [broll_raw_i]
  [0:v] → trim from same window, scale to speaker size → [speaker_i] (skip for fullscreen)
  
  // For split-top: vstack [broll_raw_i][speaker_i] → [composed_i]
  // For split-bottom: vstack [speaker_i][broll_raw_i] → [composed_i]  
  // For pip: overlay speaker on broll → [composed_i]
  // For fullscreen: [broll_raw_i] is the composed frame
  
  // Step 2: Apply transition to composed frame
  Based on transition type, apply fade/position animation
  
  // Step 3: Overlay onto main timeline
  [prev][composed_i]overlay=...:enable='...'[out_i]
```

### 4. Update defaults and store

**File: `src/renderer/src/store/helpers.ts`** — line 265:
```ts
export const DEFAULT_BROLL: BRollSettings = {
  enabled: false,
  pexelsApiKey: localStorage.getItem('batchcontent-pexels-key') || '',
  intervalSeconds: 5,
  clipDuration: 3,
  displayMode: 'split-top',    // NEW default
  transition: 'crossfade',      // NEW default  
  pipSize: 0.25,               // NEW
  pipPosition: 'bottom-right', // NEW
}
```

Update preset profiles (lines 489, 507, 525) to include new fields.

**File: `src/renderer/src/store/helpers.ts`** — `hydrateSettings` (line 375):
Add migration for new fields in the broll spread.

### 5. Add store setters

**File: `src/renderer/src/store/settings-slice.ts`**

Add after line 101:
```ts
setBRollDisplayMode: (mode: BRollDisplayMode) => void
setBRollTransition: (transition: BRollTransition) => void
setBRollPipSize: (size: number) => void
setBRollPipPosition: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void
```

Add implementations after line 378:
```ts
setBRollDisplayMode: (displayMode) =>
  set((state) => ({
    settings: { ...state.settings, broll: { ...state.settings.broll, displayMode } }
  })),
setBRollTransition: (transition) =>
  set((state) => ({
    settings: { ...state.settings, broll: { ...state.settings.broll, transition } }
  })),
setBRollPipSize: (pipSize) =>
  set((state) => ({
    settings: { ...state.settings, broll: { ...state.settings.broll, pipSize } }
  })),
setBRollPipPosition: (pipPosition) =>
  set((state) => ({
    settings: { ...state.settings, broll: { ...state.settings.broll, pipPosition } }
  })),
```

### 6. Update Settings UI

**File: `src/renderer/src/components/SettingsPanel.tsx`**

Add new controls in the B-Roll section (after the clip duration slider, before the "How it works" paragraph):

1. **Display Mode** — Select/RadioGroup with 4 options and visual layout icons:
   - Fullscreen, Split Top (default), Split Bottom, Picture-in-Picture
   
2. **Transition Type** — Select with 4 options:
   - Hard Cut, Crossfade (default), Swipe Up, Swipe Down

3. **PiP Settings** (shown only when displayMode === 'pip'):
   - PiP Size slider (0.2–0.4)
   - PiP Position selector (4 corners)

Add the new store selectors in the useStore destructure at line ~489.

### 7. Update IPC handler

**File: `src/main/ipc/media-handlers.ts`** — lines 153–160

Update the `settings` parameter type and `brollSettings` object to include the new fields:
```ts
settings: { 
  intervalSeconds: number; 
  clipDuration: number;
  displayMode: BRollDisplayMode;
  transition: BRollTransition;
  pipSize: number;
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}
```

### 8. Update preload types

**File: `src/preload/index.d.ts`** — line 886

Update the settings parameter type to include the new fields.

### 9. Update the store export type

**File: `src/renderer/src/store.ts`** — Ensure BRollDisplayMode and BRollTransition are re-exported from types.

## File Edit Order (by dependency)

1. `src/renderer/src/store/types.ts` — Add new types
2. `src/main/broll-placement.ts` — Add types + update interfaces + update builders
3. `src/main/render/features/broll.feature.ts` — Rewrite filter builder (biggest change)
4. `src/renderer/src/store/helpers.ts` — Update defaults
5. `src/renderer/src/store/settings-slice.ts` — Add setters
6. `src/main/ipc/media-handlers.ts` — Update IPC handler
7. `src/preload/index.d.ts` — Update preload types
8. `src/renderer/src/components/SettingsPanel.tsx` — Add UI controls
9. Build & verify: `npx electron-vite build`

## Risks
- Complex filter_complex for split modes with transitions — need to be careful with label naming and PTS alignment
- Swipe transitions require overlay position expressions that vary with time — these can be complex with FFmpeg's expression syntax
- Split modes require extracting a copy of the main video for the speaker panel — this means `[0:v]` must be split and used multiple times in the filter graph (use `split` filter)
- Testing with actual video needed; the filter_complex can be validated by build only

## Verification
1. `npx electron-vite build` passes with no errors
2. `npm test` passes
