import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  selectProjectsViewMode,
  selectProjectsViewModeError,
  updateProjectsViewMode,
} from '../../features/preferences/model/preferencesSlice.js'
import {
  clearProjectMutationState,
  deleteProject,
  loadProjects,
  restoreProject,
  selectActiveProjects,
  selectArchivedProjects,
  selectProjectMutationError,
  selectProjectsError,
  selectProjectsStatus,
} from '../../features/projects/model/projectsSlice.js'
import {
  loadSuccessCriteria,
  selectSuccessCriteria,
  selectSuccessCriteriaError,
  selectSuccessCriteriaStatus,
} from '../../features/successCriteria/model/successCriteriaSlice.js'
import {
  loadRisks,
  selectRisks,
  selectRisksError,
  selectRisksStatus,
} from '../../features/risks/model/risksSlice.js'
import {
  loadMilestones,
  selectMilestones,
  selectMilestonesError,
  selectMilestonesStatus,
} from '../../features/milestones/model/milestonesSlice.js'
import {
  loadManagementActions,
  selectManagementActions,
  selectManagementActionsError,
  selectManagementActionsStatus,
} from '../../features/managementActions/model/managementActionsSlice.js'
import {
  loadEvm,
  selectEvmError,
  selectEvmStatus,
} from '../../features/evm/model/evmSlice.js'
import {
  buildPortfolioProjectHealth,
  summarizePortfolioHealth,
} from '../../features/dashboard/lib/portfolioHealth.js'
import {
  formatProjectDate,
  formatProjectTimestamp,
  getProjectStatusLabel,
} from '../../features/projects/lib/projectPresentation.js'
import { DeleteProjectDialog } from '../../features/projects/ui/DeleteProjectDialog.jsx'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import { getDailyInsight } from './dailyInsights.js'
import styles from './ProjectsPage.module.css'

const DELETION_TOAST_KEY = 'helmsight:project-deleted-toast'

const PROJECT_VIEWS = Object.freeze({
  active: 'active',
  archived: 'archived',
})

const DISPLAY_MODES = Object.freeze({
  grid: 'grid',
  list: 'list',
})

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  )
}

function getPortfolioGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function ProjectsHeroBanner({ activeProjectsCount, onViewProjects }) {
  const activeProjectLabel = activeProjectsCount === 1 ? 'active project' : 'active projects'
  const greeting = getPortfolioGreeting()
  const dailyInsight = getDailyInsight()

  return (
    <section className={styles.projectsHero} aria-labelledby="projects-hero-title">
      <div className={styles.heroRibs} aria-hidden="true" />
      <div className={styles.heroSwoop} aria-hidden="true" />
      <div className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.projectsHeroMain}>
        <span className={styles.projectsHeroEyebrow}>Portfolio briefing</span>
        <h2 id="projects-hero-title">{greeting}.</h2>
        <p>
          You have <strong>{activeProjectsCount}</strong> {activeProjectLabel} in the portfolio.
          Keep delivery context visible and move from signal to decision with less noise.
        </p>

        <div className={styles.projectsHeroActions}>
          <button
            className={styles.projectsHeroPrimary}
            type="button"
            aria-controls="projects-portfolio"
            onClick={onViewProjects}
          >
            View projects <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <aside className={styles.dailyInsight} aria-label="Daily insight">
        <span>Daily insight</span>
        <blockquote>“{dailyInsight.quote}”</blockquote>
        <p>— {dailyInsight.author}</p>
      </aside>
    </section>
  )
}

function PortfolioHealthBadge({ health, compact = false }) {
  const status = health?.status ?? 'notAssessed'
  const label = health?.label ?? 'Not assessed'
  const details = Number.isFinite(health?.attentionCount) && Number.isFinite(health?.watchCount)
    ? `${health.attentionCount} need action · ${health.watchCount} watch`
    : status === 'loading'
      ? 'Project-control signals are loading.'
      : status === 'unavailable'
        ? 'One or more project-control sources are unavailable.'
        : 'No project-control data has been assessed yet.'

  return (
    <span
      className={`${styles.healthBadge} ${styles[`health_${status}`] ?? ''}`}
      title={`${label}. ${details}`}
    >
      {compact ? label : `Health · ${label}`}
    </span>
  )
}

