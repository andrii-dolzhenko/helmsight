import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAppSelector } from '../../../app/store/hooks.js'
import { getProfileFullName } from '../lib/profile.js'
import { selectProfile } from '../model/profileSlice.js'
import { ProfileAvatar } from './ProfileAvatar.jsx'
import styles from './ProfileMenu.module.css'

export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const firstLinkRef = useRef(null)
  const profile = useAppSelector(selectProfile)

  useEffect(() => {
    if (!open) return undefined
    firstLinkRef.current?.focus()
    const onOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const fullName = getProfileFullName(profile)
  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ProfileAvatar />
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label="Profile actions">
          <div className={styles.identity}>
            <ProfileAvatar large />
            <div>
              <strong title={fullName}>{fullName || 'Local profile'}</strong>
              <span title={profile.role}>{profile.role}</span>
            </div>
          </div>
          <Link ref={firstLinkRef} role="menuitem" to="/settings" onClick={() => setOpen(false)}>
            Profile &amp; Settings
          </Link>
          <Link role="menuitem" to="/settings#account-security" onClick={() => setOpen(false)}>
            Account security
          </Link>
          <Link role="menuitem" className={styles.exitLink} to="/" onClick={() => setOpen(false)}>
            Exit workspace
          </Link>
        </div>
      ) : null}
    </div>
  )
}
