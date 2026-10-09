import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { ACTION_PRIORITIES, ACTION_SOURCES, ACTION_STATUSES } from '../lib/managementActions.js'
import styles from './ManagementActionForm.module.css'

const EMPTY = { title: '', description: '', owner: '', dueDate: '', priority: 'medium', status: 'notStarted', source: 'manual' }

function normalizeValues(values) {
  if (!values) return EMPTY
  return { ...EMPTY, ...values, status: values.status === 'open' ? 'notStarted' : values.status }
}
function valuesFor(action) { return normalizeValues(action) }
function readDraft(key) { try { return key ? formDraftService.read(key) : null } catch { return null } }

export function ManagementActionForm({ action, draftKey, submitLabel, cancelTo, submitError, onSubmit }) {
  const baseValues = useMemo(() => valuesFor(action), [action])
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const restoredValues = useMemo(() => initialDraft?.values ? normalizeValues(initialDraft.values) : null, [initialDraft])
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredValues))
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const navigate = useNavigate()
  const { register, handleSubmit, reset, getValues, control, formState: { errors, isDirty, isSubmitting } } = useForm({
    defaultValues: restoredValues ?? baseValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const watched = useWatch({ control })

  useEffect(() => {
    if (!draftKey || !isDirty) return undefined
    const id = window.setTimeout(() => formDraftService.write(draftKey, watched), 400)
    return () => window.clearTimeout(id)
  }, [draftKey, isDirty, watched])

  useEffect(() => {
    if (!draftKey) return undefined
    const beforeUnload = () => { if (isDirty) formDraftService.write(draftKey, getValues()) }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [draftKey, getValues, isDirty])

  const clearDraft = () => { if (draftKey) formDraftService.remove(draftKey); setDraftRestored(false) }
  const discardDraft = () => { clearDraft(); reset(baseValues); setPendingDiscard(null) }
  const handleCancel = (event) => { if (!draftKey || (!isDirty && !draftRestored)) return; event.preventDefault(); setPendingDiscard('cancel') }
  const confirmCancel = () => { clearDraft(); setPendingDiscard(null); navigate(cancelTo) }
  const submit = handleSubmit(async (values) => {
    try { const result = await onSubmit(values); if (result !== false) clearDraft() } catch { /* Redux error remains visible. */ }
  })

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {draftRestored ? <div className={styles.draftNotice} role="status"><div><strong>Draft restored</strong><span>Your unsaved management action was recovered from this browser.</span></div><button type="button" onClick={() => setPendingDiscard('draft')}>Discard draft</button></div> : null}

      <div className={styles.sectionHeader}><span>Management commitment</span><p>Capture one accountable follow-up with a clear owner, due date, and management context.</p></div>
      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.fullWidth}`}><span>Title <span className={styles.requiredMark} aria-hidden="true">*</span></span><input autoComplete="off" aria-required="true" aria-invalid={Boolean(errors.title)} {...register('title', { required: 'Title is required.', minLength: { value: 2, message: 'Use at least 2 characters.' }, maxLength: { value: 140, message: 'Use 140 characters or fewer.' } })}/>{errors.title ? <small className={styles.error}>{errors.title.message}</small> : null}</label>
        <label className={`${styles.field} ${styles.fullWidth}`}><span>Description</span><textarea rows="4" aria-invalid={Boolean(errors.description)} {...register('description', { maxLength: { value: 600, message: 'Use 600 characters or fewer.' } })}/>{errors.description ? <small className={styles.error}>{errors.description.message}</small> : <small className={styles.hint}>Optional. Describe the expected follow-up or decision outcome.</small>}</label>
        <label className={styles.field}><span>Owner <span className={styles.requiredMark} aria-hidden="true">*</span></span><input autoComplete="off" aria-required="true" aria-invalid={Boolean(errors.owner)} {...register('owner', { required: 'Owner is required.', minLength: { value: 2, message: 'Use at least 2 characters.' }, maxLength: { value: 100, message: 'Use 100 characters or fewer.' } })}/>{errors.owner ? <small className={styles.error}>{errors.owner.message}</small> : <small className={styles.hint}>Person accountable for closing this action.</small>}</label>
        <label className={styles.field}><span>Due date <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="date" aria-required="true" aria-invalid={Boolean(errors.dueDate)} {...register('dueDate', { required: 'Due date is required.' })}/>{errors.dueDate ? <small className={styles.error}>{errors.dueDate.message}</small> : null}</label>
        <label className={styles.field}><span>Priority <span className={styles.requiredMark} aria-hidden="true">*</span></span><select aria-required="true" {...register('priority', { required: true })}>{ACTION_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className={styles.field}><span>Status <span className={styles.requiredMark} aria-hidden="true">*</span></span><select aria-required="true" {...register('status', { required: true })}>{ACTION_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small className={styles.hint}>Not started → In progress → Done.</small></label>
        <label className={`${styles.field} ${styles.fullWidth}`}><span>Source / context <span className={styles.requiredMark} aria-hidden="true">*</span></span><select aria-required="true" {...register('source', { required: true })}>{ACTION_SOURCES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small className={styles.hint}>Context only in P0; selecting Risk or Meeting does not create an automatic cross-module link.</small></label>
      </div>
      {submitError ? <div className={styles.submitError} role="alert"><strong>Management action could not be saved.</strong><span>{submitError}</span></div> : null}
      <div className={styles.formFooter}><p className={styles.requiredNote}><span aria-hidden="true">*</span> Required fields</p><div className={styles.actions}><Link className={styles.secondaryButton} data-ui-button="secondary" to={cancelTo} onClick={handleCancel}>Cancel</Link><button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : submitLabel}</button></div></div>
      <ConfirmDialog isOpen={pendingDiscard !== null} title={pendingDiscard === 'draft' ? 'Discard recovered draft?' : 'Leave without saving?'} message={pendingDiscard === 'draft' ? 'The recovered management action will be removed and the form will return to its saved/default state.' : 'Your unsaved management action changes will be discarded.'} confirmLabel={pendingDiscard === 'draft' ? 'Discard draft' : 'Discard changes'} onConfirm={pendingDiscard === 'draft' ? discardDraft : confirmCancel} onCancel={() => setPendingDiscard(null)} />
    </form>
  )
}
