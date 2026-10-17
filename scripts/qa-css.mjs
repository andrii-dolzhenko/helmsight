#!/usr/bin/env node
/** HelmSight CSS QA orchestrator. No external dependencies. Raw W3C results are never suppressed. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cssHash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const groupName = (file) => file.replace(/-[A-Za-z0-9_-]{8}\.css$/, '')
const required = (condition, message) => { if (!condition) throw new Error(message) }

export function parseMode(args) {
  required(args.length === 1 && ['--changed', '--full', '--report-only'].includes(args[0]),
    'Usage: npm run qa:css -- --changed | --full | --report-only')
  return args[0].slice(2)
}

export function inspectProfile(root, warningLevel) {
  const dir = join(root, 'dist/assets')
  required(existsSync(dir), 'Missing dist/assets; production build required')
  const buildFiles = readdirSync(dir).filter((file) => file.endsWith('.css')).sort()
  required(buildFiles.length > 0, 'No production CSS assets found')
  const filename = warningLevel === '1' ? 'report-normal.json' : 'report.json'
  const location = join(root, 'w3c-audit', filename)
  required(existsSync(location), `Missing ${filename}`)
  const report = JSON.parse(readFileSync(location, 'utf8'))
  required(report.profile === 'css3svg' && report.warningLevel === warningLevel,
    `Wrong W3C profile in ${filename}`)
  required(report.selection === 'all', `Partial selection in ${filename}`)
  required(typeof report.generatedAt === 'string' && !Number.isNaN(Date.parse(report.generatedAt)),
    `Missing generatedAt in ${filename}`)
  const rows = report.files ?? {}
  required(Object.keys(rows).length === buildFiles.length,
    `Incomplete ${filename}: ${Object.keys(rows).length}/${buildFiles.length} CSS assets`)
  let errors = 0, warnings = 0
  const files = {}
  for (const file of buildFiles) {
    const record = rows[file]
    required(record && ['pass', 'issues'].includes(record.status), `Unverified or pending: ${file} (${filename})`)
    required(record.sha256 === cssHash(join(dir, file)), `Stale CSS SHA: ${file} (${filename})`)
    required(record.file === file && record.profile === 'css3svg' && record.warningLevel === warningLevel,
      `Stale W3C row metadata: ${file} (${filename})`)
    required(Number.isSafeInteger(record.errors) && record.errors >= 0 &&
      Number.isSafeInteger(record.warnings) && record.warnings >= 0,
    `Invalid W3C counts: ${file}`)
    required((record.status === 'pass') === (record.errors === 0 && record.warnings === 0),
      `Contradictory status: ${file}`)
    errors += record.errors
    warnings += record.warnings
    const name = groupName(file)
    required(!files[name], `Duplicate production CSS chunk stem: ${name}`)
    files[name] = { errors: record.errors, warnings: record.warnings }
  }
  required(report.summary?.total === buildFiles.length &&
    report.summary?.verified === buildFiles.length &&
    report.summary?.pending === 0 && report.summary?.unverified === 0 &&
    report.summary?.errors === errors && report.summary?.warnings === warnings,
  `Report totals/coverage mismatch: ${filename}`)
  return { profile: 'css3svg', warningLevel, generatedAt: report.generatedAt,
    assets: buildFiles.length, verified: buildFiles.length, errors, warnings, files }
}

export function compareBaseline(profiles, baseline) {
  if (!baseline) return { status: 'UNVERIFIED — NO APPROVED BASELINE', details: [] }
  const details = []
  for (const level of ['1', '2']) {
    const previous = baseline.profiles?.[level]
    required(previous && previous.files && Number.isSafeInteger(previous.warnings),
      `Invalid approved baseline for warning=${level}`)
    for (const [name, actual] of Object.entries(profiles[level].files)) {
      if (!previous.files[name]) details.push(`warning=${level}: new CSS chunk ${name}; manual review required`)
      else if (actual.errors > previous.files[name].errors || actual.warnings > previous.files[name].warnings)
        details.push(`warning=${level}: ${name} increased from ${previous.files[name].errors}/${previous.files[name].warnings} to ${actual.errors}/${actual.warnings}`)
    }
    for (const name of Object.keys(previous.files)) {
      if (!profiles[level].files[name]) details.push(`warning=${level}: removed CSS chunk ${name}; review coverage change`)
    }
  }
  return { status: details.length ? 'REVIEW REQUIRED' : 'NO PER-ASSET REGRESSION', details }
}

export function inspectAll(root = process.cwd(), baseline = null) {
  const profiles = { '1': inspectProfile(root, '1'), '2': inspectProfile(root, '2') }
  required(profiles['1'].assets === profiles['2'].assets, 'W3C profile asset count mismatch')
  const comparison = compareBaseline(profiles, baseline)
  return {
    generatedAt: new Date().toISOString(),
    profiles, comparison,
    cssErrorGate: profiles['1'].errors === 0 && profiles['2'].errors === 0 ? 'PASS' : 'FAIL',
    rawZeroZeroTarget: profiles['1'].errors === 0 && profiles['2'].errors === 0 &&
      profiles['1'].warnings === 0 && profiles['2'].warnings === 0 ? 'MET' : 'NOT MET',
    htmlValidation: 'NOT VERIFIED — static entry and rendered SPA route snapshots require separate HTML validation',
    deployment: 'NOT APPROVED BY THIS SCRIPT — requires ADR-042 warning review and independent HTML/browser QA',
  }
}

export function baselineCandidate(summary) {
  return { source: 'full W3C verification; REVIEW BEFORE APPROVING', capturedAt: summary.generatedAt,
    profiles: Object.fromEntries(['1', '2'].map((level) => [level, {
      errors: summary.profiles[level].errors, warnings: summary.profiles[level].warnings,
      files: structuredClone(summary.profiles[level].files),
    }])) }
}

function run(cmd, args, { allowIssues = false } = {}) {
  process.stdout.write(`\n$ ${cmd} ${args.join(' ')}\n`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false, cwd: process.cwd() })
  required(!result.error, `${cmd} failed: ${result.error?.message}`)
  required(result.status === 0 || (allowIssues && result.status === 1),
    `${cmd} failed with code ${result.status}`)
}

export function markdown(summary) {
  const a = summary.profiles['1'], b = summary.profiles['2']
  return [
    '# HelmSight — CSS QA evidence', '',
    `Generated: ${summary.generatedAt}`,
    `W3C profile: css3svg; CSS assets: ${a.assets}/${a.verified} (normal), ${b.assets}/${b.verified} (extended)`,
    `W3C Normal: ${a.errors} errors / ${a.warnings} warnings`,
    `W3C Extended: ${b.errors} errors / ${b.warnings} warnings`,
    `CSS zero-error gate: ${summary.cssErrorGate}`,
    `Raw W3C 0/0 target: ${summary.rawZeroZeroTarget}`,
    `Warning delta against approved baseline: ${summary.comparison.status}`,
    ...summary.comparison.details.map((detail) => `- ${detail}`),
    `HTML: ${summary.htmlValidation}`,
    `Release: ${summary.deployment}`, '',
  ].join('\n')
}

async function main() {
  const mode = parseMode(process.argv.slice(2))
  const root = process.cwd()
  if (mode !== 'report-only') {
    run('npm', ['run', 'lint'])
    run('npm', ['run', 'test:run'])
    run('node', ['--test', ...readdirSync(join(root, 'scripts')).filter((f) => f.endsWith('.test.mjs')).map((f) => `scripts/${f}`)])
    run('npm', ['run', 'build', '--', '--base=/helmsight/'])
    run('node', ['scripts/w3c-radar-production-check.mjs'])
    for (const level of ['1', '2']) {
      run('npm', ['run', 'w3c:audit', '--', `--warning=${level}`, ...(mode === 'full' ? ['--force'] : [])], { allowIssues: true })
    }
  }
  const baselinePath = join(root, 'docs', 'CSS_QA_BASELINE.json')
  const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null
  const summary = inspectAll(root, baseline)
  const output = join(root, 'w3c-audit')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeFileSync(join(output, 'qa-summary.md'), markdown(summary))
  if (mode === 'full') writeFileSync(join(output, 'qa-baseline-candidate.json'),
    `${JSON.stringify(baselineCandidate(summary), null, 2)}\n`)
  console.log(`\n${markdown(summary)}`)
  required(summary.cssErrorGate === 'PASS', 'New CSS errors: review W3C diagnostics')
  required(summary.comparison.status !== 'REVIEW REQUIRED', 'New CSS warnings or chunk changes: review required')
  if (mode === 'changed') required(baseline, 'Approved baseline missing: run --full, review candidate, then approve explicitly')
  console.log('Diagnostic completed. This is NOT HTML validation or ADR-042 release approval.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => { console.error(`CSS QA BLOCKED: ${error.message}`); process.exitCode = 1 })
}
