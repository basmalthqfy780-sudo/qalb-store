import { createRoot } from 'react-dom/client'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LangProvider } from '../src/i18n'
/*
 * القاموسان يُحقنان هنا صراحةً: التطبيق يطلب الإنجليزية chunk ديناميكيًا عند
 * الحاجة (انظر src/i18n/loader.js)، والاختبار لا يجوز أن ينتظر وحدةً ديناميكية
 * ولا أن يعتمد على timing — فيدخل باللغتين معًا ويرسم متزامنًا كما كان.
 */
import ar from '../src/i18n/locales/ar.js'
import en from '../src/i18n/locales/en.js'
import { StoreProvider } from '../src/store/StoreContext'
import App from '../src/App'
import ErrorBoundary from '../src/components/ErrorBoundary'
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
    React.createElement(LangProvider, { dicts: { ar, en } }, React.createElement(StoreProvider, null, React.createElement(App, null))),
  ),
)

/*
 * The error boundary only appears when a route actually throws, so the suite can
 * force the two shapes here — this file is the TEST entry, never part of the app
 * build. `qalb.test.boundary` picks the case: "stale" = a tab whose lazy chunk no
 * longer matches the modules it already loaded (the real-world failure), "plain"
 * = an ordinary render error. With `sessionStorage.qalb.stale-reload` pre-set the
 * boundary shows its fallback instead of reloading jsdom, which is what we read.
 */
const CASE = (() => {
  try {
    return localStorage.getItem('qalb.test.boundary')
  } catch {
    return null
  }
})()
if (CASE === 'stale' || CASE === 'plain') {
  const Thrower = () => {
    if (CASE === 'stale') throw new Error("The requested module '/src/api/index.js' does not provide an export named 'deliveryAllHref'")
    throw new TypeError("Cannot read properties of undefined (reading 'map')")
  }
  const box = document.createElement('div')
  box.id = 'boundary-probe'
  document.body.appendChild(box)
  // the fallback renders a router <Link>, so the probe needs the same router the app has
  createRoot(box).render(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        LangProvider,
        { dicts: { ar, en } },
        React.createElement(ErrorBoundary, { onRetry: () => {} }, React.createElement(Thrower, null)),
      ),
    ),
  )
}
