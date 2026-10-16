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
  loadMeetings,
  selectMeetings,
  selectMeetingsError,
  selectMeetingsStatus,
} from '../../features/meetings/model/meetingsSlice.js'
import {
  deriveGlobalMeetingsView,
  GLOBAL_MEETINGS_PAGE_SIZE,
  MEETING_SORT,
} from './globalMeetings.js'
import styles from './GlobalMeetingsPage.module.css'

function formatDate(value, timestamp = false) {
  if (!value) return '—'
  const date = new Date(timestamp ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  }).format(date)
}

export function GlobalMeetingsPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const meetings = useAppSelector(selectMeetings)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const meetingsStatus = useAppSelector(selectMeetingsStatus)
  const projectsError = useAppSelector(selectProjectsError)
  const meetingsError = useAppSelector(selectMeetingsError)

  const [includeArchivedProjects, setIncludeArchivedProjects] = useState(false)
  const [projectId, setProjectId] = useState('all')
  const [lifecycle, setLifecycle] = useState('current')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(MEETING_SORT.NEWEST)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (projectsStatus === 'idle') dispatch(loadProjects())
    if (meetingsStatus === 'idle') dispatch(loadMeetings())
  }, [dispatch, projectsStatus, meetingsStatus])

  const { eligibleProjects, projectById, scopedCount, summary, visibleMeetings } = useMemo(() =>
    deriveGlobalMeetingsView({
      projects, meetings, includeArchivedProjects, projectId, lifecycle, query, sort,
    }),
  [projects, meetings, includeArchivedProjects, projectId, lifecycle, query, sort])

  const lifecycleCount = lifecycle === 'current' ? summary.current : summary.archived
  const totalPages = Math.max(1, Math.ceil(visibleMeetings.length / GLOBAL_MEETINGS_PAGE_SIZE))
  const activePage = Math.min(page, totalPages)
  const shownMeetings = visibleMeetings.slice(
    (activePage - 1) * GLOBAL_MEETINGS_PAGE_SIZE,
    activePage * GLOBAL_MEETINGS_PAGE_SIZE,
  )
  const firstPageNumber = Math.min(Math.max(1, activePage - 2), Math.max(1, totalPages - 4))
  const pageNumbers = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => firstPageNumber + index,
  )

  const resetFilters = () => {
    setIncludeArchivedProjects(false)
    setProjectId('all')
    setLifecycle('current')
    setQuery('')
    setSort(MEETING_SORT.NEWEST)
    setPage(1)
  }

  const loading = ['idle', 'loading'].includes(projectsStatus) ||
    ['idle', 'loading'].includes(meetingsStatus)
  const failed = projectsStatus === 'failed' || meetingsStatus === 'failed'

  if (loading) return <div className={styles.state} role="status">Loading portfolio meetings…</div>
  if (failed) return <div className={styles.state} role="alert">
    <strong>Global Meetings could not be loaded.</strong>
    <p>{projectsError || meetingsError}</p>
    <button type="button" onClick={() => {
      if (projectsStatus === 'failed') dispatch(loadProjects())
      if (meetingsStatus === 'failed') dispatch(loadMeetings())
    }}>Try again</button>
  </div>

  return <section className={styles.root} aria-labelledby="global-meetings-title">
    <header className={styles.header}>
      <span className={styles.eyebrow}>Portfolio oversight</span>
      <h1 id="global-meetings-title">Global Meetings</h1>
      <p>Meeting notes, decisions and follow-ups across your project portfolio.</p>
    </header>

    <div className={styles.summary} aria-label="Portfolio meetings summary">
      {[
        ['Total meetings', summary.total, 'total'],
        ['Current notes', summary.current, 'current'],
        ['Archived notes', summary.archived, 'archived'],
      ].map(([label, value, tone]) =>
        <div key={label} className={styles.metric} data-tone={tone}>
          <span>{label}</span><strong>{value}</strong>
        </div>,
      )}
    </div>

    <section className={styles.filterPanel} aria-labelledby="meeting-filters-title">
      <div className={styles.filtersHeader}>
        <div className={styles.filtersTitle}>
          <span className={styles.eyebrow}>Portfolio filters</span>
          <h2 id="meeting-filters-title">Filters</h2>
        </div>
        <div className={styles.lifecycle} role="group" aria-label="Meeting note lifecycle">
          <button type="button" aria-pressed={lifecycle === 'current'} onClick={() => {
            setLifecycle('current')
            setPage(1)
          }}>Current <span>{summary.current}</span></button>
          <button type="button" aria-pressed={lifecycle === 'archived'} onClick={() => {
            setLifecycle('archived')
            setPage(1)
          }}>Archived <span>{summary.archived}</span></button>
        </div>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter portfolio meetings">
        <label className={styles.filter}>
          <span>Search</span>
          <input type="search" placeholder="Meeting title or project" value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
        </label>
        <label className={styles.filter}>
          <span>Project</span>
          <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(1) }}>
            <option value="all">All projects</option>
            {[...eligibleProjects].sort((a, b) => a.name.localeCompare(b.name)).map((project) =>
              <option key={project.id} value={project.id}>
                {project.name}{project.archivedAt ? ' (Archived)' : ''}
              </option>,
            )}
          </select>
        </label>
        <div className={styles.filterBar}>
          <label className={styles.archiveToggle}>
            <input type="checkbox" checked={includeArchivedProjects}
              onChange={(event) => {
                setIncludeArchivedProjects(event.target.checked)
                setProjectId('all')
                setPage(1)
              }} />
            Include archived projects
          </label>
          <button type="button" className={styles.resetButton} onClick={resetFilters}>Reset filters</button>
        </div>
      </div>
    </section>

    <section className={styles.register} aria-labelledby="meeting-register-title">
      <div className={styles.registerHeader}>
        <div>
          <span className={styles.eyebrow}>Meeting register</span>
          <h2 id="meeting-register-title">Portfolio meeting notes</h2>
        </div>
        <span className={styles.total}>{visibleMeetings.length} of {scopedCount} notes</span>
      </div>
      <div className={styles.registerToolbar}>
        <p className={styles.scopeNote}>
          {includeArchivedProjects ? 'Including active and archived projects.' : 'Showing active projects only.'}
        </p>
        <label className={styles.sortFilter}>
          <span>Sort by</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
            <option value={MEETING_SORT.NEWEST}>Newest meeting first</option>
            <option value={MEETING_SORT.OLDEST}>Oldest meeting first</option>
            <option value={MEETING_SORT.RECENTLY_UPDATED}>Recently updated</option>
          </select>
        </label>
      </div>

      {scopedCount === 0 ? <div className={styles.empty}>
        <strong>No portfolio meeting notes yet.</strong>
        <p>Meeting notes from the selected projects will appear here.</p>
        <Link to="/projects">Browse projects</Link>
      </div> : lifecycleCount === 0 ? <div className={styles.empty}>
        <strong>No {lifecycle} meeting notes in this scope.</strong>
        <p>Switch lifecycle views or choose a different project.</p>
        <button type="button" onClick={resetFilters}>Reset filters</button>
      </div> : visibleMeetings.length === 0 ? <div className={styles.empty}>
        <strong>No meeting notes match these filters.</strong>
        <p>Try a different title or project.</p>
        <button type="button" onClick={resetFilters}>Reset filters</button>
      </div> : <>
        <div className={styles.registerBody}>
          <div className={styles.columnHeader} aria-hidden="true">
            <span>Meeting</span><span>Project</span><span>Date</span><span>Status</span><span>Updated</span><span />
          </div>
          <ul className={styles.list} aria-label="Portfolio meeting notes">
            {shownMeetings.map((meeting) => {
              const project = projectById.get(meeting.projectId)
              return <li key={meeting.id} className={styles.row}>
                <div className={styles.meetingCell}>
                  <span className={styles.cellLabel}>Meeting</span>
                  <strong>{meeting.title}</strong>
                </div>
                <div className={styles.projectCell}>
                  <span className={styles.cellLabel}>Project</span>
                  <span>{project.name}{project.archivedAt ? ' (Archived project)' : ''}</span>
                </div>
                <div className={styles.dateCell}>
                  <span className={styles.cellLabel}>Date</span>
                  <time dateTime={meeting.meetingDate}>{formatDate(meeting.meetingDate)}</time>
                </div>
                <div className={styles.statusCell}>
                  <span className={styles.cellLabel}>Status</span>
                  <span className={styles.statusBadge} data-status={meeting.archivedAt ? 'archived' : 'current'}>
                    {meeting.archivedAt ? 'Archived' : 'Current'}
                  </span>
                </div>
                <div className={styles.updatedCell}>
                  <span className={styles.cellLabel}>Updated</span>
                  <span>{formatDate(meeting.updatedAt, true)}</span>
                </div>
                <div className={styles.openCell}>
                  <Link className={`${styles.openLink} ${styles.resetButton}`}
                    to={`/projects/${encodeURIComponent(meeting.projectId)}/meetings/${encodeURIComponent(meeting.id)}`}
                    aria-label={`Open meeting note: ${meeting.title}`}>
                    Open <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </li>
            })}
          </ul>
        </div>
        {totalPages > 1 ? <nav className={styles.pagination} aria-label="Meeting notes pagination">
          <span className={styles.paginationSummary}>
            Showing {(activePage - 1) * GLOBAL_MEETINGS_PAGE_SIZE + 1}–{Math.min(activePage * GLOBAL_MEETINGS_PAGE_SIZE, visibleMeetings.length)} of {visibleMeetings.length} notes
          </span>
          <div className={styles.paginationControls}>
            <button type="button" className={`${styles.resetButton} ${styles.pageButton}`}
              disabled={activePage === 1} onClick={() => setPage(activePage - 1)} aria-label="Previous page">‹</button>
            {pageNumbers.map((number) => <button type="button" key={number}
              className={`${styles.resetButton} ${styles.pageButton}`}
              aria-label={`Page ${number}`} aria-current={number === activePage ? 'page' : undefined}
              onClick={() => setPage(number)}>{number}</button>)}
            <button type="button" className={`${styles.resetButton} ${styles.pageButton}`}
              disabled={activePage === totalPages} onClick={() => setPage(activePage + 1)} aria-label="Next page">›</button>
          </div>
        </nav> : null}
      </>}
    </section>
  </section>
}
