# BatchContent

Electron desktop app that takes long-form video → AI-scored short-form vertical clips (9:16) with auto-captions.

## Architecture

```
Electron main process (Node.js)
  ├── FFmpeg (fluent-ffmpeg)       — video processing, thumbnails, rendering
  ├── Python venv (yt-dlp, NeMo)  — YouTube download, ASR transcription, face detection
  └── Google Gemini AI (@google/genai) — transcript scoring, hook text, rehook, descriptions,
                                          edit plans, segment styling, clip stitching

Renderer (React 19 + Zustand + Tailwind)
  └── IPC bridge (contextBridge)   — all main↔renderer calls via window.api

Shared
  └── src/shared/ipc-channels.ts   — canonical channel name registry (Ch.*)
```

`src/main/index.ts` is a thin bootstrap: it sets up the window, the logger, FFmpeg,
the Python check, then calls `registerXxxHandlers()` from each file in `src/main/ipc/`.
It does NOT contain the handlers themselves.

## Where To Find Things

High-level layout — prefer `ls` / `Glob` over trusting this list for specifics.

```
src/
├── shared/                  # Shared between main + renderer (IPC channel names, etc.)
├── main/                    # Electron main process
│   ├── index.ts             # App lifecycle + window creation only (≈150 lines)
│   ├── ipc/                 # All IPC handler modules — one file per domain
│   │   ├── ai-handlers.ts
│   │   ├── render-handlers.ts
│   │   ├── media-handlers.ts
│   │   ├── project-handlers.ts
│   │   ├── system-handlers.ts
│   │   ├── export-handlers.ts
│   │   ├── secrets-handlers.ts
│   │   └── ffmpeg-handlers.ts
│   ├── render/              # Batch render engine
│   │   ├── pipeline.ts          # Feature-pipeline orchestrator (prepare → filter → overlay → post)
│   │   ├── base-render.ts       # Core FFmpeg encode + active command tracking
│   │   ├── segment-render.ts    # Per-segment styled render path
│   │   ├── stitched-render.ts   # Multi-source stitched clip render path
│   │   ├── bumpers.ts           # Intro/outro concat
│   │   ├── overlay-runner.ts    # Two-pass overlay compositor
│   │   ├── preview.ts           # Preview render (single clip, low quality)
│   │   ├── helpers.ts / quality.ts / filename.ts / types.ts
│   │   ├── color-grade-filter.ts / face-track-filter.ts / vfx-filters.ts
│   │   ├── shot-style-resolver.ts
│   │   └── features/            # Render features, one per concern
│   │       ├── feature.ts                 # Shared Feature interface / lifecycle types
│   │       ├── captions.feature.ts
│   │       ├── hook-title.feature.ts
│   │       ├── rehook.feature.ts
│   │       ├── progress-bar.feature.ts
│   │       ├── auto-zoom.feature.ts
│   │       ├── brand-kit.feature.ts
│   │       ├── sound-design.feature.ts
│   │       ├── word-emphasis.feature.ts
│   │       ├── broll.feature.ts
│   │       ├── color-grade.feature.ts
│   │       ├── shot-transition.feature.ts
│   │       ├── accent-color.feature.ts
│   │       └── filler-removal.feature.ts
│   ├── ai/                  # Gemini-backed modules
│   │   ├── gemini-client.ts         # Single shared @google/genai client
│   │   ├── clip-stitcher.ts         # Multi-source stitched clip generator
│   │   ├── clip-variants.ts         # A/B/C packaging variants
│   │   ├── curiosity-gap.ts         # Curiosity gap detection + boundary optimization
│   │   ├── description-generator.ts # Platform descriptions + hashtags
│   │   ├── edit-plan.ts             # Full per-clip edit plan generator
│   │   ├── edit-plan-cache.ts
│   │   ├── loop-optimizer.ts        # Loop point analysis + crossfade builder
│   │   ├── segment-images.ts        # Per-segment AI image generation
│   │   ├── segment-styler.ts        # Per-segment style assignment
│   │   └── story-arc.ts             # Multi-clip narrative arc detector
│   ├── layouts/             # FFmpeg filter_complex builders (blur-bg, split-screen, segment-layouts)
│   ├── overlays/            # Overlay filter builders (rehook, progress-bar, caption-bg, fake-comment, emoji-burst, velocity)
│   ├── render-pipeline.ts   # Thin re-export shim into render/ — do NOT put new code here
│   ├── ffmpeg.ts / python.ts / python-setup.ts
│   ├── transcription.ts / youtube.ts / face-detection.ts
│   ├── ai-scoring.ts / ai-usage.ts
│   ├── captions.ts / hook-title.ts / sound-design.ts
│   ├── segments.ts / segment-styles.ts / edit-styles.ts
│   ├── broll-*.ts           # B-roll: keywords, Pexels fetch, AI image gen, placement, overlay
│   ├── shot-segmentation.ts / shot-transitions.ts
│   ├── filler-detection.ts / filler-cuts.ts / word-emphasis.ts
│   ├── color-grade.ts / zoom-filters.ts / transition-filters.ts / auto-zoom.ts
│   ├── font-registry.ts / aspect-ratios.ts / safe-zones.ts / brand-kit.ts
│   ├── secrets.ts / settings-window.ts / logger.ts
│   ├── ipc-error-handler.ts # wrapHandler() — standard error envelope for IPC handlers
│   └── export-manifest.ts
│
├── preload/
│   ├── index.ts             # contextBridge API exposure
│   └── index.d.ts           # TypeScript types for window.api — keep in sync with preload
│
└── renderer/src/            # React 19 UI
    ├── App.tsx / main.tsx / SettingsWindow.tsx
    ├── store.ts             # Re-export shim
    ├── store/               # Zustand store split into slices
    │   ├── index.ts
    │   ├── clips-slice.ts / pipeline-slice.ts / project-slice.ts
    │   ├── settings-slice.ts / settings-sync.ts / history-slice.ts / errors-slice.ts
    │   ├── selectors.ts / helpers.ts / types.ts
    ├── components/          # One file per component; SegmentTimeline, SegmentStylePicker,
    │                        # ClipCard, ClipGrid, ClipPreview, SettingsPanel, ProcessingPanel,
    │                        # EditStyleSelector, SegmentCaptionEditor, StitchedClipCard, etc.
    │   └── ui/              # ShadCN components — do not edit manually
    ├── hooks/               # usePipeline + pipeline-stages/, plus keyboard / autosave / theme hooks
    ├── services/
    └── lib/utils.ts

python/                      # yt-dlp, NeMo ASR, MediaPipe face detection
scripts/setup-python.sh
resources/                   # Bundled assets (fonts, music, SFX)
```

