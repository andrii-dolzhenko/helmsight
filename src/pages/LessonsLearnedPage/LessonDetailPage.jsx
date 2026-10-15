import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router'
import { lessonsLearnedService } from '../../features/lessonsLearned/api/lessonsLearnedService.js'
import { getLessonCategoryLabel } from '../../features/lessonsLearned/lib/lessonsLearned.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import styles from './LessonsLearnedPage.module.css'

function formatTimestamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export function LessonDetailPage() {
  const { project } = useOutletContext()
  const { lessonId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [toast, setToast] = useState(location.state?.toast ?? null)
  const listPath = `/projects/${project.id}/lessons`
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadedKey, setLoadedKey] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    lessonsLearnedService.getById(project.id, lessonId).then((item) => {
      if (active) { setRecord(item); setLoadedKey(`${project.id}:${lessonId}`); setLoading(false) }
    }).catch((error) => {
      if (active) { setLoadError(error.message); setLoadedKey(`${project.id}:${lessonId}`); setLoading(false) }
    })
    return () => { active = false }
  }, [project.id, lessonId])

  const remove = async () => {
    if (project.archivedAt || deleting) return
    setDeleting(true)
    try {
      await lessonsLearnedService.remove(project.id, lessonId)
      navigate(listPath, { replace: true, state: { toast: 'Lesson deleted.' } })
    } catch (error) {
      setMutationError(error.message)
      setConfirmDelete(false)
      setDeleting(false)
    }
  }

  if (loading || loadedKey !== `${project.id}:${lessonId}`) return <div className={styles.stateCard} role="status">Loading lesson…</div>
  if (loadError) return <div className={styles.stateCard} role="alert"><strong>Lesson could not be loaded.</strong><p>{loadError}</p><Link to={listPath}>Return to Lessons Learned</Link></div>
  if (!record) return <div className={styles.stateCard}><strong>Lesson not found.</strong><p>The requested lesson is not available in this project.</p><Link to={listPath}>Return to Lessons Learned</Link></div>

  return (
    <section className={styles.root}>
      <Link to={listPath} className={styles.backLink}>← Lessons Learned</Link>
      {project.archivedAt ? <div className={styles.archiveNotice} role="status"><strong>Archived project</strong><span>This lesson is read-only until the project is restored.</span></div> : null}
      <StatusToast message={toast} onDismiss={() => { setToast(null); navigate(location.pathname, { replace: true, state: null }) }} />
      {mutationError ? <p className={styles.errorNotice} role="alert">{mutationError}</p> : null}
      <article className={styles.document}>
        <header className={styles.documentHeader}>
          <span className={styles.eyebrow}>Lessons Learned · {getLessonCategoryLabel(record.category)}</span>
          <h2>{record.title}</h2>
          <div className={styles.documentDates}><span>Created {formatTimestamp(record.createdAt)}</span><span>Updated {formatTimestamp(record.updatedAt)}</span></div>
        </header>
        {!project.archivedAt ? <div className={styles.documentActions} data-print-hide="true"><Link to="edit" className={styles.primaryButton} data-ui-button="primary">Edit lesson</Link><button type="button" className={styles.dangerButton} onClick={() => setConfirmDelete(true)}>Delete lesson</button></div> : null}
        <div className={styles.sections}>
          <section><span className={styles.sectionIndex}>01 / CONTEXT</span><h3>Situation</h3><p>{record.situation}</p></section>
          <section><span className={styles.sectionIndex}>02 / INSIGHT</span><h3>Lesson</h3><p>{record.lesson}</p></section>
          <section><span className={styles.sectionIndex}>03 / NEXT TIME</span><h3>Recommendation</h3><p>{record.recommendation}</p></section>
        </div>
      </article>
      <ConfirmDialog isOpen={confirmDelete} eyebrow="Lessons Learned" title="Delete lesson?" message={`Delete “${record.title}”? This cannot be undone.`} confirmLabel={deleting ? 'Deleting…' : 'Delete lesson'} icon="trash" isPending={deleting} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </section>
  )
}
