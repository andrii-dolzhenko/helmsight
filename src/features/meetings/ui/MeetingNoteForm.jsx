import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import {
  MEETING_NOTE_LIMITS,
  MEETING_NOTE_MIN_TEXT_LENGTH,
} from '../lib/meetingNotes.js'
import styles from './MeetingNoteForm.module.css'

const EMPTY = {
  title: '',
  meetingDate: '',
  owner: '',
  participants: [{ value: '' }],
  notes: '',
  decisions: [{ value: '' }],
  followUps: [{ value: '' }],
}

function toRows(values) {
  return Array.isArray(values) && values.length
    ? values.map((value) => ({ value }))
    : [{ value: '' }]
}

function valuesFor(meeting) {
  if (!meeting) return EMPTY
  return {
    title: meeting.title ?? '',
    meetingDate: meeting.meetingDate ?? '',
    owner: meeting.owner ?? '',
    participants: toRows(meeting.participants),
    notes: meeting.notes ?? '',
    decisions: toRows(meeting.decisions),
    followUps: toRows(meeting.followUps),
  }
}

function normalizeDraft(values) {
  if (!values || typeof values !== 'object') return null
  return {
    ...EMPTY,
    ...values,
    participants: Array.isArray(values.participants) && values.participants.length ? values.participants : [{ value: '' }],
    decisions: Array.isArray(values.decisions) && values.decisions.length ? values.decisions : [{ value: '' }],
    followUps: Array.isArray(values.followUps) && values.followUps.length ? values.followUps : [{ value: '' }],
  }
}

function readDraft(key) {
  try { return key ? formDraftService.read(key) : null } catch { return null }
}

function trimRequired(value, label, maxLength) {
  const text = String(value ?? '').trim()
  if (!text) return `${label} is required.`
  if (text.length < MEETING_NOTE_MIN_TEXT_LENGTH) return `Use at least ${MEETING_NOTE_MIN_TEXT_LENGTH} characters.`
  if (text.length > maxLength) return `Use ${maxLength.toLocaleString('en-US')} characters or fewer.`
  return true
}

function validateOptionalItem(value, maxLength) {
  const text = String(value ?? '').trim()
  if (!text) return true
  if (text.length < MEETING_NOTE_MIN_TEXT_LENGTH) return `Use at least ${MEETING_NOTE_MIN_TEXT_LENGTH} characters.`
  if (text.length > maxLength) return `Use ${maxLength} characters or fewer.`
  return true
}

