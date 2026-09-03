import { createRoot } from 'react-dom/client'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LangProvider } from '../src/i18n'
import { StoreProvider } from '../src/store/StoreContext'
import App from '../src/App'
import '../src/index.css'

let el = document.getElementById('root')
if (!el) {
  el = document.createElement('div')
  el.id = 'root'
  document.body.appendChild(el)
}

createRoot(el).render(
  React.createElement(
    BrowserRouter,
    null,
    React.createElement(LangProvider, null, React.createElement(StoreProvider, null, React.createElement(App, null))),
  ),
)
