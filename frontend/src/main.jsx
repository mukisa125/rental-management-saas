import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { showToast } from './utils/toast.js'

if (typeof window !== 'undefined') {
  const originalAlert = window.alert ? window.alert.bind(window) : null;
  window.__nativeAlert = originalAlert;
  window.alert = (message) => {
    showToast(String(message || 'Settings saved successfully'), 'success');
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
