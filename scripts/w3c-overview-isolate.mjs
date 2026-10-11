#!/usr/bin/env node
/**
 * Stage 20: isolate the W3C failure within the real Project Overview radar rule,
 * then search the same production CSS after excluding only that known rule.
 * Diagnostic only: source CSS, dist, and the main W3C report are never edited.
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { minimizeErrorCss } from './w3c-css-repro.mjs'
import { validate } from './w3c-css-audit.mjs'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const MODES = ['radar', 'remaining']

export function parseOverviewArgs(args) {
  const options = { mode: null, max: 24, dryRun: false }
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg.startsWith('--mode=')) {
      options.mode = arg.slice(7)
      if (!MODES.includes(options.mode)) throw new Error('--mode must be radar or remaining')
    } else if (arg.startsWith('--max=')) {
      const value = Number(arg.slice(6))
      if (!Number.isSafeInteger(value) || value < 2 || value > 40) throw new Error('--max must be an integer from 2 to 40')
      options.max = value
    } else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!options.mode) throw new Error('Specify --mode=radar or --mode=remaining')
  return options
}

export function splitOverviewCss(css, file = 'ProjectOverviewPage.css') {
  const root = postcss.parse(css, { from: file })
  const radarRules = root.nodes.filter((node) => node.type === 'rule'
    && /\._radarPulse_[\w-]+/.test(node.selector))
  if (radarRules.length !== 1) {
    throw new Error(`Expected one direct radarPulse rule in ${file}; found ${radarRules.length}`)
  }
  const radar = radarRules[0]
  if (!radar.nodes?.length || radar.nodes.some((node) => node.type !== 'decl')) {
    throw new Error('Radar rule contains unexpected nodes; manual review required')
  }
  const remaining = root.clone()
  const removed = remaining.nodes.filter((node) => node.type === 'rule'
    && node.selector === radar.selector)
  if (removed.length !== 1) throw new Error('Cannot remove exactly one reviewed radar rule')
  removed[0].remove()
  return { radar, remaining: remaining.toString() }
}

const ranges = (items, divisions) => {
  const groups = []
  for (let i = 0; i < divisions; i++) {
    const start = Math.floor(i * items.length / divisions)
    const end = Math.floor((i + 1) * items.length / divisions)
    if (start < end) groups.push({ start, end, slice: items.slice(start, end) })
  }
  return groups
}

/** Preserve the original selector and declaration order while minimizing an error. */
export async function minimizeRadarDeclarations(rule, { check, maxRequests = 24 } = {}) {
  if (typeof check !== 'function') throw new Error('Validator callback required')
  const nodes = [...rule.nodes]
  if (!nodes.length || nodes.some((node) => node.type !== 'decl')) {
    throw new Error('Radar must contain CSS declarations')
  }
  const render = (candidate) => {
    const clone = postcss.rule({ selector: rule.selector })
    for (const node of candidate) clone.append(node.clone())
    return clone.toString()
  }
  const cache = new Map(), checks = []
  let exhausted = false, unverified = false
  const evaluate = async (candidate) => {
    const css = render(candidate)
    if (cache.has(css)) return cache.get(css)
    if (checks.length >= maxRequests) { exhausted = true; return null }
    let answer
    try {
      const result = await check(css)
      if (!Number.isInteger(result.errors) || result.errors < 0
        || !Number.isInteger(result.warnings) || result.warnings < 0) throw new Error('Invalid W3C counts')
      answer = { status: 'verified', errors: result.errors, warnings: result.warnings,
        errorDetails: result.errorDetails ?? [], warningDetails: result.warningDetails ?? [] }
    } catch (error) {
      unverified = true
      answer = { status: 'unverified', errors: null, warnings: null, failure: error.message }
    }
    checks.push({ properties: candidate.map((node) => node.prop), ...answer })
    cache.set(css, answer)
    return answer
  }
  let current = nodes
  const baseline = await evaluate(current)
  if (baseline?.status !== 'verified' || baseline.errors === 0) {
    return { status: baseline?.status === 'verified' ? 'baseline-passed' : 'unverified',
      baseline, final: baseline, declarationsBefore: nodes.length, declarationsAfter: nodes.length,
      css: render(current), checks, retainedProperties: current.map((node) => node.prop) }
  }
  let n = 2
  while (current.length >= 2 && !unverified && !exhausted) {
    const groups = ranges(current, n)
    let changed = false
    for (const group of groups) {
      const complement = [...current.slice(0, group.start), ...current.slice(group.end)]
      if (!complement.length) continue
      const outcome = await evaluate(complement)
      if (!outcome || outcome.status !== 'verified') break
      if (outcome.errors > 0) {
        current = complement
        n = Math.max(2, n - 1)
        changed = true
        break
      }
    }
    if (changed) continue
    if (unverified || exhausted) break
    for (const group of groups) {
      const outcome = await evaluate(group.slice)
      if (!outcome || outcome.status !== 'verified') break
      if (outcome.errors > 0) {
        current = group.slice
        n = Math.max(2, n - 1)
        changed = true
        break
      }
    }
    if (changed) continue
    if (unverified || exhausted || n >= current.length) break
    n = Math.min(current.length, n * 2)
  }
  return { status: unverified ? 'unverified' : exhausted ? 'budget-exhausted' : 'minimized',
    baseline, final: cache.get(render(current)) ?? baseline,
    declarationsBefore: nodes.length, declarationsAfter: current.length,
    css: render(current), checks, retainedProperties: current.map((node) => node.prop) }
}

