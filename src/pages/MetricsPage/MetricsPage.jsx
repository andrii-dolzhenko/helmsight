import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import { EvmHelp } from '../../features/evm/ui/EvmHelp.jsx'
import { EvmHistoricalTrends } from '../../features/evm/ui/EvmHistoricalTrends.jsx'
import {
  calculateEvmMetrics,
  formatEvmValue,
  formatIndex,
  getCumulativePackageEarned,
  getMeasurementBasisLabel,
  getPerformanceState,
  getPerformanceStateLabel,
  isFullEvmBasis,
  sortSnapshotsByDate,
} from '../../features/evm/lib/evm.js'
import {
  deleteEvmSnapshot,
  loadEvm,
  selectEvmBaselineByProject,
  selectEvmError,
  selectEvmMutationError,
  selectEvmMutationStatus,
  selectEvmSnapshotsByProject,
  selectEvmStatus,
} from '../../features/evm/model/evmSlice.js'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import { useHashTarget } from '../../shared/hooks/useHashTarget.js'
import styles from './MetricsPage.module.css'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function MetricCard({ label, value, detail }) {
  return <div className={styles.metricCard}><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div>
}

function IndexCard({ id, label, value, description }) {
  const state = getPerformanceState(value)
  return (
    <div className={`${styles.indexCard} ${styles[state] ?? ''}`} id={id} tabIndex={-1}>
      <div className={styles.indexValue}><span>{label}</span><strong>{formatIndex(value)}</strong></div>
      <div className={styles.indexContext}><b className={styles.indexState}>{getPerformanceStateLabel(state)}</b><small>{description}</small></div>
    </div>
  )
}

function TrendRow({ label, value, bac, baseline, variant }) {
  const ratio = bac > 0 ? Math.min(100, Math.max(0, (value / bac) * 100)) : 0
  return <div className={styles.trendRow}><span>{label}</span><div className={styles.trendTrack}><i className={styles[variant]} style={{ width: `${ratio}%` }}/></div><strong>{formatEvmValue(value, baseline)}</strong></div>
}

