import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppState,
  AppSettings,
  ProcessingConfig,
  AutoModeConfig,
  SettingsProfile,
  HookTextTemplate,
  RenderQualitySettings,
} from './types'
import type {
  MusicTrack,
  ZoomIntensity,
  ZoomMode,
  HookTitleStyle,
  RehookStyle,
  ProgressBarPosition,
  ProgressBarStyle,
  LogoPosition,
  OutputAspectRatio,
  PythonSetupState,
  BRollDisplayMode,
  BRollTransition,
  SFXStyle,
} from './types'
import {
  DEFAULT_SETTINGS,
  DEFAULT_PROCESSING_CONFIG,
  loadPersistedSettings,
  loadPersistedProcessingConfig,
  extractProfileFromSettings,
  applyProfileToSettings,
  loadPersistedProfiles,
  loadActiveProfileName,
  persistProfiles,
  persistActiveProfileName,
  loadHookTemplatesFromStorage,
  saveHookTemplatesToStorage,
  ACTIVE_HOOK_TEMPLATE_KEY,
} from './helpers'
import { _pushUndo } from './history-slice'

// ---------------------------------------------------------------------------
// Settings Slice
// ---------------------------------------------------------------------------

export interface SettingsSlice {
  settings: AppSettings
  processingConfig: ProcessingConfig
  autoMode: AutoModeConfig
  autoModeResult: { sourceId: string; approved: number; threshold: number; didRender: boolean } | null
  settingsProfiles: Record<string, SettingsProfile>
  activeProfileName: string | null
  hookTemplates: HookTextTemplate[]
  activeHookTemplateId: string | null
  settingsSnapshot: SettingsProfile | null
  settingsChanged: boolean

  // Hydrate API keys from main-process encrypted store (safeStorage).
  // Also performs a one-time migration from any legacy localStorage values.
  hydrateSecretsFromMain: () => Promise<void>

  // Settings setters
  setGeminiApiKey: (key: string) => void
  setOutputDirectory: (dir: string) => void
  setMinScore: (score: number) => void
  setSoundDesignEnabled: (enabled: boolean) => void
  setSoundDesignTrack: (track: MusicTrack) => void
  setSoundDesignSfxVolume: (volume: number) => void
  setSoundDesignMusicVolume: (volume: number) => void
  setSoundDesignMusicDucking: (enabled: boolean) => void
  setSoundDesignMusicDuckLevel: (level: number) => void
  setSoundDesignSfxStyle: (style: SFXStyle) => void
  setAutoZoomEnabled: (enabled: boolean) => void
  setAutoZoomMode: (mode: ZoomMode) => void
  setAutoZoomIntensity: (intensity: ZoomIntensity) => void
  setAutoZoomInterval: (seconds: number) => void
  setHookTitleEnabled: (enabled: boolean) => void
  setHookTitleStyle: (style: HookTitleStyle) => void
  setHookTitleDisplayDuration: (seconds: number) => void
  setHookTitleFontSize: (px: number) => void
  setHookTitleTextColor: (color: string) => void
  setHookTitleOutlineColor: (color: string) => void
  setHookTitleOutlineWidth: (px: number) => void
  setHookTitleFadeIn: (seconds: number) => void
  setHookTitleFadeOut: (seconds: number) => void
  setRehookEnabled: (enabled: boolean) => void
  setRehookStyle: (style: RehookStyle) => void
  setRehookDisplayDuration: (seconds: number) => void
  setRehookPositionFraction: (fraction: number) => void
  setProgressBarEnabled: (enabled: boolean) => void
  setProgressBarPosition: (position: ProgressBarPosition) => void
  setProgressBarHeight: (height: number) => void
  setProgressBarColor: (color: string) => void
  setProgressBarOpacity: (opacity: number) => void
  setProgressBarStyle: (style: ProgressBarStyle) => void
  setBrandKitEnabled: (enabled: boolean) => void
  setBrandKitLogoPath: (path: string | null) => void
  setBrandKitLogoPosition: (position: LogoPosition) => void
  setBrandKitLogoScale: (scale: number) => void
  setBrandKitLogoOpacity: (opacity: number) => void
  setBrandKitIntroBumperPath: (path: string | null) => void
  setBrandKitOutroBumperPath: (path: string | null) => void
  setBRollEnabled: (enabled: boolean) => void
  setBRollPexelsApiKey: (key: string) => void
  setBRollIntervalSeconds: (seconds: number) => void
  setBRollClipDuration: (seconds: number) => void
  setBRollDisplayMode: (mode: BRollDisplayMode) => void
  setBRollTransition: (transition: BRollTransition) => void
  setBRollPipSize: (size: number) => void
  setBRollPipPosition: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void
  setBRollSourceMode: (sourceMode: 'stock' | 'ai-generated' | 'auto') => void
  setFillerRemovalEnabled: (enabled: boolean) => void
  setFillerRemovalFillerWords: (enabled: boolean) => void
  setFillerRemovalSilences: (enabled: boolean) => void
  setFillerRemovalRepeats: (enabled: boolean) => void
  setFillerRemovalSilenceThreshold: (seconds: number) => void
  setFillerRemovalWordList: (words: string[]) => void
  setEnableNotifications: (enabled: boolean) => void
  setDeveloperMode: (enabled: boolean) => void
  setRenderQuality: (quality: Partial<RenderQualitySettings>) => void
  setOutputAspectRatio: (ratio: OutputAspectRatio) => void
  setFilenameTemplate: (template: string) => void
  setRenderConcurrency: (concurrency: number) => void
  resetSettings: () => void
  resetSection: (section: 'captions' | 'soundDesign' | 'autoZoom' | 'brandKit' | 'hookTitle' | 'rehook' | 'progressBar' | 'fillerRemoval' | 'broll' | 'aiSettings' | 'renderQuality') => void

