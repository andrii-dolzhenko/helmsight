/**
 * Register the radar's interpolable custom property before the page renders.
 * An unsupported CSS Properties and Values API keeps the existing fallback.
 */
export function registerRadarWaveRadius(css = globalThis.CSS) {
  if (typeof css?.registerProperty !== 'function') return false

  try {
    css.registerProperty({
      name: '--radar-wave-radius',
      syntax: '<percentage>',
      inherits: false,
      initialValue: '8%',
    })
    return true
  } catch (error) {
    // Vite HMR may evaluate the module again; the property was registered already.
    if (error?.name === 'InvalidModificationError') return false
    throw error
  }
}
