import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Link,
  Unlink
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn, getScoreDescription } from '@/lib/utils'
import { useStore } from '../store'
import type { ClipCandidate } from '../store'
import { formatTime } from './EditableTime'

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

function scoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-500/20 text-green-400 border-green-500/40'
  if (score >= 80) return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
  if (score >= 70) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
  return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
}

function scoreBgClass(score: number): string {
  if (score >= 90) return 'border-green-500/30 bg-green-500/5'
  if (score >= 80) return 'border-blue-500/30 bg-blue-500/5'
  if (score >= 70) return 'border-yellow-500/30 bg-yellow-500/5'
  return 'border-orange-500/30 bg-orange-500/5'
}

// ---------------------------------------------------------------------------
// ClipSide — one side of the comparison
// ---------------------------------------------------------------------------

interface ClipSideProps {
  clip: ClipCandidate
  sourcePath: string
  label: 'Left' | 'Right'
  isBetter: boolean
  syncedPlaying: boolean
  onSyncPlay: (playing: boolean) => void
  syncEnabled: boolean
  externalVideoRef: React.RefObject<HTMLVideoElement | null>
}

function ClipSide({
  clip,
  sourcePath,
  label,
  isBetter,
  syncedPlaying,
  onSyncPlay,
  syncEnabled,
  externalVideoRef
}: ClipSideProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Expose ref to parent for sync
  useEffect(() => {
    if (externalVideoRef) {
      (externalVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoRef.current
    }
  }, [externalVideoRef])

  // React to sync play/pause from parent
  useEffect(() => {
    if (!syncEnabled) return
    const vid = videoRef.current
    if (!vid) return
    if (syncedPlaying && vid.paused) {
      vid.play().catch(() => {})
      setIsPlaying(true)
    } else if (!syncedPlaying && !vid.paused) {
      vid.pause()
      setIsPlaying(false)
    }
  }, [syncedPlaying, syncEnabled])

  const handlePlayPause = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (isPlaying) {
      vid.pause()
      setIsPlaying(false)
      if (syncEnabled) onSyncPlay(false)
    } else {
      if (vid.currentTime >= clip.endTime) vid.currentTime = clip.startTime
      vid.play().catch(() => {})
      setIsPlaying(true)
      if (syncEnabled) onSyncPlay(true)
    }
  }, [isPlaying, clip.startTime, clip.endTime, syncEnabled, onSyncPlay])

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.currentTime >= clip.endTime) {
      vid.pause()
      setIsPlaying(false)
      if (syncEnabled) onSyncPlay(false)
    }
  }, [clip.endTime, syncEnabled, onSyncPlay])

  const handleRestart = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = clip.startTime
    vid.play().catch(() => {})
    setIsPlaying(true)
    if (syncEnabled) onSyncPlay(true)
  }, [clip.startTime, syncEnabled, onSyncPlay])

  const videoSrc = `file://${sourcePath}`
  const { label: scoreLabel } = getScoreDescription(clip.score)

  return (
    <div className={cn(
      'flex flex-col rounded-lg border overflow-hidden',
      isBetter ? scoreBgClass(clip.score) : 'border-border bg-card/50'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          label === 'Left' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
        )}>
          {label}
        </span>
        {isBetter && (
          <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
            Higher Score
          </Badge>
        )}
        <div className="ml-auto">
          <span className={cn(
            'inline-flex items-center justify-center w-10 h-10 rounded-full border-2 text-base font-bold tabular-nums',
            scoreBadgeClass(clip.score)
          )}>
            {clip.score}
          </span>
        </div>
      </div>

      {/* Video */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { setIsPlaying(false); if (syncEnabled) onSyncPlay(false) }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          onClick={handlePlayPause}
        >
          {!isPlaying && (
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRestart}
          title="Restart from start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 p-3 space-y-2.5">
        {/* Score label + duration */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full border',
            scoreBadgeClass(clip.score)
          )}>
            {scoreLabel}
          </span>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(clip.duration)}
          </Badge>
          {clip.loopScore != null && clip.loopOptimized && (
            <Badge
              variant="outline"
              className="text-xs flex items-center gap-1 border-purple-500/40 text-purple-400 bg-purple-500/10"
              title={`Loop score: ${clip.loopScore} (${clip.loopStrategy})`}
            >
              <RefreshCw className="w-3 h-3" />
              Loop {clip.loopScore}
            </Badge>
          )}
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded border',
            clip.status === 'approved' ? 'border-green-500/40 text-green-400 bg-green-500/10'
              : clip.status === 'rejected' ? 'border-red-500/40 text-red-400 bg-red-500/10'
              : 'border-border text-muted-foreground'
          )}>
            {clip.status}
          </span>
        </div>

        {/* Hook text */}
        {clip.hookText && (
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">Hook</p>
            <p className="text-sm font-semibold leading-snug">{clip.hookText}</p>
          </div>
        )}

        {/* Transcript */}
        {clip.text && (
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">Transcript</p>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{clip.text}</p>
          </div>
        )}

        {/* Reasoning collapsible */}
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
              <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed italic">
                {clip.reasoning}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ComparisonSummary — middle column
