import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Video, Type, Image, LayoutGrid, Maximize2 } from 'lucide-react'
import { useStore, type VideoSegment, type SegmentStyleCategory, type SegmentStyleVariant } from '@/store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<SegmentStyleCategory, {
  label: string
  icon: React.ReactNode
  defaultExpanded: boolean
}> = {
  'main-video': {
    label: 'Main Video',
    icon: <Video className="w-3.5 h-3.5" />,
    defaultExpanded: true,
  },
  'main-video-text': {
    label: 'Main Video + Text',
    icon: <Type className="w-3.5 h-3.5" />,
    defaultExpanded: false,
  },
  'main-video-images': {
    label: 'Main Video + Images',
    icon: <Image className="w-3.5 h-3.5" />,
    defaultExpanded: false,
  },
  'fullscreen-image': {
    label: 'Fullscreen Image',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
    defaultExpanded: false,
  },
  'fullscreen-text': {
    label: 'Fullscreen Text',
    icon: <LayoutGrid className="w-3.5 h-3.5" />,
    defaultExpanded: false,
  },
}

const CATEGORY_ORDER: SegmentStyleCategory[] = [
  'main-video',
  'main-video-text',
  'main-video-images',
  'fullscreen-image',
  'fullscreen-text',
]

// ---------------------------------------------------------------------------
// Placeholder preview builder — colored boxes representing each layout type
// ---------------------------------------------------------------------------

