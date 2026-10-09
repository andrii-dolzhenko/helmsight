import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import {
  calculateCriterionCurrentValue,
  DATE_DIRECTIONS,
  NUMERIC_DIRECTIONS,
  SUCCESS_CRITERIA_CATEGORIES,
  SUCCESS_CRITERIA_METRIC_TYPES,
  SUCCESS_CRITERIA_UNITS,
} from '../lib/successCriteria.js'
import styles from './SuccessCriterionForm.module.css'


const FINANCIAL_TARGET_COPY = Object.freeze({
  roi: {
    metricLabel: 'ROI',
    baselineLabel: 'Baseline ROI (%)',
    targetLabel: 'Target ROI (%)',
    sectionDescription:
      'Use the agreed starting ROI and the sponsor-approved target. Current ROI is calculated automatically from Financial benefit and Investment cost.',
    baselineHint:
      'Use the ROI recorded in the approved business case or project baseline at the starting point.',
    targetHint:
      'Use the ROI outcome approved in the business case, benefits plan, or sponsor commitment.',
  },
  grossMargin: {
    metricLabel: 'Gross Margin',
    baselineLabel: 'Baseline Gross Margin (%)',
    targetLabel: 'Target Gross Margin (%)',
    sectionDescription:
      'Use the actual gross margin before project-driven improvement and the approved target. Current Gross Margin is calculated automatically from Revenue and Direct costs.',
    baselineHint:
      'Use the actual gross margin from the agreed pre-project period, such as the previous quarter or year.',
    targetHint:
      'Use the gross-margin outcome approved in the business case, financial plan, or sponsor commitment.',
  },
  profitMargin: {
    metricLabel: 'Profit Margin',
    baselineLabel: 'Baseline Profit Margin (%)',
    targetLabel: 'Target Profit Margin (%)',
    sectionDescription:
      'Use the actual profit margin before project-driven improvement and the approved target. Current Profit Margin is calculated automatically from Profit and Revenue.',
    baselineHint:
      'Use the actual profit margin from the agreed pre-project period, such as the previous quarter or year.',
    targetHint:
      'Use the profit-margin outcome approved in the business case, financial plan, or sponsor commitment.',
  },
})

const EMPTY_CRITERION = {
  title: '',
  description: '',
  category: 'business',
  metricType: 'manual',
  unit: 'percentage',
  baseline: '',
  target: '',
  currentValue: '',
  targetDate: '',
  direction: 'atLeast',
  calculationInputs: {
    financialBenefit: '',
    investmentCost: '',
    revenue: '',
    directCosts: '',
    profit: '',
  },
}

