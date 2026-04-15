import { Wand2 } from 'lucide-react'
import { SectionHeader, EditStyleStrip } from './shared'

export function AIEditStyleSettings() {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
          <SectionHeader>Edit Style</SectionHeader>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Pick a preset to drive caption treatment, colour grade, transitions,
          VFX overlays, and pacing for every rendered clip.
        </p>
        <EditStyleStrip />
      </div>
    </div>
  )
}
