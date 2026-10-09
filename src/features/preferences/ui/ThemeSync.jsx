import { useEffect, useLayoutEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks.js'
import {
  loadPreferences,
  selectPreferencesStatus,
  selectThemeMode,
} from '../model/preferencesSlice.js'
import {
  getSystemPrefersDark,
  getSystemThemeQuery,
  resolveTheme,
} from '../lib/theme.js'

export function ThemeSync() {
  const dispatch = useAppDispatch()
  const themeMode = useAppSelector(selectThemeMode)
  const preferencesStatus = useAppSelector(selectPreferencesStatus)

  useEffect(() => {
    if (preferencesStatus === 'idle') {
      dispatch(loadPreferences())
    }
  }, [dispatch, preferencesStatus])

  useLayoutEffect(() => {
    const mediaQuery = getSystemThemeQuery()

    const applyTheme = () => {
      const resolvedTheme = resolveTheme(themeMode, getSystemPrefersDark())
      const root = document.documentElement

      if (root.dataset.theme !== resolvedTheme) {
        root.dataset.theme = resolvedTheme
      }

      if (root.dataset.themeMode !== themeMode) {
        root.dataset.themeMode = themeMode
      }
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)

    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [themeMode])

  return null
}
