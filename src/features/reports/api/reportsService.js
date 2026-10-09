import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { getReportPeriod, REPORT_STATUS } from '../lib/weeklyReport.js'

const REPORTS_STORAGE_KEY = 'weeklyReports'
const REPORTS_DEMO_SEED_VERSION_KEY = 'weeklyReportsDemoSeedVersion'
const REPORTS_DEMO_SEED_VERSION = 2
const MAX_EXECUTIVE_SUMMARY = 1500
const MAX_NARRATIVE_ITEM = 300
const MAX_OWNER = 100
const MIN_TEXT_LENGTH = 2

const DEMO_REPORTS = Object.freeze([
  {
    id: 'demo-report-2026-10-02',
    projectId: 'demo-project',
    periodStart: '2026-09-26',
    periodEnd: '2026-10-02',
    status: REPORT_STATUS.FINAL,
    narrative: {
      executiveSummary:
        'Delivery remains under schedule and cost pressure, while governance and executive reporting controls are now established. The team is protecting the migration path and focusing management attention on delivery efficiency and the external dependency window.',
      achievements: [
        'Executive reporting baseline approved and moved into the weekly operating cadence.',
        'Frontend, backend, and QA workstreams advanced against the approved EVM baseline.',
        'Regulatory evidence ownership was escalated into the management action register.',
      ],
      issuesBlockers: [
        'Delivery efficiency remains below target and requires recovery actions before the next migration checkpoint.',
      ],
      managementAttention: [
        'Confirm ownership and review timing for the regulatory evidence pack.',
        'Maintain sponsor visibility on schedule and cost performance until SPI/CPI recover.',
      ],
      nextWeekFocus: [
        'Close the regulatory ownership action and confirm the migration support window.',
        'Review workstream recovery options against the approved baseline.',
      ],
    },
    dismissedSignalIds: [],
    snapshot: {
      capturedAt: '2026-10-02T16:30:00.000Z',
      projectHealth: {
        status: 'attention',
        label: 'Needs attention',
        reasons: ['SPI delivery performance', 'CPI delivery performance'],
      },
      metrics: {
        asOf: '2026-10-02',
        measurementBasis: 'hours',
        currencyCode: null,
        pv: 603.8888888888889,
        ev: 470,
        ac: 544,
        spi: 0.7782888684452621,
        cpi: 0.8639705882352942,
      },
      risks: {
        totalOpen: 3,
        high: 1,
        critical: 0,
        items: [
          { id: 'demo-risk-vendor', title: 'Third-party dependency delay', owner: 'Maya Chen', dueDate: '2026-10-15', score: 16, severity: 'high', status: 'open' },
          { id: 'demo-risk-resourcing', title: 'Resource constraints', owner: 'Alex Morgan', dueDate: '2026-10-23', score: 9, severity: 'medium', status: 'monitoring' },
          { id: 'demo-risk-regulatory', title: 'Regulatory timeline shift', owner: 'Jordan Lee', dueDate: '2026-11-06', score: 8, severity: 'medium', status: 'open' },
        ],
      },
      milestones: {
        total: 3,
        completed: 1,
        overdue: 0,
        items: [],
      },
      successCriteria: {
        onTrack: 1,
        atRisk: 0,
        achieved: 1,
        missed: 0,
        items: [
          { id: 'demo-success-adoption', title: 'Operational adoption', targetDate: '2027-01-31', currentValue: 62, target: 80, unit: 'percentage', status: 'onTrack' },
          { id: 'demo-success-roi', title: 'Transformation ROI', targetDate: '2027-02-27', currentValue: 50, target: 20, unit: 'percentage', status: 'achieved' },
        ],
      },
      upcomingItems: [],
      attentionSignals: [
        { id: 'evm:spi', module: 'Metrics', title: 'SPI delivery performance', detail: 'SPI is 0.78 against the 1.00 target.', state: 'attention', date: '2026-10-02' },
        { id: 'evm:cpi', module: 'Metrics', title: 'CPI delivery performance', detail: 'CPI is 0.86 against the 1.00 target.', state: 'attention', date: '2026-10-02' },
      ],
    },
    version: 2,
    owner: 'Alex Morgan',
    createdAt: '2026-10-02T16:20:00.000Z',
    updatedAt: '2026-10-02T16:35:00.000Z',
    finalizedAt: '2026-10-02T16:35:00.000Z',
    archivedAt: null,
  },
])

export class ReportsServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'ReportsServiceError'
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function cloneDemoReports() {
  return clone(DEMO_REPORTS)
}

