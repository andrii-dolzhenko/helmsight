import { useAppSelector } from '../../../app/store/hooks.js'
import { selectProfileFirstName } from '../../profile/model/profileSlice.js'
import { getDailyInsight } from '../lib/dailyInsights.js'
import styles from './PortfolioWelcomeBanner.module.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function PortfolioWelcomeBanner() {
  const firstName = useAppSelector(selectProfileFirstName)
  const insight = getDailyInsight()
  const greeting = `${getGreeting()}${firstName ? `, ${firstName}` : ''}.`

  return (
    <section className={styles.projectsHero} aria-label="Portfolio welcome">
      <div className={styles.heroRibs} aria-hidden="true" />
      <div className={styles.heroSwoop} aria-hidden="true" />
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.projectsHeroMain}>
        <span className={styles.projectsHeroEyebrow}>Portfolio briefing</span>
        <h2>{greeting}</h2>
        <p>Your portfolio at a glance. See what needs attention, understand what matters, and move forward with clarity.</p>
      </div>
      <aside className={styles.dailyInsight} aria-label="Daily insight">
        <span>Daily insight</span>
        <blockquote>“{insight.quote}”</blockquote>
        <p>— {insight.author}</p>
      </aside>
    </section>
  )
}
