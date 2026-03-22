# BatchContent

Electron desktop app that takes long-form video → AI-scored short-form vertical clips (9:16) with auto-captions.

## Architecture

```
Electron main process (Node.js)
  ├── FFmpeg (fluent-ffmpeg)       — video processing, thumbnails, rendering
  ├── Python venv (yt-dlp, NeMo)  — YouTube download, ASR transcription, face detection
  └── Google Gemini AI             — transcript scoring, hook text, re-hook, descriptions

Renderer (React 19 + Zustand + Tailwind)
  └── IPC bridge (contextBridge)   — all main↔renderer calls via window.api
```

## Project Structure

```
src/
├── main/                              # Electron main process
│   ├── index.ts                       # App lifecycle, window creation, all IPC handlers
│   ├── ffmpeg.ts                      # FFmpeg/ffprobe binary setup + helpers
│   ├── python.ts                      # Python environment (venv detection, script runner)
│   ├── youtube.ts                     # yt-dlp download pipeline
│   ├── transcription.ts               # Audio extraction + Parakeet TDT ASR
│   ├── ai-scoring.ts                  # Gemini AI transcript scoring + hook generation
│   ├── face-detection.ts              # MediaPipe face detection → 9:16 crop regions
│   ├── captions.ts                    # ASS subtitle generation (word-level timing)
│   ├── render-pipeline.ts             # Batch render (cut + crop + captions via FFmpeg)
│   ├── auto-zoom.ts                   # Ken Burns zoom filter generation
│   ├── brand-kit.ts                   # Logo/bumper asset management
│   ├── hook-title.ts                  # Hook title overlay filter builder
│   ├── safe-zones.ts                  # Platform-aware safe zone rectangles
│   ├── sound-design.ts                # Background music + SFX placement
│   ├── test-setup.ts                  # Vitest setup for main process tests
│   ├── ai/                            # Advanced AI modules
│   │   ├── clip-variants.ts           # A/B/C packaging variant generator
│   │   ├── curiosity-gap.ts           # Curiosity gap detector + clip optimizer
│   │   ├── description-generator.ts   # Platform description + hashtag generator
│   │   ├── loop-optimizer.ts          # Seamless loop point analysis
│   │   └── story-arc.ts               # Multi-clip narrative arc detector
│   ├── layouts/                       # FFmpeg filter_complex builders
│   │   ├── blur-background.ts         # Blur-fill background for non-9:16 sources
│   │   └── split-screen.ts            # 4 split-screen layout types
│   └── overlays/                      # Overlay filter builders
│       ├── progress-bar.ts            # Animated completion progress bar
│       └── rehook.ts                  # Mid-clip re-hook / pattern interrupt overlay
│
├── preload/                           # IPC bridge (renderer <-> main)
│   ├── index.ts                       # contextBridge API exposure
│   └── index.d.ts                     # TypeScript types for window.api
│
└── renderer/src/                      # React 19 UI
    ├── App.tsx                        # Root layout + ErrorBoundary wrapper
    ├── main.tsx                       # React entry point
    ├── store.ts                       # Zustand store (all app state + actions)
    ├── store.test.ts                  # Store unit tests
    ├── assets/index.css               # Tailwind CSS + theme variables
    ├── components/
    │   ├── ClipCard.tsx               # Individual clip card with controls
    │   ├── ClipGrid.tsx               # Scored clip review grid
    │   ├── ClipPreview.tsx            # Video preview for a single clip
    │   ├── EditableTime.tsx           # Inline-editable timestamp input
    │   ├── EditableTime.test.ts       # EditableTime unit tests
    │   ├── ErrorBoundary.tsx          # React error boundary (crash recovery)
    │   ├── ErrorLog.tsx               # Collapsible error log panel
    │   ├── ErrorLog.test.tsx          # ErrorLog unit tests
    │   ├── ProcessingPanel.tsx        # Step-by-step pipeline progress
    │   ├── ScriptCueSplitter.tsx      # Manual script-cue segment splitting
    │   ├── SettingsPanel.tsx          # API keys, output dir, caption style, overlays
    │   ├── SourceInput.tsx            # Drop zone + YouTube URL bar
    │   └── ui/                        # ShadCN components (do not edit manually)
    ├── hooks/
    │   └── usePipeline.ts             # Pipeline orchestration hook
    └── lib/
        └── utils.ts                   # cn() class merge utility

python/
├── requirements.txt      # nemo_toolkit[asr], mediapipe, opencv-python-headless, numpy, yt-dlp
├── venv/                 # Created by setup script (git-ignored)
├── transcribe.py         # Parakeet TDT v3 ASR — word + segment timestamps
├── face_detect.py        # MediaPipe face detection → 9:16 crop rectangles
└── download.py           # yt-dlp YouTube downloader

scripts/
└── setup-python.sh       # Creates python/venv and installs requirements.txt

resources/                # Bundled assets (fonts, music, SFX)
```

