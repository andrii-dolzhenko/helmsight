import { Link } from 'react-router'
import { Brand } from '../../shared/ui/Brand/Brand.jsx'
import heroVisualUrl from './helmsight-landing-visual.webp'
import styles from './LandingPage.module.css'

function VisibilityIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 26V17M10 26V11M16 26V6M22 26V14M28 26V9" />
    </svg>
  )
}

function RiskIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM21 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 28c0-5 3.6-8 8-8s8 3 8 8M18 21c1.1-.7 2.3-1 3.8-1 3.9 0 7.2 2.8 7.2 7.5" />
    </svg>
  )
}

function DecisionIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="4" />
      <path d="M16 2v3M30 16h-3M16 30v-3M2 16h3M24.5 7.5 22 10" />
    </svg>
  )
}

const strengths = [
  {
    title: 'End-to-end project visibility',
    icon: <VisibilityIcon />,
  },
  {
    title: 'Proactive risk management',
    icon: <RiskIcon />,
  },
  {
    title: 'Faster, more confident decisions',
    icon: <DecisionIcon />,
  },
]

export function LandingPage() {
  return (
    <main className={styles.page} data-landing-page="true">
      <div className={styles.visualLayer} aria-hidden="true">
        <img src={heroVisualUrl} alt="" />
      </div>

      <header className={styles.header}>
        <Brand />
        <nav className={styles.headerActions} aria-label="Landing actions">
          <Link className={styles.signIn} to="/projects">
            Sign in
          </Link>
          <Link className={styles.getStarted} to="/projects">
            Get started
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Delivery Clarity Platform</p>
          <h1>
            Project Intelligence <br className={styles.desktopBreak} />
            for a Clearer <br className={styles.desktopBreak} />
            Tomorrow.
          </h1>
          <p className={styles.description}>
            HelmSight helps delivery teams bring clarity to projects, risks, progress, and
            decisions — so you can move with confidence.
          </p>

          <Link className={styles.primaryCta} to="/projects">
            Open Demo Workspace
            <span aria-hidden="true">→</span>
          </Link>

          <div className={styles.strengths} aria-label="HelmSight strengths">
            {strengths.map((item) => (
              <div className={styles.strength} key={item.title}>
                <span className={styles.strengthIcon}>{item.icon}</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.tagline}>From complexity to confident delivery.</span>
        <small>© 2026 HelmSight. All rights reserved.</small>
      </footer>
    </main>
  )
}
