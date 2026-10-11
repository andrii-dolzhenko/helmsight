import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { minimizeErrorCss, parseReproArgs, runRepro } from './w3c-css-repro.mjs'

test('strict CLI limits targets and W3C request budget', () => {
  assert.deepEqual(parseReproArgs(['--only=MetricsPage','--max=8','--dry-run']), { only: 'MetricsPage', max: 8, dryRun: true })
  assert.throws(() => parseReproArgs(['--only=Unknown']))
  assert.throws(() => parseReproArgs(['--only=MetricsPage','--max=61']))
  assert.throws(() => parseReproArgs(['--force']))
})

test('minimizes a reproducible CSS error without making false 0/0 claims', async () => {
  const css = '.one{color:red}.two{background-image:linear-gradient(red,blue)}.broken{background-image:made-up(red)}.four{color:blue}.five{margin:1px}'
  const answer = await minimizeErrorCss(css, {
    maxRequests: 40,
    check: async (candidate) => ({ errors: candidate.includes('made-up(') ? 1 : 0, warnings: 0 }),
  })
  assert.equal(answer.status, 'minimized')
  assert.equal(answer.nodesAfter, 1)
  assert.match(answer.css, /\.broken/)
  assert.doesNotMatch(answer.css, /\.one/)
  assert.equal(answer.final.errors, 1)
})

test('captures interacting rules when neither rule alone fails', async () => {
  const css = '.one{color:red}.start{--accent:red}.other{color:blue}.end{background-image:linear-gradient(var(--accent),green)}.last{color:black}'
  const answer = await minimizeErrorCss(css, {
    maxRequests: 60,
    check: async (candidate) => ({ errors: candidate.includes('--accent:red') && candidate.includes('background-image:linear-gradient') ? 2 : 0, warnings: 0 }),
  })
  assert.equal(answer.status, 'minimized')
  assert.equal(answer.nodesAfter, 2)
  assert.match(answer.css, /\.start/)
  assert.match(answer.css, /\.end/)
})

test('budget exhaustion and network failures are not presented as passes', async () => {
  const css = Array.from({length:20},(_,i)=>`.a${i}{color:blue}`).join('') + '.broken{background-image:bad()}'
  const budget = await minimizeErrorCss(css, { maxRequests: 2, check: async (s)=>({ errors: s.includes('bad()') ? 1 : 0, warnings: 0 }) })
  assert.equal(budget.status, 'budget-exhausted')
  assert.equal(budget.checks.length, 2)
  const failure = await minimizeErrorCss(css, { maxRequests: 5, check: async () => { throw new Error('API down') } })
  assert.equal(failure.status, 'unverified')
  assert.equal(failure.checks[0].status, 'unverified')
})

test('dry run does not mutate files; live run emits reproducible CSS and diagnostics', async () => {
  const root = mkdtempSync(join(tmpdir(), 'helmsight-stage18-'))
  try {
    mkdirSync(join(root,'dist/assets'), { recursive:true })
    writeFileSync(join(root,'dist/assets/MetricsPage-demo.css'),'.good{color:blue}.bad{background-image:bad()}')
    const dry = await runRepro({root, options:{only:'MetricsPage',dryRun:true}})
    assert.equal(dry, null)
    const result = await runRepro({ root, options:{only:'MetricsPage', max:10},delayMs:0, validator:async(css)=>({errors:css.includes('bad()')?1:0,warnings:0}) })
    assert.equal(result.status,'minimized')
    assert.match(readFileSync(join(root,'w3c-audit/css-repro-MetricsPage.css'),'utf8'), /\.bad/)
    assert.equal(JSON.parse(readFileSync(join(root,'w3c-audit/css-repro-MetricsPage.json'),'utf8')).nodesAfter,1)
  } finally {rmSync(root,{recursive:true,force:true})}
})
