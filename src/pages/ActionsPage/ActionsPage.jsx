import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  deleteManagementAction,
  loadManagementActions,
  selectManagementActionMutationError,
  selectManagementActionMutationStatus,
  selectManagementActionsByProject,
  selectManagementActionsError,
  selectManagementActionsStatus,
  updateManagementAction,
} from '../../features/managementActions/model/managementActionsSlice.js'
import {
  ACTION_ATTENTION,
  getActionAttentionLabel,
  getActionAttentionState,
  getActionPriorityLabel,
  getActionSourceLabel,
  getActionStatusLabel,
  sortActions,
} from '../../features/managementActions/lib/managementActions.js'
import {
  selectActionsViewMode,
  selectActionsViewModeError,
  updateActionsViewMode,
} from '../../features/preferences/model/preferencesSlice.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { useHashTarget } from '../../shared/hooks/useHashTarget.js'
import styles from './ActionsPage.module.css'

const DISPLAY_MODES = Object.freeze({ grid: 'grid', list: 'list' })

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function GridIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
}

function ListIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
}

function ActionDisplayModes({ mode, onChange }) {
  return <div className={styles.displayModes} role="group" aria-label="Action Register view">
    <button type="button" className={mode === DISPLAY_MODES.grid ? styles.activeDisplayMode : ''} aria-label="Grid view" aria-pressed={mode === DISPLAY_MODES.grid} onClick={() => onChange(DISPLAY_MODES.grid)}><GridIcon/></button>
    <button type="button" className={mode === DISPLAY_MODES.list ? styles.activeDisplayMode : ''} aria-label="List view" aria-pressed={mode === DISPLAY_MODES.list} onClick={() => onChange(DISPLAY_MODES.list)}><ListIcon/></button>
  </div>
}

function LifecycleButtons({ action, disabled, onStatusChange }) {
  if (action.status === 'done') {
    return <button className={styles.lifecycleSecondary} data-ui-button="secondary" type="button" disabled={disabled} onClick={() => onStatusChange(action, 'inProgress')}>Reopen</button>
  }

  return <>
    {action.status === 'notStarted' ? <button className={styles.lifecycleSecondary} data-ui-button="secondary" type="button" disabled={disabled} onClick={() => onStatusChange(action, 'inProgress')}>Start</button> : null}
    <button className={styles.lifecyclePrimary} data-ui-button="primary" type="button" disabled={disabled} onClick={() => onStatusChange(action, 'done')}>Mark done</button>
  </>
}

