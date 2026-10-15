import { BrainIcon } from './BrainIcon.jsx'
import styles from './DecisionLabCard.module.css'

export function DecisionLabCard({ onOpen, mobile = false }) {
  if (mobile) {
    return (
      <button type="button" className={styles.mobileCard} onClick={onOpen} aria-label="Open Decision Lab">
        <BrainIcon className={styles.mobileBrain} />
        <span>Decision Lab</span>
        <span aria-hidden="true">↗</span>
      </button>
    )
  }

  return (
    <button type="button" className={styles.card} onClick={onOpen} aria-label="Open Decision Lab">
      <span className={styles.visual} aria-hidden="true">
        <span className={styles.brainCircle}><BrainIcon className={styles.brain} /></span>
        <span className={styles.bars}><i /><i /><i /><i /><i /></span>
      </span>
      <strong>Decision Lab</strong>
      <span className={styles.tagline}>Explore scenarios. Understand impact. Make confident decisions.</span>
      <span className={styles.open}>Open Decision Lab <span aria-hidden="true">↗</span></span>
    </button>
  )
}
