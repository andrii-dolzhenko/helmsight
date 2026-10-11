import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveValue, mixColor, transform, themedSelector, allCss, buildThemeTokens } from './w3c-theme-preview.mjs'
import { w3cApprovedCssPilots } from './w3c-vite-pilot.mjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const postcss = createRequire(import.meta.url)('postcss')

const themes={
  light:new Map([['--surface','#fffdf8'],['--accent','#177a58'],['--gap','1rem']]),
  dark:new Map([['--surface','#14201d'],['--accent','#6fd5a3'],['--gap','1rem']]),
  unsafe:new Map([['--local',['sample.css:8']]]),
}

test('static token values resolve for both themes',()=>{
  assert.equal(resolveValue('1px solid var(--accent)',themes.light,themes.unsafe).value,'1px solid #177a58')
  assert.equal(resolveValue('var(--gap)',themes.dark,themes.unsafe).value,'1rem')
})
test('known colors are premultiplied with transparency',()=>{
  const result=mixColor('in srgb, #ff0000 20%, transparent')
  assert.equal(result,'rgb(255 0 0 / 0.2)')
})
test('scoped and unknown runtime tokens are not replaced',()=>{
  assert.match(resolveValue('var(--local)',themes.light,themes.unsafe).errors.join(','),/scoped token/)
  assert.match(resolveValue('var(--progress)',themes.dark,themes.unsafe).errors.join(','),/runtime token/)
})
test('clones dark rules without changing class selectors or media nesting',()=>{
  const result=transform('@media (max-width: 800px) { .card { color: var(--accent); margin: var(--gap); background: color-mix(in srgb, var(--surface) 90%, transparent); } }','/tmp/Example.module.css',themes)
  assert.equal(result.report.unhandled,0)
  assert.equal(result.report.changed,3)
  assert.equal(result.report.darkRules,1)
  assert.match(result.css,/:global\(:where\(html\[data-theme='dark'\]\)\) \.card/)
  assert.match(result.css,/#177a58/)
  assert.match(result.css,/#6fd5a3/)
})
test('dark-only original selectors use dark token and do not clone',()=>{
  const r=transform(":global(html[data-theme='dark']) .card { color: var(--accent) }",'/tmp/Example.module.css',themes)
  assert.equal(r.report.darkRules,0)
  assert.match(r.css,/#6fd5a3/)
})
test('selectors with :root do not become impossible descendant selectors',()=>{
  assert.equal(themedSelector(':root [data-ui-button]',false),":root[data-theme='dark'] [data-ui-button]")
})
test('unresolvable tokens stay in preview and are explicitly reported',()=>{
  const r=transform('.item { width: var(--progress); color: var(--local) }','/tmp/Example.module.css',themes)
  assert.equal(r.report.unhandled,2)
  assert.match(r.css,/var\(--progress\)/)
  assert.match(r.css,/var\(--local\)/)
})


test('Vite W3C pilots do not transform non-approved CSS', () => {
  const plugin = w3cApprovedCssPilots()
  assert.equal(plugin.apply, 'build')
  assert.equal(plugin.enforce, 'pre')
  assert.equal(plugin.transform('h1 { color: var(--color-text) }', '/tmp/SomePage.module.css'), null)
})

test('Vite W3C pilots inline StatusToast tokens before CSS Modules', () => {
  const file = resolve(import.meta.dirname, '../src/shared/ui/StatusToast/StatusToast.module.css')
  const plugin = w3cApprovedCssPilots()
  const transformed = plugin.transform.call({ error: (message) => { throw new Error(message) } }, readFileSync(file, 'utf8'), file)
  assert.ok(transformed)
  assert.doesNotMatch(transformed.code, /\b(?:var|color-mix)\(/)
  assert.match(transformed.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
  assert.match(transformed.code, /#177a58/)
  assert.match(transformed.code, /#6fd5a3/)
  assert.match(transformed.code, /@media \(max-width: 780px\)/)
})


test('Vite W3C pilots compile approved EVM and Management Actions Help modules', () => {
  const plugin = w3cApprovedCssPilots()
  for (const path of [
    '../src/features/evm/ui/EvmHelp.module.css',
    '../src/features/managementActions/ui/ManagementActionsHelp.module.css',
  ]) {
    const file = resolve(import.meta.dirname, path)
    const source = readFileSync(file, 'utf8')
    const transformed = plugin.transform.call(
      { error: (message) => { throw new Error(message) } }, source, file,
    )
    assert.ok(transformed, `${path} must be explicitly approved`)
    assert.doesNotMatch(transformed.code, /\b(?:var|color-mix)\(/)
    assert.match(transformed.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
    assert.match(transformed.code, /#177a58/)
    assert.match(transformed.code, /#6fd5a3/)
    assert.match(transformed.code, /@media \(max-width: 560px\)/)
    assert.match(transformed.code, /backdrop-filter: blur\(0\.3rem\)/)
  }
})

test('Vite W3C pilots fail closed when an approved module gets a runtime token', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/features/evm/ui/EvmHelp.module.css')
  assert.throws(
    () => plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      '.helpButton { color: var(--unknown-runtime-color) }', file,
    ),
    /W3C pilot .*EvmHelp\.module\.css left 1 unresolved declarations/,
  )
})


test('approved output avoids W3C unquoted multi-word display fallback warning', () => {
  const file = resolve(import.meta.dirname, '../src/features/evm/ui/EvmHelp.module.css')
  const plugin = w3cApprovedCssPilots()
  const result = plugin.transform.call(
    { error: (message) => { throw new Error(message) } },
    readFileSync(file, 'utf8'), file,
  )
  assert.match(result.code, /font-family:\s*Georgia, serif/)
  assert.doesNotMatch(result.code, /Times New Roman/)
  // The authoring token remains unchanged in global.css.
  const tokens = readFileSync(resolve(import.meta.dirname, '../src/shared/styles/global.css'), 'utf8')
  assert.match(tokens, /--font-display:\s*Georgia, 'Times New Roman', serif/)
})

test('approved Action Editor and Management Action form CSS retain dark theme and resolve static tokens', () => {
  const plugin = w3cApprovedCssPilots()
  for (const path of [
    '../src/pages/ActionEditorPage/ActionEditorPage.module.css',
    '../src/features/managementActions/ui/ManagementActionForm.module.css',
  ]) {
    const file = resolve(import.meta.dirname, path)
    const result = plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      readFileSync(file, 'utf8'), file,
    )
    assert.ok(result, `${path} must be explicitly approved`)
    assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/)
    assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
    assert.match(result.code, /#177a58/)
    assert.match(result.code, /#6fd5a3/)
    assert.doesNotMatch(result.code, /Times New Roman/)
  }
})


test('Vite W3C pilots compile ConfirmDialog CSS with safe theme overrides', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/shared/ui/ConfirmDialog/ConfirmDialog.module.css')
  const source = readFileSync(file, 'utf8')
  const result = plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, source, file,
  )
  assert.ok(result, 'ConfirmDialog must be explicitly approved')
  assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/)
  assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
  assert.match(result.code, /#177a58/)
  assert.match(result.code, /#6fd5a3/)
  assert.match(result.code, /@media \(max-width: 520px\)/)
  assert.match(result.code, /backdrop-filter: blur\(0\.3rem\)/)
  assert.doesNotMatch(result.code, /Times New Roman/)
})

test('Vite W3C pilots compile RiskDetail CSS without altering severity semantics', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/pages/RiskDetailPage/RiskDetailPage.module.css')
  const source = readFileSync(file, 'utf8')
  const result = plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, source, file,
  )
  assert.ok(result, 'RiskDetailPage must be explicitly approved')
  assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/)
  assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
  assert.match(result.code, /#177a58/)
  assert.match(result.code, /#6fd5a3/)
  for (const severity of ['.low', '.medium', '.high', '.critical']) {
    assert.ok(result.code.includes(severity), `must preserve ${severity} styles`)
  }
  assert.doesNotMatch(result.code, /Times New Roman/)
})


test('Vite W3C stage 5 compiles Risk Editor CSS while preserving layout and dark theme', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/pages/RiskEditorPage/RiskEditorPage.module.css')
  const result = plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, readFileSync(file, 'utf8'), file,
  )
  assert.ok(result, 'RiskEditorPage must be explicitly approved')
  assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/)
  assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
  assert.match(result.code, /#177a58/)
  assert.match(result.code, /#6fd5a3/)
  assert.match(result.code, /\.root \{ display:grid/)
  assert.doesNotMatch(result.code, /Times New Roman/)
})

test('Vite W3C stage 5 compiles Risk Form and preserves score severity states', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/features/risks/ui/RiskForm.module.css')
  const result = plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, readFileSync(file, 'utf8'), file,
  )
  assert.ok(result, 'RiskForm must be explicitly approved')
  assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/)
  assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
  for (const severity of ['.scorePreview.low', '.scorePreview.medium', '.scorePreview.high', '.scorePreview.critical']) {
    assert.ok(result.code.includes(severity), `must preserve ${severity}`)
  }
  assert.match(result.code, /color-scheme:dark/)
  assert.match(result.code, /@media \(max-width:680px\)/)
  assert.doesNotMatch(result.code, /Times New Roman/)
})


test('Stage 7 batch: nine CSS modules resolve static values without losing dark overrides', () => {
  const plugin = w3cApprovedCssPilots()
  const modules = [
    '../src/features/evm/ui/EvmForms.module.css',
    '../src/pages/MetricsBaselineEditorPage/MetricsBaselineEditorPage.module.css',
    '../src/pages/MetricsSnapshotEditorPage/MetricsSnapshotEditorPage.module.css',
    '../src/features/milestones/ui/MilestoneForm.module.css',
    '../src/pages/MilestoneEditorPage/MilestoneEditorPage.module.css',
    '../src/pages/NotFoundPage/NotFoundPage.module.css',
    '../src/features/successCriteria/ui/SuccessCriterionForm.module.css',
    '../src/pages/SuccessCriterionEditorPage/SuccessCriterionEditorPage.module.css',
    '../src/pages/ReportsPage/ReportHelp.module.css',
  ]
  for (const path of modules) {
    const file = resolve(import.meta.dirname, path)
    const result = plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      readFileSync(file, 'utf8'), file,
    )
    assert.ok(result, `${path} must be explicitly approved`)
    assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/, `${path} must have no unresolved CSS functions`)
    assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/,
      `${path} must preserve a separate dark-theme style`)
    assert.doesNotMatch(result.code, /Times New Roman/)
  }
})

test('Stage 7 original landing-module exclusion remains in force', () => {
  const plugin = w3cApprovedCssPilots()
  for (const path of [
    '../src/pages/LandingPage/LandingPage.module.css',
  ]) {
    const file = resolve(import.meta.dirname, path)
    const transformed = plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      readFileSync(file, 'utf8'), file,
    )
    assert.equal(transformed, null, `unsafe/non-approved module must not be transformed: ${path}`)
  }
})


