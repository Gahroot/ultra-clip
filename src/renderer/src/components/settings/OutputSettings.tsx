import { useState, useEffect, useRef } from 'react'
import { FolderOpen, ExternalLink, HardDrive, FileOutput } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore, DEFAULT_SETTINGS } from '@/store'
import { formatFileSize } from '@/lib/utils'
import { SectionHeader, FieldRow } from './shared'

export function OutputSettings() {
  const {
    settings,
    setOutputDirectory,
    setFilenameTemplate,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setOutputDirectory: s.setOutputDirectory,
      setFilenameTemplate: s.setFilenameTemplate,
    }))
  )

  const filenameTemplateInputRef = useRef<HTMLInputElement>(null)
  const [freeSpace, setFreeSpace] = useState<number | null>(null)

  useEffect(() => {
    if (!settings.outputDirectory) {
      setFreeSpace(null)
      return
    }
    let cancelled = false
    window.api.getDiskSpace(settings.outputDirectory).then((info) => {
      if (!cancelled) setFreeSpace(info.free)
    }).catch(() => {
      if (!cancelled) setFreeSpace(null)
    })
    return () => { cancelled = true }
  }, [settings.outputDirectory])

  async function handleBrowseOutput() {
    const dir = await window.api.openDirectory()
    if (dir) {
      setOutputDirectory(dir)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
      <div>
        <SectionHeader>Output</SectionHeader>
        <div className="space-y-4">
          <FieldRow
            label="Output Directory"
            htmlFor="output-dir"
            hint={settings.outputDirectory ? undefined : 'Where rendered clips will be saved'}
          >
            <div className="flex gap-2">
              <Input
                id="output-dir"
                readOnly
                value={settings.outputDirectory ?? ''}
                placeholder="Choose a folder…"
                className="flex-1 text-sm cursor-default"
                onClick={handleBrowseOutput}
              />
              <Button variant="outline" size="icon" className="shrink-0" onClick={handleBrowseOutput} title="Browse">
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
            {settings.outputDirectory && (
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground truncate flex-1" title={settings.outputDirectory}>
                  {settings.outputDirectory}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => window.api.openPath(settings.outputDirectory!)}
                  title="Open in file manager"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
            {settings.outputDirectory && freeSpace !== null && (
              <div className="flex items-center gap-1.5 mt-1">
                <HardDrive className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(freeSpace)} free
                </span>
              </div>
            )}
          </FieldRow>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileOutput className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Label htmlFor="filename-template" className="text-sm font-medium">Filename Template</Label>
              <button
                type="button"
                onClick={() => setFilenameTemplate(DEFAULT_SETTINGS.filenameTemplate)}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                title="Reset to default"
              >
                Reset
              </button>
            </div>
            <Input
              id="filename-template"
              ref={filenameTemplateInputRef}
              value={settings.filenameTemplate}
              onChange={(e) => setFilenameTemplate(e.target.value)}
              className="font-mono text-sm"
              placeholder="{source}_clip{index}_{score}"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-1">
              {['{source}', '{index}', '{score}', '{hook}', '{duration}', '{start}', '{end}', '{date}', '{quality}'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const input = filenameTemplateInputRef.current
                    if (!input) {
                      setFilenameTemplate(settings.filenameTemplate + v)
                      return
                    }
                    const start = input.selectionStart ?? settings.filenameTemplate.length
                    const end = input.selectionEnd ?? start
                    const next = settings.filenameTemplate.slice(0, start) + v + settings.filenameTemplate.slice(end)
                    setFilenameTemplate(next)
                    requestAnimationFrame(() => {
                      input.focus()
                      input.setSelectionRange(start + v.length, start + v.length)
                    })
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors"
                  title={`Insert ${v}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview:{' '}
              <span className="font-medium text-foreground font-mono">
                {settings.filenameTemplate
                  .replace(/\{source\}/g, 'my-video')
                  .replace(/\{index\}/g, '01')
                  .replace(/\{score\}/g, '85')
                  .replace(/\{hook\}/g, 'nobody-knows-this')
                  .replace(/\{duration\}/g, '45')
                  .replace(/\{start\}/g, '02-30')
                  .replace(/\{end\}/g, '03-15')
                  .replace(/\{date\}/g, new Date().toISOString().slice(0, 10))
                  .replace(/\{quality\}/g, settings.renderQuality.preset)
                  .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                  .trim()
                  .slice(0, 60) || 'clip'}.{settings.renderQuality.outputFormat}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
