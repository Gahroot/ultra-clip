import { SettingsPanel } from './components/SettingsPanel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from './hooks/useTheme'

export function SettingsWindow(): JSX.Element {
  useTheme()

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        <header className="px-4 py-3 border-b border-border shrink-0 flex items-center">
          <h1 className="text-sm font-semibold">Settings</h1>
        </header>
        <div className="flex-1 overflow-hidden">
          <SettingsPanel />
        </div>
      </div>
    </TooltipProvider>
  )
}
