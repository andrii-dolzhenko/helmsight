import { isValidCalendarDate } from '../../../shared/lib/calendarDate.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import {
  calculateBaselineBAC,
  countWorkingDaysInclusive,
  getCumulativePackageEarned,
  isFullEvmBasis,
} from '../lib/evm.js'

const EVM_STORAGE_KEY = 'evmMetrics'

const DEMO_DATA = Object.freeze({
  baselines: [
    {
      projectId: 'demo-project',
      measurementBasis: 'hours',
      currencyCode: 'USD',
      workPackages: [
        { id: 'demo-wp-discovery', title: 'Discovery & UX', startDate: '2026-08-03', endDate: '2026-08-28', budgetValue: 120 },
        { id: 'demo-wp-frontend', title: 'Frontend delivery', startDate: '2026-08-31', endDate: '2026-10-23', budgetValue: 360 },
        { id: 'demo-wp-backend', title: 'Backend & integrations', startDate: '2026-08-31', endDate: '2026-11-06', budgetValue: 420 },
        { id: 'demo-wp-qa', title: 'QA & stabilization', startDate: '2026-09-21', endDate: '2026-11-20', budgetValue: 220 },
        { id: 'demo-wp-release', title: 'Release & deployment', startDate: '2026-11-09', endDate: '2026-11-27', budgetValue: 80 },
      ],
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-01T09:00:00.000Z',
    },
  ],
  snapshots: [
    {
      id: 'demo-evm-2026-09-18',
      projectId: 'demo-project',
      snapshotDate: '2026-09-18',
      entries: [
        { packageId: 'demo-wp-discovery', earnedValue: 120, actualValue: 126 },
        { packageId: 'demo-wp-frontend', earnedValue: 80, actualValue: 96 },
        { packageId: 'demo-wp-backend', earnedValue: 70, actualValue: 82 },
        { packageId: 'demo-wp-qa', earnedValue: 0, actualValue: 0 },
        { packageId: 'demo-wp-release', earnedValue: 0, actualValue: 0 },
      ],
      createdAt: '2026-09-18T16:00:00.000Z',
      updatedAt: '2026-09-18T16:00:00.000Z',
    },
    {
      id: 'demo-evm-2026-09-25',
      projectId: 'demo-project',
      snapshotDate: '2026-09-25',
      entries: [
        { packageId: 'demo-wp-discovery', earnedValue: 0, actualValue: 0 },
        { packageId: 'demo-wp-frontend', earnedValue: 44, actualValue: 50 },
        { packageId: 'demo-wp-backend', earnedValue: 48, actualValue: 52 },
        { packageId: 'demo-wp-qa', earnedValue: 12, actualValue: 18 },
        { packageId: 'demo-wp-release', earnedValue: 0, actualValue: 0 },
      ],
      createdAt: '2026-09-25T16:00:00.000Z',
      updatedAt: '2026-09-25T16:00:00.000Z',
    },
    {
      id: 'demo-evm-2026-10-02',
      projectId: 'demo-project',
      snapshotDate: '2026-10-02',
      entries: [
        { packageId: 'demo-wp-discovery', earnedValue: 0, actualValue: 0 },
        { packageId: 'demo-wp-frontend', earnedValue: 38, actualValue: 46 },
        { packageId: 'demo-wp-backend', earnedValue: 42, actualValue: 50 },
        { packageId: 'demo-wp-qa', earnedValue: 16, actualValue: 24 },
        { packageId: 'demo-wp-release', earnedValue: 0, actualValue: 0 },
      ],
      createdAt: '2026-10-02T16:00:00.000Z',
      updatedAt: '2026-10-02T16:00:00.000Z',
    },
  ],
})

export class EvmServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'EvmServiceError'
  }
}

function cloneDemoData() {
  return {
    baselines: DEMO_DATA.baselines.map((baseline) => ({
      ...baseline,
      workPackages: baseline.workPackages.map((item) => ({ ...item })),
    })),
    snapshots: DEMO_DATA.snapshots.map((snapshot) => ({
      ...snapshot,
      entries: snapshot.entries.map((item) => ({ ...item })),
    })),
  }
}

function validateStoredData(value) {
  if (!value || !Array.isArray(value.baselines) || !Array.isArray(value.snapshots)) {
    throw new EvmServiceError('Saved EVM data is invalid. Reset local data and try again.')
  }
  return value
}

