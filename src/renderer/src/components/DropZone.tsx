import { useState, useRef } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  /** MIME types accepted for drag-and-drop validation (e.g. ['image/png', 'image/jpeg']) */
  accept: string[]
  /** Maximum file size in megabytes */
  maxSizeMB: number
  /** Called with the stable asset path after the file is copied to userData */
  onFile: (stablePath: string) => void
  /** IPC call to copy the dropped file — returns stable path or throws */
  copyFile: (nativePath: string) => Promise<string>
  /** IPC call to open a native file picker — returns stable path or null */
  openPicker: () => Promise<string | null>
  /** Short label shown on the upload button */
  label: string
  /** Icon shown in the idle state */
  icon: LucideIcon
  /** Human-readable hint shown below the drop zone (e.g. "PNG, JPG, WEBP · Max 5 MB") */
  hint: string
  /** Currently set file path (null = no file) */
  currentFile: string | null
  /** Called when the user clicks Remove */
  onRemove: () => void
  /** Optional additional className */
  className?: string
}

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

export function DropZone({
  accept,
  maxSizeMB,
  onFile,
  copyFile,
  openPicker,
  label,
  icon: Icon,
  hint,
  currentFile,
  onRemove,
  className
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragCounterRef = useRef(0)

  function validateFile(file: File): string | null {
    if (!accept.includes(file.type)) {
      const exts = accept.map((t) => t.split('/')[1].replace('jpeg', 'jpg')).join(', ')
      return `Unsupported file type. Accepted: ${exts}`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large (max ${maxSizeMB} MB)`
    }
    return null
  }

  async function processFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsProcessing(true)
    try {
      const nativePath = window.api.getPathForFile(file)
      const stablePath = await copyFile(nativePath)
      onFile(stablePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleClick() {
    if (isProcessing) return
    setError(null)
    try {
      const stablePath = await openPicker()
      if (stablePath) onFile(stablePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) setIsDragOver(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    await processFile(files[0])
  }

  if (currentFile) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0 text-green-500" />
          <span className="truncate">{basename(currentFile)}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-8 w-8"
          title="Remove"
          onClick={onRemove}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer select-none',
          isDragOver
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border hover:border-primary/50 hover:bg-accent/30 text-muted-foreground',
          isProcessing && 'pointer-events-none opacity-60'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <div
          className={cn(
            'rounded-full p-2 transition-colors',
            isDragOver ? 'bg-primary/10' : 'bg-secondary'
          )}
        >
          {isProcessing ? (
            <Upload className={cn('w-4 h-4 animate-pulse', isDragOver ? 'text-primary' : '')} />
          ) : (
            <Icon className={cn('w-4 h-4', isDragOver ? 'text-primary' : '')} />
          )}
        </div>

        <div>
          <p className="text-xs font-medium leading-tight">
            {isProcessing
              ? 'Processing…'
              : isDragOver
                ? 'Drop to upload'
                : label}
          </p>
          {!isProcessing && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isDragOver ? '' : `or click to browse — ${hint}`}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
