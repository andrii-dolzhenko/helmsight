import { getActionAttentionState, ACTION_ATTENTION } from '../../managementActions/lib/managementActions.js'
import { getMilestoneScheduleState, MILESTONE_SCHEDULE_STATE } from '../../milestones/lib/milestones.js'
import { isRiskOperational, RISK_SEVERITY } from '../../risks/lib/risks.js'
import { getLocalDayKey, isDailySetAvailable } from '../../decisionLab/lib/dailyDecisionLab.js'

const PRIORITY = { lab: 0, risk: 1, action: 2, milestone: 3 }

export function deriveNotifications({
  projects = [], risks = [], actions = [], milestones = [],
  dailySession = null, today = new Date(),
} = {}) {
  const projectNames = new Map(projects.filter((p) => p?.id && !p.archivedAt).map((p) => [p.id, p.name]))
  const alerts = []
  if (isDailySetAvailable(dailySession)) {
    alerts.push({
      id: `lab:${getLocalDayKey(today)}`, type: 'lab', title: 'Decision Lab is ready',
      detail: 'Your three daily PM scenarios are available.', projectName: null,
      date: null, href: null,
    })
  }

  for (const risk of risks) {
    if (!risk?.id || !projectNames.has(risk.projectId) || !isRiskOperational(risk) ||
        risk.severity !== RISK_SEVERITY.CRITICAL) continue
    alerts.push({
      id: `risk:${risk.projectId}:${risk.id}:critical`, type: 'risk', title: 'Critical risk',
      detail: risk.title, projectName: projectNames.get(risk.projectId), date: risk.dueDate ?? null,
      href: `/projects/${encodeURIComponent(risk.projectId)}/risks/${encodeURIComponent(risk.id)}`,
    })
  }
  for (const action of actions) {
    if (!action?.id || !projectNames.has(action.projectId) ||
        getActionAttentionState(action, today) !== ACTION_ATTENTION.OVERDUE) continue
    alerts.push({
      id: `action:${action.projectId}:${action.id}:overdue`, type: 'action', title: 'Overdue action',
      detail: action.title, projectName: projectNames.get(action.projectId), date: action.dueDate,
      href: `/projects/${encodeURIComponent(action.projectId)}/actions#action-${encodeURIComponent(action.id)}`,
    })
  }
  for (const milestone of milestones) {
    if (!milestone?.id || !projectNames.has(milestone.projectId) ||
        getMilestoneScheduleState(milestone, today) !== MILESTONE_SCHEDULE_STATE.OVERDUE) continue
    alerts.push({
      id: `milestone:${milestone.projectId}:${milestone.id}:overdue`, type: 'milestone', title: 'Overdue milestone',
      detail: milestone.title, projectName: projectNames.get(milestone.projectId), date: milestone.targetDate,
      href: `/projects/${encodeURIComponent(milestone.projectId)}/milestones#milestone-${encodeURIComponent(milestone.id)}`,
    })
  }

  return alerts.sort((a, b) =>
    PRIORITY[a.type] - PRIORITY[b.type] ||
    (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
    (a.projectName ?? '').localeCompare(b.projectName ?? '') || a.id.localeCompare(b.id))
}

export function visibleNotifications(alerts, records, unreadOnly = false) {
  return alerts.filter((alert) => !records[alert.id]?.dismissed &&
    (!unreadOnly || !records[alert.id]?.read))
}

export function unreadCount(alerts, records) {
  return visibleNotifications(alerts, records, true).length
}
