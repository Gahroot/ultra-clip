/**
 * Edit-styles re-export shim. The monolith moved to src/main/edit-styles/.
 * Keep this file around for importers that still reference it, and so older
 * relative-path imports (`../edit-styles`) continue to resolve.
 */

export {
  EDIT_STYLES,
  STYLE_TEMPLATES,
  DEFAULT_EDIT_STYLE_ID,
  getEditStyleById,
  getEditStylesByEnergy,
  resolveTransition,
  resolveTemplate,
  getTemplatesForEditStyle,
  ARCHETYPE_KEYS,
  ARCHETYPE_TO_CATEGORY,
  ARCHETYPE_META
} from './edit-styles/index'

export type {
  Archetype,
  EditStyleTemplate,
  EditStyleTemplateView,
  ResolvedTemplate
} from './edit-styles/index'