## Organization Rules

- **Main process entry** → `src/main/index.ts` — bootstrap only. Never add IPC handlers here.
- **IPC handlers** → `src/main/ipc/<domain>-handlers.ts`. Each file exports `registerXxxHandlers()` and is called from `index.ts`. Wrap handlers with `wrapHandler()` from `src/main/ipc-error-handler.ts`.
- **IPC channel names** → `src/shared/ipc-channels.ts` (the `Ch` object). Do not hard-code channel strings in handlers or the preload bridge.
- **Render engine** → `src/main/render/`. New render logic goes in a `features/*.feature.ts` module implementing the `Feature` interface from `features/feature.ts`. `src/main/render-pipeline.ts` is a backward-compat shim — do not add code there.
- **AI modules** → `src/main/ai/`, one module per capability. Reuse `gemini-client.ts` rather than constructing new clients.
- **Layouts / overlays** → `src/main/layouts/` and `src/main/overlays/` for FFmpeg filter_complex builders.
- **Preload bridge** → `src/preload/index.ts` exposes `window.api`; `src/preload/index.d.ts` must stay in sync.
- **Renderer state** → `src/renderer/src/store/` slices. `store.ts` is only a re-export shim.
- **React components** → `src/renderer/src/components/`, one component per file. ShadCN UI in `components/ui/` (auto-generated via `npx shadcn@latest add <component>`).
- **Hooks** → `src/renderer/src/hooks/`.
- **Tests** → co-located next to source (`*.test.ts` / `*.test.tsx`). Main-process tests use `src/main/test-setup.ts` via Vitest.
- **Path alias**: `@/` maps to `src/renderer/src/`. `@shared/` maps to `src/shared/`.
- **Config file**: `electron.vite.config.ts` (dot, not dash).

