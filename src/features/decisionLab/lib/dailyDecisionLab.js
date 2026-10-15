import { DECISION_SCENARIOS } from './scenarios.js'

export const DAILY_QUESTION_COUNT = 3

// Use the browser's civil date, not toISOString() (which is UTC).
export function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDailyScenarios(dayKey) {
  if (typeof dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new Error('A local calendar date is required.')
  }
  const [year, month, day] = dayKey.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day)
  if (new Date(utc).toISOString().slice(0, 10) !== dayKey) {
    throw new Error('A valid local calendar date is required.')
  }
  // Civil-day ordinal is stable across timezones and DST changes.
  const dayOrdinal = Math.floor(utc / 86400000)
  const batch = ((dayOrdinal % 3) + 3) % 3
  return DECISION_SCENARIOS.slice(batch * DAILY_QUESTION_COUNT, (batch + 1) * DAILY_QUESTION_COUNT)
}

export function createDailySession(dayKey) {
  return { dayKey, phase: 'question', answers: [] }
}

export function isDailySetAvailable(session) {
  return !session || session.phase !== 'complete'
}

export function getRecommendedCount(session, scenarios) {
  return session.answers.filter((answer) =>
    scenarios.some((scenario) => scenario.id === answer.scenarioId && scenario.recommendedId === answer.optionId),
  ).length
}
