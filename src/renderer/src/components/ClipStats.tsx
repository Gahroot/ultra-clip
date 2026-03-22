import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, ChevronDown } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ClipCandidate } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DurationBucket {
  label: string
  min: number
  max: number
  color: string
  bgColor: string
}

interface ScoreBucket {
  label: string
  min: number
  max: number
  color: string
  bgColor: string
}

// ---------------------------------------------------------------------------
// Bucket definitions
// ---------------------------------------------------------------------------

const DURATION_BUCKETS: DurationBucket[] = [
  { label: '0–15s',   min: 0,   max: 15,  color: 'bg-sky-400',    bgColor: 'bg-sky-400/20' },
  { label: '15–30s',  min: 15,  max: 30,  color: 'bg-blue-400',   bgColor: 'bg-blue-400/20' },
  { label: '30–60s',  min: 30,  max: 60,  color: 'bg-violet-400', bgColor: 'bg-violet-400/20' },
  { label: '60–90s',  min: 60,  max: 90,  color: 'bg-purple-400', bgColor: 'bg-purple-400/20' },
  { label: '90–120s', min: 90,  max: 120, color: 'bg-fuchsia-400',bgColor: 'bg-fuchsia-400/20' },
  { label: '120s+',   min: 120, max: Infinity, color: 'bg-pink-400', bgColor: 'bg-pink-400/20' },
]

