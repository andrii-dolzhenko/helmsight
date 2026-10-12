import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../CloseIcon/CloseIcon.jsx'
import styles from './ConfirmDialog.module.css'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function DialogIcon({ name }) {
  if (name === 'trash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </svg>
    )
  }

  if (name === 'finalize') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </svg>
    )
  }

  if (name === 'reopen') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8V4m0 0h4M4 4l3.4 3.4" />
        <path d="M5.2 10a7 7 0 1 0 2-3.9" />
      </svg>
    )
  }

  if (name === 'archive') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16v13H4V7Z" />
        <path d="M3 4h18v3H3zM9 11h6" />
      </svg>
    )
  }

  if (name === 'warning') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4 21 20H3L12 4Z" />
        <path d="M12 9v5M12 17.5v.01" />
      </svg>
    )
  }

  return null
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  eyebrow = 'Unsaved changes',
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep editing',
  confirmTone = 'danger',
  icon = null,
  children,
  confirmDisabled = false,
  isPending = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  const interactionRef = useRef({ onCancel, isPending })

  useEffect(() => {
    interactionRef.current = { onCancel, isPending }
  }, [onCancel, isPending])

  const close = useCallback(() => {
    if (!interactionRef.current.isPending) {
      interactionRef.current.onCancel()
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key === 'Tab' && interactionRef.current.isPending) {
        event.preventDefault()
        dialogRef.current?.focus()
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
      previouslyFocused?.focus?.()
    }
  }, [close, isOpen])

  useEffect(() => {
    if (isOpen && isPending) {
      dialogRef.current?.focus()
    }
  }, [isOpen, isPending])

  if (!isOpen) {
    return null
  }

  const confirmClass = confirmTone === 'primary' ? styles.primaryButton : styles.dangerButton

  return createPortal(
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
        className={styles.dialog}
        role="alertdialog"
        tabIndex={-1}
        aria-modal="true"
        aria-busy={isPending}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className={styles.header}>
          <div className={styles.headingRow}>
            {icon ? <span className={`${styles.dialogIcon} ${styles[confirmTone] ?? ''}`}><DialogIcon name={icon} /></span> : null}
            <div>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <h2 id="confirm-dialog-title">{title}</h2>
            </div>
          </div>
          <button className={styles.closeButton} type="button" aria-label="Close dialog" onClick={close} disabled={isPending}>
            <CloseIcon />
          </button>
        </div>
        <p id="confirm-dialog-message">{message}</p>
        {children}

        <div className={styles.actions}>
          <button ref={cancelRef} className={styles.secondaryButton} data-ui-button="secondary" type="button" onClick={close} disabled={isPending}>
            {cancelLabel}
          </button>
          <button className={confirmClass} data-ui-button={confirmTone === 'primary' ? 'primary' : 'danger'} type="button" onClick={onConfirm} disabled={confirmDisabled || isPending}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
