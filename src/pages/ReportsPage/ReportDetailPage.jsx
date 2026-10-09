import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import {
  Link,
  useBlocker,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  formatEvmValue,
  formatIndex,
  getPerformanceState,
  getPerformanceStateLabel,
} from '../../features/evm/lib/evm.js'
import {
  loadEvm,
  selectEvmBaselineByProject,
  selectEvmSnapshotsByProject,
  selectEvmStatus,
} from '../../features/evm/model/evmSlice.js'
import {
  loadManagementActions,
  selectManagementActionsByProject,
  selectManagementActionsStatus,
} from '../../features/managementActions/model/managementActionsSlice.js'
import { getMilestoneScheduleLabel } from '../../features/milestones/lib/milestones.js'
import {
  loadMilestones,
  selectMilestonesByProject,
  selectMilestonesStatus,
} from '../../features/milestones/model/milestonesSlice.js'
import {
  buildWeeklyReportSnapshot,
  getReportPeriod,
  getVisibleAttentionSignals,
  REPORT_STATUS,
} from '../../features/reports/lib/weeklyReport.js'
import {
  archiveReport,
  createReport,
  deleteReport,
  finalizeReport,
  loadReports,
  reopenReport,
  restoreReport,
  selectReportById,
  selectReportMutationError,
  selectReportMutationStatus,
  selectReportsByProject,
  selectReportsError,
  selectReportsStatus,
  updateReport,
} from '../../features/reports/model/reportsSlice.js'
import { getRiskSeverityLabel } from '../../features/risks/lib/risks.js'
import {
  loadRisks,
  selectRisksByProject,
  selectRisksStatus,
} from '../../features/risks/model/risksSlice.js'
import {
  formatCriterionValue,
  getSuccessCriterionStatusLabel,
} from '../../features/successCriteria/lib/successCriteria.js'
import {
  loadSuccessCriteria,
  selectSuccessCriteriaByProject,
  selectSuccessCriteriaStatus,
} from '../../features/successCriteria/model/successCriteriaSlice.js'
import { formDraftService } from '../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import { ReportHelp } from './ReportHelp.jsx'
import styles from './ReportsPage.module.css'

const MAX_EXECUTIVE_SUMMARY = 1500
const MAX_NARRATIVE_ITEM = 300
const MAX_OWNER = 100
const MIN_TEXT_LENGTH = 2


function ResponsiveNarrativeTextarea({ registration, contentValue, ...props }) {
  const textareaRef = useRef(null)
  const { ref: registerRef, onChange, ...registrationProps } = registration

  const syncHeight = useCallback((element = textareaRef.current) => {
    if (!element) return

    const desktop = window.innerWidth > 1050
    element.style.height = ''
    if (!desktop) return

    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [])

  useEffect(() => {
    syncHeight()
  }, [contentValue, syncHeight])

  useEffect(() => {
    const handleResize = () => syncHeight()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [syncHeight])

  return (
    <textarea
      {...registrationProps}
      {...props}
      ref={(element) => {
        textareaRef.current = element
        registerRef(element)
        syncHeight(element)
      }}
      onChange={(event) => {
        onChange(event)
        syncHeight(event.currentTarget)
      }}
    />
  )
}

function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: options.includeYear === false ? undefined : 'numeric',
  }).format(date)
}

