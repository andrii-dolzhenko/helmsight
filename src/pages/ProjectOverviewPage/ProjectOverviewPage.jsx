import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  archiveProject,
  restoreProject,
  selectProjectMutationError,
} from '../../features/projects/model/projectsSlice.js'
import {
  formatProjectDate,
  formatProjectTimestamp,
  getProjectStatusLabel,
} from '../../features/projects/lib/projectPresentation.js'
import {
  loadSuccessCriteria,
  selectSuccessCriteriaByProject,
  selectSuccessCriteriaError,
  selectSuccessCriteriaStatus,
} from '../../features/successCriteria/model/successCriteriaSlice.js'
import {
  evaluateSuccessCriterion,
  formatCriterionValue,
  getSuccessCriterionStatusLabel,
} from '../../features/successCriteria/lib/successCriteria.js'
import {
  loadRisks,
  selectRisksByProject,
  selectRisksError,
  selectRisksStatus,
} from '../../features/risks/model/risksSlice.js'
import {
  loadMilestones,
  selectMilestonesByProject,
  selectMilestonesError,
  selectMilestonesStatus,
} from '../../features/milestones/model/milestonesSlice.js'
import {
  loadManagementActions,
  selectManagementActionsByProject,
  selectManagementActionsError,
  selectManagementActionsStatus,
} from '../../features/managementActions/model/managementActionsSlice.js'
import {
  loadEvm,
  selectEvmBaselineByProject,
  selectEvmError,
  selectEvmSnapshotsByProject,
  selectEvmStatus,
} from '../../features/evm/model/evmSlice.js'
import {
  formatEvmValue,
  formatIndex,
  getMeasurementBasisLabel,
  getPerformanceStateLabel,
  isFullEvmBasis,
} from '../../features/evm/lib/evm.js'
import {
  buildProjectDashboard,
} from '../../features/dashboard/lib/projectDashboard.js'
import styles from './ProjectOverviewPage.module.css'
import { registerRadarWaveRadius } from './registerRadarWaveRadius.js'

registerRadarWaveRadius()

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function getPulseNarrative(dashboard) {
  if (dashboard.attentionCount > 0) {
    const watchSuffix = dashboard.watchCount > 0
      ? ` ${dashboard.watchCount} additional ${dashboard.watchCount === 1 ? 'signal is' : 'signals are'} on watch.`
      : ''
    return `${dashboard.attentionCount} ${dashboard.attentionCount === 1 ? 'signal needs' : 'signals need'} action.${watchSuffix}`
  }

  if (dashboard.watchCount > 0) {
    return `No blocking exceptions are active. ${dashboard.watchCount} ${dashboard.watchCount === 1 ? 'signal remains' : 'signals remain'} on watch.`
  }

  return 'Current project controls are within their expected ranges.'
}

function getDashboardTarget(projectId, route) {
  const [routePath, targetId = ''] = route.split('#')
  const to = { pathname: `/projects/${projectId}/${routePath}` }

  if (targetId) {
    to.hash = `#${targetId}`
  }

  return {
    to,
    state: targetId ? { focusTargetId: targetId } : undefined,
  }
}

