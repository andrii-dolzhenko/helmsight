#!/usr/bin/env node
/**
 * W3C CSS3+SVG diagnostic probe for isolated production gradient declarations.
 * Does NOT change source, compiled CSS, or existing all-assets audit results.
 * An isolated declaration has no complete theme/cascade and is NOT visual QA.
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validate } from './w3c-css-audit.mjs'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

export const PROBES = [
  { prefix: 'MetricsPage-', className: 'indexCard', property: 'background-image' },
  { prefix: 'MetricsPage-', className: 'indexState', property: 'background-color' },
  { prefix: 'ProjectOverviewPage-', className: 'healthHero', property: 'background-image' },
  { prefix: 'ProjectOverviewPage-', className: 'indexGauge', property: 'background-image' },
  { prefix: 'ProjectOverviewPage-', className: 'gaugeRing', property: 'background-image' },
  { prefix: 'ProjectOverviewPage-', className: 'radarPulse', property: 'background-image' },
]

function hasClass(selector, className) {
  // Vite CSS Modules may output ._indexCard_hash or .indexCard_hash.
  // Do not match .indexCardSomething by substring.
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\._?${escaped}(?:_[\\w-]+)?(?=[^\\w-]|$)`).test(selector)
}

export function isolate(css, target) {
  const root = postcss.parse(css)
  const matches = []
  root.walkDecls(target.property, (decl) => {
    if (decl.parent?.type === 'rule' && hasClass(decl.parent.selector, target.className)) {
      matches.push({ selector: decl.parent.selector, value: decl.value })
    }
  })
  const unique = [...new Set(matches.map((d) => d.value))]
  if (unique.length !== 1) {
    throw new Error(`${target.className}.${target.property}: expected one distinct production value, found ${unique.length}`)
  }
  return { ...target, value: unique[0], selector: matches[0].selector,
    snippet: `.w3cProbe { ${target.property}: ${unique[0]}; }` }
}

export function parseProbeArgs(args) {
  const options = { dryRun: false, max: PROBES.length }
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg.startsWith('--max=')) {
      const n = Number(arg.slice(6))
      if (!Number.isSafeInteger(n) || n < 1 || n > PROBES.length) throw new Error(`--max must be 1..${PROBES.length}`)
      options.max = n
    } else throw new Error(`Unsupported option: ${arg}`)
  }
  return options
}

function markdown(report) {
  const lines = [
    '# W3C isolated background declaration probes', '',
    'Profile: `css3svg`; warnings: `1`; generated: ' + report.generatedAt, '',
    '**Diagnostic only.** These standalone probes are not the HelmSight production stylesheet and cannot validate runtime rendering.', '',
    '| Production asset / selector | Property | Errors | Warnings | Result |',
    '|---|---|---:|---:|---|',
  ]
  for (const item of report.results) {
    lines.push(`| ${item.file} / ${item.className} | ${item.property} | ${item.errors ?? '—'} | ${item.warnings ?? '—'} | ${item.status} |`)
  }
  for (const item of report.results) {
    lines.push('', `## ${item.file} — ${item.className}`, '', 'Isolated input:', '', '```css', item.snippet, '```', '')
    for (const entry of item.errorDetails ?? []) lines.push(`- W3C error (line ${entry.line ?? '?'}): ${entry.message}`)
    for (const entry of item.warningDetails ?? []) lines.push(`- W3C warning (line ${entry.line ?? '?'}): ${entry.message}`)
    if (item.failure) lines.push(`- UNVERIFIED: ${item.failure}`)
  }
  return `${lines.join('\n')}\n`
}

export async function probe({ root = process.cwd(), options = {}, fetcher = fetch, delayMs = 1600 } = {}) {
  const assetsDir = join(resolve(root), 'dist/assets')
  if (!existsSync(assetsDir)) throw new Error('dist/assets is missing; run npm run build')
  const assets = readdirSync(assetsDir).filter((name) => name.endsWith('.css'))
  const targets = PROBES.slice(0, options.max ?? PROBES.length)
  const cases = targets.map((target) => {
    const found = assets.filter((name) => name.startsWith(target.prefix))
    if (found.length !== 1) throw new Error(`${target.prefix}: expected exactly one CSS asset, found ${found.length}`)
    return { ...isolate(readFileSync(join(assetsDir, found[0]), 'utf8'), target), file: found[0] }
  })
  if (options.dryRun) {
    for (const item of cases) console.log(`DRY ${item.file} ${item.className} ${item.property}: ${item.value}`)
    console.log(`Dry run: ${cases.length} probes; no network or reports were written.`)
    return null
  }
  const report = { generatedAt: new Date().toISOString(), profile: 'css3svg', warningLevel: '1', results: [] }
  let lastRequest = 0
  for (const [index, item] of cases.entries()) {
    const wait = Math.max(0, delayMs - (Date.now() - lastRequest))
    if (wait) await sleep(wait)
    lastRequest = Date.now()
    console.log(`PROBE ${index + 1}/${cases.length} ${item.file} — ${item.className}.${item.property}`)
    try {
      const result = await validate(item.snippet, fetcher, '1')
      const status = result.errors || result.warnings || !result.valid ? 'issues' : 'pass'
      report.results.push({ ...item, ...result, status })
      console.log(`  ${status.toUpperCase()}: ${result.errors} errors, ${result.warnings} warnings`)
    } catch (error) {
      report.results.push({ ...item, status: 'unverified', failure: error.message })
      console.log(`  UNVERIFIED: ${error.message}`)
    }
  }
  const dir = join(resolve(root), 'w3c-audit')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'gradient-probes.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(join(dir, 'gradient-probes.md'), markdown(report))
  console.log('Diagnostic files: w3c-audit/gradient-probes.json and w3c-audit/gradient-probes.md')
  return report
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invoked) {
  try {
    const options = parseProbeArgs(process.argv.slice(2))
    const report = await probe({ options })
    if (report?.results.some((r) => r.status === 'unverified')) process.exitCode = 1
  } catch (error) {
    console.error(`W3C gradient probe: ${error.message}`)
    process.exitCode = 1
  }
}
