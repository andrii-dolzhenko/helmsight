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
  loadEvm,
  selectEvmError,
  selectEvmStatus,
} from '../../features/evm/model/evmSlice.js'
import {
  EVM_MEASUREMENT_BASES,
  EVM_PERFORMANCE_STATE,
  formatIndex,
  getMeasurementBasisLabel,
  getPerformanceStateLabel,
} from '../../features/evm/lib/evm.js'
import { deriveGlobalMetricsView, GLOBAL_METRICS_PAGE_SIZE, METRICS_SORT } from './globalMetrics.js'
import styles from './GlobalMetricsPage.module.css'

const PERFORMANCE_FILTERS = [
  [EVM_PERFORMANCE_STATE.PRESSURE, 'Needs attention'],
  [EVM_PERFORMANCE_STATE.WATCH, 'On watch'],
  [EVM_PERFORMANCE_STATE.HEALTHY, 'Healthy'],
  [EVM_PERFORMANCE_STATE.NOT_AVAILABLE, 'Missing data'],
]

function formatDate(value) {
  if (!value) return 'No snapshot'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  }).format(date)
}

function formatBasis(record) {
  if (!record.measurementBasis) return 'Not configured'
  const label = getMeasurementBasisLabel(record.measurementBasis)
  return record.measurementBasis === 'currency' && record.currencyCode
    ? `${label} (${record.currencyCode})`
    : label
}

function performanceLabel(status) {
  return status === EVM_PERFORMANCE_STATE.NOT_AVAILABLE
    ? 'Missing data'
    : status === EVM_PERFORMANCE_STATE.WATCH
      ? 'On watch'
      : getPerformanceStateLabel(status)
}

