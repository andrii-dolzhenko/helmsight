// ADR-059: inventory of rendered React Router leaf templates.
// Keep explicit patterns; the Vitest route-manifest test compares these to router.routes.
const templates = [
  ['/', 'public'],
  ['/sign-in', 'public'],
  ['/sign-up', 'public'],
  ['/forgot-password', 'public'],
  ['/reset-password', 'public'],
  ['/help', 'workspace'],
  ['/settings', 'workspace'],
  ['/overview', 'workspace'],
  ['/actions', 'workspace'],
  ['/risks', 'workspace'],
  ['/metrics', 'workspace'],
  ['/reports', 'workspace'],
  ['/meetings', 'workspace'],
  ['/projects', 'workspace'],
  ['/projects/new', 'workspace'],
  ['/projects/:projectId/edit', 'workspace'],
  ['/projects/:projectId', 'project'],
  ['/projects/:projectId/governance', 'project'],
  ['/projects/:projectId/success-criteria', 'project'],
  ['/projects/:projectId/success-criteria/new', 'project'],
  ['/projects/:projectId/success-criteria/:criterionId/edit', 'project'],
  ['/projects/:projectId/risks', 'project'],
  ['/projects/:projectId/risks/new', 'project'],
  ['/projects/:projectId/risks/:riskId', 'project'],
  ['/projects/:projectId/risks/:riskId/edit', 'project'],
  ['/projects/:projectId/milestones', 'project'],
  ['/projects/:projectId/milestones/new', 'project'],
  ['/projects/:projectId/milestones/:milestoneId/edit', 'project'],
  ['/projects/:projectId/metrics', 'project'],
  ['/projects/:projectId/metrics/baseline', 'project'],
  ['/projects/:projectId/metrics/snapshots/new', 'project'],
  ['/projects/:projectId/metrics/snapshots/:snapshotId/edit', 'project'],
  ['/projects/:projectId/reports', 'project'],
  ['/projects/:projectId/reports/new', 'project'],
  ['/projects/:projectId/reports/:reportId', 'project'],
  ['/projects/:projectId/actions', 'project'],
  ['/projects/:projectId/actions/new', 'project'],
  ['/projects/:projectId/actions/:actionId/edit', 'project'],
  ['/projects/:projectId/meetings', 'project'],
  ['/projects/:projectId/meetings/new', 'project'],
  ['/projects/:projectId/meetings/:meetingId', 'project'],
  ['/projects/:projectId/meetings/:meetingId/edit', 'project'],
  ['/projects/:projectId/lessons', 'project'],
  ['/projects/:projectId/lessons/new', 'project'],
  ['/projects/:projectId/lessons/:lessonId', 'project'],
  ['/projects/:projectId/lessons/:lessonId/edit', 'project'],
  ['*', 'fallback'],
]

export const DEMO_PARAMS = Object.freeze({
  projectId: 'demo-project',
  criterionId: 'demo-success-adoption',
  riskId: 'demo-risk-vendor',
  milestoneId: 'demo-milestone-design-system',
  snapshotId: 'demo-evm-2026-10-02',
  reportId: 'demo-report-2026-10-02',
  actionId: 'demo-action-regulatory-pack',
  meetingId: 'demo-meeting-pilot-readiness',
  lessonId: 'qa-html-lesson',
})

export function concretePath(pattern) {
  if (pattern === '*') return '/qa-unmatched-route'
  return pattern.replace(/:([a-zA-Z]\w*)/g, (_all, key) => {
    if (!Object.hasOwn(DEMO_PARAMS, key)) throw new Error(`Missing HTML QA fixture for :${key}`)
    return DEMO_PARAMS[key]
  })
}

export const HTML_QA_ROUTES = Object.freeze(templates.map(([pattern, category]) => Object.freeze({
  pattern, category, path: concretePath(pattern),
})))

