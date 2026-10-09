import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../shared/ui/CloseIcon/CloseIcon.jsx'
import styles from './ReportHelp.module.css'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ReportHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const close = useCallback(() => {
    triggerRef.current?.focus()
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

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
        aria-label="Open Weekly Status Report guide"
        aria-expanded={isOpen}
        aria-controls="weekly-status-report-help-dialog"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen ? createPortal(
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <section
            ref={dialogRef}
            id="weekly-status-report-help-dialog"
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="weekly-status-report-help-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <span className={styles.eyebrow}>Weekly Status Report guide</span>
                <h2 id="weekly-status-report-help-title">Build the snapshot, then explain the week.</h2>
              </div>
              <button
                ref={closeRef}
                className={styles.closeButton}
                type="button"
                aria-label="Close Weekly Status Report guide"
                onClick={close}
              >
                <CloseIcon />
              </button>
            </header>

            <div className={styles.content}>
              <section>
                <h3>One report per Week ending</h3>
                <p>Each project can have one Weekly Status Report for a reporting end date. If one already exists, continue the Draft or open the existing Final report.</p>
              </section>

              <section>
                <h3>What you edit</h3>
                <p><strong>Owner</strong> and <strong>Executive Summary</strong> are required. Achievements, Issues / Blockers, Management Attention Required, and Next Week Focus are optional narrative lists.</p>
              </section>

              <section>
                <h3>Refresh project data</h3>
                <p>Refresh updates the derived snapshot from Risks, Milestones, Metrics, Success Criteria, Actions, and Project Health. Your narrative stays unchanged.</p>
              </section>

              <section>
                <h3>Control Signals</h3>
                <p>Hide removes a signal only from this report. Hidden signals stay hidden after Refresh. Use <strong>Restore hidden</strong> to bring them back.</p>
              </section>

              <section>
                <h3>Save and finalize</h3>
                <p>Save a valid Draft before using <strong>Mark as Final</strong>. Final reports are read-only until you explicitly choose <strong>Reopen for correction</strong>.</p>
              </section>

              <section>
                <h3>Print report</h3>
                <p>Print report opens the browser print dialog. From there you can print to an available printer or use the system Save as PDF option.</p>
              </section>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
