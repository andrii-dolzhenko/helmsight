#!/usr/bin/env node
/**
 * Stage 15: compare deliberately simplified versions of three W3C-failing
 * gradients. Diagnostic only: does not modify or validate production CSS.
 * Every variant is derived from the exact compiled declaration and uses
 * explicit replacement preconditions so design changes cannot go unnoticed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isolate, PROBES } from './w3c-gradient-probe.mjs'
import { validate } from './w3c-css-audit.mjs'

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const targets = ['indexCard', 'indexGauge', 'gaugeRing']

function replaceExact(value, needle, replacement, expected = 1) {
  const pieces = value.split(needle)
  if (pieces.length - 1 !== expected) {
    throw new Error(`Expected ${expected} occurrence(s) of ${JSON.stringify(needle)}, found ${pieces.length - 1}`)
  }
  return pieces.join(replacement)
}

function splitLayers(value) {
  const layers = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    if (value[i] === ')') depth--
    if (depth < 0) throw new Error('Unbalanced gradient parentheses')
    if (value[i] === ',' && depth === 0) {
      layers.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  if (depth !== 0) throw new Error('Unbalanced gradient parentheses')
  layers.push(value.slice(start).trim())
  return layers
}

const accent = '#228b63'
const surface = '#f5f7f5'
const canvas = '#ffffff'
const track = '#d8e4dd'

export function variantsFor(target, value) {
  const variants = [['original-control', value]]
  if (target === 'indexCard') {
    const mixed = 'color-mix(in srgb,var(--index-accent) 8%,var(--color-surface))'
    variants.push(['static-accent-mix', replaceExact(value, mixed, accent)])
    variants.push(['static-surface-vars', replaceExact(value, 'var(--color-surface)', surface, 2)])
    variants.push(['static-gradient', 'linear-gradient(90deg,#228b63,#f5f7f5 48%)'])
    variants.push(['constant-nested-color-mix', 'linear-gradient(90deg,color-mix(in srgb,red 8%,white),white 48%)'])
  } else if (target === 'indexGauge') {
    const [radial, linear, ...rest] = splitLayers(value)
    if (!radial?.startsWith('radial-gradient(') || !linear?.startsWith('linear-gradient(') || rest.length) {
      throw new Error('indexGauge no longer contains the expected radial and linear layers')
    }
    variants.push(['radial-only', radial])
    variants.push(['linear-only', linear])
    variants.push(['radial-static-color-mix', replaceExact(radial,
      'color-mix(in srgb, var(--gauge-accent) 8%, transparent)', accent)])
    variants.push(['linear-static-colors', replaceExact(replaceExact(linear,
      'color-mix(in srgb, var(--color-surface) 76%, var(--color-canvas))', surface),
      'var(--color-surface)', canvas)])
  } else if (target === 'gaugeRing') {
    const dynamicAccent = 'color-mix(in srgb, var(--gauge-accent) 82%, white)'
    variants.push(['static-accent-only', replaceExact(value, dynamicAccent, accent)])
    variants.push(['static-progress-only', replaceExact(value, 'var(--gauge-progress)', '65%', 2)])
    const staticAccent = replaceExact(value, dynamicAccent, accent)
    const staticProgress = replaceExact(staticAccent, 'var(--gauge-progress)', '65%', 2)
    variants.push(['all-runtime-values-static', replaceExact(staticProgress, 'var(--gauge-track)', track)])
    variants.push(['minimal-conic', 'conic-gradient(red,blue)'])
    variants.push(['minimal-conic-stops', 'conic-gradient(from 0deg,#228b63 0 65%,#d8e4dd 65% 100%)'])
  } else throw new Error(`Unsupported gradient target ${target}`)
  return variants.map(([variant, candidate]) => ({ target, variant, value: candidate }))
}

export function parseMatrixArgs(args) {
  const options = { dryRun: false, only: null, max: Infinity }
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg.startsWith('--only=')) {
      const value = arg.slice('--only='.length)
      if (!targets.includes(value)) throw new Error(`--only must be ${targets.join(', ')}`)
      options.only = value
    } else if (arg.startsWith('--max=')) {
      const max = Number(arg.slice(6))
      if (!Number.isSafeInteger(max) || max < 1 || max > 16) throw new Error('--max must be 1..16')
      options.max = max
    } else throw new Error(`Unsupported option: ${arg}`)
  }
  return options
}

function makeMarkdown(report) {
  const lines = [
    '# HelmSight — W3C gradient differential matrix', '',
    'Profile: `css3svg`; warnings: `1` (Normal); generated: ' + report.generatedAt, '',
    '**Diagnostic only:** synthetic variations are deliberately NOT design-equivalent. Never copy their colors or stop positions into production CSS without independent design review.', '',
    '| Target | Variant | Errors | Warnings | Status |',
    '|---|---|---:|---:|---|',
  ]
  for (const row of report.results) {
    lines.push(`| ${row.target} | ${row.variant} | ${row.errors ?? '—'} | ${row.warnings ?? '—'} | ${row.status} |`)
  }
  for (const row of report.results) {
    lines.push('', `## ${row.target} — ${row.variant}`, '', '```css', row.snippet, '```', '')
    for (const entry of row.errorDetails ?? []) lines.push(`- W3C error: ${entry.message}`)
    for (const entry of row.warningDetails ?? []) lines.push(`- W3C warning: ${entry.message}`)
    if (row.failure) lines.push(`- UNVERIFIED: ${row.failure}`)
  }
  return `${lines.join('\n')}\n`
}

export async function runMatrix({ root = process.cwd(), options = {}, fetcher = fetch, delayMs = 1600 } = {}) {
  const assetsDir = join(resolve(root), 'dist/assets')
  if (!existsSync(assetsDir)) throw new Error('dist/assets missing; run npm run build')
  const assets = readdirSync(assetsDir).filter((name) => name.endsWith('.css'))
  const selected = targets.filter((name) => !options.only || name === options.only)
  const cases = selected.flatMap((target) => {
    const probe = PROBES.find((row) => row.className === target)
    if (!probe) throw new Error(`No source probe for ${target}`)
    const matches = assets.filter((name) => name.startsWith(probe.prefix))
    if (matches.length !== 1) throw new Error(`${probe.prefix}: expected one CSS asset, found ${matches.length}`)
    const { value } = isolate(readFileSync(join(assetsDir, matches[0]), 'utf8'), probe)
    return variantsFor(target, value).map((row) => ({ ...row, file: matches[0], property: probe.property,
      snippet: `.w3cProbe { ${probe.property}: ${row.value}; }` }))
  }).slice(0, options.max ?? Infinity)
  if (options.dryRun) {
    for (const item of cases) console.log(`DRY ${item.target} / ${item.variant}: ${item.snippet}`)
    console.log(`Dry run: ${cases.length} variations; no network, no report changes.`)
    return null
  }
  const report = { generatedAt: new Date().toISOString(), profile: 'css3svg', warningLevel: '1', results: [] }
  let lastRequest = 0
  for (const [index, item] of cases.entries()) {
    const wait = Math.max(0, delayMs - (Date.now() - lastRequest))
    if (wait) await sleep(wait)
    lastRequest = Date.now()
    console.log(`MATRIX ${index + 1}/${cases.length} ${item.target} — ${item.variant}`)
    try {
      const validation = await validate(item.snippet, fetcher, '1')
      const status = validation.errors || validation.warnings || !validation.valid ? 'issues' : 'pass'
      report.results.push({ ...item, ...validation, status })
      console.log(`  ${status.toUpperCase()}: errors=${validation.errors}, warnings=${validation.warnings}`)
    } catch (error) {
      report.results.push({ ...item, status: 'unverified', failure: error.message })
      console.log(`  UNVERIFIED: ${error.message}`)
    }
  }
  const output = join(resolve(root), 'w3c-audit')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'gradient-matrix.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(join(output, 'gradient-matrix.md'), makeMarkdown(report))
  console.log('Diagnostic files: w3c-audit/gradient-matrix.json and w3c-audit/gradient-matrix.md')
  return report
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invoked) {
  try {
    const options = parseMatrixArgs(process.argv.slice(2))
    const report = await runMatrix({ options })
    if (report?.results.some((row) => row.status === 'unverified')) process.exitCode = 1
  } catch (error) {
    console.error(`W3C gradient matrix: ${error.message}`)
    process.exitCode = 1
  }
}