  // Processing config
  setProcessingConfig: (config: Partial<ProcessingConfig>) => void
  resetProcessingConfig: () => void

  // Auto mode
  setAutoMode: (config: Partial<AutoModeConfig>) => void
  setAutoModeResult: (result: { sourceId: string; approved: number; threshold: number; didRender: boolean } | null) => void

  // Hook templates
  setActiveHookTemplateId: (id: string | null) => void
  addHookTemplate: (template: Omit<HookTextTemplate, 'id' | 'builtIn'>) => void
  editHookTemplate: (id: string, updates: Partial<Pick<HookTextTemplate, 'name' | 'template' | 'emoji'>>) => void
  removeHookTemplate: (id: string) => void

  // Settings lock
  snapshotSettings: () => void
  clearSettingsSnapshot: () => void
  revertToSnapshot: () => void
  dismissSettingsWarning: () => void
  getSettingsDiff: () => string[]

  // Profiles
  saveProfile: (name: string) => void
  loadProfile: (name: string) => void
  deleteProfile: (name: string) => void
  renameProfile: (oldName: string, newName: string) => void
}

export const createSettingsSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: loadPersistedSettings(),
  processingConfig: loadPersistedProcessingConfig(),
  autoMode: { enabled: false, approveThreshold: 80, autoRender: false },
  autoModeResult: null,
  settingsProfiles: loadPersistedProfiles(),
  activeProfileName: loadActiveProfileName(),
  hookTemplates: loadHookTemplatesFromStorage(),
  activeHookTemplateId: localStorage.getItem(ACTIVE_HOOK_TEMPLATE_KEY) ?? null,
  settingsSnapshot: null,
  settingsChanged: false,

  // --- Secrets hydration (migration + async load) ---

  hydrateSecretsFromMain: async () => {
    const secrets = window.api?.secrets
    if (!secrets) return

    // One-time migration from legacy plaintext localStorage entries into
    // safeStorage. After migration the plaintext copy is removed.
    const migrations: Array<[secretName: string, legacyKey: string]> = [
      ['gemini', 'batchcontent-gemini-key'],
      ['pexels', 'batchcontent-pexels-key'],
    ]
    await Promise.all(
      migrations.map(async ([name, legacyKey]) => {
        const legacy = localStorage.getItem(legacyKey)
        if (!legacy) return
        try {
          await secrets.set(name, legacy)
          localStorage.removeItem(legacyKey)
        } catch (err) {
          console.warn(`[secrets] Failed to migrate legacy ${name} key:`, err)
        }
      })
    )

    try {
      const [gemini, pexels] = await Promise.all([
        secrets.get('gemini'),
        secrets.get('pexels'),
      ])
      set((state) => {
        if (gemini) state.settings.geminiApiKey = gemini
        if (pexels) state.settings.broll.pexelsApiKey = pexels
      })
    } catch (err) {
      console.warn('[secrets] Failed to hydrate secrets from main:', err)
    }
  },

  // --- Settings ---

  setGeminiApiKey: (key) => {
    // Persist encrypted via Electron safeStorage (falls back to plain base64
    // in tests / non-electron environments where window.api is unavailable).
    void window.api?.secrets?.set('gemini', key)
    set((state) => { state.settings.geminiApiKey = key })
  },

  setOutputDirectory: (dir) =>
    set((state) => { state.settings.outputDirectory = dir }),

  setMinScore: (score) => {
    _pushUndo(get(), set)
    set((state) => { state.settings.minScore = score })
  },

  setSoundDesignEnabled: (enabled) =>
    set((state) => { state.settings.soundDesign.enabled = enabled }),

  setSoundDesignTrack: (track) =>
    set((state) => { state.settings.soundDesign.backgroundMusicTrack = track }),

  setSoundDesignSfxVolume: (volume) =>
    set((state) => { state.settings.soundDesign.sfxVolume = volume }),

  setSoundDesignMusicVolume: (volume) =>
    set((state) => { state.settings.soundDesign.musicVolume = volume }),

  setSoundDesignMusicDucking: (musicDucking) =>
    set((state) => { state.settings.soundDesign.musicDucking = musicDucking }),

  setSoundDesignMusicDuckLevel: (musicDuckLevel) =>
    set((state) => { state.settings.soundDesign.musicDuckLevel = musicDuckLevel }),

  setSoundDesignSfxStyle: (sfxStyle) =>
    set((state) => { state.settings.soundDesign.sfxStyle = sfxStyle }),

  setAutoZoomEnabled: (enabled) =>
    set((state) => { state.settings.autoZoom.enabled = enabled }),

  setAutoZoomMode: (mode) =>
    set((state) => { state.settings.autoZoom.mode = mode }),

  setAutoZoomIntensity: (intensity) =>
    set((state) => { state.settings.autoZoom.intensity = intensity }),

  setAutoZoomInterval: (intervalSeconds) =>
    set((state) => { state.settings.autoZoom.intervalSeconds = intervalSeconds }),

  // --- Hook Title Overlay ---

  setHookTitleEnabled: (enabled) =>
    set((state) => { state.settings.hookTitleOverlay.enabled = enabled }),

  setHookTitleStyle: (style) =>
    set((state) => { state.settings.hookTitleOverlay.style = style }),

  setHookTitleDisplayDuration: (displayDuration) =>
    set((state) => { state.settings.hookTitleOverlay.displayDuration = displayDuration }),

  setHookTitleFontSize: (fontSize) =>
    set((state) => { state.settings.hookTitleOverlay.fontSize = fontSize }),

  setHookTitleTextColor: (textColor) =>
    set((state) => { state.settings.hookTitleOverlay.textColor = textColor }),

  setHookTitleOutlineColor: (outlineColor) =>
    set((state) => { state.settings.hookTitleOverlay.outlineColor = outlineColor }),

  setHookTitleOutlineWidth: (outlineWidth) =>
    set((state) => { state.settings.hookTitleOverlay.outlineWidth = outlineWidth }),

  setHookTitleFadeIn: (fadeIn) =>
    set((state) => { state.settings.hookTitleOverlay.fadeIn = fadeIn }),

  setHookTitleFadeOut: (fadeOut) =>
    set((state) => { state.settings.hookTitleOverlay.fadeOut = fadeOut }),

  // --- Re-hook Overlay ---

  setRehookEnabled: (enabled) =>
    set((state) => { state.settings.rehookOverlay.enabled = enabled }),

  setRehookStyle: (style) =>
    set((state) => { state.settings.rehookOverlay.style = style }),

  setRehookDisplayDuration: (displayDuration) =>
    set((state) => { state.settings.rehookOverlay.displayDuration = displayDuration }),

  setRehookPositionFraction: (positionFraction) =>
    set((state) => { state.settings.rehookOverlay.positionFraction = positionFraction }),

  // --- Progress Bar Overlay ---

  setProgressBarEnabled: (enabled) =>
    set((state) => { state.settings.progressBarOverlay.enabled = enabled }),

  setProgressBarPosition: (position) =>
    set((state) => { state.settings.progressBarOverlay.position = position }),

  setProgressBarHeight: (height) =>
    set((state) => { state.settings.progressBarOverlay.height = height }),

  setProgressBarColor: (color) =>
    set((state) => { state.settings.progressBarOverlay.color = color }),

  setProgressBarOpacity: (opacity) =>
    set((state) => { state.settings.progressBarOverlay.opacity = opacity }),

  setProgressBarStyle: (style) =>
    set((state) => { state.settings.progressBarOverlay.style = style }),

  // --- Brand Kit ---

  setBrandKitEnabled: (enabled) =>
    set((state) => { state.settings.brandKit.enabled = enabled }),

  setBrandKitLogoPath: (path) =>
    set((state) => { state.settings.brandKit.logoPath = path }),

  setBrandKitLogoPosition: (position) =>
    set((state) => { state.settings.brandKit.logoPosition = position }),

  setBrandKitLogoScale: (scale) =>
    set((state) => { state.settings.brandKit.logoScale = scale }),

  setBrandKitLogoOpacity: (opacity) =>
    set((state) => { state.settings.brandKit.logoOpacity = opacity }),

  setBrandKitIntroBumperPath: (path) =>
    set((state) => { state.settings.brandKit.introBumperPath = path }),

  setBrandKitOutroBumperPath: (path) =>
    set((state) => { state.settings.brandKit.outroBumperPath = path }),

  // --- B-Roll ---

  setBRollEnabled: (enabled) =>
    set((state) => { state.settings.broll.enabled = enabled }),

  setBRollPexelsApiKey: (key) => {
    void window.api?.secrets?.set('pexels', key)
    set((state) => { state.settings.broll.pexelsApiKey = key })
  },

  setBRollIntervalSeconds: (intervalSeconds) =>
    set((state) => { state.settings.broll.intervalSeconds = intervalSeconds }),

  setBRollClipDuration: (clipDuration) =>
    set((state) => { state.settings.broll.clipDuration = clipDuration }),

  setBRollDisplayMode: (displayMode) =>
    set((state) => { state.settings.broll.displayMode = displayMode }),

  setBRollTransition: (transition) =>
    set((state) => { state.settings.broll.transition = transition }),

  setBRollPipSize: (pipSize) =>
    set((state) => { state.settings.broll.pipSize = pipSize }),

  setBRollPipPosition: (pipPosition) =>
    set((state) => { state.settings.broll.pipPosition = pipPosition }),

  setBRollSourceMode: (sourceMode) =>
    set((state) => { state.settings.broll.sourceMode = sourceMode }),

  // --- Filler Removal ---

  setFillerRemovalEnabled: (enabled) =>
    set((state) => { state.settings.fillerRemoval.enabled = enabled }),

  setFillerRemovalFillerWords: (removeFillerWords) =>
    set((state) => { state.settings.fillerRemoval.removeFillerWords = removeFillerWords }),

  setFillerRemovalSilences: (trimSilences) =>
    set((state) => { state.settings.fillerRemoval.trimSilences = trimSilences }),

  setFillerRemovalRepeats: (removeRepeats) =>
    set((state) => { state.settings.fillerRemoval.removeRepeats = removeRepeats }),

  setFillerRemovalSilenceThreshold: (silenceThreshold) =>
    set((state) => { state.settings.fillerRemoval.silenceThreshold = silenceThreshold }),

  setFillerRemovalWordList: (fillerWords) =>
    set((state) => { state.settings.fillerRemoval.fillerWords = fillerWords }),

  // --- Notifications ---

  setEnableNotifications: (enabled) =>
    set((state) => { state.settings.enableNotifications = enabled }),

  // --- Developer Mode ---

  setDeveloperMode: (enabled) =>
    set((state) => { state.settings.developerMode = enabled }),

  // --- Render Quality ---

  setRenderQuality: (quality) =>
    set((state) => { Object.assign(state.settings.renderQuality, quality) }),

  // --- Output Aspect Ratio ---

  setOutputAspectRatio: (ratio) =>
    set((state) => { state.settings.outputAspectRatio = ratio }),

  // --- Filename Template ---

  setFilenameTemplate: (template) =>
    set((state) => { state.settings.filenameTemplate = template }),

  // --- Render Concurrency ---

  setRenderConcurrency: (concurrency) =>
    set((state) => { state.settings.renderConcurrency = Math.max(1, Math.min(4, concurrency)) }),

  // --- Reset Settings ---

  resetSettings: () =>
    set((state) => {
      const apiKey = state.settings.geminiApiKey
      const outputDir = state.settings.outputDirectory
      const pexelsKey = state.settings.broll.pexelsApiKey
      Object.assign(state.settings, DEFAULT_SETTINGS)
      state.settings.geminiApiKey = apiKey
      state.settings.outputDirectory = outputDir
      state.settings.broll.pexelsApiKey = pexelsKey
    }),

  resetSection: (section) =>
    set((state) => {
      switch (section) {
        case 'aiSettings':
          state.settings.minScore = DEFAULT_SETTINGS.minScore
          break
        case 'soundDesign':
          state.settings.soundDesign = DEFAULT_SETTINGS.soundDesign
          break
        case 'autoZoom':
          state.settings.autoZoom = DEFAULT_SETTINGS.autoZoom
          break
        case 'brandKit':
          state.settings.brandKit = DEFAULT_SETTINGS.brandKit
          break
        case 'hookTitle':
          state.settings.hookTitleOverlay = DEFAULT_SETTINGS.hookTitleOverlay
          break
        case 'rehook':
          state.settings.rehookOverlay = DEFAULT_SETTINGS.rehookOverlay
          break
        case 'progressBar':
          state.settings.progressBarOverlay = DEFAULT_SETTINGS.progressBarOverlay
          break
        case 'fillerRemoval':
          state.settings.fillerRemoval = DEFAULT_SETTINGS.fillerRemoval
          break
        case 'broll': {
          const pexelsKey = state.settings.broll.pexelsApiKey
          state.settings.broll = { ...DEFAULT_SETTINGS.broll, pexelsApiKey: pexelsKey }
          break
        }
        case 'renderQuality':
          state.settings.renderQuality = DEFAULT_SETTINGS.renderQuality
          break
      }
    }),

  // --- Processing Config ---

  setProcessingConfig: (config) =>
    set((state) => { Object.assign(state.processingConfig, config) }),

  resetProcessingConfig: () => set({ processingConfig: DEFAULT_PROCESSING_CONFIG }),

  // --- Auto Mode ---

  setAutoMode: (config) =>
    set((state) => { Object.assign(state.autoMode, config) }),

  setAutoModeResult: (result) => set({ autoModeResult: result }),

  // --- Hook Text Templates ---

  setActiveHookTemplateId: (id) => {
    if (id === null) {
      localStorage.removeItem(ACTIVE_HOOK_TEMPLATE_KEY)
    } else {
      localStorage.setItem(ACTIVE_HOOK_TEMPLATE_KEY, id)
    }
    set({ activeHookTemplateId: id })
  },

  addHookTemplate: (template) => {
    const newTemplate: HookTextTemplate = { ...template, id: uuidv4(), builtIn: false }
    const updated = [...get().hookTemplates, newTemplate]
    saveHookTemplatesToStorage(updated)
    set({ hookTemplates: updated })
  },

  editHookTemplate: (id, updates) => {
    const updated = get().hookTemplates.map((t) =>
      t.id === id && !t.builtIn ? { ...t, ...updates } : t
    )
    saveHookTemplatesToStorage(updated)
    set({ hookTemplates: updated })
  },

  removeHookTemplate: (id) => {
    const updated = get().hookTemplates.filter((t) => t.id !== id || t.builtIn)
    saveHookTemplatesToStorage(updated)
    const activeHookTemplateId = get().activeHookTemplateId === id ? null : get().activeHookTemplateId
    if (activeHookTemplateId === null) localStorage.removeItem(ACTIVE_HOOK_TEMPLATE_KEY)
    set({ hookTemplates: updated, activeHookTemplateId })
  },

  // --- Settings Lock ---

  snapshotSettings: () => {
    const current = extractProfileFromSettings(get().settings)
    set({ settingsSnapshot: structuredClone(current), settingsChanged: false })
  },

  clearSettingsSnapshot: () =>
    set({ settingsSnapshot: null, settingsChanged: false }),

  revertToSnapshot: () => {
    const { settingsSnapshot, settings } = get()
    if (!settingsSnapshot) return
    const reverted = applyProfileToSettings(settings, settingsSnapshot)
    set({ settings: reverted, settingsChanged: false })
  },

  dismissSettingsWarning: () =>
    set({ settingsChanged: false }),

  getSettingsDiff: () => {
    const { settingsSnapshot, settings } = get()
    if (!settingsSnapshot) return []
    const current = extractProfileFromSettings(settings)
    const diff: string[] = []

    const labelMap: Record<string, string> = {
      soundDesign: 'Sound Design',
      autoZoom: 'Auto-Zoom',
      brandKit: 'Brand Kit',
      hookTitleOverlay: 'Hook Title',
      rehookOverlay: 'Re-hook Overlay',
      progressBarOverlay: 'Progress Bar',
      broll: 'B-Roll',
      fillerRemoval: 'Filler Removal',
      renderQuality: 'Render Quality',
      outputAspectRatio: 'Aspect Ratio',
      filenameTemplate: 'Filename Template',
      renderConcurrency: 'Render Concurrency',
      minScore: 'Minimum Score',
      enableNotifications: 'Notifications'
    }

    for (const key of Object.keys(labelMap) as (keyof SettingsProfile)[]) {
      const a = JSON.stringify(settingsSnapshot[key])
      const b = JSON.stringify(current[key])
      if (a !== b) {
        diff.push(labelMap[key])
      }
    }
    return diff
  },

  // --- Settings Profiles ---

  saveProfile: (name) => {
    const { settings, settingsProfiles } = get()
    const profile = extractProfileFromSettings(settings)
    const updated = { ...settingsProfiles, [name]: profile }
    persistProfiles(updated)
    persistActiveProfileName(name)
    set({ settingsProfiles: updated, activeProfileName: name })
  },

  loadProfile: (name) => {
    const { settings, settingsProfiles } = get()
    const profile = settingsProfiles[name]
    if (!profile) return
    const newSettings = applyProfileToSettings(settings, profile)
    persistActiveProfileName(name)
    set({ settings: newSettings, activeProfileName: name })
  },

  deleteProfile: (name) => {
    const { settingsProfiles, activeProfileName } = get()
    const updated = { ...settingsProfiles }
    delete updated[name]
    persistProfiles(updated)
    const newActive = activeProfileName === name ? null : activeProfileName
    persistActiveProfileName(newActive)
    set({ settingsProfiles: updated, activeProfileName: newActive })
  },

  renameProfile: (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return
    const { settingsProfiles, activeProfileName } = get()
    const profile = settingsProfiles[oldName]
    if (!profile) return
    const updated = { ...settingsProfiles }
    delete updated[oldName]
    updated[newName] = profile
    persistProfiles(updated)
    const newActive = activeProfileName === oldName ? newName : activeProfileName
    persistActiveProfileName(newActive)
    set({ settingsProfiles: updated, activeProfileName: newActive })
  },
})
