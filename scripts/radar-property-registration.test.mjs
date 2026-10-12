import test from 'node:test'
import assert from 'node:assert/strict'
import { registerRadarWaveRadius } from '../src/pages/ProjectOverviewPage/registerRadarWaveRadius.js'

test('Stage 44: JS registration preserves exact CSS @property descriptors', () => {
  const calls = []
  assert.equal(registerRadarWaveRadius({ registerProperty: (options) => calls.push(options) }), true)
  assert.deepEqual(calls, [{
    name: '--radar-wave-radius',
    syntax: '<percentage>',
    inherits: false,
    initialValue: '8%',
  }])
})

test('Stage 44: unsupported browsers retain progressive fallback without throwing', () => {
  assert.equal(registerRadarWaveRadius(null), false)
  assert.equal(registerRadarWaveRadius({}), false)
})

test('Stage 44: duplicate registration from HMR is not fatal', () => {
  const duplicate = Object.assign(new Error('already registered'), { name: 'InvalidModificationError' })
  assert.equal(registerRadarWaveRadius({ registerProperty: () => { throw duplicate } }), false)
})

test('Stage 44: unexpected registration errors are never swallowed', () => {
  const unexpected = new TypeError('invalid descriptor')
  assert.throws(() => registerRadarWaveRadius({ registerProperty: () => { throw unexpected } }),
    (error) => error === unexpected)
})
