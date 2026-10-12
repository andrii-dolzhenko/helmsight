import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { projectDeletionService } from './features/projects/api/projectDeletionService.js'
import './shared/styles/global.css'
import './shared/styles/actionButtons.css'
import './shared/styles/pageHeadings.css'

const root = createRoot(document.getElementById('root'))

function finishAppBoot() {
  document.documentElement.removeAttribute('data-app-booting')
}

function revealApp() {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(finishAppBoot)
    })
  } else {
    window.setTimeout(finishAppBoot, 0)
  }
}

async function bootApp() {
  try {
    // Recovery must complete before importing the Redux store.
    await projectDeletionService.recoverPendingDeletion()

    const [{ default: App }, { AppProviders }] = await Promise.all([
      import('./App.jsx'),
      import('./app/providers/AppProviders.jsx'),
    ])

    root.render(
      <StrictMode>
        <AppProviders>
          <App />
        </AppProviders>
      </StrictMode>,
    )
  } catch (error) {
    console.error('HelmSight startup failed:', error)

    root.render(
      <main
        role="alert"
        style={{
          maxWidth: '40rem',
          margin: '10vh auto',
          padding: '2rem',
        }}
      >
        <h1>HelmSight could not start safely</h1>
        <p>
          Application startup was interrupted. Your saved project
          data has not been reset. Check that browser storage is
          available, then retry.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry startup
        </button>
      </main>,
    )
  } finally {
    revealApp()
  }
}

bootApp()
