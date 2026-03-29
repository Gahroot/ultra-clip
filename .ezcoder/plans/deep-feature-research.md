# Deep Feature Research — Captions.ai-Level Editing

## COMPLETE CODEBASE UNDERSTANDING

### Current Architecture
The render pipeline uses a **composable feature system** (`src/main/render/features/feature.ts`):
- `RenderFeature` interface with 4 lifecycle phases: `prepare()` → `videoFilter()` → `overlayPass()` → `postProcess()`
- Features are registered in `src/main/render/pipeline.ts` in this order: filler-removal, brand-kit, sound-design, captions, hook-title, rehook, progress-bar, auto-zoom, broll
- `pipeline.ts` orchestrates: probe metadata → prepare all features → build base video filter (crop+scale) → append feature videoFilters → collect overlay passes → renderClip() → post-process

### Current Files & Their State

**`src/main/captions.ts`** — ASS subtitle generator
- `CaptionStyleInput`: fontName, fontSize (fraction), primaryColor, highlightColor, outlineColor, backColor, outline, shadow, borderStyle, wordsPerLine, animation
- `CaptionAnimation` type: `'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow'` (in `src/shared/types.ts`)
- `WordInput`: { text, start, end } — 0-based clip-relative
- `groupWords()` — splits into chunks of `wordsPerLine`
- `buildASSDocument()` — generates full ASS with header + style + dialogue lines
- 4 animation builders: `buildKaraokeLine()`, `buildWordPopLines()`, `buildFadeInLines()`, `buildGlowLines()`
- ALL animations use a SINGLE style definition with uniform font size, color, outline for all words
- Word-pop uses `\t` timed transforms for scale+alpha, glow uses `\3c` border color switching
- ASS features already used: `\kf`, `\t()`, `\alpha`, `\fscx`, `\fscy`, `\1c`, `\3c`, `\bord`
- Canvas: 1080×1920, bottom-center aligned (AN2), marginV ~12% from bottom
- Feature wrapper: `src/main/render/features/captions.feature.ts` — prepare generates ASS, overlayPass burns it in

**`src/main/auto-zoom.ts`** — Ken Burns zoom
- `ZoomSettings`: { enabled, intensity ('subtle'|'medium'|'dynamic'), intervalSeconds }
- `ZoomIntensity`: subtle=±5%, medium=±9%, dynamic=±13%
- Uses `crop` filter with continuous cosine expressions (NOT zoompan — much faster)
- Expression: `z(t) = 1 + A × (0.5 + 0.5 × cos(2π t / T))` — smooth oscillation
- Optional horizontal pan drift for medium/dynamic
- Comma-free expressions for Windows compatibility (uses abs-based min/max)
- Feature wrapper: `src/main/render/features/auto-zoom.feature.ts` — contributes to videoFilter phase

**`src/main/sound-design.ts`** — SFX + music placement
- `SFXType`: 'whoosh-soft' | 'whoosh-hard' | 'impact-low' | 'impact-high' | 'rise-tension' | 'notification-pop'
- `SoundPlacementData`: { type, filePath, startTime, duration, volume }
- `SoundDesignOptions`: { enabled, backgroundMusicTrack, sfxVolume, musicVolume }
- `POWER_WORDS` set — 70+ words that trigger emphasis SFX
- `generateSoundPlacements()`: 3 placement strategies:
  1. Background music for full clip duration
  2. Impact SFX on power words (alternating low/high, min 4s gap)
  3. Whoosh SFX at speech pauses (>0.4s gap, max 1 per 8s)
- Feature wrapper: `src/main/render/features/sound-design.feature.ts` — builds filter_complex with amix

**`src/main/broll-placement.ts`** — B-Roll timing
- `BRollPlacement`: { startTime, duration, videoPath, keyword }
- `BRollSettings`: { enabled, pexelsApiKey, intervalSeconds, clipDuration }
- Interval-based placement: targets one B-Roll every N seconds, picks nearest keyword
- Hook protection: no B-Roll in first 3 seconds
- Min 3s gap between B-Roll clips, min 1.5s duration
- `buildBRollPlacements()` and `buildSimpleBRollPlacements()` (fallback)

**`src/main/broll-keywords.ts`** — AI keyword extraction
- Gemini-powered: sends timestamped transcript, asks for 3-8 concrete visual keywords
- Fallback: matches against `VISUAL_NOUNS` set, or uses longest word per 5s chunk
- Returns `KeywordAtTimestamp[]`: { keyword, timestamp }

