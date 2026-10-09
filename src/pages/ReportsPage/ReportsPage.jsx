import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { REPORT_STATUS } from '../../features/reports/lib/weeklyReport.js'
import {
  loadReports,
  restoreReport,
  selectReportMutationStatus,
  selectReportsByProject,
  selectReportsError,
  selectReportsStatus,
} from '../../features/reports/model/reportsSlice.js'
import { StatusToast } from '../../shared/ui/StatusToast/StatusToast.jsx'
import styles from './ReportsPage.module.css'

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: options.includeYear === false ? undefined : 'numeric',
  }).format(date)
}

function formatTimestamp(value) {
  if (!value) return 'Not saved yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not saved yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function ReportsPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const projectId = project.id
  const reports = useAppSelector((state) => selectReportsByProject(state, projectId))
  const status = useAppSelector(selectReportsStatus)
  const error = useAppSelector(selectReportsError)
  const mutationStatus = useAppSelector(selectReportMutationStatus)
  const [showCreate, setShowCreate] = useState(false)
  const [weekEnding, setWeekEnding] = useState(() => toDateKey(new Date()))
  const [weekEndingTouched, setWeekEndingTouched] = useState(false)
  const [historyView, setHistoryView] = useState('current')
  const [toast, setToast] = useState(null)
  const projectArchived = Boolean(project.archivedAt)
  const mutationPending = mutationStatus === 'loading'
  const existingPeriodReport = weekEnding
    ? reports.find((report) => report.periodEnd === weekEnding) ?? null
    : null
  const currentReports = reports.filter((report) => !report.archivedAt)
  const archivedReports = reports.filter((report) => Boolean(report.archivedAt))
  const visibleReports = historyView === 'archived' ? archivedReports : currentReports

  useEffect(() => {
    if (status === 'idle') dispatch(loadReports())
  }, [dispatch, status])

  const openReport = (reportId) => {
    navigate(`/projects/${projectId}/reports/${reportId}`)
  }

  const createReport = () => {
    setWeekEndingTouched(true)
    if (!weekEnding) return

    if (existingPeriodReport) {
      openReport(existingPeriodReport.id)
      return
    }

    navigate(`/projects/${projectId}/reports/new?periodEnd=${encodeURIComponent(weekEnding)}`)
  }

  const restoreArchivedReport = async (reportId) => {
    try {
      await dispatch(restoreReport(reportId)).unwrap()
      setToast({ message: 'Weekly report restored to Current.', variant: 'success' })
    } catch (restoreError) {
      setToast({ message: String(restoreError || 'Unable to restore weekly report.'), variant: 'error', icon: 'alert' })
    }
  }

  if (status === 'idle' || status === 'loading') {
    return <div className={styles.stateCard}>Loading weekly reports…</div>
  }

  if (status === 'failed') {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Weekly reports could not be loaded.</strong>
        <span>{error}</span>
        <button type="button" onClick={() => dispatch(loadReports())}>Try again</button>
      </div>
    )
  }

  return (
    <section className={styles.root}>
      <StatusToast
        message={toast?.message}
        variant={toast?.variant}
        icon={toast?.icon}
        duration={3000}
        onDismiss={() => setToast(null)}
      />

      <header className={styles.pageHeader} data-ui-page-header>
        <span className={styles.eyebrow}>Reporting</span>
        <div data-ui-page-title-row>
          <h2>Weekly Status Reports</h2>
          {!projectArchived ? (
            <button
              className={`${styles.actionButton} ${styles.primaryAction}`} data-ui-button="primary"
              type="button"
              onClick={() => {
                setShowCreate((value) => !value)
                setWeekEndingTouched(false)
              }}
            >
              <PlusIcon />
              <span>New report</span>
            </button>
          ) : null}
        </div>
        <p>Capture a stable weekly snapshot of delivery health, then add the management narrative that explains what changed and what needs attention.</p>
      </header>

      {projectArchived ? (
        <div className={styles.archiveBanner}>
          <strong>Archived project</strong>
          <span>Weekly reports are read-only. You can still review and print historical reports.</span>
        </div>
      ) : null}

      {showCreate ? (
        <section className={styles.createPanel} aria-label="Create weekly report">
          <div>
            <span className={styles.eyebrow}>New weekly snapshot</span>
            <h3>Choose week ending</h3>
            <p>The reporting period includes the selected date and the previous six calendar days.</p>
          </div>
          <div className={styles.createPeriodControls}>
            <label className={styles.dateField}>
              <span>Week ending <b aria-hidden="true">*</b></span>
              <input
                type="date"
                value={weekEnding}
                aria-required="true"
                aria-invalid={weekEndingTouched && !weekEnding}
                onBlur={() => setWeekEndingTouched(true)}
                onChange={(event) => setWeekEnding(event.target.value)}
              />
              {weekEndingTouched && !weekEnding ? <small className={styles.fieldError}>Week ending is required.</small> : null}
            </label>
            {existingPeriodReport ? (
              <div className={styles.existingReportNotice} role="status">
                <strong>{existingPeriodReport.archivedAt
                  ? 'Archived Final report already exists.'
                  : existingPeriodReport.status === REPORT_STATUS.FINAL
                    ? 'Final report already exists.'
                    : 'Draft report already exists.'}</strong>
                <span>HelmSight keeps one weekly report per Week ending date.</span>
              </div>
            ) : null}
          </div>
          <div className={styles.createActions}>
            <button className={styles.secondaryButton} data-ui-button="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className={styles.primaryButton} data-ui-button="primary" type="button" disabled={!weekEnding} onClick={createReport}>
              {existingPeriodReport
                ? existingPeriodReport.archivedAt
                  ? 'View archived report'
                  : existingPeriodReport.status === REPORT_STATUS.FINAL ? 'View existing report' : 'Continue draft'
                : 'Create report'}
            </button>
          </div>
        </section>
      ) : null}

      <section className={styles.reportsListCard} aria-label="Weekly report history">
        <div className={styles.listHeader}>
          <div>
            <span className={styles.eyebrow}>Report history</span>
            <h3>Reports</h3>
          </div>
          <div className={styles.historyHeaderActions}>
            <div className={styles.historyTabs} role="tablist" aria-label="Report history view">
              <button
                className={`${styles.historyTab} ${historyView === 'current' ? styles.historyTabActive : ''}`}
                type="button"
                role="tab"
                aria-selected={historyView === 'current'}
                onClick={() => setHistoryView('current')}
              >
                Current <span>{currentReports.length}</span>
              </button>
              <button
                className={`${styles.historyTab} ${historyView === 'archived' ? styles.historyTabActive : ''}`}
                type="button"
                role="tab"
                aria-selected={historyView === 'archived'}
                onClick={() => setHistoryView('archived')}
              >
                Archived <span>{archivedReports.length}</span>
              </button>
            </div>
            <span className={styles.historyCount}>{visibleReports.length} {visibleReports.length === 1 ? 'report' : 'reports'}</span>
          </div>
        </div>

        {visibleReports.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>{historyView === 'archived' ? 'No archived weekly reports.' : 'No current weekly reports yet.'}</strong>
            <p>{historyView === 'archived'
              ? 'Final reports that you archive will remain available here and can be restored.'
              : 'Create the first report to capture the current project state and add your weekly management narrative.'}</p>
            {!projectArchived && historyView === 'current' ? <button type="button" onClick={() => setShowCreate(true)}>Create first report</button> : null}
          </div>
        ) : (
          <div className={styles.reportTable} role="table" aria-label="Weekly reports">
            <div className={styles.reportTableHeader} role="row">
              <span role="columnheader">Reporting period</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Version</span>
              <span role="columnheader">Updated</span>
              <span role="columnheader">Action</span>
            </div>
            <div className={styles.reportTableBody}>
              {visibleReports.map((report) => {
                const finalized = report.status === REPORT_STATUS.FINAL
                const reportArchived = Boolean(report.archivedAt)
                return (
                  <div className={styles.reportRow} role="row" key={report.id}>
                    <span className={styles.periodCell} role="cell" data-label="Reporting period">
                      {formatDate(report.periodStart, { includeYear: false })} – {formatDate(report.periodEnd)}
                    </span>
                    <span role="cell" data-label="Status">
                      <span className={`${styles.statusBadge} ${reportArchived ? styles.archived : finalized ? styles.final : styles.draft}`}>
                        {reportArchived ? 'Archived' : finalized ? 'Final' : 'Draft'}
                      </span>
                    </span>
                    <span className={styles.versionCell} role="cell" data-label="Version">v{report.version}</span>
                    <span className={styles.updatedCell} role="cell" data-label="Updated">{formatTimestamp(report.updatedAt)}</span>
                    <span className={styles.viewCell} role="cell" data-label="Action">
                      <button className={styles.viewReportButton} data-ui-button="secondary" data-ui-size="sm" type="button" onClick={() => openReport(report.id)}>
                        <span>View report</span>
                        <ArrowIcon />
                      </button>
                      {reportArchived && !projectArchived ? (
                        <button
                          className={styles.restoreReportButton} data-ui-button="secondary" data-ui-size="sm"
                          type="button"
                          disabled={mutationPending}
                          onClick={() => restoreArchivedReport(report.id)}
                        >
                          Restore
                        </button>
                      ) : null}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </section>
  )
}
