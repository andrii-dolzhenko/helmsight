import { useEffect } from 'react'
import styles from './StatusToast.module.css'

function ToastIcon({ name }) {
  if (name === 'refresh') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6v5h-5M4 18v-5h5" />
        <path d="M18.2 10A7 7 0 0 0 6.1 7.1L4 10M5.8 14A7 7 0 0 0 17.9 16.9L20 14" />
      </svg>
    )
  }

  if (name === 'alert') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v6M12 16.5v.01" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4 10-10" />
    </svg>
  )
}

export function StatusToast({
  message,
  onDismiss,
  duration = 3000,
  variant = 'success',
  icon,
  actionLabel,
  onAction,
}) {
  useEffect(() => {
    if (!message) return undefined

    const timeoutId = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timeoutId)
  }, [duration, message, onDismiss])

  if (!message) return null

  const iconName = icon ?? (variant === 'error' ? 'alert' : 'check')

  return (
    <div
      className={`${styles.toast} ${styles[variant] ?? ''}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-print-hide="true"
    >
      <span className={styles.icon}><ToastIcon name={iconName} /></span>
      <span className={styles.message}>{message}</span>
      {actionLabel && onAction ? (
        <button
          className={styles.action}
          type="button"
          onClick={() => {
            onAction()
            onDismiss()
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
