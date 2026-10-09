export const RISK_PROBABILITY = Object.freeze([
  { value: 1, label: 'Rare' },
  { value: 2, label: 'Unlikely' },
  { value: 3, label: 'Possible' },
  { value: 4, label: 'Likely' },
  { value: 5, label: 'Almost certain' },
])

export const RISK_IMPACT = Object.freeze([
  { value: 1, label: 'Insignificant' },
  { value: 2, label: 'Minor' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Major' },
  { value: 5, label: 'Severe' },
])

export const RISK_RESPONSE_STRATEGIES = Object.freeze([
  { value: 'avoid', label: 'Avoid' },
  { value: 'mitigate', label: 'Mitigate' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'accept', label: 'Accept' },
])

export const RISK_STATUSES = Object.freeze([
  { value: 'open', label: 'Open' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
])

export const RISK_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
})

export function calculateRiskScore(probability, impact) {
  const p = Number(probability)
  const i = Number(impact)

  if (!Number.isInteger(p) || !Number.isInteger(i) || p < 1 || p > 5 || i < 1 || i > 5) {
    return null
  }

  return p * i
}

export function getRiskSeverity(score) {
  const value = Number(score)

  if (!Number.isFinite(value) || value < 1 || value > 25) {
    return null
  }

  if (value <= 4) return RISK_SEVERITY.LOW
  if (value <= 9) return RISK_SEVERITY.MEDIUM
  if (value <= 16) return RISK_SEVERITY.HIGH
  return RISK_SEVERITY.CRITICAL
}

export function getRiskSeverityLabel(severity) {
  return {
    [RISK_SEVERITY.LOW]: 'Low',
    [RISK_SEVERITY.MEDIUM]: 'Medium',
    [RISK_SEVERITY.HIGH]: 'High',
    [RISK_SEVERITY.CRITICAL]: 'Critical',
  }[severity] ?? 'Unknown'
}

export function getRiskStatusLabel(status) {
  return RISK_STATUSES.find((item) => item.value === status)?.label ?? status
}

export function getRiskResponseLabel(strategy) {
  return RISK_RESPONSE_STRATEGIES.find((item) => item.value === strategy)?.label ?? strategy
}

export function getRiskProbabilityLabel(value) {
  return RISK_PROBABILITY.find((item) => item.value === Number(value))?.label ?? value
}

export function getRiskImpactLabel(value) {
  return RISK_IMPACT.find((item) => item.value === Number(value))?.label ?? value
}

export function isRiskOperational(risk) {
  return risk.status !== 'closed'
}

export function isRiskDueSoon(risk, today = new Date(), windowDays = 14) {
  if (!isRiskOperational(risk) || !risk.dueDate) {
    return false
  }

  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + windowDays)
  const due = new Date(`${risk.dueDate}T00:00:00`)

  return due >= start && due <= end
}

export function isRiskOverdue(risk, today = new Date()) {
  if (!isRiskOperational(risk) || !risk.dueDate) {
    return false
  }

  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const due = new Date(`${risk.dueDate}T00:00:00`)
  return due < start
}
