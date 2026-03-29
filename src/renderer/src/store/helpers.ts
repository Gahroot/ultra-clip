import type {
  AppSettings,
  SettingsProfile,
  CaptionStyle,
  SoundDesignSettings,
  ZoomSettings,
  BrandKit,
  HookTitleOverlaySettings,
  RehookOverlaySettings,
  ProgressBarOverlaySettings,
  BRollSettings,
  FillerRemovalSettings,
  RenderQualitySettings,
  ProcessingConfig,
  HookTextTemplate,
  TemplateLayout,
  SourceVideo,
  TranscriptionData,
  ClipCandidate,
  StitchedClipCandidate,
  Platform,
} from './types'
import { DEFAULT_MIN_SCORE, DEFAULT_FILENAME_TEMPLATE } from '@shared/constants'

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Update a single item by ID in an array of objects.
 * Accepts either a partial object or a function that receives the current item
 * and returns a partial update.
 */
export function updateItemById<T extends { id: string }>(
  items: T[],
  itemId: string,
  update: Partial<T> | ((item: T) => Partial<T>)
): T[] {
  return items.map(item =>
    item.id === itemId
      ? { ...item, ...(typeof update === 'function' ? update(item) : update) }
      : item
  )
}

// ---------------------------------------------------------------------------
// Caption presets
// ---------------------------------------------------------------------------

export const CAPTION_PRESETS: Record<string, CaptionStyle> = {
  'captions-ai': {
    id: 'captions-ai',
    label: 'Captions.AI',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'captions-ai',
    emphasisColor: '#00FF00',
    supersizeColor: '#FFD700'
  },
  'hormozi-bold': {
    id: 'hormozi-bold',
    label: 'Hormozi Bold',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#00FF00',
    supersizeColor: '#FFD700'
  },
  'tiktok-glow': {
    id: 'tiktok-glow',
    label: 'TikTok Glow',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FFFF',
    outlineColor: '#FF00FF',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'glow',
    emphasisColor: '#00FFFF',
    supersizeColor: '#FF6B35'
  },
  'reels-clean': {
    id: 'reels-clean',
    label: 'Reels Clean',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#C8191919',
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 1,
    animation: 'word-pop',
    emphasisColor: '#FFFFFF',
    supersizeColor: '#FFD700'
  },
  'clarity-boxes': {
    id: 'clarity-boxes',
    label: 'Clarity Boxes',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#E0192033',
    backColor: '#00000000',
    outline: 15,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'word-box',
    emphasisColor: '#2563EB',
    supersizeColor: '#DC2626'
  },
  'classic-karaoke': {
    id: 'classic-karaoke',
    label: 'Classic Karaoke',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.05,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 3,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 4,
    animation: 'karaoke-fill',
    emphasisColor: '#FFFF00',
    supersizeColor: '#FF4444'
  },
  'impact-two': {
    id: 'impact-two',
    label: 'Impact II',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'impact-two',
    emphasisColor: '#00FF00',
    supersizeColor: '#FFFFFF'
  }
}

// ---------------------------------------------------------------------------
// Hook text templates
// ---------------------------------------------------------------------------

export const DEFAULT_HOOK_TEMPLATES: HookTextTemplate[] = [
  { id: 'ai-default', name: 'AI Default', template: '{hookText}', emoji: '🤖', builtIn: true },
  { id: 'bold-claim', name: 'Bold Claim', template: '🔥 {hookText} 🔥', emoji: '🔥', builtIn: true },
  { id: 'question-hook', name: 'Question Hook', template: '{hookText}?', emoji: '❓', builtIn: true },
  { id: 'warning', name: 'Warning', template: '⚠️ {hookText}', emoji: '⚠️', builtIn: true },
  { id: 'curiosity', name: 'Curiosity', template: "You won't believe {hookText}", emoji: '👀', builtIn: true },
  { id: 'announcement', name: 'Announcement', template: '{hookText} (WATCH THIS)', emoji: '📢', builtIn: true }
]

/**
 * Apply a hook text template by substituting variables.
 * Variables: {hookText}, {score}, {duration}
 */
export function applyHookTemplate(
  template: string,
  hookText: string,
  score?: number,
  duration?: number
): string {
  return template
    .replace(/\{hookText\}/g, hookText)
    .replace(/\{score\}/g, score !== undefined ? String(score) : '')
    .replace(/\{duration\}/g, duration !== undefined ? String(Math.round(duration)) : '')
}

// ---------------------------------------------------------------------------
// Default settings values
// ---------------------------------------------------------------------------