test('Stage 8 batch: nine safe feature, project and shell modules preserve both themes', () => {
  const plugin = w3cApprovedCssPilots()
  const modules = [
    '../src/features/successCriteria/ui/SuccessCriteriaHelp.module.css',
    '../src/features/projects/ui/ProjectEditorPage.module.css',
    '../src/features/projects/ui/ProjectForm.module.css',
    '../src/features/projects/ui/GovernanceForms.module.css',
    '../src/features/preferences/ui/ThemeControl.module.css',
    '../src/pages/ProjectsPage/ProjectsPage.module.css',
    '../src/pages/RisksPage/RisksPage.module.css',
    '../src/layouts/AppLayout/AppLayout.module.css',
    '../src/layouts/ProjectLayout/ProjectLayout.module.css',
  ]
  for (const path of modules) {
    const file = resolve(import.meta.dirname, path)
    const transformed = plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      readFileSync(file, 'utf8'), file,
    )
    assert.ok(transformed, `Stage 8 must approve ${path}`)
    assert.doesNotMatch(transformed.code, /\b(?:var|color-mix)\(/, `${path}: no unresolved CSS functions`)
    assert.match(transformed.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/,
      `${path}: dark theme overrides remain`)
    assert.doesNotMatch(transformed.code, /Times New Roman/,
      `${path}: validator-safe font stack`)
  }
})

