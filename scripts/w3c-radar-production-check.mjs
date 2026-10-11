#!/usr/bin/env node
/**
 * Regression smoke check for the emitted Project Overview radar CSS.
 * Run after `npm run check` (which builds dist). A file path can be passed
 * to inspect a saved CSS chunk without requiring a Vite project checkout.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const file = process.argv[2]
  ? resolve(process.argv[2])
  : (() => {
      const dir = resolve(import.meta.dirname, '../dist/assets')
      const found = readdirSync(dir).filter((entry) => /^ProjectOverviewPage-.*\.css$/.test(entry))
      assert.equal(found.length, 1, 'expected exactly one built ProjectOverviewPage CSS chunk')
      return join(dir, found[0])
    })()
const css = readFileSync(file, 'utf8')

// CSS Modules emit ._radarPulse_<scope>_<line>; evaluate the primary rule.
const match = css.match(/\._radarPulse_[\w-]+\s*\{([^}]*)\}/)
assert.ok(match, `cannot find compiled .radarPulse in ${file}`)
const declarations = new Map(match[1].split(';').filter((item) => item.trim()).map((item) => {
  const colon = item.indexOf(':')
  assert.ok(colon >= 1, `invalid production declaration: ${item}`)
  return [item.slice(0, colon).trim(), item.slice(colon + 1).trim()]
}))
const svg = /url\([^)]*signal-radar[^)]*\.svg\)/
for (const [name, value] of declarations) {
  if (name === 'mask' || name === '-webkit-mask' || name.startsWith('mask-') || name.startsWith('-webkit-mask-')) {
    assert.ok(value, `${name} has an EMPTY value in the production radar rule`)
  }
}
for (const prefix of ['mask', '-webkit-mask']) {
  const standardOrPrefixed = declarations.get(prefix) ?? declarations.get(`${prefix}-image`)
  assert.match(standardOrPrefixed ?? '', svg,
    `${prefix} must contain the emitted radar SVG URL in the production CSS`)
}
assert.match(css, /@property\s+--radar-wave-radius\s*\{/, 'typed radar animation token preserved')
assert.match(css, /@keyframes\s+_?radarWavePulse_/, 'radar animation keyframes preserved')
console.log(`PASS: radar SVG mask and registered animation preserved in ${file}`)
