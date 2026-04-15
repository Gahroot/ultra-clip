import { useState } from 'react'
import { Type, PenSquare, Pencil, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  useStore,
  DEFAULT_HOOK_TEMPLATES,
  applyHookTemplate,
  type HookTitleStyle,
} from '@/store'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldRow, SectionResetButton, HookTitlePhonePreview } from './shared'

export function HookTitleSettings() {
  const {
    settings,
    setHookTitleEnabled,
    setHookTitleStyle,
    setHookTitleDisplayDuration,
    setHookTitleFontSize,
    setHookTitleTextColor,
    setHookTitleOutlineColor,
    setHookTitleOutlineWidth,
    setHookTitleFadeIn,
    setHookTitleFadeOut,
    resetSection,
    hookTemplates,
    activeHookTemplateId,
    setActiveHookTemplateId,
    addHookTemplate,
    editHookTemplate,
    removeHookTemplate,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setHookTitleEnabled: s.setHookTitleEnabled,
      setHookTitleStyle: s.setHookTitleStyle,
      setHookTitleDisplayDuration: s.setHookTitleDisplayDuration,
      setHookTitleFontSize: s.setHookTitleFontSize,
      setHookTitleTextColor: s.setHookTitleTextColor,
      setHookTitleOutlineColor: s.setHookTitleOutlineColor,
      setHookTitleOutlineWidth: s.setHookTitleOutlineWidth,
      setHookTitleFadeIn: s.setHookTitleFadeIn,
      setHookTitleFadeOut: s.setHookTitleFadeOut,
      resetSection: s.resetSection,
      hookTemplates: s.hookTemplates,
      activeHookTemplateId: s.activeHookTemplateId,
      setActiveHookTemplateId: s.setActiveHookTemplateId,
      addHookTemplate: s.addHookTemplate,
      editHookTemplate: s.editHookTemplate,
      removeHookTemplate: s.removeHookTemplate,
    }))
  )

  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [templateFormName, setTemplateFormName] = useState('')
  const [templateFormTemplate, setTemplateFormTemplate] = useState('{hookText}')
  const [templateFormEmoji, setTemplateFormEmoji] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const allTemplates = [...DEFAULT_HOOK_TEMPLATES, ...hookTemplates]
  const activeTemplate = allTemplates.find((t) => t.id === activeHookTemplateId) ?? null

  function openAddTemplate() {
    setEditingTemplateId(null)
    setTemplateFormName('')
    setTemplateFormTemplate('{hookText}')
    setTemplateFormEmoji('')
    setShowTemplateManager(true)
  }

  function openEditTemplate(t: typeof allTemplates[number]) {
    setEditingTemplateId(t.id)
    setTemplateFormName(t.name)
    setTemplateFormTemplate(t.template)
    setTemplateFormEmoji(t.emoji ?? '')
    setShowTemplateManager(true)
  }

  function handleSaveTemplate() {
    const name = templateFormName.trim()
    const template = templateFormTemplate.trim()
    if (!name || !template) return
    const emoji = templateFormEmoji.trim() || undefined
    if (editingTemplateId) {
      editHookTemplate(editingTemplateId, { name, template, emoji })
    } else {
      addHookTemplate({ name, template, emoji })
    }
    setShowTemplateManager(false)
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionHeader>Hook Title Overlay</SectionHeader>
            <SectionResetButton section="hookTitle" onReset={resetSection} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hook-title-enabled" className="text-sm font-medium cursor-pointer">
                Burn-in Hook Title
              </Label>
              <Switch
                id="hook-title-enabled"
                checked={settings.hookTitleOverlay.enabled}
                onCheckedChange={setHookTitleEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Hook Text Template</Label>
              <div className="flex gap-2">
                <Select
                  value={activeHookTemplateId ?? '__none__'}
                  onValueChange={(v) => setActiveHookTemplateId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="None (AI Default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (AI default)</SelectItem>
                    {allTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.emoji ? `${t.emoji} ` : ''}{t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Manage templates"
                  onClick={openAddTemplate}
                >
                  <PenSquare className="w-4 h-4" />
                </Button>
              </div>
              {activeTemplate && (
                <p className="text-xs text-muted-foreground">
                  Preview:{' '}
                  <span className="font-medium text-foreground">
                    {applyHookTemplate(activeTemplate.template, 'This changes everything')}
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Wraps the AI-generated hook text through the selected template before rendering.
              </p>
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                !settings.hookTitleOverlay.enabled && 'opacity-40 pointer-events-none'
              )}
            >
              <p className="text-xs text-muted-foreground">
                Renders the AI-generated hook text (e.g. "Wait for it…", "Nobody talks about this")
                as a bold overlay in the first {settings.hookTitleOverlay.displayDuration.toFixed(1)}s
                of every clip. Uses each clip&apos;s hook text from the scoring step.
              </p>

              <FieldRow
                label="Overlay Style"
                hint={
                  settings.hookTitleOverlay.style === 'centered-bold'
                    ? 'White text centered at top of frame with black outline'
                    : settings.hookTitleOverlay.style === 'top-bar'
                    ? 'Semi-transparent dark bar behind centered text'
                    : 'Text slides in from the left while fading in'
                }
              >
                <Select
                  value={settings.hookTitleOverlay.style}
                  onValueChange={(v) => setHookTitleStyle(v as HookTitleStyle)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centered-bold">Centered Bold</SelectItem>
                    <SelectItem value="top-bar">Top Bar</SelectItem>
                    <SelectItem value="slide-in">Slide In</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow
                label={`Display Duration — ${settings.hookTitleOverlay.displayDuration.toFixed(1)}s`}
                hint="How long the hook text stays visible"
              >
                <Slider
                  min={10}
                  max={50}
                  step={1}
                  value={[Math.round(settings.hookTitleOverlay.displayDuration * 10)]}
                  onValueChange={([v]) => setHookTitleDisplayDuration(v / 10)}
                />
              </FieldRow>

              <FieldRow
                label={`Font Size — ${settings.hookTitleOverlay.fontSize}px`}
                hint="Text size on 1080×1920 canvas"
              >
                <Slider
                  min={40}
                  max={120}
                  step={4}
                  value={[settings.hookTitleOverlay.fontSize]}
                  onValueChange={([v]) => setHookTitleFontSize(v)}
                />
              </FieldRow>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Text Color" htmlFor="hook-text-color">
                  <div className="flex items-center gap-2">
                    <input
                      id="hook-text-color"
                      type="color"
                      value={settings.hookTitleOverlay.textColor}
                      onChange={(e) => setHookTitleTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.hookTitleOverlay.textColor}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Outline Color" htmlFor="hook-outline-color">
                  <div className="flex items-center gap-2">
                    <input
                      id="hook-outline-color"
                      type="color"
                      value={settings.hookTitleOverlay.outlineColor}
                      onChange={(e) => setHookTitleOutlineColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-input bg-transparent p-0.5"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.hookTitleOverlay.outlineColor}
                    </span>
                  </div>
                </FieldRow>
              </div>

              <FieldRow
                label={`Outline Width — ${settings.hookTitleOverlay.outlineWidth}px`}
                hint="Thickness of the text outline on 1080×1920 canvas"
              >
                <Slider
                  min={0}
                  max={8}
                  step={1}
                  value={[settings.hookTitleOverlay.outlineWidth]}
                  onValueChange={([v]) => setHookTitleOutlineWidth(v)}
                />
              </FieldRow>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow
                  label={`Fade In — ${settings.hookTitleOverlay.fadeIn.toFixed(1)}s`}
                >
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[Math.round(settings.hookTitleOverlay.fadeIn * 10)]}
                    onValueChange={([v]) => setHookTitleFadeIn(v / 10)}
                  />
                </FieldRow>

                <FieldRow
                  label={`Fade Out — ${settings.hookTitleOverlay.fadeOut.toFixed(1)}s`}
                >
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[Math.round(settings.hookTitleOverlay.fadeOut * 10)]}
                    onValueChange={([v]) => setHookTitleFadeOut(v / 10)}
                  />
                </FieldRow>
              </div>

              <HookTitlePhonePreview
                hookTitleOverlay={settings.hookTitleOverlay}
                rehookOverlay={settings.rehookOverlay}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId ? 'Edit Template' : 'Hook Text Templates'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplateId
                ? 'Edit this custom template. Use {hookText} as the placeholder for the AI-generated text.'
                : 'Create and manage hook text templates. Use {hookText} as the placeholder.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="text-sm">Name</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Warning Style"
                value={templateFormName}
                onChange={(e) => setTemplateFormName(e.target.value)}
                autoFocus={!editingTemplateId}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-template" className="text-sm">Template</Label>
              <Input
                id="tpl-template"
                placeholder="e.g. ⚠️ {hookText}"
                value={templateFormTemplate}
                onChange={(e) => setTemplateFormTemplate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateFormName.trim() && templateFormTemplate.trim()) {
                    handleSaveTemplate()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted rounded px-1">{'{hookText}'}</code> where the AI text should appear.
                Also supports <code className="bg-muted rounded px-1">{'{score}'}</code> and <code className="bg-muted rounded px-1">{'{duration}'}</code>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-emoji" className="text-sm">Emoji (optional)</Label>
              <Input
                id="tpl-emoji"
                placeholder="e.g. ⚠️"
                value={templateFormEmoji}
                onChange={(e) => setTemplateFormEmoji(e.target.value)}
                className="w-24"
              />
            </div>
            {templateFormTemplate && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">Live preview:</p>
                <p className="text-sm font-medium">
                  {applyHookTemplate(templateFormTemplate, 'This changes everything')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowTemplateManager(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateFormName.trim() || !templateFormTemplate.trim()}
              className="w-full sm:w-auto"
            >
              {editingTemplateId ? 'Save Changes' : 'Add Template'}
            </Button>
          </DialogFooter>

          {hookTemplates.length > 0 && !editingTemplateId && (
            <div className="border-t border-border pt-3 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                My Templates
              </p>
              {hookTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 group"
                >
                  {t.emoji && <span className="text-sm">{t.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{t.template}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEditTemplate(t)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Edit template"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeHookTemplate(t.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
