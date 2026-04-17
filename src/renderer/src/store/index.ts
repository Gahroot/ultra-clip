import { create } from 'zustand'
import { enableMapSet } from 'immer'
import { immer } from 'zustand/middleware/immer'

// Enable Immer's MapSet plugin so Set/Map values work in the store
enableMapSet()
import type { AppState, QueueResult, SourceVideo, TranscriptionData, RenderProgress, TemplateLayout, PipelineStage, VideoSegment, EditStyle, Archetype, SegmentStyleCategory } from './types'
import {
  persistSettings,
  persistProcessingConfig,
  extractProfileFromSettings,
  loadPersistedSettings,
  loadPersistedProcessingConfig,
  DEFAULT_PIPELINE,
  DEFAULT_TEMPLATE_LAYOUT,
} from './helpers'
import { broadcastSettingsChange, listenForSettingsChanges } from './settings-sync'
import { createClipsSlice } from './clips-slice'
import { createSettingsSlice } from './settings-slice'
import { createPipelineSlice } from './pipeline-slice'
import { createProjectSlice } from './project-slice'
import { createHistorySlice } from './history-slice'
import { createErrorsSlice } from './errors-slice'

/** Maximum number of AI usage history entries to keep in memory. */
const MAX_AI_USAGE_HISTORY = 200

/** Mirror of ARCHETYPE_TO_CATEGORY from src/main/edit-styles/shared/archetypes.ts.
 *  The main-process module can't be imported into the renderer, so we keep a
 *  local copy here — the 8 archetypes are stable and version-locked. */
const ARCHETYPE_TO_CATEGORY: Record<Archetype, SegmentStyleCategory> = {
  'talking-head': 'main-video',
  'tight-punch': 'main-video',
  'wide-breather': 'main-video',
  'quote-lower': 'main-video-text',
  'split-image': 'main-video-images',
  'fullscreen-image': 'fullscreen-image',
  'fullscreen-quote': 'fullscreen-text',
  'fullscreen-headline': 'fullscreen-text'
}

/**
 * Thunk: re-run the AI segment styler across every clip's segments after a
 * global edit-style change. Results are token-checked so rapid style switches
 * ignore stale responses.
 */
