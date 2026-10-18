import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  loadManagementActions,
  selectManagementActions,
  selectManagementActionsError,
  selectManagementActionsStatus,
} from '../../features/managementActions/model/managementActionsSlice.js'
import {
  ACTION_ATTENTION,
  ACTION_PRIORITIES,
  ACTION_STATUSES,
  getActionAttentionLabel,
  getActionAttentionState,
  getActionPriorityLabel,
  getActionStatusLabel,
} from '../../features/managementActions/lib/managementActions.js'
import {
  loadProjects,
  selectProjects,
  selectProjectsError,
  selectProjectsStatus,
} from '../../features/projects/model/projectsSlice.js'
import { deriveGlobalActionsView } from './globalActions.js'
import { ManagementActionsHelp } from '../../features/managementActions/ui/ManagementActionsHelp.jsx'
import styles from './GlobalActionsPage.module.css'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value + 'T00:00:00'))
}

function getOwnerInitials(value) {
  const parts = String(value ?? '').trim().split(/\s+/u).filter(Boolean)
  if (parts.length === 0) return '?'
  const selected = parts.length === 1 ? parts : [parts[0], parts[parts.length - 1]]
  return selected.map((part) => Array.from(part)[0].toLocaleUpperCase()).join('')
}

export function GlobalActionsPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const projectsError = useAppSelector(selectProjectsError)
  const actions = useAppSelector(selectManagementActions)
  const actionsStatus = useAppSelector(selectManagementActionsStatus)
  const actionsError = useAppSelector(selectManagementActionsError)

  const [projectId, setProjectId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priority, setPriority] = useState('all')
  const [attention, setAttention] = useState('all')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (projectsStatus === 'idle') dispatch(loadProjects())
  }, [dispatch, projectsStatus])

  useEffect(() => {
    if (actionsStatus === 'idle') dispatch(loadManagementActions())
  }, [dispatch, actionsStatus])

  const {
    eligibleProjects,
    projectById,
    scopedCount,
    visibleActions,
    summary,
  } = useMemo(() => deriveGlobalActionsView({
    projects,
    actions,
    includeArchived,
    projectId,
    status: statusFilter,
    priority,
    attention,
  }), [
    projects,
    actions,
    includeArchived,
    projectId,
    statusFilter,
    priority,
    attention,
  ])

  const totalPages = Math.max(1, Math.ceil(visibleActions.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedActions = visibleActions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter((number) =>
    number === 1 ||
    number === totalPages ||
    Math.abs(number - currentPage) <= 1,
  )

  const pageControls = pageNumbers.flatMap((number, index) => {
    const control = { type: 'page', key: `page-${number}`, number }
    return index > 0 && number - pageNumbers[index - 1] > 1
      ? [{ type: 'gap', key: `gap-${number}` }, control]
      : [control]
  })

  const resetFilters = () => {
    setProjectId('all')
    setStatusFilter('all')
    setPriority('all')
    setAttention('all')
    setIncludeArchived(false)
    setPage(1)
  }

  const loading = ['idle', 'loading'].includes(projectsStatus) ||
    ['idle', 'loading'].includes(actionsStatus)
  const failed = projectsStatus === 'failed' || actionsStatus === 'failed'

  if (loading) {
    return <div className={styles.state} role="status">Loading portfolio actions…</div>
  }

  if (failed) {
    return <div className={styles.state} role="alert">
      <strong>Global Actions could not be loaded.</strong>
      <p>{projectsError || actionsError}</p>
      <button type="button" onClick={() => {
        if (projectsStatus === 'failed') dispatch(loadProjects())
        if (actionsStatus === 'failed') dispatch(loadManagementActions())
      }}>Try again</button>
    </div>
  }

  return <section className={styles.root} aria-labelledby="global-actions-title">
    <header className={styles.header}>
      <span className={styles.eyebrow}>Portfolio oversight</span>
      <div className={styles.titleRow}>
        <h1 id="global-actions-title">Global Actions</h1>
        <ManagementActionsHelp variant="portfolio" />
      </div>
      <p>Management commitments and follow-ups across active projects.</p>
    </header>

    <div className={styles.summary} role="group" aria-label="Portfolio action summary">
      {[
        ['Active', summary.active, 'active'],
        ['Critical active', summary.critical, 'critical'],
        ['Needs attention', summary.attention, 'attention'],
        ['Done', summary.done, 'done'],
      ].map(([label, value, tone]) => <div className={styles.metric} data-tone={tone} key={label}>
        <span>{label}</span><strong>{value}</strong>
      </div>)}
    </div>

    <section className={styles.filterPanel} aria-labelledby="portfolio-filters-title">
      <div className={styles.filtersHeader}>
        <span className={styles.eyebrow}>Portfolio filters</span>
        <h2 id="portfolio-filters-title">Filters</h2>
      </div>
      <div className={styles.filters} role="group" aria-label="Filter portfolio actions">
        <label className={styles.filter}>
          <span>Project</span>
          <span className={styles.selectWrap}>
            <select value={projectId} onChange={(event) => {
              setProjectId(event.target.value)
              setPage(1)
            }}>
              <option value="all">All projects</option>
              {[...eligibleProjects]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}{project.archivedAt ? ' (Archived)' : ''}
                  </option>
                ))}
            </select>
          </span>
        </label>

        <label className={styles.filter}>
          <span>Status</span>
          <span className={styles.selectWrap}>
            <select value={statusFilter} onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}>
              <option value="all">All statuses</option>
              {ACTION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </span>
        </label>

        <label className={styles.filter}>
          <span>Priority</span>
          <span className={styles.selectWrap}>
            <select value={priority} onChange={(event) => {
              setPriority(event.target.value)
              setPage(1)
            }}>
              <option value="all">All priorities</option>
              {ACTION_PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </span>
        </label>

        <label className={styles.filter}>
          <span>Attention</span>
          <span className={styles.selectWrap}>
            <select value={attention} onChange={(event) => {
              setAttention(event.target.value)
              setPage(1)
            }}>
              <option value="all">All attention states</option>
              {Object.values(ACTION_ATTENTION).map((value) => (
                <option key={value} value={value}>{getActionAttentionLabel(value)}</option>
              ))}
            </select>
          </span>
        </label>

        <div className={styles.filterBar}>
          <label className={styles.archiveToggle}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                setIncludeArchived(event.target.checked)
                setProjectId('all')
                setPage(1)
              }}
            />
            Include archived projects
          </label>
          <button className={styles.resetButton} type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      </div>
    </section>

    <section className={styles.register} aria-labelledby="portfolio-register-title">
      <div className={styles.registerHeader}>
        <div>
          <span className={styles.eyebrow}>Management actions</span>
          <h2 id="portfolio-register-title">Portfolio actions</h2>
        </div>
        <span className={styles.total}>{visibleActions.length} of {scopedCount} actions</span>
      </div>
      <p className={styles.scopeNote}>
        {includeArchived
          ? 'Including active and archived projects.'
          : 'Showing active projects only.'}
      </p>

      {scopedCount === 0
        ? <div className={styles.empty}>
          <strong>{projectId === 'all' ? 'No portfolio actions yet.' : 'No actions in this project.'}</strong>
          <p>Actions from the selected project scope will appear here.</p>
          <Link to="/projects">Browse projects</Link>
        </div>
        : visibleActions.length === 0
          ? <div className={styles.empty}>
            <strong>No actions match these filters.</strong>
            <p>Try another status, priority or attention state.</p>
            <button className={styles.resetButton} type="button" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
          : <div className={styles.registerBody}>
            <div className={styles.columnHeader} aria-hidden="true">
              <span>Action</span>
              <span>Project</span>
              <span>Owner</span>
              <span>Due</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Attention</span>
              <span />
            </div>
            <ul className={styles.list}>
              {paginatedActions.map((action) => {
                const project = projectById.get(action.projectId)
                const attentionState = getActionAttentionState(action)

                return <li className={styles.row} key={action.id}>
                  <div className={styles.actionCell}>
                    <h3>{action.title}</h3>
                    {action.description ? (
                      <p className={styles.actionDetails}>{action.description}</p>
                    ) : null}
                  </div>

                  <div className={styles.projectCell}>
                    <span className={styles.cellLabel}>Project</span>
                    <span>{project.name}{project.archivedAt ? ' (Archived)' : ''}</span>
                  </div>

                  <div className={styles.ownerCell}>
                    <span className={styles.cellLabel}>Owner</span>
                    <span className={styles.ownerContent}>
                      <span className={styles.initials} aria-hidden="true">
                        {getOwnerInitials(action.owner)}
                      </span>
                      <span>{action.owner || 'Unassigned'}</span>
                    </span>
                  </div>

                  <div className={styles.dueCell}>
                    <span className={styles.cellLabel}>Due</span>
                    <span>{formatDate(action.dueDate)}</span>
                  </div>

                  <div className={styles.priorityCell}>
                    <span className={styles.cellLabel}>Priority</span>
                    <span className={styles.badge} data-priority={action.priority}>
                      {getActionPriorityLabel(action.priority)}
                    </span>
                  </div>

                  <div className={styles.statusCell}>
                    <span className={styles.cellLabel}>Status</span>
                    <strong className={styles.statusBadge} data-status={action.status}>
                      {getActionStatusLabel(action.status)}
                    </strong>
                  </div>

                  <div className={styles.attentionCell}>
                    <span className={styles.cellLabel}>Attention</span>
                    <span className={styles.badge} data-attention={attentionState}>
                      {getActionAttentionLabel(attentionState)}
                    </span>
                  </div>

                  <div className={styles.openCell}>
                    <Link
                      className={styles.openLink}
                      data-ui-button="secondary"
                      data-ui-size="sm"
                      to={'/projects/' + encodeURIComponent(project.id) +
                        '/actions#action-' + encodeURIComponent(action.id)}
                    >
                      Open in project <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </li>
              })}
            </ul>
          </div>}

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Portfolio actions pagination">
          <span className={styles.paginationSummary}>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, visibleActions.length)}
            {' '}of {visibleActions.length} actions
          </span>

          <div className={styles.paginationControls}>
            <button
              className={styles.pageButton}
              data-ui-button="secondary"
              data-ui-size="sm"
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>

            <div className={styles.pageNumbers}>
              {pageControls.map((control) => (
                control.type === 'gap' ? (
                  <span
                    key={control.key}
                    className={styles.pageGap}
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={control.key}
                    className={styles.pageButton}
                    data-ui-button="secondary"
                    data-ui-size="sm"
                    type="button"
                    aria-label={`Page ${control.number}`}
                    aria-current={control.number === currentPage ? 'page' : undefined}
                    onClick={() => setPage(control.number)}
                  >
                    {control.number}
                  </button>
                )
              ))}
            </div>

            <button
              className={styles.pageButton}
              data-ui-button="secondary"
              data-ui-size="sm"
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  </section>
}
