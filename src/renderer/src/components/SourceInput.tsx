import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileVideo, Youtube, Upload, X, Loader2, AlertCircle, CheckCircle2, Scissors, Circle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../store'
import { SourceVideo, ClipCandidate } from '../store'
import { ConfirmDialog } from './ConfirmDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScriptCueSplitter } from './ScriptCueSplitter'

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') &&
      (u.pathname === '/watch' || u.pathname.startsWith('/shorts/'))
    ) {
      return true
    }
    if (u.hostname === 'youtu.be' && u.pathname.length > 1) {
      return true
    }
    return false
  } catch {
    return false
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SourceInput() {
  const sources = useStore((s) => s.sources)
  const activeSourceId = useStore((s) => s.activeSourceId)
  const addSource = useStore((s) => s.addSource)
  const removeSource = useStore((s) => s.removeSource)
  const setActiveSource = useStore((s) => s.setActiveSource)
  const setClips = useStore((s) => s.setClips)
  const setPipeline = useStore((s) => s.setPipeline)
  const queueMode = useStore((s) => s.queueMode)
  const queueResults = useStore((s) => s.queueResults)
  const processingQueue = useStore((s) => s.processingQueue)
  const isOnline = useStore((s) => s.isOnline)

  // Drop zone state
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [youtubeError, setYoutubeError] = useState<string | null>(null)

  // Scripts tab state
  const [scriptSplitterOpen, setScriptSplitterOpen] = useState(false)

  // Source removal confirmation
  const [removeConfirm, setRemoveConfirm] = useState<{ sourceId: string; sourceName: string } | null>(null)
  const clips = useStore((s) => s.clips)

  const handleRemoveSource = useCallback((sourceId: string, sourceName: string) => {
    const sourceClips = clips[sourceId] ?? []
    if (sourceClips.length > 0) {
      setRemoveConfirm({ sourceId, sourceName })
    } else {
      removeSource(sourceId)
    }
  }, [clips, removeSource])

  const handlePushToGrid = useCallback(
    (source: SourceVideo, clips: ClipCandidate[]) => {
      addSource(source)
      setActiveSource(source.id)
      setClips(source.id, clips)
      setPipeline({
        stage: 'ready',
        message: `${clips.length} script clip${clips.length === 1 ? '' : 's'} ready`,
        percent: 100
      })
    },
    [addSource, setActiveSource, setClips, setPipeline]
  )

  const processFilePath = useCallback(async (path: string) => {
    const name = path.split(/[/\\]/).pop() || path
    const [meta, thumbnail] = await Promise.all([
      window.api.getMetadata(path),
      window.api.getThumbnail(path).catch(() => undefined)
    ])
    return {
      id: uuidv4(),
      path,
      name,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      thumbnail,
      origin: 'file' as const
    }
  }, [])

  // File drop handler
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      setFileError(null)

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        VIDEO_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext))
      )

      if (files.length === 0) {
        setFileError('No supported video files found. Accepts: mp4, mov, avi, mkv, webm')
        return
      }

      setIsProcessingFile(true)
      try {
        for (const file of files) {
          const path = window.api.getPathForFile(file)
          const source = await processFilePath(path)
          addSource(source)
          setActiveSource(source.id)
        }
      } catch (err) {
        setFileError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsProcessingFile(false)
      }
    },
    [processFilePath, addSource, setActiveSource]
  )

  // File browse handler
  const handleBrowse = useCallback(async () => {
    setFileError(null)
    const paths = await window.api.openFiles()
    if (!paths || paths.length === 0) return

    setIsProcessingFile(true)
    try {
      for (const path of paths) {
        const source = await processFilePath(path)
        addSource(source)
        setActiveSource(source.id)
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      setIsProcessingFile(false)
    }
  }, [processFilePath, addSource, setActiveSource])

  // YouTube download handler
  const handleYouTubeDownload = useCallback(async () => {
    setYoutubeError(null)
    const url = youtubeUrl.trim()

    if (!isValidYouTubeUrl(url)) {
      setYoutubeError('Please enter a valid YouTube URL (youtube.com/watch, youtu.be, or /shorts/)')
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)

    const cleanup = window.api.onYouTubeProgress((data) => {
      setDownloadProgress(data.percent)
    })

    try {
      const result = await window.api.downloadYouTube(url)
      cleanup()

      const [meta, thumbnail] = await Promise.all([
        window.api.getMetadata(result.path),
        window.api.getThumbnail(result.path).catch(() => undefined)
      ])

      const source = {
        id: uuidv4(),
        path: result.path,
        name: result.title || result.path.split(/[/\\]/).pop() || 'YouTube video',
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        thumbnail,
        origin: 'youtube' as const,
        youtubeUrl: url
      }

      addSource(source)
      setActiveSource(source.id)
      setYoutubeUrl('')
    } catch (err) {
      cleanup()
      setYoutubeError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }, [youtubeUrl, addSource, setActiveSource])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Script Cue Splitter dialog */}
      <ScriptCueSplitter
        open={scriptSplitterOpen}
        onClose={() => setScriptSplitterOpen(false)}
        onPushToGrid={handlePushToGrid}
      />

      {/* Input area */}
      <Tabs defaultValue="file" className="flex-shrink-0">
        <TabsList className="w-full">
          <TabsTrigger value="file" className="flex-1 gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Local File
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex-1 gap-1.5">
            <Youtube className="w-3.5 h-3.5" />
            YouTube
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex-1 gap-1.5">
            <Scissors className="w-3.5 h-3.5" />
            Scripts
          </TabsTrigger>
        </TabsList>

        {/* Local File Tab */}
        <TabsContent value="file" className="mt-2">
          <div
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
              isDragOver
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-accent/30',
              isProcessingFile && 'pointer-events-none opacity-60'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragOver(false)
            }}
            onDrop={handleDrop}
            onClick={handleBrowse}
          >
            {isProcessingFile ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading video…</p>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'rounded-full p-3 transition-colors',
                    isDragOver ? 'bg-primary/10' : 'bg-secondary'
                  )}
                >
                  <FileVideo
                    className={cn('w-6 h-6', isDragOver ? 'text-primary' : 'text-muted-foreground')}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragOver ? 'Drop to add video' : 'Drop video here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    or click to browse — mp4, mov, avi, mkv, webm
                  </p>
                </div>
              </>
            )}
          </div>

          <AnimatePresence>
            {fileError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 mt-2 text-xs text-destructive"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="mt-2">
          <div className="flex flex-col gap-2">
            {!isOnline && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Internet connection required to download YouTube videos.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value)
                  setYoutubeError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isDownloading && isOnline) {
                    handleYouTubeDownload()
                  }
                }}
                disabled={isDownloading || !isOnline}
                className="flex-1 text-xs h-9"
              />
              <Button
                size="sm"
                onClick={handleYouTubeDownload}
                disabled={isDownloading || !youtubeUrl.trim() || !isOnline}
                className="h-9 shrink-0"
                title={!isOnline ? 'Internet connection required' : undefined}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Youtube className="w-3.5 h-3.5" />
                )}
                {isDownloading ? 'Downloading…' : 'Download'}
              </Button>
            </div>

            <AnimatePresence>
              {isDownloading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Downloading… {downloadProgress > 0 ? `${Math.round(downloadProgress)}%` : ''}</span>
                  </div>
                  <Progress value={downloadProgress} className="h-1.5" />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {youtubeError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 text-xs text-destructive"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{youtubeError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="mt-2">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
            <div className="rounded-full p-3 bg-secondary">
              <Scissors className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Script Cue Splitter</p>
              <p className="text-xs text-muted-foreground mt-1">
                Film one take saying "script one… script two…" and we'll auto-detect the cues and split into clips.
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setScriptSplitterOpen(true)}>
              <Scissors className="w-3.5 h-3.5" />
              Open Splitter
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Source list */}
      {(sources.length > 0 || isProcessingFile || isDownloading) && (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Sources ({sources.length}{(isProcessingFile || isDownloading) ? '+' : ''})
            </span>
          </div>
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="flex flex-col gap-1.5 pr-1">
              <AnimatePresence mode="popLayout">
                {sources.map((source) => {
                  const queueResult = queueResults[source.id]
                  const queuePos = processingQueue.indexOf(source.id)
                  const isQueued = queuePos !== -1
                  const isProcessingInQueue = queueResult?.status === 'processing'
                  const isDone = queueResult?.status === 'done'
                  const isError = queueResult?.status === 'error'

                  return (
                    <motion.div
                      key={source.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <TooltipProvider>
                        {/* Relative wrapper so the layoutId indicator can be absolutely positioned */}
                        <div className="relative">
                          {/* Sliding active indicator — animates between sources via layoutId */}
                          {activeSourceId === source.id && (
                            <motion.div
                              layoutId="active-source-highlight"
                              className="absolute inset-0 rounded-md border border-primary bg-primary/5 ring-1 ring-primary/30 pointer-events-none"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                        <div
                          className={cn(
                            'group flex items-center gap-2.5 rounded-md border p-2 cursor-pointer transition-colors',
                            activeSourceId === source.id
                              ? 'border-transparent bg-transparent'
                              : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30'
                          )}
                          onClick={() => setActiveSource(source.id)}
                        >
                          {/* Thumbnail */}
                          <div className="w-14 h-8 rounded shrink-0 overflow-hidden bg-secondary flex items-center justify-center">
                            {source.thumbnail ? (
                              <img
                                src={source.thumbnail}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ) : (
                              <FileVideo className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate leading-tight">{source.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {source.duration > 0 ? formatDuration(source.duration) : '--:--'}
                              </span>
                              <Badge
                                variant={source.origin === 'youtube' ? 'default' : 'secondary'}
                                className="text-[9px] px-1 py-0 h-3.5 leading-none"
                              >
                                {source.origin === 'youtube' ? 'YT' : 'File'}
                              </Badge>
                              {/* Queue / processing status badge */}
                              {queueMode && (
                                <>
                                  {isProcessingInQueue && (
                                    <Badge className="text-[9px] px-1 py-0 h-3.5 leading-none gap-0.5 bg-primary/20 text-primary border-primary/30">
                                      <Loader2 className="w-2 h-2 animate-spin" />
                                      Processing
                                    </Badge>
                                  )}
                                  {isDone && (
                                    <Badge className="text-[9px] px-1 py-0 h-3.5 leading-none gap-0.5 bg-green-500/15 text-green-500 border-green-500/30">
                                      <CheckCircle2 className="w-2 h-2" />
                                      Done
                                    </Badge>
                                  )}
                                  {isError && queueResult.error !== 'Skipped' && (
                                    <Badge className="text-[9px] px-1 py-0 h-3.5 leading-none gap-0.5 bg-destructive/15 text-destructive border-destructive/30">
                                      <AlertCircle className="w-2 h-2" />
                                      Error
                                    </Badge>
                                  )}
                                  {isError && queueResult.error === 'Skipped' && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 leading-none text-muted-foreground">
                                      Skipped
                                    </Badge>
                                  )}
                                  {isQueued && !isProcessingInQueue && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 leading-none gap-0.5 text-muted-foreground">
                                      <Circle className="w-1.5 h-1.5 fill-current" />
                                      #{queuePos + 1}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Remove button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveSource(source.id, source.name)
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Remove source</TooltipContent>
                          </Tooltip>
                        </div>
                        </div>{/* closes relative wrapper */}
                      </TooltipProvider>
                    </motion.div>
                  )
                })}
                {/* Skeleton card while a file/YouTube source is loading */}
                <AnimatePresence>
                  {(isProcessingFile || isDownloading) && (
                    <motion.div
                      key="source-skeleton"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2">
                        {/* Thumbnail skeleton */}
                        <Skeleton className="w-14 h-8 rounded shrink-0" />
                        {/* Info skeleton */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Source removal confirmation dialog */}
      <ConfirmDialog
        open={removeConfirm !== null}
        title="Remove Source"
        description={removeConfirm ? `Remove "${removeConfirm.sourceName}"? This will also remove all its clips.` : ''}
        confirmText="Remove"
        onConfirm={() => {
          if (removeConfirm) { removeSource(removeConfirm.sourceId) }
          setRemoveConfirm(null)
        }}
        onCancel={() => setRemoveConfirm(null)}
      />
    </div>
  )
}
