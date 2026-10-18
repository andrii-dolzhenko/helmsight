// ADR-059 Stage 3: validate captured synthetic rendered HTML with W3C Nu JSON.
// Never infer HTML compliance from a browser capture or from stale report data.
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HTML_QA_ROUTES, HTML_QA_SMOKE, HTML_QA_ALL } from './qa-html-routes.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(ROOT, 'w3c-audit', 'html')
const PUBLIC_ENDPOINT = 'https://validator.w3.org/nu/?out=json'
const LOCAL_ENDPOINT = 'http://127.0.0.1:8888/?out=json'
// The official Nu checker may run on the owner's loopback interface when the
// public service returns HTTP 429. Never send snapshots to arbitrary URLs.
export function selectNuEndpoint(configured = process.env.HELMSIGHT_HTML_NU_ENDPOINT) {
  if (configured === undefined) return PUBLIC_ENDPOINT
  if (configured === LOCAL_ENDPOINT) return LOCAL_ENDPOINT
  throw new Error('UNVERIFIED: HELMSIGHT_HTML_NU_ENDPOINT must be exactly http://127.0.0.1:8888/?out=json')
}
const ENDPOINT = selectNuEndpoint()
const SHA = /^[a-f\d]{64}$/
const MAX_DIAGNOSTICS_BYTES = 8 * 1024 * 1024
const BACKOFF_MS = [1800, 4000]
const RATE_LIMIT_BACKOFF_MS = [10000, 20000]
const MAX_RETRY_AFTER_MS = 30000
const INTER_REQUEST_DELAY_MS = 3000

const hash = (content) => createHash('sha256').update(content).digest('hex')
const validDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function requireValidationArgs(args) {
  if (args.length !== 1 || !['--smoke', '--all', '--resume-smoke', '--resume-all', '--report-only'].includes(args[0])) {
    throw new Error('Supported: node scripts/qa-html-validate.mjs --smoke | --all | --resume-smoke | --resume-all | --report-only')
  }
  return args[0]
}

// A Nu response can contain information messages that are not warnings.
// Preserve them unchanged, but never hide errors or warning subtypes.
export function parseNuResponse(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.messages)) {
    throw new Error('Invalid W3C Nu JSON: missing messages array')
  }
  let errors = 0
  let warnings = 0
  let infos = 0
  for (const item of payload.messages) {
    if (!item || typeof item !== 'object' || typeof item.message !== 'string' || !item.message.trim()) {
      throw new Error('Invalid W3C Nu diagnostic message')
    }
    if (item.type === 'error') errors += 1
    else if (item.type === 'info' && item.subType === 'warning') warnings += 1
    else if (item.type === 'info' && (item.subType === undefined || item.subType === '')) infos += 1
    else throw new Error(`Unrecognized W3C Nu diagnostic type: ${String(item.type)}/${String(item.subType)}`)
  }
  return { errors, warnings, infos, messages: payload.messages }
}

