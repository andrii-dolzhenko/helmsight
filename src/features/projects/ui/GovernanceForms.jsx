import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import {
  COMMUNICATION_CHANNEL_OPTIONS,
  COMMUNICATION_FREQUENCY_OPTIONS,
  GOVERNANCE_ENGAGEMENT_OPTIONS,
  GOVERNANCE_LEVEL_OPTIONS,
  getStakeholderManagementStrategy,
} from '../lib/governance.js'
import styles from './GovernanceForms.module.css'

const LEVEL_VALUES = GOVERNANCE_LEVEL_OPTIONS.map((option) => option.value)
const ENGAGEMENT_VALUES = GOVERNANCE_ENGAGEMENT_OPTIONS.map((option) => option.value)

function toTextarea(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function toList(value) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function requiredText(label, { min = 2, max = 160 } = {}) {
  return {
    validate: (value) => {
      const normalized = String(value ?? '').trim()
      if (!normalized) return `${label} is required.`
      if (normalized.length < min) return `Use at least ${min} characters.`
      if (normalized.length > max) return `Use ${max.toLocaleString('en-US')} characters or fewer.`
      return true
    },
  }
}

function optionalText(max) {
  return {
    validate: (value) =>
      String(value ?? '').trim().length <= max ||
      `Use ${max.toLocaleString('en-US')} characters or fewer.`,
  }
}

function requiredList(label, max = 1600) {
  return {
    validate: (value) => {
      const items = toList(value)
      if (!items.length) return `Add at least one ${label.toLowerCase()}.`
      if (String(value ?? '').length > max) {
        return `Use ${max.toLocaleString('en-US')} characters or fewer.`
      }
      return true
    },
  }
}

function requiredChoice(label, allowed) {
  return {
    validate: (value) => allowed.includes(value) || `Select a valid ${label.toLowerCase()}.`,
  }
}

function RequiredMark() {
  return <span className={styles.requiredMark} aria-hidden="true">*</span>
}

function FieldError({ error }) {
  return error ? <small className={styles.error}>{error.message}</small> : null
}

function FormActions({ dirty, saving, submitting, submitLabel, onCancel }) {
  const busy = saving || submitting

  return (
    <div className={styles.actions}>
      <button className={styles.secondaryButton} data-ui-button="secondary" type="button" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      <button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={busy || !dirty}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}

export function CharterForm({ charter, saving, onCancel, onSave }) {
  const defaultValues = {
    purpose: charter.purpose,
    primaryObjective: charter.primaryObjective,
    sponsor: charter.sponsor,
    projectManager: charter.projectManager,
    objectives: toTextarea(charter.objectives),
    inScope: toTextarea(charter.inScope),
    outOfScope: toTextarea(charter.outOfScope),
    deliverables: toTextarea(charter.deliverables),
    benefits: toTextarea(charter.benefits),
    constraints: toTextarea(charter.constraints),
    assumptions: toTextarea(charter.assumptions),
    acceptanceCriteria: toTextarea(charter.acceptanceCriteria),
  }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    reset(defaultValues)
  }, [charter, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = handleSubmit((values) => {
    if (!isDirty) return undefined

    return onSave({
      purpose: values.purpose.trim(),
      primaryObjective: values.primaryObjective.trim(),
      sponsor: values.sponsor.trim(),
      projectManager: values.projectManager.trim(),
      objectives: toList(values.objectives),
      inScope: toList(values.inScope),
      outOfScope: toList(values.outOfScope),
      deliverables: toList(values.deliverables),
      benefits: toList(values.benefits),
      constraints: toList(values.constraints),
      assumptions: toList(values.assumptions),
      acceptanceCriteria: toList(values.acceptanceCriteria),
    })
  })

  return (
    <form className={styles.form} onSubmit={submit} autoComplete="off" noValidate>
      <div className={styles.twoColumnGrid}>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Project purpose / business need <RequiredMark /></span>
          <textarea
            rows="4"
            aria-required="true"
            aria-invalid={Boolean(errors.purpose)}
            {...register('purpose', requiredText('Project purpose', { min: 10, max: 700 }))}
          />
          <FieldError error={errors.purpose} />
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Primary objective / expected outcome <RequiredMark /></span>
          <textarea
            rows="3"
            aria-required="true"
            aria-invalid={Boolean(errors.primaryObjective)}
            {...register(
              'primaryObjective',
              requiredText('Primary objective', { min: 10, max: 600 }),
            )}
          />
          <FieldError error={errors.primaryObjective} />
        </label>

        <label className={styles.field}>
          <span>Project sponsor <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.sponsor)}
            {...register('sponsor', requiredText('Project sponsor', { min: 2, max: 100 }))}
          />
          <FieldError error={errors.sponsor} />
        </label>

        <label className={styles.field}>
          <span>Project manager / owner <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.projectManager)}
            {...register(
              'projectManager',
              requiredText('Project manager', { min: 2, max: 100 }),
            )}
          />
          <FieldError error={errors.projectManager} />
        </label>

        <label className={styles.field}>
          <span>Objectives <RequiredMark /></span>
          <textarea
            rows="5"
            aria-required="true"
            aria-invalid={Boolean(errors.objectives)}
            {...register('objectives', requiredList('objective'))}
          />
          <small className={styles.hint}>One objective per line.</small>
          <FieldError error={errors.objectives} />
        </label>

        <label className={styles.field}>
          <span>In scope <RequiredMark /></span>
          <textarea
            rows="5"
            aria-required="true"
            aria-invalid={Boolean(errors.inScope)}
            {...register('inScope', requiredList('in-scope item'))}
          />
          <small className={styles.hint}>One scope item per line.</small>
          <FieldError error={errors.inScope} />
        </label>

        <label className={styles.field}>
          <span>Key deliverables <RequiredMark /></span>
          <textarea
            rows="5"
            aria-required="true"
            aria-invalid={Boolean(errors.deliverables)}
            {...register('deliverables', requiredList('deliverable'))}
          />
          <small className={styles.hint}>One deliverable per line.</small>
          <FieldError error={errors.deliverables} />
        </label>

        <label className={styles.field}>
          <span>Out of scope</span>
          <textarea rows="5" {...register('outOfScope', optionalText(1600))} />
          <small className={styles.hint}>One item per line.</small>
          <FieldError error={errors.outOfScope} />
        </label>

        <label className={styles.field}>
          <span>Expected benefits</span>
          <textarea rows="5" {...register('benefits', optionalText(1600))} />
          <small className={styles.hint}>One benefit per line.</small>
          <FieldError error={errors.benefits} />
        </label>

        <label className={styles.field}>
          <span>Key constraints</span>
          <textarea rows="5" {...register('constraints', optionalText(1600))} />
          <small className={styles.hint}>One constraint per line.</small>
          <FieldError error={errors.constraints} />
        </label>

        <label className={styles.field}>
          <span>Key assumptions</span>
          <textarea rows="5" {...register('assumptions', optionalText(1600))} />
          <small className={styles.hint}>One assumption per line.</small>
          <FieldError error={errors.assumptions} />
        </label>

        <label className={styles.field}>
          <span>Acceptance / approval criteria</span>
          <textarea rows="5" {...register('acceptanceCriteria', optionalText(1600))} />
          <small className={styles.hint}>One acceptance condition per line.</small>
          <FieldError error={errors.acceptanceCriteria} />
        </label>
      </div>

      <FormActions
        dirty={isDirty}
        saving={saving}
        submitting={isSubmitting}
        submitLabel="Save charter"
        onCancel={onCancel}
      />
    </form>
  )
}

