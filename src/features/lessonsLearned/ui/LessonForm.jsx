import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { formDraftService } from '../../../shared/services/drafts/formDraftService.js'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { LESSON_CATEGORIES } from '../api/lessonsLearnedService.js'
import styles from './LessonForm.module.css'

const EMPTY = { title: '', category: 'planning', situation: '', lesson: '', recommendation: '' }
const FIELD_NAMES = Object.keys(EMPTY)

function formValues(source) {
  return Object.fromEntries(FIELD_NAMES.map((field) => [field,
    typeof source?.[field] === 'string' ? source[field] : EMPTY[field],
  ]))
}

function readDraft(draftKey) {
  try { return formDraftService.read(draftKey)?.values ?? null } catch { return null }
}

function validateRequiredText(value, label) {
  const length = typeof value === 'string' ? value.trim().length : 0
  if (length === 0) return `${label} is required.`
  return length >= 2 || 'Use at least 2 characters.'
}

export function LessonForm({ lesson, draftKey, cancelTo, submitLabel, submitError, onSubmit, onSaved }) {
  const navigate = useNavigate()
  const baseValues = useMemo(() => formValues(lesson), [lesson])
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey])
  const restoredValues = useMemo(() => initialDraft ? formValues(initialDraft) : null, [initialDraft])
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredValues))
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [draftError, setDraftError] = useState('')

  const { register, handleSubmit, reset, getValues, control, formState: { errors, isDirty, isSubmitting } } = useForm({
    defaultValues: restoredValues ?? baseValues, mode: 'onTouched', reValidateMode: 'onChange',
  })
  const watchedValues = useWatch({ control })

  useEffect(() => {
    if (!isDirty) return undefined
    const timeoutId = window.setTimeout(() => {
      try { formDraftService.write(draftKey, watchedValues) } catch (error) { setDraftError(error.message) }
    }, 400)
    return () => window.clearTimeout(timeoutId)
  }, [draftKey, isDirty, watchedValues])

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!isDirty) return
      try { formDraftService.write(draftKey, getValues()) } catch { /* Keep page close possible. */ }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [draftKey, getValues, isDirty])

  const clearDraft = () => {
    try { formDraftService.remove(draftKey); setDraftError(''); setDraftRestored(false); return true }
    catch (error) { setDraftError(error.message); return false }
  }
  const onCancel = (event) => {
    if (!isDirty && !draftRestored) return
    event.preventDefault()
    setConfirmLeave(true)
  }
  const discard = () => {
    if (!clearDraft()) return
    reset(baseValues)
    setConfirmDiscard(false)
  }
  const leave = () => {
    if (!clearDraft()) return
    setConfirmLeave(false)
    navigate(cancelTo)
  }
  const submit = handleSubmit(async (values) => {
    const saved = await onSubmit(values)
    if (!saved || !clearDraft()) return
    onSaved(saved)
  })

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {draftRestored ? <div className={styles.draftNotice} role="status"><div><strong>Draft restored</strong><p>Unsaved lesson changes from this browser have been recovered.</p></div><button type="button" onClick={() => setConfirmDiscard(true)}>Discard draft</button></div> : null}
      {draftError ? <p className={styles.errorNotice} role="alert">Draft could not be saved or cleared: {draftError}</p> : null}
      <div className={styles.sectionHeader}><span>Learning record</span><h3>From experience to action</h3><p>Describe one situation and the practical recommendation it produced.</p></div>
      <div className={styles.fields}>
        <label className={styles.field}><span>Title <span aria-hidden="true" className={styles.required}>*</span></span><input autoComplete="off" aria-required="true" aria-invalid={Boolean(errors.title)} {...register('title', { required: 'Title is required.', validate: (value) => validateRequiredText(value, 'Title'), maxLength: { value: 140, message: 'Use 140 characters or fewer.' } })} />{errors.title ? <small className={styles.validation}>{errors.title.message}</small> : null}</label>
        <label className={styles.field}><span>Category <span aria-hidden="true" className={styles.required}>*</span></span><select aria-required="true" {...register('category', { validate: (value) => LESSON_CATEGORIES.some((item) => item.value === value) || 'Choose a valid category.' })}>{LESSON_CATEGORIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>{errors.category ? <small className={styles.validation}>{errors.category.message}</small> : null}</label>
        {[
          { name: 'situation', label: 'Situation', help: 'What happened? Include the relevant delivery context.' },
          { name: 'lesson', label: 'Lesson', help: 'What did the team learn from this situation?' },
          { name: 'recommendation', label: 'Recommendation', help: 'What should be repeated or changed next time?' },
        ].map((field) => <label className={styles.field} key={field.name}><span>{field.label} <span aria-hidden="true" className={styles.required}>*</span></span><textarea rows="5" aria-required="true" aria-invalid={Boolean(errors[field.name])} {...register(field.name, { required: `${field.label} is required.`, validate: (value) => validateRequiredText(value, field.label), maxLength: { value: 5000, message: 'Use 5,000 characters or fewer.' } })}/>{errors[field.name] ? <small className={styles.validation}>{errors[field.name].message}</small> : <small className={styles.help}>{field.help}</small>}</label>)}
      </div>
      {submitError ? <p className={styles.errorNotice} role="alert">{submitError}</p> : null}
      <footer className={styles.footer}><span><span className={styles.required}>*</span> Required fields</span><div className={styles.actions}><Link to={cancelTo} onClick={onCancel} className={styles.secondaryButton} data-ui-button="secondary">Cancel</Link><button type="submit" className={styles.primaryButton} data-ui-button="primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : submitLabel}</button></div></footer>
      <ConfirmDialog isOpen={confirmLeave} title="Leave without saving?" message="Your unsaved lesson changes will be discarded." confirmLabel="Discard changes" onConfirm={leave} onCancel={() => setConfirmLeave(false)} />
      <ConfirmDialog isOpen={confirmDiscard} title="Discard recovered draft?" message="Remove the saved browser draft and restore the original form values?" confirmLabel="Discard draft" onConfirm={discard} onCancel={() => setConfirmDiscard(false)} />
    </form>
  )
}