function ListEditor({
  title,
  description,
  name,
  fields,
  append,
  remove,
  register,
  errors,
  maxLength,
  addLabel,
  placeholder,
  multiline = false,
}) {
  return (
    <section className={styles.listSection}>
      <div className={styles.listHeader}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button
          className={styles.secondaryButton} data-ui-button="secondary"
          type="button"
          disabled={fields.length >= MEETING_NOTE_LIMITS.listItems}
          onClick={() => append({ value: '' })}
        >
          <span aria-hidden="true">+</span> {addLabel}
        </button>
      </div>
      <div className={styles.listRows}>
        {fields.map((field, index) => {
          const error = errors?.[index]?.value
          const common = register(`${name}.${index}.value`, {
            validate: (value) => validateOptionalItem(value, maxLength),
          })
          return (
            <div className={styles.listRow} key={field.id}>
              <label className={styles.listField}>
                <span className={styles.srOnly}>{title} item {index + 1}</span>
                {multiline ? (
                  <textarea
                    rows="2"
                    placeholder={placeholder}
                    aria-invalid={Boolean(error)}
                    {...common}
                  />
                ) : (
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={placeholder}
                    aria-invalid={Boolean(error)}
                    {...common}
                  />
                )}
                {error ? <small className={styles.error}>{error.message}</small> : null}
              </label>
              <button
                className={styles.removeButton}
                type="button"
                aria-label={`Remove ${title.toLowerCase()} item ${index + 1}`}
                title="Remove item"
                onClick={() => {
                  if (fields.length === 1) return
                  remove(index)
                }}
                disabled={fields.length === 1}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function MeetingNoteForm({
  meeting,
  draftKey,
  submitLabel,
  cancelTo,
  submitError,
  defaultOwner = '',
  onSubmit,
}) {
  const baseValues = useMemo(() => {
    const values = valuesFor(meeting)
    return meeting || !defaultOwner ? values : { ...values, owner: defaultOwner }
  }, [defaultOwner, meeting])
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const restoredValues = useMemo(() => normalizeDraft(initialDraft?.values), [initialDraft])
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredValues))
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: restoredValues ?? baseValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const participants = useFieldArray({ control, name: 'participants' })
  const decisions = useFieldArray({ control, name: 'decisions' })
  const followUps = useFieldArray({ control, name: 'followUps' })
  const watched = useWatch({ control })

  useEffect(() => {
    if (!draftKey || !isDirty) return undefined
    const timeoutId = window.setTimeout(() => formDraftService.write(draftKey, watched), 450)
    return () => window.clearTimeout(timeoutId)
  }, [draftKey, isDirty, watched])

  useEffect(() => {
    if (!draftKey) return undefined
    const beforeUnload = () => { if (isDirty) formDraftService.write(draftKey, getValues()) }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
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

  const submit = handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      meetingDate: values.meetingDate,
      owner: values.owner,
      participants: values.participants.map((item) => item.value),
      notes: values.notes,
      decisions: values.decisions.map((item) => item.value),
      followUps: values.followUps.map((item) => item.value),
    }
    try {
      const result = await onSubmit(payload)
      if (result !== false) clearDraft()
    } catch {
      // Redux error remains visible below the form.
    }
  })

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {draftRestored ? (
        <div className={styles.draftNotice} role="status">
          <div>
            <strong>Draft restored</strong>
            <span>Your unsaved Meeting Note was recovered from this browser.</span>
          </div>
          <button type="button" onClick={() => setPendingDiscard('draft')}>Discard draft</button>
        </div>
      ) : null}

      <section className={styles.detailsCard}>
        <div className={styles.sectionHeader}>
          <span>Meeting record</span>
          <p>Keep the core context concise; decisions and follow-ups are captured separately below.</p>
        </div>
        <div className={styles.detailsGrid}>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Title <b aria-hidden="true">*</b></span>
            <input
              autoComplete="off"
              aria-required="true"
              aria-invalid={Boolean(errors.title)}
              {...register('title', {
                validate: (value) => trimRequired(value, 'Title', MEETING_NOTE_LIMITS.title),
              })}
            />
            {errors.title ? <small className={styles.error}>{errors.title.message}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Meeting date <b aria-hidden="true">*</b></span>
            <input
              type="date"
              aria-required="true"
              aria-invalid={Boolean(errors.meetingDate)}
              {...register('meetingDate', { required: 'Meeting date is required.' })}
            />
            {errors.meetingDate ? <small className={styles.error}>{errors.meetingDate.message}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Owner <b aria-hidden="true">*</b></span>
            <input
              autoComplete="off"
              aria-required="true"
              aria-invalid={Boolean(errors.owner)}
              {...register('owner', {
                validate: (value) => trimRequired(value, 'Owner', MEETING_NOTE_LIMITS.owner),
              })}
            />
            {errors.owner ? <small className={styles.error}>{errors.owner.message}</small> : <small className={styles.hint}>Person responsible for maintaining this record.</small>}
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Notes <b aria-hidden="true">*</b></span>
            <textarea
              className={styles.notesArea}
              rows="8"
              aria-required="true"
              aria-invalid={Boolean(errors.notes)}
              placeholder="Capture the key discussion, context, and relevant facts from the meeting."
              {...register('notes', {
                validate: (value) => trimRequired(value, 'Notes', MEETING_NOTE_LIMITS.notes),
              })}
            />
            {errors.notes ? <small className={styles.error}>{errors.notes.message}</small> : <small className={styles.hint}>Up to {MEETING_NOTE_LIMITS.notes.toLocaleString('en-US')} characters.</small>}
          </label>
        </div>
      </section>

      <ListEditor
        title="Participants"
        description="Free-text people names for P0. Leave the row blank if participants are not required for this note."
        name="participants"
        fields={participants.fields}
        append={participants.append}
        remove={participants.remove}
        register={register}
        errors={errors.participants}
        maxLength={MEETING_NOTE_LIMITS.participant}
        addLabel="Add participant"
        placeholder="e.g. Maya Chen"
      />

      <ListEditor
        title="Decisions"
        description="Record explicit decisions that should remain visible after the meeting."
        name="decisions"
        fields={decisions.fields}
        append={decisions.append}
        remove={decisions.remove}
        register={register}
        errors={errors.decisions}
        maxLength={MEETING_NOTE_LIMITS.decision}
        addLabel="Add decision"
        placeholder="Decision made during the meeting"
        multiline
      />

      <ListEditor
        title="Follow-ups"
        description="Document meeting commitments without turning this note into a task board. No automatic Management Action is created in P0."
        name="followUps"
        fields={followUps.fields}
        append={followUps.append}
        remove={followUps.remove}
        register={register}
        errors={errors.followUps}
        maxLength={MEETING_NOTE_LIMITS.followUp}
        addLabel="Add follow-up"
        placeholder="Owner — follow-up and target timing"
        multiline
      />

      {submitError ? (
        <div className={styles.submitError} role="alert">
          <strong>Meeting Note could not be saved.</strong>
          <span>{submitError}</span>
        </div>
      ) : null}

      <footer className={styles.formFooter}>
        <p className={styles.requiredNote}><b aria-hidden="true">*</b> Required fields</p>
        <div className={styles.actions}>
          <Link className={styles.secondaryButton} data-ui-button="secondary" to={cancelTo} onClick={handleCancel}>Cancel</Link>
          <button className={styles.primaryButton} data-ui-button="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={pendingDiscard !== null}
        title={pendingDiscard === 'draft' ? 'Discard recovered draft?' : 'Leave without saving?'}
        message={pendingDiscard === 'draft'
          ? 'The recovered Meeting Note will be removed and the form will return to its saved/default state.'
          : 'Your unsaved Meeting Note changes will be discarded.'}
        confirmLabel={pendingDiscard === 'draft' ? 'Discard draft' : 'Discard changes'}
        onConfirm={pendingDiscard === 'draft' ? discardDraft : confirmCancel}
        onCancel={() => setPendingDiscard(null)}
      />
    </form>
  )
}