export const DEFAULT_SOUND_DESIGN: SoundDesignSettings = {
  enabled: false,
  backgroundMusicTrack: 'ambient-tech',
  sfxVolume: 0.5,
  musicVolume: 0.1
}

export const DEFAULT_AUTO_ZOOM: ZoomSettings = {
  enabled: false,
  mode: 'ken-burns',
  intensity: 'subtle',
  intervalSeconds: 4
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  enabled: false,
  logoPath: null,
  logoPosition: 'bottom-right',
  logoScale: 0.1,
  logoOpacity: 0.8,
  introBumperPath: null,
  outroBumperPath: null
}

export const DEFAULT_HOOK_TITLE_OVERLAY: HookTitleOverlaySettings = {
  enabled: true,
  style: 'centered-bold',
  displayDuration: 2.5,
  fadeIn: 0.3,
  fadeOut: 0.4,
  fontSize: 72,
  textColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4
}

export const DEFAULT_REHOOK_OVERLAY: RehookOverlaySettings = {
  enabled: true,
  style: 'bar',
  displayDuration: 1.5,
  fadeIn: 0.2,
  fadeOut: 0.3,
  positionFraction: 0.45
}

export const DEFAULT_PROGRESS_BAR_OVERLAY: ProgressBarOverlaySettings = {
  enabled: false,
  position: 'bottom',
  height: 4,
  color: '#FFFFFF',
  opacity: 0.9,
  style: 'solid'
}

export const DEFAULT_BROLL: BRollSettings = {
  enabled: false,
  pexelsApiKey: localStorage.getItem('batchcontent-pexels-key') || '',
  intervalSeconds: 5,
  clipDuration: 3,
  displayMode: 'split-top',
  transition: 'crossfade',
  pipSize: 0.25,
  pipPosition: 'bottom-right'
}

export const DEFAULT_FILLER_REMOVAL: FillerRemovalSettings = {
  enabled: true,
  removeFillerWords: true,
  trimSilences: true,
  removeRepeats: true,
  silenceThreshold: 0.8,
  fillerWords: [
    'um', 'uh', 'erm', 'er', 'ah', 'hm', 'hmm', 'mm', 'mhm',
    'like', 'you know', 'i mean', 'sort of', 'kind of',
    'basically', 'actually', 'literally', 'right', 'okay so'
  ]
}

export const DEFAULT_RENDER_QUALITY: RenderQualitySettings = {
  preset: 'normal',
  customCrf: 23,
  outputResolution: '1080x1920',
  outputFormat: 'mp4',
  encodingPreset: 'veryfast'
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: localStorage.getItem('batchcontent-gemini-key') || '',
  outputDirectory: null,
  minScore: DEFAULT_MIN_SCORE,
  captionStyle: CAPTION_PRESETS['captions-ai'],
  captionsEnabled: true,
  soundDesign: DEFAULT_SOUND_DESIGN,
  autoZoom: DEFAULT_AUTO_ZOOM,
  brandKit: DEFAULT_BRAND_KIT,
  hookTitleOverlay: DEFAULT_HOOK_TITLE_OVERLAY,
  rehookOverlay: DEFAULT_REHOOK_OVERLAY,
  progressBarOverlay: DEFAULT_PROGRESS_BAR_OVERLAY,
  broll: DEFAULT_BROLL,
  fillerRemoval: DEFAULT_FILLER_REMOVAL,
  enableNotifications: true,
  developerMode: false,
  renderQuality: DEFAULT_RENDER_QUALITY,
  outputAspectRatio: '9:16',
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  renderConcurrency: 1
}

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  targetDuration: 'auto',
  enablePerfectLoop: false,
  clipEndMode: 'loop-first',
  enableVariants: false,
  enableMultiPart: false,
  enableClipStitching: false
}

export const DEFAULT_PIPELINE = {
  stage: 'idle' as const,
  message: '',
  percent: 0
}

// ---------------------------------------------------------------------------
// Default template layout + project file schema
// ---------------------------------------------------------------------------

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  titleText: { x: 50, y: 12 },
  subtitles: { x: 50, y: 50 },
  rehookText: { x: 50, y: 12 },
  media: { x: 50, y: 75 }
}

/** Canonical shape written to / read from .batchcontent files. */
export interface ProjectFileData {
  version: number
  sources: SourceVideo[]
  transcriptions: Record<string, TranscriptionData>
  clips: Record<string, ClipCandidate[]>
  settings: AppSettings
  templateLayout: TemplateLayout
  targetPlatform: Platform
  stitchedClips?: Record<string, StitchedClipCandidate[]>
}

