import { useState } from 'react'
import { AlertTriangle, RotateCcw, Paintbrush, Wand2, Layers, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/store'
import { AutoZoomSettings } from './settings/AutoZoomSettings'
import { BRollSettings } from './settings/BRollSettings'
import { SoundDesignSettings } from './settings/SoundDesignSettings'
import { FillerRemovalSettings } from './settings/FillerRemovalSettings'
import { AIEditStyleSettings } from './settings/AIEditStyleSettings'
import { HookTitleSettings } from './settings/HookTitleSettings'
import { RehookSettings } from './settings/RehookSettings'
import { ProgressBarSettings } from './settings/ProgressBarSettings'
import { BrandKitSettings } from './settings/BrandKitSettings'
import { AISettings } from './settings/AISettings'
import { OutputSettings } from './settings/OutputSettings'
import { RenderQualitySettings } from './settings/RenderQualitySettings'
import { SystemSettings } from './settings/SystemSettings'
import { SettingsProfiles } from './settings/SettingsProfiles'

export function SettingsPanel() {
  const settingsChanged = useStore((s) => s.settingsChanged)
  const settingsSnapshot = useStore((s) => s.settingsSnapshot)
  const revertToSnapshot = useStore((s) => s.revertToSnapshot)
  const dismissSettingsWarning = useStore((s) => s.dismissSettingsWarning)
  const getSettingsDiff = useStore((s) => s.getSettingsDiff)
  const changedSettingNames = settingsChanged ? getSettingsDiff() : []

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('batchcontent-settings-tab')
      if (saved === 'general' || saved === 'advanced') return 'settings'
      if (saved === 'captions') return 'style'
      if (saved === 'audio' || saved === 'effects') return 'effects'
      if (saved === 'brand' || saved === 'overlays') return 'overlays'
      if (saved && ['style', 'effects', 'overlays', 'settings'].includes(saved)) return saved
      return 'style'
    } catch { return 'style' }
  })
  function handleTabChange(tab: string) {
    setActiveTab(tab)
    try { localStorage.setItem('batchcontent-settings-tab', tab) } catch {}
  }

  return (
    <div className="flex h-full flex-col">
      {settingsSnapshot && settingsChanged && changedSettingNames.length > 0 && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-500">
                Settings changed since processing
              </p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                Changed: {changedSettingNames.join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={revertToSnapshot}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Revert to Processing Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={dismissSettingsWarning}
            >
              Keep Changes
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border px-4 pt-3 pb-0">
          <TabsList className="w-full h-auto gap-1">
            <TabsTrigger value="style" className="text-xs px-3 py-1.5 gap-1.5 flex-1">
              <Paintbrush className="w-3.5 h-3.5" />Style
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs px-3 py-1.5 gap-1.5 flex-1">
              <Wand2 className="w-3.5 h-3.5" />Effects
            </TabsTrigger>
            <TabsTrigger value="overlays" className="text-xs px-3 py-1.5 gap-1.5 flex-1">
              <Layers className="w-3.5 h-3.5" />Overlays
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs px-3 py-1.5 gap-1.5 flex-1">
              <Settings2 className="w-3.5 h-3.5" />Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="style" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-5 space-y-8">
              <AIEditStyleSettings />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="effects" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-5 space-y-8">
              <AutoZoomSettings />
              <BRollSettings />
              <SoundDesignSettings />
              <FillerRemovalSettings />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="overlays" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-5 space-y-8">
              <HookTitleSettings />
              <RehookSettings />
              <ProgressBarSettings />
              <BrandKitSettings />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-5 space-y-8">
              <AISettings />
              <OutputSettings />
              <RenderQualitySettings />
              <SystemSettings />
              <SettingsProfiles />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
