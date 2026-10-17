import { Link, Outlet, useLocation } from 'react-router'
import { Brand } from '../../shared/ui/Brand/Brand.jsx'
import { PublicFooter } from '../../shared/ui/PublicFooter/PublicFooter.jsx'
import heroVisual from '../../pages/LandingPage/helmsight-landing-visual.webp'
import styles from './AuthLayout.module.css'

const narratives = {
  '/sign-in': {
    eyebrow: 'Welcome back',
    title: 'Clarity starts here.',
    description: 'Your next confident project decision starts with a clearer view.',
  },
  '/sign-up': {
    eyebrow: 'Get started',
    title: 'See the bigger picture.',
    description: 'A better way to understand projects, spot risks, and focus on what matters.',
  },
  '/forgot-password': {
    eyebrow: 'Account access',
    title: 'Find your way back.',
    description: 'Explore how account recovery will fit into your HelmSight workspace.',
  },
  '/reset-password': {
    eyebrow: 'Account access',
    title: 'A fresh start.',
    description: 'Preview the password reset experience before account services are available.',
  },
}

export function AuthLayout() {
  const { pathname } = useLocation()
  const narrative = narratives[pathname] ?? narratives['/sign-in']

  return (
    <main className={styles.page} data-auth-page="true" data-auth-screen={pathname.slice(1)}>
      <div className={styles.visual} aria-hidden="true">
        <img src={heroVisual} alt="" />
      </div>
      <header className={styles.header}>
        <Brand />
        <Link className={styles.homeLink} to="/">
          <span aria-hidden="true">←</span> Back to home
        </Link>
      </header>
      <section className={styles.content} aria-label="HelmSight account preview">
        <div className={styles.story} key={`${pathname}-story`}>
          <p className={styles.eyebrow}>{narrative.eyebrow}</p>
          <h1>{narrative.title}</h1>
          <p className={styles.description}>{narrative.description}</p>
          <aside className={styles.prototypeNote} aria-label="Account availability">
            <span className={styles.infoIcon} aria-hidden="true">i</span>
            <span>
              <strong>Account features are coming soon.</strong>
              <span> This is an interface preview. No account is created, and no sign-in or password recovery takes place.</span>
            </span>
          </aside>
        </div>
        <div className={styles.formRegion} key={`${pathname}-form`}><Outlet /></div>
      </section>
      <PublicFooter />
    </main>
  )
}
