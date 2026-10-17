import styles from './PublicFooter.module.css'

/** Shared public-site footer for the landing and all account-preview routes. */
export function PublicFooter({ className = '' }) {
  const footerClassName = className ? `${styles.footer} ${className}` : styles.footer

  return (
    <footer className={footerClassName}>
      <span>From complexity to confident delivery.</span>
      <small>© 2026 HelmSight. All rights reserved.</small>
    </footer>
  )
}
