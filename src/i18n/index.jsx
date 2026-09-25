import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LANG_STORE, dictOf, initialLang, loadDict, read } from './loader'

const LangCtx = createContext(null)
const THEME = 'qalb.theme'

export function LangProvider({ children, dicts: injected = null }) {
  const [lang, setLangState] = useState(initialLang)
  /**
   * الإنجليزية chunk يُطلب عند الحاجة، فلا تحمل حزمةُ الدخول قاموسَ لغةٍ لا
   * يقرؤها الزائر. `injected` مدخلُ الفحوصات: تدخل باللغتين معًا فيبقى الاختبار
   * متزامنًا ولا ينتظر وحدةً ديناميكية (tests/entry.jsx).
   */
  const [en, setEn] = useState(() => injected?.en || null)
  // useMemo لا كائن جديد في كل رسم: `dicts` في اعتمادات value وt، ومرجعٌ يتغير كل
  // مرة كان يعيد رسم كل مستهلكي السياق (أي المتجر كله) عند أي تغيير
  const dicts = useMemo(() => injected || { ar: dictOf('ar'), en }, [injected, en])

  useEffect(() => {
    if (injected || lang !== 'en' || en) return
    let alive = true
    loadDict('en').then((d) => {
      if (alive) setEn(d)
    })
    return () => {
      alive = false
    }
  }, [injected, lang, en])
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
      localStorage.setItem(LANG_STORE, lang)
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
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang, toggleLang, theme, toggleTheme, dicts }),
    [lang, theme, setLang, toggleLang, toggleTheme, dicts],
  )

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(LangCtx)
  if (!ctx) throw new Error('useI18n must be used inside <LangProvider>')
  const { lang, dicts } = ctx

  /** t('nav.templates') or t('catalog.sub', { n: 12 }) */
  const t = useCallback(
    (path, vars) => {
      const get = (obj) =>
        String(path)
          .split('.')
          .reduce((o, k) => (o == null ? undefined : o[k]), obj)
      // الاحتياط إلى العربية قبل الإنجليزية: الإنجليزية قد لا تكون حُمّلت بعد
      // (chunk يُطلب عند الحاجة)، والعربية كاملة المفاتيح ومحمولة دائمًا
      let out = get(dicts[lang])
      if (out === undefined) out = get(dicts.ar)
      if (out === undefined) out = get(dicts.en)
      if (typeof out !== 'string') out = String(path)
      if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
      return out
    },
    [lang, dicts],
  )

  /** LA({ar:[],en:[]}) → قائمة دائمًا؛ حقل مفقود في منتج مُعدَّل لا يُسقط الصفحة عند .map() */
  const LA = useCallback(
    (field) => {
      let v = field
      if (v && typeof v === 'object' && !Array.isArray(v)) v = v[lang] ?? v.en ?? []
      if (typeof v === 'string') v = v ? [v] : []
      if (!Array.isArray(v)) return []
      return v.filter((x) => x != null && x !== '')
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

  return { ...ctx, t, L, LA }
}

/* ---------------- formatting ---------------- */
const NF = new Intl.NumberFormat('en-US')
export const num = (n) => NF.format(Math.round(n))
export const dec = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : d, maximumFractionDigits: d })

export function moneyParts(n, lang) {
  return { value: dec(n), unit: lang === 'ar' ? 'ر.س' : 'SAR', dir: 'ltr' }
}

/**
 * تاريخٌ مقروءٌ بلا اعتمادٍ على بيانات اللغة في بيئة التشغيل: أسماءُ الأشهر
 * مكتوبةٌ هنا، فيخرج «30 سبتمبر 2026» في كل متصفح وكل خادم — لا «2026-09-30»
 * في الشاشة العربية، ولا رقمًا بصيغةٍ يختارها المحرّك. الكوبونُ يُعرض أجلُه
 * للزائر، فلا يصحّ أن يتغيّر شكلُه بين بيئةٍ وأخرى.
 */
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function dateLabel(iso, lang = 'ar') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim())
  if (!m) return String(iso || '')
  const [, y, mo, d] = m
  const name = lang === 'ar' ? MONTHS_AR[Number(mo) - 1] : MONTHS_EN[Number(mo) - 1]
  return `${Number(d)} ${name} ${y}`
}
