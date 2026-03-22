# Gameplay Clips

Place `.mp4` gameplay video clips here to use as secondary (bottom/background) sources in split-screen layouts.

## Recommended clips

- **Subway Surfers** — fast-paced endless runner, popular for keeping viewers engaged
- **Minecraft parkour** — platforming runs with satisfying rhythm
- **Temple Run / Alto's Odyssey** — smooth, visually clean loops
- Any looping, high-energy mobile or PC gameplay footage

## How to use

Pass the file path as `secondaryVideo.path` when calling `buildSplitScreenFilter`:

```typescript
const result = await window.api.buildSplitScreenFilter(
  { type: 'top-bottom' },
  { path: '/path/to/main-video.mp4', sourceWidth: 1920, sourceHeight: 1080 },
  { path: '/path/to/assets/gameplay/subway-surfers.mp4', sourceWidth: 1080, sourceHeight: 1920 },
  { ratio: 0.6 }
)
// result.filterComplex → pass to FFmpeg -filter_complex
// result.inputCount    → number of -i inputs to supply (1 or 2)
```

## Notes

- Files in this directory are **not** committed to git (see `.gitignore`).
- The split-screen filter will automatically center-crop gameplay footage to fit the target panel.
- For vertical (9:16) gameplay, `sourceWidth=1080, sourceHeight=1920` is typical.
- For horizontal gameplay captures, pass the actual dimensions and the filter handles the crop.
