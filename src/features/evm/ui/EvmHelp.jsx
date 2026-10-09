import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../../shared/ui/CloseIcon/CloseIcon.jsx'
import styles from './EvmHelp.module.css'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function EvmHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const close = useCallback(() => {
    triggerRef.current?.focus()
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.helpButton}
        type="button"
        aria-label="Open EVM guide"
        aria-expanded={isOpen}
        aria-controls="evm-help-dialog"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen ? createPortal(
        <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section ref={dialogRef} id="evm-help-dialog" className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="evm-help-title">
            <header className={styles.dialogHeader}>
              <div>
                <span className={styles.eyebrow}>Earned Value guide</span>
                <h2 id="evm-help-title">Measure completed value against the baseline.</h2>
              </div>
              <button ref={closeRef} className={styles.closeButton} type="button" aria-label="Close EVM guide" onClick={close}><CloseIcon /></button>
            </header>

            <div className={styles.content}>
              <section>
                <h3>Earned Value is not time spent</h3>
                <p>Enter only the approved baseline value of work that is fully completed by the reporting cutoff. If an 8-hour development stage has consumed 4 hours but is still in progress, its EV is 0 while its actual effort is 4 hours.</p>
              </section>

              <section>
                <h3>Measurement basis</h3>
                <p><strong>Hours</strong>, <strong>person-days</strong>, and <strong>currency</strong> use the full EVM model. <strong>Story points</strong> support planned-versus-earned schedule tracking, but cost indices and cost forecasts are intentionally unavailable because story points are not an actual-cost unit.</p>
              </section>

              <section>
                <h3>Core values</h3>
                <p><strong>BAC</strong> is the approved total baseline. <strong>PV</strong> is the baseline value planned by the reporting date. HelmSight distributes PV linearly across working days for each work package. <strong>EV</strong> is completed baseline value. <strong>AC</strong> is actual consumed cost/effort.</p>
              </section>

              <section className={styles.formulas}>
                <h3>Performance formulas</h3>
                <p><strong>CV = EV - AC</strong> · positive means under budget/effort.</p>
                <p><strong>CPI = EV / AC</strong> · 1.00 or greater is efficient against the baseline.</p>
                <p><strong>SV = EV - PV</strong> · positive means ahead of the planned value curve.</p>
                <p><strong>SPI = EV / PV</strong> · 1.00 or greater is on/ahead of plan.</p>
              </section>

              <section className={styles.formulas}>
                <h3>Forecast formulas</h3>
                <p><strong>EAC = BAC / CPI</strong></p>
                <p><strong>ETC = EAC - AC</strong></p>
                <p><strong>VAC = BAC - EAC</strong></p>
                <p><strong>TCPI = (BAC - EV) / (BAC - AC)</strong></p>
              </section>

              <section>
                <h3>Attention threshold</h3>
                <p>HelmSight treats an index below <strong>0.95</strong> as needing attention, 0.95–0.99 as Watch, and 1.00 or greater as Healthy. This is a management signal, not an automatic Action Register entry in P0.</p>
              </section>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