test('Stage 8 original dashboard exclusion is superseded only by Stage 12 strict live allowlist', () => {
  const plugin = w3cApprovedCssPilots()
  for (const path of [
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css',
    '../src/pages/MetricsPage/MetricsPage.module.css',
  ]) {
    const file = resolve(import.meta.dirname, path)
    const result = plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      readFileSync(file, 'utf8'), file,
    )
    assert.ok(result, `Stage 12 must explicitly approve its reviewed live CSS: ${path}`)
  }
})


test('Stage 9: EVM trends and Success Criteria register resolve only static theme values', () => {
  const plugin = w3cApprovedCssPilots()
  const modules = [
    '../src/features/evm/ui/EvmHistoricalTrends.module.css',
    '../src/pages/SuccessCriteriaPage/SuccessCriteriaPage.module.css',
  ]
  for (const path of modules) {
    const file = resolve(import.meta.dirname, path)
    const source = readFileSync(file, 'utf8')
    const result = plugin.transform.call(
      { error: (message) => { throw new Error(message) } },
      source, file,
    )
    assert.ok(result, `Stage 9 must approve ${path}`)
    assert.doesNotMatch(result.code, /\b(?:var|color-mix)\(/,
      `${path} must contain no unresolved theme functions`)
    assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/,
      `${path} must retain dark-theme CSS`)
    assert.doesNotMatch(result.code, /Times New Roman/)
  }
})

