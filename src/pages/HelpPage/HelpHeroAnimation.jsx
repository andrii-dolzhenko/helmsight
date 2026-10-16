import { useEffect, useRef, useState } from 'react'
import animationSource from './questionAnimation.json'
import styles from './HelpPage.module.css'

const REPLAY_INTERVAL_MS = 30_000
const LAST_FRAME = animationSource.op - 1

/** The supplied Lottie plays once (5 seconds), then holds its finished frame for 25 seconds. */
export function HelpHeroAnimation() {
  const containerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let disposed = false
    let animation = null
    let replayTimer = null
    let hasStarted = false
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')

    const stopReplay = () => {
      if (replayTimer !== null) {
        window.clearInterval(replayTimer)
        replayTimer = null
      }
    }

    const updatePlayback = () => {
      if (!animation || disposed) return
      stopReplay()
      if (motionQuery?.matches) {
        // Reduced-motion visitors see the finished illustration, without any autoplay.
        animation.goToAndStop(LAST_FRAME, true)
        return
      }
      animation.goToAndPlay(0, true)
      replayTimer = window.setInterval(() => animation.goToAndPlay(0, true), REPLAY_INTERVAL_MS)
    }

    const handleReady = () => {
      if (disposed || hasStarted) return
      hasStarted = true
      setLoaded(true)
      updatePlayback()
    }

    motionQuery?.addEventListener?.('change', updatePlayback)

    // Use the SVG-only light player (no expressions) and load it only on /help.
    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (disposed) return
      animation = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        // Lottie modifies its input, so never share the imported JSON across instances.
        animationData: JSON.parse(JSON.stringify(animationSource)),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      animation.addEventListener('DOMLoaded', handleReady)
      if (animation.isLoaded) handleReady()
    }).catch(() => {
      // Keep the accessible, static fallback if playback cannot initialize.
    })

    return () => {
      disposed = true
      stopReplay()
      motionQuery?.removeEventListener?.('change', updatePlayback)
      animation?.removeEventListener?.('DOMLoaded', handleReady)
      animation?.destroy()
    }
  }, [])

  return (
    <div className={styles.heroSymbol} aria-hidden="true" data-animation="help-question">
      <span className={`${styles.heroFallback} ${loaded ? styles.heroFallbackHidden : ''}`} aria-hidden="true">?</span>
      <div className={styles.heroLottie} ref={containerRef} />
    </div>
  )
}
