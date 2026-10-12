import { isValidCalendarDate } from '../../../shared/lib/calendarDate.js'
import { buildProjectDashboard } from '../../dashboard/lib/projectDashboard.js'
import { calculateEvmMetrics, sortSnapshotsByDate } from '../../evm/lib/evm.js'
import {
  getMilestoneScheduleState,
  MILESTONE_SCHEDULE_STATE,
  sortMilestonesByTargetDate,
} from '../../milestones/lib/milestones.js'
import { isRiskOperational, RISK_SEVERITY } from '../../risks/lib/risks.js'
import {
  evaluateSuccessCriterion,
  SUCCESS_CRITERIA_STATUS,
} from '../../successCriteria/lib/successCriteria.js'

export const REPORT_STATUS = Object.freeze({
  DRAFT: 'draft',
  FINAL: 'final',
})

const RISK_WEIGHT = Object.freeze({
  [RISK_SEVERITY.CRITICAL]: 0,
  [RISK_SEVERITY.HIGH]: 1,
  [RISK_SEVERITY.MEDIUM]: 2,
  [RISK_SEVERITY.LOW]: 3,
})

const CRITERION_WEIGHT = Object.freeze({
  [SUCCESS_CRITERIA_STATUS.MISSED]: 0,
  [SUCCESS_CRITERIA_STATUS.AT_RISK]: 1,
  [SUCCESS_CRITERIA_STATUS.ON_TRACK]: 2,
  [SUCCESS_CRITERIA_STATUS.ACHIEVED]: 3,
})

