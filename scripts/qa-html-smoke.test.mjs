import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { HTML_QA_SMOKE, HTML_QA_ALL, HTML_QA_ROUTES } from './qa-html-routes.mjs'
import { requireSmokeArgs, smokeStatus, allCaptureStatus } from './qa-html-smoke.mjs'

const sha = createHash('sha256').update('synthetic document').digest('hex')
const rows = HTML_QA_SMOKE.map((item) => ({ pattern: item.pattern, status: 'CAPTURED', sha256: sha }))

test('CLI accepts smoke/all capture only and refuses unimplemented W3C approval', () => {
  assert.doesNotThrow(() => requireSmokeArgs(['--smoke']))
  assert.doesNotThrow(() => requireSmokeArgs(['--all']))
  assert.throws(() => requireSmokeArgs(['--full']), /never W3C validation/)
  assert.throws(() => requireSmokeArgs([]), /Supported/)
  assert.throws(() => requireSmokeArgs(['--all', '--force']), /Supported/)
})

test('capture success is explicitly not a W3C HTML PASS', () => {
  assert.equal(smokeStatus(rows), 'CAPTURED — NOT W3C VALIDATED')
})

test('unverified captures, duplicate, missing or invalid fingerprints cannot pass', () => {
  assert.equal(smokeStatus(rows.slice(0, 4)), 'UNVERIFIED')
  assert.equal(smokeStatus([...rows.slice(0, 4), rows[0]]), 'UNVERIFIED')
  assert.equal(smokeStatus(rows.map((row, i) => i === 4 ? { ...row, status: 'UNVERIFIED' } : row)), 'UNVERIFIED')
  assert.equal(smokeStatus(rows.map((row, i) => i === 4 ? { ...row, sha256: 'nope' } : row)), 'UNVERIFIED')
})

const allRows = HTML_QA_ALL.map(({ pattern }) => ({
  pattern, path: HTML_QA_ROUTES.find((row) => row.pattern === pattern).path,
  status: 'CAPTURED', sha256: sha, bytes: 1200,
}))

test('all-route capture reports 47/47 without claiming W3C validity', () => {
  assert.equal(allCaptureStatus(allRows), 'CAPTURED — NOT W3C VALIDATED')
})

test('all-route capture fails closed for missing, duplicate or unexpected routes', () => {
  assert.equal(allCaptureStatus(allRows.slice(0, -1)), 'UNVERIFIED')
  assert.equal(allCaptureStatus([...allRows.slice(0, -1), allRows[0]]), 'UNVERIFIED')
  assert.equal(allCaptureStatus(allRows.map((row, index) => index === 12 ? { ...row, pattern: '/fake' } : row)), 'UNVERIFIED')
})

test('all-route capture rejects invalid content, path, status and byte counts', () => {
  for (const changed of [
    { status: 'UNVERIFIED' }, { sha256: 'invalid' },
    { bytes: 0 }, { path: '/projects/someone-else' },
  ]) {
    assert.equal(allCaptureStatus(allRows.map((row, index) => index === 16 ? { ...row, ...changed } : row)), 'UNVERIFIED')
  }
})
