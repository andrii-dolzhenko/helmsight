import { Link } from 'react-router'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <span className={styles.code}>404</span>
      <h1>That route is off course.</h1>
      <p>The page does not exist or the address has changed.</p>
      <Link to="/">Return to HelmSight</Link>
    </main>
  )
}