## IPC Channels

Channel names are defined in `src/shared/ipc-channels.ts` as the `Ch` object.
Handlers are registered in `src/main/ipc/*-handlers.ts`. To see what channels
exist right now, read those files — do not trust a static list here. The
preload bridge in `src/preload/index.ts` is the canonical renderer-facing surface.

Common main → renderer `send` events: `youtube:progress`, `transcribe:progress`,
`ai:scoringProgress`, `face:progress`, `render:clipStart`, `render:clipProgress`,
`render:clipDone`, `render:clipError`, `render:batchDone`, `render:cancelled`.
The authoritative list is also in `src/shared/ipc-channels.ts`.

## Error Handling

### Main process
- `process.on('uncaughtException')` in `src/main/index.ts` — shows a native dialog with copy-to-clipboard, then exits.
- `process.on('unhandledRejection')` — logs to console (non-fatal).
- IPC handlers use `wrapHandler()` from `src/main/ipc-error-handler.ts` for a consistent error envelope; errors serialize naturally across `ipcMain.handle`.
- GPU encoder failures in the render pipeline fall back to `libx264`.
- Python script errors include the script name + stderr context.
- Logger: `src/main/logger.ts` (`initLogger` / `log` / `closeLogger`) writes to the session log file.

### Renderer
- `ErrorBoundary` wraps the full app — catches React render errors with copy + reload UI.
- `ErrorLog` panel appears at the bottom when `store.errorLog` is non-empty — collapsible, per-entry copy, "Copy All", "Clear".
- `addError({ source, message })` on the Zustand store (see `errors-slice.ts`) adds entries with auto-assigned id + timestamp.
- Error sources: `pipeline`, `transcription`, `scoring`, `ffmpeg`, `youtube`, `face-detection`, `render`, and any domain-specific ones added in `errors-slice.ts`.

## Code Quality

After editing ANY file, run:

```bash
npx electron-vite build
```

Fix ALL errors before continuing. The build includes TypeScript type checking.

To run tests:

```bash
npm test
```

For development with hot reload:

```bash
npx electron-vite dev
```

No ESLint is configured. TypeScript strict mode is the primary quality gate.

## Python Environment

The Python environment lives in `python/` at the project root:

```
python/
├── requirements.txt      # nemo_toolkit[asr], mediapipe, opencv-python-headless, numpy, yt-dlp
├── venv/                 # Created by setup script (git-ignored)
├── transcribe.py         # Parakeet TDT v3 ASR — word + segment timestamps
├── face_detect.py        # MediaPipe face detection → 9:16 crop rectangles
└── download.py           # yt-dlp YouTube downloader
```

### Setup

```bash
npm run setup:python
# or directly:
bash scripts/setup-python.sh
```

### Python Script Protocol

All Python scripts communicate over stdout with newline-delimited JSON:

```json
{ "type": "progress", "stage": "loading-model", "message": "Loading NeMo..." }
{ "type": "done", "text": "...", "words": [...], "segments": [...] }
{ "type": "error", "message": "..." }
```

### Notes

- **NeMo / CUDA**: `nemo_toolkit[asr]` pulls in PyTorch + CUDA libraries (~3–4 GB). On a machine without a compatible NVIDIA GPU the model will still run on CPU (slower). The install includes CUDA wheels regardless — that is normal.
- **Model download**: `nvidia/parakeet-tdt-0.6b-v3` (~1.2 GB) is downloaded from HuggingFace on first `transcribe.py` invocation and cached in `~/.cache/huggingface/`.
- **Electron bridge**: `src/main/python.ts` exports `resolvePythonPath`, `resolveScriptPath`, `runPythonScript`, `isPythonAvailable`. First-run venv bootstrap lives in `src/main/python-setup.ts`. Availability is checked in `src/main/index.ts` at startup.
- **Packaged build**: The electron-builder config copies `python/*.py` + `python/requirements.txt` + `python/venv/**` into `resources/python/` in the app bundle. The venv must be built before packaging.
- **Timeouts**: Transcription allows 3 hours; YouTube download allows 2 hours; Python import check allows 30 seconds.

