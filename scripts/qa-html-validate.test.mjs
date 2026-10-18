import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { HTML_QA_ALL, HTML_QA_ROUTES, HTML_QA_SMOKE } from './qa-html-routes.mjs'
import {
  requireValidationArgs, parseNuResponse, verifyCapture, validateNu,
  htmlValidationStatus, verifyValidationReport, formatValidationReport,
  parseRetryAfter, validateSnapshots, selectNuEndpoint,
} from './qa-html-validate.mjs'

const hash = (text) => createHash('sha256').update(text).digest('hex')
const document = '<!doctype html>\n<html lang="en"><head><title>QA fixture</title></head><body>' +
  '<div id="root">' + 'Synthetic QA content. '.repeat(100) + '</div></body></html>'
const fakeResponse = (status, payload, contentType = 'application/json') => ({
  ok: status === 200, status,
  headers: { get: () => contentType },
  text: async () => JSON.stringify(payload),
})
const empty = { messages: [] }

test('W3C validation CLI supports only reviewed modes', () => {
  for (const flag of ['--smoke', '--all', '--resume-smoke', '--resume-all', '--report-only']) assert.equal(requireValidationArgs([flag]), flag)
  for (const args of [[], ['--full'], ['--all', '--force'], ['--report-only', '--smoke'], ['--resume-all', '--smoke'], ['--resume']]) {
    assert.throws(() => requireValidationArgs(args), /Supported/)
  }
})

test('Nu checker selection allows only the public endpoint or the fixed loopback service', () => {
  const remote = 'https://validator.w3.org/nu/?out=json'
  const local = 'http://127.0.0.1:8888/?out=json'
  assert.equal(selectNuEndpoint(undefined), remote)
  assert.equal(selectNuEndpoint(local), local)
  for (const value of ['', 'http://localhost:8888/?out=json', 'http://127.0.0.1:8889/?out=json',
    'http://192.168.0.1:8888/?out=json', 'https://example.com/?out=json', remote]) {
    assert.throws(() => selectNuEndpoint(value), /HELMSIGHT_HTML_NU_ENDPOINT/)
  }
})

test('Nu diagnostics preserve raw messages and distinguish error, warning and info', () => {
  const messages = [
    { type: 'error', message: 'Bad nested markup', lastLine: 21 },
    { type: 'info', subType: 'warning', message: 'Landmark warning', lastLine: 15 },
    { type: 'info', message: 'Parser informational note' },
  ]
  assert.deepEqual(parseNuResponse({ messages }), { errors: 1, warnings: 1, infos: 1, messages })
  assert.throws(() => parseNuResponse({}), /missing messages/)
  assert.throws(() => parseNuResponse({ messages: [{ type: 'non-document-error', message: 'Invalid document' }] }), /Unrecognized/)
  assert.throws(() => parseNuResponse({ messages: [{ type: 'error' }] }), /Invalid W3C Nu diagnostic/)
})

test('Nu HTTP errors, non-JSON and malformed results can never become 0/0', async () => {
  for (const response of [fakeResponse(403, empty), fakeResponse(200, empty, 'text/html'), fakeResponse(200, {})]) {
    await assert.rejects(validateNu(document, { fetchImpl: async () => response }), /W3C Nu|JSON/)
  }
})

test('Nu POST sends real HTML, not an URL or just index.html', async () => {
  let call
  const result = await validateNu(document, {
    fetchImpl: async (...args) => { call = args; return fakeResponse(200, empty) },
  })
  assert.deepEqual([result.errors, result.warnings], [0, 0])
  assert.match(call[0], /^https:\/\/validator\.w3\.org\/nu\/\?out=json$/)
  assert.equal(call[1].method, 'POST')
  assert.equal(call[1].body, document)
  assert.match(call[1].headers['Content-Type'], /text\/html/)
})

test('Nu 429 uses bounded retry instead of reporting an empty success', async () => {
  let calls = 0
  let waits = 0
  const result = await validateNu(document, {
    fetchImpl: async () => { calls += 1; return calls === 1 ? fakeResponse(429, empty) : fakeResponse(200, empty) },
    wait: async () => { waits += 1 },
  })
  assert.equal(calls, 2)
  assert.equal(waits, 1)
  assert.equal(result.errors, 0)
  calls = 0
  await assert.rejects(validateNu(document, {
    fetchImpl: async () => { calls += 1; return fakeResponse(503, empty) }, wait: async () => {},
  }), /HTTP 503/)
  assert.equal(calls, 3)
})

