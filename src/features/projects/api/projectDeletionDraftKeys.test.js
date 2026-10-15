import { beforeEach, describe, expect, it } from 'vitest'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { collectProjectDraftKeys } from './projectDeletionDraftKeys.js'

describe('collectProjectDraftKeys', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('collects every supported draft format belonging to the target project', () => {
    const keys = [
      'project:p1:edit',
      'risk:p1:new',
      'milestone:p1:r1',
      'successCriterion:p1:new',
      'management-action:p1:a1',
      'evm-baseline:p1',
      'evm-snapshot:p1:new',
      'meeting-note:p1:m1',
      'weekly-report:p1:report-1',
      'weekly-report:p1:new:2026-10-11',
      'lesson-learned:p1:new',
      'lesson-learned:p1:lesson-1',
    ]

    keys.forEach((key) => {
      formDraftService.write(key, { title: key })
    })

    expect(collectProjectDraftKeys('p1').sort()).toEqual(
      keys.map((key) => `draft:${key}`).sort(),
    )
  })

  it('excludes other projects, global drafts, and unknown draft types', () => {
    const unrelated = [
      'project:new',
      'project:p10:edit',
      'risk:p10:new',
      'evm-baseline:p10',
      'weekly-report:p10:new:2026-10-11',
      'lesson-learned:p10:new',
      'lesson-learned:p1-other:new',
      'unknown:p1:new',
    ]

    unrelated.forEach((key) => {
      formDraftService.write(key, { title: key })
    })

    expect(collectProjectDraftKeys('p1')).toEqual([])

    unrelated.forEach((key) => {
      expect(formDraftService.read(key)).not.toBeNull()
    })
  })
})
