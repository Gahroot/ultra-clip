import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { AppState, QueueResult, SourceVideo, TranscriptionData, RenderProgress, TemplateLayout, PipelineStage } from './types'
import {
  persistSettings,
  persistProcessingConfig,
  extractProfileFromSettings,
  DEFAULT_PIPELINE,
  DEFAULT_TEMPLATE_LAYOUT,
} from './helpers'
import { createClipsSlice } from './clips-slice'
import { createSettingsSlice } from './settings-slice'
import { createPipelineSlice } from './pipeline-slice'
import { createProjectSlice } from './project-slice'
import { createHistorySlice } from './history-slice'
import { createErrorsSlice } from './errors-slice'

/** Maximum number of AI usage history entries to keep in memory. */
const MAX_AI_USAGE_HISTORY = 200

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
        state.sources = state.sources.filter((s) => s.id !== id)
        delete state.transcriptions[id]
        delete state.clips[id]
        if (state.activeSourceId === id) state.activeSourceId = null
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
  }
  if (state.processingConfig !== prevState.processingConfig) {
    persistProcessingConfig(state.processingConfig)
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
    state.settings.minScore !== prevState.settings.minScore
  ) {
    queueMicrotask(() => useStore.setState({ isDirty: true }))
  }
})

// ---------------------------------------------------------------------------
// Debounced auto-save — moved to services/project-service.ts
// The service module is imported in App.tsx which activates the subscriber.
// ---------------------------------------------------------------------------
