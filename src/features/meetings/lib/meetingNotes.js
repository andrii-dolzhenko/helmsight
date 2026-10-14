export const MEETING_NOTE_LIMITS = Object.freeze({
  title: 140,
  owner: 100,
  participant: 100,
  participants: 30,
  notes: 5000,
  decision: 400,
  followUp: 400,
  listItems: 30,
})

export const MEETING_NOTE_MIN_TEXT_LENGTH = 2

export function localTodayDateKey(now = new Date()) {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Meeting Notes normalize surrounding whitespace before validating and saving.
// Counters must use the same length as the service, not the raw input length.
export function meetingTextLength(value) {
  return String(value ?? '').trim().length
}

export function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const [year, month, day] = value.split('-').map(Number)
  return date.getFullYear() === year
    && date.getMonth() + 1 === month
    && date.getDate() === day
}

export function sortMeetingNotes(notes) {
  return [...notes].sort((left, right) => {
    const byDate = String(right.meetingDate ?? '').localeCompare(String(left.meetingDate ?? ''))
    if (byDate !== 0) return byDate
    return String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
  })
}

export function meetingNoteContent(note) {
  return {
    title: note.title,
    meetingDate: note.meetingDate,
    owner: note.owner,
    participants: note.participants,
    notes: note.notes,
    decisions: note.decisions,
    followUps: note.followUps,
  }
}