function ActionControls({ action, archived, disabled, onDelete, onStatusChange }) {
  if (archived) return null

  return <div className={styles.actions}>
    <LifecycleButtons action={action} disabled={disabled} onStatusChange={onStatusChange}/>
    <Link className={styles.editButton} data-ui-button="secondary" data-ui-size="sm" to={`${action.id}/edit`}>Edit</Link>
    <button className={styles.deleteButton} data-ui-button="danger" data-ui-size="sm" type="button" disabled={disabled} aria-label="Delete" title="Delete" onClick={() => onDelete(action)}>
      <span className={styles.deleteLabel}>Delete</span>
      <svg className={styles.deleteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16M10 4h4M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5" />
      </svg>
    </button>
  </div>
}

function ActionCard({ action, archived, disabled, onDelete, onStatusChange, hashTargetId }) {
  const attention = getActionAttentionState(action)
  return <article className={styles.card} id={`action-${action.id}`} data-hash-target={hashTargetId === `action-${action.id}` ? 'true' : undefined} tabIndex={-1}>
    <div className={styles.cardHeader}>
      <div className={styles.badges}><span className={`${styles.priorityBadge} ${styles[action.priority] ?? ''}`}>{getActionPriorityLabel(action.priority)}</span><span className={`${styles.attentionBadge} ${styles[attention] ?? ''}`}>{getActionAttentionLabel(attention)}</span></div>
      <span className={styles.sourceBadge}>Source: {getActionSourceLabel(action.source)}</span>
    </div>
    <div className={styles.identity}><h4>{action.title}</h4><p>{action.description || 'No additional description.'}</p></div>
    <dl className={styles.metaStrip}><div><dt>Owner</dt><dd>{action.owner}</dd></div><div><dt>Due</dt><dd>{formatDate(action.dueDate)}</dd></div><div><dt>Status</dt><dd>{getActionStatusLabel(action.status)}</dd></div></dl>
    <ActionControls action={action} archived={archived} disabled={disabled} onDelete={onDelete} onStatusChange={onStatusChange}/>
  </article>
}

export function ActionListRow({ action, archived, disabled, onDelete, onStatusChange, hashTargetId }) {
  const attention = getActionAttentionState(action)
  return <article className={styles.listRow} id={`action-${action.id}`} data-hash-target={hashTargetId === `action-${action.id}` ? 'true' : undefined} tabIndex={-1}>
    <div className={styles.listIdentity}>
      <div className={styles.listTitleLine}><span className={`${styles.priorityBadge} ${styles[action.priority] ?? ''}`}>{getActionPriorityLabel(action.priority)}</span><h4>{action.title}</h4></div>
      <p>{action.description || 'No additional description.'}</p>
    </div>
    <dl className={styles.listMeta}>
      <div><dt>Owner</dt><dd title={action.owner}>{action.owner}</dd></div>
      <div><dt>Due</dt><dd title={formatDate(action.dueDate)}>{formatDate(action.dueDate)}</dd></div>
      <div><dt>Status</dt><dd title={getActionStatusLabel(action.status)}>{getActionStatusLabel(action.status)}</dd></div>
      <div><dt>Attention</dt><dd title={getActionAttentionLabel(attention)} className={attention === ACTION_ATTENTION.OVERDUE ? styles.dueDanger : attention === ACTION_ATTENTION.DUE_SOON ? styles.dueWarning : ''}>{getActionAttentionLabel(attention)}</dd></div>
      <div><dt>Source</dt><dd title={getActionSourceLabel(action.source)}>{getActionSourceLabel(action.source)}</dd></div>
    </dl>
    <ActionControls action={action} archived={archived} disabled={disabled} onDelete={onDelete} onStatusChange={onStatusChange}/>
  </article>
}

export function ActionsPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectManagementActionsStatus)
  const error = useAppSelector(selectManagementActionsError)
  const mutationStatus = useAppSelector(selectManagementActionMutationStatus)
  const mutationError = useAppSelector(selectManagementActionMutationError)
  const displayMode = useAppSelector(selectActionsViewMode)
  const displayModeError = useAppSelector(selectActionsViewModeError)
  const actions = useAppSelector((state) => selectManagementActionsByProject(state, project.id))
  const [pendingDelete, setPendingDelete] = useState(null)

  const hashTargetId = useHashTarget(status)

  useEffect(() => { if (status === 'idle') dispatch(loadManagementActions()) }, [dispatch, status])

  const ordered = useMemo(() => sortActions(actions), [actions])
  const summary = useMemo(() => {
    const attention = actions.map((item) => getActionAttentionState(item))
    return {
      active: actions.filter((item) => item.status !== 'done').length,
      critical: actions.filter((item) => item.priority === 'critical' && item.status !== 'done').length,
      attention: attention.filter((item) => [ACTION_ATTENTION.DUE_SOON, ACTION_ATTENTION.OVERDUE].includes(item)).length,
      done: actions.filter((item) => item.status === 'done').length,
    }
  }, [actions])

  const handleDelete = async () => {
    if (!pendingDelete) return
    try { await dispatch(deleteManagementAction(pendingDelete.id)).unwrap(); setPendingDelete(null) } catch { /* Redux error below. */ }
  }

  const handleStatusChange = async (action, nextStatus) => {
    if (project.archivedAt || action.status === nextStatus) return
    try { await dispatch(updateManagementAction({ actionId: action.id, input: { ...action, status: nextStatus } })).unwrap() } catch { /* Redux error below. */ }
  }

  const handleDisplayModeChange = (nextMode) => {
    if (nextMode !== displayMode) dispatch(updateActionsViewMode(nextMode))
  }

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading Action Register…</div>
  if (status === 'failed') return <div className={styles.stateCard} role="alert"><strong>Action Register could not be loaded.</strong><span>{error}</span><button type="button" onClick={() => dispatch(loadManagementActions())}>Try again</button></div>

  const mutationPending = mutationStatus === 'loading'

  return <section className={styles.root}>
    <header className={styles.header} data-ui-page-header>
      <span className={styles.eyebrow}>Delivery follow-through</span>
      <div className={styles.titleRow} data-ui-page-title-row>
        <h2>Action Register</h2>
        {!project.archivedAt ? <Link className={styles.primaryButton} data-ui-button="primary" to="new">New action</Link> : null}
      </div>
      <p>Track management-level commitments, owners, deadlines, and follow-up work that require active project oversight.</p>
    </header>

    {project.archivedAt ? <div className={styles.archiveBanner}><strong>Archived project</strong><span>Management actions remain available for review. Restore the project to change them.</span></div> : null}

    <div className={styles.summary} aria-label="Management action summary"><div><span>Active actions</span><strong>{summary.active}</strong></div><div><span>Critical active</span><strong>{summary.critical}</strong></div><div><span>Needs attention</span><strong>{summary.attention}</strong></div><div><span>Done</span><strong>{summary.done}</strong></div></div>

    <div className={styles.registerHeading}>
      <div><span className={styles.eyebrow}>Management actions</span><h3>Accountable follow-ups</h3></div>
      <div className={styles.registerControls}><ActionDisplayModes mode={displayMode} onChange={handleDisplayModeChange}/><span>{actions.length} total</span></div>
    </div>

    {displayModeError ? <p className={styles.viewModeError} role="status">View preference could not be saved.</p> : null}

    {actions.length === 0 ? <div className={styles.emptyState}><strong>No management actions yet.</strong><p>Create the first accountable PM/Delivery follow-up for this project.</p>{!project.archivedAt ? <Link to="new">Create first action</Link> : null}</div> : displayMode === DISPLAY_MODES.grid ? <div className={styles.grid}>{ordered.map((action) => <ActionCard key={action.id} action={action} hashTargetId={hashTargetId} archived={Boolean(project.archivedAt)} disabled={mutationPending} onDelete={setPendingDelete} onStatusChange={handleStatusChange}/>)}</div> : <div className={styles.list}>{ordered.map((action) => <ActionListRow key={action.id} action={action} hashTargetId={hashTargetId} archived={Boolean(project.archivedAt)} disabled={mutationPending} onDelete={setPendingDelete} onStatusChange={handleStatusChange}/>)}</div>}

    {mutationError ? <div className={styles.mutationError} role="alert">{mutationError}</div> : null}
    <ConfirmDialog isOpen={Boolean(pendingDelete)} eyebrow="Action Register" title="Delete management action?" message={pendingDelete ? `“${pendingDelete.title}” will be removed from this local Action Register. Completed work should normally remain as Done; delete only records created by mistake.` : ''} confirmLabel={mutationPending ? 'Deleting…' : 'Delete action'} cancelLabel="Keep action" onConfirm={handleDelete} onCancel={() => setPendingDelete(null)}/>
  </section>
}
