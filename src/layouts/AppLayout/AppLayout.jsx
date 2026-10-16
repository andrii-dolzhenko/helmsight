import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Brand } from '../../shared/ui/Brand/Brand.jsx'
import { ThemeControl } from '../../features/preferences/ui/ThemeControl.jsx'
import { GlobalSearch } from '../../features/globalSearch/ui/GlobalSearch.jsx'
import { ProfileAvatar } from '../../features/profile/ui/ProfileAvatar.jsx'
import { ProfileMenu } from '../../features/profile/ui/ProfileMenu.jsx'
import { selectProfile } from '../../features/profile/model/profileSlice.js'
import { getProfileFullName } from '../../features/profile/lib/profile.js'
import { useAppSelector } from '../../app/store/hooks.js'
import styles from './AppLayout.module.css'
import { DecisionLabCard } from '../../features/decisionLab/ui/DecisionLabCard.jsx'
import { DecisionLabModal } from '../../features/decisionLab/ui/DecisionLabModal.jsx'
import { CloseIcon } from '../../shared/ui/CloseIcon/CloseIcon.jsx'
import { NotificationBell } from '../../features/notifications/ui/NotificationBell.jsx'
import { NavigationIcon } from './NavigationIcon.jsx'
import { useHeaderNotifications } from '../../features/notifications/ui/useHeaderNotifications.js'

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  )
}

function AccountSummary({ onNavigate }) {
  const profile = useAppSelector(selectProfile)
  const displayName = getProfileFullName(profile)

  return (
    <NavLink
      to="/settings"
      className={styles.accountSummary}
      aria-label="Profile settings"
      onClick={onNavigate}
    >
      <ProfileAvatar />
      <span className={styles.accountCopy}>
        <strong title={displayName}>{displayName || 'Local profile'}</strong>
        <span>{profile.role}</span>
      </span>
    </NavLink>
  )
}

