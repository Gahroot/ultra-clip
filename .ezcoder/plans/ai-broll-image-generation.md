# AI B-Roll Image Generation

## Summary
Add AI-generated contextual images as a B-Roll source alongside existing Pexels stock footage. Uses Gemini's native image generation (`gemini-2.5-flash-image`) to create images that illustrate what's being said in the transcript. Style-aware prompting matches the current EditStylePreset aesthetic. Users can choose stock vs. generated per-placement, and regenerate/swap images in the clip editor.

## Architecture

```
Transcript context → AI prompt (styled) → Gemini Image API → PNG file → FFmpeg overlay
                                                                          ↕
                                                          Existing Pexels video path
```

The generated image is saved as a PNG, then used as a static input in the existing FFmpeg B-Roll overlay pipeline. FFmpeg handles static images as inputs natively with `-loop 1`.

## API Choice: Gemini 2.5 Flash Image (Nano Banana)

- **Model**: `gemini-2.5-flash-image`
- **Cost**: ~$0.039/image, 500 RPD free tier
- **Key advantage**: Uses the same Gemini API key the user already has configured — no new API key needed
- **Aspect ratio**: Native 9:16 support (perfect for vertical video B-Roll)
- **SDK**: Use REST API directly (project uses legacy `@google/generative-ai`; image gen needs `responseModalities: ['IMAGE']` which works via REST)

## Files to Create

### 1. `src/main/broll-image-gen.ts` — AI Image Generation Module
Core module that generates contextual B-Roll images via Gemini.

**Exports:**
- `generateBRollImage(prompt, styleCategory, geminiApiKey, options?)` → `Promise<BRollImageResult>`
- `generateBRollImages(placements, styleCategory, geminiApiKey)` → `Promise<Map<string, BRollImageResult>>`
- `buildImagePrompt(keyword, transcriptContext, styleCategory)` → `string`

**BRollImageResult interface:**
```ts
interface BRollImageResult {
  filePath: string    // Cached PNG path
  keyword: string     // Original keyword
  width: number       // Image dimensions
  height: number      // Image dimensions
  source: 'ai-generated'
}
```

**Style-aware prompting** — map EditStylePreset categories to visual aesthetics:
```ts
const STYLE_IMAGE_GUIDANCE: Record<string, string> = {
  viral: 'Vibrant, high-contrast, bold colors, dynamic composition, eye-catching, social media aesthetic',
  educational: 'Clean, informative, flat illustration style, clear visual hierarchy, infographic-like',
  cinematic: 'Warm and cinematic, film grain, shallow depth of field, dramatic lighting, golden hour tones',
  minimal: 'Minimal, clean, muted tones, lots of white space, simple geometric composition',
  branded: 'Professional, polished, corporate aesthetic, clean lines, balanced composition',
  custom: 'High quality, visually appealing, balanced composition'
}
```

**Implementation details:**
- REST call to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
- Request body: `{ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '9:16' } } }`
- Parse base64 image from response `candidates[0].content.parts[].inlineData.data`
- Save to cache dir: `os.tmpdir()/batchcontent-broll-image-cache/`
- Cache key: md5 of `keyword + transcriptContext + styleCategory`
- Same cache eviction strategy as `broll-pexels.ts` (500MB max, 7-day TTL)
- Retry logic matching project patterns (transient error retry, classify errors)
- Track usage via `emitUsageFromResponse` pattern (manual token tracking since REST)

### 2. `src/main/broll-image-overlay.ts` — FFmpeg Static Image Overlay Helper
Adapter that makes static PNG images work with the existing B-Roll overlay pipeline.

**The key insight:** The existing `broll.feature.ts` treats every B-Roll placement as a video input. For static images, we need to convert the image to a looping video input in the filter_complex, or pre-convert images to short video clips.

**Approach: Pre-convert image to video** (simplest, most compatible):
- `imageToVideoClip(imagePath, duration, outputPath)` — uses FFmpeg to create a short video from a static image with a slow Ken Burns pan/zoom effect for visual interest
- The output video is then used identically to a Pexels video in `BRollPlacement.videoPath`

This avoids any changes to `broll.feature.ts` — the existing overlay pipeline works unchanged.

## Files to Modify

### 3. `src/main/broll-placement.ts` — Add source type to BRollPlacement
Add a `source` field to distinguish stock from generated:

```ts
export interface BRollPlacement {
  // ... existing fields ...
  /** Source of the B-Roll media: stock footage or AI-generated image */
  source: 'stock' | 'ai-generated'
}
```

Also add to `BRollSettings`:
```ts
export interface BRollSettings {
  // ... existing fields ...
  /** B-Roll source preference: 'stock' (Pexels only), 'ai-generated' (Gemini images only), or 'auto' (AI decides) */
  sourceMode: 'stock' | 'ai-generated' | 'auto'
}
```

### 4. `src/main/broll-ai-placement.ts` — Add source recommendation
Extend `AIBRollMoment` to include a source recommendation:

```ts
export interface AIBRollMoment {
  // ... existing fields ...
  /** Whether AI recommends stock footage or generated image */
  suggestedSource: 'stock' | 'ai-generated'
}
```

Update the AI placement prompt to also output `suggestedSource` for each moment:
- Stock for concrete, recognizable things ("city skyline", "coffee shop")  
- Generated for abstract concepts, data, specific scenarios ("revenue chart", "brain neurons", "tokyo temple at sunset")

### 5. `src/main/ipc/media-handlers.ts` — Add image generation IPC handlers
Add new IPC handlers:

```ts
// Generate a single AI B-Roll image
Ch.Invoke.BROLL_GENERATE_IMAGE  // 'broll:generateImage'

// Regenerate an image with a new prompt/style
Ch.Invoke.BROLL_REGENERATE_IMAGE  // 'broll:regenerateImage'
```

