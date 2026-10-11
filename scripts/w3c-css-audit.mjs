#!/usr/bin/env node
/**
 * Validate emitted Vite CSS assets with the official W3C CSS Validator SOAP API.
 * This is a network QA tool, not part of the Vite build.
 *
 * The public validator requests >= 1s spacing between batch requests.
 * Any network/parse failure is UNVERIFIED, never 0 errors / 0 warnings.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROFILE = 'css3svg'
export const WARNING_LEVEL = '1' // W3C web form default: Normal report
const ENDPOINT = 'https://jigsaw.w3.org/css-validator/validator'
const DELAY_MS = 1600
const REQUEST_TIMEOUT_MS = 30000
const MAX_ATTEMPTS = 2

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
const hash = (css) => createHash('sha256').update(css).digest('hex')

export function parseSoapResponse(xml) {
  if (!/(?:<\w+:|<)cssvalidationresponse(?:\s|>)/i.test(xml)) {
    throw new Error('W3C did not return a SOAP cssvalidationresponse (possibly HTML/rate limit)')
  }
  const tag = (name, body = xml) => {
    const match = new RegExp(`<(?:(?:[\\w-]+):)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${name}\\s*>`, 'i').exec(body)
    return match?.[1]?.trim() ?? null
  }
  const errorCount = tag('errorcount')
  const warningCount = tag('warningcount')
  const validity = tag('validity')
  if (!/^\d+$/.test(errorCount ?? '') || !/^\d+$/.test(warningCount ?? '') || !/^(?:true|false)$/i.test(validity ?? '')) {
    throw new Error('Incomplete SOAP validation counts or validity status')
  }
  const unescape = (value) => value.replace(/&(?:lt|gt|amp|quot|apos|#\d+|#x[\da-f]+);/gi, (match) => {
    const named = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': "'" }
    if (named[match.toLowerCase()]) return named[match.toLowerCase()]
    if (match.startsWith('&#')) {
      const code = match[2].toLowerCase() === 'x' ? parseInt(match.slice(3, -1), 16) : parseInt(match.slice(2, -1), 10)
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return match
  })
  const diagnostics = (type) => {
    const regex = new RegExp(`<(?:(?:[\\w-]+):)?${type}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${type}\\s*>`, 'gi')
    return [...xml.matchAll(regex)].map((match) => ({
      line: Number.parseInt(tag('line', match[1]) ?? '', 10) || null,
      message: unescape(tag('message', match[1]) ?? '').replace(/<[^>]*>/g, '').trim(),
    })).filter(({ message }) => message)
  }
  const errors = Number(errorCount), warnings = Number(warningCount)
  if (validity.toLowerCase() === 'true' && errors > 0) {
    throw new Error('Contradictory validity and error count from validator')
  }
  return {
    errors, warnings,
    valid: validity.toLowerCase() === 'true',
    errorDetails: diagnostics('error'),
    warningDetails: diagnostics('warning'),
  }
}

export function parseOptions(args) {
  const options = { dryRun: false, force: false, max: Infinity, only: null }
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--force') options.force = true
    else if (arg.startsWith('--max=')) {
      const value = Number(arg.slice(6))
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error('--max requires a positive integer')
      options.max = value
    } else if (arg.startsWith('--only=')) {
      options.only = arg.slice(7)
      if (!options.only) throw new Error('--only requires a filename substring')
    } else if (arg.startsWith('--warning=')) {
      const level = arg.slice(10)
      if (!['1', '2'].includes(level)) throw new Error('--warning must be 1 (normal) or 2 (all)')
      options.warningLevel = level
    } else if (arg === '--help') options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

export function summarize(entries, totalFiles) {
  const rows = Object.values(entries)
  return {
    total: totalFiles,
    verified: rows.filter((r) => r.status === 'pass' || r.status === 'issues').length,
    passed: rows.filter((r) => r.status === 'pass').length,
    issues: rows.filter((r) => r.status === 'issues').length,
    unverified: rows.filter((r) => r.status === 'unverified').length,
    pending: Math.max(0, totalFiles - rows.length),
    errors: rows.reduce((n, r) => n + (r.errors ?? 0), 0),
    warnings: rows.reduce((n, r) => n + (r.warnings ?? 0), 0),
  }
}

function reportMarkdown(report) {
  const { summary, files } = report
  const lines = [
    '# HelmSight — W3C production CSS audit',
    '',
    `Profile: \`${PROFILE}\`, warnings: \`${report.warningLevel}\` (${report.warningLevel === '1' ? 'Normal report, web-form default' : 'All warnings'}).`,
    `Generated: ${report.generatedAt}`,
    '',
    `- CSS assets in current build: ${summary.total}`,
    `- Checked by W3C (including cache for identical CSS): ${summary.verified}`,
    `- 0/0 passed: ${summary.passed}`,
    `- With W3C errors/warnings: ${summary.issues}`,
    `- Unverified (request or response failure): ${summary.unverified}`,
    `- Not yet checked: ${summary.pending}`,
    `- Recorded errors: ${summary.errors}; warnings: ${summary.warnings}`,
    '',
    '| Asset | Result | Errors | Warnings |',
    '|---|---|---:|---:|',
  ]
  for (const row of Object.values(files).sort((a, b) => a.file.localeCompare(b.file))) {
    lines.push(`| ${row.file} | ${row.status} | ${row.errors ?? '—'} | ${row.warnings ?? '—'} |`)
  }
  lines.push('', '## Diagnostics', '')
  for (const row of Object.values(files).filter((r) => r.status !== 'pass')) {
    lines.push(`### ${row.file}`)
    if (row.failure) lines.push(`- NOT VALIDATED: ${row.failure}`)
    for (const severity of ['error', 'warning']) {
      for (const detail of row[`${severity}Details`] ?? []) {
        lines.push(`- ${severity}, line ${detail.line ?? '?'}: ${detail.message}`)
      }
    }
    if (!row.failure && !row.errorDetails?.length && !row.warningDetails?.length) {
      lines.push('- W3C returned counts but no extractable detail; inspect the original stylesheet manually.')
    }
    lines.push('')
  }
  lines.push('W3C output is one quality signal. Runtime themes, accessibility, rendering and HTML still need separate QA.', '')
  return lines.join('\n')
}

export async function validate(css, fetcher = fetch, warningLevel = WARNING_LEVEL) {
  // W3C's direct-input form posts multipart/form-data, not urlencoded form data.
  // Let fetch compute the multipart boundary instead of setting Content-Type manually.
  const body = new FormData()
  for (const [name, value] of Object.entries({
    text: css, output: 'soap12', profile: PROFILE,
    warning: warningLevel, usermedium: 'all', lang: 'en',
  })) body.set(name, value)
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetcher(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/soap+xml' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        const detail = errorBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
        const error = new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
        // Repeat transient gateway/rate-limit failures, not a deterministic HTTP 500.
        error.retryable = [429, 502, 503, 504].includes(response.status)
        throw error
      }
      return parseSoapResponse(await response.text())
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS && error.retryable !== false) await sleep(DELAY_MS)
      else break
    }
  }
  throw lastError
}

export async function audit({ root = process.cwd(), options = {}, fetcher = fetch } = {}) {
  const warningLevel = options.warningLevel ?? WARNING_LEVEL
  if (!['1', '2'].includes(warningLevel)) throw new Error('warningLevel must be 1 or 2')
  const dir = join(resolve(root), 'dist/assets')
  if (!existsSync(dir)) throw new Error('No dist/assets directory. Run npm run build first.')
  const buildFiles = readdirSync(dir).filter((name) => name.endsWith('.css')).sort()
  const files = buildFiles.filter((name) => !options.only || name.includes(options.only))
  if (!files.length) throw new Error('No matching dist/assets/*.css found')
  console.log(`Current build: ${buildFiles.length} CSS assets (${files.length} selected), W3C ${PROFILE}, warning=${warningLevel}`)
  if (options.dryRun) {
    for (const file of files) console.log(`  ${file}`)
    console.log('Dry run: no network requests or report changes.')
    return null
  }
  const outputDir = join(resolve(root), 'w3c-audit')
  mkdirSync(outputDir, { recursive: true })
  // Keep both profiles separate. Legacy report.json is warning=2.
  const suffix = warningLevel === '1' ? '-normal' : ''
  const filePath = join(outputDir, `report${suffix}.json`)
  const summaryPath = join(outputDir, `summary${suffix}.md`)
  let previous = {}
  if (existsSync(filePath)) {
    try { previous = JSON.parse(readFileSync(filePath, 'utf8')).files ?? {} } catch { previous = {} }
  }
  const byHash = new Map()
  for (const record of Object.values(previous)) {
    if (record.sha256 && ['pass', 'issues'].includes(record.status) && record.profile === PROFILE && record.warningLevel === warningLevel) {
      byHash.set(record.sha256, record)
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    profile: PROFILE, warningLevel, endpoint: ENDPOINT,
    selection: options.only ?? 'all',
    files: {}, summary: {},
  }
  // Preserve previously checked, unchanged assets when validating a selected subset.
  // Unverified items also stay visible; they never become passes through the cache.
  for (const file of buildFiles) {
    const record = previous[file]
    if (!record) continue
    const currentHash = hash(readFileSync(join(dir, file), 'utf8'))
    if (record.sha256 === currentHash && record.profile === PROFILE && record.warningLevel === warningLevel) {
      report.files[file] = record
    }
  }
  let requested = 0
  let lastCallAt = 0
  const save = () => {
    report.generatedAt = new Date().toISOString()
    report.summary = summarize(report.files, buildFiles.length)
    writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`)
    writeFileSync(summaryPath, reportMarkdown(report))
  }
  for (const file of files) {
    const css = readFileSync(join(dir, file), 'utf8')
    const sha256 = hash(css)
    const cache = !options.force ? byHash.get(sha256) : null
    if (cache) {
      report.files[file] = { ...cache, file, sha256, checkedFrom: 'sha256 cache', profile: PROFILE, warningLevel }
      console.log(`CACHE ${file} → ${cache.errors}/${cache.warnings}`)
      save()
      continue
    }
    if (requested >= (options.max ?? Infinity)) {
      // A previously unverified outcome must not falsely survive a forced or changed-content request.
      if (report.files[file]?.sha256 !== sha256) delete report.files[file]
      continue
    }
    const wait = Math.max(0, DELAY_MS - (Date.now() - lastCallAt))
    if (wait) await sleep(wait)
    lastCallAt = Date.now()
    requested++
    console.log(`W3C   ${file} (${requested}${Number.isFinite(options.max) ? `/${options.max}` : ''})`)
    try {
      const result = await validate(css, fetcher, warningLevel)
      const status = result.errors === 0 && result.warnings === 0 && result.valid ? 'pass' : 'issues'
      report.files[file] = {
        file, sha256, status, ...result,
        profile: PROFILE, warningLevel, checkedFrom: 'W3C SOAP response',
      }
      byHash.set(sha256, report.files[file])
      console.log(`  ${status.toUpperCase()}: errors=${result.errors}, warnings=${result.warnings}`)
    } catch (error) {
      report.files[file] = { file, sha256, status: 'unverified', failure: String(error.message ?? error), profile: PROFILE, warningLevel }
      console.log(`  UNVERIFIED: ${error.message}`)
    }
    save()
  }
  save()
  const s = report.summary
  console.log(`\nSummary: passed ${s.passed}/${s.total}; issues ${s.issues}; unverified ${s.unverified}; pending ${s.pending}`)
  console.log(`Files: ${relative(root, filePath)} and ${relative(root, summaryPath)}`)
  return report
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invoked) {
  try {
    const options = parseOptions(process.argv.slice(2))
    if (options.help) {
      console.log('Usage: npm run w3c:audit -- [--warning=1|2] [--dry-run] [--max=3] [--only=Risk] [--force]')
      console.log('Requires npm run build. Sends production CSS to the public W3C SOAP validator (>= 1.6s between calls).')
      console.log('Default: warning=1 (W3C web Normal report); --warning=2 includes all advisories.')
      console.log('Normal and all-warnings reports are stored separately in w3c-audit/. --force ignores cache.')
    } else {
      const report = await audit({ options })
      if (report?.summary?.issues || report?.summary?.unverified) process.exitCode = 1
    }
  } catch (error) {
    console.error(`W3C audit error: ${error.message}`)
    process.exitCode = 1
  }
}