// Validate ALL expected route records and actual snapshot hashes BEFORE network calls.
// A manifest captured with a different production build or git HEAD is stale.
export async function verifyCapture(capture, { outputDir = OUTPUT, rootDir = ROOT, mode = 'all' } = {}) {
  const required = mode === 'smoke' ? HTML_QA_SMOKE : HTML_QA_ALL
  const expectedKind = mode === 'smoke' ? 'html-qa-smoke-capture' : 'html-qa-all-route-capture'
  if (!capture || capture.kind !== expectedKind || capture.base !== '/helmsight/' ||
      capture.localhostOnly !== true || capture.routeInventory !== HTML_QA_ROUTES.length ||
      capture.selected !== required.length || capture.captured !== required.length ||
      capture.status !== 'CAPTURED — NOT W3C VALIDATED' || !validDate(capture.capturedAt) ||
      !Array.isArray(capture.rows) || capture.rows.length !== required.length || !SHA.test(capture.buildIndexSha256 ?? '')) {
    throw new Error('UNVERIFIED: incomplete or invalid Chromium capture manifest')
  }
  const { execFileSync } = await import('node:child_process')
  const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim()
  if (capture.commit !== currentCommit) throw new Error('UNVERIFIED: capture belongs to another git HEAD; recapture routes')
  const index = await fs.readFile(path.join(rootDir, 'dist', 'index.html'))
  if (hash(index) !== capture.buildIndexSha256) throw new Error('UNVERIFIED: production build changed; recapture routes')
  const byPattern = new Map(capture.rows.map((row) => [row.pattern, row]))
  if (byPattern.size !== required.length) throw new Error('UNVERIFIED: duplicate route capture rows')
  const snapshots = []
  const fileNames = new Set()
  for (const spec of required) {
    const row = byPattern.get(spec.pattern)
    const routeIndex = HTML_QA_ROUTES.findIndex((r) => r.pattern === spec.pattern)
    const route = HTML_QA_ROUTES[routeIndex]
    // Match the capture runner's exact, deterministic file name. Its wildcard '*'
    // currently produces `47-.html`, a valid captured snapshot with an empty slug.
    // Never accept an arbitrary filename merely because its SHA-256 is present.
    const slug = spec.pattern === '/' ? 'landing' : spec.pattern.replace(/[^a-z\d]+/gi, '-').replace(/^-|-$/g, '')
    const expectedFile = `${routeIndex + 1}-${slug}.html`
    if (!row || !route || row.path !== route.path || row.status !== 'CAPTURED' || !SHA.test(row.sha256 ?? '') ||
        !Number.isSafeInteger(row.bytes) || row.bytes < 1000 || row.file !== expectedFile) {
      throw new Error(`UNVERIFIED: missing or invalid route snapshot: ${spec.pattern}`)
    }
    if (fileNames.has(row.file)) throw new Error(`UNVERIFIED: duplicate snapshot file: ${row.file}`)
    fileNames.add(row.file)
    const contents = await fs.readFile(path.join(outputDir, row.file), 'utf8')
    if (Buffer.byteLength(contents) !== row.bytes || hash(contents) !== row.sha256 ||
        !/^<!doctype html>\s*<html\b/i.test(contents) || !contents.includes('id="root"')) {
      throw new Error(`UNVERIFIED: stale or incomplete HTML content: ${spec.pattern}`)
    }
    snapshots.push({ ...row, html: contents })
  }
  return snapshots
}

// Respect Retry-After without permitting a remote server to stall QA indefinitely.
// A longer cooldown remains UNVERIFIED and can be resumed manually later.
export function parseRetryAfter(value, nowMs = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return null
  const text = value.trim()
  if (/^\d+$/.test(text)) {
    const seconds = Number(text)
    return Number.isSafeInteger(seconds) ? seconds * 1000 : Infinity
  }
  const date = Date.parse(text)
  return Number.isNaN(date) ? null : Math.max(0, date - nowMs)
}

export async function validateNu(html, { fetchImpl = fetch, endpoint = ENDPOINT, wait = delay } = {}) {
  if (!/^<!doctype html>/i.test(html) || !html.includes('id="root"')) {
    throw new Error('Not a captured HelmSight HTML document')
  }
  let lastError
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/html; charset=utf-8', Accept: 'application/json' },
        body: html,
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) {
        const message = `W3C Nu HTTP ${response.status}`
        if ((response.status === 429 || response.status === 408 || response.status >= 500) && attempt < BACKOFF_MS.length) {
          const retryAfter = response.status === 429
            ? parseRetryAfter(response.headers.get('retry-after')) : null
          if (retryAfter !== null && retryAfter > MAX_RETRY_AFTER_MS) {
            throw new Error(`${message}; Retry-After exceeds 30 seconds; resume later`)
          }
          lastError = new Error(message)
          const backoff = response.status === 429 ? RATE_LIMIT_BACKOFF_MS[attempt] : BACKOFF_MS[attempt]
          await wait(Math.max(backoff, retryAfter ?? 0))
          continue
        }
        throw new Error(message)
      }
      if (!/\bapplication\/json\b/i.test(response.headers.get('content-type') ?? '')) {
        throw new Error('W3C Nu returned non-JSON content type')
      }
      const text = await response.text()
      if (!text || Buffer.byteLength(text) > MAX_DIAGNOSTICS_BYTES) throw new Error('W3C Nu returned empty/oversized diagnostics')
      return parseNuResponse(JSON.parse(text))
    } catch (error) {
      lastError = error
      const isRetryable = error.name === 'TimeoutError' || error.name === 'AbortError' || error instanceof TypeError
      if (!isRetryable || attempt === BACKOFF_MS.length) break
      await wait(BACKOFF_MS[attempt])
    }
  }
  throw lastError ?? new Error('Unknown W3C Nu request failure')
}