export function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isDecisionLabOpen, setIsDecisionLabOpen] = useState(false)
  const [notificationPanel, setNotificationPanel] = useState(null)
  const [labRefreshKey, setLabRefreshKey] = useState(0)
  const notifications = useHeaderNotifications(labRefreshKey)
  const decisionLabTriggerRef = useRef(null)
  const searchTriggerRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const mobileMenuButtonRef = useRef(null)
  const mobileCloseButtonRef = useRef(null)
  const previousPathnameRef = useRef(pathname)
  const openDesktopNotifications = useCallback((open) => setNotificationPanel(open ? 'desktop' : null), [])
  const openMobileNotifications = useCallback((open) => setNotificationPanel(open ? 'mobile' : null), [])

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

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  const openLabFromNotification = (trigger) => {
    decisionLabTriggerRef.current = trigger
    setNotificationPanel(null)
    setIsDecisionLabOpen(true)
  }

  const openDecisionLab = (event, { mobile = false } = {}) => {
    decisionLabTriggerRef.current = mobile ? mobileMenuButtonRef.current : event.currentTarget
    if (mobile) setIsMobileNavOpen(false)
    setIsDecisionLabOpen(true)
  }

  const openSearch = (event) => {
    searchTriggerRef.current = event.currentTarget
    setIsSearchOpen(true)
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    searchTriggerRef.current?.focus()
  }

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
    <div className={styles.shell} data-app-shell="true" inert={isDecisionLabOpen}>
      <aside className={styles.sidebar} data-print-hide="true">
        <Brand to="/overview" />

        <nav className={styles.navigation} aria-label="Main navigation">
          <NavLink
            to="/overview"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <NavigationIcon name="overview" />
            Overview
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
            onClick={handleProjectsNavigation}
          >
            <NavigationIcon name="projects" />
            Projects
          </NavLink>
          <NavLink
            to="/actions"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <NavigationIcon name="actions" />
            Actions
          </NavLink>
          <NavLink
            to="/risks"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <NavigationIcon name="risks" />
            Risks
          </NavLink>
          <NavLink
            to="/metrics"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <NavigationIcon name="metrics" />
            Metrics
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <NavigationIcon name="reports" />
            Reports
          </NavLink>
          <NavLink
            to="/meetings"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <NavigationIcon name="meetings" />
            Meetings
          </NavLink>
          <div className={styles.navSecondary}>
            <NavLink to="/help" className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }>
              <NavigationIcon name="help" />
              Help
            </NavLink>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <DecisionLabCard onOpen={openDecisionLab} />
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader} data-print-hide="true">
          <Brand to="/overview" />
          <div className={styles.mobileActions}>
            <button type="button" className={styles.searchIconButton} aria-label="Search portfolio" onClick={openSearch} title="Search portfolio">
              <SearchIcon />
            </button>
            <NotificationBell model={notifications} mobile isOpen={notificationPanel === 'mobile'} onOpenChange={openMobileNotifications} onOpenLab={openLabFromNotification} />
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
          </div>
        </header>

        <header className={styles.topbar} data-print-hide="true">
          <button type="button" className={styles.searchTrigger} aria-label="Search portfolio" onClick={openSearch} aria-keyshortcuts="Control+K Meta+K">
            <SearchIcon /> <span>Search portfolio</span> <kbd>⌘ K</kbd>
          </button>

          <div className={styles.accountArea}>
            <NotificationBell model={notifications} isOpen={notificationPanel === 'desktop'} onOpenChange={openDesktopNotifications} onOpenLab={openLabFromNotification} />
            <ThemeControl />
            <ProfileMenu />
          </div>
        </header>

        <main className={styles.main} data-app-main="true">
          <Outlet />
        </main>
      </div>

      {isSearchOpen ? <GlobalSearch isOpen={true} onClose={closeSearch} /> : null}
      {isDecisionLabOpen ? (
        <DecisionLabModal onClose={() => { setIsDecisionLabOpen(false); setLabRefreshKey((key) => key + 1) }} returnFocusRef={decisionLabTriggerRef} />
      ) : null}

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
              <Brand to="/overview" />
              <button
                ref={mobileCloseButtonRef}
                className={`${styles.mobileMenuButton} ${styles.mobileNavCloseButton}`}
                type="button"
                aria-label="Close navigation menu"
                onClick={() => closeMobileNav({ restoreFocus: true })}
              >
                <CloseIcon />
              </button>
            </div>

            <nav className={styles.mobileNavigation} aria-label="Mobile main navigation">
              <NavLink
                to="/overview"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => closeMobileNav()}
              >
                <NavigationIcon name="overview" />
                Overview
              </NavLink>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={(event) => handleProjectsNavigation(event, { closeMobile: true })}
              >
                <NavigationIcon name="projects" />
                Projects
              </NavLink>
              <NavLink
                to="/actions"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ""}`
                }
                onClick={() => closeMobileNav()}
              >
                <NavigationIcon name="actions" />
                Actions
              </NavLink>
              <NavLink
                to="/risks"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => closeMobileNav()}
              >
                <NavigationIcon name="risks" />
                Risks
              </NavLink>
              <NavLink
                to="/metrics"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => closeMobileNav()}
              >
                <NavigationIcon name="metrics" />
                Metrics
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => closeMobileNav()}
              >
                <NavigationIcon name="reports" />
                Reports
              </NavLink>
              <NavLink
                to="/meetings"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => closeMobileNav()}
              >
                <NavigationIcon name="meetings" />
                Meetings
              </NavLink>
              <div className={styles.navSecondary}>
                <NavLink
                  to="/help"
                  className={({ isActive }) =>
                    `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                  }
                  onClick={() => closeMobileNav()}
                >
                  <NavigationIcon name="help" />
                  Help
                </NavLink>
              </div>
            </nav>

            <div className={styles.mobileDecisionLabSlot}>
              <DecisionLabCard mobile onOpen={(event) => openDecisionLab(event, { mobile: true })} />
            </div>

            <div className={styles.mobileNavFooter}>
              <div className={styles.mobileAppearanceRow}>
                <span>Appearance</span>
                <ThemeControl />
              </div>
              <AccountSummary onNavigate={() => closeMobileNav()} />
              <NavLink to="/" className={styles.mobileExitLink} onClick={() => closeMobileNav()}>
                Exit workspace
              </NavLink>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
