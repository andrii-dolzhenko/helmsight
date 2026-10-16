import { describe, expect, it } from 'vitest'
import { HELP_FAQS, HELP_TOPICS } from './helpContent.js'

describe('Help content contracts', () => {
  it('uses unique in-page targets, real destination paths and substantive instructions', () => {
    expect(HELP_TOPICS).toHaveLength(5)
    expect(new Set(HELP_TOPICS.map((topic) => topic.id)).size).toBe(HELP_TOPICS.length)
    for (const topic of HELP_TOPICS) {
      expect(topic.intro.length).toBeGreaterThan(20)
      expect(topic.guides.length).toBeGreaterThanOrEqual(2)
      for (const guide of topic.guides) {
        expect(guide.steps.length).toBeGreaterThanOrEqual(2)
        expect(guide.link.to).toMatch(/^\/(projects|overview|meetings|metrics|risks)$/)
      }
    }
  })

  it('provides meaningful answers without advertising nonexistent capabilities', () => {
    expect(HELP_FAQS.length).toBeGreaterThanOrEqual(5)
    expect(new Set(HELP_FAQS.map((faq) => faq.question)).size).toBe(HELP_FAQS.length)
    for (const faq of HELP_FAQS) {
      expect(faq.answer.length).toBeGreaterThan(50)
    }
    const userCopy = JSON.stringify({ topics: HELP_TOPICS, faqs: HELP_FAQS })
    expect(userCopy).not.toMatch(/Redux|storageAdapter|ADR-\d+|React|educational prototype|localStorage/)
  })
})
