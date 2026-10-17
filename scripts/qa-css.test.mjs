import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { inspectAll, compareBaseline, parseMode, baselineCandidate, markdown } from './qa-css.mjs'

function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'helmsight-qa-'))
  mkdirSync(join(root, 'dist/assets'), { recursive: true })
  mkdirSync(join(root, 'w3c-audit'), { recursive: true })
  const name = 'ReportsPage-abcdefgh.css'
  const css = '.x{color:red}'
  writeFileSync(join(root, 'dist/assets', name), css)
  const sha256 = createHash('sha256').update(css).digest('hex')
  for (const level of ['1', '2']) {
    const warnings = level === '1' ? 0 : 5
    const row = { file: name, sha256, status: warnings ? 'issues' : 'pass',
      errors: 0, warnings, profile: 'css3svg', warningLevel: level }
    const report = { profile: 'css3svg', warningLevel: level, selection: 'all',
      generatedAt: new Date().toISOString(), files: { [name]: row },
      summary: { total: 1, verified: 1, unverified: 0, pending: 0, errors: 0, warnings } }
    Object.assign(report, overrides[level] ?? {})
    writeFileSync(join(root, 'w3c-audit', level === '1' ? 'report-normal.json' : 'report.json'),
      JSON.stringify(report))
  }
  return root
}

test('CLI allows only explicitly supported QA modes', () => {
  assert.equal(parseMode(['--changed']), 'changed')
  assert.equal(parseMode(['--full']), 'full')
  assert.throws(() => parseMode(['--force']), /Usage/)
})

test('full report has accurate raw gates and never claims HTML PASS', () => {
  const root = fixture()
  try {
    const qa = inspectAll(root)
    assert.equal(qa.cssErrorGate, 'PASS')
    assert.equal(qa.rawZeroZeroTarget, 'NOT MET')
    assert.match(qa.htmlValidation, /NOT VERIFIED/)
    assert.equal(qa.profiles['2'].warnings, 5)
    assert.match(markdown(qa), /5 warnings/)
    const baseline = baselineCandidate(qa)
    assert.equal(compareBaseline(qa.profiles, baseline).status, 'NO PER-ASSET REGRESSION')
    baseline.profiles['2'].files.ReportsPage.warnings = 4
    assert.equal(compareBaseline(qa.profiles, baseline).status, 'REVIEW REQUIRED')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('stale CSS hashes cannot pass via cached historic W3C report', () => {
  const root = fixture()
  try {
    writeFileSync(join(root, 'dist/assets', 'ReportsPage-abcdefgh.css'), '.x{color:blue}')
    assert.throws(() => inspectAll(root), /Stale CSS SHA/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('partial audit selection cannot be treated as full verification', () => {
  const root = fixture({ '1': { selection: 'ReportsPage' } })
  try { assert.throws(() => inspectAll(root), /Partial selection/) }
  finally { rmSync(root, { recursive: true, force: true }) }
})

test('unverified row blocks claim of complete verification', () => {
  const root = fixture({ '1': { summary: { total: 1, verified: 0, pending: 0, unverified: 1, errors: 0, warnings: 0 } } })
  try { assert.throws(() => inspectAll(root), /Report totals\/coverage mismatch/) }
  finally { rmSync(root, { recursive: true, force: true }) }
})
