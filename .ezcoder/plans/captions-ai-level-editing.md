# Captions.ai-Level Editing Enhancement Plan

## Executive Summary

Transform BatchContent's editing output to match and exceed captions.ai's AI Edit quality. Based on research of captions.ai's features and analysis of our current codebase, this plan identifies **7 major enhancement areas** across our existing systems — no new "features" per se, but deep improvements to what we already have.

## What Captions.ai Does (That We Need to Match)

From analyzing captions.ai's AI Edit feature, their style library, and the screenshots/example videos:

### 1. **Dynamic Caption Animations** (We have 4, they have 100+)
- **Word emphasis / supersizing**: Key words pop larger (2-3x size) — e.g. "BUSINESS", "GROWTH", "CONSISTENCY"
- **Multi-color per line**: Different words get different colors — highlight words are bold/colored, filler words are neutral
- **Animation variety**: bounce-in, typewriter, wave, elastic, shake, 3D perspective rotate
- **Background boxes on words**: Individual word-level rounded-rect backgrounds (like the "Clarity" style with sticky-note look)
- **Stacked text layouts**: Two lines where one is small and the other is HUGE (see "Impact II", "Velocity" styles)
- **Position variation**: Captions that move between top/middle/bottom based on content

### 2. **B-Roll Pull-Up / Insert Editing** (We have basic Pexels B-Roll, they do it intelligently)
- **Full-screen B-Roll takeover**: Speaker disappears, B-Roll fills 100% of frame with captions overlaid
- **Split-screen B-Roll**: Speaker shrinks to bottom 30-40%, B-Roll fills top 60-70% (the "pull-up" effect from your description)
- **Contextual B-Roll timing**: B-Roll appears on key nouns/concepts, not on random intervals
- **B-Roll with motion**: Ken Burns zoom on still images, or actual video clips with movement
- **Transition effects**: Smooth cross-dissolve or swipe transitions in/out of B-Roll

### 3. **Speaker Layout Switching** (We have static split-screen, they swap dynamically)
- **Dynamic layout changes mid-clip**: Start with speaker full-screen → switch to split-screen with B-Roll → back to full-screen
- **Speaker repositioning**: Speaker moves from center to corner to bottom as content demands
- **The "swap down" effect**: Speaker shrinks from full-frame to bottom third while B-Roll fills top

### 4. **Motion Graphics / Text Overlays** (Beyond captions)
- **Keyword text overlays**: When speaker says a key concept, a big stylized text appears on screen (separate from captions)
- **Topic labels**: "CHAPTER 1", "THE PROBLEM", etc. as graphical elements
- **Emoji/icon inserts**: Relevant emojis or simple icons appear near key words
- **Animated backgrounds**: Subtle gradient shifts, particle effects, color grading changes

### 5. **Sound Design** (We have basic SFX, they're more refined)
- **Whoosh on layout transitions**: When switching from speaker to B-Roll
- **Impact sounds on emphasis words**: Timed precisely to word emphasis moments
- **Rise/tension before reveals**: Building anticipation sound before key moments
- **Background music ducking**: Music volume dips during important speech passages

### 6. **Zoom & Camera Work** (We have Ken Burns, they do reactive zooms)
- **Punch-in on emphasis**: Quick zoom-in (1.0→1.15x) on power words, then ease back
- **Zoom on speaker energy**: Detect louder/more emphatic speech → zoom in
- **Cut-style zoom jumps**: Instant 10% zoom changes (not smooth) to simulate multi-camera edits

### 7. **Edit Pacing / Rhythm**
- **Silence removal**: Cut dead air and filler words
- **Jump cuts**: Remove pauses, tighten pacing
- **Visual change frequency**: Something visual changes every 2-3 seconds (zoom, B-Roll, caption animation, layout switch)

---

## Current Codebase State (What We Have)

