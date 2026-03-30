# Audit Context — Segment-Based Editing Conflicts

## What We're Building
Captions.ai-style segment editing: each clip splits into 4-7 segments (~8-10s each), each with its own layout/zoom/caption style. 5 segment types: main-video, main-video-text, main-video-images, fullscreen-image, fullscreen-text. 15 edit style presets. Per-segment render then concatenate.

## 18 Tasks Already Created (task list)
Foundation → AI/Render → UI → Integration → Tests

## Files to Audit (split across 5 agents)

### Agent 1: Render Pipeline + FFmpeg
- src/main/render-pipeline.ts
- src/main/ffmpeg.ts
- src/main/auto-zoom.ts

### Agent 2: AI + Edit Plan System
- src/main/ai-scoring.ts
- src/main/ai/ (all files in directory)
- grep for: editPlan, edit-plan, aiEdit, BUILT_IN_EDIT_STYLE across src/

### Agent 3: Captions + Overlays
- src/main/captions.ts
- src/main/hook-title.ts
- src/main/overlays/rehook.ts
- src/main/overlays/progress-bar.ts
- src/main/layouts/split-screen.ts
- src/main/layouts/blur-background.ts

### Agent 4: Store + Pipeline Hook + Types
- src/renderer/src/store.ts
- src/renderer/src/hooks/usePipeline.ts
- src/preload/index.d.ts
- src/preload/index.ts

### Agent 5: UI Components + IPC Handlers
- src/renderer/src/components/ClipPreview.tsx
- src/renderer/src/components/ClipCard.tsx
- src/renderer/src/components/SettingsPanel.tsx
- src/main/index.ts (IPC handlers)

## What Each Agent Should Report
For each file:
1. What it does currently (brief)
2. Specific conflicts with segment-based editing
3. Action: modify / replace / deprecate / leave alone
4. Tightly-coupled dependencies that will be tricky
