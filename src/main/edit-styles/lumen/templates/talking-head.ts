/**
 * lumen — talking-head template stub.
 *
 * Design knobs live here. Unmodified stubs inherit everything from the
 * parent edit style via resolveTemplate(). Override any of the optional
 * fields below (layoutParamOverrides, zoomStyle, zoomIntensity,
 * captionPosition, imageLayout, imagePlacement) to change just this
 * archetype's look for lumen.
 */

import type { EditStyleTemplate } from '../../shared/types'

export const talkingHead: EditStyleTemplate = {
  archetype: 'talking-head',
  variantId: 'main-video-normal',
  layoutParamOverrides: {}
}
