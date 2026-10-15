import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { decisionLabService } from '../api/decisionLabService.js'
import { getDailyScenarios, getRecommendedCount } from '../lib/dailyDecisionLab.js'
import { BrainIcon } from './BrainIcon.jsx'
import { CloseIcon } from '../../../shared/ui/CloseIcon/CloseIcon.jsx'
import styles from './DecisionLabModal.module.css'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function DecisionLabModal({ onClose, returnFocusRef }) {
  // Freeze the batch for the open dialog; a new local day is picked on next open.
  const [openedAt] = useState(() => new Date())
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const [selected, setSelected] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(() => {
    try { return decisionLabService.getToday(openedAt) }
    catch { return null }
  })
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const close = useCallback(() => onCloseRef.current(), [])

  useEffect(() => {
    const lastFocused = returnFocusRef.current ?? document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const elements = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      if (!elements.length) { event.preventDefault(); return }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      lastFocused?.focus?.()
    }
  }, [close, returnFocusRef])

  const dayKey = session?.dayKey
  const scenarios = dayKey ? getDailyScenarios(dayKey) : []
  const answered = session?.answers.length ?? 0
  const complete = session?.phase === 'complete'
  const feedback = session?.phase === 'feedback'
  const activeScenario = feedback ? scenarios[answered - 1] : scenarios[answered]
  const activeAnswer = feedback ? session.answers[answered - 1] : null
  const chosenOption = activeScenario?.options.find((option) => option.id === activeAnswer?.optionId)
  const aligned = session ? getRecommendedCount(session, scenarios) : 0

  const submit = () => {
    try {
      const next = decisionLabService.submit(selected, openedAt)
      setSession(next)
      setSelected(null)
      setError('')
    } catch (cause) { setError(cause.message) }
  }
  const advance = () => {
    try {
      setSession(decisionLabService.advance(openedAt))
      setError('')
    } catch (cause) { setError(cause.message) }
  }

  return createPortal(
    <div className={styles.backdrop}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className={styles.top}>
          <div className={styles.heading}>
            <span className={styles.iconWrap}><BrainIcon className={styles.brain} /></span>
            <div>
              <span className={styles.eyebrow}>Daily decision practice</span>
              <h2 id={titleId}>Decision Lab</h2>
              <p id={descriptionId}>Explore scenarios. Understand impact. Make confident decisions.</p>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close Decision Lab" onClick={close} title="Close (Esc)"><CloseIcon /></button>
        </div>

        {(error || !session) ? <p className={styles.error} role="alert">{error || 'Unable to read saved Decision Lab progress. Your data was not changed.'}</p> : null}

        {session && !complete ? (
          <>
            <div className={styles.progressHeader}>
              <span>Scenario {feedback ? answered : answered + 1} of {scenarios.length}</span>
              <span>{Math.round((answered / scenarios.length) * 100)}% answered</span>
            </div>
            <progress className={styles.progress} max={scenarios.length} value={answered} aria-label="Daily session progress">{answered} of {scenarios.length}</progress>
            <div className={styles.scenario}>
              <span className={styles.category}>{activeScenario.category}</span>
              <h3>{activeScenario.title}</h3>
              <p>{activeScenario.context}</p>
            </div>
            <h4 className={styles.question}>{activeScenario.question}</h4>
            {feedback ? (
              <div className={styles.feedback} aria-live="polite">
                <span className={styles.feedbackLabel}>Your decision</span>
                <strong>{chosenOption.text}</strong>
                <p>{chosenOption.feedback}</p>
                <span className={styles.feedbackLabel}>Recommended approach</span>
                <strong>{activeScenario.options.find((option) => option.id === activeScenario.recommendedId).text}</strong>
                {activeAnswer.optionId !== activeScenario.recommendedId ? (
                  <p>{activeScenario.options.find((option) => option.id === activeScenario.recommendedId).feedback}</p>
                ) : null}
              </div>
            ) : (
              <fieldset className={styles.choices}>
                <legend className={styles.srOnly}>Choose one response</legend>
                {activeScenario.options.map((option) => (
                  <label key={option.id} className={`${styles.choice} ${selected === option.id ? styles.selected : ''}`}>
                    <input type="radio" name="decision-option" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} />
                    <span><strong>{option.text}</strong><small>{option.detail}</small></span>
                  </label>
                ))}
              </fieldset>
            )}
            <div className={styles.footer}>
              <p>Progress saves after every answer. You can close with Esc and resume later.</p>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={close}>Close for now</button>
                {feedback ? (
                  <button type="button" className={styles.primary} onClick={advance}>
                    {answered === scenarios.length ? 'See my results' : 'Next scenario'} <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button type="button" className={styles.primary} disabled={!selected} onClick={submit}>
                    Submit answer <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}

        {complete ? (
          <div className={styles.completed}>
            <div className={styles.successIcon}><BrainIcon className={styles.brain} /><span aria-hidden="true">✓</span></div>
            <span className={styles.eyebrow}>Daily session complete</span>
            <h3>Quest completed</h3>
            <p>Clearer thinking, stronger delivery. Thanks for practicing today.</p>
            <div className={styles.score}><strong>{aligned} of {scenarios.length}</strong><span>decisions aligned with the recommended approach</span></div>
            {showReview ? (
              <div className={styles.review} role="region" aria-label="Review today's decisions">
                {scenarios.map((scenario, index) => {
                  const answer = scenario.options.find((option) => option.id === session.answers[index].optionId)
                  return (
                    <article key={scenario.id}>
                      <h4>{index + 1}. {scenario.title}</h4>
                      <p><strong>Your choice:</strong> {answer.text}</p>
                      <p><strong>Decision insight:</strong> {answer.feedback}</p>
                      <p><strong>Recommended approach:</strong> {scenario.options.find((option) => option.id === scenario.recommendedId).text}</p>
                    </article>
                  )
                })}
              </div>
            ) : null}
            <div className={styles.completionActions}>
              <button type="button" className={styles.primary} onClick={() => setShowReview((value) => !value)}>
                {showReview ? 'Hide answer review' : 'Review answers'}
              </button>
              <button type="button" className={styles.secondary} onClick={close}>Back to workspace</button>
            </div>
            <p className={styles.tomorrow}>Another batch is available tomorrow. Scenarios repeat in a three-day cycle.</p>
          </div>
        ) : null}

        {!session ? <div className={styles.actions}><button type="button" className={styles.secondary} onClick={close}>Back to workspace</button></div> : null}
      </section>
    </div>,
    document.body,
  )
}
