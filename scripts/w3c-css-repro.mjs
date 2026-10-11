#!/usr/bin/env node
/**
 * Stage 18: minimize an error-bearing production CSS chunk by W3C validation.
 * Diagnostic only. Never edits source or dist and never treats incomplete probes as 0/0.
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validate } from './w3c-css-audit.mjs'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const TARGETS = ['MetricsPage', 'ProjectOverviewPage']

export function parseReproArgs(args) {
  const opts = { only: null, max: 24, dryRun: false }
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg.startsWith('--only=')) {
      opts.only = arg.slice(7)
      if (!TARGETS.includes(opts.only)) throw new Error('--only must be MetricsPage or ProjectOverviewPage')
    } else if (arg.startsWith('--max=')) {
      opts.max = Number(arg.slice(6))
      if (!Number.isSafeInteger(opts.max) || opts.max < 2 || opts.max > 60) throw new Error('--max must be an integer between 2 and 60')
    } else throw new Error(`Unknown option: ${arg}`)
  }
  if (!opts.only) throw new Error('--only=MetricsPage or --only=ProjectOverviewPage is required')
  return opts
}

function parts(css, file) {
  const ast = postcss.parse(css, { from: file })
  return ast.nodes.map((node) => node.toString())
}
const combine = (fragments) => fragments.join('\n')
const ranges = (items, size) => {
  const groups = []
  for (let i = 0; i < size; i++) {
    const from = Math.floor(i * items.length / size)
    const to = Math.floor((i + 1) * items.length / size)
    if (from < to) groups.push({ from, to, slice: items.slice(from, to) })
  }
  return groups
}

/** Minimize an error reproducer. A nonzero error count, not a warning, is the failure oracle. */
export async function minimizeErrorCss(css, { file = 'input.css', maxRequests = 24, check } = {}) {
  if (typeof check !== 'function') throw new Error('A W3C check callback is required')
  const nodes = parts(css, file)
  if (!nodes.length) throw new Error('Empty CSS stylesheet')
  const cached = new Map()
  const checked = []
  let budgetExceeded = false
  let unverified = false
  const evaluate = async (candidate) => {
    const source = combine(candidate)
    if (cached.has(source)) return cached.get(source)
    if (checked.length >= maxRequests) { budgetExceeded = true; return null }
    let outcome
    try {
      const response = await check(source)
      if (!Number.isInteger(response.errors) || response.errors < 0) throw new Error('Missing W3C error count')
      outcome = { errors: response.errors, warnings: response.warnings ?? null, status: 'verified' }
    } catch (error) {
      unverified = true
      outcome = { errors: null, warnings: null, status: 'unverified', failure: error.message }
    }
    checked.push({ nodes: candidate.length, ...outcome })
    cached.set(source, outcome)
    return outcome
  }
  let current = nodes
  const baseline = await evaluate(current)
  if (baseline?.status !== 'verified' || baseline.errors === 0) {
    return { file, baseline, nodesBefore: nodes.length, nodesAfter: current.length,
      status: baseline?.status === 'verified' ? 'baseline-passed' : 'unverified',
      css: combine(current), checks: checked }
  }
  let n = 2
  while (current.length >= 2 && !budgetExceeded && !unverified) {
    const groups = ranges(current, n)
    let reduced = false
    // Removing a group is preferable: keep the surrounding CSS context intact.
    for (const group of groups) {
      const complement = [...current.slice(0, group.from), ...current.slice(group.to)]
      if (!complement.length) continue
      const test = await evaluate(complement)
      if (!test || test.status !== 'verified') break
      if (test.errors > 0) {
        current = complement
        n = Math.max(2, n - 1)
        reduced = true
        break
      }
    }
    if (reduced) continue
    if (budgetExceeded || unverified) break
    // If complements pass, a smaller subset may still reproduce the error.
    for (const group of groups) {
      const test = await evaluate(group.slice)
      if (!test || test.status !== 'verified') break
      if (test.errors > 0) {
        current = group.slice
        n = Math.max(2, n - 1)
        reduced = true
        break
      }
    }
    if (reduced) continue
    if (budgetExceeded || unverified || n >= current.length) break
    n = Math.min(current.length, n * 2)
  }
  const final = cached.get(combine(current)) ?? baseline
  return {
    file, baseline, final, nodesBefore: nodes.length, nodesAfter: current.length,
    status: unverified ? 'unverified' : budgetExceeded ? 'budget-exhausted' : 'minimized',
    css: combine(current), checks: checked,
  }
}

