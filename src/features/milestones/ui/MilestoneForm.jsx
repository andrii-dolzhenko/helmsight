import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { MILESTONE_STATUSES } from '../lib/milestones.js'
import styles from './MilestoneForm.module.css'

const EMPTY_MILESTONE = {
  title: '',
  description: '',
  targetDate: '',
  status: 'planned',
  progress: '0',
}

function toFormMilestone(milestone) {
  if (!milestone) return EMPTY_MILESTONE
  return {
    ...EMPTY_MILESTONE,
    ...milestone,
    progress: String(milestone.progress),
  }
}

function readDraft(draftKey) {
  if (!draftKey) return null
  try {
    return formDraftService.read(draftKey)
  } catch {
    return null
  }
}

export function MilestoneForm({ milestone, draftKey, submitLabel, cancelTo, submitError, onSubmit }) {
  const baseValues = useMemo(() => toFormMilestone(milestone), [milestone])
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const defaultValues = initialDraft?.values ?? baseValues
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft?.values))
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const status = useWatch({ control, name: 'status' })
  const progress = useWatch({ control, name: 'progress' })
  const watchedValues = useWatch({ control })

  useEffect(() => {
    const numericProgress = Number(progress)

    if (!Number.isFinite(numericProgress)) return

    if (status === 'completed' && numericProgress !== 100) {
      setValue('progress', 100, { shouldDirty: true, shouldValidate: true })
      return
    }

    if (numericProgress > 0 && status === 'planned') {
      setValue('status', 'inProgress', { shouldDirty: true, shouldValidate: true })
    }
  }, [progress, setValue, status])

  useEffect(() => {
    if (!draftKey || !isDirty) return undefined
    const timeoutId = window.setTimeout(() => {
      formDraftService.write(draftKey, watchedValues)
    }, 400)
    return () => window.clearTimeout(timeoutId)
  }, [draftKey, isDirty, watchedValues])

  useEffect(() => {
    if (!draftKey) return undefined
    const handleBeforeUnload = () => {
      if (isDirty) formDraftService.write(draftKey, getValues())
    }
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

  const confirmCancel = () => {
    clearDraft()
    setPendingDiscard(null)
    navigate(cancelTo)
  }

  const submitForm = handleSubmit(async (values) => {
    try {
      const result = await onSubmit(values)
      if (result !== false) clearDraft()
    } catch {
      // Redux exposes the save error through submitError. Keep the draft for recovery.
    }
  })

  return (
    <form className={styles.form} onSubmit={submitForm} noValidate>
      {draftRestored ? (
        <div className={styles.draftNotice} role="status">
          <div>
            <strong>Draft restored</strong>
            <span>Your unsaved milestone values were recovered from this browser.</span>
          </div>
          <button type="button" onClick={() => setPendingDiscard('draft')}>Discard draft</button>
        </div>
      ) : null}

      <div className={styles.sectionHeader}>
        <span>Milestone definition</span>
        <p>Define a meaningful delivery checkpoint, its target date, and the current progress toward completion.</p>
      </div>

      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Title <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            {...register('title', {
              required: 'Title is required.',
              minLength: { value: 2, message: 'Use at least 2 characters.' },
              maxLength: { value: 120, message: 'Use 120 characters or fewer.' },
            })}
          />
          {errors.title ? <small className={styles.error}>{errors.title.message}</small> : null}
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Description</span>
          <textarea
            rows="4"
            aria-invalid={Boolean(errors.description)}
            {...register('description', {
              maxLength: { value: 500, message: 'Use 500 characters or fewer.' },
            })}
          />
          {errors.description ? <small className={styles.error}>{errors.description.message}</small> : <small className={styles.hint}>Optional. Describe the outcome that makes this checkpoint meaningful.</small>}
        </label>

        <label className={styles.field}>
          <span>Target date <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="date"
            aria-required="true"
            aria-invalid={Boolean(errors.targetDate)}
            {...register('targetDate', { required: 'Target date is required.' })}
          />
          {errors.targetDate ? <small className={styles.error}>{errors.targetDate.message}</small> : null}
        </label>

        <label className={styles.field}>
          <span>Status <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select aria-required="true" {...register('status', { required: true })}>
            {MILESTONE_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Progress (%) <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            inputMode="numeric"
            aria-required="true"
            aria-invalid={Boolean(errors.progress)}
            readOnly={status === 'completed'}
            {...register('progress', {
              required: 'Progress is required.',
              valueAsNumber: true,
              min: { value: 0, message: 'Progress cannot be below 0%.' },
              max: { value: 100, message: 'Progress cannot exceed 100%.' },
              validate: (value) => Number.isFinite(value) || 'Enter a valid progress value.',
            })}
          />
          {errors.progress ? <small className={styles.error}>{errors.progress.message}</small> : <small className={styles.hint}>{status === 'completed' ? 'Completed milestones are stored at 100% progress.' : 'Any progress above 0% moves a planned milestone to In progress; selecting Completed sets progress to 100%.'}</small>}
        </label>
      </div>

      <div className={styles.progressPreview} aria-live="polite">
        <div>
          <span>Current progress</span>
          <strong>{Number.isFinite(Number(progress)) ? `${Math.min(100, Math.max(0, Number(progress)))}%` : '—'}</strong>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, Number(progress) || 0))}%` }} />
        </div>
        <p>Schedule attention is derived automatically from target date and completion status.</p>
      </div>

      {submitError ? <div className={styles.submitError} role="alert"><strong>Milestone could not be saved.</strong><span>{submitError}</span></div> : null}

      <div className={styles.formFooter}>
        <p className={styles.requiredNote}><span aria-hidden="true">*</span> Required fields</p>
        <div className={styles.actions}>
          <Link className={styles.secondaryButton} data-ui-button="secondary" to={cancelTo} onClick={handleCancel}>Cancel</Link>
          <button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : submitLabel}</button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDiscard !== null}
        title={pendingDiscard === 'draft' ? 'Discard recovered draft?' : 'Leave without saving?'}
        message={pendingDiscard === 'draft' ? 'The recovered milestone values will be removed and the form will return to its saved/default state.' : 'Your unsaved milestone changes will be discarded.'}
        confirmLabel={pendingDiscard === 'draft' ? 'Discard draft' : 'Discard changes'}
        onConfirm={pendingDiscard === 'draft' ? discardDraft : confirmCancel}
        onCancel={() => setPendingDiscard(null)}
      />
    </form>
  )
}
