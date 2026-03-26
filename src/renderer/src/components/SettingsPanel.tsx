import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, FolderOpen, ExternalLink, Music2, Zap, Scan, Film, Briefcase, Type, Clapperboard, Scissors, HardDrive, Bell, RotateCcw, CaseSensitive, CheckCircle2, XCircle, Loader2, PenSquare, Trash2, Pencil, Image, Code2, FileOutput, FileDown, Layers } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  useStore,
  CAPTION_PRESETS,
  DEFAULT_HOOK_TEMPLATES,
  applyHookTemplate,
  DEFAULT_SETTINGS,
  type CaptionStyle,
  type CaptionAnimation,
  type MusicTrack,
  type ZoomIntensity,
  type LogoPosition,
  type HookTitleStyle,
  type ProgressBarStyle,
  type ProgressBarPosition,
  type HookTextTemplate,
  type RenderQualityPreset,
  type OutputResolution,
  type OutputFormat,
  type EncodingPreset,
  type OutputAspectRatio
} from '@/store'
import { cn, formatFileSize } from '@/lib/utils'
import { DropZone } from './DropZone'

const ANIMATION_OPTIONS: { value: CaptionAnimation; label: string }[] = [
  { value: 'word-pop', label: 'Word Pop' },
  { value: 'karaoke-fill', label: 'Karaoke Fill' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'glow', label: 'Glow' }
]

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  )
}

