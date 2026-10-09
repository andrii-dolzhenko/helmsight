import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  clearSuccessCriterionMutationState,
  createSuccessCriterion,
  loadSuccessCriteria,
  selectSuccessCriteriaStatus,
  selectSuccessCriterionById,
  selectSuccessCriterionMutationError,
  updateSuccessCriterion,
} from '../../features/successCriteria/model/successCriteriaSlice.js'
import { SuccessCriterionForm } from '../../features/successCriteria/ui/SuccessCriterionForm.jsx'
import { SuccessCriteriaHelp } from '../../features/successCriteria/ui/SuccessCriteriaHelp.jsx'
import styles from './SuccessCriterionEditorPage.module.css'

export function SuccessCriterionEditorPage() {
  const { project } = useOutletContext()
  const { criterionId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectSuccessCriteriaStatus)
  const mutationError = useAppSelector(selectSuccessCriterionMutationError)
  const criterion = useAppSelector((state) =>
    criterionId ? selectSuccessCriterionById(state, criterionId) : null,
  )
  const isEditing = Boolean(criterionId)
  const listPath = `/projects/${project.id}/success-criteria`

  useEffect(() => {
    dispatch(clearSuccessCriterionMutationState())

    if (status === 'idle') {
      dispatch(loadSuccessCriteria())
    }
  }, [dispatch, status])

  if (project.archivedAt) {
    return (
      <div className={styles.stateCard}>
        <strong>This project is archived.</strong>
        <span>Restore the project before changing Success Criteria.</span>
        <Link to={listPath}>Return to Success Criteria</Link>
      </div>
    )
  }

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading success criterion…</div>
  }

  if (isEditing && (!criterion || criterion.projectId !== project.id)) {
    return (
      <div className={styles.stateCard}>
        <strong>Success criterion not found.</strong>
        <span>The requested criterion is not available in this project.</span>
        <Link to={listPath}>Return to Success Criteria</Link>
      </div>
    )
  }

  const handleSubmit = async (values) => {
    const input = {
      ...values,
      projectId: project.id,
    }

    try {
      if (isEditing) {
        await dispatch(
          updateSuccessCriterion({
            criterionId,
            input,
          }),
        ).unwrap()
      } else {
        await dispatch(createSuccessCriterion(input)).unwrap()
      }

      navigate(listPath)
      return true
    } catch {
      return false
    }
  }

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Success Criteria</span>
        <div className={styles.titleRow}>
          <h2>{isEditing ? 'Edit criterion' : 'New success criterion'}</h2>
          <SuccessCriteriaHelp />
        </div>
        <p>
          Keep the rule explicit and measurable. HelmSight derives the status from the saved values and target date.
        </p>
      </header>

      <SuccessCriterionForm
        criterion={criterion}
        draftKey={`successCriterion:${project.id}:${criterionId ?? 'new'}`}
        submitLabel={isEditing ? 'Save criterion' : 'Create criterion'}
        cancelTo={listPath}
        submitError={mutationError}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
