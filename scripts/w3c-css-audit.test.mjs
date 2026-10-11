import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { audit, parseSoapResponse, parseOptions, summarize } from './w3c-css-audit.mjs'

const soap = (errors = 0, warnings = 0) => `<?xml version="1.0"?>
<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope"><env:Body>
<m:cssvalidationresponse xmlns:m="http://www.w3.org/2005/07/css-validator">
<m:validity>${errors === 0}</m:validity><m:result>
<m:errors><m:errorcount>${errors}</m:errorcount>${errors ? '<m:errorlist><m:error><m:line>1</m:line><m:message>Bad color</m:message></m:error></m:errorlist>' : ''}</m:errors>
<m:warnings><m:warningcount>${warnings}</m:warningcount>${warnings ? '<m:warninglist><m:warning><m:line>3</m:line><m:message>Quoted &amp; safe</m:message></m:warning></m:warninglist>' : ''}</m:warnings>
</m:result></m:cssvalidationresponse></env:Body></env:Envelope>`

test('parses official SOAP error/warning counts and messages', () => {
  const result = parseSoapResponse(soap(1, 1))
  assert.equal(result.errors, 1)
  assert.equal(result.warnings, 1)
  assert.equal(result.valid, false)
  assert.equal(result.errorDetails[0].message, 'Bad color')
  assert.equal(result.warningDetails[0].message, 'Quoted & safe')
  assert.equal(parseSoapResponse(soap()).valid, true)
})

test('rejects HTML responses and missing SOAP fields rather than treating them as 0/0', () => {
  assert.throws(() => parseSoapResponse('<html>Rate limited</html>'), /SOAP/)
  assert.throws(() => parseSoapResponse('<m:cssvalidationresponse></m:cssvalidationresponse>'), /counts/)
})

test('accepts explicit safe CLI args, rejects unknown arguments', () => {
  assert.deepEqual(parseOptions(['--dry-run', '--max=2', '--only=Risk', '--force']), {
    dryRun: true, force: true, max: 2, only: 'Risk',
  })
  assert.throws(() => parseOptions(['--max=0']), /positive integer/)
  assert.throws(() => parseOptions(['--no-warnings']), /Unknown/)
  assert.equal(parseOptions(['--warning=1']).warningLevel, '1')
  assert.equal(parseOptions(['--warning=2']).warningLevel, '2')
  assert.throws(() => parseOptions(['--warning=0']), /must be 1.*2/)
  assert.throws(() => parseOptions(['--warning=no']), /must be 1.*2/)
})

test('summaries never count unverified or pending assets as passing', () => {
  const result = summarize({ good: { status: 'pass', errors: 0, warnings: 0 }, bad: { status: 'unverified' } }, 5)
  assert.deepEqual(result, { total: 5, verified: 1, passed: 1, issues: 0, unverified: 1, pending: 3, errors: 0, warnings: 0 })
})

test('batch audit retains warnings, SHA cache and pending without hiding unverified assets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'helmsight-w3c-'))
  try {
    mkdirSync(join(root, 'dist/assets'), { recursive: true })
    writeFileSync(join(root, 'dist/assets/A.css'), 'h1 {color:red}')
    writeFileSync(join(root, 'dist/assets/B.css'), 'h2 {color:blue}')
    writeFileSync(join(root, 'dist/assets/C.css'), 'h3 {color:green}')
    let called = 0
    const fetcher = async (_url, req) => {
      called++
      assert.equal(req.body.get('profile'), 'css3svg')
      assert.equal(req.body.get('warning'), '1')
      assert.equal(req.body.get('output'), 'soap12')
      assert.ok(req.body instanceof FormData)
      assert.equal(req.body.get('text').startsWith('h'), true)
      assert.equal(req.headers['Content-Type'], undefined)
      const multipartRequest = new Request('https://jigsaw.w3.org/css-validator/validator', { method: 'POST', body: req.body })
      assert.match(multipartRequest.headers.get('content-type'), /^multipart\/form-data; boundary=/)
      return { ok: true, text: async () => soap(0, called === 2 ? 1 : 0) }
    }
    const first = await audit({ root, options: { max: 2 }, fetcher })
    assert.equal(first.summary.passed, 1)
    assert.equal(first.summary.issues, 1)
    assert.equal(first.summary.pending, 1)
    assert.equal(called, 2)
    const second = await audit({ root, options: { max: 1 }, fetcher })
    assert.equal(second.summary.passed, 2)
    assert.equal(second.summary.issues, 1)
    assert.equal(second.summary.pending, 0)
    assert.equal(called, 3)
    const saved = JSON.parse(readFileSync(join(root, 'w3c-audit/report-normal.json'), 'utf8'))
    assert.equal(saved.summary.warnings, 1)
    assert.equal(saved.files['B.css'].warningDetails[0].message, 'Quoted & safe')
  } finally { rmSync(root, { recursive: true, force: true }) }
})


test('HTTP 500 is unverified with bounded diagnostic and no automatic repeat', async () => {
  const root = mkdtempSync(join(tmpdir(), 'helmsight-w3c-http500-'))
  try {
    mkdirSync(join(root, 'dist/assets'), { recursive: true })
    writeFileSync(join(root, 'dist/assets/Test.css'), 'h1 { color: red; }')
    let calls = 0
    const fetcher = async () => {
      calls++
      return { ok: false, status: 500, text: async () => '<html><h1>Server error</h1><p>Bad POST</p></html>' }
    }
    const report = await audit({ root, options: { max: 1 }, fetcher })
    assert.equal(calls, 1)
    assert.equal(report.summary.passed, 0)
    assert.equal(report.summary.unverified, 1)
    assert.match(report.files['Test.css'].failure, /HTTP 500: Server error Bad POST/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('normal and all-warnings runs use separate reports and correctly scope cache', async () => {
  const root = mkdtempSync(join(tmpdir(), 'helmsight-w3c-modes-'))
  try {
    mkdirSync(join(root, 'dist/assets'), { recursive: true })
    writeFileSync(join(root, 'dist/assets/StatusToast.css'), 'h1 { color: red; }')
    let requests = 0
    const fetcher = async (_url, req) => {
      requests++
      const level = req.body.get('warning')
      assert.ok(['1', '2'].includes(level))
      return { ok: true, text: async () => soap(0, level === '2' ? 6 : 0) }
    }
    const normal = await audit({ root, options: { only: 'StatusToast' }, fetcher })
    assert.equal(normal.summary.passed, 1)
    assert.equal(normal.warningLevel, '1')
    const all = await audit({ root, options: { only: 'StatusToast', warningLevel: '2' }, fetcher })
    assert.equal(all.summary.issues, 1)
    assert.equal(all.files['StatusToast.css'].warnings, 6)
    assert.equal(all.warningLevel, '2')
    assert.equal(requests, 2)
    assert.equal(JSON.parse(readFileSync(join(root, 'w3c-audit/report-normal.json'))).summary.passed, 1)
    assert.equal(JSON.parse(readFileSync(join(root, 'w3c-audit/report.json'))).summary.issues, 1)
    await audit({ root, options: { only: 'StatusToast' }, fetcher })
    assert.equal(requests, 2)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
