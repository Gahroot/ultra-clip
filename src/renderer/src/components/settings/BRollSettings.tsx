import { useState } from 'react'
import { Eye, EyeOff, ExternalLink, Zap, Clapperboard, CheckCircle2, XCircle, Loader2, Video, ImagePlus, Sparkles } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

type ValidationState = 'idle' | 'testing' | 'valid' | 'invalid'

export function BRollSettings() {
  const {
    settings,
    setBRollEnabled,
    setBRollPexelsApiKey,
    setBRollIntervalSeconds,
    setBRollClipDuration,
    setBRollDisplayMode,
    setBRollTransition,
    setBRollPipSize,
    setBRollPipPosition,
    setBRollSourceMode,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setBRollEnabled: s.setBRollEnabled,
      setBRollPexelsApiKey: s.setBRollPexelsApiKey,
      setBRollIntervalSeconds: s.setBRollIntervalSeconds,
      setBRollClipDuration: s.setBRollClipDuration,
      setBRollDisplayMode: s.setBRollDisplayMode,
      setBRollTransition: s.setBRollTransition,
      setBRollPipSize: s.setBRollPipSize,
      setBRollPipPosition: s.setBRollPipPosition,
      setBRollSourceMode: s.setBRollSourceMode,
      resetSection: s.resetSection,
    }))
  )

  const [showPexelsKey, setShowPexelsKey] = useState(false)
  const [pexelsKeyDraft, setPexelsKeyDraft] = useState(settings.broll.pexelsApiKey)
  const [pexelsValidation, setPexelsValidation] = useState<{ state: ValidationState; error?: string }>({ state: 'idle' })

  function handlePexelsKeyBlur() {
    if (pexelsKeyDraft !== settings.broll.pexelsApiKey) {
      setBRollPexelsApiKey(pexelsKeyDraft)
      setPexelsValidation({ state: 'idle' })
    }
  }

  async function handleTestPexelsKey() {
    const key = pexelsKeyDraft.trim()
    if (!key) return
    if (key !== settings.broll.pexelsApiKey) setBRollPexelsApiKey(key)
    setPexelsValidation({ state: 'testing' })
    try {
      const result = await window.api.validatePexelsKey(key)
      setPexelsValidation(result.valid ? { state: 'valid' } : { state: 'invalid', error: result.error })
    } catch {
      setPexelsValidation({ state: 'invalid', error: 'Validation failed' })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
          <SectionHeader>B-Roll Insertion</SectionHeader>
          <SectionResetButton section="broll" onReset={resetSection} />
        </div>
        <div className="space-y-4">
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
              Automatically inserts relevant visual overlays every few seconds to break up
              talking-head monotony and boost viewer retention. Choose between stock footage,
              AI-generated images, or let AI decide per-placement.
            </p>

            <FieldRow
              label="B-Roll Source"
              hint="Where B-Roll visuals come from"
            >
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'stock' as const, icon: <Video className="w-3.5 h-3.5" />, label: 'Stock', desc: 'Pexels footage' },
                  { value: 'ai-generated' as const, icon: <ImagePlus className="w-3.5 h-3.5" />, label: 'AI Images', desc: '~$0.04/image' },
                  { value: 'auto' as const, icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Auto', desc: 'AI decides' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBRollSourceMode(opt.value)}
                    className={cn(
                      'px-2 py-2 rounded-md border text-left transition-colors',
                      (settings.broll.sourceMode ?? 'auto') === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span className="text-xs font-medium flex items-center gap-1">{opt.icon} {opt.label}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
              {(settings.broll.sourceMode === 'ai-generated' || settings.broll.sourceMode === 'auto') && (
                <p className="text-xs text-muted-foreground mt-2">
                  Uses your Gemini API key from AI Settings (~$0.04/image)
                </p>
              )}
            </FieldRow>

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
                <p className="text-xs text-muted-foreground mt-1"><CheckCircle2 className="w-3 h-3 inline mr-1" />Pexels API key saved</p>
              )}
            </FieldRow>

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

            <FieldRow
              label="Display Mode"
              hint="How B-Roll footage is composited onto your video"
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['fullscreen', 'Fullscreen', 'B-Roll covers the entire frame'],
                  ['split-top', 'Split Top', 'B-Roll top 65%, speaker bottom 35%'],
                  ['split-bottom', 'Split Bottom', 'Speaker top 65%, B-Roll bottom 35%'],
                  ['pip', 'Picture-in-Picture', 'B-Roll fullscreen, speaker in corner'],
                ] as const).map(([value, label, desc]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBRollDisplayMode(value)}
                    className={cn(
                      'px-2 py-2 rounded-md border text-left transition-colors',
                      settings.broll.displayMode === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="text-xs font-medium">{label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow
              label="Transition"
              hint="How B-Roll enters and exits the frame"
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['hard-cut', 'Hard Cut'],
                  ['crossfade', 'Crossfade'],
                  ['swipe-up', 'Swipe Up'],
                  ['swipe-down', 'Swipe Down'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBRollTransition(value)}
                    className={cn(
                      'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors',
                      settings.broll.transition === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FieldRow>

            {settings.broll.displayMode === 'pip' && (
              <>
                <FieldRow
                  label={`PiP Size — ${Math.round((settings.broll.pipSize ?? 0.25) * 100)}%`}
                  hint="Size of the speaker window as a fraction of canvas width"
                >
                  <Slider
                    min={0.2}
                    max={0.4}
                    step={0.05}
                    value={[settings.broll.pipSize ?? 0.25]}
                    onValueChange={([v]) => setBRollPipSize(v)}
                  />
                </FieldRow>
                <FieldRow
                  label="PiP Position"
                  hint="Corner position for the speaker window"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['top-left', 'Top Left'],
                      ['top-right', 'Top Right'],
                      ['bottom-left', 'Bottom Left'],
                      ['bottom-right', 'Bottom Right'],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBRollPipPosition(value)}
                        className={cn(
                          'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors',
                          (settings.broll.pipPosition ?? 'bottom-right') === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </FieldRow>
              </>
            )}

            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong> At render time, Gemini AI extracts visual keywords
              from each clip&apos;s transcript, searches Pexels for matching stock footage, and
              composites it onto your video with smooth transitions. The first 3 seconds
              (the hook) are never covered.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
