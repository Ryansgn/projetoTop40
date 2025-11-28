import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true }) // atualiza SW sem esperar foco
