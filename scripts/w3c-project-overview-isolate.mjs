#!/usr/bin/env node
/**
 * Stage 23: isolate remaining W3C CSS diagnostics without changing src/ or dist/.
 * Runs independent, temporary variants of the actual Vite-produced CSS.
 * The public validator is queried at least 1600ms apart.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join, resolve } from 'node:path'
import { validate, PROFILE } from './w3c-css-audit.mjs'

const postcss = createRequire(import.meta.url)('postcss')
const projectRoot = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const cssArg = args.find((arg) => arg.startsWith('--css='))?.slice('--css='.length)
for (const arg of args) {
  if (arg !== '--dry-run' && !arg.startsWith('--css=')) {
    throw new Error(`Unsupported argument: ${arg} (use --dry-run or --css=/path/to/file.css)`)
  }
}
const cssDir = join(projectRoot, 'dist/assets')
const cssPath = cssArg
  ? resolve(cssArg)
  : (() => {
      assert.ok(existsSync(cssDir), 'dist/assets not found; run npm run build')
      const files = readdirSync(cssDir).filter((name) => /^ProjectOverviewPage-.*\.css$/.test(name))
      assert.equal(files.length, 1, 'expected exactly one built ProjectOverviewPage CSS asset')
      return join(cssDir, files[0])
    })()

const original = readFileSync(cssPath, 'utf8')
const originalTree = postcss.parse(original, { from: cssPath })
const fileHash = createHash('sha256').update(original).digest('hex')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

function withoutRegistration(tree) {
  let changes = 0
  tree.walkAtRules('property', (node) => {
    if (node.params.trim() !== '--radar-wave-radius') return
    node.remove()
    changes++
  })
  assert.equal(changes, 1, 'registered radar property must occur once')
  return changes
}

function withoutBackground(tree, name) {
  let rules = 0
  let changes = 0
  const selector = new RegExp(`^\\._${name}_[\\w-]+$`)
  tree.walkRules((rule) => {
    if (rule.parent.type !== 'root' || !selector.test(rule.selector)) return
    rules++
    rule.walkDecls('background-image', (decl) => {
      decl.remove()
      changes++
    })
  })
  assert.equal(rules, 1, `expected exactly one top-level .${name} production rule`)
  assert.equal(changes, 1, `expected exactly one .${name} background-image`)
  return changes
}

function withoutEveryBackground(tree) {
  let changes = 0
  tree.walkDecls('background-image', (node) => {
    node.remove()
    changes++
  })
  assert.ok(changes > 0, 'no background-image declarations found')
  return changes
}

const variants = {
  baseline: () => 0,
  'without-registration': withoutRegistration,
  'without-radar-background-image': (tree) => withoutBackground(tree, 'radarPulse'),
  'without-registration-and-radar-image': (tree) =>
    withoutRegistration(tree) + withoutBackground(tree, 'radarPulse'),
  'without-registration-and-index-gauge-image': (tree) =>
    withoutRegistration(tree) + withoutBackground(tree, 'indexGauge'),
  'without-registration-and-gauge-ring-image': (tree) =>
    withoutRegistration(tree) + withoutBackground(tree, 'gaugeRing'),
  'without-registration-and-any-background-images': (tree) =>
    withoutRegistration(tree) + withoutEveryBackground(tree),
}

const output = {
  stage: 23,
  asset: basename(cssPath),
  sha256: fileHash,
  profile: PROFILE,
  mode: 'diagnostic variants only; source/build untouched',
  generatedAt: new Date().toISOString(),
  probes: [],
}
const outputDir = join(projectRoot, 'w3c-audit')
const jsonPath = join(outputDir, 'stage23-isolation.json')
const mdPath = join(outputDir, 'stage23-isolation.md')

function save() {
  mkdirSync(outputDir, { recursive: true })
  output.generatedAt = new Date().toISOString()
  writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n')
  const lines = [
    '# HelmSight — Stage 23 W3C isolation', '',
    `- Asset: \`${output.asset}\``,
    `- SHA-256: \`${output.sha256}\``,
    `- Validator profile: \`${output.profile}\``,
    '- Note: probes are sent from memory; no project CSS is modified.', '',
    '| Probe | Removed declarations/rules | Errors | Warnings | Result |',
    '|---|---:|---:|---:|---|',
  ]
  for (const p of output.probes) {
    lines.push(`| ${p.name} | ${p.removed} | ${p.errors ?? '—'} | ${p.warnings ?? '—'} | ${p.status} |`)
  }
  lines.push('', '## Error details', '')
  for (const p of output.probes) {
    lines.push(`### ${p.name}`)
    if (p.failure) lines.push(`- UNVERIFIED: ${p.failure}`)
    for (const item of p.errorDetails ?? []) lines.push(`- ${item.message || '[no details]'}`)
    if (!p.failure && !p.errorDetails?.length) lines.push('- No errors reported')
    lines.push('')
  }
  lines.push('A lower error count in a stripped diagnostic copy does not prove that the original CSS was invalid.', '')
  writeFileSync(mdPath, lines.join('\n'))
}

function prepare(name) {
  const tree = originalTree.clone()
  const removed = variants[name](tree)
  const css = tree.toString()
  if (name === 'baseline') assert.equal(css, original, 'baseline must preserve all original bytes')
  else assert.notEqual(css, original, `${name} must change the CSS`)
  return { name, removed, css }
}

if (dryRun) {
  for (const name of Object.keys(variants)) {
    const item = prepare(name)
    console.log(`DRY RUN: ${name}: ${item.removed} removals, CSS length ${item.css.length}`)
  }
  console.log('DRY RUN PASS: no network calls; src/, dist/ and reports unchanged')
} else {
  let lastStartedAt = 0
  const run = async (name) => {
    const item = prepare(name)
    const remaining = Math.max(0, 1600 - (Date.now() - lastStartedAt))
    if (lastStartedAt && remaining) await pause(remaining)
    lastStartedAt = Date.now()
    console.log(`W3C ${name}: ${item.removed} removals`)
    try {
      const result = await validate(item.css)
      const status = result.errors === 0 ? '0 errors' : 'errors present'
      output.probes.push({ name, removed: item.removed, status, ...result })
      console.log(`  ${result.errors} errors, ${result.warnings} warnings`)
    } catch (err) {
      const failure = String(err.message ?? err)
      output.probes.push({ name, removed: item.removed, status: 'unverified', failure })
      console.log(`  UNVERIFIED: ${failure}`)
    }
    save()
  }

  await run('baseline')
  await run('without-registration')
  await run('without-radar-background-image')
  await run('without-registration-and-radar-image')
  const core = output.probes.at(-1)
  if (!core || core.status === 'unverified' || core.errors !== 0) {
    console.log('The two suspected constructs did not explain all results; running three fallback probes.')
    await run('without-registration-and-index-gauge-image')
    await run('without-registration-and-gauge-ring-image')
    await run('without-registration-and-any-background-images')
  }
  console.log(`Results: ${jsonPath}`)
  console.log(`Summary: ${mdPath}`)
  if (output.probes.some((item) => item.status === 'unverified')) process.exitCode = 1
}
