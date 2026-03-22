import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Clock, Check, X, Combine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStore } from '../store'
import type { StitchedClipCandidate, StitchSegmentRole } from '../store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function scoreBadgeClass(score: number): string {
  if (score >= 90)
    return 'bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
  if (score >= 80)
    return 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
  if (score >= 70)
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
  return 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.3)]'
}

const ROLE_COLORS: Record<StitchSegmentRole, { bg: string; text: string; label: string }> = {
  'hook':         { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Hook' },
  'rehook':       { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  label: 'Rehook' },
  'context':      { bg: 'bg-blue-500/20',    text: 'text-blue-400',    label: 'Context' },
  'why':          { bg: 'bg-orange-500/20',   text: 'text-orange-400',  label: 'Why' },
  'what':         { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    label: 'What' },
  'how':          { bg: 'bg-teal-500/20',    text: 'text-teal-400',    label: 'How' },
  'mini-payoff':  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Mini Payoff' },
  'main-payoff':  { bg: 'bg-green-500/20',   text: 'text-green-400',   label: 'Main Payoff' },
  'bonus-payoff': { bg: 'bg-lime-500/20',    text: 'text-lime-400',    label: 'Bonus' },
  'bridge':       { bg: 'bg-gray-500/20',    text: 'text-gray-400',    label: 'Bridge' },
  'payoff':       { bg: 'bg-green-500/20',   text: 'text-green-400',   label: 'Payoff' },
}

/** Safely get role colors, with a fallback for any unknown roles */
function getRoleColor(role: StitchSegmentRole): { bg: string; text: string; label: string } {
  return ROLE_COLORS[role] ?? { bg: 'bg-gray-500/20', text: 'text-gray-400', label: role }
}

// ---------------------------------------------------------------------------
// StitchedClipCard
// ---------------------------------------------------------------------------

interface StitchedClipCardProps {
  clip: StitchedClipCandidate
  sourceId: string
  sourceDuration: number
}

export function StitchedClipCard({ clip, sourceId, sourceDuration }: StitchedClipCardProps) {
  const updateStitchedClipStatus = useStore((s) => s.updateStitchedClipStatus)
  const [showSegments, setShowSegments] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const isApproved = clip.status === 'approved'
  const isRejected = clip.status === 'rejected'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: isRejected ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex flex-col rounded-lg border bg-card overflow-hidden',
        'transition-colors duration-200',
        isApproved && 'border-l-4 border-l-green-500 border-t-green-500/30 border-r-green-500/30 border-b-green-500/30',
        isRejected && 'border border-red-500/40',
        !isApproved && !isRejected && 'border-border'
      )}
    >
      {/* Score Badge */}
      <div className="absolute top-2 left-2 z-10">
        <span
          className={cn(
            'inline-flex items-center justify-center w-10 h-10 rounded-full border-2',
            'text-base font-bold tabular-nums',
            scoreBadgeClass(clip.score)
          )}
        >
          {clip.score}
        </span>
      </div>

      {/* Timeline Visualization */}
      <div className="w-full px-3 pt-14 pb-2">
        <div className="relative h-6 bg-muted/30 rounded-full overflow-hidden border border-border/30">
          {clip.segments.map((seg, i) => {
            const left = sourceDuration > 0 ? (seg.startTime / sourceDuration) * 100 : 0
            const width = sourceDuration > 0 ? ((seg.endTime - seg.startTime) / sourceDuration) * 100 : 0
            const roleColor = getRoleColor(seg.role)
            return (
              <div
                key={i}
                className={cn('absolute top-0 h-full rounded-sm', roleColor.bg, 'border border-white/10')}
                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                title={`${roleColor.label}: ${formatTime(seg.startTime)} → ${formatTime(seg.endTime)}`}
              >
                <span className={cn('absolute inset-0 flex items-center justify-center text-[8px] font-bold truncate px-0.5', roleColor.text)}>
                  {width > 3 ? roleColor.label[0] : ''}
                </span>
              </div>
            )
          })}
        </div>
        {/* Role legend */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {Array.from(new Set(clip.segments.map((s) => s.role))).map((role) => {
            const rc = getRoleColor(role)
            return (
              <span key={role} className="flex items-center gap-0.5">
                <span className={cn('w-2 h-2 rounded-full', rc.bg)} />
                <span className={cn('text-[9px]', rc.text)}>{rc.label}</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Hook text + Duration + Segment count */}
        <div className="flex items-start gap-2">
          <p className="flex-1 font-semibold text-sm leading-snug text-foreground line-clamp-2">
            {clip.hookText || '—'}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-xs flex items-center gap-1 border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
              <Combine className="w-3 h-3" />
              {clip.segments.length}
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(clip.totalDuration)}
            </Badge>
          </div>
        </div>

        {/* Narrative */}
        {clip.narrative && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {clip.narrative}
          </p>
        )}

        {/* AI Reasoning (collapsible) */}
        {clip.reasoning && (
          <div>
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              AI reasoning
            </button>
            {showReasoning && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-muted-foreground/60 mt-1 leading-relaxed italic"
              >
                {clip.reasoning}
              </motion.p>
            )}
          </div>
        )}

        {/* Segments (expandable) */}
        <div>
          <button
            onClick={() => setShowSegments((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            {showSegments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {clip.segments.length} segments
          </button>
          {showSegments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1.5 space-y-1"
            >
              {clip.segments.map((seg, i) => {
                const rc = getRoleColor(seg.role)
                return (
                  <div
                    key={i}
                    className={cn('rounded border px-2 py-1.5', rc.bg, 'border-border/30')}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wide', rc.text)}>
                        {rc.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40">
                        ({formatDuration(seg.endTime - seg.startTime)})
                      </span>
                    </div>
                    {seg.text && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {seg.text}
                      </p>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-border/50 mt-auto">
        <Button
          size="sm"
          variant={isApproved ? 'default' : 'outline'}
          onClick={() => updateStitchedClipStatus(sourceId, clip.id, isApproved ? 'pending' : 'approved')}
          className={cn(
            'flex-1 gap-1.5 text-xs',
            isApproved
              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
              : 'border-green-600/40 text-green-500 hover:bg-green-600/10'
          )}
        >
          <Check className="w-3.5 h-3.5" />
          {isApproved ? 'Approved' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant={isRejected ? 'default' : 'outline'}
          onClick={() => updateStitchedClipStatus(sourceId, clip.id, isRejected ? 'pending' : 'rejected')}
          className={cn(
            'flex-1 gap-1.5 text-xs',
            isRejected
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
              : 'border-red-600/40 text-red-500 hover:bg-red-600/10'
          )}
        >
          <X className="w-3.5 h-3.5" />
          {isRejected ? 'Rejected' : 'Reject'}
        </Button>
      </div>
    </motion.div>
  )
}
