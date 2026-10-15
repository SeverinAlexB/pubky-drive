// Global styles come first, so component styles can override them.
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { SHOW_REQUEST_MONITOR } from './config'
import { installRequestMonitor } from './dev/requestCounts'

// Count requests from the start, before the SDK sends any.
if (SHOW_REQUEST_MONITOR) installRequestMonitor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
