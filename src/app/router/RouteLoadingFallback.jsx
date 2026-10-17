import styles from './RouteLoadingFallback.module.css'

// Initial loading UI for direct visits to lazy routes.
export function RouteLoadingFallback() {
  return (
    <main className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Loading HelmSight…</span>
    </main>
  )
}
