import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { loadProjects, selectProjects, selectProjectsError, selectProjectsStatus } from '../../features/projects/model/projectsSlice.js'
import { loadRisks, selectRisks, selectRisksError, selectRisksStatus } from '../../features/risks/model/risksSlice.js'
import { getRiskSeverity, calculateRiskScore, getRiskSeverityLabel, getRiskStatusLabel, RISK_SEVERITY, RISK_STATUSES } from '../../features/risks/lib/risks.js'
import { deriveGlobalRisksView, getRiskAttention, RISK_ATTENTION, RISK_SORT } from './globalRisks.js'
import styles from './GlobalRisksPage.module.css'

const PAGE_SIZE = 10
const attentionLabels = { [RISK_ATTENTION.OVERDUE]: 'Overdue', [RISK_ATTENTION.DUE_SOON]: 'Due soon', [RISK_ATTENTION.ON_TRACK]: 'On track', [RISK_ATTENTION.NO_DUE]: 'No due date' }
function formatDate(value) {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}
function initials(value) {
  const parts = String(value ?? '').trim().split(/\s+/u).filter(Boolean)
  return parts.length ? [parts[0], ...(parts.length > 1 ? [parts.at(-1)] : [])].map((s) => Array.from(s)[0].toUpperCase()).join('') : '?'
}
export function GlobalRisksPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const risks = useAppSelector(selectRisks)
  const projectsStatus = useAppSelector(selectProjectsStatus)
  const risksStatus = useAppSelector(selectRisksStatus)
  const projectsError = useAppSelector(selectProjectsError)
  const risksError = useAppSelector(selectRisksError)
  const [projectId, setProjectId] = useState('all')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [attention, setAttention] = useState('all')
  const [sort, setSort] = useState(RISK_SORT.EXPOSURE)
  const [includeArchivedProjects, setIncludeArchivedProjects] = useState(false)
  const [page, setPage] = useState(1)
  useEffect(() => { if (projectsStatus === 'idle') dispatch(loadProjects()) }, [dispatch, projectsStatus])
  useEffect(() => { if (risksStatus === 'idle') dispatch(loadRisks()) }, [dispatch, risksStatus])
  const view = useMemo(() => deriveGlobalRisksView({ projects, risks, projectId, query, status, severity, attention, sort, includeArchivedProjects }),
    [projects, risks, projectId, query, status, severity, attention, sort, includeArchivedProjects])
  const totalPages = Math.max(1, Math.ceil(view.visibleRisks.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visiblePage = view.visibleRisks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const reset = () => { setProjectId('all'); setQuery(''); setStatus('all'); setSeverity('all'); setAttention('all'); setIncludeArchivedProjects(false); setPage(1) }
  const change = (setter) => (event) => { setter(event.target.value); setPage(1) }
  const loading = ['idle', 'loading'].includes(projectsStatus) || ['idle', 'loading'].includes(risksStatus)
  const failed = projectsStatus === 'failed' || risksStatus === 'failed'
  if (loading) return <div className={styles.state} role="status">Loading portfolio risks…</div>
  if (failed) return <div className={styles.state} role="alert"><strong>Global Risks could not be loaded.</strong><p>{projectsError || risksError}</p><button type="button" onClick={() => { if (projectsStatus === 'failed') dispatch(loadProjects()); if (risksStatus === 'failed') dispatch(loadRisks()) }}>Try again</button></div>
  return <section className={styles.root} aria-labelledby="global-risks-title">
    <header className={styles.header}><span className={styles.eyebrow}>Portfolio oversight</span><h1 id="global-risks-title">Global Risks</h1><p>Project risks across your portfolio, prioritized by exposure and deadlines.</p></header>
    <div className={styles.summary} aria-label="Portfolio risk summary">
      {[["Active risks", view.summary.active, 'active'], ['High / Critical', view.summary.critical, 'critical'], ['Needs attention', view.summary.attention, 'attention'], ['Closed', view.summary.closed, 'closed']].map(([label, number, tone]) => <div className={styles.metric} data-tone={tone} key={label}><span>{label}</span><strong>{number}</strong></div>)}
    </div>
    <section className={styles.filterPanel} aria-labelledby="global-risk-filters"><div className={styles.filtersHeader}><span className={styles.eyebrow}>Portfolio filters</span><h2 id="global-risk-filters">Filters</h2></div>
      <div className={styles.filters} role="group" aria-label="Filter portfolio risks">
        <label className={styles.filter}><span>Search</span><input type="search" value={query} onChange={change(setQuery)} placeholder="Risk, project or owner" /></label>
        <label className={styles.filter}><span>Project</span><select value={projectId} onChange={change(setProjectId)}><option value="all">All projects</option>{[...view.eligibleProjects].sort((a,b)=>a.name.localeCompare(b.name)).map((project)=><option key={project.id} value={project.id}>{project.name}{project.archivedAt ? ' (Archived)' : ''}</option>)}</select></label>
        <label className={styles.filter}><span>Status</span><select value={status} onChange={change(setStatus)}><option value="all">All statuses</option>{RISK_STATUSES.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className={styles.filter}><span>Severity</span><select value={severity} onChange={change(setSeverity)}><option value="all">All severities</option>{Object.values(RISK_SEVERITY).map((item)=><option key={item} value={item}>{getRiskSeverityLabel(item)}</option>)}</select></label>
        <label className={styles.filter}><span>Attention</span><select value={attention} onChange={change(setAttention)}><option value="all">All attention states</option>{Object.values(RISK_ATTENTION).map((key)=><option key={key} value={key}>{attentionLabels[key]}</option>)}</select></label>
        <div className={styles.filterBar}><label className={styles.archiveToggle}><input type="checkbox" checked={includeArchivedProjects} onChange={(e)=>{ setIncludeArchivedProjects(e.target.checked); setProjectId('all'); setPage(1) }} />Include archived projects</label><button type="button" className={styles.resetButton} onClick={reset}>Reset filters</button></div>
      </div>
    </section>
    <section className={styles.register} aria-labelledby="portfolio-risks-title"><div className={styles.registerHeader}><div><span className={styles.eyebrow}>Risk register</span><h2 id="portfolio-risks-title">Portfolio risks</h2></div><span className={styles.total}>{view.visibleRisks.length} of {view.scopedCount} risks</span></div>
      <div className={styles.registerToolbar}><p className={styles.scopeNote}>{includeArchivedProjects ? 'Including active and archived projects.' : 'Showing active projects only.'}</p><label className={styles.sortFilter}>Sort by <select value={sort} onChange={change(setSort)}><option value={RISK_SORT.EXPOSURE}>Highest exposure first</option><option value={RISK_SORT.DUE}>Earliest due date</option><option value={RISK_SORT.RECENT}>Recently updated</option></select></label></div>
      {view.scopedCount===0 ? <div className={styles.empty}><strong>No portfolio risks yet.</strong><p>Risks from selected projects will appear here.</p><Link to="/projects">Browse projects</Link></div> : !view.visibleRisks.length ? <div className={styles.empty}><strong>No risks match these filters.</strong><p>Try another project, search or risk state.</p><button type="button" className={styles.resetButton} onClick={reset}>Clear filters</button></div> : <div className={styles.registerBody}><div className={styles.columnHeader} aria-hidden="true"><span>Risk</span><span>Project</span><span>Owner</span><span>Severity / score</span><span>Status</span><span>Due date</span><span /></div><ul className={styles.list}>{visiblePage.map((risk)=>{
        const project = view.projectById.get(risk.projectId)
        const score = calculateRiskScore(risk.probability, risk.impact) ?? risk.score
        const level = getRiskSeverity(score) ?? risk.severity
        const attentionState = getRiskAttention(risk)
        return <li className={styles.row} key={risk.id}>
          <div className={styles.riskCell}><strong>{risk.title}</strong><span className={styles.mobileDescription}>{risk.description}</span></div>
          <div className={styles.projectCell}><span className={styles.cellLabel}>Project</span>{project.name}{project.archivedAt ? ' (Archived)' : ''}</div>
          <div className={styles.ownerCell}><span className={styles.cellLabel}>Owner</span><span className={styles.ownerContent}><span className={styles.initials} aria-hidden="true">{initials(risk.owner)}</span>{risk.owner || 'Unassigned'}</span></div>
          <div className={styles.severityCell}><span className={styles.cellLabel}>Severity / score</span><span className={styles.badge} data-severity={level}>{getRiskSeverityLabel(level)} · {score ?? '—'}</span></div>
          <div className={styles.statusCell}><span className={styles.cellLabel}>Status</span><span className={styles.badge} data-status={risk.status}>{getRiskStatusLabel(risk.status)}</span></div>
          <div className={styles.dueCell}><span className={styles.cellLabel}>Due date</span><time>{formatDate(risk.dueDate)}</time>{[RISK_ATTENTION.DUE_SOON,RISK_ATTENTION.OVERDUE].includes(attentionState) ? <span className={styles.attentionText} data-attention={attentionState}>{attentionLabels[attentionState]}</span> : null}</div>
          <div className={styles.openCell}><Link className={styles.openLink} data-ui-button="secondary" data-ui-size="sm" to={`/projects/${encodeURIComponent(project.id)}/risks/${encodeURIComponent(risk.id)}`}>Open risk <span aria-hidden="true">↗</span></Link></div>
        </li>
      })}</ul></div>}
      {totalPages > 1 && <nav className={styles.pagination} aria-label="Portfolio risks pagination"><span className={styles.paginationSummary}>Showing {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE,view.visibleRisks.length)} of {view.visibleRisks.length} risks</span><div className={styles.paginationControls}><button type="button" data-ui-button="secondary" data-ui-size="sm" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button>{Array.from({length:totalPages},(_,i)=>i+1).filter(n=>n===1||n===totalPages||Math.abs(n-currentPage)<=1).map(n=><button type="button" key={n} data-ui-button="secondary" data-ui-size="sm" aria-current={n===currentPage?'page':undefined} onClick={()=>setPage(n)}>{n}</button>)}<button type="button" data-ui-button="secondary" data-ui-size="sm" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}>Next</button></div></nav>}
    </section>
  </section>
}
