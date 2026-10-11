#!/usr/bin/env node
/**
 * Stage 17: W3C diagnostic inventory of every literal gradient declaration
 * in the two remaining error-bearing production CSS chunks.
 * Read-only for dist and source. Isolated declarations do not prove full CSS validity.
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validate } from './w3c-css-audit.mjs'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const GRADIENT = /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i
export const TARGETS = ['MetricsPage', 'ProjectOverviewPage']

export function inventory(css, file) {
  const found = []
  const seen = new Set()
  const root = postcss.parse(css, { from: file })
  root.walkDecls((declaration) => {
    if (!['background', 'background-image'].includes(declaration.prop) || !GRADIENT.test(declaration.value)) return
    const selector = declaration.parent?.type === 'rule' ? declaration.parent.selector : ''
    if (!selector) return
    // Deduplicate the exact same declaration, but retain distinct selector and value variants.
    const key = JSON.stringify([selector, declaration.prop, declaration.value])
    if (seen.has(key)) return
    seen.add(key)
    found.push({ file, selector, property: declaration.prop, value: declaration.value,
      snippet: `.w3cProbe { ${declaration.prop}: ${declaration.value}; }` })
  })
  return found
}

export function parseInventoryArgs(args) {
  const options = { dryRun: false, only: null, max: 50 }
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg.startsWith('--only=')) {
      const value = arg.slice('--only='.length)
      if (!TARGETS.includes(value)) throw new Error(`--only must be ${TARGETS.join(' or ')}`)
      options.only = value
    } else if (arg.startsWith('--max=')) {
      const max = Number(arg.slice('--max='.length))
      if (!Number.isSafeInteger(max) || max < 1 || max > 50) throw new Error('--max must be 1..50')
      options.max = max
    } else throw new Error(`Unsupported option: ${arg}`)
  }
  return options
}

const tableCell = (text) => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ')
function markdown(report) {
  const out = [
    '# HelmSight — Stage 17 gradient inventory', '',
    `W3C profile: \`${report.profile}\`; warning level: \`${report.warningLevel}\`; generated: ${report.generatedAt}`, '',
    '**Diagnostic only.** Each CSS declaration is submitted in isolation, not in its real cascade.',
    'A successful probe does not establish full stylesheet validity or cross-browser rendering.', '',
    '| File | Selector | Property | Errors | Warnings | Result |',
    '|---|---|---|---:|---:|---|',
  ]
  for (const item of report.results) {
    out.push(`| ${tableCell(item.file)} | \`${tableCell(item.selector)}\` | ${item.property} | ${item.errors ?? '—'} | ${item.warnings ?? '—'} | ${item.status} |`)
  }
  for (const [index, item] of report.results.entries()) {
    out.push('', `## ${index + 1}. ${item.file}: ${item.selector}`, '', '```css', item.snippet, '```')
    for (const error of item.errorDetails ?? []) out.push(`- ERROR: ${error.message}`)
    for (const warning of item.warningDetails ?? []) out.push(`- WARNING: ${warning.message}`)
    if (item.failure) out.push(`- UNVERIFIED: ${item.failure}`)
  }
  return out.join('\n') + '\n'
}

export async function runInventory({ root = process.cwd(), options = {}, fetcher = fetch, delayMs = 1600 } = {}) {
  const project = resolve(root)
  const dir = join(project, 'dist/assets')
  if (!existsSync(dir)) throw new Error('dist/assets not found; run npm run build first')
  const filenames = readdirSync(dir).filter((name) => name.endsWith('.css'))
  const selected = TARGETS.filter((name) => !options.only || name === options.only)
  const cases = selected.flatMap((name) => {
    const matches = filenames.filter((file) => file.startsWith(`${name}-`))
    if (matches.length !== 1) throw new Error(`${name}: expected exactly one production CSS asset, found ${matches.length}`)
    return inventory(readFileSync(join(dir, matches[0]), 'utf8'), matches[0])
  })
  if (!cases.length) throw new Error('No literal gradient declarations found in selected assets')
  if (cases.length > 50) throw new Error(`Unexpected gradient count ${cases.length}; review before sending public API requests`)
  const work = cases.slice(0, options.max ?? 50)
  if (options.dryRun) {
    for (const [index, item] of work.entries()) console.log(`DRY ${index + 1}/${work.length} ${item.file} ${item.selector}: ${item.property} = ${item.value}`)
    console.log(`Dry run: ${work.length} of ${cases.length} declarations; no network requests or report changes`)
    return null
  }
  const report = { generatedAt: new Date().toISOString(), profile: 'css3svg', warningLevel: '1',
    totalFound: cases.length, selected: work.length, results: [] }
  let lastRequest = 0
  for (const [index, item] of work.entries()) {
    const wait = Math.max(0, delayMs - (Date.now() - lastRequest))
    if (wait) await sleep(wait)
    lastRequest = Date.now()
    console.log(`INVENTORY ${index + 1}/${work.length} ${item.file} ${item.selector} (${item.property})`)
    try {
      const answer = await validate(item.snippet, fetcher, '1')
      const status = answer.errors || answer.warnings || !answer.valid ? 'issues' : 'pass'
      report.results.push({ ...item, ...answer, status })
      console.log(`  ${status.toUpperCase()}: errors=${answer.errors}, warnings=${answer.warnings}`)
    } catch (error) {
      report.results.push({ ...item, status: 'unverified', failure: error.message })
      console.log(`  UNVERIFIED: ${error.message}`)
    }
  }
  const output = join(project, 'w3c-audit')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'gradient-inventory.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(join(output, 'gradient-inventory.md'), markdown(report))
  console.log('Diagnostic files: w3c-audit/gradient-inventory.json and w3c-audit/gradient-inventory.md')
  return report
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = await runInventory({ options: parseInventoryArgs(process.argv.slice(2)) })
    if (result?.results.some((row) => row.status === 'unverified')) process.exitCode = 1
  } catch (error) {
    console.error(`W3C gradient inventory: ${error.message}`)
    process.exitCode = 1
  }
}