function mergeMissingDemoReports(reports) {
  const merged = [...reports]
  cloneDemoReports().forEach((demoReport) => {
    const exists = merged.some(
      (report) => report.id === demoReport.id
        || (report.projectId === demoReport.projectId && report.periodEnd === demoReport.periodEnd),
    )
    if (!exists) merged.unshift(demoReport)
  })
  return merged
}

function normalizeDismissedSignalIds(values) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]
}

function normalizeStoredReport(report) {
  return {
    ...report,
    dismissedSignalIds: normalizeDismissedSignalIds(report?.dismissedSignalIds),
    archivedAt: report?.archivedAt ?? null,
  }
}

function readReports() {
  const stored = storageAdapter.read(REPORTS_STORAGE_KEY)

  if (stored === null) {
    const demo = cloneDemoReports()
    storageAdapter.write(REPORTS_STORAGE_KEY, demo)
    storageAdapter.write(REPORTS_DEMO_SEED_VERSION_KEY, REPORTS_DEMO_SEED_VERSION)
    return demo
  }

  if (!Array.isArray(stored)) {
    throw new ReportsServiceError('Saved weekly report data is invalid. Reset local data and try again.')
  }

  let normalized = stored.map(normalizeStoredReport)
  const seedVersion = Number(storageAdapter.read(REPORTS_DEMO_SEED_VERSION_KEY) ?? 0)

  if (seedVersion < REPORTS_DEMO_SEED_VERSION) {
    normalized = mergeMissingDemoReports(normalized)
    storageAdapter.write(REPORTS_STORAGE_KEY, normalized)
    storageAdapter.write(REPORTS_DEMO_SEED_VERSION_KEY, REPORTS_DEMO_SEED_VERSION)
  }

  return normalized
}

function writeReports(reports) {
  storageAdapter.write(REPORTS_STORAGE_KEY, reports)
  return reports
}

function normalizeList(values, label) {
  if (!Array.isArray(values)) return []

  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .map((value) => {
      if (value.length < MIN_TEXT_LENGTH) {
        throw new ReportsServiceError(`${label} items must use at least ${MIN_TEXT_LENGTH} characters.`)
      }
      if (value.length > MAX_NARRATIVE_ITEM) {
        throw new ReportsServiceError(`${label} items must use ${MAX_NARRATIVE_ITEM} characters or fewer.`)
      }
      return value
    })
}

function normalizeNarrative(narrative = {}) {
  const executiveSummary = String(narrative.executiveSummary ?? '').trim()
  if (!executiveSummary) throw new ReportsServiceError('Executive Summary is required.')
  if (executiveSummary.length < MIN_TEXT_LENGTH) {
    throw new ReportsServiceError(`Executive Summary must use at least ${MIN_TEXT_LENGTH} characters.`)
  }
  if (executiveSummary.length > MAX_EXECUTIVE_SUMMARY) {
    throw new ReportsServiceError(`Executive Summary must use ${MAX_EXECUTIVE_SUMMARY.toLocaleString('en-US')} characters or fewer.`)
  }

  return {
    executiveSummary,
    achievements: normalizeList(narrative.achievements, 'Achievement'),
    issuesBlockers: normalizeList(narrative.issuesBlockers, 'Issue / Blocker'),
    managementAttention: normalizeList(narrative.managementAttention, 'Management Attention'),
    nextWeekFocus: normalizeList(narrative.nextWeekFocus, 'Next Week Focus'),
  }
}

function normalizeOwner(value) {
  const owner = String(value ?? '').trim()
  if (!owner) throw new ReportsServiceError('Report owner is required.')
  if (owner.length < MIN_TEXT_LENGTH) {
    throw new ReportsServiceError(`Report owner must use at least ${MIN_TEXT_LENGTH} characters.`)
  }
  if (owner.length > MAX_OWNER) {
    throw new ReportsServiceError(`Report owner must use ${MAX_OWNER} characters or fewer.`)
  }
  return owner
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.capturedAt) {
    throw new ReportsServiceError('Refresh project data before saving the weekly report.')
  }
  return clone(snapshot)
}

function ensureReport(reports, reportId) {
  const index = reports.findIndex((report) => report.id === reportId)
  if (index === -1) throw new ReportsServiceError('Weekly report not found.')
  return index
}

function ensureDraft(report) {
  if (report.status === REPORT_STATUS.FINAL) {
    throw new ReportsServiceError('Final weekly reports are read-only.')
  }
}

