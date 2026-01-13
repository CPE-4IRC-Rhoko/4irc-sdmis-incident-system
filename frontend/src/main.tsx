import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureKeycloakAuth, processKeycloakCallback } from './services/auth'

if (typeof window !== 'undefined') {
  void (async () => {
    if (window.location.pathname.startsWith('/callback')) {
      await processKeycloakCallback()
    } else {
      await ensureKeycloakAuth()
    }
  })()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
