import { Scan } from 'lucide-react'
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
import { useStore, type ZoomIntensity, type ZoomMode } from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

export function AutoZoomSettings() {
  const {
    settings,
    setAutoZoomEnabled,
    setAutoZoomMode,
    setAutoZoomIntensity,
    setAutoZoomInterval,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setAutoZoomEnabled: s.setAutoZoomEnabled,
      setAutoZoomMode: s.setAutoZoomMode,
      setAutoZoomIntensity: s.setAutoZoomIntensity,
      setAutoZoomInterval: s.setAutoZoomInterval,
      resetSection: s.resetSection,
    }))
  )

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center">
          <SectionHeader>Auto-Zoom</SectionHeader>
          <SectionResetButton section="autoZoom" onReset={resetSection} />
        </div>
        <div className="space-y-4">
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
              Adds animated zoom motion to rendered clips.
              Prevents static talking-head feel and boosts viewer retention.
            </p>

            <FieldRow
              label="Mode"
              hint={
                settings.autoZoom.mode === 'ken-burns'
                  ? 'Smooth sinusoidal breathing — classic Ken Burns feel'
                  : settings.autoZoom.mode === 'reactive'
                  ? 'Zoom responds to word emphasis moments — content-aware energy'
                  : 'Hard zoom cuts at sentence boundaries — simulates multi-camera editing'
              }
            >
              <Select
                value={settings.autoZoom.mode}
                onValueChange={(v) => setAutoZoomMode(v as ZoomMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ken-burns">Ken Burns</SelectItem>
                  <SelectItem value="reactive">Reactive</SelectItem>
                  <SelectItem value="jump-cut">Jump Cut</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

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
    </div>
  )
}
