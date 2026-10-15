import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { LessonForm } from '../../features/lessonsLearned/ui/LessonForm.jsx'
import { lessonsLearnedService } from '../../features/lessonsLearned/api/lessonsLearnedService.js'
import styles from './LessonsLearnedPage.module.css'

export function LessonEditorPage() {
  const { project } = useOutletContext()
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(lessonId)
  const listPath = `/projects/${project.id}/lessons`
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(editing)
  const [loadedKey, setLoadedKey] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!editing || project.archivedAt) return undefined
    let active = true
    lessonsLearnedService.getById(project.id, lessonId).then((item) => {
      if (active) { setRecord(item); setLoadedKey(`${project.id}:${lessonId}`); setLoading(false) }
    }).catch((error) => {
      if (active) { setLoadError(error.message); setLoadedKey(`${project.id}:${lessonId}`); setLoading(false) }
    })
    return () => { active = false }
  }, [editing, lessonId, project.id, project.archivedAt])

  if (project.archivedAt) return <div className={styles.stateCard}><strong>Archived project</strong><p>Restore this project before changing Lessons Learned.</p><Link to={listPath}>Return to Lessons Learned</Link></div>
  if (editing && (loading || loadedKey !== `${project.id}:${lessonId}`)) return <div className={styles.stateCard} role="status">Loading lesson…</div>
  if (loadError) return <div className={styles.stateCard} role="alert"><strong>Lesson could not be loaded.</strong><p>{loadError}</p><Link to={listPath}>Return to Lessons Learned</Link></div>
  if (editing && !record) return <div className={styles.stateCard}><strong>Lesson not found.</strong><p>The requested lesson is not available in this project.</p><Link to={listPath}>Return to Lessons Learned</Link></div>

  const save = async (values) => {
    setSubmitError('')
    try {
      return editing
        ? await lessonsLearnedService.update(project.id, lessonId, values)
        : await lessonsLearnedService.create(project.id, values)
    } catch (error) {
      setSubmitError(error.message)
      return null
    }
  }

  return (
    <section className={styles.root}>
      <Link className={styles.backLink} to={editing ? `${listPath}/${lessonId}` : listPath}>← {editing ? 'Back to lesson' : 'Lessons Learned'}</Link>
      <header className={styles.header} data-ui-page-header><span className={styles.eyebrow}>Knowledge retention</span><h2>{editing ? 'Edit lesson' : 'New lesson'}</h2><p>Turn practical project experience into guidance the team can reuse.</p></header>
      <LessonForm key={`${project.id}:${lessonId ?? 'new'}`} lesson={editing ? record : null} draftKey={`lesson-learned:${project.id}:${lessonId ?? 'new'}`} cancelTo={editing ? `${listPath}/${lessonId}` : listPath} submitLabel={editing ? 'Save lesson' : 'Create lesson'} submitError={submitError} onSubmit={save} onSaved={(saved) => navigate(`${listPath}/${saved.id}`, { replace: true, state: { toast: editing ? 'Lesson updated.' : 'Lesson created.' } })} />
    </section>
  )
}
