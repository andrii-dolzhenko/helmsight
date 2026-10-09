const MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function resolveTheme(themeMode, prefersDark) {
  if (themeMode === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return themeMode
}

export function getSystemPrefersDark() {
  return window.matchMedia(MEDIA_QUERY).matches
}

export function getSystemThemeQuery() {
  return window.matchMedia(MEDIA_QUERY)
}
