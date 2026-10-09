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

export function MeetingsPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppSelector(selectMeetingsStatus)
  const error = useAppSelector(selectMeetingsError)
  const meetings = useAppSelector((state) => selectMeetingsByProject(state, project.id))
  const [toast, setToast] = useState(location.state?.toast ?? null)
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

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <div>
            <span className={styles.eyebrow}>Meeting history</span>
            <h3>{meetings.length ? 'Project meeting record' : 'No Meeting Notes yet'}</h3>
          </div>
          {meetings.length ? <span className={styles.historyCount}>{meetings.length} notes</span> : null}
        </div>

        {meetings.length ? (
          <div className={styles.meetingTable}>
            <div className={styles.tableHeader} aria-hidden="true">
              <span>Date</span><span>Meeting</span><span>Participants</span><span>Version</span><span>Updated</span><span />
            </div>
            <div className={styles.tableBody}>
              {meetings.map((meeting) => (
                <Link className={styles.meetingRow} key={meeting.id} to={meeting.id}>
                  <span className={styles.dateCell}>{formatDate(meeting.meetingDate)}</span>
                  <span className={styles.titleCell}><strong>{meeting.title}</strong><small>{meeting.owner}</small></span>
                  <span className={styles.metaCell}>{meeting.participants?.length ?? 0}</span>
                  <span className={styles.metaCell}>v{meeting.version ?? 1}</span>
                  <span className={styles.updatedCell}>{formatTimestamp(meeting.updatedAt)}</span>
                  <span className={styles.viewCell}>View note <ArrowIcon /></span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No meetings recorded yet.</strong>
            <p>Create the first Meeting Note to capture discussion context, decisions, and follow-ups.</p>
            {!projectArchived ? <Link className={`${styles.actionButton} ${styles.primaryAction}`} data-ui-button="primary" to="new"><PlusIcon /> New meeting note</Link> : null}
          </div>
        )}
      </section>

      <StatusToast message={toast} onDismiss={() => { setToast(null); navigate(location.pathname, { replace: true, state: null }) }} />
    </section>
  )
}
