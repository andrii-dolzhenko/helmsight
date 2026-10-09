import { useEffect } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { EvmBaselineForm } from '../../features/evm/ui/EvmBaselineForm.jsx'
import { EvmHelp } from '../../features/evm/ui/EvmHelp.jsx'
import {
  clearEvmMutationState,
  loadEvm,
  saveEvmBaseline,
  selectEvmBaselineByProject,
  selectEvmMutationError,
  selectEvmStatus,
} from '../../features/evm/model/evmSlice.js'
import styles from './MetricsBaselineEditorPage.module.css'

export function MetricsBaselineEditorPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector(selectEvmStatus)
  const mutationError = useAppSelector(selectEvmMutationError)
  const baseline = useAppSelector((state) => selectEvmBaselineByProject(state, project.id))
  const listPath = `/projects/${project.id}/metrics`

  useEffect(() => {
    dispatch(clearEvmMutationState())
    if (status === 'idle') dispatch(loadEvm())
  }, [dispatch, status])

  if (project.archivedAt) return <div className={styles.stateCard}><strong>This project is archived.</strong><span>Restore the project before changing its EVM baseline.</span><Link to={listPath}>Return to metrics</Link></div>
  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading EVM baseline…</div>

  const handleSubmit = async (values) => {
    try {
      await dispatch(saveEvmBaseline({ ...values, projectId: project.id })).unwrap()
      navigate(listPath)
      return true
    } catch { return false }
  }

  return <section className={styles.root}>
    <header className={styles.header}><span className={styles.eyebrow}>Delivery baseline</span><div className={styles.titleRow}><h2>{baseline ? 'Edit EVM baseline' : 'Create EVM baseline'}</h2><EvmHelp/></div><p>Choose one project measurement basis and define the phase/work-package baseline that drives automatic Planned Value.</p></header>
    <EvmBaselineForm key={`${project.id}:${baseline?.updatedAt ?? 'new'}`} baseline={baseline} draftKey={`evm-baseline:${project.id}`} cancelTo={listPath} submitError={mutationError} onSubmit={handleSubmit}/>
  </section>
}
