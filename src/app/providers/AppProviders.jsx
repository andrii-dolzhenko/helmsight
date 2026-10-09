import { Provider } from 'react-redux'
import { store } from '../store/store.js'
import { ThemeSync } from '../../features/preferences/ui/ThemeSync.jsx'

export function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <ThemeSync />
      {children}
    </Provider>
  )
}
