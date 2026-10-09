import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  deleteMilestone,
  loadMilestones,
  selectMilestoneMutationError,
  selectMilestoneMutationStatus,
  selectMilestonesByProject,
  selectMilestonesError,
  selectMilestonesStatus,
} from '../../features/milestones/model/milestonesSlice.js'
import {
  getMilestoneScheduleLabel,
  getMilestoneScheduleState,
  getMilestoneStatusLabel,
  MILESTONE_SCHEDULE_STATE,
  sortMilestonesByTargetDate,
} from '../../features/milestones/lib/milestones.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { useHashTarget } from '../../shared/hooks/useHashTarget.js'
import styles from './MilestonesPage.module.css'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function MilestoneCard({ milestone, archived, onDelete }) {
  const scheduleState = getMilestoneScheduleState(milestone)

  return (
    <article className={styles.card} id={`milestone-${milestone.id}`} tabIndex={-1}>
      <div className={styles.cardHeader}>
        <div className={styles.badges}>
          <span className={styles.statusBadge}>{getMilestoneStatusLabel(milestone.status)}</span>
          <span className={`${styles.scheduleBadge} ${styles[scheduleState] ?? ''}`}>{getMilestoneScheduleLabel(scheduleState)}</span>
        </div>
        <span className={styles.dateBadge}>{formatDate(milestone.targetDate)}</span>
      </div>

      <div className={styles.identity}>
        <h4>{milestone.title}</h4>
        <p>{milestone.description || 'No additional description.'}</p>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressHeader}>
          <span>Progress</span>
          <strong>{milestone.progress}%</strong>
        </div>
        <div className={styles.progressTrack} aria-label={`${milestone.progress}% complete`}>
          <span style={{ width: `${milestone.progress}%` }} />
        </div>
      </div>

      <dl className={styles.metaStrip}>
        <div><dt>Target</dt><dd>{formatDate(milestone.targetDate)}</dd></div>
        <div><dt>Status</dt><dd>{getMilestoneStatusLabel(milestone.status)}</dd></div>
        <div><dt>Attention</dt><dd className={styles[scheduleState] ?? ''}>{getMilestoneScheduleLabel(scheduleState)}</dd></div>
      </dl>

      {!archived ? (
        <div className={styles.actions}>
          <Link className={styles.editButton} data-ui-button="secondary" data-ui-size="sm" to={`${milestone.id}/edit`}>Edit</Link>
          <button className={styles.deleteButton} data-ui-button="danger" data-ui-size="sm" type="button" onClick={() => onDelete(milestone)}>Delete</button>
        </div>
      ) : null}
    </article>
  )
}

