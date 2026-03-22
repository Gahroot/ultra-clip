import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Copy, Trash2, Terminal, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore, type ErrorLogEntry } from '../store'
import { ConfirmDialog } from './ConfirmDialog'

// ---------------------------------------------------------------------------
// Source label mapping
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  pipeline: 'PIPE',
  transcription: 'ASR',
  scoring: 'AI',
  ffmpeg: 'FF',
  youtube: 'YT',
  'face-detection': 'FACE',
  render: 'REN'
}

const SOURCE_COLORS: Record<string, string> = {
  pipeline: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  transcription: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  scoring: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ffmpeg: 'bg-green-500/20 text-green-400 border-green-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  'face-detection': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  render: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
}

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source.slice(0, 4).toUpperCase()
}

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? 'bg-muted text-muted-foreground border-border'
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour12: false })
}

function formatEntry(entry: ErrorLogEntry): string {
  return `[${formatTime(entry.timestamp)}] [${entry.source}] ${entry.message}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ErrorLog() {
  const errorLog = useStore((s) => s.errorLog)
  const clearErrors = useStore((s) => s.clearErrors)
  const [expanded, setExpanded] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // Auto-expand when first error arrives
  useEffect(() => {
    if (errorLog.length > 0) {
      setExpanded(true)
    }
  }, [errorLog.length])

  // Auto-scroll to newest error
  useEffect(() => {
    if (expanded && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [errorLog.length, expanded])

  if (errorLog.length === 0) return null

  const copyAll = () => {
    const text = errorLog.map(formatEntry).join('\n')
    navigator.clipboard.writeText(text)
  }

  const copyOne = (entry: ErrorLogEntry) => {
    navigator.clipboard.writeText(formatEntry(entry))
  }

  const exportFullLog = async () => {
    const errors = errorLog.map((e) => ({
      timestamp: e.timestamp,
      source: e.source,
      message: e.message,
      details: e.details
    }))
    try {
      const result = await window.api.exportLogs(errors)
      if (result) {
        window.api.showItemInFolder(result.exportPath)
      }
    } catch {
      // Ignore export errors
    }
  }

  return (
    <div className="border-t border-border bg-card shrink-0">
      {/* Header bar — use div+role to avoid nested <button> HTML violation */}
      <div
        role="button"
        tabIndex={0}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded) }}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="font-medium text-destructive">Errors</span>
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
          {errorLog.length}
        </Badge>
        <div className="flex-1" />
        {expanded && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Export full debug log"
              onClick={exportFullLog}
            >
              <FileDown className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Copy all errors"
              onClick={copyAll}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Clear errors"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Error list */}
      {expanded && (
        <ScrollArea className="max-h-48">
          <div className="px-4 pb-3 space-y-1">
            {errorLog.map((entry) => (
              <div key={entry.id} className="space-y-1">
                <div
                  className="flex items-start gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => copyOne(entry)}
                  title="Click to copy"
                >
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatTime(entry.timestamp)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 h-4 shrink-0 font-mono ${getSourceColor(entry.source)}`}
                  >
                    {getSourceLabel(entry.source)}
                  </Badge>
                  <span className="text-destructive/90 break-all flex-1">{entry.message}</span>
                  {entry.details && (
                    <button
                      className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={expandedDetails.has(entry.id) ? 'Hide FFmpeg command' : 'Show FFmpeg command'}
                      onClick={(e) => { e.stopPropagation(); toggleDetails(entry.id) }}
                    >
                      <Terminal className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {entry.details && expandedDetails.has(entry.id) && (
                  <div className="ml-2 mr-2 rounded bg-muted border border-border/50">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border/50">
                      <span className="text-[10px] text-muted-foreground font-mono">FFmpeg command</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        title="Copy command"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(entry.details!) }}
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                    <pre className="text-[10px] font-mono text-muted-foreground p-2 max-h-32 overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                      {entry.details}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        title="Clear Error Log"
        description={`Clear all ${errorLog.length} error ${errorLog.length !== 1 ? 'entries' : 'entry'}?`}
        confirmText="Clear All"
        onConfirm={() => { setShowClearConfirm(false); clearErrors() }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}
