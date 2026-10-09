import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import {
  calculateRiskScore,
  getRiskSeverity,
  getRiskSeverityLabel,
  RISK_IMPACT,
  RISK_PROBABILITY,
  RISK_RESPONSE_STRATEGIES,
  RISK_STATUSES,
} from '../lib/risks.js'
import styles from './RiskForm.module.css'

const EMPTY_RISK = {
  title: '',
  description: '',
  probability: '3',
  impact: '3',
  owner: '',
  responseStrategy: 'mitigate',
  mitigation: '',
  dueDate: '',
  status: 'open',
}

function toFormRisk(risk) {
  if (!risk) return EMPTY_RISK
  return {
    ...EMPTY_RISK,
    ...risk,
    probability: String(risk.probability),
    impact: String(risk.impact),
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

export function RiskForm({ risk, draftKey, submitLabel, cancelTo, submitError, onSubmit }) {
  const baseValues = useMemo(() => toFormRisk(risk), [risk])
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
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const probability = useWatch({ control, name: 'probability' })
  const impact = useWatch({ control, name: 'impact' })
  const watchedValues = useWatch({ control })
  const score = calculateRiskScore(probability, impact)
  const severity = getRiskSeverity(score)

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
            <span>Your unsaved risk values were recovered from this browser.</span>
          </div>
          <button type="button" onClick={() => setPendingDiscard('draft')}>Discard draft</button>
        </div>
      ) : null}

      <div className={styles.sectionHeader}>
        <span>Risk definition</span>
        <p>Capture the uncertainty, ownership, response, and the date by which management attention is required.</p>
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
          {errors.description ? <small className={styles.error}>{errors.description.message}</small> : <small className={styles.hint}>Optional. Describe the uncertain event or condition, not the mitigation.</small>}
        </label>

        <label className={styles.field}>
          <span>Probability <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select aria-required="true" {...register('probability', { required: true })}>
            {RISK_PROBABILITY.map((option) => <option key={option.value} value={option.value}>{option.value} — {option.label}</option>)}
          </select>
        </label>

        <label className={styles.field}>
          <span>Impact <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select aria-required="true" {...register('impact', { required: true })}>
            {RISK_IMPACT.map((option) => <option key={option.value} value={option.value}>{option.value} — {option.label}</option>)}
          </select>
        </label>
      </div>

      <div className={`${styles.scorePreview} ${styles[severity] ?? ''}`} aria-live="polite">
        <div>
          <span>Calculated risk score</span>
          <strong>{score ?? '—'} / 25</strong>
        </div>
        <div>
          <span>Severity</span>
          <strong>{getRiskSeverityLabel(severity)}</strong>
        </div>
        <p>Severity is calculated automatically from probability × impact.</p>
      </div>

      <div className={styles.metricSection}>
        <div className={styles.sectionHeader}>
          <span>Response & ownership</span>
          <p>Enter the person responsible for monitoring this risk and coordinating the response.</p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Owner <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <input
              type="text"
              autoComplete="off"
              aria-required="true"
              aria-invalid={Boolean(errors.owner)}
              {...register('owner', {
                required: 'Owner is required.',
                minLength: { value: 2, message: 'Use at least 2 characters.' },
                maxLength: { value: 120, message: 'Use 120 characters or fewer.' },
              })}
            />
            {errors.owner ? <small className={styles.error}>{errors.owner.message}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Response strategy <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <select aria-required="true" {...register('responseStrategy', { required: true })}>
              {RISK_RESPONSE_STRATEGIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Mitigation / response plan <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <textarea
              rows="4"
              aria-required="true"
              aria-invalid={Boolean(errors.mitigation)}
              {...register('mitigation', {
                required: 'Mitigation / response plan is required.',
                minLength: { value: 2, message: 'Use at least 2 characters.' },
                maxLength: { value: 500, message: 'Use 500 characters or fewer.' },
              })}
            />
            {errors.mitigation ? <small className={styles.error}>{errors.mitigation.message}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Due date <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <input type="date" aria-required="true" aria-invalid={Boolean(errors.dueDate)} {...register('dueDate', { required: 'Due date is required.' })} />
            {errors.dueDate ? <small className={styles.error}>{errors.dueDate.message}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Status <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <select aria-required="true" {...register('status', { required: true })}>
              {RISK_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {submitError ? <div className={styles.submitError} role="alert"><strong>Risk could not be saved.</strong><span>{submitError}</span></div> : null}

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
        message={pendingDiscard === 'draft' ? 'The recovered risk values will be removed and the form will return to its saved/default state.' : 'Your unsaved risk changes will be discarded.'}
        confirmLabel={pendingDiscard === 'draft' ? 'Discard draft' : 'Discard changes'}
        onConfirm={pendingDiscard === 'draft' ? discardDraft : confirmCancel}
        onCancel={() => setPendingDiscard(null)}
      />
    </form>
  )
}
