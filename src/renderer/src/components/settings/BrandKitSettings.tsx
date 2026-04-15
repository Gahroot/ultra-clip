import { Briefcase, Film, Image, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useStore, type LogoPosition } from '@/store'
import { cn } from '@/lib/utils'
import { DropZone } from '../DropZone'
import { SectionHeader, FieldRow, SectionResetButton } from './shared'

export function BrandKitSettings() {
  const {
    settings,
    setBrandKitEnabled,
    setBrandKitLogoPath,
    setBrandKitLogoPosition,
    setBrandKitLogoScale,
    setBrandKitLogoOpacity,
    setBrandKitIntroBumperPath,
    setBrandKitOutroBumperPath,
    resetSection,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setBrandKitEnabled: s.setBrandKitEnabled,
      setBrandKitLogoPath: s.setBrandKitLogoPath,
      setBrandKitLogoPosition: s.setBrandKitLogoPosition,
      setBrandKitLogoScale: s.setBrandKitLogoScale,
      setBrandKitLogoOpacity: s.setBrandKitLogoOpacity,
      setBrandKitIntroBumperPath: s.setBrandKitIntroBumperPath,
      setBrandKitOutroBumperPath: s.setBrandKitOutroBumperPath,
      resetSection: s.resetSection,
    }))
  )

  const bk = settings.brandKit

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
          <SectionHeader>Brand Kit</SectionHeader>
          <SectionResetButton section="brandKit" onReset={resetSection} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="brandkit-enabled" className="text-sm font-medium cursor-pointer">
              Apply Brand Kit to Clips
            </Label>
            <Switch
              id="brandkit-enabled"
              checked={bk.enabled}
              onCheckedChange={setBrandKitEnabled}
            />
          </div>

          <div className={cn('space-y-4 transition-opacity', !bk.enabled && 'opacity-40 pointer-events-none')}>
            <FieldRow label="Logo Watermark">
              <DropZone
                accept={['image/png', 'image/jpeg', 'image/webp']}
                maxSizeMB={5}
                onFile={setBrandKitLogoPath}
                copyFile={window.api.copyBrandLogo}
                openPicker={window.api.selectBrandLogo}
                label="Upload Logo"
                icon={Image}
                hint="PNG, JPG, WEBP · Max 5 MB"
                currentFile={bk.logoPath}
                onRemove={() => setBrandKitLogoPath(null)}
              />
            </FieldRow>

            {bk.logoPath && (
              <>
                <FieldRow label="Logo Position">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as LogoPosition[]).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setBrandKitLogoPosition(pos)}
                        className={cn(
                          'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors',
                          bk.logoPosition === pos
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/60'
                        )}
                      >
                        {pos === 'top-left' && <><ArrowUpLeft className="w-3 h-3 inline mr-1" />Top Left</>}
                        {pos === 'top-right' && <><ArrowUpRight className="w-3 h-3 inline mr-1" />Top Right</>}
                        {pos === 'bottom-left' && <><ArrowDownLeft className="w-3 h-3 inline mr-1" />Bottom Left</>}
                        {pos === 'bottom-right' && <><ArrowDownRight className="w-3 h-3 inline mr-1" />Bottom Right</>}
                      </button>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow
                  label={`Logo Size — ${Math.round(bk.logoScale * 100)}% of frame width`}
                  hint={`~${Math.round(bk.logoScale * 1080)}px wide on 1080p`}
                >
                  <Slider
                    min={5}
                    max={30}
                    step={1}
                    value={[Math.round(bk.logoScale * 100)]}
                    onValueChange={([v]) => setBrandKitLogoScale(v / 100)}
                  />
                </FieldRow>

                <FieldRow label={`Logo Opacity — ${Math.round(bk.logoOpacity * 100)}%`}>
                  <Slider
                    min={10}
                    max={100}
                    step={5}
                    value={[Math.round(bk.logoOpacity * 100)]}
                    onValueChange={([v]) => setBrandKitLogoOpacity(v / 100)}
                  />
                </FieldRow>
              </>
            )}

            <FieldRow label="Intro Bumper" hint="Prepended to every clip">
              <DropZone
                accept={['video/mp4', 'video/quicktime', 'video/webm']}
                maxSizeMB={200}
                onFile={setBrandKitIntroBumperPath}
                copyFile={window.api.copyBrandBumper}
                openPicker={window.api.selectIntroBumper}
                label="Upload Intro Bumper"
                icon={Film}
                hint="MP4, MOV, WEBM · Max 200 MB"
                currentFile={bk.introBumperPath}
                onRemove={() => setBrandKitIntroBumperPath(null)}
              />
            </FieldRow>

            <FieldRow label="Outro Bumper" hint="Appended after every clip">
              <DropZone
                accept={['video/mp4', 'video/quicktime', 'video/webm']}
                maxSizeMB={200}
                onFile={setBrandKitOutroBumperPath}
                copyFile={window.api.copyBrandBumper}
                openPicker={window.api.selectOutroBumper}
                label="Upload Outro Bumper"
                icon={Film}
                hint="MP4, MOV, WEBM · Max 200 MB"
                currentFile={bk.outroBumperPath}
                onRemove={() => setBrandKitOutroBumperPath(null)}
              />
            </FieldRow>
          </div>
        </div>
      </div>
    </div>
  )
}
