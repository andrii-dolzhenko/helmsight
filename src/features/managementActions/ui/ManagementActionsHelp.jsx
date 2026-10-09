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

export function ManagementActionsHelp() {
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
        aria-label="Open management action field guide"
        aria-expanded={isOpen}
        aria-controls="management-action-field-help-dialog"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen ? createPortal(
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <section ref={dialogRef} id="management-action-field-help-dialog" className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="management-action-field-help-title">
            <header className={styles.dialogHeader}>
              <div><span className={styles.eyebrow}>Management action guide</span><h2 id="management-action-field-help-title">Status and source context</h2></div>
              <button ref={closeRef} className={styles.closeButton} type="button" aria-label="Close management action field guide" onClick={close}><CloseIcon /></button>
            </header>
            <div className={styles.content}>
              <section><h3>Status</h3><p><strong>Not started</strong> means the commitment is recorded but work has not begun. <strong>In progress</strong> means execution has started. <strong>Done</strong> means the commitment has been completed. On the register, Start, Mark done, and Reopen update this lifecycle directly.</p></section>
              <section><h3>Source / context</h3><p><strong>Manual</strong> means the action was recorded directly. <strong>Risk</strong>, <strong>Meeting</strong>, and <strong>Status report</strong> describe the management context that produced the action. In P0 this is classification only; it does not create an automatic link to another register.</p></section>
              <section><h3>Attention state</h3><p><strong>Due soon</strong> and <strong>Overdue</strong> are calculated from the due date for active actions. They are attention indicators, not lifecycle statuses.</p></section>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
