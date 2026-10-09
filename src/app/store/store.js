import { configureStore } from '@reduxjs/toolkit'
import { preferencesService } from '../../features/preferences/api/preferencesService.js'
import preferencesReducer, {
  createPreferencesInitialState,
} from '../../features/preferences/model/preferencesSlice.js'
import { projectsService } from '../../features/projects/api/projectsService.js'
import projectsReducer, {
  createProjectsInitialState,
} from '../../features/projects/model/projectsSlice.js'
import { successCriteriaService } from '../../features/successCriteria/api/successCriteriaService.js'
import successCriteriaReducer, {
  createSuccessCriteriaInitialState,
} from '../../features/successCriteria/model/successCriteriaSlice.js'
import { risksService } from '../../features/risks/api/risksService.js'
import risksReducer, { createRisksInitialState } from '../../features/risks/model/risksSlice.js'
import { milestonesService } from '../../features/milestones/api/milestonesService.js'
import milestonesReducer, { createMilestonesInitialState } from '../../features/milestones/model/milestonesSlice.js'
import { managementActionsService } from '../../features/managementActions/api/managementActionsService.js'
import managementActionsReducer, { createManagementActionsInitialState } from '../../features/managementActions/model/managementActionsSlice.js'
import { evmService } from '../../features/evm/api/evmService.js'
import evmReducer, { createEvmInitialState } from '../../features/evm/model/evmSlice.js'
import { reportsService } from '../../features/reports/api/reportsService.js'
import reportsReducer, { createReportsInitialState } from '../../features/reports/model/reportsSlice.js'
import { meetingsService } from '../../features/meetings/api/meetingsService.js'
import meetingsReducer, { createMeetingsInitialState } from '../../features/meetings/model/meetingsSlice.js'

export function createAppPreloadedState() {
  const preloadedState = {}

  try {
    const preferencesSnapshot = preferencesService.getSnapshot()

    if (preferencesSnapshot !== null) {
      preloadedState.preferences = createPreferencesInitialState(
        preferencesSnapshot,
        'succeeded',
      )
    }
  } catch {
    // ThemeSync can still recover through the normal async preferences flow.
  }

  try {
    const projectsSnapshot = projectsService.getSnapshot()

    if (projectsSnapshot !== null) {
      preloadedState.projects = createProjectsInitialState(
        projectsSnapshot,
        'succeeded',
      )
    }
  } catch {
    // ProjectsPage will use the normal async load/error flow if local data is invalid.
  }

  try {
    const successCriteriaSnapshot = successCriteriaService.getSnapshot()

    if (successCriteriaSnapshot !== null) {
      preloadedState.successCriteria = createSuccessCriteriaInitialState(
        successCriteriaSnapshot,
        'succeeded',
      )
    }
  } catch {
    // SuccessCriteriaPage will recover through the normal async load/error flow.
  }

  try {
    const risksSnapshot = risksService.getSnapshot()

    if (risksSnapshot !== null) {
      preloadedState.risks = createRisksInitialState(risksSnapshot, 'succeeded')
    }
  } catch {
    // RisksPage will recover through the normal async load/error flow.
  }


  try {
    const milestonesSnapshot = milestonesService.getSnapshot()

    if (milestonesSnapshot !== null) {
      preloadedState.milestones = createMilestonesInitialState(
        milestonesSnapshot,
        'succeeded',
      )
    }
  } catch {
    // MilestonesPage will recover through the normal async load/error flow.
  }

  try {
    const managementActionsSnapshot = managementActionsService.getSnapshot()

    if (managementActionsSnapshot !== null) {
      preloadedState.managementActions = createManagementActionsInitialState(
        managementActionsSnapshot,
        'succeeded',
      )
    }
  } catch {
    // ActionsPage will recover through the normal async load/error flow.
  }


  try {
    const evmSnapshot = evmService.getSnapshot()

    if (evmSnapshot !== null) {
      preloadedState.evm = createEvmInitialState(evmSnapshot, 'succeeded')
    }
  } catch {
    // MetricsPage will recover through the normal async load/error flow.
  }

  try {
    const reportsSnapshot = reportsService.getSnapshot()

    if (reportsSnapshot !== null) {
      preloadedState.reports = createReportsInitialState(reportsSnapshot, 'succeeded')
    }
  } catch {
    // ReportsPage will recover through the normal async load/error flow.
  }

  try {
    const meetingsSnapshot = meetingsService.getSnapshot()

    if (meetingsSnapshot !== null) {
      preloadedState.meetings = createMeetingsInitialState(meetingsSnapshot, 'succeeded')
    }
  } catch {
    // MeetingsPage will recover through the normal async load/error flow.
  }

  return preloadedState
}

export function createAppStore(preloadedState = createAppPreloadedState()) {
  return configureStore({
    reducer: {
      preferences: preferencesReducer,
      projects: projectsReducer,
      successCriteria: successCriteriaReducer,
      risks: risksReducer,
      milestones: milestonesReducer,
      managementActions: managementActionsReducer,
      evm: evmReducer,
      reports: reportsReducer,
      meetings: meetingsReducer,
    },
    preloadedState,
  })
}

export const store = createAppStore()
