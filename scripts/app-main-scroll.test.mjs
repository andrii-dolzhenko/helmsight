import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(
  new URL('../src/layouts/AppLayout/AppLayout.module.css', import.meta.url),
  'utf8',
)

test('app main clips its background without becoming a hidden scroll container', () => {
  const mainRule = css.match(/(?:^|\n)\.main\s*\{([^}]*)\}/)
  assert.ok(mainRule, 'Expected the AppLayout .main rule')
  assert.match(mainRule[1], /(?:^|\n)\s*overflow:\s*clip\s*;/)
  assert.doesNotMatch(mainRule[1], /overflow:\s*hidden\s*;/)

  const decorationRule = css.match(/(?:^|\n)\.main::before\s*\{([^}]*)\}/)
  assert.ok(decorationRule, 'Expected the workspace pattern pseudo-element')
  assert.match(decorationRule[1], /inset:\s*-40rem\s*;/)
  assert.match(decorationRule[1], /pointer-events:\s*none\s*;/)
})
