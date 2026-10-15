import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks.js'
import { loadProjects, selectProjects, selectProjectsStatus, selectProjectsError } from '../../projects/model/projectsSlice.js'
import { loadRisks, selectRisks, selectRisksStatus, selectRisksError } from '../../risks/model/risksSlice.js'
import { loadMilestones, selectMilestones, selectMilestonesStatus, selectMilestonesError } from '../../milestones/model/milestonesSlice.js'
import { loadManagementActions, selectManagementActions, selectManagementActionsStatus, selectManagementActionsError } from '../../managementActions/model/managementActionsSlice.js'
import { loadReports, selectReports, selectReportsStatus, selectReportsError } from '../../reports/model/reportsSlice.js'
import { loadMeetings, selectMeetings, selectMeetingsStatus, selectMeetingsError } from '../../meetings/model/meetingsSlice.js'
import { buildGlobalSearchIndex, searchGlobalIndex, SEARCH_GROUPS } from '../lib/globalSearch.js'
import styles from './GlobalSearch.module.css'

const RECENT_KEY = 'helmsight:global-search-recent:v1'

function readRecent() {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}

export function GlobalSearch({ isOpen, onClose }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const projects = useAppSelector(selectProjects)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const projectsError = useAppSelector(selectProjectsError)
  const risks = useAppSelector(selectRisks)
  const risksStatus = useAppSelector(selectRisksStatus)
  const risksError = useAppSelector(selectRisksError)
  const milestones = useAppSelector(selectMilestones)
  const milestonesStatus = useAppSelector(selectMilestonesStatus)
  const milestonesError = useAppSelector(selectMilestonesError)
  const actions = useAppSelector(selectManagementActions)
  const actionsStatus = useAppSelector(selectManagementActionsStatus)
  const actionsError = useAppSelector(selectManagementActionsError)
  const reports = useAppSelector(selectReports)
  const reportsStatus = useAppSelector(selectReportsStatus)
  const reportsError = useAppSelector(selectReportsError)
  const meetings = useAppSelector(selectMeetings)
  const meetingsStatus = useAppSelector(selectMeetingsStatus)
  const meetingsError = useAppSelector(selectMeetingsError)
  const [query, setQuery] = useState('')
  const [deferredQuery, setDeferredQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recent, setRecent] = useState(readRecent)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    if (projectsStatus === 'idle') dispatch(loadProjects())
    if (risksStatus === 'idle') dispatch(loadRisks())
    if (milestonesStatus === 'idle') dispatch(loadMilestones())
    if (actionsStatus === 'idle') dispatch(loadManagementActions())
    if (reportsStatus === 'idle') dispatch(loadReports())
    if (meetingsStatus === 'idle') dispatch(loadMeetings())
  }, [isOpen, dispatch, projectsStatus, risksStatus, milestonesStatus, actionsStatus, reportsStatus, meetingsStatus])

  useEffect(() => {
    if (!isOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => { document.body.style.overflow = originalOverflow }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const timer = window.setTimeout(() => setDeferredQuery(query), 160)
    return () => window.clearTimeout(timer)
  }, [query, isOpen])

  const index = useMemo(() => buildGlobalSearchIndex({
    projects: projectsStatus === 'succeeded' ? projects : [],
    risks: risksStatus === 'succeeded' ? risks : [],
    milestones: milestonesStatus === 'succeeded' ? milestones : [],
    actions: actionsStatus === 'succeeded' ? actions : [],
    reports: reportsStatus === 'succeeded' ? reports : [],
    meetings: meetingsStatus === 'succeeded' ? meetings : [],
  }), [projects, projectsStatus, risks, risksStatus, milestones, milestonesStatus, actions, actionsStatus, reports, reportsStatus, meetings, meetingsStatus])

  const searching = query.trim().length > 0
  const isDebouncing = searching && query !== deferredQuery
  const results = useMemo(() => searchGlobalIndex(index, deferredQuery), [index, deferredQuery])
  const displayed = searching ? (isDebouncing ? [] : results) : recent.map((key) => index.find((item) => item.key === key)).filter(Boolean)
  const statuses = [projectsStatus, risksStatus, milestonesStatus, actionsStatus, reportsStatus, meetingsStatus]
  const loading = statuses.some((status) => status === 'idle' || status === 'loading')
  const errors = [projectsError, risksError, milestonesError, actionsError, reportsError, meetingsError].filter(Boolean)
  const unavailable = projectsStatus === 'failed'

  const choose = (item) => {
    const next = [item.key, ...recent.filter((key) => key !== item.key)].slice(0, 5)
    setRecent(next)
    try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* Search remains functional. */ }
    setQuery('')
    setDeferredQuery('')
    setActiveIndex(-1)
    onClose()
  }

  const clearRecent = () => {
    setRecent([])
    try { window.localStorage.removeItem(RECENT_KEY) } catch { /* Keep search usable without storage. */ }
    setActiveIndex(-1)
  }

  const close = () => {
    setQuery('')
    setDeferredQuery('')
    setActiveIndex(-1)
    onClose()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Tab') {
      const elements = Array.from(panelRef.current?.querySelectorAll('input, button, a[href]') ?? [])
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (displayed.length === 0) return
      setActiveIndex((current) => event.key === 'ArrowDown'
        ? (current + 1) % displayed.length
        : (current - 1 + displayed.length) % displayed.length)
      inputRef.current?.focus()
    }
    if (event.key === 'Enter' && document.activeElement === inputRef.current && displayed.length > 0) {
      event.preventDefault()
      const chosen = displayed[Math.max(0, activeIndex)]
      if (chosen) {
        choose(chosen)
        navigate(chosen.href)
      }
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className={styles.layer}>
      <button type="button" className={styles.backdrop} aria-label="Close search" tabIndex={-1} onClick={close} />
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="global-search-title" ref={panelRef} onKeyDown={handleKeyDown}>
        <div className={styles.header}>
          <div><span className={styles.eyebrow}>Find anything</span><h2 id="global-search-title">Search portfolio</h2></div>
          <button type="button" className={styles.close} onClick={close} aria-label="Close search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
          </button>
        </div>
        <label className={styles.field}>
          <span className={styles.searchSymbol} aria-hidden="true">⌕</span>
          <input ref={inputRef} type="search" value={query} placeholder="Search projects, risks, actions…" aria-label="Search across portfolio"
            role="combobox" aria-autocomplete="list" aria-expanded={displayed.length > 0} aria-controls="global-search-results"
            aria-activedescendant={activeIndex >= 0 && displayed[activeIndex] ? `search-option-${activeIndex}` : undefined}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1) }} />
          <span className={styles.shortcut}>ESC</span>
        </label>
        {!searching && displayed.length > 0 ? (
          <div className={styles.recentToolbar}>
            <span>Recent items</span>
            <button type="button" onClick={clearRecent}>Clear recent</button>
          </div>
        ) : null}
        <div className={styles.results} id="global-search-results" role="listbox" aria-label="Portfolio search results">
          {unavailable ? (
            <p className={styles.message} role="alert">Projects could not be loaded. Search is unavailable. <button type="button" onClick={() => dispatch(loadProjects())}>Retry</button></p>
          ) : (
            <>
              {errors.length ? <p className={styles.warning} role="status">Some sources could not be loaded. Results may be incomplete.</p> : null}
              {isDebouncing || (loading && displayed.length === 0) ? <p className={styles.message} role="status">Searching your workspace…</p> : null}
              {!loading && !isDebouncing && displayed.length === 0 ? (
                <p className={styles.message}>{searching ? 'No matching records in the active portfolio.' : 'No recent items yet. Start typing to search.'}</p>
              ) : null}
              {SEARCH_GROUPS.map((group) => {
                const items = displayed.map((item, index) => ({ ...item, index })).filter((item) => item.type === group.type)
                if (items.length === 0) return null
                return (
                  <div key={group.type} className={styles.group} role="group" aria-label={searching ? group.label : 'Recent items'}>
                    <h3>{searching ? group.label : 'Recent · ' + group.label}</h3>
                    {items.map((item) => (
                      <Link role="option" id={`search-option-${item.index}`} aria-selected={activeIndex === item.index} key={item.key}
                        className={`${styles.result} ${activeIndex === item.index ? styles.selected : ''}`} to={item.href} onClick={() => choose(item)}>
                        <span><strong>{item.title}</strong><small>{item.type === 'projects' ? item.detail : `${item.projectName} · ${item.detail}`}</small></span>
                        <span aria-hidden="true">↗</span>
                      </Link>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
        <footer className={styles.footer}>↑ ↓ to navigate <span>·</span> Enter to open <span>·</span> Esc to close</footer>
      </section>
    </div>,
    document.body,
  )
}
