export const SEARCH_GROUPS = Object.freeze([
  { type: 'projects', label: 'Projects' },
  { type: 'risks', label: 'Risks' },
  { type: 'milestones', label: 'Milestones' },
  { type: 'actions', label: 'Actions' },
  { type: 'reports', label: 'Reports' },
  { type: 'meetings', label: 'Meeting Notes' },
])

const clean = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()

export function buildGlobalSearchIndex({
  projects = [], risks = [], milestones = [], actions = [], reports = [], meetings = [],
}) {
  const active = projects.filter((project) => project?.id && !project.archivedAt)
  const projectById = new Map(active.map((project) => [project.id, project]))
  const entries = []

  const add = (type, item, title, detail, url, terms = []) => {
    if (!item?.id || !item?.projectId || !projectById.has(item.projectId) || !title) return
    const project = projectById.get(item.projectId)
    entries.push({
      key: `${type}:${item.id}`,
      type,
      title: String(title),
      projectName: project.name,
      detail: String(detail ?? ''),
      href: `/projects/${encodeURIComponent(item.projectId)}/${url}`,
      searchable: clean([title, detail, project.name, ...terms].join(' ')),
    })
  }

  for (const project of active) {
    entries.push({
      key: `projects:${project.id}`,
      type: 'projects',
      title: project.name,
      projectName: project.name,
      detail: project.clientContext || 'Project overview',
      href: `/projects/${encodeURIComponent(project.id)}`,
      searchable: clean([project.name, project.clientContext, project.description].join(' ')),
    })
  }
  for (const risk of risks) add('risks', risk, risk.title, risk.description, `risks/${encodeURIComponent(risk.id)}`)
  for (const milestone of milestones) add('milestones', milestone, milestone.title, milestone.description, `milestones#milestone-${encodeURIComponent(milestone.id)}`)
  for (const action of actions) add('actions', action, action.title, action.description, `actions#action-${encodeURIComponent(action.id)}`, [action.owner])
  for (const report of reports) {
    if (report.archivedAt) continue
    add('reports', report, `Week ending ${report.periodEnd}`, report.status === 'final' ? 'Final report' : 'Draft report', `reports/${encodeURIComponent(report.id)}`, [report.narrative?.executiveSummary])
  }
  for (const meeting of meetings) {
    if (meeting.archivedAt) continue
    add('meetings', meeting, meeting.title, meeting.meetingDate, `meetings/${encodeURIComponent(meeting.id)}`, [meeting.notes, meeting.owner])
  }
  return entries
}

export function searchGlobalIndex(index, query, perGroup = 5) {
  const needle = clean(query)
  if (!needle) return []
  const parts = needle.split(/\s+/u)
  const matches = index.filter((item) => parts.every((part) => item.searchable.includes(part)))
  const priority = (item) => {
    const title = clean(item.title)
    if (title === needle) return 0
    if (title.startsWith(needle)) return 1
    if (title.includes(needle)) return 2
    return 3
  }
  return SEARCH_GROUPS.flatMap(({ type }) => matches
    .filter((item) => item.type === type)
    .sort((a, b) => priority(a) - priority(b) || a.title.localeCompare(b.title))
    .slice(0, perGroup))
}