const SCORE_BUCKETS: ScoreBucket[] = [
  { label: '90–100', min: 90, max: 101, color: 'bg-green-400',  bgColor: 'bg-green-400/20' },
  { label: '80–89',  min: 80, max: 90,  color: 'bg-blue-400',   bgColor: 'bg-blue-400/20' },
  { label: '70–79',  min: 70, max: 80,  color: 'bg-yellow-400', bgColor: 'bg-yellow-400/20' },
  { label: '60–69',  min: 60, max: 70,  color: 'bg-orange-400', bgColor: 'bg-orange-400/20' },
  { label: '<60',    min: 0,  max: 60,  color: 'bg-red-400',    bgColor: 'bg-red-400/20' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ---------------------------------------------------------------------------
// MiniBar — one row in a distribution chart
// ---------------------------------------------------------------------------

interface MiniBarProps {
  label: string
  total: number
  approved: number
  rejected: number
  pending: number
  maxCount: number
  barColor: string
  bgColor: string
  tooltip: string
}

function MiniBar({ label, total, approved, rejected, pending, maxCount, barColor, bgColor, tooltip }: MiniBarProps) {
  if (total === 0) return null

  const pct = maxCount > 0 ? (total / maxCount) * 100 : 0
  // Sub-bar widths as percentage of total bar
  const approvedPct = total > 0 ? (approved / total) * 100 : 0
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0
  const pendingPct  = total > 0 ? (pending / total) * 100 : 0

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 group cursor-default">
          {/* Label */}
          <span className="text-[10px] text-muted-foreground w-12 shrink-0 tabular-nums text-right">
            {label}
          </span>

          {/* Bar track */}
          <div className={cn('flex-1 h-3.5 rounded-sm overflow-hidden', bgColor)}>
            {/* Full-width bar, then sub-bars inside */}
            <div
              className="h-full flex transition-all duration-300"
              style={{ width: `${pct}%` }}
            >
              {approved > 0 && (
                <div
                  className="h-full bg-green-500/80"
                  style={{ width: `${approvedPct}%` }}
                />
              )}
              {rejected > 0 && (
                <div
                  className="h-full bg-red-500/70"
                  style={{ width: `${rejectedPct}%` }}
                />
              )}
              {pending > 0 && (
                <div
                  className={cn('h-full', barColor, 'opacity-60')}
                  style={{ width: `${pendingPct}%` }}
                />
              )}
            </div>
          </div>

          {/* Count */}
          <span className="text-[10px] text-muted-foreground tabular-nums w-4 shrink-0">
            {total}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-0.5">
        <p className="font-medium">{tooltip}</p>
        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
          {approved > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {approved} approved
            </span>
          )}
          {rejected > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {rejected} rejected
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />
              {pending} pending
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// ClipStats
// ---------------------------------------------------------------------------

interface ClipStatsProps {
  clips: ClipCandidate[]
}

export function ClipStats({ clips }: ClipStatsProps) {
  const [expanded, setExpanded] = useState(false)

  // ---------------------------------------------------------------------------
  // Duration distribution
  // ---------------------------------------------------------------------------

  const durationData = useMemo(() => {
    return DURATION_BUCKETS.map((bucket) => {
      const inBucket = clips.filter((c) => c.duration >= bucket.min && c.duration < bucket.max)
      return {
        ...bucket,
        total:    inBucket.length,
        approved: inBucket.filter((c) => c.status === 'approved').length,
        rejected: inBucket.filter((c) => c.status === 'rejected').length,
        pending:  inBucket.filter((c) => c.status === 'pending').length,
      }
    }).filter((b) => b.total > 0)
  }, [clips])

  const maxDurationCount = useMemo(
    () => Math.max(1, ...durationData.map((b) => b.total)),
    [durationData]
  )

  // ---------------------------------------------------------------------------
  // Score distribution
  // ---------------------------------------------------------------------------

  const scoreData = useMemo(() => {
    return SCORE_BUCKETS.map((bucket) => {
      const inBucket = clips.filter((c) => c.score >= bucket.min && c.score < bucket.max)
      return {
        ...bucket,
        total:    inBucket.length,
        approved: inBucket.filter((c) => c.status === 'approved').length,
        rejected: inBucket.filter((c) => c.status === 'rejected').length,
        pending:  inBucket.filter((c) => c.status === 'pending').length,
      }
    }).filter((b) => b.total > 0)
  }, [clips])

  const maxScoreCount = useMemo(
    () => Math.max(1, ...scoreData.map((b) => b.total)),
    [scoreData]
  )

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const summaryStats = useMemo(() => {
    if (clips.length === 0) return null

    const approved = clips.filter((c) => c.status === 'approved')
    const totalApprovedDuration = approved.reduce((sum, c) => sum + c.duration, 0)
    const avgDuration = clips.reduce((sum, c) => sum + c.duration, 0) / clips.length
    const minScore = Math.min(...clips.map((c) => c.score))
    const maxScore = Math.max(...clips.map((c) => c.score))

    return { totalApprovedDuration, avgDuration, minScore, maxScore, approvedCount: approved.length }
  }, [clips])

  if (clips.length === 0) return null

  return (
    <div className="shrink-0 border-b border-border/50">
      {/* Toggle button row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-muted/30 transition-colors text-left"
      >
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-medium flex-1">
          {expanded ? 'Hide Stats' : 'Show Stats'}
        </span>

        {/* Summary pills — always visible */}
        {summaryStats && !expanded && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
            {summaryStats.approvedCount > 0 && (
              <span className="tabular-nums">
                {formatSeconds(summaryStats.totalApprovedDuration)} approved
              </span>
            )}
            <span className="tabular-nums">
              avg {formatSeconds(summaryStats.avgDuration)}
            </span>
            <span className="tabular-nums">
              scores {summaryStats.minScore}–{summaryStats.maxScore}
            </span>
          </div>
        )}

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="stats-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 space-y-3">
              {/* Summary row */}
              {summaryStats && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground border-b border-border/30 pb-2">
                  {summaryStats.approvedCount > 0 && (
                    <span>
                      <span className="text-green-400 font-medium tabular-nums">
                        {formatSeconds(summaryStats.totalApprovedDuration)}
                      </span>{' '}
                      of approved content
                    </span>
                  )}
                  <span>
                    Avg duration:{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {formatSeconds(summaryStats.avgDuration)}
                    </span>
                  </span>
                  <span>
                    Score range:{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {summaryStats.minScore} – {summaryStats.maxScore}
                    </span>
                  </span>
                </div>
              )}

              {/* Charts — side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Duration Distribution */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Duration
                  </p>
                  {durationData.map((b) => (
                    <MiniBar
                      key={b.label}
                      label={b.label}
                      total={b.total}
                      approved={b.approved}
                      rejected={b.rejected}
                      pending={b.pending}
                      maxCount={maxDurationCount}
                      barColor={b.color}
                      bgColor={b.bgColor}
                      tooltip={`${b.total} clip${b.total !== 1 ? 's' : ''} (${b.label})`}
                    />
                  ))}
                </div>

                {/* Score Distribution */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Score
                  </p>
                  {scoreData.map((b) => (
                    <MiniBar
                      key={b.label}
                      label={b.label}
                      total={b.total}
                      approved={b.approved}
                      rejected={b.rejected}
                      pending={b.pending}
                      maxCount={maxScoreCount}
                      barColor={b.color}
                      bgColor={b.bgColor}
                      tooltip={`${b.total} clip${b.total !== 1 ? 's' : ''} (score ${b.label})`}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-green-500/80 inline-block" />
                  Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-red-500/70 inline-block" />
                  Rejected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-muted-foreground/40 inline-block" />
                  Pending
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
