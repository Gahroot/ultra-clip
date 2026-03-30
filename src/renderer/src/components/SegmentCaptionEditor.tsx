import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { VideoSegment } from '../store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds as M:SS (compact, for segment time ranges) */
function formatSegmentTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// SidebarTabSwitcher — toggles between Style and Captions panels
// ---------------------------------------------------------------------------

export type SidebarTab = 'style' | 'captions'

interface SidebarTabSwitcherProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
}

export function SidebarTabSwitcher({ activeTab, onTabChange }: SidebarTabSwitcherProps) {
  return (
    <div className="flex shrink-0 border-b border-border">
      <button
        onClick={() => onTabChange('style')}
        className={cn(
          'flex-1 px-3 py-2 text-xs font-medium transition-colors',
          activeTab === 'style'
            ? 'text-foreground border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground/80'
        )}
      >
        Style
      </button>
      <button
        onClick={() => onTabChange('captions')}
        className={cn(
          'flex-1 px-3 py-2 text-xs font-medium transition-colors',
          activeTab === 'captions'
            ? 'text-foreground border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground/80'
        )}
      >
        Captions
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SegmentCaptionCard — single editable segment card
// ---------------------------------------------------------------------------

interface SegmentCaptionCardProps {
  segment: VideoSegment
  index: number
  isSelected: boolean
  accentColor: string
  onSelect: () => void
  onUpdateCaption: (newText: string) => void
}

function SegmentCaptionCard({
  segment,
  index,
  isSelected,
  accentColor,
  onSelect,
  onUpdateCaption,
}: SegmentCaptionCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // When entering edit mode, focus the textarea
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      // Place cursor at end
      textareaRef.current.selectionStart = textareaRef.current.value.length
      textareaRef.current.selectionEnd = textareaRef.current.value.length
    }
  }, [editing])

  const handleStartEdit = useCallback(() => {
    setDraft(segment.captionText)
    setEditing(true)
  }, [segment.captionText])

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== segment.captionText) {
      onUpdateCaption(trimmed)
    }
    setEditing(false)
  }, [draft, segment.captionText, onUpdateCaption])

  const handleBlur = useCallback(() => {
    commitEdit()
  }, [commitEdit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        commitEdit()
      }
      if (e.key === 'Escape') {
        setEditing(false)
      }
    },
    [commitEdit]
  )

  const duration = segment.endTime - segment.startTime
  const timeRange = `${formatSegmentTime(segment.startTime)} – ${formatSegmentTime(segment.endTime)}`

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg p-3 cursor-pointer transition-all duration-150 select-none',
        isSelected
          ? 'bg-zinc-700/70 ring-1 ring-white/10'
          : 'bg-zinc-800/60 hover:bg-zinc-800',
      )}
      style={{
        borderLeftWidth: 2,
        borderLeftStyle: 'solid',
        borderLeftColor: isSelected ? accentColor : 'transparent',
      }}
    >
      {/* Header row: index + time range + duration */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {index + 1}
        </span>
        <span className="text-[10px] text-zinc-400">·</span>
        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
          {timeRange}
        </span>
        <span className="ml-auto text-[10px] text-zinc-500 tabular-nums">
          {duration.toFixed(1)}s
        </span>
      </div>

      {/* Caption text — editable textarea */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          rows={3}
          className={cn(
            'w-full resize-none rounded-md px-2 py-1.5 text-xs leading-relaxed',
            'bg-transparent text-white placeholder-zinc-500',
            'border border-primary/40 focus:border-primary',
            'outline-none ring-1 ring-primary/20 focus:ring-primary/50',
            'transition-colors'
          )}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation()
            handleStartEdit()
          }}
          className={cn(
            'rounded-md px-2 py-1.5 text-xs leading-relaxed min-h-[2.5rem]',
            'text-zinc-300 hover:text-white',
            'hover:bg-white/5 cursor-text transition-colors',
            'border border-transparent hover:border-zinc-600'
          )}
        >
          {segment.captionText || (
            <span className="italic text-zinc-600">Click to add caption…</span>
          )}
        </div>
      )}

      {/* Character count */}
      <div className="flex justify-end mt-1">
        <span className="text-[9px] text-zinc-500 tabular-nums">
          {segment.captionText.length} chars
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SegmentCaptionEditor — vertical scrollable list of segment caption cards
// ---------------------------------------------------------------------------

export interface SegmentCaptionEditorProps {
  clipId: string
  segments: VideoSegment[]
  selectedIndex: number
  onSelectSegment: (index: number) => void
  onUpdateCaption: (segmentId: string, newText: string) => void
  accentColor?: string
}

export function SegmentCaptionEditor({
  clipId,
  segments,
  selectedIndex,
  onSelectSegment,
  onUpdateCaption,
  accentColor = '#6366f1',
}: SegmentCaptionEditorProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Scroll selected segment into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedIndex])

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground/50 px-4">
        <p>No segments available.</p>
        <p className="text-[10px] mt-1">Split this clip to begin editing captions.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Captions</span>
          <span className="text-[10px] text-muted-foreground">
            · {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Click a caption to edit. Press Enter to save, Esc to cancel.
        </p>
      </div>

      {/* Scrollable segment list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {segments.map((seg, i) => (
          <div
            key={seg.id}
            ref={i === selectedIndex ? selectedRef : undefined}
          >
            <SegmentCaptionCard
              segment={seg}
              index={i}
              isSelected={i === selectedIndex}
              accentColor={accentColor}
              onSelect={() => onSelectSegment(i)}
              onUpdateCaption={(newText) => onUpdateCaption(seg.id, newText)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
