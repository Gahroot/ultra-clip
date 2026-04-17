import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Check, Video, Type, Image, LayoutGrid, Maximize2, Loader2 } from 'lucide-react'
import { useStore, type VideoSegment, type SegmentStyleCategory, type TransitionType, type ZoomKeyframe, type Archetype } from '@/store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Archetypes whose layout draws a big on-screen "hero" text block. For these,
// the picker offers an inline text input so the user can author the text
// directly. The segment's caption text is still drawn alongside (except for
// fullscreen-quote / fullscreen-headline, which stand alone).
// ---------------------------------------------------------------------------

const HERO_ARCHETYPES = new Set<Archetype>([
  'fullscreen-headline',
  'fullscreen-quote',
  'quote-lower',
])

function deriveDefaultHero(captionText: string): string {
  const cleaned = captionText.replace(/\s+/g, ' ').trim().replace(/[.!?…,;:–—-]+$/g, '')
  const words = cleaned.split(' ')
  return words.length <= 8 ? cleaned : words.slice(0, 8).join(' ')
}

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
// Module-level caches
// ---------------------------------------------------------------------------

const templatesCache = new Map<string, EditStyleTemplateView[]>()
const styleThumbCache = new Map<string, string>()

// ---------------------------------------------------------------------------
// Placeholder thumbnail per category
// ---------------------------------------------------------------------------