function readData() {
  const stored = storageAdapter.read(EVM_STORAGE_KEY)
  if (stored === null) {
    const demo = cloneDemoData()
    storageAdapter.write(EVM_STORAGE_KEY, demo)
    return demo
  }
  return validateStoredData(stored)
}

function writeData(data) {
  storageAdapter.write(EVM_STORAGE_KEY, data)
  return data
}

function validateSnapshotDate(value) {
  if (!value) {
    throw new EvmServiceError('Reporting date is required.')
  }

  if (!isValidCalendarDate(value)) {
    throw new EvmServiceError('Choose a valid reporting date.')
  }
}

function normalizePackage(item) {
  const budgetValue = Number(item.budgetValue)
  if (!item.title?.trim()) throw new EvmServiceError('Every work package needs a title.')
  if (
    !isValidCalendarDate(item.startDate) ||
    !isValidCalendarDate(item.endDate) ||
    item.startDate > item.endDate
  ) {
    throw new EvmServiceError('Every work package needs a valid start and end date.')
  }
  if (countWorkingDaysInclusive(item.startDate, item.endDate) <= 0) {
    throw new EvmServiceError('Each work package date range must include at least one working day.')
  }
  if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
    throw new EvmServiceError('Every work package baseline value must be greater than zero.')
  }

  return {
    id: item.id || globalThis.crypto.randomUUID(),
    title: item.title.trim(),
    startDate: item.startDate,
    endDate: item.endDate,
    budgetValue,
  }
}

function normalizeBaselineInput(input) {
  const allowedBases = new Set(['hours', 'personDays', 'currency', 'storyPoints'])
  if (!allowedBases.has(input.measurementBasis)) throw new EvmServiceError('Choose a valid measurement basis.')
  if (!Array.isArray(input.workPackages) || input.workPackages.length === 0) {
    throw new EvmServiceError('Add at least one work package to the EVM baseline.')
  }

  const baseline = {
    projectId: input.projectId,
    measurementBasis: input.measurementBasis,
    currencyCode: input.measurementBasis === 'currency' ? (input.currencyCode || 'USD') : 'USD',
    workPackages: input.workPackages.map(normalizePackage),
  }

  if (calculateBaselineBAC(baseline) <= 0) throw new EvmServiceError('Budget at Completion must be greater than zero.')
  return baseline
}

function normalizeSnapshotEntries(baseline, entries) {
  const entryMap = new Map((entries ?? []).map((entry) => [entry.packageId, entry]))
  return baseline.workPackages.map((workPackage) => {
    const entry = entryMap.get(workPackage.id) ?? {}
    const earnedValue = Number(entry.earnedValue ?? 0)
    const actualValue = Number(entry.actualValue ?? 0)

    if (!Number.isFinite(earnedValue) || earnedValue < 0) {
      throw new EvmServiceError('Earned Value entries must be zero or greater.')
    }
    if (isFullEvmBasis(baseline.measurementBasis) && (!Number.isFinite(actualValue) || actualValue < 0)) {
      throw new EvmServiceError('Actual entries must be zero or greater.')
    }

    return {
      packageId: workPackage.id,
      earnedValue,
      ...(isFullEvmBasis(baseline.measurementBasis) ? { actualValue } : {}),
    }
  })
}

function ensureBaseline(data, projectId) {
  const baseline = data.baselines.find((item) => item.projectId === projectId)
  if (!baseline) throw new EvmServiceError('Create an EVM baseline before adding weekly snapshots.')
  return baseline
}

function validateEarnedAgainstBaseline(baseline, snapshots, candidate, excludeId = null) {
  const relevant = snapshots.filter(
    (snapshot) => snapshot.projectId === baseline.projectId && snapshot.id !== excludeId,
  )
  const combined = [...relevant, candidate]

  for (const workPackage of baseline.workPackages) {
    const earned = getCumulativePackageEarned(combined, workPackage.id)
    if (earned > workPackage.budgetValue + 0.000001) {
      throw new EvmServiceError(`Earned Value for “${workPackage.title}” cannot exceed its approved baseline.`)
    }
  }
}

