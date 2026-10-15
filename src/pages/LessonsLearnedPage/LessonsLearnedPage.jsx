import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router'
import { LESSON_CATEGORIES, lessonsLearnedService } from '../../features/lessonsLearned/api/lessonsLearnedService.js'
import { filterSortLessons, getLessonCategoryLabel } from '../../features/lessonsLearned/lib/lessonsLearned.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import styles from './LessonsLearnedPage.module.css'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date)
}

export function LessonsLearnedPage() {
  const { project } = useOutletContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [toast, setToast] = useState(location.state?.toast ?? null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadedProjectId, setLoadedProjectId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [retry, setRetry] = useState(0)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let active = true
    lessonsLearnedService.list(project.id).then((lessons) => {
      if (active) { setItems(lessons); setLoadError(''); setLoadedProjectId(project.id); setLoading(false) }
    }).catch((error) => {
      if (active) { setLoadError(error.message); setLoadedProjectId(project.id); setLoading(false) }
    })
    return () => { active = false }
  }, [project.id, retry])

  const isLoading = loading || loadedProjectId !== project.id
  const visible = useMemo(() => filterSortLessons(items, { query, category, sort }), [items, query, category, sort])
  const hasContentFilters = Boolean(query.trim()) || category !== 'all'
  const clearFilters = () => { setQuery(''); setCategory('all'); setSort('newest') }

  const removeLesson = async () => {
    if (!pendingDelete || deleting || project.archivedAt) return
    setDeleting(true)
    setMutationError('')
    try {
      await lessonsLearnedService.remove(project.id, pendingDelete.id)
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
      setToast('Lesson deleted.')
    } catch (error) {
      setMutationError(error.message)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className={styles.root}>
      <header className={styles.header} data-ui-page-header>
        <span className={styles.eyebrow}>Knowledge retention</span>
        <div className={styles.titleRow} data-ui-page-title-row>
          <h2>Lessons Learned</h2>
          {!project.archivedAt ? <Link to="new" className={styles.primaryButton} data-ui-button="primary">+ New lesson</Link> : null}
        </div>
        <p>Capture what happened, what the team learned, and what should change in future delivery.</p>
      </header>

      {project.archivedAt ? <div className={styles.archiveNotice} role="status"><strong>Archived project</strong><span>Lessons remain available to read. Restore the project to make changes.</span></div> : null}
      <StatusToast message={toast} onDismiss={() => { setToast(null); navigate(location.pathname, { replace: true, state: null }) }} />
      {mutationError ? <p className={styles.errorNotice} role="alert">{mutationError}</p> : null}

      <section className={styles.panel} aria-labelledby="lessons-register-title">
        <div className={styles.panelHeading}>
          <div><span className={styles.eyebrow}>Project knowledge</span><h3 id="lessons-register-title">Lessons register</h3></div>
          {!isLoading && !loadError ? <span className={styles.count}>{items.length} total</span> : null}
        </div>

        <div className={styles.filters} role="group" aria-label="Filter Lessons Learned">
          <label className={styles.field}><span>Search lessons</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons and recommendations" /></label>
          <label className={styles.field}><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{LESSON_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className={styles.field}><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option><option value="title">Title A–Z</option></select></label>
          <button type="button" className={styles.resetButton} onClick={clearFilters}>Reset filters</button>
        </div>

        {isLoading ? <p className={styles.stateCard} role="status">Loading lessons…</p> : loadError ? (
          <div className={styles.stateCard} role="alert"><strong>Lessons could not be loaded.</strong><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setLoadError(''); setRetry((current) => current + 1) }}>Try again</button></div>
        ) : visible.length ? (
          <div className={styles.list} aria-label="Lessons Learned records">
            {visible.map((item) => (
              <article key={item.id} className={styles.lessonCard}>
                <div className={styles.cardTop}><span className={styles.categoryBadge}>{getLessonCategoryLabel(item.category)}</span><span className={styles.timestamp}>Updated {formatDate(item.updatedAt)}</span></div>
                <h4><Link to={item.id}>{item.title}</Link></h4>
                <p className={styles.preview}>{item.lesson}</p>
                <div className={styles.cardBottom}><span>Recorded {formatDate(item.createdAt)}</span><div className={styles.cardActions}><Link className={styles.secondaryButton} to={item.id}>View lesson</Link>{!project.archivedAt ? <><Link className={styles.secondaryButton} to={`${item.id}/edit`}>Edit</Link><button className={styles.dangerButton} type="button" onClick={() => setPendingDelete(item)}>Delete</button></> : null}</div></div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.stateCard}>
            <strong>{hasContentFilters ? 'No lessons match your filters.' : 'No lessons recorded yet.'}</strong>
            <p>{hasContentFilters ? 'Try a different phrase or category.' : 'Save practical takeaways so the team can apply them on future work.'}</p>
            {!hasContentFilters && !project.archivedAt ? <Link to="new">Create first lesson</Link> : null}
          </div>
        )}
        {!isLoading && !loadError && items.length ? <p className={styles.resultCount} role="status">Showing {visible.length} of {items.length} lessons</p> : null}
      </section>

      <ConfirmDialog isOpen={Boolean(pendingDelete)} eyebrow="Lessons Learned" title="Delete lesson?" message={pendingDelete ? `Delete “${pendingDelete.title}”? This cannot be undone.` : ''} confirmLabel={deleting ? 'Deleting…' : 'Delete lesson'} icon="trash" isPending={deleting} onConfirm={removeLesson} onCancel={() => setPendingDelete(null)} />
    </section>
  )
}
