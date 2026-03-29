# Critical Research Findings for Task Prompts

## ASS Subtitle Animation Techniques (from GitHub research)

### Per-word size/color in single dialogue line
```ass
{\fs60\1c&H00FFFFFF&}normal {\fs84\1c&H0000FF00&\b1}emphasis {\fs132\1c&H000000FF&\b1}SUPERSIZE
```

### Bounce/pop animation
- Use `\fscx130\fscy130\t(\fscx100\fscy100)` with staggered timing per word
- Inline override tags between text segments within one Dialogue line
- `\t(start_ms, end_ms, accel, \tag)` — accel<1=ease-out, >1=ease-in

### Cascade/wave reveal 
- Per-character Dialogue lines with staggered `\t(offset, offset+200, \fscx100\fscy100)` 
- Or inline per-syllable: `{\blur1\fscy0\t(0,115,\fscy120)}ko{\blur1\fscy0\t(230,355,\fscy120)}ko`

### Typewriter effect
- Per-syllable timed transforms: `{\frx85\t(360,490,\frx0)}` for flip-reveal
- Or per-char alpha: start `\alpha&HFF&`, then `\t(offset, offset+dur, \alpha&H00&)`

### Word background boxes
- `borderStyle=3` (opaque box mode) — `\3c` becomes box fill, `\bord` controls padding
- Per-word: `{\bord12\3c&H0080FF80&}word1 {\bord12\3c&H00FF8080&}word2`

### Stacked layout (big word + small context)
- Requires separate Dialogue lines with `\pos(x,y)` and `\an` alignment
- Only ONE `\pos()` per Dialogue line — can't reposition mid-line
- `\an8` = top-center, `\an2` = bottom-center

### Key ASS constraints
1. Only ONE `\pos()` or `\move()` per Dialogue line
2. `\t()` can appear multiple times with different time ranges
3. `\t()` supports accel parameter for easing
4. Inline `{\fs60}big{\fs30}small` works for size/color but NOT position
5. Word-by-word positioning needs separate Dialogue lines
6. Layers (Dialogue: N,...) control z-order

## FFmpeg Filter Techniques

### Split-screen B-Roll
- Use `split=2[s1][s2]` to fork one stream
- Crop each: `[s1]crop=720:TOP_H:(iw-720)/2:0[top]`
- Stack: `[top][bottom]vstack=inputs=2[out]`

### B-Roll transitions with enable expressions
- `enable='between(t,start,end)'` for time-windowed overlays
- Alpha fade: `format=yuva420p,fade=t=in:st=S:d=D:alpha=1,fade=t=out:st=S:d=D:alpha=1`
- Slide animation: `overlay=x=0:y='if(lt(t-ST,TD),(1-(t-ST)/TD)*1920,0)'`

### PiP (Picture-in-Picture)
- Scale PiP: `[1]scale=iw/4:ih/4[pip]`
- Position: `[0][pip]overlay=main_w-overlay_w-10:main_h-overlay_h-10`
- With alpha fade + enable

### xfade transitions
- Core: `[0:v][1:v]xfade=transition=fade:duration=2:offset=5`
- Chain: offset accumulates: `offset_n = Σ(dur[0..n]) - n * transition_dur`
- Types: fade, fadeblack, pixelize, radial, slideup, slidedown
- Audio parallel: `acrossfade=d=duration`

### Volume ducking (sidechaincompress)
- Split voice: `[0:a]asplit=2[vo][vo_sc]`
- Pre-attenuate music: `[1:a]volume=0.3[bgm]`
- Compress: `[bgm][vo_sc]sidechaincompress=threshold=0.02:ratio=8:attack=50:release=500[ducked]`
- Mix: `[vo][ducked]amix=inputs=2:duration=first[out]`

### Reactive/keyframed zoom
- Discrete jumps: nested `if(between(in_time,start,end), zoomLevel, otherZoom)`
- Piecewise: `(t>=T1)*(t<T2)*Z1 + (t>=T2)*(t<T3)*Z2 + ...`
- Current codebase uses crop filter (NOT zoompan) — much faster, comma-free expressions

