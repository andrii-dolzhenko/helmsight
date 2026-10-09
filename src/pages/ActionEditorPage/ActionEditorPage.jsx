import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { ManagementActionForm } from '../../features/managementActions/ui/ManagementActionForm.jsx'
import { ManagementActionsHelp } from '../../features/managementActions/ui/ManagementActionsHelp.jsx'
import {
  clearManagementActionMutationState,
  createManagementAction,
  loadManagementActions,
  selectManagementActionById,
  selectManagementActionMutationError,
  selectManagementActionsStatus,
  updateManagementAction,
} from '../../features/managementActions/model/managementActionsSlice.js'
import styles from './ActionEditorPage.module.css'

export function ActionEditorPage() {
  const { project } = useOutletContext()
  const { actionId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectManagementActionsStatus)
  const mutationError = useAppSelector(selectManagementActionMutationError)
  const action = useAppSelector((state) => actionId ? selectManagementActionById(state, actionId) : null)
  const isEditing = Boolean(actionId)
  const listPath = `/projects/${project.id}/actions`

  useEffect(() => {
    dispatch(clearManagementActionMutationState())
    if (status === 'idle') dispatch(loadManagementActions())
  }, [dispatch, status])

  if (project.archivedAt) return <div className={styles.stateCard}><strong>This project is archived.</strong><span>Restore the project before changing management actions.</span><Link to={listPath}>Return to management actions</Link></div>
  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading management action…</div>
  if (isEditing && (!action || action.projectId !== project.id)) return <div className={styles.stateCard}><strong>Management action not found.</strong><span>The requested action is not available in this project.</span><Link to={listPath}>Return to management actions</Link></div>

  const handleSubmit = async (values) => {
    const input = { ...values, projectId: project.id }
    try {
      if (isEditing) await dispatch(updateManagementAction({ actionId, input })).unwrap()
      else await dispatch(createManagementAction(input)).unwrap()
      navigate(listPath)
      return true
    } catch { return false }
  }

  return <section className={styles.root}><header className={styles.header}><span className={styles.eyebrow}>Management follow-up</span><div className={styles.titleRow}><h2>{isEditing ? 'Edit management action' : 'New management action'}</h2><ManagementActionsHelp/></div><p>Record a concrete PM/Delivery commitment with one accountable owner and a time-bound outcome.</p></header><ManagementActionForm key={`${project.id}:${actionId ?? 'new'}`} action={action} draftKey={`management-action:${project.id}:${actionId ?? 'new'}`} submitLabel={isEditing ? 'Save action' : 'Create action'} cancelTo={listPath} submitError={mutationError} onSubmit={handleSubmit}/></section>
}