// ---------------------------------------------------------------------------

interface ComparisonSummaryProps {
  clipA: ClipCandidate
  clipB: ClipCandidate
}

function ComparisonSummary({ clipA, clipB }: ComparisonSummaryProps) {
  const scoreDiff = clipA.score - clipB.score
  const durationDiff = clipA.duration - clipB.duration

  const loopWinner = (() => {
    if (clipA.loopScore == null && clipB.loopScore == null) return null
    if (clipA.loopScore == null) return 'B'
    if (clipB.loopScore == null) return 'A'
    if (clipA.loopScore > clipB.loopScore) return 'A'
    if (clipB.loopScore > clipA.loopScore) return 'B'
    return 'tie'
  })()

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-2 py-4 min-w-[80px]">
      {/* VS Badge */}
      <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>

      <Separator className="w-px h-4 rotate-90" />

      {/* Score diff */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide text-center">Score</span>
        {scoreDiff === 0 ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Minus className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Tie</span>
          </div>
        ) : (
          <div className={cn(
            'flex items-center gap-0.5 font-semibold text-sm',
            scoreDiff > 0 ? 'text-green-400' : 'text-purple-400'
          )}>
            {scoreDiff > 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {Math.abs(scoreDiff)}
          </div>
        )}
        <span className={cn(
          'text-[10px]',
          scoreDiff > 0 ? 'text-blue-400' : scoreDiff < 0 ? 'text-purple-400' : 'text-muted-foreground'
        )}>
          {scoreDiff > 0 ? '← Left' : scoreDiff < 0 ? 'Right →' : ''}
        </span>
      </div>

      <Separator className="w-px h-4 rotate-90" />

      {/* Duration diff */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide text-center">Dur.</span>
        {Math.abs(durationDiff) < 0.5 ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Minus className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">~</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            {durationDiff > 0 ? '+' : ''}{Math.round(durationDiff)}s
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60">L vs R</span>
      </div>

      {/* Loop score comparison */}
      {loopWinner !== null && (
        <>
          <Separator className="w-px h-4 rotate-90" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide text-center">Loop</span>
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span className={cn(
              'text-[10px] font-semibold',
              loopWinner === 'A' ? 'text-blue-400' : loopWinner === 'B' ? 'text-purple-400' : 'text-muted-foreground'
            )}>
              {loopWinner === 'A' ? '← Left' : loopWinner === 'B' ? 'Right →' : 'Tie'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClipComparison dialog
// ---------------------------------------------------------------------------

interface ClipComparisonProps {
  open: boolean
  onClose: () => void
  clipA: ClipCandidate
  clipB: ClipCandidate
  sourceId: string
  sourcePath: string
}

export function ClipComparison({
  open,
  onClose,
  clipA,
  clipB,
  sourceId,
  sourcePath
}: ClipComparisonProps) {
  const updateClipStatus = useStore((s) => s.updateClipStatus)

  const [syncEnabled, setSyncEnabled] = useState(false)
  const [syncedPlaying, setSyncedPlaying] = useState(false)

  const videoRefA = useRef<HTMLVideoElement | null>(null)
  const videoRefB = useRef<HTMLVideoElement | null>(null)

  // When sync is enabled, pause both on dialog open
  useEffect(() => {
    if (!open) {
      setSyncedPlaying(false)
      setSyncEnabled(false)
    }
  }, [open])

  const handleSyncPlay = useCallback((playing: boolean) => {
    setSyncedPlaying(playing)
  }, [])

  // Sync: seek both videos to their respective start times when sync is toggled on
  useEffect(() => {
    if (syncEnabled) {
      const va = videoRefA.current
      const vb = videoRefB.current
      if (va) va.currentTime = clipA.startTime
      if (vb) vb.currentTime = clipB.startTime
      setSyncedPlaying(false)
    }
  }, [syncEnabled, clipA.startTime, clipB.startTime])

  const higherScore = clipA.score >= clipB.score ? 'A' : 'B'

  const handleKeepLeft = useCallback(() => {
    updateClipStatus(sourceId, clipA.id, 'approved')
    updateClipStatus(sourceId, clipB.id, 'rejected')
    onClose()
  }, [sourceId, clipA.id, clipB.id, updateClipStatus, onClose])

  const handleKeepRight = useCallback(() => {
    updateClipStatus(sourceId, clipB.id, 'approved')
    updateClipStatus(sourceId, clipA.id, 'rejected')
    onClose()
  }, [sourceId, clipA.id, clipB.id, updateClipStatus, onClose])

  const handleKeepBoth = useCallback(() => {
    updateClipStatus(sourceId, clipA.id, 'approved')
    updateClipStatus(sourceId, clipB.id, 'approved')
    onClose()
  }, [sourceId, clipA.id, clipB.id, updateClipStatus, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle className="text-base font-semibold">Compare Clips</DialogTitle>
            {/* Sync toggle */}
            <button
              onClick={() => setSyncEnabled((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
                syncEnabled
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
              )}
              title={syncEnabled ? 'Disable sync playback' : 'Enable sync playback'}
            >
              {syncEnabled ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              Sync Playback
            </button>
          </div>
        </DialogHeader>

        {/* Comparison body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 items-start">
            {/* Left clip */}
            <div className="flex-1 min-w-0">
              <ClipSide
                clip={clipA}
                sourcePath={sourcePath}
                label="Left"
                isBetter={higherScore === 'A'}
                syncedPlaying={syncedPlaying}
                onSyncPlay={handleSyncPlay}
                syncEnabled={syncEnabled}
                externalVideoRef={videoRefA}
              />
            </div>

            {/* Middle summary */}
            <ComparisonSummary clipA={clipA} clipB={clipB} />

            {/* Right clip */}
            <div className="flex-1 min-w-0">
              <ClipSide
                clip={clipB}
                sourcePath={sourcePath}
                label="Right"
                isBetter={higherScore === 'B'}
                syncedPlaying={syncedPlaying}
                onSyncPlay={handleSyncPlay}
                syncEnabled={syncEnabled}
                externalVideoRef={videoRefB}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-t border-border bg-card/50">
          <span className="text-xs text-muted-foreground mr-1">Decision:</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
            onClick={handleKeepLeft}
          >
            <Check className="w-3.5 h-3.5" />
            Keep Left
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
            onClick={handleKeepRight}
          >
            <Check className="w-3.5 h-3.5" />
            Keep Right
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
            onClick={handleKeepBoth}
          >
            <Check className="w-3.5 h-3.5" />
            Keep Both
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