test('Stage 9: status badge semantics and legacy multiline clipping remain unchanged', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/pages/SuccessCriteriaPage/SuccessCriteriaPage.module.css')
  const source = readFileSync(file, 'utf8')
  const transformed = plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, source, file,
  ).code
  for (const selector of ['.atRisk', '.missed', '.achieved']) {
    assert.ok(transformed.includes(selector), `must preserve ${selector}`)
  }
  for (const declaration of ['display: -webkit-box;', '-webkit-box-orient: vertical;', '-webkit-line-clamp: 2;']) {
    assert.ok(source.includes(declaration), `precondition ${declaration}`)
    assert.ok(transformed.includes(declaration), `must not remove ${declaration}`)
  }
  const landing = readFileSync(
    resolve(import.meta.dirname, '../src/pages/LandingPage/LandingPage.module.css'), 'utf8',
  )
  assert.match(landing, /font-family:\s*Georgia, serif;/)
  assert.doesNotMatch(landing, /Times New Roman/)
})


test('Stage 10: five hybrid page modules resolve static theme tokens but preserve exact live values', () => {
  const plugin = w3cApprovedCssPilots()
  const cases = [
    ['ActionsPage', 97, 43, ['--action-target-shadow']],
    ['MeetingsPage', 60, 32, ['color-mix(in srgb, currentColor 4%, transparent)']],
    ['MilestonesPage', 81, 41, ['--roadmap-position', '--roadmap-item-width', '--roadmap-edge-width']],
    ['GovernancePage', 78, 42, ['--charter-grid-gap', '--charter-card-padding']],
    ['ReportsPage', 150, 84, ['color-mix(in srgb, currentColor 4%, transparent)']],
  ]
  for (const [name, staticValues, darkRules, liveTokens] of cases) {
    const path = `../src/pages/${name}/${name}.module.css`
    const file = resolve(import.meta.dirname, path)
    const source = readFileSync(file, 'utf8')
    const result = plugin.transform.call(
      { error: (message) => { throw new Error(message) } }, source, file,
    )
    assert.ok(result, `${name} must be explicitly approved`)
    assert.ok(result.code.includes(":global(:where(html[data-theme='dark']))"),
      `${name} must retain dark overrides`)
    for (const token of liveTokens) assert.ok(result.code.includes(token),
      `${name} must preserve live value ${token}`)
    const tokens = buildThemeTokens(allCss(resolve(import.meta.dirname, '../src')))
    const report = transform(source, file, tokens).report
    assert.equal(report.changed, staticValues, `${name}: static substitutions count`)
    assert.equal(report.darkRules, darkRules, `${name}: dark rules count`)
    assert.ok(report.unhandled > 0, `${name}: only documented live declarations may remain`)
  }
})

test('Stage 10 fails closed if a hybrid module acquires unknown or changed dynamic declarations', () => {
  const plugin = w3cApprovedCssPilots()
  const file = resolve(import.meta.dirname, '../src/pages/ActionsPage/ActionsPage.module.css')
  const source = readFileSync(file, 'utf8')
  const call = (text) => plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, text, file,
  )
  assert.ok(call(source))
  assert.throws(
    () => call(source + '\n.newDynamicProperty { opacity: var(--surprise-opacity); }\n'),
    /W3C pilot .*ActionsPage\.module\.css left 2 unresolved declarations/,
  )
  assert.throws(
    () => call(source.replace('var(--action-target-shadow)', 'var(--wrong-shadow)')),
    /W3C pilot .*ActionsPage\.module\.css left 1 unresolved declarations/,
  )
})


