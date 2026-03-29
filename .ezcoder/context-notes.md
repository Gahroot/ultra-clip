# Context Notes for Sidebar Implementation

## Key Types/Imports
- ClipCandidate, RenderProgress, ClipRenderSettings imported from '../store'
- FilterTab = 'all' | 'approved' | 'rejected' | 'pending' (defined in ClipGrid.tsx line 120)
- SortMode = 'score' | 'time' | 'duration' | 'custom' (defined in ClipGrid.tsx line 121)
- Store hooks: useStore from '../store'
- DEFAULT_HOOK_TEMPLATES, applyHookTemplate from '../store'
- cn from '@/lib/utils', getScoreDescription from '@/lib/utils'
- formatTime from './EditableTime'
- WaveformDisplay from './WaveformDisplay'
- EditableTime from './EditableTime'

## ClipPreview.tsx Structure (1778 lines)
- Lines 1-55: imports
- Lines 61-69: scoreBadgeClass(score) helper
- Lines 75-146: DualSlider component
- Lines 152-218: OverrideRow component
- Lines 224-240: ClipPreviewProps interface + component start
- Lines 241-297: Store hooks (updateClipTrim, updateClipHookText, setClipCustomThumbnail, setClipOverride, clearClipOverrides, rescoreClip, setSingleRenderState, addError, isRendering, singleRenderClipId, singleRenderProgress, singleRenderStatus, singleRenderOutputPath, settings, hookTemplates, activeHookTemplateId)
- Lines 270-303: Local state (localStart, localEnd, localHook, localTemplateId, editingHook, isPlaying, currentTime, showReasoning, showOverrides, viewMode, isRescoring, rescoreError, lastRescoreResult, thumbnailCaptured, previewPath, previewLoading, previewError, showPreview, origStart, origEnd, videoRef, videoDims, waveformData, waveformLoading)
- Lines 318-320: Slider bounds (sliderMin, sliderMax)
- Lines 322-361: useEffects for sync, seek, waveform
- Lines 363-507: Handlers (handleWaveformSeek, handleTimeUpdate, handlePlayPause, handleVideoClick, handleStartChange, handleEndChange, handleApply, handleReset, handleWordClick, handleCaptureThumbnail, handleRescore)
- Lines 509-575: handleRenderThisClip
- Lines 577-727: Override handlers, effective settings, preview handler
- Lines 731-1777: JSX (Dialog wrapping DialogContent)

## ClipGrid.tsx Structure (2679 lines)
- Lines 1-99: imports
- Lines 100-121: helpers (formatRenderDuration, FilterTab, SortMode types)
- Lines 127-201: SortableClipCard wrapper
- Lines 207-211: BatchResult interface
- Lines 213-500: ClipGrid component start + all store hooks + local state + displayedClips memo
- Lines 500-1092: Business logic (handleApproveAll, handleRejectAll, handleStartRender, handleRetryFailed)
- Lines 1094-1365: More logic (auto-mode, cancel, export, render progress helpers)
- Lines 1366-1396: Empty state returns
- Lines 1398-2678: Main JSX return
  - Lines 1400-1897: Header bar (two rows)
    - Row 1 (1403-1741): counts + approve/reject + batch copy + export + render button
    - Row 2 (1744-1896): filter tabs + sort + search + undo/redo + min score slider + compare + view toggle
  - Line 1900: ClipStats component
  - Lines 1902-1955: Compare mode / auto-mode banners
  - Lines 1957-2141: Batch select toolbar
  - Lines 2143-2249: Render progress banner
  - Lines 2252-2389: Batch result banner
  - Lines 2391-2593: **THE GRID/TIMELINE CONTENT (to replace)**
  - Lines 2595-2678: Confirmation dialogs, settings warning, clip comparison

## What to do
1. Create ClipSidebar.tsx - new file
2. Create ClipEditor.tsx - extract from ClipPreview but inline (no Dialog)
3. Modify ClipGrid.tsx:
   - Remove bottom row of header (filters, sort, search, min score, compare, view toggle) - lines 1743-1897
   - Remove ClipStats line 1900
   - Remove compare mode banner lines 1902-1927
   - Replace lines 2391-2593 with sidebar+editor layout
   - Remove compare state/handlers
   - Remove DnD imports and SortableClipCard
   - Remove view mode toggle state (clipViewMode)
