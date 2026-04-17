/**
 * Edit style registry + template resolver.
 *
 * Assembles the 15 edit styles and their 120 templates (15 × 8 archetypes)
 * into a single barrel. All public exports that the old monolith provided
 * remain available from here so importers only need to update their paths
 * (or hit the shim at src/main/edit-styles.ts).
 */

import { getVariantById } from '../segment-styles'
import { ARCHETYPE_DEFAULT_VARIANT, ARCHETYPE_KEYS } from './shared/archetypes'
import type { Archetype } from './shared/archetypes'
import type {
  EditStyleTemplate,
  EditStyleTemplateView,
  ResolvedTemplate
} from './shared/types'
import { ARCHETYPE_META, ARCHETYPE_TO_CATEGORY } from './shared/archetypes'

// Static imports of every edit style + its template dict.
import { emberEditStyle, emberTemplates } from './ember'
import { clarityEditStyle, clarityTemplates } from './clarity'
import { filmEditStyle, filmTemplates } from './film'
import { alignEditStyle, alignTemplates } from './align'
import { growthEditStyle, growthTemplates } from './growth'
import { impactEditStyle, impactTemplates } from './impact'
import { lumenEditStyle, lumenTemplates } from './lumen'
import { elevateEditStyle, elevateTemplates } from './elevate'
import { recessEditStyle, recessTemplates } from './recess'
import { cinematicEditStyle, cinematicTemplates } from './cinematic'
import { paperIiEditStyle, paperIiTemplates } from './paper_ii'
import { rebelEditStyle, rebelTemplates } from './rebel'
import { primeEditStyle, primeTemplates } from './prime'
import { voltEditStyle, voltTemplates } from './volt'
import { pulseEditStyle, pulseTemplates } from './pulse'
import { prestyjEditStyle, prestyjTemplates } from './prestyj'

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const EDIT_STYLES: EditStyle[] = [
  emberEditStyle,
  clarityEditStyle,
  filmEditStyle,
  alignEditStyle,
  growthEditStyle,
  impactEditStyle,
  lumenEditStyle,
  elevateEditStyle,
  recessEditStyle,
  cinematicEditStyle,
  paperIiEditStyle,
  rebelEditStyle,
  primeEditStyle,
  voltEditStyle,
  pulseEditStyle,
  prestyjEditStyle
]

export const STYLE_TEMPLATES: Record<
  string,
  Record<Archetype, EditStyleTemplate>
> = {
  ember: emberTemplates,
  clarity: clarityTemplates,
  film: filmTemplates,
  align: alignTemplates,
  growth: growthTemplates,
  impact: impactTemplates,
  lumen: lumenTemplates,
  elevate: elevateTemplates,
  recess: recessTemplates,
  cinematic: cinematicTemplates,
  paper_ii: paperIiTemplates,
  rebel: rebelTemplates,
  prime: primeTemplates,
  volt: voltTemplates,
  pulse: pulseTemplates,
  prestyj: prestyjTemplates
}

export const DEFAULT_EDIT_STYLE_ID = 'prestyj'

// ---------------------------------------------------------------------------
// Public helpers (preserve old API)
// ---------------------------------------------------------------------------

export function getEditStyleById(id: string): EditStyle | undefined {
  return EDIT_STYLES.find((s) => s.id === id)
}

export function getEditStylesByEnergy(
  energy: 'low' | 'medium' | 'high'
): EditStyle[] {
  return EDIT_STYLES.filter((s) => s.energy === energy)
}

/**
 * Resolve the transition type for a segment boundary from the edit style's
 * transition matrix. Looks up "outCategory→inCategory" in the style's
 * transitionMap; falls back to defaultTransition if no override exists.
 */
export function resolveTransition(
  style: EditStyle,
  outCategory: SegmentStyleCategory,
  inCategory: SegmentStyleCategory
): TransitionType {
  if (style.transitionMap) {
    const key = `${outCategory}→${inCategory}`
    const override = style.transitionMap[key]
    if (override) return override
  }
  return style.defaultTransition
}

// ---------------------------------------------------------------------------
// Template resolver
// ---------------------------------------------------------------------------

function getTemplate(
  archetype: Archetype,
  editStyleId: string
): EditStyleTemplate {
  const byStyle = STYLE_TEMPLATES[editStyleId] ?? STYLE_TEMPLATES[DEFAULT_EDIT_STYLE_ID]
  return (
    byStyle[archetype] ?? {
      archetype,
      variantId: ARCHETYPE_DEFAULT_VARIANT[archetype],
      layoutParamOverrides: {}
    }
  )
}

/**
 * Resolve a (archetype, editStyleId) pair into a concrete variant + zoom +
 * caption-position + layout-param overrides. This is the single merge point
 * between the authored template and the render pipeline's consumption.
 */
export function resolveTemplate(
  archetype: Archetype,
  editStyleId: string
): ResolvedTemplate {
  const editStyle =
    getEditStyleById(editStyleId) ?? getEditStyleById(DEFAULT_EDIT_STYLE_ID)!
  const tpl = getTemplate(archetype, editStyle.id)
  const baseVariant =
    getVariantById(tpl.variantId) ??
    getVariantById(ARCHETYPE_DEFAULT_VARIANT[archetype])!

  const variant: SegmentStyleVariant = {
    ...baseVariant,
    captionPosition: tpl.captionPosition ?? baseVariant.captionPosition,
    imageLayout: tpl.imageLayout ?? baseVariant.imageLayout,
    imagePlacement: tpl.imagePlacement ?? baseVariant.imagePlacement
  }

  return {
    archetype,
    editStyleId: editStyle.id,
    variant,
    zoomStyle:
      tpl.zoomStyle ?? baseVariant.zoomStyle ?? editStyle.defaultZoomStyle,
    zoomIntensity:
      tpl.zoomIntensity ??
      baseVariant.zoomIntensity ??
      editStyle.defaultZoomIntensity,
    captionPosition: variant.captionPosition,
    layoutParamOverrides: tpl.layoutParamOverrides ?? {},
    captionMarginV: tpl.captionMarginV
  }
}

/**
 * Returns an array of display-ready templates for a given edit style.
 * Used by the renderer's SegmentTemplatePicker via IPC.
 */
export function getTemplatesForEditStyle(
  editStyleId: string
): EditStyleTemplateView[] {
  const style = getEditStyleById(editStyleId)
  if (!style) return []

  return ARCHETYPE_KEYS.map((archetype) => {
    const resolved = resolveTemplate(archetype, style.id)
    const meta = ARCHETYPE_META[archetype]
    return {
      archetype,
      editStyleId: style.id,
      name: meta.name,
      description: meta.description,
      category: ARCHETYPE_TO_CATEGORY[archetype],
      variantId: resolved.variant.id,
      zoomStyle: resolved.zoomStyle,
      zoomIntensity: resolved.zoomIntensity,
      captionPosition: resolved.captionPosition,
      imageLayout: resolved.variant.imageLayout,
      imagePlacement: resolved.variant.imagePlacement
    }
  })
}

// Re-exports for consumers that used to import from ../edit-styles
export { ARCHETYPE_KEYS, ARCHETYPE_TO_CATEGORY, ARCHETYPE_META } from './shared/archetypes'
export type { Archetype } from './shared/archetypes'
export type {
  EditStyleTemplate,
  EditStyleTemplateView,
  ResolvedTemplate
} from './shared/types'
