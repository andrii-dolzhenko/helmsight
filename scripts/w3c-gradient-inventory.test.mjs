import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inventory, parseInventoryArgs, runInventory } from './w3c-gradient-inventory.mjs'

const css = '.a{background-image:linear-gradient(red,var(--shade))}'
  + '.b{background:radial-gradient(red,transparent),#fff}'
  + '@media(max-width:20rem){.a{background-image:conic-gradient(red,blue)}}'
  + '.c{background-image:var(--gradient)}.d{background-color:color-mix(in srgb,red,blue)}'

const soap = (errorCount = 0) => `<?xml version="1.0"?><env:Envelope><cssvalidationresponse>`
  + `<validity>${errorCount === 0}</validity><result><errorcount>${errorCount}</errorcount>`
  + '<warningcount>0</warningcount></result>'
  + `<errors>${errorCount ? '<error><line>1</line><message>Bad gradient</message></error>' : ''}</errors>`
  + '</cssvalidationresponse></env:Envelope>'

test('inventories literal gradients including media rules while excluding unrelated or var-only declarations', () => {
  const rows = inventory(css, 'MetricsPage-sample.css')
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map((row) => row.property), ['background-image', 'background', 'background-image'])
  assert.match(rows[2].snippet, /conic-gradient/)
})

test('accepts narrow explicit CLI scope and rejects unreviewed flags', () => {
  assert.deepEqual(parseInventoryArgs(['--only=MetricsPage', '--max=2', '--dry-run']),
    { dryRun: true, only: 'MetricsPage', max: 2 })
  assert.throws(() => parseInventoryArgs(['--only=ReportsPage']), /--only/)
  assert.throws(() => parseInventoryArgs(['--max=100']), /--max/)
  assert.throws(() => parseInventoryArgs(['--warning=0']), /Unsupported/)
})

test('dry run does not send network requests, modify CSS, or write reports', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gradient-inventory-'))
  try {
    mkdirSync(join(root, 'dist/assets'), { recursive: true })
    const asset = join(root, 'dist/assets/MetricsPage-hash.css')
    writeFileSync(asset, css)
    const network = async () => { throw new Error('dry run must never send network') }
    const output = await runInventory({ root, options: { dryRun: true, only: 'MetricsPage' }, fetcher: network, delayMs: 0 })
    assert.equal(output, null)
    assert.equal(readFileSync(asset, 'utf8'), css)
    assert.equal(existsSync(join(root, 'w3c-audit/gradient-inventory.json')), false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('preserves error reports, passing results, and unverified responses independently', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gradient-inventory-'))
  try {
    mkdirSync(join(root, 'dist/assets'), { recursive: true })
    const asset = join(root, 'dist/assets/MetricsPage-hash.css')
    writeFileSync(asset, css)
    let count = 0
    const network = async () => {
      count++
      if (count === 3) return { ok: false, status: 500, text: async () => 'Bad POST' }
      return { ok: true, text: async () => soap(count === 1 ? 1 : 0) }
    }
    const report = await runInventory({ root, options: { only: 'MetricsPage' }, fetcher: network, delayMs: 0 })
    assert.deepEqual(report.results.map((r) => r.status), ['issues', 'pass', 'unverified'])
    assert.equal(report.results[0].errors, 1)
    assert.equal(report.results[1].errors, 0)
    assert.equal(report.results[2].errors, undefined)
    assert.match(readFileSync(join(root, 'w3c-audit/gradient-inventory.md'), 'utf8'), /Bad gradient/)
    assert.equal(readFileSync(asset, 'utf8'), css)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
