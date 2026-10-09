export const MILESTONE_STATUSES = Object.freeze([
  { value: 'planned', label: 'Planned' },
  { value: 'inProgress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
])

export const MILESTONE_SCHEDULE_STATE = Object.freeze({
  ON_TRACK: 'onTrack',
  DUE_SOON: 'dueSoon',
  OVERDUE: 'overdue',
  COMPLETED: 'completed',
})

export function getMilestoneStatusLabel(status) {
  return MILESTONE_STATUSES.find((item) => item.value === status)?.label ?? status
}

export function normalizeProgress(value) {
  const progress = Number(value)
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return null
  return progress
}

function toStartOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getMilestoneScheduleState(milestone, today = new Date(), windowDays = 14) {
  if (milestone.status === 'completed') return MILESTONE_SCHEDULE_STATE.COMPLETED
  if (!milestone.targetDate) return MILESTONE_SCHEDULE_STATE.ON_TRACK

  const now = toStartOfDay(today)
  const target = toStartOfDay(milestone.targetDate)

  if (target < now) return MILESTONE_SCHEDULE_STATE.OVERDUE

  const windowEnd = new Date(now)
  windowEnd.setDate(windowEnd.getDate() + windowDays)
  if (target <= windowEnd) return MILESTONE_SCHEDULE_STATE.DUE_SOON

  return MILESTONE_SCHEDULE_STATE.ON_TRACK
}

export function getMilestoneScheduleLabel(state) {
  return {
    [MILESTONE_SCHEDULE_STATE.ON_TRACK]: 'On track',
    [MILESTONE_SCHEDULE_STATE.DUE_SOON]: 'Due soon',
    [MILESTONE_SCHEDULE_STATE.OVERDUE]: 'Overdue',
    [MILESTONE_SCHEDULE_STATE.COMPLETED]: 'Completed',
  }[state] ?? 'Unknown'
}

export function sortMilestonesByTargetDate(milestones) {
  return [...milestones].sort((a, b) => {
    const dateA = a.targetDate ? new Date(`${a.targetDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    const dateB = b.targetDate ? new Date(`${b.targetDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    return dateA - dateB
  })
}
