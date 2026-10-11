#!/usr/bin/env node
/**
 * HelmSight Stage 26: test an in-memory indexGauge gradient-layer split
 * against the project's real, fail-closed Vite CSS pilot.
 * It never writes source CSS, changes vite.config.js, or builds dist.
 */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { w3cApprovedCssPilots } from './w3c-vite-pilot.mjs'

const postcss = createRequire(import.meta.url)('postcss')
const projectDir = resolve(import.meta.dirname, '..')
const cssFile = resolve(projectDir, 'src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css')
const source = readFileSync(cssFile, 'utf8')
const reportDir = join(projectDir, 'w3c-audit')

function splitLayers(value) {
  const layers = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    if (value[i] === ')') depth--
    assert.ok(depth >= 0, 'unbalanced parentheses in indexGauge background')
    if (value[i] === ',' && depth === 0) {
      layers.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  assert.equal(depth, 0, 'unbalanced parentheses in indexGauge background')
  layers.push(value.slice(start).trim())
  assert.equal(layers.length, 2, 'expected original two-layer indexGauge background')
  assert.match(layers[0], /^radial-gradient\(/)
  assert.match(layers[1], /^linear-gradient\(/)
  return layers
}

const tree = postcss.parse(source, { from: cssFile })
const indexRules = []
tree.walkRules((rule) => {
  if (rule.parent.type === 'root' && rule.selector === '.indexGauge') indexRules.push(rule)
})
assert.equal(indexRules.length, 1, 'expected exactly one source .indexGauge rule')
const index = indexRules[0]
const declarations = index.nodes.filter((node) => node.type === 'decl' && node.prop === 'background-image')
assert.equal(declarations.length, 1, 'expected exactly one indexGauge background-image')
const [radial, linear] = splitLayers(declarations[0].value)
assert.match(radial, /var\(--gauge-accent\)/)
assert.match(linear, /var\(--gauge-surface-start\)/)
assert.match(source, /@property\s+--radar-wave-radius/)
const sourceImage = declarations[0].value

// Build a proposed stylesheet entirely in memory.
const proposed = tree.clone()
const proposedIndex = []
proposed.walkRules((rule) => {
  if (rule.parent.type === 'root' && rule.selector === '.indexGauge') proposedIndex.push(rule)
})
assert.equal(proposedIndex.length, 1)
const card = proposedIndex[0]
const img = card.nodes.find((node) => node.type === 'decl' && node.prop === 'background-image')
img.value = linear
// The isolated stacking context keeps a z-index:-1 background layer below content.
card.insertBefore(img, { prop: 'position', value: 'relative' })
card.insertBefore(img, { prop: 'isolation', value: 'isolate' })
const overlay = postcss.rule({ selector: '.indexGauge::before' })
for (const [prop, value] of [
  ['content', "''"],
  ['position', 'absolute'],
  ['z-index', '-1'],
  ['inset', '0'],
  ['border-radius', 'inherit'],
  ['background-image', radial],
  ['pointer-events', 'none'],
]) overlay.append({ prop, value })
card.after(overlay)
const proposedCss = proposed.toString()
assert.ok(source.includes(sourceImage))
assert.ok(!proposedCss.includes(sourceImage), 'unsplit background still exists')
assert.ok(proposedCss.includes('@property --radar-wave-radius'), 'radar registration lost')

function tryTransform(label, css) {
  const plugin = w3cApprovedCssPilots()
  try {
    const result = plugin.transform.call({
      error: (message) => { throw new Error(String(message)) },
    }, css, cssFile)
    assert.ok(result && typeof result.code === 'string', 'pilot did not transform ProjectOverviewPage')
    return { label, status: 'pass', code: result.code }
  } catch (error) {
    return { label, status: 'reject', error: String(error?.message ?? error) }
  }
}

const baseline = tryTransform('current-source', source)
const candidate = tryTransform('proposed-split', proposedCss)
if (candidate.status === 'pass') {
  const output = postcss.parse(candidate.code)
  const seen = { linear: false, radial: false }
  output.walkRules((rule) => {
    if (rule.selector === '.indexGauge') {
      seen.linear ||= rule.nodes.some((n) => n.type === 'decl' && n.prop === 'background-image' && n.value.includes('var(--gauge-surface-start)'))
    }
    if (rule.selector === '.indexGauge::before') {
      seen.radial ||= rule.nodes.some((n) => n.type === 'decl' && n.prop === 'background-image' && n.value.includes('var(--gauge-accent)'))
    }
  })
  if (!seen.linear || !seen.radial || !candidate.code.includes('@property --radar-wave-radius')) {
    candidate.status = 'reject'
    candidate.error = `transformed output lost: linear=${seen.linear}, radial=${seen.radial}, @property=${candidate.code.includes('@property --radar-wave-radius')}`
  }
}

const report = {
  stage: 26,
  source: 'src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css',
  mode: 'read-only virtual CSS; runs real Vite CSS pilot, no network or build',
  baseline: { status: baseline.status, ...(baseline.error ? { error: baseline.error } : {}) },
  candidate: { status: candidate.status, ...(candidate.error ? { error: candidate.error } : {}) },
  readyForSourcePatch: baseline.status === 'pass' && candidate.status === 'pass',
}
mkdirSync(reportDir, { recursive: true })
writeFileSync(join(reportDir, 'stage26-preflight.json'), `${JSON.stringify(report, null, 2)}\n`)
const lines = [
  '# HelmSight — Stage 26 indexGauge source preflight', '',
  '- Source and production CSS were not modified.',
  '- The real `w3cApprovedCssPilots()` transform was exercised on both source variants.',
  '- Stage 25 already validated the proposed layer split in temporary production CSS.', '',
  '| Variant | Vite pilot | Detail |', '|---|---|---|',
]
for (const item of [baseline, candidate]) {
  lines.push(`| ${item.label} | ${item.status.toUpperCase()} | ${(item.error ?? 'Retains expected CSS').replaceAll('|', '\\|').replaceAll('\n', ' ')} |`)
}
lines.push('', `**Ready for source patch:** ${report.readyForSourcePatch ? 'YES' : 'NO'}`, '',
  'If rejected, inspect the exact error before changing the strict allowlist; do not bypass it.', '')
writeFileSync(join(reportDir, 'stage26-preflight.md'), lines.join('\n'))
console.log(`Baseline CSS pilot: ${baseline.status.toUpperCase()}`)
console.log(`Proposed CSS pilot: ${candidate.status.toUpperCase()}`)
if (candidate.error) console.log(`Reason: ${candidate.error}`)
console.log('Saved: w3c-audit/stage26-preflight.md and .json')
console.log(report.readyForSourcePatch ? 'STAGE 26 PREFLIGHT PASS' : 'STAGE 26 PREFLIGHT REJECTED')
if (!report.readyForSourcePatch) process.exitCode = 1