function toFormCriterion(criterion) {
  if (!criterion) {
    return EMPTY_CRITERION
  }

  return {
    ...EMPTY_CRITERION,
    ...criterion,
    calculationInputs: {
      ...EMPTY_CRITERION.calculationInputs,
      ...(criterion.calculationInputs ?? {}),
    },
  }
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

function numberValidation(
  label,
  { allowNegative = false, min = null, max = null, greaterThanZero = false } = {},
) {
  return {
    required: `${label} is required.`,
    validate: (value) => {
      const number = Number(value)

      if (!Number.isFinite(number)) {
        return `${label} must be a valid number.`
      }

      if (greaterThanZero && number <= 0) {
        return `${label} must be greater than zero.`
      }

      if (!allowNegative && number < 0) {
        return `${label} cannot be negative.`
      }

      if (min !== null && number < min) {
        return `${label} must be at least ${min}.`
      }

      if (max !== null && number > max) {
        return `${label} must be ${max} or less.`
      }

      return true
    },
  }
}

function measurementValidation(label, unit) {
  if (unit === 'date') {
    return { required: `${label} is required.` }
  }

  if (unit === 'percentage') {
    return numberValidation(label, { min: 0, max: 100 })
  }

  return numberValidation(label, { allowNegative: true })
}

export function SuccessCriterionForm({
  criterion,
  draftKey,
  submitLabel,
  cancelTo,
  submitError,
  onSubmit,
}) {
  const baseValues = useMemo(() => toFormCriterion(criterion), [criterion])
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

  const metricType = useWatch({ control, name: 'metricType' })
  const unit = useWatch({ control, name: 'unit' })
  const calculationInputs = useWatch({ control, name: 'calculationInputs' })
  const watchedValues = useWatch({ control })
  const isManual = metricType === 'manual'
  const financialTargetCopy = FINANCIAL_TARGET_COPY[metricType] ?? null
  const currentCalculatedValue = isManual
    ? null
    : calculateCriterionCurrentValue(metricType, calculationInputs)
  const directionOptions = unit === 'date' ? DATE_DIRECTIONS : NUMERIC_DIRECTIONS

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

  const handleMetricTypeChange = (event) => {
    const nextMetricType = event.target.value
    setValue('metricType', nextMetricType, { shouldDirty: true })

    if (nextMetricType !== 'manual') {
      setValue('category', 'financial', { shouldDirty: true })
      setValue('unit', 'percentage', { shouldDirty: true })
      setValue('direction', 'atLeast', { shouldDirty: true })
    }
  }

  const handleUnitChange = (event) => {
    const nextUnit = event.target.value
    setValue('unit', nextUnit, { shouldDirty: true })
    setValue('direction', nextUnit === 'date' ? 'onOrBefore' : 'atLeast', {
      shouldDirty: true,
    })
  }

  const valueInputType = unit === 'date' ? 'date' : 'number'
  const valueStep = unit === 'date' ? undefined : 'any'

  const submitForm = handleSubmit(async (values) => {
    try {
      const result = await onSubmit(values)
      if (result !== false) {
        clearDraft()
      }
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
            <span>Your unsaved criterion values were recovered from this browser.</span>
          </div>
          <button type="button" onClick={() => setPendingDiscard('draft')}>
            Discard draft
          </button>
        </div>
      ) : null}

      <div className={styles.sectionHeader}>
        <span>Criterion definition</span>
        <p>Define the outcome first, then let HelmSight derive its current status.</p>
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
              required: 'Criterion title is required.',
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
          <small className={styles.hint}>Optional. Describe the business outcome, not the activity.</small>
          {errors.description ? (
            <small className={styles.error}>{errors.description.message}</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Metric type <span className={styles.requiredMark} aria-hidden="true">*</span></span>
          <select aria-required="true" {...register('metricType')} onChange={handleMetricTypeChange}>
            {SUCCESS_CRITERIA_METRIC_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isManual ? (
          <label className={styles.field}>
            <span>Category <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <select aria-required="true" {...register('category')}>
              {SUCCESS_CRITERIA_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className={styles.readOnlyField}>
            <span>Category</span>
            <strong>Financial</strong>
          </div>
        )}

        {isManual ? (
          <>
            <label className={styles.field}>
              <span>Unit <span className={styles.requiredMark} aria-hidden="true">*</span></span>
              <select aria-required="true" {...register('unit')} onChange={handleUnitChange}>
                {SUCCESS_CRITERIA_UNITS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Target logic <span className={styles.requiredMark} aria-hidden="true">*</span></span>
              <select aria-required="true" {...register('direction')}>
                {directionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <div className={`${styles.calculatedPreview} ${styles.fullWidth}`}>
            <span>Calculated current value</span>
            <strong>
              {currentCalculatedValue === null
                ? 'Waiting for valid inputs'
                : `${currentCalculatedValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`}
            </strong>
            <p>Calculated metrics use Financial / Percentage / At least target automatically.</p>
          </div>
        )}
      </div>

      {!isManual ? (
        <div className={styles.metricSection}>
          <div className={styles.sectionHeader}>
            <span>Financial inputs</span>
            <p>Inputs are stored with the criterion so the calculation remains explainable.</p>
          </div>

          <div className={styles.grid}>
            {metricType === 'roi' ? (
              <>
                <label className={styles.field}>
                  <span>Financial benefit <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    aria-required="true"
                    aria-invalid={Boolean(errors.calculationInputs?.financialBenefit)}
                    {...register(
                      'calculationInputs.financialBenefit',
                      numberValidation('Financial benefit'),
                    )}
                  />
                  {errors.calculationInputs?.financialBenefit ? (
                    <small className={styles.error}>
                      {errors.calculationInputs.financialBenefit.message}
                    </small>
                  ) : null}
                </label>

                <label className={styles.field}>
                  <span>Investment cost <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    aria-required="true"
                    aria-invalid={Boolean(errors.calculationInputs?.investmentCost)}
                    {...register(
                      'calculationInputs.investmentCost',
                      numberValidation('Investment cost', { greaterThanZero: true }),
                    )}
                  />
                  {errors.calculationInputs?.investmentCost ? (
                    <small className={styles.error}>
                      {errors.calculationInputs.investmentCost.message}
                    </small>
                  ) : null}
                </label>
              </>
            ) : null}

            {metricType === 'grossMargin' ? (
              <>
                <label className={styles.field}>
                  <span>Revenue <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    aria-required="true"
                    aria-invalid={Boolean(errors.calculationInputs?.revenue)}
                    {...register(
                      'calculationInputs.revenue',
                      numberValidation('Revenue', { greaterThanZero: true }),
                    )}
                  />
                  {errors.calculationInputs?.revenue ? (
                    <small className={styles.error}>{errors.calculationInputs.revenue.message}</small>
                  ) : null}
                </label>

                <label className={styles.field}>
                  <span>Direct costs <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    aria-required="true"
                    aria-invalid={Boolean(errors.calculationInputs?.directCosts)}
                    {...register(
                      'calculationInputs.directCosts',
                      numberValidation('Direct costs'),
                    )}
                  />
                  {errors.calculationInputs?.directCosts ? (
                    <small className={styles.error}>
                      {errors.calculationInputs.directCosts.message}
                    </small>
                  ) : null}
                </label>
              </>
            ) : null}

            {metricType === 'profitMargin' ? (
              <>
                <label className={styles.field}>
                  <span>Profit <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    aria-required="true"
                    aria-invalid={Boolean(errors.calculationInputs?.profit)}
                    {...register(
                      'calculationInputs.profit',
                      numberValidation('Profit', { allowNegative: true }),
                    )}
                  />
                  {errors.calculationInputs?.profit ? (
                    <small className={styles.error}>{errors.calculationInputs.profit.message}</small>
                  ) : null}
                </label>

                <label className={styles.field}>
                  <span>Revenue <span className={styles.requiredMark} aria-hidden="true">*</span></span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    aria-required="true"
                    aria-invalid={Boolean(errors.calculationInputs?.revenue)}
                    {...register(
                      'calculationInputs.revenue',
                      numberValidation('Revenue', { greaterThanZero: true }),
                    )}
                  />
                  {errors.calculationInputs?.revenue ? (
                    <small className={styles.error}>{errors.calculationInputs.revenue.message}</small>
                  ) : null}
                </label>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.metricSection}>
        <div className={styles.sectionHeader}>
          <span>{isManual ? 'Measurement' : 'Target & baseline'}</span>
          <p>
            {isManual
              ? 'Baseline, current state, target, and target date drive the deterministic status.'
              : financialTargetCopy?.sectionDescription}
          </p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{isManual ? 'Baseline' : financialTargetCopy?.baselineLabel} <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <input
              type={isManual ? valueInputType : 'number'}
              step={isManual ? valueStep : 'any'}
              inputMode={isManual && unit === 'date' ? undefined : 'decimal'}
              min={isManual && unit === 'percentage' ? '0' : undefined}
              max={isManual && unit === 'percentage' ? '100' : undefined}
              aria-required="true"
              aria-invalid={Boolean(errors.baseline)}
              {...register(
                'baseline',
                isManual
                  ? measurementValidation('Baseline', unit)
                  : numberValidation('Baseline', { allowNegative: true }),
              )}
            />
            {!isManual ? <small className={styles.hint}>{financialTargetCopy?.baselineHint}</small> : null}
            {errors.baseline ? (
              <small className={styles.error}>{errors.baseline.message}</small>
            ) : null}
          </label>

          {isManual ? (
            <label className={styles.field}>
              <span>Current value <span className={styles.requiredMark} aria-hidden="true">*</span></span>
              <input
                type={valueInputType}
                step={valueStep}
                inputMode={unit === 'date' ? undefined : 'decimal'}
                min={unit === 'percentage' ? '0' : undefined}
                max={unit === 'percentage' ? '100' : undefined}
                aria-required="true"
                aria-invalid={Boolean(errors.currentValue)}
                {...register('currentValue', measurementValidation('Current value', unit))}
              />
              {errors.currentValue ? (
                <small className={styles.error}>{errors.currentValue.message}</small>
              ) : null}
            </label>
          ) : null}

          <label className={styles.field}>
            <span>{isManual ? 'Target' : financialTargetCopy?.targetLabel} <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <input
              type={isManual ? valueInputType : 'number'}
              step={isManual ? valueStep : 'any'}
              inputMode={isManual && unit === 'date' ? undefined : 'decimal'}
              min={isManual && unit === 'percentage' ? '0' : undefined}
              max={isManual && unit === 'percentage' ? '100' : undefined}
              aria-required="true"
              aria-invalid={Boolean(errors.target)}
              {...register(
                'target',
                isManual
                  ? measurementValidation('Target', unit)
                  : numberValidation('Target', { allowNegative: true }),
              )}
            />
            {!isManual ? <small className={styles.hint}>{financialTargetCopy?.targetHint}</small> : null}
            {errors.target ? <small className={styles.error}>{errors.target.message}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Target date <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <input
              type="date"
              aria-required="true"
              aria-invalid={Boolean(errors.targetDate)}
              {...register('targetDate', { required: 'Target date is required.' })}
            />
            {errors.targetDate ? (
              <small className={styles.error}>{errors.targetDate.message}</small>
            ) : null}
          </label>
        </div>
      </div>

      {submitError ? (
        <div className={styles.submitError} role="alert">
          <strong>Success criterion could not be saved.</strong>
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
        message="Your unsaved changes will be discarded before you return to Success Criteria."
        confirmLabel="Discard changes"
        onCancel={() => setPendingDiscard(null)}
        onConfirm={confirmCancel}
      />
    </form>
  )
}
