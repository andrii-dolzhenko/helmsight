import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { EvmHelp } from '../../features/evm/ui/EvmHelp.jsx'
import { EvmSnapshotForm } from '../../features/evm/ui/EvmSnapshotForm.jsx'
import {
  clearEvmMutationState,
  createEvmSnapshot,
  loadEvm,
  selectEvmBaselineByProject,
  selectEvmMutationError,
  selectEvmSnapshotById,
  selectEvmSnapshotsByProject,
  selectEvmStatus,
  updateEvmSnapshot,
} from '../../features/evm/model/evmSlice.js'
import styles from './MetricsSnapshotEditorPage.module.css'

export function MetricsSnapshotEditorPage() {
  const { project } = useOutletContext()
  const { snapshotId } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectEvmStatus)
  const mutationError = useAppSelector(selectEvmMutationError)
  const baseline = useAppSelector((state) => selectEvmBaselineByProject(state, project.id))
  const snapshots = useAppSelector((state) => selectEvmSnapshotsByProject(state, project.id))
  const snapshot = useAppSelector((state) => snapshotId ? selectEvmSnapshotById(state, snapshotId) : null)
  const isEditing = Boolean(snapshotId)
  const listPath = `/projects/${project.id}/metrics`

  useEffect(() => {
    dispatch(clearEvmMutationState())
    if (status === 'idle') dispatch(loadEvm())
  }, [dispatch, status])

  if (project.archivedAt) return <div className={styles.stateCard}><strong>This project is archived.</strong><span>Restore the project before changing EVM snapshots.</span><Link to={listPath}>Return to metrics</Link></div>
  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading weekly snapshot…</div>
  if (!baseline) return <div className={styles.stateCard}><strong>EVM baseline required.</strong><span>Create the project baseline before recording weekly snapshots.</span><Link to={`${listPath}/baseline`}>Create baseline</Link></div>
  if (isEditing && (!snapshot || snapshot.projectId !== project.id)) return <div className={styles.stateCard}><strong>Weekly snapshot not found.</strong><span>The requested EVM snapshot is not available in this project.</span><Link to={listPath}>Return to metrics</Link></div>

  const handleSubmit = async (values) => {
    try {
      if (isEditing) await dispatch(updateEvmSnapshot({ snapshotId, input: values })).unwrap()
      else await dispatch(createEvmSnapshot({ ...values, projectId: project.id })).unwrap()
      navigate(listPath)
      return true
    } catch { return false }
  }

  return <section className={styles.root}>
    <header className={styles.header}><span className={styles.eyebrow}>Weekly delivery control</span><div className={styles.titleRow}><h2>{isEditing ? 'Edit EVM snapshot' : 'New weekly EVM snapshot'}</h2><EvmHelp/></div><p>Bring completed baseline value and actual consumption from the tracking system into one reporting cutoff.</p></header>
    <EvmSnapshotForm key={`${project.id}:${snapshotId ?? 'new'}:${baseline.updatedAt}`} baseline={baseline} snapshot={snapshot} snapshots={snapshots} draftKey={`evm-snapshot:${project.id}:${snapshotId ?? 'new'}`} cancelTo={listPath} submitError={mutationError} onSubmit={handleSubmit}/>
  </section>
}