export function MilestonesPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectMilestonesStatus)
  const error = useAppSelector(selectMilestonesError)
  const mutationStatus = useAppSelector(selectMilestoneMutationStatus)
  const mutationError = useAppSelector(selectMilestoneMutationError)
  const milestones = useAppSelector((state) => selectMilestonesByProject(state, project.id))
  const [pendingDelete, setPendingDelete] = useState(null)

  useHashTarget(status)

  useEffect(() => {
    if (status === 'idle') dispatch(loadMilestones())
  }, [dispatch, status])

  const orderedMilestones = useMemo(() => sortMilestonesByTargetDate(milestones), [milestones])
  const summary = useMemo(() => {
    const states = milestones.map((milestone) => getMilestoneScheduleState(milestone))
    return {
      total: milestones.length,
      completed: milestones.filter((milestone) => milestone.status === 'completed').length,
      inProgress: milestones.filter((milestone) => milestone.status === 'inProgress').length,
      attention: states.filter((state) => [MILESTONE_SCHEDULE_STATE.DUE_SOON, MILESTONE_SCHEDULE_STATE.OVERDUE].includes(state)).length,
    }
  }, [milestones])

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await dispatch(deleteMilestone(pendingDelete.id)).unwrap()
      setPendingDelete(null)
    } catch {
      // Redux exposes the mutation error below.
    }
  }

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading milestones…</div>
  if (status === 'failed') return <div className={styles.stateCard} role="alert"><strong>Milestones could not be loaded.</strong><span>{error}</span><button type="button" onClick={() => dispatch(loadMilestones())}>Try again</button></div>

  return (
    <section className={styles.root}>
      <header className={styles.header} data-ui-page-header>
        <span className={styles.eyebrow}>Delivery roadmap</span>
        <div className={styles.titleRow} data-ui-page-title-row>
          <h2>Milestones</h2>
          {!project.archivedAt ? <Link className={styles.primaryButton} data-ui-button="primary" to="new">New milestone</Link> : null}
        </div>
        <p>Track outcome-oriented checkpoints, target dates, and progress without turning HelmSight into a task board or full Gantt scheduler.</p>
      </header>

      {project.archivedAt ? <div className={styles.archiveBanner}><strong>Archived project</strong><span>Milestones remain available for review. Restore the project to edit them.</span></div> : null}

      <div className={styles.summary} aria-label="Milestone summary">
        <div><span>Total milestones</span><strong>{summary.total}</strong></div>
        <div><span>Completed</span><strong>{summary.completed}</strong></div>
        <div><span>In progress</span><strong>{summary.inProgress}</strong></div>
        <div><span>Needs attention</span><strong>{summary.attention}</strong></div>
      </div>

      {orderedMilestones.length > 0 ? (
        <section className={styles.roadmapSection} aria-labelledby="milestone-roadmap-title">
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Roadmap</span>
            <h3 id="milestone-roadmap-title">Upcoming checkpoints</h3>
            <p>Ordered by target date. This is a management roadmap, not a dependency-based Gantt chart.</p>
          </div>
          <ol
            className={`${styles.roadmap} ${orderedMilestones.length === 1 ? styles.roadmapSingle : ''}`}
            style={{
              '--roadmap-count': orderedMilestones.length,
              '--roadmap-item-width': `${100 / Math.max(1, orderedMilestones.length - 1)}%`,
              '--roadmap-edge-width': `${50 / Math.max(1, orderedMilestones.length - 1)}%`,
            }}
          >
            {orderedMilestones.map((milestone, index) => {
              const scheduleState = getMilestoneScheduleState(milestone)
              const position = orderedMilestones.length > 1
                ? (index / (orderedMilestones.length - 1)) * 100
                : 0

              return (
                <li
                  key={milestone.id}
                  className={styles.roadmapItem}
                  style={{ '--roadmap-position': `${position}%` }}
                >
                  <span className={`${styles.roadmapDot} ${styles[scheduleState] ?? ''}`} aria-hidden="true" />
                  <div>
                    <time dateTime={milestone.targetDate}>{formatDate(milestone.targetDate)}</time>
                    <strong>{milestone.title}</strong>
                    <span>{milestone.progress}% · {getMilestoneScheduleLabel(scheduleState)}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      <div className={styles.registerHeading}>
        <div><span className={styles.eyebrow}>Milestone register</span><h3>Delivery checkpoints</h3></div>
        <span>{milestones.length} total</span>
      </div>

      {milestones.length === 0 ? (
        <div className={styles.emptyState}><strong>No milestones yet.</strong><p>Create the first outcome-oriented checkpoint for this project.</p>{!project.archivedAt ? <Link to="new">Create first milestone</Link> : null}</div>
      ) : (
        <div className={styles.grid}>
          {orderedMilestones.map((milestone) => <MilestoneCard key={milestone.id} milestone={milestone} archived={Boolean(project.archivedAt)} onDelete={setPendingDelete} />)}
        </div>
      )}

      {mutationError ? <div className={styles.mutationError} role="alert">{mutationError}</div> : null}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        eyebrow="Milestones"
        title="Delete milestone?"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed from this local project roadmap.` : ''}
        confirmLabel={mutationStatus === 'loading' ? 'Deleting…' : 'Delete milestone'}
        cancelLabel="Keep milestone"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}
