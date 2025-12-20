import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { AutomationProvider } from './context/AutomationContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WebSocketProvider>
      <AppProvider>
        <AutomationProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider>
        </AutomationProvider>
      </AppProvider>
    </WebSocketProvider>
  </StrictMode>,
)
