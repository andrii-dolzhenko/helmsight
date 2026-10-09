import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import {
  calculateBaselineBAC,
  EVM_CURRENCY_CODES,
  EVM_MEASUREMENT_BASES,
  formatEvmValue,
  getMeasurementBasisLabel,
} from '../lib/evm.js'
import styles from './EvmForms.module.css'

const EMPTY_BASELINE = {
  measurementBasis: 'hours',
  currencyCode: 'USD',
  workPackages: [
    { id: '', title: '', startDate: '', endDate: '', budgetValue: '' },
  ],
}

function toFormBaseline(baseline) {
  if (!baseline) return { ...EMPTY_BASELINE, workPackages: EMPTY_BASELINE.workPackages.map((item) => ({ ...item })) }
  return {
    measurementBasis: baseline.measurementBasis,
    currencyCode: baseline.currencyCode || 'USD',
    workPackages: baseline.workPackages.map((item) => ({ ...item, budgetValue: String(item.budgetValue) })),
  }
}

function readDraft(draftKey) {
  if (!draftKey) return null
  try { return formDraftService.read(draftKey) } catch { return null }
}

export function EvmBaselineForm({ baseline, draftKey, submitError, onSubmit, cancelTo }) {
  const baseValues = useMemo(() => toFormBaseline(baseline), [baseline])
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft?.values))
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: initialDraft?.values ?? baseValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'workPackages', keyName: 'fieldKey' })
  const measurementBasis = useWatch({ control, name: 'measurementBasis' })
  const currencyCode = useWatch({ control, name: 'currencyCode' })
  const workPackages = useWatch({ control, name: 'workPackages' }) ?? []
  const watchedValues = useWatch({ control })
  const previewBaseline = { measurementBasis, currencyCode, workPackages }
  const bac = calculateBaselineBAC(previewBaseline)

  useEffect(() => {
    if (!draftKey || !isDirty) return undefined
    const timeoutId = window.setTimeout(() => formDraftService.write(draftKey, watchedValues), 400)
    return () => window.clearTimeout(timeoutId)
  }, [draftKey, isDirty, watchedValues])

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

  const submitForm = handleSubmit(async (values) => {
    const result = await onSubmit(values)
    if (result !== false) clearDraft()
  })

  return (
    <form className={styles.form} onSubmit={submitForm} noValidate>
      {draftRestored ? <div className={styles.draftNotice} role="status"><div><strong>Draft restored</strong><span>Your unsaved EVM baseline was recovered from this browser.</span></div><button type="button" onClick={() => setPendingDiscard('draft')}>Discard draft</button></div> : null}

      <div className={styles.sectionHeader}><span>Measurement basis</span><p>Choose one basis for the project. HelmSight applies the same unit to BAC, PV, EV, AC and forecasts where the formula is valid.</p></div>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Measurement basis <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select {...register('measurementBasis', { required: true })}>
            {EVM_MEASUREMENT_BASES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <small className={styles.hint}>{measurementBasis === 'storyPoints' ? 'Story points use planned-versus-earned schedule tracking only; CPI and cost forecasts are not calculated.' : `Full EVM is enabled for ${getMeasurementBasisLabel(measurementBasis).toLowerCase()}.`}</small>
        </label>

        {measurementBasis === 'currency' ? <label className={styles.field}>
          <span>Currency <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select {...register('currencyCode', { required: true })}>{EVM_CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}</select>
        </label> : <div className={styles.bacPreview}><span>Budget at Completion (BAC)</span><strong>{formatEvmValue(bac, previewBaseline)}</strong></div>}
      </div>

      {measurementBasis === 'currency' ? <div className={styles.bacPreview}><span>Budget at Completion (BAC)</span><strong>{formatEvmValue(bac, previewBaseline)}</strong></div> : null}

      <div className={styles.sectionHeader}><span>Work packages / phases</span><p>Use delivery phases or work packages, not individual tracker tasks. Planned Value is distributed linearly across weekdays between each start and end date.</p></div>

      <div className={styles.packageList}>
        {fields.map((field, index) => (
          <fieldset className={styles.packageCard} key={field.fieldKey}>
            <legend>Work package {index + 1}</legend>
            <input type="hidden" {...register(`workPackages.${index}.id`)} />
            <div className={styles.grid}>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Title <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                <input type="text" autoComplete="off" aria-invalid={Boolean(errors.workPackages?.[index]?.title)} {...register(`workPackages.${index}.title`, { required: 'Title is required.', minLength: { value: 2, message: 'Use at least 2 characters.' }, maxLength: { value: 100, message: 'Use 100 characters or fewer.' } })}/>
                {errors.workPackages?.[index]?.title ? <small className={styles.error}>{errors.workPackages[index].title.message}</small> : null}
              </label>
              <label className={styles.field}><span>Start date <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="date" {...register(`workPackages.${index}.startDate`, { required: 'Start date is required.' })}/>{errors.workPackages?.[index]?.startDate ? <small className={styles.error}>{errors.workPackages[index].startDate.message}</small> : null}</label>
              <label className={styles.field}><span>End date <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="date" {...register(`workPackages.${index}.endDate`, { required: 'End date is required.', validate: (value) => !value || !getValues(`workPackages.${index}.startDate`) || value >= getValues(`workPackages.${index}.startDate`) || 'End date cannot be before start date.' })}/>{errors.workPackages?.[index]?.endDate ? <small className={styles.error}>{errors.workPackages[index].endDate.message}</small> : null}</label>
              <label className={styles.field}><span>Baseline value ({measurementBasis === 'currency' ? currencyCode : measurementBasis === 'hours' ? 'h' : measurementBasis === 'personDays' ? 'person-days' : 'SP'}) <span className={styles.requiredMark} aria-hidden="true">*</span></span><input type="number" min="0.01" step="0.01" inputMode="decimal" {...register(`workPackages.${index}.budgetValue`, { required: 'Baseline value is required.', valueAsNumber: true, min: { value: 0.01, message: 'Use a value greater than zero.' }, validate: (value) => Number.isFinite(value) || 'Enter a valid number.' })}/>{errors.workPackages?.[index]?.budgetValue ? <small className={styles.error}>{errors.workPackages[index].budgetValue.message}</small> : null}</label>
            </div>
            {fields.length > 1 ? <button className={styles.removeButton} type="button" onClick={() => remove(index)}>Remove work package</button> : null}
          </fieldset>
        ))}
      </div>

      <button className={styles.addButton} type="button" onClick={() => append({ id: '', title: '', startDate: '', endDate: '', budgetValue: '' })}>+ Add work package</button>

      {submitError ? <div className={styles.submitError} role="alert"><strong>Baseline could not be saved.</strong><span>{submitError}</span></div> : null}

      <div className={styles.formFooter}><p className={styles.requiredNote}><span aria-hidden="true">*</span> Required fields</p><div className={styles.actions}><Link className={styles.secondaryButton} data-ui-button="secondary" to={cancelTo} onClick={handleCancel}>Cancel</Link><button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save baseline'}</button></div></div>

      <ConfirmDialog isOpen={pendingDiscard !== null} title={pendingDiscard === 'draft' ? 'Discard recovered draft?' : 'Leave without saving?'} message={pendingDiscard === 'draft' ? 'The recovered EVM baseline will be removed and the form will return to its saved/default state.' : 'Your unsaved EVM baseline changes will be discarded.'} confirmLabel={pendingDiscard === 'draft' ? 'Discard draft' : 'Discard changes'} onConfirm={pendingDiscard === 'draft' ? discardDraft : () => { clearDraft(); setPendingDiscard(null); navigate(cancelTo) }} onCancel={() => setPendingDiscard(null)}/>
    </form>
  )
}
