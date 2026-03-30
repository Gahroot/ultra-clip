# Audit: Captions, Overlays & Layouts vs Segment-Based Editing

**Context**: New Captions.ai-style editing where each clip → 4–7 `VideoSegment`s, each with its own layout/zoom/caption style, rendered independently then concatenated.

Existing infra: `src/main/segments.ts` already splits clips into segments with `splitIntoSegments()`. `src/main/segment-styles.ts` defines 12 `SegmentStyleVariant`s across 5 categories. The `VideoSegment` type already carries per-segment `words`, `segmentStyleId`, `zoomKeyframes`, `transitionIn/Out`, and `captionText`.

---

## 1. `src/main/captions.ts` — ASS Subtitle Generation

### What it does

Generates ASS subtitle files with word-level animated captions. 1339 lines covering 10 animation types.

**Exported functions:**
- `generateCaptions(words: WordInput[], style: CaptionStyleInput, outputPath?: string, frameWidth?: number, frameHeight?: number, marginVOverride?: number, shotOverrides?: ShotCaptionOverride[], backgroundOpacity?: number): Promise<string>` — Main entry. Writes ASS file, returns path.

**Exported types:**
- `CaptionStyleInput` — Full style config (font, colors, animation, emphasis scales, box styling)
- `WordInput` — `{ text, start, end, emphasis? }` — times relative to clip start
- `ShotCaptionOverride` — `{ startTime, endTime, style: CaptionStyleInput }` — per-time-range style
- `CaptionAnimation` — re-exported from `@shared/types`

**Internal key functions:**
- `buildASSDocument()` — Core ASS builder, uses `groupWords()` → per-animation builders
- `buildDialogueLinesForGroup()` — Dispatches to 10 animation builders (karaoke-fill, word-pop, fade-in, glow, word-box, elastic-bounce, typewriter, impact-two, cascade, captions-ai)
- `groupWords(words, wordsPerLine)` — Sequential chunking by `wordsPerLine`

### Analysis for segment-based editing

**Q: Does it generate one ASS file per entire clip?**
Yes. `generateCaptions()` produces a single ASS file from all provided words.

**Q: Can it generate per-segment ASS files (subset of words)?**
**Yes, trivially.** Just pass the segment's subset of `WordInput[]` (already available as `VideoSegment.words`). The function doesn't assume anything about the word set — it just groups and renders whatever words it receives. Word timestamps are expected to be clip-relative (starting near 0), so for per-segment use, you'd need to shift segment words to be segment-relative (subtract `segment.startTime`).

**Q: Word-level timing — compatible with segment splitting?**
**Fully compatible.** All timing is relative to the word array's own timestamps. The `WordInput.start/end` values are used directly in ASS dialogue lines. No assumption that words span an entire clip.

**Q: Caption styling — flexible enough for different styles per segment?**
**Yes.** `CaptionStyleInput` is a complete standalone style config. Each segment can use a different style (different animation, colors, font size, etc.) by calling `generateCaptions()` once per segment with different style params.

**Bonus:** The existing `ShotCaptionOverride` mechanism already supports per-time-range style switching within a single ASS file. This was built for "shot styles" but is conceptually close to segments. However, for true segment rendering (each segment rendered as independent video then concatenated), per-segment ASS files are cleaner and simpler.

