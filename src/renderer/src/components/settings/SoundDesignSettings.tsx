import { Music2, Zap } from 'lucide-react'
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
import { useStore, type MusicTrack, type SFXStyle } from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton, MUSIC_TRACK_OPTIONS } from './shared'

export function SoundDesignSettings() {
  const {
    settings,
    setSoundDesignEnabled,
    setSoundDesignTrack,
    setSoundDesignSfxVolume,
    setSoundDesignMusicVolume,
    setSoundDesignMusicDucking,
    setSoundDesignMusicDuckLevel,
    setSoundDesignSfxStyle,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setSoundDesignEnabled: s.setSoundDesignEnabled,
      setSoundDesignTrack: s.setSoundDesignTrack,
      setSoundDesignSfxVolume: s.setSoundDesignSfxVolume,
      setSoundDesignMusicVolume: s.setSoundDesignMusicVolume,
      setSoundDesignMusicDucking: s.setSoundDesignMusicDucking,
      setSoundDesignMusicDuckLevel: s.setSoundDesignMusicDuckLevel,
      setSoundDesignSfxStyle: s.setSoundDesignSfxStyle,
      resetSection: s.resetSection,
    }))
  )

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center">
          <SectionHeader>Sound Design</SectionHeader>
          <SectionResetButton section="soundDesign" onReset={resetSection} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="sound-enabled" className="text-sm font-medium cursor-pointer">
                Auto Sound Design
              </Label>
            </div>
            <Switch
              id="sound-enabled"
              checked={settings.soundDesign.enabled}
              onCheckedChange={setSoundDesignEnabled}
            />
          </div>

          <div
            className={cn(
              'space-y-4 transition-opacity',
              !settings.soundDesign.enabled && 'opacity-40 pointer-events-none'
            )}
          >
            <p className="text-xs text-muted-foreground">
              Adds background music and SFX hits to rendered clips. Place .mp3 files in{' '}
              <code className="text-xs bg-muted rounded px-1">resources/sfx/</code> and{' '}
              <code className="text-xs bg-muted rounded px-1">resources/music/</code>.
            </p>

            <FieldRow label="Background Music">
              <Select
                value={settings.soundDesign.backgroundMusicTrack}
                onValueChange={(v) => setSoundDesignTrack(v as MusicTrack)}
              >
                <SelectTrigger className="w-full">
                  <Music2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSIC_TRACK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span>{opt.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label={`Music Volume — ${Math.round(settings.soundDesign.musicVolume * 100)}%`}
              hint="Background music level (keep low to not compete with speaker)"
            >
              <Slider
                min={0}
                max={30}
                step={1}
                value={[Math.round(settings.soundDesign.musicVolume * 100)]}
                onValueChange={([v]) => setSoundDesignMusicVolume(v / 100)}
              />
            </FieldRow>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="music-ducking" className="text-sm font-medium cursor-pointer">
                  Auto Duck During Speech
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Music drops when the speaker talks, swells during pauses and B-Roll
                </p>
              </div>
              <Switch
                id="music-ducking"
                checked={settings.soundDesign.musicDucking}
                onCheckedChange={setSoundDesignMusicDucking}
              />
            </div>

            {settings.soundDesign.musicDucking && (
              <FieldRow
                label={`Duck Level — ${Math.round(settings.soundDesign.musicDuckLevel * 100)}% during speech`}
                hint="How much music volume remains while the speaker is talking"
              >
                <Slider
                  min={0}
                  max={60}
                  step={5}
                  value={[Math.round(settings.soundDesign.musicDuckLevel * 100)]}
                  onValueChange={([v]) => setSoundDesignMusicDuckLevel(v / 100)}
                />
              </FieldRow>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">SFX Style</Label>
              <p className="text-xs text-muted-foreground">
                Controls how aggressively sound effects are placed across the clip
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: 'minimal' as SFXStyle,
                      label: 'Minimal',
                      desc: '1–2 quiet hits only',
                    },
                    {
                      value: 'standard' as SFXStyle,
                      label: 'Standard',
                      desc: 'Emphasis-driven',
                    },
                    {
                      value: 'energetic' as SFXStyle,
                      label: 'Energetic',
                      desc: 'Maximum density',
                    },
                  ] satisfies { value: SFXStyle; label: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSoundDesignSfxStyle(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors',
                      settings.soundDesign.sfxStyle === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                    )}
                  >
                    <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                    <span className="text-[10px] leading-tight opacity-80">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <FieldRow label={`SFX Volume — ${Math.round(settings.soundDesign.sfxVolume * 100)}%`}>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[Math.round(settings.soundDesign.sfxVolume * 100)]}
                  onValueChange={([v]) => setSoundDesignSfxVolume(v / 100)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Volume for whoosh transitions and emphasis hits
              </p>
            </FieldRow>
          </div>
        </div>
      </div>
    </div>
  )
}