### 6. `src/main/ipc/render-handlers.ts` — Integrate AI images into render batch
In the B-Roll placement generation phase (Phase 1), after getting AI placements:
- Check each placement's `source` / `suggestedSource`
- For `ai-generated`: call `generateBRollImage()` instead of `fetchBRollClip()`
- Convert generated PNG to video via `imageToVideoClip()`
- Set `placement.videoPath` to the generated video
- For `stock`: use existing Pexels pipeline unchanged
- For `auto`: use AI's `suggestedSource` recommendation

### 7. `src/shared/ipc-channels.ts` — Add new channels
```ts
BROLL_GENERATE_IMAGE: 'broll:generateImage',
BROLL_REGENERATE_IMAGE: 'broll:regenerateImage',
```

### 8. `src/preload/index.ts` — Expose new IPC methods
```ts
generateBRollImage: invoke(I.BROLL_GENERATE_IMAGE),
regenerateBRollImage: invoke(I.BROLL_REGENERATE_IMAGE),
```

### 9. `src/preload/index.d.ts` — Type declarations
Add types for:
- New IPC methods on the `Api` interface
- `BRollSourceMode` type
- `BRollImageResult` interface
- Updated `broll` settings with `sourceMode`

### 10. `src/renderer/src/store/types.ts` — Add sourceMode to EditStyleBRoll
```ts
export interface EditStyleBRoll {
  // ... existing fields ...
  /** B-Roll source: 'stock', 'ai-generated', or 'auto' */
  sourceMode: 'stock' | 'ai-generated' | 'auto'
}
```

### 11. `src/renderer/src/store/edit-style-presets.ts` — Add defaults
Add `sourceMode: 'auto'` to all built-in preset broll configs.

### 12. `src/renderer/src/store/settings-slice.ts` — Add setter
Add `setBRollSourceMode` action.

### 13. `src/renderer/src/components/SettingsPanel.tsx` — B-Roll source toggle
In the B-Roll Insertion section, add a source mode selector above the existing settings:

```
┌──────────────────────────────────────┐
│  B-Roll Source                       │
│  ┌─────┐  ┌──────────┐  ┌─────────┐ │
│  │Stock│  │AI Images │  │  Auto   │ │
│  └─────┘  └──────────┘  └─────────┘ │
│                                      │
│  When "AI Images" or "Auto":         │
│  Uses your existing Gemini API key   │
│  (~$0.04/image)                      │
└──────────────────────────────────────┘
```

- "Stock" — Pexels only (requires Pexels key)
- "AI Images" — Gemini generated only (requires Gemini key)
- "Auto" — AI decides per-placement (requires both keys)
- Show cost hint: "~$0.04/image"
- When "Stock" selected, show Pexels API key field (existing)
- When "AI Images" or "Auto", show note that Gemini key from AI Settings is used

### 14. `src/renderer/src/components/ClipCard.tsx` — Per-clip B-Roll source indicators
In the AI Edit Plan display area, show source badges:
- 🖼️ for AI-generated placements
- 📹 for stock footage placements

### 15. `src/main/render/features/broll.feature.ts` — No changes needed
The existing feature works unchanged because AI-generated images are pre-converted to video clips via `imageToVideoClip()`.

## Implementation Order

1. **Types & interfaces** — Update `BRollPlacement`, `BRollSettings`, `EditStyleBRoll`, IPC types
2. **Core module** — `broll-image-gen.ts` (Gemini image generation + caching)
3. **FFmpeg adapter** — `broll-image-overlay.ts` (image → video conversion)
4. **AI placement update** — Update `broll-ai-placement.ts` with source recommendation
5. **IPC channels** — Add channels in `shared/ipc-channels.ts`
6. **IPC handlers** — Wire up in `media-handlers.ts`
7. **Render integration** — Update `render-handlers.ts` to route stock vs generated
8. **Preload bridge** — Update `preload/index.ts` and `index.d.ts`
9. **Store updates** — `types.ts`, `settings-slice.ts`, `edit-style-presets.ts`
10. **Settings UI** — Add source mode toggle in `SettingsPanel.tsx`
11. **ClipCard badges** — Show source type in `ClipCard.tsx`
12. **Build & verify** — `npx electron-vite build` passes clean

## Key Design Decisions

1. **Pre-convert images to video** rather than modifying the FFmpeg filter chain — keeps the render pipeline untouched and avoids complex filter_complex changes
2. **Ken Burns effect** on generated images — a static overlay looks cheap; a slow pan/zoom adds production value and makes it feel like a real edit
3. **Use same Gemini API key** — no new API key setup needed, lowers friction
4. **REST API** instead of new SDK — avoids adding `@google/genai` as a dependency since the project is already on the legacy SDK for text. A simple `fetch()` call to the REST endpoint is cleaner
5. **Cache generated images** — same pattern as Pexels cache, avoids regenerating identical requests
6. **`auto` mode as default** — AI decides whether stock or generated is better per-placement, giving the best results without user configuration

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini image gen occasionally fails/blocks | Graceful fallback to stock footage for that placement |
| Image quality varies | Ken Burns effect + short duration (2-4s) hides imperfections |
| API rate limits (500 RPD free) | Batch clips typically need 3-6 images per clip; 500/day handles ~80+ clips |
| Style mismatch | Style guidance in prompt; user can regenerate or switch to stock |
| Legacy SDK doesn't handle images | Using REST API directly via `fetch()` |

## Verification

- `npx electron-vite build` — clean compilation
- `npm test` — existing tests pass
- Manual: Set source mode to "AI Images", render a clip, verify generated images appear in B-Roll overlays
- Manual: Set source mode to "Auto", verify mix of stock and generated
- Manual: Verify stock-only mode still works identically to before