test('Stage 11: Meeting Notes primary button retains solid two-theme fill and a 1px border', () => {
  const file = resolve(import.meta.dirname, '../src/pages/MeetingsPage/MeetingsPage.module.css')
  const source = readFileSync(file, 'utf8')
  assert.match(source, /\.primaryAction\s*\{\s*border-color:\s*transparent;\s*background:\s*var\(--color-text\);\s*color:\s*var\(--color-canvas\);/)
  assert.match(source, /\.actionButton,[\s\S]*?border:\s*1px solid var\(--color-border\);/)
  const plugin = w3cApprovedCssPilots()
  const result = plugin.transform.call(
    { error: (message) => { throw new Error(message) } }, source, file,
  )
  assert.ok(result)
  assert.match(result.code, /\.primaryAction\s*\{\s*border-color:\s*transparent;/)
  assert.match(result.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/)
  assert.match(result.code, /color-mix\(in srgb, currentColor 4%, transparent\)/)
})

test('Stage 11: print rules omit cursor but preserve screen interactions and print layout', () => {
  const file = resolve(import.meta.dirname, '../src/pages/ReportsPage/ReportsPage.module.css')
  const source = readFileSync(file, 'utf8')
  const printStart = source.lastIndexOf('@media print {')
  assert.ok(printStart > 0)
  const screen = source.slice(0, printStart)
  const print = source.slice(printStart)
  assert.match(screen, /cursor:\s*pointer;/)
  assert.doesNotMatch(print, /cursor\s*:/)
  assert.match(print, /\.collapsibleTrigger\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto;/)
  assert.match(print, /\.printOnly\s*\{\s*display:\s*block;/)
})


test('Stage 12 dashboard hybrid CSS compiles static themes but preserves every reviewed runtime declaration', () => {
  const plugin = w3cApprovedCssPilots()
  for (const [path, expectedStatic, expectedDark, expectedLive, uniqueTokens] of [
    [
      '../src/pages/MetricsPage/MetricsPage.module.css', 73, 38, 7,
      ['--index-accent'],
    ],
    [
      '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css', 123, 67, 25,
      ['--health-accent', '--summary-accent', '--gauge-accent', '--gauge-track',
        '--gauge-progress', '--radar-accent', '--radar-wave-radius', '--delivery-stack-collapsed-height'],
    ],
  ]) {
    const file = resolve(import.meta.dirname, path)
    const source = readFileSync(file, 'utf8')
    const tokens = buildThemeTokens(allCss(resolve(import.meta.dirname, '../src')))
    const preview = transform(source, file, tokens)
    assert.equal(preview.report.changed, expectedStatic, `${path} static resolutions`)
    assert.equal(preview.report.darkRules, expectedDark, `${path} scoped dark styles`)
    assert.equal(preview.report.unhandled, expectedLive, `${path} documented live declarations`)
    const built = plugin.transform.call(
      { error: (message) => { throw new Error(message) } }, source, file,
    )
    assert.ok(built, `${path} must opt in`)
    assert.equal(built.code, preview.css, `${path} only does the audited transform`)
    assert.match(built.code, /:global\(:where\(html\[data-theme='dark'\]\)\)/,
      `${path} retains scoped dark styling`)
    assert.match(built.code, /#177a58/)
    assert.match(built.code, /#6fd5a3/)
    for (const token of uniqueTokens) {
      assert.ok(built.code.includes(`var(${token}`), `${path} must preserve live ${token}`)
    }
    for (const issue of preview.report.issues) {
      assert.match(issue.reason, /(?:scoped token|unknown\/runtime token)/,
        `${path} unresolved value must be documented rather than silently replaced`)
    }
  }
  const overview = readFileSync(resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css'), 'utf8')
  assert.match(overview, /conic-gradient\(/, 'the runtime EVM/health gauge is not replaced')
})

test('Stage 12 fails closed on new dashboard runtime tokens or changed status accent', () => {
  const plugin = w3cApprovedCssPilots()
  const error = (message) => { throw new Error(message) }
  for (const path of [
    '../src/pages/MetricsPage/MetricsPage.module.css',
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css',
  ]) {
    const file = resolve(import.meta.dirname, path)
    const source = readFileSync(file, 'utf8')
    assert.throws(() => plugin.transform.call({ error },
      `${source}
.newRuntimeColor { background: var(--injected-dashboard-color) }`, file,
    ), /W3C pilot .* left .* unresolved declarations/)
  }
  const metricsFile = resolve(import.meta.dirname, '../src/pages/MetricsPage/MetricsPage.module.css')
  const source = readFileSync(metricsFile, 'utf8')
  const replaced = source.replace('var(--index-accent) 46%', 'var(--injected-dashboard-color) 46%')
  assert.notEqual(source, replaced, 'test must mutate an actual live accent')
  assert.throws(() => plugin.transform.call({ error }, replaced, metricsFile),
    /W3C pilot .* left .* unresolved declarations/)
})


// Stage 13: preserve the existing gradients and runtime progress/status values;
// use the matching CSS longhand instead of the background shorthand.
test('Stage 13 uses precise background longhands without losing runtime styling', () => {
  const plugin = w3cApprovedCssPilots()
  const cases = [
    ['MetricsPage', [
      ['.indexCard', 'background-image', 'linear-gradient(90deg,var(--index-card-start)'],
      ['.indexState', 'background-color', 'color-mix(in srgb,var(--index-accent) 10%,var(--color-surface))'],
    ]],
    ['ProjectOverviewPage', [
      ['.healthHero', 'background-image', 'radial-gradient(ellipse at 0% 10%'],
      ['.indexGauge', 'background-image', 'linear-gradient(145deg, var(--gauge-surface-start)'],
      ['.indexGauge::before', 'background-image', 'radial-gradient(circle at 14% 8%'],
      ['.gaugeRing', 'background-image', 'conic-gradient('],
      ['.radarPulse', 'background-image', 'radial-gradient('],
    ]],
  ]
  for (const [name, expected] of cases) {
    const file = resolve(import.meta.dirname, `../src/pages/${name}/${name}.module.css`)
    const source = readFileSync(file, 'utf8')
    const result = plugin.transform.call(
      { error: (message) => { throw new Error(message) } }, source, file,
    )
    assert.ok(result)
    for (const [selector, longhand, value] of expected) {
      const parsed = postcss.parse(source, { from: file })
      const rules = []
      parsed.walkRules((rule) => {
        if (rule.selector === selector) rules.push(rule)
      })
      const primaryRules = rules.filter((rule) => rule.nodes.some((node) =>
        node.type === 'decl' && node.prop === longhand,
      ))
      assert.equal(primaryRules.length, 1, `${name} ${selector}: exactly one target declaration`)
      const declarations = primaryRules[0].nodes.filter((node) => node.type === 'decl')
      assert.ok(!declarations.some((node) => node.prop === 'background'),
        `${name} ${selector}: no legacy shorthand`)
      const declaration = declarations.find((node) => node.prop === longhand)
      assert.ok(declaration, `${name} ${selector}: ${longhand} exists`)
      assert.ok(declaration.value.includes(value),
        `${name} ${selector}: preserves the original graphic`)
      assert.ok(result.code.includes(value), `${name} ${selector} remains dynamic after Vite transform`)
    }
  }
})

test('Stage 13 preserves dashboard status, ring progress, and radar animation semantics', () => {
  const metrics = readFileSync(resolve(import.meta.dirname,
    '../src/pages/MetricsPage/MetricsPage.module.css'), 'utf8')
  for (const state of ['healthy', 'watch', 'pressure', 'notAvailable']) {
    assert.ok(metrics.includes(`.indexCard.${state}`), `performance state ${state} remains`)
  }
  const overview = readFileSync(resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css'), 'utf8')
  for (const token of ['--health-accent', '--gauge-accent', '--gauge-progress',
    '--gauge-track', '--radar-wave-radius']) {
    assert.ok(overview.includes(`var(${token})`), `live ${token} remains`)
  }
  assert.match(overview, /@keyframes radarWavePulse/)
  assert.match(overview, /@property --radar-wave-radius/)
})

// Stage 16 keeps the exact color calculations; only their CSS representation
// changes. This is a live indirection, not a fixed-color W3C workaround.
test('Stage 16 factors three computed gradient colors without freezing accents, themes or progress', () => {
  const cases = [
    ['MetricsPage', '.indexCard', '--index-card-start',
      'color-mix(in srgb,var(--index-accent) 8%,var(--color-surface))',
      'linear-gradient(90deg,var(--index-card-start),var(--color-surface) 48%)'],
    ['ProjectOverviewPage', '.indexGauge', '--gauge-surface-start',
      'color-mix(in srgb, var(--color-surface) 76%, var(--color-canvas))',
      'linear-gradient(145deg, var(--gauge-surface-start), var(--color-surface))'],
    ['ProjectOverviewPage', '.gaugeRing', '--gauge-ring-active',
      'color-mix(in srgb, var(--gauge-accent) 82%, white)',
      'var(--gauge-ring-active) 0 var(--gauge-progress)'],
  ]
  const plugin = w3cApprovedCssPilots()
  for (const [page, selector, token, mix, gradientFragment] of cases) {
    const file = resolve(import.meta.dirname, `../src/pages/${page}/${page}.module.css`)
    const source = readFileSync(file, 'utf8')
    const root = postcss.parse(source)
    let found = 0
    root.walkRules(selector, (rule) => {
      if (!rule.nodes.some((node) => node.type === 'decl' && node.prop === token)) return
      found++
      assert.equal(rule.nodes.find((node) => node.prop === token)?.value, mix,
        `${page} ${token} must retain the source mix`)
      assert.ok(rule.nodes.find((node) => node.prop === 'background-image')?.value.includes(gradientFragment),
        `${page} ${selector} must reference the same live color and stops`)
    })
    assert.equal(found, 1, `${page} ${selector} must be unambiguous`)
    const result = plugin.transform.call({ error: (message) => { throw Error(message) } }, source, file)
    assert.ok(result?.code.includes(mix), `${page} dynamic mix must survive the production transformer`)
    assert.ok(result.code.includes(gradientFragment), `${page} dynamic gradient must survive the production transformer`)
  }
  const overview = readFileSync(resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css'), 'utf8')
  assert.match(overview, /\.gauge_healthy\s*\{\s*--gauge-accent:/)
  assert.match(overview, /\.gauge_watch\s*\{\s*--gauge-accent:/)
  assert.match(overview, /\.gauge_pressure\s*\{\s*--gauge-accent:/)
  assert.match(overview, /\.gauge_notAvailable\s*\{\s*--gauge-accent:/)
})

test('Stage 16 strict allowlist rejects a new or altered factored dashboard gradient token', () => {
  const plugin = w3cApprovedCssPilots()
  const cases = [
    ['MetricsPage', 'var(--index-card-start)', 'var(--unexpected-dashboard-tint)'],
    ['ProjectOverviewPage', 'var(--gauge-surface-start)', 'var(--unexpected-dashboard-tint)'],
    ['ProjectOverviewPage', 'var(--gauge-ring-active)', 'var(--unexpected-dashboard-tint)'],
  ]
  for (const [page, token, mutation] of cases) {
    const file = resolve(import.meta.dirname, `../src/pages/${page}/${page}.module.css`)
    const source = readFileSync(file, 'utf8')
    const mutated = source.replace(token, mutation)
    assert.notEqual(mutated, source, `test must change an actual ${page} reference`)
    assert.throws(() => plugin.transform.call({ error: (message) => { throw Error(message) } }, mutated, file),
      /W3C pilot .* left .* unresolved declarations/)
  }
})

// Stage 19: the full W3C reproducer isolated .indexCard:target. These two
// computed colors must stay live while the declarations avoid nested mixes.
test('Stage 19 preserves index-card anchor highlighting with factored live target colors', () => {
  const file = resolve(import.meta.dirname, '../src/pages/MetricsPage/MetricsPage.module.css')
  const source = readFileSync(file, 'utf8')
  const rules = []
  postcss.parse(source, { from: file }).walkRules('.indexCard:target', (rule) => rules.push(rule))
  assert.equal(rules.length, 1, 'anchor highlight selector is unique')
  const decl = new Map(rules[0].nodes.filter((node) => node.type === 'decl').map(({ prop, value }) => [prop, value]))
  assert.equal(decl.get('--index-target-border'),
    'color-mix(in srgb, var(--index-accent) 78%, var(--color-border))')
  assert.equal(decl.get('--index-target-halo'),
    'color-mix(in srgb, var(--index-accent) 13%, transparent)')
  assert.equal(decl.get('border-color'), 'var(--index-target-border)')
  assert.equal(decl.get('box-shadow'),
    'inset .28rem 0 0 var(--index-accent),\n    0 0 0 .2rem var(--index-target-halo)')
  for (const state of ['healthy', 'watch', 'pressure', 'notAvailable']) {
    assert.match(source, new RegExp(`\\.indexCard\\.${state}\\s*\\{\\s*--index-accent:`))
  }
  const plugin = w3cApprovedCssPilots()
  const result = plugin.transform.call({ error: (message) => { throw Error(message) } }, source, file)
  assert.ok(result)
  for (const token of ['--index-target-border', '--index-target-halo', '--index-accent']) {
    assert.ok(result.code.includes(`var(${token})`), `live token ${token} retained`)
  }
  assert.ok(result.code.includes(decl.get('--index-target-border')))
  assert.ok(result.code.includes(decl.get('--index-target-halo')))
})

test('Stage 19 rejects unexpected dynamic target highlight tokens', () => {
  const file = resolve(import.meta.dirname, '../src/pages/MetricsPage/MetricsPage.module.css')
  const source = readFileSync(file, 'utf8')
  const mutated = source.replace('border-color: var(--index-target-border);',
    'border-color: var(--unexpected-target-color);')
  assert.notEqual(mutated, source)
  assert.throws(() => w3cApprovedCssPilots().transform.call(
    { error: (message) => { throw Error(message) } }, mutated, file,
  ), /W3C pilot .* left .* unresolved declarations/)
})

// Stage 22: Stage 21 passed source tests but Vite emitted empty mask values.
// Match the known-good .healthHero::before longhand pattern on the pulse.
test('Stage 22: radar SVG mask has complete prefixed and standard longhands', () => {
  const file = resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css')
  const source = readFileSync(file, 'utf8')
  const root = postcss.parse(source)
  const radar = []
  root.walkRules('.radarPulse', (rule) => {
    if (rule.parent.type === 'root') radar.push(rule)
  })
  assert.equal(radar.length, 1, 'primary radar rule must be unique')
  const declarations = new Map(radar[0].nodes.filter((node) => node.type === 'decl')
    .map(({ prop, value }) => [prop, value]))
  assert.equal(declarations.has('-webkit-mask'), false, 'avoid mixed shorthand/longhand regression')
  assert.equal(declarations.has('mask'), false, 'avoid shorthand rejected by css3svg profile')
  const expected = new Map([
    ['mask-image', "url('../../shared/assets/signal-radar.svg')"],
    ['mask-position', 'center'],
    ['mask-size', 'contain'],
    ['mask-repeat', 'no-repeat'],
  ])
  for (const [property, value] of expected) {
    assert.equal(declarations.get(property), value, `standard ${property}`)
    assert.equal(declarations.get(`-webkit-${property}`), value, `WebKit ${property}`)
  }
  assert.match(declarations.get('background-image'), /var\(--radar-wave-radius\)/)
  assert.equal(declarations.get('mix-blend-mode'), 'screen')
  assert.equal(declarations.get('pointer-events'), 'none')
  assert.match(source, /@property --radar-wave-radius\s*\{\s*syntax:\s*'<percentage>';/)
  assert.match(source, /@keyframes radarWavePulse/)
  assert.match(source, /prefers-reduced-motion:\s*no-preference/)
})

test('Stage 22: approved CSS transform preserves both families of radar mask longhands', () => {
  const file = resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css')
  const source = readFileSync(file, 'utf8')
  const result = w3cApprovedCssPilots().transform.call(
    { error: (message) => { throw Error(message) } }, source, file)
  assert.ok(result, 'Project Overview CSS must compile through the approved transformer')
  const root = postcss.parse(result.code)
  const rules = []
  root.walkRules('.radarPulse', (rule) => {
    if (rule.parent.type === 'root') rules.push(rule)
  })
  assert.equal(rules.length, 1)
  const values = new Map(rules[0].nodes.filter((node) => node.type === 'decl')
    .map(({ prop, value }) => [prop, value]))
  for (const name of ['mask-image', 'mask-position', 'mask-size', 'mask-repeat']) {
    assert.ok(values.get(name), `${name} must have a nonempty value`)
    assert.equal(values.get(`-webkit-${name}`), values.get(name), `WebKit ${name} matches standard`)
  }
  assert.match(result.code, /@property --radar-wave-radius/)
})

// Stage 27: the W3C-accepted split must retain the same visual order:
// translucent radial halo over the live surface gradient but under card content.
test('Stage 27 keeps separated indexGauge backgrounds live and correctly layered', () => {
  const file = resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css')
  const source = readFileSync(file, 'utf8')
  const parsed = postcss.parse(source, { from: file })
  const ruleOf = (tree, selector) => {
    const matches = []
    tree.walkRules((rule) => {
      if (rule.selector === selector) matches.push(rule)
    })
    assert.equal(matches.length, 1, `${selector} must have one definition`)
    return new Map(matches[0].nodes.filter((node) => node.type === 'decl')
      .map(({ prop, value }) => [prop, value]))
  }
  const card = ruleOf(parsed, '.indexGauge')
  const halo = ruleOf(parsed, '.indexGauge::before')
  const surface = 'linear-gradient(145deg, var(--gauge-surface-start), var(--color-surface))'
  const highlight = 'radial-gradient(circle at 14% 8%, color-mix(in srgb, var(--gauge-accent) 8%, transparent), transparent 42%)'
  assert.equal(card.get('background-image'), surface)
  assert.equal(halo.get('background-image'), highlight)
  assert.equal(card.get('position'), 'relative')
  assert.equal(card.get('isolation'), 'isolate')
  for (const [property, value] of [
    ['content', "''"], ['position', 'absolute'], ['z-index', '-1'],
    ['inset', '0'], ['border-radius', 'inherit'], ['pointer-events', 'none'],
  ]) assert.equal(halo.get(property), value, `halo ${property} preserves stacking`)
  assert.equal(card.get('--gauge-surface-start'),
    'color-mix(in srgb, var(--color-surface) 76%, var(--color-canvas))')
  assert.equal(card.get('--gauge-accent'), 'var(--color-border)')
  assert.match(source, /@property --radar-wave-radius/)
  const transformed = w3cApprovedCssPilots().transform.call(
    { error: (message) => { throw Error(message) } }, source, file,
  )
  assert.ok(transformed)
  const built = postcss.parse(transformed.code)
  assert.equal(ruleOf(built, '.indexGauge').get('background-image'), surface)
  assert.equal(ruleOf(built, '.indexGauge::before').get('background-image'), highlight)
  for (const status of ['healthy', 'watch', 'pressure', 'notAvailable']) {
    assert.match(source, new RegExp(`\\.gauge_${status}\\s*\\{\\s*--gauge-accent:`))
  }
})

test('Stage 27 refuses unreviewed indexGauge gradient changes', () => {
  const file = resolve(import.meta.dirname,
    '../src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css')
  const source = readFileSync(file, 'utf8')
  const plugin = w3cApprovedCssPilots()
  const error = (message) => { throw Error(message) }
  for (const [needle, replacement] of [
    ['var(--gauge-surface-start), var(--color-surface)',
      'var(--unexpected-surface), var(--color-surface)'],
    ['var(--gauge-accent) 8%, transparent',
      'var(--unexpected-gauge-accent) 8%, transparent'],
  ]) {
    const changed = source.replace(needle, replacement)
    assert.notEqual(source, changed, 'test mutation must match existing CSS')
    assert.throws(() => plugin.transform.call({ error }, changed, file),
      /W3C pilot .* left .* unresolved declarations/)
  }
})
