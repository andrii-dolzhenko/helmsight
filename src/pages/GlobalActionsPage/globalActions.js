import {
  ACTION_ATTENTION,
  getActionAttentionState,
  sortActions,
} from '../../features/managementActions/lib/managementActions.js'

export function deriveGlobalActionsView({
  projects,
  actions,
  includeArchived = false,
  projectId = 'all',
  status = 'all',
  priority = 'all',
  attention = 'all',
  today = new Date(),
}) {
  const eligibleProjects = projects.filter(
    (project) => includeArchived || !project.archivedAt,
  )

  const projectById = new Map(
    eligibleProjects.map((project) => [project.id, project]),
  )

  const scopedActions = actions.filter(
    (action) =>
      projectById.has(action.projectId) &&
      (projectId === 'all' || action.projectId === projectId),
  )

  const summary = {
    active: scopedActions.filter((action) => action.status !== 'done').length,
    critical: scopedActions.filter(
      (action) => action.status !== 'done' && action.priority === 'critical',
    ).length,
    attention: scopedActions.filter((action) =>
      [ACTION_ATTENTION.DUE_SOON, ACTION_ATTENTION.OVERDUE].includes(
        getActionAttentionState(action, today),
      )).length,
    done: scopedActions.filter((action) => action.status === 'done').length,
  }

  const visibleActions = sortActions(scopedActions.filter((action) =>
    (status === 'all' || action.status === status) &&
    (priority === 'all' || action.priority === priority) &&
    (attention === 'all' || getActionAttentionState(action, today) === attention),
  ))

  return {
    eligibleProjects,
    projectById,
    scopedCount: scopedActions.length,
    visibleActions,
    summary,
  }
}
