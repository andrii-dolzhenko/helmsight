import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseMatrixArgs, runMatrix, variantsFor } from './w3c-gradient-matrix.mjs'

const indexCard = 'linear-gradient(90deg,color-mix(in srgb,var(--index-accent) 8%,var(--color-surface)),var(--color-surface) 48%)'
const indexGauge = 'radial-gradient(circle at 14% 8%, color-mix(in srgb, var(--gauge-accent) 8%, transparent), transparent 42%), linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 76%, var(--color-canvas)), var(--color-surface))'
const gaugeRing = 'conic-gradient(from 0deg, color-mix(in srgb, var(--gauge-accent) 82%, white) 0 var(--gauge-progress), var(--gauge-track) var(--gauge-progress) 100%)'

const xml = (errors = 0) => `<?xml version="1.0"?><env:Envelope><cssvalidationresponse><validity>${errors === 0}</validity><result><errorcount>${errors}</errorcount><warningcount>0</warningcount></result><errors>${errors ? '<error><line>1</line><message>Invalid gradient</message></error>' : ''}</errors></cssvalidationresponse></env:Envelope>`

const makeRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'helmsight-matrix-'))
  mkdirSync(join(root, 'dist/assets'), { recursive: true })
  const metricCss = `._indexCard_abc{background-image:${indexCard}}`
  const overviewCss = `._indexGauge_def{background-image:${indexGauge}}._gaugeRing_ghi{background-image:${gaugeRing}}`
  writeFileSync(join(root, 'dist/assets/MetricsPage-TEST.css'), metricCss)
  writeFileSync(join(root, 'dist/assets/ProjectOverviewPage-TEST.css'), overviewCss)
  return { root, metricCss, overviewCss }
}

test('each variation is derived from reviewed gradient and constrained to its expected tokens', () => {
  assert.equal(variantsFor('indexCard', indexCard).length, 5)
  assert.equal(variantsFor('indexGauge', indexGauge).length, 5)
  assert.equal(variantsFor('gaugeRing', gaugeRing).length, 6)
  assert.match(variantsFor('indexGauge', indexGauge)[1].value, /^radial-gradient/)
  assert.match(variantsFor('indexGauge', indexGauge)[2].value, /^linear-gradient/)
  assert.match(variantsFor('gaugeRing', gaugeRing)[4].value, /conic-gradient\(red,blue\)/)
  assert.throws(() => variantsFor('indexCard', 'linear-gradient(red,blue)'), /Expected/)
  assert.throws(() => variantsFor('indexGauge', 'radial-gradient(red,blue)'), /no longer contains/)
  assert.throws(() => variantsFor('gaugeRing', 'conic-gradient(red,blue)'), /Expected/)
})

test('accepts narrow CLI selection and rejects invalid flags', () => {
  assert.deepEqual(parseMatrixArgs(['--dry-run', '--only=gaugeRing', '--max=3']), { dryRun: true, only: 'gaugeRing', max: 3 })
  assert.throws(() => parseMatrixArgs(['--only=foo']), /--only/)
  assert.throws(() => parseMatrixArgs(['--max=17']), /--max/)
  assert.throws(() => parseMatrixArgs(['--warning=0']), /Unsupported/)
})

test('dry-run never sends a request or writes reports', async () => {
  const { root, metricCss } = makeRoot()
  try {
    const report = await runMatrix({ root, options: { only: 'indexCard', dryRun: true }, fetcher: () => { throw new Error('should not request') }, delayMs: 0 })
    assert.equal(report, null)
    assert.equal(readFileSync(join(root, 'dist/assets/MetricsPage-TEST.css'), 'utf8'), metricCss)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('records successful and failed comparisons without touching build assets', async () => {
  const { root, metricCss } = makeRoot()
  try {
    let count = 0
    const fetcher = async () => ({ ok: true, text: async () => xml(count++ === 0 ? 1 : 0) })
    const result = await runMatrix({ root, options: { only: 'indexCard', max: 3 }, fetcher, delayMs: 0 })
    assert.deepEqual(result.results.map((row) => row.status), ['issues', 'pass', 'pass'])
    assert.equal(readFileSync(join(root, 'dist/assets/MetricsPage-TEST.css'), 'utf8'), metricCss)
    assert.match(readFileSync(join(root, 'w3c-audit/gradient-matrix.md'), 'utf8'), /synthetic variations/)
    const json = JSON.parse(readFileSync(join(root, 'w3c-audit/gradient-matrix.json'), 'utf8'))
    assert.equal(json.results.length, 3)
    const unavailable = await runMatrix({ root, options: { only: 'indexCard', max: 1 },
      fetcher: async () => ({ ok: false, status: 500, text: async () => 'Bad POST' }), delayMs: 0 })
    assert.equal(unavailable.results[0].status, 'unverified')
    assert.equal(unavailable.results[0].errors, undefined)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
