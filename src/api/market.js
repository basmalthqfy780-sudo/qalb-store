/**
 * عميل سوق المصممين — الإدراجات، الفحص الآلي، المبيعات، البلاغات، والتظلّم.
 *
 * الوضعان بعقدٍ واحد:
 *   local — الدفتر على الجهاز (`qalb.market.v1`) وخطُّ الفحص يُشغَّل في
 *           المتصفح من **الوحدة نفسها** التي يستوردها الخادم
 *           (src/data/inspect.js) — فلا «فحصان» بنتيجتين.
 *   rest  — server/market.js: يعيد تشغيل الخط على ما وصله ويختم القرار، فلا
 *           يُصدَّق تقريرٌ قادم من المتصفح (كما لا يُصدَّق سعرٌ قادم منه).
 *
 * وما لا يفعله الوضعان: لا يقبضان مالًا. لا بوابة دفع موصولة، فالبيع يُسجَّل
 * بتاريخه ويُحسب تقسيمه، والواجهة تقول ذلك بدل أن تُظهر زرّ «تم الدفع».
 */
import { BASE, apiMode, read, write } from './index'
import { inspectListing, stateFromVerdict } from '../data/inspect'
import { applyReports, sanitizeListing, split, stateOf } from '../data/marketplace'

export const MARKET_KEY = 'qalb.market.v1'
export const SALES_KEY = 'qalb.market-sales.v1'

const todayS = () => new Date().toISOString().slice(0, 10)
const stamp = () => new Date().toISOString()
const secret = (n) => {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint8Array(n)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf)
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
  return Array.from(buf, (b) => abc[b % abc.length]).join('')
}

const list = () => {
  const raw = read(MARKET_KEY, [])
  return Array.isArray(raw) ? raw : []
}
const saveAll = (rows) => write(MARKET_KEY, rows)

async function rest(path, { method = 'GET', body, key } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (key) headers['x-qalb-account-key'] = key
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data = {}
  try {
    data = text && text[0] === '{' ? JSON.parse(text) : { body: text }
  } catch {
    /* استجابة غير JSON (وسيط أو خطأ شبكة) — الحالة تكفي */
  }
  return { ok: res.ok, status: res.status, ...data }
}

/**
 * قاعدة مرجع الصور: في الوضع المحلي تُبنى من إدراجات البائع نفسه على هذا
 * الجهاز — لا قاعدة صور تجارية موصولة هنا، والطبقة الثانية تقول «لا مرجع»
 * حين تخلو بدل أن تدّعي مطابقة.
 */
function localReference(sellerEmail) {
  const out = []
  for (const row of list()) {
    if (!row.images) continue
    if (sellerEmail && String(row.email).toLowerCase() === String(sellerEmail).toLowerCase()) continue // صور الإدراج نفسه ليست مرجعًا عليه
    for (const img of row.images) if (img.a || img.phash) out.push({ ref: `${row.id}/${img.name}`, a: img.a || img.phash, d: img.d || '' })
  }
  return out
}

