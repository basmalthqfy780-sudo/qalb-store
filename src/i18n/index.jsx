import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dict } from './translations'

const LangCtx = createContext(null)
const STORE = 'qalb.lang'
const THEME = 'qalb.theme'

const read = (k, fb) => {
  try {
    return localStorage.getItem(k) || fb
  } catch {
    return fb
  }
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => read(STORE, 'ar'))
  // The pre-paint script in index.html resolves the effective theme (stored
  // value → system preference → dark) and publishes it on <html data-theme>,
  // so React adopts it instead of flashing the opposite theme on first paint.
  const readTheme = () => {
    const stored = read(THEME, '')
    if (stored === 'light' || stored === 'dark') return stored
    const painted = typeof document !== 'undefined' ? document.documentElement.dataset?.theme : ''
    if (painted === 'light' || painted === 'dark') return painted
    // no stored choice and no pre-paint script: follow the OS
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  }
  const [theme, setThemeState] = useState(readTheme)

  useEffect(() => {
    const el = document.documentElement
    el.lang = lang
    el.dir = lang === 'ar' ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(STORE, lang)
    } catch {
      /* localStorage may be full or blocked — never a hard requirement */
    }
  }, [lang])

  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('light', theme === 'light')
    el.dataset.theme = theme
    let tc = document.head.querySelector('meta[name="theme-color"]')
    if (!tc) {
      tc = document.createElement('meta')
      tc.setAttribute('name', 'theme-color')
      document.head.appendChild(tc)
    }
    tc.setAttribute('content', theme === 'light' ? '#f6f7f9' : '#0a0c11')
    try {
      localStorage.setItem(THEME, theme)
    } catch {
      /* localStorage may be full or blocked — never a hard requirement */
    }
  }, [theme])

  const setLang = useCallback((l) => setLangState(l === 'ar' ? 'ar' : 'en'), [])
  const toggleLang = useCallback(() => setLangState((l) => (l === 'ar' ? 'en' : 'ar')), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang, toggleLang, theme, toggleTheme }),
    [lang, theme, setLang, toggleLang, toggleTheme],
  )

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(LangCtx)
  if (!ctx) throw new Error('useI18n must be used inside <LangProvider>')
  const { lang } = ctx

  /** t('nav.templates') or t('catalog.sub', { n: 12 }) */
  const t = useCallback(
    (path, vars) => {
      const get = (obj) =>
        String(path)
          .split('.')
          .reduce((o, k) => (o == null ? undefined : o[k]), obj)
      let out = get(dict[lang])
      if (out === undefined) out = get(dict.en)
      if (typeof out !== 'string') out = String(path)
      if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
      return out
    },
    [lang],
  )

  /** L({ar:'',en:''}) → the string for the active language */
  const L = useCallback(
    (field) => {
      if (field == null) return ''
      if (typeof field === 'string') return field
      return field[lang] ?? field.en ?? ''
    },
    [lang],
  )

  return { ...ctx, t, L }
}

/* ---------------- formatting ---------------- */
const NF = new Intl.NumberFormat('en-US')
export const num = (n) => NF.format(Math.round(n))
export const dec = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : d, maximumFractionDigits: d })

export function moneyParts(n, lang) {
  return { value: dec(n), unit: lang === 'ar' ? 'ر.س' : 'SAR', dir: 'ltr' }
}
