import {
  EVM_PERFORMANCE_STATE,
  calculateEvmMetrics,
  getPerformanceState,
} from '../../features/evm/lib/evm.js'
import { isValidCalendarDate } from '../../shared/lib/calendarDate.js'

export const GLOBAL_METRICS_PAGE_SIZE = 10

export const METRICS_SORT = Object.freeze({
  ATTENTION: 'attention',
  PROJECT: 'project',
  SNAPSHOT: 'snapshot',
  SPI: 'spi',
  CPI: 'cpi',
})

const severityRank = {
  [EVM_PERFORMANCE_STATE.PRESSURE]: 0,
  [EVM_PERFORMANCE_STATE.WATCH]: 1,
  [EVM_PERFORMANCE_STATE.HEALTHY]: 2,
  [EVM_PERFORMANCE_STATE.NOT_AVAILABLE]: 3,
}

// A snapshot can be missing from an otherwise valid baseline: do not infer a performance score.
function latestValidSnapshot(snapshots) {
  return [...snapshots]
    .filter((item) => isValidCalendarDate(item.snapshotDate))
    .sort((a, b) => String(b.snapshotDate).localeCompare(String(a.snapshotDate)) ||
      String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')) ||
      String(a.id).localeCompare(String(b.id)))[0] ?? null
}

export function deriveProjectEvmPerformance(project, baseline, snapshots = []) {
  const latest = latestValidSnapshot(snapshots)
  const hasBaseline = Boolean(baseline?.workPackages?.length)
  const measurementBasis = baseline?.measurementBasis ?? null
  const metrics = hasBaseline && latest
    ? calculateEvmMetrics(baseline, snapshots.filter((item) => isValidCalendarDate(item.snapshotDate)), latest.snapshotDate)
    : null

  const spi = Number.isFinite(metrics?.spi) ? metrics.spi : null
  const cpi = measurementBasis !== 'storyPoints' && Number.isFinite(metrics?.cpi)
    ? metrics.cpi
    : null
  const indexStates = [spi, cpi]
    .filter((value) => value !== null)
    .map(getPerformanceState)
  const performance = indexStates.length
    ? indexStates.sort((a, b) => severityRank[a] - severityRank[b])[0]
    : EVM_PERFORMANCE_STATE.NOT_AVAILABLE

  return {
    project,
    projectId: project.id,
    measurementBasis,
    currencyCode: baseline?.currencyCode ?? null,
    snapshotDate: latest?.snapshotDate ?? null,
    spi,
    cpi,
    performance,
  }
}

// Only the project picker changes KPI scope. Search/basis/performance filters apply to the register.
export function deriveGlobalMetricsView({
  projects = [],
  baselines = [],
  snapshots = [],
  projectId = 'all',
  includeArchivedProjects = false,
  query = '',
  measurementBasis = 'all',
  performance = 'all',
  sort = METRICS_SORT.ATTENTION,
}) {
  const eligibleProjects = projects.filter((project) => includeArchivedProjects || !project.archivedAt)
  const scopedProjects = eligibleProjects.filter((project) => projectId === 'all' || project.id === projectId)
  const baselineByProject = new Map(baselines.map((baseline) => [baseline.projectId, baseline]))
  const snapshotsByProject = new Map()
  for (const snapshot of snapshots) {
    if (!snapshotsByProject.has(snapshot.projectId)) snapshotsByProject.set(snapshot.projectId, [])
    snapshotsByProject.get(snapshot.projectId).push(snapshot)
  }

  const records = scopedProjects.map((project) => deriveProjectEvmPerformance(
    project,
    baselineByProject.get(project.id),
    snapshotsByProject.get(project.id) ?? [],
  ))

  const summary = {
    reporting: records.filter((item) => item.performance !== EVM_PERFORMANCE_STATE.NOT_AVAILABLE).length,
    attention: records.filter((item) => item.performance === EVM_PERFORMANCE_STATE.PRESSURE).length,
    watch: records.filter((item) => item.performance === EVM_PERFORMANCE_STATE.WATCH).length,
    missing: records.filter((item) => item.performance === EVM_PERFORMANCE_STATE.NOT_AVAILABLE).length,
  }

  const needle = query.trim().toLocaleLowerCase()
  const visibleRecords = records.filter((record) =>
    (!needle || record.project.name.toLocaleLowerCase().includes(needle)) &&
    (measurementBasis === 'all' || (measurementBasis === 'missing' ? record.measurementBasis === null : record.measurementBasis === measurementBasis)) &&
    (performance === 'all' || record.performance === performance),
  ).sort((a, b) => {
    const result = sort === METRICS_SORT.PROJECT
      ? a.project.name.localeCompare(b.project.name)
      : sort === METRICS_SORT.SNAPSHOT
        ? String(b.snapshotDate ?? '').localeCompare(String(a.snapshotDate ?? ''))
        : sort === METRICS_SORT.SPI
          ? (a.spi ?? Number.POSITIVE_INFINITY) - (b.spi ?? Number.POSITIVE_INFINITY)
          : sort === METRICS_SORT.CPI
            ? (a.cpi ?? Number.POSITIVE_INFINITY) - (b.cpi ?? Number.POSITIVE_INFINITY)
            : severityRank[a.performance] - severityRank[b.performance]
    return result || a.project.name.localeCompare(b.project.name) || String(a.projectId).localeCompare(String(b.projectId))
  })

  return {
    eligibleProjects,
    scopedCount: records.length,
    summary,
    visibleRecords,
  }
}