export const evmService = {
  getSnapshot() {
    const stored = storageAdapter.read(EVM_STORAGE_KEY)
    if (stored === null) return null
    return validateStoredData(stored)
  },

  async list() {
    return readData()
  },

  async saveBaseline(input) {
    const data = readData()
    const normalized = normalizeBaselineInput(input)
    const existingIndex = data.baselines.findIndex((item) => item.projectId === input.projectId)
    const now = new Date().toISOString()

    if (existingIndex >= 0) {
      const existing = data.baselines[existingIndex]
      const projectSnapshots = data.snapshots.filter((snapshot) => snapshot.projectId === input.projectId)
      if (projectSnapshots.length > 0 && existing.measurementBasis !== normalized.measurementBasis) {
        throw new EvmServiceError('Measurement basis cannot be changed after weekly snapshot history exists.')
      }
      if (projectSnapshots.length > 0 && existing.measurementBasis === 'currency' && existing.currencyCode !== normalized.currencyCode) {
        throw new EvmServiceError('Currency cannot be changed after weekly snapshot history exists.')
      }
      if (projectSnapshots.length > 0) {
        const oldIds = new Set(existing.workPackages.map((item) => item.id))
        const newIds = new Set(normalized.workPackages.map((item) => item.id))
        const removedWithHistory = [...oldIds].some((id) => !newIds.has(id) && projectSnapshots.some((snapshot) => snapshot.entries.some((entry) => entry.packageId === id && (entry.earnedValue > 0 || entry.actualValue > 0))))
        if (removedWithHistory) {
          throw new EvmServiceError('A work package with recorded snapshot history cannot be removed from the baseline.')
        }
        for (const workPackage of normalized.workPackages) {
          const earned = getCumulativePackageEarned(projectSnapshots, workPackage.id)
          if (earned > workPackage.budgetValue + 0.000001) {
            throw new EvmServiceError(`Baseline for “${workPackage.title}” cannot be lower than its already earned value.`)
          }
        }
      }

      data.baselines[existingIndex] = {
        ...existing,
        ...normalized,
        updatedAt: now,
      }
    } else {
      data.baselines.push({
        ...normalized,
        createdAt: now,
        updatedAt: now,
      })
    }

    writeData(data)
    return data.baselines.find((item) => item.projectId === input.projectId)
  },

  async createSnapshot(input) {
    const data = readData()
    const baseline = ensureBaseline(data, input.projectId)
    validateSnapshotDate(input.snapshotDate)
    if (data.snapshots.some((snapshot) => snapshot.projectId === input.projectId && snapshot.snapshotDate === input.snapshotDate)) {
      throw new EvmServiceError('A weekly snapshot already exists for this reporting date.')
    }

    const now = new Date().toISOString()
    const snapshot = {
      id: globalThis.crypto.randomUUID(),
      projectId: input.projectId,
      snapshotDate: input.snapshotDate,
      entries: normalizeSnapshotEntries(baseline, input.entries),
      createdAt: now,
      updatedAt: now,
    }
    validateEarnedAgainstBaseline(baseline, data.snapshots, snapshot)
    data.snapshots.push(snapshot)
    writeData(data)
    return snapshot
  },

  async updateSnapshot(snapshotId, input) {
    const data = readData()
    const index = data.snapshots.findIndex((snapshot) => snapshot.id === snapshotId)
    if (index === -1) throw new EvmServiceError('EVM snapshot not found.')
    const existing = data.snapshots[index]
    const baseline = ensureBaseline(data, existing.projectId)
    validateSnapshotDate(input.snapshotDate)

    if (data.snapshots.some((snapshot) => snapshot.projectId === existing.projectId && snapshot.id !== snapshotId && snapshot.snapshotDate === input.snapshotDate)) {
      throw new EvmServiceError('A weekly snapshot already exists for this reporting date.')
    }

    const updated = {
      ...existing,
      snapshotDate: input.snapshotDate,
      entries: normalizeSnapshotEntries(baseline, input.entries),
      updatedAt: new Date().toISOString(),
    }
    validateEarnedAgainstBaseline(baseline, data.snapshots, updated, snapshotId)
    data.snapshots[index] = updated
    writeData(data)
    return updated
  },

  async removeSnapshot(snapshotId) {
    const data = readData()
    if (!data.snapshots.some((snapshot) => snapshot.id === snapshotId)) throw new EvmServiceError('EVM snapshot not found.')
    data.snapshots = data.snapshots.filter((snapshot) => snapshot.id !== snapshotId)
    writeData(data)
    return snapshotId
  },
}