function report(mode, result, file) {
  const lines = [
    `# HelmSight — Stage 20 ${mode} CSS isolation`, '',
    '**Diagnostic only.** Reduced CSS does not establish full stylesheet validity or browser equivalence.', '',
    `- Production asset: \`${file}\``,
    `- Result: \`${result.status}\``,
    `- Baseline errors/warnings: ${result.baseline?.errors ?? 'unverified'}/${result.baseline?.warnings ?? 'unverified'}`,
    `- Reduced errors/warnings: ${result.final?.errors ?? 'unverified'}/${result.final?.warnings ?? 'unverified'}`,
    `- Requests: ${result.checks.length}`, '',
  ]
  if (mode === 'radar') {
    lines.push(`- Radar declarations: ${result.declarationsBefore} → ${result.declarationsAfter}`,
      `- Retained properties: ${result.retainedProperties.map((prop) => `\`${prop}\``).join(', ')}`, '')
  } else {
    lines.push(`- Remaining top-level rules: ${result.nodesBefore} → ${result.nodesAfter}`, '')
  }
  lines.push('## W3C checks', '', '| # | Errors | Warnings | Status |', '|---:|---:|---:|---|')
  for (let i = 0; i < result.checks.length; i++) {
    const row = result.checks[i]
    lines.push(`| ${i + 1} | ${row.errors ?? '—'} | ${row.warnings ?? '—'} | ${row.status} |`)
  }
  lines.push('', '## Final W3C error details', '')
  for (const detail of result.final?.errorDetails ?? []) lines.push(`- ${detail.message}`)
  if (!result.final?.errorDetails?.length) lines.push('- No error details returned (see JSON and CSS).')
  lines.push('', 'Do not change production CSS until the W3C error source is verified.', '')
  return lines.join('\n')
}

export async function runOverviewIsolation({ root = process.cwd(), options, validator = validate, delayMs = 1600 } = {}) {
  if (!MODES.includes(options?.mode)) throw new Error('Specify --mode=radar or --mode=remaining')
  const assetDir = join(resolve(root), 'dist/assets')
  if (!existsSync(assetDir)) throw new Error('dist/assets missing; first run npm run check')
  const files = readdirSync(assetDir).filter((name) => /^ProjectOverviewPage-.*\.css$/.test(name))
  if (files.length !== 1) throw new Error(`Expected exactly one ProjectOverviewPage CSS asset; found ${files.length}`)
  const file = files[0]
  const { radar, remaining } = splitOverviewCss(readFileSync(join(assetDir, file), 'utf8'), file)
  console.log(`Stage 20 ${options.mode}: ${file}`)
  if (options.dryRun) {
    console.log(`Radar declarations: ${radar.nodes.length}; remaining source characters: ${remaining.length}`)
    console.log('Dry run: no W3C requests, reports, or CSS modifications')
    return null
  }
  let requests = 0
  const check = async (css) => {
    if (requests++ > 0 && delayMs) await sleep(delayMs)
    const result = await validator(css)
    console.log(`  W3C #${requests}: errors=${result.errors}, warnings=${result.warnings}`)
    return result
  }
  const result = options.mode === 'radar'
    ? await minimizeRadarDeclarations(radar, { check, maxRequests: options.max })
    : await minimizeErrorCss(remaining, { file, check, maxRequests: options.max })
  const name = options.mode === 'radar' ? 'stage20-radar' : 'stage20-overview-remaining'
  const output = join(resolve(root), 'w3c-audit')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, `${name}.css`), result.css + '\n')
  const { css: _css, ...json } = result
  writeFileSync(join(output, `${name}.json`), JSON.stringify({ asset: file, mode: options.mode, ...json }, null, 2) + '\n')
  writeFileSync(join(output, `${name}.md`), report(options.mode, result, file) + '\n')
  console.log(`Result: ${result.status}; ${result.checks.length} W3C requests`)
  console.log(`Reports: w3c-audit/${name}.{css,json,md}`)
  if (result.status === 'unverified') process.exitCode = 1
  return result
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { await runOverviewIsolation({ options: parseOverviewArgs(process.argv.slice(2)) }) }
  catch (error) { console.error(`Stage 20: ${error.message}`); process.exitCode = 1 }
}