test('full HTML status rejects missing or unverified rows and preserves actual issues', () => {
  const valid = HTML_QA_SMOKE.map((r) => ({ pattern: r.pattern, status: 'VALIDATED', errors: 0, warnings: 0 }))
  assert.equal(htmlValidationStatus(valid, 5), 'PASS — W3C HTML 0/0')
  assert.equal(htmlValidationStatus(valid.slice(1), 5), 'UNVERIFIED')
  assert.equal(htmlValidationStatus([...valid.slice(1), valid[1]], 5), 'UNVERIFIED')
  assert.equal(htmlValidationStatus(valid.map((r, i) => i === 2 ? { ...r, status: 'UNVERIFIED' } : r), 5), 'UNVERIFIED')
  assert.equal(htmlValidationStatus(valid.map((r, i) => i === 2 ? { ...r, status: 'ISSUES', errors: 1 } : r), 5), 'ISSUES — HTML 0/0 NOT MET')
})

async function syntheticFixture(mode = 'smoke') {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'helmsight-html-qa-stage3-'))
  const rootDir = path.join(tmp, 'root')
  const outputDir = path.join(tmp, 'html')
  await mkdir(path.join(rootDir, 'dist'), { recursive: true })
  await mkdir(outputDir)
  execFileSync('git', ['init', '--quiet', rootDir])
  execFileSync('git', ['-C', rootDir, '-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture'])
  const commit = execFileSync('git', ['-C', rootDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const build = '<!doctype html><html lang="en"><body>Shell</body></html>'
  await writeFile(path.join(rootDir, 'dist', 'index.html'), build)
  const required = mode === 'smoke' ? HTML_QA_SMOKE : HTML_QA_ALL
  const rows = []
  for (const spec of required) {
    const i = HTML_QA_ROUTES.findIndex((r) => r.pattern === spec.pattern)
    const route = HTML_QA_ROUTES[i]
    const slug = route.pattern === '/' ? 'landing' : route.pattern.replace(/[^a-z\d]+/gi, '-').replace(/^-|-$/g, '')
    const filename = `${i + 1}-${slug}.html`
    await writeFile(path.join(outputDir, filename), document)
    rows.push({ pattern: spec.pattern, path: route.path, file: filename,
      status: 'CAPTURED', sha256: hash(document), bytes: Buffer.byteLength(document) })
  }
  const capture = { kind: mode === 'smoke' ? 'html-qa-smoke-capture' : 'html-qa-all-route-capture',
    base: '/helmsight/', localhostOnly: true, routeInventory: 47,
    selected: required.length, captured: required.length, status: 'CAPTURED — NOT W3C VALIDATED',
    capturedAt: '2026-10-17T17:46:03.636Z', commit, buildIndexSha256: hash(build), rows }
  return { rootDir, outputDir, mode, capture, cleanup: () => rm(tmp, { recursive: true, force: true }) }
}

test('capture integrity checks all stored snapshot hashes and current build/commit', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    assert.equal(snapshots.length, 5)
    await writeFile(path.join(f.outputDir, f.capture.rows[0].file), '<!doctype html>tampered')
    await assert.rejects(verifyCapture(f.capture, f), /stale or incomplete/)
  } finally { await f.cleanup() }
})

test('full capture accepts the exact wildcard snapshot filename and rejects substituted names', async () => {
  const f = await syntheticFixture('all')
  try {
    // Stage 2 currently names the wildcard ('*') snapshot `47-.html`.
    // It is captured and SHA-verified; an empty slug must not invalidate this sole route.
    const wildcard = f.capture.rows.find((row) => row.pattern === '*')
    assert.equal(wildcard.file, '47-.html')
    assert.equal((await verifyCapture(f.capture, f)).length, 47)
    const rows = f.capture.rows.map((row) => row.pattern === '*'
      ? { ...row, file: '47-other.html' } : row)
    await assert.rejects(verifyCapture({ ...f.capture, rows }, f), /missing or invalid route snapshot: \*/)
  } finally { await f.cleanup() }
})