| Feature | Current State | File(s) |
|---------|--------------|---------|
| Captions | 4 animations (karaoke-fill, word-pop, fade-in, glow) | `src/main/captions.ts` |
| B-Roll | Pexels API download + interval-based placement | `src/main/broll-placement.ts`, `src/main/broll-pexels.ts`, `src/main/broll-keywords.ts` |
| Split Screen | 4 static layouts (top-bottom, pip, side-by-side, reaction) | `src/main/layouts/split-screen.ts` |
| Auto-Zoom | Ken Burns sine-wave (subtle/medium/dynamic) | `src/main/auto-zoom.ts` |
| Hook Title | 3 styles (centered-bold, top-bar, slide-in) | `src/main/hook-title.ts` |
| Re-hook | 3 styles (text-only, bar, slide-up) | `src/main/overlays/rehook.ts` |
| Progress Bar | 3 styles (solid, gradient, glow) | `src/main/overlays/progress-bar.ts` |
| Sound Design | Background music + power-word SFX + whooshes | `src/main/sound-design.ts` |
| Blur Background | Blurred fill for non-9:16 sources | `src/main/layouts/blur-background.ts` |
| Filler Detection | Filler word removal | `src/main/filler-detection.ts` |
| Render Pipeline | Full FFmpeg pipeline with overlay passes | `src/main/render/` |

---

## Implementation Plan (7 Phases)

### Phase 1: Advanced Caption System
**Goal**: Go from 4 basic animations to a rich caption engine with word emphasis, multi-size, multi-color

#### Files to modify:
- `src/main/captions.ts` — Core ASS generation engine
- `src/main/ai-scoring.ts` — Already scores transcripts; extend to tag emphasis words
- `src/shared/types.ts` — Add new CaptionAnimation types

#### Changes:

**1a. Word Emphasis Detection** (`src/main/captions.ts` or new `src/main/caption-emphasis.ts`)
- AI-driven emphasis word tagging: Send transcript to Gemini asking it to tag words as `normal | emphasis | supersize` 
- Heuristic fallback: Use the existing `POWER_WORDS` set from `sound-design.ts` (line 61-72) + all-caps words + numbers
- Output: Each `WordInput` gets an `emphasis?: 'normal' | 'emphasis' | 'supersize'` field

**1b. New Caption Animations** (`src/main/captions.ts`)
Add these animation types (each gets its own `buildXxxLines()` function):
- `bounce-in` — Words bounce in with overshoot (scale 130% → 100% with elastic ease)
- `typewriter` — Characters appear one at a time left-to-right
- `emphasis-pop` — Normal words fade in, emphasis words POP at 150% then settle, supersize words render at 200%+ size
- `stacked-impact` — Two lines: small context text on top, HUGE emphasis word below (the "Impact" style from captions.ai)
- `wave` — Words animate in with a wave motion (slight Y offset staggered per word)

**1c. Multi-Color & Multi-Size Words** (`src/main/captions.ts`)
- Current: All words same color/size, only highlight color changes via karaoke
- New: Per-word `\fs` (font size) and `\1c` (color) overrides in ASS
- Emphasis words get `highlightColor` + `fontSize * 1.3`
- Supersize words get `emphasisColor` (new field) + `fontSize * 2.0`
- Add `emphasisColor` field to `CaptionStyleInput`

**1d. Word-Level Background Boxes** (`src/main/captions.ts`)
- ASS supports `\3c` (border color) and `borderStyle=3` (opaque box) per override block
- For styles like "Clarity" — each word gets its own colored background box
- Add `wordBoxes: boolean` option to `CaptionStyleInput`

#### New Types in `@shared/types`:
```typescript
type CaptionAnimation = 
  | 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow'  // existing
  | 'bounce-in' | 'typewriter' | 'emphasis-pop' | 'stacked-impact' | 'wave'  // new

interface WordEmphasis {
  wordIndex: number
  level: 'normal' | 'emphasis' | 'supersize'
}
```

---

### Phase 2: Dynamic B-Roll Integration
**Goal**: B-Roll that works like captions.ai — full takeover, split-screen pull-up, cross-dissolves

