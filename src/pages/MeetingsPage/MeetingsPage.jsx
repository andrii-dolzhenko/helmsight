import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  loadMeetings,
  selectMeetingsByProject,
  selectMeetingsError,
  selectMeetingsStatus,
} from '../../features/meetings/model/meetingsSlice.js'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import styles from './MeetingsPage.module.css'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

function formatTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

const MEETINGS_PAGE_SIZE = 10

function sortMeetingNotes(items, sortOrder) {
  return [...items].sort((left, right) => {
    const leftValue = sortOrder === 'updated' ? left.updatedAt ?? '' : left.meetingDate ?? ''
    const rightValue = sortOrder === 'updated' ? right.updatedAt ?? '' : right.meetingDate ?? ''
    const comparison = String(leftValue).localeCompare(String(rightValue))

    if (comparison !== 0) return sortOrder === 'oldest' ? comparison : -comparison
    return String(left.id).localeCompare(String(right.id))
  })
}

export function MeetingsPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppSelector(selectMeetingsStatus)
  const error = useAppSelector(selectMeetingsError)
  const meetings = useAppSelector((state) => selectMeetingsByProject(state, project.id))
  const [toast, setToast] = useState(location.state?.toast ?? null)
  const [activeView, setActiveView] = useState('current')
  const [sortOrder, setSortOrder] = useState('newest')
  const [page, setPage] = useState(1)
  const projectArchived = Boolean(project.archivedAt)

  useEffect(() => {
    if (status === 'idle') dispatch(loadMeetings())
  }, [dispatch, status])

  const summary = useMemo(() => {
    const participantNames = new Set(meetings.flatMap((meeting) => meeting.participants ?? []))
    return {
      total: meetings.length,
      decisions: meetings.reduce((sum, meeting) => sum + (meeting.decisions?.length ?? 0), 0),
      participants: participantNames.size,
    }
  }, [meetings])

  const currentMeetings = meetings.filter((meeting) => !meeting.archivedAt)
  const archivedMeetings = meetings.filter((meeting) => Boolean(meeting.archivedAt))
  const visibleMeetings = activeView === 'current' ? currentMeetings : archivedMeetings
  const sortedMeetings = sortMeetingNotes(visibleMeetings, sortOrder)
  const totalPages = Math.ceil(sortedMeetings.length / MEETINGS_PAGE_SIZE)

  const [previousTotalPages, setPreviousTotalPages] = useState(totalPages)

  if (previousTotalPages !== totalPages) {
    setPreviousTotalPages(totalPages)
    setPage((currentPage) => Math.min(currentPage, Math.max(1, totalPages)))
  }

  const activePage = Math.min(page, Math.max(1, totalPages))
  const pageMeetings = sortedMeetings.slice(
    (activePage - 1) * MEETINGS_PAGE_SIZE,
    activePage * MEETINGS_PAGE_SIZE,
  )
  const firstPageNumber = Math.min(Math.max(1, activePage - 2), Math.max(1, totalPages - 4))
  const pageNumbers = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => firstPageNumber + index,
  )

  const changeView = (nextView) => {
    setActiveView(nextView)
    setPage(1)
  }

  const handleViewTabKeyDown = (event) => {
    const key = event.key
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return

    event.preventDefault()
    const nextView = key === 'Home'
      ? 'current'
      : key === 'End'
        ? 'archived'
        : activeView === 'current' ? 'archived' : 'current'

    changeView(nextView)
    event.currentTarget.parentElement?.querySelector(`#${nextView}-meetings-tab`)?.focus()
  }

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading Meeting Notes…</div>
  }

  if (status === 'failed') {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Meeting Notes could not be loaded.</strong>
        <span>{error}</span>
        <button type="button" onClick={() => dispatch(loadMeetings())}>Try again</button>
      </div>
    )
  }

  return (
    <section className={styles.root}>
      <header className={styles.pageHeader} data-ui-page-header>
        <span className={styles.eyebrow}>Decision record</span>
        <div data-ui-page-title-row>
          <h2>Meeting Notes</h2>
          {!projectArchived ? (
            <Link className={`${styles.actionButton} ${styles.primaryAction}`} data-ui-button="primary" to="new">
              <PlusIcon /> New meeting note
            </Link>
          ) : null}
        </div>
        <p>Keep a durable project record of discussions, decisions, and follow-ups without turning meetings into a second task-management system.</p>
      </header>

      {projectArchived ? (
        <div className={styles.archiveBanner}>
          <div>
            <strong>Archived project</strong>
            <span>Meeting Notes are read-only until the project is restored.</span>
          </div>
        </div>
      ) : null}

      <div className={styles.summaryGrid} aria-label="Meeting Notes summary">
        <div><span>Meeting notes</span><strong>{summary.total}</strong></div>
        <div><span>Recorded decisions</span><strong>{summary.decisions}</strong></div>
        <div><span>Named participants</span><strong>{summary.participants}</strong></div>
      </div>

      <div className={styles.historyControls}>
        <div className={styles.viewTabs} role="tablist" aria-label="Meeting Notes lifecycle view">
          <button
            id="current-meetings-tab"
            type="button"
            role="tab"
            aria-selected={activeView === 'current'}
            aria-controls="meeting-history-panel"
            tabIndex={activeView === 'current' ? 0 : -1}
            className={activeView === 'current' ? styles.activeTab : undefined}
            onClick={() => changeView('current')}
            onKeyDown={handleViewTabKeyDown}
          >
            <span>Current</span>
            <strong>{currentMeetings.length}</strong>
          </button>
          <button
            id="archived-meetings-tab"
            type="button"
            role="tab"
            aria-selected={activeView === 'archived'}
            aria-controls="meeting-history-panel"
            tabIndex={activeView === 'archived' ? 0 : -1}
            className={activeView === 'archived' ? styles.activeTab : undefined}
            onClick={() => changeView('archived')}
            onKeyDown={handleViewTabKeyDown}
          >
            <span>Archived</span>
            <strong>{archivedMeetings.length}</strong>
          </button>
        </div>
      </div>

      <section
        id="meeting-history-panel"
        className={styles.listCard}
        role="tabpanel"
        aria-labelledby={activeView === 'current' ? 'current-meetings-tab' : 'archived-meetings-tab'}
        tabIndex={0}
      >
        <div className={styles.listHeader}>
          <div>
            <span className={styles.eyebrow}>Meeting history</span>
            <h3>{visibleMeetings.length
              ? 'Project meeting record'
              : activeView === 'archived'
                ? 'No archived Meeting Notes'
                : meetings.length
                  ? 'No current Meeting Notes'
                  : 'No Meeting Notes yet'}</h3>
          </div>
          <div className={styles.sortControls}>
            <label htmlFor="meeting-notes-sort">Sort by</label>
            <span className={styles.selectWrap}>
              <select
                id="meeting-notes-sort"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value)
                  setPage(1)
                }}
              >
                <option value="newest">Newest meeting</option>
                <option value="oldest">Oldest meeting</option>
                <option value="updated">Recently updated</option>
              </select>
              <svg className={styles.selectChevron} aria-hidden="true" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>

        {visibleMeetings.length ? (
          <div className={styles.meetingTable}>
            <div className={styles.tableHeader} aria-hidden="true">
              <span>Date</span><span>Meeting</span><span>Participants</span><span>Version</span><span>Updated</span><span />
            </div>
            <div className={styles.tableBody}>
              {pageMeetings.map((meeting) => (
                <Link className={styles.meetingRow} key={meeting.id} to={meeting.id}>
                  <span className={styles.dateCell}><span className={styles.mobileCellLabel}>Meeting date</span><span>{formatDate(meeting.meetingDate)}</span></span>
                  <span className={styles.titleCell}><strong>{meeting.title}</strong><small>{meeting.owner}</small></span>
                  <span className={styles.metaCell}><span className={styles.mobileCellLabel}>Participants</span><span>{meeting.participants?.length ?? 0}</span></span>
                  <span className={styles.metaCell}><span className={styles.mobileCellLabel}>Version</span><span>v{meeting.version ?? 1}</span></span>
                  <span className={styles.updatedCell}><span className={styles.mobileCellLabel}>Last updated</span><span>{formatTimestamp(meeting.updatedAt)}</span></span>
                  <span className={styles.viewCell}>View note <ArrowIcon /></span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>{activeView === 'archived' ? 'No archived meeting notes yet.' : 'No current meeting notes.'}</strong>
            <p>{activeView === 'archived'
              ? 'Archived Meeting Notes will appear here.'
              : meetings.length
                ? 'All Meeting Notes are archived. Restore a note to return it to Current.'
                : 'Create the first Meeting Note to capture discussion context, decisions, and follow-ups.'}</p>
            {activeView === 'current' && !projectArchived ? <Link className={`${styles.actionButton} ${styles.primaryAction}`} data-ui-button="primary" to="new"><PlusIcon /> New meeting note</Link> : null}
          </div>
        )}

        {totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Meeting Notes pagination">
            <span className={styles.paginationSummary}>
              Showing {(activePage - 1) * MEETINGS_PAGE_SIZE + 1}–{Math.min(activePage * MEETINGS_PAGE_SIZE, visibleMeetings.length)} of {visibleMeetings.length} notes
            </span>
            <div className={styles.paginationControls}>
              <button type="button" disabled={activePage === 1} onClick={() => setPage(Math.max(1, activePage - 1))}>
                Previous
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={pageNumber === activePage ? styles.currentPage : undefined}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={pageNumber === activePage ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" disabled={activePage === totalPages} onClick={() => setPage(Math.min(totalPages, activePage + 1))}>
                Next
              </button>
            </div>
          </nav>
        ) : null}
      </section>

      <StatusToast message={toast} onDismiss={() => { setToast(null); navigate(location.pathname, { replace: true, state: null }) }} />
    </section>
  )
}