test('capture preflight rejects missing routes and stale build without W3C requests', async () => {
  const f = await syntheticFixture()
  try {
    await assert.rejects(verifyCapture({ ...f.capture, selected: 4 }, f), /incomplete/)
    await assert.rejects(verifyCapture({ ...f.capture, rows: f.capture.rows.slice(1) }, f), /incomplete/)
    await assert.rejects(verifyCapture({ ...f.capture, commit: 'different' }, f), /another git HEAD/)
    await writeFile(path.join(f.rootDir, 'dist', 'index.html'), '<html>changed</html>')
    await assert.rejects(verifyCapture(f.capture, f), /production build changed/)
  } finally { await f.cleanup() }
})

test('report-only verifies raw message totals and route fingerprint provenance', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    const rows = snapshots.map((snapshot) => ({
      pattern: snapshot.pattern, path: snapshot.path, captureSha256: snapshot.sha256,
      status: 'VALIDATED', errors: 0, warnings: 0, infos: 0, messages: [],
    }))
    const report = {
      kind: 'html-qa-w3c-validation', mode: 'smoke', generatedAt: new Date().toISOString(),
      endpoint: 'https://validator.w3.org/nu/?out=json',
      source: { capturedAt: f.capture.capturedAt, commit: f.capture.commit,
        buildIndexSha256: f.capture.buildIndexSha256, selected: f.capture.selected },
      counts: { verified: 5, issues: 0, unverified: 0, errors: 0, warnings: 0, infos: 0 },
      status: 'PASS — W3C HTML 0/0', rows,
    }
    assert.equal(verifyValidationReport(report, f.capture, snapshots, 'smoke'), true)
    assert.match(formatValidationReport(report), /CSS QA and interactive states: NOT VERIFIED/)
    assert.throws(() => verifyValidationReport({ ...report, counts: { ...report.counts, warnings: 1 } }, f.capture, snapshots, 'smoke'), /totals or status/)
    assert.throws(() => verifyValidationReport({ ...report, rows: rows.map((row, i) => i === 1 ? { ...row, captureSha256: hash('other') } : row) }, f.capture, snapshots, 'smoke'), /stale\/missing/)
    assert.throws(() => verifyValidationReport({ ...report, rows: rows.map((row, i) => i === 2 ? { ...row, messages: [{ type: 'error', message: 'Broken HTML' }] } : row) }, f.capture, snapshots, 'smoke'), /count mismatch/)
  } finally { await f.cleanup() }
})

test('local and public W3C validation evidence cannot be mixed during resume', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    const publicReport = matchingReport(f.capture, snapshots)
    const localEndpoint = selectNuEndpoint('http://127.0.0.1:8888/?out=json')
    assert.equal(verifyValidationReport(publicReport, f.capture, snapshots, 'smoke'), true)
    assert.throws(() => verifyValidationReport(publicReport, f.capture, snapshots, 'smoke',
      { endpoint: localEndpoint }), /missing, stale or partial/)
    const localReport = { ...publicReport, endpoint: localEndpoint }
    assert.equal(verifyValidationReport(localReport, f.capture, snapshots, 'smoke',
      { endpoint: localEndpoint }), true)
    assert.throws(() => verifyValidationReport(localReport, f.capture, snapshots, 'smoke'),
      /missing, stale or partial/)
  } finally { await f.cleanup() }
})

test('W3C report distinguishes valid, issue and unverified pages', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    const rows = snapshots.map((s) => ({ pattern: s.pattern, path: s.path, captureSha256: s.sha256,
      status: 'VALIDATED', errors: 0, warnings: 0, infos: 0, messages: [] }))
    rows[0] = { ...rows[0], status: 'ISSUES', errors: 1, messages: [{ type: 'error', message: 'Duplicate ID' }] }
    rows[1] = { pattern: rows[1].pattern, path: rows[1].path, captureSha256: rows[1].captureSha256,
      status: 'UNVERIFIED', reason: 'HTTP 503' }
    const report = { kind: 'html-qa-w3c-validation', mode: 'smoke', generatedAt: new Date().toISOString(),
      endpoint: 'https://validator.w3.org/nu/?out=json',
      source: { capturedAt: f.capture.capturedAt, commit: f.capture.commit,
        buildIndexSha256: f.capture.buildIndexSha256, selected: 5 },
      counts: { verified: 4, issues: 1, unverified: 1, errors: 1, warnings: 0, infos: 0 },
      status: 'UNVERIFIED', rows }
    assert.equal(verifyValidationReport(report, f.capture, snapshots, 'smoke'), true)
    assert.match(formatValidationReport(report), /UNVERIFIED/)
  } finally { await f.cleanup() }
})

