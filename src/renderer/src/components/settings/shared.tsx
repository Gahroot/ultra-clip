import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  useStore,
  type MusicTrack,
  type HookTitleOverlaySettings,
  type RehookOverlaySettings,
} from '@/store'
import { EditStyleSelector } from '../EditStyleSelector'
import type { EditStyle } from '@/store'

export const MUSIC_TRACK_OPTIONS: { value: MusicTrack; label: string; description: string }[] = [
  { value: 'cinematic-ambient', label: 'Cinematic Ambient', description: 'Atmospheric orchestral pads' },
  { value: 'cinematic-noir', label: 'Cinematic Noir', description: 'Jazzy, smoky, mysterious' },
  { value: 'cinematic-golden', label: 'Cinematic Golden', description: 'Warm strings, hopeful' },
  { value: 'high-energy-beats', label: 'High Energy Beats', description: 'Punchy electronic, 140+ BPM' },
  { value: 'high-energy-trap', label: 'Trap Beats', description: 'Aggressive 808s, dark energy' },
  { value: 'gritty-lofi', label: 'Gritty Lo-Fi', description: 'Vinyl crackle, grungy bass' },
  { value: 'gritty-dark', label: 'Gritty Dark', description: 'Industrial, distorted, raw' },
  { value: 'synthwave-neon', label: 'Synthwave', description: 'Retro 80s arpeggios' },
  { value: 'synthwave-vapor', label: 'Vaporwave', description: 'Dreamy pads, lo-fi nostalgia' },
  { value: 'impact-hype', label: 'Impact Hype', description: 'Hard-hitting hip-hop instrumental' },
  { value: 'corporate-upbeat', label: 'Corporate Upbeat', description: 'Clean, professional, uplifting' },
  { value: 'ember-warm', label: 'Ember Warm', description: 'Indie acoustic, soulful' },
  { value: 'volt-electric', label: 'Volt Electric', description: 'Electro house, driving bassline' },
  { value: 'clarity-focus', label: 'Clarity Focus', description: 'Minimal piano + soft pads' },
  { value: 'ambient-tech', label: 'Ambient Tech', description: 'Subtle electronic / corporate' },
  { value: 'ambient-motivational', label: 'Motivational', description: 'Uplifting, inspiring' },
  { value: 'ambient-chill', label: 'Chill Lo-Fi', description: 'Relaxed, laid-back' },
]

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-foreground mb-3">
      {children}
    </p>
  )
}

export function FieldRow({
  label,
  htmlFor,
  children,
  hint
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export type SectionKey = 'captions' | 'soundDesign' | 'autoZoom' | 'brandKit' | 'hookTitle' | 'rehook' | 'progressBar' | 'fillerRemoval' | 'broll' | 'aiSettings' | 'renderQuality'

export function SectionResetButton({ section, onReset }: { section: SectionKey; onReset: (s: SectionKey) => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onReset(section)}
            className="ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Reset section to defaults"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Reset section to defaults</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const PHONE_W = 200
const PHONE_H = 356
const PHONE_SCALE = PHONE_W / 1080


export function HookTitlePhonePreview({
  hookTitleOverlay,
  rehookOverlay
}: {
  hookTitleOverlay: HookTitleOverlaySettings
  rehookOverlay: RehookOverlaySettings
}) {
  const scaledFontSize = Math.round(hookTitleOverlay.fontSize * PHONE_SCALE)
  const outlineW = Math.max(1, Math.round(hookTitleOverlay.outlineWidth * PHONE_SCALE))
  const style = hookTitleOverlay.style

  const hookText = 'Wait for it…'
  const rehookText = "Here's why it matters"

  const hookTextStyle: React.CSSProperties = {
    fontSize: `${Math.max(9, scaledFontSize)}px`,
    fontWeight: 800,
    color: hookTitleOverlay.textColor,
    WebkitTextStroke: `${outlineW}px ${hookTitleOverlay.outlineColor}`,
    textShadow: `1px 1px 3px ${hookTitleOverlay.outlineColor}`,
    lineHeight: 1.2,
    textAlign: style === 'slide-in' ? 'left' : 'center',
    maxWidth: '85%',
    wordBreak: 'break-word' as const
  }

  const barBg = style === 'top-bar' ? 'rgba(0,0,0,0.6)' : undefined

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Live Preview</p>
      <div
        className="mx-auto rounded-xl border-2 border-border overflow-hidden select-none relative"
        style={{
          width: PHONE_W,
          height: PHONE_H,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0.08 }}
        >
          <div
            style={{
              width: 60,
              height: 80,
              borderRadius: '50% 50% 40% 40%',
              background: '#fff'
            }}
          />
        </div>

        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{
            top: style === 'centered-bold' ? '15%' : style === 'top-bar' ? 0 : '15%',
            padding: style === 'top-bar' ? '8px 0' : undefined,
            backgroundColor: barBg
          }}
        >
          <div
            style={{
              ...hookTextStyle,
              paddingLeft: style === 'slide-in' ? '8px' : undefined
            }}
          >
            {hookText}
          </div>
        </div>

        {rehookOverlay.enabled && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: '50%' }}
          >
            <div
              style={{
                fontSize: `${Math.max(7, Math.round(scaledFontSize * 0.7))}px`,
                fontWeight: 700,
                color: '#1a1a2e',
                backgroundColor: 'rgba(255,255,255,0.92)',
                borderRadius: '4px',
                padding: '3px 8px',
                whiteSpace: 'nowrap',
                maxWidth: PHONE_W - 20,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {rehookText}
            </div>
          </div>
        )}

        <div className="absolute bottom-2 right-2">
          <span className="text-[8px] bg-black/50 text-white/70 rounded px-1 py-0.5 uppercase tracking-wider">
            {style}
          </span>
        </div>
      </div>
    </div>
  )
}

export function EditStyleStrip() {
  const selectedEditStyleId = useStore((s) => s.selectedEditStyleId)
  const setSelectedEditStyleId = useStore((s) => s.setSelectedEditStyleId)
  const [styles, setStyles] = useState<EditStyle[]>([])

  useEffect(() => {
    window.api.getEditStyles().then(setStyles).catch(() => {})
  }, [])

  if (styles.length === 0) return null

  return (
    <EditStyleSelector
      styles={styles}
      selectedStyleId={selectedEditStyleId}
      onSelectStyle={setSelectedEditStyleId}
    />
  )
}
