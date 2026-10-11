/**
 * Narrow, production-only W3C CSS pilots.
 * Opt in modules only after their preview has no unresolved tokens and
 * verify each emitted production CSS file and both themes separately.
 */
import { resolve, join } from 'node:path'
import { buildThemeTokens, allCss, transform } from './w3c-theme-preview.mjs'

// Vite may bundle configuration helpers under node_modules/.vite-temp.
const projectRoot = resolve(process.cwd())
const srcRoot = join(projectRoot, 'src')

const approvedRelativePaths = [
  'shared/ui/StatusToast/StatusToast.module.css',
  'features/evm/ui/EvmHelp.module.css',
  'features/managementActions/ui/ManagementActionsHelp.module.css',
  'features/managementActions/ui/ManagementActionForm.module.css',
  'pages/ActionEditorPage/ActionEditorPage.module.css',
  'shared/ui/ConfirmDialog/ConfirmDialog.module.css',
  'pages/RiskDetailPage/RiskDetailPage.module.css',
  'pages/RiskEditorPage/RiskEditorPage.module.css',
  'features/risks/ui/RiskForm.module.css',
  // Stage 7: independent editor CSS chunks with zero unresolved preview tokens.
  // Keep dashboard/portfolio, vendor-specific and runtime-variable modules excluded.
  'features/evm/ui/EvmForms.module.css',
  'pages/MetricsBaselineEditorPage/MetricsBaselineEditorPage.module.css',
  'pages/MetricsSnapshotEditorPage/MetricsSnapshotEditorPage.module.css',
  'features/milestones/ui/MilestoneForm.module.css',
  'pages/MilestoneEditorPage/MilestoneEditorPage.module.css',
  'pages/NotFoundPage/NotFoundPage.module.css',
  'features/successCriteria/ui/SuccessCriterionForm.module.css',
  'pages/SuccessCriterionEditorPage/SuccessCriterionEditorPage.module.css',
  'pages/ReportsPage/ReportHelp.module.css',
  // Stage 8: verified-zero-unresolved batch. Some bundles still have
  // unrelated W3C vendor warnings or runtime-driven modules; do not hide them.
  'features/successCriteria/ui/SuccessCriteriaHelp.module.css',
  'features/projects/ui/ProjectEditorPage.module.css',
  'features/projects/ui/ProjectForm.module.css',
  'features/projects/ui/GovernanceForms.module.css',
  'features/preferences/ui/ThemeControl.module.css',
  'pages/ProjectsPage/ProjectsPage.module.css',
  'pages/RisksPage/RisksPage.module.css',
  'layouts/AppLayout/AppLayout.module.css',
  'layouts/ProjectLayout/ProjectLayout.module.css',
  // Stage 9: isolated EVM trend styles and Success Criteria register.
  // Do not opt in runtime-heavy dashboard/report modules.
  'features/evm/ui/EvmHistoricalTrends.module.css',
  'pages/SuccessCriteriaPage/SuccessCriteriaPage.module.css',
  // Stage 10: hybrid CSS Modules. Only statically known theme tokens are
  // resolved; documented scoped/runtime values remain as live CSS functions.
  'pages/ActionsPage/ActionsPage.module.css',
  'pages/MeetingsPage/MeetingsPage.module.css',
  'pages/MilestonesPage/MilestonesPage.module.css',
  'pages/GovernancePage/GovernancePage.module.css',
  'pages/ReportsPage/ReportsPage.module.css',
  // Stage 12: dashboard pages are approved only with the exact reviewed
  // runtime-sensitive accents and progress declarations listed below.
  'pages/MetricsPage/MetricsPage.module.css',
  'pages/ProjectOverviewPage/ProjectOverviewPage.module.css',
]
const approvedFiles = new Map(
  approvedRelativePaths.map((path) => [join(srcRoot, path), path]),
)

