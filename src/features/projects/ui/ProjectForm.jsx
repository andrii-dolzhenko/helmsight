import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { PROJECT_STATUS_OPTIONS } from '../lib/projectPresentation.js'
import styles from './ProjectForm.module.css'

const EMPTY_PROJECT = {
  name: '',
  clientContext: '',
  description: '',
  startDate: '',
  targetEndDate: '',
  status: 'planning',
}

function readDraft(draftKey) {
  if (!draftKey) {
    return null
  }

  try {
    return formDraftService.read(draftKey)
  } catch {
    return null
  }
}

export function ProjectForm({
  project = EMPTY_PROJECT,
  draftKey,
  submitLabel,
  cancelTo,
  submitError,
  onSubmit,
}) {
  const baseValues = useMemo(
    () => ({
      ...EMPTY_PROJECT,
      ...project,
    }),
    [project],
  )
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const defaultValues = initialDraft?.values ?? baseValues
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft?.values))
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const watchedValues = useWatch({ control })

  useEffect(() => {
    if (!draftKey || !isDirty) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      formDraftService.write(draftKey, watchedValues)
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [draftKey, isDirty, watchedValues])

  useEffect(() => {
    if (!draftKey) {
      return undefined
    }

    const handleBeforeUnload = () => {
      if (isDirty) {
        formDraftService.write(draftKey, getValues())
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [draftKey, getValues, isDirty])

  const clearDraft = () => {
    if (draftKey) {
      formDraftService.remove(draftKey)
    }
    setDraftRestored(false)
  }

  const discardDraft = () => {
    clearDraft()
    reset(baseValues)
    setPendingDiscard(null)
  }

  const handleCancel = (event) => {
    if (!draftKey || (!isDirty && !draftRestored)) {
      return
    }

    event.preventDefault()
    setPendingDiscard('cancel')
  }

  const confirmCancel = () => {
    clearDraft()
    setPendingDiscard(null)
    navigate(cancelTo)
  }

  const submitForm = handleSubmit(async (values) => {
    const result = await onSubmit(values)

    if (result !== false) {
      clearDraft()
    }
  })

  return (
    <form className={styles.form} onSubmit={submitForm} noValidate>
      {draftRestored ? (
        <div className={styles.draftNotice} role="status">
          <div>
            <strong>Draft restored</strong>
            <span>Your unsaved form values were recovered from this browser.</span>
          </div>
          <button type="button" onClick={() => setPendingDiscard('draft')}>
            Discard draft
          </button>
        </div>
      ) : null}

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Project name <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.name)}
            {...register('name', {
              required: 'Project name is required.',
              minLength: {
                value: 2,
                message: 'Use at least 2 characters.',
              },
              maxLength: {
                value: 80,
                message: 'Use 80 characters or fewer.',
              },
            })}
          />
          {errors.name ? <small className={styles.error}>{errors.name.message}</small> : null}
        </label>

        <label className={styles.field}>
          <span>Client / context <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="text"
            autoComplete="organization"
            aria-required="true"
            aria-invalid={Boolean(errors.clientContext)}
            {...register('clientContext', {
              required: 'Client or project context is required.',
              minLength: {
                value: 2,
                message: 'Use at least 2 characters.',
              },
              maxLength: {
                value: 100,
                message: 'Use 100 characters or fewer.',
              },
            })}
          />
          {errors.clientContext ? (
            <small className={styles.error}>{errors.clientContext.message}</small>
          ) : null}
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Description</span>
          <textarea
            rows="5"
            aria-invalid={Boolean(errors.description)}
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'Use 500 characters or fewer.',
              },
            })}
          />
          <span className={styles.hint}>Optional. Keep it focused on the delivery context.</span>
          {errors.description ? (
            <small className={styles.error}>{errors.description.message}</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Start date <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="date"
            aria-required="true"
            aria-invalid={Boolean(errors.startDate)}
            {...register('startDate', {
              required: 'Start date is required.',
            })}
          />
          {errors.startDate ? (
            <small className={styles.error}>{errors.startDate.message}</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Target end date <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <input
            type="date"
            aria-required="true"
            aria-invalid={Boolean(errors.targetEndDate)}
            {...register('targetEndDate', {
              required: 'Target end date is required.',
              validate: (value) => {
                const startDate = getValues('startDate')
                return (
                  !startDate ||
                  value >= startDate ||
                  'Target end date must be on or after the start date.'
                )
              },
            })}
          />
          {errors.targetEndDate ? (
            <small className={styles.error}>{errors.targetEndDate.message}</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Project status <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select
            aria-required="true"
            aria-invalid={Boolean(errors.status)}
            {...register('status', { required: 'Project status is required.' })}
          >
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status ? <small className={styles.error}>{errors.status.message}</small> : null}
        </label>
      </div>

      {submitError ? (
        <div className={styles.submitError} role="alert">
          <strong>Project could not be saved.</strong>
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className={styles.formFooter}>
        <p className={styles.requiredNote}><span aria-hidden="true">*</span> Required fields</p>
        <div className={styles.actions}>
          <Link className={styles.secondaryButton} data-ui-button="secondary" to={cancelTo} onClick={handleCancel}>
            Cancel
          </Link>
          <button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDiscard === 'draft'}
        title="Discard recovered draft?"
        message="The recovered values will be removed and this form will return to the last saved state."
        confirmLabel="Discard draft"
        onCancel={() => setPendingDiscard(null)}
        onConfirm={discardDraft}
      />

      <ConfirmDialog
        isOpen={pendingDiscard === 'cancel'}
        title="Leave without saving?"
        message="Your unsaved changes will be discarded before you return to Projects."
        confirmLabel="Discard changes"
        onCancel={() => setPendingDiscard(null)}
        onConfirm={confirmCancel}
      />
    </form>
  )
}
