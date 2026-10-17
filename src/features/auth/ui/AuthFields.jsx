import { useState } from 'react'
import styles from './AuthForm.module.css'

export function AuthField({ id, label, registration, error, type = 'text', autoComplete, placeholder }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...registration}
      />
      <div className={styles.errorSlot} id={`${id}-error`}>
        {error && <p className={styles.error} role="alert">{error.message}</p>}
      </div>
    </div>
  )
}

export function PasswordField({ id, label, registration, error, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="At least 8 characters"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...registration}
        />
        <button
          type="button"
          className={styles.visibilityButton}
          onClick={() => setVisible((previous) => !previous)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className={styles.errorSlot} id={`${id}-error`}>
        {error && <p className={styles.error} role="alert">{error.message}</p>}
      </div>
    </div>
  )
}