#### Files to modify:
- `src/main/broll-placement.ts` — Placement engine (currently interval-based)
- `src/main/render/overlay-runner.ts` — B-Roll overlay pass
- New: `src/main/broll-transitions.ts` — Transition effect builders

#### Changes:

**2a. Smarter B-Roll Timing** (`src/main/broll-placement.ts`)
- Current: Places B-Roll every N seconds at nearest keyword
- New: AI-driven placement — send transcript to Gemini asking "which phrases would benefit from B-Roll visual support?" with timestamps
- Return specific timestamp windows where B-Roll enhances the message
- Fallback to keyword-based placement if AI fails

**2b. B-Roll Display Modes** (new field on `BRollPlacement`)
```typescript
interface BRollPlacement {
  // ...existing fields...
  displayMode: 'overlay' | 'fullscreen' | 'split-top' | 'split-bottom'
  transitionIn: 'cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  transitionOut: 'cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  transitionDuration: number // seconds, e.g. 0.3
}
```

**2c. B-Roll FFmpeg Filter Builders** (new `src/main/broll-transitions.ts`)
- `fullscreen`: B-Roll replaces speaker entirely for the duration
- `split-top`: Speaker shrinks to bottom 35%, B-Roll fills top 65% (the "pull-up" effect)
- `split-bottom`: B-Roll in bottom section, speaker stays on top
- `overlay`: Current behavior — B-Roll overlaid with opacity
- Cross-dissolve: Use `xfade` filter for transitions in/out
- Swipe: Use `xfade=transition=slideup` / `slidedown`

**2d. B-Roll Render Pass** (`src/main/render/overlay-runner.ts`)
- Current overlay runner already handles B-Roll placements
- Extend to support the new display modes and transition effects
- For `split-top`/`split-bottom`: Generate dynamic filter_complex that transitions between full-frame speaker and split layout

---

### Phase 3: Dynamic Layout Switching (The "Swap Down" Effect)
**Goal**: Mid-clip layout changes — speaker goes from full-screen to split-screen and back

#### Files to modify:
- New: `src/main/edit-timeline.ts` — Edit decision list (EDL) data structure
- `src/main/render/base-render.ts` — Multi-segment render with layout changes
- `src/main/layouts/split-screen.ts` — May need per-frame layout transitions

#### Concept:
Instead of rendering the entire clip with one static layout, we introduce an **edit timeline** — a sequence of time-windowed "shots" each with their own layout:

```typescript
interface EditTimelineShot {
  startTime: number  // relative to clip start
  endTime: number
  layout: 'full-speaker' | 'split-broll-top' | 'split-broll-bottom' | 'full-broll' | 'pip'
  brollPath?: string
  zoomLevel?: number  // override zoom for this shot
  transition?: { type: 'cut' | 'crossfade' | 'swipe'; duration: number }
}

interface EditTimeline {
  shots: EditTimelineShot[]
}
```

**3a. AI Timeline Generation** (new `src/main/ai/edit-timeline-generator.ts`)
- Send transcript + word timestamps + emphasis data to Gemini
- Ask it to produce an edit timeline: when to cut to B-Roll, when to zoom, when to do split screen
- Rules: visual change every 2-4 seconds, never B-Roll during hook (first 3s), match B-Roll to content
- Output: `EditTimeline` with shot list

**3b. FFmpeg Multi-Shot Render** 
- Current render does one pass per clip (trim → crop → scale → overlays)
- New: Render each shot as a separate segment with its own filter chain, then concat
- Use `concat` demuxer or `xfade` filter between segments for transitions
- This is the core technical challenge — it's multiple FFmpeg passes stitched together

---

### Phase 4: Reactive Zoom System
**Goal**: Zoom that reacts to content — punch-in on emphasis, jump cuts, energy-based

#### Files to modify:
- `src/main/auto-zoom.ts` — Currently sine-wave only
- New field: `zoomMode: 'ken-burns' | 'reactive' | 'jump-cut'`

#### Changes:

**4a. Reactive Zoom Keyframes** (`src/main/auto-zoom.ts`)
- New mode: `reactive` — zoom keyframes driven by word emphasis data
- On emphasis words: quick zoom in (0.2s ease to 1.12x) → hold → ease back (0.3s)
- On supersize words: faster, larger zoom (0.15s to 1.2x)
- Between emphasis moments: gentle Ken Burns breathing (current sine wave at lower amplitude)

**4b. Jump-Cut Zoom** (`src/main/auto-zoom.ts`)
- New mode: `jump-cut` — instant 8-12% zoom changes every 3-5 seconds
- Simulates multi-camera editing feel
- No easing — hard cuts between zoom levels
- Very effective for talking-head content retention

**4c. Implementation Approach**
- Current zoom uses crop filter with time-based expressions (continuous math)
- Reactive zoom needs discrete keyframes → generate piecewise FFmpeg expressions
- Each keyframe: `(t>=T1)*(t<T2)*ZOOM1 + (t>=T2)*(t<T3)*ZOOM2 + ...`
- Add easing between keyframes for reactive mode, no easing for jump-cut mode

---

### Phase 5: Enhanced Sound Design
**Goal**: Sound effects that match visual changes — transition whooshes, emphasis impacts, music ducking

#### Files to modify:
- `src/main/sound-design.ts` — Placement engine

#### Changes:

**5a. Visual-Sync Sound Placement**
- Current: SFX placed on power words + speech pauses
- New: SFX placed in sync with edit timeline events:
  - Layout transitions (speaker→B-Roll) → whoosh
  - B-Roll appearances → soft swoosh/swipe sound
  - Emphasis word moments → impact/bass hit
  - Clip start → subtle intro rise
  - Re-hook moment → notification/attention sound

**5b. Music Volume Ducking** (`src/main/sound-design.ts`)
- Detect speech segments vs pauses from word timestamps
- During speech: music at `musicVolume * 0.4`
- During pauses/B-Roll: music at `musicVolume * 1.0`
- Implement via FFmpeg `sidechaincompress` or manual volume envelope with `volume` filter

**5c. New SFX Types**
- Add: `swipe`, `pop`, `bass-drop`, `rise-short`, `camera-shutter`, `typing`
- These match the visual effects: swipe for B-Roll transitions, pop for emphasis, etc.

---

### Phase 6: Edit Style Presets (The "Pick a Style" Experience)
**Goal**: One-click style selection like captions.ai's 95+ styles — each preset configures ALL the above systems together

#### Files:
- New: `src/main/edit-styles.ts` — Style preset definitions
- New: `src/shared/edit-style-types.ts` — Shared type definitions

#### Concept:
An "edit style" is a bundle of settings for all systems:

```typescript
interface EditStylePreset {
  id: string
  name: string
  description: string
  thumbnail?: string
  
  // Caption settings
  captionAnimation: CaptionAnimation
  captionFont: string
  captionFontSize: number
  captionPrimaryColor: string
  captionHighlightColor: string
  captionEmphasisColor: string
  captionWordBoxes: boolean
  captionWordsPerLine: number
  captionBorderStyle: number
  
  // Zoom settings
  zoomMode: 'ken-burns' | 'reactive' | 'jump-cut'
  zoomIntensity: ZoomIntensity
  
  // B-Roll settings
  brollDisplayMode: 'overlay' | 'fullscreen' | 'split-top'
  brollTransition: 'cut' | 'crossfade' | 'swipe-up'
  brollFrequency: 'low' | 'medium' | 'high'  // maps to intervalSeconds
  
  // Sound design
  sfxStyle: 'minimal' | 'standard' | 'energetic'
  musicTrack: MusicTrack
  
  // Visual mood
  colorGrading?: { brightness: number; contrast: number; saturation: number }
  hookTitleStyle: HookTitleStyle
  rehookStyle: RehookStyle
  progressBarEnabled: boolean
}
```

