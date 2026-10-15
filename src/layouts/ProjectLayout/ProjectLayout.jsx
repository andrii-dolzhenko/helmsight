import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  loadProjects,
  selectProjectById,
  selectProjectsError,
  selectProjectsStatus,
} from '../../features/projects/model/projectsSlice.js'
import { getProjectStatusLabel } from '../../features/projects/lib/projectPresentation.js'
import styles from './ProjectLayout.module.css'

const sections = [
  { label: 'Overview', path: '' },
  { label: 'Governance', path: 'governance' },
  { label: 'Success Criteria', path: 'success-criteria' },
  { label: 'Risks', path: 'risks' },
  { label: 'Milestones', path: 'milestones' },
  { label: 'Metrics', path: 'metrics' },
  { label: 'Reports', path: 'reports' },
  { label: 'Actions', path: 'actions' },
  { label: 'Meetings', path: 'meetings' },
  { label: 'Lessons Learned', path: 'lessons' },
]

export function ProjectLayout() {
  const { projectId } = useParams()
  const { pathname } = useLocation()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectProjectsStatus)
  const error = useAppSelector(selectProjectsError)
  const project = useAppSelector((state) => selectProjectById(state, projectId))
  const basePath = `/projects/${projectId}`
  const isRiskDetailRoute = new RegExp(`^${basePath}/risks/[^/]+$`).test(pathname)
  const tabsRef = useRef(null)

  useEffect(() => {
    if (status === 'idle') {
      dispatch(loadProjects())
    }
  }, [dispatch, status])

  useEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return undefined

    let frameId = null
    const centerActiveTab = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        if (tabs.scrollWidth <= tabs.clientWidth) {
          tabs.scrollLeft = 0
          return
        }

        const activeTab = tabs.querySelector('[aria-current="page"]')
        if (!activeTab) return

        const maxLeft = Math.max(0, tabs.scrollWidth - tabs.clientWidth)
        const targetLeft = Math.min(
          maxLeft,
          Math.max(0, activeTab.offsetLeft - (tabs.clientWidth - activeTab.offsetWidth) / 2),
        )

        if (typeof tabs.scrollTo === 'function') {
          tabs.scrollTo({ left: targetLeft, behavior: 'auto' })
        } else {
          tabs.scrollLeft = targetLeft
        }
      })
    }

    centerActiveTab()
    window.addEventListener('resize', centerActiveTab)

    const resizeObserver = typeof window.ResizeObserver === 'function'
      ? new window.ResizeObserver(centerActiveTab)
      : null
    resizeObserver?.observe(tabs)

    return () => {
      window.removeEventListener('resize', centerActiveTab)
      resizeObserver?.disconnect()
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [pathname])

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading project workspace…</div>
  }

  if (status === 'failed') {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Project workspace could not be loaded.</strong>
        <span>{error}</span>
        <button type="button" onClick={() => dispatch(loadProjects())}>
          Try again
        </button>
      </div>
    )
  }

  if (!project) {
    return (
      <div className={styles.stateCard}>
        <strong>Project not found.</strong>
        <span>The requested project is not available in this local workspace.</span>
        <Link to="/projects">Return to projects</Link>
      </div>
    )
  }

  if (isRiskDetailRoute) {
    return (
      <div className={styles.focusedRoot}>
        <Outlet context={{ project }} />
      </div>
    )
  }

  return (
    <div className={styles.root} data-project-workspace="true">
      <header className={styles.header} data-print-hide="true">
        <div>
          <Link className={styles.backLink} to="/projects">
            Projects
          </Link>
          <span className={styles.eyebrow}>Project workspace</span>
          <h1 className={styles.title}>{project.name}</h1>
          <p className={styles.context}>{project.clientContext}</p>
        </div>
        <span className={`${styles.status} ${project.archivedAt ? styles.archived : ''}`}>
          {project.archivedAt ? 'Archived' : getProjectStatusLabel(project.status)}
        </span>
      </header>

      <nav ref={tabsRef} className={styles.tabs} aria-label="Project sections" data-print-hide="true">
        {sections.map((section) => (
          <NavLink
            key={section.label}
            end={section.path === ''}
            to={section.path ? `${basePath}/${section.path}` : basePath}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.active : ''}`
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ project }} />
    </div>
  )
}
