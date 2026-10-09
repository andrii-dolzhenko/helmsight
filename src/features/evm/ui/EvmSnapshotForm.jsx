import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import {
  formatEvmValue,
  getCumulativePackageEarned,
  getMeasurementUnit,
  isFullEvmBasis,
} from '../lib/evm.js'
import styles from './EvmForms.module.css'

function toFormSnapshot(baseline, snapshot) {
  const existing = new Map((snapshot?.entries ?? []).map((entry) => [entry.packageId, entry]))
  return {
    snapshotDate: snapshot?.snapshotDate ?? '',
    entries: baseline.workPackages.map((workPackage) => ({
      packageId: workPackage.id,
      earnedValue: existing.get(workPackage.id)?.earnedValue ?? 0,
      actualValue: existing.get(workPackage.id)?.actualValue ?? 0,
    })),
  }
}

function readDraft(draftKey) {
  if (!draftKey) return null
  try { return formDraftService.read(draftKey) } catch { return null }
}

export function EvmSnapshotForm({ baseline, snapshot, snapshots, draftKey, submitError, onSubmit, cancelTo }) {
  const baseValues = useMemo(() => toFormSnapshot(baseline, snapshot), [baseline, snapshot])
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft?.values))
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const navigate = useNavigate()
  const fullEvm = isFullEvmBasis(baseline.measurementBasis)
  const unit = getMeasurementUnit(baseline)
  const priorSnapshots = useMemo(() => snapshots.filter((item) => item.id !== snapshot?.id), [snapshot?.id, snapshots])

  const { register, handleSubmit, control, getValues, reset, formState: { errors, isDirty, isSubmitting } } = useForm({
    defaultValues: initialDraft?.values ?? baseValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const values = useWatch({ control })

  useEffect(() => {
    if (!draftKey || !isDirty) return undefined
    const timeoutId = window.setTimeout(() => formDraftService.write(draftKey, values), 400)
    return () => window.clearTimeout(timeoutId)
  }, [draftKey, isDirty, values])

  useEffect(() => {
    if (!draftKey) return undefined
    const handleBeforeUnload = () => { if (isDirty) formDraftService.write(draftKey, getValues()) }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [draftKey, getValues, isDirty])

  const clearDraft = () => {
    if (draftKey) formDraftService.remove(draftKey)
    setDraftRestored(false)
  }

  const discardDraft = () => {
    clearDraft()
    reset(baseValues)
    setPendingDiscard(null)
  }

  const handleCancel = (event) => {
    if (!draftKey || (!isDirty && !draftRestored)) return
    event.preventDefault()
    setPendingDiscard('cancel')
  }

  const submitForm = handleSubmit(async (formValues) => {
    const result = await onSubmit(formValues)
    if (result !== false) clearDraft()
  })

  const weeklyEv = (values?.entries ?? []).reduce((total, entry) => total + (Number(entry.earnedValue) || 0), 0)
  const weeklyActual = (values?.entries ?? []).reduce((total, entry) => total + (Number(entry.actualValue) || 0), 0)

  return (
    <form className={styles.form} onSubmit={submitForm} noValidate>
      {draftRestored ? <div className={styles.draftNotice} role="status"><div><strong>Draft restored</strong><span>Your unsaved weekly snapshot was recovered from this browser.</span></div><button type="button" onClick={() => setPendingDiscard('draft')}>Discard draft</button></div> : null}

      <div className={styles.sectionHeader}><span>Reporting period</span><p>Capture the completed baseline value earned this week and the actual consumed effort/cost from the external tracking system.</p></div>
      <label className={`${styles.field} ${styles.dateField}`}><span>Week ending / reporting date <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="date" {...register('snapshotDate', { required: 'Reporting date is required.' })}/>{errors.snapshotDate ? <small className={styles.error}>{errors.snapshotDate.message}</small> : null}</label>

      <div className={styles.sectionHeader}><span>Weekly earned work</span><p>In-progress work earns zero until the stage/work package value is objectively completed. Actual consumption can continue while EV remains zero.</p></div>

      <div className={styles.snapshotList}>
        {baseline.workPackages.map((workPackage, index) => {
          const previousEarned = getCumulativePackageEarned(priorSnapshots, workPackage.id)
          const remaining = Math.max(0, workPackage.budgetValue - previousEarned)
          return <fieldset className={styles.snapshotCard} key={workPackage.id}>
            <legend>{workPackage.title}</legend>
            <input type="hidden" {...register(`entries.${index}.packageId`)} />
            <div className={styles.packageContext}><span>Baseline {formatEvmValue(workPackage.budgetValue, baseline)}</span><span>Earned in other snapshots {formatEvmValue(previousEarned, baseline)}</span><span>Remaining {formatEvmValue(remaining, baseline)}</span></div>
            <div className={styles.grid}>
              <label className={styles.field}><span>Earned Value this week ({unit}) <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="number" min="0" max={remaining} step="0.01" inputMode="decimal" {...register(`entries.${index}.earnedValue`, { required: 'EV is required.', valueAsNumber: true, min: { value: 0, message: 'EV cannot be negative.' }, max: { value: remaining, message: 'Weekly EV cannot exceed the remaining baseline.' }, validate: (value) => Number.isFinite(value) || 'Enter a valid number.' })}/>{errors.entries?.[index]?.earnedValue ? <small className={styles.error}>{errors.entries[index].earnedValue.message}</small> : null}</label>
              {fullEvm ? <label className={styles.field}><span>{baseline.measurementBasis === 'currency' ? 'Actual Cost' : 'Actual effort'} this week ({unit}) <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="number" min="0" step="0.01" inputMode="decimal" {...register(`entries.${index}.actualValue`, { required: 'Actual value is required.', valueAsNumber: true, min: { value: 0, message: 'Actual value cannot be negative.' }, validate: (value) => Number.isFinite(value) || 'Enter a valid number.' })}/>{errors.entries?.[index]?.actualValue ? <small className={styles.error}>{errors.entries[index].actualValue.message}</small> : null}</label> : null}
            </div>
          </fieldset>
        })}
      </div>

      <div className={styles.snapshotPreview}><div><span>EV entered this week</span><strong>{formatEvmValue(weeklyEv, baseline)}</strong></div>{fullEvm ? <div><span>{baseline.measurementBasis === 'currency' ? 'AC entered this week' : 'Actual entered this week'}</span><strong>{formatEvmValue(weeklyActual, baseline)}</strong></div> : <div><span>Cost metrics</span><strong>Not used for Story points</strong></div>}</div>

      {submitError ? <div className={styles.submitError} role="alert"><strong>Snapshot could not be saved.</strong><span>{submitError}</span></div> : null}
      <div className={styles.formFooter}><p className={styles.requiredNote}><span aria-hidden="true">*</span> Required fields</p><div className={styles.actions}><Link className={styles.secondaryButton} data-ui-button="secondary" to={cancelTo} onClick={handleCancel}>Cancel</Link><button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : snapshot ? 'Save snapshot' : 'Create snapshot'}</button></div></div>

      <ConfirmDialog isOpen={pendingDiscard !== null} title={pendingDiscard === 'draft' ? 'Discard recovered draft?' : 'Leave without saving?'} message={pendingDiscard === 'draft' ? 'The recovered weekly EVM values will be removed and the form will return to its saved/default state.' : 'Your unsaved weekly EVM changes will be discarded.'} confirmLabel={pendingDiscard === 'draft' ? 'Discard draft' : 'Discard changes'} onConfirm={pendingDiscard === 'draft' ? discardDraft : () => { clearDraft(); setPendingDiscard(null); navigate(cancelTo) }} onCancel={() => setPendingDiscard(null)}/>
    </form>
  )
}