function parseDateKey(value) {
  if (!isValidCalendarDate(value)) return null

  return new Date(`${value}T00:00:00`)
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isDateWithin(value, start, end) {
  if (!value) return false
  const date = parseDateKey(value)
  return Boolean(date && date >= start && date <= end)
}

function cloneSignal(signal) {
  return {
    id: signal.id,
    module: signal.module,
    title: signal.title,
    detail: signal.detail,
    state: signal.state,
    date: signal.date,
  }
}

export function getReportPeriod(periodEnd) {
  const end = parseDateKey(periodEnd)
  if (!end) return null

  return {
    periodStart: toDateKey(addDays(end, -6)),
    periodEnd: toDateKey(end),
  }
}


export function getVisibleAttentionSignals(snapshot, dismissedSignalIds = []) {
  const dismissed = new Set(Array.isArray(dismissedSignalIds) ? dismissedSignalIds : [])
  const signals = Array.isArray(snapshot?.attentionSignals) ? snapshot.attentionSignals : []
  return signals.filter((signal) => !dismissed.has(signal.id))
}

export function sortReportsByPeriod(reports) {
  return [...reports].sort((left, right) => {
    const periodDifference = right.periodEnd.localeCompare(left.periodEnd)
    if (periodDifference !== 0) return periodDifference
    return String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
  })
}

export function buildWeeklyReportSnapshot({
  projectId,
  periodEnd,
  criteria = [],
  risks = [],
  milestones = [],
  actions = [],
  baseline = null,
  evmSnapshots = [],
  capturedAt = new Date().toISOString(),
}) {
  const endDate = parseDateKey(periodEnd)
  if (!projectId || !endDate) {
    throw new Error('Project and a valid reporting period are required to build a report snapshot.')
  }

  const projectCriteria = criteria.filter((item) => item.projectId === projectId)
  const projectRisks = risks.filter((item) => item.projectId === projectId)
  const projectMilestones = milestones.filter((item) => item.projectId === projectId)
  const projectActions = actions.filter((item) => item.projectId === projectId)
  const projectBaseline = baseline?.projectId === projectId ? baseline : null
  const eligibleSnapshots = sortSnapshotsByDate(
    evmSnapshots.filter(
      (item) => item.projectId === projectId && item.snapshotDate <= periodEnd,
    ),
  )
  const latestMetricSnapshot = eligibleSnapshots.at(-1) ?? null

  const dashboard = buildProjectDashboard({
    criteria: projectCriteria,
    risks: projectRisks,
    milestones: projectMilestones,
    actions: projectActions,
    baseline: projectBaseline,
    snapshots: eligibleSnapshots,
    today: endDate,
  })

  const evmMetrics = projectBaseline && latestMetricSnapshot
    ? calculateEvmMetrics(projectBaseline, eligibleSnapshots, latestMetricSnapshot.snapshotDate)
    : null

  const operationalRisks = projectRisks
    .filter(isRiskOperational)
    .sort((left, right) => {
      const severityDifference = (RISK_WEIGHT[left.severity] ?? 9) - (RISK_WEIGHT[right.severity] ?? 9)
      if (severityDifference !== 0) return severityDifference
      const scoreDifference = Number(right.score ?? 0) - Number(left.score ?? 0)
      if (scoreDifference !== 0) return scoreDifference
      return String(left.dueDate ?? '9999-12-31').localeCompare(String(right.dueDate ?? '9999-12-31'))
    })

  const milestoneItems = sortMilestonesByTargetDate(projectMilestones).filter((milestone) => {
    if (milestone.status === 'completed') return false
    const state = getMilestoneScheduleState(milestone, endDate, 14)
    return state === MILESTONE_SCHEDULE_STATE.OVERDUE || state === MILESTONE_SCHEDULE_STATE.DUE_SOON
  })

  const criterionItems = projectCriteria
    .map((criterion) => ({
      id: criterion.id,
      title: criterion.title,
      targetDate: criterion.targetDate,
      currentValue: criterion.currentValue,
      target: criterion.target,
      unit: criterion.unit,
      status: evaluateSuccessCriterion(criterion, endDate),
    }))
    .sort((left, right) => {
      const statusDifference = (CRITERION_WEIGHT[left.status] ?? 9) - (CRITERION_WEIGHT[right.status] ?? 9)
      if (statusDifference !== 0) return statusDifference
      return String(left.targetDate ?? '9999-12-31').localeCompare(String(right.targetDate ?? '9999-12-31'))
    })

  const nextDay = addDays(endDate, 1)
  const upcomingEnd = addDays(endDate, 7)
  const upcomingItems = [
    ...projectActions
      .filter((action) => action.status !== 'done' && isDateWithin(action.dueDate, nextDay, upcomingEnd))
      .map((action) => ({
        id: `action:${action.id}`,
        type: 'Action',
        title: action.title,
        owner: action.owner,
        date: action.dueDate,
        state: action.priority,
      })),
    ...projectMilestones
      .filter((milestone) => milestone.status !== 'completed' && isDateWithin(milestone.targetDate, nextDay, upcomingEnd))
      .map((milestone) => ({
        id: `milestone:${milestone.id}`,
        type: 'Milestone',
        title: milestone.title,
        owner: null,
        date: milestone.targetDate,
        state: milestone.status,
      })),
  ].sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title))

  const successCounts = criterionItems.reduce(
    (summary, item) => {
      summary[item.status] += 1
      return summary
    },
    {
      [SUCCESS_CRITERIA_STATUS.ON_TRACK]: 0,
      [SUCCESS_CRITERIA_STATUS.AT_RISK]: 0,
      [SUCCESS_CRITERIA_STATUS.ACHIEVED]: 0,
      [SUCCESS_CRITERIA_STATUS.MISSED]: 0,
    },
  )

  return {
    capturedAt,
    projectHealth: {
      status: dashboard.health,
      label: dashboard.healthLabel,
      reasons: dashboard.needsAttention.slice(0, 3).map((item) => item.title),
    },
    metrics: {
      asOf: evmMetrics?.snapshotDate ?? null,
      measurementBasis: projectBaseline?.measurementBasis ?? null,
      currencyCode: projectBaseline?.measurementBasis === 'currency'
        ? projectBaseline.currencyCode ?? 'USD'
        : null,
      pv: evmMetrics?.pv ?? null,
      ev: evmMetrics?.ev ?? null,
      ac: evmMetrics?.ac ?? null,
      spi: evmMetrics?.spi ?? null,
      cpi: evmMetrics?.cpi ?? null,
    },
    risks: {
      totalOpen: operationalRisks.length,
      high: operationalRisks.filter((item) => item.severity === RISK_SEVERITY.HIGH).length,
      critical: operationalRisks.filter((item) => item.severity === RISK_SEVERITY.CRITICAL).length,
      items: operationalRisks.slice(0, 5).map((risk) => ({
        id: risk.id,
        title: risk.title,
        owner: risk.owner,
        dueDate: risk.dueDate,
        score: risk.score,
        severity: risk.severity,
        status: risk.status,
      })),
    },
    milestones: {
      total: projectMilestones.length,
      completed: projectMilestones.filter((item) => item.status === 'completed').length,
      overdue: projectMilestones.filter(
        (item) => getMilestoneScheduleState(item, endDate) === MILESTONE_SCHEDULE_STATE.OVERDUE,
      ).length,
      items: milestoneItems.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        targetDate: milestone.targetDate,
        status: milestone.status,
        progress: milestone.progress,
        scheduleState: getMilestoneScheduleState(milestone, endDate, 14),
      })),
    },
    successCriteria: {
      onTrack: successCounts[SUCCESS_CRITERIA_STATUS.ON_TRACK],
      atRisk: successCounts[SUCCESS_CRITERIA_STATUS.AT_RISK],
      achieved: successCounts[SUCCESS_CRITERIA_STATUS.ACHIEVED],
      missed: successCounts[SUCCESS_CRITERIA_STATUS.MISSED],
      items: criterionItems.slice(0, 5),
    },
    upcomingItems,
    attentionSignals: dashboard.needsAttention.slice(0, 6).map(cloneSignal),
  }
}