export function htmlValidationStatus(rows, expectedCount) {
  if (!Array.isArray(rows) || rows.length !== expectedCount || new Set(rows.map((r) => r.pattern)).size !== expectedCount) {
    return 'UNVERIFIED'
  }
  if (rows.some((r) => r.status === 'UNVERIFIED')) return 'UNVERIFIED'
  if (rows.some((r) => r.status === 'ISSUES')) return 'ISSUES — HTML 0/0 NOT MET'
  if (rows.some((r) => r.status !== 'VALIDATED' || r.errors !== 0 || r.warnings !== 0)) return 'UNVERIFIED'
  return 'PASS — W3C HTML 0/0'
}

export function formatValidationReport(report) {
  const lines = [
    `# HelmSight — W3C HTML ${report.mode === 'smoke' ? 'smoke' : '47-route'} validation`, '',
    `Validated at: ${report.generatedAt}`,
    `Source capture: ${report.source.capturedAt}; commit: ${report.source.commit}`,
    `Routes: ${report.counts.verified}/${report.source.selected} verified; ${report.counts.issues} with issues; ${report.counts.unverified} unverified`,
    `HTML errors: ${report.counts.errors}; warnings: ${report.counts.warnings}; informational: ${report.counts.infos}`,
    `Status: ${report.status}`,
    'CSS QA and interactive states: NOT VERIFIED BY THIS REPORT',
    'Release: NOT APPROVED BY THIS SCRIPT', '',
  ]
  for (const row of report.rows) {
    lines.push(`- ${row.status}: ${row.path} — ${row.errors ?? 'n/a'} errors / ${row.warnings ?? 'n/a'} warnings${row.reason ? ` — ${row.reason}` : ''}`)
  }
  lines.push('', 'Raw per-route W3C messages, including line/column positions, are preserved in the JSON report.', '')
  return lines.join('\n')
}

