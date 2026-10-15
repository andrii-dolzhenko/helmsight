import {
  buildProjectDashboard,
  PROJECT_HEALTH,
} from '../../features/dashboard/lib/projectDashboard.js'
import { summarizePortfolioHealth } from '../../features/dashboard/lib/portfolioHealth.js'

const HEALTH_PRIORITY = {
  [PROJECT_HEALTH.ATTENTION]: 0,
  [PROJECT_HEALTH.WATCH]: 1,
  [PROJECT_HEALTH.HEALTHY]: 2,
  [PROJECT_HEALTH.NOT_ASSESSED]: 3,
}

function groupByProject(items) {
  const grouped = new Map()

  for (const item of items) {
    if (!item?.projectId) continue

    const current = grouped.get(item.projectId) ?? []
    current.push(item)
    grouped.set(item.projectId, current)
  }

  return grouped
}

function compareProjects(left, right) {
  const priorityDifference =
    HEALTH_PRIORITY[left.health] - HEALTH_PRIORITY[right.health]

  if (priorityDifference !== 0) return priorityDifference

  if (left.attentionCount !== right.attentionCount) {
    return right.attentionCount - left.attentionCount
  }

  if (left.watchCount !== right.watchCount) {
    return right.watchCount - left.watchCount
  }

  return left.name.localeCompare(right.name)
}

function compareSignals(left, right) {
  if (left.state !== right.state) {
    return left.state === 'attention' ? -1 : 1
  }

  if (left.date !== right.date) {
    if (!left.date) return 1
    if (!right.date) return -1
    return left.date.localeCompare(right.date)
  }

  return left.projectName.localeCompare(right.projectName) ||
    left.title.localeCompare(right.title)
}

export const ATTENTION_DRIVER_SOURCES = Object.freeze([
  { module: 'Action', label: 'Actions' },
  { module: 'Risk', label: 'Risks' },
  { module: 'Milestone', label: 'Milestones' },
  { module: 'Success criteria', label: 'Success criteria' },
  { module: 'Metrics', label: 'Metrics' },
])

export function deriveAttentionDrivers(signals = []) {
  return ATTENTION_DRIVER_SOURCES.map(({ module, label }) => {
    const sourceSignals = signals.filter((signal) => signal.module === module)
    const attention = sourceSignals.filter((signal) => signal.state === 'attention').length
    const watch = sourceSignals.filter((signal) => signal.state === 'watch').length
    return { module, label, attention, watch, total: attention + watch }
  })
}

export function deriveGlobalOverview({
  projects = [],
  criteria = [],
  risks = [],
  milestones = [],
  actions = [],
  baselines = [],
  snapshots = [],
  today = new Date(),
}) {
  const criteriaByProject = groupByProject(criteria)
  const risksByProject = groupByProject(risks)
  const milestonesByProject = groupByProject(milestones)
  const actionsByProject = groupByProject(actions)
  const snapshotsByProject = groupByProject(snapshots)

  const baselinesByProject = new Map(
    baselines
      .filter((baseline) => baseline?.projectId)
      .map((baseline) => [baseline.projectId, baseline]),
  )

  const healthByProject = {}
  const portfolioSignals = []

  const activeProjects = projects
    .filter((project) => project?.id && !project.archivedAt)
    .map((project) => {
      const dashboard = buildProjectDashboard({
        criteria: criteriaByProject.get(project.id) ?? [],
        risks: risksByProject.get(project.id) ?? [],
        milestones: milestonesByProject.get(project.id) ?? [],
        actions: actionsByProject.get(project.id) ?? [],
        baseline: baselinesByProject.get(project.id) ?? null,
        snapshots: snapshotsByProject.get(project.id) ?? [],
        today,
      })

      healthByProject[project.id] = {
        status: dashboard.health,
        label: dashboard.healthLabel,
        attentionCount: dashboard.attentionCount,
        watchCount: dashboard.watchCount,
      }

      for (const signal of dashboard.needsAttention) {
        portfolioSignals.push({
          ...signal,
          projectId: project.id,
          projectName: project.name,
          href: `/projects/${encodeURIComponent(project.id)}/${signal.route}`,
        })
      }

      return {
        id: project.id,
        name: project.name,
        health: dashboard.health,
        healthLabel: dashboard.healthLabel,
        attentionCount: dashboard.attentionCount,
        watchCount: dashboard.watchCount,
        href: `/projects/${encodeURIComponent(project.id)}`,
      }
    })
    .sort(compareProjects)

  const projectsNeedingAttention = activeProjects.filter(
    (project) =>
      project.health === PROJECT_HEALTH.ATTENTION ||
      project.health === PROJECT_HEALTH.WATCH,
  )

  const activeProjectNames = new Map(activeProjects.map((project) => [project.id, project.name]))
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const horizon = new Date(start)
  horizon.setDate(horizon.getDate() + 30)
  const toKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  const startKey = toKey(start)
  const horizonKey = toKey(horizon)
  const upcomingMilestones = milestones
    .filter((item) => activeProjectNames.has(item?.projectId) && item.status !== 'completed' &&
      item.targetDate >= startKey && item.targetDate <= horizonKey)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate) || a.title.localeCompare(b.title))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      projectId: item.projectId,
      projectName: activeProjectNames.get(item.projectId),
      title: item.title,
      targetDate: item.targetDate,
      href: `/projects/${encodeURIComponent(item.projectId)}/milestones#milestone-${item.id}`,
    }))

  return {
    activeProjects,
    activeCount: activeProjects.length,
    healthSummary: summarizePortfolioHealth(healthByProject),
    projectsNeedingAttention,
    signals: portfolioSignals.sort(compareSignals),
    upcomingMilestones,
  }
}
