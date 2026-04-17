import { useMemo, useCallback } from 'react'
import { Check, Zap, Film, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { EditStyle } from '@/store'
import type { CaptionAnimation } from '@shared/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditStyleSelectorProps {
  styles: EditStyle[]
  selectedStyleId: string | null
  onSelectStyle: (styleId: string) => void
}

// ---------------------------------------------------------------------------
// Energy tier metadata
// ---------------------------------------------------------------------------

type EnergyTier = EditStyle['energy']

const TIER_META: Record<EnergyTier, {
  label: string
  icon: React.ReactNode
  headerClass: string
  badgeClass: string
}> = {
  low: {
    label: 'Cinematic',
    icon: <Film className="w-3.5 h-3.5" />,
    headerClass: 'text-violet-400',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
  medium: {
    label: 'Dynamic',
    icon: <Zap className="w-3.5 h-3.5" />,
    headerClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  high: {
    label: 'High Energy',
    icon: <Flame className="w-3.5 h-3.5" />,
    headerClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
}

// ---------------------------------------------------------------------------
// Feature badge labels
// ---------------------------------------------------------------------------

function zoomLabel(style: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'): string {
  switch (style) {
    case 'none': return 'No Zoom'
    case 'drift': return 'Drift'
    case 'snap': return 'Snap'
    case 'word-pulse': return 'Pulse'
    case 'zoom-out': return 'Reveal'
  }
}

function transitionLabel(t: string): string {
  switch (t) {
    case 'hard-cut': return 'Cut'
    case 'crossfade': return 'Fade'
    case 'flash-cut': return 'Flash'
    case 'color-wash': return 'Wash'
    default: return t
  }
}

function animationLabel(a: CaptionAnimation): string {
  switch (a) {
    case 'captions-ai': return 'CaptionsAI'
    case 'karaoke-fill': return 'Karaoke'
    case 'word-pop': return 'Pop'
    case 'fade-in': return 'Fade'
    case 'glow': return 'Glow'
    case 'word-box': return 'Box'
    case 'elastic-bounce': return 'Bounce'
    case 'typewriter': return 'Typewriter'
    case 'impact-two': return 'Impact'
    case 'cascade': return 'Cascade'
    default: return a
  }
}

// ---------------------------------------------------------------------------
// StyleCard — single selectable edit style card
// ---------------------------------------------------------------------------

function StyleCard({
  style,
  isSelected,
  onClick,
}: {
  style: EditStyle
  isSelected: boolean
  onClick: () => void
}) {
  const tier = TIER_META[style.energy]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-lg p-3 text-left transition-all duration-150 cursor-pointer select-none',
        'bg-card hover:bg-card/80',
        'hover:ring-2 hover:ring-border/60 active:scale-[0.98]',
        isSelected
          ? 'ring-2 shadow-lg'
          : 'ring-1 ring-border/40'
      )}
      style={isSelected ? {
        '--tw-ring-color': style.accentColor,
        boxShadow: `0 0 0 2px ${style.accentColor}33, 0 4px 12px ${style.accentColor}22`,
      } as React.CSSProperties : undefined}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full"
          style={{ backgroundColor: style.accentColor }}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Top row: name + accent swatch */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/10"
          style={{ backgroundColor: style.accentColor }}
        />
        <span className="text-xs font-semibold text-foreground truncate leading-tight">
          {style.name}
        </span>
        <span className={cn(
          'text-[8px] font-medium px-1.5 py-px rounded-full border leading-tight ml-auto shrink-0',
          tier.badgeClass
        )}>
          {tier.label}
        </span>
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-1 mt-auto">
        <span className="text-[8px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 leading-tight">
          {zoomLabel(style.defaultZoomStyle)}
        </span>
        <span className="text-[8px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 leading-tight">
          {transitionLabel(style.defaultTransition)}
        </span>
        {style.letterbox !== 'none' && (
          <span className="text-[8px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 leading-tight">
            {style.letterbox === 'both' ? 'Letterbox' : 'Bars'}
          </span>
        )}
        <span className="text-[8px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 leading-tight">
          {animationLabel(style.captionStyle.animation)}
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// EditStyleSelector — grouped grid of all edit style presets
// ---------------------------------------------------------------------------

const TIER_ORDER: EnergyTier[] = ['low', 'medium', 'high']

export function EditStyleSelector({
  styles,
  selectedStyleId,
  onSelectStyle,
}: EditStyleSelectorProps) {
  // Group styles by energy tier
  const grouped = useMemo(() => {
    const map: Record<EnergyTier, EditStyle[]> = { low: [], medium: [], high: [] }
    for (const s of styles) {
      map[s.energy].push(s)
    }
    return map
  }, [styles])

  const handleSelect = useCallback((styleId: string) => {
    onSelectStyle(styleId)
  }, [onSelectStyle])

  return (
    <div className="space-y-4">
      {TIER_ORDER.map((tier) => {
        const tierStyles = grouped[tier]
        if (tierStyles.length === 0) return null
        const meta = TIER_META[tier]

        return (
          <div key={tier}>
            {/* Sticky section header */}
            <div className={cn(
              'sticky top-0 z-10 flex items-center gap-1.5 px-1 py-1.5 mb-2',
              'bg-background/95 backdrop-blur-sm',
              'text-[10px] font-semibold uppercase tracking-wider',
              meta.headerClass
            )}>
              {meta.icon}
              {meta.label}
              <Badge
                variant="outline"
                className={cn('text-[8px] px-1.5 py-0 leading-tight ml-1', meta.badgeClass)}
              >
                {tierStyles.length}
              </Badge>
            </div>

            {/* Responsive grid: 2 cols narrow, 3 cols wide */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
              {tierStyles.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  isSelected={selectedStyleId === style.id}
                  onClick={() => handleSelect(style.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