## Organization Rules

- **Main process code** → `src/main/`, one file per concern
- **AI modules** → `src/main/ai/`, one module per capability
- **Layout/overlay filter builders** → `src/main/layouts/` and `src/main/overlays/`
- **IPC types** → `src/preload/index.d.ts`, keep Api interface in sync with preload bridge
- **React components** → `src/renderer/src/components/`, one component per file
- **ShadCN UI** → `src/renderer/src/components/ui/`, auto-generated (use `npx shadcn@latest add <component>`)
- **Hooks** → `src/renderer/src/hooks/`
- **Tests** → co-located next to source files
- **Path alias**: `@/` maps to `src/renderer/src/`
- **Config file**: `electron.vite.config.ts` (dot, not dash)

## IPC Channel Registry

### invoke (renderer → main)

| Channel | Description |
|---------|-------------|
| `dialog:openFiles` | File picker (video files) |
| `dialog:openDirectory` | Directory picker |
| `ffmpeg:getMetadata` | Probe video metadata (duration, dimensions, fps, codec) |
| `ffmpeg:extractAudio` | Extract 16kHz mono WAV for transcription |
| `ffmpeg:thumbnail` | Generate base64 PNG thumbnail |
| `ffmpeg:splitSegments` | Split video into labeled segments via stream copy |
| `youtube:download` | Download video via yt-dlp |
| `transcribe:video` | Full transcription pipeline (audio extract + ASR) |
| `transcribe:formatForAI` | Format transcript for Gemini prompt |
| `ai:scoreTranscript` | AI viral scoring of transcript segments |
| `ai:generateHookText` | Generate hook text for a single clip |
| `ai:generateRehookText` | Generate mid-clip re-hook text |
| `ai:detectCuriosityGaps` | Detect curiosity gaps in a transcript |
| `ai:optimizeClipBoundaries` | Optimize clip start/end around a curiosity gap |
| `ai:rankClipsByCuriosity` | Re-rank clips by blended virality + curiosity score |
| `ai:generateClipDescription` | Generate platform description + hashtags for one clip |
| `ai:generateBatchDescriptions` | Batch-generate descriptions for all clips in one AI call |
| `face:detectCrops` | MediaPipe face detection → 9:16 crop regions |
| `captions:generate` | Generate ASS subtitle file from word timestamps |
| `render:startBatch` | Start batch render of approved clips |
| `render:cancel` | Cancel active render batch |
| `brandkit:selectLogo` | File picker + copy logo to stable userData path |
| `brandkit:selectIntroBumper` | File picker + copy intro bumper video |
| `brandkit:selectOutroBumper` | File picker + copy outro bumper video |
| `safezones:getPlacement` | Get element placement rect for a platform |
| `safezones:getSafeZone` | Get full safe zone rect for a platform |
| `safezones:getDeadZones` | Get dead zone measurements for a platform |
| `safezones:clamp` | Clamp a rect to the platform safe zone |
| `safezones:isInside` | Check if a rect is inside the safe zone |
| `safezones:toAssMargins` | Convert placement rect to ASS subtitle margins |
| `safezones:getAllPlatforms` | Return all platform safe zone definitions |
| `layout:buildBlurBackground` | FFmpeg filter_complex for blur-fill background |
| `layout:buildSplitScreen` | FFmpeg filter_complex for split-screen layouts |
| `loop:analyzeLoopPotential` | Analyze clip transcript for natural loop points |
| `loop:optimizeForLoop` | Apply loop analysis to produce adjusted clip boundaries |
| `loop:buildCrossfadeFilter` | Build FFmpeg audio crossfade filter for loop |
| `loop:scoreLoopQuality` | Compute composite loop quality score (0–100) |
| `variants:generate` | Generate A/B/C packaging variants for a clip |
| `variants:buildRenderConfigs` | Convert variants into render pipeline configs |
| `variants:generateLabels` | Generate UI labels for a set of variants |
| `storyarc:detectStoryArcs` | Detect multi-clip narrative arcs with AI |
| `storyarc:generateSeriesMetadata` | Derive series metadata (part numbers, titles) |
| `storyarc:buildPartNumberFilter` | Build FFmpeg drawtext filter for "Part N/M" badge |
| `storyarc:buildEndCardFilter` | Build FFmpeg filter for end-card overlay |
| `project:save` | Save project JSON to .batchcontent file |
| `project:load` | Load project JSON from .batchcontent file |