// Only these five have manually reviewed readiness conditions so far.
// Other routes remain explicitly NOT VERIFIED until their conditions are reviewed.
export const HTML_QA_SMOKE = Object.freeze([
  { pattern: '/', selector: 'main[data-landing-page="true"] h1', expectedText: 'Project Intelligence' },
  { pattern: '/sign-in', selector: 'main[data-auth-screen="sign-in"] form input[type="email"]' },
  { pattern: '/overview', selector: 'section[aria-labelledby="overview-title"] [aria-label="Portfolio attention summary"] > div' },
  { pattern: '/projects/:projectId', selector: '[data-project-workspace="true"] [data-ui-page-title-row] h2', expectedText: 'Project Overview' },
  { pattern: '/projects/:projectId/risks/:riskId', selector: 'section:has(> nav[aria-label="Risk detail context"]) > header', expectedText: 'Risk detail' },
])

// ADR-059 stage 2: a page-specific readiness marker for every leaf route.
// The five reviewed smoke markers stay unchanged; every other marker must prove
// the route's own content rather than the surrounding shell or a loading card.
const WORKSPACE = '[data-project-workspace="true"] > section'
const PROJECT_HEADING = `${WORKSPACE} h2`
const workspaceSpec = (pattern, selector, expectedText) => ({ pattern, selector, expectedText })
const projectSpec = (pattern, expectedText, extras = {}) => ({
  pattern, selector: PROJECT_HEADING, expectedText, ...extras,
})

const additionalReadiness = [
  workspaceSpec('/sign-up', 'main[data-auth-screen="sign-up"] h2', 'Create Account'),
  workspaceSpec('/forgot-password', 'main[data-auth-screen="forgot-password"] h2', 'Forgot Password'),
  workspaceSpec('/reset-password', 'main[data-auth-screen="reset-password"] h2', 'Reset Password'),
  workspaceSpec('/help', '#help-title', 'Help Center'),
  workspaceSpec('/settings', 'section h1', 'Profile & Settings'),
  workspaceSpec('/actions', '#global-actions-title', 'Global Actions'),
  workspaceSpec('/risks', '#global-risks-title', 'Global Risks'),
  workspaceSpec('/metrics', '#global-metrics-title', 'Global Metrics'),
  workspaceSpec('/reports', '#global-reports-title', 'Global Reports'),
  workspaceSpec('/meetings', '#global-meetings-title', 'Global Meetings'),
  workspaceSpec('/projects', 'section [data-ui-page-title-row] h1', 'Projects'),
  workspaceSpec('/projects/new', 'section h1', 'Create a project'),
  workspaceSpec('/projects/:projectId/edit', 'section h1', 'Edit project'),
  projectSpec('/projects/:projectId/governance', 'Governance'),
  projectSpec('/projects/:projectId/success-criteria', 'Success Criteria'),
  projectSpec('/projects/:projectId/success-criteria/new', 'New success criterion', { form: true }),
  projectSpec('/projects/:projectId/success-criteria/:criterionId/edit', 'Edit criterion', { form: true }),
  projectSpec('/projects/:projectId/risks', 'Risk Register'),
  // ProjectLayout currently uses the focused layout for any single /risks/:segment,
  // including /risks/new. Assert the actual editor heading AND its own form.
  {
    pattern: '/projects/:projectId/risks/new',
    selector: 'section:has(> form) > header h1',
    expectedText: 'New risk',
    form: true,
    formSelector: 'section:has(> header h1) > form',
  },
  projectSpec('/projects/:projectId/risks/:riskId/edit', 'Edit risk', { form: true }),
  projectSpec('/projects/:projectId/milestones', 'Milestones'),
  projectSpec('/projects/:projectId/milestones/new', 'New milestone', { form: true }),
  projectSpec('/projects/:projectId/milestones/:milestoneId/edit', 'Edit milestone', { form: true }),
  projectSpec('/projects/:projectId/metrics', 'Metrics & EVM'),
  projectSpec('/projects/:projectId/metrics/baseline', 'Edit EVM baseline', { form: true }),
  projectSpec('/projects/:projectId/metrics/snapshots/new', 'New weekly EVM snapshot', { form: true }),
  projectSpec('/projects/:projectId/metrics/snapshots/:snapshotId/edit', 'Edit EVM snapshot', { form: true }),
  projectSpec('/projects/:projectId/reports', 'Weekly Status Reports'),
  {
    pattern: '/projects/:projectId/reports/new',
    selector: '[data-report-root="true"] article > header',
    expectedText: 'Draft', query: '?periodEnd=2026-10-09', form: true,
  },
  {
    pattern: '/projects/:projectId/reports/:reportId',
    selector: '[data-report-root="true"] article > header',
    expectedText: 'Final',
  },
  projectSpec('/projects/:projectId/actions', 'Action Register'),
  projectSpec('/projects/:projectId/actions/new', 'New management action', { form: true }),
  projectSpec('/projects/:projectId/actions/:actionId/edit', 'Edit management action', { form: true }),
  projectSpec('/projects/:projectId/meetings', 'Meeting Notes'),
  projectSpec('/projects/:projectId/meetings/new', 'New Meeting Note', { form: true }),
  // Batch B renders each detail view as a neutral root div containing a titled document article.
  projectSpec('/projects/:projectId/meetings/:meetingId', 'Migration Pilot Readiness Review', {
    selector: '[data-project-workspace="true"] > div > article > header h2',
  }),
  projectSpec('/projects/:projectId/meetings/:meetingId/edit', 'Migration Pilot Readiness Review', { form: true }),
  projectSpec('/projects/:projectId/lessons', 'Lessons Learned'),
  projectSpec('/projects/:projectId/lessons/new', 'New lesson', { form: true }),
  projectSpec('/projects/:projectId/lessons/:lessonId', 'Synthetic HTML QA lesson', {
    selector: '[data-project-workspace="true"] > div > article > header h2',
  }),
  projectSpec('/projects/:projectId/lessons/:lessonId/edit', 'Edit lesson', { form: true }),
  workspaceSpec('*', 'main h1', 'That route is off course.'),
]

