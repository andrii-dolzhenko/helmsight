#!/usr/bin/env node
/**
 * Stage 24: isolate the two indexGauge gradient layers without changing src/ or dist/.
 * All probes exclude the separately identified @property validator diagnostic.
 * Full CSS is cloned for each independent SOAP request (no source writes).
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join, resolve } from 'node:path'
import { validate, PROFILE } from './w3c-css-audit.mjs'

const postcss = createRequire(import.meta.url)('postcss')
const rootDir = resolve(import.meta.dirname, '..')
const dryRun = process.argv.slice(2).includes('--dry-run')
assert.ok(process.argv.slice(2).every((arg) => arg === '--dry-run'), 'only --dry-run is supported')
const assetsDir = join(rootDir, 'dist/assets')
assert.ok(existsSync(assetsDir), 'dist/assets not found: run npm run build')
const assets = readdirSync(assetsDir).filter((name) => /^ProjectOverviewPage-.*\.css$/.test(name))
assert.equal(assets.length, 1, 'expected exactly one production ProjectOverviewPage CSS asset')
const file = join(assetsDir, assets[0])
const source = readFileSync(file, 'utf8')
const sha256 = createHash('sha256').update(source).digest('hex')
const stage23Path = join(rootDir, 'w3c-audit/stage23-isolation.json')
assert.ok(existsSync(stage23Path), 'Stage 23 evidence missing: run Stage 23 isolation first')
const stage23 = JSON.parse(readFileSync(stage23Path, 'utf8'))
assert.equal(stage23.sha256, sha256, 'CSS asset changed since Stage 23; re-run Stage 23 before comparing')
assert.equal(stage23.probes.find((p) => p.name === 'without-registration')?.errors, 1,
  'Stage 23 must establish one remaining error without @property')
assert.equal(stage23.probes.find((p) => p.name === 'without-registration-and-index-gauge-image')?.errors, 0,
  'Stage 23 must establish zero errors without @property and gauge image')
const originalRoot = postcss.parse(source, { from: file })

function topLevelLayers(value) {
  const layers = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '(') depth++
    else if (char === ')') {
      depth--
      assert.ok(depth >= 0, 'unexpected close parenthesis')
    } else if (char === ',' && depth === 0) {
      layers.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  assert.equal(depth, 0, 'unbalanced gradient parentheses')
  layers.push(value.slice(start).trim())
  return layers
}

// The two dynamic production gradient layers are tested independently.
const reference = originalRoot.clone()
let registrations = 0
reference.walkAtRules('property', (rule) => {
  if (rule.params.trim() === '--radar-wave-radius') {
    registrations++
    rule.remove()
  }
})
assert.equal(registrations, 1, 'expected one typed radar property')
const selector = /^\._indexGauge_[\w-]+$/
let gaugeRules = 0
let gaugeImage
reference.walkRules((rule) => {
  if (rule.parent.type !== 'root' || !selector.test(rule.selector)) return
  gaugeRules++
  rule.walkDecls('background-image', (decl) => {
    assert.equal(gaugeImage, undefined, 'duplicate gauge background-image')
    gaugeImage = decl.value
  })
})
assert.equal(gaugeRules, 1, 'expected one compiled top-level .indexGauge rule')
assert.ok(gaugeImage, 'compiled .indexGauge background-image missing')
const layers = topLevelLayers(gaugeImage)
assert.equal(layers.length, 2, 'expected exactly two gradient layers')
assert.match(layers[0], /^radial-gradient\(/)
assert.match(layers[1], /^linear-gradient\(/)
assert.match(layers[0], /color-mix\(/)
assert.match(layers[1], /var\(--gauge-surface-start\)/)
const radialLiteral = 'radial-gradient(circle at 14% 8%, rgb(0 0 0 / 8%), transparent 42%)'
const linearLiteral = 'linear-gradient(145deg, #e7e7e7, #ffffff)'

const cases = [
  ['original-layers', layers.join(', ')],
  ['radial-only', layers[0]],
  ['linear-only', layers[1]],
  ['radial-literal-only', radialLiteral],
  ['linear-literal-only', linearLiteral],
  ['radial-original-linear-literal', `${layers[0]}, ${linearLiteral}`],
  ['radial-literal-linear-original', `${radialLiteral}, ${layers[1]}`],
  ['both-literal', `${radialLiteral}, ${linearLiteral}`],
]

function makeVariant(name, value) {
  const tree = reference.clone()
  let changes = 0
  tree.walkRules((rule) => {
    if (rule.parent.type !== 'root' || !selector.test(rule.selector)) return
    rule.walkDecls('background-image', (decl) => {
      decl.value = value
      changes++
    })
  })
  assert.equal(changes, 1, `${name} must edit exactly one declaration`)
  const css = tree.toString()
  assert.ok(css.length > 1000, 'unexpectedly truncated CSS')
  assert.ok(!css.includes('@property --radar-wave-radius'), 'only diagnostic copies may remove @property')
  assert.ok(css.includes(value), `${name} replacement missing`)
  return { name, css }
}

if (dryRun) {
  for (const [name, value] of cases) {
    const variant = makeVariant(name, value)
    console.log(`DRY RUN: ${name}: ${variant.css.length} bytes; ${value.length}-char gradient`)
  }
  console.log(`DRY RUN PASS: verified Stage 23 SHA-256 ${sha256}; no network, src/ or dist/ changes`)
} else {
  const outputDir = join(rootDir, 'w3c-audit')
  const output = {
    stage: 24,
    asset: basename(file),
    sha256,
    profile: PROFILE,
    note: 'Temporary W3C input only; @property removed from every probe; source/build unchanged. Literal colors are DIAGNOSTIC only.',
    probes: [],
  }
  function save() {
    mkdirSync(outputDir, { recursive: true })
    writeFileSync(join(outputDir, 'stage24-gauge-isolation.json'), `${JSON.stringify(output, null, 2)}\n`)
    const rows = [
      '# HelmSight — Stage 24 indexGauge gradient isolation', '',
      `- Asset: \`${output.asset}\``,
      `- SHA-256: \`${sha256}\` (matched Stage 23)`,
      `- Profile: \`${PROFILE}\``,
      '- All variants exclude @property only in the temporary validator input.',
      '- Literal color probes are **diagnostic** and are not proposed production styling.',
      '- No source code or production build is modified.', '',
      '| Probe | Errors | Warnings | Status |',
      '|---|---:|---:|---|',
    ]
    for (const p of output.probes) {
      rows.push(`| ${p.name} | ${p.errors ?? '—'} | ${p.warnings ?? '—'} | ${p.failure ? 'UNVERIFIED' : (p.errors === 0 ? '0 errors' : 'errors present')} |`)
    }
    rows.push('', '## W3C diagnostics', '')
    for (const p of output.probes) {
      rows.push(`### ${p.name}`)
      if (p.failure) rows.push(`- UNVERIFIED: ${p.failure}`)
      for (const issue of p.errorDetails ?? []) rows.push(`- ${issue.message ?? '(no message)'}`)
      if (!p.failure && !p.errorDetails?.length) rows.push('- No errors')
      rows.push('')
    }
    rows.push('Associations detected by removing/replacing CSS do not independently establish invalid source syntax.', '')
    writeFileSync(join(outputDir, 'stage24-gauge-isolation.md'), rows.join('\n'))
  }
  let previousStarted = 0
  for (const [name, value] of cases) {
    const variant = makeVariant(name, value)
    if (previousStarted) await new Promise((done) => setTimeout(done, Math.max(0, 1600 - (Date.now() - previousStarted))))
    previousStarted = Date.now()
    console.log(`W3C ${name}...`)
    try {
      const result = await validate(variant.css)
      output.probes.push({ name, ...result })
      console.log(`  ${result.errors} errors; ${result.warnings} warnings`)
    } catch (error) {
      output.probes.push({ name, failure: String(error?.message ?? error) })
      console.log(`  UNVERIFIED: ${error?.message ?? error}`)
    }
    save()
  }
  console.log('Saved: w3c-audit/stage24-gauge-isolation.md and .json')
  if (output.probes.some((probe) => probe.failure)) process.exitCode = 1
}
