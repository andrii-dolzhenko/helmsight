import { Link } from 'react-router'
import markUrl from '../../assets/helmsight-mark.png'
import styles from './Brand.module.css'

export function Brand({ to = '/' }) {
  return (
    <Link className={styles.brand} to={to} aria-label="HelmSight home">
      <img className={styles.mark} src={markUrl} alt="" aria-hidden="true" />
      <span className={styles.wordmark} aria-hidden="true">
        <span className={styles.helm}>Helm</span>
        <span className={styles.sight}>Sight</span>
      </span>
    </Link>
  )
}
