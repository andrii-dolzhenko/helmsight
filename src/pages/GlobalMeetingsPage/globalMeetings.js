export const GLOBAL_MEETINGS_PAGE_SIZE = 10

export const MEETING_SORT = Object.freeze({
  NEWEST: 'newest',
  OLDEST: 'oldest',
  RECENTLY_UPDATED: 'updated',
})

// KPI values follow project scope, but not the register-only lifecycle, search or sort filters.
// Project archival and the individual meeting-note lifecycle are independent dimensions.
export function deriveGlobalMeetingsView({
  projects = [],
  meetings = [],
  includeArchivedProjects = false,
  projectId = 'all',
  lifecycle = 'current',
  query = '',
  sort = MEETING_SORT.NEWEST,
}) {
  const eligibleProjects = projects.filter((project) =>
    includeArchivedProjects || !project.archivedAt,
  )
  const projectById = new Map(eligibleProjects.map((project) => [project.id, project]))

  // Do not display orphan notes: their project-specific detail URL cannot be resolved.
  const scopedMeetings = meetings.filter((meeting) =>
    projectById.has(meeting.projectId) &&
    (projectId === 'all' || meeting.projectId === projectId),
  )

  const summary = {
    total: scopedMeetings.length,
    current: scopedMeetings.filter((meeting) => !meeting.archivedAt).length,
    archived: scopedMeetings.filter((meeting) => Boolean(meeting.archivedAt)).length,
  }

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleMeetings = scopedMeetings.filter((meeting) => {
    if (Boolean(meeting.archivedAt) !== (lifecycle === 'archived')) return false
    if (!normalizedQuery) return true
    const project = projectById.get(meeting.projectId)
    return [meeting.title, project?.name].some((value) =>
      String(value ?? '').toLocaleLowerCase().includes(normalizedQuery),
    )
  }).sort((left, right) => {
    const comparison = sort === MEETING_SORT.RECENTLY_UPDATED
      ? String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
      : sort === MEETING_SORT.OLDEST
        ? String(left.meetingDate ?? '').localeCompare(String(right.meetingDate ?? ''))
        : String(right.meetingDate ?? '').localeCompare(String(left.meetingDate ?? ''))

    if (comparison !== 0) return comparison
    const updated = String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
    return updated || String(left.id).localeCompare(String(right.id))
  })

  return { eligibleProjects, projectById, scopedCount: scopedMeetings.length, summary, visibleMeetings }
}
