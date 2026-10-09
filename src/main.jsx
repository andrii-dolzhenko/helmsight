import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AppProviders } from './app/providers/AppProviders.jsx'
import './shared/styles/global.css'
import './shared/styles/actionButtons.css'
import './shared/styles/pageHeadings.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

const finishAppBoot = () => {
  document.documentElement.removeAttribute('data-app-booting')
}

if (typeof window.requestAnimationFrame === 'function') {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(finishAppBoot)
  })
} else {
  window.setTimeout(finishAppBoot, 0)
}
