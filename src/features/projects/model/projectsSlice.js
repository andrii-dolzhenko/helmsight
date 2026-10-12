import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { projectsService } from '../api/projectsService.js'
import { projectDeletionService } from '../api/projectDeletionService.js'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadProjects = createAsyncThunk(
  'projects/loadProjects',
  async (_, { rejectWithValue }) => {
    try {
      return await projectsService.list()
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (input, { rejectWithValue }) => {
    try {
      return await projectsService.create(input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, input }, { rejectWithValue }) => {
    try {
      return await projectsService.update(projectId, input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)


export const saveProjectGovernance = createAsyncThunk(
  'projects/saveProjectGovernance',
  async ({ projectId, governance }, { rejectWithValue }) => {
    try {
      return await projectsService.updateGovernance(projectId, governance)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const archiveProject = createAsyncThunk(
  'projects/archiveProject',
  async (projectId, { rejectWithValue }) => {
    try {
      return await projectsService.archive(projectId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const restoreProject = createAsyncThunk(
  'projects/restoreProject',
  async (projectId, { rejectWithValue }) => {
    try {
      return await projectsService.restore(projectId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async ({ projectId, confirmationName }, { rejectWithValue }) => {
    try {
      await projectDeletionService.deleteArchivedProject({
        projectId,
        confirmationName,
      })
      return projectId
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export function createProjectsInitialState(items = [], status = 'idle') {
  return {
    items,
    status,
    error: null,
    mutationStatus: 'idle',
    mutationError: null,
  }
}

const initialState = createProjectsInitialState()

function upsertProject(state, project) {
  const existingIndex = state.items.findIndex((item) => item.id === project.id)

  if (existingIndex === -1) {
    state.items.unshift(project)
    return
  }

  state.items[existingIndex] = project
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearProjectMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProjects.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadProjects.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadProjects.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load projects.'
      })

    for (const thunk of [
      createProject,
      updateProject,
      saveProjectGovernance,
      archiveProject,
      restoreProject,
    ]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.mutationStatus = 'loading'
          state.mutationError = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          upsertProject(state, action.payload)
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutationStatus = 'failed'
          state.mutationError = action.payload ?? 'Unable to save project changes.'
        })
    }

    builder
      .addCase(deleteProject.pending, (state) => {
        state.mutationStatus = 'loading'
        state.mutationError = null
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.items = state.items.filter(
          (project) => project.id !== action.payload,
        )
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.mutationStatus = 'failed'
        state.mutationError =
          action.payload ?? 'Unable to delete project.'
      })
  },
})

export const { clearProjectMutationState } = projectsSlice.actions

export const selectProjects = (state) => state.projects.items
export const selectProjectsStatus = (state) => state.projects.status
export const selectProjectsError = (state) => state.projects.error
export const selectProjectMutationStatus = (state) => state.projects.mutationStatus
export const selectProjectMutationError = (state) => state.projects.mutationError
export const selectActiveProjects = createSelector([selectProjects], (projects) =>
  projects.filter((project) => !project.archivedAt),
)
export const selectArchivedProjects = createSelector([selectProjects], (projects) =>
  projects.filter((project) => Boolean(project.archivedAt)),
)
export const selectProjectById = (state, projectId) =>
  state.projects.items.find((project) => project.id === projectId)

export default projectsSlice.reducer
