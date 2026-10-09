import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../../shared/ui/CloseIcon/CloseIcon.jsx'
import styles from './SuccessCriteriaHelp.module.css'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function SuccessCriteriaHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const close = useCallback(() => {
    triggerRef.current?.focus()
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)]
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.helpButton}
        type="button"
        aria-label="Open Success Criteria guide"
        aria-expanded={isOpen}
        aria-controls="success-criteria-help-dialog"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen ? createPortal(
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close()
            }
          }}
        >
          <section
            ref={dialogRef}
            id="success-criteria-help-dialog"
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-criteria-help-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <span className={styles.eyebrow}>Success Criteria guide</span>
                <h2 id="success-criteria-help-title">Measure the outcome, not the activity.</h2>
              </div>
              <button
                ref={closeRef}
                className={styles.closeButton}
                type="button"
                aria-label="Close Success Criteria guide"
                onClick={close}
              >
                <CloseIcon />
              </button>
            </header>

            <div className={styles.content}>
              <section>
                <h3>Baseline, current, target</h3>
                <p><strong>Baseline</strong> is the starting reference value. <strong>Current</strong> is the latest measured value. <strong>Target</strong> is the desired outcome.</p>
              </section>

              <section>
                <h3>Target logic</h3>
                <p><strong>At least</strong> is used when higher values are better. <strong>At most</strong> is used when lower values are better. Date metrics use <strong>On or before</strong> or <strong>On or after</strong>.</p>
              </section>

              <section>
                <h3>Status rules</h3>
                <p><strong>Achieved</strong> means the target is satisfied. <strong>Missed</strong> means the target date passed without satisfying it. <strong>At Risk</strong> means the target is not yet satisfied and is due within 14 calendar days. Otherwise it remains <strong>On Track</strong>.</p>
              </section>

              <section>
                <h3>ROI</h3>
                <p>(Financial Benefit - Investment Cost) / Investment Cost × 100. Investment Cost must be greater than zero.</p>
              </section>

              <section>
                <h3>Gross Margin</h3>
                <p>(Revenue - Direct Costs) / Revenue × 100. Revenue must be greater than zero.</p>
              </section>

              <section>
                <h3>Profit Margin</h3>
                <p>Profit / Revenue × 100. Revenue must be greater than zero.</p>
              </section>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
