import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { calculateRiskScore, getRiskSeverity } from '../lib/risks.js'

const RISKS_STORAGE_KEY = 'risks'

const DEMO_RISKS = Object.freeze([
  {
    id: 'demo-risk-vendor',
    projectId: 'demo-project',
    title: 'Third-party dependency delay',
    description: 'A critical integration partner may miss the committed delivery window.',
    probability: 4,
    impact: 4,
    score: 16,
    severity: 'high',
    owner: 'Maya Chen',
    responseStrategy: 'mitigate',
    mitigation: 'Hold weekly dependency reviews and keep the fallback integration path ready.',
    dueDate: '2026-10-15',
    status: 'open',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-10-06T14:00:00.000Z',
  },
  {
    id: 'demo-risk-resourcing',
    projectId: 'demo-project',
    title: 'Resource constraints',
    description: 'Specialist availability could reduce throughput during the platform migration.',
    probability: 3,
    impact: 3,
    score: 9,
    severity: 'medium',
    owner: 'Alex Morgan',
    responseStrategy: 'mitigate',
    mitigation: 'Confirm specialist allocation two sprints ahead and maintain backup coverage.',
    dueDate: '2026-10-23',
    status: 'monitoring',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
  },
  {
    id: 'demo-risk-regulatory',
    projectId: 'demo-project',
    title: 'Regulatory timeline shift',
    description: 'External review dates may move and compress the planned compliance window.',
    probability: 2,
    impact: 4,
    score: 8,
    severity: 'medium',
    owner: 'Jordan Lee',
    responseStrategy: 'accept',
    mitigation: 'Track regulator updates weekly and protect contingency in the release plan.',
    dueDate: '2026-11-06',
    status: 'open',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-10-04T10:00:00.000Z',
  },
])

export class RisksServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'RisksServiceError'
  }
}

function cloneDemoRisks() {
  return DEMO_RISKS.map((risk) => ({ ...risk }))
}

function readRisks() {
  const storedRisks = storageAdapter.read(RISKS_STORAGE_KEY)

  if (storedRisks === null) {
    const demoRisks = cloneDemoRisks()
    storageAdapter.write(RISKS_STORAGE_KEY, demoRisks)
    return demoRisks
  }

  if (!Array.isArray(storedRisks)) {
    throw new RisksServiceError('Saved risk data is invalid. Reset local data and try again.')
  }

  return storedRisks
}

function writeRisks(risks) {
  storageAdapter.write(RISKS_STORAGE_KEY, risks)
  return risks
}

function normalizeRiskInput(input) {
  const probability = Number(input.probability)
  const impact = Number(input.impact)
  const score = calculateRiskScore(probability, impact)
  const severity = getRiskSeverity(score)

  if (score === null || severity === null) {
    throw new RisksServiceError('Probability and impact must be values from 1 to 5.')
  }

  return {
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    probability,
    impact,
    score,
    severity,
    owner: input.owner.trim(),
    responseStrategy: input.responseStrategy,
    mitigation: input.mitigation.trim(),
    dueDate: input.dueDate,
    status: input.status,
  }
}

function ensureRisk(risks, riskId) {
  const index = risks.findIndex((risk) => risk.id === riskId)
  if (index === -1) throw new RisksServiceError('Risk not found.')
  return index
}

export const risksService = {
  getSnapshot() {
    const storedRisks = storageAdapter.read(RISKS_STORAGE_KEY)
    if (storedRisks === null) return null
    if (!Array.isArray(storedRisks)) {
      throw new RisksServiceError('Saved risk data is invalid. Reset local data and try again.')
    }
    return storedRisks
  },

  async list() {
    return readRisks()
  },

  async create(input) {
    const risks = readRisks()
    const timestamp = new Date().toISOString()
    const risk = {
      id: globalThis.crypto.randomUUID(),
      ...normalizeRiskInput(input),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    writeRisks([risk, ...risks])
    return risk
  },

  async update(riskId, input) {
    const risks = readRisks()
    const index = ensureRisk(risks, riskId)
    const updatedRisk = {
      ...risks[index],
      ...normalizeRiskInput(input),
      updatedAt: new Date().toISOString(),
    }
    const nextRisks = [...risks]
    nextRisks[index] = updatedRisk
    writeRisks(nextRisks)
    return updatedRisk
  },

  async remove(riskId) {
    const risks = readRisks()
    ensureRisk(risks, riskId)
    writeRisks(risks.filter((risk) => risk.id !== riskId))
    return riskId
  },
}