function FieldRow({
  label,
  htmlFor,
  children,
  hint
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const MUSIC_TRACK_OPTIONS: { value: MusicTrack; label: string; description: string }[] = [
  { value: 'ambient-tech', label: 'Ambient Tech', description: 'Subtle electronic / corporate' },
  { value: 'ambient-motivational', label: 'Motivational', description: 'Uplifting, inspiring' },
  { value: 'ambient-chill', label: 'Chill Lo-Fi', description: 'Relaxed, laid-back' }
]

type SectionKey = 'captions' | 'soundDesign' | 'autoZoom' | 'brandKit' | 'hookTitle' | 'rehook' | 'progressBar' | 'fillerRemoval' | 'broll' | 'aiSettings'

function SectionResetButton({ section, onReset }: { section: SectionKey; onReset: (s: SectionKey) => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onReset(section)}
            className="ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Reset section to defaults"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Reset section to defaults</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SettingsPanel() {
  const {
    settings,
    setGeminiApiKey,
    setOutputDirectory,
    setMinScore,
    setCaptionStyle,
    setCaptionsEnabled,
    setSoundDesignEnabled,
    setSoundDesignTrack,
    setSoundDesignSfxVolume,
    setSoundDesignMusicVolume,
    setAutoZoomEnabled,
    setAutoZoomIntensity,
    setAutoZoomInterval,
    setHookTitleEnabled,
    setHookTitleStyle,
    setHookTitleDisplayDuration,
    setHookTitleFontSize,
    setHookTitleTextColor,
    setHookTitleOutlineColor,
    setRehookEnabled,
    setRehookDisplayDuration,
    setProgressBarEnabled,
    setProgressBarPosition,
    setProgressBarHeight,
    setProgressBarColor,
    setProgressBarOpacity,
    setProgressBarStyle,
    setBrandKitEnabled,
    setBrandKitLogoPath,
    setBrandKitLogoPosition,
    setBrandKitLogoScale,
    setBrandKitLogoOpacity,
    setBrandKitIntroBumperPath,
    setBrandKitOutroBumperPath,
    setBRollEnabled,
    setBRollPexelsApiKey,
    setBRollIntervalSeconds,
    setBRollClipDuration,
    setFillerRemovalEnabled,
    setFillerRemovalFillerWords,
    setFillerRemovalSilences,
    setFillerRemovalRepeats,
    setFillerRemovalSilenceThreshold,
    setRenderQuality,
    setOutputAspectRatio,
    setFilenameTemplate,
    setRenderConcurrency,
    resetSettings,
    resetSection,
    hookTemplates,
    activeHookTemplateId,
    setActiveHookTemplateId,
    addHookTemplate,
    editHookTemplate,
    removeHookTemplate
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      hookTemplates: s.hookTemplates,
      activeHookTemplateId: s.activeHookTemplateId,
      setActiveHookTemplateId: s.setActiveHookTemplateId,
      addHookTemplate: s.addHookTemplate,
      editHookTemplate: s.editHookTemplate,
      removeHookTemplate: s.removeHookTemplate,
      setGeminiApiKey: s.setGeminiApiKey,
      setOutputDirectory: s.setOutputDirectory,
    setMinScore: s.setMinScore,
    setCaptionStyle: s.setCaptionStyle,
    setCaptionsEnabled: s.setCaptionsEnabled,
    setSoundDesignEnabled: s.setSoundDesignEnabled,
    setSoundDesignTrack: s.setSoundDesignTrack,
    setSoundDesignSfxVolume: s.setSoundDesignSfxVolume,
    setSoundDesignMusicVolume: s.setSoundDesignMusicVolume,
    setAutoZoomEnabled: s.setAutoZoomEnabled,
    setAutoZoomIntensity: s.setAutoZoomIntensity,
    setAutoZoomInterval: s.setAutoZoomInterval,
    setHookTitleEnabled: s.setHookTitleEnabled,
    setHookTitleStyle: s.setHookTitleStyle,
    setHookTitleDisplayDuration: s.setHookTitleDisplayDuration,
    setHookTitleFontSize: s.setHookTitleFontSize,
    setHookTitleTextColor: s.setHookTitleTextColor,
    setHookTitleOutlineColor: s.setHookTitleOutlineColor,
    setRehookEnabled: s.setRehookEnabled,
    setRehookDisplayDuration: s.setRehookDisplayDuration,
    setProgressBarEnabled: s.setProgressBarEnabled,
    setProgressBarPosition: s.setProgressBarPosition,
    setProgressBarHeight: s.setProgressBarHeight,
    setProgressBarColor: s.setProgressBarColor,
    setProgressBarOpacity: s.setProgressBarOpacity,
    setProgressBarStyle: s.setProgressBarStyle,
    setBrandKitEnabled: s.setBrandKitEnabled,
    setBrandKitLogoPath: s.setBrandKitLogoPath,
    setBrandKitLogoPosition: s.setBrandKitLogoPosition,
    setBrandKitLogoScale: s.setBrandKitLogoScale,
    setBrandKitLogoOpacity: s.setBrandKitLogoOpacity,
    setBrandKitIntroBumperPath: s.setBrandKitIntroBumperPath,
    setBrandKitOutroBumperPath: s.setBrandKitOutroBumperPath,
    setBRollEnabled: s.setBRollEnabled,
    setBRollPexelsApiKey: s.setBRollPexelsApiKey,
    setBRollIntervalSeconds: s.setBRollIntervalSeconds,
    setBRollClipDuration: s.setBRollClipDuration,
    setFillerRemovalEnabled: s.setFillerRemovalEnabled,
    setFillerRemovalFillerWords: s.setFillerRemovalFillerWords,
    setFillerRemovalSilences: s.setFillerRemovalSilences,
    setFillerRemovalRepeats: s.setFillerRemovalRepeats,
    setFillerRemovalSilenceThreshold: s.setFillerRemovalSilenceThreshold,
    setRenderQuality: s.setRenderQuality,
    setOutputAspectRatio: s.setOutputAspectRatio,
    setFilenameTemplate: s.setFilenameTemplate,
    setRenderConcurrency: s.setRenderConcurrency,
    resetSettings: s.resetSettings,
    resetSection: s.resetSection
  }))
)

  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.geminiApiKey)
  const [showPexelsKey, setShowPexelsKey] = useState(false)
  const [pexelsKeyDraft, setPexelsKeyDraft] = useState(settings.broll.pexelsApiKey)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(settings.captionStyle.id)
  const [showResetAllDialog, setShowResetAllDialog] = useState(false)

  // Filename template input ref (for cursor-position-aware variable insertion)
  const filenameTemplateInputRef = useRef<HTMLInputElement>(null)

  // Hook template dialog state
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [templateFormName, setTemplateFormName] = useState('')
  const [templateFormTemplate, setTemplateFormTemplate] = useState('{hookText}')
  const [templateFormEmoji, setTemplateFormEmoji] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // All templates: built-ins + user templates
  const allTemplates = [...DEFAULT_HOOK_TEMPLATES, ...hookTemplates]
  const activeTemplate = allTemplates.find((t) => t.id === activeHookTemplateId) ?? null

  function openAddTemplate() {
    setEditingTemplateId(null)
    setTemplateFormName('')
    setTemplateFormTemplate('{hookText}')
    setTemplateFormEmoji('')
    setShowTemplateManager(true)
  }

  function openEditTemplate(t: typeof allTemplates[number]) {
    setEditingTemplateId(t.id)
    setTemplateFormName(t.name)
    setTemplateFormTemplate(t.template)
    setTemplateFormEmoji(t.emoji ?? '')
    setShowTemplateManager(true)
  }

  function handleSaveTemplate() {
    const name = templateFormName.trim()
    const template = templateFormTemplate.trim()
    if (!name || !template) return
    const emoji = templateFormEmoji.trim() || undefined
    if (editingTemplateId) {
      editHookTemplate(editingTemplateId, { name, template, emoji })
    } else {
      addHookTemplate({ name, template, emoji })
    }
    setShowTemplateManager(false)
  }

  // API key validation state
  type ValidationState = 'idle' | 'testing' | 'valid' | 'invalid'
  const [geminiValidation, setGeminiValidation] = useState<{ state: ValidationState; error?: string }>({ state: 'idle' })
  const [pexelsValidation, setPexelsValidation] = useState<{ state: ValidationState; error?: string }>({ state: 'idle' })

  // Available fonts loaded from main process
  const [availableFonts, setAvailableFonts] = useState<Array<{ name: string; path: string; source: 'bundled' | 'system' }>>([])

  // Disk space for the output directory
  const [freeSpace, setFreeSpace] = useState<number | null>(null)

  // Temp file cleanup state
  const [tempInfo, setTempInfo] = useState<{ bytes: number; count: number } | null>(null)
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [cleanupState, setCleanupState] = useState<'idle' | 'cleaning' | 'done'>('idle')
  const [cleanupResult, setCleanupResult] = useState<{ freed: number; deleted: number } | null>(null)
  const [autoCleanup, setAutoCleanup] = useState(() => {
    try { return localStorage.getItem('batchcontent-auto-cleanup') === 'true' } catch { return false }
  })

  // Debug log state
  const [logSize, setLogSize] = useState<number | null>(null)
  const [exportingLog, setExportingLog] = useState(false)

  useEffect(() => {
    if (!settings.outputDirectory) {
      setFreeSpace(null)
      return
    }
    let cancelled = false
    window.api.getDiskSpace(settings.outputDirectory).then((info) => {
      if (!cancelled) setFreeSpace(info.free)
    }).catch(() => {
      if (!cancelled) setFreeSpace(null)
    })
    return () => { cancelled = true }
  }, [settings.outputDirectory])

  // Load available fonts once on mount
  useEffect(() => {
    window.api.getAvailableFonts().then((fonts) => {
      setAvailableFonts(fonts)
    }).catch(() => {
      // Ignore — font picker will simply be empty
    })
  }, [])

  // Load temp file size + cache size + log size once on mount
  useEffect(() => {
    window.api.getTempSize().then(setTempInfo).catch(() => {})
    window.api.getCacheSize().then((r) => setCacheSize(r.bytes)).catch(() => {})
    window.api.getLogSize().then(setLogSize).catch(() => {})
    // Sync auto-cleanup preference to main process on mount
    window.api.setAutoCleanup(autoCleanup).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCleanupTemp() {
    setCleanupState('cleaning')
    setCleanupResult(null)
    try {
      const result = await window.api.cleanupTemp()
      setCleanupResult(result)
      setCleanupState('done')
      // Refresh the temp size after cleanup
      window.api.getTempSize().then(setTempInfo).catch(() => {})
      // Reset "done" state after 4 seconds
      setTimeout(() => setCleanupState('idle'), 4000)
    } catch {
      setCleanupState('idle')
    }
  }

  function handleAutoCleanupToggle(enabled: boolean) {
    setAutoCleanup(enabled)
    try { localStorage.setItem('batchcontent-auto-cleanup', String(enabled)) } catch {}
    window.api.setAutoCleanup(enabled).catch(() => {})
  }

  function handleApiKeyBlur() {
    if (apiKeyDraft !== settings.geminiApiKey) {
      setGeminiApiKey(apiKeyDraft)
    }
  }

  function handlePexelsKeyBlur() {
    if (pexelsKeyDraft !== settings.broll.pexelsApiKey) {
      setBRollPexelsApiKey(pexelsKeyDraft)
      // Reset validation when key changes
      setPexelsValidation({ state: 'idle' })
    }
  }

  async function handleTestGeminiKey() {
    const key = apiKeyDraft.trim()
    if (!key) return
    // Commit the draft first
    if (key !== settings.geminiApiKey) setGeminiApiKey(key)
    setGeminiValidation({ state: 'testing' })
    try {
      const result = await window.api.validateGeminiKey(key)
      setGeminiValidation(result.valid ? { state: 'valid' } : { state: 'invalid', error: result.error })
    } catch {
      setGeminiValidation({ state: 'invalid', error: 'Validation failed' })
    }
  }

  async function handleTestPexelsKey() {
    const key = pexelsKeyDraft.trim()
    if (!key) return
    // Commit the draft first
    if (key !== settings.broll.pexelsApiKey) setBRollPexelsApiKey(key)
    setPexelsValidation({ state: 'testing' })
    try {
      const result = await window.api.validatePexelsKey(key)
      setPexelsValidation(result.valid ? { state: 'valid' } : { state: 'invalid', error: result.error })
    } catch {
      setPexelsValidation({ state: 'invalid', error: 'Validation failed' })
    }
  }

  async function handleBrowseOutput() {
    const dir = await window.api.openDirectory()
    if (dir) {
      setOutputDirectory(dir)
    }
  }

  function handlePresetChange(presetId: string) {
    setSelectedPresetId(presetId)
    const preset = CAPTION_PRESETS[presetId]
    if (preset) {
      setCaptionStyle(preset)
    }
  }

  function handleFontChange(fontName: string) {
    // Find the matching font entry to get its filename for the fontFile field
    const fontEntry = availableFonts.find((f) => f.name === fontName)
    const fontFile = fontEntry
      ? fontEntry.path.replace(/\\/g, '/').split('/').pop() ?? fontName
      : fontName
    setCaptionStyle({ ...settings.captionStyle, fontName, fontFile })
    // Switching font is a custom modification so mark preset as custom
    setSelectedPresetId('custom')
  }

  function handleAnimationChange(animation: CaptionAnimation) {
    setCaptionStyle({ ...settings.captionStyle, animation })
  }

  function handleFontSizeChange(values: number[]) {
    const fontSize = values[0] / 100
    setCaptionStyle({ ...settings.captionStyle, fontSize })
  }

  function handleWordsPerLineChange(values: number[]) {
    setCaptionStyle({ ...settings.captionStyle, wordsPerLine: values[0] })
  }

  function handlePrimaryColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCaptionStyle({ ...settings.captionStyle, primaryColor: e.target.value })
  }

  function handleHighlightColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCaptionStyle({ ...settings.captionStyle, highlightColor: e.target.value })
  }

  const fontSizePercent = Math.round(settings.captionStyle.fontSize * 100)

  // Brand Kit
  const bk = settings.brandKit

  function handleResetAll() {
    resetSettings()
    setShowResetAllDialog(false)
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* AI Settings */}
        <div>
          <div className="flex items-center">
            <SectionHeader>AI Settings</SectionHeader>
            <SectionResetButton section="aiSettings" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            <FieldRow
              label="Gemini API Key"
              htmlFor="gemini-api-key"
              hint="Get your free key at aistudio.google.com"
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="gemini-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={apiKeyDraft}
                    onChange={(e) => {
                      setApiKeyDraft(e.target.value)
                      setGeminiValidation({ state: 'idle' })
                    }}
                    onBlur={handleApiKeyBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleApiKeyBlur()}
                    className="pr-9 font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 px-3"
                  title="Test this API key"
                  disabled={!apiKeyDraft.trim() || geminiValidation.state === 'testing'}
                  onClick={handleTestGeminiKey}
                >
                  {geminiValidation.state === 'testing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : geminiValidation.state === 'valid' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : geminiValidation.state === 'invalid' ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs">
                    {geminiValidation.state === 'testing' ? 'Testing…' :
                     geminiValidation.state === 'valid' ? 'Valid' :
                     geminiValidation.state === 'invalid' ? 'Invalid' : 'Test'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Open aistudio.google.com"
                  onClick={() => window.open('https://aistudio.google.com/app/apikey')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              {geminiValidation.state === 'valid' && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Key is valid and working
                </p>
              )}
              {geminiValidation.state === 'invalid' && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {geminiValidation.error ?? 'Invalid key'}
                </p>
              )}
              {geminiValidation.state === 'idle' && settings.geminiApiKey && (
                <p className="text-xs text-muted-foreground mt-1">✓ API key saved</p>
              )}
            </FieldRow>

            <FieldRow
              label="Minimum Clip Score"
              hint={`Only clips scoring ${settings.minScore}+ will be shown`}
            >
              <div className="flex items-center gap-3">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[settings.minScore]}
                  onValueChange={([v]) => setMinScore(v)}
                  className="flex-1"
                />
                <span className="w-8 text-right text-sm tabular-nums font-medium">
                  {settings.minScore}
                </span>
              </div>
            </FieldRow>
          </div>
        </div>

        <Separator />

        {/* Output */}
        <div>
          <SectionHeader>Output</SectionHeader>
          <div className="space-y-4">
            <FieldRow
              label="Output Directory"
              htmlFor="output-dir"
              hint={settings.outputDirectory ? undefined : 'Where rendered clips will be saved'}
            >
              <div className="flex gap-2">
                <Input
                  id="output-dir"
                  readOnly
                  value={settings.outputDirectory ?? ''}
                  placeholder="Choose a folder…"
                  className="flex-1 text-sm cursor-default"
                  onClick={handleBrowseOutput}
                />
                <Button variant="outline" size="icon" className="shrink-0" onClick={handleBrowseOutput} title="Browse">
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
              {settings.outputDirectory && (
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground truncate flex-1" title={settings.outputDirectory}>
                    {settings.outputDirectory}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={() => window.api.openPath(settings.outputDirectory!)}
                    title="Open in file manager"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {settings.outputDirectory && freeSpace !== null && (
                <div className="flex items-center gap-1.5 mt-1">
                  <HardDrive className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(freeSpace)} free
                  </span>
                </div>
              )}
            </FieldRow>

            {/* Filename Template */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileOutput className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Label htmlFor="filename-template" className="text-sm font-medium">Filename Template</Label>
                <button
                  type="button"
                  onClick={() => setFilenameTemplate(DEFAULT_SETTINGS.filenameTemplate)}
                  className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  title="Reset to default"
                >
                  Reset
                </button>
              </div>
              <Input
                id="filename-template"
                ref={filenameTemplateInputRef}
                value={settings.filenameTemplate}
                onChange={(e) => setFilenameTemplate(e.target.value)}
                className="font-mono text-sm"
                placeholder="{source}_clip{index}_{score}"
                spellCheck={false}
              />
              {/* Variable pills */}
              <div className="flex flex-wrap gap-1">
                {['{source}', '{index}', '{score}', '{hook}', '{duration}', '{start}', '{end}', '{date}', '{quality}'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      const input = filenameTemplateInputRef.current
                      if (!input) {
                        setFilenameTemplate(settings.filenameTemplate + v)
                        return
                      }
                      const start = input.selectionStart ?? settings.filenameTemplate.length
                      const end = input.selectionEnd ?? start
                      const next = settings.filenameTemplate.slice(0, start) + v + settings.filenameTemplate.slice(end)
                      setFilenameTemplate(next)
                      // Restore cursor after React re-render
                      requestAnimationFrame(() => {
                        input.focus()
                        input.setSelectionRange(start + v.length, start + v.length)
                      })
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors"
                    title={`Insert ${v}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {/* Live preview */}
              <p className="text-xs text-muted-foreground">
                Preview:{' '}
                <span className="font-medium text-foreground font-mono">
                  {settings.filenameTemplate
                    .replace(/\{source\}/g, 'my-video')
                    .replace(/\{index\}/g, '01')
                    .replace(/\{score\}/g, '85')
                    .replace(/\{hook\}/g, 'nobody-knows-this')
                    .replace(/\{duration\}/g, '45')
                    .replace(/\{start\}/g, '02-30')
                    .replace(/\{end\}/g, '03-15')
                    .replace(/\{date\}/g, new Date().toISOString().slice(0, 10))
                    .replace(/\{quality\}/g, settings.renderQuality.preset)
                    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                    .trim()
                    .slice(0, 60) || 'clip'}.{settings.renderQuality.outputFormat}
                </span>
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Render Quality */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Render Quality</SectionHeader>
          </div>
          <div className="space-y-4">
            {/* Quality preset buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quality Preset</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: 'draft' as RenderQualityPreset, label: 'Draft', sub: '540p · ~2MB/30s · Fastest' },
                  { value: 'normal' as RenderQualityPreset, label: 'Normal', sub: '1080p · ~5MB/30s · Fast' },
                  { value: 'high' as RenderQualityPreset, label: 'High', sub: '1080p · ~12MB/30s · Slow' },
                  { value: 'custom' as RenderQualityPreset, label: 'Custom', sub: 'Configure manually' }
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRenderQuality({ preset: opt.value })}
                    className={cn(
                      'px-2 py-2 rounded-md border text-left transition-colors',
                      settings.renderQuality.preset === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/60'
                    )}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom controls — only shown when preset === 'custom' */}
            {settings.renderQuality.preset === 'custom' && (
              <div className="space-y-4 pt-1">
                {/* CRF slider */}
                <FieldRow
                  label={`CRF — ${settings.renderQuality.customCrf}`}
                  hint="Lower = better quality, larger file (15–35)"
                >
                  <div className="space-y-1">
                    <Slider
                      min={15}
                      max={35}
                      step={1}
                      value={[settings.renderQuality.customCrf]}
                      onValueChange={([v]) => setRenderQuality({ customCrf: v })}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>15 (Best)</span>
                      <span>35 (Smallest)</span>
                    </div>
                  </div>
                </FieldRow>

                {/* Resolution selector */}
                <FieldRow label="Resolution">
                  <Select
                    value={settings.renderQuality.outputResolution}
                    onValueChange={(v) => setRenderQuality({ outputResolution: v as OutputResolution })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1080x1920">1080×1920 (Full HD)</SelectItem>
                      <SelectItem value="720x1280">720×1280 (HD)</SelectItem>
                      <SelectItem value="540x960">540×960 (SD)</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Encoding preset selector */}
                <FieldRow label="Encoding Speed" hint="Slower = smaller file at same quality">
                  <Select
                    value={settings.renderQuality.encodingPreset}
                    onValueChange={(v) => setRenderQuality({ encodingPreset: v as EncodingPreset })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ultrafast">Ultrafast (draft renders)</SelectItem>
                      <SelectItem value="veryfast">Veryfast (default)</SelectItem>
                      <SelectItem value="medium">Medium (balanced)</SelectItem>
                      <SelectItem value="slow">Slow (best compression)</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
            )}

            {/* Output aspect ratio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: '9:16' as OutputAspectRatio, label: '9:16 Vertical', sub: '1080×1920 · TikTok, Reels, Shorts' },
                  { value: '1:1' as OutputAspectRatio, label: '1:1 Square', sub: '1080×1080 · Instagram Feed' },
                  { value: '4:5' as OutputAspectRatio, label: '4:5 Portrait', sub: '1080×1350 · Instagram Post' },
                  { value: '16:9' as OutputAspectRatio, label: '16:9 Landscape', sub: '1920×1080 · YouTube, Twitter' }
                ] satisfies { value: OutputAspectRatio; label: string; sub: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOutputAspectRatio(opt.value)}
                    className={cn(
                      'px-2 py-2 rounded-md border text-left transition-colors',
                      settings.outputAspectRatio === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Mini aspect ratio shape preview */}
                      <div
                        className={cn(
                          'border rounded-[1px] shrink-0',
                          settings.outputAspectRatio === opt.value ? 'border-primary' : 'border-muted-foreground/40'
                        )}
                        style={{
                          width: opt.value === '16:9' ? 16 : opt.value === '1:1' ? 10 : 6,
                          height: opt.value === '16:9' ? 9 : opt.value === '4:5' ? 12 : opt.value === '1:1' ? 10 : 11
                        }}
                      />
                      <div>
                        <p className="text-xs font-semibold">{opt.label}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">{opt.sub}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {settings.outputAspectRatio !== '9:16' && (
                <p className="text-xs text-amber-500/80">
                  ⚠ Safe zones are designed for 9:16. Other ratios use center-crop from source.
                </p>
              )}
            </div>

            {/* Output format toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Output Format</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: 'mp4' as OutputFormat, label: 'MP4' },
                  { value: 'webm' as OutputFormat, label: 'WebM' }
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRenderQuality({ outputFormat: opt.value })}
                    className={cn(
                      'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors',
                      settings.renderQuality.outputFormat === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/60'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {settings.renderQuality.outputFormat === 'webm' && (
                <p className="text-xs text-muted-foreground">
                  Better quality per byte, slower to encode, less compatible with some platforms.
                </p>
              )}
            </div>

            {/* Parallel Renders */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Label className="text-sm font-medium">
                  Parallel Renders — {settings.renderConcurrency}
                </Label>
              </div>
              <Slider
                min={1}
                max={4}
                step={1}
                value={[settings.renderConcurrency ?? 1]}
                onValueChange={([v]) => setRenderConcurrency(v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 (Sequential)</span>
                <span>2</span>
                <span>3</span>
                <span>4 (Max)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Render multiple clips simultaneously. Higher values use more CPU/GPU resources.
                GPU encoders (NVENC/QSV) are capped at 2 to avoid exhausting hardware sessions.
              </p>
              {(settings.renderConcurrency ?? 1) > 1 && (
                <p className="text-xs text-amber-500/80 flex items-center gap-1">
                  ⚠ May increase memory usage and reduce per-clip rendering speed.
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Notifications</SectionHeader>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-enabled" className="text-sm font-medium cursor-pointer">
                Desktop Notifications
              </Label>
              <Switch
                id="notifications-enabled"
                checked={settings.enableNotifications}
                onCheckedChange={useStore.getState().setEnableNotifications}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Show OS notifications when pipeline processing or rendering completes.
              Notifications are only sent when the app window is not focused.
            </p>
          </div>
        </div>

        <Separator />

        {/* Developer Mode */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Developer Mode</SectionHeader>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="developer-mode-enabled" className="text-sm font-medium cursor-pointer">
                Log FFmpeg Commands
              </Label>
              <Switch
                id="developer-mode-enabled"
                checked={settings.developerMode}
                onCheckedChange={useStore.getState().setDeveloperMode}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, every FFmpeg command is logged to the Error Log during rendering — both
              on success and failure. Click the{' '}
              <span className="inline-flex items-center gap-0.5 font-mono bg-muted rounded px-1">
                <code>⊟</code>
              </span>{' '}
              icon on any error entry to view and copy the full command. Useful for diagnosing render
              failures.
            </p>
          </div>
        </div>

        <Separator />

        {/* Transcription */}
        <div>
          <SectionHeader>Transcription Engine</SectionHeader>
          <div className="space-y-3">
            <FieldRow label="Engine">
              <Select defaultValue="parakeet-tdt-v3">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parakeet-tdt-v3">
                    Parakeet TDT v3 (NVIDIA / NeMo)
                  </SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <p className="text-xs text-muted-foreground">
              Parakeet TDT 0.6B v3 runs locally via Python. First run downloads ~1.2 GB from
              HuggingFace and caches it.
            </p>
          </div>
        </div>

        <Separator />

        {/* Captions */}
        <div>
          <div className="flex items-center">
            <SectionHeader>Caption Style</SectionHeader>
            <SectionResetButton section="captions" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="captions-enabled" className="text-sm font-medium cursor-pointer">
                Burn-in Captions
              </Label>
              <Switch
                id="captions-enabled"
                checked={settings.captionsEnabled}
                onCheckedChange={setCaptionsEnabled}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.captionsEnabled && 'opacity-40 pointer-events-none'
              )}
            >
              {/* Font picker */}
              {availableFonts.length > 0 && (
                <FieldRow label="Font">
                  <div className="flex items-center gap-2">
                    <CaseSensitive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <Select
                      value={settings.captionStyle.fontName}
                      onValueChange={handleFontChange}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose a font…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFonts.some((f) => f.source === 'bundled') && (
                          <SelectGroup>
                            <SelectLabel>Bundled Fonts</SelectLabel>
                            {availableFonts
                              .filter((f) => f.source === 'bundled')
                              .map((font) => (
                                <SelectItem key={font.path} value={font.name}>
                                  {font.name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        )}
                        {availableFonts.some((f) => f.source === 'system') && (
                          <SelectGroup>
                            <SelectLabel>System Fonts</SelectLabel>
                            {availableFonts
                              .filter((f) => f.source === 'system')
                              .map((font) => (
                                <SelectItem key={font.path} value={font.name}>
                                  {font.name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Font name used in ASS subtitle file — must match a font installed on this machine
                  </p>
                </FieldRow>
              )}

              {/* Preset selector */}
              <FieldRow label="Preset">
                <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CAPTION_PRESETS).map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Animation */}
              <FieldRow label="Animation Style">
                <Select
                  value={settings.captionStyle.animation}
                  onValueChange={(v) => handleAnimationChange(v as CaptionAnimation)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Font size */}
              <FieldRow label={`Font Size — ${fontSizePercent}% of frame height`}>
                <Slider
                  min={2}
                  max={12}
                  step={1}
                  value={[fontSizePercent]}
                  onValueChange={handleFontSizeChange}
                />
              </FieldRow>

              {/* Words per line */}
              <FieldRow label={`Words per Line — ${settings.captionStyle.wordsPerLine}`}>
                <Slider
                  min={1}
                  max={8}
                  step={1}
                  value={[settings.captionStyle.wordsPerLine]}
                  onValueChange={handleWordsPerLineChange}
                />
              </FieldRow>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Text Color" htmlFor="primary-color">
                  <div className="flex items-center gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={settings.captionStyle.primaryColor}
                      onChange={handlePrimaryColorChange}
                      className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.captionStyle.primaryColor}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Highlight Color" htmlFor="highlight-color">
                  <div className="flex items-center gap-2">
                    <input
                      id="highlight-color"
                      type="color"
                      value={settings.captionStyle.highlightColor}
                      onChange={handleHighlightColorChange}
                      className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.captionStyle.highlightColor}
                    </span>
                  </div>
                </FieldRow>
              </div>

              {/* Preview swatch */}
              <div
                className="rounded-md border border-border p-3 text-center text-sm font-bold select-none"
                style={{
                  backgroundColor: '#111',
                  color: settings.captionStyle.primaryColor,
                  fontSize: '1rem',
                  textShadow: `0 0 4px ${settings.captionStyle.highlightColor}`
                }}
              >
                <span>{settings.captionStyle.fontName}</span>
                <span className="ml-2 opacity-50">·</span>
                <span className="ml-2">Caption Preview</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Sound Design */}
        <div>
          <div className="flex items-center">
            <SectionHeader>Sound Design</SectionHeader>
            <SectionResetButton section="soundDesign" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="sound-enabled" className="text-sm font-medium cursor-pointer">
                  Auto Sound Design
                </Label>
              </div>
              <Switch
                id="sound-enabled"
                checked={settings.soundDesign.enabled}
                onCheckedChange={setSoundDesignEnabled}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.soundDesign.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              {/* Info note */}
              <p className="text-xs text-muted-foreground">
                Adds background music and SFX hits to rendered clips. Place .mp3 files in{' '}
                <code className="text-xs bg-muted rounded px-1">resources/sfx/</code> and{' '}
                <code className="text-xs bg-muted rounded px-1">resources/music/</code>.
              </p>

              {/* Music track selector */}
              <FieldRow label="Background Music">
                <Select
                  value={settings.soundDesign.backgroundMusicTrack}
                  onValueChange={(v) => setSoundDesignTrack(v as MusicTrack)}
                >
                  <SelectTrigger className="w-full">
                    <Music2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSIC_TRACK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span>{opt.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Music volume */}
              <FieldRow
                label={`Music Volume — ${Math.round(settings.soundDesign.musicVolume * 100)}%`}
                hint="Background music level (keep low to not compete with speaker)"
              >
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[Math.round(settings.soundDesign.musicVolume * 100)]}
                  onValueChange={([v]) => setSoundDesignMusicVolume(v / 100)}
                />
              </FieldRow>

              {/* SFX volume */}
              <FieldRow label={`SFX Volume — ${Math.round(settings.soundDesign.sfxVolume * 100)}%`}>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[Math.round(settings.soundDesign.sfxVolume * 100)]}
                    onValueChange={([v]) => setSoundDesignSfxVolume(v / 100)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Volume for whoosh transitions and emphasis hits
                </p>
              </FieldRow>
            </div>
          </div>
        </div>

        <Separator />

        {/* Auto-Zoom */}
        <div>
          <div className="flex items-center">
            <SectionHeader>Auto-Zoom</SectionHeader>
            <SectionResetButton section="autoZoom" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="w-3.5 h-3.5 text-muted-foreground" />
                <Label htmlFor="zoom-enabled" className="text-sm font-medium cursor-pointer">
                  Ken Burns Auto-Zoom
                </Label>
              </div>
              <Switch
                id="zoom-enabled"
                checked={settings.autoZoom.enabled}
                onCheckedChange={setAutoZoomEnabled}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.autoZoom.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              <p className="text-xs text-muted-foreground">
                Adds subtle zoom-in / zoom-out breathing motion to rendered clips.
                Prevents static talking-head feel and boosts viewer retention.
              </p>

              {/* Intensity selector */}
              <FieldRow
                label="Intensity"
                hint={
                  settings.autoZoom.intensity === 'subtle'
                    ? '±5% zoom — barely noticeable, natural feel'
                    : settings.autoZoom.intensity === 'medium'
                    ? '±9% zoom + horizontal drift — noticeable energy'
                    : '±13% zoom + pronounced drift — cinematic energy'
                }
              >
                <Select
                  value={settings.autoZoom.intensity}
                  onValueChange={(v) => setAutoZoomIntensity(v as ZoomIntensity)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="dynamic">Dynamic</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Interval slider */}
              <FieldRow
                label={`Zoom Interval — ${settings.autoZoom.intervalSeconds}s`}
                hint="Seconds between zoom direction reversals (half the zoom cycle)"
              >
                <Slider
                  min={2}
                  max={10}
                  step={1}
                  value={[settings.autoZoom.intervalSeconds]}
                  onValueChange={([v]) => setAutoZoomInterval(v)}
                />
              </FieldRow>
            </div>
          </div>
        </div>

        <Separator />

        {/* Brand Kit */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Brand Kit</SectionHeader>
            <SectionResetButton section="brandKit" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="brandkit-enabled" className="text-sm font-medium cursor-pointer">
                Apply Brand Kit to Clips
              </Label>
              <Switch
                id="brandkit-enabled"
                checked={bk.enabled}
                onCheckedChange={setBrandKitEnabled}
              />
            </div>

            <div className={cn('space-y-4 transition-opacity', !bk.enabled && 'opacity-40 pointer-events-none')}>

              {/* Logo upload */}
              <FieldRow label="Logo Watermark">
                <DropZone
                  accept={['image/png', 'image/jpeg', 'image/webp']}
                  maxSizeMB={5}
                  onFile={setBrandKitLogoPath}
                  copyFile={window.api.copyBrandLogo}
                  openPicker={window.api.selectBrandLogo}
                  label="Upload Logo"
                  icon={Image}
                  hint="PNG, JPG, WEBP · Max 5 MB"
                  currentFile={bk.logoPath}
                  onRemove={() => setBrandKitLogoPath(null)}
                />
              </FieldRow>

              {/* Logo controls — only shown when logo is set */}
              {bk.logoPath && (
                <>
                  {/* Logo position */}
                  <FieldRow label="Logo Position">
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as LogoPosition[]).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setBrandKitLogoPosition(pos)}
                          className={cn(
                            'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors',
                            bk.logoPosition === pos
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/60'
                          )}
                        >
                          {pos === 'top-left' && '↖ Top Left'}
                          {pos === 'top-right' && '↗ Top Right'}
                          {pos === 'bottom-left' && '↙ Bottom Left'}
                          {pos === 'bottom-right' && '↘ Bottom Right'}
                        </button>
                      ))}
                    </div>
                  </FieldRow>

                  {/* Logo scale */}
                  <FieldRow
                    label={`Logo Size — ${Math.round(bk.logoScale * 100)}% of frame width`}
                    hint={`~${Math.round(bk.logoScale * 1080)}px wide on 1080p`}
                  >
                    <Slider
                      min={5}
                      max={30}
                      step={1}
                      value={[Math.round(bk.logoScale * 100)]}
                      onValueChange={([v]) => setBrandKitLogoScale(v / 100)}
                    />
                  </FieldRow>

                  {/* Logo opacity */}
                  <FieldRow label={`Logo Opacity — ${Math.round(bk.logoOpacity * 100)}%`}>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[Math.round(bk.logoOpacity * 100)]}
                      onValueChange={([v]) => setBrandKitLogoOpacity(v / 100)}
                    />
                  </FieldRow>
                </>
              )}

              {/* Intro bumper */}
              <FieldRow label="Intro Bumper" hint="Prepended to every clip">
                <DropZone
                  accept={['video/mp4', 'video/quicktime', 'video/webm']}
                  maxSizeMB={200}
                  onFile={setBrandKitIntroBumperPath}
                  copyFile={window.api.copyBrandBumper}
                  openPicker={window.api.selectIntroBumper}
                  label="Upload Intro Bumper"
                  icon={Film}
                  hint="MP4, MOV, WEBM · Max 200 MB"
                  currentFile={bk.introBumperPath}
                  onRemove={() => setBrandKitIntroBumperPath(null)}
                />
              </FieldRow>

              {/* Outro bumper */}
              <FieldRow label="Outro Bumper" hint="Appended after every clip">
                <DropZone
                  accept={['video/mp4', 'video/quicktime', 'video/webm']}
                  maxSizeMB={200}
                  onFile={setBrandKitOutroBumperPath}
                  copyFile={window.api.copyBrandBumper}
                  openPicker={window.api.selectOutroBumper}
                  label="Upload Outro Bumper"
                  icon={Film}
                  hint="MP4, MOV, WEBM · Max 200 MB"
                  currentFile={bk.outroBumperPath}
                  onRemove={() => setBrandKitOutroBumperPath(null)}
                />
              </FieldRow>

            </div>
          </div>
        </div>

        <Separator />

        {/* Hook Title Overlay */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Hook Title Overlay</SectionHeader>
            <SectionResetButton section="hookTitle" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="hook-title-enabled" className="text-sm font-medium cursor-pointer">
                Burn-in Hook Title
              </Label>
              <Switch
                id="hook-title-enabled"
                checked={settings.hookTitleOverlay.enabled}
                onCheckedChange={setHookTitleEnabled}
              />
            </div>

            {/* Hook text template selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Hook Text Template</Label>
              <div className="flex gap-2">
                <Select
                  value={activeHookTemplateId ?? '__none__'}
                  onValueChange={(v) => setActiveHookTemplateId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="None (AI Default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (AI default)</SelectItem>
                    {allTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.emoji ? `${t.emoji} ` : ''}{t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Manage templates"
                  onClick={openAddTemplate}
                >
                  <PenSquare className="w-4 h-4" />
                </Button>
              </div>
              {activeTemplate && (
                <p className="text-xs text-muted-foreground">
                  Preview:{' '}
                  <span className="font-medium text-foreground">
                    {applyHookTemplate(activeTemplate.template, 'This changes everything')}
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Wraps the AI-generated hook text through the selected template before rendering.
              </p>
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.hookTitleOverlay.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              <p className="text-xs text-muted-foreground">
                Renders the AI-generated hook text (e.g. "Wait for it…", "Nobody talks about this")
                as a bold overlay in the first {settings.hookTitleOverlay.displayDuration.toFixed(1)}s
                of every clip. Uses each clip&apos;s hook text from the scoring step.
              </p>

              {/* Style selector */}
              <FieldRow
                label="Overlay Style"
                hint={
                  settings.hookTitleOverlay.style === 'centered-bold'
                    ? 'White text centered at top of frame with black outline'
                    : settings.hookTitleOverlay.style === 'top-bar'
                    ? 'Semi-transparent dark bar behind centered text'
                    : 'Text slides in from the left while fading in'
                }
              >
                <Select
                  value={settings.hookTitleOverlay.style}
                  onValueChange={(v) => setHookTitleStyle(v as HookTitleStyle)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centered-bold">Centered Bold</SelectItem>
                    <SelectItem value="top-bar">Top Bar</SelectItem>
                    <SelectItem value="slide-in">Slide In</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Display duration slider */}
              <FieldRow
                label={`Display Duration — ${settings.hookTitleOverlay.displayDuration.toFixed(1)}s`}
                hint="How long the hook text stays visible"
              >
                <Slider
                  min={10}
                  max={50}
                  step={1}
                  value={[Math.round(settings.hookTitleOverlay.displayDuration * 10)]}
                  onValueChange={([v]) => setHookTitleDisplayDuration(v / 10)}
                />
              </FieldRow>

              {/* Font size slider */}
              <FieldRow
                label={`Font Size — ${settings.hookTitleOverlay.fontSize}px`}
                hint="Text size on 1080×1920 canvas"
              >
                <Slider
                  min={40}
                  max={120}
                  step={4}
                  value={[settings.hookTitleOverlay.fontSize]}
                  onValueChange={([v]) => setHookTitleFontSize(v)}
                />
              </FieldRow>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Text Color" htmlFor="hook-text-color">
                  <div className="flex items-center gap-2">
                    <input
                      id="hook-text-color"
                      type="color"
                      value={settings.hookTitleOverlay.textColor}
                      onChange={(e) => setHookTitleTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.hookTitleOverlay.textColor}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Outline Color" htmlFor="hook-outline-color">
                  <div className="flex items-center gap-2">
                    <input
                      id="hook-outline-color"
                      type="color"
                      value={settings.hookTitleOverlay.outlineColor}
                      onChange={(e) => setHookTitleOutlineColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.hookTitleOverlay.outlineColor}
                    </span>
                  </div>
                </FieldRow>
              </div>

              {/* Preview swatch */}
              <div
                className="rounded-md border border-border p-3 text-center font-bold select-none"
                style={{
                  backgroundColor: '#111',
                  color: settings.hookTitleOverlay.textColor,
                  fontSize: `${Math.round(settings.hookTitleOverlay.fontSize / 72 * 28)}px`,
                  WebkitTextStroke: `2px ${settings.hookTitleOverlay.outlineColor}`,
                  textShadow: `2px 2px 0 ${settings.hookTitleOverlay.outlineColor}`
                }}
              >
                Hook Preview
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Re-hook Overlay */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SectionHeader>Re-hook Overlay</SectionHeader>
            <SectionResetButton section="rehook" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="rehook-enabled" className="text-sm font-medium cursor-pointer">
                Burn-in Re-hook Text
              </Label>
              <Switch
                id="rehook-enabled"
                checked={settings.rehookOverlay.enabled}
                onCheckedChange={setRehookEnabled}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.rehookOverlay.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              <p className="text-xs text-muted-foreground">
                Renders a follow-up text overlay immediately after the hook title disappears,
                adding extra context. White rounded box with dark text, same style as the hook.
              </p>

              <FieldRow
                label={`Display Duration — ${settings.rehookOverlay.displayDuration.toFixed(1)}s`}
              >
                <Slider
                  min={5}
                  max={40}
                  step={1}
                  value={[Math.round(settings.rehookOverlay.displayDuration * 10)]}
                  onValueChange={([v]) => setRehookDisplayDuration(v / 10)}
                />
              </FieldRow>

              <p className="text-xs text-muted-foreground italic">
                Visual settings (font size, text color, outline) are inherited from Hook Title Overlay above.
              </p>


            </div>
          </div>
        </div>

        <Separator />

        {/* Progress Bar Overlay */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {/* Inline SVG progress bar icon — not in lucide-react */}
            <svg className="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="6" width="14" height="4" rx="1" />
              <rect x="1" y="6" width="7" height="4" rx="1" fill="currentColor" stroke="none" />
            </svg>
            <SectionHeader>Progress Bar Overlay</SectionHeader>
            <SectionResetButton section="progressBar" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="progress-bar-enabled" className="text-sm font-medium cursor-pointer">
                Burn-in Progress Bar
              </Label>
              <Switch
                id="progress-bar-enabled"
                checked={settings.progressBarOverlay.enabled}
                onCheckedChange={setProgressBarEnabled}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.progressBarOverlay.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              <p className="text-xs text-muted-foreground">
                Renders an animated bar that fills left→right over the clip duration. Viewers see
                how much is left and are more likely to finish ("it&apos;s almost done").
              </p>

              {/* Position toggle */}
              <FieldRow label="Position" hint="Where on the frame the bar is anchored">
                <div className="grid grid-cols-2 gap-1.5">
                  {(['bottom', 'top'] as ProgressBarPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setProgressBarPosition(pos)}
                      className={cn(
                        'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors',
                        settings.progressBarOverlay.position === pos
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/60'
                      )}
                    >
                      {pos === 'bottom' ? '↓ Bottom Edge' : '↑ Top Edge'}
                    </button>
                  ))}
                </div>
              </FieldRow>

              {/* Style selector */}
              <FieldRow
                label="Visual Style"
                hint={
                  settings.progressBarOverlay.style === 'solid'
                    ? 'Flat single-color bar — clean and minimal'
                    : settings.progressBarOverlay.style === 'gradient'
                    ? 'Bar with a white top-edge highlight for a dimensional look'
                    : 'Bar with a soft outer glow halo for visual prominence'
                }
              >
                <Select
                  value={settings.progressBarOverlay.style}
                  onValueChange={(v) => setProgressBarStyle(v as ProgressBarStyle)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="glow">Glow</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Height slider */}
              <FieldRow
                label={`Bar Height — ${settings.progressBarOverlay.height}px`}
                hint="Thickness on the 1080×1920 canvas (2–8 px)"
              >
                <Slider
                  min={2}
                  max={8}
                  step={1}
                  value={[settings.progressBarOverlay.height]}
                  onValueChange={([v]) => setProgressBarHeight(v)}
                />
              </FieldRow>

              {/* Opacity slider */}
              <FieldRow label={`Opacity — ${Math.round(settings.progressBarOverlay.opacity * 100)}%`}>
                <Slider
                  min={20}
                  max={100}
                  step={5}
                  value={[Math.round(settings.progressBarOverlay.opacity * 100)]}
                  onValueChange={([v]) => setProgressBarOpacity(v / 100)}
                />
              </FieldRow>

              {/* Color picker */}
              <FieldRow label="Bar Color" htmlFor="progress-bar-color">
                <div className="flex items-center gap-2">
                  <input
                    id="progress-bar-color"
                    type="color"
                    value={settings.progressBarOverlay.color}
                    onChange={(e) => setProgressBarColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {settings.progressBarOverlay.color}
                  </span>
                </div>
              </FieldRow>

              {/* Live preview */}
              <div
                className="rounded-md border border-border overflow-hidden select-none"
                style={{ backgroundColor: '#111', height: '48px', position: 'relative' }}
                title="Preview — bar shown at ~60% progress"
              >
                {/* Glow layer */}
                {settings.progressBarOverlay.style === 'glow' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: settings.progressBarOverlay.position === 'bottom' ? 0 : undefined,
                      top: settings.progressBarOverlay.position === 'top' ? 0 : undefined,
                      left: 0,
                      width: '60%',
                      height: `${Math.min(settings.progressBarOverlay.height + 4, 12)}px`,
                      backgroundColor: settings.progressBarOverlay.color,
                      opacity: settings.progressBarOverlay.opacity * 0.35,
                      filter: 'blur(2px)'
                    }}
                  />
                )}
                {/* Main bar */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: settings.progressBarOverlay.position === 'bottom' ? 0 : undefined,
                    top: settings.progressBarOverlay.position === 'top' ? 0 : undefined,
                    left: 0,
                    width: '60%',
                    height: `${settings.progressBarOverlay.height}px`,
                    backgroundColor: settings.progressBarOverlay.color,
                    opacity: settings.progressBarOverlay.opacity
                  }}
                />
                {/* Gradient highlight */}
                {settings.progressBarOverlay.style === 'gradient' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: settings.progressBarOverlay.position === 'bottom' ? 0 : undefined,
                      top: settings.progressBarOverlay.position === 'top' ? 0 : undefined,
                      left: 0,
                      width: '60%',
                      height: `${Math.max(1, Math.floor(settings.progressBarOverlay.height / 2))}px`,
                      backgroundColor: '#FFFFFF',
                      opacity: 0.30
                    }}
                  />
                )}
                <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 pointer-events-none">
                  Preview at 60%
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Filler & Silence Removal */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Filler &amp; Silence Removal</SectionHeader>
            <SectionResetButton section="fillerRemoval" onReset={resetSection} />
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="filler-enabled" className="text-sm font-medium cursor-pointer">
              Auto-Remove Fillers &amp; Dead Air
            </Label>
            <Switch
              id="filler-enabled"
              checked={settings.fillerRemoval.enabled}
              onCheckedChange={setFillerRemovalEnabled}
            />
          </div>

          <div
            className={cn(
              'space-y-4 transition-opacity',
              !settings.fillerRemoval.enabled && 'opacity-40 pointer-events-none'
            )}
          >
            <p className="text-xs text-muted-foreground">
              Automatically detects and removes filler words (um, uh, like), awkward pauses,
              and stuttered repeats — creating tight, fast-paced jump cuts that boost retention.
              Works like Captions.ai and Descript.
            </p>

            {/* Sub-toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="filler-words-toggle" className="text-sm cursor-pointer">
                  Remove filler words
                </Label>
                <Switch
                  id="filler-words-toggle"
                  checked={settings.fillerRemoval.removeFillerWords}
                  onCheckedChange={setFillerRemovalFillerWords}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="filler-silences-toggle" className="text-sm cursor-pointer">
                  Trim long silences
                </Label>
                <Switch
                  id="filler-silences-toggle"
                  checked={settings.fillerRemoval.trimSilences}
                  onCheckedChange={setFillerRemovalSilences}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="filler-repeats-toggle" className="text-sm cursor-pointer">
                  Remove repeated starts
                </Label>
                <Switch
                  id="filler-repeats-toggle"
                  checked={settings.fillerRemoval.removeRepeats}
                  onCheckedChange={setFillerRemovalRepeats}
                />
              </div>
            </div>

            {/* Silence threshold slider */}
            <FieldRow
              label={`Silence Threshold — ${settings.fillerRemoval.silenceThreshold.toFixed(1)}s`}
              hint="Pauses longer than this are trimmed (0.4–2.0 seconds)"
            >
              <Slider
                min={4}
                max={20}
                step={1}
                value={[settings.fillerRemoval.silenceThreshold * 10]}
                onValueChange={([v]) => setFillerRemovalSilenceThreshold(v / 10)}
              />
            </FieldRow>

            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong> Uses word-level timestamps from transcription to identify
              filler words, long gaps, and stutters. Removes them with frame-accurate cuts and
              re-syncs captions automatically. Requires transcription to be completed first.
            </p>
          </div>
        </div>

        <Separator />

        {/* B-Roll Insertion */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>B-Roll Insertion</SectionHeader>
            <SectionResetButton section="broll" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="broll-enabled" className="text-sm font-medium cursor-pointer">
                Auto B-Roll (Pexels Stock Footage)
              </Label>
              <Switch
                id="broll-enabled"
                checked={settings.broll.enabled}
                onCheckedChange={setBRollEnabled}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.broll.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              <p className="text-xs text-muted-foreground">
                Automatically inserts relevant Pexels stock footage every few seconds to break up
                talking-head monotony and boost viewer retention — the same feature as Opus Clip Pro.
                Clips are cached locally so the same footage isn&apos;t re-downloaded.
              </p>

              {/* Pexels API key */}
              <FieldRow
                label="Pexels API Key"
                htmlFor="pexels-api-key"
                hint="Free at pexels.com/api — 200 requests/hour, 20,000/month"
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="pexels-api-key"
                      type={showPexelsKey ? 'text' : 'password'}
                      placeholder="Your Pexels API key…"
                      value={pexelsKeyDraft}
                      onChange={(e) => {
                        setPexelsKeyDraft(e.target.value)
                        setPexelsValidation({ state: 'idle' })
                      }}
                      onBlur={handlePexelsKeyBlur}
                      onKeyDown={(e) => e.key === 'Enter' && handlePexelsKeyBlur()}
                      className="pr-9 font-mono text-sm"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPexelsKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPexelsKey ? 'Hide Pexels key' : 'Show Pexels key'}
                    >
                      {showPexelsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 px-3"
                    title="Test this API key"
                    disabled={!pexelsKeyDraft.trim() || pexelsValidation.state === 'testing'}
                    onClick={handleTestPexelsKey}
                  >
                    {pexelsValidation.state === 'testing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : pexelsValidation.state === 'valid' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : pexelsValidation.state === 'invalid' ? (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs">
                      {pexelsValidation.state === 'testing' ? 'Testing…' :
                       pexelsValidation.state === 'valid' ? 'Valid' :
                       pexelsValidation.state === 'invalid' ? 'Invalid' : 'Test'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Get a free Pexels API key"
                    onClick={() => window.open('https://www.pexels.com/api/')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                {pexelsValidation.state === 'valid' && (
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Key is valid and working
                  </p>
                )}
                {pexelsValidation.state === 'invalid' && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {pexelsValidation.error ?? 'Invalid key'}
                  </p>
                )}
                {pexelsValidation.state === 'idle' && settings.broll.pexelsApiKey && (
                  <p className="text-xs text-muted-foreground mt-1">✓ Pexels API key saved</p>
                )}
              </FieldRow>

              {/* B-Roll interval */}
              <FieldRow
                label={`B-Roll Every — ${settings.broll.intervalSeconds}s`}
                hint="Target interval between B-Roll clip insertions"
              >
                <Slider
                  min={3}
                  max={10}
                  step={1}
                  value={[settings.broll.intervalSeconds]}
                  onValueChange={([v]) => setBRollIntervalSeconds(v)}
                />
              </FieldRow>

              {/* B-Roll clip duration */}
              <FieldRow
                label={`Clip Duration — ${settings.broll.clipDuration}s`}
                hint="How long each B-Roll overlay lasts (2–6 seconds)"
              >
                <Slider
                  min={2}
                  max={6}
                  step={1}
                  value={[settings.broll.clipDuration]}
                  onValueChange={([v]) => setBRollClipDuration(v)}
                />
              </FieldRow>

              <p className="text-xs text-muted-foreground">
                <strong>How it works:</strong> At render time, Gemini AI extracts visual keywords
                from each clip&apos;s transcript, searches Pexels for matching stock footage, and
                composites it onto your video with 0.3s fade transitions. The first 3 seconds
                (the hook) are never covered.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Storage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Storage</SectionHeader>
          </div>
          <div className="space-y-4">
            {/* Temp files row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Temp Files</p>
                  <p className="text-xs text-muted-foreground">
                    {tempInfo == null
                      ? 'Scanning…'
                      : tempInfo.count === 0
                      ? 'No temp files found'
                      : `${formatFileSize(tempInfo.bytes)} · ${tempInfo.count} file${tempInfo.count === 1 ? '' : 's'}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  disabled={cleanupState === 'cleaning' || (tempInfo != null && tempInfo.count === 0)}
                  onClick={handleCleanupTemp}
                >
                  {cleanupState === 'cleaning' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs">
                    {cleanupState === 'cleaning' ? 'Cleaning…' : 'Clean Up'}
                  </span>
                </Button>
              </div>
              {cleanupState === 'done' && cleanupResult && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Freed {formatFileSize(cleanupResult.freed)} ({cleanupResult.deleted} file{cleanupResult.deleted === 1 ? '' : 's'} deleted)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                WAV audio, PNG thumbnails, ASS caption files, and B-Roll cache created during processing.
              </p>
            </div>

            {/* AI Model Cache row */}
            <div className="space-y-1">
              <p className="text-sm font-medium">AI Model Cache</p>
              <p className="text-xs text-muted-foreground">
                {cacheSize == null
                  ? 'Checking…'
                  : cacheSize === 0
                  ? 'Not downloaded yet'
                  : `${formatFileSize(cacheSize)} — Parakeet TDT transcription model`}
              </p>
              <p className="text-xs text-muted-foreground">
                Stored in <code className="bg-muted rounded px-1 font-mono">~/.cache/huggingface</code>. Delete manually to re-download.
              </p>
            </div>

            {/* Auto-cleanup toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-cleanup" className="text-sm font-medium cursor-pointer">
                  Auto-cleanup on Exit
                </Label>
                <p className="text-xs text-muted-foreground">Delete temp files when the app closes</p>
              </div>
              <Switch
                id="auto-cleanup"
                checked={autoCleanup}
                onCheckedChange={handleAutoCleanupToggle}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Debug Log */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Debug Log</SectionHeader>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Session Log</p>
                <p className="text-xs text-muted-foreground">
                  {logSize == null
                    ? 'Checking…'
                    : logSize === 0
                    ? 'No log data yet'
                    : `${formatFileSize(logSize)} — current session`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title="Open the logs folder in your file manager"
                  onClick={() => window.api.openLogFolder().catch(() => {})}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="text-xs">Open Folder</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title="Export full debug log for support"
                  disabled={exportingLog}
                  onClick={async () => {
                    setExportingLog(true)
                    try {
                      const result = await window.api.exportLogs([])
                      if (result) {
                        window.api.showItemInFolder(result.exportPath)
                      }
                    } catch {
                      // ignore
                    } finally {
                      setExportingLog(false)
                    }
                  }}
                >
                  {exportingLog ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs">{exportingLog ? 'Exporting…' : 'Export Log'}</span>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The session log captures all main-process activity — FFmpeg commands, AI calls,
              render progress, and errors. Useful for diagnosing issues or sharing with support.
              Logs are rotated automatically (last 5 sessions kept).
            </p>
          </div>
        </div>

        <Separator />

        {/* Reset All */}
        <div className="pb-2">
          <Button
            variant="ghost"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowResetAllDialog(true)}
          >
            <RotateCcw className="w-4 h-4" />
            Reset All Settings to Defaults
          </Button>
        </div>

      </div>

      {/* Template Manager Dialog */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId ? 'Edit Template' : 'Hook Text Templates'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplateId
                ? 'Edit this custom template. Use {hookText} as the placeholder for the AI-generated text.'
                : 'Create and manage hook text templates. Use {hookText} as the placeholder.'}
            </DialogDescription>
          </DialogHeader>

          {/* Template form */}
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="text-sm">Name</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Warning Style"
                value={templateFormName}
                onChange={(e) => setTemplateFormName(e.target.value)}
                autoFocus={!editingTemplateId}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-template" className="text-sm">Template</Label>
              <Input
                id="tpl-template"
                placeholder="e.g. ⚠️ {hookText}"
                value={templateFormTemplate}
                onChange={(e) => setTemplateFormTemplate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateFormName.trim() && templateFormTemplate.trim()) {
                    handleSaveTemplate()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted rounded px-1">{'{hookText}'}</code> where the AI text should appear.
                Also supports <code className="bg-muted rounded px-1">{'{score}'}</code> and <code className="bg-muted rounded px-1">{'{duration}'}</code>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-emoji" className="text-sm">Emoji (optional)</Label>
              <Input
                id="tpl-emoji"
                placeholder="e.g. ⚠️"
                value={templateFormEmoji}
                onChange={(e) => setTemplateFormEmoji(e.target.value)}
                className="w-24"
              />
            </div>
            {templateFormTemplate && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">Live preview:</p>
                <p className="text-sm font-medium">
                  {applyHookTemplate(templateFormTemplate, 'This changes everything')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowTemplateManager(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateFormName.trim() || !templateFormTemplate.trim()}
              className="w-full sm:w-auto"
            >
              {editingTemplateId ? 'Save Changes' : 'Add Template'}
            </Button>
          </DialogFooter>

          {/* Existing user templates list */}
          {hookTemplates.length > 0 && !editingTemplateId && (
            <div className="border-t border-border pt-3 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                My Templates
              </p>
              {hookTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 group"
                >
                  {t.emoji && <span className="text-sm">{t.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{t.template}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEditTemplate(t)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Edit template"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeHookTemplate(t.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset All Confirmation Dialog */}
      <Dialog open={showResetAllDialog} onOpenChange={setShowResetAllDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset All Settings?</DialogTitle>
            <DialogDescription>
              This will reset all render settings to their factory defaults. Your API keys and
              output directory will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetAllDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetAll}>
              Reset to Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ScrollArea>
  )
}
