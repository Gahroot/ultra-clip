# Live Preview System for Per-Clip Editor

## Overview
Replace the current "blind" editing experience with a real-time styled preview that shows captions, zoom effects, accent colors, shot boundaries, and progress bar overlaid on the video using CSS/canvas — no FFmpeg render required. The preview updates instantly when users change settings.

## Current State
- `ClipPreview.tsx` (1778 lines) is a Dialog with three view modes: Source 16:9, Output 9:16, and "With Overlays" (FFmpeg-rendered preview that takes 3-5 seconds)
- The dialog is `max-w-2xl` — narrow, with the video player being relatively small
- Word timestamps are available on `clip.wordTimestamps` (absolute times with `start`, `end`, `text`)
- Shot segments available on `clip.shots` (clip-relative times with `startTime`, `endTime`, `text`, `breakReason`)
- AI edit plan on `clip.aiEditPlan` with word emphasis levels (`emphasis`, `supersize`)
- Caption style settings have: `animation`, `primaryColor`, `highlightColor`, `emphasisColor`, `supersizeColor`, `fontSize`, `wordsPerLine`, `outline`, `outlineColor`
- Auto-zoom settings have: `intensity` (subtle/medium/dynamic), `intervalSeconds`, `mode` (ken-burns/reactive/jump-cut)
- Hook title settings have: `style`, `displayDuration`, `fadeIn`, `fadeOut`, `fontSize`, `textColor`, `outlineColor`
- Progress bar settings have: `position` (top/bottom), `height`, `color`, `opacity`
- Per-clip accent color override: `clip.overrides?.accentColor`

## Architecture

### New Component: `LivePreviewOverlay.tsx`
A single component that renders all visual overlays on top of the `<video>` element using absolute-positioned HTML/CSS. No canvas needed — CSS transforms and styled divs provide sufficient fidelity for preview purposes.

### Sub-components (all inside LivePreviewOverlay):
1. **CaptionOverlay** — CSS-based word-level caption animation
2. **ZoomContainer** — CSS transform wrapper around the video for zoom simulation
3. **ProgressBarOverlay** — Thin animated bar
4. **HookTitleOverlay** — Text overlay for first N seconds
5. **ShotBoundaryIndicators** — Flash/marker at shot transitions

## Implementation Plan

### Step 1: Create `LivePreviewOverlay.tsx`

**File:** `src/renderer/src/components/LivePreviewOverlay.tsx`

```tsx
interface LivePreviewOverlayProps {
  // Timing
  currentTime: number        // absolute time in source video
  clipStartTime: number      // clip start in source
  clipEndTime: number        // clip end in source
  
  // Caption data
  wordTimestamps?: WordTimestamp[]
  captionStyle: CaptionStyle
  captionsEnabled: boolean
  accentColor?: string       // per-clip accent override
  aiEditPlan?: AIEditPlan    // word emphasis levels
  
  // Zoom
  autoZoomEnabled: boolean
  zoomSettings: ZoomSettings
  
  // Hook title
  hookTitleEnabled: boolean
  hookTitleText?: string
  hookTitleSettings: HookTitleOverlaySettings
  
  // Progress bar
  progressBarEnabled: boolean
  progressBarSettings: ProgressBarOverlaySettings
  
  // Shots
  shots?: ShotSegment[]
  
  // Container dimensions (for scaling calculations)
  containerWidth: number
  containerHeight: number
}
```

#### Caption Overlay Logic:
- Filter `wordTimestamps` to those in `[clipStartTime, clipEndTime]`
- Convert to clip-relative times: `wordRelStart = word.start - clipStartTime`
- Group into lines using `captionStyle.wordsPerLine`
- For current time, find the active line group
- Render words with animation based on `captionStyle.animation`:
  - **captions-ai / word-pop**: Active word scales up slightly (CSS `transform: scale(1.15)`) with highlight color, then returns
  - **karaoke-fill**: Words fill left-to-right with highlight color as they're spoken
  - **glow**: Active word gets a CSS `text-shadow` glow effect
  - **word-box**: Active word gets a colored background box
  - **elastic-bounce**: Active word bounces with CSS `@keyframes` 
  - **typewriter**: Words appear one at a time with cursor
  - **fade-in**: Each word fades in on its start time
  - **impact-two**: Two words at a time, bold slam-in
  - **cascade**: Words cascade in from bottom
- Apply accent color to `highlightColor` if `accentColor` is set
- Apply emphasis levels from `aiEditPlan`:
  - `emphasis`: slightly larger + emphasisColor
  - `supersize`: much larger + supersizeColor + bold

#### Zoom Logic:
- CSS `transform: scale(S) translate(X, Y)` on a wrapper div around the video
- Ken Burns: `S = 1 + amplitude * sin(2π * relativeTime / (2 * intervalSeconds))`
  - subtle: amplitude = 0.05, medium: 0.09, dynamic: 0.13
- Apply `overflow: hidden` on the outer container so zoom doesn't leak

#### Hook Title Logic:
- Show for first `displayDuration` seconds of clip
- Fade in/out with CSS `opacity` transition
- Render based on `style`:
  - `centered-bold`: centered text with outline
  - `top-bar`: bar at top of frame
  - `slide-in`: slide from left with CSS transform