### Jump-cut zoom
- Time-gated zoom: `if(between(in_time,shakeStart,shakeEnd),min(max(zoom,pzoom)+0.008,1.5),1)`
- Or crop-based with piecewise expression for instant level changes

## SFX Generation Patterns

### Best approach: numpy/programmatic synthesis (from prajwal-y/video_explainer)
```python
def generate_reveal_hit(duration=0.3):
    """Soft impact - warm low tone with gentle attack."""
    n = int(44100 * duration)
    # sine waves + envelopes + saturation
    return soft_saturate(samples, 0.2)
```

### FFmpeg lavfi is limited to basic sine/noise — not sufficient for complex SFX
- Can do: `ffmpeg -f lavfi -i "sine=frequency=440:duration=0.3" out.wav`
- Can do: `ffmpeg -f lavfi -i "anoisesrc=d=0.3:c=pink" -af "afade=t=out:st=0.15:d=0.15" out.mp3`
- Cannot easily do: whoosh, impact with reverb, rising tension

### Alternative: Use ffmpeg with multiple sine sources + mixing + filters
- Combine multiple frequencies for richer sounds
- Use bandpass, lowpass, highpass for shaping
- Use tremolo, flanger for texture
- Use afade for envelope

## Open Source Reference Projects

| Feature | Reference | Key Pattern |
|---------|-----------|-------------|
| Caption animations | `video-db/videodb-node` | `CaptionAnimation` enum with 'supersize', 'impact' |
| Per-word animation | `Augani/openreel-video` | `SubtitleWord[]` with per-word timing + animation dispatch |
| Animation factory | `designcombo/react-video-editor` | Parameterized `scaleAnim(1.4, 1)` for supersize shrink-in |
| Auto-zoom keyframes | `njraladdin/screen-demo` | `ZoomKeyframe { time, duration, zoomFactor, posX, posY }` |
| SFX orchestration | `prajwal-y/video_explainer` | `SFXCue { sound, frame, volume }` with density limits |
| SFX synthesis | `prajwal-y/video_explainer` | numpy-based programmatic audio generation |

## Current Codebase Architecture Summary

### Render Feature Lifecycle
1. `prepare()` — pre-render setup (generate ASS, calculate placements)
2. `videoFilter()` — append to crop/scale filter chain
3. `overlayPass()` — additional FFmpeg passes (burn ASS, drawtext)
4. `postProcess()` — final passes (B-Roll compositing, bumpers)

### Feature Registration Order (pipeline.ts)
filler-removal → brand-kit → sound-design → captions → hook-title → rehook → progress-bar → auto-zoom → broll

### Key Types
- `RenderClipJob` — per-clip job with all settings
- `RenderBatchOptions` — batch-level settings
- `FilterContext` — videoFilter phase context
- `OverlayContext` — overlay pass context
- `PostProcessContext` — postProcess phase context

### Current Comma-Free Expression Pattern
All FFmpeg expressions avoid commas for Windows compatibility:
- `between(t,a,b)` → `(t>=a)*(t<=b)` 
- `if(cond,a,b)` → `cond*a+(1-cond)*b`
- `min(a,b)` → `(a+b-abs(a-b))/2`
- `max(a,b)` → `(a+b+abs(a-b))/2`

### Vertical Positioning (1080×1920 canvas)
- Hook title: y=220 (top)
- Rehook: y=900 (middle)
- Captions: ~bottom 12% margin
- Progress bar: y=0 or y=1916 (edges)

### Gemini Patterns
- Model: `gemini-2.5-flash-lite` for JSON outputs, `gemini-2.5-flash` for text
- JSON mode: `responseMimeType: 'application/json'`
- Retry: 1 retry on 429/network after 2s
- Usage tracking: `emitUsageFromResponse(source, model, response)`
