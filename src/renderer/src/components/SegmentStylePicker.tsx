import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Check, Video, Type, Image, LayoutGrid, Maximize2 } from 'lucide-react'
import { useStore, type VideoSegment, type SegmentStyleCategory, type SegmentStyleVariant, type TransitionType, type ZoomKeyframe } from '@/store'
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
// Module-level thumbnail cache (persists across re-renders)
// ---------------------------------------------------------------------------

const styleThumbCache = new Map<string, string>()

// ---------------------------------------------------------------------------
// Style preview with actual video frame thumbnail
// ---------------------------------------------------------------------------

function StylePreviewThumbnail({ variant, thumbnailSrc }: { variant: SegmentStyleVariant; thumbnailSrc: string }) {
  const cat = variant.category

  // Main video: show frame with different crop levels
  if (cat === 'main-video') {
    const isWide = variant.zoomStyle === 'drift' && variant.zoomIntensity < 1
    const isTight = variant.name.toLowerCase().includes('tight')
    const scale = isTight ? 1.8 : isWide ? 1.0 : 1.3
    return (
      <div className="w-full h-full rounded-md overflow-hidden bg-black">
        <img
          src={thumbnailSrc}
          alt={variant.name}
          className="w-full h-full object-cover"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>
    )
  }

  // Main video + text: frame with text bar at bottom
  if (cat === 'main-video-text') {
    return (
      <div className="w-full h-full rounded-md overflow-hidden bg-black relative">
        <img
          src={thumbnailSrc}
          alt={variant.name}
          className="w-full h-full object-cover"
          style={{ transform: 'scale(1.3)' }}
          draggable={false}
        />
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-1">
          <div className="flex gap-0.5">
            <div className="w-6 h-1 rounded-full bg-white/60" />
            <div className="w-4 h-1 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    )
  }

  // Main video + images: frame with mock overlay
  if (cat === 'main-video-images') {
    const isPip = variant.imageLayout === 'pip'
    const isBehind = variant.imageLayout === 'behind-speaker'
    return (
      <div className="w-full h-full rounded-md overflow-hidden bg-black relative">
        <img
          src={thumbnailSrc}
          alt={variant.name}
          className="w-full h-full object-cover"
          style={{ transform: 'scale(1.2)' }}
          draggable={false}
        />
        {isPip && (
          <div
            className="absolute rounded-sm border border-indigo-400/40"
            style={{ top: 3, right: 3, width: 16, height: 16, background: 'rgba(99, 102, 241, 0.35)', backdropFilter: 'blur(2px)' }}
          />
        )}
        {isBehind && (
          <div className="absolute inset-0 bg-indigo-500/15 border border-indigo-400/20 rounded-md" />
        )}
        {!isPip && !isBehind && (
          <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-indigo-500/25 border-l border-indigo-400/20" />
        )}
      </div>
    )
  }

  // Fullscreen image: gradient placeholder (no video frame useful here)
  if (cat === 'fullscreen-image') {
    const isDark = variant.id.includes('dark')
    return (
      <div className="w-full h-full rounded-md flex items-center justify-center" style={{ background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    )
  }

  // Fullscreen text: text on darkened frame background
  if (cat === 'fullscreen-text') {
    return (
      <div className="w-full h-full rounded-md overflow-hidden bg-black relative">
        <img
          src={thumbnailSrc}
          alt={variant.name}
          className="w-full h-full object-cover opacity-20"
          style={{ transform: 'scale(1.1)', filter: 'blur(2px)' }}
          draggable={false}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black" style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>T</span>
        </div>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Fallback placeholder (used when no thumbnail available)
// ---------------------------------------------------------------------------

function VariantPlaceholder({ variant }: { variant: SegmentStyleVariant }) {
  const cat = variant.category
  const baseClass = 'w-full h-full rounded-md flex items-center justify-center'

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

  if (cat === 'main-video-text') {
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="flex flex-col items-center gap-1">
          <div
            className="rounded-full"
            style={{ width: 18, height: 24, background: 'rgba(148, 163, 184, 0.2)', border: '1px solid rgba(148, 163, 184, 0.1)' }}
          />
          <span className="font-bold" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>T</span>
        </div>
      </div>
    )
  }

  if (cat === 'main-video-images') {
    const isPip = variant.imageLayout === 'pip'
    const isBehind = variant.imageLayout === 'behind-speaker'
    if (isPip) {
      return (
        <div className={cn(baseClass, 'relative')} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="flex items-center justify-center w-full h-full">
            <div className="rounded-full" style={{ width: 22, height: 30, background: 'rgba(148, 163, 184, 0.2)', border: '1px solid rgba(148, 163, 184, 0.1)' }} />
          </div>
          <div className="absolute rounded-sm" style={{ top: 4, right: 4, width: 14, height: 14, background: 'rgba(99, 102, 241, 0.3)', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
        </div>
      )
    }
    if (isBehind) {
      return (
        <div className={cn(baseClass, 'relative')} style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
          <div className="absolute rounded-sm" style={{ inset: 4, background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.15)' }} />
          <div className="absolute rounded-full" style={{ bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 22, height: 28, background: 'rgba(148, 163, 184, 0.25)', border: '1px solid rgba(148, 163, 184, 0.15)' }} />
        </div>
      )
    }
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="flex gap-1 items-center justify-center w-full px-1">
          <div className="rounded-sm flex-1" style={{ height: 32, background: 'rgba(148, 163, 184, 0.2)', border: '1px solid rgba(148, 163, 184, 0.1)' }} />
          <div className="rounded-sm flex-1" style={{ height: 32, background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.15)' }} />
        </div>
      </div>
    )
  }

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

  if (cat === 'fullscreen-text') {
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <span className="font-black" style={{ fontSize: 24, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}>T</span>
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
  thumbnailSrc,
}: {
  variant: SegmentStyleVariant
  isSelected: boolean
  accentColor: string
  onClick: () => void
  thumbnailSrc?: string
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
        {thumbnailSrc ? (
          <StylePreviewThumbnail variant={variant} thumbnailSrc={thumbnailSrc} />
        ) : (
          <VariantPlaceholder variant={variant} />
        )}
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
  thumbnailSrc,
}: {
  category: SegmentStyleCategory
  variants: SegmentStyleVariant[]
  selectedStyleId: string
  accentColor: string
  onStyleChange: (segmentId: string, variantId: string) => void
  segmentId: string
  defaultExpanded: boolean
  thumbnailSrc?: string
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
                thumbnailSrc={thumbnailSrc}
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

// ---------------------------------------------------------------------------
// Transition / Zoom option constants
// ---------------------------------------------------------------------------

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'hard-cut', label: 'Hard Cut' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'flash-cut', label: 'Flash Cut' },
  { value: 'color-wash', label: 'Color Wash' },
]

const ZOOM_EASING_OPTIONS: { value: string; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'snap', label: 'Snap' },
]

// ---------------------------------------------------------------------------
// Inline select component (compact dropdown)
// ---------------------------------------------------------------------------

function InlineSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="text-[10px] bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-foreground outline-none focus:ring-1 focus:ring-ring cursor-pointer min-w-[90px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SegmentStylePickerProps {
  segment: VideoSegment
  onStyleChange: (segmentId: string, variantId: string) => void
  onSegmentSettingsChange?: (segmentId: string, updates: Partial<VideoSegment>) => void
  accentColor?: string
  sourcePath?: string
}

export function SegmentStylePicker({ segment, onStyleChange, onSegmentSettingsChange, accentColor, sourcePath }: SegmentStylePickerProps) {
  const selectedEditStyleId = useStore((s) => s.selectedEditStyleId)

  // Load all available segment style variants
  const [allVariants, setAllVariants] = useState<SegmentStyleVariant[]>([])
  useEffect(() => {
    window.api.getSegmentStyleVariants().then(setAllVariants).catch(() => {
      setAllVariants([])
    })
  }, [])

  // Fetch thumbnail for this segment's midpoint
  const [thumbnailSrc, setThumbnailSrc] = useState<string | undefined>(undefined)
  const lastThumbKeyRef = useRef<string>('')

  useEffect(() => {
    if (!sourcePath) return
    const midTime = (segment.startTime + segment.endTime) / 2
    const cacheKey = `${sourcePath}:${midTime.toFixed(2)}`

    // Skip if same key
    if (cacheKey === lastThumbKeyRef.current) return
    lastThumbKeyRef.current = cacheKey

    // Check cache
    const cached = styleThumbCache.get(cacheKey)
    if (cached) {
      setThumbnailSrc(cached)
      return
    }

    let cancelled = false
    window.api.getThumbnail(sourcePath, midTime).then((base64) => {
      if (cancelled) return
      styleThumbCache.set(cacheKey, base64)
      setThumbnailSrc(base64)
    }).catch(() => {
      // Failed to generate thumbnail — leave as undefined
    })
    return () => { cancelled = true }
  }, [sourcePath, segment.startTime, segment.endTime])

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
              thumbnailSrc={thumbnailSrc}
            />
          )
        })}

        {/* ── Segment Settings (Transitions & Zoom) ── */}
        {onSegmentSettingsChange && (
          <div className="border-t border-border/50 px-3 py-3">
            <span className="text-xs font-semibold text-foreground">Segment Settings</span>
            <div className="mt-2 flex flex-col gap-2">
              <InlineSelect<TransitionType>
                label="Transition In"
                value={segment.transitionIn}
                options={TRANSITION_OPTIONS}
                onChange={(v) => onSegmentSettingsChange(segment.id, { transitionIn: v })}
              />
              <InlineSelect<TransitionType>
                label="Transition Out"
                value={segment.transitionOut}
                options={TRANSITION_OPTIONS}
                onChange={(v) => onSegmentSettingsChange(segment.id, { transitionOut: v })}
              />
              <InlineSelect<string>
                label="Zoom Easing"
                value={segment.zoomKeyframes[0]?.easing ?? 'ease-in-out'}
                options={ZOOM_EASING_OPTIONS}
                onChange={(v) => {
                  const kf = segment.zoomKeyframes[0]
                  const base = kf ?? { time: 0, scale: 1.0, x: 0.5, y: 0.5, easing: 'ease-in-out' as const }
                  onSegmentSettingsChange(segment.id, {
                    zoomKeyframes: [{ ...base, easing: v as ZoomKeyframe['easing'] }],
                  })
                }}
              />
              {/* Zoom Scale slider */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Zoom Scale</span>
                <div className="flex items-center gap-1.5 min-w-[90px]">
                  <input
                    type="range"
                    min={1.0}
                    max={1.3}
                    step={0.01}
                    value={segment.zoomKeyframes[0]?.scale ?? 1.0}
                    onChange={(e) => {
                      const scale = parseFloat(e.target.value)
                      const kf = segment.zoomKeyframes[0]
                      const base = kf ?? { time: 0, scale: 1.0, x: 0.5, y: 0.5, easing: 'ease-in-out' as const }
                      onSegmentSettingsChange(segment.id, {
                        zoomKeyframes: [{ ...base, scale }],
                      })
                    }}
                    className="flex-1 h-1 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-[9px] text-muted-foreground w-8 text-right">
                    {((segment.zoomKeyframes[0]?.scale ?? 1.0)).toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
