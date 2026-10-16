import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CloseIcon } from '../../../shared/ui/CloseIcon/CloseIcon.jsx'
import { BrainIcon } from '../../decisionLab/ui/BrainIcon.jsx'
import { visibleNotifications } from '../lib/notifications.js'
import styles from './NotificationBell.module.css'

const BATCH_SIZE = 20
const ICONS = {
  risk: 'M12 3 2 21h20L12 3Zm0 7v4m0 4h.01',
  action: 'M5 6h14M5 12h14M5 18h9',
  milestone: 'M5 21V4m1 1h13l-3 5 3 5H6',
}

function BellIcon() {
  return (
    <svg className={styles.bellSvg} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9Z" />
      <path d="M10 21h4M12 2v1" />
    </svg>
  )
}

function KindIcon({ kind }) {
  if (kind === 'lab') return <BrainIcon className={styles.brainSvg} />
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.kindSvg}>
      <path d={ICONS[kind]} />
    </svg>
  )
}

export function NotificationBell({ model, mobile = false, isOpen, onOpenChange, onOpenLab }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const panelId = useId()
  const navigate = useNavigate()
  const refresh = model.refresh
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [limit, setLimit] = useState(BATCH_SIZE)
  const notifications = visibleNotifications(model.alerts, model.records, unreadOnly)
  const shown = notifications.slice(0, limit)
  const label = `Notifications, ${model.unread} unread`

  useEffect(() => {
    if (!isOpen) return undefined
    refresh()
    closeRef.current?.focus()
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onOpenChange(false)
        triggerRef.current?.focus()
      }
    }
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) onOpenChange(false)
    }
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('pointerdown', handleOutside)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('pointerdown', handleOutside)
    }
  }, [isOpen, onOpenChange, refresh])

  useEffect(() => {
    if (isOpen && mobile) {
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = previous }
    }
    return undefined
  }, [isOpen, mobile])

  const handleOpen = (item) => {
    model.markRead([item.id])
    onOpenChange(false)
    if (item.type === 'lab') onOpenLab(triggerRef.current)
    else if (item.href) navigate(item.href)
  }

  return (
    <div className={`${styles.root} ${mobile ? styles.mobile : ''}`} ref={rootRef} onBlur={(event) => { if (isOpen && !event.currentTarget.contains(event.relatedTarget)) onOpenChange(false) }}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-label={label}
        title={label}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => onOpenChange(!isOpen)}
      >
        <BellIcon />
        {model.unread > 0 ? (
          <span className={styles.badge} aria-hidden="true">{model.unread > 9 ? '9+' : model.unread}</span>
        ) : null}
      </button>
      {isOpen ? (
        <section className={styles.panel} id={panelId} aria-label="Notifications">
          <div className={styles.panelHeader}>
            <h2>Notifications</h2>
            <button type="button" className={styles.close} ref={closeRef} aria-label="Close notifications" onClick={() => { onOpenChange(false); triggerRef.current?.focus() }}><CloseIcon /></button>
          </div>
          <div className={styles.controls}>
            <div className={styles.filters} role="group" aria-label="Notification filters">
              <button type="button" className={!unreadOnly ? styles.selected : ''} aria-pressed={!unreadOnly} onClick={() => { setUnreadOnly(false); setLimit(BATCH_SIZE) }}>All</button>
              <button type="button" className={unreadOnly ? styles.selected : ''} aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(true); setLimit(BATCH_SIZE) }}>Unread ({model.unread})</button>
            </div>
            <button className={styles.markAll} type="button" disabled={model.unread === 0} onClick={() => model.markRead(model.alerts.map((a) => a.id))}>Mark all read</button>
          </div>
          {model.error ? <p className={styles.error} role="alert">{model.error}</p> : null}
          {model.loading ? <p className={styles.empty}>Loading project alerts…</p> : null}
          <div className={styles.list} tabIndex={0} aria-label="Notification list">
            {!model.loading && notifications.length === 0 ? <p className={styles.empty}>{unreadOnly ? 'You are all caught up.' : 'No notifications right now.'}</p> : null}
            {shown.map((item) => (
              <article key={item.id} className={`${styles.item} ${!model.records[item.id]?.read ? styles.unreadItem : ''}`}>
                <div className={`${styles.itemIcon} ${styles[item.type]}`}><KindIcon kind={item.type} /></div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>
                    <strong>{item.title}</strong>
                    {!model.records[item.id]?.read ? <><span className={styles.unreadDot} aria-hidden="true" /><span className={styles.srOnly}>Unread</span></> : null}
                  </div>
                  <p>{item.projectName ? `${item.projectName} · ` : ''}{item.detail}</p>
                  <button type="button" className={styles.open} onClick={() => handleOpen(item)}>{item.type === 'lab' ? 'Open Decision Lab' : 'Open in project'} ↗</button>
                </div>
                <button type="button" className={styles.dismiss} title={`Dismiss ${item.title}`} aria-label={`Dismiss ${item.title}: ${item.detail}`} onClick={() => model.dismiss(item.id)}><CloseIcon /></button>
              </article>
            ))}
            {limit < notifications.length ? <button className={styles.more} type="button" onClick={() => setLimit((value) => value + BATCH_SIZE)}>Show more (+{Math.min(BATCH_SIZE, notifications.length - limit)})</button> : null}
          </div>
          <div className={styles.panelFooter}>
            <span>{notifications.length === 0 ? 'No active alerts' : `Showing ${Math.min(limit, notifications.length)} of ${notifications.length}`}</span>
            <span>Browser-local notifications</span>
          </div>
        </section>
      ) : null}
    </div>
  )
}
