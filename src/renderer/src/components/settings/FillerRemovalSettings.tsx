import { Scissors } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

export function FillerRemovalSettings() {
  const {
    settings,
    setFillerRemovalEnabled,
    setFillerRemovalFillerWords,
    setFillerRemovalSilences,
    setFillerRemovalRepeats,
    setFillerRemovalSilenceThreshold,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setFillerRemovalEnabled: s.setFillerRemovalEnabled,
      setFillerRemovalFillerWords: s.setFillerRemovalFillerWords,
      setFillerRemovalSilences: s.setFillerRemovalSilences,
      setFillerRemovalRepeats: s.setFillerRemovalRepeats,
      setFillerRemovalSilenceThreshold: s.setFillerRemovalSilenceThreshold,
      resetSection: s.resetSection,
    }))
  )

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
          <SectionHeader>Filler &amp; Silence Removal</SectionHeader>
          <SectionResetButton section="fillerRemoval" onReset={resetSection} />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="filler-enabled" className="text-sm font-medium cursor-pointer">
            Auto-Remove Fillers &amp; Dead Air
          </Label>
          <Switch
            id="filler-enabled"
            checked={settings.fillerRemoval.enabled}
            onCheckedChange={setFillerRemovalEnabled}
          />
        </div>

        <div
          className={cn(
            'space-y-4 transition-opacity',
            !settings.fillerRemoval.enabled && 'opacity-40 pointer-events-none'
          )}
        >
          <p className="text-xs text-muted-foreground">
            Automatically detects and removes filler words (um, uh, like), awkward pauses,
            and stuttered repeats — creating tight, fast-paced jump cuts that boost retention.
            Works like Captions.ai and Descript.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="filler-words-toggle" className="text-sm cursor-pointer">
                Remove filler words
              </Label>
              <Switch
                id="filler-words-toggle"
                checked={settings.fillerRemoval.removeFillerWords}
                onCheckedChange={setFillerRemovalFillerWords}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="filler-silences-toggle" className="text-sm cursor-pointer">
                Trim long silences
              </Label>
              <Switch
                id="filler-silences-toggle"
                checked={settings.fillerRemoval.trimSilences}
                onCheckedChange={setFillerRemovalSilences}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="filler-repeats-toggle" className="text-sm cursor-pointer">
                Remove repeated starts
              </Label>
              <Switch
                id="filler-repeats-toggle"
                checked={settings.fillerRemoval.removeRepeats}
                onCheckedChange={setFillerRemovalRepeats}
              />
            </div>
          </div>

          <FieldRow
            label={`Silence Threshold — ${settings.fillerRemoval.silenceThreshold.toFixed(1)}s`}
            hint="Pauses longer than this are trimmed (0.4–2.0 seconds)"
          >
            <Slider
              min={4}
              max={20}
              step={1}
              value={[settings.fillerRemoval.silenceThreshold * 10]}
              onValueChange={([v]) => setFillerRemovalSilenceThreshold(v / 10)}
            />
          </FieldRow>

          <p className="text-xs text-muted-foreground">
            <strong>How it works:</strong> Uses word-level timestamps from transcription to identify
            filler words, long gaps, and stutters. Removes them with frame-accurate cuts and
            re-syncs captions automatically. Requires transcription to be completed first.
          </p>
        </div>
      </div>
    </div>
  )
}
