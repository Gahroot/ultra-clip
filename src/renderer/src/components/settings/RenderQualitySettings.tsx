import { Clapperboard, Layers, AlertTriangle } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  useStore,
  type RenderQualityPreset,
  type OutputResolution,
  type OutputFormat,
  type EncodingPreset,
  type OutputAspectRatio,
} from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

export function RenderQualitySettings() {
  const {
    settings,
    setRenderQuality,
    setOutputAspectRatio,
    setRenderConcurrency,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setRenderQuality: s.setRenderQuality,
      setOutputAspectRatio: s.setOutputAspectRatio,
      setRenderConcurrency: s.setRenderConcurrency,
      resetSection: s.resetSection,
    }))
  )

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
          <SectionHeader>Render Quality</SectionHeader>
          <SectionResetButton section="renderQuality" onReset={resetSection} />
        </div>
        <div className="space-y-4">
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

          {settings.renderQuality.preset === 'custom' && (
            <div className="space-y-4 pt-1">
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
                <AlertTriangle className="w-3 h-3 inline mr-1" />Safe zones are designed for 9:16. Other ratios use center-crop from source.
              </p>
            )}
          </div>

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
                <AlertTriangle className="w-3 h-3 inline mr-1" />May increase memory usage and reduce per-clip rendering speed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
