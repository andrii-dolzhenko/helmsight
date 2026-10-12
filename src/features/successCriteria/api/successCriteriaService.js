import { isValidCalendarDate } from '../../../shared/lib/calendarDate.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import {
  calculateCriterionCurrentValue,
  normalizeCriterionValue,
} from '../lib/successCriteria.js'

const SUCCESS_CRITERIA_STORAGE_KEY = 'successCriteria'

const DEMO_SUCCESS_CRITERIA = Object.freeze([
  {
    id: 'demo-success-adoption',
    projectId: 'demo-project',
    title: 'Operational adoption',
    description: 'Reach sustained adoption of the modernized delivery workflow across the target user group.',
    category: 'adoption',
    metricType: 'manual',
    baseline: 35,
    target: 80,
    currentValue: 62,
    unit: 'percentage',
    targetDate: '2027-01-31',
    direction: 'atLeast',
    calculationInputs: null,
    createdAt: '2026-09-10T09:00:00.000Z',
    updatedAt: '2026-10-06T12:00:00.000Z',
  },
  {
    id: 'demo-success-roi',
    projectId: 'demo-project',
    title: 'Transformation ROI',
    description: 'Maintain a positive return on the delivery-platform modernization investment.',
    category: 'financial',
    metricType: 'roi',
    baseline: 0,
    target: 20,
    currentValue: 50,
    unit: 'percentage',
    targetDate: '2027-02-27',
    direction: 'atLeast',
    calculationInputs: {
      financialBenefit: 1_500_000,
      investmentCost: 1_000_000,
    },
    createdAt: '2026-09-10T09:00:00.000Z',
    updatedAt: '2026-10-06T12:00:00.000Z',
  },
])

export class SuccessCriteriaServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'SuccessCriteriaServiceError'
  }
}

function cloneDemoSuccessCriteria() {
  return DEMO_SUCCESS_CRITERIA.map((criterion) => ({
    ...criterion,
    calculationInputs: criterion.calculationInputs
      ? { ...criterion.calculationInputs }
      : null,
  }))
}

function readSuccessCriteria() {
  const storedCriteria = storageAdapter.read(SUCCESS_CRITERIA_STORAGE_KEY)

  if (storedCriteria === null) {
    const demoCriteria = cloneDemoSuccessCriteria()
    storageAdapter.write(SUCCESS_CRITERIA_STORAGE_KEY, demoCriteria)
    return demoCriteria
  }

  if (!Array.isArray(storedCriteria)) {
    throw new SuccessCriteriaServiceError(
      'Saved success-criteria data is invalid. Reset local data and try again.',
    )
  }

  return storedCriteria
}

function writeSuccessCriteria(criteria) {
  storageAdapter.write(SUCCESS_CRITERIA_STORAGE_KEY, criteria)
  return criteria
}

function normalizeManualInput(input) {
  return {
    category: input.category,
    metricType: 'manual',
    baseline: normalizeCriterionValue(input.baseline, input.unit),
    target: normalizeCriterionValue(input.target, input.unit),
    currentValue: normalizeCriterionValue(input.currentValue, input.unit),
    unit: input.unit,
    targetDate: input.targetDate,
    direction: input.direction,
    calculationInputs: null,
  }
}

function normalizeCalculatedInput(input) {
  const calculationInputs = Object.fromEntries(
    Object.entries(input.calculationInputs ?? {}).map(([key, value]) => [key, Number(value)]),
  )
  const currentValue = calculateCriterionCurrentValue(
    input.metricType,
    calculationInputs,
  )

  if (currentValue === null) {
    throw new SuccessCriteriaServiceError(
      'Calculated metric inputs are invalid. Check the denominator and try again.',
    )
  }

  return {
    category: 'financial',
    metricType: input.metricType,
    baseline: Number(input.baseline),
    target: Number(input.target),
    currentValue,
    unit: 'percentage',
    targetDate: input.targetDate,
    direction: 'atLeast',
    calculationInputs,
  }
}

function normalizeCriterionInput(input) {
  if (
    input.targetDate != null &&
    input.targetDate !== '' &&
    !isValidCalendarDate(input.targetDate)
  ) {
    throw new SuccessCriteriaServiceError('Choose a valid target date.')
  }

  const normalizedMetric =
    input.metricType === 'manual'
      ? normalizeManualInput(input)
      : normalizeCalculatedInput(input)

  return {
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    ...normalizedMetric,
  }
}

function findCriterionIndex(criteria, criterionId) {
  return criteria.findIndex((criterion) => criterion.id === criterionId)
}

function ensureCriterion(criteria, criterionId) {
  const criterionIndex = findCriterionIndex(criteria, criterionId)

  if (criterionIndex === -1) {
    throw new SuccessCriteriaServiceError('Success criterion not found.')
  }

  return criterionIndex
}

export const successCriteriaService = {
  getSnapshot() {
    const storedCriteria = storageAdapter.read(SUCCESS_CRITERIA_STORAGE_KEY)

    if (storedCriteria === null) {
      return null
    }

    if (!Array.isArray(storedCriteria)) {
      throw new SuccessCriteriaServiceError(
        'Saved success-criteria data is invalid. Reset local data and try again.',
      )
    }

    return storedCriteria
  },

  async list() {
    return readSuccessCriteria()
  },

  async create(input) {
    const criteria = readSuccessCriteria()
    const timestamp = new Date().toISOString()
    const criterion = {
      id: globalThis.crypto.randomUUID(),
      ...normalizeCriterionInput(input),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    writeSuccessCriteria([criterion, ...criteria])
    return criterion
  },

  async update(criterionId, input) {
    const criteria = readSuccessCriteria()
    const criterionIndex = ensureCriterion(criteria, criterionId)
    const updatedCriterion = {
      ...criteria[criterionIndex],
      ...normalizeCriterionInput(input),
      updatedAt: new Date().toISOString(),
    }

    const nextCriteria = [...criteria]
    nextCriteria[criterionIndex] = updatedCriterion
    writeSuccessCriteria(nextCriteria)

    return updatedCriterion
  },

  async remove(criterionId) {
    const criteria = readSuccessCriteria()
    ensureCriterion(criteria, criterionId)
    writeSuccessCriteria(criteria.filter((criterion) => criterion.id !== criterionId))
    return criterionId
  },
}
