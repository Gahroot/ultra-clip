# Investigation Notes: Stitched Clips Style Issues

## Context
- User reports that "stitched" / concatenated clips don't get proper emphasis, supersize, or highlighting
- Edit styles are not fully sticking on stitched clips
- Need to find: how clips are stitched, how captions/styles are applied during render

## Key Files to Investigate
- `src/main/render/pipeline.ts` — main render pipeline
- `src/main/captions.ts` — ASS subtitle generation
- `src/main/render/features/` — render feature modules
- `src/renderer/src/store.ts` — store with clip state, edit style presets
- `src/renderer/src/store/types.ts` — type definitions

## Search Results So Far
- No matches for "stitch", "concat", "merge", "combine", "joined", "multi.segment" in .ts files
- This suggests "stitching" may be done differently — possibly through bumpers or multiple segments

## Previous Fixes This Session
1. Fixed `clipDuration` TDZ error in `ClipPreview.tsx` (moved const above useCallback refs)
2. Fixed `FACE_DETECTION_TIMEOUT_MS` missing import in `face-detection.ts`
3. Fixed transcription CUDA OOM with subprocess chunking in `python/transcribe.py`
4. Deploy: `bash scripts/deploy-windows.sh` (fast) or `--full`
5. Build: `npx electron-vite build`

## TODO
- Find how "stitched clips" are actually implemented
- Check caption/style application in render pipeline
- Look at bumper concat, intro/outro handling
- Check if word timestamps are properly offset for multi-segment clips
