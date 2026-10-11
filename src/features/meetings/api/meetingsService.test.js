import { beforeEach, describe, expect, it } from 'vitest'
import { meetingsService, MeetingsServiceError } from './meetingsService.js'
import { MEETING_NOTE_LIMITS } from '../lib/meetingNotes.js'

const INPUT = {
  projectId: 'project-1',
  title: 'Weekly delivery sync',
  meetingDate: '2026-10-08',
  owner: 'Alex Morgan',
  participants: ['Maya Chen', 'Jordan Lee'],
  notes: 'Reviewed delivery status and the remaining external dependency.',
  decisions: ['Keep the current delivery baseline.'],
  followUps: ['Maya Chen — confirm the dependency owner.'],
}

describe('meetingsService', () => {
  beforeEach(() => window.localStorage.clear())

  it('seeds realistic demo Meeting Notes', async () => {
    const items = await meetingsService.list()
    expect(items.some((item) => item.projectId === 'demo-project')).toBe(true)
    expect(items.find((item) => item.id === 'demo-meeting-pilot-readiness')).toMatchObject({ version: 2 })
  })

  it('creates, persists, versions real content changes, and deletes a note', async () => {
    await meetingsService.list()
    const created = await meetingsService.create(INPUT)
    expect(created.version).toBe(1)

    const unchanged = await meetingsService.update(created.id, INPUT)
    expect(unchanged.version).toBe(1)

    const updated = await meetingsService.update(created.id, { ...INPUT, notes: `${INPUT.notes} Sponsor feedback was also recorded.` })
    expect(updated.version).toBe(2)

    const reloaded = await meetingsService.list()
    expect(reloaded.find((item) => item.id === created.id)).toMatchObject({ version: 2, owner: 'Alex Morgan' })

    await meetingsService.remove(created.id)
    expect((await meetingsService.list()).some((item) => item.id === created.id)).toBe(false)
  })

  it('trims optional list items and rejects invalid required content', async () => {
    const created = await meetingsService.create({
      ...INPUT,
      participants: [' Maya Chen ', ''],
      decisions: ['  Approved pilot.  ', ''],
      followUps: [],
    })
    expect(created.participants).toEqual(['Maya Chen'])
    expect(created.decisions).toEqual(['Approved pilot.'])

    await expect(meetingsService.create({ ...INPUT, title: ' ' })).rejects.toBeInstanceOf(MeetingsServiceError)
    await expect(meetingsService.create({ ...INPUT, notes: 'x' })).rejects.toThrow('at least 2 characters')
    await expect(meetingsService.create({ ...INPUT, meetingDate: '2026-02-30' })).rejects.toThrow('valid meeting date')
  })

  it.each([
    ['title', MEETING_NOTE_LIMITS.title],
    ['owner', MEETING_NOTE_LIMITS.owner],
    ['notes', MEETING_NOTE_LIMITS.notes],
  ])('accepts the %s maximum and rejects one additional character', async (field, limit) => {
    const accepted = await meetingsService.create({ ...INPUT, [field]: 'x'.repeat(limit) })
    expect(accepted[field]).toHaveLength(limit)

    await expect(
      meetingsService.create({ ...INPUT, [field]: 'x'.repeat(limit + 1) }),
    ).rejects.toThrow(`${limit.toLocaleString('en-US')} characters or fewer`)
  })

  it.each([
    ['participants', MEETING_NOTE_LIMITS.participant],
    ['decisions', MEETING_NOTE_LIMITS.decision],
    ['followUps', MEETING_NOTE_LIMITS.followUp],
  ])('checks each %s item at the exact limit and one character above', async (field, limit) => {
    const accepted = await meetingsService.create({ ...INPUT, [field]: ['x'.repeat(limit)] })
    expect(accepted[field][0]).toHaveLength(limit)

    await expect(
      meetingsService.create({ ...INPUT, [field]: ['x'.repeat(limit + 1)] }),
    ).rejects.toThrow(`${limit} characters or fewer`)
  })

  it('accepts 30 list entries but rejects 31 without silently dropping content', async () => {
    const withinLimit = Array.from({ length: MEETING_NOTE_LIMITS.listItems }, (_, index) => `Item ${index + 1}`)
    const accepted = await meetingsService.create({ ...INPUT, decisions: withinLimit })
    expect(accepted.decisions).toHaveLength(MEETING_NOTE_LIMITS.listItems)

    await expect(meetingsService.create({
      ...INPUT,
      decisions: [...withinLimit, 'Overflow'],
    })).rejects.toThrow(`up to ${MEETING_NOTE_LIMITS.listItems} items`)
  })

  it('validates trimmed lengths consistently with the visible character counts', async () => {
    const accepted = await meetingsService.create({
      ...INPUT,
      notes: `  ${'x'.repeat(MEETING_NOTE_LIMITS.notes)}  `,
    })
    expect(accepted.notes).toHaveLength(MEETING_NOTE_LIMITS.notes)

    await expect(meetingsService.create({
      ...INPUT,
      notes: `  ${'x'.repeat(MEETING_NOTE_LIMITS.notes + 1)}  `,
    })).rejects.toThrow('5,000 characters or fewer')
  })
})
