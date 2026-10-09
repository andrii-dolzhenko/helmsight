import {
  evaluateSuccessCriterion,
  SUCCESS_CRITERIA_STATUS,
} from '../../successCriteria/lib/successCriteria.js'
import {
  isRiskDueSoon,
  isRiskOperational,
  isRiskOverdue,
  RISK_SEVERITY,
} from '../../risks/lib/risks.js'
import {
  getMilestoneScheduleState,
  MILESTONE_SCHEDULE_STATE,
  sortMilestonesByTargetDate,
} from '../../milestones/lib/milestones.js'
import {
  ACTION_ATTENTION,
  getActionAttentionState,
  sortActions,
} from '../../managementActions/lib/managementActions.js'
import {
  calculateEvmMetrics,
  EVM_PERFORMANCE_STATE,
  getPerformanceState,
  sortSnapshotsByDate,
} from '../../evm/lib/evm.js'

export const PROJECT_HEALTH = Object.freeze({
  HEALTHY: 'healthy',
  WATCH: 'watch',
  ATTENTION: 'attention',
  NOT_ASSESSED: 'notAssessed',
})

const HEALTH_LABELS = Object.freeze({
  [PROJECT_HEALTH.HEALTHY]: 'Healthy',
  [PROJECT_HEALTH.WATCH]: 'Watch',
  [PROJECT_HEALTH.ATTENTION]: 'Needs attention',
  [PROJECT_HEALTH.NOT_ASSESSED]: 'Not assessed',
})

const SIGNAL_WEIGHT = Object.freeze({
  attention: 0,
  watch: 1,
})

