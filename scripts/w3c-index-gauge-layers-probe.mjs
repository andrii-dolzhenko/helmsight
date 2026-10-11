#!/usr/bin/env node
/**
 * HelmSight Stage 25: probe a two-element indexGauge gradient composition.
 * Diagnostic only: never changes src/, dist/, or the current Vite setup.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join, resolve } from 'node:path'
import { validate, PROFILE } from './w3c-css-audit.mjs'

const postcss = createRequire(import.meta.url)('postcss')
const rootDir = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
assert.ok(args.every((arg) => arg === '--dry-run'), 'only --dry-run is supported')
const dryRun = args.includes('--dry-run')
const assetNames = readdirSync(join(rootDir, 'dist/assets'))
  .filter((name) => /^ProjectOverviewPage-.*\.css$/.test(name))
assert.equal(assetNames.length, 1, 'expected exactly one built ProjectOverviewPage CSS asset')
const asset = assetNames[0]
const original = readFileSync(join(rootDir, 'dist/assets', asset), 'utf8')
const sha256 = createHash('sha256').update(original).digest('hex')
const stage23 = JSON.parse(readFileSync(join(rootDir, 'w3c-audit/stage23-isolation.json'), 'utf8'))
assert.equal(sha256, stage23.sha256,
  'build no longer matches Stage 23: rerun Stage 23/24 before comparing')
const baseTree = postcss.parse(original, { from: asset })
const gaugeSelector = /^\._indexGauge_[\w-]+$/
const gaugeRules = []
baseTree.walkRules((rule) => {
  if (rule.parent.type === 'root' && gaugeSelector.test(rule.selector)) gaugeRules.push(rule)
})
assert.equal(gaugeRules.length, 1, 'expected exactly one compiled indexGauge rule')
const gaugeImage = gaugeRules[0].nodes.filter((node) =>
  node.type === 'decl' && node.prop === 'background-image')
assert.equal(gaugeImage.length, 1, 'expected exactly one indexGauge background-image')

function separateLayers(value) {
  const layers = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === '(') depth++
    if (ch === ')') depth--
    assert.ok(depth >= 0, 'invalid parentheses in background-image')
    if (ch === ',' && depth === 0) {
      layers.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  assert.equal(depth, 0, 'unbalanced parentheses in background-image')
  layers.push(value.slice(start).trim())
  assert.equal(layers.length, 2, 'expected radial + linear background layers')
  assert.match(layers[0], /^radial-gradient\(/)
  assert.match(layers[1], /^linear-gradient\(/)
  return layers
}
const [radial, linear] = separateLayers(gaugeImage[0].value)

function makeVariant(name, { split = false, registration = true }) {
  const tree = baseTree.clone()
  let removedRegistration = 0
  if (!registration) {
    tree.walkAtRules('property', (rule) => {
      if (rule.params.trim() === '--radar-wave-radius') {
        rule.remove()
        removedRegistration++
      }
    })
    assert.equal(removedRegistration, 1, 'expected exactly one radar registration')
  }
  if (split) {
    const rules = []
    tree.walkRules((rule) => {
      if (rule.parent.type === 'root' && gaugeSelector.test(rule.selector)) rules.push(rule)
    })
    assert.equal(rules.length, 1)
    const card = rules[0]
    const imageDecl = card.nodes.find((node) =>
      node.type === 'decl' && node.prop === 'background-image')
    assert.ok(imageDecl)
    imageDecl.value = linear
    // Isolation allows a negative-layer pseudo-element above the card's own background,
    // but below the card content, without adding a child to the CSS grid layout.
    card.append({ prop: 'position', value: 'relative' })
    card.append({ prop: 'isolation', value: 'isolate' })
    const overlay = postcss.rule({ selector: `${card.selector}::before` })
    for (const [prop, value] of [
      ['content', "''"], ['position', 'absolute'], ['z-index', '-1'],
      ['inset', '0'], ['border-radius', 'inherit'],
      ['background-image', radial], ['pointer-events', 'none'],
    ]) overlay.append({ prop, value })
    card.after(overlay)
    assert.equal(overlay.nodes.find((node) => node.prop === 'background-image')?.value, radial)
  }
  const css = tree.toString()
  assert.ok(css.length > 1000)
  if (name === 'baseline') assert.equal(css, original, 'baseline changed unexpectedly')
  if (split) {
    assert.ok(css.includes(linear))
    assert.ok(css.includes(radial))
    assert.ok(css.includes('::before'))
    assert.ok(!css.includes(gaugeImage[0].value), 'unsplit two-layer declaration survived')
  }
  return { name, css, removedRegistration, split }
}

const cases = [
  ['baseline', { split: false, registration: true }],
  ['split-with-registration', { split: true, registration: true }],
  ['split-without-registration', { split: true, registration: false }],
]
const outputDir = join(rootDir, 'w3c-audit')
const output = {
  stage: 25,
  asset,
  sha256,
  profile: PROFILE,
  mode: 'in-memory diagnostic only; no changes to source or build',
  probes: [],
}
function save() {
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(join(outputDir, 'stage25-layering-probe.json'), `${JSON.stringify(output, null, 2)}\n`)
  const lines = [
    '# HelmSight — Stage 25 layered gradient probe', '',
    `- Asset: \`${asset}\``, `- SHA-256: \`${sha256}\``,
    `- Validator profile: \`${PROFILE}\``,
    '- Tested only in memory: project source and production assets remain untouched.',
    '- `split-with-registration` preserves radar animation registration.',
    '- `split-without-registration` removes it only for diagnostic attribution.', '',
    '| Probe | Errors | Warnings | Result |', '|---|---:|---:|---|',
  ]
  for (const probe of output.probes) {
    lines.push(`| ${probe.name} | ${probe.errors ?? '—'} | ${probe.warnings ?? '—'} | ${probe.failure ? 'UNVERIFIED' : probe.errors === 0 ? '0 errors' : 'errors present'} |`)
  }
  lines.push('', '## W3C diagnostics', '')
  for (const probe of output.probes) {
    lines.push(`### ${probe.name}`)
    if (probe.failure) lines.push(`- UNVERIFIED: ${probe.failure}`)
    else if (probe.errorDetails.length === 0) lines.push('- No errors')
    else for (const item of probe.errorDetails) lines.push(`- ${item.message}`)
    lines.push('')
  }
  lines.push('A clean validation of temporary CSS does not substitute for production build, visual QA, or tests.', '')
  writeFileSync(join(outputDir, 'stage25-layering-probe.md'), lines.join('\n'))
}

if (dryRun) {
  for (const [name, options] of cases) {
    const trial = makeVariant(name, options)
    console.log(`DRY RUN: ${name}: ${trial.css.length} bytes`)
  }
  console.log('DRY RUN PASS: no network calls or project file changes')
} else {
  let lastStart = 0
  for (const [name, options] of cases) {
    const trial = makeVariant(name, options)
    if (lastStart) await new Promise((done) =>
      setTimeout(done, Math.max(0, 1600 - (Date.now() - lastStart))))
    lastStart = Date.now()
    console.log(`W3C ${name}...`)
    try {
      const result = await validate(trial.css)
      output.probes.push({ name, ...result })
      console.log(`  ${result.errors} errors, ${result.warnings} warnings`)
    } catch (error) {
      output.probes.push({ name, failure: String(error?.message ?? error) })
      console.log(`  UNVERIFIED: ${error?.message ?? error}`)
    }
    save()
  }
  console.log('Saved: w3c-audit/stage25-layering-probe.md / .json')
  if (output.probes.some((probe) => probe.failure)) process.exitCode = 1
}