export function GlobalMetricsPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const projectsError = useAppSelector(selectProjectsError)
  const { baselines, snapshots } = useAppSelector((state) => state.evm)
  const evmStatus = useAppSelector(selectEvmStatus)
  const evmError = useAppSelector(selectEvmError)

  const [projectId, setProjectId] = useState('all')
  const [includeArchivedProjects, setIncludeArchivedProjects] = useState(false)
  const [query, setQuery] = useState('')
  const [measurementBasis, setMeasurementBasis] = useState('all')
  const [performance, setPerformance] = useState('all')
  const [sort, setSort] = useState(METRICS_SORT.ATTENTION)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (projectsStatus === 'idle') dispatch(loadProjects())
  }, [dispatch, projectsStatus])
  useEffect(() => {
    if (evmStatus === 'idle') dispatch(loadEvm())
  }, [dispatch, evmStatus])

  const view = useMemo(() => deriveGlobalMetricsView({
    projects, baselines, snapshots, projectId, includeArchivedProjects,
    query, measurementBasis, performance, sort,
  }), [projects, baselines, snapshots, projectId, includeArchivedProjects, query, measurementBasis, performance, sort])

  const totalPages = Math.max(1, Math.ceil(view.visibleRecords.length / GLOBAL_METRICS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedRecords = view.visibleRecords.slice(
    (currentPage - 1) * GLOBAL_METRICS_PAGE_SIZE,
    currentPage * GLOBAL_METRICS_PAGE_SIZE,
  )
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1)
  const pageControls = pageNumbers.flatMap((number, index) => {
    const control = { type: 'page', key: `page-${number}`, number }
    return index > 0 && number - pageNumbers[index - 1] > 1
      ? [{ type: 'gap', key: `gap-${number}` }, control]
      : [control]
  })
  const change = (setValue) => (event) => { setValue(event.target.value); setPage(1) }
  const reset = () => {
    setProjectId('all')
    setIncludeArchivedProjects(false)
    setQuery('')
    setMeasurementBasis('all')
    setPerformance('all')
    setSort(METRICS_SORT.ATTENTION)
    setPage(1)
  }

  const loading = ['idle', 'loading'].includes(projectsStatus) || ['idle', 'loading'].includes(evmStatus)
  const failed = projectsStatus === 'failed' || evmStatus === 'failed'
  if (loading) return <div role="status" className={styles.state}>Loading portfolio metrics…</div>
  if (failed) return <div role="alert" className={styles.state}>
    <strong>Global Metrics could not be loaded.</strong>
    <p>{projectsError || evmError}</p>
    <button type="button" data-ui-button="secondary" onClick={() => {
      if (projectsStatus === 'failed') dispatch(loadProjects())
      if (evmStatus === 'failed') dispatch(loadEvm())
    }}>Try again</button>
  </div>

  return <section className={styles.root} aria-labelledby="global-metrics-title">
    <header className={styles.header}>
      <span className={styles.eyebrow}>Portfolio performance</span>
      <h1 id="global-metrics-title">Global Metrics</h1>
      <p>Project delivery performance based on real EVM baselines and snapshots.</p>
    </header>

    <div role="group" className={styles.summary} aria-label="Portfolio EVM summary">
      {[
        ['Reporting projects', view.summary.reporting, 'reporting'],
        ['Needs attention', view.summary.attention, 'attention'],
        ['On watch', view.summary.watch, 'watch'],
        ['Missing EVM data', view.summary.missing, 'missing'],
      ].map(([label, value, tone]) => <div key={label} className={styles.metric} data-tone={tone}>
        <span>{label}</span><strong>{value}</strong>
      </div>)}
    </div>

    <section className={styles.panel} aria-labelledby="metrics-filters-title">
      <div className={styles.filtersHeader}>
        <span className={styles.eyebrow}>Portfolio filters</span>
        <h2 id="metrics-filters-title">Filters</h2>
      </div>
      <div className={styles.filters} role="group" aria-label="Filter portfolio metrics">
        <label className={styles.filter}><span>Search</span>
          <input type="search" placeholder="Project name" value={query} onChange={change(setQuery)} />
        </label>
        <label className={styles.filter}><span>Project</span>
          <select value={projectId} onChange={change(setProjectId)}>
            <option value="all">All projects</option>
            {[...view.eligibleProjects].sort((a, b) => a.name.localeCompare(b.name)).map((project) =>
              <option key={project.id} value={project.id}>
                {project.name}{project.archivedAt ? ' (Archived)' : ''}
              </option>,
            )}
          </select>
        </label>
        <label className={styles.filter}><span>Measurement basis</span>
          <select value={measurementBasis} onChange={change(setMeasurementBasis)}>
            <option value="all">All bases</option>
            {EVM_MEASUREMENT_BASES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            <option value="missing">Not configured</option>
          </select>
        </label>
        <label className={styles.filter}><span>Performance</span>
          <select value={performance} onChange={change(setPerformance)}>
            <option value="all">All states</option>
            {PERFORMANCE_FILTERS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <div className={styles.filterBar}>
          <label className={styles.archiveToggle}>
            <input type="checkbox" checked={includeArchivedProjects} onChange={(event) => {
              setIncludeArchivedProjects(event.target.checked)
              setProjectId('all')
              setPage(1)
            }} />Include archived projects
          </label>
          <button type="button" className={styles.resetButton} onClick={reset}>Reset filters</button>
        </div>
      </div>
    </section>

    <section className={styles.panel} aria-labelledby="metrics-register-title">
      <div className={styles.registerHeader}>
        <div><span className={styles.eyebrow}>EVM register</span><h2 id="metrics-register-title">Portfolio performance</h2></div>
        <span className={styles.total}>{view.visibleRecords.length} of {view.scopedCount} projects</span>
      </div>
      <div className={styles.toolbar}>
        <p className={styles.scopeNote}>{includeArchivedProjects ? 'Including active and archived projects.' : 'Showing active projects only.'} SPI and CPI are compared as indices; values in different measurement bases are not added together.</p>
        <label className={styles.sortFilter}><span>Sort by</span>
          <select value={sort} onChange={change(setSort)}>
            <option value={METRICS_SORT.ATTENTION}>Needs attention first</option>
            <option value={METRICS_SORT.PROJECT}>Project name</option>
            <option value={METRICS_SORT.SNAPSHOT}>Latest snapshot</option>
            <option value={METRICS_SORT.SPI}>Lowest SPI first</option>
            <option value={METRICS_SORT.CPI}>Lowest CPI first</option>
          </select>
        </label>
      </div>
      {view.scopedCount === 0 ? <div className={styles.empty}>
        <strong>No projects in this scope.</strong><p>Add a project or include archived projects to begin.</p>
        <Link to="/projects">Browse projects</Link>
      </div> : view.visibleRecords.length === 0 ? <div className={styles.empty}>
        <strong>No projects match these filters.</strong><p>Try another project, measurement basis or performance state.</p>
        <button type="button" className={styles.resetButton} onClick={reset}>Clear filters</button>
      </div> : <div className={styles.registerBody}>
        <div className={styles.columnHeader} aria-hidden="true">
          <span>Project</span><span>Measurement basis</span><span>Latest snapshot</span>
          <span>SPI</span><span>CPI</span><span>Performance</span><span />
        </div>
        <ul className={styles.list}>{paginatedRecords.map((record) => <li key={record.projectId} className={styles.row}>
          <div className={styles.projectCell}><strong>{record.project.name}</strong>{record.project.archivedAt && <span className={styles.archived}>Archived</span>}</div>
          <div className={styles.basisCell}><span className={styles.cellLabel}>Measurement basis</span>{formatBasis(record)}</div>
          <div className={styles.dateCell}><span className={styles.cellLabel}>Latest snapshot</span>{record.snapshotDate ? <time dateTime={record.snapshotDate}>{formatDate(record.snapshotDate)}</time> : 'No snapshot'}</div>
          <div className={styles.spiCell}><span className={styles.cellLabel}>SPI</span><strong>{formatIndex(record.spi)}</strong></div>
          <div className={styles.cpiCell}><span className={styles.cellLabel}>CPI</span><strong>{record.measurementBasis === 'storyPoints' ? 'N/A' : formatIndex(record.cpi)}</strong></div>
          <div className={styles.performanceCell}><span className={styles.cellLabel}>Performance</span><span className={styles.badge} data-performance={record.performance}>{performanceLabel(record.performance)}</span></div>
          <div className={styles.openCell}><Link to={`/projects/${encodeURIComponent(record.projectId)}/metrics`} data-ui-button="secondary" data-ui-size="sm" className={styles.openLink}>Open metrics <span aria-hidden="true">↗</span></Link></div>
        </li>)}</ul>
      </div>}
      {totalPages > 1 && <nav className={styles.pagination} aria-label="Portfolio metrics pagination">
        <span className={styles.paginationSummary}>
          Showing {(currentPage - 1) * GLOBAL_METRICS_PAGE_SIZE + 1}–
          {Math.min(currentPage * GLOBAL_METRICS_PAGE_SIZE, view.visibleRecords.length)}
          {' '}of {view.visibleRecords.length} projects
        </span>
        <div className={styles.paginationControls}>
          <button type="button" data-ui-button="secondary" data-ui-size="sm" className={styles.pageButton} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <div className={styles.pageNumbers}>
            {pageControls.map((control) => control.type === 'gap' ? (
              <span key={control.key} className={styles.pageGap} aria-hidden="true">…</span>
            ) : (
              <button key={control.key} type="button" data-ui-button="secondary" data-ui-size="sm" className={styles.pageButton} aria-label={`Page ${control.number}`} aria-current={control.number === currentPage ? 'page' : undefined} onClick={() => setPage(control.number)}>{control.number}</button>
            ))}
          </div>
          <button type="button" data-ui-button="secondary" data-ui-size="sm" className={styles.pageButton} disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </nav>}
    </section>
  </section>
}
