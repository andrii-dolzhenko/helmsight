import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  archiveMeetingNote,
  deleteMeetingNote,
  loadMeetings,
  restoreMeetingNote,
  selectMeetingById,
  selectMeetingMutationError,
  selectMeetingMutationStatus,
  selectMeetingsError,
  selectMeetingsStatus,
} from '../../features/meetings/model/meetingsSlice.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import styles from './MeetingsPage.module.css'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(date)
}

function formatTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function PrintIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v6H7z" /></svg>
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 9.8-9.8-3.5-3.5L5 15.5 4 20Z" /><path d="m13.8 6.7 3.5 3.5" /></svg>
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
}

function RecordList({ items, empty }) {
  if (!items?.length) return <p className={styles.emptyCopy}>{empty}</p>
  return <ul className={styles.recordList}>{items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}</ul>
}

export function MeetingNoteDetailPage() {
  const { project } = useOutletContext()
  const { meetingId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppSelector(selectMeetingsStatus)
  const error = useAppSelector(selectMeetingsError)
  const meeting = useAppSelector((state) => selectMeetingById(state, meetingId))
  const mutationStatus = useAppSelector(selectMeetingMutationStatus)
  const mutationError = useAppSelector(selectMeetingMutationError)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [toast, setToast] = useState(location.state?.toast ?? null)
  const listPath = `/projects/${project.id}/meetings`
  const projectArchived = Boolean(project.archivedAt)
  const noteArchived = Boolean(meeting?.archivedAt)
  const canMutate = !projectArchived && !noteArchived

  useEffect(() => {
    if (status === 'idle') dispatch(loadMeetings())
  }, [dispatch, status])

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading Meeting Note…</div>
  if (status === 'failed') return <div className={styles.stateCard} role="alert"><strong>Meeting Note could not be loaded.</strong><span>{error}</span></div>
  if (!meeting || meeting.projectId !== project.id) return <div className={styles.stateCard}><strong>Meeting Note not found.</strong><span>The requested note is not available for this project.</span><Link to={listPath}>Return to Meeting Notes</Link></div>

  const handleArchive = async () => {
    if (!canMutate || mutationStatus === 'loading') return

    try {
      await dispatch(archiveMeetingNote(meeting.id)).unwrap()
      setConfirmArchive(false)
      setToast('Meeting Note archived.')
    } catch {
      setConfirmArchive(false)
    }
  }

  const handleRestore = async () => {
    if (projectArchived || !noteArchived || mutationStatus === 'loading') return

    try {
      await dispatch(restoreMeetingNote(meeting.id)).unwrap()
      setToast('Meeting Note restored.')
    } catch {
      // The existing mutation error alert displays the failure.
    }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteMeetingNote(meeting.id)).unwrap()
      navigate(listPath, { replace: true, state: { toast: 'Meeting Note deleted.' } })
    } catch {
      setConfirmDelete(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.detailTopline} data-print-hide="true">
        <Link className={styles.backLink} to={listPath}>← Meeting Notes</Link>
      </div>

      {projectArchived ? (
        <div className={styles.archiveBanner} data-print-hide="true">
          <div><strong>Archived project</strong><span>This Meeting Note is read-only until the project is restored.</span></div>
        </div>
      ) : null}

      {noteArchived ? (
        <div className={styles.archiveBanner} data-print-hide="true">
          <div>
            <strong>Archived meeting note</strong>
            <span>This Meeting Note is read-only until restored.</span>
          </div>
        </div>
      ) : null}

      <article className={styles.noteDocument}>
        <div className={styles.printMasthead}><span>HelmSight</span><strong>Meeting Note</strong></div>

        <header className={styles.noteHeader}>
          <div>
            <span className={styles.eyebrow}>Meeting record</span>
            <h2>{meeting.title}</h2>
            <p>{formatDate(meeting.meetingDate)} · Owner {meeting.owner}</p>
          </div>
          <div className={styles.documentMeta}>
            <strong>Version {meeting.version ?? 1}</strong>
            <span>Updated {formatTimestamp(meeting.updatedAt)}</span>
          </div>
        </header>

        <div className={styles.detailActions} data-print-hide="true">
          <button className={styles.actionButton} data-ui-button="secondary" type="button" onClick={() => window.print()}><PrintIcon /> Print note</button>
          {canMutate ? <Link className={`${styles.actionButton} ${styles.primaryAction}`} data-ui-button="primary" to="edit"><EditIcon /> Edit note</Link> : null}
          {canMutate ? (
            <button className={styles.actionButton} data-ui-button="secondary" type="button" disabled={mutationStatus === 'loading'} onClick={() => setConfirmArchive(true)}>
              Archive note
            </button>
          ) : null}
          {!projectArchived && noteArchived ? (
            <button className={`${styles.actionButton} ${styles.primaryAction}`} data-ui-button="primary" type="button" disabled={mutationStatus === 'loading'} onClick={handleRestore}>
              {mutationStatus === 'loading' ? 'Restoring…' : 'Restore note'}
            </button>
          ) : null}
          {canMutate ? <button className={`${styles.actionButton} ${styles.deleteAction}`} data-ui-button="danger" type="button" disabled={mutationStatus === 'loading'} onClick={() => setConfirmDelete(true)}><TrashIcon /> Delete</button> : null}
        </div>

        <div className={styles.noteSection}>
          <div className={styles.sectionTitle}><span>Participants</span><strong>{meeting.participants?.length ?? 0}</strong></div>
          {meeting.participants?.length ? (
            <div className={styles.participantGrid}>{meeting.participants.map((participant) => <span key={participant}>{participant}</span>)}</div>
          ) : <p className={styles.emptyCopy}>No participants recorded.</p>}
        </div>

        <div className={styles.noteSection}>
          <div className={styles.sectionTitle}><span>Notes</span></div>
          <p className={styles.notesCopy}>{meeting.notes}</p>
        </div>

        <div className={styles.twoColumnSections}>
          <div className={styles.noteSection}>
            <div className={styles.sectionTitle}><span>Decisions</span><strong>{meeting.decisions?.length ?? 0}</strong></div>
            <RecordList items={meeting.decisions} empty="No decisions recorded." />
          </div>

          <div className={styles.noteSection}>
            <div className={styles.sectionTitle}><span>Follow-ups</span><strong>{meeting.followUps?.length ?? 0}</strong></div>
            <RecordList items={meeting.followUps} empty="No follow-ups recorded." />
          </div>
        </div>

        <footer className={styles.documentControl}>
          <span>Version {meeting.version ?? 1}</span>
          <span>Created {formatTimestamp(meeting.createdAt)}</span>
          <span>Updated {formatTimestamp(meeting.updatedAt)}</span>
          <span>Owner {meeting.owner}</span>
        </footer>
      </article>

      {mutationStatus === 'failed' && mutationError ? <div className={styles.mutationError} role="alert" data-print-hide="true">{mutationError}</div> : null}

      <ConfirmDialog
        isOpen={confirmArchive}
        eyebrow="Meeting Note"
        title="Archive meeting note?"
        message={`Archive “${meeting.title}”? The note will become read-only and can be restored later.`}
        confirmLabel={mutationStatus === 'loading' ? 'Archiving…' : 'Archive note'}
        cancelLabel="Cancel"
        confirmTone="primary"
        icon="archive"
        isPending={mutationStatus === 'loading'}
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        eyebrow="Meeting Note"
        title="Delete meeting note?"
        message={`Delete “${meeting.title}”? This action cannot be undone.`}
        confirmLabel={mutationStatus === 'loading' ? 'Deleting…' : 'Delete note'}
        icon="trash"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <StatusToast message={toast} onDismiss={() => { setToast(null); navigate(location.pathname, { replace: true, state: null }) }} />
    </div>
  )
}