export const market = {
  mode: apiMode,

  /** ما يُعرض في السوق: المنشور وحده، مرتبًا بالأحدث */
  async browse({ q = '', category = '' } = {}) {
    if (apiMode === 'rest') return rest('/market')
    const rows = list()
      .filter((r) => stateOf(r.state) === 'published')
      .filter((r) => !category || r.category === category)
      .filter((r) => !q || `${r.title} ${r.desc} ${(r.tags || []).join(' ')}`.toLowerCase().includes(String(q).toLowerCase()))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    return { ok: true, status: 200, listings: rows, total: rows.length }
  },

  /** إدراجات البائع نفسه — بكل حالاتها، مع تقاريرها */
  async mine(email, key = '') {
    if (!email) return { ok: false, status: 401, error: 'no-account', listings: [] }
    if (apiMode === 'rest') return rest('/market/mine', { key })
    return {
      ok: true,
      status: 200,
      listings: list()
        .filter((r) => String(r.email).toLowerCase() === String(email).toLowerCase())
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    }
  },

  /**
   * رفع إدراج: يُنقّى، ثم يُفحص، ثم تُشتق حالته من القرار. لا مسار رابع —
   * فـ«منشور» لا تُكتب يدويًا أبدًا.
   */
  async submit(payload = {}, { email = '', key = '', reference = null } = {}) {
    const listing = sanitizeListing(payload)
    if (!email) return { ok: false, status: 401, error: 'no-account' }
    if (apiMode === 'rest') return rest('/market', { method: 'POST', body: { listing, email }, key })

    const ref = reference || localReference(email)
    const report = inspectListing(listing, { reference: ref })
    const row = {
      id: `QM-${secret(3).toUpperCase()}`,
      ...listing,
      email: String(email).toLowerCase(),
      state: stateFromVerdict(report.verdict),
      report,
      reports: [],
      appeal: null,
      sales: 0,
      createdAt: stamp(),
      updatedAt: stamp(),
    }
    saveAll([row, ...list()])
    return { ok: true, status: 201, listing: row, report }
  },

  /** إعادة الفحص بعد تعديل — القرار يُشتق من جديد، فلا يُرفع حجرٌ يدويًا */
  async reinspect(id, { email = '', key = '' } = {}) {
    if (apiMode === 'rest') return rest(`/market/${encodeURIComponent(id)}/inspect`, { method: 'POST', body: {}, key })
    const rows = list()
    const at = rows.findIndex((r) => r.id === id)
    if (at === -1) return { ok: false, status: 404, error: 'no-such-listing' }
    if (email && String(rows[at].email).toLowerCase() !== String(email).toLowerCase()) return { ok: false, status: 403, error: 'not-yours' }
    const report = inspectListing(rows[at], { reference: localReference(rows[at].email) })
    const frozen = applyReports(rows[at].reports).frozen
    rows[at] = { ...rows[at], report, state: frozen ? 'frozen' : stateFromVerdict(report.verdict), updatedAt: stamp() }
    saveAll(rows)
    return { ok: true, status: 200, listing: rows[at], report }
  },

  /**
   * تسجيل بيع. **تسجيلٌ لا قبض**: لا بوابة دفع هنا، والسعر يُختم من الإدراج
   * لا مما يرسله المتصفح، وتاريخ الإفراج يُحسب من مدة التأمين.
   */
  async buy(id, { buyer = '', key = '' } = {}) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(buyer))) return { ok: false, status: 400, error: 'email' }
    if (apiMode === 'rest') return rest(`/market/${encodeURIComponent(id)}/sales`, { method: 'POST', body: { buyer }, key })
    const rows = list()
    const at = rows.findIndex((r) => r.id === id)
    if (at === -1) return { ok: false, status: 404, error: 'no-such-listing' }
    if (stateOf(rows[at].state) !== 'published') return { ok: false, status: 409, error: 'not-available', state: rows[at].state }
    const sale = {
      id: `MS-${secret(3).toUpperCase()}`,
      listingId: id,
      seller: rows[at].email,
      buyer: String(buyer).toLowerCase(),
      price: rows[at].price, // السعر من الإدراج لا من الطلب
      ...split(rows[at].price),
      soldAt: todayS(),
      charged: false, // لا بوابة: سُجّل ولم يُقبض
    }
    rows[at] = { ...rows[at], sales: (rows[at].sales || 0) + 1, updatedAt: stamp() }
    saveAll(rows)
    const sales = read(SALES_KEY, [])
    write(SALES_KEY, [sale, ...(Array.isArray(sales) ? sales : [])])
    return { ok: true, status: 201, sale, listing: rows[at] }
  },

  /** مبيعات هذا البائع — تُقرأ منها حالة المستحقات (payoutState) */
  async sales(email) {
    if (apiMode === 'rest') return rest(`/market/sales?seller=${encodeURIComponent(email || '')}`)
    const rows = read(SALES_KEY, [])
    return {
      ok: true,
      status: 200,
      sales: (Array.isArray(rows) ? rows : []).filter((s) => String(s.seller).toLowerCase() === String(email || '').toLowerCase()),
    }
  },

  /** بلاغ: يُسجَّل فورًا، والتجميد عند العتبة لا بيد المبلّغ */
  async report(id, { kind = 'other', note = '' } = {}) {
    if (apiMode === 'rest') return rest(`/market/${encodeURIComponent(id)}/reports`, { method: 'POST', body: { kind, note } })
    const rows = list()
    const at = rows.findIndex((r) => r.id === id)
    if (at === -1) return { ok: false, status: 404, error: 'no-such-listing' }
    const reports = [...(rows[at].reports || []), { kind, note: String(note).slice(0, 300), at: stamp() }]
    const effect = applyReports(reports)
    rows[at] = { ...rows[at], reports, state: effect.frozen ? 'frozen' : stateOf(rows[at].state), updatedAt: stamp() }
    saveAll(rows)
    return { ok: true, status: 201, reports: effect, listing: rows[at] }
  },

  /** تظلّم: يُفتح ولا يُغلق آليًا — القرار لموظف */
  async appeal(id, text, { email = '', key = '' } = {}) {
    const body = String(text || '').slice(0, 600)
    if (!body.trim()) return { ok: false, status: 400, error: 'empty' }
    if (apiMode === 'rest') return rest(`/market/${encodeURIComponent(id)}/appeal`, { method: 'POST', body: { text: body }, key })
    const rows = list()
    const at = rows.findIndex((r) => r.id === id)
    if (at === -1) return { ok: false, status: 404, error: 'no-such-listing' }
    if (email && String(rows[at].email).toLowerCase() !== String(email).toLowerCase()) return { ok: false, status: 403, error: 'not-yours' }
    rows[at] = { ...rows[at], appeal: { state: 'open', text: body, at: stamp() }, updatedAt: stamp() }
    saveAll(rows)
    return { ok: true, status: 201, listing: rows[at] }
  },

  /** «امسح إدراجاتي من هذا المتصفح» — لا يمسّ ما على الخادم */
  forget(email) {
    const rows = list().filter((r) => String(r.email).toLowerCase() !== String(email || '').toLowerCase())
    saveAll(rows)
    return { ok: true, removed: list().length !== rows.length }
  },
}

export default market