function IndexGauge({ label, description, value, state }) {
  const hasValue = Number.isFinite(value)
  const numericValue = hasValue ? value : 0
  const progress = hasValue
    ? Math.min(100, Math.max(0, numericValue * 100))
    : 0
  const delta = hasValue ? numericValue - 1 : null
  const deltaLabel = delta === null
    ? '—'
    : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`
  const performanceLabel = getPerformanceStateLabel(state)

  return (
    <div
      className={`${styles.indexGauge} ${styles[`gauge_${state}`] ?? ''}`}
      style={{ '--gauge-progress': `${progress}%` }}
    >
      <div className={styles.gaugeHeader}>
        <strong>{label}</strong>
        <span className={styles.gaugeStatus}>
          <i aria-hidden="true" />
          {performanceLabel}
        </span>
      </div>

      <div className={styles.gaugeBody}>
        <div
          className={styles.gaugeRing}
          role="img"
          aria-label={`${label} ${formatIndex(value)}; target 1.00; delta ${deltaLabel}`}
        >
          <i className={styles.gaugeTargetMarker} aria-hidden="true" />
          <div>
            <strong>{formatIndex(value)}</strong>
            <span className={styles.gaugeRingDelta}>{deltaLabel}</span>
          </div>
        </div>

        <div className={styles.gaugeCaption}>
          <strong>{description}</strong>
          <div className={styles.gaugeMeta}>
            <span>Target <b>1.00</b></span>
            <span>Delta <b>{deltaLabel}</b></span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, detail, to, tone = 'neutral' }) {
  return (
    <Link className={`${styles.summaryCard} ${styles[tone] ?? ''}`} to={to}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <i aria-hidden="true">↗</i>
    </Link>
  )
}

function SignalGroup({ label, projectId, signals, total }) {
  if (total === 0) return null

  return (
    <section className={styles.signalGroup}>
      <div className={styles.signalGroupHeading}>
        <span>{label}</span>
        <b>{total}</b>
      </div>
      <div className={styles.signalList}>
        {signals.map((signal) => {
          const target = getDashboardTarget(projectId, signal.route)

          return (
            <Link
              key={signal.id}
              className={styles.signalItem}
              to={target.to}
              state={target.state}
            >
              <span className={`${styles.signalDot} ${styles[signal.state]}`} aria-hidden="true" />
              <div>
                <div className={styles.signalMeta}>
                  <span>{signal.module}</span>
                  <b className={styles[signal.state]}>
                    {signal.state === 'attention' ? 'Needs attention' : 'Watch'}
                  </b>
                </div>
                <strong>{signal.title}</strong>
                <small>{signal.detail}</small>
              </div>
              <span className={styles.signalArrow} aria-hidden="true">→</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function SignalList({ projectId, signals, isExpanded, onExpandedChange }) {

  if (signals.length === 0) {
    return (
      <div className={styles.clearState}>
        <strong>No active exceptions.</strong>
        <span>Current controls are not surfacing any watch or attention signals.</span>
      </div>
    )
  }

  const attentionSignals = signals.filter((signal) => signal.state === 'attention')
  const watchSignals = signals.filter((signal) => signal.state === 'watch')
  const previewAttention = attentionSignals.slice(0, 3)
  const previewWatch = watchSignals.slice(0, 2)
  const visibleAttention = isExpanded ? attentionSignals : previewAttention
  const visibleWatch = isExpanded ? watchSignals : previewWatch
  const hiddenCount = signals.length - previewAttention.length - previewWatch.length

  return (
    <div className={styles.signalGroups}>
      <SignalGroup
        label="Needs action"
        projectId={projectId}
        signals={visibleAttention}
        total={attentionSignals.length}
      />
      <SignalGroup
        label="Watch"
        projectId={projectId}
        signals={visibleWatch}
        total={watchSignals.length}
      />
      {hiddenCount > 0 ? (
        <button
          className={styles.signalToggle}
          type="button"
          aria-expanded={isExpanded}
          onClick={() => onExpandedChange(!isExpanded)}
        >
          {isExpanded ? 'Show less ↑' : `Show ${hiddenCount} more ↓`}
        </button>
      ) : null}
    </div>
  )
}

function DeliveryPerformance({ projectId, baseline, dashboard, stackRef, preservedHeight }) {
  if (!baseline || !dashboard.evm.metrics) {
    return (
      <div
        ref={stackRef}
        className={styles.deliveryStack}
        style={preservedHeight ? { '--delivery-stack-collapsed-height': `${preservedHeight}px` } : undefined}
      >
        <section className={`${styles.panel} ${styles.deliveryPanel}`}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Delivery performance</span>
              <h3>EVM baseline not configured</h3>
            </div>
            <Link to={`/projects/${projectId}/metrics`}>Open Metrics</Link>
          </div>
          <div className={styles.inlineEmpty}>
            <strong>Add a baseline to activate performance indices.</strong>
            <span>PV, EV, CPI and SPI will roll up here after weekly snapshots are recorded.</span>
          </div>
        </section>
      </div>
    )
  }

  const { metrics, spiState, cpiState } = dashboard.evm
  const fullEvm = isFullEvmBasis(baseline.measurementBasis)
  const bac = metrics.bac || 0
  const valueRows = [
    { label: 'PV', value: metrics.pv, className: styles.planned, description: 'Planned by cutoff' },
    { label: 'EV', value: metrics.ev, className: styles.earned, description: 'Completed baseline value' },
    ...(fullEvm ? [{ label: 'AC', value: metrics.ac, className: styles.actual, description: 'Actual consumption' }] : []),
  ]

  return (
    <div
      ref={stackRef}
      className={styles.deliveryStack}
      style={preservedHeight ? { '--delivery-stack-collapsed-height': `${preservedHeight}px` } : undefined}
    >
      <section className={`${styles.panel} ${styles.deliveryPanel}`}>
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.eyebrow}>Delivery performance</span>
            <h3>Performance indices</h3>
            <p className={styles.deliveryAsOf}>Latest snapshot · {formatDate(metrics.snapshotDate)}</p>
          </div>
          <Link to={`/projects/${projectId}/metrics`}>Open Metrics</Link>
        </div>

        <div className={`${styles.gaugeGrid} ${fullEvm ? '' : styles.singleGauge}`}>
          <IndexGauge
            label="SPI"
            description="Schedule efficiency"
            value={metrics.spi}
            state={spiState}
          />
          {fullEvm ? (
            <IndexGauge
              label="CPI"
              description="Cost / effort efficiency"
              value={metrics.cpi}
              state={cpiState}
            />
          ) : null}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.valuePositionPanel}`}>
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.eyebrow}>Earned value</span>
            <h3>PV / EV / AC position</h3>
          </div>
          <span className={styles.bacReference}>BAC {formatEvmValue(metrics.bac, baseline)}</span>
        </div>

        <div className={styles.performanceBars}>
          {valueRows.map((row) => {
            const width = bac > 0 ? Math.min(100, Math.max(0, (Number(row.value) / bac) * 100)) : 0
            return (
              <div className={styles.performanceRow} key={row.label}>
                <div className={styles.performanceLabel}>
                  <strong>{row.label}</strong>
                  <small>{row.description}</small>
                </div>
                <div className={styles.performanceTrack} aria-hidden="true">
                  <i className={row.className} style={{ width: `${width}%` }} />
                </div>
                <strong>{formatEvmValue(row.value, baseline)}</strong>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function ProjectOverviewPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const mutationError = useAppSelector(selectProjectMutationError)
  const criteriaStatus = useAppSelector(selectSuccessCriteriaStatus)
  const criteriaError = useAppSelector(selectSuccessCriteriaError)
  const criteria = useAppSelector((state) => selectSuccessCriteriaByProject(state, project.id))
  const risksStatus = useAppSelector(selectRisksStatus)
  const risksError = useAppSelector(selectRisksError)
  const risks = useAppSelector((state) => selectRisksByProject(state, project.id))
  const milestonesStatus = useAppSelector(selectMilestonesStatus)
  const milestonesError = useAppSelector(selectMilestonesError)
  const milestones = useAppSelector((state) => selectMilestonesByProject(state, project.id))
  const actionsStatus = useAppSelector(selectManagementActionsStatus)
  const actionsError = useAppSelector(selectManagementActionsError)
  const actions = useAppSelector((state) => selectManagementActionsByProject(state, project.id))
  const evmStatus = useAppSelector(selectEvmStatus)
  const evmError = useAppSelector(selectEvmError)
  const baseline = useAppSelector((state) => selectEvmBaselineByProject(state, project.id))
  const snapshots = useAppSelector((state) => selectEvmSnapshotsByProject(state, project.id))
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isAttentionExpanded, setIsAttentionExpanded] = useState(false)
  const [collapsedDeliveryHeight, setCollapsedDeliveryHeight] = useState(0)
  const deliveryStackRef = useRef(null)
  const [dashboardNow] = useState(() => new Date())

  useEffect(() => {
    if (criteriaStatus === 'idle') dispatch(loadSuccessCriteria())
    if (risksStatus === 'idle') dispatch(loadRisks())
    if (milestonesStatus === 'idle') dispatch(loadMilestones())
    if (actionsStatus === 'idle') dispatch(loadManagementActions())
    if (evmStatus === 'idle') dispatch(loadEvm())
  }, [
    actionsStatus,
    criteriaStatus,
    dispatch,
    evmStatus,
    milestonesStatus,
    risksStatus,
  ])

  const dashboard = useMemo(
    () => buildProjectDashboard({
      criteria,
      risks,
      milestones,
      actions,
      baseline,
      snapshots,
      today: project.archivedAt ? new Date(project.archivedAt) : dashboardNow,
    }),
    [actions, baseline, criteria, dashboardNow, milestones, project.archivedAt, risks, snapshots],
  )

  const moduleErrors = [criteriaError, risksError, milestonesError, actionsError, evmError].filter(Boolean)
  const statuses = [criteriaStatus, risksStatus, milestonesStatus, actionsStatus, evmStatus]
  const isLoading = statuses.some((status) => status === 'idle' || status === 'loading')
  const hasAnyData = criteria.length + risks.length + milestones.length + actions.length + snapshots.length > 0 || baseline !== null
  const healthClass = project.archivedAt
    ? styles.notAssessed
    : (styles[dashboard.health] ?? styles.notAssessed)
  const healthLabel = project.archivedAt ? 'Historical view' : dashboard.healthLabel
  const fullEvm = baseline ? isFullEvmBasis(baseline.measurementBasis) : false
  const nextMilestone = dashboard.milestones.upcoming[0] ?? null
  const pulseNarrative = getPulseNarrative(dashboard)

  const handleAttentionExpandedChange = (nextExpanded) => {
    if (nextExpanded && deliveryStackRef.current) {
      setCollapsedDeliveryHeight(Math.ceil(deliveryStackRef.current.getBoundingClientRect().height))
    }
    setIsAttentionExpanded(nextExpanded)
  }

  const handleArchive = async () => {
    try {
      await dispatch(archiveProject(project.id)).unwrap()
      setIsArchiveConfirmOpen(false)
    } catch {
      // Redux exposes the mutation error below.
    }
  }

  if (isLoading && !hasAnyData) {
    return <div className={styles.stateCard}>Loading project control signals…</div>
  }

  return (
    <section className={styles.root}>
      {project.archivedAt ? (
        <div className={styles.archiveBanner}>
          <div>
            <strong>This project is archived.</strong>
            <span>Operational history remains visible, but the dashboard is read-only.</span>
          </div>
          <button data-ui-button="secondary" type="button" onClick={() => dispatch(restoreProject(project.id))}>
            Restore project
          </button>
        </div>
      ) : null}

      {moduleErrors.length > 0 ? (
        <div className={styles.dataWarning} role="alert">
          <strong>Some dashboard signals are unavailable.</strong>
          <span>{moduleErrors.join(' ')}</span>
        </div>
      ) : null}

      <header className={styles.dashboardHeader} data-ui-page-header>
        <span className={styles.eyebrow}>Delivery control</span>
        <div data-ui-page-title-row>
          <h2>Project Overview</h2>
          <Link className={styles.editProjectLink} data-ui-button="secondary" to={`/projects/${project.id}/edit`}>Edit project</Link>
        </div>
        <p>One management view across outcomes, risk, schedule, actions, and delivery performance.</p>
      </header>

      <section className={`${styles.healthHero} ${healthClass}`} aria-label={`Project health: ${healthLabel}`}>
        <span className={styles.radarPulse} aria-hidden="true" />
        <div className={styles.healthMain}>
          <span className={styles.heroLabel}>{project.archivedAt ? 'Archived project' : 'Project pulse'}</span>
          <strong>{healthLabel}</strong>
          <p>
            {project.archivedAt
              ? `Operational signals are shown as of ${formatProjectTimestamp(project.archivedAt)} and are not recalculated as current project health.`
              : pulseNarrative}
          </p>
          <div className={styles.heroSignals}>
            <span><b>{dashboard.attentionCount}</b> need action</span>
            <span><b>{dashboard.watchCount}</b> watch</span>
          </div>
        </div>
        <div className={styles.pulseContext}>
          <span className={styles.pulseContextLabel}>Control snapshot</span>
          <div className={styles.pulseFacts}>
            <div>
              <small>Latest EVM</small>
              <strong>{baseline ? formatDate(dashboard.evm.metrics?.snapshotDate) : 'Not configured'}</strong>
            </div>
            <div>
              <small>Next milestone</small>
              <strong title={nextMilestone?.title ?? ''}>{nextMilestone?.title ?? 'No upcoming milestone'}</strong>
              <span>{nextMilestone ? formatDate(nextMilestone.targetDate) : '—'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.summaryGrid} aria-label="Project control summary">
        <SummaryCard
          label="Success criteria"
          value={dashboard.successCriteria.total ? `${dashboard.successCriteria.achieved}/${dashboard.successCriteria.total}` : '—'}
          detail={dashboard.successCriteria.total ? `${dashboard.successCriteria.atRisk + dashboard.successCriteria.missed} need attention` : 'No criteria yet'}
          to="success-criteria"
          tone={dashboard.successCriteria.missed > 0 ? 'attentionTone' : dashboard.successCriteria.atRisk > 0 ? 'watchTone' : 'healthyTone'}
        />
        <SummaryCard
          label="Risks"
          value={dashboard.risks.highCritical}
          detail={`${dashboard.risks.operational} operational · high + critical`}
          to="risks"
          tone={dashboard.risks.critical > 0 ? 'attentionTone' : dashboard.risks.highCritical > 0 ? 'watchTone' : 'healthyTone'}
        />
        <SummaryCard
          label="Milestones"
          value={dashboard.milestones.total ? `${dashboard.milestones.completed}/${dashboard.milestones.total}` : '—'}
          detail={`${dashboard.milestones.needsAttention} schedule attention`}
          to="milestones"
          tone={dashboard.milestones.overdue > 0 ? 'attentionTone' : dashboard.milestones.dueSoon > 0 ? 'watchTone' : 'healthyTone'}
        />
        <SummaryCard
          label="Actions"
          value={dashboard.actions.active}
          detail={`${dashboard.actions.overdue} overdue · ${dashboard.actions.criticalActive} critical active`}
          to="actions"
          tone={dashboard.actions.overdue > 0 ? 'attentionTone' : dashboard.actions.criticalActive + dashboard.actions.dueSoon > 0 ? 'watchTone' : 'healthyTone'}
        />
      </div>

      <div className={`${styles.primaryGrid} ${isAttentionExpanded ? styles.primaryGridExpanded : ''}`}>
        <DeliveryPerformance
          projectId={project.id}
          baseline={baseline}
          dashboard={dashboard}
          stackRef={deliveryStackRef}
          preservedHeight={collapsedDeliveryHeight}
        />

        <section className={`${styles.panel} ${styles.attentionPanel}`}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Exceptions</span>
              <h3>{project.archivedAt ? 'Attention at archive' : 'Attention queue'}</h3>
              <p className={styles.queueSummary}>{dashboard.attentionCount} need action · {dashboard.watchCount} watch</p>
            </div>
            <span className={styles.exceptionCount}>{dashboard.needsAttention.length}</span>
          </div>
          <SignalList
            projectId={project.id}
            signals={dashboard.needsAttention}
            isExpanded={isAttentionExpanded}
            onExpandedChange={handleAttentionExpandedChange}
          />
        </section>
      </div>

      <div className={styles.secondaryGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Schedule</span>
              <h3>Upcoming milestones</h3>
            </div>
            <Link to="milestones">View all</Link>
          </div>
          {dashboard.milestones.upcoming.length > 0 ? (
            <div className={styles.milestoneList}>
              {dashboard.milestones.upcoming.map((milestone) => (
                <div key={milestone.id} className={styles.milestoneItem}>
                  <div className={styles.milestoneDate}>
                    <span>{formatDate(milestone.targetDate).split(',')[0]}</span>
                  </div>
                  <div>
                    <strong>{milestone.title}</strong>
                    <small>{milestone.progress}% complete</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.inlineEmpty}><strong>No upcoming milestones.</strong><span>Add milestones to make schedule exposure visible here.</span></div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Outcomes</span>
              <h3>Success criteria</h3>
            </div>
            <Link to="success-criteria">View all</Link>
          </div>
          {criteria.length > 0 ? (
            <div className={styles.criteriaList}>
              {criteria.slice(0, 4).map((criterion) => {
                const status = evaluateSuccessCriterion(
                  criterion,
                  project.archivedAt ? new Date(project.archivedAt) : dashboardNow,
                )

                return (
                  <div key={criterion.id} className={styles.criterionItem}>
                    <div>
                      <strong>{criterion.title}</strong>
                      <small>{formatCriterionValue(criterion.currentValue, criterion.unit)} current · {formatCriterionValue(criterion.target, criterion.unit)} target</small>
                    </div>
                    <span className={styles[`criterion_${status}`]}>{getSuccessCriterionStatusLabel(status)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={styles.inlineEmpty}><strong>No success criteria yet.</strong><span>Define measurable project outcomes to track delivery against intent.</span></div>
          )}
        </section>
      </div>

      <section className={`${styles.panel} ${styles.projectContext}`}>
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.eyebrow}>Project context</span>
            <h3>{project.clientContext}</h3>
          </div>
          <span className={styles.projectStatus}>{project.archivedAt ? 'Archived' : getProjectStatusLabel(project.status)}</span>
        </div>
        <p>{project.description || 'No project description has been added yet.'}</p>
        <dl>
          <div><dt>Start date</dt><dd>{formatProjectDate(project.startDate)}</dd></div>
          <div><dt>Target end</dt><dd>{formatProjectDate(project.targetEndDate)}</dd></div>
          <div><dt>Last project update</dt><dd>{formatProjectTimestamp(project.updatedAt)}</dd></div>
          <div><dt>EVM mode</dt><dd>{baseline ? `${getMeasurementBasisLabel(baseline.measurementBasis)}${fullEvm ? '' : ' · schedule only'}` : 'Not configured'}</dd></div>
        </dl>
      </section>

      <section className={`${styles.panel} ${styles.lifecycleCard}`}>
        <div>
          <span className={styles.eyebrow}>Project lifecycle</span>
          <h3>{project.archivedAt ? 'Restore when delivery resumes.' : 'Archive without losing control history.'}</h3>
        </div>

        {!project.archivedAt && !isArchiveConfirmOpen ? (
          <button className={styles.archiveButton} data-ui-button="danger" type="button" onClick={() => setIsArchiveConfirmOpen(true)}>
            Archive project
          </button>
        ) : null}

        {!project.archivedAt && isArchiveConfirmOpen ? (
          <div className={styles.confirmation}>
            <span>Archive this project?</span>
            <button data-ui-button="secondary" type="button" onClick={() => setIsArchiveConfirmOpen(false)}>Cancel</button>
            <button className={styles.dangerButton} data-ui-button="danger" type="button" onClick={handleArchive}>Archive</button>
          </div>
        ) : null}
      </section>

      {mutationError ? <div className={styles.errorMessage} role="alert">{mutationError}</div> : null}
    </section>
  )
}