function matchingReport(capture, snapshots, mode = 'smoke') {
  const rows = snapshots.map((s) => ({ pattern: s.pattern, path: s.path, captureSha256: s.sha256,
    status: 'VALIDATED', errors: 0, warnings: 0, infos: 0, messages: [] }))
  return {
    kind: 'html-qa-w3c-validation', mode, generatedAt: new Date().toISOString(),
    endpoint: 'https://validator.w3.org/nu/?out=json',
    source: { capturedAt: capture.capturedAt, commit: capture.commit,
      buildIndexSha256: capture.buildIndexSha256, selected: snapshots.length },
    counts: { verified: snapshots.length, issues: 0, unverified: 0, errors: 0, warnings: 0, infos: 0 },
    status: 'PASS — W3C HTML 0/0', rows,
  }
}

test('Nu Retry-After handles seconds/date and refuses unbounded cooldowns', async () => {
  assert.equal(parseRetryAfter('25'), 25000)
  assert.equal(parseRetryAfter('999999999999999999999'), Infinity)
  assert.equal(parseRetryAfter('Sun, 18 Oct 2026 00:00:00 GMT', Date.parse('2026-10-17T23:59:45Z')), 15000)
  assert.equal(parseRetryAfter('invalid'), null)
  assert.equal(parseRetryAfter(null), null)
  const waits = []
  let calls = 0
  const result = await validateNu(document, {
    fetchImpl: async () => ++calls === 1
      ? { ...fakeResponse(429, empty), headers: { get: (name) => name === 'retry-after' ? '25' : 'application/json' } }
      : fakeResponse(200, empty),
    wait: async (ms) => { waits.push(ms) },
  })
  assert.equal(result.errors, 0)
  assert.deepEqual(waits, [25000])
  calls = 0
  await assert.rejects(validateNu(document, {
    fetchImpl: async () => { calls += 1; return {
      ...fakeResponse(429, empty), headers: { get: (name) => name === 'retry-after' ? '180' : 'application/json' },
    } },
    wait: async () => { assert.fail('No wait beyond maximum retry budget') },
  }), /HTTP 429.*resume later/)
  assert.equal(calls, 1)
})

test('resume reuses verified and issue diagnostics, requesting only unverified snapshots', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    const previous = matchingReport(f.capture, snapshots)
    const oldError = { type: 'error', message: 'Previously validated error' }
    previous.rows[1] = { ...previous.rows[1], status: 'ISSUES', errors: 1, messages: [oldError] }
    for (const i of [2, 4]) {
      previous.rows[i] = { pattern: snapshots[i].pattern, path: snapshots[i].path,
        captureSha256: snapshots[i].sha256, status: 'UNVERIFIED', reason: 'W3C Nu HTTP 429' }
    }
    previous.counts = { verified: 3, issues: 1, unverified: 2, errors: 1, warnings: 0, infos: 0 }
    previous.status = 'UNVERIFIED'
    const before = JSON.stringify(previous)
    let calls = 0
    const checkpoints = []
    const result = await validateSnapshots({ mode: 'smoke', capture: f.capture, snapshots,
      previousReport: previous, intervalMs: 0,
      validate: async () => { calls += 1; return calls === 1
        ? { errors: 0, warnings: 0, infos: 0, messages: [] }
        : { errors: 0, warnings: 1, infos: 0, messages: [{ type: 'info', subType: 'warning', message: 'A warning' }] } },
      onProgress: async (report) => { verifyValidationReport(report, f.capture, snapshots, 'smoke'); checkpoints.push(report) },
    })
    assert.equal(calls, 2)
    assert.equal(checkpoints.length, 3) // Initial evidence, then one checkpoint per request
    assert.equal(result.rows[0].status, 'VALIDATED')
    assert.deepEqual(result.rows[1].messages, [oldError])
    assert.equal(result.rows[2].status, 'VALIDATED')
    assert.equal(result.rows[3].status, 'VALIDATED')
    assert.equal(result.rows[4].status, 'ISSUES')
    assert.deepEqual(result.counts, { verified: 5, issues: 2, unverified: 0, errors: 1, warnings: 1, infos: 0 })
    assert.equal(result.status, 'ISSUES — HTML 0/0 NOT MET')
    assert.equal(JSON.stringify(previous), before, 'Original evidence was not mutated')
  } finally { await f.cleanup() }
})