export const HTML_QA_ALL = Object.freeze(HTML_QA_ROUTES.map((route) => {
  const spec = [...HTML_QA_SMOKE, ...additionalReadiness].find((candidate) => candidate.pattern === route.pattern)
  if (!spec) throw new Error(`HTML QA readiness is missing for ${route.pattern}`)
  return Object.freeze({ ...spec })
}))

export function verifyReadiness(specs = HTML_QA_ALL, routes = HTML_QA_ROUTES) {
  const expected = new Set(routes.map((route) => route.pattern))
  if (specs.length !== routes.length || new Set(specs.map((spec) => spec.pattern)).size !== routes.length) {
    throw new Error('HTML QA readiness coverage is incomplete or duplicated')
  }
  for (const spec of specs) {
    if (!expected.has(spec.pattern) || !spec.selector || (!spec.expectedText && !HTML_QA_SMOKE.some((smoke) => smoke.pattern === spec.pattern)) ||
        (spec.query && !/^\?[a-zA-Z0-9=&-]+$/.test(spec.query)) ||
        (Object.hasOwn(spec, 'formSelector') &&
          (!spec.form || typeof spec.formSelector !== 'string' || !spec.formSelector.trim()))) {
      throw new Error(`Invalid HTML QA readiness specification: ${spec.pattern}`)
    }
  }
  return true
}

verifyReadiness()

export function getLeafRoutePatterns(routes, parent = '') {
  const patterns = []
  for (const route of routes) {
    const path = route.path?.startsWith('/')
      ? route.path
      : route.path === '*'
        ? '*'
        : route.path
          ? `${parent.replace(/\/$/, '')}/${route.path}`
          : parent || '/'
    if (route.children?.length) patterns.push(...getLeafRoutePatterns(route.children, path))
    else if (route.index) patterns.push(parent || '/')
    else if (route.path !== undefined) patterns.push(path)
    else throw new Error(`Unnamed HTML QA leaf route under ${parent}`)
  }
  return patterns
}

export function verifyManifest(patterns, manifest = HTML_QA_ROUTES) {
  const discovered = [...patterns].sort()
  const declared = manifest.map((row) => row.pattern).sort()
  if (new Set(declared).size !== declared.length) throw new Error('Duplicate HTML QA manifest pattern')
  if (discovered.length !== declared.length || discovered.some((pattern, index) => pattern !== declared[index])) {
    throw new Error(`HTML QA route coverage mismatch. Router=${JSON.stringify(discovered)} Manifest=${JSON.stringify(declared)}`)
  }
  if (new Set(manifest.map((row) => row.path)).size !== manifest.length) {
    throw new Error('Duplicate HTML QA concrete route')
  }
  return true
}
