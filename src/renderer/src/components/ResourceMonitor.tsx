import { useState, useEffect, useRef, useCallback } from 'react'
import { Cpu, MemoryStick, Zap, Activity, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResourceData {
  cpu: { percent: number }
  ram: { usedBytes: number; totalBytes: number; appBytes: number }
  gpu: { percent: number; usedMB: number; totalMB: number; name: string } | null
}

interface ResourceMonitorProps {
  /** Whether the monitor should actively poll (e.g. during processing/rendering) */
  active: boolean
  /** Poll interval in milliseconds (default: 2000) */
  intervalMs?: number
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(decimals)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(decimals)} GB`
}

function usageColor(percent: number): string {
  if (percent >= 80) return 'bg-red-500'
  if (percent >= 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

function usageTextColor(percent: number): string {
  if (percent >= 80) return 'text-red-400'
  if (percent >= 60) return 'text-yellow-400'
  return 'text-green-400'
}

interface MiniBarProps {
  label: string
  icon: React.ReactNode
  percent: number
  sublabel: string
}

function MiniBar({ label, icon, percent, sublabel }: MiniBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={cn('shrink-0', usageTextColor(clamped))}>{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-medium text-muted-foreground leading-none">{label}</span>
          <span className={cn('text-[10px] font-bold leading-none tabular-nums', usageTextColor(clamped))}>
            {sublabel}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', usageColor(clamped))}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function ResourceMonitor({ active, intervalMs = 2000 }: ResourceMonitorProps) {
  const [data, setData] = useState<ResourceData | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const poll = useCallback(async () => {
    if (!window.api?.getResourceUsage) return
    try {
      const result = await window.api.getResourceUsage()
      if (mountedRef.current) {
        setData(result)
        setVisible(true)
      }
    } catch {
      // silently ignore — monitor is best-effort
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (active) {
      poll() // immediate first poll
      timerRef.current = setInterval(poll, intervalMs)
    } else {
      // Fade out after a short delay when processing stops
      const fadeTimer = setTimeout(() => {
        if (mountedRef.current) setVisible(false)
      }, 3000)
      return () => clearTimeout(fadeTimer)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [active, intervalMs, poll])

  if (!data || !visible) return null

  const ramPercent = Math.round((data.ram.usedBytes / data.ram.totalBytes) * 100)
  const ramLabel = `${formatBytes(data.ram.usedBytes, 1)} / ${formatBytes(data.ram.totalBytes, 0)}`

  return (
    <div
      className={cn(
        'fixed bottom-2 right-3 z-40 transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden w-[220px]">
        {/* Collapsed header — always visible */}
        <button
          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? 'Collapse resource monitor' : 'Expand resource monitor'}
        >
          <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <MiniBar
              label="CPU"
              icon={<Cpu className="w-2.5 h-2.5" />}
              percent={data.cpu.percent}
              sublabel={`${data.cpu.percent}%`}
            />
            <MiniBar
              label="RAM"
              icon={<MemoryStick className="w-2.5 h-2.5" />}
              percent={ramPercent}
              sublabel={ramLabel}
            />
            {data.gpu && (
              <MiniBar
                label="GPU"
                icon={<Zap className="w-2.5 h-2.5" />}
                percent={data.gpu.percent}
                sublabel={`${data.gpu.percent}%`}
              />
            )}
          </div>
          <span className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </span>
        </button>

        {/* Expanded details panel */}
        {expanded && (
          <div className="border-t border-border px-3 py-2 flex flex-col gap-2">
            {/* CPU detail */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                CPU
              </span>
              <div className="text-[10px] text-foreground/80 leading-relaxed">
                <span>{data.cpu.percent}% utilization</span>
              </div>
            </div>

            {/* RAM detail */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                RAM
              </span>
              <div className="text-[10px] text-foreground/80 leading-relaxed space-y-0.5">
                <div>System: {ramLabel}</div>
                <div className="text-muted-foreground">App: {formatBytes(data.ram.appBytes, 1)}</div>
              </div>
            </div>

            {/* GPU detail */}
            {data.gpu && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  GPU
                </span>
                <div className="text-[10px] text-foreground/80 leading-relaxed space-y-0.5">
                  <div className="truncate text-muted-foreground" title={data.gpu.name}>
                    {data.gpu.name}
                  </div>
                  <div>{data.gpu.percent}% compute</div>
                  <div>VRAM: {data.gpu.usedMB} / {data.gpu.totalMB} MB</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
