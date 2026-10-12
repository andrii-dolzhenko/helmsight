import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import {
  isValidDateKey,
  meetingNoteContent,
  MEETING_NOTE_LIMITS,
  MEETING_NOTE_MIN_TEXT_LENGTH,
  sortMeetingNotes,
} from '../lib/meetingNotes.js'

const STORAGE_KEY = 'meetingNotes'

const DEMO_MEETINGS = Object.freeze([
  {
    id: 'demo-meeting-pilot-readiness',
    projectId: 'demo-project',
    title: 'Migration Pilot Readiness Review',
    meetingDate: '2026-10-07',
    owner: 'Alex Morgan',
    participants: ['Alex Morgan', 'Maya Chen', 'Jordan Lee', 'Priya Shah'],
    notes: 'Reviewed readiness for the controlled migration pilot, including vendor support coverage, escalation ownership, rollback criteria, and the evidence required before the pilot window opens. The team confirmed that the remaining delivery risk is concentrated in external dependency timing rather than internal implementation readiness.',
    decisions: [
      'Proceed with the controlled pilot once vendor support coverage and escalation contacts are confirmed.',
      'Freeze non-critical interface changes until the pilot exit review is complete.',
    ],
    followUps: [
      'Maya Chen — Confirm vendor support coverage and named escalation contact before Oct 10.',
      'Jordan Lee — Publish the pilot escalation path and rollback contacts before the support window.',
    ],
    version: 2,
    createdAt: '2026-10-07T09:00:00.000Z',
    updatedAt: '2026-10-07T10:05:00.000Z',
  },
  {
    id: 'demo-meeting-steering-health',
    projectId: 'demo-project',
    title: 'Steering Committee — Delivery Health',
    meetingDate: '2026-10-02',
    owner: 'Alex Morgan',
    participants: ['Alex Morgan', 'Maya Chen', 'Jordan Lee'],
    notes: 'Reviewed current delivery health, EVM performance, regulatory dependency risk, and the reporting cadence for the next phase. Sponsors requested a concise weekly view focused on material exceptions and management decisions.',
    decisions: [
      'Keep the current delivery baseline unchanged for the next reporting cycle.',
      'Use the weekly status report as the primary sponsor-facing delivery summary.',
    ],
    followUps: [
      'Alex Morgan — Publish the agreed weekly reporting cadence.',
    ],
    version: 1,
    createdAt: '2026-10-02T15:10:00.000Z',
    updatedAt: '2026-10-02T15:10:00.000Z',
  },
])

export class MeetingsServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'MeetingsServiceError'
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readMeetings() {
  const stored = storageAdapter.read(STORAGE_KEY)
  if (stored === null) {
    const demoWasDeleted =
      storageAdapter.read('deletedDemoProject:demo-project') === true
    const demo = demoWasDeleted ? [] : clone(DEMO_MEETINGS)
    storageAdapter.write(STORAGE_KEY, demo)
    return demo
  }
  if (!Array.isArray(stored)) {
    throw new MeetingsServiceError('Saved meeting note data is invalid. Reset local data and try again.')
  }
  return stored
}

function writeMeetings(items) {
  storageAdapter.write(STORAGE_KEY, items)
  return items
}

function normalizeRequiredText(value, label, maxLength) {
  const text = String(value ?? '').trim()
  if (!text) throw new MeetingsServiceError(`${label} is required.`)
  if (text.length < MEETING_NOTE_MIN_TEXT_LENGTH) {
    throw new MeetingsServiceError(`${label} must use at least ${MEETING_NOTE_MIN_TEXT_LENGTH} characters.`)
  }
  if (text.length > maxLength) {
    throw new MeetingsServiceError(`${label} must use ${maxLength.toLocaleString('en-US')} characters or fewer.`)
  }
  return text
}

function normalizeList(values, label, maxLength, maxItems = MEETING_NOTE_LIMITS.listItems) {
  if (!Array.isArray(values)) return []
  const normalized = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)

  if (normalized.length > maxItems) {
    throw new MeetingsServiceError(`${label} supports up to ${maxItems} items.`)
  }

  return normalized.map((value) => {
    if (value.length < MEETING_NOTE_MIN_TEXT_LENGTH) {
      throw new MeetingsServiceError(`${label} items must use at least ${MEETING_NOTE_MIN_TEXT_LENGTH} characters.`)
    }
    if (value.length > maxLength) {
      throw new MeetingsServiceError(`${label} items must use ${maxLength} characters or fewer.`)
    }
    return value
  })
}

function normalizeInput(input) {
  if (!input?.projectId) throw new MeetingsServiceError('Project is required.')
  if (!isValidDateKey(input.meetingDate)) throw new MeetingsServiceError('Choose a valid meeting date.')

  return {
    projectId: input.projectId,
    title: normalizeRequiredText(input.title, 'Title', MEETING_NOTE_LIMITS.title),
    meetingDate: input.meetingDate,
    owner: normalizeRequiredText(input.owner, 'Owner', MEETING_NOTE_LIMITS.owner),
    participants: normalizeList(
      input.participants,
      'Participant',
      MEETING_NOTE_LIMITS.participant,
      MEETING_NOTE_LIMITS.participants,
    ),
    notes: normalizeRequiredText(input.notes, 'Notes', MEETING_NOTE_LIMITS.notes),
    decisions: normalizeList(input.decisions, 'Decision', MEETING_NOTE_LIMITS.decision),
    followUps: normalizeList(input.followUps, 'Follow-up', MEETING_NOTE_LIMITS.followUp),
  }
}

function ensureMeeting(items, meetingId) {
  const index = items.findIndex((item) => item.id === meetingId)
  if (index === -1) throw new MeetingsServiceError('Meeting note not found.')
  return index
}

export const meetingsService = {
  getSnapshot() {
    const stored = storageAdapter.read(STORAGE_KEY)
    if (stored === null) return null
    if (!Array.isArray(stored)) {
      throw new MeetingsServiceError('Saved meeting note data is invalid. Reset local data and try again.')
    }
    return clone(stored)
  },

  async list() {
    return clone(sortMeetingNotes(readMeetings()))
  },

  async create(input) {
    const items = readMeetings()
    const now = new Date().toISOString()
    const meeting = {
      id: globalThis.crypto.randomUUID(),
      ...normalizeInput(input),
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    writeMeetings([meeting, ...items])
    return clone(meeting)
  },

  async update(meetingId, input) {
    const items = readMeetings()
    const index = ensureMeeting(items, meetingId)
    const existing = items[index]
    const normalized = normalizeInput(input)

    if (JSON.stringify(meetingNoteContent(existing)) === JSON.stringify(meetingNoteContent(normalized))) {
      return clone(existing)
    }

    const updated = {
      ...existing,
      ...normalized,
      version: Number(existing.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    }
    const next = [...items]
    next[index] = updated
    writeMeetings(next)
    return clone(updated)
  },

  async remove(meetingId) {
    const items = readMeetings()
    ensureMeeting(items, meetingId)
    writeMeetings(items.filter((item) => item.id !== meetingId))
    return meetingId
  },
}