export function verifyValidationReport(report, capture, snapshots, mode, { endpoint = ENDPOINT } = {}) {
  const required = mode === 'smoke' ? HTML_QA_SMOKE : HTML_QA_ALL
  if (!report || report.kind !== 'html-qa-w3c-validation' || report.mode !== mode ||
      report.source?.commit !== capture.commit || report.source?.capturedAt !== capture.capturedAt ||
      report.source?.buildIndexSha256 !== capture.buildIndexSha256 || report.source?.selected !== required.length ||
      report.endpoint !== endpoint || !validDate(report.generatedAt) ||
      !Array.isArray(report.rows) || report.rows.length !== required.length) {
    throw new Error('UNVERIFIED: missing, stale or partial W3C HTML report')
  }
  const map = new Map(report.rows.map((row) => [row.pattern, row]))
  if (map.size !== required.length) throw new Error('UNVERIFIED: duplicate W3C HTML result')
  let errors = 0; let warnings = 0; let infos = 0; let verified = 0; let issues = 0; let unverified = 0
  for (const snapshot of snapshots) {
    const row = map.get(snapshot.pattern)
    if (!row || row.path !== snapshot.path || row.captureSha256 !== snapshot.sha256 ||
        !['VALIDATED', 'ISSUES', 'UNVERIFIED'].includes(row.status)) {
      throw new Error(`UNVERIFIED: stale/missing validator result for ${snapshot.pattern}`)
    }
    if (row.status === 'UNVERIFIED') {
      if (typeof row.reason !== 'string' || !row.reason.trim()) throw new Error('UNVERIFIED row lacks reason')
      unverified += 1
      continue
    }
    const parsed = parseNuResponse({ messages: row.messages })
    if (parsed.errors !== row.errors || parsed.warnings !== row.warnings || parsed.infos !== row.infos ||
        (row.status === 'VALIDATED' && (row.errors || row.warnings)) ||
        (row.status === 'ISSUES' && !row.errors && !row.warnings)) {
      throw new Error(`UNVERIFIED: W3C message count mismatch for ${snapshot.pattern}`)
    }
    verified += 1
    if (row.status === 'ISSUES') issues += 1
    errors += row.errors; warnings += row.warnings; infos += row.infos
  }
  if (report.counts?.verified !== verified || report.counts?.issues !== issues ||
      report.counts?.unverified !== unverified || report.counts?.errors !== errors ||
      report.counts?.warnings !== warnings || report.counts?.infos !== infos ||
      report.status !== htmlValidationStatus(report.rows, required.length)) {
    throw new Error('UNVERIFIED: invalid W3C report totals or status')
  }
  return true
}

function buildValidationReport(mode, capture, rows) {
  const counts = {
    verified: rows.filter((row) => row.status !== 'UNVERIFIED').length,
    issues: rows.filter((row) => row.status === 'ISSUES').length,
    unverified: rows.filter((row) => row.status === 'UNVERIFIED').length,
    errors: rows.reduce((sum, row) => sum + (row.errors ?? 0), 0),
    warnings: rows.reduce((sum, row) => sum + (row.warnings ?? 0), 0),
    infos: rows.reduce((sum, row) => sum + (row.infos ?? 0), 0),
  }
  return {
    kind: 'html-qa-w3c-validation', mode, generatedAt: new Date().toISOString(), endpoint: ENDPOINT,
    source: { capturedAt: capture.capturedAt, commit: capture.commit,
      buildIndexSha256: capture.buildIndexSha256, selected: capture.selected },
    counts, status: htmlValidationStatus(rows, snapshotsCount(mode)), rows,
  }
}

function snapshotsCount(mode) { return mode === 'smoke' ? HTML_QA_SMOKE.length : HTML_QA_ALL.length }

// Reuse verified W3C messages ONLY when the full report passes all current
// capture/build/commit/snapshot provenance checks. Never re-request ISSUES.
// Checkpoint each result; on HTTP 429 stop rather than hammering the provider.
export async function validateSnapshots({ mode, capture, snapshots, previousReport = null,
  validate = validateNu, wait = delay, onProgress = async () => {},
  intervalMs = INTER_REQUEST_DELAY_MS } = {}) {
  if (mode !== 'smoke' && mode !== 'all') throw new Error('UNVERIFIED: unsupported W3C mode')
  if (!Array.isArray(snapshots) || snapshots.length !== snapshotsCount(mode)) {
    throw new Error('UNVERIFIED: incomplete snapshot set')
  }
  if (previousReport) verifyValidationReport(previousReport, capture, snapshots, mode)
  const existing = previousReport ? new Map(previousReport.rows.map((row) => [row.pattern, row])) : null
  const rows = snapshots.map((snapshot) => existing
    ? { ...existing.get(snapshot.pattern) }
    : { pattern: snapshot.pattern, path: snapshot.path, captureSha256: snapshot.sha256,
      status: 'UNVERIFIED', reason: 'PENDING: W3C request not yet completed' })
  const checkpoint = async () => {
    const report = buildValidationReport(mode, capture, rows)
    verifyValidationReport(report, capture, snapshots, mode)
    await onProgress(report)
    return report
  }
  // This checkpoint makes even an interrupted first run resumable.
  let report = await checkpoint()
  let sent = 0
  for (let index = 0; index < snapshots.length; index += 1) {
    if (rows[index].status !== 'UNVERIFIED') continue
    if (sent > 0 && intervalMs > 0) await wait(intervalMs)
    sent += 1
    const snapshot = snapshots[index]
    let row
    try {
      const parsed = await validate(snapshot.html)
      row = {
        pattern: snapshot.pattern, path: snapshot.path, captureSha256: snapshot.sha256,
        status: parsed.errors || parsed.warnings ? 'ISSUES' : 'VALIDATED',
        errors: parsed.errors, warnings: parsed.warnings, infos: parsed.infos,
        validatedAt: new Date().toISOString(), messages: parsed.messages,
      }
    } catch (error) {
      row = { pattern: snapshot.pattern, path: snapshot.path, captureSha256: snapshot.sha256,
        status: 'UNVERIFIED', reason: String(error.message).slice(0, 400) }
    }
    rows[index] = row
    report = await checkpoint()
    process.stdout.write(`${row.status}: ${row.path}${row.status !== 'UNVERIFIED' ? ` — ${row.errors} errors / ${row.warnings} warnings` : ` — ${row.reason}`}\n`)
    if (row.status === 'UNVERIFIED' && /W3C Nu HTTP 429\b/.test(row.reason)) {
      process.stdout.write('RATE LIMITED: stopping W3C requests; remaining routes stay UNVERIFIED for a later resume.\n')
      break
    }
  }
  return report
}