function ProjectActions({ project, archived, onRestore, onDelete }) {
  return (
    <div
      className={
        archived
          ? `${styles.projectActions} ${styles.archivedActions}`
          : styles.projectActions
      }
    >
      <Link className={styles.cardLink} data-ui-button="secondary" data-ui-size="sm" to={`/projects/${project.id}`}>
        Open project <span aria-hidden="true">→</span>
      </Link>
      {archived ? (
        <button
          className={styles.restoreButton} data-ui-button="secondary" data-ui-size="sm"
          type="button"
          onClick={() => onRestore(project.id)}
        >
          Restore
        </button>
      ) : null}
      {archived ? (
        <button
          className={`${styles.restoreButton} ${styles.deleteButton}`}
          data-ui-button="danger"
          data-ui-size="sm"
          type="button"
          onClick={() => onDelete(project)}
        >
          Delete permanently
        </button>
      ) : null}
    </div>
  )
}

function ProjectCard({ project, archived = false, onRestore, onDelete, health }) {
  const cardClassName = archived
    ? `${styles.projectCard} ${styles.archivedProjectCard}`
    : styles.projectCard

  return (
    <article className={cardClassName}>
      <div className={styles.cardTopline}>
        <span className={styles.statusBadge}>
          {archived ? 'Archived' : getProjectStatusLabel(project.status)}
        </span>
        {!archived ? <PortfolioHealthBadge health={health} /> : null}
      </div>

      <div className={styles.projectIdentity}>
        <h2 className={styles.projectTitle}>{project.name}</h2>
        <p className={styles.client}>{project.clientContext}</p>
      </div>

      <p className={styles.description}>
        {project.description || 'No project description has been added yet.'}
      </p>

      <dl className={styles.metaGrid}>
        <div>
          <dt>Start</dt>
          <dd>{formatProjectDate(project.startDate)}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{formatProjectDate(project.targetEndDate)}</dd>
        </div>
        <div>
          <dt>{archived ? 'Archived' : 'Updated'}</dt>
          <dd>
            {archived
              ? formatProjectTimestamp(project.archivedAt)
              : formatProjectTimestamp(project.updatedAt)}
          </dd>
        </div>
      </dl>

      <ProjectActions project={project} archived={archived} onRestore={onRestore} onDelete={onDelete} />
    </article>
  )
}

function ProjectListRow({ project, archived = false, onRestore, onDelete, health }) {
  const metaClassName = archived
    ? `${styles.listMeta} ${styles.listMetaArchived}`
    : `${styles.listMeta} ${styles.listMetaActive}`

  return (
    <article className={styles.projectListRow}>
      <div className={styles.listIdentity}>
        <div className={styles.listTitleLine}>
          <span className={styles.statusBadge}>
            {archived ? 'Archived' : getProjectStatusLabel(project.status)}
          </span>
          <h3>{project.name}</h3>
        </div>
        <p className={styles.listClient}>{project.clientContext}</p>
        <p className={styles.listDescription}>
          {project.description || 'No project description has been added yet.'}
        </p>
      </div>

      <dl className={metaClassName}>
        {!archived ? (
          <div className={styles.listHealthMeta}>
            <dt>Health</dt>
            <dd><PortfolioHealthBadge health={health} compact /></dd>
          </div>
        ) : null}
        <div className={styles.listStartMeta}>
          <dt>Start</dt>
          <dd>{formatProjectDate(project.startDate)}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{formatProjectDate(project.targetEndDate)}</dd>
        </div>
        <div>
          <dt>{archived ? 'Archived' : 'Updated'}</dt>
          <dd>
            {archived
              ? formatProjectTimestamp(project.archivedAt)
              : formatProjectTimestamp(project.updatedAt)}
          </dd>
        </div>
      </dl>

      <ProjectActions project={project} archived={archived} onRestore={onRestore} onDelete={onDelete} />
    </article>
  )
}

function ProjectDisplayModes({ mode, onChange }) {
  return (
    <div className={styles.displayModes} role="group" aria-label="Project display mode">
      <button
        type="button"
        className={mode === DISPLAY_MODES.grid ? styles.activeDisplayMode : undefined}
        aria-label="Grid view"
        aria-pressed={mode === DISPLAY_MODES.grid}
        onClick={() => onChange(DISPLAY_MODES.grid)}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className={mode === DISPLAY_MODES.list ? styles.activeDisplayMode : undefined}
        aria-label="List view"
        aria-pressed={mode === DISPLAY_MODES.list}
        onClick={() => onChange(DISPLAY_MODES.list)}
      >
        <ListIcon />
      </button>
    </div>
  )
}

