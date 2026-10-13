import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../../shared/ui/CloseIcon/CloseIcon.jsx'
import styles from './ManagementActionsHelp.module.css'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ManagementActionsHelp({ variant = 'project' }) {
  const portfolio = variant === 'portfolio'
  const dialogId = portfolio ? 'global-actions-help-dialog' : 'management-action-field-help-dialog'
  const titleId = portfolio ? 'global-actions-help-title' : 'management-action-field-help-title'
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
        aria-label={portfolio ? "Open global actions guide" : "Open management action field guide"}
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen ? createPortal(
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <section ref={dialogRef} id={dialogId} className={portfolio ? `${styles.dialog} ${styles.portfolioDialog}` : styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className={styles.dialogHeader}>
              <div><span className={styles.eyebrow}>{portfolio ? "Portfolio actions guide" : "Management action guide"}</span><h2 id={titleId}>{portfolio ? "Understanding Global Actions" : "Status and source context"}</h2></div>
              <button ref={closeRef} className={styles.closeButton} type="button" aria-label={portfolio ? "Close global actions guide" : "Close management action field guide"} onClick={close}><CloseIcon /></button>
            </header>
            <div className={styles.content}>
              {portfolio ? <>
                <section>
                  <h3>Portfolio summary</h3>
                  <p><strong>Active</strong> counts unfinished actions. <strong>Critical active</strong> counts unfinished actions with Critical priority. <strong>Needs attention</strong> counts unfinished actions that are Due soon or Overdue. <strong>Done</strong> counts completed actions.</p>
                  <p>Summary values reflect the selected project scope. Status, Priority and Attention filters change the register, not these counters.</p>
                </section>
                <section>
                  <h3>Status and priority</h3>
                  <p><strong>Not started</strong> means work has not begun. <strong>In progress</strong> means work is underway. <strong>Done</strong> means the commitment is completed.</p>
                  <p>Priority levels are <strong>Low</strong>, <strong>Medium</strong>, <strong>High</strong> and <strong>Critical</strong>. Priority describes importance; it does not change the action lifecycle.</p>
                </section>
                <section>
                  <h3>Attention indicators</h3>
                  <p><strong>On track</strong> means no near-term or missed due date is detected. <strong>Due soon</strong> means the due date falls between today and seven calendar days ahead, inclusive. <strong>Overdue</strong> means an unfinished action has passed its due date. Completed actions show <strong>Done</strong> instead of an overdue warning.</p>
                </section>
                <section>
                  <h3>Filters and archived projects</h3>
                  <p>Filter the register by project, status, priority and attention. Use <strong>Reset filters</strong> to restore the default view. Archived projects are excluded by default; enable <strong>Include archived projects</strong> to review their historical actions.</p>
                </section>
                <section>
                  <h3>Working with actions</h3>
                  <p>Global Actions is a portfolio overview. Select <strong>Open in project</strong> to review the action in its project register. Creation, editing, lifecycle changes and deletion remain in that project register. Archived projects are read-only until restored.</p>
                  <p>Owner initials represent text names, not verified user accounts. Data currently stays in this browser's local workspace.</p>
                </section>
              </> : <>
              <section><h3>Status</h3><p><strong>Not started</strong> means the commitment is recorded but work has not begun. <strong>In progress</strong> means execution has started. <strong>Done</strong> means the commitment has been completed. On the register, Start, Mark done, and Reopen update this lifecycle directly.</p></section>
              <section><h3>Source / context</h3><p><strong>Manual</strong> means the action was recorded directly. <strong>Risk</strong>, <strong>Meeting</strong>, and <strong>Status report</strong> describe the management context that produced the action. In P0 this is classification only; it does not create an automatic link to another register.</p></section>
              <section><h3>Attention state</h3><p><strong>Due soon</strong> and <strong>Overdue</strong> are calculated from the due date for active actions. They are attention indicators, not lifecycle statuses.</p></section>
              </>}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
