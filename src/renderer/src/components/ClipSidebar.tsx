import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Check, Search, X, SlidersHorizontal } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { ClipCandidate } from '../store'

// ── Exported types ──────────────────────────────────────────────
export type FilterTab = 'all' | 'approved' | 'rejected' | 'pending'
export type SortMode = 'score' | 'time' | 'duration' | 'custom'

interface ClipSidebarProps {
  clips: ClipCandidate[]
  activeClipId: string | null
  onSelectClip: (clipId: string, index: number) => void
  sourceId: string
  sourcePath: string
  filter: FilterTab
  onFilterChange: (filter: FilterTab) => void
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  localMinScore: number
  onMinScoreChange: (score: number) => void
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

function scoreBadgeColor(score: number): string {
  if (score >= 90) return 'text-green-400'
  if (score >= 80) return 'text-blue-400'
  if (score >= 70) return 'text-yellow-400'
  return 'text-orange-400'
}

// ── Component ───────────────────────────────────────────────────

export function ClipSidebar({
  clips,
  activeClipId,
  onSelectClip,
  sourceId,
  sourcePath,
  filter,
  onFilterChange,
  sortMode,
  onSortChange,
  searchQuery,
  onSearchChange,
  localMinScore,
  onMinScoreChange,
}: ClipSidebarProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // ── Filter & sort clips ─────────────────────────────────────
  const processedClips = useMemo(() => {
    let result = [...clips]

    // Filter by status
    if (filter !== 'all') {
      result = result.filter((c) => c.status === filter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.hookText.toLowerCase().includes(q) ||
          c.text.toLowerCase().includes(q) ||
          c.reasoning.toLowerCase().includes(q),
      )
    }

    // Filter by minimum score
    result = result.filter((c) => c.score >= localMinScore)

    // Sort
    switch (sortMode) {
      case 'score':
        result.sort((a, b) => b.score - a.score)
        break
      case 'time':
        result.sort((a, b) => a.startTime - b.startTime)
        break
      case 'duration':
        result.sort((a, b) => a.duration - b.duration)
        break
      case 'custom':
        // Keep original order for custom
        break
    }

    return result
  }, [clips, filter, searchQuery, localMinScore, sortMode])

  // ── Counts ──────────────────────────────────────────────────
  const approvedCount = useMemo(
    () => clips.filter((c) => c.status === 'approved').length,
    [clips],
  )
  const pendingCount = useMemo(
    () => clips.filter((c) => c.status === 'pending').length,
    [clips],
  )

  // ── Auto-scroll to active clip ──────────────────────────────
  useEffect(() => {
    if (activeClipId) {
      const el = itemRefs.current.get(activeClipId)
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeClipId])

  // ── Item ref callback ───────────────────────────────────────
  const setItemRef = useCallback(
    (clipId: string) => (el: HTMLButtonElement | null) => {
      if (el) {
        itemRefs.current.set(clipId, el)
      } else {
        itemRefs.current.delete(clipId)
      }
    },
    [],
  )

  // ── Handle clip selection ───────────────────────────────────
  const handleSelectClip = useCallback(
    (clip: ClipCandidate, index: number) => {
      onSelectClip(clip.id, index)
    },
    [onSelectClip],
  )

  // ── Determine if custom sort should be disabled ─────────────
  const isCustomDisabled = sortMode !== 'custom'

  return (
    <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
      {/* ── Header section ─────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 space-y-2 border-b border-border">
        {/* Filter tabs */}
        <Tabs
          value={filter}
          onValueChange={(v) => onFilterChange(v as FilterTab)}
        >
          <TabsList className="h-7 w-full">
            <TabsTrigger value="all" className="text-[10px] px-1.5 h-5 flex-1">
              All
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="text-[10px] px-1.5 h-5 flex-1"
            >
              Approved
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="text-[10px] px-1.5 h-5 flex-1"
            >
              Rejected
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-[10px] px-1.5 h-5 flex-1"
            >
              Pending
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sort + Search row */}
        <div className="flex items-center gap-1.5">
          <Select
            value={sortMode}
            onValueChange={(v) => onSortChange(v as SortMode)}
          >
            <SelectTrigger className="h-6 text-[10px] flex-1 min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">By Score</SelectItem>
              <SelectItem value="time">By Time</SelectItem>
              <SelectItem value="duration">By Duration</SelectItem>
              <SelectItem value="custom" disabled={isCustomDisabled}>
                Custom
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search clips…"
              className="h-6 text-[10px] pl-6 pr-5"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Min score slider */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
          <Slider
            value={[localMinScore]}
            onValueChange={([v]) => onMinScoreChange(v)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">
            {localMinScore}
          </span>
        </div>
      </div>

      {/* ── Scrollable clip list ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {processedClips.length === 0 ? (
          <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">
            {clips.length === 0
              ? 'No clips available'
              : 'No clips match filters'}
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {processedClips.map((clip, index) => {
              const isActive = clip.id === activeClipId
              const isApproved = clip.status === 'approved'
              const isRejected = clip.status === 'rejected'
              const hasOverrides = !!clip.overrides || !!clip.aiEditPlan

              return (
                <button
                  key={clip.id}
                  ref={setItemRef(clip.id)}
                  onClick={() => handleSelectClip(clip, index)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md transition-colors',
                    'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                    'flex items-start gap-2 relative',
                    isActive && 'bg-accent ring-1 ring-primary/50',
                    isRejected && 'opacity-50',
                  )}
                  style={{
                    borderLeftWidth: isApproved
                      ? 2
                      : isRejected
                        ? 2
                        : 0,
                    borderLeftStyle: 'solid',
                    borderLeftColor: isApproved
                      ? 'rgb(34 197 94)'
                      : isRejected
                        ? 'rgb(239 68 68)'
                        : 'transparent',
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-8 rounded overflow-hidden bg-black/40 shrink-0">
                    {clip.customThumbnail || clip.thumbnail ? (
                      <img
                        src={clip.customThumbnail || clip.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                        {formatDuration(clip.duration)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-tight line-clamp-2 break-words">
                      {clip.hookText || clip.text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatDuration(clip.duration)}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-bold tabular-nums',
                          scoreBadgeColor(clip.score),
                        )}
                      >
                        {clip.score}
                      </span>
                      {isApproved && (
                        <Check className="h-3 w-3 text-green-400" />
                      )}
                      {hasOverrides && (
                        <span className="text-[8px] px-1 rounded bg-purple-500/20 text-purple-300">
                          styled
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Footer section ─────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-t border-border bg-card/30 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {approvedCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          {pendingCount}
        </span>
        <span className="ml-auto tabular-nums">{clips.length} total</span>
      </div>
    </div>
  )
}
