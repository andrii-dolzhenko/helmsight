import { describe, expect, it } from 'vitest'
import { filterSortLessons, getLessonCategoryLabel } from './lessonsLearned.js'

const lessons = [
  { id: 'a', title: 'Delivery handoff', category: 'delivery', situation: 'Support delay', lesson: 'Notify early', recommendation: 'Plan support window', createdAt: '2026-10-01', updatedAt: '2026-10-05' },
  { id: 'b', title: 'Sponsor feedback', category: 'stakeholders', situation: 'Review cadence', lesson: 'Share early', recommendation: 'Schedule sponsor session', createdAt: '2026-10-09', updatedAt: '2026-10-09' },
  { id: 'c', title: 'Escalation checklist', category: 'delivery', situation: 'Delay', lesson: 'Follow through', recommendation: 'Notify every owner', createdAt: '2026-10-04', updatedAt: '2026-10-13' },
]

describe('Lessons Learned filters and sorting', () => {
  it('searches across narrative fields case-insensitively', () => {
    expect(filterSortLessons(lessons, { query: '  SUPPORT  ' }).map((x) => x.id)).toEqual(['a'])
    expect(filterSortLessons(lessons, { query: 'schedule sponsor' }).map((x) => x.id)).toEqual(['b'])
  })
  it('combines category and text search without changing input', () => {
    expect(filterSortLessons(lessons, { category: 'delivery', query: 'notify' }).map((x) => x.id)).toEqual(['c', 'a'])
    expect(lessons.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
  it('supports newest, oldest, updated and alphabetical ordering', () => {
    expect(filterSortLessons(lessons).map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(filterSortLessons(lessons, { sort: 'oldest' }).map((x) => x.id)).toEqual(['a', 'c', 'b'])
    expect(filterSortLessons(lessons, { sort: 'updated' }).map((x) => x.id)).toEqual(['c', 'b', 'a'])
    expect(filterSortLessons(lessons, { sort: 'title' }).map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })
  it('exposes approved category labels', () => {
    expect(getLessonCategoryLabel('riskManagement')).toBe('Risk Management')
  })
})
