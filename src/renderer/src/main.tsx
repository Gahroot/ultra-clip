import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsWindow } from './SettingsWindow'
import './assets/index.css'

const isSettingsWindow = window.location.hash === '#settings'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSettingsWindow ? <SettingsWindow /> : <App />}
  </React.StrictMode>
)
