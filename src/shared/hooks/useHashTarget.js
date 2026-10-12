import { useEffect } from 'react'
import { useLocation } from 'react-router'

const MAX_FRAME_ATTEMPTS = 45
const OBSERVER_TIMEOUT_MS = 1800
const SETTLE_FRAME_ATTEMPTS = 4
const FINAL_SETTLE_DELAY_MS = 120

export function useHashTarget(readyKey) {
  const location = useLocation()
  const { hash, pathname, state } = location
  const stateTargetId = typeof state?.focusTargetId === 'string' ? state.focusTargetId : ''
  const hashTargetId = hash ? decodeURIComponent(hash.slice(1)) : ''
  const targetId = stateTargetId || hashTargetId

  useEffect(() => {

    if (!targetId) return undefined

    let cancelled = false
    let frameId = null
    let timeoutId = null
    let observer = null
    let attempts = 0
    let settleFrames = 0
    let hasFocused = false

    const positionTarget = () => {
      if (cancelled) return false

      const element = document.getElementById(targetId)
      if (!element) return false

      element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })

      if (!hasFocused) {
        element.focus({ preventScroll: true })
        hasFocused = true
      }

      return true
    }

    const disconnectObserver = () => {
      observer?.disconnect()
      observer = null
    }

    const settleTarget = () => {
      if (cancelled || !positionTarget()) return

      settleFrames += 1
      if (settleFrames < SETTLE_FRAME_ATTEMPTS && typeof window.requestAnimationFrame === 'function') {
        frameId = window.requestAnimationFrame(settleTarget)
      }
    }

    const onTargetFound = () => {
      disconnectObserver()
      settleTarget()
      timeoutId = window.setTimeout(positionTarget, FINAL_SETTLE_DELAY_MS)
    }

    const tryOnFrame = () => {
      if (positionTarget()) {
        onTargetFound()
        return
      }

      attempts += 1
      if (attempts >= MAX_FRAME_ATTEMPTS || typeof window.requestAnimationFrame !== 'function') return
      frameId = window.requestAnimationFrame(tryOnFrame)
    }

    if (typeof window.MutationObserver === 'function') {
      observer = new window.MutationObserver(() => {
        if (document.getElementById(targetId)) onTargetFound()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      timeoutId = window.setTimeout(disconnectObserver, OBSERVER_TIMEOUT_MS)
    }

    if (typeof window.requestAnimationFrame === 'function') {
      frameId = window.requestAnimationFrame(tryOnFrame)
    } else {
      timeoutId = window.setTimeout(positionTarget, 0)
    }

    return () => {
      cancelled = true
      if (frameId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId)
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      disconnectObserver()
    }
  }, [hash, location.key, pathname, readyKey, stateTargetId, targetId])

  return targetId
}
