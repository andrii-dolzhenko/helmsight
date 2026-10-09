import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks.js'
import {
  selectPreferencesError,
  selectThemeMode,
  updateThemeMode,
} from '../model/preferencesSlice.js'
import styles from './ThemeControl.module.css'

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function ThemeIcon({ mode }) {
  if (mode === 'light') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </svg>
    )
  }

  if (mode === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.2 15.1A8.2 8.2 0 0 1 8.9 3.8 8.7 8.7 0 1 0 20.2 15.1Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export function ThemeControl() {
  const dispatch = useAppDispatch()
  const themeMode = useAppSelector(selectThemeMode)
  const error = useAppSelector(selectPreferencesError)
  const [isOpen, setIsOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setFocusIndex(null)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || focusIndex === null) return
    optionRefs.current[focusIndex]?.focus()
  }, [focusIndex, isOpen])

  const activeIndex = Math.max(
    options.findIndex((option) => option.value === themeMode),
    0,
  )

  const openWithKeyboardFocus = (index) => {
    setIsOpen(true)
    setFocusIndex(index)
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openWithKeyboardFocus(activeIndex)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      openWithKeyboardFocus(options.length - 1)
    }
  }

  const handleMenuKeyDown = (event) => {
    const currentIndex = optionRefs.current.findIndex(
      (element) => element === document.activeElement,
    )

    if (currentIndex < 0) return

    let nextIndex

    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = options.length - 1
    } else {
      return
    }

    event.preventDefault()
    setFocusIndex(nextIndex)
  }

  const handleSelect = (event, value) => {
    if (value !== themeMode) {
      dispatch(updateThemeMode(value))
    }

    setIsOpen(false)
    setFocusIndex(null)

    if (event.detail > 0) {
      triggerRef.current?.blur()
    } else {
      triggerRef.current?.focus()
    }
  }

  const activeLabel = options[activeIndex]?.label

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label={`Theme: ${activeLabel}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          setFocusIndex(null)
          setIsOpen((current) => !current)

          if (event.detail > 0) {
            event.currentTarget.blur()
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        title="Theme"
      >
        <span className={styles.triggerIcon}>
          <ThemeIcon mode={themeMode} />
        </span>
      </button>

      {isOpen ? (
        <div
          className={styles.menu}
          role="menu"
          aria-label="Choose theme"
          onKeyDown={handleMenuKeyDown}
        >
          <div className={styles.menuHeader}>Appearance</div>
          {options.map((option, index) => {
            const isActive = option.value === themeMode

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                tabIndex={-1}
                onClick={(event) => handleSelect(event, option.value)}
              >
                <span className={styles.optionIcon}>
                  <ThemeIcon mode={option.value} />
                </span>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.checkIcon} aria-hidden="true">
                  {isActive ? <CheckIcon /> : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {error ? (
        <span className={styles.error} role="status">
          Theme preference could not be saved.
        </span>
      ) : null}
    </div>
  )
}
