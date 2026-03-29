# Wire-Up Audit — State Save

## CONFIRMED WIRED (don't re-check)

### IPC Layer — COMPLETE
- All 80+ invoke channels in src/shared/ipc-channels.ts have handlers in src/main/ipc/*.ts
- All send channels have corresponding event.sender.send() calls
- All preload/index.ts methods map to correct Ch.Invoke.* / Ch.Send.* constants
- preload/index.d.ts Api interface matches preload/index.ts api object

### Pipeline — COMPLETE
- All 9 stages wired: download, transcription, clip-mapping, thumbnail, loop-optimization, variant-generation, stitch-generation, face-detection, story-arc
- Each stage calls correct window.api methods and subscribes to progress events

### Render Invocation — WIRED
- ClipGrid.tsx, ClipCard.tsx, ClipPreview.tsx all call window.api.startBatchRender
- render-handlers.ts handles RENDER_START_BATCH with sound design computation
- render-handlers.ts handles RENDER_CANCEL, RENDER_PREVIEW, RENDER_CLEANUP_PREVIEW

### Main Process Modules — ALL IMPORTED AND REGISTERED
- 7 handler groups registered in src/main/index.ts
- Each handler file properly imports from domain modules

### Store — COMPLETE
- 6 slices: clips, settings, pipeline, project, history, errors
- All actions defined in types.ts are implemented across slices + index.ts

## STILL NEED TO VERIFY (check these files)

### 1. Render Event Listeners (CRITICAL)
WHERE are onRenderClipStart/Progress/Done/Error/BatchDone/Cancelled subscribed in the renderer?
Check: ClipGrid.tsx (around render function), App.tsx, any hooks
These listeners drive the render progress UI

### 2. B-Roll Rendering
- window.api.generateBRollPlacements is wired (media-handlers.ts)
- But does the actual render pipeline USE b-roll placements? 
- Check: src/main/render/pipeline.ts for b-roll integration
- Store has BRollSettings but is it passed to startBatchRender?

### 3. Filler Removal 
- Store has FillerRemovalSettings but no IPC channel for it
- Is it implemented in the render pipeline? Or just UI settings?
- Check: src/main/render/ for filler removal logic

### 4. Emoji Burst + Fake Comment in Render
- IPC channels exist for identifying moments and building filters
- But are they called during rendering or just available?
- Check: render pipeline for emoji/fake-comment integration

### 5. Description Generator UI
- IPC wired: AI_GENERATE_CLIP_DESCRIPTION, AI_GENERATE_BATCH_DESCRIPTIONS
- Where called from renderer? Check ClipCard.tsx, ClipGrid.tsx

### 6. Export Functions UI
- EXPORT_DESCRIPTIONS and EXPORT_GENERATE_MANIFEST wired in IPC
- Where called from renderer? Check ClipGrid.tsx, SettingsPanel.tsx

### 7. Auto Mode
- Store has autoMode config
- Where is auto-approve + auto-render triggered? Check notification-stage.ts, ClipGrid.tsx

### 8. Resource Monitor
- ResourceMonitor.tsx component exists
- Does it call window.api.getResourceUsage? Where rendered?

### 9. Settings Profiles
- Store has saveProfile/loadProfile/deleteProfile/renameProfile
- Where is UI? Check SettingsPanel.tsx

### 10. Python Setup
- SetupWizard.tsx exists
- Does it call getPythonStatus, startPythonSetup, listen to progress?

### 11. AI Token Usage Listener
- window.api.onAiTokenUsage in preload
- Where subscribed in renderer? Does it call store.trackTokenUsage?

### 12. ClipOverrides Passthrough to Render
- Store has setClipOverride per clip
- Does startBatchRender in ClipGrid/ClipCard pass overrides through?
- Check: render-handlers.ts for clipOverrides field on jobs

### 13. Waveform Display
- WaveformDisplay.tsx exists
- Does it call window.api.getWaveform?

### 14. Template Editor
- TemplateEditor.tsx exists
- Does it interact with templateLayout store state?

### 15. Recent Projects
- RecentProjects.tsx exists  
- Does it call getRecentProjects/loadProjectFromPath/removeRecentProject?

### 16. Stitched Clip Rendering
- StitchedClipCard.tsx exists
- When user approves stitched clips, are they included in batch render?
- Check: ClipGrid.tsx for stitched clip render jobs

### 17. renderPreview
- Wired in IPC but where called from renderer? Check ClipPreview.tsx

### 18. Notifications
- window.api.sendNotification wired
- notification-stage.ts exists — does it call it?

### 19. Project Save/Load/AutoSave/Recovery
- All IPC wired
- Check: services/project-service.ts, useAutosave.ts, App.tsx

### 20. Online/Offline Detection
- OfflineBanner.tsx exists
- useOnlineStatus.ts exists
- Store has isOnline/setIsOnline

## KEY FILES STILL TO READ
- src/renderer/src/components/ClipGrid.tsx (render listener wiring, export, descriptions)
- src/renderer/src/components/ClipCard.tsx (overrides passthrough)
- src/renderer/src/components/ClipPreview.tsx (preview render)
- src/renderer/src/components/SettingsPanel.tsx (profiles, b-roll, filler removal UI)
- src/renderer/src/App.tsx (token usage listener, python setup, autosave init)
- src/renderer/src/hooks/pipeline-stages/notification-stage.ts
- src/renderer/src/hooks/useAutosave.ts
- src/renderer/src/components/ResourceMonitor.tsx
- src/renderer/src/components/SetupWizard.tsx
- src/renderer/src/components/RecentProjects.tsx
- src/renderer/src/components/TemplateEditor.tsx
- src/renderer/src/components/WaveformDisplay.tsx
- src/renderer/src/components/StitchedClipCard.tsx
- src/main/render/pipeline.ts (b-roll, emoji, fake-comment, filler removal integration)
- src/main/render/types.ts (RenderClipJob fields)
