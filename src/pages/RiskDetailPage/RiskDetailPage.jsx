import { useEffect } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  loadRisks,
  selectRiskById,
  selectRisksError,
  selectRisksStatus,
} from '../../features/risks/model/risksSlice.js'
import {
  getRiskImpactLabel,
  getRiskProbabilityLabel,
  getRiskResponseLabel,
  getRiskSeverityLabel,
  getRiskStatusLabel,
  isRiskDueSoon,
  isRiskOverdue,
} from '../../features/risks/lib/risks.js'
import styles from './RiskDetailPage.module.css'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function RiskDetailPage() {
  const { project } = useOutletContext()
  const { riskId } = useParams()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectRisksStatus)
  const error = useAppSelector(selectRisksError)
  const risk = useAppSelector((state) => selectRiskById(state, riskId))
  const listPath = `/projects/${project.id}/risks`

  useEffect(() => {
    if (status === 'idle') dispatch(loadRisks())
  }, [dispatch, status])

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading risk…</div>
  }

  if (status === 'failed') {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Risk could not be loaded.</strong>
        <span>{error}</span>
        <button type="button" onClick={() => dispatch(loadRisks())}>Try again</button>
      </div>
    )
  }

  if (!risk || risk.projectId !== project.id) {
    return (
      <div className={styles.stateCard}>
        <strong>Risk not found.</strong>
        <span>The requested risk is not available in this project.</span>
        <Link to={listPath}>Return to Risk Register</Link>
      </div>
    )
  }

  const overdue = isRiskOverdue(risk)
  const dueSoon = isRiskDueSoon(risk)

  return (
    <section className={styles.root}>
      <nav className={styles.contextTrail} aria-label="Risk detail context">
        <Link to="/projects">Projects</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/projects/${project.id}`}>{project.name}</Link>
        <span aria-hidden="true">/</span>
        <Link to={listPath}>Risks</Link>
      </nav>

      <Link className={styles.backLink} to={listPath}>Risk Register</Link>

      <header className={styles.header}>
        <div className={styles.headingCopy}>
          <span className={styles.eyebrow}>Risk detail</span>
          <h2>{risk.title}</h2>
          <p>{risk.description || 'No additional description.'}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.severityBadge} ${styles[risk.severity]}`}>{getRiskSeverityLabel(risk.severity)}</span>
          {!project.archivedAt ? <Link className={styles.editButton} data-ui-button="secondary" to={`${listPath}/${risk.id}/edit`}>Edit risk</Link> : null}
        </div>
      </header>

      <dl className={styles.summaryStrip}>
        <div><dt>Score</dt><dd>{risk.score} / 25</dd></div>
        <div><dt>Probability</dt><dd>{risk.probability} — {getRiskProbabilityLabel(risk.probability)}</dd></div>
        <div><dt>Impact</dt><dd>{risk.impact} — {getRiskImpactLabel(risk.impact)}</dd></div>
        <div><dt>Status</dt><dd>{getRiskStatusLabel(risk.status)}</dd></div>
      </dl>

      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <span className={styles.panelLabel}>Response & ownership</span>
          <dl className={styles.detailList}>
            <div><dt>Owner</dt><dd>{risk.owner}</dd></div>
            <div><dt>Response strategy</dt><dd>{getRiskResponseLabel(risk.responseStrategy)}</dd></div>
            <div><dt>Due date</dt><dd className={overdue ? styles.dueDanger : dueSoon ? styles.dueWarning : ''}>{formatDate(risk.dueDate)}</dd></div>
          </dl>
        </section>

        <section className={styles.panel}>
          <span className={styles.panelLabel}>Mitigation / response plan</span>
          <p>{risk.mitigation}</p>
        </section>
      </div>

      {project.archivedAt ? (
        <div className={styles.archiveNote}>
          <strong>Archived project</strong>
          <span>This risk is available for review only. Restore the project to edit it.</span>
        </div>
      ) : null}
    </section>
  )
}
