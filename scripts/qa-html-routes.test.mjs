import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { concretePath, getLeafRoutePatterns, HTML_QA_ROUTES, HTML_QA_SMOKE, HTML_QA_ALL, verifyManifest, verifyReadiness } from './qa-html-routes.mjs'

test('exactly 47 unique rendered leaf templates, covering public, workspace, project and fallback', () => {
  assert.equal(HTML_QA_ROUTES.length, 47)
  assert.deepEqual(HTML_QA_ROUTES.reduce((o, r) => ({ ...o, [r.category]: (o[r.category] ?? 0) + 1 }), {}),
    { public: 5, workspace: 11, project: 30, fallback: 1 })
  assert.equal(verifyManifest(HTML_QA_ROUTES.map((r) => r.pattern)), true)
})

test('all parameterized URLs use synthetic fixture IDs; unknown fixture fails closed', () => {
  assert.equal(concretePath('/projects/:projectId/lessons/:lessonId'), '/projects/demo-project/lessons/qa-html-lesson')
  assert.equal(concretePath('*'), '/qa-unmatched-route')
  assert.throws(() => concretePath('/projects/:missingId'), /Missing HTML QA fixture/)
  assert.ok(HTML_QA_ROUTES.every((r) => r.path.startsWith('/') && !r.path.includes(':')))
})

test('smoke includes only reviewed selectors and five distinct templates', () => {
  assert.equal(HTML_QA_SMOKE.length, 5)
  for (const item of HTML_QA_SMOKE) {
    assert.ok(HTML_QA_ROUTES.some((r) => r.pattern === item.pattern))
    assert.ok(item.selector && item.selector.includes('['))
  }
  assert.equal(new Set(HTML_QA_SMOKE.map((r) => r.pattern)).size, 5)
})

test('Risk Detail capture uses its focused-layout semantic heading, not a project tabs wrapper', () => {
  const detail = HTML_QA_SMOKE.find((item) => item.pattern === '/projects/:projectId/risks/:riskId')
  assert.equal(detail.selector, 'section:has(> nav[aria-label="Risk detail context"]) > header')
  assert.equal(detail.expectedText, 'Risk detail')
  const projectLayout = readFileSync(new URL('../src/layouts/ProjectLayout/ProjectLayout.jsx', import.meta.url), 'utf8')
  const riskDetail = readFileSync(new URL('../src/pages/RiskDetailPage/RiskDetailPage.jsx', import.meta.url), 'utf8')
  assert.match(projectLayout, /if \(isRiskDetailRoute\)[\s\S]*?className=\{styles\.focusedRoot\}/)
  assert.match(riskDetail, /aria-label="Risk detail context"/)
  assert.match(riskDetail, /<header className=\{styles\.header\}>/)
})

test('detects missing, duplicate or newly added routes', () => {
  assert.throws(() => verifyManifest(['/new']), /coverage mismatch/)
  assert.throws(() => verifyManifest(['/same', '/same'], [
    { pattern: '/same', path: '/same' }, { pattern: '/same', path: '/duplicate' },
  ]), /Duplicate HTML QA manifest/)
})

test('flattens nested React Router definitions including index, absolute and fallback leaves', () => {
  const patterns = getLeafRoutePatterns([
    { element: 'layout', children: [ { path: '/projects/:projectId', children: [
      { index: true }, { path: 'risks' }, { path: 'risks/:riskId' },
    ] } ] },
    { path: '*' },
  ])
  assert.deepEqual(patterns, ['/projects/:projectId', '/projects/:projectId/risks', '/projects/:projectId/risks/:riskId', '*'])
})

test('all 47 routes have approved, route-specific readiness criteria', () => {
  assert.equal(HTML_QA_ALL.length, 47)
  assert.equal(verifyReadiness(), true)
  assert.deepEqual(HTML_QA_ALL.map((item) => item.pattern), HTML_QA_ROUTES.map((item) => item.pattern))
  assert.ok(HTML_QA_ALL.every((item) => item.selector && (item.expectedText || HTML_QA_SMOKE.some((s) => s.pattern === item.pattern))))
  assert.ok(HTML_QA_ALL.every((item) => !item.selector.startsWith('body') && !item.selector.startsWith('#root')))
})

