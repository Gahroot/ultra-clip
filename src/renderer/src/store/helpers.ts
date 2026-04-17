import type {
  AppSettings,
  SettingsProfile,
  SoundDesignSettings,
  ZoomSettings,
  BrandKit,
  HookTitleOverlaySettings,
  RehookOverlaySettings,
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
  StoryArcUI,
  Platform,
  PrimeAIOptions,
  PulseAIOptions,
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
  musicVolume: 0.1,
  musicDucking: true,
  musicDuckLevel: 0.2,
  sfxStyle: 'standard',
}

export const DEFAULT_AUTO_ZOOM: ZoomSettings = {
  enabled: true,
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

export const DEFAULT_BROLL: BRollSettings = {
  enabled: false,
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

export const DEFAULT_PRIME_AI: PrimeAIOptions = {
  enabled: false,
  segmentStyle: 'clean',
  accentColor: '#00A8E1',
  showBanner: true,
  showFloatingCurrency: false,
  currencyText: '$9.99/mo',
  showSparkles: false,
  showFullscreenText: false,
  fullscreenText: '',
  fullscreenTextTime: 0.5,
  fullscreenTextDuration: 1.2,
  showBadge: false,
  badgeText: 'EXCLUSIVE',
  badgePosition: 'top-right',
  showSubtitleStyle: false,
  showProgressBar: false,
  textOverlays: [],
  imageOverlays: [],
}

export const DEFAULT_PULSE_AI: PulseAIOptions = {
  enabled: false,
  accentColor: '#00FFFF',
  showGrid: true,
  gridSize: 60,
  gridOpacity: 0.18,
  showFrameBorder: true,
  borderThickness: 4,
  showStatusBar: true,
  statusBarText: 'REC · AI EDIT',
  showCornerBrackets: true,
  showDataReadouts: true,
  showProgressBar: true,
  showGlowPulse: true,
  glowPulsePeriod: 6,
  showScanLine: true,
  showDataParticles: true,
}

export const DEFAULT_SETTINGS: AppSettings = {
  // API keys are loaded asynchronously from Electron safeStorage via
  // `hydrateSecretsFromMain()`. They default to empty strings here so the
  // store has a valid synchronous initial shape.
  geminiApiKey: '',
  falApiKey: localStorage.getItem('batchcontent-fal-key') || '',
  outputDirectory: null,
  minScore: DEFAULT_MIN_SCORE,
  soundDesign: DEFAULT_SOUND_DESIGN,
  autoZoom: DEFAULT_AUTO_ZOOM,
  brandKit: DEFAULT_BRAND_KIT,
  hookTitleOverlay: DEFAULT_HOOK_TITLE_OVERLAY,
  rehookOverlay: DEFAULT_REHOOK_OVERLAY,
  broll: DEFAULT_BROLL,
  fillerRemoval: DEFAULT_FILLER_REMOVAL,
  enableNotifications: true,
  developerMode: false,
  renderQuality: DEFAULT_RENDER_QUALITY,
  outputAspectRatio: '9:16',
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  renderConcurrency: 1,
  velocityOptions: {
    enabled: false,
    segmentStyle: 'default',
    glitchScanlines: false,
    glitchIntensity: 0.15,
    lightLeak: false,
    lightLeakOpacity: 0.35,
    particles: false,
    vignette: false,
    vignetteStrength: 0.35,
    colorGrade: false,
    saturation: 1.25,
    contrast: 1.1,
    warmth: 0.1,
    primaryText: '',
    primaryTextDuration: 2.5,
    secondaryText: '',
    secondaryTextDuration: 2.0,
    accentTag: '',
    lowerThird: false,
    lowerThirdText: '',
    calloutRing: false,
    calloutX: 0.5,
    calloutY: 0.5,
    priceStatCard: false,
    priceStatValue: '',
    priceStatLabel: '',
    stepCounter: false,
    stepNumber: 1,
    stepTotal: 3,
    arrowPointer: false,
    arrowX: 0.5,
    arrowY: 0.6,
    velocityProgressBar: false,
    velocityProgressBarColor: '#FF4444',
    transitionIn: 'cut',
    transitionDuration: 0.3
  },
  primeAI: DEFAULT_PRIME_AI,
  pulseAI: DEFAULT_PULSE_AI
}

export const DEFAULT_TARGET_AUDIENCE = 'Business owners interested in AI — making money, saving time, getting clients, handling marketing/sales, automating busy work. Content must deliver actionable value to entrepreneurs and founders.'

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  targetDuration: 'auto',
  enablePerfectLoop: false,
  clipEndMode: 'loop-first',
  enableVariants: false,
  enableMultiPart: false,
  enableClipStitching: true,
  enableAiEdit: true,
  targetAudience: DEFAULT_TARGET_AUDIENCE
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
  subtitles: { x: 50, y: 75 },
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
  storyArcs?: Record<string, StoryArcUI[]>
  clipOrder?: Record<string, string[]>
  customOrder?: boolean
  selectedEditStyleId?: string | null
  processingConfig?: ProcessingConfig
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
      const parsed = JSON.parse(raw) as Partial<AppSettings> & {
        captionStyle?: unknown
        captionsEnabled?: unknown
      }
      // Legacy-key sweep: older installs persisted a basic captionStyle +
      // captionsEnabled that no longer exist on AppSettings. Strip them on
      // load so they don't pollute the hydrated state.
      const { captionStyle: _legacyCaptionStyle, captionsEnabled: _legacyCaptionsEnabled, ...saved } = parsed
      void _legacyCaptionStyle
      void _legacyCaptionsEnabled
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        // Gemini key is hydrated asynchronously from safeStorage.
        geminiApiKey: '',
        falApiKey: localStorage.getItem('batchcontent-fal-key') || '',
        soundDesign: { ...DEFAULT_SOUND_DESIGN, ...(saved.soundDesign ?? {}) },
        autoZoom: { ...DEFAULT_AUTO_ZOOM, ...(saved.autoZoom ?? {}) },
        brandKit: { ...DEFAULT_BRAND_KIT, ...(saved.brandKit ?? {}) },
        hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, ...(saved.hookTitleOverlay ?? {}) },
        rehookOverlay: { ...DEFAULT_REHOOK_OVERLAY, ...(saved.rehookOverlay ?? {}) },
        broll: { ...DEFAULT_BROLL, ...(saved.broll ?? {}) },
        fillerRemoval: { ...DEFAULT_FILLER_REMOVAL, ...(saved.fillerRemoval ?? {}) },
        renderQuality: { ...DEFAULT_RENDER_QUALITY, ...(saved.renderQuality ?? {}) },
        primeAI: { ...DEFAULT_PRIME_AI, ...(saved.primeAI ?? {}) },
        pulseAI: { ...DEFAULT_PULSE_AI, ...(saved.pulseAI ?? {}) }
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
    const { geminiApiKey: _g, falApiKey: _f, ...rest } = settings
    const toSave = { ...rest }
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
  return {
    soundDesign: settings.soundDesign,
    autoZoom: settings.autoZoom,
    brandKit: settings.brandKit,
    hookTitleOverlay: settings.hookTitleOverlay,
    rehookOverlay: settings.rehookOverlay,
    broll: settings.broll,
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
    soundDesign: profile.soundDesign,
    autoZoom: profile.autoZoom,
    brandKit: profile.brandKit,
    hookTitleOverlay: profile.hookTitleOverlay,
    rehookOverlay: profile.rehookOverlay,
    broll: { ...profile.broll },
    fillerRemoval: profile.fillerRemoval,
    renderQuality: profile.renderQuality,
    outputAspectRatio: profile.outputAspectRatio,
    filenameTemplate: profile.filenameTemplate,
    renderConcurrency: profile.renderConcurrency,
    minScore: profile.minScore,
    enableNotifications: profile.enableNotifications
  }
}

export function loadPersistedProfiles(): Record<string, SettingsProfile> {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as Record<string, SettingsProfile>
    }
  } catch {
    // ignore
  }
  return {}
}

export function persistProfiles(profiles: Record<string, SettingsProfile>): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles))
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
