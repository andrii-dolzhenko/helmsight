import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  clearRiskMutationState,
  createRisk,
  loadRisks,
  selectRiskById,
  selectRiskMutationError,
  selectRisksStatus,
  updateRisk,
} from '../../features/risks/model/risksSlice.js'
import { RiskForm } from '../../features/risks/ui/RiskForm.jsx'
import styles from './RiskEditorPage.module.css'

export function RiskEditorPage() {
  const { project } = useOutletContext()
  const { riskId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectRisksStatus)
  const mutationError = useAppSelector(selectRiskMutationError)
  const risk = useAppSelector((state) => riskId ? selectRiskById(state, riskId) : null)
  const isEditing = Boolean(riskId)
  const listPath = `/projects/${project.id}/risks`

  useEffect(() => {
    dispatch(clearRiskMutationState())
    if (status === 'idle') dispatch(loadRisks())
  }, [dispatch, status])

  if (project.archivedAt) {
    return <div className={styles.stateCard}><strong>This project is archived.</strong><span>Restore the project before changing risks.</span><Link to={listPath}>Return to Risk Register</Link></div>
  }

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading risk…</div>

  if (isEditing && (!risk || risk.projectId !== project.id)) {
    return <div className={styles.stateCard}><strong>Risk not found.</strong><span>The requested risk is not available in this project.</span><Link to={listPath}>Return to Risk Register</Link></div>
  }

  const handleSubmit = async (values) => {
    const input = { ...values, projectId: project.id }
    try {
      if (isEditing) await dispatch(updateRisk({ riskId, input })).unwrap()
      else await dispatch(createRisk(input)).unwrap()
      navigate(listPath)
      return true
    } catch {
      return false
    }
  }

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Risk control</span>
        {isEditing ? <h2>Edit risk</h2> : <h1>New risk</h1>}
        <p>Assess probability and impact, assign ownership, and make the response plan explicit.</p>
      </header>
      <RiskForm
        risk={risk}
        draftKey={`risk:${project.id}:${riskId ?? 'new'}`}
        submitLabel={isEditing ? 'Save risk' : 'Create risk'}
        cancelTo={listPath}
        submitError={mutationError}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