async function restyleAllSegments(
  get: () => AppState,
  set: (fn: (state: AppState) => void) => void,
  styleId: string,
  token: number
): Promise<void> {
  const state = get()
  const apiKey = state.settings?.geminiApiKey?.trim() || ''
  const hasFalKey = Boolean(state.settings?.falApiKey?.trim())
  const clipIds = Object.keys(state.segments)

  await Promise.all(
    clipIds.map(async (clipId) => {
      const segs = get().segments[clipId]
      if (!segs || segs.length === 0) {
        set((s) => {
          for (const key of Object.keys(s.segmentStylingPending)) {
            if (key.startsWith(`${clipId}:`)) delete s.segmentStylingPending[key]
          }
        })
        return
      }
      try {
        const styled = await window.api.assignSegmentStyles(segs, styleId, apiKey || undefined, hasFalKey)
        if (get().editStyleChangeToken !== token) return // stale
        set((s) => {
          s.segments[clipId] = styled as VideoSegment[]
          for (const key of Object.keys(s.segmentStylingPending)) {
            if (key.startsWith(`${clipId}:`)) delete s.segmentStylingPending[key]
          }
        })
      } catch (err) {
        if (get().editStyleChangeToken !== token) return
        set((s) => {
          for (const key of Object.keys(s.segmentStylingPending)) {
            if (key.startsWith(`${clipId}:`)) delete s.segmentStylingPending[key]
          }
        })
        // eslint-disable-next-line no-console
        console.warn(`[store] Failed to re-style segments for clip ${clipId}`, err)
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<AppState>()(immer((...a) => {
  const [set, get] = a
  return {
    // --- Slices ---
    ...createClipsSlice(...a),
    ...createSettingsSlice(...a),
    ...createPipelineSlice(...a),
    ...createProjectSlice(...a),
    ...createHistorySlice(...a),
    ...createErrorsSlice(...a),

    // --- Sources ---
    sources: [],
    activeSourceId: null,
    transcriptions: {},

    addSource: (source: SourceVideo) =>
      set((state) => { state.sources.push(source) }),

    removeSource: (id: string) =>
      set((state) => {
        // Clean up per-clip undo stacks for clips belonging to this source
        const clipIds = (state.clips[id] ?? []).map((c) => c.id)
        const undoStacks = { ...state._clipUndoStacks }
        const redoStacks = { ...state._clipRedoStacks }
        for (const cid of clipIds) {
          delete undoStacks[cid]
          delete redoStacks[cid]
        }
        if (state._lastEditedSourceId === id) {
          state._lastEditedClipId = null
          state._lastEditedSourceId = null
        }

        state.sources = state.sources.filter((s) => s.id !== id)
        delete state.transcriptions[id]
        delete state.clips[id]
        if (state.activeSourceId === id) state.activeSourceId = null
        state._clipUndoStacks = undoStacks
        state._clipRedoStacks = redoStacks
      }),

    setActiveSource: (id: string | null) => set({ activeSourceId: id }),

    setTranscription: (sourceId: string, data: TranscriptionData) =>
      set((state) => { state.transcriptions[sourceId] = data }),

    getActiveSource: () => {
      const { sources, activeSourceId } = get()
      return sources.find((s) => s.id === activeSourceId) ?? null
    },

    getActiveTranscription: () => {
      const { transcriptions, activeSourceId } = get()
      if (!activeSourceId) return null
      return transcriptions[activeSourceId] ?? null
    },

    // --- Render ---
    renderProgress: [],
    isRendering: false,
    activeEncoder: null,
    renderStartedAt: null,
    renderCompletedAt: null,
    clipRenderTimes: {},
    renderErrors: {},
    singleRenderClipId: null,
    singleRenderProgress: 0,
    singleRenderStatus: 'idle' as const,
    singleRenderOutputPath: null,
    singleRenderError: null,

    setRenderProgress: (progress: RenderProgress[]) => set({ renderProgress: progress }),

    setIsRendering: (rendering: boolean) => {
      const now = Date.now()
      if (rendering) {
        set({ isRendering: true, renderStartedAt: now, renderCompletedAt: null, clipRenderTimes: {} })
      } else {
        set({ isRendering: false, renderCompletedAt: now })
      }
    },

    setRenderError: (clipId: string, error: string) =>
      set((state) => { state.renderErrors[clipId] = error }),

    clearRenderErrors: () => set({ renderErrors: {} }),

    setSingleRenderState: (patch) =>
      set((state) => {
        if (patch.clipId !== undefined) state.singleRenderClipId = patch.clipId
        if (patch.progress !== undefined) state.singleRenderProgress = patch.progress
        if (patch.status !== undefined) state.singleRenderStatus = patch.status
        if (patch.outputPath !== undefined) state.singleRenderOutputPath = patch.outputPath
        if (patch.error !== undefined) state.singleRenderError = patch.error
      }),

    // --- Theme ---
    theme: (localStorage.getItem('batchcontent-theme') as 'light' | 'dark' | 'system') ?? 'dark',
    setTheme: (theme: 'light' | 'dark' | 'system') => {
      localStorage.setItem('batchcontent-theme', theme)
      set({ theme })
    },

    // --- Network ---
    isOnline: navigator.onLine,
    setIsOnline: (online: boolean) => set({ isOnline: online }),

    // --- Onboarding ---
    hasCompletedOnboarding: localStorage.getItem('batchcontent-onboarding-done') === 'true',
    setOnboardingComplete: () => {
      localStorage.setItem('batchcontent-onboarding-done', 'true')
      set({ hasCompletedOnboarding: true })
    },

    // --- What's New ---
    lastSeenVersion: localStorage.getItem('batchcontent-last-seen-version') ?? null,
    setLastSeenVersion: (version: string) => {
      localStorage.setItem('batchcontent-last-seen-version', version)
      set({ lastSeenVersion: version })
    },

    // --- Segment Editor ---
    segments: {},
    editStyles: [],
    selectedEditStyleId: 'prestyj',
    selectedSegmentIndex: 0,
    segmentStylingPending: {},
    editStyleChangeToken: 0,

    setSegments: (clipId: string, segs: VideoSegment[]) =>
      set((state) => { state.segments[clipId] = segs }),

    updateSegment: (clipId: string, segmentId: string, updates: Partial<VideoSegment>) =>
      set((state) => {
        const segs = state.segments[clipId]
        if (!segs) return
        const idx = segs.findIndex((s) => s.id === segmentId)
        if (idx === -1) return
        Object.assign(segs[idx], updates)
      }),

    updateSegmentTransition: (clipId: string, segmentIndex: number, transitionType) =>
      set((state) => {
        const segs = state.segments[clipId]
        if (!segs || !segs[segmentIndex]) return
        segs[segmentIndex].transitionIn = transitionType
      }),

    setSegmentArchetype: (clipId: string, segmentId: string, archetype: Archetype) =>
      set((state) => {
        const segs = state.segments[clipId]
        if (!segs) return
        const idx = segs.findIndex((s) => s.id === segmentId)
        if (idx === -1) return
        segs[idx].archetype = archetype
        segs[idx].segmentStyleCategory = ARCHETYPE_TO_CATEGORY[archetype]
        // Manual archetype swap invalidates any prior fallback record — the
        // next render will recompute whether degradation is still needed.
        segs[idx].fallbackReason = undefined
      }),

    setAllSegmentsArchetype: (clipId: string, archetype: Archetype) =>
      set((state) => {
        const segs = state.segments[clipId]
        if (!segs) return
        for (const seg of segs) {
          seg.archetype = archetype
          seg.segmentStyleCategory = ARCHETYPE_TO_CATEGORY[archetype]
          seg.fallbackReason = undefined
        }
      }),

    setSegmentFallbackReason: (clipId: string, segmentIndex: number, reason: string | undefined) =>
      set((state) => {
        const segs = state.segments[clipId]
        if (!segs || !segs[segmentIndex]) return
        segs[segmentIndex].fallbackReason = reason
      }),

    restyleOneClip: async (clipId: string) => {
      const state = get()
      const segs = state.segments[clipId]
      const styleId = state.selectedEditStyleId
      if (!segs || segs.length === 0 || !styleId) return
      const apiKey = state.settings?.geminiApiKey?.trim() || ''
      const hasFalKey = Boolean(state.settings?.falApiKey?.trim())
      set((s) => {
        for (const seg of segs) s.segmentStylingPending[`${clipId}:${seg.id}`] = true
      })
      try {
        const styled = await window.api.assignSegmentStyles(
          segs,
          styleId,
          apiKey || undefined,
          hasFalKey
        )
        set((s) => {
          s.segments[clipId] = styled as VideoSegment[]
          for (const key of Object.keys(s.segmentStylingPending)) {
            if (key.startsWith(`${clipId}:`)) delete s.segmentStylingPending[key]
          }
        })
      } catch (err) {
        set((s) => {
          for (const key of Object.keys(s.segmentStylingPending)) {
            if (key.startsWith(`${clipId}:`)) delete s.segmentStylingPending[key]
          }
        })
        // eslint-disable-next-line no-console
        console.warn(`[store] Failed to re-style segments for clip ${clipId}`, err)
      }
    },

    setEditStyles: (styles: EditStyle[]) => set({ editStyles: styles }),

    setSelectedEditStyleId: (styleId: string | null) => {
      const prev = get().selectedEditStyleId
      if (prev === styleId) return
      const nextToken = get().editStyleChangeToken + 1
      set((state) => {
        state.selectedEditStyleId = styleId
        state.editStyleChangeToken = nextToken
        // Mark every existing segment pending (normal + stitched share this record).
        for (const clipId of Object.keys(state.segments)) {
          for (const seg of state.segments[clipId]) {
            state.segmentStylingPending[`${clipId}:${seg.id}`] = true
          }
        }
      })
      if (styleId) {
        void restyleAllSegments(get, set, styleId, nextToken)
      } else {
        set((state) => { state.segmentStylingPending = {} })
      }
    },

    clearSegmentStylingPending: (clipId?: string) =>
      set((state) => {
        if (!clipId) {
          state.segmentStylingPending = {}
          return
        }
        for (const key of Object.keys(state.segmentStylingPending)) {
          if (key.startsWith(`${clipId}:`)) delete state.segmentStylingPending[key]
        }
      }),

    setSelectedSegmentIndex: (index: number) => set({ selectedSegmentIndex: index }),

    // --- Clip Comparison ---
    comparisonClipIds: null,
    setComparisonClips: (idA: string, idB: string) => set({ comparisonClipIds: [idA, idB] }),
    clearComparison: () => set({ comparisonClipIds: null }),

    // --- Template Layout ---
    templateLayout: DEFAULT_TEMPLATE_LAYOUT,
    setTemplateLayout: (layout: TemplateLayout) => set({ templateLayout: layout }),

    // --- Target Platform ---
    targetPlatform: 'universal',
    setTargetPlatform: (platform) => set({ targetPlatform: platform }),

    // --- AI Token Usage ---
    aiUsage: {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCalls: 0,
      callHistory: [],
      sessionStarted: Date.now()
    },

    trackTokenUsage: (event) =>
      set((state) => {
        state.aiUsage.totalPromptTokens += event.promptTokens
        state.aiUsage.totalCompletionTokens += event.completionTokens
        state.aiUsage.totalCalls += 1
        if (state.aiUsage.callHistory.length >= MAX_AI_USAGE_HISTORY) {
          state.aiUsage.callHistory = [...state.aiUsage.callHistory.slice(-(MAX_AI_USAGE_HISTORY - 1)), event]
        } else {
          state.aiUsage.callHistory.push(event)
        }
      }),

    resetAiUsage: () =>
      set({
        aiUsage: {
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalCalls: 0,
          callHistory: [],
          sessionStarted: Date.now()
        }
      }),

    // --- Batch Queue ---
    processingQueue: [],
    queueMode: false,
    queuePaused: false,
    queueResults: {},

    enqueueSources: (sourceIds: string[]) => {
      const initialResults: Record<string, QueueResult> = {}
      for (const id of sourceIds) {
        initialResults[id] = { status: 'pending' }
      }
      set((state) => ({
        processingQueue: sourceIds,
        queueMode: true,
        queuePaused: false,
        queueResults: { ...state.queueResults, ...initialResults }
      }))
    },

    dequeueNext: () => {
      const { processingQueue } = get()
      if (processingQueue.length === 0) return null
      const [next, ...rest] = processingQueue
      set({ processingQueue: rest })
      return next
    },

    markQueueItemProcessing: (sourceId: string) =>
      set((state) => { state.queueResults[sourceId] = { status: 'processing' } }),

    markQueueItemDone: (sourceId: string, clipCount: number) =>
      set((state) => { state.queueResults[sourceId] = { status: 'done', clipCount } }),

    markQueueItemError: (sourceId: string, error: string) =>
      set((state) => { state.queueResults[sourceId] = { status: 'error', error } }),

    pauseQueue: () => set({ queuePaused: true }),
    resumeQueue: () => set({ queuePaused: false }),

    clearQueue: () =>
      set({
        processingQueue: [],
        queueMode: false,
        queuePaused: false,
        queueResults: {}
      }),

    skipQueueItem: () => {
      const { processingQueue, activeSourceId, queueResults } = get()
      if (processingQueue.length === 0) {
        set({ queueMode: false })
        return
      }
      const updated: Record<string, QueueResult> = { ...queueResults }
      if (activeSourceId && updated[activeSourceId]?.status === 'processing') {
        updated[activeSourceId] = { status: 'error', error: 'Skipped' }
      }
      set({ queueResults: updated })
    },
  }
}))

// ---------------------------------------------------------------------------
// Auto-persist settings & processing config on change
// ---------------------------------------------------------------------------

useStore.subscribe((state, prevState) => {
  if (state.settings !== prevState.settings) {
    persistSettings(state.settings)
    broadcastSettingsChange()
  }
  if (state.processingConfig !== prevState.processingConfig) {
    persistProcessingConfig(state.processingConfig)
    broadcastSettingsChange()
  }
})

// ---------------------------------------------------------------------------
// Settings lock — detect changes against snapshot
// ---------------------------------------------------------------------------

useStore.subscribe((state, prevState) => {
  if (!state.settingsSnapshot || state.settings === prevState.settings) return
  const current = extractProfileFromSettings(state.settings)
  const snap = state.settingsSnapshot
  const changed = JSON.stringify(current) !== JSON.stringify(snap)
  if (changed !== state.settingsChanged) {
    queueMicrotask(() => useStore.setState({ settingsChanged: changed }))
  }
})

// ---------------------------------------------------------------------------
// Dirty tracking — mark isDirty when meaningful project data changes
// ---------------------------------------------------------------------------

useStore.subscribe((state, prevState) => {
  if (state.isDirty) return
  if (
    state.clips !== prevState.clips ||
    state.stitchedClips !== prevState.stitchedClips ||
    state.storyArcs !== prevState.storyArcs ||
    state.segments !== prevState.segments ||
    state.clipOrder !== prevState.clipOrder ||
    state.settings.minScore !== prevState.settings.minScore
  ) {
    queueMicrotask(() => useStore.setState({ isDirty: true }))
  }
})

// ---------------------------------------------------------------------------
// Cross-window settings sync (BroadcastChannel)
// ---------------------------------------------------------------------------

listenForSettingsChanges(() => {
  const freshSettings = loadPersistedSettings()
  const freshConfig = loadPersistedProcessingConfig()
  useStore.setState({ settings: freshSettings, processingConfig: freshConfig })
})

// ---------------------------------------------------------------------------
// Debounced auto-save — moved to services/project-service.ts
// The service module is imported in App.tsx which activates the subscriber.
// ---------------------------------------------------------------------------
