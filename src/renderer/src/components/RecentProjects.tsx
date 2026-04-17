import { useState, useEffect, useCallback } from 'react'
import { History, FolderOpen, X, Trash2, Clock, Film, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export interface RecentProjectEntry {
  path: string
  name: string
  lastOpened: number
  clipCount: number
  sourceCount: number
}

// ---- Relative time helper -----------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

// ---- Truncate long paths ---------------------------------------------------

function truncatePath(p: string, maxLen = 52): string {
  if (p.length <= maxLen) return p
  const sep = p.includes('/') ? '/' : '\\'
  const parts = p.split(sep)
  if (parts.length <= 2) return '…' + p.slice(-(maxLen - 1))
  // Show first segment + … + last two segments
  const tail = parts.slice(-2).join(sep)
  const head = parts[0]
  const candidate = `${head}${sep}…${sep}${tail}`
  if (candidate.length <= maxLen) return candidate
  return '…' + p.slice(-(maxLen - 1))
}

// ---- Inline card list (empty state) ----------------------------------------

interface RecentProjectsListProps {
  onLoad: (entry: RecentProjectEntry) => void
}

export function RecentProjectsList({ onLoad }: RecentProjectsListProps) {
  const [entries, setEntries] = useState<RecentProjectEntry[]>([])
  const [notFound, setNotFound] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      if (typeof window.api?.getRecentProjects !== 'function') {
        setLoading(false)
        return
      }
      const list = await window.api.getRecentProjects()
      setEntries(list)
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleRemove(e: React.MouseEvent, path: string) {
    e.stopPropagation()
    try {
      await window.api.removeRecentProject(path)
      setEntries((prev) => prev.filter((en) => en.path !== path))
    } catch { /* ignore */ }
  }

  async function handleClear() {
    try {
      await window.api.clearRecentProjects()
      setEntries([])
      setNotFound(new Set())
    } catch { /* ignore */ }
  }

  async function handleClick(entry: RecentProjectEntry) {
    if (notFound.has(entry.path)) {
      // Auto-remove entries that don't exist
      await handleRemove(new MouseEvent('click') as unknown as React.MouseEvent, entry.path)
      return
    }
    onLoad(entry)
  }

  if (loading) return null
  if (entries.length === 0) return null

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <History className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Recent Projects</span>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const missing = notFound.has(entry.path)
          return (
            <Card
              key={entry.path}
              onClick={() => handleClick(entry)}
              onMouseEnter={async () => {
                // Lazily check file existence by attempting a load (handled server-side)
                // We mark missing via a failed load later; for now no pre-check needed
              }}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                missing
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-accent'
              ].join(' ')}
            >
              <FileVideo className="w-4 h-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={['text-sm font-medium truncate', missing ? 'line-through text-muted-foreground' : ''].join(' ')}>
                    {entry.name}
                  </span>
                  {missing && (
                    <span className="text-xs text-destructive/70 shrink-0">(file not found)</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate" title={entry.path}>
                    {truncatePath(entry.path)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(entry.lastOpened)}
                  </span>
                  {entry.sourceCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <FolderOpen className="w-3 h-3" />
                      {entry.sourceCount} source{entry.sourceCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {entry.clipCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Film className="w-3 h-3" />
                      {entry.clipCount} clip{entry.clipCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => handleRemove(e, entry.path)}
                title="Remove from recent"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ---- Header dropdown -------------------------------------------------------

interface RecentProjectsDropdownProps {
  onLoad: (entry: RecentProjectEntry) => void
}

export function RecentProjectsDropdown({ onLoad }: RecentProjectsDropdownProps) {
  const [entries, setEntries] = useState<RecentProjectEntry[]>([])
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      if (typeof window.api?.getRecentProjects !== 'function') return
      const list = await window.api.getRecentProjects()
      setEntries(list)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  async function handleRemove(e: React.MouseEvent, path: string) {
    e.stopPropagation()
    try {
      await window.api.removeRecentProject(path)
      setEntries((prev) => prev.filter((en) => en.path !== path))
    } catch { /* ignore */ }
  }

  async function handleClear() {
    try {
      await window.api.clearRecentProjects()
      setEntries([])
    } catch { /* ignore */ }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Recent Projects"
        >
          <History className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[480px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No recent projects
          </div>
        ) : (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Projects
            </div>
            {entries.map((entry) => (
              <DropdownMenuItem
                key={entry.path}
                className="flex items-start gap-2 px-2 py-2 cursor-pointer group"
                onSelect={() => {
                  onLoad(entry)
                  setOpen(false)
                }}
              >
                <FileVideo className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{entry.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.lastOpened)}
                    </span>
                    {entry.clipCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        · {entry.clipCount} clip{entry.clipCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground/60 truncate mt-0.5" title={entry.path}>
                    {truncatePath(entry.path, 44)}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                  onClick={(e) => { handleRemove(e, entry.path); e.stopPropagation() }}
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer"
              onSelect={handleClear}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear recent projects
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