function readableReport(result) {
  return [
    '# HelmSight — Stage 18 minimal W3C error reproducer', '',
    '**Diagnostic only.** A reduced stylesheet is not a substitute for full W3C validation.', '',
    `- Production asset: \`${result.file}\``,
    `- Outcome: \`${result.status}\``,
    `- Full input error count (reparsed CSS): ${result.baseline?.errors ?? 'unverified'}`,
    `- Errors in retained fragment: ${result.final?.errors ?? 'unverified'}`,
    `- Top-level rules: ${result.nodesBefore} → ${result.nodesAfter}`,
    `- W3C requests: ${result.checks.length}`, '',
    'If budget exhausted, the fragment is only partially minimized. If baseline passed, the normalized full input did not reproduce the earlier error.',
    'Check the companion `.css` file to identify the declarations and selector context responsible.', '',
    '## Request log', '', '| # | Rules | Errors | Warnings | Status |', '|---:|---:|---:|---:|---|',
    ...result.checks.map((row, i) => `| ${i + 1} | ${row.nodes} | ${row.errors ?? '—'} | ${row.warnings ?? '—'} | ${row.status} |`), '',
  ].join('\n')
}

export async function runRepro({ root = process.cwd(), options = {}, validator = validate, delayMs = 1600 } = {}) {
  const name = options.only
  if (!TARGETS.includes(name)) throw new Error('Choose --only=MetricsPage or --only=ProjectOverviewPage')
  const dir = join(resolve(root), 'dist/assets')
  if (!existsSync(dir)) throw new Error('dist/assets missing; run npm run check first')
  const filenames = readdirSync(dir).filter((file) => file.startsWith(`${name}-`) && file.endsWith('.css'))
  if (filenames.length !== 1) throw new Error(`Expected exactly one ${name} production CSS file, found ${filenames.length}`)
  const file = filenames[0]
  const css = readFileSync(join(dir, file), 'utf8')
  const nodeCount = parts(css, file).length
  console.log(`${name}: ${file} (${css.length} chars, ${nodeCount} top-level nodes)`)
  if (options.dryRun) {
    console.log('Dry run: no W3C requests, no reports written')
    return null
  }
  let request = 0
  const check = async (source) => {
    if (request > 0 && delayMs) await sleep(delayMs)
    request++
    const result = await validator(source)
    console.log(`  W3C #${request}: errors=${result.errors}, warnings=${result.warnings ?? '?'}`)
    return result
  }
  const outcome = await minimizeErrorCss(css, { file, maxRequests: options.max ?? 24, check })
  const output = join(resolve(root), 'w3c-audit')
  mkdirSync(output, { recursive: true })
  const base = `css-repro-${name}`
  writeFileSync(join(output, `${base}.css`), outcome.css + '\n')
  const { css: _, ...metadata } = outcome
  writeFileSync(join(output, `${base}.json`), JSON.stringify(metadata, null, 2) + '\n')
  writeFileSync(join(output, `${base}.md`), readableReport(outcome) + '\n')
  console.log(`Result: ${outcome.status}, ${outcome.nodesBefore} → ${outcome.nodesAfter} rules, ${outcome.checks.length} W3C requests`)
  console.log(`Files: w3c-audit/${base}.{css,json,md}`)
  if (outcome.status === 'unverified') process.exitCode = 1
  return outcome
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { await runRepro({ options: parseReproArgs(process.argv.slice(2)) }) }
  catch (error) { console.error(`W3C CSS reproduction: ${error.message}`); process.exitCode = 1 }
}
