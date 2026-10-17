import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import styles from './AuthForm.module.css'

function AuthNotice({ message, onDismiss }) {
  const triggerRef = useRef(null)

  useEffect(() => {
    triggerRef.current = document.activeElement
  }, [message])

  function dismiss() {
    onDismiss()
    triggerRef.current?.focus()
  }

  // Render outside the animated AuthLayout so fixed positioning is relative
  // to the viewport and cannot change the form card or footer height.
  return createPortal(
    <div className={styles.notice} role="status" aria-live="polite" aria-atomic="true">
      <p>{message}</p>
      <div className={styles.noticeActions}>
        <Link to="/overview">Explore Demo Workspace <span aria-hidden="true">→</span></Link>
        <button type="button" onClick={dismiss} aria-label="Dismiss account preview notice">Dismiss</button>
      </div>
    </div>,
    document.body,
  )
}

export function AuthForm({ title, subtitle, children, onSubmit, actionLabel, notice, onDismissNotice, footer }) {
  return (
    <div className={styles.card}>
      <h2>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
      <form onSubmit={onSubmit} noValidate>
        <div className={styles.fields}>{children}</div>
        <button className={styles.submitButton} type="submit">{actionLabel}</button>
      </form>
      {notice && <AuthNotice message={notice} onDismiss={onDismissNotice} />}
      {footer}
    </div>
  )
}

export function DemoLink({ withDivider = true }) {
  return (
    <div className={styles.demoArea}>
      {withDivider && <p className={styles.divider}><span>or</span></p>}
      <Link className={styles.demoLink} to="/overview">Explore Demo Workspace <span aria-hidden="true">→</span></Link>
    </div>
  )
}

export function FormSwitch({ children }) {
  return <p className={styles.switch}>{children}</p>
}
