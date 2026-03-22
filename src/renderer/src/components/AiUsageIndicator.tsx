import { useState, useRef, useEffect } from 'react'
import { Sparkles, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'

// ---------------------------------------------------------------------------
// Gemini 2.5 Flash-Lite pricing (as of March 2026)
// Input: $0.10 / 1M tokens
// Output: $0.40 / 1M tokens
// ---------------------------------------------------------------------------
const PRICE_INPUT_PER_M = 0.10
const PRICE_OUTPUT_PER_M = 0.40

// Source label map for human-readable names
const SOURCE_LABELS: Record<string, string> = {
  scoring: 'Viral Scoring',
  rescore: 'Re-score',
  hooks: 'Hook Text',
  'curiosity-gaps': 'Curiosity Gaps',
  descriptions: 'Descriptions',
  'loop-optimizer': 'Loop Optimizer',
  'story-arcs': 'Story Arcs',
  variants: 'Clip Variants',
  rehook: 'Re-hook Text',
  stitching: 'Clip Stitching',
  'broll-keywords': 'B-Roll Keywords',
  'emoji-moments': 'Emoji Moments',
  'fake-comment': 'Fake Comment'
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatCost(usd: number): string {
  if (usd < 0.001) return '< $0.001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export function AiUsageIndicator() {
  const aiUsage = useStore((s) => s.aiUsage)
  const resetAiUsage = useStore((s) => s.resetAiUsage)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const totalTokens = aiUsage.totalPromptTokens + aiUsage.totalCompletionTokens
  const estimatedCost =
    (aiUsage.totalPromptTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (aiUsage.totalCompletionTokens / 1_000_000) * PRICE_OUTPUT_PER_M

  // Color thresholds
  const tokenColor =
    totalTokens >= 200_000
      ? 'text-red-500'
      : totalTokens >= 50_000
        ? 'text-amber-500'
        : 'text-muted-foreground'

  // Aggregate usage by source
  const bySource = aiUsage.callHistory.reduce<
    Record<string, { promptTokens: number; completionTokens: number; calls: number }>
  >((acc, entry) => {
    const key = entry.source
    if (!acc[key]) acc[key] = { promptTokens: 0, completionTokens: 0, calls: 0 }
    acc[key].promptTokens += entry.promptTokens
    acc[key].completionTokens += entry.completionTokens
    acc[key].calls += 1
    return acc
  }, {})

  const sourceSorted = Object.entries(bySource).sort(
    (a, b) =>
      (b[1].promptTokens + b[1].completionTokens) -
      (a[1].promptTokens + a[1].completionTokens)
  )

  const sessionDuration = Date.now() - aiUsage.sessionStarted

  if (aiUsage.totalCalls === 0) {
    // Show a minimal idle state
    return (
      <div className="flex items-center gap-1 text-muted-foreground/40 text-xs px-1">
        <Sparkles className="w-3 h-3" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Pill trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
          open
            ? 'bg-accent border-accent-foreground/20'
            : 'bg-transparent border-border hover:bg-accent/50'
        } ${tokenColor}`}
        title="AI token usage this session"
      >
        <Sparkles className="w-3 h-3 shrink-0" />
        <span className="font-mono tabular-nums">{formatTokens(totalTokens)}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">AI Usage — This Session</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main stats */}
          <div className="px-3 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-md p-2">
                <div className={`text-lg font-bold font-mono tabular-nums leading-tight ${tokenColor}`}>
                  {formatTokens(totalTokens)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Total tokens</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2">
                <div className="text-lg font-bold font-mono tabular-nums leading-tight text-foreground">
                  {formatCost(estimatedCost)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Est. cost</div>
              </div>
            </div>

            {/* Token breakdown */}
            <div className="text-[10px] text-muted-foreground flex justify-between">
              <span>Input: <span className="text-foreground font-mono">{formatTokens(aiUsage.totalPromptTokens)}</span></span>
              <span>Output: <span className="text-foreground font-mono">{formatTokens(aiUsage.totalCompletionTokens)}</span></span>
              <span>Calls: <span className="text-foreground font-mono">{aiUsage.totalCalls}</span></span>
            </div>

            {/* Session duration */}
            <div className="text-[10px] text-muted-foreground">
              Session: <span className="text-foreground">{formatDuration(sessionDuration)}</span>
            </div>
          </div>

          {/* Per-source breakdown */}
          {sourceSorted.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                By Feature
              </div>
              <div className="space-y-1.5">
                {sourceSorted.map(([source, data]) => {
                  const sourceTokens = data.promptTokens + data.completionTokens
                  const sourceMaxBar = totalTokens > 0 ? (sourceTokens / totalTokens) * 100 : 0
                  const label = SOURCE_LABELS[source] ?? source
                  const sourceCost =
                    (data.promptTokens / 1_000_000) * PRICE_INPUT_PER_M +
                    (data.completionTokens / 1_000_000) * PRICE_OUTPUT_PER_M
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-foreground truncate max-w-[120px]">{label}</span>
                        <span className="text-muted-foreground font-mono ml-2 shrink-0">
                          {formatTokens(sourceTokens)} · {formatCost(sourceCost)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${sourceMaxBar}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pricing note */}
          <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground/60">
            Gemini 2.5 Flash-Lite: $0.10/1M input · $0.40/1M output
          </div>

          {/* Reset button */}
          <div className="border-t border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1 w-full justify-center"
              onClick={() => {
                resetAiUsage()
                setOpen(false)
              }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset Session
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
