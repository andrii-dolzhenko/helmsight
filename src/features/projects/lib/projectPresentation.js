export const PROJECT_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
]

const PROJECT_STATUS_LABELS = Object.fromEntries(
  PROJECT_STATUS_OPTIONS.map((option) => [option.value, option.label]),
)

export function getProjectStatusLabel(status) {
  return PROJECT_STATUS_LABELS[status] ?? 'Unknown'
}

export function formatProjectDate(date) {
  if (!date) return 'Not set'

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatProjectTimestamp(timestamp) {
  if (!timestamp) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}
