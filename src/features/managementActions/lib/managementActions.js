export const ACTION_PRIORITIES = Object.freeze([
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
])

export const ACTION_STATUSES = Object.freeze([
  { value: 'notStarted', label: 'Not started' },
  { value: 'inProgress', label: 'In progress' },
  { value: 'done', label: 'Done' },
])

export const ACTION_SOURCES = Object.freeze([
  { value: 'manual', label: 'Manual' },
  { value: 'risk', label: 'Risk' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'statusReport', label: 'Status report' },
])

export const ACTION_ATTENTION = Object.freeze({
  ON_TRACK: 'onTrack',
  DUE_SOON: 'dueSoon',
  OVERDUE: 'overdue',
  DONE: 'done',
})

export function getActionPriorityLabel(value) {
  return ACTION_PRIORITIES.find((item) => item.value === value)?.label ?? value
}

export function getActionStatusLabel(value) {
  if (value === 'open') return 'Not started'
  return ACTION_STATUSES.find((item) => item.value === value)?.label ?? value
}

export function getActionSourceLabel(value) {
  return ACTION_SOURCES.find((item) => item.value === value)?.label ?? value
}

function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getActionAttentionState(action, today = new Date(), dueSoonDays = 7) {
  if (action.status === 'done') return ACTION_ATTENTION.DONE
  if (!action.dueDate) return ACTION_ATTENTION.ON_TRACK

  const now = startOfDay(today)
  const due = startOfDay(action.dueDate)
  if (due < now) return ACTION_ATTENTION.OVERDUE

  const soon = new Date(now)
  soon.setDate(soon.getDate() + dueSoonDays)
  if (due <= soon) return ACTION_ATTENTION.DUE_SOON
  return ACTION_ATTENTION.ON_TRACK
}

export function getActionAttentionLabel(state) {
  return {
    [ACTION_ATTENTION.ON_TRACK]: 'On track',
    [ACTION_ATTENTION.DUE_SOON]: 'Due soon',
    [ACTION_ATTENTION.OVERDUE]: 'Overdue',
    [ACTION_ATTENTION.DONE]: 'Done',
  }[state] ?? 'Unknown'
}

export function sortActions(actions) {
  const priorityWeight = { critical: 0, high: 1, medium: 2, low: 3 }
  return [...actions].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    const dateA = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    const dateB = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    if (dateA !== dateB) return dateA - dateB
    return (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9)
  })
}
