import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { templates, coupons } from '../data/templates'
import { VAT } from '../data/tax.js'
import { applyOverlay } from '../data/catalog'
import { fetchCatalog } from '../api'

const StoreCtx = createContext(null)
const CART_KEY = 'qalb.cart.v1'
const WISH_KEY = 'qalb.wish.v1'
const COUPON_KEY = 'qalb.coupon.v1'
const RECENT_KEY = 'qalb.recent.v1'
const PERSONAL_KEY = 'qalb.personalize.v1'

/** حقول التخصيص الاختياري — فارغة تعني «لا تُحقن شيء»، فالقالب يصل بنصوصه التجريبية */
export const EMPTY_PERSONAL = { on: false, name: '', role: '', email: '', phone: '', website: '', bio: '' }

const load = (k, fb) => {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : fb
  } catch {
    return fb
  }
}
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* localStorage may be full or blocked — never a hard requirement */
  }
}

export { VAT } from '../data/tax.js'

export function StoreProvider({ children }) {
  const [lines, setLines] = useState(() => load(CART_KEY, []))
  const [wish, setWish] = useState(() => load(WISH_KEY, []))
  const [coupon, setCoupon] = useState(() => load(COUPON_KEY, null))
  const [recent, setRecent] = useState(() => load(RECENT_KEY, []))
  const [toasts, setToasts] = useState([])
  // تُحمَل مرّة واحدة وتُرفَق بكل طلب: صفحة المنتج تكتبها، والدفع يرسلها، والإيصال يقرأها
  const [personal, setPersonalState] = useState(() => ({ ...EMPTY_PERSONAL, ...load(PERSONAL_KEY, {}) }))
  // لقطة الكتالوج بعد دمج استثناءات لوحة الإدارة — قيمة حقيقية في الحالة،
  // فتُعاد الحسابات عند تغييرها بدل ما نعلّق على عدّاد لا تعرفه القواعد
  const [catalog, setCatalog] = useState(() => templates)
  const seq = useRef(0)

  useEffect(() => save(CART_KEY, lines), [lines])
  useEffect(() => save(WISH_KEY, wish), [wish])
  useEffect(() => save(COUPON_KEY, coupon), [coupon])
  useEffect(() => save(RECENT_KEY, recent), [recent])
  useEffect(() => save(PERSONAL_KEY, personal), [personal])

  /**
   * الاستثناءات المكتوبة من لوحة الإدارة تُدمج هنا وحدها — نفس الوحدة التي
   * يستخدمها خادم الطلبات، فلا يختلف السعر المعروض عن السعر المحاسَب به المشتري.
   */
  const refreshCatalog = useCallback(async () => {
    const { overrides } = (await fetchCatalog()) || {}
    const r = applyOverlay(overrides || {})
    setCatalog([...templates])
    return r
  }, [])

  useEffect(() => {
    let alive = true
    fetchCatalog()
      .then((c) => {
        if (!alive) return
        applyOverlay(c?.overrides || {})
        setCatalog([...templates])
      })
      .catch(() => {
        /* بلا كتالوج مُعدَّل نعرض المصدر كما هو — لا نسقط الصفحة */
      })
    return () => {
      alive = false
    }
  }, [])

  /** remembers the last 6 products opened, newest first */
  const pushRecent = useCallback((id) => {
    setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 6))
  }, [])

  const toast = useCallback((msg, action) => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, msg, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  // يعتمد على لقطة catalog: تعديل سعر أو إخفاء منتج يحدّث السلة نفسها، لا الصفحة فقط
  const items = useMemo(
    () =>
      lines
        .map((l) => ({ ...l, t: catalog.find((x) => x.id === l.id) }))
        .filter((l) => l.t)
        .map((l) => ({ ...l.t, qty: l.qty })),
    [lines, catalog],
  )

  // Read the current lines here instead of inside the updater: React may call
  // an updater twice (StrictMode) or batch it, which made the "already in cart"
  // return value — and therefore the toast — unreliable.
  const add = useCallback(
    (id, qty = 1) => {
      const hit = lines.find((l) => l.id === id)
      setLines(hit ? lines.map((l) => (l.id === id ? { ...l, qty: Math.min(9, l.qty + qty) } : l)) : [...lines, { id, qty }])
      return !hit
    },
    [lines],
  )

  const remove = useCallback((id) => setLines((p) => p.filter((l) => l.id !== id)), [])
  const setQty = useCallback(
    (id, qty) => setLines((p) => (qty <= 0 ? p.filter((l) => l.id !== id) : p.map((l) => (l.id === id ? { ...l, qty: Math.min(9, qty) } : l)))),
    [],
  )
  const clear = useCallback(() => setLines([]), [])

  const inCart = useCallback((id) => lines.some((l) => l.id === id), [lines])
  const toggleWish = useCallback((id) => {
    setWish((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }, [])

  const applyCoupon = useCallback((raw) => {
    const code = String(raw || '')
      .trim()
      .toUpperCase()
    const found = coupons[code]
    if (!found) {
      setCoupon(null)
      return null
    }
    setCoupon({ code, pct: found.pct })
    return { code, pct: found.pct }
  }, [])

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const listPrice = items.reduce((s, i) => s + (i.oldPrice || i.price) * i.qty, 0)
    const deal = listPrice - subtotal
    const discount = coupon ? (subtotal * coupon.pct) / 100 : 0
    // Listed prices are VAT-inclusive (Saudi standard), so the 15% is
    // extracted from the net amount rather than added on top.
    const net = subtotal - discount
    const vat = net - net / (1 + VAT)
    return {
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
      dealSavings: deal,
      discount,
      vat,
      total: net,
      vatInclusive: true,
    }
  }, [items, coupon])

  /** يُحدَّث ثم يُنقّى في طبقة التوليد — المخزن لا يعرف قواعد الحقول */
  const setPersonal = useCallback((patch) => setPersonalState((p) => ({ ...p, ...patch })), [])
  const resetPersonal = useCallback(() => setPersonalState({ ...EMPTY_PERSONAL }), [])

  const value = {
    personal,
    setPersonal,
    resetPersonal,
    catalog,
    refreshCatalog,
    lines,
    items,
    add,
    remove,
    setQty,
    clear,
    inCart,
    wish,
    toggleWish,
    recent,
    pushRecent,
    coupon,
    applyCoupon,
    clearCoupon: () => setCoupon(null),
    totals,
    toasts,
    toast,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  }

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