// ---------------------------------------------------------------------------
// Settings Persistence
// ---------------------------------------------------------------------------

const SETTINGS_STORAGE_KEY = 'batchcontent-settings'
const PROCESSING_CONFIG_STORAGE_KEY = 'batchcontent-processing-config'

export function loadPersistedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppSettings>
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        geminiApiKey: localStorage.getItem('batchcontent-gemini-key') || '',
        soundDesign: { ...DEFAULT_SOUND_DESIGN, ...(saved.soundDesign ?? {}) },
        autoZoom: { ...DEFAULT_AUTO_ZOOM, ...(saved.autoZoom ?? {}) },
        brandKit: { ...DEFAULT_BRAND_KIT, ...(saved.brandKit ?? {}) },
        hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, ...(saved.hookTitleOverlay ?? {}) },
        rehookOverlay: { ...DEFAULT_REHOOK_OVERLAY, ...(saved.rehookOverlay ?? {}) },
        progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, ...(saved.progressBarOverlay ?? {}) },
        broll: {
          ...DEFAULT_BROLL,
          ...(saved.broll ?? {}),
          pexelsApiKey: localStorage.getItem('batchcontent-pexels-key') || ''
        },
        fillerRemoval: { ...DEFAULT_FILLER_REMOVAL, ...(saved.fillerRemoval ?? {}) },
        renderQuality: { ...DEFAULT_RENDER_QUALITY, ...(saved.renderQuality ?? {}) },
        captionStyle: { ...CAPTION_PRESETS['captions-ai'], ...(saved.captionStyle ?? {}) }
      }
    }
  } catch {
    // JSON parse error — fall back to defaults
  }
  return DEFAULT_SETTINGS
}

export function loadPersistedProcessingConfig(): ProcessingConfig {
  try {
    const raw = localStorage.getItem(PROCESSING_CONFIG_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ProcessingConfig>
      return { ...DEFAULT_PROCESSING_CONFIG, ...saved }
    }
  } catch {
    // JSON parse error — fall back to defaults
  }
  return DEFAULT_PROCESSING_CONFIG
}

