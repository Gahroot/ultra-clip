# MASTER AUDIT PLAN — Segment-Based Editing Conflicts

## Goal
Audit the entire BatchContent codebase for conflicts with new Captions.ai-style segment editing.
We're building: clip → split into 4-7 segments → each segment gets own layout/zoom/caption style → render per-segment → concatenate.

## 5 Agents Launched
Each writes findings to .ezcoder/plans/audit-agent-{N}.md

### Agent 1: Render Pipeline + FFmpeg
Files: src/main/render-pipeline.ts, src/main/ffmpeg.ts, src/main/auto-zoom.ts

### Agent 2: AI + Edit Plan System  
Files: src/main/ai-scoring.ts, src/main/ai/* (all), grep for editPlan/aiEdit/BUILT_IN_EDIT_STYLE

### Agent 3: Captions + Overlays + Layouts
Files: src/main/captions.ts, src/main/hook-title.ts, src/main/overlays/*, src/main/layouts/*

### Agent 4: Store + Pipeline Hook + Types
Files: src/renderer/src/store.ts, src/renderer/src/hooks/usePipeline.ts, src/preload/index.d.ts, src/preload/index.ts

### Agent 5: UI Components + IPC
Files: src/renderer/src/components/ClipPreview.tsx, ClipCard.tsx, SettingsPanel.tsx, src/main/index.ts

## After All Agents Complete
- Read all 5 audit files
- Compile unified conflict report
- Identify what to modify vs replace vs deprecate
- Update task prompts if needed

## 18 Tasks Already in Task List
b3cb459d, 4a96c38b, 7753d693, a42b52d0, a4576cbe, da328476, b6b9d892, c81b6097, db906db7, b7da5195, 9edbd673, 5aa43e55, e1ccf986, 57688c71, 2b042ff5, c76428c3, ed361587, 27ba4d8f
