import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize theme before rendering to prevent flash
const storedTheme = localStorage.getItem('pendeltag-theme') || 'light';
document.documentElement.setAttribute('data-theme', storedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
