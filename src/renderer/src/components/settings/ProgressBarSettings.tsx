import { ArrowDown, ArrowUp } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useStore, type ProgressBarStyle, type ProgressBarPosition } from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

export function ProgressBarSettings() {
  const {
    settings,
    setProgressBarEnabled,
    setProgressBarPosition,
    setProgressBarHeight,
    setProgressBarColor,
    setProgressBarOpacity,
    setProgressBarStyle,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setProgressBarEnabled: s.setProgressBarEnabled,
      setProgressBarPosition: s.setProgressBarPosition,
      setProgressBarHeight: s.setProgressBarHeight,
      setProgressBarColor: s.setProgressBarColor,
      setProgressBarOpacity: s.setProgressBarOpacity,
      setProgressBarStyle: s.setProgressBarStyle,
      resetSection: s.resetSection,
    }))
  )

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="6" width="14" height="4" rx="1" />
            <rect x="1" y="6" width="7" height="4" rx="1" fill="currentColor" stroke="none" />
          </svg>
          <SectionHeader>Progress Bar Overlay</SectionHeader>
          <SectionResetButton section="progressBar" onReset={resetSection} />
        </div>
        <div className="space-y-4">
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
                    {pos === 'bottom' ? <><ArrowDown className="w-3 h-3 inline mr-1" />Bottom Edge</> : <><ArrowUp className="w-3 h-3 inline mr-1" />Top Edge</>}
                  </button>
                ))}
              </div>
            </FieldRow>

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

            <FieldRow label={`Opacity — ${Math.round(settings.progressBarOverlay.opacity * 100)}%`}>
              <Slider
                min={20}
                max={100}
                step={5}
                value={[Math.round(settings.progressBarOverlay.opacity * 100)]}
                onValueChange={([v]) => setProgressBarOpacity(v / 100)}
              />
            </FieldRow>

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

            <div
              className="rounded-md border border-border overflow-hidden select-none"
              style={{ backgroundColor: '#111', height: '48px', position: 'relative' }}
              title="Preview — bar shown at ~60% progress"
            >
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
    </div>
  )
}