function TemplatePlaceholder({ template }: { template: EditStyleTemplateView }) {
  const baseClass = 'w-full h-full rounded-md flex items-center justify-center'
  const cat = template.category

  if (cat === 'main-video') {
    const tight = template.archetype === 'tight-punch'
    const wide = template.archetype === 'wide-breather'
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div
          className="rounded-full"
          style={{
            width: wide ? 20 : tight ? 34 : 28,
            height: wide ? 28 : tight ? 46 : 40,
            background: 'rgba(148, 163, 184, 0.28)',
            border: '1.5px solid rgba(148, 163, 184, 0.18)',
          }}
        />
      </div>
    )
  }
  if (cat === 'main-video-text') {
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-full" style={{ width: 18, height: 24, background: 'rgba(148, 163, 184, 0.2)', border: '1px solid rgba(148, 163, 184, 0.1)' }} />
          <span className="font-bold" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>T</span>
        </div>
      </div>
    )
  }
  if (cat === 'main-video-images') {
    return (
      <div className={baseClass} style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="flex gap-1 items-center justify-center w-full px-1">
          <div className="rounded-sm flex-1" style={{ height: 32, background: 'rgba(148, 163, 184, 0.22)', border: '1px solid rgba(148, 163, 184, 0.12)' }} />
          <div className="rounded-sm flex-1" style={{ height: 32, background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.15)' }} />
        </div>
      </div>
    )
  }
  if (cat === 'fullscreen-image') {
    return (
      <div className={baseClass} style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  isSelected,
  accentColor,
  onClick,
  thumbnailSrc,
}: {
  template: EditStyleTemplateView
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
      style={isSelected ? { boxShadow: `0 0 0 2px ${accentColor}, 0 2px 8px ${accentColor}33` } : {}}
      title={template.description}
    >
      <div className="w-full relative" style={{ height: 60 }}>
        {thumbnailSrc && template.category !== 'fullscreen-image' && template.category !== 'fullscreen-text' ? (
          <div className="w-full h-full rounded-md overflow-hidden bg-black">
            <img src={thumbnailSrc} alt={template.name} className="w-full h-full object-cover" draggable={false} />
          </div>
        ) : (
          <TemplatePlaceholder template={template} />
        )}
        {isSelected && (
          <div
            className="absolute top-1 right-1 rounded-full flex items-center justify-center"
            style={{ width: 16, height: 16, background: accentColor }}
          >
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="w-full text-center truncate px-1.5 py-1 text-[9px] font-medium text-muted-foreground bg-card">
        {template.name}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Collapsible category section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  templates,
  selectedArchetype,
  accentColor,
  onArchetypeChange,
  segmentId,
  defaultExpanded,
  thumbnailSrc,
}: {
  category: SegmentStyleCategory
  templates: EditStyleTemplateView[]
  selectedArchetype: Archetype
  accentColor: string
  onArchetypeChange: (segmentId: string, archetype: Archetype) => void
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
        <span className="text-[9px] text-muted-foreground/70">{templates.length}</span>
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
            {templates.map((template) => (
              <TemplateCard
                key={template.archetype}
                template={template}
                isSelected={selectedArchetype === template.archetype}
                accentColor={accentColor}
                onClick={() => onArchetypeChange(segmentId, template.archetype)}
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

interface SegmentTemplatePickerProps {
  segment: VideoSegment
  onArchetypeChange: (segmentId: string, archetype: Archetype) => void
  onSegmentSettingsChange?: (segmentId: string, updates: Partial<VideoSegment>) => void
  accentColor?: string
  sourcePath?: string
  pending?: boolean
}

export function SegmentTemplatePicker({
  segment,
  onArchetypeChange,
  onSegmentSettingsChange,
  accentColor,
  sourcePath,
  pending = false,
}: SegmentTemplatePickerProps) {
  const selectedEditStyleId = useStore((s) => s.selectedEditStyleId)

  const [templates, setTemplates] = useState<EditStyleTemplateView[]>(
    () => (selectedEditStyleId ? templatesCache.get(selectedEditStyleId) ?? [] : [])
  )

  // Refetch when active edit style changes
  useEffect(() => {
    if (!selectedEditStyleId) {
      setTemplates([])
      return
    }
    const cached = templatesCache.get(selectedEditStyleId)
    if (cached) {
      setTemplates(cached)
      return
    }
    let cancelled = false
    window.api
      .getEditStyleTemplates(selectedEditStyleId)
      .then((result: EditStyleTemplateView[]) => {
        if (cancelled) return
        templatesCache.set(selectedEditStyleId, result)
        setTemplates(result)
      })
      .catch(() => {
        if (cancelled) return
        setTemplates([])
      })
    return () => { cancelled = true }
  }, [selectedEditStyleId])

  // Fetch thumbnail for this segment's midpoint
  const [thumbnailSrc, setThumbnailSrc] = useState<string | undefined>(undefined)
  const lastThumbKeyRef = useRef<string>('')
  useEffect(() => {
    if (!sourcePath) return
    const midTime = (segment.startTime + segment.endTime) / 2
    const cacheKey = `${sourcePath}:${midTime.toFixed(2)}`
    if (cacheKey === lastThumbKeyRef.current) return
    lastThumbKeyRef.current = cacheKey
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
    }).catch(() => { /* no thumb */ })
    return () => { cancelled = true }
  }, [sourcePath, segment.startTime, segment.endTime])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const map = new Map<SegmentStyleCategory, EditStyleTemplateView[]>()
    for (const cat of CATEGORY_ORDER) map.set(cat, [])
    for (const t of templates) {
      const arr = map.get(t.category)
      if (arr) arr.push(t)
    }
    return map
  }, [templates])

  const resolvedAccent = accentColor ?? '#6366f1'

  return (
    <div className="flex flex-col h-full relative">
      {pending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Re-styling…
          </div>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Template</span>
          {selectedEditStyleId && (
            <span className="text-[10px] text-muted-foreground">· {selectedEditStyleId}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Segment {segment.index + 1} · {segment.archetype.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Body */}
      <div className={cn('flex-1 overflow-y-auto', pending && 'opacity-50 pointer-events-none')}>
        {/* Hero text input — only for archetypes that draw big on-screen text.
            Edits go straight to the segment via onSegmentSettingsChange. */}
        {HERO_ARCHETYPES.has(segment.archetype) && onSegmentSettingsChange && (
          <HeroTextInput
            segment={segment}
            onChange={(v) => onSegmentSettingsChange(segment.id, { overlayText: v })}
          />
        )}

        {segment.fallbackReason && (
          <div className="mx-3 my-2 px-2 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
            <span className="font-semibold">Last render fell back:</span> {segment.fallbackReason}
          </div>
        )}

        {templates.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-muted-foreground">
            No templates available for this edit style.
          </div>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const catTemplates = groupedTemplates.get(cat)
            if (!catTemplates || catTemplates.length === 0) return null
            return (
              <CategorySection
                key={cat}
                category={cat}
                templates={catTemplates}
                selectedArchetype={segment.archetype}
                accentColor={resolvedAccent}
                onArchetypeChange={onArchetypeChange}
                segmentId={segment.id}
                defaultExpanded={CATEGORY_CONFIG[cat].defaultExpanded}
                thumbnailSrc={thumbnailSrc}
              />
            )
          })
        )}

        {onSegmentSettingsChange && templates.length > 0 && (
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

// ---------------------------------------------------------------------------
// HeroTextInput — inline textarea for authoring the big on-screen text of
// headline / quote / lower-quote archetypes. Syncs with segment.overlayText,
// seeding from segment.captionText when empty. Updates on blur to avoid
// thrashing the preview re-render on every keystroke.
// ---------------------------------------------------------------------------

function HeroTextInput({
  segment,
  onChange,
}: {
  segment: VideoSegment
  onChange: (text: string) => void
}) {
  const seed = segment.overlayText ?? deriveDefaultHero(segment.captionText)
  const [draft, setDraft] = useState(seed)

  // Reset draft when the underlying segment changes (e.g. user picks a
  // different segment in the timeline).
  useEffect(() => {
    setDraft(segment.overlayText ?? deriveDefaultHero(segment.captionText))
  }, [segment.id, segment.overlayText, segment.captionText])

  const isHeadline = segment.archetype === 'fullscreen-headline'
  const isQuote = segment.archetype === 'fullscreen-quote'
  const label = isHeadline ? 'Headline text' : isQuote ? 'Quote text' : 'Overlay text'

  return (
    <div className="px-3 pt-3 pb-2 border-b border-border/40">
      <label className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
        {label}
      </label>
      <p className="text-[9px] text-muted-foreground mb-1.5">
        Shown on-screen for this segment. Seeded from the caption — edit to taste.
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim()
          if (next !== (segment.overlayText ?? '')) onChange(next)
        }}
        rows={2}
        maxLength={120}
        className={cn(
          'w-full resize-none rounded border border-border/60 bg-background/60',
          'px-2 py-1.5 text-[11px] leading-snug text-foreground',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
        placeholder="Type the hero text…"
      />
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[9px] text-muted-foreground/60">{draft.length}/120</span>
        <button
          type="button"
          className="text-[9px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            const reset = deriveDefaultHero(segment.captionText)
            setDraft(reset)
            onChange(reset)
          }}
        >
          Reset from caption
        </button>
      </div>
    </div>
  )
}