function VariantPlaceholder({ variant }: { variant: SegmentStyleVariant }) {
  const cat = variant.category
  const baseClass = 'w-full h-full rounded-md flex items-center justify-center'

  // Main video: rectangle representing a person centered
  if (cat === 'main-video') {
    const isWide = variant.zoomStyle === 'drift' && variant.zoomIntensity < 1
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div
          className="rounded-full"
          style={{
            width: isWide ? 20 : 28,
            height: isWide ? 28 : 40,
            background: 'rgba(148, 163, 184, 0.25)',
            border: '1.5px solid rgba(148, 163, 184, 0.15)',
          }}
        />
      </div>
    )
  }

  // Main video + text: rectangle + large "T"
  if (cat === 'main-video-text') {
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="flex flex-col items-center gap-1">
          <div
            className="rounded-full"
            style={{
              width: 18,
              height: 24,
              background: 'rgba(148, 163, 184, 0.2)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }}
          />
          <span
            className="font-bold"
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}
          >
            T
          </span>
        </div>
      </div>
    )
  }

  // Main video + images: two rectangles side by side or PiP
  if (cat === 'main-video-images') {
    const isPip = variant.imageLayout === 'pip'
    const isBehind = variant.imageLayout === 'behind-speaker'
    if (isPip) {
      return (
        <div className={cn(baseClass, 'relative')} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="flex items-center justify-center w-full h-full">
            <div
              className="rounded-full"
              style={{ width: 22, height: 30, background: 'rgba(148, 163, 184, 0.2)', border: '1px solid rgba(148, 163, 184, 0.1)' }}
            />
          </div>
          <div
            className="absolute rounded-sm"
            style={{ top: 4, right: 4, width: 14, height: 14, background: 'rgba(99, 102, 241, 0.3)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
          />
        </div>
      )
    }
    if (isBehind) {
      return (
        <div className={cn(baseClass, 'relative')} style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
          <div
            className="absolute rounded-sm"
            style={{ inset: 4, background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.15)' }}
          />
          <div
            className="absolute rounded-full"
            style={{ bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 22, height: 28, background: 'rgba(148, 163, 184, 0.25)', border: '1px solid rgba(148, 163, 184, 0.15)' }}
          />
        </div>
      )
    }
    // side-by-side
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="flex gap-1 items-center justify-center w-full px-1">
          <div className="rounded-sm flex-1" style={{ height: 32, background: 'rgba(148, 163, 184, 0.2)', border: '1px solid rgba(148, 163, 184, 0.1)' }} />
          <div className="rounded-sm flex-1" style={{ height: 32, background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.15)' }} />
        </div>
      </div>
    )
  }

  // Fullscreen image: full rectangle with mountain icon feel
  if (cat === 'fullscreen-image') {
    const isDark = variant.id.includes('dark')
    return (
      <div className={baseClass} style={{ background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    )
  }

  // Fullscreen text: large "T" centered
  if (cat === 'fullscreen-text') {
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <span
          className="font-black"
          style={{ fontSize: 24, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}
        >
          T
        </span>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Variant thumbnail card
// ---------------------------------------------------------------------------

function VariantCard({
  variant,
  isSelected,
  accentColor,
  onClick,
}: {
  variant: SegmentStyleVariant
  isSelected: boolean
  accentColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center rounded-lg overflow-hidden transition-all duration-150 cursor-pointer select-none',
        'hover:brightness-110 active:scale-[0.97]',
        isSelected ? 'ring-2 shadow-lg' : 'ring-1 ring-border/50 hover:ring-border'
      )}
      style={{
        ...(isSelected
          ? { ringColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}, 0 2px 8px ${accentColor}33` }
          : {}),
      }}
      title={variant.description}
    >
      {/* Thumbnail preview */}
      <div className="w-full relative" style={{ height: 60 }}>
        <VariantPlaceholder variant={variant} />
        {/* Selected checkmark badge */}
        {isSelected && (
          <div
            className="absolute top-1 right-1 rounded-full flex items-center justify-center"
            style={{ width: 16, height: 16, background: accentColor }}
          >
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      {/* Label */}
      <div className="w-full text-center truncate px-1.5 py-1 text-[9px] font-medium text-muted-foreground bg-card">
        {variant.name}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Collapsible category section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  variants,
  selectedStyleId,
  accentColor,
  onStyleChange,
  segmentId,
  defaultExpanded,
}: {
  category: SegmentStyleCategory
  variants: SegmentStyleVariant[]
  selectedStyleId: string
  accentColor: string
  onStyleChange: (segmentId: string, variantId: string) => void
  segmentId: string
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const config = CATEGORY_CONFIG[category]

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground">{config.icon}</span>
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{config.label}</span>
        <span className="text-[9px] text-muted-foreground/70">{variants.length}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
            expanded ? 'rotate-180' : ''
          )}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {variants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                isSelected={selectedStyleId === variant.id}
                accentColor={accentColor}
                onClick={() => onStyleChange(segmentId, variant.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SegmentStylePickerProps {
  segment: VideoSegment
  onStyleChange: (segmentId: string, variantId: string) => void
  accentColor?: string
}

export function SegmentStylePicker({ segment, onStyleChange, accentColor }: SegmentStylePickerProps) {
  const selectedEditStyleId = useStore((s) => s.selectedEditStyleId)

  // Load all available segment style variants
  const [allVariants, setAllVariants] = useState<SegmentStyleVariant[]>([])
  useEffect(() => {
    window.api.getSegmentStyleVariants().then(setAllVariants).catch(() => {
      // Fallback: empty — section will show nothing
      setAllVariants([])
    })
  }, [])

  // Group variants by category
  const groupedVariants = useMemo(() => {
    const map = new Map<SegmentStyleCategory, SegmentStyleVariant[]>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, [])
    }
    for (const v of allVariants) {
      const arr = map.get(v.category)
      if (arr) arr.push(v)
    }
    return map
  }, [allVariants])

  const resolvedAccent = accentColor ?? '#6366f1'

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="shrink-0 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Style</span>
          {selectedEditStyleId && (
            <span className="text-[10px] text-muted-foreground">
              · {selectedEditStyleId}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Segment {segment.index + 1} · {segment.segmentStyleCategory.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* ── Category sections ── */}
      <div className="flex-1 overflow-y-auto">
        {CATEGORY_ORDER.map((cat) => {
          const variants = groupedVariants.get(cat)
          if (!variants || variants.length === 0) return null
          return (
            <CategorySection
              key={cat}
              category={cat}
              variants={variants}
              selectedStyleId={segment.segmentStyleId}
              accentColor={resolvedAccent}
              onStyleChange={onStyleChange}
              segmentId={segment.id}
              defaultExpanded={CATEGORY_CONFIG[cat].defaultExpanded}
            />
          )
        })}
      </div>
    </div>
  )
}
