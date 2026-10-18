import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  selectRisksViewMode,
  selectRisksViewModeError,
  updateRisksViewMode,
} from '../../features/preferences/model/preferencesSlice.js'
import {
  deleteRisk,
  loadRisks,
  selectRiskMutationError,
  selectRiskMutationStatus,
  selectRisksByProject,
  selectRisksError,
  selectRisksStatus,
} from '../../features/risks/model/risksSlice.js'
import {
  calculateRiskScore,
  getRiskImpactLabel,
  getRiskProbabilityLabel,
  getRiskResponseLabel,
  getRiskSeverity,
  getRiskSeverityLabel,
  getRiskStatusLabel,
  isRiskDueSoon,
  isRiskOperational,
  isRiskOverdue,
} from '../../features/risks/lib/risks.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import styles from './RisksPage.module.css'

const MATRIX_VALUES = [5, 4, 3, 2, 1]
const IMPACT_VALUES = [1, 2, 3, 4, 5]
const DISPLAY_MODES = Object.freeze({ grid: 'grid', list: 'list' })

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  )
}

function RiskDisplayModes({ mode, onChange }) {
  return (
    <div className={styles.displayModes} role="group" aria-label="Risk register view">
      <button
        type="button"
        className={mode === DISPLAY_MODES.grid ? styles.activeDisplayMode : ''}
        aria-label="Grid view"
        aria-pressed={mode === DISPLAY_MODES.grid}
        onClick={() => onChange(DISPLAY_MODES.grid)}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className={mode === DISPLAY_MODES.list ? styles.activeDisplayMode : ''}
        aria-label="List view"
        aria-pressed={mode === DISPLAY_MODES.list}
        onClick={() => onChange(DISPLAY_MODES.list)}
      >
        <ListIcon />
      </button>
    </div>
  )
}

function RiskActions({ risk, archived, onDelete }) {
  return (
    <div className={styles.actions}>
      <Link className={styles.openButton} data-ui-button="secondary" data-ui-size="sm" to={risk.id}>
        Open risk <span aria-hidden="true">→</span>
      </Link>
      {!archived ? (
        <>
          <Link className={styles.editButton} data-ui-button="secondary" data-ui-size="sm" to={`${risk.id}/edit`}>Edit</Link>
          <button className={styles.deleteButton} data-ui-button="danger" data-ui-size="sm" type="button" onClick={() => onDelete(risk)}>Delete</button>
        </>
      ) : null}
    </div>
  )
}

function RiskCard({ risk, archived, onDelete }) {
  const overdue = isRiskOverdue(risk)
  const dueSoon = isRiskDueSoon(risk)

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.badges}>
          <span className={`${styles.severityBadge} ${styles[risk.severity]}`}>{getRiskSeverityLabel(risk.severity)}</span>
          <span className={styles.statusBadge}>{getRiskStatusLabel(risk.status)}</span>
        </div>
        <span className={styles.scoreBadge}>Score {risk.score}</span>
      </div>
      <div className={styles.identity}>
        <h4>{risk.title}</h4>
        <p>{risk.description || 'No additional description.'}</p>
      </div>
      <dl className={styles.metaStrip}>
        <div><dt>Owner</dt><dd>{risk.owner}</dd></div>
        <div><dt>Response</dt><dd>{getRiskResponseLabel(risk.responseStrategy)}</dd></div>
        <div><dt>Due</dt><dd className={overdue ? styles.dueDanger : dueSoon ? styles.dueWarning : ''}>{formatDate(risk.dueDate)}</dd></div>
      </dl>
      <div className={styles.plan}><span>Mitigation / response</span><p>{risk.mitigation}</p></div>
      <RiskActions risk={risk} archived={archived} onDelete={onDelete} />
    </article>
  )
}

function RiskListRow({ risk, archived, onDelete }) {
  const overdue = isRiskOverdue(risk)
  const dueSoon = isRiskDueSoon(risk)

  return (
    <article className={styles.listRow}>
      <div className={styles.listIdentity}>
        <div className={styles.listTitleLine}>
          <span className={`${styles.severityBadge} ${styles[risk.severity]}`}>{getRiskSeverityLabel(risk.severity)}</span>
          <h4>{risk.title}</h4>
        </div>
        <p>{risk.description || 'No additional description.'}</p>
      </div>
      <dl className={styles.listMeta}>
        <div><dt>Owner</dt><dd>{risk.owner}</dd></div>
        <div><dt>Probability</dt><dd>{risk.probability} / 5</dd></div>
        <div><dt>Impact</dt><dd>{risk.impact} / 5</dd></div>
        <div><dt>Score</dt><dd>{risk.score}</dd></div>
        <div><dt>Due</dt><dd className={overdue ? styles.dueDanger : dueSoon ? styles.dueWarning : ''}>{formatDate(risk.dueDate)}</dd></div>
        <div><dt>Status</dt><dd>{getRiskStatusLabel(risk.status)}</dd></div>
      </dl>
      <RiskActions risk={risk} archived={archived} onDelete={onDelete} />
    </article>
  )
}