function ProjectViewTabs({ activeView, activeCount, archivedCount, onChange }) {
  return (
    <div className={styles.viewTabs} role="tablist" aria-label="Project lifecycle view">
      <button
        id="active-projects-tab"
        type="button"
        role="tab"
        aria-selected={activeView === PROJECT_VIEWS.active}
        aria-controls="active-projects-panel"
        className={activeView === PROJECT_VIEWS.active ? styles.activeTab : undefined}
        onClick={() => onChange(PROJECT_VIEWS.active)}
      >
        <span>Active</span>
        <strong>{activeCount}</strong>
      </button>
      <button
        id="archived-projects-tab"
        type="button"
        role="tab"
        aria-selected={activeView === PROJECT_VIEWS.archived}
        aria-controls="archived-projects-panel"
        className={activeView === PROJECT_VIEWS.archived ? styles.activeTab : undefined}
        onClick={() => onChange(PROJECT_VIEWS.archived)}
      >
        <span>Archived</span>
        <strong>{archivedCount}</strong>
      </button>
    </div>
  )
}

function ProjectsCollection({ projects, displayMode, archived = false, onRestore, onDelete, healthByProject = {} }) {
  if (displayMode === DISPLAY_MODES.list) {
    return (
      <div className={styles.projectList}>
        {projects.map((project) => (
          <ProjectListRow
            key={project.id}
            project={project}
            archived={archived}
            onRestore={onRestore}
            onDelete={onDelete}
            health={healthByProject[project.id]}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.projectGrid}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          archived={archived}
          onRestore={onRestore}
          onDelete={onDelete}
          health={healthByProject[project.id]}
        />
      ))}
    </div>
  )
}

