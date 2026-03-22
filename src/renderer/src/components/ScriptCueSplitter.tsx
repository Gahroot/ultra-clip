import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileVideo,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Scissors,
  Trash2,
  Play,
  FolderOpen,
  PlusCircle,
  X
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { detectScriptCues, ScriptCue, WordTimestamp } from '@/lib/script-cue-detection'
import { SourceVideo, ClipCandidate } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'upload' | 'transcribing' | 'review' | 'splitting' | 'done'

interface EditableCue extends ScriptCue {
  editingLabel: boolean
}

interface SplitDoneResult {
  label: string
  outputPath: string
}

interface Props {
  open: boolean
  onClose: () => void
  onPushToGrid: (source: SourceVideo, clips: ClipCandidate[]) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`
}

const SEGMENT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-lime-500'
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScriptCueSplitter({ open, onClose, onPushToGrid }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [isDragOver, setIsDragOver] = useState(false)
  const [transcribeMessage, setTranscribeMessage] = useState('')
  const [transcribePercent, setTranscribePercent] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Video state
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)

  // Transcript + cues
  const [words, setWords] = useState<WordTimestamp[]>([])
  const [cues, setCues] = useState<EditableCue[]>([])

  // Manual cue addition
  const [addingCue, setAddingCue] = useState(false)
  const [newCueLabel, setNewCueLabel] = useState('')
  const [newCueStart, setNewCueStart] = useState('')
  const [newCueEnd, setNewCueEnd] = useState('')

  // Video preview
  const videoRef = useRef<HTMLVideoElement>(null)

  // Splitting / done
  const [splitProgress, setSplitProgress] = useState(0)
  const [doneResults, setDoneResults] = useState<SplitDoneResult[]>([])
  const [pushedCount, setPushedCount] = useState<number | null>(null)

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('upload')
      setVideoPath(null)
      setVideoName('')
      setVideoDuration(0)
      setWords([])
      setCues([])
      setError(null)
      setTranscribeMessage('')
      setTranscribePercent(0)
      setSplitProgress(0)
      setDoneResults([])
      setPushedCount(null)
      setAddingCue(false)
    }
  }, [open])

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const processFile = useCallback(async (path: string, name: string) => {
    setError(null)
    try {
      const meta = await window.api.getMetadata(path)
      setVideoPath(path)
      setVideoName(name)
      setVideoDuration(meta.duration)
      setStep('transcribing')
      await runTranscription(path, meta.duration)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video')
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        VIDEO_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext))
      )
      if (files.length === 0) {
        setError('No supported video file. Accepts: mp4, mov, avi, mkv, webm')
        return
      }
      const file = files[0]
      const path = window.api.getPathForFile(file)
      await processFile(path, file.name)
    },
    [processFile]
  )

  const handleBrowse = useCallback(async () => {
    setError(null)
    const paths = await window.api.openFiles()
    if (!paths || paths.length === 0) return
    const path = paths[0]
    const name = path.split(/[/\\]/).pop() || path
    await processFile(path, name)
  }, [processFile])

  // ---------------------------------------------------------------------------
  // Transcription
  // ---------------------------------------------------------------------------

  const runTranscription = useCallback(async (path: string, duration: number) => {
    setTranscribeMessage('Starting transcription…')
    setTranscribePercent(5)

    const cleanup = window.api.onTranscribeProgress((data) => {
      setTranscribeMessage(data.message)
      if (data.stage === 'extracting-audio') setTranscribePercent(15)
      else if (data.stage === 'loading-model') setTranscribePercent(40)
      else if (data.stage === 'transcribing') setTranscribePercent(75)
    })

    try {
      const result = await window.api.transcribeVideo(path)
      cleanup()
      setTranscribePercent(100)

      const detected = detectScriptCues(result.words, duration)
      setCues(detected.map((c) => ({ ...c, editingLabel: false })))
      setWords(result.words)
      setStep('review')
    } catch (err) {
      cleanup()
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setStep('upload')
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Cue editing
  // ---------------------------------------------------------------------------

  const updateCueLabel = useCallback((id: string, label: string) => {
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }, [])

  const removeCue = useCallback((id: string) => {
    setCues((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const parseTimeInput = (val: string): number => {
    // Accept m:ss.d or raw seconds
    const parts = val.trim().split(':')
    if (parts.length === 2) {
      const m = parseFloat(parts[0]) || 0
      const s = parseFloat(parts[1]) || 0
      return m * 60 + s
    }
    return parseFloat(val) || 0
  }

  const addManualCue = useCallback(() => {
    if (!newCueLabel.trim()) return
    const start = parseTimeInput(newCueStart)
    const end = parseTimeInput(newCueEnd)
    if (end <= start) {
      setError('End time must be after start time')
      return
    }
    const newCue: EditableCue = {
      id: `manual-${uuidv4()}`,
      label: newCueLabel.trim(),
      scriptNumber: 0,
      startTime: start,
      endTime: end,
      cueWordIndices: [],
      editingLabel: false
    }
    setCues((prev) => [...prev, newCue].sort((a, b) => a.startTime - b.startTime))
    setNewCueLabel('')
    setNewCueStart('')
    setNewCueEnd('')
    setAddingCue(false)
    setError(null)
  }, [newCueLabel, newCueStart, newCueEnd])

  // Seek video preview
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play().catch(() => {})
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Actions: Push to Grid / Save to Disk
  // ---------------------------------------------------------------------------

  const handlePushToGrid = useCallback(async () => {
    if (!videoPath || cues.length === 0) return

    const [meta, thumbnail] = await Promise.all([
      window.api.getMetadata(videoPath),
      window.api.getThumbnail(videoPath).catch(() => undefined)
    ])

    const source: SourceVideo = {
      id: uuidv4(),
      path: videoPath,
      name: videoName,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      thumbnail,
      origin: 'file'
    }

    const clips: ClipCandidate[] = cues.map((cue) => ({
      id: uuidv4(),
      sourceId: source.id,
      startTime: cue.startTime,
      endTime: cue.endTime,
      duration: cue.endTime - cue.startTime,
      text: cue.label,
      score: 80,
      hookText: cue.label,
      reasoning: 'Manually cued via spoken script marker',
      status: 'pending' as const,
      wordTimestamps: words.filter((w) => w.start >= cue.startTime && w.end <= cue.endTime)
    }))

    onPushToGrid(source, clips)
    setPushedCount(clips.length)
    setStep('done')
  }, [videoPath, videoName, cues, words, onPushToGrid])

  const handleSaveToDisk = useCallback(async () => {
    if (!videoPath || cues.length === 0) return

    const outputDir = await window.api.openDirectory()
    if (!outputDir) return

    setStep('splitting')
    setSplitProgress(0)
    setError(null)

    const segments = cues.map((c) => ({
      label: c.label,
      startTime: c.startTime,
      endTime: c.endTime
    }))

    try {
      const results = await window.api.splitSegments(videoPath, segments, outputDir)
      setDoneResults(results)
      setSplitProgress(100)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed')
      setStep('review')
    }
  }, [videoPath, cues])

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderUpload() {
    return (
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary/50 hover:bg-accent/30'
          )}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }}
          onDrop={handleDrop}
          onClick={handleBrowse}
        >
          <div className={cn('rounded-full p-4 transition-colors', isDragOver ? 'bg-primary/10' : 'bg-secondary')}>
            <FileVideo className={cn('w-8 h-8', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-sm font-semibold">{isDragOver ? 'Drop to analyse' : 'Drop your recording here'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Film yourself saying "script one… script two…" then drop the file
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">mp4, mov, avi, mkv, webm · click to browse</p>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-destructive"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  function renderTranscribing() {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="rounded-full p-4 bg-primary/10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Transcribing…</p>
          <p className="text-xs text-muted-foreground mt-1">{transcribeMessage || 'Please wait'}</p>
        </div>
        <div className="w-full max-w-xs">
          <Progress value={transcribePercent} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-right mt-1">{Math.round(transcribePercent)}%</p>
        </div>
      </div>
    )
  }

  function renderReview() {
    return (
      <div className="flex flex-col gap-4">
        {/* Video preview */}
        {videoPath && (
          <div className="rounded-lg overflow-hidden bg-black aspect-video max-h-48">
            <video
              ref={videoRef}
              src={`file://${videoPath}`}
              className="w-full h-full object-contain"
              controls
              preload="metadata"
            />
          </div>
        )}

        {/* Timeline bar */}
        {cues.length > 0 && videoDuration > 0 && (
          <div className="relative h-6 rounded-md overflow-hidden bg-secondary">
            {cues.map((cue, idx) => {
              const left = (cue.startTime / videoDuration) * 100
              const width = ((cue.endTime - cue.startTime) / videoDuration) * 100
              return (
                <div
                  key={cue.id}
                  className={cn(
                    'absolute top-0 h-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80',
                    SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={cue.label}
                  onClick={() => seekTo(cue.startTime)}
                >
                  <span className="text-[9px] font-bold text-white truncate px-1">{cue.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Cue list */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            {cues.length === 0 ? 'No cues detected' : `${cues.length} clip${cues.length === 1 ? '' : 's'} detected`}
          </span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setAddingCue(true)}>
            <PlusCircle className="w-3.5 h-3.5" />
            Add manually
          </Button>
        </div>

        {/* Manual add form */}
        <AnimatePresence>
          {addingCue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-dashed border-primary/50 p-3 flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Add clip manually</p>
                <Input
                  placeholder="Label (e.g. Script 5)"
                  value={newCueLabel}
                  onChange={(e) => setNewCueLabel(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Start (m:ss)"
                    value={newCueStart}
                    onChange={(e) => setNewCueStart(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    placeholder="End (m:ss)"
                    value={newCueEnd}
                    onChange={(e) => setNewCueEnd(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingCue(false); setError(null) }}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={addManualCue}>
                    Add clip
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cue list items */}
        <ScrollArea className="max-h-56">
          <div className="flex flex-col gap-1.5 pr-1">
            <AnimatePresence mode="popLayout">
              {cues.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 py-6 text-center"
                >
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    No "script N" cues detected in transcript.
                    <br />
                    Add clips manually above.
                  </p>
                </motion.div>
              ) : (
                cues.map((cue, idx) => (
                  <motion.div
                    key={cue.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 rounded-md border border-border bg-card p-2"
                  >
                    {/* Color dot */}
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', SEGMENT_COLORS[idx % SEGMENT_COLORS.length])} />

                    {/* Label */}
                    <Input
                      value={cue.label}
                      onChange={(e) => updateCueLabel(cue.id, e.target.value)}
                      className="h-7 text-xs flex-1 min-w-0"
                    />

                    {/* Timestamps */}
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">
                      {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
                    </span>

                    {/* Duration */}
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {(cue.endTime - cue.startTime).toFixed(1)}s
                    </span>

                    {/* Play */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      title="Seek to clip"
                      onClick={() => seekTo(cue.startTime)}
                    >
                      <Play className="w-3 h-3" />
                    </Button>

                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                      title="Remove clip"
                      onClick={() => removeCue(cue.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={cues.length === 0}
            onClick={handleSaveToDisk}
          >
            <FolderOpen className="w-4 h-4" />
            Save to Disk
          </Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={cues.length === 0}
            onClick={handlePushToGrid}
          >
            <Scissors className="w-4 h-4" />
            Push to Grid
          </Button>
        </div>

        {!addingCue && error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
      </div>
    )
  }

  function renderSplitting() {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="rounded-full p-4 bg-primary/10">
          <Scissors className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Splitting clips…</p>
          <p className="text-xs text-muted-foreground mt-1">Stream-copying segments with FFmpeg</p>
        </div>
        <div className="w-full max-w-xs">
          <Progress value={splitProgress} className="h-2" />
        </div>
      </div>
    )
  }

  function renderDone() {
    if (pushedCount !== null) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-full p-4 bg-emerald-500/10">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {pushedCount} clip{pushedCount === 1 ? '' : 's'} pushed to grid
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Review and approve them in the Clip Grid
            </p>
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full p-2 bg-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold">
            {doneResults.length} clip{doneResults.length === 1 ? '' : 's'} saved
          </p>
        </div>
        <ScrollArea className="max-h-64">
          <div className="flex flex-col gap-1 pr-1">
            {doneResults.map((r) => (
              <div key={r.outputPath} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.outputPath}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button onClick={onClose} className="mt-2">Close</Button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const titles: Record<Step, string> = {
    upload: 'Script Cue Splitter',
    transcribing: 'Transcribing Video',
    review: 'Review Detected Clips',
    splitting: 'Splitting Clips',
    done: 'Done'
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            {titles[step]}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {step === 'upload' && renderUpload()}
            {step === 'transcribing' && renderTranscribing()}
            {step === 'review' && renderReview()}
            {step === 'splitting' && renderSplitting()}
            {step === 'done' && renderDone()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
