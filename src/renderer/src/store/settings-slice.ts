import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppState,
  AppSettings,
  CaptionStyle,
  ProcessingConfig,
  AutoModeConfig,
  SettingsProfile,
  HookTextTemplate,
  RenderQualitySettings,
  BUILT_IN_PROFILE_NAMES,
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
  BUILT_IN_PROFILES,
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

  // Settings setters
  setGeminiApiKey: (key: string) => void
  setOutputDirectory: (dir: string) => void
  setMinScore: (score: number) => void
  setCaptionStyle: (style: CaptionStyle) => void
  setCaptionsEnabled: (enabled: boolean) => void
  setSoundDesignEnabled: (enabled: boolean) => void
  setSoundDesignTrack: (track: MusicTrack) => void
  setSoundDesignSfxVolume: (volume: number) => void
  setSoundDesignMusicVolume: (volume: number) => void
  setSoundDesignMusicDucking: (enabled: boolean) => void
  setSoundDesignMusicDuckLevel: (level: number) => void
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

  // --- Settings ---

  setGeminiApiKey: (key) => {
    localStorage.setItem('batchcontent-gemini-key', key)
    set((state) => ({ settings: { ...state.settings, geminiApiKey: key } }))
  },

  setOutputDirectory: (dir) =>
    set((state) => ({ settings: { ...state.settings, outputDirectory: dir } })),

  setMinScore: (score) => {
    _pushUndo(get(), set)
    set((state) => ({ settings: { ...state.settings, minScore: score } }))
  },

  setCaptionStyle: (style) =>
    set((state) => ({ settings: { ...state.settings, captionStyle: style } })),

  setCaptionsEnabled: (enabled) =>
    set((state) => ({ settings: { ...state.settings, captionsEnabled: enabled } })),

  setSoundDesignEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, soundDesign: { ...state.settings.soundDesign, enabled } }
    })),

  setSoundDesignTrack: (track) =>
    set((state) => ({
      settings: { ...state.settings, soundDesign: { ...state.settings.soundDesign, backgroundMusicTrack: track } }
    })),

  setSoundDesignSfxVolume: (volume) =>
    set((state) => ({
      settings: { ...state.settings, soundDesign: { ...state.settings.soundDesign, sfxVolume: volume } }
    })),

  setSoundDesignMusicVolume: (volume) =>
    set((state) => ({
      settings: { ...state.settings, soundDesign: { ...state.settings.soundDesign, musicVolume: volume } }
    })),

  setSoundDesignMusicDucking: (musicDucking) =>
    set((state) => ({
      settings: { ...state.settings, soundDesign: { ...state.settings.soundDesign, musicDucking } }
    })),

  setSoundDesignMusicDuckLevel: (musicDuckLevel) =>
    set((state) => ({
      settings: { ...state.settings, soundDesign: { ...state.settings.soundDesign, musicDuckLevel } }
    })),

  setAutoZoomEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, autoZoom: { ...state.settings.autoZoom, enabled } }
    })),

  setAutoZoomMode: (mode) =>
    set((state) => ({
      settings: { ...state.settings, autoZoom: { ...state.settings.autoZoom, mode } }
    })),

  setAutoZoomIntensity: (intensity) =>
    set((state) => ({
      settings: { ...state.settings, autoZoom: { ...state.settings.autoZoom, intensity } }
    })),

  setAutoZoomInterval: (intervalSeconds) =>
    set((state) => ({
      settings: { ...state.settings, autoZoom: { ...state.settings.autoZoom, intervalSeconds } }
    })),

  // --- Hook Title Overlay ---

  setHookTitleEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, enabled } }
    })),

  setHookTitleStyle: (style) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, style } }
    })),

  setHookTitleDisplayDuration: (displayDuration) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, displayDuration } }
    })),

  setHookTitleFontSize: (fontSize) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, fontSize } }
    })),

  setHookTitleTextColor: (textColor) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, textColor } }
    })),

  setHookTitleOutlineColor: (outlineColor) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, outlineColor } }
    })),

  setHookTitleOutlineWidth: (outlineWidth) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, outlineWidth } }
    })),

  setHookTitleFadeIn: (fadeIn) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, fadeIn } }
    })),

  setHookTitleFadeOut: (fadeOut) =>
    set((state) => ({
      settings: { ...state.settings, hookTitleOverlay: { ...state.settings.hookTitleOverlay, fadeOut } }
    })),

  // --- Re-hook Overlay ---

  setRehookEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, rehookOverlay: { ...state.settings.rehookOverlay, enabled } }
    })),

  setRehookStyle: (style) =>
    set((state) => ({
      settings: { ...state.settings, rehookOverlay: { ...state.settings.rehookOverlay, style } }
    })),

  setRehookDisplayDuration: (displayDuration) =>
    set((state) => ({
      settings: { ...state.settings, rehookOverlay: { ...state.settings.rehookOverlay, displayDuration } }
    })),

  setRehookPositionFraction: (positionFraction) =>
    set((state) => ({
      settings: { ...state.settings, rehookOverlay: { ...state.settings.rehookOverlay, positionFraction } }
    })),

  // --- Progress Bar Overlay ---

  setProgressBarEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, progressBarOverlay: { ...state.settings.progressBarOverlay, enabled } }
    })),

  setProgressBarPosition: (position) =>
    set((state) => ({
      settings: { ...state.settings, progressBarOverlay: { ...state.settings.progressBarOverlay, position } }
    })),

  setProgressBarHeight: (height) =>
    set((state) => ({
      settings: { ...state.settings, progressBarOverlay: { ...state.settings.progressBarOverlay, height } }
    })),

  setProgressBarColor: (color) =>
    set((state) => ({
      settings: { ...state.settings, progressBarOverlay: { ...state.settings.progressBarOverlay, color } }
    })),

  setProgressBarOpacity: (opacity) =>
    set((state) => ({
      settings: { ...state.settings, progressBarOverlay: { ...state.settings.progressBarOverlay, opacity } }
    })),

  setProgressBarStyle: (style) =>
    set((state) => ({
      settings: { ...state.settings, progressBarOverlay: { ...state.settings.progressBarOverlay, style } }
    })),

  // --- Brand Kit ---

  setBrandKitEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, enabled } }
    })),

  setBrandKitLogoPath: (path) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, logoPath: path } }
    })),

  setBrandKitLogoPosition: (position) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, logoPosition: position } }
    })),

  setBrandKitLogoScale: (scale) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, logoScale: scale } }
    })),

  setBrandKitLogoOpacity: (opacity) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, logoOpacity: opacity } }
    })),

  setBrandKitIntroBumperPath: (path) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, introBumperPath: path } }
    })),

  setBrandKitOutroBumperPath: (path) =>
    set((state) => ({
      settings: { ...state.settings, brandKit: { ...state.settings.brandKit, outroBumperPath: path } }
    })),

  // --- B-Roll ---

  setBRollEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, enabled } }
    })),

  setBRollPexelsApiKey: (key) => {
    localStorage.setItem('batchcontent-pexels-key', key)
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, pexelsApiKey: key } }
    }))
  },

  setBRollIntervalSeconds: (intervalSeconds) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, intervalSeconds } }
    })),

  setBRollClipDuration: (clipDuration) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, clipDuration } }
    })),

  setBRollDisplayMode: (displayMode) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, displayMode } }
    })),

  setBRollTransition: (transition) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, transition } }
    })),

  setBRollPipSize: (pipSize) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, pipSize } }
    })),

  setBRollPipPosition: (pipPosition) =>
    set((state) => ({
      settings: { ...state.settings, broll: { ...state.settings.broll, pipPosition } }
    })),

  // --- Filler Removal ---

  setFillerRemovalEnabled: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, fillerRemoval: { ...state.settings.fillerRemoval, enabled } }
    })),

  setFillerRemovalFillerWords: (removeFillerWords) =>
    set((state) => ({
      settings: { ...state.settings, fillerRemoval: { ...state.settings.fillerRemoval, removeFillerWords } }
    })),

  setFillerRemovalSilences: (trimSilences) =>
    set((state) => ({
      settings: { ...state.settings, fillerRemoval: { ...state.settings.fillerRemoval, trimSilences } }
    })),

  setFillerRemovalRepeats: (removeRepeats) =>
    set((state) => ({
      settings: { ...state.settings, fillerRemoval: { ...state.settings.fillerRemoval, removeRepeats } }
    })),

  setFillerRemovalSilenceThreshold: (silenceThreshold) =>
    set((state) => ({
      settings: { ...state.settings, fillerRemoval: { ...state.settings.fillerRemoval, silenceThreshold } }
    })),

  setFillerRemovalWordList: (fillerWords) =>
    set((state) => ({
      settings: { ...state.settings, fillerRemoval: { ...state.settings.fillerRemoval, fillerWords } }
    })),

  // --- Notifications ---

  setEnableNotifications: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, enableNotifications: enabled }
    })),

  // --- Developer Mode ---

  setDeveloperMode: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, developerMode: enabled }
    })),

  // --- Render Quality ---

  setRenderQuality: (quality) =>
    set((state) => ({
      settings: { ...state.settings, renderQuality: { ...state.settings.renderQuality, ...quality } }
    })),

  // --- Output Aspect Ratio ---

  setOutputAspectRatio: (ratio) =>
    set((state) => ({
      settings: { ...state.settings, outputAspectRatio: ratio }
    })),

  // --- Filename Template ---

  setFilenameTemplate: (template) =>
    set((state) => ({
      settings: { ...state.settings, filenameTemplate: template }
    })),

  // --- Render Concurrency ---

  setRenderConcurrency: (concurrency) =>
    set((state) => ({
      settings: { ...state.settings, renderConcurrency: Math.max(1, Math.min(4, concurrency)) }
    })),

  // --- Reset Settings ---

  resetSettings: () =>
    set((state) => ({
      settings: {
        ...DEFAULT_SETTINGS,
        geminiApiKey: state.settings.geminiApiKey,
        outputDirectory: state.settings.outputDirectory,
        broll: {
          ...DEFAULT_SETTINGS.broll,
          pexelsApiKey: state.settings.broll.pexelsApiKey
        }
      }
    })),

  resetSection: (section) =>
    set((state) => {
      switch (section) {
        case 'aiSettings':
          return { settings: { ...state.settings, minScore: DEFAULT_SETTINGS.minScore } }
        case 'captions':
          return {
            settings: {
              ...state.settings,
              captionsEnabled: DEFAULT_SETTINGS.captionsEnabled,
              captionStyle: DEFAULT_SETTINGS.captionStyle
            }
          }
        case 'soundDesign':
          return { settings: { ...state.settings, soundDesign: DEFAULT_SETTINGS.soundDesign } }
        case 'autoZoom':
          return { settings: { ...state.settings, autoZoom: DEFAULT_SETTINGS.autoZoom } }
        case 'brandKit':
          return { settings: { ...state.settings, brandKit: DEFAULT_SETTINGS.brandKit } }
        case 'hookTitle':
          return { settings: { ...state.settings, hookTitleOverlay: DEFAULT_SETTINGS.hookTitleOverlay } }
        case 'rehook':
          return { settings: { ...state.settings, rehookOverlay: DEFAULT_SETTINGS.rehookOverlay } }
        case 'progressBar':
          return { settings: { ...state.settings, progressBarOverlay: DEFAULT_SETTINGS.progressBarOverlay } }
        case 'fillerRemoval':
          return { settings: { ...state.settings, fillerRemoval: DEFAULT_SETTINGS.fillerRemoval } }
        case 'broll':
          return {
            settings: {
              ...state.settings,
              broll: { ...DEFAULT_SETTINGS.broll, pexelsApiKey: state.settings.broll.pexelsApiKey }
            }
          }
        case 'renderQuality':
          return { settings: { ...state.settings, renderQuality: DEFAULT_SETTINGS.renderQuality } }
        default:
          return {}
      }
    }),

  // --- Processing Config ---

  setProcessingConfig: (config) =>
    set((state) => ({
      processingConfig: { ...state.processingConfig, ...config }
    })),

  resetProcessingConfig: () => set({ processingConfig: DEFAULT_PROCESSING_CONFIG }),

  // --- Auto Mode ---

  setAutoMode: (config) =>
    set((state) => ({
      autoMode: { ...state.autoMode, ...config }
    })),

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
      captionStyle: 'Caption Style',
      captionsEnabled: 'Captions',
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
    if ((['TikTok Optimized', 'Reels Clean', 'Minimal'] as readonly string[]).includes(name)) return
    const { settingsProfiles, activeProfileName } = get()
    const updated = { ...settingsProfiles }
    delete updated[name]
    persistProfiles(updated)
    const newActive = activeProfileName === name ? null : activeProfileName
    persistActiveProfileName(newActive)
    set({ settingsProfiles: updated, activeProfileName: newActive })
  },

  renameProfile: (oldName, newName) => {
    if ((['TikTok Optimized', 'Reels Clean', 'Minimal'] as readonly string[]).includes(oldName)) return
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
