import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import { useIsMobile } from './hooks/useIsMobile'

// Make useIsMobile available at app root
export function MobileDetector() {
  useIsMobile();
  return null;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <MobileDetector />
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
