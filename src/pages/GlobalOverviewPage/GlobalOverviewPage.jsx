import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { PortfolioWelcomeBanner } from '../../features/dashboard/ui/PortfolioWelcomeBanner.jsx'
import { loadProjects, selectProjects, selectProjectsStatus, selectProjectsError } from '../../features/projects/model/projectsSlice.js'
import { loadSuccessCriteria, selectSuccessCriteria, selectSuccessCriteriaStatus, selectSuccessCriteriaError } from '../../features/successCriteria/model/successCriteriaSlice.js'
import { loadRisks, selectRisks, selectRisksStatus, selectRisksError } from '../../features/risks/model/risksSlice.js'
import { loadMilestones, selectMilestones, selectMilestonesStatus, selectMilestonesError } from '../../features/milestones/model/milestonesSlice.js'
import { loadManagementActions, selectManagementActions, selectManagementActionsStatus, selectManagementActionsError } from '../../features/managementActions/model/managementActionsSlice.js'
import { loadEvm, selectEvmStatus, selectEvmError } from '../../features/evm/model/evmSlice.js'
import { deriveAttentionDrivers, deriveGlobalOverview } from './globalOverview.js'
import styles from './GlobalOverviewPage.module.css'

const SIGNALS_PER_PAGE = 4

function formatDate(value) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