**`src/main/broll-pexels.ts`** — Stock footage download
- Pexels API search, prefers portrait/HD quality
- Download + cache to temp dir (MD5-keyed, 7-day TTL, 500MB cap)
- `fetchBRollClips()`: parallel download (max 4 concurrent)

**`src/main/render/features/broll.feature.ts`** — B-Roll render
- **Post-process phase only** — runs AFTER all overlays are burned in
- Builds ONE filter_complex: each B-Roll input is trimmed, PTS-shifted, scaled to 1080×1920, cropped, alpha-faded, overlaid
- Current mode: FULL-SCREEN overlay only — B-Roll completely covers speaker during its window
- 0.3s alpha fade in/out transitions
- Software encoder only for reliability

**`src/main/hook-title.ts`** — Hook title overlay
- 3 styles: 'centered-bold', 'top-bar', 'slide-in'
- Uses FFmpeg `drawtext` filter with time-based alpha expressions
- Positioned at y=220 (top safe zone)
- Comma-free expressions for Windows compatibility
- `escapeDrawtext()` utility for safe text in FFmpeg

**`src/main/overlays/rehook.ts`** — Mid-clip re-hook
- 3 styles: 'bar', 'text-only', 'slide-up'
- Uses `drawtext` with timed alpha/position expressions
- Positioned at y=900 (middle of frame)
- `identifyRehookPoint()` — finds optimal insertion point (rhetorical questions, pivot words, pauses)
- AI-generated text via Gemini, fallback phrases

**`src/main/layouts/split-screen.ts`** — Static split-screen
- 4 layouts but ONLY used for explicit split-screen scenarios, NOT for dynamic B-Roll

**`src/main/layouts/blur-background.ts`** — Blur fill
- For non-9:16 sources: split→scale→blur→overlay centered foreground

**`src/shared/types.ts`** — Shared types
- `CaptionAnimation = 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow'`
- `MusicTrack = 'ambient-tech' | 'ambient-motivational' | 'ambient-chill'`
- `ZoomIntensity = 'subtle' | 'medium' | 'dynamic'`
- `HookTitleStyle = 'centered-bold' | 'top-bar' | 'slide-in'`
- `RehookStyle = 'bar' | 'text-only' | 'slide-up'`

**`src/main/render/types.ts`** — Render job types
- `RenderClipJob`: the big job object per clip — has sourceVideoPath, startTime, endTime, cropRegion, assFilePath, wordTimestamps, soundPlacements, brandKit, hookTitleText/Config, rehookText/Config, progressBarConfig, brollPlacements, clipOverrides, etc.
- `RenderBatchOptions`: batch-level settings — jobs[], outputDirectory, soundDesign, autoZoom, brandKit, hookTitleOverlay, rehookOverlay, progressBarOverlay, fillerRemoval, captionStyle, captionsEnabled, etc.

**`src/main/render/overlay-runner.ts`** — Multi-pass FFmpeg executor
- `applyFilterPass()` — single -vf pass
- `applyFilterComplexPass()` — single filter_complex pass
- `runOverlayPasses()` — sequential pass execution with temp file management

**`src/main/render/base-render.ts`** — Core FFmpeg encode
- 3 paths: sound-design (filter_complex), logo-only (filter_complex), simple (-vf)
- Handles bumper concat, overlay steps, GPU/software fallback

---

## FEATURE-BY-FEATURE DEEP SPECIFICATION

### FEATURE 1: Advanced Caption System

**Current state**: 4 animations, single color/size for all words, no emphasis detection

**End goal**: Match captions.ai's word emphasis, supersizing, multi-color, background boxes, and 5+ new animation types

#### 1A: Word Emphasis Detection (new file: `src/main/caption-emphasis.ts`)

**What it does**: Before generating captions, analyze the transcript to tag each word as `normal`, `emphasis`, or `supersize`. This data feeds into captions AND zoom AND sound design.

**AI approach**: Send word-timestamped transcript to Gemini with a prompt like:
```
You are a viral video editor. Tag each word in this transcript for visual emphasis.

Rules:
- Tag 15-25% of words as "emphasis" (important concepts, action verbs, numbers, emotional words)
- Tag 3-8% of words as "supersize" (the MOST impactful word in each sentence — the one viewers should remember)
- Everything else is "normal"
- Never supersize consecutive words
- Numbers and dollar amounts are always at least "emphasis"
- The first 2-3 words of the clip should be "normal" (let the hook title handle the opening)

Return JSON array matching the input word count: ["normal","emphasis","normal","supersize",...]
```

