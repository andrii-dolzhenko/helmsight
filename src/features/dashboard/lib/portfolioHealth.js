import { buildProjectDashboard, PROJECT_HEALTH } from './projectDashboard.js'

function groupByProject(items = []) {
  const grouped = new Map()

  for (const item of items) {
    const projectId = item?.projectId
    if (!projectId) continue
    const projectItems = grouped.get(projectId)
    if (projectItems) projectItems.push(item)
    else grouped.set(projectId, [item])
  }

  return grouped
}

export function buildPortfolioProjectHealth({
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
  const baselineByProject = new Map(
    baselines
      .filter((baseline) => baseline?.projectId)
      .map((baseline) => [baseline.projectId, baseline]),
  )

  return Object.fromEntries(
    projects
      .filter((project) => project && !project.archivedAt)
      .map((project) => {
        const dashboard = buildProjectDashboard({
          criteria: criteriaByProject.get(project.id) ?? [],
          risks: risksByProject.get(project.id) ?? [],
          milestones: milestonesByProject.get(project.id) ?? [],
          actions: actionsByProject.get(project.id) ?? [],
          baseline: baselineByProject.get(project.id) ?? null,
          snapshots: snapshotsByProject.get(project.id) ?? [],
          today,
        })

        return [project.id, {
          status: dashboard.health,
          label: dashboard.healthLabel,
          attentionCount: dashboard.attentionCount,
          watchCount: dashboard.watchCount,
        }]
      }),
  )
}

export function summarizePortfolioHealth(healthByProject = {}) {
  return Object.values(healthByProject).reduce(
    (summary, item) => {
      if (!item) return summary
      if (item.status === PROJECT_HEALTH.ATTENTION) summary.attention += 1
      if (item.status === PROJECT_HEALTH.WATCH) summary.watch += 1
      if (item.status === PROJECT_HEALTH.HEALTHY) summary.healthy += 1
      if (item.status === PROJECT_HEALTH.NOT_ASSESSED) summary.notAssessed += 1
      return summary
    },
    { attention: 0, watch: 0, healthy: 0, notAssessed: 0 },
  )
}
