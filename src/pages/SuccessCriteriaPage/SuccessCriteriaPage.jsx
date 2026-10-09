import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  deleteSuccessCriterion,
  loadSuccessCriteria,
  selectSuccessCriteriaByProject,
  selectSuccessCriteriaError,
  selectSuccessCriteriaStatus,
  selectSuccessCriterionMutationError,
  selectSuccessCriterionMutationStatus,
} from '../../features/successCriteria/model/successCriteriaSlice.js'
import {
  evaluateSuccessCriterion,
  formatCriterionValue,
  getSuccessCriterionCategoryLabel,
  getSuccessCriterionMetricTypeLabel,
  getSuccessCriterionStatusLabel,
  SUCCESS_CRITERIA_STATUS,
} from '../../features/successCriteria/lib/successCriteria.js'
import { useHashTarget } from '../../shared/hooks/useHashTarget.js'
import styles from './SuccessCriteriaPage.module.css'

const STATUS_ORDER = [
  SUCCESS_CRITERIA_STATUS.ON_TRACK,
  SUCCESS_CRITERIA_STATUS.AT_RISK,
  SUCCESS_CRITERIA_STATUS.ACHIEVED,
  SUCCESS_CRITERIA_STATUS.MISSED,
]

function formatTargetDate(value) {
  return formatCriterionValue(value, 'date')
}

export function SuccessCriteriaPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectSuccessCriteriaStatus)
  const error = useAppSelector(selectSuccessCriteriaError)
  const mutationStatus = useAppSelector(selectSuccessCriterionMutationStatus)
  const mutationError = useAppSelector(selectSuccessCriterionMutationError)
  const criteria = useAppSelector((state) =>
    selectSuccessCriteriaByProject(state, project.id),
  )
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useHashTarget(status)

  useEffect(() => {
    if (status === 'idle') {
      dispatch(loadSuccessCriteria())
    }
  }, [dispatch, status])

  const criteriaWithStatus = useMemo(
    () =>
      criteria.map((criterion) => ({
        ...criterion,
        derivedStatus: evaluateSuccessCriterion(criterion),
      })),
    [criteria],
  )

  const summary = useMemo(
    () =>
      STATUS_ORDER.map((statusKey) => ({
        status: statusKey,
        label: getSuccessCriterionStatusLabel(statusKey),
        count: criteriaWithStatus.filter(
          (criterion) => criterion.derivedStatus === statusKey,
        ).length,
      })),
    [criteriaWithStatus],
  )

  const handleDelete = async (criterionId) => {
    try {
      await dispatch(deleteSuccessCriterion(criterionId)).unwrap()
      setPendingDeleteId(null)
    } catch {
      // Redux exposes the user-facing error state.
    }
  }

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading success criteria…</div>
  }

  if (status === 'failed') {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Success criteria could not be loaded.</strong>
        <span>{error}</span>
        <button type="button" onClick={() => dispatch(loadSuccessCriteria())}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <section className={styles.root}>
      <header className={styles.header} data-ui-page-header>
        <span className={styles.eyebrow}>Benefits realization</span>
        <div className={styles.titleRow} data-ui-page-title-row>
          <h2>Success Criteria</h2>
          {!project.archivedAt ? (
            <Link className={styles.primaryButton} data-ui-button="primary" to="new">
              New criterion
            </Link>
          ) : null}
        </div>
        <p>
          Define measurable outcomes and let deterministic rules surface whether each target is on track, at risk, achieved, or missed.
        </p>
      </header>

      {project.archivedAt ? (
        <div className={styles.archiveBanner}>
          <strong>Archived project</strong>
          <span>Success Criteria remain available for review. Restore the project to edit them.</span>
        </div>
      ) : null}

      <div className={styles.summary} aria-label="Success Criteria status summary">
        {summary.map((item) => (
          <div key={item.status}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>

      {criteriaWithStatus.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.eyebrow}>No success criteria</span>
          <h3>Define what success means before measuring delivery.</h3>
          <p>
            Start with one measurable business or delivery outcome. Manual metrics and project-level ROI / Margin calculations are supported in P0.
          </p>
          {!project.archivedAt ? (
            <Link to="new">Create first criterion</Link>
          ) : null}
        </div>
      ) : (
        <div className={styles.grid}>
          {criteriaWithStatus.map((criterion) => (
            <article className={styles.card} id={`criterion-${criterion.id}`} key={criterion.id} tabIndex={-1}>
              <div className={styles.cardHeader}>
                <div className={styles.badges}>
                  <span
                    className={`${styles.statusBadge} ${styles[criterion.derivedStatus] ?? ''}`}
                  >
                    {getSuccessCriterionStatusLabel(criterion.derivedStatus)}
                  </span>
                  <span className={styles.categoryBadge}>
                    {getSuccessCriterionCategoryLabel(criterion.category)}
                  </span>
                </div>
                <span className={styles.metricType}>
                  {getSuccessCriterionMetricTypeLabel(criterion.metricType)}
                </span>
              </div>

              <div className={styles.identity}>
                <h3>{criterion.title}</h3>
                <p>{criterion.description || 'No additional description.'}</p>
              </div>

              <dl className={styles.metricStrip}>
                <div>
                  <dt>Baseline</dt>
                  <dd>{formatCriterionValue(criterion.baseline, criterion.unit)}</dd>
                </div>
                <div>
                  <dt>Current</dt>
                  <dd>{formatCriterionValue(criterion.currentValue, criterion.unit)}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{formatCriterionValue(criterion.target, criterion.unit)}</dd>
                </div>
              </dl>

              <div className={styles.targetRow}>
                <span>Target date</span>
                <strong>{formatTargetDate(criterion.targetDate)}</strong>
              </div>

              {!project.archivedAt ? (
                <div className={styles.actions}>
                  {pendingDeleteId === criterion.id ? (
                    <div className={styles.deleteConfirm}>
                      <span>Delete this criterion?</span>
                      <button type="button" onClick={() => setPendingDeleteId(null)}>
                        Cancel
                      </button>
                      <button
                        className={styles.dangerButton} data-ui-button="danger"
                        type="button"
                        disabled={mutationStatus === 'loading'}
                        onClick={() => handleDelete(criterion.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link className={styles.editButton} data-ui-button="secondary" data-ui-size="sm" to={`${criterion.id}/edit`}>
                        Edit
                      </Link>
                      <button
                        className={styles.deleteButton} data-ui-button="danger" data-ui-size="sm"
                        type="button"
                        onClick={() => setPendingDeleteId(criterion.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {mutationError ? (
        <div className={styles.mutationError} role="alert">
          {mutationError}
        </div>
      ) : null}
    </section>
  )
}