test('required fixtures and special routes cannot silently become generic page checks', () => {
  const get = (pattern) => HTML_QA_ALL.find((item) => item.pattern === pattern)
  assert.equal(get('/projects/:projectId/reports/new').query, '?periodEnd=2026-10-09')
  assert.equal(get('/projects/:projectId/reports/new').expectedText, 'Draft')
  assert.equal(get('/projects/:projectId/reports/:reportId').expectedText, 'Final')
  assert.equal(get('/projects/:projectId/lessons/:lessonId').expectedText, 'Synthetic HTML QA lesson')
  assert.equal(get('/projects/:projectId/lessons/:lessonId/edit').expectedText, 'Edit lesson')
  assert.equal(get('/projects/:projectId/risks/:riskId').selector, 'section:has(> nav[aria-label="Risk detail context"]) > header')
  assert.ok(get('/projects/:projectId/actions/:actionId/edit').form)
  assert.equal(get('*').expectedText, 'That route is off course.')
})

test('readiness verification fails closed for missing and unrecognized checks', () => {
  assert.throws(() => verifyReadiness(HTML_QA_ALL.slice(0, -1)), /coverage is incomplete/)
  assert.throws(() => verifyReadiness([...HTML_QA_ALL.slice(0, -1), HTML_QA_ALL[0]]), /duplicated/)
  assert.throws(() => verifyReadiness(HTML_QA_ALL.map((row, index) => index === 5 ? { ...row, selector: '' } : row)), /Invalid HTML QA readiness/)
  assert.throws(() => verifyReadiness(HTML_QA_ALL.map((row, index) => index === 5 ? { ...row, query: '?bad:%' } : row)), /Invalid HTML QA readiness/)
})


test('New risk readiness supports the focused ProjectLayout and verifies its real form', () => {
  const newRisk = HTML_QA_ALL.find((item) => item.pattern === '/projects/:projectId/risks/new')
  assert.equal(newRisk.selector, 'section:has(> form) > header h1')
  assert.equal(newRisk.expectedText, 'New risk')
  assert.equal(newRisk.form, true)
  assert.equal(newRisk.formSelector, 'section:has(> header h1) > form')
  // The current ProjectLayout focuses any single /risks/:segment, including "new".
  const layout = readFileSync(new URL('../src/layouts/ProjectLayout/ProjectLayout.jsx', import.meta.url), 'utf8')
  assert.match(layout, /const isRiskDetailRoute = new RegExp/)
  assert.match(layout, /if \(isRiskDetailRoute\)[\s\S]*?focusedRoot/)
  const editor = readFileSync(new URL('../src/pages/RiskEditorPage/RiskEditorPage.jsx', import.meta.url), 'utf8')
  const riskForm = readFileSync(new URL('../src/features/risks/ui/RiskForm.jsx', import.meta.url), 'utf8')
  assert.match(editor, /<section className=\{styles\.root\}>[\s\S]*?<header className=\{styles\.header\}>[\s\S]*?<h1>/)
  assert.match(editor, /<RiskForm/)
  assert.match(riskForm, /<form className=\{styles\.form\}/)
  assert.equal(verifyReadiness(), true)
  assert.throws(() => verifyReadiness(HTML_QA_ALL.map((row) => row.pattern === newRisk.pattern
    ? { ...row, formSelector: '' } : row)), /Invalid HTML QA readiness/)
  assert.throws(() => verifyReadiness(HTML_QA_ALL.map((row) => row.pattern === newRisk.pattern
    ? { ...row, form: false } : row)), /Invalid HTML QA readiness/)
})

