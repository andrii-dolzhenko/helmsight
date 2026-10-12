export const SUCCESS_CRITERIA_CATEGORIES = [
  { value: 'schedule', label: 'Schedule' },
  { value: 'financial', label: 'Financial' },
  { value: 'quality', label: 'Quality' },
  { value: 'adoption', label: 'Adoption' },
  { value: 'business', label: 'Business' },
  { value: 'operational', label: 'Operational' },
  { value: 'custom', label: 'Custom' },
]

export const SUCCESS_CRITERIA_METRIC_TYPES = [
  { value: 'manual', label: 'Manual metric' },
  { value: 'roi', label: 'ROI' },
  { value: 'grossMargin', label: 'Gross margin' },
  { value: 'profitMargin', label: 'Profit margin' },
]

export const SUCCESS_CRITERIA_UNITS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'currency', label: 'Currency' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
]

export const NUMERIC_DIRECTIONS = [
  { value: 'atLeast', label: 'At least target' },
  { value: 'atMost', label: 'At most target' },
]

export const DATE_DIRECTIONS = [
  { value: 'onOrBefore', label: 'On or before target' },
  { value: 'onOrAfter', label: 'On or after target' },
]

export const SUCCESS_CRITERIA_STATUS = Object.freeze({
  ON_TRACK: 'onTrack',
  AT_RISK: 'atRisk',
  ACHIEVED: 'achieved',
  MISSED: 'missed',
})

const STATUS_LABELS = Object.freeze({
  [SUCCESS_CRITERIA_STATUS.ON_TRACK]: 'On Track',
  [SUCCESS_CRITERIA_STATUS.AT_RISK]: 'At Risk',
  [SUCCESS_CRITERIA_STATUS.ACHIEVED]: 'Achieved',
  [SUCCESS_CRITERIA_STATUS.MISSED]: 'Missed',
})

const CATEGORY_LABELS = Object.fromEntries(
  SUCCESS_CRITERIA_CATEGORIES.map((item) => [item.value, item.label]),
)

const METRIC_TYPE_LABELS = Object.fromEntries(
  SUCCESS_CRITERIA_METRIC_TYPES.map((item) => [item.value, item.label]),
)

function roundMetric(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function calculateRoi(financialBenefit, investmentCost) {
  const benefit = toFiniteNumber(financialBenefit)
  const cost = toFiniteNumber(investmentCost)

  if (benefit === null || cost === null || cost <= 0) {
    return null
  }

  return roundMetric(((benefit - cost) / cost) * 100)
}

export function calculateGrossMargin(revenue, directCosts) {
  const revenueValue = toFiniteNumber(revenue)
  const directCostsValue = toFiniteNumber(directCosts)

  if (revenueValue === null || directCostsValue === null || revenueValue <= 0) {
    return null
  }

  return roundMetric(((revenueValue - directCostsValue) / revenueValue) * 100)
}

export function calculateProfitMargin(profit, revenue) {
  const profitValue = toFiniteNumber(profit)
  const revenueValue = toFiniteNumber(revenue)

  if (profitValue === null || revenueValue === null || revenueValue <= 0) {
    return null
  }

  return roundMetric((profitValue / revenueValue) * 100)
}

export function calculateCriterionCurrentValue(metricType, calculationInputs = {}) {
  if (metricType === 'roi') {
    return calculateRoi(
      calculationInputs.financialBenefit,
      calculationInputs.investmentCost,
    )
  }

  if (metricType === 'grossMargin') {
    return calculateGrossMargin(
      calculationInputs.revenue,
      calculationInputs.directCosts,
    )
  }

  if (metricType === 'profitMargin') {
    return calculateProfitMargin(
      calculationInputs.profit,
      calculationInputs.revenue,
    )
  }

  return null
}

export function normalizeCriterionValue(value, unit) {
  if (unit === 'date') {
    return String(value ?? '')
  }

  return toFiniteNumber(value)
}

function criterionTargetSatisfied(criterion) {
  const { currentValue, target, direction, unit } = criterion

  if (unit === 'date') {
    if (!currentValue || !target) {
      return false
    }

    if (direction === 'onOrAfter') {
      return currentValue >= target
    }

    return currentValue <= target
  }

  const current = toFiniteNumber(currentValue)
  const targetValue = toFiniteNumber(target)

  if (current === null || targetValue === null) {
    return false
  }

  if (direction === 'atMost') {
    return current <= targetValue
  }

  return current >= targetValue
}

function toLocalDateKey(date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysUntilDate(targetDate, today) {
  const startDay = Date.parse(`${toLocalDateKey(today)}T00:00:00Z`)
  const endDay = Date.parse(`${targetDate}T00:00:00Z`)

  if (Number.isNaN(endDay)) {
    return Number.POSITIVE_INFINITY
  }

  return (endDay - startDay) / 86_400_000
}

export function evaluateSuccessCriterion(criterion, today = new Date()) {
  if (criterionTargetSatisfied(criterion)) {
    return SUCCESS_CRITERIA_STATUS.ACHIEVED
  }

  if (!criterion.targetDate) {
    return SUCCESS_CRITERIA_STATUS.ON_TRACK
  }

  const daysRemaining = daysUntilDate(criterion.targetDate, today)

  if (daysRemaining < 0) {
    return SUCCESS_CRITERIA_STATUS.MISSED
  }

  if (daysRemaining <= 14) {
    return SUCCESS_CRITERIA_STATUS.AT_RISK
  }

  return SUCCESS_CRITERIA_STATUS.ON_TRACK
}

export function getSuccessCriterionStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Unknown'
}

export function getSuccessCriterionCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? 'Custom'
}

export function getSuccessCriterionMetricTypeLabel(metricType) {
  return METRIC_TYPE_LABELS[metricType] ?? 'Manual metric'
}

export function formatCriterionValue(value, unit) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (unit === 'date') {
    const date = new Date(`${value}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '—'
  }

  if (unit === 'percentage') {
    return `${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
  }

  if (unit === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(number)
  }

  return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
