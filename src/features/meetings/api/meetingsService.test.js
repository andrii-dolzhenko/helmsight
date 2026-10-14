import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { meetingsService, MeetingsServiceError } from './meetingsService.js'
import { MEETING_NOTE_LIMITS, localTodayDateKey } from '../lib/meetingNotes.js'

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

  it('accepts past and today dates but rejects future dates on create and update', async () => {
    const today = new Date()
    const yesterday = new Date(today)
    const tomorrow = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const pastDate = localTodayDateKey(yesterday)
    const todayDate = localTodayDateKey(today)
    const futureDate = localTodayDateKey(tomorrow)

    const created = await meetingsService.create({
      ...INPUT,
      meetingDate: pastDate,
    })
    expect(created.meetingDate).toBe(pastDate)

    await expect(
      meetingsService.create({ ...INPUT, meetingDate: futureDate }),
    ).rejects.toThrow('Meeting date cannot be in the future.')

    await expect(
      meetingsService.update(created.id, { ...INPUT, meetingDate: futureDate }),
    ).rejects.toThrow('Meeting date cannot be in the future.')

    const unchanged = (await meetingsService.list())
      .find((item) => item.id === created.id)

    expect(unchanged.meetingDate).toBe(pastDate)
    expect(unchanged.version).toBe(1)

    const updated = await meetingsService.update(created.id, {
      ...INPUT,
      meetingDate: todayDate,
    })

    expect(updated.meetingDate).toBe(todayDate)
    expect(updated.version).toBe(2)
  })

  it('archives and restores without changing content version or updatedAt', async () => {
    const created = await meetingsService.create(INPUT)
    const archived = await meetingsService.archive(created.id)

    expect(archived.archivedAt).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(archived.archivedAt))).toBe(false)
    expect(archived.version).toBe(created.version)
    expect(archived.updatedAt).toBe(created.updatedAt)

    const persisted = (await meetingsService.list()).find((item) => item.id === created.id)
    expect(persisted.archivedAt).toBe(archived.archivedAt)

    const restored = await meetingsService.restore(created.id)
    expect(restored.archivedAt).toBeNull()
    expect(restored.version).toBe(created.version)
    expect(restored.updatedAt).toBe(created.updatedAt)
  })

  it('prevents editing or deleting archived notes until restored', async () => {
    const created = await meetingsService.create(INPUT)
    await meetingsService.archive(created.id)

    await expect(meetingsService.update(created.id, {
      ...INPUT,
      title: 'Changed after archive',
    })).rejects.toThrow(/archived/i)

    await expect(meetingsService.remove(created.id)).rejects.toThrow(/archived/i)

    await meetingsService.restore(created.id)
    const updated = await meetingsService.update(created.id, {
      ...INPUT,
      title: 'Changed after restore',
    })
    expect(updated.version).toBe(2)

    await meetingsService.remove(created.id)
    expect((await meetingsService.list()).some((item) => item.id === created.id)).toBe(false)
  })

  it('handles legacy notes and repeated lifecycle operations', async () => {
    const legacy = (await meetingsService.list()).find((item) => item.id === 'demo-meeting-pilot-readiness')
    expect(legacy.archivedAt ?? null).toBeNull()

    const archived = await meetingsService.archive(legacy.id)
    const archivedAgain = await meetingsService.archive(legacy.id)
    expect(archivedAgain).toEqual(archived)

    const restored = await meetingsService.restore(legacy.id)
    const restoredAgain = await meetingsService.restore(legacy.id)
    expect(restoredAgain).toEqual(restored)
    expect(restored.archivedAt).toBeNull()
    expect(restored.version).toBe(legacy.version)
  })

  it('rejects missing notes and does not report successful archive after storage failure', async () => {
    await expect(meetingsService.archive('missing-id')).rejects.toThrow(/not found/i)
    await expect(meetingsService.restore('missing-id')).rejects.toThrow(/not found/i)

    const created = await meetingsService.create(INPUT)
    const write = vi.spyOn(storageAdapter, 'write').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    try {
      await expect(meetingsService.archive(created.id)).rejects.toThrow('Storage unavailable')
    } finally {
      write.mockRestore()
    }

    const persisted = (await meetingsService.list()).find((item) => item.id === created.id)
    expect(persisted.archivedAt ?? null).toBeNull()
  })

})
