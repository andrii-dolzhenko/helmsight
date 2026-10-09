import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../shared/ui/CloseIcon/CloseIcon.jsx'
import styles from './MeetingNoteHelp.module.css'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function MeetingNoteHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const close = useCallback(() => {
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
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
      if (!focusable.length) return
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
        aria-label="Open Meeting Notes guide"
        aria-expanded={isOpen}
        aria-controls="meeting-notes-help-dialog"
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
            id="meeting-notes-help-dialog"
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-notes-help-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <span className={styles.eyebrow}>Meeting Notes guide</span>
                <h2 id="meeting-notes-help-title">Capture the meeting record, not another task board.</h2>
              </div>
              <button ref={closeRef} className={styles.closeButton} type="button" aria-label="Close Meeting Notes guide" onClick={close}>
                <CloseIcon />
              </button>
            </header>

            <div className={styles.content}>
              <section>
                <h3>What is required</h3>
                <p><strong>Title</strong>, <strong>Meeting date</strong>, <strong>Owner</strong>, and <strong>Notes</strong> are required. Participants, decisions, and follow-ups are optional.</p>
              </section>
              <section>
                <h3>Participants</h3>
                <p>Participants are free-text names in P0. Directory-backed people selection is intentionally deferred until identity/authentication work exists.</p>
              </section>
              <section>
                <h3>Decisions and follow-ups</h3>
                <p>Use concise structured lists. Follow-ups document commitments from the meeting; they do not automatically create Management Actions in P0.</p>
              </section>
              <section>
                <h3>Save and version</h3>
                <p>Meeting Notes use explicit Save. A version increases only when real content changes are saved; simply opening the note does not create a revision.</p>
              </section>
              <section>
                <h3>Print note</h3>
                <p>Print note opens the browser print dialog. From there you can print to an available printer or use the system Save as PDF option.</p>
              </section>
              <section>
                <h3>Sharing</h3>
                <p>Direct share links and email delivery are outside P0. Save the note as PDF and distribute the file manually when needed.</p>
              </section>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
