import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ProjectForm } from '../features/projects/ui/ProjectForm.jsx'
import styles from '../features/projects/ui/ProjectEditorPage.module.css'
import { useAppDispatch, useAppSelector } from '../app/store/hooks.js'
import {
  clearProjectMutationState,
  loadProjects,
  selectProjectById,
  selectProjectMutationError,
  selectProjectsError,
  selectProjectsStatus,
  updateProject,
} from '../features/projects/model/projectsSlice.js'

export function EditProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const project = useAppSelector((state) => selectProjectById(state, projectId))
  const status = useAppSelector(selectProjectsStatus)
  const loadError = useAppSelector(selectProjectsError)
  const mutationError = useAppSelector(selectProjectMutationError)

  useEffect(() => {
    if (status === 'idle') {
      dispatch(loadProjects())
    }
  }, [dispatch, status])

  useEffect(() => {
    dispatch(clearProjectMutationState())
  }, [dispatch])

  if (status === 'idle' || status === 'loading') {
    return <section className={styles.stateCard}>Loading project…</section>
  }

  if (status === 'failed') {
    return (
      <section className={styles.stateCard} role="alert">
        <strong>Project could not be loaded.</strong>
        <p>{loadError}</p>
      </section>
    )
  }

  if (!project) {
    return (
      <section className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Project not found</h1>
          <Link to="/projects">Return to projects</Link>
        </div>
      </section>
    )
  }

  const handleSubmit = async (input) => {
    try {
      const updatedProject = await dispatch(
        updateProject({ projectId: project.id, input }),
      ).unwrap()
      navigate(`/projects/${updatedProject.id}`)
      return true
    } catch {
      // The rejected thunk already exposes a user-facing error through Redux state.
      return false
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to={`/projects/${project.id}`}>
        ← Back to project
      </Link>

      <header className={styles.header}>
        <span className={styles.eyebrow}>Project setup</span>
        <h1 className={styles.title}>Edit project</h1>
        <p className={styles.copy}>
          Keep the project context and delivery dates current. Project health will be derived from control data as the workspace grows.
        </p>
      </header>

      <ProjectForm
        project={project}
        draftKey={`project:${project.id}:edit`}
        submitLabel="Save changes"
        cancelTo={`/projects/${project.id}`}
        submitError={mutationError}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