## Rendering Pipeline

The batch render runs through `startBatchRender()` in `src/main/render/pipeline.ts`.
It is a feature-pipeline: each `Feature` in `src/main/render/features/` hooks into
`prepare → videoFilter → overlayPass → postProcess` lifecycle phases.

Per approved clip:

1. Features run `prepare()` (generate ASS captions, detect fillers, fetch B-roll, build hook/rehook overlays, plan segment styling, etc).
2. `buildVideoFilter()` builds the base crop + scale to the target aspect ratio.
3. Features append additional video filters (auto-zoom, color grade, shot transitions, accent color, word emphasis, etc.).
4. `renderClip()` (or `renderSegmentedClip()` / `renderStitchedClip()` for those paths) runs the base FFmpeg encode — plus brand logo, sound design, and bumpers.
5. Features contribute overlay passes that are composited by `overlay-runner.ts` in a second pass.
6. `postProcess()` handles manifests, description files, cleanup.

Encoder preference: `h264_nvenc` → `h264_qsv` → `libx264` fallback (see `getEncoder()` in `src/main/ffmpeg.ts`). Per-clip errors are isolated — one failure does not abort the batch. Active FFmpeg commands are tracked in `base-render.ts` so `cancelRender()` can `SIGTERM` them.

## Deploy to Windows Desktop (WSL2)

When the user says **"send it to my Windows machine"** (or similar), run this
full deploy sequence. Do NOT skip steps or try to patch individual files —
always replace the entire folder.

```bash
# 1. Build the app code
npx electron-vite build

# 2. Pack a fresh app.asar from the build output
ASAR_STAGE=$(mktemp -d)
mkdir -p "$ASAR_STAGE/out/main" "$ASAR_STAGE/out/preload" "$ASAR_STAGE/out/renderer/assets"
cp out/main/*.js "$ASAR_STAGE/out/main/"
cp out/preload/index.js "$ASAR_STAGE/out/preload/"
cp out/renderer/index.html "$ASAR_STAGE/out/renderer/"
cp out/renderer/assets/* "$ASAR_STAGE/out/renderer/assets/"
cp package.json "$ASAR_STAGE/"
npx asar pack "$ASAR_STAGE" dist/win-unpacked/resources/app.asar
rm -rf "$ASAR_STAGE"

# 3. Update Python scripts in dist (NOT the venv — it's Windows-specific)
cp python/download.py python/face_detect.py python/transcribe.py python/requirements.txt \
   dist/win-unpacked/resources/python/

# 4. Nuke and replace the entire BatchContent folder on the Windows desktop
rm -rf "/mnt/c/Users/Groot/Desktop/BatchContent"
cp -r dist/win-unpacked "/mnt/c/Users/Groot/Desktop/BatchContent"
sync
```

**Important notes:**
- `dist/win-unpacked/` contains the Electron shell (exe, DLLs, ffmpeg binaries).
  It's created by `npm run build:win` or `npm run build:unpack`. If it doesn't
  exist yet, run `npm run build:win` first (one-time, takes a while).
- Never copy the Linux `python/venv/` to Windows — the Windows app has its own
  Python environment at `%APPDATA%/batchcontent/python-env/` which is
  auto-installed on first launch.
- The `cp -r` across WSL2 → `/mnt/c/` can take 30–60 seconds for ~240 MB.
  Use a 180s timeout or `run_in_background` if needed.
- Session logs on Windows: `C:\Users\Groot\AppData\Roaming\batchcontent\logs\`
- Debug exports on Windows: `C:\Users\Groot\Downloads\batchcontent-debug-*.log`

## Environment

- Working directory: /home/groot/batchcontent
- Platform: linux
- Node: check `.nvmrc` or `package.json` engines field
</content>
</invoke>