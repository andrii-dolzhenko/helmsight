import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  clearProjectMutationState,
  createProject,
  selectProjectMutationError,
} from '../../features/projects/model/projectsSlice.js'
import { ProjectForm } from '../../features/projects/ui/ProjectForm.jsx'
import styles from '../../features/projects/ui/ProjectEditorPage.module.css'

export function NewProjectPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const mutationError = useAppSelector(selectProjectMutationError)

  useEffect(() => {
    dispatch(clearProjectMutationState())
  }, [dispatch])

  const handleSubmit = async (input) => {
    try {
      const project = await dispatch(createProject(input)).unwrap()
      navigate(`/projects/${project.id}`)
      return true
    } catch {
      // The rejected thunk already exposes a user-facing error through Redux state.
      return false
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/projects">
        ← Back to projects
      </Link>

      <header className={styles.header}>
        <span className={styles.eyebrow}>Project setup</span>
        <h1 className={styles.title}>Create a project</h1>
        <p className={styles.copy}>
          Start with the delivery context and key dates. Governance, risks, milestones, metrics, and reporting will build on this project record.
        </p>
      </header>

      <ProjectForm
        draftKey="project:new"
        submitLabel="Create project"
        cancelTo="/projects"
        submitError={mutationError}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
