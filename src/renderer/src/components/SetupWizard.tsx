import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Package,
  CheckCircle2,
  Loader2,
  XCircle,
  RefreshCw,
  SkipForward,
  HardDrive,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { useStore } from '../store'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '../lib/utils'

// ── Step definitions ──────────────────────────────────────────────────────────

interface StepDef {
  stage: string
  label: string
  icon: React.ReactNode
}

const STEPS: StepDef[] = [
  { stage: 'downloading-python', label: 'Downloading Python Runtime', icon: <Download className="w-3.5 h-3.5" /> },
  { stage: 'extracting', label: 'Extracting Python', icon: <Package className="w-3.5 h-3.5" /> },
  { stage: 'creating-venv', label: 'Creating Virtual Environment', icon: <HardDrive className="w-3.5 h-3.5" /> },
  { stage: 'installing-packages', label: 'Installing AI Packages', icon: <Package className="w-3.5 h-3.5" /> },
  { stage: 'verifying', label: 'Verifying Installation', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
]

// Stages that are effectively skipped on macOS/Linux (python already exists)
const ALWAYS_SHOW_STAGES = new Set(['installing-packages', 'verifying'])

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

// ── SetupWizard ───────────────────────────────────────────────────────────────

export function SetupWizard() {
  const pythonStatus = useStore((s) => s.pythonStatus)
  const setupError = useStore((s) => s.pythonSetupError)
  const setupProgress = useStore((s) => s.pythonSetupProgress)
  const setPythonStatus = useStore((s) => s.setPythonStatus)
  const setPythonSetupError = useStore((s) => s.setPythonSetupError)
  const setPythonSetupProgress = useStore((s) => s.setPythonSetupProgress)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track which stages have been seen (to show completed steps)
  const seenStagesRef = useRef<Set<string>>(new Set())

  // Listen for progress and done events from main process
  useEffect(() => {
    const api = window.api
    if (!api) return

    const unsubProgress = api.onPythonSetupProgress((data) => {
      seenStagesRef.current.add(data.stage)
      setPythonSetupProgress(data)
    })

    const unsubDone = api.onPythonSetupDone((data) => {
      if (data.success) {
        setPythonStatus('ready')
        setPythonSetupProgress(null)
        setPythonSetupError(null)
      } else {
        setPythonStatus('error')
        setPythonSetupError(data.error || 'Setup failed')
        setPythonSetupProgress(null)
      }
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    })

    return () => {
      unsubProgress()
      unsubDone()
    }
  }, [setPythonStatus, setPythonSetupError, setPythonSetupProgress])

  // Elapsed time timer — starts when installing begins
  useEffect(() => {
    if (pythonStatus === 'installing') {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now()
        setElapsedSeconds(0)
      }
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)
          setElapsedSeconds(elapsed)
        }, 1000)
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (pythonStatus !== 'error') {
        startTimeRef.current = null
        setElapsedSeconds(0)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [pythonStatus])

  const handleSetup = async () => {
    seenStagesRef.current = new Set()
    setPythonStatus('installing')
    setPythonSetupError(null)
    setPythonSetupProgress({ stage: 'downloading-python', message: 'Starting setup...', percent: 0 })
    try {
      await window.api.startPythonSetup()
    } catch (err) {
      setPythonStatus('error')
      setPythonSetupError(err instanceof Error ? err.message : 'Failed to start setup')
    }
  }

  const handleSkip = () => {
    setPythonStatus('skipped')
    setPythonSetupProgress(null)
    setPythonSetupError(null)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleRetry = () => {
    setPythonSetupError(null)
    setPythonStatus('not-setup')
    startTimeRef.current = null
    setElapsedSeconds(0)
    seenStagesRef.current = new Set()
  }

  // Don't render for ready or skipped states
  if (pythonStatus === 'ready' || pythonStatus === 'skipped') return null

  const currentStageId = setupProgress?.stage ?? ''
  const currentStepDef = STEPS.find((s) => s.stage === currentStageId)

  // Determine which steps are visible (skip trivial stages on non-Windows)
  const visibleSteps = STEPS.filter((s) => {
    if (ALWAYS_SHOW_STAGES.has(s.stage)) return true
    return seenStagesRef.current.has(s.stage) || s.stage === currentStageId
  })

  function getStepStatus(step: StepDef): 'pending' | 'active' | 'done' {
    const currentIdx = STEPS.findIndex((s) => s.stage === currentStageId)
    const stepIdx = STEPS.findIndex((s) => s.stage === step.stage)
    if (step.stage === currentStageId) return 'active'
    if (stepIdx < currentIdx) return 'done'
    return 'pending'
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4"
      >
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                pythonStatus === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'
              )}>
                {pythonStatus === 'checking' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : pythonStatus === 'error' ? (
                  <XCircle className="w-5 h-5" />
                ) : pythonStatus === 'installing' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Package className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {pythonStatus === 'checking' && 'Checking Environment...'}
                  {pythonStatus === 'not-setup' && 'Python Setup Required'}
                  {pythonStatus === 'installing' && 'Setting Up Python'}
                  {pythonStatus === 'error' && 'Setup Failed'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {pythonStatus === 'checking' && 'Verifying Python packages...'}
                  {pythonStatus === 'not-setup' && 'One-time setup for AI features'}
                  {pythonStatus === 'installing' && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {elapsedSeconds > 0 ? `Elapsed: ${formatElapsed(elapsedSeconds)}` : 'This may take 10–30 minutes'}
                    </span>
                  )}
                  {pythonStatus === 'error' && 'Something went wrong'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {/* Not set up — info card */}
              {pythonStatus === 'not-setup' && (
                <motion.div
                  key="not-setup"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-sm text-foreground">
                      BatchContent needs Python packages for:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Transcription (NeMo Parakeet ASR)</li>
                      <li>Face Detection (MediaPipe)</li>
                      <li>YouTube Downloads (yt-dlp)</li>
                    </ul>
                    <div className="flex items-center gap-2 pt-1">
                      <HardDrive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        ~5 GB of dependencies (PyTorch, NeMo, CUDA wheels)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-500">
                        First-time setup takes 10–30 minutes depending on internet speed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={handleSetup} className="flex-1 gap-2">
                      <Download className="w-4 h-4" />
                      Set Up Now
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground">
                      <SkipForward className="w-3.5 h-3.5 mr-1" />
                      Skip
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 text-center">
                    Skipping disables transcription, face detection, and YouTube downloads.
                    AI scoring and rendering still work with manual clips.
                  </p>
                </motion.div>
              )}

              {/* Installing — detailed progress */}
              {pythonStatus === 'installing' && (
                <motion.div
                  key="installing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  {/* Step list */}
                  {visibleSteps.length > 0 && (
                    <div className="space-y-2">
                      {visibleSteps.map((step) => {
                        const status = getStepStatus(step)
                        return (
                          <div key={step.stage} className={cn(
                            'flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors duration-200',
                            status === 'active' && 'bg-primary/5 ring-1 ring-primary/20',
                            status === 'done' && 'opacity-60',
                            status === 'pending' && 'opacity-30'
                          )}>
                            <div className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                              status === 'active' && 'bg-primary/15 text-primary',
                              status === 'done' && 'bg-green-500/15 text-green-500',
                              status === 'pending' && 'bg-muted text-muted-foreground'
                            )}>
                              {status === 'active' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : status === 'done' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                step.icon
                              )}
                            </div>
                            <span className={cn(
                              'text-xs font-medium',
                              status === 'active' && 'text-foreground',
                              status === 'done' && 'text-muted-foreground',
                              status === 'pending' && 'text-muted-foreground/50'
                            )}>
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Current stage detail */}
                  {currentStepDef && (
                    <div className="space-y-1.5">
                      <Progress value={setupProgress?.percent ?? 0} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={setupProgress?.message}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="truncate max-w-[280px]"
                          >
                            {setupProgress?.message || 'Preparing...'}
                          </motion.span>
                        </AnimatePresence>
                        <span className="font-mono tabular-nums shrink-0 ml-2">
                          {setupProgress?.percent ?? 0}%
                        </span>
                      </div>

                      {/* Package info — only shown during installing-packages */}
                      {currentStageId === 'installing-packages' && setupProgress?.package && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                        >
                          <Download className="w-3 h-3 shrink-0" />
                          <span className="truncate">{setupProgress.package}</span>
                        </motion.div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/50 text-center">
                    You can continue using the app. Setup runs in the background.
                  </p>
                </motion.div>
              )}

              {/* Error */}
              {pythonStatus === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm text-destructive leading-relaxed break-words">
                      {setupError || 'An unknown error occurred during setup.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={handleRetry} variant="outline" className="flex-1 gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground">
                      <SkipForward className="w-3.5 h-3.5 mr-1" />
                      Skip
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Checking */}
              {pythonStatus === 'checking' && (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-4"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
