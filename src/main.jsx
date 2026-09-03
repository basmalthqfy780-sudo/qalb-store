import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LangProvider } from './i18n'
import { StoreProvider } from './store/StoreContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
