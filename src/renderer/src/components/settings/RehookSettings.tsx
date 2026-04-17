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
import { useStore, type RehookStyle } from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

export function RehookSettings() {
  const {
    settings,
    setRehookEnabled,
    setRehookDisplayDuration,
    setRehookStyle,
    setRehookPositionFraction,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setRehookEnabled: s.setRehookEnabled,
      setRehookDisplayDuration: s.setRehookDisplayDuration,
      setRehookStyle: s.setRehookStyle,
      setRehookPositionFraction: s.setRehookPositionFraction,
      resetSection: s.resetSection,
    }))
  )

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SectionHeader>Re-hook Overlay</SectionHeader>
          <SectionResetButton section="rehook" onReset={resetSection} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="rehook-enabled" className="text-sm font-medium cursor-pointer">
              Burn-in Re-hook Text
            </Label>
            <Switch
              id="rehook-enabled"
              checked={settings.rehookOverlay.enabled}
              onCheckedChange={setRehookEnabled}
            />
          </div>

          <div
            className={cn(
              'space-y-4 transition-opacity',
              !settings.rehookOverlay.enabled && 'opacity-40 pointer-events-none'
            )}
          >
            <p className="text-xs text-muted-foreground">
              Renders a follow-up text overlay immediately after the hook title disappears,
              adding extra context. White rounded box with dark text, same style as the hook.
            </p>

            <FieldRow
              label={`Display Duration — ${settings.rehookOverlay.displayDuration.toFixed(1)}s`}
            >
              <Slider
                min={5}
                max={40}
                step={1}
                value={[Math.round(settings.rehookOverlay.displayDuration * 10)]}
                onValueChange={([v]) => setRehookDisplayDuration(v / 10)}
              />
            </FieldRow>

            <FieldRow
              label="Style"
              hint={
                settings.rehookOverlay.style === 'bar'
                  ? 'White rounded bar with dark text (default)'
                  : settings.rehookOverlay.style === 'text-only'
                  ? 'Plain text without background'
                  : 'Text slides up from bottom'
              }
            >
              <Select
                value={settings.rehookOverlay.style}
                onValueChange={(v) => setRehookStyle(v as RehookStyle)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="text-only">Text Only</SelectItem>
                  <SelectItem value="slide-up">Slide Up</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label={`Position — ${Math.round(settings.rehookOverlay.positionFraction * 100)}%`}
              hint="Where in the clip the re-hook appears (% of clip duration)"
            >
              <Slider
                min={40}
                max={60}
                step={1}
                value={[Math.round(settings.rehookOverlay.positionFraction * 100)]}
                onValueChange={([v]) => setRehookPositionFraction(v / 100)}
              />
            </FieldRow>

            <p className="text-xs text-muted-foreground italic">
              Visual settings (font size, text color, outline) are inherited from Hook Title Overlay above.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
