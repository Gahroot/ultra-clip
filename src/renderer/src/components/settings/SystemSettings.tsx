import { useState, useEffect } from 'react'
import { Bell, Code2, HardDrive, FolderOpen, FileDown, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useStore } from '@/store'
import { formatFileSize } from '@/lib/utils'
import { SectionHeader, FieldRow } from './shared'

export function SystemSettings() {
  const {
    settings,
    setEnableNotifications,
    setDeveloperMode,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setEnableNotifications: s.setEnableNotifications,
      setDeveloperMode: s.setDeveloperMode,
    }))
  )

  const [tempInfo, setTempInfo] = useState<{ bytes: number; count: number } | null>(null)
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [cleanupState, setCleanupState] = useState<'idle' | 'cleaning' | 'done'>('idle')
  const [cleanupResult, setCleanupResult] = useState<{ freed: number; deleted: number } | null>(null)
  const [autoCleanup, setAutoCleanup] = useState(() => {
    try { return localStorage.getItem('batchcontent-auto-cleanup') === 'true' } catch { return false }
  })
  const [logSize, setLogSize] = useState<number | null>(null)
  const [exportingLog, setExportingLog] = useState(false)

  useEffect(() => {
    window.api.getTempSize().then(setTempInfo).catch(() => {})
    window.api.getCacheSize().then((r) => setCacheSize(r.bytes)).catch(() => {})
    window.api.getLogSize().then(setLogSize).catch(() => {})
    window.api.setAutoCleanup(autoCleanup).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCleanupTemp() {
    setCleanupState('cleaning')
    setCleanupResult(null)
    try {
      const result = await window.api.cleanupTemp()
      setCleanupResult(result)
      setCleanupState('done')
      window.api.getTempSize().then(setTempInfo).catch(() => {})
      setTimeout(() => setCleanupState('idle'), 4000)
    } catch {
      setCleanupState('idle')
    }
  }

  function handleAutoCleanupToggle(enabled: boolean) {
    setAutoCleanup(enabled)
    try { localStorage.setItem('batchcontent-auto-cleanup', String(enabled)) } catch {}
    window.api.setAutoCleanup(enabled).catch(() => {})
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Notifications</SectionHeader>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-enabled" className="text-sm font-medium cursor-pointer">
                Desktop Notifications
              </Label>
              <Switch
                id="notifications-enabled"
                checked={settings.enableNotifications}
                onCheckedChange={setEnableNotifications}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Show OS notifications when pipeline processing or rendering completes.
              Notifications are only sent when the app window is not focused.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Developer Mode</SectionHeader>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="developer-mode-enabled" className="text-sm font-medium cursor-pointer">
                Log FFmpeg Commands
              </Label>
              <Switch
                id="developer-mode-enabled"
                checked={settings.developerMode}
                onCheckedChange={setDeveloperMode}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, every FFmpeg command is logged to the Error Log during rendering — both
              on success and failure. Click the{' '}
              <span className="inline-flex items-center gap-0.5 font-mono bg-muted rounded px-1">
                <code>⊟</code>
              </span>{' '}
              icon on any error entry to view and copy the full command. Useful for diagnosing render
              failures.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <div>
          <SectionHeader>Transcription Engine</SectionHeader>
          <div className="space-y-3">
            <FieldRow label="Engine">
              <Select defaultValue="parakeet-tdt-v3">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parakeet-tdt-v3">
                    Parakeet TDT v3 (NVIDIA / NeMo)
                  </SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <p className="text-xs text-muted-foreground">
              Parakeet TDT 0.6B v3 runs locally via Python. First run downloads ~1.2 GB from
              HuggingFace and caches it.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Storage</SectionHeader>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Temp Files</p>
                  <p className="text-xs text-muted-foreground">
                    {tempInfo == null
                      ? 'Scanning…'
                      : tempInfo.count === 0
                      ? 'No temp files found'
                      : `${formatFileSize(tempInfo.bytes)} · ${tempInfo.count} file${tempInfo.count === 1 ? '' : 's'}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  disabled={cleanupState === 'cleaning' || (tempInfo != null && tempInfo.count === 0)}
                  onClick={handleCleanupTemp}
                >
                  {cleanupState === 'cleaning' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs">
                    {cleanupState === 'cleaning' ? 'Cleaning…' : 'Clean Up'}
                  </span>
                </Button>
              </div>
              {cleanupState === 'done' && cleanupResult && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Freed {formatFileSize(cleanupResult.freed)} ({cleanupResult.deleted} file{cleanupResult.deleted === 1 ? '' : 's'} deleted)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                WAV audio, PNG thumbnails, ASS caption files, and B-Roll cache created during processing.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">AI Model Cache</p>
              <p className="text-xs text-muted-foreground">
                {cacheSize == null
                  ? 'Checking…'
                  : cacheSize === 0
                  ? 'Not downloaded yet'
                  : `${formatFileSize(cacheSize)} — Parakeet TDT transcription model`}
              </p>
              <p className="text-xs text-muted-foreground">
                Stored in <code className="bg-muted rounded px-1 font-mono">~/.cache/huggingface</code>. Delete manually to re-download.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-cleanup" className="text-sm font-medium cursor-pointer">
                  Auto-cleanup on Exit
                </Label>
                <p className="text-xs text-muted-foreground">Delete temp files when the app closes</p>
              </div>
              <Switch
                id="auto-cleanup"
                checked={autoCleanup}
                onCheckedChange={handleAutoCleanupToggle}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Debug Log</SectionHeader>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Session Log</p>
                <p className="text-xs text-muted-foreground">
                  {logSize == null
                    ? 'Checking…'
                    : logSize === 0
                    ? 'No log data yet'
                    : `${formatFileSize(logSize)} — current session`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title="Open the logs folder in your file manager"
                  onClick={() => window.api.openLogFolder().catch(() => {})}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="text-xs">Open Folder</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title="Export full debug log for support"
                  disabled={exportingLog}
                  onClick={async () => {
                    setExportingLog(true)
                    try {
                      const result = await window.api.exportLogs([])
                      if (result) {
                        window.api.showItemInFolder(result.exportPath)
                      }
                    } catch {
                      // ignore
                    } finally {
                      setExportingLog(false)
                    }
                  }}
                >
                  {exportingLog ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs">{exportingLog ? 'Exporting…' : 'Export Log'}</span>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The session log captures all main-process activity — FFmpeg commands, AI calls,
              render progress, and errors. Useful for diagnosing issues or sharing with support.
              Logs are rotated automatically (last 5 sessions kept).
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