**Heuristic fallback** (when no API key):
- Use existing `POWER_WORDS` from `sound-design.ts` → `emphasis`
- ALL-CAPS words in transcript → `emphasis`
- Numbers / dollar amounts → `emphasis`
- Every 8th-12th word (the most significant noun/verb in each phrase) → `supersize` (use word length as proxy for significance)

**Type additions** to `WordInput` in `src/main/captions.ts`:
```typescript
interface WordInput {
  text: string
  start: number
  end: number
  emphasis?: 'normal' | 'emphasis' | 'supersize'  // NEW
}
```

**New shared type** in `src/shared/types.ts`:
```typescript
type WordEmphasisLevel = 'normal' | 'emphasis' | 'supersize'
```

#### 1B: Multi-Color & Multi-Size Word Rendering

**What it does**: Instead of all words being the same size/color, emphasis words are bigger+colored and supersize words are HUGE+different-colored.

**ASS implementation**:
- Normal words: `primaryColor`, `fontSize`
- Emphasis words: `highlightColor`, `fontSize * 1.4`, bold override
- Supersize words: new `emphasisColor` field, `fontSize * 2.2`, bold, potentially uppercase

**Per-word override blocks in ASS**:
```ass
{\\fs60\\1c&H00FFFFFF&}normal word {\\fs84\\1c&H0000FF00&\\b1}emphasis {\\fs132\\1c&H000000FF&\\b1}SUPERSIZE {\\fs60\\1c&H00FFFFFF&\\b0}normal word
```

**New field on `CaptionStyleInput`**:
```typescript
emphasisColor: string  // hex color for supersize words (e.g. '#FFD700' gold)
```

#### 1C: Word-Level Background Boxes

