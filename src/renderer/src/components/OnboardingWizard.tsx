import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clapperboard,
  Key,
  Workflow,
  Lightbulb,
  Upload,
  Cpu,
  CheckSquare,
  Film,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useStore } from '@/store'

const TOTAL_STEPS = 4

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0
  })
}

// ---------------------------------------------------------------------------
// Step 1 — Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Clapperboard className="w-10 h-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Welcome to BatchContent</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          Turn long-form videos into AI-scored viral short-form clips — automatically transcribed,
          scored, and ready to publish.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full pt-2">
        <Button className="w-full" onClick={onNext}>
          Get Started
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip}>
          Skip Tutorial
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — API Key Setup
// ---------------------------------------------------------------------------

function StepApiKey({ onNext }: { onNext: () => void }) {
  const settings = useStore((s) => s.settings)
  const setGeminiApiKey = useStore((s) => s.setGeminiApiKey)
  const [showKey, setShowKey] = useState(false)
  const [localKey, setLocalKey] = useState(settings.geminiApiKey)

  function handleSave() {
    if (localKey.trim()) {
      setGeminiApiKey(localKey.trim())
    }
    onNext()
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <Key className="w-10 h-10 text-amber-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Set Up Your API Key</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          BatchContent uses Google Gemini to score and analyze your clips. It's free to get started.
        </p>
      </div>

      <div className="w-full space-y-3 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-api-key">Gemini API Key</Label>
          <div className="relative">
            <Input
              id="onboarding-api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="AIza..."
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Get a free key at aistudio.google.com
        </a>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <Button className="w-full" onClick={handleSave}>
          {localKey.trim() ? 'Save & Continue' : 'Continue'}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onNext}>
          I'll do this later
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — How It Works
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    icon: Upload,
    label: 'Add Video',
    description: 'Drop a local file or paste a YouTube URL'
  },
  {
    icon: Cpu,
    label: 'AI Analyzes',
    description: 'Transcribes audio and scores every segment for virality'
  },
  {
    icon: CheckSquare,
    label: 'Review Clips',
    description: 'Approve the best clips, tweak timings if needed'
  },
  {
    icon: Film,
    label: 'Render',
    description: 'Export polished vertical clips with captions and overlays'
  }
]

function StepHowItWorks({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center">
        <Workflow className="w-10 h-10 text-blue-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">How It Works</h2>
        <p className="text-muted-foreground text-sm">Four simple steps from raw video to viral clip</p>
      </div>

      <div className="w-full grid grid-cols-2 gap-3">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.label}
              className="flex flex-col items-start gap-2 p-3 rounded-lg bg-muted/50 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{step.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">{step.description}</p>
            </div>
          )
        })}
      </div>

      <Button className="w-full" onClick={onNext}>
        Next
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Quick Tips
// ---------------------------------------------------------------------------

const TIPS = [
  'Use YouTube URLs or drag & drop local videos into the sidebar',
  'Clips scoring 80+ typically perform best on short-form platforms',
  'Customize captions, overlays, and branding in Settings (Ctrl+,)',
  'Press ? anytime to see all keyboard shortcuts'
]

function StepTips({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
        <Lightbulb className="w-10 h-10 text-green-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Pro Tips</h2>
        <p className="text-muted-foreground text-sm">A few things to know before you dive in</p>
      </div>

      <ul className="w-full space-y-2.5 text-left">
        {TIPS.map((tip, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>

      <Button className="w-full" onClick={onFinish}>
        Start Creating
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wizard shell
// ---------------------------------------------------------------------------

interface OnboardingWizardProps {
  open: boolean
  onClose: () => void
}

export function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  function goNext() {
    setDirection(1)
    setStep((s) => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStep((s) => s - 1)
  }

  function handleSkip() {
    onClose()
  }

  function handleFinish() {
    onClose()
  }

  const steps = [
    <StepWelcome key="welcome" onNext={goNext} onSkip={handleSkip} />,
    <StepApiKey key="apikey" onNext={goNext} />,
    <StepHowItWorks key="howitworks" onNext={goNext} />,
    <StepTips key="tips" onFinish={handleFinish} />
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip() }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden [&>button:last-child]:hidden">
        <div className="p-8 pb-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: step dots + back button */}
        <div className="px-8 py-4 border-t border-border flex items-center justify-between">
          {/* Back button — hidden on step 0 */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={goBack}
            disabled={step === 0}
            style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </Button>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Step counter */}
          <span className="text-xs text-muted-foreground">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