export function RisksPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectRisksStatus)
  const error = useAppSelector(selectRisksError)
  const mutationStatus = useAppSelector(selectRiskMutationStatus)
  const mutationError = useAppSelector(selectRiskMutationError)
  const displayMode = useAppSelector(selectRisksViewMode)
  const displayModeError = useAppSelector(selectRisksViewModeError)
  const risks = useAppSelector((state) => selectRisksByProject(state, project.id))
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => {
    if (status === 'idle') dispatch(loadRisks())
  }, [dispatch, status])

  const summary = useMemo(() => ({
    open: risks.filter(isRiskOperational).length,
    high: risks.filter((risk) => ['high', 'critical'].includes(risk.severity) && isRiskOperational(risk)).length,
    dueSoon: risks.filter((risk) => isRiskDueSoon(risk) || isRiskOverdue(risk)).length,
    closed: risks.filter((risk) => risk.status === 'closed').length,
  }), [risks])

  const matrixCounts = useMemo(() => {
    const counts = new Map()
    for (const risk of risks.filter(isRiskOperational)) {
      counts.set(`${risk.probability}-${risk.impact}`, (counts.get(`${risk.probability}-${risk.impact}`) ?? 0) + 1)
    }
    return counts
  }, [risks])

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await dispatch(deleteRisk(pendingDelete.id)).unwrap()
      setPendingDelete(null)
    } catch {
      // Redux exposes mutation error below.
    }
  }

  const handleDisplayModeChange = (nextMode) => {
    if (nextMode !== displayMode) dispatch(updateRisksViewMode(nextMode))
  }

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading risk register…</div>
  if (status === 'failed') return <div className={styles.stateCard} role="alert"><strong>Risk register could not be loaded.</strong><span>{error}</span><button type="button" onClick={() => dispatch(loadRisks())}>Try again</button></div>

  return (
    <section className={styles.root}>
      <header className={styles.header} data-ui-page-header>
        <span className={styles.eyebrow}>Risk control</span>
        <div className={styles.titleRow} data-ui-page-title-row>
          <h2>Risk Register</h2>
          {!project.archivedAt ? <Link className={styles.primaryButton} data-ui-button="primary" to="new">New risk</Link> : null}
        </div>
        <p>Capture uncertainty, quantify exposure with probability × impact, and keep ownership and response visible.</p>
      </header>

      {project.archivedAt ? <div className={styles.archiveBanner}><strong>Archived project</strong><span>Risks remain available for review. Restore the project to edit them.</span></div> : null}

      <div className={styles.summary} role="group" aria-label="Risk summary">
        <div><span>Open risks</span><strong>{summary.open}</strong></div>
        <div><span>High / Critical</span><strong>{summary.high}</strong></div>
        <div><span>Due soon / overdue</span><strong>{summary.dueSoon}</strong></div>
        <div><span>Closed</span><strong>{summary.closed}</strong></div>
      </div>

      <section className={styles.matrixSection} aria-labelledby="risk-matrix-title">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>Exposure map</span><h3 id="risk-matrix-title">Probability × Impact Matrix</h3></div>
          <p><span>Only operational risks are counted.</span><span>Score bands: Low 1–4 · Medium 5–9 · High 10–16 · Critical 17–25.</span></p>
        </div>
        <div className={styles.matrixScroller}>
          <table className={styles.matrix}>
            <thead><tr><th scope="col">Probability</th>{IMPACT_VALUES.map((impact) => <th key={impact} scope="col">{impact}<small>{getRiskImpactLabel(impact)}</small></th>)}</tr></thead>
            <tbody>
              {MATRIX_VALUES.map((probability) => <tr key={probability}><th scope="row">{probability}<small>{getRiskProbabilityLabel(probability)}</small></th>{IMPACT_VALUES.map((impact) => { const score = calculateRiskScore(probability, impact); const severity = getRiskSeverity(score); const count = matrixCounts.get(`${probability}-${impact}`) ?? 0; return <td key={impact} className={styles[severity]} aria-label={`Probability ${probability}, impact ${impact}, ${getRiskSeverityLabel(severity)}, ${count} risks`}><span>{score}</span>{count > 0 ? <strong>{count}</strong> : null}</td> })}</tr>)}
            </tbody>
          </table>
        </div>
        <div className={styles.matrixLegend} role="group" aria-label="Risk matrix scale">
          <span><strong>Probability:</strong> 1 Rare · 2 Unlikely · 3 Possible · 4 Likely · 5 Almost certain</span>
          <span><strong>Impact:</strong> 1 Insignificant · 2 Minor · 3 Moderate · 4 Major · 5 Severe</span>
        </div>
      </section>

      <div className={styles.registerHeading}>
        <div><span className={styles.eyebrow}>Register</span><h3>Current risks</h3></div>
        <div className={styles.registerControls}>
          <RiskDisplayModes mode={displayMode} onChange={handleDisplayModeChange} />
          <span>{risks.length} total</span>
        </div>
      </div>

      {displayModeError ? <p className={styles.viewModeError} role="status">View preference could not be saved.</p> : null}

      {risks.length === 0 ? (
        <div className={styles.emptyState}><strong>No risks captured yet.</strong><p>Start with the most material uncertainty that could affect project outcomes.</p>{!project.archivedAt ? <Link to="new">Create first risk</Link> : null}</div>
      ) : displayMode === DISPLAY_MODES.list ? (
        <div className={styles.list}>
          {risks.map((risk) => <RiskListRow key={risk.id} risk={risk} archived={Boolean(project.archivedAt)} onDelete={setPendingDelete} />)}
        </div>
      ) : (
        <div className={styles.grid}>
          {risks.map((risk) => <RiskCard key={risk.id} risk={risk} archived={Boolean(project.archivedAt)} onDelete={setPendingDelete} />)}
        </div>
      )}

      {mutationError ? <div className={styles.mutationError} role="alert">{mutationError}</div> : null}

      <ConfirmDialog isOpen={Boolean(pendingDelete)} eyebrow="Risk register" title="Delete risk?" message={pendingDelete ? `“${pendingDelete.title}” will be removed from this local project register.` : ''} confirmLabel={mutationStatus === 'loading' ? 'Deleting…' : 'Delete risk'} cancelLabel="Keep risk" onConfirm={handleDelete} onCancel={() => setPendingDelete(null)} />
    </section>
  )
}
