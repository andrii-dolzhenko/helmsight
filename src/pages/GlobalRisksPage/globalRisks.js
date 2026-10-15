import { calculateRiskScore, getRiskSeverity, isRiskDueSoon, isRiskOverdue } from '../../features/risks/lib/risks.js'

export const RISK_SORT = Object.freeze({ EXPOSURE: 'exposure', DUE: 'due', RECENT: 'recent' })
export const RISK_ATTENTION = Object.freeze({ OVERDUE: 'overdue', DUE_SOON: 'dueSoon', ON_TRACK: 'onTrack', NO_DUE: 'noDue' })

export function getRiskAttention(risk, today = new Date()) {
  if (risk.status === 'closed') return 'closed'
  if (!risk.dueDate) return RISK_ATTENTION.NO_DUE
  if (isRiskOverdue(risk, today)) return RISK_ATTENTION.OVERDUE
  if (isRiskDueSoon(risk, today)) return RISK_ATTENTION.DUE_SOON
  return RISK_ATTENTION.ON_TRACK
}

export function deriveGlobalRisksView({ projects = [], risks = [], includeArchivedProjects = false,
  projectId = 'all', query = '', status = 'all', severity = 'all', attention = 'all',
  sort = RISK_SORT.EXPOSURE, today = new Date() }) {
  const eligibleProjects = projects.filter((project) => includeArchivedProjects || !project.archivedAt)
  const projectById = new Map(eligibleProjects.map((project) => [project.id, project]))
  const scoped = risks.filter((risk) => projectById.has(risk.projectId) && (projectId === 'all' || risk.projectId === projectId))
  const getScore = (risk) => calculateRiskScore(risk.probability, risk.impact) ?? risk.score ?? 0
  const getSeverity = (risk) => getRiskSeverity(getScore(risk)) ?? risk.severity
  const summary = {
    active: scoped.filter((risk) => risk.status !== 'closed').length,
    critical: scoped.filter((risk) => risk.status !== 'closed' && ['high', 'critical'].includes(getSeverity(risk))).length,
    attention: scoped.filter((risk) => [RISK_ATTENTION.OVERDUE, RISK_ATTENTION.DUE_SOON].includes(getRiskAttention(risk, today))).length,
    closed: scoped.filter((risk) => risk.status === 'closed').length,
  }
  const normalized = query.trim().toLocaleLowerCase()
  const visibleRisks = scoped.filter((risk) =>
    (status === 'all' || risk.status === status) &&
    (severity === 'all' || getSeverity(risk) === severity) &&
    (attention === 'all' || getRiskAttention(risk, today) === attention) &&
    (!normalized || [risk.title, risk.owner, projectById.get(risk.projectId)?.name]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalized))),
  ).sort((a, b) => {
    const idOrder = String(a.id).localeCompare(String(b.id))
    if (sort === RISK_SORT.RECENT) return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')) || idOrder
    if (sort === RISK_SORT.DUE) return (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || idOrder
    if ((a.status === 'closed') !== (b.status === 'closed')) return a.status === 'closed' ? 1 : -1
    return getScore(b) - getScore(a) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || idOrder
  })
  return { eligibleProjects, projectById, scopedCount: scoped.length, visibleRisks, summary }
}