async function writeValidationCheckpoint(report, name) {
  // Atomic JSON replacement ensures no partial row/totals can look verified.
  // JSON is the authority; Markdown can be regenerated from it.
  const jsonPath = path.join(OUTPUT, `${name}.json`)
  const mdPath = path.join(OUTPUT, `${name}.md`)
  const jsonTmp = `${jsonPath}.tmp`
  const mdTmp = `${mdPath}.tmp`
  await fs.writeFile(jsonTmp, JSON.stringify(report, null, 2) + '\n')
  await fs.rename(jsonTmp, jsonPath)
  await fs.writeFile(mdTmp, formatValidationReport(report))
  await fs.rename(mdTmp, mdPath)
}

export async function run() {
  const modeFlag = requireValidationArgs(process.argv.slice(2))
  const reportOnly = modeFlag === '--report-only'
  const resume = modeFlag.startsWith('--resume-')
  const mode = modeFlag === '--smoke' || modeFlag === '--resume-smoke' ? 'smoke' : 'all'
  const reportName = mode === 'smoke' ? 'w3c-smoke' : 'w3c-all'
  const capture = JSON.parse(await fs.readFile(path.join(OUTPUT, `${mode}.json`), 'utf8'))
  const snapshots = await verifyCapture(capture, { mode })
  const reportPath = path.join(OUTPUT, `${reportName}.json`)
  if (reportOnly) {
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))
    verifyValidationReport(report, capture, snapshots, mode)
    const summary = formatValidationReport(report)
    console.log(summary)
    if (report.status !== 'PASS — W3C HTML 0/0') process.exitCode = 1
    return
  }
  // Resume is fail-closed: never discard the previous report or contact W3C
  // unless it completely matches the current snapshots and production build.
  let previousReport = null
  if (resume) {
    previousReport = JSON.parse(await fs.readFile(reportPath, 'utf8'))
    verifyValidationReport(previousReport, capture, snapshots, mode)
  } else {
    await fs.rm(reportPath, { force: true })
    await fs.rm(path.join(OUTPUT, `${reportName}.md`), { force: true })
  }
  const report = await validateSnapshots({ mode, capture, snapshots, previousReport,
    onProgress: (current) => writeValidationCheckpoint(current, reportName) })
  const summary = formatValidationReport(report)
  console.log(`\n${summary}`)
  if (report.status !== 'PASS — W3C HTML 0/0') process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => { console.error(`HTML QA UNVERIFIED: ${error.message}`); process.exitCode = 1 })
}
