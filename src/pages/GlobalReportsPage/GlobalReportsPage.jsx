import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  loadProjects,
  selectProjects,
  selectProjectsError,
  selectProjectsStatus,
} from '../../features/projects/model/projectsSlice.js'
import {
  loadReports,
  selectReports,
  selectReportsError,
  selectReportsStatus,
} from '../../features/reports/model/reportsSlice.js'
import { REPORT_STATUS, getReportPeriod } from '../../features/reports/lib/weeklyReport.js'
import { deriveGlobalReportsView, GLOBAL_REPORTS_PAGE_SIZE, REPORT_SORT } from './globalReports.js'
import styles from './GlobalReportsPage.module.css'

function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = new Date(options.timestamp ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatPeriod(report) {
  const period = getReportPeriod(report.periodEnd)
  if (!period) return 'Unavailable period'
  return `${formatDate(period.periodStart)} – ${formatDate(period.periodEnd)}`
}

function formatMonth(value) {
  const date = new Date(`${value}-01T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}

function getPaginationControls(currentPage, totalPages) {
  const numbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1)
  return numbers.flatMap((number, index) =>
    index > 0 && number - numbers[index - 1] > 1
      ? [{ type: 'gap', key: `gap-${number}` }, { type: 'page', number, key: `page-${number}` }]
      : [{ type: 'page', number, key: `page-${number}` }],
  )
}

export function GlobalReportsPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const projectsError = useAppSelector(selectProjectsError)
  const reports = useAppSelector(selectReports)
  const reportsStatus = useAppSelector(selectReportsStatus)
  const reportsError = useAppSelector(selectReportsError)

  const [projectId, setProjectId] = useState('all')
  const [includeArchivedProjects, setIncludeArchivedProjects] = useState(false)
  const [lifecycle, setLifecycle] = useState('current')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState(REPORT_SORT.NEWEST)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (projectsStatus === 'idle') dispatch(loadProjects())
  }, [dispatch, projectsStatus])

  useEffect(() => {
    if (reportsStatus === 'idle') dispatch(loadReports())
  }, [dispatch, reportsStatus])

  const { eligibleProjects, projectById, scopedCount, summary, periods, visibleReports } = useMemo(
    () => deriveGlobalReportsView({
      projects,
      reports,
      includeArchivedProjects,
      projectId,
      lifecycle,
      query,
      status: lifecycle === 'archived' ? 'all' : status,
      period,
      sort,
    }),
    [projects, reports, includeArchivedProjects, projectId, lifecycle, query, status, period, sort],
  )

  const lifecycleCount = lifecycle === 'archived' ? summary.archived : summary.current
  const totalPages = Math.max(1, Math.ceil(visibleReports.length / GLOBAL_REPORTS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedReports = visibleReports.slice(
    (currentPage - 1) * GLOBAL_REPORTS_PAGE_SIZE,
    currentPage * GLOBAL_REPORTS_PAGE_SIZE,
  )

  const resetFilters = () => {
    setProjectId('all')
    setIncludeArchivedProjects(false)
    setLifecycle('current')
    setSort(REPORT_SORT.NEWEST)
    setQuery('')
    setStatus('all')
    setPeriod('all')
    setPage(1)
  }

  const loading = ['idle', 'loading'].includes(projectsStatus) ||
    ['idle', 'loading'].includes(reportsStatus)
  const failed = projectsStatus === 'failed' || reportsStatus === 'failed'

  if (loading) {
    return <div className={styles.state} role="status">Loading portfolio reports…</div>
  }

  if (failed) {
    return <div className={styles.state} role="alert">
      <strong>Global Reports could not be loaded.</strong>
      <p>{projectsError || reportsError}</p>
      <button type="button" onClick={() => {
        if (projectsStatus === 'failed') dispatch(loadProjects())
        if (reportsStatus === 'failed') dispatch(loadReports())
      }}>Try again</button>
    </div>
  }

  return <section className={styles.root} aria-labelledby="global-reports-title">
    <header className={styles.header}>
      <span className={styles.eyebrow}>Portfolio oversight</span>
      <h1 id="global-reports-title">Global Reports</h1>
      <p>Weekly reporting across your project portfolio.</p>
    </header>

    <div className={styles.summary} role="group" aria-label="Portfolio report summary">
      {[
        ['Current reports', summary.current, 'current'],
        ['Draft', summary.draft, 'draft'],
        ['Final', summary.final, 'final'],
        ['Archived reports', summary.archived, 'archived'],
      ].map(([label, value, tone]) => <div className={styles.metric} data-tone={tone} key={label}>
        <span>{label}</span><strong>{value}</strong>
      </div>)}
    </div>

    <section className={styles.filterPanel} aria-labelledby="portfolio-report-filters-title">
      <div className={styles.filtersHeader}>
        <div className={styles.filtersTitle}>
          <span className={styles.eyebrow}>Portfolio filters</span>
          <h2 id="portfolio-report-filters-title">Filters</h2>
        </div>
        <div className={styles.lifecycle} role="group" aria-label="Report lifecycle">
          <button type="button" aria-pressed={lifecycle === 'current'} onClick={() => {
            setLifecycle('current')
            setStatus('all')
            setPage(1)
          }}>Current <span>{summary.current}</span></button>
          <button type="button" aria-pressed={lifecycle === 'archived'} onClick={() => {
            setLifecycle('archived')
            setStatus('all')
            setPage(1)
          }}>Archived <span>{summary.archived}</span></button>
        </div>
      </div>
      <div className={styles.filters} role="group" aria-label="Filter portfolio reports">
        <label className={styles.filter}>
          <span>Search</span>
          <input type="search" placeholder="Project or report owner" value={query} onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }} />
        </label>
        <label className={styles.filter}>
          <span>Project</span>
          <select value={projectId} onChange={(event) => {
            setProjectId(event.target.value)
            setPage(1)
          }}>
            <option value="all">All projects</option>
            {[...eligibleProjects].sort((a, b) => a.name.localeCompare(b.name)).map((project) =>
              <option key={project.id} value={project.id}>
                {project.name}{project.archivedAt ? ' (Archived)' : ''}
              </option>,
            )}
          </select>
        </label>
        <label className={styles.filter}>
          <span>Status</span>
          <select value={lifecycle === 'archived' ? REPORT_STATUS.FINAL : status}
            disabled={lifecycle === 'archived'}
            onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="all">All statuses</option>
            <option value={REPORT_STATUS.DRAFT}>Draft</option>
            <option value={REPORT_STATUS.FINAL}>Final</option>
          </select>
        </label>
        <label className={styles.filter}>
          <span>Reporting period</span>
          <select value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1) }}>
            <option value="all">All reporting periods</option>
            {periods.map((value) => <option key={value} value={value}>{formatMonth(value)}</option>)}
          </select>
        </label>
        <div className={styles.filterBar}>
          <label className={styles.archiveToggle}>
            <input type="checkbox" checked={includeArchivedProjects} onChange={(event) => {
              setIncludeArchivedProjects(event.target.checked)
              setProjectId('all')
              setPage(1)
            }} />
            Include archived projects
          </label>
          <button className={styles.resetButton} type="button" onClick={resetFilters}>Reset filters</button>
        </div>
      </div>
    </section>

    <section className={styles.register} aria-labelledby="portfolio-reports-title">
      <div className={styles.registerHeader}>
        <div>
          <span className={styles.eyebrow}>Report register</span>
          <h2 id="portfolio-reports-title">Portfolio reports</h2>
        </div>
        <span className={styles.total}>{visibleReports.length} of {scopedCount} reports</span>
      </div>
      <div className={styles.registerToolbar}>
        <p className={styles.scopeNote}>
          {includeArchivedProjects ? 'Including active and archived projects.' : 'Showing active projects only.'}
        </p>
        <label className={styles.sortFilter}>
          <span>Sort by</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
            <option value={REPORT_SORT.NEWEST}>Newest period first</option>
            <option value={REPORT_SORT.OLDEST}>Oldest period first</option>
            <option value={REPORT_SORT.RECENTLY_UPDATED}>Recently updated</option>
          </select>
        </label>
      </div>

      {scopedCount === 0 ? (
        <div className={styles.empty}>
          <strong>{projectId === 'all' ? 'No portfolio reports yet.' : 'No reports in this project.'}</strong>
          <p>Reports from the selected project scope will appear here.</p>
          <Link to="/projects">Browse projects</Link>
        </div>
      ) : lifecycleCount === 0 ? (
        <div className={styles.empty}>
          <strong>{lifecycle === 'archived' ? 'No archived reports in this scope.' : 'No current reports in this scope.'}</strong>
          <p>Switch the report view or select another project.</p>
        </div>
      ) : visibleReports.length === 0 ? (
        <div className={styles.empty}>
          <strong>No reports match these filters.</strong>
          <p>Try a different lifecycle, project, status, search or reporting period.</p>
          <button className={styles.resetButton} type="button" onClick={resetFilters}>Clear filters</button>
        </div>
      ) : (
        <div className={styles.registerBody}>
          <div className={styles.columnHeader} aria-hidden="true">
            <span>Reporting period</span><span>Project</span><span>Owner</span>
            <span>Status</span><span>Version</span><span>Updated</span><span />
          </div>
          <ul className={styles.list}>
            {paginatedReports.map((report) => {
              const project = projectById.get(report.projectId)
              return <li key={report.id} className={styles.row}>
                <div className={styles.periodCell}>
                  <span className={styles.cellLabel}>Reporting period</span>
                  <strong>{formatPeriod(report)}</strong>
                </div>
                <div className={styles.projectCell}>
                  <span className={styles.cellLabel}>Project</span>
                  <span>{project.name}{project.archivedAt ? ' (Archived)' : ''}</span>
                </div>
                <div className={styles.ownerCell}>
                  <span className={styles.cellLabel}>Owner</span>
                  <span>{report.owner?.trim() || 'Unassigned'}</span>
                </div>
                <div className={styles.statusCell}>
                  <span className={styles.cellLabel}>Status</span>
                  <strong className={styles.statusBadge} data-status={report.status}>
                    {report.status === REPORT_STATUS.FINAL ? 'Final' : 'Draft'}
                  </strong>
                </div>
                <div className={styles.versionCell}>
                  <span className={styles.cellLabel}>Version</span>
                  <span>v{report.version}</span>
                </div>
                <div className={styles.updatedCell}>
                  <span className={styles.cellLabel}>Updated</span>
                  <span>{formatDate(report.updatedAt, { timestamp: true })}</span>
                </div>
                <div className={styles.openCell}>
                  <Link className={styles.openLink} data-ui-button="secondary" data-ui-size="sm"
                    to={`/projects/${encodeURIComponent(project.id)}/reports/${encodeURIComponent(report.id)}`}>
                    Open report <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </li>
            })}
          </ul>
        </div>
      )}
      {totalPages > 1 ? <nav className={styles.pagination} aria-label="Portfolio reports pagination">
        <span className={styles.paginationSummary}>
          Showing {(currentPage - 1) * GLOBAL_REPORTS_PAGE_SIZE + 1}–
          {Math.min(currentPage * GLOBAL_REPORTS_PAGE_SIZE, visibleReports.length)} of {visibleReports.length} reports
        </span>
        <div className={styles.paginationControls}>
          <button className={styles.pageButton} data-ui-button="secondary" data-ui-size="sm"
            type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          {getPaginationControls(currentPage, totalPages).map((control) =>
            control.type === 'gap' ? <span className={styles.pageGap} aria-hidden="true" key={control.key}>…</span>
              : <button key={control.key} className={styles.pageButton} data-ui-button="secondary"
                data-ui-size="sm" type="button" aria-label={`Page ${control.number}`}
                aria-current={control.number === currentPage ? 'page' : undefined}
                onClick={() => setPage(control.number)}>{control.number}</button>,
          )}
          <button className={styles.pageButton} data-ui-button="secondary" data-ui-size="sm"
            type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </nav> : null}
    </section>
  </section>
}