**What it does**: Each word gets its own colored rounded-rect background (like sticky notes in captions.ai's "Clarity" style).

**ASS implementation**: Use `borderStyle=3` (opaque box mode) on per-word override blocks. The `\3c` (outline color) becomes the box fill color, and `\4c` (shadow/back color) can add a shadow.

Per-word override:
```ass
{\\bord12\\3c&H0080FF80&\\shad2}word1 {\\bord12\\3c&H00FF8080&\\shad2}word2
```

**New field on `CaptionStyleInput`**:
```typescript
wordBoxes: boolean  // when true, each word gets its own background box
wordBoxColor?: string  // box fill color (defaults to highlightColor with alpha)
```

#### 1D: New Caption Animations (5 new types)

Each animation gets its own `buildXxxLines()` function in `src/main/captions.ts`:

**`bounce-in`**: Words appear one at a time with an elastic overshoot animation.
- Each word starts invisible (`\alpha&HFF&`) and at 130% scale (`\fscx130\fscy130`)
- At its timestamp: fades in (`\alpha&H00&`) + scales to 110% then settles to 100%
- Uses `\t(start,start+80ms, ...)` for the overshoot and `\t(start+80ms,start+150ms, ...)` for settle
- Emphasis/supersize words get larger initial overshoot (150%/180%)

**`typewriter`**: Characters appear one at a time left-to-right within each word group.
- All characters start transparent
- Each character gets its own timed `\t` block to become visible
- Character timing = word duration / character count
- Creates a typing effect like a subtitle machine

**`emphasis-pop`**: The signature captions.ai animation — normal words fade in, emphasis words POP at larger size then settle, supersize words render at 200%+ size permanently.
- Normal words: simple fade-in (like current fade-in animation)
- Emphasis words: start transparent → snap to visible at 140% scale → settle to 120% over 100ms
- Supersize words: start transparent → snap visible at 220% scale → hold at 200% → different color
- Uses the emphasis data from Feature 1A
- This is the MOST IMPORTANT new animation — it's what makes captions.ai captions distinctive

**`stacked-impact`**: Two-line layout where context text is small on top and the KEY word is HUGE below.
- For each word group, identify the supersize/emphasis word
- Line 1 (top): all words except the key word, small font (60% of base size), positioned slightly above center
- Line 2 (bottom): just the key word, HUGE font (250% of base size), bold, colored
- Uses ASS `\an8` (top-center) for line 1 and `\an2` (bottom-center) for line 2, or manual `\pos()` overrides
- If no supersize word in the group, pick the last word or longest word
- This is the "Impact II" and "Velocity" style from captions.ai screenshots

**`wave`**: Words animate in with a cascading wave motion.
- Each word starts 30px below final position + transparent
- Staggered timing: word N starts 60ms after word N-1
- Smooth ease-up + fade-in simultaneously
- Uses `\move()` or `\t` with `\pos` for Y-offset animation
- Gentle bobbing effect after arrival (optional)

**Update `CaptionAnimation` in `src/shared/types.ts`**:
```typescript
type CaptionAnimation = 
  | 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow'
  | 'bounce-in' | 'typewriter' | 'emphasis-pop' | 'stacked-impact' | 'wave'
```

---

### FEATURE 2: Dynamic B-Roll System

**Current state**: Interval-based full-screen overlay with alpha fade, single display mode

**End goal**: AI-driven placement with 4 display modes (overlay, fullscreen, split-top, split-bottom), smooth transitions, and contextual timing

#### 2A: B-Roll Display Modes

**New fields on `BRollPlacement`** (in `src/main/broll-placement.ts`):
```typescript
interface BRollPlacement {
  startTime: number
  duration: number
  videoPath: string
  keyword: string
  // NEW FIELDS:
  displayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
  transitionIn: 'cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  transitionOut: 'cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  transitionDuration: number  // seconds (0.2-0.5)
}
```

**Display modes explained**:
- `fullscreen`: B-Roll completely replaces speaker (current behavior, but with better transitions). Speaker audio continues playing. B-Roll scaled/cropped to fill 1080×1920.
- `split-top`: Speaker shrinks to bottom 35% of frame (roughly 672px tall, positioned at y=1248). B-Roll fills top 65% (1248px tall). This is the "pull-up" effect. A 4px dark divider line separates them.
- `split-bottom`: Inverse — speaker stays on top 65%, B-Roll fills bottom 35%. Less common but useful for topic illustration.
- `pip` (picture-in-picture): B-Roll fills full screen, speaker appears in a small rounded-rect window (300×533px) in the bottom-right corner with a border/shadow.

**Transition effects in FFmpeg**:
- `cut`: Instant switch (no transition filter needed)
- `crossfade`: Alpha blend over transitionDuration seconds. For B-Roll in: ramp B-Roll alpha from 0→1. For B-Roll out: ramp from 1→0. Use `fade=t=in/out:alpha=1` on the B-Roll stream.
- `swipe-up`: B-Roll slides up from below the frame. Animate B-Roll y-position from 1920→0 over transitionDuration. Use `overlay` with animated y expression: `y='if(lt(t-ST,TD),(1-(t-ST)/TD)*1920,0)'` where ST=start time, TD=transition duration.
- `swipe-down`: Speaker slides down, B-Roll appears from top. Similar animation.

#### 2B: Split-Screen B-Roll FFmpeg Filter (new file: `src/main/broll-transitions.ts`)

The split-top implementation needs a filter_complex that:
1. Scales B-Roll to fill 1080×1248 (top 65%)
2. Scales speaker to fill 1080×672 (bottom 35%)
3. Stacks them vertically: `[broll_scaled][speaker_scaled]vstack`
4. During transition: interpolate between full-speaker and split layout

**Key technical challenge**: The speaker needs to be dynamically repositioned/scaled mid-clip. This requires time-dependent filter expressions:
- Before B-Roll: speaker at full 1080×1920
- During transition in: speaker smoothly scales down and moves to bottom
- During B-Roll: speaker at 1080×672 in bottom, B-Roll at 1080×1248 on top
- During transition out: speaker smoothly scales back up to full frame

**Implementation approach** (most reliable): 
- Render each "shot" (pre-broll, during-broll, post-broll) as separate segments with different filter chains
- Concatenate segments with `xfade` filter for transitions
- Or: use overlay with time-dependent scaling expressions (more complex but single-pass)

**Recommended approach**: Modify `broll.feature.ts` postProcess to handle the new display modes. For `split-top`/`split-bottom`, build a filter_complex that:
1. Splits the main video: `[0:v]split=2[main1][main2]`
2. For the speaker bottom: `[main1]crop=iw:672:0:1248,scale=1080:672[speaker_small]`
3. For the B-Roll top: `[1:v]trim=...,scale=1080:1248:force_original_aspect_ratio=increase,crop=1080:1248[broll_top]`
4. Stack: `[broll_top][speaker_small]vstack[split_frame]`
5. Overlay split_frame onto main video during the B-Roll time window using enable expressions

#### 2C: AI-Driven B-Roll Timing

**Modify `src/main/broll-keywords.ts`** to also return placement suggestions:

Enhanced Gemini prompt:
```
You are a viral video editor analyzing transcript timing for B-Roll footage insertion.

For each B-Roll moment, provide:
1. keyword: concrete visual search term (1-3 words)
2. timestamp: when in the clip this concept appears (seconds)
3. displayMode: how to show the B-Roll:
   - "fullscreen" for dramatic reveals or topic changes
   - "split-top" for illustrations while keeping speaker visible (DEFAULT — most common)
   - "pip" for brief reference images
4. duration: how long to show it (2-5 seconds)

Rules:
- Never place B-Roll in the first 3 seconds (hook protection)
- Target 1 B-Roll every 6-10 seconds
- "split-top" is the default — use it 60-70% of the time
- "fullscreen" only for dramatic moments or topic transitions
- Prefer concrete, searchable nouns (not abstract concepts)
```

#### 2D: B-Roll Settings Update

Add to `BRollSettings`:
```typescript
interface BRollSettings {
  enabled: boolean
  pexelsApiKey: string
  intervalSeconds: number
  clipDuration: number
  // NEW:
  defaultDisplayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
  defaultTransition: 'cut' | 'crossfade' | 'swipe-up'
  transitionDuration: number  // 0.2-0.5s
  aiPlacement: boolean  // use AI for placement vs interval-based
}
```

---

### FEATURE 3: Reactive Zoom System

**Current state**: Sine-wave Ken Burns with 3 intensities, no content awareness

**End goal**: 3 zoom modes — Ken Burns (existing), reactive (emphasis-driven), jump-cut (simulated multi-cam)

#### 3A: New Zoom Modes

**Add to `ZoomSettings`** in `src/main/auto-zoom.ts`:
```typescript
interface ZoomSettings {
  enabled: boolean
  intensity: ZoomIntensity
  intervalSeconds: number
  // NEW:
  mode: 'ken-burns' | 'reactive' | 'jump-cut'
  /** Word timestamps with emphasis data — needed for reactive mode */
  emphasisKeyframes?: Array<{ time: number; level: 'emphasis' | 'supersize' }>
}
```

#### 3B: Reactive Zoom (`mode: 'reactive'`)

**Concept**: Zoom reacts to word emphasis. On emphasis words, quick punch-in zoom. On supersize words, bigger punch. Between emphasis moments, gentle breathing.

**Keyframe generation**:
1. Start at base zoom (1.0)
2. For each emphasis word at time T:
   - Ease in: T-0.1s → T: zoom from current → 1.12
   - Hold: T → T+0.15s: stay at 1.12
   - Ease out: T+0.15s → T+0.4s: zoom from 1.12 → 1.0
3. For each supersize word at time T:
   - Faster, bigger: T-0.08s → T: zoom → 1.20
   - Hold: T → T+0.2s: stay at 1.20
   - Ease out: T+0.2s → T+0.5s: zoom → 1.0
4. Between emphasis moments: gentle sine wave at 30% of normal amplitude (subtle breathing)
5. Never have two zoom events overlap — if emphasis words are close, skip the earlier zoom-out

**FFmpeg implementation**: Build a piecewise crop expression like the current Ken Burns, but with keyframed zoom levels instead of continuous cosine.

Expression structure:
```
z(t) = (t>=0)*(t<T1)*Z_BREATHING + (t>=T1)*(t<T1+0.1)*EASE_IN_TO_1.12 + (t>=T1+0.1)*(t<T1+0.25)*1.12 + (t>=T1+0.25)*(t<T1+0.65)*EASE_OUT_TO_1.0 + ...
```

**Easing function** (in FFmpeg expressions, no commas):
- Quadratic ease-in-out: use `t*t` for acceleration, `1-(1-t)*(1-t)` for deceleration
- In comma-free FFmpeg: `(progress*progress*3 - progress*progress*progress*2)` where progress is normalized 0→1 within the ease window

#### 3C: Jump-Cut Zoom (`mode: 'jump-cut'`)

**Concept**: Instant 8-15% zoom changes every 3-5 seconds. Simulates multi-camera editing. No smooth transitions — hard cuts between zoom levels.

**Implementation**:
1. Generate random zoom levels: alternate between 1.0 and 1.08-1.15
2. Cut points every 3-5 seconds (randomized, or aligned to sentence boundaries if word timestamps available)
3. FFmpeg expression: series of `(t>=T1)*(t<T2)*Z1 + (t>=T2)*(t<T3)*Z2 + ...` with NO easing
4. Each cut also slightly shifts the crop X position (±20px) to enhance the multi-cam feel
5. The key insight: jump cuts work because the viewer's brain reads each cut as a "new shot" even though it's the same camera, which resets attention

#### 3D: Integration

The emphasis keyframes needed for reactive zoom come from the caption-emphasis system (Feature 1A). The pipeline flow:
1. `caption-emphasis.ts` generates emphasis tags for each word
2. This data is stored on the `RenderClipJob` (new field `emphasisKeyframes`)
3. `auto-zoom.feature.ts` reads these keyframes during `videoFilter()` phase
4. Zoom filter is generated accordingly

---

### FEATURE 4: Enhanced Sound Design

**Current state**: Background music + power-word impacts + pause whooshes

**End goal**: Visual-sync SFX, music ducking, new SFX types, emphasis-driven placement

#### 4A: New SFX Types

Add to `SFXType` in `src/main/sound-design.ts`:
```typescript
type SFXType =
  | 'whoosh-soft' | 'whoosh-hard'
  | 'impact-low' | 'impact-high'
  | 'rise-tension' | 'notification-pop'
  // NEW:
  | 'swipe'          // for B-Roll transitions
  | 'pop'            // for word emphasis moments  
  | 'bass-drop'      // for supersize word moments
  | 'camera-shutter' // for jump-cut zoom moments
  | 'rise-short'     // 0.5s tension build before reveals
  | 'typing'         // for typewriter caption animation
```

These need actual audio files in `resources/sfx/`. Generate or source ~0.3-0.8s audio clips. Can be synthesized programmatically or downloaded from freesound.org (CC0 licensed).

#### 4B: Emphasis-Driven SFX Placement

**Modify `generateSoundPlacements()`** to accept emphasis data and edit timeline:
```typescript
function generateSoundPlacements(
  clipDuration: number,
  wordTimestamps: WordTimestampInput[],
  options: SoundDesignOptions,
  // NEW optional params:
  emphasisWords?: Array<{ time: number; level: 'emphasis' | 'supersize' }>,
  editEvents?: Array<{ time: number; type: 'broll-in' | 'broll-out' | 'zoom-cut' | 'layout-change' }>
): SoundPlacementData[]
```

**New placement strategies**:
1. **Emphasis SFX**: Replace the simple POWER_WORDS check with emphasis data from Feature 1A
   - `emphasis` words → 'pop' SFX at lower volume
   - `supersize` words → 'impact-high' or 'bass-drop' SFX at full volume
   - Minimum 3s gap between emphasis SFX (reduced from 4s for more energy)

2. **Edit event SFX**: When B-Roll transitions in → 'swipe' or 'whoosh-soft'. When B-Roll transitions out → 'whoosh-soft'. When jump-cut zoom happens → 'camera-shutter' at low volume.

3. **Rise tension**: 0.3s before a supersize word, play 'rise-short' SFX to build anticipation.

#### 4C: Music Volume Ducking

**What it does**: Background music volume drops during speech and rises during pauses/B-Roll moments. This makes speech clearer while keeping the energy from music.

**Implementation in FFmpeg**: Instead of a single flat `volume=` for the music track, generate a time-dependent volume expression:

```
volume='(between(t,0,0.5)*0.3 + between(t,0.5,3.2)*0.15 + between(t,3.2,3.8)*0.3 + ...)'
```

Actually, since we avoid commas, use the piecewise multiplication pattern:
```
volume='0.15 + 0.15*((t>=PAUSE1_START)*(t<=PAUSE1_END) + (t>=PAUSE2_START)*(t<=PAUSE2_END) + ...)'
```

Where base level is 0.15 (during speech) and it rises to 0.30 during detected pauses (>0.5s gaps in word timestamps).

**Modify `buildSoundFilterComplex()` in `src/main/render/features/sound-design.feature.ts`** to apply dynamic volume instead of flat volume.

#### 4D: SFX Style Presets

Group SFX placement behavior into presets:
```typescript
type SFXStyle = 'minimal' | 'standard' | 'energetic'
```
- `minimal`: Only 1-2 impact SFX per clip, quiet whooshes, no emphasis pops
- `standard`: Current behavior + emphasis-driven placement
- `energetic`: Maximum SFX density — pops on every emphasis word, impacts on supersize, whooshes on every edit event, rise-tension on reveals

---

### FEATURE 5: Edit Style Presets

**Current state**: Each feature configured individually in SettingsPanel

**End goal**: One-click style selection that configures ALL features as a coherent bundle

#### 5A: Edit Style Type (new file: `src/shared/edit-style-types.ts`)

```typescript
interface EditStylePreset {
  id: string
  name: string
  description: string
  category: 'bold' | 'clean' | 'cinematic' | 'energetic' | 'professional'
  
  // Caption config
  caption: {
    animation: CaptionAnimation
    fontName: string
    fontSize: number  // fraction of frame height
    primaryColor: string
    highlightColor: string
    emphasisColor: string
    outlineColor: string
    backColor: string
    outline: number
    shadow: number
    borderStyle: number  // 1 or 3
    wordsPerLine: number
    wordBoxes: boolean
    wordBoxColor?: string
  }
  
  // Zoom config
  zoom: {
    mode: 'ken-burns' | 'reactive' | 'jump-cut'
    intensity: ZoomIntensity
    intervalSeconds: number
  }
  
  // B-Roll config
  broll: {
    defaultDisplayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
    defaultTransition: 'cut' | 'crossfade' | 'swipe-up'
    transitionDuration: number
    intervalSeconds: number
  }
  
  // Sound config
  sound: {
    sfxStyle: 'minimal' | 'standard' | 'energetic'
    musicTrack: MusicTrack
    musicVolume: number
    sfxVolume: number
    duckingEnabled: boolean
  }
  
  // Overlay config
  hookTitle: { style: HookTitleStyle; fontSize: number }
  rehook: { style: RehookStyle }
  progressBar: { enabled: boolean; style: ProgressBarStyle }
}
```

#### 5B: Starter Presets (new file: `src/main/edit-styles.ts`)

10 presets inspired by captions.ai styles:

1. **Impact** — Bold white text, yellow supersize words, `emphasis-pop` animation, `jump-cut` zoom, B-Roll `split-top`, `energetic` SFX
2. **Clarity** — Clean look, word boxes (sticky notes), `fade-in` animation, `ken-burns` subtle zoom, B-Roll `split-top` crossfade, `minimal` SFX
3. **Velocity** — Neon cyan/magenta, `bounce-in` animation, `reactive` dynamic zoom, B-Roll `fullscreen` swipe, `energetic` SFX
4. **Growth** — Warm yellows/greens, word boxes, `word-pop` animation, `ken-burns` medium zoom, B-Roll `split-top`, `standard` SFX
5. **Volt** — High-contrast black/electric yellow, `stacked-impact` animation, `jump-cut` dynamic zoom, B-Roll `fullscreen` cut, `energetic` SFX
6. **Film** — Serif font, warm tones, `typewriter` animation, `ken-burns` subtle zoom, B-Roll `crossfade`, `minimal` SFX
7. **Ember** — Warm orange/red palette, `wave` animation, `reactive` medium zoom, B-Roll `split-top`, `standard` SFX
8. **Rebel** — Bold graffiti look, all-caps, `emphasis-pop` animation, `jump-cut` dynamic zoom, B-Roll `fullscreen` swipe, `energetic` SFX
9. **Neon** — Glow effect, electric blue/purple, `glow` animation, `reactive` medium zoom, B-Roll `pip`, `standard` SFX
10. **Prime** — Corporate/clean, `karaoke-fill` animation, `ken-burns` subtle zoom, B-Roll `split-top` crossfade, `minimal` SFX

#### 5C: UI Integration

Add an "Edit Style" dropdown/grid in SettingsPanel. When a style is selected:
1. All individual feature settings are populated from the preset
2. User can still override any individual setting after selecting a preset
3. Show a visual preview/thumbnail for each style

---

### FEATURE 6: AI Edit Orchestrator

**Current state**: User manually configures each feature, then renders

**End goal**: Single "AI Edit" that analyzes transcript and auto-generates optimal edit decisions

#### 6A: Orchestrator (new file: `src/main/ai/edit-orchestrator.ts`)

**What it does**: Takes transcript + word timestamps + selected style preset → produces a complete edit plan:
- Word emphasis tags (feeds captions + zoom + SFX)
- B-Roll placement with display modes
- SFX placement 
- All derived from a single Gemini call (or 2 batched calls)

**Single Gemini prompt approach**:
```
You are a professional short-form video editor. Given this transcript with word timestamps, produce a complete AI edit plan.

Style: [PRESET_NAME] - [PRESET_DESCRIPTION]

Produce:
1. EMPHASIS: Tag every word as "n" (normal), "e" (emphasis), or "s" (supersize)
2. BROLL: Suggest B-Roll moments with keyword, timestamp, displayMode, duration
3. SFX: Suggest sound effect placements beyond the automatic ones

Return JSON:
{
  "emphasis": ["n","n","e","n","s",...],
  "broll": [{"keyword":"laptop","time":4.2,"mode":"split-top","duration":3},...],
  "sfx": [{"type":"rise-short","time":8.1},...]
}
```

#### 6B: Pipeline Integration

Add a new IPC channel: `ai:generateEditPlan`

In `usePipeline.ts`, add an optional step between transcription/scoring and rendering:
1. User selects "AI Edit" mode + picks a style
2. Pipeline calls `ai:generateEditPlan` with transcript + style
3. Result populates all the enhanced fields on the render jobs
4. Render proceeds with all the advanced features configured

#### 6C: Edit Plan Caching

Cache the AI edit plan per clip (keyed by transcript hash + style ID). If the user re-renders with the same transcript and style, reuse the cached plan without another API call.

---

### FEATURE 7: Integration & Wiring

All the above features need to be wired together through the existing render pipeline:

#### 7A: New Fields on RenderClipJob

```typescript
interface RenderClipJob {
  // ...existing fields...
  
  // NEW: Word emphasis data (from AI or heuristic)
  wordEmphasis?: WordEmphasisLevel[]  // parallel array to wordTimestamps
  
  // NEW: Enhanced B-Roll placements (with display mode + transitions)
  // Note: brollPlacements already exists, just the BRollPlacement type gets new fields
  
  // NEW: Edit style preset ID (for logging/manifest)
  editStyleId?: string
  
  // NEW: Emphasis keyframes for reactive zoom
  emphasisKeyframes?: Array<{ time: number; level: 'emphasis' | 'supersize' }>
  
  // NEW: Edit events for sound design sync
  editEvents?: Array<{ time: number; type: 'broll-in' | 'broll-out' | 'zoom-cut' }>
}
```

#### 7B: Feature Prepare Phase Changes

1. **Caption emphasis feature** (new): In prepare(), generate emphasis data from AI/heuristic and attach to job
2. **Captions feature**: In prepare(), read `wordEmphasis` from job and pass to `generateCaptions()`
3. **Auto-zoom feature**: In prepare(), read `emphasisKeyframes` from job for reactive mode
4. **Sound design feature**: In prepare(), read emphasis data + edit events for enhanced SFX placement
5. **B-Roll feature**: In postProcess(), use new display modes and transitions

#### 7C: Render Pipeline Registration

Add new features to the pipeline in `src/main/render/pipeline.ts`:
```typescript
const features: RenderFeature[] = [
  createFillerRemovalFeature(),
  createCaptionEmphasisFeature(),  // NEW — must run before captions & zoom
  brandKitFeature,
  soundDesignFeature,  // enhanced with emphasis + edit events
  createCaptionsFeature(),  // enhanced with emphasis data
  createHookTitleFeature(),
  createRehookFeature(),
  progressBarFeature,
  autoZoomFeature,  // enhanced with reactive + jump-cut modes
  brollFeature  // enhanced with display modes + transitions
]
```

---

## IMPLEMENTATION ORDER (DEPENDENCY CHAIN)

1. **Caption Emphasis Detection** (Feature 1A) — foundation that everything else reads
2. **Advanced Captions** (Features 1B, 1C, 1D) — uses emphasis data, most visible improvement
3. **Reactive Zoom** (Feature 3) — uses emphasis keyframes from step 1
4. **Enhanced B-Roll** (Feature 2) — new display modes, transitions, AI placement
5. **Enhanced Sound Design** (Feature 4) — uses emphasis + edit events from steps 1-4
6. **Edit Style Presets** (Feature 5) — bundles all the above into one-click styles
7. **AI Edit Orchestrator** (Feature 6) — single Gemini call produces complete edit plan
8. **Integration & Wiring** (Feature 7) — connect everything through the pipeline

Each step builds on the previous, but each can also ship independently with degraded fallback behavior.

---

## RESOURCES NEEDED

### New Audio Files (resources/sfx/)
- `swipe.mp3` — 0.3s swipe/slide sound
- `pop.mp3` — 0.2s light pop
- `bass-drop.mp3` — 0.4s bass impact
- `camera-shutter.mp3` — 0.2s shutter click
- `rise-short.mp3` — 0.5s rising tension
- `typing.mp3` — 0.3s typewriter key sound

### New Font Options (resources/fonts/)
- Consider bundling 2-3 additional fonts for style variety:
  - A bold impact font (for Impact/Rebel styles)
  - A clean sans-serif (for Clarity/Prime styles)
  - A serif font (for Film style)

### Gemini API Usage
- Caption emphasis: ~200 tokens input, ~100 tokens output per clip
- Edit orchestrator: ~500 tokens input, ~300 tokens output per clip
- B-Roll keywords (existing): ~300 tokens per clip
- Total additional cost per clip: ~$0.001-0.003 at Gemini Flash pricing
