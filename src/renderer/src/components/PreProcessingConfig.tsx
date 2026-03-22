import { Clock, Repeat, Layers, BookOpen, Scissors, Wand2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useStore, type TargetDuration } from '@/store'
import { cn } from '@/lib/utils'

// ── Duration options ─────────────────────────────────────────────────────────

const DURATION_OPTIONS: { value: TargetDuration; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'AI decides (15-60s)' },
  { value: '15-30', label: 'Short', description: '15-30s · TikTok/Reels' },
  { value: '30-60', label: 'Medium', description: '30-60s · YT Shorts' },
  { value: '60-90', label: 'Long', description: '60-90s · Deep content' },
  { value: '90-120', label: 'Extended', description: '90-120s · Stories' }
]

// ── Feature toggles ──────────────────────────────────────────────────────────

const FEATURE_TOGGLES: {
  key: 'enablePerfectLoop' | 'enableVariants' | 'enableMultiPart' | 'enableClipStitching'
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    key: 'enablePerfectLoop',
    label: 'Perfect Loop',
    description: 'Optimize clip boundaries for seamless looping',
    icon: <Repeat className="w-3.5 h-3.5" />
  },
  {
    key: 'enableVariants',
    label: 'A/B/C Variants',
    description: 'Generate multiple packaging variations per clip',
    icon: <Layers className="w-3.5 h-3.5" />
  },
  {
    key: 'enableMultiPart',
    label: 'Multi-Part Series',
    description: 'Detect narrative arcs and create numbered series',
    icon: <BookOpen className="w-3.5 h-3.5" />
  },
  {
    key: 'enableClipStitching',
    label: 'Clip Stitching',
    description: 'Combine non-contiguous segments into composite clips',
    icon: <Scissors className="w-3.5 h-3.5" />
  }
]

// ── Component ────────────────────────────────────────────────────────────────

export function PreProcessingConfig() {
  const config = useStore((s) => s.processingConfig)
  const setConfig = useStore((s) => s.setProcessingConfig)
  const autoMode = useStore((s) => s.autoMode)
  const setAutoMode = useStore((s) => s.setAutoMode)

  return (
    <div className="space-y-4 w-full">
      {/* Auto Mode */}
      <div
        className={cn(
          'rounded-lg border p-3 space-y-3 transition-colors',
          autoMode.enabled
            ? 'border-amber-500/50 bg-amber-500/5'
            : 'border-border bg-muted/20'
        )}
      >
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <Switch
            checked={autoMode.enabled}
            onCheckedChange={(checked) => setAutoMode({ enabled: checked })}
            className="mt-0.5 shrink-0 scale-75 origin-top-left"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Wand2
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  autoMode.enabled ? 'text-amber-500' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium leading-none',
                  autoMode.enabled ? 'text-amber-500' : 'text-foreground'
                )}
              >
                Hands-Free Mode
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
              Automatically approve high-scoring clips and start rendering
            </p>
          </div>
        </div>

        {/* Sub-options — only when enabled */}
        {autoMode.enabled && (
          <div className="space-y-3 pl-8 border-t border-amber-500/20 pt-3">
            {/* Threshold slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Auto-approve clips scoring ≥
                </Label>
                <span className="text-xs font-mono font-semibold text-amber-500 tabular-nums">
                  {autoMode.approveThreshold}
                </span>
              </div>
              <Slider
                min={60}
                max={100}
                step={1}
                value={[autoMode.approveThreshold]}
                onValueChange={([v]) => setAutoMode({ approveThreshold: v })}
                className="[&>[role=slider]]:border-amber-500 [&>[role=slider]]:bg-amber-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>60</span>
                <span>100</span>
              </div>
            </div>

            {/* Auto-render toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Switch
                checked={autoMode.autoRender}
                onCheckedChange={(checked) => setAutoMode({ autoRender: checked })}
                className="shrink-0 scale-75 origin-left"
              />
              <div>
                <span className="text-xs font-medium leading-none">Auto-start render</span>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  Begin rendering immediately after clips are approved
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Target Duration */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Target Duration
          </Label>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConfig({ targetDuration: opt.value })}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 text-center transition-colors',
                config.targetDuration === opt.value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              <span className="text-xs font-medium leading-none">{opt.label}</span>
              <span className="text-[10px] leading-tight opacity-70">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Features
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURE_TOGGLES.map((toggle) => (
            <label
              key={toggle.key}
              className={cn(
                'flex items-start gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer transition-colors',
                config[toggle.key]
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/20 hover:bg-muted/30'
              )}
            >
              <Switch
                checked={config[toggle.key]}
                onCheckedChange={(checked) => setConfig({ [toggle.key]: checked })}
                className="mt-0.5 shrink-0 scale-75 origin-top-left"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{toggle.icon}</span>
                  <span className="text-xs font-medium leading-none">{toggle.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  {toggle.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
