import { Settings, AlertTriangle, Save, FolderOpen, Keyboard, Sun, Moon, Monitor, GraduationCap, Megaphone } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SourceInput } from './components/SourceInput'
import { ProcessingPanel } from './components/ProcessingPanel'
import { ClipGrid } from './components/ClipGrid'
import { SettingsPanel } from './components/SettingsPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorLog } from './components/ErrorLog'
import { SetupWizard } from './components/SetupWizard'
import { OnboardingWizard } from './components/OnboardingWizard'
import { KeyboardShortcutsDialog } from './components/KeyboardShortcutsDialog'
import { RecentProjectsList, RecentProjectsDropdown, type RecentProjectEntry } from './components/RecentProjects'
import { AiUsageIndicator } from './components/AiUsageIndicator'
import { ResourceMonitor } from './components/ResourceMonitor'
import { OfflineBanner } from './components/OfflineBanner'
import { WhatsNew, APP_VERSION } from './components/WhatsNew'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTheme } from './hooks/useTheme'
import { useStore } from './store'

function App() {
  const activeSource = useStore((s) => s.getActiveSource())
  const activeSourceId = useStore((s) => s.activeSourceId)
  const pipeline = useStore((s) => s.pipeline)
  const errorCount = useStore((s) => s.errorLog.length)
  const saveProject = useStore((s) => s.saveProject)
  const loadProject = useStore((s) => s.loadProject)
  const loadProjectFromPath = useStore((s) => s.loadProjectFromPath)
  const pythonStatus = useStore((s) => s.pythonStatus)
  const setPythonStatus = useStore((s) => s.setPythonStatus)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const hasCompletedOnboarding = useStore((s) => s.hasCompletedOnboarding)
  const setOnboardingComplete = useStore((s) => s.setOnboardingComplete)
  const trackTokenUsage = useStore((s) => s.trackTokenUsage)
  const lastSeenVersion = useStore((s) => s.lastSeenVersion)
  const setLastSeenVersion = useStore((s) => s.setLastSeenVersion)
  const [onboardingOpen, setOnboardingOpen] = useState(!hasCompletedOnboarding)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [previewClipIndex, setPreviewClipIndex] = useState<number | null>(null)

  useTheme()

  // Subscribe to AI token usage events from the main process
  useEffect(() => {
    if (!window.api?.onAiTokenUsage) return
    const unsubscribe = window.api.onAiTokenUsage((data) => {
      trackTokenUsage(data)
    })
    return unsubscribe
  }, [trackTokenUsage])

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const shortcutCallbacks = useMemo(() => ({
    onOpenSettings: () => setSettingsOpen(true),
    onSave: () => handleSave(),
    onLoad: () => handleLoad(),
    onOpenPreview: (clipIndex: number) => setPreviewClipIndex(clipIndex),
    onShowHelp: () => setHelpOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  useKeyboardShortcuts(shortcutCallbacks)

  // Show What's New dialog when the app version changes
  useEffect(() => {
    if (lastSeenVersion !== APP_VERSION) {
      // Small delay so the app renders first before showing the dialog
      const timer = setTimeout(() => setWhatsNewOpen(true), 600)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleWhatsNewClose() {
    setLastSeenVersion(APP_VERSION)
    setWhatsNewOpen(false)
  }

  // Check Python setup status on mount
  useEffect(() => {
    if (!window.api?.getPythonStatus) {
      setPythonStatus('skipped')
      return
    }
    window.api.getPythonStatus().then((status) => {
      setPythonStatus(status.ready ? 'ready' : 'not-setup')
    }).catch(() => {
      setPythonStatus('not-setup')
    })
  }, [setPythonStatus])

  async function handleSave() {
    setIsSaving(true)
    try {
      await saveProject()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLoad() {
    setIsLoading(true)
    try {
      await loadProject()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLoadFromRecent(entry: RecentProjectEntry) {
    setIsLoading(true)
    try {
      await loadProjectFromPath(entry.path)
    } finally {
      setIsLoading(false)
    }
  }

  const showProcessingPanel =
    activeSource !== null &&
    pipeline.stage !== 'ready' &&
    pipeline.stage !== 'rendering' &&
    pipeline.stage !== 'done'

  const showGrid =
    activeSource !== null &&
    (pipeline.stage === 'ready' || pipeline.stage === 'rendering' || pipeline.stage === 'done')

  // Disable transition animations while the pipeline is actively running to avoid
  // visual glitches on top of live progress updates.
  const isProcessingActive =
    pipeline.stage !== 'idle' &&
    pipeline.stage !== 'ready' &&
    pipeline.stage !== 'rendering' &&
    pipeline.stage !== 'done' &&
    pipeline.stage !== 'error'

  // Resource monitor is active whenever the pipeline is running or rendering
  const isResourceMonitorActive =
    pipeline.stage !== 'idle' &&
    pipeline.stage !== 'ready' &&
    pipeline.stage !== 'done' &&
    pipeline.stage !== 'error'

  // Key the animated region by source + panel type so switching either triggers a transition
  const contentAnimKey = activeSourceId
    ? `${activeSourceId}-${showProcessingPanel ? 'proc' : showGrid ? 'grid' : 'empty'}`
    : 'no-source'

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Offline banner */}
      <OfflineBanner />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">BatchContent</h1>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                {errorCount}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleLoad}
            disabled={isLoading}
            title="Open Project (Ctrl+O)"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleSave}
            disabled={isSaving}
            title="Save Project (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
          <RecentProjectsDropdown onLoad={handleLoadFromRecent} />
          <AiUsageIndicator />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="What's New"
            onClick={() => setWhatsNewOpen(true)}
          >
            <Megaphone className="w-4 h-4" />
          </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Toggle theme"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 w-4 h-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 w-4 h-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 w-4 h-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Show Tutorial"
          onClick={() => setOnboardingOpen(true)}
        >
          <GraduationCap className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Keyboard Shortcuts (?)"
          onClick={() => setHelpOpen(true)}
        >
          <Keyboard className="w-4 h-4" />
        </Button>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings (Ctrl+,)">
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <SettingsPanel />
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — source input */}
        <aside className="w-80 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Source Videos
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <SourceInput />
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={contentAnimKey}
              className="flex-1 overflow-hidden flex flex-col"
              initial={isProcessingActive ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={isProcessingActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{
                enter: { duration: 0.2, ease: 'easeOut' },
                exit: { duration: 0.15, ease: 'easeIn' }
              }}
            >
              {showProcessingPanel ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center">
                    <ProcessingPanel />
                  </div>
                </div>
              ) : showGrid ? (
                <ClipGrid />
              ) : !activeSource ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 gap-6">
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Select a source video to begin</p>
                    <p className="text-muted-foreground/50 text-xs mt-1">
                      Add a local file or YouTube URL in the sidebar
                    </p>
                  </div>
                  <RecentProjectsList onLoad={handleLoadFromRecent} />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Error log panel */}
      <ErrorLog />

      {/* System resource monitor — visible during processing and rendering */}
      <ResourceMonitor active={isResourceMonitorActive} />

      {/* Python setup wizard overlay */}
      {pythonStatus !== 'ready' && pythonStatus !== 'skipped' && <SetupWizard />}

      {/* Onboarding wizard */}
      <OnboardingWizard
        open={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false)
          setOnboardingComplete()
        }}
      />

      {/* Keyboard shortcuts help dialog */}
      <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />

      {/* What's New changelog dialog */}
      <WhatsNew open={whatsNewOpen} onOpenChange={(open) => {
        if (!open) handleWhatsNewClose()
      }} />
    </div>
  )
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={0}>
        <App />
      </TooltipProvider>
    </ErrorBoundary>
  )
}

export default AppWithBoundary