function editablePayload(report) {
  return {
    narrative: report.narrative,
    snapshot: report.snapshot,
    owner: report.owner,
    dismissedSignalIds: normalizeDismissedSignalIds(report.dismissedSignalIds),
  }
}

function normalizeEditableInput(input) {
  return {
    narrative: normalizeNarrative(input.narrative),
    snapshot: normalizeSnapshot(input.snapshot),
    owner: normalizeOwner(input.owner),
    dismissedSignalIds: normalizeDismissedSignalIds(input.dismissedSignalIds),
  }
}

export const reportsService = {
  getSnapshot() {
    const stored = storageAdapter.read(REPORTS_STORAGE_KEY)
    if (stored === null) return null
    if (!Array.isArray(stored)) {
      throw new ReportsServiceError('Saved weekly report data is invalid. Reset local data and try again.')
    }
    return clone(stored.map(normalizeStoredReport))
  },

  async list() {
    return clone(readReports())
  },

  async create(input) {
    const reports = readReports()
    const period = getReportPeriod(input.periodEnd)
    if (!period) throw new ReportsServiceError('Choose a valid Week ending date.')

    const existing = reports.find(
      (report) => report.projectId === input.projectId && report.periodEnd === period.periodEnd,
    )
    if (existing) return clone(existing)

    const now = new Date().toISOString()
    const report = {
      id: globalThis.crypto.randomUUID(),
      projectId: input.projectId,
      ...period,
      status: REPORT_STATUS.DRAFT,
      ...normalizeEditableInput(input),
      version: 1,
      createdAt: now,
      updatedAt: now,
      finalizedAt: null,
      archivedAt: null,
    }

    writeReports([report, ...reports])
    return clone(report)
  },

  async update(reportId, input) {
    const reports = readReports()
    const index = ensureReport(reports, reportId)
    const existing = reports[index]
    ensureDraft(existing)

    const normalized = normalizeEditableInput(input)
    if (JSON.stringify(editablePayload(existing)) === JSON.stringify(normalized)) {
      return clone(existing)
    }

    const updated = {
      ...existing,
      ...normalized,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    }
    const next = [...reports]
    next[index] = updated
    writeReports(next)
    return clone(updated)
  },

  async finalize(reportId) {
    const reports = readReports()
    const index = ensureReport(reports, reportId)
    const existing = reports[index]
    ensureDraft(existing)
    const now = new Date().toISOString()
    const finalized = {
      ...existing,
      status: REPORT_STATUS.FINAL,
      version: existing.version,
      updatedAt: now,
      finalizedAt: now,
    }
    const next = [...reports]
    next[index] = finalized
    writeReports(next)
    return clone(finalized)
  },


  async reopen(reportId) {
    const reports = readReports()
    const index = ensureReport(reports, reportId)
    const existing = reports[index]
    if (existing.status !== REPORT_STATUS.FINAL) {
      throw new ReportsServiceError('Only Final weekly reports can be reopened for correction.')
    }
    if (existing.archivedAt) {
      throw new ReportsServiceError('Restore the archived weekly report before reopening it for correction.')
    }

    const reopened = {
      ...existing,
      status: REPORT_STATUS.DRAFT,
      version: existing.version,
      updatedAt: new Date().toISOString(),
      finalizedAt: null,
    }
    const next = [...reports]
    next[index] = reopened
    writeReports(next)
    return clone(reopened)
  },

  async archive(reportId) {
    const reports = readReports()
    const index = ensureReport(reports, reportId)
    const existing = reports[index]
    if (existing.status !== REPORT_STATUS.FINAL) {
      throw new ReportsServiceError('Only Final weekly reports can be archived.')
    }
    if (existing.archivedAt) return clone(existing)

    const now = new Date().toISOString()
    const archived = {
      ...existing,
      archivedAt: now,
      updatedAt: now,
    }
    const next = [...reports]
    next[index] = archived
    writeReports(next)
    return clone(archived)
  },

  async restore(reportId) {
    const reports = readReports()
    const index = ensureReport(reports, reportId)
    const existing = reports[index]
    if (existing.status !== REPORT_STATUS.FINAL || !existing.archivedAt) {
      throw new ReportsServiceError('Only archived Final weekly reports can be restored.')
    }

    const restored = {
      ...existing,
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    }
    const next = [...reports]
    next[index] = restored
    writeReports(next)
    return clone(restored)
  },

  async remove(reportId) {
    const reports = readReports()
    const index = ensureReport(reports, reportId)
    ensureDraft(reports[index])
    writeReports(reports.filter((report) => report.id !== reportId))
    return reportId
  },
}