export function persistSettings(settings: AppSettings): void {
  try {
    const { geminiApiKey: _g, ...rest } = settings
    const toSave = {
      ...rest,
      broll: { ...rest.broll, pexelsApiKey: undefined }
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function persistProcessingConfig(config: ProcessingConfig): void {
  try {
    localStorage.setItem(PROCESSING_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Settings Profiles
// ---------------------------------------------------------------------------

const PROFILES_STORAGE_KEY = 'batchcontent-settings-profiles'
const ACTIVE_PROFILE_STORAGE_KEY = 'batchcontent-active-profile'

/** Extract the profile-relevant fields from the full AppSettings. */
export function extractProfileFromSettings(settings: AppSettings): SettingsProfile {
  const { pexelsApiKey: _p, ...brollWithoutKey } = settings.broll
  return {
    captionStyle: settings.captionStyle,
    captionsEnabled: settings.captionsEnabled,
    soundDesign: settings.soundDesign,
    autoZoom: settings.autoZoom,
    brandKit: settings.brandKit,
    hookTitleOverlay: settings.hookTitleOverlay,
    rehookOverlay: settings.rehookOverlay,
    progressBarOverlay: settings.progressBarOverlay,
    broll: brollWithoutKey,
    fillerRemoval: settings.fillerRemoval,
    renderQuality: settings.renderQuality,
    outputAspectRatio: settings.outputAspectRatio,
    filenameTemplate: settings.filenameTemplate,
    renderConcurrency: settings.renderConcurrency,
    minScore: settings.minScore,
    enableNotifications: settings.enableNotifications
  }
}

/** Apply a profile onto existing AppSettings, preserving secrets and machine-specific values. */
export function applyProfileToSettings(settings: AppSettings, profile: SettingsProfile): AppSettings {
  return {
    ...settings,
    captionStyle: profile.captionStyle,
    captionsEnabled: profile.captionsEnabled,
    soundDesign: profile.soundDesign,
    autoZoom: profile.autoZoom,
    brandKit: profile.brandKit,
    hookTitleOverlay: profile.hookTitleOverlay,
    rehookOverlay: profile.rehookOverlay,
    progressBarOverlay: profile.progressBarOverlay,
    broll: { ...profile.broll, pexelsApiKey: settings.broll.pexelsApiKey },
    fillerRemoval: profile.fillerRemoval,
    renderQuality: profile.renderQuality,
    outputAspectRatio: profile.outputAspectRatio,
    filenameTemplate: profile.filenameTemplate,
    renderConcurrency: profile.renderConcurrency,
    minScore: profile.minScore,
    enableNotifications: profile.enableNotifications
  }
}

/** The 3 built-in presets that ship with the app. */
export const BUILT_IN_PROFILES: Record<string, SettingsProfile> = {
  'TikTok Optimized': {
    captionStyle: CAPTION_PRESETS['hormozi-bold'],
    captionsEnabled: true,
    soundDesign: DEFAULT_SOUND_DESIGN,
    autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 4 },
    brandKit: DEFAULT_BRAND_KIT,
    hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, enabled: true, style: 'centered-bold' },
    rehookOverlay: DEFAULT_REHOOK_OVERLAY,
    progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, enabled: true, style: 'glow', position: 'bottom' },
    broll: { enabled: false, intervalSeconds: 5, clipDuration: 3, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right' },
    fillerRemoval: DEFAULT_FILLER_REMOVAL,
    renderQuality: DEFAULT_RENDER_QUALITY,
    outputAspectRatio: '9:16',
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    renderConcurrency: 1,
    minScore: DEFAULT_MIN_SCORE,
    enableNotifications: true
  },
  'Reels Clean': {
    captionStyle: CAPTION_PRESETS['captions-ai'],
    captionsEnabled: true,
    soundDesign: DEFAULT_SOUND_DESIGN,
    autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    brandKit: DEFAULT_BRAND_KIT,
    hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, enabled: true, style: 'slide-in' },
    rehookOverlay: DEFAULT_REHOOK_OVERLAY,
    progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, enabled: false },
    broll: { enabled: false, intervalSeconds: 5, clipDuration: 3, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right' },
    fillerRemoval: DEFAULT_FILLER_REMOVAL,
    renderQuality: DEFAULT_RENDER_QUALITY,
    outputAspectRatio: '9:16',
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    renderConcurrency: 1,
    minScore: DEFAULT_MIN_SCORE,
    enableNotifications: true
  },
  'Minimal': {
    captionStyle: CAPTION_PRESETS['captions-ai'],
    captionsEnabled: false,
    soundDesign: { ...DEFAULT_SOUND_DESIGN, enabled: false },
    autoZoom: { enabled: false, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    brandKit: DEFAULT_BRAND_KIT,
    hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, enabled: false },
    rehookOverlay: { ...DEFAULT_REHOOK_OVERLAY, enabled: false },
    progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, enabled: false },
    broll: { enabled: false, intervalSeconds: 5, clipDuration: 3, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right' },
    fillerRemoval: { ...DEFAULT_FILLER_REMOVAL, enabled: false },
    renderQuality: DEFAULT_RENDER_QUALITY,
    outputAspectRatio: '9:16',
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    renderConcurrency: 1,
    minScore: DEFAULT_MIN_SCORE,
    enableNotifications: true
  }
}

export function loadPersistedProfiles(): Record<string, SettingsProfile> {
  const profiles = { ...BUILT_IN_PROFILES }
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, SettingsProfile>
      Object.assign(profiles, saved)
    }
  } catch {
    // ignore
  }
  return profiles
}

export function persistProfiles(profiles: Record<string, SettingsProfile>): void {
  try {
    const userOnly: Record<string, SettingsProfile> = {}
    for (const [name, profile] of Object.entries(profiles)) {
      if (!(name in BUILT_IN_PROFILES)) {
        userOnly[name] = profile
      }
    }
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(userOnly))
  } catch {
    // ignore
  }
}

export function loadActiveProfileName(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function persistActiveProfileName(name: string | null): void {
  try {
    if (name === null) {
      localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY)
    } else {
      localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, name)
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Hook template persistence
// ---------------------------------------------------------------------------

const HOOK_TEMPLATES_KEY = 'batchcontent-hook-templates'
export const ACTIVE_HOOK_TEMPLATE_KEY = 'batchcontent-active-hook-template'

export function loadHookTemplatesFromStorage(): HookTextTemplate[] {
  try {
    const raw = localStorage.getItem(HOOK_TEMPLATES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HookTextTemplate[]
  } catch {
    return []
  }
}

export function saveHookTemplatesToStorage(templates: HookTextTemplate[]): void {
  localStorage.setItem(HOOK_TEMPLATES_KEY, JSON.stringify(templates))
}
