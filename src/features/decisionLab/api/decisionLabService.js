import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { createDailySession, getDailyScenarios, getLocalDayKey } from '../lib/dailyDecisionLab.js'

const STORAGE_KEY = 'decisionLab:sessions:v1'
const RETAIN_DAYS = 30

export class DecisionLabError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DecisionLabError'
  }
}

function readSessions() {
  const stored = storageAdapter.read(STORAGE_KEY)
  if (stored === null) return {}
  if (!stored || typeof stored !== 'object' || Array.isArray(stored) || stored.version !== 1 ||
      !stored.sessions || typeof stored.sessions !== 'object' || Array.isArray(stored.sessions)) {
    throw new DecisionLabError('Saved Decision Lab progress is invalid. Your answers have not been changed.')
  }
  return stored.sessions
}

function validateSession(value, dayKey) {
  if (!value) return createDailySession(dayKey)
  const scenarios = getDailyScenarios(dayKey)
  if (value.dayKey !== dayKey || !Array.isArray(value.answers) || !['question', 'feedback', 'complete'].includes(value.phase) ||
      value.answers.length > scenarios.length) {
    throw new DecisionLabError('Saved Decision Lab progress is invalid. Your answers have not been changed.')
  }
  for (const [index, answer] of value.answers.entries()) {
    if (answer?.scenarioId !== scenarios[index]?.id ||
        !scenarios[index]?.options.some((option) => option.id === answer.optionId)) {
      throw new DecisionLabError('Saved Decision Lab answers do not match today’s scenarios.')
    }
  }
  if ((value.phase === 'feedback' && value.answers.length === 0) ||
      (value.phase === 'complete' && value.answers.length !== scenarios.length) ||
      (value.phase === 'question' && value.answers.length === scenarios.length)) {
    throw new DecisionLabError('Saved Decision Lab progress has an invalid stage.')
  }
  return { dayKey, phase: value.phase, answers: value.answers.map(({ scenarioId, optionId }) => ({ scenarioId, optionId })) }
}

function writeSession(dayKey, next) {
  const sessions = readSessions()
  const cutoff = new Date(`${dayKey}T12:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - RETAIN_DAYS)
  const retained = Object.fromEntries(Object.entries(sessions).filter(([key]) =>
    key >= cutoff.toISOString().slice(0, 10) && key <= dayKey,
  ))
  storageAdapter.write(STORAGE_KEY, { version: 1, sessions: { ...retained, [dayKey]: next } })
  return next
}

export const decisionLabService = {
  getToday(date = new Date()) {
    const dayKey = getLocalDayKey(date)
    return validateSession(readSessions()[dayKey], dayKey)
  },

  submit(optionId, date = new Date()) {
    const dayKey = getLocalDayKey(date)
    const session = this.getToday(date)
    const scenario = getDailyScenarios(dayKey)[session.answers.length]
    if (session.phase !== 'question' || !scenario || !scenario.options.some((option) => option.id === optionId)) {
      throw new DecisionLabError('Choose an available answer for the current question.')
    }
    return writeSession(dayKey, {
      ...session,
      phase: 'feedback',
      answers: [...session.answers, { scenarioId: scenario.id, optionId }],
    })
  },

  advance(date = new Date()) {
    const dayKey = getLocalDayKey(date)
    const session = this.getToday(date)
    if (session.phase !== 'feedback') {
      throw new DecisionLabError('Review the current decision before continuing.')
    }
    return writeSession(dayKey, {
      ...session,
      phase: session.answers.length === 3 ? 'complete' : 'question',
    })
  },
}