// Strict Stage 10 exceptions. These declarations depend on rendered content,
// inline runtime values, or currentColor and must never become theme constants.
// Each key is a property plus the *exact* preview reason, including duplicates.
// New/deleted/changed unresolved declarations fail the production build.
const expectedLiveDeclarations = new Map([
  ['pages/ActionsPage/ActionsPage.module.css', [
    ['box-shadow', 'scoped token --action-target-shadow; unresolved function'],
  ]],
  ['pages/MeetingsPage/MeetingsPage.module.css', [
    ['box-shadow', 'unresolved color-mix: color-mix(in srgb, currentColor 4%, transparent); unresolved function'],
  ]],
  ['pages/MilestonesPage/MilestonesPage.module.css', [
    ['left', 'unknown/runtime token --roadmap-position; unresolved function'],
    ['width', 'unknown/runtime token --roadmap-item-width; unresolved function'],
    ['width', 'unknown/runtime token --roadmap-edge-width; unresolved function'],
    ['width', 'unknown/runtime token --roadmap-edge-width; unresolved function'],
  ]],
  ['pages/GovernancePage/GovernancePage.module.css', [
    ['gap', 'scoped token --charter-grid-gap; unresolved function'],
    ['padding', 'scoped token --charter-card-padding; unresolved function'],
    ['column-gap', 'scoped token --charter-grid-gap; unresolved function'],
    ['margin-inline', 'scoped token --charter-card-padding; unresolved function'],
    ['padding-right', 'scoped token --charter-card-padding; unresolved function'],
    ['padding-left', 'scoped token --charter-card-padding; unresolved function'],
    ['left', 'scoped token --charter-card-padding; unresolved function'],
  ]],
  ['pages/ReportsPage/ReportsPage.module.css', Array.from({ length: 4 }, () => [
    'box-shadow',
    'unresolved color-mix: color-mix(in srgb, currentColor 4%, transparent); unresolved function',
  ])],
  // The local --index-accent varies with EVM status and must be computed by
  // CSS at runtime, not frozen to the global light/dark design-token colors.
  ['pages/MetricsPage/MetricsPage.module.css', [
    ['border', 'scoped token --index-accent; unresolved function; unresolved color-mix: color-mix(in srgb,var(--index-accent) 46%,var(--color-border))'],
    ['background-image', 'scoped token --index-card-start; unresolved function'],
    ['box-shadow', 'scoped token --index-accent; unresolved function'],
    ['border', 'scoped token --index-accent; unresolved function; unresolved color-mix: color-mix(in srgb,var(--index-accent) 42%,var(--color-border))'],
    ['background-color', 'scoped token --index-accent; unresolved function; unresolved color-mix: color-mix(in srgb,var(--index-accent) 10%,var(--color-surface))'],
    ['border-color', 'scoped token --index-target-border; unresolved function'],
    ['box-shadow', 'scoped token --index-accent; scoped token --index-target-halo; unresolved function'],
  ]],
  // Overview needs its health/status accents, radar artwork and ring progress
  // to remain live. The list is a strict multiset, not a var() wildcard.
  ['pages/ProjectOverviewPage/ProjectOverviewPage.module.css', [
    ['border', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 42%, #0c2118)'],
    ['background-image', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 42%, transparent)'],
    ['background', 'scoped token --radar-accent; unresolved function'],
    ['color', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 82%, white)'],
    ['border-color', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 44%, transparent)'],
    ['background', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 16%, transparent)'],
    ['background', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 88%, white)'],
    ['box-shadow', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 34%, transparent)'],
    ['color', 'scoped token --health-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--health-accent) 78%, white)'],
    ['background', 'scoped token --summary-accent; unresolved function'],
    ['background-image', 'scoped token --summary-accent; unresolved function'],
    ['min-height', 'unknown/runtime token --delivery-stack-collapsed-height; unresolved function'],
    ['border', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--gauge-accent) 44%, var(--color-border))'],
    // Stage 27: exact split of the original composite gauge background.
    // The live status halo and live surface gradient remain separately reviewed.
    ['background-image', 'scoped token --gauge-surface-start; unresolved function'],
    ['background-image', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--gauge-accent) 8%, transparent)'],
    ['border', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--gauge-accent) 34%, var(--color-border))'],
    ['background', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--gauge-accent) 8%, var(--color-surface))'],
    ['color', 'scoped token --gauge-accent; unresolved function'],
    ['background', 'scoped token --gauge-accent; unresolved function'],
    ['box-shadow', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--gauge-accent) 42%, transparent)'],
    ['background-image', 'scoped token --gauge-ring-active; unknown/runtime token --gauge-progress; scoped token --gauge-track; unresolved function'],
    ['border', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--gauge-accent) 16%, var(--color-border))'],
    ['background', 'scoped token --gauge-accent; unresolved function; unresolved color-mix: color-mix(in srgb, var(--color-text) 78%, var(--gauge-accent))'],
    ['color', 'scoped token --gauge-accent; unresolved function'],
    ['background-image', 'scoped token --radar-wave-radius; unresolved function'],
  ]],
])

function unexpectedLiveDeclarations(relativePath, issues) {
  const expected = expectedLiveDeclarations.get(relativePath) ?? []
  const key = ({ property, reason }) => JSON.stringify([property, reason])
  const actualKeys = issues.map(key).sort()
  const expectedKeys = expected.map(([property, reason]) => key({ property, reason })).sort()
  return actualKeys.length !== expectedKeys.length
    || actualKeys.some((value, index) => value !== expectedKeys[index])
}

export function w3cApprovedCssPilots() {
  return {
    name: 'helmsight-w3c-approved-css-pilots',
    apply: 'build',
    enforce: 'pre',
    transform(source, id) {
      const sourcePath = resolve(id.split('?')[0])
      const approvedPath = approvedFiles.get(sourcePath)
      if (!approvedPath) return null

      // Rebuild token maps from the current source; a build must not
      // reuse stale root design tokens from a previous build.
      const tokens = buildThemeTokens(allCss(srcRoot))
      const result = transform(source, sourcePath, tokens)
      if (unexpectedLiveDeclarations(approvedPath, result.report.issues)) {
        const details = result.report.issues.map(({ line, property, reason }) =>
          `line ${line} (${property}): ${reason}`,
        ).join('\n')
        this.error(`W3C pilot ${approvedPath} left ${result.report.unhandled} unresolved declarations:\n${details}`)
      }

      return { code: result.css, map: null }
    },
  }
}