// Batch B: these are layout/record wrappers, not independent document sections or articles.
// Keep their existing CSS classes while avoiding misleading section/article semantics.
test('Meeting Note and Lesson detail readiness targets the document heading after Batch B', () => {
  const expectedSelector = '[data-project-workspace="true"] > div > article > header h2'
  const fixtures = [
    ['/projects/:projectId/meetings/:meetingId', 'Migration Pilot Readiness Review',
      'src/pages/MeetingsPage/MeetingNoteDetailPage.jsx', 'noteDocument', 'noteHeader'],
    ['/projects/:projectId/lessons/:lessonId', 'Synthetic HTML QA lesson',
      'src/pages/LessonsLearnedPage/LessonDetailPage.jsx', 'document', 'documentHeader'],
  ]
  for (const [pattern, title, file, articleClass, headerClass] of fixtures) {
    const spec = HTML_QA_ALL.find((item) => item.pattern === pattern)
    assert.equal(spec.selector, expectedSelector)
    assert.equal(spec.expectedText, title)
    const jsx = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.match(jsx, /return \(\s*<div className=\{styles\.root\}>/)
    assert.match(jsx, new RegExp(`<article className=\\{styles\\.${articleClass}\\}>[\\s\\S]*?<header className=\\{styles\\.${headerClass}\\}>[\\s\\S]*?<h2>`))
  }
  assert.equal(verifyReadiness(), true)
})

test('structural HTML cleanup keeps record cards and disclosure blocks as neutral containers', () => {
  const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const expected = [
    ['src/pages/GlobalOverviewPage/GlobalOverviewPage.jsx', 'metric'],
    ['src/pages/GovernancePage/GovernancePage.jsx', 'registerRow'],
    ['src/pages/MetricsPage/MetricsPage.jsx', 'snapshotRow'],
    ['src/pages/ProjectOverviewPage/ProjectOverviewPage.jsx', 'signalGroup'],
    ['src/pages/RiskDetailPage/RiskDetailPage.jsx', 'panel'],
    ['src/pages/ReportsPage/ReportDetailPage.jsx', 'summaryCard'],
    ['src/pages/ReportsPage/ReportDetailPage.jsx', 'signalCard'],
    ['src/pages/ReportsPage/ReportDetailPage.jsx', 'collapsibleSection'],
    ['src/pages/MeetingsPage/MeetingNoteDetailPage.jsx', 'noteSection'],
    ['src/features/meetings/ui/MeetingNoteForm.jsx', 'detailsCard'],
  ]
  for (const [file, cssClass] of expected) {
    const jsx = source(file)
    assert.match(jsx, new RegExp(`<div className=[^\\n]*styles\\.${cssClass}\\b`))
    assert.doesNotMatch(jsx, new RegExp(`<(?:article|section) className=[^\\n]*styles\\.${cssClass}\\b`))
  }
  // Real documents with headings remain articles; do not flatten their semantics.
  assert.match(source('src/pages/ReportsPage/ReportDetailPage.jsx'), /<article className=\{styles\.reportDocument\}>/)
  assert.match(source('src/pages/MeetingsPage/MeetingNoteDetailPage.jsx'), /<article className=\{styles\.noteDocument\}>/)
  assert.match(source('src/pages/LessonsLearnedPage/LessonDetailPage.jsx'), /<article className=\{styles\.document\}>/)
  assert.match(source('src/pages/LessonsLearnedPage/LessonDetailPage.jsx'), /<section><span className=\{styles\.sectionIndex\}>01 \/ CONTEXT<\/span><h3>Situation<\/h3>/)
})

test('report and overview browser readiness follows actual semantic markup', () => {
  const overview = HTML_QA_SMOKE.find((row) => row.pattern === '/overview')
  assert.equal(overview.selector, 'section[aria-labelledby="overview-title"] [aria-label="Portfolio attention summary"] > div')
  for (const pattern of ['/projects/:projectId/reports/new', '/projects/:projectId/reports/:reportId']) {
    assert.equal(HTML_QA_ALL.find((row) => row.pattern === pattern).selector, '[data-report-root="true"] article > header')
  }
  const report = readFileSync(new URL('../src/pages/ReportsPage/ReportDetailPage.jsx', import.meta.url), 'utf8')
  assert.match(report, /<div className=\{styles\.root\} data-report-root="true">/)
  const overviewPage = readFileSync(new URL('../src/pages/GlobalOverviewPage/GlobalOverviewPage.jsx', import.meta.url), 'utf8')
  assert.match(overviewPage, /<div className=\{styles\.metrics\} role="group" aria-label="Portfolio attention summary">/)
})
