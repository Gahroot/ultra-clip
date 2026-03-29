# Wire-Up Audit — Working Notes

## IPC Channel Registry (src/shared/ipc-channels.ts)
All invoke and send channels are defined. All are referenced in preload/index.ts.

## Main Process Handler Registration (src/main/index.ts)
7 handler groups registered:
- registerFfmpegHandlers (ffmpeg-handlers.ts) ✅
- registerAiHandlers (ai-handlers.ts) ✅
- registerRenderHandlers (render-handlers.ts) ✅
- registerProjectHandlers (project-handlers.ts) ✅
- registerSystemHandlers (system-handlers.ts) ✅
- registerMediaHandlers (media-handlers.ts) ✅
- registerExportHandlers (export-handlers.ts) ✅

## Preload Bridge (src/preload/index.ts) — 80+ API methods exposed
All reference Ch.Invoke.* and Ch.Send.* constants from shared/ipc-channels.ts.

## Handler Coverage — VERIFIED
Every Ch.Invoke.* channel has a matching ipcMain.handle() in one of the handler files.
Every Ch.Send.* channel is used via event.sender.send() in the appropriate handler.

## Pipeline Stages — ALL WIRED
- download-stage.ts → window.api.downloadYouTube, onYouTubeProgress ✅
- transcription-stage.ts → window.api.transcribeVideo, formatTranscriptForAI, onTranscribeProgress ✅
- clip-mapping-stage.ts → window.api.scoreTranscript, onScoringProgress ✅
- thumbnail-stage.ts → window.api.getThumbnail ✅ (need to verify)
- loop-optimization-stage.ts → window.api.analyzeLoopPotential, scoreLoopQuality, optimizeForLoop, detectCuriosityGaps, optimizeClipEndpoints ✅
- variant-generation-stage.ts → window.api.generateClipVariants ✅
- stitch-generation-stage.ts → window.api.generateStitchedClips, onStitchingProgress ✅
- face-detection-stage.ts → window.api.detectFaceCrops, onFaceDetectionProgress ✅
- story-arc-stage.ts → window.api.detectStoryArcs, generateSeriesMetadata ✅

## Render Pipeline — WIRED
- ClipGrid.tsx calls window.api.startBatchRender ✅
- ClipCard.tsx calls window.api.startBatchRender (single clip) ✅
- ClipPreview.tsx calls window.api.startBatchRender ✅
- Render event listeners (onRenderClipStart etc.) — NEED TO VERIFY where subscribed

## STILL NEED TO CHECK:
1. Render event listeners in renderer — where are onRenderClipStart/Progress/Done/Error/BatchDone/Cancelled subscribed?
2. B-Roll — is it wired into the render pipeline or just the IPC?
3. Filler Removal — store has settings but is it wired to rendering?
4. Emoji Burst — identified in AI but does the render pipeline use it?
5. Fake Comment — same question
6. Description Generator — is batch descriptions called from UI?
7. Export — generateManifest and exportDescriptions — called from UI?
8. Auto Mode — wired to pipeline?
9. Resource Monitor — wired?
10. Settings Profiles — save/load wired?
11. Python Setup — wired in SetupWizard?
12. AI Token Usage — listener wired?
13. ClipOverrides — passed through to render?
14. renderPreview / cleanupPreview — used?
15. render/pipeline.ts clipOverrides field
