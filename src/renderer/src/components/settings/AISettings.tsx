import { useState } from 'react'
import { Eye, EyeOff, ExternalLink, Zap, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useStore } from '@/store'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

type ValidationState = 'idle' | 'testing' | 'valid' | 'invalid'

export function AISettings() {
  const {
    settings,
    setGeminiApiKey,
    setMinScore,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setGeminiApiKey: s.setGeminiApiKey,
      setMinScore: s.setMinScore,
      resetSection: s.resetSection,
    }))
  )

  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.geminiApiKey)
  const [geminiValidation, setGeminiValidation] = useState<{ state: ValidationState; error?: string }>({ state: 'idle' })

  function handleApiKeyBlur() {
    if (apiKeyDraft !== settings.geminiApiKey) {
      setGeminiApiKey(apiKeyDraft)
    }
  }

  async function handleTestGeminiKey() {
    const key = apiKeyDraft.trim()
    if (!key) return
    if (key !== settings.geminiApiKey) setGeminiApiKey(key)
    setGeminiValidation({ state: 'testing' })
    try {
      const result = await window.api.validateGeminiKey(key)
      setGeminiValidation(result.valid ? { state: 'valid' } : { state: 'invalid', error: result.error })
    } catch {
      setGeminiValidation({ state: 'invalid', error: 'Validation failed' })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
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
              <p className="text-xs text-muted-foreground mt-1"><CheckCircle2 className="w-3 h-3 inline mr-1" />API key saved</p>
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
    </div>
  )
}
