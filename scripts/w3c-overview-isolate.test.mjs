import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const postcss = require('postcss')
import {
  minimizeRadarDeclarations, parseOverviewArgs, runOverviewIsolation, splitOverviewCss,
} from './w3c-overview-isolate.mjs'

const css = [
  '._indexGauge_abc_2{background-image:linear-gradient(red,blue)}',
  '._radarPulse_abc_3{--radar-wave-radius:8%;background-image:radial-gradient(red,blue);filter:drop-shadow(0 0 .4rem red);mask:url(/assets/radar.svg) 50%/contain no-repeat}',
  '._another_abc_4{color:#abc}',
].join('\n')

const outcome = (errors, warnings = 0) => ({ errors, warnings, errorDetails: errors ? [{ message: 'synthetic W3C error' }] : [] })

test('Stage 20 CLI is explicit and restricts diagnostics to two reviewed modes', () => {
  assert.deepEqual(parseOverviewArgs(['--mode=radar', '--max=14', '--dry-run']),
    { mode: 'radar', max: 14, dryRun: true })
  assert.throws(() => parseOverviewArgs([]), /Specify/)
  assert.throws(() => parseOverviewArgs(['--mode=global']), /mode/)
  assert.throws(() => parseOverviewArgs(['--mode=remaining', '--max=41']), /max/)
  assert.throws(() => parseOverviewArgs(['--mode=radar', '--force']), /Unknown/)
})

test('Stage 20 isolates one actual radar rule and removes only it from remaining copy', () => {
  const split = splitOverviewCss(css)
  assert.equal(split.radar.selector, '._radarPulse_abc_3')
  assert.equal(split.radar.nodes.length, 4)
  assert.ok(!split.remaining.includes('_radarPulse_'))
  assert.ok(split.remaining.includes('_indexGauge_'))
  assert.ok(split.remaining.includes('_another_'))
  assert.ok(css.includes('_radarPulse_'), 'source string remains unchanged')
  assert.throws(() => splitOverviewCss('.a{color:red}'), /one direct radarPulse/)
  assert.throws(() => splitOverviewCss('._radarPulse_abc_1{color:red}._radarPulse_abc_2{color:blue}'), /found 2/)
})

test('Stage 20 declaration minimizer retains one offending declaration', async () => {
  const rule = splitOverviewCss(css).radar
  const got = await minimizeRadarDeclarations(rule, {
    check: async (text) => outcome(text.includes('mask:url(') ? 1 : 0), maxRequests: 20,
  })
  assert.equal(got.status, 'minimized')
  assert.equal(got.declarationsBefore, 4)
  assert.deepEqual(got.retainedProperties, ['mask'])
  assert.equal(got.final.errors, 1)
  assert.equal(postcss.parse(got.css).nodes[0].selector, rule.selector)
})

test('Stage 20 retains interdependent declarations instead of guessing a single offender', async () => {
  const rule = splitOverviewCss(css).radar
  const got = await minimizeRadarDeclarations(rule, {
    check: async (text) => outcome(text.includes('filter:') && text.includes('mask:') ? 1 : 0), maxRequests: 24,
  })
  assert.equal(got.status, 'minimized')
  assert.deepEqual(got.retainedProperties, ['filter', 'mask'])
  assert.equal(got.final.errors, 1)
})

test('Stage 20 reports W3C transport failure and request budget without claiming 0/0', async () => {
  const rule = splitOverviewCss(css).radar
  const failed = await minimizeRadarDeclarations(rule, { check: async () => { throw Error('HTTP 500') } })
  assert.equal(failed.status, 'unverified')
  assert.equal(failed.final.errors, null)
  const budget = await minimizeRadarDeclarations(rule, {
    maxRequests: 2, check: async (text) => outcome(text.includes('mask:') ? 1 : 0),
  })
  assert.equal(budget.status, 'budget-exhausted')
  assert.ok(budget.final.errors > 0)
})

test('Stage 20 dry run does not send W3C requests or create reports; live modes write independent evidence', async () => {
  const root = mkdtempSync(join(tmpdir(), 'hs-stage20-'))
  const assets = join(root, 'dist/assets')
  mkdirSync(assets, { recursive: true })
  writeFileSync(join(assets, 'ProjectOverviewPage-demo.css'), css)
  let requests = 0
  const validator = async (text) => {
    requests++
    return outcome(text.includes('mask:url(') || text.includes('_indexGauge_') ? 1 : 0)
  }
  try {
    assert.equal(await runOverviewIsolation({ root, options: { mode: 'radar', max: 16, dryRun: true }, validator, delayMs: 0 }), null)
    assert.equal(requests, 0)
    assert.equal(existsSync(join(root, 'w3c-audit')), false)
    const radar = await runOverviewIsolation({ root, options: { mode: 'radar', max: 16 }, validator, delayMs: 0 })
    assert.equal(radar.final.errors, 1)
    const remaining = await runOverviewIsolation({ root, options: { mode: 'remaining', max: 16 }, validator, delayMs: 0 })
    assert.equal(remaining.final.errors, 1)
    assert.ok(!remaining.css.includes('_radarPulse_'))
    assert.ok(readFileSync(join(root, 'w3c-audit/stage20-radar.md'), 'utf8').includes('Retained properties'))
    assert.ok(readFileSync(join(root, 'w3c-audit/stage20-overview-remaining.json'), 'utf8').includes('"mode": "remaining"'))
    assert.ok(!existsSync(join(root, 'w3c-audit/report-normal.json')))
    assert.equal(readFileSync(join(assets, 'ProjectOverviewPage-demo.css'), 'utf8'), css)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
