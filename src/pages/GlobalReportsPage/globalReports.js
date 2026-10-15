import { REPORT_STATUS } from '../../features/reports/lib/weeklyReport.js'

export const GLOBAL_REPORTS_PAGE_SIZE = 10

export const REPORT_SORT = Object.freeze({
  NEWEST: 'newest',
  OLDEST: 'oldest',
  RECENTLY_UPDATED: 'updated',
})

// The project selection controls the KPI scope. Register-only filters never change KPI counts.
export function deriveGlobalReportsView({
  projects = [],
  reports = [],
  includeArchivedProjects = false,
  projectId = 'all',
  lifecycle = 'current',
  query = '',
  status = 'all',
  period = 'all',
  sort = REPORT_SORT.NEWEST,
}) {
  const eligibleProjects = projects.filter((project) =>
    includeArchivedProjects || !project.archivedAt,
  )
  const projectById = new Map(eligibleProjects.map((project) => [project.id, project]))

  // An orphan report is deliberately never exposed as a navigable portfolio record.
  const scopedReports = reports.filter((report) =>
    projectById.has(report.projectId) &&
    (projectId === 'all' || report.projectId === projectId),
  )

  const summary = {
    current: scopedReports.filter((report) => !report.archivedAt).length,
    draft: scopedReports.filter((report) => !report.archivedAt && report.status === REPORT_STATUS.DRAFT).length,
    final: scopedReports.filter((report) => !report.archivedAt && report.status === REPORT_STATUS.FINAL).length,
    archived: scopedReports.filter((report) => Boolean(report.archivedAt)).length,
  }

  const periods = [...new Set(scopedReports
    .map((report) => String(report.periodEnd ?? '').slice(0, 7))
    .filter((value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)))]
    .sort((left, right) => right.localeCompare(left))

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleReports = scopedReports.filter((report) => {
    const archived = Boolean(report.archivedAt)
    if (archived !== (lifecycle === 'archived')) return false
    if (status !== 'all' && report.status !== status) return false
    if (period !== 'all' && !String(report.periodEnd ?? '').startsWith(period)) return false
    if (!normalizedQuery) return true

    const project = projectById.get(report.projectId)
    return [project?.name, report.owner]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedQuery))
  }).sort((left, right) => {
    let comparison
    if (sort === REPORT_SORT.RECENTLY_UPDATED) {
      comparison = String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
    } else if (sort === REPORT_SORT.OLDEST) {
      comparison = String(left.periodEnd ?? '').localeCompare(String(right.periodEnd ?? ''))
    } else {
      comparison = String(right.periodEnd ?? '').localeCompare(String(left.periodEnd ?? ''))
    }
    if (comparison !== 0) return comparison
    const updated = String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
    return updated || String(left.id).localeCompare(String(right.id))
  })

  return {
    eligibleProjects,
    projectById,
    scopedCount: scopedReports.length,
    summary,
    periods,
    visibleReports,
  }
}