const EMPTY_STAKEHOLDER = {
  name: '',
  role: '',
  organization: '',
  email: '',
  timeZone: '',
  responsibility: '',
  expectations: '',
  influence: 'medium',
  interest: 'medium',
  engagement: 'neutral',
  communicationNotes: '',
}

export function StakeholderForm({ stakeholder, saving, onCancel, onSave }) {
  const values = { ...EMPTY_STAKEHOLDER, ...stakeholder }
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: values,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    reset({ ...EMPTY_STAKEHOLDER, ...stakeholder })
  }, [reset, stakeholder])

  const influence = useWatch({ control, name: 'influence' })
  const interest = useWatch({ control, name: 'interest' })
  const strategy = getStakeholderManagementStrategy(influence, interest)

  const submit = handleSubmit((formValues) => {
    if (!isDirty) return undefined

    return onSave({
      ...formValues,
      name: formValues.name.trim(),
      role: formValues.role.trim(),
      organization: formValues.organization.trim(),
      email: formValues.email.trim(),
      timeZone: formValues.timeZone.trim(),
      responsibility: formValues.responsibility.trim(),
      expectations: formValues.expectations.trim(),
      communicationNotes: formValues.communicationNotes.trim(),
    })
  })

  return (
    <form className={styles.form} onSubmit={submit} autoComplete="off" noValidate>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          <span>Name <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.name)}
            {...register('name', requiredText('Stakeholder name', { min: 2, max: 100 }))}
          />
          <FieldError error={errors.name} />
        </label>

        <label className={styles.field}>
          <span>Role / title <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.role)}
            {...register('role', requiredText('Role or title', { min: 2, max: 120 }))}
          />
          <FieldError error={errors.role} />
        </label>

        <label className={styles.field}>
          <span>Organization</span>
          <input type="text" autoComplete="off" {...register('organization', optionalText(140))} />
          <FieldError error={errors.organization} />
        </label>

        <label className={styles.field}>
          <span>Contact email</span>
          <input
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            {...register('email', {
              validate: (value) => {
                const normalized = String(value ?? '').trim()
                if (!normalized) return true
                if (normalized.length > 160) return 'Use 160 characters or fewer.'
                return /^\S+@\S+\.\S+$/.test(normalized) || 'Enter a valid email address.'
              },
            })}
          />
          <FieldError error={errors.email} />
        </label>

        <label className={styles.field}>
          <span>Time zone</span>
          <input
            type="text"
            autoComplete="off"
            placeholder="Europe/Kyiv or GMT+3"
            {...register('timeZone', optionalText(80))}
          />
          <FieldError error={errors.timeZone} />
        </label>

        <div className={styles.strategyPreview} aria-live="polite">
          <span>Management strategy</span>
          <strong>{strategy}</strong>
          <small>Derived from influence × interest.</small>
        </div>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Responsibility</span>
          <textarea rows="3" {...register('responsibility', optionalText(500))} />
          <FieldError error={errors.responsibility} />
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Main expectations</span>
          <textarea rows="3" {...register('expectations', optionalText(500))} />
          <FieldError error={errors.expectations} />
        </label>

        <label className={styles.field}>
          <span>Influence <RequiredMark /></span>
          <select
            aria-required="true"
            aria-invalid={Boolean(errors.influence)}
            {...register('influence', requiredChoice('Influence', LEVEL_VALUES))}
          >
            {GOVERNANCE_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError error={errors.influence} />
        </label>

        <label className={styles.field}>
          <span>Interest <RequiredMark /></span>
          <select
            aria-required="true"
            aria-invalid={Boolean(errors.interest)}
            {...register('interest', requiredChoice('Interest', LEVEL_VALUES))}
          >
            {GOVERNANCE_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError error={errors.interest} />
        </label>

        <label className={styles.field}>
          <span>Current engagement <RequiredMark /></span>
          <select
            aria-required="true"
            aria-invalid={Boolean(errors.engagement)}
            {...register('engagement', requiredChoice('Engagement', ENGAGEMENT_VALUES))}
          >
            {GOVERNANCE_ENGAGEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError error={errors.engagement} />
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Communication notes</span>
          <textarea rows="3" {...register('communicationNotes', optionalText(500))} />
          <FieldError error={errors.communicationNotes} />
        </label>
      </div>

      <FormActions
        dirty={isDirty}
        saving={saving}
        submitting={isSubmitting}
        submitLabel={stakeholder?.id ? 'Save stakeholder' : 'Add stakeholder'}
        onCancel={onCancel}
      />
    </form>
  )
}

const EMPTY_COMMUNICATION = {
  audience: '',
  topic: '',
  purpose: '',
  deliverables: [],
  channel: 'Meeting',
  frequency: 'Weekly',
  timingTrigger: '',
  owner: '',
}

export function CommunicationForm({ communication, saving, onCancel, onSave }) {
  const values = {
    ...EMPTY_COMMUNICATION,
    ...communication,
    deliverables: toTextarea(communication?.deliverables),
  }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: values,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    reset({
      ...EMPTY_COMMUNICATION,
      ...communication,
      deliverables: toTextarea(communication?.deliverables),
    })
  }, [communication, reset])

  const channelOptions = COMMUNICATION_CHANNEL_OPTIONS.includes(values.channel)
    ? COMMUNICATION_CHANNEL_OPTIONS
    : Object.freeze([values.channel, ...COMMUNICATION_CHANNEL_OPTIONS])

  const submit = handleSubmit((formValues) => {
    if (!isDirty) return undefined

    return onSave({
      ...formValues,
      audience: formValues.audience.trim(),
      topic: formValues.topic.trim(),
      purpose: formValues.purpose.trim(),
      deliverables: toList(formValues.deliverables),
      timingTrigger: formValues.timingTrigger.trim(),
      owner: formValues.owner.trim(),
    })
  })

  return (
    <form className={styles.form} onSubmit={submit} autoComplete="off" noValidate>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          <span>Communication / topic <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.topic)}
            {...register('topic', requiredText('Communication topic', { min: 2, max: 140 }))}
          />
          <FieldError error={errors.topic} />
        </label>

        <label className={styles.field}>
          <span>Audience / stakeholder <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.audience)}
            {...register('audience', requiredText('Audience', { min: 2, max: 160 }))}
          />
          <FieldError error={errors.audience} />
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Purpose / description</span>
          <textarea rows="3" {...register('purpose', optionalText(600))} />
          <FieldError error={errors.purpose} />
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Deliverables / artifacts</span>
          <textarea rows="3" {...register('deliverables', optionalText(1000))} />
          <small className={styles.hint}>Agenda, minutes, status report, follow-up — one per line.</small>
          <FieldError error={errors.deliverables} />
        </label>

        <label className={styles.field}>
          <span>Channel <RequiredMark /></span>
          <select
            aria-required="true"
            aria-invalid={Boolean(errors.channel)}
            {...register('channel', requiredChoice('Channel', channelOptions))}
          >
            {channelOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <FieldError error={errors.channel} />
        </label>

        <label className={styles.field}>
          <span>Frequency <RequiredMark /></span>
          <select
            aria-required="true"
            aria-invalid={Boolean(errors.frequency)}
            {...register('frequency', requiredChoice('Frequency', COMMUNICATION_FREQUENCY_OPTIONS))}
          >
            {COMMUNICATION_FREQUENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <FieldError error={errors.frequency} />
        </label>

        <label className={styles.field}>
          <span>Timing / trigger</span>
          <input
            type="text"
            autoComplete="off"
            placeholder="Tuesday 17:00, phase end, incident…"
            {...register('timingTrigger', optionalText(140))}
          />
          <FieldError error={errors.timingTrigger} />
        </label>

        <label className={styles.field}>
          <span>Owner <RequiredMark /></span>
          <input
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.owner)}
            {...register('owner', requiredText('Communication owner', { min: 2, max: 100 }))}
          />
          <FieldError error={errors.owner} />
        </label>
      </div>

      <FormActions
        dirty={isDirty}
        saving={saving}
        submitting={isSubmitting}
        submitLabel={communication?.id ? 'Save communication' : 'Add communication'}
        onCancel={onCancel}
      />
    </form>
  )
}
