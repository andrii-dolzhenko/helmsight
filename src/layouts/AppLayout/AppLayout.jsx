import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Brand } from '../../shared/ui/Brand/Brand.jsx'
import { ThemeControl } from '../../features/preferences/ui/ThemeControl.jsx'
import styles from './AppLayout.module.css'

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

function AccountSummary() {
  return (
    <div className={styles.accountSummary} aria-label="Current workspace profile">
      <span className={styles.avatarBadge} aria-hidden="true">
        PM
      </span>
      <span className={styles.accountCopy}>
        <strong>Project Manager</strong>
        <span>Local workspace</span>
      </span>
    </div>
  )
}

export function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const mobileMenuButtonRef = useRef(null)
  const mobileCloseButtonRef = useRef(null)
  const previousPathnameRef = useRef(pathname)

  useLayoutEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return
    }

    previousPathnameRef.current = pathname

    const scrollingElement = document.scrollingElement ?? document.documentElement

    if (scrollingElement) {
      scrollingElement.scrollTop = 0
      scrollingElement.scrollLeft = 0
    }

    document.body.scrollTop = 0
    document.body.scrollLeft = 0
  }, [pathname])

  useEffect(() => {
    if (!isMobileNavOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    mobileCloseButtonRef.current?.focus()

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false)
        mobileMenuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMobileNavOpen])

  const closeMobileNav = ({ restoreFocus = false } = {}) => {
    setIsMobileNavOpen(false)

    if (restoreFocus) {
      mobileMenuButtonRef.current?.focus()
    }
  }

  const handleProjectsNavigation = (event, { closeMobile = false } = {}) => {
    if (closeMobile) {
      closeMobileNav()
    }

    const isPlainPrimaryClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey

    if (!isPlainPrimaryClick || pathname !== '/projects') {
      return
    }

    event.preventDefault()

    if (location.search || location.hash) {
      navigate('/projects')
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }

  return (
    <div className={styles.shell} data-app-shell="true">
      <aside className={styles.sidebar} data-print-hide="true">
        <Brand />

        <nav className={styles.navigation} aria-label="Main navigation">
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
            onClick={handleProjectsNavigation}
          >
            Projects
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarMessage}>
            <strong>A clearer tomorrow.</strong>
            <span>Turn complexity into progress.</span>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader} data-print-hide="true">
          <Brand />
          <button
            ref={mobileMenuButtonRef}
            className={styles.mobileMenuButton}
            type="button"
            aria-label="Open navigation menu"
            aria-controls="mobile-navigation"
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen(true)}
          >
            <MenuIcon />
          </button>
        </header>

        <header className={styles.topbar} data-print-hide="true">
          <div className={styles.topbarSpacer} aria-hidden="true" />

          <div className={styles.accountArea}>
            <ThemeControl />
            <span className={styles.avatarBadge} aria-label="Project Manager profile">
              PM
            </span>
          </div>
        </header>

        <main className={styles.main} data-app-main="true">
          <Outlet />
        </main>
      </div>

      {isMobileNavOpen ? (
        <div className={styles.mobileNavLayer} data-print-hide="true">
          <button
            className={styles.mobileNavBackdrop}
            type="button"
            aria-label="Close navigation menu"
            onClick={() => closeMobileNav({ restoreFocus: true })}
          />

          <aside
            id="mobile-navigation"
            className={styles.mobileNavPanel}
            aria-label="Mobile navigation"
          >
            <div className={styles.mobileNavHeader}>
              <Brand />
              <button
                ref={mobileCloseButtonRef}
                className={styles.mobileMenuButton}
                type="button"
                aria-label="Close navigation menu"
                onClick={() => closeMobileNav({ restoreFocus: true })}
              >
                <CloseIcon />
              </button>
            </div>

            <nav className={styles.mobileNavigation} aria-label="Mobile main navigation">
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={(event) => handleProjectsNavigation(event, { closeMobile: true })}
              >
                Projects
              </NavLink>
            </nav>

            <div className={styles.mobileNavFooter}>
              <div className={styles.mobileAppearanceRow}>
                <span>Appearance</span>
                <ThemeControl />
              </div>
              <AccountSummary />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