### send (main → renderer)

| Channel | Description |
|---------|-------------|
| `youtube:progress` | Download percentage |
| `transcribe:progress` | Transcription stage updates |
| `ai:scoringProgress` | Scoring stage updates |
| `face:progress` | Face detection segment progress |
| `render:clipStart` | Clip render started |
| `render:clipProgress` | Clip render percentage |
| `render:clipDone` | Clip render complete |
| `render:clipError` | Clip render failed |
| `render:batchDone` | Batch complete (with completed/failed/total) |
| `render:cancelled` | Batch cancelled |

## Error Handling

### Main process
- `process.on('uncaughtException')` — shows a native dialog with copy-to-clipboard, then exits
- `process.on('unhandledRejection')` — logs to console (non-fatal)
- All IPC handlers allow errors to propagate naturally; `ipcMain.handle` serializes them to the renderer
- GPU session errors in render pipeline trigger automatic libx264 software fallback
- Python script errors include script name + stderr context in the message

### Renderer
- `ErrorBoundary` wraps the full app — catches React render errors with copy + reload UI
- `ErrorLog` panel appears at the bottom when errors exist — collapsible, per-entry copy, "Copy All", "Clear"
- Error count badge appears in the header when `store.errorLog` is non-empty
- `addError({ source, message })` in the Zustand store adds entries (auto-assigned id + timestamp)

### Sources for `addError`

| source | Description |
|--------|-------------|
| `pipeline` | Pipeline orchestration errors |
| `transcription` | ASR / audio extraction errors |
| `scoring` | Gemini AI scoring errors |
| `ffmpeg` | FFmpeg operation errors |
| `youtube` | yt-dlp download errors |
| `face-detection` | MediaPipe face detection errors |
| `render` | Per-clip render errors |

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
- **Electron bridge**: `src/main/python.ts` exports `resolvePythonPath`, `resolveScriptPath`, `runPythonScript`, `isPythonAvailable`, and `setupPythonVenv`. The bridge is imported in `src/main/index.ts` and checks availability at startup.
- **Packaged build**: The electron-builder config copies `python/*.py` + `python/requirements.txt` + `python/venv/**` into `resources/python/` in the app bundle. The venv must be built before packaging.
- **Timeouts**: Transcription allows 3 hours; YouTube download allows 2 hours; Python import check allows 30 seconds.

## Rendering Pipeline

1. For each approved clip:
   - Trim source video to `[startTime, endTime]` using re-encode (not stream copy) to enable frame-accurate seeking
   - Apply crop filter (`crop=W:H:X:Y`) + scale to 1080×1920
   - Optionally burn in: ASS captions, hook title overlay, re-hook overlay, progress bar, brand logo
   - Optionally add: intro bumper (concat), outro bumper (concat), background music (amix)
   - Auto-zoom (Ken Burns) applied as `zoompan` video filter when enabled
2. GPU encoder preferred (`h264_nvenc` → `h264_qsv` → `libx264` fallback)
3. Per-clip errors are isolated — one failure does not abort the batch
4. Temp files cleaned up after each clip

## Deploy to Windows Desktop (WSL2)

From WSL2, build and deploy to the Windows desktop:

```bash
# 1. Build the app
npx electron-vite build

# 2. Package for Windows (without installer)
npm run build:win -- --dir

# 3. Copy to Windows desktop
rsync -av --delete --copy-links /home/groot/batchcontent/dist/win-unpacked/ "/mnt/c/Users/Groot/Desktop/BatchContent/"
```

The Windows Python environment (embedded Python + packages) is stored in `%APPDATA%/BatchContent/python-env/` and is auto-installed on first run. No manual setup needed on Windows.

## Environment

- Working directory: /home/groot/batchcontent
- Platform: linux
- Node: check `.nvmrc` or `package.json` engines field
- Today's date: 21 March 2026