export function GlobalOverviewPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const projectsError = useAppSelector(selectProjectsError)
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
  const baselines = useAppSelector((state) => state.evm.baselines)
  const snapshots = useAppSelector((state) => state.evm.snapshots)
  const [visibleSignals, setVisibleSignals] = useState(SIGNALS_PER_PAGE)
  const [activeSource, setActiveSource] = useState(null)

  useEffect(() => {
    if (projectsStatus === 'idle') dispatch(loadProjects())
    if (criteriaStatus === 'idle') dispatch(loadSuccessCriteria())
    if (risksStatus === 'idle') dispatch(loadRisks())
    if (milestonesStatus === 'idle') dispatch(loadMilestones())
    if (actionsStatus === 'idle') dispatch(loadManagementActions())
    if (evmStatus === 'idle') dispatch(loadEvm())
  }, [dispatch, projectsStatus, criteriaStatus, risksStatus, milestonesStatus, actionsStatus, evmStatus])

  const statuses = [projectsStatus, criteriaStatus, risksStatus, milestonesStatus, actionsStatus, evmStatus]
  const errors = [projectsError, criteriaError, risksError, milestonesError, actionsError, evmError].filter(Boolean)
  const loading = statuses.some((status) => status === 'idle' || status === 'loading')
  const failed = statuses.some((status) => status === 'failed')
  const ready = !loading && !failed && statuses.every((status) => status === 'succeeded')

  const overview = useMemo(() => ready ? deriveGlobalOverview({
    projects, criteria, risks, milestones, actions, baselines, snapshots,
  }) : null, [ready, projects, criteria, risks, milestones, actions, baselines, snapshots])

  const activeSignals = overview?.signals ?? []
  const attentionDrivers = deriveAttentionDrivers(activeSignals)
  const maxDriverCount = Math.max(1, ...attentionDrivers.map((driver) => driver.total))
  const filteredSignals = activeSource
    ? activeSignals.filter((signal) => signal.module === activeSource)
    : activeSignals
  const affectedCount = overview?.projectsNeedingAttention.length ?? 0
  const urgentCount = activeSignals.filter((signal) => signal.state === 'attention').length
  const watchCount = activeSignals.filter((signal) => signal.state === 'watch').length
  const chooseSource = (module) => {
    setActiveSource((current) => current === module ? null : module)
    setVisibleSignals(SIGNALS_PER_PAGE)
  }
  const metrics = [
    { label: 'Needs action', value: urgentCount, detail: 'Priority signals', tone: 'attention' },
    { label: 'On watch', value: watchCount, detail: 'Early warnings', tone: 'watch' },
    { label: 'Projects affected', value: affectedCount, detail: `Of ${overview?.activeCount ?? 0} active projects`, tone: 'neutral' },
  ]

  return (
    <section className={styles.root} aria-labelledby="overview-title">
      <PortfolioWelcomeBanner />
      <header className={styles.header} data-ui-page-header>
        <span className={styles.eyebrow}>Portfolio intelligence</span>
        <div className={styles.headingRow} data-ui-page-title-row>
          <h1 id="overview-title">Global Overview</h1>
          <Link className={styles.headerLink} data-ui-button="secondary" data-ui-size="sm" to="/projects">
            All projects <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <p>Portfolio-wide priorities and delivery exceptions, with direct links to the source.</p>
      </header>

      {loading ? <div className={styles.state} role="status">Loading portfolio intelligence…</div> : null}
      {failed ? (
        <div className={styles.state} role="alert">
          <strong>Portfolio intelligence is unavailable.</strong>
          <p>{errors.join(' ') || 'One or more project-control sources could not be loaded.'}</p>
          <button type="button" onClick={() => {
            if (projectsStatus === 'failed') dispatch(loadProjects())
            if (criteriaStatus === 'failed') dispatch(loadSuccessCriteria())
            if (risksStatus === 'failed') dispatch(loadRisks())
            if (milestonesStatus === 'failed') dispatch(loadMilestones())
            if (actionsStatus === 'failed') dispatch(loadManagementActions())
            if (evmStatus === 'failed') dispatch(loadEvm())
          }}>Try again</button>
        </div>
      ) : null}

      {overview ? (
        <>
          <div className={styles.metrics} aria-label="Portfolio attention summary">
            {metrics.map(({ label, value, detail, tone }) => (
              <article className={`${styles.metric} ${styles[tone]}`} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          {overview.activeCount === 0 ? (
            <div className={styles.state}>
              <h2>No active projects yet</h2>
              <p>Create a project to start tracking portfolio-wide delivery signals.</p>
              <Link to="/projects/new">Create a project ↗</Link>
            </div>
          ) : (
            <>
              <div className={styles.insightGrid}>
                <section className={styles.panel} aria-labelledby="drivers-title">
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>Portfolio intelligence</span>
                      <h2 id="drivers-title">Attention drivers</h2>
                      <p>Sources of attention and watch signals across active projects.</p>
                    </div>
                  </div>
                  <div className={styles.driverLegend} aria-label="Chart legend">
                    <span><i className={styles.legendAttention} aria-hidden="true" />Needs action</span>
                    <span><i className={styles.legendWatch} aria-hidden="true" />Watch</span>
                  </div>
                  <div className={styles.driverList} role="group" aria-label="Filter signals by source">
                    {attentionDrivers.map((driver) => (
                      <button
                        key={driver.module}
                        type="button"
                        className={`${styles.driverRow} ${activeSource === driver.module ? styles.driverSelected : ''}`}
                        aria-pressed={activeSource === driver.module}
                        onClick={() => chooseSource(driver.module)}
                        disabled={driver.total === 0}
                      >
                        <span className={styles.driverHeading}>
                          <span>{driver.label}</span>
                          <strong>{driver.total}</strong>
                        </span>
                        <span className={styles.driverTrack} aria-hidden="true">
                          <span className={styles.driverAttention} style={{ width: `${driver.attention / maxDriverCount * 100}%` }} />
                          <span className={styles.driverWatch} style={{ width: `${driver.watch / maxDriverCount * 100}%` }} />
                        </span>
                        <span className={styles.driverDetails}>
                          {driver.attention} need action · {driver.watch} watch
                        </span>
                      </button>
                    ))}
                  </div>
                  {activeSource ? (
                    <button className={styles.clearFilter} type="button" onClick={() => chooseSource(activeSource)}>
                      All sources ↗
                    </button>
                  ) : null}
                  {activeSignals.length === 0 ? <p className={styles.empty}>No active attention or watch signals to analyze.</p> : null}
                </section>
                <section className={styles.panel} aria-labelledby="signals-title">
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>Your decision queue</span>
                      <h2 id="signals-title">Priority signals</h2>
                      <p>{activeSource ? `Filtered by ${attentionDrivers.find((driver) => driver.module === activeSource)?.label}.` : 'Sorted by urgency and due date across active projects.'}</p>
                    </div>
                    <span className={styles.counter}>{filteredSignals.length} signals</span>
                  </div>
                  {filteredSignals.length === 0 ? (
                    <p className={styles.empty}>No urgent or watch signals right now. Projects without control data remain unassessed.</p>
                  ) : (
                    <>
                      <ul className={styles.signalList}>
                        {filteredSignals.slice(0, visibleSignals).map((signal) => (
                          <li key={`${signal.projectId}:${signal.id}`}>
                            <Link className={styles.signalLink} to={signal.href}>
                              <span className={styles.signalBody}>
                                <span className={styles.signalMeta}>{signal.module} · {signal.projectName}</span>
                                <strong>{signal.title}</strong>
                                <small>{signal.detail}{signal.date ? ` · ${formatDate(signal.date)}` : ''}</small>
                              </span>
                              <span className={`${styles.status} ${styles[signal.state]}`}>
                                {signal.state === 'attention' ? 'Attention' : 'Watch'}
                              </span>
                              <span className={styles.arrow} aria-hidden="true">↗</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {visibleSignals < filteredSignals.length ? (
                        <button className={styles.moreButton} type="button" onClick={() => setVisibleSignals((count) => count + SIGNALS_PER_PAGE)}>
                          Show more signals
                        </button>
                      ) : null}
                    </>
                  )}
                </section>
              </div>
              <div className={styles.lowerGrid}>
                <section className={styles.panel} aria-labelledby="affected-title">
                  <div className={styles.sectionHeading}>
                    <div><span className={styles.eyebrow}>Where to focus</span><h2 id="affected-title">Affected projects</h2></div>
                  </div>
                  {affectedCount === 0 ? <p className={styles.empty}>No assessed projects need immediate attention.</p> : (
                    <ul className={styles.projectList}>
                      {overview.projectsNeedingAttention.slice(0, 5).map((project) => (
                        <li key={project.id}>
                          <Link to={project.href} className={styles.projectLink}>
                            <span><strong>{project.name}</strong><small>{project.attentionCount} attention · {project.watchCount} watch</small></span>
                            <span className={`${styles.status} ${styles[project.health]}`}>{project.healthLabel}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link className={styles.panelFooter} to="/projects">View portfolio ↗</Link>
                </section>
                <section className={styles.panel} aria-labelledby="deadlines-title">
                  <div className={styles.sectionHeading}>
                    <div><span className={styles.eyebrow}>Looking ahead</span><h2 id="deadlines-title">Upcoming milestones</h2></div>
                  </div>
                  {overview.upcomingMilestones.length === 0 ? <p className={styles.empty}>No upcoming milestones in the next 30 days.</p> : (
                    <ul className={styles.projectList}>
                      {overview.upcomingMilestones.map((item) => (
                        <li key={`${item.projectId}:${item.id}`}>
                          <Link to={item.href} className={styles.projectLink}>
                            <span><strong>{item.title}</strong><small>{item.projectName}</small></span>
                            <time dateTime={item.targetDate}>{formatDate(item.targetDate)}</time>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      ) : null}
    </section>
  )
}
