export const EVM_MEASUREMENT_BASES = Object.freeze([
  { value: 'hours', label: 'Hours', shortUnit: 'h' },
  { value: 'personDays', label: 'Person-days', shortUnit: 'd' },
  { value: 'currency', label: 'Currency', shortUnit: null },
  { value: 'storyPoints', label: 'Story points', shortUnit: 'SP' },
])

export const EVM_CURRENCY_CODES = Object.freeze(['USD', 'EUR', 'GBP', 'UAH'])

export const EVM_PERFORMANCE_STATE = Object.freeze({
  HEALTHY: 'healthy',
  WATCH: 'watch',
  PRESSURE: 'pressure',
  NOT_AVAILABLE: 'notAvailable',
})

export function isFullEvmBasis(measurementBasis) {
  return measurementBasis !== 'storyPoints'
}

export function getMeasurementBasisLabel(measurementBasis) {
  return EVM_MEASUREMENT_BASES.find((option) => option.value === measurementBasis)?.label ?? measurementBasis
}

export function getMeasurementUnit(baseline) {
  if (!baseline) return ''
  if (baseline.measurementBasis === 'currency') return baseline.currencyCode || 'USD'
  return EVM_MEASUREMENT_BASES.find((option) => option.value === baseline.measurementBasis)?.shortUnit ?? ''
}

export function formatEvmValue(value, baseline, options = {}) {
  if (!Number.isFinite(value)) return '—'

  const { maximumFractionDigits = 1, minimumFractionDigits = 0 } = options

  if (baseline?.measurementBasis === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: baseline.currencyCode || 'USD',
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(value)
  }

  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value)
  const unit = getMeasurementUnit(baseline)
  return unit ? `${formatted} ${unit}` : formatted
}

export function formatIndex(value) {
  if (!Number.isFinite(value)) return '—'
  const normalized = Object.is(value, -0) ? 0 : value
  return normalized.toFixed(2)
}

function toDate(value) {
  return new Date(`${value}T00:00:00`)
}

function isWeekday(date) {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function countWorkingDaysInclusive(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = toDate(startDate)
  const end = toDate(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0

  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    if (isWeekday(cursor)) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export function calculateBaselineBAC(baseline) {
  if (!baseline?.workPackages?.length) return 0
  return baseline.workPackages.reduce((total, item) => total + (Number(item.budgetValue) || 0), 0)
}

export function calculatePackagePV(workPackage, snapshotDate) {
  const budget = Number(workPackage?.budgetValue)
  if (!Number.isFinite(budget) || budget <= 0 || !snapshotDate) return 0

  const snapshot = toDate(snapshotDate)
  const start = toDate(workPackage.startDate)
  const end = toDate(workPackage.endDate)
  if ([snapshot, start, end].some((date) => Number.isNaN(date.getTime()))) return 0
  if (snapshot < start) return 0
  if (snapshot >= end) return budget

  const totalWorkingDays = countWorkingDaysInclusive(workPackage.startDate, workPackage.endDate)
  if (totalWorkingDays <= 0) return 0

  const cutoff = snapshot < end ? snapshot : end
  const elapsedWorkingDays = countWorkingDaysInclusive(workPackage.startDate, toDateKey(cutoff))
  return Math.min(budget, (budget / totalWorkingDays) * elapsedWorkingDays)
}

export function calculatePV(baseline, snapshotDate) {
  if (!baseline?.workPackages?.length) return 0
  return baseline.workPackages.reduce(
    (total, item) => total + calculatePackagePV(item, snapshotDate),
    0,
  )
}

export function sortSnapshotsByDate(snapshots) {
  return [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
}

function sumEntries(snapshots, key) {
  return snapshots.reduce(
    (total, snapshot) => total + snapshot.entries.reduce(
      (entryTotal, entry) => entryTotal + (Number(entry[key]) || 0),
      0,
    ),
    0,
  )
}

export function getCumulativePackageEarned(snapshots, packageId) {
  return snapshots.reduce((total, snapshot) => {
    const entry = snapshot.entries.find((item) => item.packageId === packageId)
    return total + (Number(entry?.earnedValue) || 0)
  }, 0)
}

function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

export function calculateEvmMetrics(baseline, snapshots, snapshotDate = null) {
  if (!baseline) return null
  const ordered = sortSnapshotsByDate(snapshots ?? [])
  const cutoff = snapshotDate ?? ordered.at(-1)?.snapshotDate ?? null
  const included = cutoff ? ordered.filter((item) => item.snapshotDate <= cutoff) : []
  const bac = calculateBaselineBAC(baseline)
  const pv = cutoff ? calculatePV(baseline, cutoff) : 0
  const ev = sumEntries(included, 'earnedValue')
  const spi = safeDivide(ev, pv)
  const sv = ev - pv

  if (!isFullEvmBasis(baseline.measurementBasis)) {
    return {
      snapshotDate: cutoff,
      bac,
      pv,
      ev,
      ac: null,
      cv: null,
      sv,
      cpi: null,
      spi,
      eac: null,
      etc: null,
      vac: null,
      tcpi: null,
    }
  }

  const ac = sumEntries(included, 'actualValue')
  const cv = ev - ac
  const cpi = safeDivide(ev, ac)
  const eac = Number.isFinite(cpi) && cpi > 0 ? bac / cpi : null
  const etc = Number.isFinite(eac) ? eac - ac : null
  const vac = Number.isFinite(eac) ? bac - eac : null
  const tcpi = safeDivide(bac - ev, bac - ac)

  return {
    snapshotDate: cutoff,
    bac,
    pv,
    ev,
    ac,
    cv,
    sv,
    cpi,
    spi,
    eac,
    etc,
    vac,
    tcpi,
  }
}

export function buildEvmHistory(baseline, snapshots) {
  if (!baseline) return []

  const ordered = sortSnapshotsByDate(snapshots ?? [])
  return ordered.map((snapshot) => {
    const metrics = calculateEvmMetrics(baseline, ordered, snapshot.snapshotDate)
    return {
      snapshotDate: snapshot.snapshotDate,
      pv: metrics?.pv ?? 0,
      ev: metrics?.ev ?? 0,
      ac: metrics?.ac ?? null,
      spi: metrics?.spi ?? null,
      cpi: metrics?.cpi ?? null,
    }
  })
}

export function getPerformanceState(indexValue) {
  if (!Number.isFinite(indexValue)) return EVM_PERFORMANCE_STATE.NOT_AVAILABLE
  if (indexValue >= 1) return EVM_PERFORMANCE_STATE.HEALTHY
  if (indexValue >= 0.95) return EVM_PERFORMANCE_STATE.WATCH
  return EVM_PERFORMANCE_STATE.PRESSURE
}

export function getPerformanceStateLabel(state) {
  if (state === EVM_PERFORMANCE_STATE.HEALTHY) return 'Healthy'
  if (state === EVM_PERFORMANCE_STATE.WATCH) return 'Watch'
  if (state === EVM_PERFORMANCE_STATE.PRESSURE) return 'Needs attention'
  return 'Not available'
}