#### Starter Presets (matching captions.ai styles):
1. **Impact** — Bold white/yellow supersized emphasis, jump-cut zoom, energetic SFX, B-Roll split-top
2. **Clarity** — Clean word boxes, subtle zoom, minimal SFX, crossfade B-Roll
3. **Velocity** — Neon colors, fast bounce-in captions, reactive zoom, heavy SFX
4. **Growth** — Sticky-note style word boxes, medium zoom, B-Roll overlay
5. **Volt** — High energy, stacked-impact captions, jump-cut zoom, bass-drop SFX
6. **Film** — Cinematic look, typewriter captions, Ken Burns zoom, minimal SFX
7. **Ember** — Warm colors, wave captions, gentle reactive zoom
8. **Rebel** — Graffiti-style bold captions, aggressive zoom, full B-Roll takeovers
9. **Neon** — Glow captions, electric colors, medium zoom, pop SFX
10. **Prime** — Professional/clean, karaoke-fill captions, subtle zoom, corporate feel

---

### Phase 7: AI Edit Orchestrator
**Goal**: Single "AI Edit" button that analyzes the transcript and auto-generates the complete edit timeline

#### Files:
- New: `src/main/ai/edit-orchestrator.ts` — The brain
- Modify: `src/renderer/src/hooks/usePipeline.ts` — Add AI edit step to pipeline

#### How it works:
1. User uploads video → transcription runs (existing)
2. User clicks "AI Edit" and picks a style preset
3. Orchestrator sends transcript + word timestamps + emphasis data to Gemini
4. Gemini returns:
   - Edit timeline (shot list with layouts, B-Roll moments, zooms)
   - Emphasis word tagging (which words to supersize/highlight)
   - SFX placement suggestions
5. Orchestrator applies the style preset settings
6. B-Roll is fetched from Pexels for identified keywords
7. Render pipeline executes the complete edit

---

## Implementation Order & Dependencies

```
Phase 1: Advanced Captions (foundation — emphasis detection feeds everything else)
    ↓
Phase 4: Reactive Zoom (uses emphasis data from Phase 1)
    ↓
Phase 2: Dynamic B-Roll (builds on emphasis + zoom concepts)
    ↓
Phase 3: Dynamic Layout Switching (builds on B-Roll + needs multi-shot render)
    ↓
Phase 5: Enhanced Sound Design (needs edit timeline from Phase 3)
    ↓
Phase 6: Edit Style Presets (bundles all of the above)
    ↓
Phase 7: AI Edit Orchestrator (orchestrates everything)
```

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Multi-shot render complexity | Start with simple concat, add transitions later |
| FFmpeg filter expression length | Test on Windows early — escaped commas are a known pain point |
| AI cost (Gemini calls) | Cache emphasis/timeline results, batch requests |
| Render time increase | Multi-shot adds re-encode passes. Use `renderConcurrency` and optimize |
| B-Roll quality | Pexels free tier has limited quality. Consider Pixabay as fallback |

## Questions for You

1. **B-Roll source priority**: Should we invest in AI-generated B-Roll (via Gemini/Imagen) or stick with stock footage (Pexels)? AI-generated would be more contextual but adds cost and latency.

2. **Caption style designer UI**: Do you want a visual caption style editor in the settings (preview how each animation looks), or just the preset dropdown?

3. **Edit timeline preview**: Before rendering, should we show a visual timeline of the planned edits (here's where B-Roll goes, here's where zooms happen) so users can tweak before committing to a render?

4. **Phase priority**: Which of these feels most impactful to start with? My recommendation is Phase 1 (captions) because it's the most visible change and feeds into everything else. But if you're more excited about the B-Roll pull-up effect or the layout switching, we can start there.

5. **Style count**: Should we ship with ~10 styles initially and add more over time, or go bigger from the start?

6. **The example videos** (`ai_edit_preview_impact_2-optimized-av1.mp4` and `ai_edit_preview_volt-optimized-av1.mp4`): I can't play video files directly, but could you describe what specific techniques you see in those that you want most? That'll help me prioritize the exact effects.
