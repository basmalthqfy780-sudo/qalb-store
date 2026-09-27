import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { templates, couponInfo } from '../data/templates'
import { VAT } from '../data/tax.js'
import { applyOverlay } from '../data/catalog'
import { upsellById } from '../data/upsells'
import { fetchCatalog } from '../api'
import { auth as authApi } from '../api/auth'
import { cartKeyFor, wishKeyFor, mergeLines, mergeWish } from '../data/auth'

const StoreCtx = createContext(null)
// مفاتيحُ السلّة والمفضّلة لم تبقَ ثابتة: تُشتقّ من صاحب الجلسة في src/data/auth.js
// (`cartKeyFor` و`wishKeyFor`) — ومفتاحُ الضيف هو نفسُه القديم، فلا تفقد سلّةَ أحد.
const COUPON_KEY = 'qalb.coupon.v1'
const RECENT_KEY = 'qalb.recent.v1'
const PERSONAL_KEY = 'qalb.personalize.v1'
/** إضافات الطلب (خدمات/تقارير/اشتراكات): معرّفٌ واحد لكل إضافة، بلا كميات */
const ADDON_KEY = 'qalb.addons.v1'

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
  /**
   * صاحبُ السلّة: بريدُ الجلسة أو فراغٌ للضيف. المفاتيحُ تُشتقّ منه
   * (`qalb.cart.v2.<email>`)، فسلّةُ حسابٍ لا تختلط بسلّة ضيفٍ على جهازٍ مشترك،
   * وحسابان على جهازٍ واحد يجد كلٌّ منهما ما تركه.
   */
  const [owner, setOwner] = useState(() => authApi.current()?.email || '')
  const [lines, setLines] = useState(() => load(cartKeyFor(authApi.current()?.email), []))
  const [wish, setWish] = useState(() => load(wishKeyFor(authApi.current()?.email), []))
  const [coupon, setCoupon] = useState(() => load(COUPON_KEY, null))
  const [recent, setRecent] = useState(() => load(RECENT_KEY, []))
  // إضافات الطلب — خدماتٍ بشرية واشتراكات وتقارير، من src/data/upsells.js وحده:
  // المخزن يحفظ المعرّف، والسعر يُقرأ من الجدول عند كل حساب فلا ينجرف برقمٍ قديم
  const [addons, setAddons] = useState(() => load(ADDON_KEY, []).filter((id) => !!upsellById(id)))
  const [toasts, setToasts] = useState([])
  // تُحمَل مرّة واحدة وتُرفَق بكل طلب: صفحة المنتج تكتبها، والدفع يرسلها، والإيصال يقرأها
  const [personal, setPersonalState] = useState(() => ({ ...EMPTY_PERSONAL, ...load(PERSONAL_KEY, {}) }))
  // لقطة الكتالوج بعد دمج استثناءات لوحة الإدارة — قيمة حقيقية في الحالة،
  // فتُعاد الحسابات عند تغييرها بدل ما نعلّق على عدّاد لا تعرفه القواعد
  const [catalog, setCatalog] = useState(() => templates)
  /**
   * حالةُ مزامنة الكتالوج مع الخادم: `syncing` أثناء الجلب، `ready` بعده، و`offline`
   * حين تعذّر الوصول في وضع rest — فنعرض النسخة المصدرية ونقول ذلك للزائر بزرِّ
   * «إعادة المحاولة» بدل أن نبتلع الخطأ. في الوضع المحلي لا شبكة، فلا `offline` أبدًا.
   */
  const [catalogStatus, setCatalogStatus] = useState('syncing')
  const seq = useRef(0)
  /**
   * نسخةٌ محدَّثة من الحالتين يقرؤها مستمعُ الجلسة. لا تُكتب أثناء الرندر (قاعدة
   * react-hooks هنا) بل في أثرٍ مجرَّد، والجلسةُ تتغير بنقرة مستخدم بعد رسمٍ كامل.
   */
  const linesRef = useRef(lines)
  const wishRef = useRef(wish)
  useEffect(() => {
    linesRef.current = lines
  }, [lines])
  useEffect(() => {
    wishRef.current = wish
  }, [wish])

  // كلُّ كتابةٍ تذهب إلى مفتاح صاحبها الحالي (ضيفٌ أو حساب) — لا مفتاح واحد للجميع
  useEffect(() => save(cartKeyFor(owner), lines), [lines, owner])
  useEffect(() => save(wishKeyFor(owner), wish), [wish, owner])
  useEffect(() => save(COUPON_KEY, coupon), [coupon])
  useEffect(() => save(RECENT_KEY, recent), [recent])
  useEffect(() => save(PERSONAL_KEY, personal), [personal])
  useEffect(() => save(ADDON_KEY, addons), [addons])

  /**
   * الدخول والخروج كما يراهما المتجر:
   *   • **دخول**: تُدمج سلّةُ الضيف في سلّة الحساب (لا يُفقد ما أُضيف قبل الدخول)،
   *     وتُفرَّغ مفاتيحُ الضيف، ثم تصير الكتابةُ إلى مفتاح الحساب.
   *   • **خروج**: تُقرأ سلّةُ الضيف (فارغةٌ عادةً) ويرجع المتجر إليها — فلا يرى
   *     زائرٌ تالٍ سلّةَ من سبقه على الجهاز نفسه.
   */
  useEffect(() => {
    const apply = (session) => {
      const email = session?.email || ''
      setOwner(email)
      if (!email) {
        setLines(load(cartKeyFor(''), []))
        setWish(load(wishKeyFor(''), []))
        return
      }
      const key = cartKeyFor(email)
      const wkey = wishKeyFor(email)
      const merged = mergeLines(load(key, []), linesRef.current)
      const mergedW = mergeWish(load(wkey, []), wishRef.current)
      save(key, merged)
      save(wkey, mergedW)
      save(cartKeyFor(''), [])
      save(wishKeyFor(''), [])
      setLines(merged)
      setWish(mergedW)
    }
    const off = authApi.subscribe(apply)
    return () => off()
  }, [])

  /**
   * الاستثناءات المكتوبة من لوحة الإدارة تُدمج هنا وحدها — نفس الوحدة التي
   * يستخدمها خادم الطلبات، فلا يختلف السعر المعروض عن السعر المحاسَب به المشتري.
   */
  const refreshCatalog = useCallback(async () => {
    setCatalogStatus('syncing')
    let c
    try {
      c = await fetchCatalog()
    } catch {
      c = { offline: true }
    }
    const r = applyOverlay(c?.overrides || {})
    setCatalog([...templates])
    setCatalogStatus(c?.offline ? 'offline' : 'ready')
    return r
  }, [])

  useEffect(() => {
    let alive = true
    fetchCatalog()
      .then((c) => {
        if (!alive) return
        applyOverlay(c?.overrides || {})
        setCatalog([...templates])
        setCatalogStatus(c?.offline ? 'offline' : 'ready')
      })
      .catch(() => {
        /* بلا كتالوج مُعدَّل نعرض المصدر كما هو — لا نسقط الصفحة، ونقول ذلك */
        if (alive) setCatalogStatus('offline')
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

  // الإضافات المُلحقة بالطلب — تُحلّ من جدول upsells عند كل رسم، فسعرُها المصدرُ دائمًا
  const addonItems = useMemo(() => addons.map((id) => upsellById(id)).filter(Boolean), [addons])

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

  // مجموعةٌ كاملة بتحديثٍ واحد: استدعاءُ add ثلاثَ مراتٍ متتابعةٍ يقرأ كلٌّ منها نسخةً
  // قديمةً من lines فيسقط ما قبل الأخير — وهذا ما كان يفعله زرّ «أضف المجموعة».
  const addMany = useCallback((ids) => {
    let fresh = 0
    setLines((prev) => {
      const next = [...prev]
      for (const id of ids) {
        if (!id) continue
        const at = next.findIndex((l) => l.id === id)
        if (at === -1) {
          next.push({ id, qty: 1 })
          fresh++
        } else next[at] = { ...next[at], qty: Math.min(9, next[at].qty + 1) }
      }
      return next
    })
    return fresh
  }, [])

  const remove = useCallback((id) => setLines((p) => p.filter((l) => l.id !== id)), [])
  const setQty = useCallback(
    (id, qty) => setLines((p) => (qty <= 0 ? p.filter((l) => l.id !== id) : p.map((l) => (l.id === id ? { ...l, qty: Math.min(9, qty) } : l)))),
    [],
  )
  // إضافة/إسقاط خدمةٍ أو تقريرٍ أو اشتراك — واحدة من كل نوع، فلا معنى لكمية «٣ مراجعات ATS»
  const toggleAddon = useCallback(
    (id) => {
      if (!upsellById(id)) return false
      const hit = addons.includes(id)
      setAddons(hit ? addons.filter((x) => x !== id) : [...addons, id])
      return !hit
    },
    [addons],
  )
  const hasAddon = useCallback((id) => addons.includes(id), [addons])
  const clear = useCallback(() => {
    setLines([])
    setAddons([])
  }, [])

  const inCart = useCallback((id) => lines.some((l) => l.id === id), [lines])
  const toggleWish = useCallback((id) => {
    setWish((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }, [])

  /**
   * الكوبون يُقرأ من جدول القوالب وحده — نسبةً وأجلًا. رمزٌ منتهٍ لا يُطبَّق:
   * خصمٌ بلا تاريخٍ يُقرأ عرضًا دائمًا، وخصمٌ منتهٍ يُطبَّق يُقرأ كذبة. النتيجة
   * تُخبر الواجهة بالحالتين (`expired`) لتشرحهما للزائر بدل رسالةٍ واحدة مبهمة.
   */
  const applyCoupon = useCallback((raw) => {
    const code = String(raw || '')
      .trim()
      .toUpperCase()
    const info = couponInfo(code)
    if (!info) {
      setCoupon(null)
      return null
    }
    if (info.expired) {
      setCoupon(null)
      return { code, pct: info.pct, expired: true }
    }
    setCoupon({ code, pct: info.pct })
    return { code, pct: info.pct, expired: false, info }
  }, [])

  const totals = useMemo(() => {
    // الإضافات تدخل المجموع كما تدخله القوالب: سعرها من الجدول، والخصمُ يشملها معها
    const addonsSum = addonItems.reduce((s, a) => s + a.price, 0)
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0) + addonsSum
    const listPrice = items.reduce((s, i) => s + (i.oldPrice || i.price) * i.qty, 0)
    const deal = listPrice - items.reduce((s, i) => s + i.price * i.qty, 0)
    const discount = coupon ? (subtotal * coupon.pct) / 100 : 0
    // Listed prices are VAT-inclusive (Saudi standard), so the 15% is
    // extracted from the net amount rather than added on top.
    const net = subtotal - discount
    const vat = net - net / (1 + VAT)
    return {
      count: items.reduce((s, i) => s + i.qty, 0) + addonItems.length,
      subtotal,
      addonsSum,
      dealSavings: deal,
      discount,
      vat,
      total: net,
      vatInclusive: true,
    }
  }, [items, addonItems, coupon])

  /** يُحدَّث ثم يُنقّى في طبقة التوليد — المخزن لا يعرف قواعد الحقول */
  const setPersonal = useCallback((patch) => setPersonalState((p) => ({ ...p, ...patch })), [])
  const resetPersonal = useCallback(() => setPersonalState({ ...EMPTY_PERSONAL }), [])

  const value = {
    /**
     * `owner` بريدُ صاحب السلّة الحالي ('' للضيف) — يقرؤه الشريط وصفحتا السلّة
     * والمفضّلة ليقولا إن كانت هذه «سلّتي» أم «سلّة هذا المتصفح».
     */
    owner,
    cartKey: cartKeyFor(owner),
    personal,
    setPersonal,
    resetPersonal,
    catalog,
    catalogStatus,
    refreshCatalog,
    lines,
    items,
    add,
    addMany,
    remove,
    setQty,
    clear,
    inCart,
    addons,
    addonItems,
    toggleAddon,
    hasAddon,
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
