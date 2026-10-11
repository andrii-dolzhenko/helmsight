import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isolate, PROBES, parseProbeArgs, probe } from './w3c-gradient-probe.mjs'

const css = '._indexCard_abc{background-image:linear-gradient(90deg,var(--index-accent),transparent)}'
  + '._indexCard_abc.healthy{--index-accent:#0a0}'
  + '._indexState_def{background-color:color-mix(in srgb,var(--index-accent) 10%,white)}'

test('isolates exact CSS Module declaration without matching other classes', () => {
  const row = isolate(css, PROBES[0])
  assert.equal(row.value, 'linear-gradient(90deg,var(--index-accent),transparent)')
  assert.match(row.snippet, /^\.w3cProbe \{ background-image:/)
  assert.throws(() => isolate(css, { className: 'indexCardOther', property: 'background-image' }), /expected one/)
})

test('rejects ambiguous declarations and unexpected flags', () => {
  assert.throws(() => isolate(css + '._indexCard_xyz{background-image:none}', PROBES[0]), /found 2/)
  assert.deepEqual(parseProbeArgs(['--dry-run','--max=3']), { dryRun: true, max: 3 })
  assert.throws(() => parseProbeArgs(['--max=10']), /--max/)
  assert.throws(() => parseProbeArgs(['--warning=0']), /Unsupported/)
})

const wrap = (errorCount=0, warningCount=0) => `<?xml version="1.0"?><env:Envelope><cssvalidationresponse><validity>${errorCount===0}</validity><result><errorcount>${errorCount}</errorcount><warningcount>${warningCount}</warningcount></result><errors>${errorCount ? '<error><line>1</line><message>Unsupported background-image syntax</message></error>' : ''}</errors></cssvalidationresponse></env:Envelope>`

test('probe reports server errors as unverified without mutating original CSS', async () => {
  const root = mkdtempSync(join(tmpdir(), 'w3c-probe-'))
  try {
    mkdirSync(join(root,'dist/assets'), {recursive:true})
    writeFileSync(join(root,'dist/assets/MetricsPage-TEST.css'), css)
    const good = async () => ({ok:true,text:async()=>wrap(1)})
    const report = await probe({root,options:{max:1},fetcher:good,delayMs:0})
    assert.equal(report.results[0].status,'issues')
    assert.equal(report.results[0].errors,1)
    assert.match(readFileSync(join(root,'w3c-audit/gradient-probes.md'),'utf8'), /Unsupported background-image syntax/)
    assert.equal(readFileSync(join(root,'dist/assets/MetricsPage-TEST.css'),'utf8'),css)
    const bad = async () => ({ok:false,status:500,text:async()=> 'Bad POST'})
    const second = await probe({root,options:{max:1},fetcher:bad,delayMs:0})
    assert.equal(second.results[0].status, 'unverified')
    assert.equal(second.results[0].errors,undefined)
  } finally { rmSync(root,{recursive:true,force:true}) }
})
