import { useEffect, useMemo, useState } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  buildEvmHistory,
  formatEvmValue,
  formatIndex,
  getMeasurementBasisLabel,
  getMeasurementUnit,
  isFullEvmBasis,
} from '../lib/evm.js'
import styles from './EvmHistoricalTrends.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function formatTrendDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function useResolvedTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setTheme(root.dataset.theme || 'light')
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

function getPalette(theme) {
  if (theme === 'dark') {
    return {
      accent: '#6fd5a3',
      planned: '#a7b1ac',
      actual: '#e3aa78',
      text: '#f4f1e9',
      muted: '#b2bcb6',
      grid: 'rgba(178, 188, 182, 0.18)',
      tooltip: '#203029',
      tooltipBorder: '#466356',
      target: '#8f9a94',
    }
  }

  return {
    accent: '#177a58',
    planned: '#66736d',
    actual: '#a76632',
    text: '#1e2421',
    muted: '#69716d',
    grid: 'rgba(105, 113, 109, 0.16)',
    tooltip: '#202522',
    tooltipBorder: '#4b5651',
    target: '#8c948f',
  }
}

function formatAxisValue(value, baseline) {
  if (!Number.isFinite(value)) return '—'
  if (baseline.measurementBasis === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: baseline.currencyCode || 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
  const unit = getMeasurementUnit(baseline)
  return unit ? `${formatted} ${unit}` : formatted
}

function commonOptions(palette) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 220 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          color: palette.muted,
          usePointStyle: true,
          pointStyle: 'line',
          boxWidth: 28,
          boxHeight: 8,
          padding: 16,
          font: { size: 11, weight: 700 },
        },
      },
      tooltip: {
        backgroundColor: palette.tooltip,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        padding: 11,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: palette.grid },
        ticks: {
          color: palette.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: { size: 10, weight: 650 },
        },
      },
      y: {
        border: { display: false },
        grid: { color: palette.grid },
        ticks: { color: palette.muted, font: { size: 10, weight: 650 } },
      },
    },
  }
}

export function EvmHistoricalTrends({ baseline, snapshots }) {
  const theme = useResolvedTheme()
  const palette = useMemo(() => getPalette(theme), [theme])
  const fullEvm = isFullEvmBasis(baseline.measurementBasis)
  const history = useMemo(() => buildEvmHistory(baseline, snapshots), [baseline, snapshots])

  const labels = useMemo(() => history.map((point) => formatTrendDate(point.snapshotDate)), [history])

  const valueData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'PV · Planned Value',
        data: history.map((point) => point.pv),
        borderColor: palette.planned,
        backgroundColor: palette.planned,
        pointBackgroundColor: palette.planned,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.22,
      },
      {
        label: 'EV · Earned Value',
        data: history.map((point) => point.ev),
        borderColor: palette.accent,
        backgroundColor: palette.accent,
        pointBackgroundColor: palette.accent,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.4,
        tension: 0.22,
      },
      ...(fullEvm ? [{
        label: baseline.measurementBasis === 'currency' ? 'AC · Actual Cost' : 'AC · Actual consumption',
        data: history.map((point) => point.ac),
        borderColor: palette.actual,
        backgroundColor: palette.actual,
        pointBackgroundColor: palette.actual,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.22,
      }] : []),
    ],
  }), [baseline.measurementBasis, fullEvm, history, labels, palette])

  const valueOptions = useMemo(() => {
    const options = commonOptions(palette)
    options.scales.y.beginAtZero = true
    options.scales.y.title = {
      display: true,
      text: getMeasurementBasisLabel(baseline.measurementBasis),
      color: palette.muted,
      font: { size: 10, weight: 700 },
    }
    options.scales.y.ticks.callback = (value) => formatAxisValue(Number(value), baseline)
    options.plugins.tooltip.callbacks = {
      label: (context) => `${context.dataset.label}: ${formatEvmValue(context.parsed.y, baseline)}`,
    }
    return options
  }, [baseline, palette])

  const indexData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'SPI · Schedule',
        data: history.map((point) => point.spi),
        borderColor: palette.accent,
        backgroundColor: palette.accent,
        pointBackgroundColor: palette.accent,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.4,
        tension: 0.22,
        spanGaps: true,
      },
      ...(fullEvm ? [{
        label: 'CPI · Cost / effort',
        data: history.map((point) => point.cpi),
        borderColor: palette.actual,
        backgroundColor: palette.actual,
        pointBackgroundColor: palette.actual,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.22,
        spanGaps: true,
      }] : []),
      {
        label: 'Target 1.00',
        data: history.map(() => 1),
        borderColor: palette.target,
        backgroundColor: palette.target,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 1.4,
        borderDash: [6, 5],
        tension: 0,
      },
    ],
  }), [fullEvm, history, labels, palette])

  const indexOptions = useMemo(() => {
    const options = commonOptions(palette)
    options.scales.y.suggestedMin = 0.75
    options.scales.y.suggestedMax = 1.05
    options.scales.y.title = {
      display: true,
      text: 'Performance index',
      color: palette.muted,
      font: { size: 10, weight: 700 },
    }
    options.scales.y.ticks.callback = (value) => Number(value).toFixed(2)
    options.plugins.tooltip.callbacks = {
      label: (context) => `${context.dataset.label}: ${formatIndex(context.parsed.y)}`,
    }
    return options
  }, [palette])

  return (
    <section className={styles.historySection} aria-labelledby="evm-history-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Historical trends</span>
          <h3 id="evm-history-title">Delivery performance over time</h3>
        </div>
        <p>Each point shows cumulative performance at that weekly reporting cutoff.</p>
      </div>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No historical trend yet.</strong>
          <span>Add the first weekly snapshot to start the PV / EV and performance-index history.</span>
        </div>
      ) : (
        <div className={styles.chartGrid}>
          <article className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <span>Value history</span>
                <h4>PV / EV {fullEvm ? '/ AC' : ''}</h4>
              </div>
              <small>{history.length} reporting {history.length === 1 ? 'cutoff' : 'cutoffs'}</small>
            </div>
            <div className={styles.chartViewport}>
              <Line
                aria-label={`Historical Planned Value, Earned Value${fullEvm ? ', and Actual consumption' : ''} by weekly reporting cutoff`}
                role="img"
                data={valueData}
                options={valueOptions}
              />
            </div>
          </article>

          <article className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <span>Performance history</span>
                <h4>SPI {fullEvm ? '/ CPI' : ''}</h4>
              </div>
              <small>Target 1.00</small>
            </div>
            <div className={styles.chartViewport}>
              <Line
                aria-label={`Historical Schedule Performance Index${fullEvm ? ' and Cost Performance Index' : ''} by weekly reporting cutoff`}
                role="img"
                data={indexData}
                options={indexOptions}
              />
            </div>
          </article>
        </div>
      )}
    </section>
  )
}