export function MetricsPage() {
  const { project } = useOutletContext()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectEvmStatus)
  const error = useAppSelector(selectEvmError)
  const mutationStatus = useAppSelector(selectEvmMutationStatus)
  const mutationError = useAppSelector(selectEvmMutationError)
  const baseline = useAppSelector((state) => selectEvmBaselineByProject(state, project.id))
  const snapshots = useAppSelector((state) => selectEvmSnapshotsByProject(state, project.id))
  const [pendingDelete, setPendingDelete] = useState(null)

  useHashTarget(status)

  useEffect(() => { if (status === 'idle') dispatch(loadEvm()) }, [dispatch, status])

  const orderedSnapshots = useMemo(() => sortSnapshotsByDate(snapshots), [snapshots])
  const latest = useMemo(() => baseline ? calculateEvmMetrics(baseline, orderedSnapshots) : null, [baseline, orderedSnapshots])
  const snapshotRows = useMemo(() => baseline ? [...orderedSnapshots].reverse().map((snapshot) => ({ snapshot, metrics: calculateEvmMetrics(baseline, orderedSnapshots, snapshot.snapshotDate) })) : [], [baseline, orderedSnapshots])
  const fullEvm = baseline ? isFullEvmBasis(baseline.measurementBasis) : false

  if (status === 'idle' || status === 'loading') return <div className={styles.stateCard}>Loading delivery metrics…</div>
  if (status === 'failed') return <div className={styles.stateCard} role="alert"><strong>Metrics could not be loaded.</strong><span>{error}</span><button type="button" onClick={() => dispatch(loadEvm())}>Try again</button></div>

  if (!baseline) {
    return <section className={styles.root}>
      <header className={styles.header} data-ui-page-header><span className={styles.eyebrow}>Delivery performance</span><div className={styles.titleRow} data-ui-page-title-row><h2>Metrics &amp; EVM</h2><EvmHelp/></div><p>Compare the approved delivery baseline with completed value and actual consumption through weekly Earned Value snapshots.</p></header>
      <div className={styles.emptyState}><strong>No EVM baseline yet.</strong><p>Choose a measurement basis and define project work packages before recording weekly delivery performance.</p>{!project.archivedAt ? <Link to="baseline">Create EVM baseline</Link> : null}</div>
    </section>
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try { await dispatch(deleteEvmSnapshot(pendingDelete.id)).unwrap(); setPendingDelete(null) } catch { /* Redux error below. */ }
  }

  return <section className={styles.root}>
    <header className={styles.header} data-ui-page-header>
      <span className={styles.eyebrow}>Delivery performance</span>
      <div className={styles.titleRow} data-ui-page-title-row><h2>Metrics &amp; EVM</h2><div className={styles.headerActions}><EvmHelp/>{!project.archivedAt ? <Link className={styles.secondaryButton} data-ui-button="secondary" to="baseline">Edit baseline</Link> : null}{!project.archivedAt ? <Link className={styles.primaryButton} data-ui-button="primary" to="snapshots/new">New weekly snapshot</Link> : null}</div></div>
      <p>Weekly management view of Planned Value, Earned Value and actual consumption against the approved project baseline.</p>
    </header>

    {project.archivedAt ? <div className={styles.archiveBanner}><strong>Archived project</strong><span>EVM history remains available for review. Restore the project to change the baseline or snapshots.</span></div> : null}

    <div className={styles.basisBar}><div><span>Measurement basis</span><strong>{getMeasurementBasisLabel(baseline.measurementBasis)}{baseline.measurementBasis === 'currency' ? ` · ${baseline.currencyCode}` : ''}</strong></div><div><span>Latest reporting date</span><strong>{formatDate(latest?.snapshotDate)}</strong></div><div><span>Work packages</span><strong>{baseline.workPackages.length}</strong></div></div>

    <div className={styles.metricGrid} aria-label="Current EVM values">
      <MetricCard label="BAC · Budget at Completion" value={formatEvmValue(latest?.bac ?? 0, baseline)} detail="Approved total baseline"/>
      <MetricCard label="PV · Planned Value" value={formatEvmValue(latest?.pv ?? 0, baseline)} detail="Planned by reporting cutoff"/>
      <MetricCard label="EV · Earned Value" value={formatEvmValue(latest?.ev ?? 0, baseline)} detail="Completed baseline value"/>
      {fullEvm ? <MetricCard label={baseline.measurementBasis === 'currency' ? 'AC · Actual Cost' : 'AC · Actual consumption'} value={formatEvmValue(latest?.ac ?? 0, baseline)} detail={baseline.measurementBasis === 'currency' ? 'Actual spend' : 'Actual consumed effort'}/> : <MetricCard label="Cost performance" value="Schedule mode" detail="Story points do not use AC/CPI"/>}
    </div>

    <section className={styles.performanceSection} aria-label="EVM performance signals">
      <div className={styles.performanceHeading}>
        <div><span className={styles.eyebrow}>Performance indices</span><h3>CPI / SPI health</h3></div>
        <p>1.00+ Healthy · 0.95–0.99 Watch · below 0.95 Needs attention.</p>
      </div>
      <div className={styles.performanceIndexGrid}>
        <IndexCard id="evm-spi" label="SPI · Schedule Performance Index" value={latest?.spi} description="EV / PV"/>
        {fullEvm ? <IndexCard id="evm-cpi" label="CPI · Cost Performance Index" value={latest?.cpi} description="EV / AC"/> : null}
      </div>
      <div className={styles.varianceGrid} aria-label="EVM variances">
        <MetricCard label="SV · Schedule Variance" value={formatEvmValue(latest?.sv ?? 0, baseline)} detail="EV - PV"/>
        {fullEvm ? <MetricCard label="CV · Cost / Effort Variance" value={formatEvmValue(latest?.cv ?? 0, baseline)} detail="EV - AC"/> : null}
      </div>
    </section>

    {fullEvm ? <div className={styles.forecastGrid} aria-label="EVM forecast"><MetricCard label="EAC" value={formatEvmValue(latest?.eac, baseline)} detail="BAC / CPI"/><MetricCard label="ETC" value={formatEvmValue(latest?.etc, baseline)} detail="EAC - AC"/><MetricCard label="VAC" value={formatEvmValue(latest?.vac, baseline)} detail="BAC - EAC"/><MetricCard label="TCPI" value={formatIndex(latest?.tcpi)} detail="(BAC - EV) / (BAC - AC)"/></div> : null}

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.eyebrow}>Cumulative position</span><h3>PV / EV {fullEvm ? '/ AC' : ''}</h3></div><span>{latest?.snapshotDate ? `Through ${formatDate(latest.snapshotDate)}` : 'No weekly snapshots yet'}</span></div>
      <div className={styles.trendBars}><TrendRow label="PV" value={latest?.pv ?? 0} bac={latest?.bac ?? 0} baseline={baseline} variant="planned"/><TrendRow label="EV" value={latest?.ev ?? 0} bac={latest?.bac ?? 0} baseline={baseline} variant="earned"/>{fullEvm ? <TrendRow label="AC" value={latest?.ac ?? 0} bac={latest?.bac ?? 0} baseline={baseline} variant="actual"/> : null}</div>
    </section>

    <EvmHistoricalTrends baseline={baseline} snapshots={orderedSnapshots} />

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.eyebrow}>Approved baseline</span><h3>Work packages</h3></div><span>{formatEvmValue(latest?.bac ?? 0, baseline)} BAC</span></div>
      <div className={styles.workPackageTable} role="table" aria-label="EVM work packages">
        <div className={styles.tableHeader} role="row"><span>Work package</span><span>Start</span><span>End</span><span>Baseline</span><span>Earned</span></div>
        {baseline.workPackages.map((item) => <div className={styles.tableRow} role="row" key={item.id}><strong>{item.title}</strong><span>{formatDate(item.startDate)}</span><span>{formatDate(item.endDate)}</span><span>{formatEvmValue(item.budgetValue, baseline)}</span><span>{formatEvmValue(getCumulativePackageEarned(orderedSnapshots, item.id), baseline)}</span></div>)}
      </div>
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.eyebrow}>Weekly monitoring</span><h3>Snapshot history</h3></div><span>{snapshots.length} snapshots</span></div>
      {snapshotRows.length === 0 ? <div className={styles.inlineEmpty}><strong>No weekly snapshots yet.</strong><span>Record the first reporting cutoff after collecting completed value and actual consumption from the tracking system.</span>{!project.archivedAt ? <Link to="snapshots/new">Create first snapshot</Link> : null}</div> : <div className={styles.snapshotList}>{snapshotRows.map(({ snapshot, metrics }) => <article className={styles.snapshotRow} key={snapshot.id}><div><span className={styles.snapshotDate}>{formatDate(snapshot.snapshotDate)}</span><small>Reporting cutoff</small></div><dl className={!fullEvm ? styles.storyMetrics : ''}><div><dt>PV</dt><dd>{formatEvmValue(metrics.pv, baseline)}</dd></div><div><dt>EV</dt><dd>{formatEvmValue(metrics.ev, baseline)}</dd></div>{fullEvm ? <div><dt>AC</dt><dd>{formatEvmValue(metrics.ac, baseline)}</dd></div> : null}<div><dt>SPI</dt><dd>{formatIndex(metrics.spi)}</dd></div>{fullEvm ? <div><dt>CPI</dt><dd>{formatIndex(metrics.cpi)}</dd></div> : null}</dl>{!project.archivedAt ? <div className={styles.rowActions}><Link to={`snapshots/${snapshot.id}/edit`}>Edit</Link><button type="button" disabled={mutationStatus === 'loading'} onClick={() => setPendingDelete(snapshot)}>Delete</button></div> : null}</article>)}</div>}
    </section>

    {mutationError ? <div className={styles.mutationError} role="alert">{mutationError}</div> : null}
    <ConfirmDialog isOpen={Boolean(pendingDelete)} eyebrow="EVM snapshot" title="Delete weekly snapshot?" message={pendingDelete ? `The reporting snapshot for ${formatDate(pendingDelete.snapshotDate)} will be removed and cumulative metrics will be recalculated.` : ''} confirmLabel={mutationStatus === 'loading' ? 'Deleting…' : 'Delete snapshot'} cancelLabel="Keep snapshot" onConfirm={handleDelete} onCancel={() => setPendingDelete(null)}/>
  </section>
}