test('resume refuses stale source, mismatched hash, wrong mode and altered totals before network', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    const original = matchingReport(f.capture, snapshots)
    let requests = 0
    let checkpoints = 0
    const attempt = (previousReport) => validateSnapshots({ mode: 'smoke', capture: f.capture, snapshots,
      previousReport, validate: async () => { requests += 1; return { errors: 0, warnings: 0, infos: 0, messages: [] } },
      onProgress: async () => { checkpoints += 1 },
    })
    await assert.rejects(attempt({ ...original, source: { ...original.source, capturedAt: '2026-01-01T00:00:00Z' } }), /stale or partial/)
    await assert.rejects(attempt({ ...original, rows: original.rows.map((r, i) => i === 1 ? { ...r, captureSha256: hash('wrong') } : r) }), /stale\/missing/)
    await assert.rejects(attempt({ ...original, counts: { ...original.counts, errors: 5 } }), /totals or status/)
    await assert.rejects(attempt({ ...original, mode: 'all' }), /stale or partial/)
    assert.equal(requests, 0)
    assert.equal(checkpoints, 0)
  } finally { await f.cleanup() }
})

test('HTTP 429 stops further requests and leaves pending routes unverified', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    let requests = 0
    let lastCheckpoint
    const report = await validateSnapshots({ mode: 'smoke', capture: f.capture, snapshots, intervalMs: 0,
      validate: async () => {
        requests += 1
        if (requests === 2) throw new Error('W3C Nu HTTP 429')
        return { errors: 0, warnings: 0, infos: 0, messages: [] }
      },
      onProgress: async (value) => { lastCheckpoint = value },
    })
    assert.equal(requests, 2)
    assert.deepEqual(report, lastCheckpoint)
    assert.equal(report.rows[0].status, 'VALIDATED')
    assert.equal(report.rows[1].reason, 'W3C Nu HTTP 429')
    assert.match(report.rows[2].reason, /PENDING/)
    assert.deepEqual(report.counts, { verified: 1, issues: 0, unverified: 4, errors: 0, warnings: 0, infos: 0 })
    assert.equal(report.status, 'UNVERIFIED')
    assert.equal(verifyValidationReport(report, f.capture, snapshots, 'smoke'), true)
  } finally { await f.cleanup() }
})

test('a crash after checkpoint resumes without revalidating already completed routes', async () => {
  const f = await syntheticFixture()
  try {
    const snapshots = await verifyCapture(f.capture, f)
    let saved
    let requests = 0
    await assert.rejects(validateSnapshots({ mode: 'smoke', capture: f.capture, snapshots, intervalMs: 0,
      validate: async () => { requests += 1; return { errors: 0, warnings: 0, infos: 0, messages: [] } },
      onProgress: async (report) => {
        saved = report
        if (report.counts.verified === 1) throw new Error('Simulated process interruption')
      },
    }), /process interruption/)
    assert.equal(requests, 1)
    assert.equal(saved.rows[0].status, 'VALIDATED')
    assert.equal(saved.counts.unverified, 4)
    let resumedRequests = 0
    const result = await validateSnapshots({ mode: 'smoke', capture: f.capture, snapshots,
      previousReport: saved, intervalMs: 0, validate: async () => {
        resumedRequests += 1
        return { errors: 0, warnings: 0, infos: 0, messages: [] }
      },
    })
    assert.equal(resumedRequests, 4)
    assert.equal(result.status, 'PASS — W3C HTML 0/0')
  } finally { await f.cleanup() }
})

test('matching complete full report can be resumed without contacting W3C', async () => {
  const f = await syntheticFixture('all')
  try {
    const snapshots = await verifyCapture(f.capture, f)
    const report = matchingReport(f.capture, snapshots, 'all')
    let calls = 0
    const result = await validateSnapshots({ mode: 'all', capture: f.capture, snapshots,
      previousReport: report, validate: async () => { calls += 1; throw new Error('Should not run') },
    })
    assert.equal(calls, 0)
    assert.equal(result.status, 'PASS — W3C HTML 0/0')
    assert.equal(result.rows.length, 47)
  } finally { await f.cleanup() }
})
