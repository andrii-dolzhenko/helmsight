import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  clearMilestoneMutationState,
  createMilestone,
  loadMilestones,
  selectMilestoneById,
  selectMilestoneMutationError,
  selectMilestonesStatus,
  updateMilestone,
} from '../../features/milestones/model/milestonesSlice.js'
import { MilestoneForm } from '../../features/milestones/ui/MilestoneForm.jsx'
import styles from './MilestoneEditorPage.module.css'

export function MilestoneEditorPage() {
  const { project } = useOutletContext()
  const { milestoneId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectMilestonesStatus)
  const mutationError = useAppSelector(selectMilestoneMutationError)
  const milestone = useAppSelector((state) => milestoneId ? selectMilestoneById(state, milestoneId) : null)
  const isEditing = Boolean(milestoneId)
  const listPath = `/projects/${project.id}/milestones`

  useEffect(() => {
    dispatch(clearMilestoneMutationState())
    if (status === 'idle') dispatch(loadMilestones())
  }, [dispatch, status])

  if (project.archivedAt) {
    return <div className={styles.stateCard}><strong>This project is archived.</strong><span>Restore the project before changing milestones.</span><Link to={listPath}>Return to milestones</Link></div>
  }

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading milestone…</div>

  if (isEditing && (!milestone || milestone.projectId !== project.id)) {
    return <div className={styles.stateCard}><strong>Milestone not found.</strong><span>The requested milestone is not available in this project.</span><Link to={listPath}>Return to milestones</Link></div>
  }

  const handleSubmit = async (values) => {
    const input = { ...values, projectId: project.id }
    try {
      if (isEditing) await dispatch(updateMilestone({ milestoneId, input })).unwrap()
      else await dispatch(createMilestone(input)).unwrap()
      navigate(listPath)
      return true
    } catch {
      return false
    }
  }

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Milestone control</span>
        <h2>{isEditing ? 'Edit milestone' : 'New milestone'}</h2>
        <p>Keep the checkpoint measurable: one target date, one progress signal, and a clear delivery status.</p>
      </header>
      <MilestoneForm
        milestone={milestone}
        draftKey={`milestone:${project.id}:${milestoneId ?? 'new'}`}
        submitLabel={isEditing ? 'Save milestone' : 'Create milestone'}
        cancelTo={listPath}
        submitError={mutationError}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
