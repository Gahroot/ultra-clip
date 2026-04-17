#!/usr/bin/env node
/**
 * Scaffold 120 stub EditStyleTemplate files (15 styles × 8 archetypes).
 * Each stub is a minimum-viable template that inherits everything from its
 * parent edit style at resolve time. Safe to run repeatedly — skips files
 * that already exist so hand-edited templates are never overwritten.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'src', 'main', 'edit-styles')

const STYLES = [
  'ember',
  'clarity',
  'film',
  'align',
  'growth',
  'impact',
  'lumen',
  'elevate',
  'recess',
  'cinematic',
  'paper_ii',
  'rebel',
  'prime',
  'volt',
  'pulse'
]

const ARCHETYPES = [
  { key: 'talking-head',        camel: 'talkingHead',        variantId: 'main-video-normal' },
  { key: 'tight-punch',         camel: 'tightPunch',         variantId: 'main-video-tight' },
  { key: 'wide-breather',       camel: 'wideBreather',       variantId: 'main-video-wide' },
  { key: 'quote-lower',         camel: 'quoteLower',         variantId: 'main-video-text-lower' },
  { key: 'split-image',         camel: 'splitImage',         variantId: 'main-video-images-topbottom' },
  { key: 'fullscreen-image',    camel: 'fullscreenImage',    variantId: 'fullscreen-image-dark' },
  { key: 'fullscreen-quote',    camel: 'fullscreenQuote',    variantId: 'fullscreen-text-center' },
  { key: 'fullscreen-headline', camel: 'fullscreenHeadline', variantId: 'fullscreen-text-headline' }
]

function stubContent(styleId, arch) {
  return `/**
 * ${styleId} — ${arch.key} template stub.
 *
 * Design knobs live here. Unmodified stubs inherit everything from the
 * parent edit style via resolveTemplate(). Override any of the optional
 * fields below (layoutParamOverrides, zoomStyle, zoomIntensity,
 * captionPosition, imageLayout, imagePlacement) to change just this
 * archetype's look for ${styleId}.
 */

import type { EditStyleTemplate } from '../../shared/types'

export const ${arch.camel}: EditStyleTemplate = {
  archetype: '${arch.key}',
  variantId: '${arch.variantId}',
  layoutParamOverrides: {}
}
`
}

let created = 0
let skipped = 0

for (const style of STYLES) {
  const tplDir = path.join(ROOT, style, 'templates')
  fs.mkdirSync(tplDir, { recursive: true })
  for (const arch of ARCHETYPES) {
    const file = path.join(tplDir, `${arch.key}.ts`)
    if (fs.existsSync(file)) {
      skipped += 1
      continue
    }
    fs.writeFileSync(file, stubContent(style, arch), 'utf8')
    created += 1
  }
}

console.log(`scaffold-templates: created ${created}, skipped ${skipped}`)