### Conflicts
- **None significant.** The module is a pure function (words + style → ASS file). No global state.
- **Time offset requirement:** Segment words must be rebased to `t=0` (subtract `segment.startTime` from each word's start/end). This is a trivial caller-side transformation.
- **Frame dimensions:** Already parameterized (`frameWidth`, `frameHeight`), no conflict.

### Reusable?
**Fully reusable.** Call `generateCaptions()` once per segment with:
1. Segment's word subset, rebased to `t=0`
2. Segment-specific `CaptionStyleInput`
3. Segment-specific `marginVOverride` (if caption position varies per segment style)

### Action: **Leave alone** — use as-is for per-segment caption generation. Wrapper function in segment renderer calls it N times.

---

## 2. `src/main/hook-title.ts` — Hook Title Overlay

### What it does

Builds FFmpeg `drawtext` filter strings for a text overlay shown in the first few seconds of a clip. Supports 3 visual styles: `centered-bold`, `top-bar`, `slide-in`.

**Exported functions:**
- `buildHookTitleFilter(text: string, config: HookTitleConfig, fontFilePath: string | null): string` — Returns FFmpeg `-vf` filter string
- `resolveHookFont(): Promise<string | null>` — Finds a TTF/OTF font file
- `escapeDrawtext(text: string): string` — Escapes text for FFmpeg drawtext
- `escapeFilterExpr(expr: string): string` — Escapes commas in filter expressions (deprecated)

**Note:** The render pipeline actually uses `src/main/render/features/hook-title.feature.ts` which generates its own ASS file (`generateHookTitleASSFile()`), NOT the drawtext filter from `hook-title.ts`. The feature generates a self-contained ASS subtitle with `\fad()` for timing, appears from `t=0` to `t=displayDuration`.

**Exported types:**
- `HookTitleConfig` — `{ enabled, style, displayDuration, fadeIn, fadeOut, fontSize, textColor, outlineColor, outlineWidth }`

### Analysis for segment-based editing

**Q: Will it conflict with per-segment rendering?**
**No conflict** — but needs a design decision. The hook title is a clip-level concept (appears once at the start of the whole clip). If segments are rendered independently and concatenated:
- It should be applied **only to the first segment** (or as a post-concatenation overlay)
- The feature currently generates an ASS with `start=0:00:00.00`, which works correctly if applied only to segment 0

**Q: Should it be applied globally or per-segment?**
**Per-clip (first segment only), or post-concatenation.** Applying it post-concatenation is simpler because the hook title timing is clip-relative.

### Conflicts
- **Timing assumption:** Currently assumes `t=0` = clip start. In per-segment rendering, `t=0` = segment start. If applied to segment 0, this works correctly (segment 0 starts at the clip's start).
- **No conflict** if applied as a post-concat overlay pass on the final stitched clip.

### Reusable?
**Reusable as-is** for post-concatenation application. For per-segment application, only apply to segment index 0.

### Action: **Leave alone** — apply as post-concat overlay or conditionally to segment 0 only.

---

## 3. `src/main/overlays/rehook.ts` — Re-hook Overlay

### What it does

Mid-clip "pattern interrupt" text overlay. Appears at ~40–60% through a clip to reset viewer attention.

**Exported functions:**
- `identifyRehookPoint(words, clipStart, clipEnd, positionFraction?): number` — Finds optimal insertion timestamp using pivot words, pauses, rhetorical questions
- `generateRehookText(apiKey, transcript, clipStart, clipEnd, videoSummary?, keyTopics?): Promise<string>` — AI-generates contextual re-hook text via Gemini
- `getDefaultRehookPhrase(seed: string): string` — Deterministic fallback phrase
- `buildRehookFilter(text, config, visuals, appearTime, fontFilePath, safeZone?): string` — FFmpeg drawtext filter (NOTE: render pipeline uses `rehook.feature.ts` ASS approach instead)
- `resolveRehookFont` — re-export of `resolveHookFont`

**Note:** The actual render pipeline (`src/main/render/features/rehook.feature.ts`) generates an ASS file with `start=appearTime`, `end=appearTime+displayDuration`. The `appearTime` is set to `hookDuration` (right after hook title ends).

**Exported types:**
- `RehookConfig` — `{ enabled, style, displayDuration, fadeIn, fadeOut, positionFraction }`
- `OverlayVisualSettings` — `{ fontSize, textColor, outlineColor, outlineWidth }`

### Analysis for segment-based editing

**Q: Will it conflict with per-segment rendering?**
**Yes — moderate conflict.** The rehook overlay is positioned by absolute clip time (`appearTime` = hookDuration, typically ~2.5s). In per-segment rendering:
- The rehook might land in segment 1 or 2 depending on segment boundaries
- Need to determine which segment contains the rehook timestamp
- Apply the rehook ASS to that specific segment with time rebased to segment-relative

**Q: Should it be applied globally or per-segment?**
**Post-concatenation** is cleanest — same reasoning as hook title. Alternatively, compute which segment the rehook falls in and apply it to that segment with rebased timing.

### Conflicts
- **`identifyRehookPoint()`:** Uses absolute timestamps and a 40–60% window. Fully compatible — compute the point on the clip, then map to the containing segment.
- **`buildRehookFilter()` / ASS generation:** Uses `appearTime` as absolute clip-relative. Needs rebasing if applied per-segment.

### Reusable?
**Reusable** — `identifyRehookPoint()` and `generateRehookText()` are pure logic, no rendering assumptions. The ASS generation just needs the correct `appearTime` for whichever approach is chosen.

### Action: **Leave alone** — apply as post-concat overlay. If per-segment, rebase `appearTime` to segment-relative time.

---

## 4. `src/main/overlays/progress-bar.ts` — Progress Bar Overlay

### What it does

Animated thin bar that grows from 0 → full width over clip duration. Uses FFmpeg `filter_complex`: `color` source → `crop` (per-frame animated width via `t` variable) → `overlay`.

**Exported functions:**
- `buildProgressBarFilter(clipDuration: number, config: ProgressBarConfig, frameWidth?: number, frameHeight?: number, safeZone?: SafeZoneRect): string` — Returns `filter_complex` string mapping `[0:v]` → `[outv]`

**Exported types:**
- `ProgressBarConfig` — `{ enabled, position, height, color, opacity, style }`
- `DEFAULT_PROGRESS_BAR_CONFIG` — default values

**Filter structure:**
- Supports 3 styles: `solid`, `gradient` (highlight strip on top), `glow` (outer halo behind)
- Width expression uses `t/duration` → grows proportionally to elapsed time
- Multiple layers composed via numbered intermediate labels (`_pbs0`, `_pbc0`, `_pbi0`, etc.)

### Analysis for segment-based editing

**Q: Is it per-clip or would it need to span all segments?**
**Must span the entire final clip** — the bar represents overall progress (0→100% of total clip duration). If applied per-segment, each segment would show its own mini progress bar resetting at each cut, which is wrong UX.

**Q: Conflict with per-segment rendering?**
**Yes — significant conflict.** The `t` variable in `crop` filter = frame PTS. In per-segment rendering, each segment starts at `t=0`. The progress bar would reset at each segment boundary → visually broken.

### Conflicts
- **Core design conflict:** `buildAnimatedWidthExpr(dur)` uses `t/dur` where `dur` = segment duration. For correct clip-wide progress, it would need `(t + segmentOffset) / totalClipDuration`.
- **filter_complex structure:** The function generates a complete self-contained `[0:v]→[outv]` pipeline. Can't easily be injected into a per-segment filter chain that already has its own labels.

### Reusable?
**Not reusable for per-segment rendering.** Must be applied as a **post-concatenation** overlay pass on the final stitched clip, where `t=0` = clip start and `duration` = total clip duration.

Alternatively, could be modified to accept a `timeOffset` parameter so per-segment instances show the correct position (e.g., segment 3 at 20s would show bar at `(t + 20) / 60`), but this adds complexity for no real benefit vs post-concat.

### Action: **Leave alone** — always apply post-concatenation on the final stitched clip. No per-segment usage.

---

## 5. `src/main/layouts/split-screen.ts` — Split Screen Layouts

### What it does

Builds FFmpeg `filter_complex` strings for 4 split-screen layouts, all outputting 1080×1920 `[outv]`.

**Exported functions:**
- `buildSplitScreenFilter(layout: SplitScreenLayout, mainVideo: VideoSource, secondaryVideo: VideoSource | null, config: SplitScreenConfig): SplitScreenFilterResult`

**Layout types:**
1. **`top-bottom`** — Main on top, secondary on bottom (Subway Surfers format). Configurable ratio.
2. **`pip-corner`** — Main full-screen, PiP box in corner. Configurable position, size, corner radius.
3. **`side-by-side`** — Two panels horizontally stacked, centered on canvas.
4. **`reaction`** — Asymmetric top-bottom (70/30 default) with divider.

**Key implementation details:**
- `buildCropScale(source, targetW, targetH)` — Crop+scale to fill a target rect with center-crop
- `buildRoundedCornerFilter()` — Alpha mask via `geq` for PiP corners
- `buildGradientFill()` — Animated gradient placeholder when no secondary video
- Each layout produces `{ filterComplex: string, inputCount: 1 | 2 }`

**Exported types:**
- `SplitLayoutType` — `'top-bottom' | 'pip-corner' | 'side-by-side' | 'reaction'`
- `VideoSource` — `{ path, sourceWidth, sourceHeight, crop?: CropRect }`
- `SplitScreenConfig` — `{ ratio, divider?, pipPosition?, pipSize?, pipCornerRadius? }`
- `SplitScreenFilterResult` — `{ filterComplex: string, inputCount: number }`

### Analysis for segment-based editing

**Q: Can these be reused for "main-video-images" segment style (speaker + image)?**
**Partially.** The `pip-corner` layout is close to the `main-video-images-pip` segment style, and `side-by-side` maps to `main-video-images-side`. However:
- Current `VideoSource` expects a video file path (`path: string`), not a still image
- For image segments, the secondary source would be a static image, not a video
- FFmpeg handles still images differently (need `-loop 1` or use as overlay)
- The `buildCropScale()` helper uses `[0:v]`/`[1:v]` input labels — assumes video streams

**What would need to change for image support:**
- Accept image path as secondary source (FFmpeg can use `-i image.png` with `-loop 1`)
- Add a `behind-speaker` layout (image background, speaker overlay) — not currently implemented
- The filter chain format is compatible — just need to handle the image input stream differently

**Q: Filter chain format — compatible with per-segment filter building?**
**Mostly compatible.** The function produces a self-contained `filter_complex` with `[0:v]` → `[outv]`. For per-segment rendering:
- Each segment is rendered as its own FFmpeg command, so having a self-contained `filter_complex` is correct
- Input labels `[0:v]`, `[1:v]` would need to match the segment render's input indexing
- The `[outv]` output label convention is consistent

### Conflicts
- **No inherent conflicts** — each segment render can call `buildSplitScreenFilter()` independently
- **Missing layouts:** `behind-speaker` and `fullscreen` image layouts (from `segment-styles.ts`) don't exist here yet
- **No image-as-secondary support** — needs a new code path or a parallel image layout builder

### Reusable?
**Partially reusable.** `pip-corner` and `side-by-side` cover 2 of 3 `main-video-images` variants. The internal helpers (`buildCropScale`, `roundEven`, `buildRoundedCornerFilter`) are highly reusable.

### Action: **Modify** — extend to:
1. Accept still images as secondary source (or build a parallel `buildImageLayoutFilter()`)
2. Add `behind-speaker` layout
3. Keep existing API stable — new functionality via new layout types or a separate function

---

## 6. `src/main/layouts/blur-background.ts` — Blur Background Fill

### What it does

For horizontal/wide videos on 9:16 canvas: fills background with blurred scaled-up copy of the video instead of black bars. The "repost account" look.

**Exported function:**
- `buildBlurBackgroundFilter(inputWidth: number, inputHeight: number, outputWidth?: number, outputHeight?: number, config: BlurBackgroundConfig): string` — Returns `filter_complex` string with `[outv]` output.

**Filter chain:** `[0:v] split → [bg] scale-to-cover → crop → gblur → optional darken/vignette/shadow → [bgfinal]` + `[fg] scale-to-fit → [fgfinal]` → `overlay centered → [outv]`

**Exported types:**
- `BlurIntensity` — `'light' | 'medium' | 'heavy'`
- `BlurBackgroundConfig` — `{ blurIntensity, darken, vignette, borderShadow }`

### Analysis for segment-based editing

**Q: Can it be reused for the "wide" main-video variant?**
**Yes, directly.** The `main-video-wide` segment style (from `segment-styles.ts`) uses `zoomIntensity: 0.9` — showing more of the scene. When the source is a wide/horizontal video, `buildBlurBackgroundFilter()` is exactly what's needed: it scales-to-fit with a blurred background fill, avoiding black bars.

Use case: any segment styled as `main-video-wide` on a 16:9 source → call `buildBlurBackgroundFilter()` to get the blur-fill treatment.

**Q: Filter chain compatibility with per-segment rendering?**
**Fully compatible.** The function:
- Takes raw input dimensions (no file path — just numbers)
- Produces a self-contained `filter_complex` (`[0:v]` → `[outv]`)
- No time-dependent expressions (no `t` variable — purely spatial transforms)
- No global state
- Works identically whether processing a full clip or a single segment

Each segment render can call this independently with the source video's dimensions.

### Conflicts
- **None.** Pure spatial filter, no temporal assumptions, no global state.
- **Edge case:** If a segment uses both blur-background AND split-screen, both produce `[0:v]→[outv]` and can't be composed directly. But this is a non-issue because these are mutually exclusive layout types.

### Reusable?
**Fully reusable.** Zero modifications needed.

### Action: **Leave alone** — use as-is for any segment that needs blur-background fill.

---

## Summary Table

| Module | Conflicts | Reusable? | Action |
|--------|-----------|-----------|--------|
| `captions.ts` | None — pure function, subset words work | ✅ Fully | **Leave alone** |
| `hook-title.ts` | Timing assumes clip start = t=0 | ✅ Post-concat or segment 0 | **Leave alone** |
| `overlays/rehook.ts` | Timing assumes clip-relative position | ✅ Post-concat or rebase | **Leave alone** |
| `overlays/progress-bar.ts` | `t` resets per segment — **broken if per-segment** | ❌ Per-segment, ✅ Post-concat | **Leave alone** (post-concat only) |
| `layouts/split-screen.ts` | Missing image layouts, no image-as-input | ⚠️ Partial (pip, side-by-side) | **Modify** — add image support + behind-speaker |
| `layouts/blur-background.ts` | None | ✅ Fully | **Leave alone** |

## Key Design Decisions for Segment Renderer

1. **Captions:** Call `generateCaptions()` per segment. Rebase word times to `t=0` per segment. Different `CaptionStyleInput` per segment is trivially supported.

2. **Overlays (hook, rehook, progress bar):** Apply as **post-concatenation** overlays on the final stitched clip. This avoids all timing conflicts and is simpler to implement.

3. **Layouts (split-screen, blur-background):** Call per segment. Each segment picks its layout based on `SegmentStyleVariant.category`:
   - `main-video` → blur-background (if wide source) or direct crop
   - `main-video-images` → split-screen (pip/side-by-side) or new behind-speaker layout
   - `fullscreen-image` → new image-only layout (not yet implemented)
   - `fullscreen-text` → new text-on-solid layout (not yet implemented)

4. **New modules needed:**
   - Segment render orchestrator (renders each segment → concat)
   - Image layout builder (speaker + image compositions)
   - Fullscreen text/image renderer
   - Segment transition applier (crossfade, flash-cut between segments)