#### Progress Bar Logic:
- Width = `(relativeTime / clipDuration) * 100%`
- Position: top or bottom
- Color from settings or accent override

#### Shot Boundaries:
- At each shot boundary time, show a brief white flash (100ms opacity animation)
- Optionally show a thin vertical line on the timeline/scrubber at shot boundary positions

### Step 2: Create zoom wrapper in ClipPreview

Modify the video rendering section in `ClipPreview.tsx` to:
1. Wrap the `<video>` element in a `ZoomContainer` div that applies CSS transforms
2. Place `LivePreviewOverlay` as a sibling overlay on top of the video
3. Track container dimensions via `ResizeObserver` or a ref

The live preview is always active in the "Output 9:16" view mode. The view mode toggle keeps Source/Output/With Overlays, but Output now shows live overlays by default.

### Step 3: Widen the dialog for better preview experience

Change `max-w-2xl` to `max-w-5xl` and restructure as a two-column layout:
- **Left column (60%)**: Large 9:16 video preview with live overlays — the centerpiece
- **Right column (40%)**: All controls (trim, hook text, overrides, transcript, etc.)

This makes the preview prominent and always visible while editing.

### Step 4: Wire up reactivity

All overlay props come from existing state variables already in `ClipPreview.tsx`:
- `currentTime` from `handleTimeUpdate`
- `localStart` / `localEnd` for clip boundaries
- `effectiveCaptionsEnabled`, `effectiveAutoZoomEnabled`, etc. already computed
- `settings.captionStyle`, `settings.autoZoom`, etc. from store
- `clip.overrides?.accentColor` for accent color
- `clip.shots` for shot segments
- `clip.aiEditPlan` for word emphasis

Changes to any setting (toggle, color picker, style selector) trigger React re-render → overlay updates instantly.

### Step 5: Add CSS animations

Add keyframes to `src/renderer/src/assets/index.css`:
- `@keyframes caption-pop` — scale bounce for word-pop
- `@keyframes caption-glow` — pulsing text-shadow
- `@keyframes caption-bounce` — elastic bounce
- `@keyframes caption-cascade` — slide up from below
- `@keyframes shot-flash` — brief white flash at shot boundary
- `@keyframes hook-slide-in` — slide from left for hook title

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/renderer/src/components/LivePreviewOverlay.tsx` | **CREATE** | All overlay rendering logic (captions, zoom, hook, progress bar, shots) |
| `src/renderer/src/components/ClipPreview.tsx` | **EDIT** | Widen dialog to 2-column layout, integrate LivePreviewOverlay on Output view, add zoom wrapper around video |
| `src/renderer/src/assets/index.css` | **EDIT** | Add caption animation keyframes |

## Detailed Edit Plan for ClipPreview.tsx

### 1. Dialog width change
- Line 733: `max-w-2xl` → `max-w-5xl`

### 2. Two-column layout
- After DialogHeader, wrap content in a flex row:
  - Left: video player + live overlay (flex-[3])
  - Right: scrollable controls panel (flex-[2])

### 3. Video section changes
- Add `ref` to the video container div for measuring dimensions
- Wrap video in a zoom container div with CSS transform
- Add `<LivePreviewOverlay>` as sibling after video, absolutely positioned
- Live overlay shown when `viewMode === 'output'` (not just "With Overlays")
- Keep "With Overlays" FFmpeg preview as a separate option for pixel-perfect check

### 4. State additions
- `containerDims: { width: number; height: number }` — tracked via ResizeObserver on the 9:16 container

## Caption Animation Mapping

| Animation ID | CSS Approximation |
|-------------|-------------------|
| `captions-ai` | Active word: scale(1.1) + highlightColor, 150ms transition |
| `word-pop` | Active word: scale(1.2) + highlightColor, spring-like bounce keyframe |
| `karaoke-fill` | Words before current: highlightColor, current: partial fill via gradient |
| `glow` | Active word: text-shadow 0 0 10px + 0 0 20px in highlightColor |
| `word-box` | Active word: background-color box with padding |
| `elastic-bounce` | Active word: translateY bounce keyframe |
| `fade-in` | Words appear with opacity 0→1 on start time |
| `typewriter` | Only show words up to current time, blinking cursor after last |
| `impact-two` | Two words at a time, scale from 1.3→1.0 |
| `cascade` | Words slide up from +20px with staggered delays |

## Risks & Mitigations

1. **Performance with many words**: Use `useMemo` to pre-compute line groups, only re-filter active line on time update
2. **CSS transforms vs FFmpeg**: Won't be pixel-perfect, but close enough for creative decisions
3. **Dialog size**: 5xl might be too wide on small screens — use responsive `max-w-5xl w-[95vw]`
4. **Video dimension tracking**: ResizeObserver may fire frequently — debounce

## Verification

1. `npx electron-vite build` passes
2. Open a clip in the editor → see Output 9:16 view with live captions animating
3. Change caption style → overlay updates immediately
4. Change accent color → captions highlight color changes
5. Toggle auto-zoom → video zooms/pans with CSS transform
6. Toggle hook title → text appears/fades in first seconds
7. Toggle progress bar → bar animates at bottom/top
8. Shot boundaries flash at transition points
9. Play/pause/scrub all update overlay correctly
