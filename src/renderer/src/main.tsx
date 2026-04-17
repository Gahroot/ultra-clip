import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsWindow } from './SettingsWindow'
import { useStore } from './store'
import './assets/index.css'

// Apply persisted theme synchronously before first render (replaces the
// inline <script> that used to live in index.html, so script-src can stay
// 'self' without needing 'unsafe-inline').
const theme = localStorage.getItem('batchcontent-theme') || 'dark'
if (
  theme === 'dark' ||
  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark')
}

const isSettingsWindow = window.location.hash === '#settings'

// Pull encrypted API keys from main process (safeStorage) into the store
// before mounting. Fire-and-forget — the store is valid without them.
void useStore.getState().hydrateSecretsFromMain()

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, errorInfo) => {
    console.error('[React] Uncaught error:', error, errorInfo.componentStack)
  },
  onCaughtError: (error, errorInfo) => {
    console.error('[React] Caught error:', error, errorInfo.componentStack)
  },
  onRecoverableError: (error) => {
    console.error('[React] Recoverable error:', error)
  }
}).render(
  <React.StrictMode>
    {isSettingsWindow ? <SettingsWindow /> : <App />}
  </React.StrictMode>
)
