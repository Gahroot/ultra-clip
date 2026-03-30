# Session Context — March 29, 2026

## Recent Fixes Applied
1. **`clipDuration` TDZ error** in `src/renderer/src/components/ClipPreview.tsx`
   - Moved `const clipDuration = localEnd - localStart` from line ~1193 to line ~763 (above the useCallback hooks that reference it)
   - Removed duplicate declaration at the old location

2. **`FACE_DETECTION_TIMEOUT_MS` not defined** in `src/main/face-detection.ts`
   - Added `import { FACE_DETECTION_TIMEOUT_MS } from '@shared/constants'` at top of file
   - Constant is defined in `src/shared/constants.ts` line 62

3. **Transcription CUDA OOM** in `python/transcribe.py`
   - Lowered `MAX_FULL_ATTENTION_SECONDS` from 24min to 5min
   - Lowered `CHUNK_SECONDS` from 20min to 5min
   - Rewrote `transcribe_chunked()` to spawn each chunk as a separate subprocess via `_transcribe_chunk_subprocess()`
   - Added `import torch` inside `transcribe_chunked`
   - Added OOM fallback in main transcription path (try full, catch OOM → fall back to chunked)
   - The function signature changed: `transcribe_chunked(model_name: str, ...)` instead of `transcribe_chunked(model, ...)`

4. **Fixed corrupted sample video** — remuxed with `ffmpeg -movflags faststart` to fix missing moov atom

## Deploy Commands
- Fast deploy: `bash scripts/deploy-windows.sh`
- Full deploy: `bash scripts/deploy-windows.sh --full`
- Build: `npx electron-vite build`
- Windows app location: `C:\Users\Groot\Desktop\BatchContent\BatchContent.exe`

## Current Investigation: Stitched Clips Style Issues
- User reports edit styles (emphasis, supersize, highlighting) not applying to "stitched" clips
- No matches found for "stitch", "concat", "merge" etc. in TypeScript files
- Need to understand what "stitched clips" means in this codebase
- Key files to look at:
  - `src/main/render/pipeline.ts` — render pipeline
  - `src/main/captions.ts` — caption generation (ASS subtitles)
  - `src/main/render/features/` — render feature modules
  - `src/renderer/src/store.ts` — store with clip/style state
  - `src/main/render/features/captions.feature.ts` — caption rendering feature
  - Look for "emphasis", "supersize", "highlight" patterns

## Project Structure Reminders
- Main process: `src/main/`
- Render pipeline: `src/main/render/`
- Shared types: `src/shared/types.ts`, `src/shared/constants.ts`
- Store: `src/renderer/src/store.ts` and `src/renderer/src/store/types.ts`
- Python scripts: `python/`
- Deploy script: `scripts/deploy-windows.sh`
