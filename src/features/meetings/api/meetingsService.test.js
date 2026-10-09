import { beforeEach, describe, expect, it } from 'vitest'
import { meetingsService, MeetingsServiceError } from './meetingsService.js'

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
})