function compareSignals(left, right) {
  const severityDifference = SIGNAL_WEIGHT[left.state] - SIGNAL_WEIGHT[right.state]
  if (severityDifference !== 0) return severityDifference

  const leftDate = left.date ? new Date(`${left.date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER
  const rightDate = right.date ? new Date(`${right.date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER
  if (leftDate !== rightDate) return leftDate - rightDate
  return left.title.localeCompare(right.title)
}

function pushSignal(collection, signal) {
  collection.push({
    date: null,
    ...signal,
  })
}

function getCriterionSignals(criteria, today, signals) {
  let achieved = 0
  let atRisk = 0
  let missed = 0

  for (const criterion of criteria) {
    const status = evaluateSuccessCriterion(criterion, today)

    if (status === SUCCESS_CRITERIA_STATUS.ACHIEVED) achieved += 1
    if (status === SUCCESS_CRITERIA_STATUS.AT_RISK) {
      atRisk += 1
      pushSignal(signals, {
        id: `criterion:${criterion.id}`,
        module: 'Success criteria',
        route: `success-criteria#criterion-${criterion.id}`,
        title: criterion.title,
        detail: 'Target is approaching and is not yet achieved.',
        state: 'watch',
        date: criterion.targetDate,
      })
    }
    if (status === SUCCESS_CRITERIA_STATUS.MISSED) {
      missed += 1
      pushSignal(signals, {
        id: `criterion:${criterion.id}`,
        module: 'Success criteria',
        route: `success-criteria#criterion-${criterion.id}`,
        title: criterion.title,
        detail: 'Target date has passed without achieving the target.',
        state: 'attention',
        date: criterion.targetDate,
      })
    }
  }

  return {
    total: criteria.length,
    achieved,
    atRisk,
    missed,
  }
}

function getRiskSignals(risks, today, signals) {
  const operational = risks.filter(isRiskOperational)
  let highCritical = 0
  let critical = 0

  for (const risk of operational) {
    if (risk.severity === RISK_SEVERITY.CRITICAL || risk.severity === RISK_SEVERITY.HIGH) {
      highCritical += 1
    }
    if (risk.severity === RISK_SEVERITY.CRITICAL) critical += 1

    const overdue = isRiskOverdue(risk, today)
    const dueSoon = isRiskDueSoon(risk, today)
    const attention = overdue || risk.severity === RISK_SEVERITY.CRITICAL
    const watch = !attention && (dueSoon || risk.severity === RISK_SEVERITY.HIGH)

    if (attention || watch) {
      const detail = overdue
        ? 'Response due date has passed.'
        : risk.severity === RISK_SEVERITY.CRITICAL
          ? 'Critical operational exposure.'
          : dueSoon
            ? 'Risk response is due soon.'
            : 'High operational exposure.'

      pushSignal(signals, {
        id: `risk:${risk.id}`,
        module: 'Risk',
        route: `risks/${risk.id}`,
        title: risk.title,
        detail,
        state: attention ? 'attention' : 'watch',
        date: risk.dueDate,
      })
    }
  }

  return {
    total: risks.length,
    operational: operational.length,
    highCritical,
    critical,
  }
}

function getMilestoneSignals(milestones, today, signals) {
  let completed = 0
  let overdue = 0
  let dueSoon = 0

  for (const milestone of milestones) {
    const scheduleState = getMilestoneScheduleState(milestone, today)

    if (scheduleState === MILESTONE_SCHEDULE_STATE.COMPLETED) completed += 1
    if (scheduleState === MILESTONE_SCHEDULE_STATE.OVERDUE) {
      overdue += 1
      pushSignal(signals, {
        id: `milestone:${milestone.id}`,
        module: 'Milestone',
        route: `milestones#milestone-${milestone.id}`,
        title: milestone.title,
        detail: 'Target date has passed and the milestone is not complete.',
        state: 'attention',
        date: milestone.targetDate,
      })
    }
    if (scheduleState === MILESTONE_SCHEDULE_STATE.DUE_SOON) {
      dueSoon += 1
      pushSignal(signals, {
        id: `milestone:${milestone.id}`,
        module: 'Milestone',
        route: `milestones#milestone-${milestone.id}`,
        title: milestone.title,
        detail: 'Target date falls within the next 14 days.',
        state: 'watch',
        date: milestone.targetDate,
      })
    }
  }

  return {
    total: milestones.length,
    completed,
    overdue,
    dueSoon,
    needsAttention: overdue + dueSoon,
    upcoming: sortMilestonesByTargetDate(milestones)
      .filter((milestone) => {
        const state = getMilestoneScheduleState(milestone, today)
        return state !== MILESTONE_SCHEDULE_STATE.COMPLETED && state !== MILESTONE_SCHEDULE_STATE.OVERDUE
      })
      .slice(0, 4),
  }
}

function getActionSignals(actions, today, signals) {
  let active = 0
  let overdue = 0
  let dueSoon = 0
  let criticalActive = 0

  for (const action of actions) {
    if (action.status !== 'done') active += 1
    if (action.status !== 'done' && action.priority === 'critical') criticalActive += 1

    const attentionState = getActionAttentionState(action, today)
    const isOverdue = attentionState === ACTION_ATTENTION.OVERDUE
    const isDueSoon = attentionState === ACTION_ATTENTION.DUE_SOON
    if (isOverdue) overdue += 1
    if (isDueSoon) dueSoon += 1

    const attention = isOverdue
    const watch = !attention && (isDueSoon || (action.status !== 'done' && action.priority === 'critical'))

    if (attention || watch) {
      pushSignal(signals, {
        id: `action:${action.id}`,
        module: 'Action',
        route: `actions#action-${action.id}`,
        title: action.title,
        detail: isOverdue
          ? 'Management action is overdue.'
          : isDueSoon
            ? 'Management action is due soon.'
            : 'Critical management action remains active.',
        state: attention ? 'attention' : 'watch',
        date: action.dueDate,
      })
    }
  }

  return {
    total: actions.length,
    active,
    overdue,
    dueSoon,
    criticalActive,
    needsAttention: overdue + dueSoon,
    ordered: sortActions(actions),
  }
}

function getEvmSignal(baseline, snapshots, signals) {
  if (!baseline) {
    return {
      metrics: null,
      spiState: EVM_PERFORMANCE_STATE.NOT_AVAILABLE,
      cpiState: EVM_PERFORMANCE_STATE.NOT_AVAILABLE,
    }
  }

  const metrics = calculateEvmMetrics(baseline, sortSnapshotsByDate(snapshots))
  const spiState = getPerformanceState(metrics?.spi)
  const cpiState = getPerformanceState(metrics?.cpi)

  const addIndexSignal = (indexName, value, state) => {
    if (state !== EVM_PERFORMANCE_STATE.PRESSURE && state !== EVM_PERFORMANCE_STATE.WATCH) return

    pushSignal(signals, {
      id: `evm:${indexName.toLowerCase()}`,
      module: 'Metrics',
      route: `metrics#evm-${indexName.toLowerCase()}`,
      title: `${indexName} delivery performance`,
      detail: `${indexName} is ${Number(value).toFixed(2)} against the 1.00 target.`,
      state: state === EVM_PERFORMANCE_STATE.PRESSURE ? 'attention' : 'watch',
      date: metrics?.snapshotDate,
    })
  }

  addIndexSignal('SPI', metrics?.spi, spiState)
  addIndexSignal('CPI', metrics?.cpi, cpiState)

  return { metrics, spiState, cpiState }
}

export function buildProjectDashboard({
  criteria = [],
  risks = [],
  milestones = [],
  actions = [],
  baseline = null,
  snapshots = [],
  today = new Date(),
}) {
  const signals = []
  const successCriteria = getCriterionSignals(criteria, today, signals)
  const riskSummary = getRiskSignals(risks, today, signals)
  const milestoneSummary = getMilestoneSignals(milestones, today, signals)
  const actionSummary = getActionSignals(actions, today, signals)
  const evm = getEvmSignal(baseline, snapshots, signals)
  const sortedSignals = signals.sort(compareSignals)

  const hasTrackedData =
    criteria.length > 0 ||
    risks.length > 0 ||
    milestones.length > 0 ||
    actions.length > 0 ||
    baseline !== null

  const attentionCount = sortedSignals.filter((item) => item.state === 'attention').length
  const watchCount = sortedSignals.filter((item) => item.state === 'watch').length

  const health = !hasTrackedData
    ? PROJECT_HEALTH.NOT_ASSESSED
    : attentionCount > 0
      ? PROJECT_HEALTH.ATTENTION
      : watchCount > 0
        ? PROJECT_HEALTH.WATCH
        : PROJECT_HEALTH.HEALTHY

  return {
    health,
    healthLabel: HEALTH_LABELS[health],
    attentionCount,
    watchCount,
    needsAttention: sortedSignals,
    successCriteria,
    risks: riskSummary,
    milestones: milestoneSummary,
    actions: actionSummary,
    evm,
  }
}

export function getProjectHealthLabel(health) {
  return HEALTH_LABELS[health] ?? HEALTH_LABELS[PROJECT_HEALTH.NOT_ASSESSED]
}