function formatTimestamp(value) {
  if (!value) return 'Not saved yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not saved yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function toTextarea(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

function toList(value) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function validateListText(value) {
  const items = String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
  const tooShort = items.some((item) => item.length < MIN_TEXT_LENGTH)
  if (tooShort) return `Each entered item must use at least ${MIN_TEXT_LENGTH} characters.`
  const tooLong = items.some((item) => item.length > MAX_NARRATIVE_ITEM)
  return !tooLong || `Each item must use ${MAX_NARRATIVE_ITEM} characters or fewer.`
}

function hasValidRequiredText(value, maxLength) {
  const normalized = String(value ?? '').trim()
  return normalized.length >= MIN_TEXT_LENGTH && normalized.length <= maxLength
}

function reportFormIsValid(values) {
  if (!values) return false
  if (!hasValidRequiredText(values.executiveSummary, MAX_EXECUTIVE_SUMMARY)) return false
  if (!hasValidRequiredText(values.owner, MAX_OWNER)) return false
  return ['achievements', 'issuesBlockers', 'managementAttention', 'nextWeekFocus']
    .every((name) => validateListText(values[name]) === true)
}

function reportFormValues(report, project) {
  return {
    owner: report?.owner ?? project.governance?.charter?.projectManager ?? '',
    executiveSummary: report?.narrative?.executiveSummary ?? '',
    achievements: toTextarea(report?.narrative?.achievements),
    issuesBlockers: toTextarea(report?.narrative?.issuesBlockers),
    managementAttention: toTextarea(report?.narrative?.managementAttention),
    nextWeekFocus: toTextarea(report?.narrative?.nextWeekFocus),
  }
}

function formToNarrative(values) {
  return {
    executiveSummary: values.executiveSummary.trim(),
    achievements: toList(values.achievements),
    issuesBlockers: toList(values.issuesBlockers),
    managementAttention: toList(values.managementAttention),
    nextWeekFocus: toList(values.nextWeekFocus),
  }
}

function readDraft(key) {
  try {
    return key ? formDraftService.read(key) : null
  } catch {
    return null
  }
}


function ActionIcon({ name }) {
  if (name === 'save') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12l2 2v14H5V4Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg>
  if (name === 'refresh') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.2 10A7 7 0 0 0 6.1 7.1L4 10M5.8 14A7 7 0 0 0 17.9 16.9L20 14" /></svg>
  if (name === 'print') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v6H7z" /></svg>
  if (name === 'final') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></svg>
  if (name === 'reopen') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4m0 0h4M4 4l3.4 3.4" /><path d="M5.2 10a7 7 0 1 0 2-3.9" /></svg>
  if (name === 'archive') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4V7Z" /><path d="M3 4h18v3H3zM9 11h6" /></svg>
  if (name === 'restore') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4m0 0h4M4 4l3.4 3.4" /><path d="M5.2 10a7 7 0 1 0 2-3.9" /></svg>
  if (name === 'trash') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
  return null
}

function SectionIcon({ name }) {
  if (name === 'risk') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v4M12 17v.01" /></svg>
  if (name === 'milestone') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 5h11l-2 4 2 4H5" /></svg>
  if (name === 'target') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 4V2M20 12h2M12 20v2M4 12H2" /></svg>
  if (name === 'calendar') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
  if (name === 'pulse') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h4l2.2-5 3.2 10 2.4-7 2.2 4H22" /></svg>
  if (name === 'chart') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V9M10 20V4M16 20v-7M22 20V7M2 20h20" /></svg>
  return null
}

function ReportButton({ icon, children, className = '', variant = 'secondary', ...props }) {
  return (
    <button className={`${styles.actionButton} ${className}`} data-ui-button={variant} type="button" {...props}>
      <ActionIcon name={icon} />
      <span>{children}</span>
    </button>
  )
}

function EmptyList({ children = 'No items for this reporting period.' }) {
  return <p className={styles.emptyList}>{children}</p>
}

function NarrativeList({ value }) {
  const items = Array.isArray(value) ? value : toList(value)
  if (items.length === 0) return <EmptyList />
  return <ul className={styles.textList}>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
}

function HealthBadge({ status, label }) {
  return <span className={`${styles.healthBadge} ${styles[status] ?? ''}`}>{label ?? 'Not assessed'}</span>
}

function MetricState({ value }) {
  const state = getPerformanceState(value)
  return <span className={`${styles.metricState} ${styles[state] ?? ''}`}>{getPerformanceStateLabel(state)}</span>
}

function ReportSummary({ snapshot }) {
  const metrics = snapshot.metrics
  return (
    <div className={styles.summaryGrid} aria-label="Weekly report summary">
      <article className={styles.summaryCard}>
        <span>Overall health</span>
        <strong>{snapshot.projectHealth.label}</strong>
        <HealthBadge status={snapshot.projectHealth.status} label={snapshot.projectHealth.label} />
      </article>
      <article className={styles.summaryCard}>
        <span>SPI</span>
        <strong>{formatIndex(metrics.spi)}</strong>
        <MetricState value={metrics.spi} />
      </article>
      <article className={styles.summaryCard}>
        <span>CPI</span>
        <strong>{formatIndex(metrics.cpi)}</strong>
        <MetricState value={metrics.cpi} />
      </article>
      <article className={styles.summaryCard}>
        <span>Open risks</span>
        <strong>{snapshot.risks.totalOpen}</strong>
        <small>{snapshot.risks.critical} critical · {snapshot.risks.high} high</small>
      </article>
    </div>
  )
}

function CollapsibleSection({ id, icon, title, meta, open, onToggle, children, className = '' }) {
  return (
    <section className={`${styles.collapsibleSection} ${open ? styles.expandedSection : ''} ${className}`}>
      <button
        className={styles.collapsibleTrigger}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={onToggle}
      >
        <span className={styles.sectionIcon}><SectionIcon name={icon} /></span>
        <span className={styles.collapsibleTitle}>{title}</span>
        <span className={styles.collapsibleMeta}>{meta}</span>
        <svg className={styles.collapseChevron} viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>
      </button>
      <div id={`${id}-body`} className={`${styles.collapsibleBody} ${open ? styles.collapsibleBodyOpen : ''}`}>
        {children}
      </div>
    </section>
  )
}

function DerivedSections({
  snapshot,
  baseline,
  readOnly,
  dismissedSignalIds,
  onDismissSignal,
  onRestoreSignals,
}) {
  const [openSections, setOpenSections] = useState({})
  const metrics = snapshot.metrics
  const visibleSignals = getVisibleAttentionSignals(snapshot, dismissedSignalIds)

  const toggle = (key) => setOpenSections((current) => ({ ...current, [key]: !current[key] }))

  return (
    <div className={styles.derivedStack}>
      <CollapsibleSection id="report-risks" icon="risk" title="Key Risks" meta={`${snapshot.risks.totalOpen} open`} open={Boolean(openSections.risks)} onToggle={() => toggle('risks')}>
        {snapshot.risks.items.length ? (
          <div className={styles.compactRows}>
            {snapshot.risks.items.map((risk) => (
              <div className={styles.compactRow} key={risk.id}>
                <div><strong>{risk.title}</strong><span>{risk.owner || 'Unassigned'} · Due {formatDate(risk.dueDate)}</span></div>
                <span className={`${styles.toneBadge} ${styles[risk.severity] ?? ''}`}>{getRiskSeverityLabel(risk.severity)} · {risk.score}</span>
              </div>
            ))}
          </div>
        ) : <EmptyList>No operational risks captured.</EmptyList>}
      </CollapsibleSection>

      <CollapsibleSection id="report-milestones" icon="milestone" title="Milestones" meta={`${snapshot.milestones.completed}/${snapshot.milestones.total} complete`} open={Boolean(openSections.milestones)} onToggle={() => toggle('milestones')}>
        {snapshot.milestones.items.length ? (
          <div className={styles.compactRows}>
            {snapshot.milestones.items.map((milestone) => (
              <div className={styles.compactRow} key={milestone.id}>
                <div><strong>{milestone.title}</strong><span>Target {formatDate(milestone.targetDate)} · {milestone.progress}%</span></div>
                <span className={`${styles.toneBadge} ${styles[milestone.scheduleState] ?? ''}`}>{getMilestoneScheduleLabel(milestone.scheduleState)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyList>No overdue or near-term milestones.</EmptyList>}
      </CollapsibleSection>

      <CollapsibleSection id="report-success" icon="target" title="Success Criteria" meta={`${snapshot.successCriteria.atRisk + snapshot.successCriteria.missed} need attention`} open={Boolean(openSections.successCriteria)} onToggle={() => toggle('successCriteria')}>
        {snapshot.successCriteria.items.length ? (
          <div className={styles.compactRows}>
            {snapshot.successCriteria.items.map((criterion) => (
              <div className={styles.compactRow} key={criterion.id}>
                <div><strong>{criterion.title}</strong><span>{formatCriterionValue(criterion.currentValue, criterion.unit)} / target {formatCriterionValue(criterion.target, criterion.unit)}</span></div>
                <span className={`${styles.toneBadge} ${styles[criterion.status] ?? ''}`}>{getSuccessCriterionStatusLabel(criterion.status)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyList>No Success Criteria captured.</EmptyList>}
      </CollapsibleSection>

      <CollapsibleSection id="report-upcoming" icon="calendar" title="Upcoming" meta={`${snapshot.upcomingItems.length} items · next 7 days`} open={Boolean(openSections.upcoming)} onToggle={() => toggle('upcoming')}>
        {snapshot.upcomingItems.length ? (
          <div className={styles.compactRows}>
            {snapshot.upcomingItems.map((item) => (
              <div className={styles.compactRow} key={item.id}>
                <div><strong>{item.title}</strong><span>{item.type}{item.owner ? ` · ${item.owner}` : ''}</span></div>
                <span className={styles.dateBadge}>{formatDate(item.date, { includeYear: false })}</span>
              </div>
            ))}
          </div>
        ) : <EmptyList>No actions or milestones due in the next 7 days.</EmptyList>}
      </CollapsibleSection>

      <CollapsibleSection id="report-signals" icon="pulse" title="Needs Attention" meta={`${visibleSignals.length} signals`} open={Boolean(openSections.attention)} onToggle={() => toggle('attention')}>
        <div className={styles.signalSectionBody}>
          {!readOnly && dismissedSignalIds.length > 0 ? (
            <div className={styles.signalActions} data-print-hide="true">
              <span>{dismissedSignalIds.length} hidden from this report</span>
              <button className={styles.restoreHiddenButton} type="button" onClick={onRestoreSignals}>
                Restore hidden ({dismissedSignalIds.length})
              </button>
            </div>
          ) : null}
          {visibleSignals.length ? (
            <div className={styles.signalGrid}>
              {visibleSignals.map((signal) => (
                <article className={styles.signalCard} key={signal.id}>
                  {!readOnly ? (
                    <button
                      className={styles.dismissSignal}
                      type="button"
                      aria-label={`Hide ${signal.title} from this report`}
                      title="Hide from this report"
                      onClick={() => onDismissSignal(signal)}
                      data-print-hide="true"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                    </button>
                  ) : null}
                  <span>{signal.module}</span>
                  <strong>{signal.title}</strong>
                  <p>{signal.detail}</p>
                </article>
              ))}
            </div>
          ) : <EmptyList>No visible deterministic attention signals for this report.</EmptyList>}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="report-evm" icon="chart" title="Earned Value Snapshot" meta={metrics.asOf ? `As of ${formatDate(metrics.asOf)}` : 'Not available'} open={Boolean(openSections.evm)} onToggle={() => toggle('evm')} className={styles.evmStrip}>
        <div className={styles.evmValues}>
          <div><span>PV</span><strong>{formatEvmValue(metrics.pv, baseline)}</strong></div>
          <div><span>EV</span><strong>{formatEvmValue(metrics.ev, baseline)}</strong></div>
          <div><span>AC</span><strong>{formatEvmValue(metrics.ac, baseline)}</strong></div>
          <div><span>SPI</span><strong>{formatIndex(metrics.spi)}</strong></div>
          <div><span>CPI</span><strong>{formatIndex(metrics.cpi)}</strong></div>
        </div>
      </CollapsibleSection>
    </div>
  )
}

export function ReportDetailPage() {
  const { project } = useOutletContext()
  const { reportId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const projectId = project.id
  const isNew = !reportId
  const requestedPeriodEnd = searchParams.get('periodEnd') ?? ''
  const requestedPeriod = useMemo(() => isNew ? getReportPeriod(requestedPeriodEnd) : null, [isNew, requestedPeriodEnd])

  const reports = useAppSelector((state) => selectReportsByProject(state, projectId))
  const existingRequestedReport = isNew && requestedPeriod
    ? reports.find((report) => report.periodEnd === requestedPeriod.periodEnd) ?? null
    : null
  const storedReport = useAppSelector((state) => isNew ? null : selectReportById(state, reportId))
  const reportsStatus = useAppSelector(selectReportsStatus)
  const reportsError = useAppSelector(selectReportsError)
  const mutationStatus = useAppSelector(selectReportMutationStatus)
  const mutationError = useAppSelector(selectReportMutationError)
  const criteria = useAppSelector((state) => selectSuccessCriteriaByProject(state, projectId))
  const criteriaStatus = useAppSelector(selectSuccessCriteriaStatus)
  const risks = useAppSelector((state) => selectRisksByProject(state, projectId))
  const risksStatus = useAppSelector(selectRisksStatus)
  const milestones = useAppSelector((state) => selectMilestonesByProject(state, projectId))
  const milestonesStatus = useAppSelector(selectMilestonesStatus)
  const actions = useAppSelector((state) => selectManagementActionsByProject(state, projectId))
  const actionsStatus = useAppSelector(selectManagementActionsStatus)
  const baseline = useAppSelector((state) => selectEvmBaselineByProject(state, projectId))
  const evmSnapshots = useAppSelector((state) => selectEvmSnapshotsByProject(state, projectId))
  const evmStatus = useAppSelector(selectEvmStatus)

  const [stagedSnapshot, setStagedSnapshot] = useState(null)
  const [snapshotDirty, setSnapshotDirty] = useState(false)
  const [dismissedSignalIds, setDismissedSignalIds] = useState([])
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const [allowNavigation, setAllowNavigation] = useState(false)

  const projectArchived = Boolean(project.archivedAt)
  const mutationPending = mutationStatus === 'loading'
  const sourceStatuses = [criteriaStatus, risksStatus, milestonesStatus, actionsStatus, evmStatus]
  const sourcesReady = sourceStatuses.every((status) => status === 'succeeded')
  const sourcesFailed = sourceStatuses.some((status) => status === 'failed')

  const buildSnapshot = useCallback((periodEnd) => buildWeeklyReportSnapshot({
    projectId,
    periodEnd,
    criteria,
    risks,
    milestones,
    actions,
    baseline,
    evmSnapshots,
  }), [actions, baseline, criteria, evmSnapshots, milestones, projectId, risks])

  const newReportSeed = useMemo(() => {
    if (!isNew || !requestedPeriod || !sourcesReady || existingRequestedReport) return null
    const snapshot = buildSnapshot(requestedPeriod.periodEnd)
    return {
      id: null,
      projectId,
      ...requestedPeriod,
      status: REPORT_STATUS.DRAFT,
      narrative: {
        executiveSummary: '',
        achievements: [],
        issuesBlockers: [],
        managementAttention: [],
        nextWeekFocus: [],
      },
      snapshot,
      dismissedSignalIds: [],
      version: 0,
      owner: project.governance?.charter?.projectManager ?? '',
      createdAt: null,
      updatedAt: null,
      finalizedAt: null,
    }
  }, [buildSnapshot, existingRequestedReport, isNew, project.governance?.charter?.projectManager, projectId, requestedPeriod, sourcesReady])

  const activeReport = isNew ? newReportSeed : storedReport
  const currentSnapshot = stagedSnapshot ?? activeReport?.snapshot ?? null
  const finalized = activeReport?.status === REPORT_STATUS.FINAL
  const reportArchived = Boolean(activeReport?.archivedAt)
  const readOnly = projectArchived || finalized
  const draftKey = activeReport
    ? `weekly-report:${projectId}:${activeReport.id ?? `new:${activeReport.periodEnd}`}`
    : null

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    control,
    formState: { errors, isDirty: formDirty },
  } = useForm({
    defaultValues: reportFormValues(null, project),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const watched = useWatch({ control })
  const formValuesValid = reportFormIsValid(watched)

  const savedDismissedIds = Array.isArray(activeReport?.dismissedSignalIds) ? activeReport.dismissedSignalIds : []
  const dismissalDirty = JSON.stringify(dismissedSignalIds) !== JSON.stringify(savedDismissedIds)
  const isDirty = !readOnly && Boolean(activeReport) && (formDirty || snapshotDirty || dismissalDirty || isNew)
  const blocker = useBlocker(isDirty && !allowNavigation)

  const dashboardBaseline = useMemo(() => {
    if (!currentSnapshot?.metrics?.measurementBasis) return baseline
    return {
      measurementBasis: currentSnapshot.metrics.measurementBasis,
      currencyCode: currentSnapshot.metrics.currencyCode ?? baseline?.currencyCode ?? 'USD',
    }
  }, [baseline, currentSnapshot])

  useEffect(() => {
    if (reportsStatus === 'idle') dispatch(loadReports())
    if (criteriaStatus === 'idle') dispatch(loadSuccessCriteria())
    if (risksStatus === 'idle') dispatch(loadRisks())
    if (milestonesStatus === 'idle') dispatch(loadMilestones())
    if (actionsStatus === 'idle') dispatch(loadManagementActions())
    if (evmStatus === 'idle') dispatch(loadEvm())
  }, [actionsStatus, criteriaStatus, dispatch, evmStatus, milestonesStatus, reportsStatus, risksStatus])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!activeReport || !draftKey) return
    const recovered = !readOnly ? readDraft(draftKey) : null
    const recoveredPayload = recovered?.values

    if (recoveredPayload?.form) {
      reset(recoveredPayload.form)
      setStagedSnapshot(recoveredPayload.snapshot ?? null)
      setSnapshotDirty(Boolean(recoveredPayload.snapshotDirty))
      setDismissedSignalIds(Array.isArray(recoveredPayload.dismissedSignalIds) ? recoveredPayload.dismissedSignalIds : savedDismissedIds)
      setDraftRestored(true)
      return
    }

    reset(reportFormValues(activeReport, project))
    setDismissedSignalIds(savedDismissedIds)
    setDraftRestored(false)
  }, [activeReport?.id, activeReport?.updatedAt, draftKey, project, readOnly, reset]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!draftKey || !isDirty || readOnly || !currentSnapshot) return undefined
    const timeoutId = window.setTimeout(() => {
      formDraftService.write(draftKey, {
        form: watched,
        snapshot: currentSnapshot,
        snapshotDirty,
        dismissedSignalIds,
      })
    }, 400)
    return () => window.clearTimeout(timeoutId)
  }, [currentSnapshot, dismissedSignalIds, draftKey, isDirty, readOnly, snapshotDirty, watched])

  useEffect(() => {
    if (!draftKey || readOnly) return undefined
    const beforeUnload = () => {
      if (!isDirty || !currentSnapshot) return
      formDraftService.write(draftKey, {
        form: getValues(),
        snapshot: currentSnapshot,
        snapshotDirty,
        dismissedSignalIds,
      })
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [currentSnapshot, dismissedSignalIds, draftKey, getValues, isDirty, readOnly, snapshotDirty])

  const clearLocalDraft = () => {
    if (draftKey) formDraftService.remove(draftKey)
    setDraftRestored(false)
  }

  const retrySources = () => {
    dispatch(loadSuccessCriteria())
    dispatch(loadRisks())
    dispatch(loadMilestones())
    dispatch(loadManagementActions())
    dispatch(loadEvm())
  }

  const save = handleSubmit(async (values) => {
    if (!activeReport || !currentSnapshot || readOnly) return
    const input = {
      projectId,
      periodEnd: activeReport.periodEnd,
      owner: values.owner.trim(),
      narrative: formToNarrative(values),
      snapshot: currentSnapshot,
      dismissedSignalIds,
    }

    try {
      const saved = activeReport.id
        ? await dispatch(updateReport({ reportId: activeReport.id, input })).unwrap()
        : await dispatch(createReport(input)).unwrap()

      clearLocalDraft()
      setStagedSnapshot(null)
      setSnapshotDirty(false)
      setDismissedSignalIds(saved.dismissedSignalIds ?? [])
      reset(reportFormValues(saved, project))
      setToast({ message: `Weekly report saved · Version ${saved.version}`, variant: 'success' })

      if (!activeReport.id) {
        setAllowNavigation(true)
        window.setTimeout(() => navigate(`/projects/${projectId}/reports/${saved.id}`, { replace: true }), 0)
      }
    } catch (error) {
      setToast({ message: String(error || 'Unable to save weekly report.'), variant: 'error', icon: 'alert' })
    }
  })

  const refreshSnapshot = () => {
    if (!activeReport || readOnly || !sourcesReady) return
    setStagedSnapshot(buildSnapshot(activeReport.periodEnd))
    setSnapshotDirty(true)
    setToast({ message: 'Project data refreshed — save to keep the new snapshot.', variant: 'info', icon: 'refresh' })
  }

  const dismissSignal = (signal) => {
    setDismissedSignalIds((current) => current.includes(signal.id) ? current : [...current, signal.id])
    setToast({
      message: 'Signal hidden from this report',
      variant: 'info',
      actionLabel: 'Undo',
      onAction: () => setDismissedSignalIds((current) => current.filter((id) => id !== signal.id)),
    })
  }

  const restoreHiddenSignals = () => {
    if (readOnly || dismissedSignalIds.length === 0) return
    setDismissedSignalIds([])
    setToast({ message: 'Hidden control signals restored — save to keep the change.', variant: 'info', icon: 'refresh' })
  }

  const discardRecoveredDraft = () => {
    clearLocalDraft()
    setStagedSnapshot(isNew ? activeReport?.snapshot ?? null : null)
    setSnapshotDirty(Boolean(isNew))
    setDismissedSignalIds(savedDismissedIds)
    reset(reportFormValues(activeReport, project))
    setDialog(null)
  }

  const confirmFinalize = async () => {
    if (!activeReport?.id || readOnly || isDirty || !formValuesValid) return
    try {
      const finalizedReport = await dispatch(finalizeReport(activeReport.id)).unwrap()
      clearLocalDraft()
      setDialog(null)
      setDismissedSignalIds(finalizedReport.dismissedSignalIds ?? [])
      reset(reportFormValues(finalizedReport, project))
      setToast({ message: `Weekly report finalized · Version ${finalizedReport.version}`, variant: 'success' })
    } catch (error) {
      setDialog(null)
      setToast({ message: String(error || 'Unable to finalize weekly report.'), variant: 'error', icon: 'alert' })
    }
  }

  const confirmReopen = async () => {
    if (!activeReport?.id || activeReport.status !== REPORT_STATUS.FINAL || projectArchived || reportArchived) return
    try {
      const reopenedReport = await dispatch(reopenReport(activeReport.id)).unwrap()
      clearLocalDraft()
      setStagedSnapshot(null)
      setSnapshotDirty(false)
      setDismissedSignalIds(reopenedReport.dismissedSignalIds ?? [])
      reset(reportFormValues(reopenedReport, project))
      setDialog(null)
      setToast({ message: `Weekly report reopened for correction · Version ${reopenedReport.version}`, variant: 'success' })
    } catch (error) {
      setDialog(null)
      setToast({ message: String(error || 'Unable to reopen weekly report.'), variant: 'error', icon: 'alert' })
    }
  }

  const confirmArchive = async () => {
    if (!activeReport?.id || activeReport.status !== REPORT_STATUS.FINAL || projectArchived || reportArchived) return
    try {
      const archivedReport = await dispatch(archiveReport(activeReport.id)).unwrap()
      setDialog(null)
      setToast({ message: 'Weekly report archived.', variant: 'success' })
      reset(reportFormValues(archivedReport, project))
    } catch (error) {
      setDialog(null)
      setToast({ message: String(error || 'Unable to archive weekly report.'), variant: 'error', icon: 'alert' })
    }
  }

  const restoreArchived = async () => {
    if (!activeReport?.id || !reportArchived || projectArchived) return
    try {
      const restoredReport = await dispatch(restoreReport(activeReport.id)).unwrap()
      setToast({ message: 'Weekly report restored to Current.', variant: 'success' })
      reset(reportFormValues(restoredReport, project))
    } catch (error) {
      setToast({ message: String(error || 'Unable to restore weekly report.'), variant: 'error', icon: 'alert' })
    }
  }

  const confirmDelete = async () => {
    if (!activeReport?.id || activeReport.status !== REPORT_STATUS.DRAFT || projectArchived) return
    try {
      await dispatch(deleteReport(activeReport.id)).unwrap()
      clearLocalDraft()
      setDialog(null)
      setAllowNavigation(true)
      window.setTimeout(() => navigate(`/projects/${projectId}/reports`, { replace: true }), 0)
    } catch (error) {
      setDialog(null)
      setToast({ message: String(error || 'Unable to delete weekly report.'), variant: 'error', icon: 'alert' })
    }
  }

  const discardNewReport = () => {
    clearLocalDraft()
    setDialog(null)
    setAllowNavigation(true)
    window.setTimeout(() => navigate(`/projects/${projectId}/reports`, { replace: true }), 0)
  }

  if (reportsStatus === 'idle' || reportsStatus === 'loading') {
    return <div className={styles.stateCard}>Loading weekly report…</div>
  }

  if (reportsStatus === 'failed') {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Weekly report could not be loaded.</strong>
        <span>{reportsError}</span>
        <button type="button" onClick={() => dispatch(loadReports())}>Try again</button>
      </div>
    )
  }

  if (isNew && !requestedPeriod) {
    return (
      <div className={styles.stateCard}>
        <strong>Choose a valid reporting period.</strong>
        <span>Create a weekly report from the Reports index.</span>
        <Link to={`/projects/${projectId}/reports`}>Return to reports</Link>
      </div>
    )
  }

  if (isNew && reportsStatus === 'succeeded' && existingRequestedReport) {
    const existingFinal = existingRequestedReport.status === REPORT_STATUS.FINAL
    const existingArchived = Boolean(existingRequestedReport.archivedAt)
    return (
      <div className={styles.stateCard}>
        <strong>{existingArchived ? 'Archived Final report already exists.' : existingFinal ? 'Final report already exists.' : 'Draft report already exists.'}</strong>
        <span>HelmSight keeps one weekly report per Week ending date. Open the existing report instead of creating a duplicate.</span>
        <button type="button" onClick={() => navigate(`/projects/${projectId}/reports/${existingRequestedReport.id}`, { replace: true })}>
          {existingArchived ? 'View archived report' : existingFinal ? 'View existing report' : 'Continue draft'}
        </button>
      </div>
    )
  }

  if (!isNew && (!storedReport || storedReport.projectId !== projectId)) {
    return (
      <div className={styles.stateCard}>
        <strong>Weekly report not found.</strong>
        <span>The requested report is not available for this project.</span>
        <Link to={`/projects/${projectId}/reports`}>Return to reports</Link>
      </div>
    )
  }

  if (isNew && sourcesFailed) {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Project data could not be loaded.</strong>
        <span>A new report needs current canonical project data before its snapshot can be created.</span>
        <button type="button" onClick={retrySources}>Retry source data</button>
      </div>
    )
  }

  if (isNew && (!sourcesReady || !activeReport || !currentSnapshot)) {
    return <div className={styles.stateCard}>Preparing weekly report snapshot…</div>
  }

  if (!activeReport || !currentSnapshot) {
    return <div className={styles.stateCard}>Loading weekly report snapshot…</div>
  }

  return (
    <section className={styles.root} data-report-root="true">
      <StatusToast
        message={toast?.message}
        variant={toast?.variant}
        icon={toast?.icon}
        actionLabel={toast?.actionLabel}
        onAction={toast?.onAction}
        duration={toast?.actionLabel ? 5000 : 3000}
        onDismiss={() => setToast(null)}
      />

      <div className={styles.detailTopline} data-print-hide="true">
        <Link className={styles.backToReports} to={`/projects/${projectId}/reports`}>Weekly Status Reports</Link>
      </div>

      {projectArchived ? (
        <div className={styles.archiveBanner} data-print-hide="true">
          <strong>Archived project</strong>
          <span>This report is read-only. You can still review and print it.</span>
        </div>
      ) : null}

      {reportArchived ? (
        <div className={styles.archiveBanner} data-print-hide="true">
          <strong>Archived report</strong>
          <span>This Final report is hidden from Current history. Restore it before reopening it for correction.</span>
        </div>
      ) : null}

      {draftRestored && !readOnly ? (
        <div className={styles.draftNotice} role="status" data-print-hide="true">
          <div><strong>Draft restored</strong><span>Your unsaved weekly report changes were recovered from this browser.</span></div>
          <button type="button" onClick={() => setDialog({ type: 'discardRecovered' })}>Discard recovered draft</button>
        </div>
      ) : null}

      {sourcesFailed && !readOnly ? (
        <div className={styles.sourceWarning} role="alert" data-print-hide="true">
          <div><strong>Some project data could not be loaded.</strong><span>The saved snapshot remains available, but Refresh project data is disabled until source modules recover.</span></div>
          <button type="button" onClick={retrySources}>Retry source data</button>
        </div>
      ) : null}

      <article className={styles.reportDocument}>
        <div className={styles.printMasthead} aria-hidden="true">
          <span>HelmSight</span>
          <strong>Weekly Status Report</strong>
        </div>

        <header className={styles.reportHeader}>
          <div>
            <span className={styles.eyebrow}>Weekly Status Report</span>
            <h2>{project.name}</h2>
            <p>{formatDate(activeReport.periodStart)} – {formatDate(activeReport.periodEnd)}</p>
          </div>
          <div className={styles.reportHeaderMeta}>
            <span className={`${styles.statusBadge} ${reportArchived ? styles.archived : finalized ? styles.final : styles.draft}`}>
              {reportArchived ? 'Archived' : finalized ? 'Final' : 'Draft'}
            </span>
            <span>{reportArchived ? 'Final · ' : ''}{activeReport.version ? `Version ${activeReport.version}` : 'Not saved'}</span>
            {!readOnly ? <span className={styles.reportHelpSlot}><ReportHelp /></span> : null}
          </div>
        </header>

        <div className={styles.toolbar} data-print-hide="true">
          <div className={styles.toolbarStatus}>
            <span>Snapshot {formatTimestamp(currentSnapshot.capturedAt)}</span>
            {snapshotDirty ? <strong>Refreshed · unsaved</strong> : null}
            {isDirty && !snapshotDirty ? <strong>Unsaved changes</strong> : null}
          </div>
          <div className={styles.toolbarActions}>
            {!readOnly ? <ReportButton icon="refresh" disabled={!sourcesReady || mutationPending} onClick={refreshSnapshot}>Refresh project data</ReportButton> : null}
            <ReportButton icon="print" onClick={() => window.print()} title="Open the system print dialog; you can print or save as PDF.">Print report</ReportButton>
            {reportArchived && !projectArchived ? <ReportButton icon="restore" disabled={mutationPending} onClick={restoreArchived}>Restore report</ReportButton> : null}
            {finalized && !reportArchived && !projectArchived ? <ReportButton icon="archive" disabled={mutationPending} onClick={() => setDialog({ type: 'archive' })}>Archive</ReportButton> : null}
            {finalized && !reportArchived && !projectArchived ? <ReportButton icon="reopen" disabled={mutationPending} onClick={() => setDialog({ type: 'reopen' })}>Reopen for correction</ReportButton> : null}
            {!readOnly && activeReport.id ? <ReportButton icon="trash" variant="danger" className={styles.deleteAction} disabled={mutationPending} onClick={() => setDialog({ type: 'delete' })}>Delete draft</ReportButton> : null}
            {!readOnly && activeReport.id ? (
              <ReportButton icon="final" disabled={isDirty || !formValuesValid || mutationPending} onClick={() => setDialog({ type: 'finalize' })} title={isDirty ? 'Save changes before finalizing.' : !formValuesValid ? 'Complete the required fields before finalizing.' : undefined}>Mark as Final</ReportButton>
            ) : null}
            {!readOnly ? <ReportButton icon="save" variant="primary" className={styles.primaryAction} disabled={!isDirty || !formValuesValid || mutationPending} onClick={save}>{mutationPending ? 'Saving…' : 'Save'}</ReportButton> : null}
          </div>
        </div>

        <ReportSummary snapshot={currentSnapshot} />

        <form className={styles.reportForm} onSubmit={save} noValidate>
          <section className={`${styles.reportSection} ${styles.fullWidthSection}`}>
            <div className={styles.sectionHeading}>
              <div><span className={styles.eyebrow}>Manager narrative</span><h3>Executive Summary</h3></div>
            </div>
            {readOnly ? (
              <p className={styles.narrativeParagraph}>{activeReport.narrative.executiveSummary}</p>
            ) : (
              <label className={styles.field}>
                <span>Executive Summary <b aria-hidden="true">*</b></span>
                <ResponsiveNarrativeTextarea
                  rows="4"
                  aria-required="true"
                  aria-invalid={Boolean(errors.executiveSummary)}
                  contentValue={watched?.executiveSummary}
                  registration={register('executiveSummary', {
                    validate: (value) => {
                      const normalized = String(value ?? '').trim()
                      if (!normalized) return 'Executive Summary is required.'
                      if (normalized.length < MIN_TEXT_LENGTH) return `Use at least ${MIN_TEXT_LENGTH} characters.`
                      if (normalized.length > MAX_EXECUTIVE_SUMMARY) return `Use ${MAX_EXECUTIVE_SUMMARY.toLocaleString('en-US')} characters or fewer.`
                      return true
                    },
                  })}
                />
                <span className={styles.fieldMeta}>Explain current delivery health, the material change this week, and the management implication.</span>
                {errors.executiveSummary ? <small className={styles.fieldError}>{errors.executiveSummary.message}</small> : null}
              </label>
            )}
            {!readOnly ? <div className={styles.printOnly}><p className={styles.narrativeParagraph}>{watched?.executiveSummary || '—'}</p></div> : null}
          </section>

          <div className={styles.narrativeGrid}>
            {[
              ['achievements', 'Achievements', 'What was completed, approved, or materially advanced.'],
              ['issuesBlockers', 'Issues / Blockers', 'Current issues that need explanation but are not a duplicate Risk Register.'],
              ['managementAttention', 'Management Attention Required', 'Decisions, escalation, or sponsor attention required.'],
              ['nextWeekFocus', 'Next Week Focus', 'The management priorities for the next reporting period.'],
            ].map(([name, label, hint]) => (
              <section className={styles.reportSection} key={name}>
                <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Narrative</span><h3>{label}</h3></div></div>
                {readOnly ? (
                  <NarrativeList value={activeReport.narrative[name]} />
                ) : (
                  <label className={styles.field}>
                    <span>{label}</span>
                    <ResponsiveNarrativeTextarea
                      rows="4"
                      aria-invalid={Boolean(errors[name])}
                      contentValue={watched?.[name]}
                      registration={register(name, { validate: validateListText })}
                    />
                    <span className={styles.fieldMeta}>{hint} One item per line · max {MAX_NARRATIVE_ITEM} characters per item.</span>
                    {errors[name] ? <small className={styles.fieldError}>{errors[name].message}</small> : null}
                  </label>
                )}
                {!readOnly ? <div className={styles.printOnly}><NarrativeList value={watched?.[name]} /></div> : null}
              </section>
            ))}
          </div>

          <DerivedSections
            snapshot={currentSnapshot}
            baseline={dashboardBaseline}
            readOnly={readOnly}
            dismissedSignalIds={dismissedSignalIds}
            onDismissSignal={dismissSignal}
            onRestoreSignals={restoreHiddenSignals}
          />

          <section className={`${styles.reportSection} ${styles.documentControl}`}>
            <div>
              <span className={styles.eyebrow}>Document control</span>
              <h3>Report metadata</h3>
            </div>
            <div className={styles.documentMetaGrid}>
              <div><span>Version</span><strong>{activeReport.version || 'Not saved'}</strong></div>
              <div><span>Status</span><strong>{finalized ? 'Final' : 'Draft'}</strong></div>
              <div>
                <span>Owner {!readOnly ? <b aria-hidden="true">*</b> : null}</span>
                {readOnly ? <strong>{activeReport.owner || 'Not assigned'}</strong> : (
                  <label className={styles.ownerField}>
                    <input
                      type="text"
                      aria-label="Report owner"
                      aria-required="true"
                      aria-invalid={Boolean(errors.owner)}
                      {...register('owner', {
                        validate: (value) => {
                          const normalized = String(value ?? '').trim()
                          if (!normalized) return 'Report owner is required.'
                          if (normalized.length < MIN_TEXT_LENGTH) return `Use at least ${MIN_TEXT_LENGTH} characters.`
                          if (normalized.length > MAX_OWNER) return `Use ${MAX_OWNER} characters or fewer.`
                          return true
                        },
                      })}
                    />
                    {errors.owner ? <small className={styles.fieldError}>{errors.owner.message}</small> : null}
                  </label>
                )}
                {!readOnly ? <strong className={styles.printOnly}>{watched?.owner || 'Not assigned'}</strong> : null}
              </div>
              <div><span>Updated</span><strong>{formatTimestamp(activeReport.updatedAt)}</strong></div>
            </div>
          </section>

          {!readOnly && isNew ? (
            <div className={styles.footerActions} data-print-hide="true">
              <button className={styles.secondaryButton} data-ui-button="secondary" type="button" onClick={() => setDialog({ type: 'discardNew' })}>Discard new report</button>
              <ReportButton icon="save" variant="primary" className={styles.primaryAction} disabled={!isDirty || !formValuesValid || mutationPending} onClick={save}>{mutationPending ? 'Saving…' : 'Save report'}</ReportButton>
            </div>
          ) : null}
        </form>

        {mutationStatus === 'failed' && mutationError ? <div className={styles.mutationError} role="alert" data-print-hide="true">{mutationError}</div> : null}
      </article>

      <ConfirmDialog
        isOpen={dialog?.type === 'delete'}
        eyebrow="Weekly Status Report"
        title="Delete weekly report?"
        message={`Delete the draft for ${formatDate(activeReport.periodStart)} – ${formatDate(activeReport.periodEnd)}? This action cannot be undone.`}
        confirmLabel={mutationPending ? 'Deleting…' : 'Delete report'}
        cancelLabel="Keep report"
        confirmTone="danger"
        icon="trash"
        onCancel={() => setDialog(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        isOpen={dialog?.type === 'finalize'}
        eyebrow="Weekly Status Report"
        title="Finalize weekly report?"
        message="The report will become read-only. If a last-minute correction is needed, you can explicitly reopen this same report for correction."
        confirmLabel={mutationPending ? 'Finalizing…' : 'Mark as Final'}
        cancelLabel="Keep Draft"
        confirmTone="primary"
        icon="finalize"
        onCancel={() => setDialog(null)}
        onConfirm={confirmFinalize}
      />

      <ConfirmDialog
        isOpen={dialog?.type === 'reopen'}
        eyebrow="Weekly Status Report"
        title="Reopen weekly report for correction?"
        message="The Final report will become an editable Draft again. P0 keeps only the current revision, so the previously finalized revision cannot be restored after corrections are saved."
        confirmLabel={mutationPending ? 'Reopening…' : 'Reopen for correction'}
        cancelLabel="Keep Final"
        confirmTone="primary"
        icon="reopen"
        onCancel={() => setDialog(null)}
        onConfirm={confirmReopen}
      />

      <ConfirmDialog
        isOpen={dialog?.type === 'archive'}
        eyebrow="Weekly Status Report"
        title="Archive weekly report?"
        message="The Final report will be removed from Current history but kept as a read-only historical record. You can restore it later from Archived."
        confirmLabel={mutationPending ? 'Archiving…' : 'Archive report'}
        cancelLabel="Keep Current"
        confirmTone="primary"
        icon="archive"
        onCancel={() => setDialog(null)}
        onConfirm={confirmArchive}
      />

      <ConfirmDialog
        isOpen={dialog?.type === 'discardNew'}
        title="Discard new weekly report?"
        message="The unsaved report, narrative, and project snapshot will be discarded."
        confirmLabel="Discard report"
        cancelLabel="Keep editing"
        icon="warning"
        onCancel={() => setDialog(null)}
        onConfirm={discardNewReport}
      />

      <ConfirmDialog
        isOpen={dialog?.type === 'discardRecovered'}
        title="Discard recovered draft?"
        message="Recovered unsaved weekly report changes will be removed and the report will return to its saved state."
        confirmLabel="Discard draft"
        cancelLabel="Keep draft"
        icon="warning"
        onCancel={() => setDialog(null)}
        onConfirm={discardRecoveredDraft}
      />

      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title="Leave without saving?"
        message="You have unsaved weekly report changes. Leaving this page will discard them."
        confirmLabel="Leave page"
        cancelLabel="Keep editing"
        icon="warning"
        onCancel={() => blocker.state === 'blocked' && blocker.reset()}
        onConfirm={() => {
          clearLocalDraft()
          setAllowNavigation(true)
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </section>
  )
}
