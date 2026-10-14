import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { MeetingNoteForm } from '../../features/meetings/ui/MeetingNoteForm.jsx'
import {
  createMeetingNote,
  loadMeetings,
  selectMeetingById,
  selectMeetingMutationError,
  selectMeetingsError,
  selectMeetingsStatus,
  updateMeetingNote,
} from '../../features/meetings/model/meetingsSlice.js'
import { MeetingNoteHelp } from './MeetingNoteHelp.jsx'
import styles from './MeetingsPage.module.css'

export function MeetingNoteEditorPage() {
  const { project } = useOutletContext()
  const { meetingId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectMeetingsStatus)
  const error = useAppSelector(selectMeetingsError)
  const mutationError = useAppSelector(selectMeetingMutationError)
  const meeting = useAppSelector((state) => meetingId ? selectMeetingById(state, meetingId) : null)
  const isEditing = Boolean(meetingId)
  const listPath = `/projects/${project.id}/meetings`

  useEffect(() => {
    if (status === 'idle') dispatch(loadMeetings())
  }, [dispatch, status])

  if (project.archivedAt) {
    return (
      <div className={styles.stateCard}>
        <strong>Archived projects are read-only.</strong>
        <span>Restore the project before creating or editing Meeting Notes.</span>
      </div>
    )
  }

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading Meeting Note…</div>
  }

  if (status === 'failed') {
    return <div className={styles.stateCard} role="alert"><strong>Meeting Notes could not be loaded.</strong><span>{error}</span></div>
  }

  if (isEditing && !meeting) {
    return <div className={styles.stateCard}><strong>Meeting Note not found.</strong><span>The requested note is not available for this project.</span></div>
  }

  if (meeting && meeting.projectId !== project.id) {
    return <div className={styles.stateCard}><strong>Meeting Note not found.</strong><span>The requested note is not available for this project.</span></div>
  }

  if (isEditing && meeting?.archivedAt) {
    return (
      <div className={styles.stateCard}>
        <strong>Archived Meeting Notes are read-only.</strong>
        <span>Restore this note before editing its content.</span>
        <Link to={`${listPath}/${meeting.id}`}>View archived note</Link>
      </div>
    )
  }

  const handleSubmit = async (values) => {
    try {
      const saved = isEditing
        ? await dispatch(updateMeetingNote({ meetingId, input: { ...values, projectId: project.id } })).unwrap()
        : await dispatch(createMeetingNote({ ...values, projectId: project.id })).unwrap()
      navigate(`${listPath}/${saved.id}`, {
        replace: true,
        state: { toast: isEditing ? `Meeting Note saved · Version ${saved.version}` : 'Meeting Note created.' },
      })
      return true
    } catch {
      return false
    }
  }

  const owner = project.governance?.charter?.projectManager ?? project.governance?.charter?.projectOwner ?? ''

  return (
    <section className={styles.root}>
      <header className={styles.editorHeader}>
        <div>
          <span className={styles.eyebrow}>{isEditing ? 'Edit meeting record' : 'New meeting record'}</span>
          <h2>{isEditing ? meeting.title : 'New Meeting Note'}</h2>
          <p>Capture context, decisions, and follow-ups in a structured record that remains easy to review and print.</p>
        </div>
        <MeetingNoteHelp />
      </header>

      <MeetingNoteForm
        key={`${project.id}:${meetingId ?? 'new'}`}
        meeting={meeting}
        draftKey={`meeting-note:${project.id}:${meetingId ?? 'new'}`}
        submitLabel={isEditing ? 'Save note' : 'Create note'}
        cancelTo={isEditing ? `${listPath}/${meeting.id}` : listPath}
        submitError={mutationError}
        defaultOwner={owner}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