export function ProjectsPage() {
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectProjectsStatus)
  const error = useAppSelector(selectProjectsError)
  const mutationError = useAppSelector(selectProjectMutationError)
  const viewModeError = useAppSelector(selectProjectsViewModeError)
  const displayMode = useAppSelector(selectProjectsViewMode)
  const activeProjects = useAppSelector(selectActiveProjects)
  const archivedProjects = useAppSelector(selectArchivedProjects)
  const criteria = useAppSelector(selectSuccessCriteria)
  const criteriaStatus = useAppSelector(selectSuccessCriteriaStatus)
  const criteriaError = useAppSelector(selectSuccessCriteriaError)
  const risks = useAppSelector(selectRisks)
  const risksStatus = useAppSelector(selectRisksStatus)
  const risksError = useAppSelector(selectRisksError)
  const milestones = useAppSelector(selectMilestones)
  const milestonesStatus = useAppSelector(selectMilestonesStatus)
  const milestonesError = useAppSelector(selectMilestonesError)
  const actions = useAppSelector(selectManagementActions)
  const actionsStatus = useAppSelector(selectManagementActionsStatus)
  const actionsError = useAppSelector(selectManagementActionsError)
  const evmStatus = useAppSelector(selectEvmStatus)
  const evmError = useAppSelector(selectEvmError)
  const evmBaselines = useAppSelector((state) => state.evm.baselines)
  const evmSnapshots = useAppSelector((state) => state.evm.snapshots)
  const [searchParams, setSearchParams] = useSearchParams()
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [deletionToast, setDeletionToast] = useState(() => {
    try {
      return window.sessionStorage.getItem(DELETION_TOAST_KEY) === '1'
        ? 'Project deleted permanently.'
        : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      window.sessionStorage.removeItem(DELETION_TOAST_KEY)
    } catch {
      // Notifications must never prevent the application from loading.
    }
  }, [])
  const activeView =
    searchParams.get('view') === PROJECT_VIEWS.archived
      ? PROJECT_VIEWS.archived
      : PROJECT_VIEWS.active

  useEffect(() => {
    if (status === 'idle') dispatch(loadProjects())
    if (criteriaStatus === 'idle') dispatch(loadSuccessCriteria())
    if (risksStatus === 'idle') dispatch(loadRisks())
    if (milestonesStatus === 'idle') dispatch(loadMilestones())
    if (actionsStatus === 'idle') dispatch(loadManagementActions())
    if (evmStatus === 'idle') dispatch(loadEvm())
  }, [
    actionsStatus,
    criteriaStatus,
    dispatch,
    evmStatus,
    milestonesStatus,
    risksStatus,
    status,
  ])

  const portfolioHealthStatuses = [
    criteriaStatus,
    risksStatus,
    milestonesStatus,
    actionsStatus,
    evmStatus,
  ]
  const portfolioHealthErrors = [
    criteriaError,
    risksError,
    milestonesError,
    actionsError,
    evmError,
  ].filter(Boolean)
  const isPortfolioHealthReady = portfolioHealthStatuses.every((item) => item === 'succeeded')
  const isPortfolioHealthLoading = portfolioHealthStatuses.some(
    (item) => item === 'idle' || item === 'loading',
  )
  const portfolioHealthByProject = useMemo(
    () => isPortfolioHealthReady
      ? buildPortfolioProjectHealth({
          projects: activeProjects,
          criteria,
          risks,
          milestones,
          actions,
          baselines: evmBaselines,
          snapshots: evmSnapshots,
        })
      : {},
    [
      actions,
      activeProjects,
      criteria,
      evmBaselines,
      evmSnapshots,
      isPortfolioHealthReady,
      milestones,
      risks,
    ],
  )
  const portfolioHealthSummary = useMemo(
    () => summarizePortfolioHealth(portfolioHealthByProject),
    [portfolioHealthByProject],
  )
  const displayedPortfolioHealth = isPortfolioHealthLoading
    ? Object.fromEntries(activeProjects.map((project) => [project.id, { status: 'loading', label: 'Loading' }]))
    : portfolioHealthErrors.length > 0
      ? Object.fromEntries(activeProjects.map((project) => [project.id, { status: 'unavailable', label: 'Unavailable' }]))
      : portfolioHealthByProject

  const handleProjectViewChange = (nextView) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextView === PROJECT_VIEWS.archived) {
      nextSearchParams.set('view', PROJECT_VIEWS.archived)
    } else {
      nextSearchParams.delete('view')
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleRestore = async (projectId) => {
    try {
      await dispatch(restoreProject(projectId)).unwrap()
      handleProjectViewChange(PROJECT_VIEWS.active)
    } catch {
      // The rejected thunk already exposes a user-facing error through Redux state.
    }
  }

  const handleDeleteRequest = (project) => {
    dispatch(clearProjectMutationState())
    setProjectToDelete(project)
  }

  const handleDelete = async ({ projectId, confirmationName }) => {
    let requiresReload

    try {
      await dispatch(deleteProject({ projectId, confirmationName })).unwrap()
      requiresReload = true

      try {
        window.sessionStorage.setItem(DELETION_TOAST_KEY, '1')
      } catch {
        // A notification storage failure must not prevent the reload.
      }
    } catch {
      try {
        requiresReload =
          storageAdapter.read('pendingProjectDeletion') !== null
      } catch {
        // If journal state cannot be read, recover before continuing.
        requiresReload = true
      }
    }

    if (requiresReload) {
      window.location.reload()
      return
    }

    // Redux exposes the rejected deletion error in Portfolio.
    setProjectToDelete(null)
  }

  const handleDisplayModeChange = (nextMode) => {
    if (nextMode !== displayMode) {
      dispatch(updateProjectsViewMode(nextMode))
    }
  }

  const handleViewProjects = () => {
    if (activeView !== PROJECT_VIEWS.active) {
      handleProjectViewChange(PROJECT_VIEWS.active)
    }

    const portfolioSection = document.getElementById('projects-portfolio')

    if (!portfolioSection) return

    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    ) || 16
    const stickyHeaderOffset = 4.5 * rootFontSize
    const contentGap = 1.25 * rootFontSize
    const targetTop =
      portfolioSection.getBoundingClientRect().top +
      window.scrollY -
      stickyHeaderOffset -
      contentGap

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    })
  }

  return (
    <section className={styles.root}>
      <StatusToast
        message={deletionToast}
        onDismiss={() => setDeletionToast(null)}
      />
      <ProjectsHeroBanner
        activeProjectsCount={activeProjects.length}
        onViewProjects={handleViewProjects}
      />

      <header className={styles.header} data-ui-page-header id="projects-portfolio">
        <span className={styles.eyebrow}>Portfolio</span>
        <div data-ui-page-title-row>
          <h1>Projects</h1>
          <Link className={styles.primaryButton} data-ui-button="primary" to="/projects/new">
            New project
          </Link>
        </div>
        <p>Keep delivery context, dates, and project state in one place before adding deeper control signals.</p>
      </header>

      <div className={styles.summaryStrip} aria-label="Project summary">
        <div>
          <span>Active projects</span>
          <strong>{activeProjects.length}</strong>
        </div>
        <div>
          <span>Archived</span>
          <strong>{archivedProjects.length}</strong>
        </div>
        <div>
          <span>Needs attention</span>
          <strong>{isPortfolioHealthReady ? portfolioHealthSummary.attention : '—'}</strong>
        </div>
      </div>

      {mutationError ? (
        <div className={styles.inlineError} role="alert">
          {mutationError}
        </div>
      ) : null}

      {portfolioHealthErrors.length > 0 ? (
        <div className={styles.portfolioHealthWarning} role="alert">
          <strong>Portfolio health is temporarily unavailable.</strong>
          <span>Projects remain accessible while control-signal data is reloaded.</span>
        </div>
      ) : null}

      {status === 'idle' || status === 'loading' ? (
        <div className={styles.stateCard} aria-live="polite">
          <span className={styles.stateEyebrow}>Workspace</span>
          <h2>Loading projects…</h2>
          <p>Restoring your local HelmSight workspace.</p>
        </div>
      ) : null}

      {status === 'failed' ? (
        <div className={styles.stateCard} role="alert">
          <span className={styles.stateEyebrow}>Unable to load</span>
          <h2>Project data is unavailable.</h2>
          <p>{error}</p>
          <button type="button" onClick={() => dispatch(loadProjects())}>
            Try again
          </button>
        </div>
      ) : null}

      {status === 'succeeded' ? (
        <div className={styles.projectsSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>Project lifecycle</span>
              <h2>{activeView === PROJECT_VIEWS.active ? 'Active portfolio' : 'Archived projects'}</h2>
            </div>
            <div className={styles.portfolioControls}>
              <ProjectDisplayModes mode={displayMode} onChange={handleDisplayModeChange} />
              <ProjectViewTabs
                activeView={activeView}
                activeCount={activeProjects.length}
                archivedCount={archivedProjects.length}
                onChange={handleProjectViewChange}
              />
            </div>
          </div>

          {viewModeError ? (
            <p className={styles.viewModeError} role="status">
              View preference could not be saved.
            </p>
          ) : null}

          {activeView === PROJECT_VIEWS.active ? (
            <div
              id="active-projects-panel"
              className={styles.projectPanel}
              role="tabpanel"
              aria-labelledby="active-projects-tab"
            >
              {activeProjects.length > 0 ? (
                <ProjectsCollection
                  projects={activeProjects}
                  displayMode={displayMode}
                  onRestore={handleRestore}
                  healthByProject={displayedPortfolioHealth}
                />
              ) : (
                <div className={styles.stateCard}>
                  <span className={styles.stateEyebrow}>No active projects</span>
                  <h2>Create your next delivery workspace.</h2>
                  <p>Archived projects remain preserved in the Archived view.</p>
                  <Link to="/projects/new">Create project</Link>
                </div>
              )}
            </div>
          ) : (
            <div
              id="archived-projects-panel"
              className={styles.projectPanel}
              role="tabpanel"
              aria-labelledby="archived-projects-tab"
            >
              {archivedProjects.length > 0 ? (
                <ProjectsCollection
                  projects={archivedProjects}
                  displayMode={displayMode}
                  archived
                  onRestore={handleRestore}
                  onDelete={handleDeleteRequest}
                  healthByProject={displayedPortfolioHealth}
                />
              ) : (
                <div className={styles.stateCard}>
                  <span className={styles.stateEyebrow}>Archive is clear</span>
                  <h2>No archived projects.</h2>
                  <p>Projects moved out of active delivery will stay preserved here until restored.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      {projectToDelete ? (
        <DeleteProjectDialog
          project={projectToDelete}
          onCancel={() => setProjectToDelete(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </section>
  )
}
