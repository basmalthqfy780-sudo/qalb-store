#!/usr/bin/env node
/**
 * Qalb · خدمة الطلبات (Node بدون أي اعتماديات)
 *
 *   node server/worker.js
 *
 * نقاط النهاية التي تتوقعها الواجهة (src/api/index.js):
 *   POST /orders            → يخزّن الطلب ويعيد id + key + date
 *   GET  /orders/:id        → إيصال واحد (لرابط /order?id=…)
 *   GET  /orders?email=…    → إيصالات المشتري
 *   GET  /licences/:key     → { valid, order, seats, domains }
 *   POST /org/redeem        → مقعدٌ من عقد مؤسسة: يطلب الترخيص بلا دفع (server/orgs.js)
 *   POST /leads              → طلبُ عقدٍ من جهة: يُسجَّل في server/leads.json (server/leads.js)
 *   /accounts · /market      → الحسابات وسوق المصممين: فحصٌ آلي يُعاد تشغيله هنا (server/market.js)
 *   GET  /catalog          → استثناءات الكتالوج التي تكتبها لوحة الإدارة
 *   GET  /download/:id?order=…&key=…  → رابط تسليم محمي لكل مشتري (server/deliver.js)
 *   GET  /dl/<token>       → الحزمة نفسها: qalb-<id>-<order>.zip، مرة واحدة وصالحة 10 دقائق
 *   POST /payments         → جلسةُ دفعٍ لطلبٍ مخزَّن (server/payments.js): بوّابةٌ أو تحويل
 *   GET  /payments/:order  → حالةُ الدفع، مع سؤالِ البوّابةِ نفسها إن كانت معلّقة
 *   POST /payments/:order/transfer → إبلاغُ المشتري بتحويلٍ أرسله (مرجعُ التحويل)
 *   POST /payments/webhook/:provider → إشعارُ بوّابة: توقيعٌ أو سؤالُ المصدر قبل القبض
 *   GET  /orders/:id/invoice?key=…   → فاتورةٌ ضريبيةٌ مطبوعة، لا تُفتح بلا مفتاح الترخيص
 *   /admin/*               → لوحة الإدارة (انظر server/admin.js وserver/README.md)
 *
 * التخزين: إن ضبطتَ SUPABASE_URL + SUPABASE_SERVICE_KEY يُرسَل الطلب إلى
 * PostgREST، وإلا يُكتب في server/orders.jsonl (كافٍ للتجربة ولساعة الصحو).
 * بيانات الإدارة (المستخدمون + تعديلات المنتجات + السرّ) ملفات JSON بجانبه
 * كلها في .gitignore: admins.json · products.json · .admin-secret · orders.jsonl،
 * وكلها تُختم 0600 على القرص عند الإقلاع (`server/seal.js`) — لأن دفتر الطلبات صار
 * يحمل اسم المشتري وجواله ونبذته، فلا يجوز أن يقرأه مستخدم آخر على نفس المضيف.
 *
 * ملاحظة أمان: لا تثق بالمجاميع القادمة من المتصفح — يُعاد حساب
 * subtotal/vat من بنود الطلب ويُرفض أي طلب لا يطابق (400).
 */
import { createServer } from 'node:http'
import { appendFile, readFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { templates, coupons } from '../src/data/templates.js'
import { upsellById } from '../src/data/upsells.js'
import { loadDotEnv } from '../scripts/dotenv.mjs'
import { createAdminApi } from './admin.js'
import { createDeliverApi } from './deliver.js'
import { PRIVATE, sealDir } from './seal.js'
import { createSitesApi } from './sites.js'
import { createLeadsApi } from './leads.js'
import { createOrgsApi } from './orgs.js'
import { createMarketApi } from './market.js'
import { VAT as VAT_RATE } from '../src/data/tax.js'
import { sanitizePersonal } from '../src/data/deliverable.js'
import { createPaymentsApi } from './payments.js'
import { createMailApi } from './mail.js'
import { invoiceHtml, receiptMail } from './invoice.js'
import { createSubscribersApi } from './subscribers.js'
import { DEFAULT_MAX_BODY, MAX_WEBHOOK_BODY, SlidingWindow, clientIp, endsWithNewline, readBody } from './http.js'
import { randKey } from '../src/lib/rand.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadDotEnv(ROOT) // PORT / SUPABASE_* من .env إن وُجد — node لا يقرأه وحده

const PORT = Number(process.env.PORT || 8787)
const VAT = VAT_RATE
const HERE = path.dirname(fileURLToPath(import.meta.url))
// Where writable state lives (orders + the admin overlay/user files). Kept separate
// from the code directory so a host can point it at a writable volume — and so the
// integration suite can run against a throwaway directory instead of real data.
const DATA = process.env.QALB_DATA_DIR ? path.resolve(ROOT, process.env.QALB_DATA_DIR) : HERE
if (DATA !== HERE) mkdirSync(DATA, { recursive: true, mode: 0o700 }) // المجلد نفسه: لا قائمة طلبات لجار على المضيف
const FILE = path.join(DATA, 'orders.jsonl')
const SEALED = sealDir(DATA) // نُصلح ما أُنشئ قبل شرط 0600

const SB = process.env.SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_KEY
const remote = SB && SB_KEY

const cors = (res) => {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type, idempotency-key')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
}
const send = (res, code, body) => {
  cors(res)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}
const now = () => new Date().toISOString().slice(0, 10)

/**
 * المفتاح والمعرّف من `src/lib/rand.js` — عشوائيةُ النظام الآمنة، لا `Math.random`
 * القابل للتنبؤ. الشكلُ المطبوع لم يتغير (مجموعاتٌ رباعية من 0-9A-Z)، لكن المعرّف
 * صار عشوائيًا كله: كان آخرُه ختمَ زمنٍ base36، أي أن جزءًا منه يُخمَّن من ساعة
 * الشراء — والمعرّفُ رابطُ قدرةٍ يُفتح به الإيصال ومعه المفتاح.
 */
const rand = randKey
const rid = () => `QALB-${rand(2)}`

/**
 * حدود القراءة: عدّادٌ لكل عنوان IP على مسارات الإيصالات (`/orders…` و`/licences…`).
 * المعرّف وحده كان يكفي لفتح إيصال، فالتعداد هو الباب الوحيد المتبقي — ويُقفل هنا.
 */
const LOOKUP_MAX = Math.max(10, Math.round(Number(process.env.QALB_LOOKUP_MAX) || 240))
const lookups = new SlidingWindow({ max: LOOKUP_MAX, windowMs: 10 * 60e3, cap: 5_000 })
const lookupBlocked = (req) => lookups.add(clientIp(req, process.env)) > LOOKUP_MAX

/** جلسات الدفع لكل عنوان في عشر دقائق — سقفٌ سخيٌّ فوق ما يفعله مشتري واحد */
const SESSION_MAX = Math.max(10, Math.round(Number(process.env.QALB_SESSION_MAX) || 60))
const sessions = new SlidingWindow({ max: SESSION_MAX, windowMs: 10 * 60e3, cap: 5_000 })

/**
 * ما يجوز أن يقرأه صاحب البريد من دفتر طلباته: حقولٌ معدودةٌ **بقائمة سماح**، لا
 * بحذفٍ من نسخة كاملة. فلا `key` (وهي ما يفتح التحميل)، ولا `phone` ولا `vatNo`
 * ولا `personalize` ولا `idempotency`، ولا `org` الذي يحمل رمز المؤسسة ومقاعدها.
 * الإيصال نفسه (`/orders/:id`) يبقى كاملًا لأن رابط البريد يفتحه — ومعرفه عشوائي.
 */
const BUYER_FIELDS = [
  'id',
  'date',
  'count',
  'method',
  'methodLabel',
  'currency',
  'subtotal',
  'discount',
  'vat',
  'vatRate',
  'total',
  'coupon',
  'invoice',
]
const buyerView = (o) => ({
  ...Object.fromEntries(BUYER_FIELDS.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])),
  lines: (Array.isArray(o.lines) ? o.lines : []).map((l) => ({ id: l.id, slug: l.slug ?? null, qty: l.qty || 1, price: l.price })),
  addons: (Array.isArray(o.addons) ? o.addons : []).map((a) => ({ id: a.id, price: a.price })),
})

/** ما يقوله الخادم للعميل صراحةً لأنه قاعدةُ شراء، وما عداه عطلٌ داخلي يُسجَّل ولا يُطبع */
const PUBLIC_ERROR = /^(lines required|unknown template:|unknown add-on:|unknown coupon:|expired coupon:|total mismatch|order not found)/

const admin = createAdminApi({
  dir: DATA,
  vat: VAT,
  env: process.env,
  orders: load,
  baseIds: () => templates.map((t) => t.id),
})

async function load() {
  if (remote) {
    const r = await fetch(`${SB}/rest/v1/orders?select=*&order=created_at.desc&limit=500`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
    return r.ok ? r.json() : []
  }
  if (!existsSync(FILE)) return []
  const rows = []
  ;(await readFile(FILE, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .forEach((l, i) => {
      try {
        rows.push(JSON.parse(l))
      } catch {
        // سطر نصف-mكتوب (عملية قُتلت في أثناء الحفظ، أو تحرير يدوي) لا يسقط
        // الدفتر كلّه: نتجاوزه ونقول أين، بدل 500 على كل شاشة الإدارة.
        console.warn(`qalb api · unreadable ${path.basename(FILE)} line ${i + 1} skipped`)
      }
    })
  return rows
}

async function save(order) {
  if (remote) {
    const r = await fetch(`${SB}/rest/v1/orders`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json', prefer: 'return=representation' },
      body: JSON.stringify(order),
    })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    return (await r.json())[0] || order
  }
  // سطرٌ ناقص في آخر الدفتر (ملف كُتب يدويًا أو سُطر نصفه) لا يبتلع الطلب التالي:
  // نضع فاصلًا قبل الملحق إن لم يكن المنتهي فاصلة — وإلا صار سطران JSON في سطر واحد
  // فيسقطهما load() بصمت، وهو أسوأ ما يحدث لدفتر فيه مال.
  await appendFile(FILE, (endsWithNewline(FILE) ? '' : '\n') + JSON.stringify(order) + '\n', { encoding: 'utf8', mode: PRIVATE })
  return order
}

/**
 * المجاميع شاملة الضريبة — تُعاد حسابها هنا ولا تُؤخذ من العميل.
 * v1.5.0: الطلبُ قوالبُ و/أو إضافاتٌ (خدمات وتقارير واشتراكات من
 * src/data/upsells.js)، والكوبونُ يُصدَّق من جدول القوالب لا من نسبةٍ يقولها المتصفح.
 */
function recompute(body, extra = {}) {
  const lines = Array.isArray(body.lines) ? body.lines : []
  const addons = Array.isArray(body.addons) ? body.addons : []
  if (!lines.length && !addons.length) throw new Error('lines required')
  const table = PRICES()
  const unit = (id) => {
    const hit = table[id]
    if (hit == null) throw new Error(`unknown template: ${id}`)
    return hit
  }
  const addonUnit = (id) => {
    const hit = upsellById(id)
    if (!hit) throw new Error(`unknown add-on: ${id}`)
    return hit.price
  }
  const lineSum = lines.reduce((s, l) => s + unit(l.id) * (l.qty || 1), 0)
  const addonSum = addons.reduce((s, a) => s + addonUnit(a.id), 0)
  const subtotal = Math.round((lineSum + addonSum) * 100) / 100
  // الكوبون من الجدول لا من العميل: نسبةٌ مُختلَقة مع رمزٍ صحيح كانت ستُمرَّر قبل اليوم.
  // استثناءٌ واحد: مسارٌ داخل الخادم (استبدال مقعد مؤسسة) يمرر نسبته في extra —
  // لأن 100% هناك ثمنُ مقعدٍ دُفع في عقد، لا خصمًا يختاره المتصفح.
  const trustedPct = extra && Number.isFinite(Number(extra.couponPct)) ? Number(extra.couponPct) : null
  let pct
  let label
  if (trustedPct != null) {
    pct = trustedPct
    label = pct ? `${String(body.coupon || '')} ${pct}%` : body.coupon || null
  } else {
    const code = String(body.coupon || '')
      .trim()
      .toUpperCase()
    const known = code ? coupons[code] : null
    if (code && !known) throw new Error(`unknown coupon: ${code}`)
    // رمزٌ منتهٍ لا يُختم على الطلب: للخصم أجلٌ مكتوبٌ في جدوله (src/data/templates.js)
    // يعرضه المتجر للزائر، فدفترُ الطلبات لا يسجّل خصمًا لم يعد قائمًا لحظة الشراء.
    if (known && known.endsAt && now() > known.endsAt) throw new Error(`expired coupon: ${code}`)
    pct = known ? known.pct : 0
    label = pct ? `${code} ${pct}%` : body.coupon || null
  }
  const discount = Math.round(subtotal * (pct / 100) * 100) / 100
  const net = Math.round((subtotal - discount) * 100) / 100
  const vat = Math.round((net - net / (1 + VAT)) * 100) / 100
  const drift = Math.abs(net - Number(body.total))
  if (drift > 0.5) throw new Error(`total mismatch (${drift.toFixed(2)} SAR)`)
  // السعر الذي حوسب فعلًا يُختم على السطر: لو تغيّر سعر القالب بعد الطلب،
  // يجب أن يبقى إيراد الماضي كما دُفع، لا كما يُسعَّر اليوم
  const stamped = lines.map((l) => ({ id: l.id, slug: l.slug || null, qty: l.qty || 1, price: unit(l.id) }))
  // والإضافات كذلك: سعرُها من الجدول ختمًا، فلا يُخزَّن سعرٌ قيل للمتصفح
  const stampedAddons = addons.map((a) => ({ id: a.id, price: addonUnit(a.id) }))
  return {
    lines: stamped,
    addons: stampedAddons,
    subtotal,
    discount,
    vat,
    total: net,
    coupon: label,
  }
}

/**
 * كتالوج الأسعار — مصدر واحد للحقيقة: نفس الوحدة التي يدمج بها المتجر تعديلات
 * لوحة الإدارة (src/data/catalog.js + server/products.json). القالب المخفيّ
 * لا يظهر هنا، فلا يمكن شراؤه بعد إخفائه.
 */
const PRICES = () => admin.prices()

/**
 * طبقة التسليم: تبني حزمة القالب من src/data/deliverable.js لحظة الطلب وتوقّع رابطًا
 * أحادي الاستخدام. لا تُخزَّن أي حزمة في public/، فذاك ملف قابل للمشاركة بلا طلب ولا رخصة.
 */
/**
 * الاستضافة بالاشتراك: سجلّ المواقع + تقديمها من نفس مولّدات الحزمة. يُركَّب قبل
 * اللوحة لأن النطاق الفرعي يستولي على أي مسار (`نورة.qalb.store/print`)، ولأن
 * `/admin/sites` ملك هذه الطبقة لا طبقة المنتجات.
 */
const sites = createSitesApi({ dir: DATA, env: process.env, admin })

// مقاعد المؤسسة: تُخصم لحظة استبدال الطالب، والطلب يُكتب من makeOrder نفسها التي يستعملها المتجر.
const orgs = createOrgsApi({ dir: DATA, env: process.env, admin, makeOrder })
const leads = createLeadsApi({ dir: DATA, env: process.env, admin })
// الحسابات وسوق المصممين: الفحص يُعاد تشغيله هنا من src/data/inspect.js، والخطة
// لا تُرقّى من المتصفح — انظر server/market.js
const market = createMarketApi({ dir: DATA, env: process.env, admin })

/** البريد الخارج: بوّابةٌ إن وُجد مفتاح، وصندوقُ صادرٍ على القرص إن لم يوجد */
const mail = createMailApi({ dir: DATA, env: process.env })

/**
 * رابطُ الطلب الذي يُرسل في البريد: صفحةُ الإيصال نفسها فيها روابطُ التحميل،
 * فلا نبعثُ روابطَ موقّعةً تنتهي صلاحيتُها قبل أن يفتح المشتري بريده.
 */
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/+$/, '')
const API_PUBLIC = (process.env.QALB_API_PUBLIC || process.env.VITE_QALB_API_BASE || `http://localhost:${PORT}`).replace(/\/+$/, '')

/**
 * النشرة والقالب المجاني: بريدُ الزائر مقابل ملفٍ يُسلَّم. الطلبُ الصفريّ يُبنى
 * من `makeOrder` نفسها — الطريقُ الوحيد الذي يكتب دفترَ الطلبات — فلا يمرّ
 * مجانيٌّ من بابٍ غير بابِ الشراء.
 */
const subs = createSubscribersApi({ dir: DATA, env: process.env, orders: load, makeOrder, apiPublic: API_PUBLIC })
const orderUrl = (order) => `${SITE}/order?id=${encodeURIComponent(order.id)}`
const invoiceUrl = (order) => `${API_PUBLIC}/orders/${encodeURIComponent(order.id)}/invoice?key=${encodeURIComponent(order.key || '')}`

/**
 * المدفوعات. دفترُها مستقلٌّ عن دفتر الطلبات (سطرٌ جديدٌ لكلّ تغيير حالة)،
 * والقبضُ يمرّ من البوّابة نفسها لا من إشعارٍ بلا مصدر. بعدَ الدفع: بريدُ
 * إيصالٍ فيه الفاتورةُ وروابطُ التسليم — وخطؤه لا يُلغي سطرَ دفعٍ صحيح.
 */
const payments = createPaymentsApi({
  dir: DATA,
  env: process.env,
  orders: load,
  onPaid: async (order, payment) => {
    const { subject, text, html } = receiptMail(order, { lang: 'ar', payment, downloadUrl: orderUrl(order), invoiceUrl: invoiceUrl(order) })
    await mail.send({ to: order.email, subject, text, html })
  },
})

const deliver = createDeliverApi({
  dir: DATA,
  env: process.env,
  orders: load,
  prices: PRICES,
  overrides: () => admin.overrides(),
  tpls: templates,
})

/**
 * السطر الوحيد الذي يكتب دفتر الطلبات: تُبنى منه الحقول وتُختم المجاميع فيه، فيستعمله
 * الشراءُ الفردي واستبدالُ مقعدٍ من مؤسسة — نسخة واحدة من الحساب، لا مسارٌ ثانٍ ينفصل.
 */
async function makeOrder(body, extra = {}) {
  const math = recompute(body, extra)
  return save({
    id: rid(),
    key: rand(4),
    date: now(),
    email: body.email,
    name: body.name,
    phone: body.phone || null,
    country: body.country || null,
    currency: 'SAR',
    vatRate: VAT,
    count: body.count || math.lines.reduce((s, l) => s + (l.qty || 1), 0) + math.addons.length,
    method: body.method || 'card',
    methodLabel: body.methodLabel || null,
    invoice: !!body.invoice,
    vatNo: body.vatNo || null,
    // تخصيص المشتّر الاختياري: تُنقّى هنا بنفس دالة المتجر، ثم تُقرأ عند التوليد
    personalize: sanitizePersonal(body.personalize),
    ...math,
    ...extra,
  })
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (u.pathname === '/health')
    return send(res, 200, {
      ok: true,
      store: remote ? 'supabase' : 'jsonl',
      vat: VAT,
      admin: admin.enabled(),
      deliver: { ttl: deliver.ttl(), perIp: deliver.perIp() },
      hosting: sites.enabled() ? { root: sites.root(), ...sites.stats() } : false,
      orgs: orgs.enabled() ? orgs.stats() : false,
      leads: leads.enabled() ? leads.stats() : false,
      market: market.enabled() ? market.stats() : false,
      payments: payments.stats(),
      mail: mail.stats(),
      subscribers: subs.stats(),
    })

  // طبقة الاستضافة خارج try/catch الأسفل: لو أخطأت هي فلا تُسقط المتجر كلّه
  try {
    if (await sites.handle(req, res, u)) return // الاستضافة — انظر server/sites.js
  } catch (e) {
    // السببُ يُسجَّل ولا يُطبع: رسالةُ عطلٍ داخلي تصل المتصفح تكشف ما وراء الواجهة
    console.warn(`qalb api · hosting layer failed on ${req.method} ${u.pathname}: ${String(e?.message || e).slice(0, 200)}`)
    if (!res.headersSent) send(res, 500, { error: 'hosting layer failed' })
    return
  }
  if (await orgs.handle(req, res, u)) return // مقاعد المؤسسات — قبل اللوحة: /admin/orgs ملك هذه الطبقة
  if (await leads.handle(req, res, u)) return // طلبات الجهات — انظر server/leads.js
  if (await market.handle(req, res, u)) return // الحسابات والسوق — قبل اللوحة: /admin/market ملك هذه الطبقة
  if (await subs.handle(req, res, u)) return // النشرة والقالب المجاني — انظر server/subscribers.js
  if (await admin.handle(req, res, u)) return
  if (await deliver.handle(req, res, u)) return // التسليم المحمي — انظر server/deliver.js

  try {
    if (req.method === 'POST' && u.pathname === '/orders') {
      // حدٌّ صريح على الجسم: طلبُ متجرٍ لا يتجاوز بضع عشرات من الكيلوبايت، وما زاد
      // يُرفض قبل أن يُخزَّن — لا بعد ابتلاعه كاملًا في الذاكرة
      const got = await readBody(req, DEFAULT_MAX_BODY)
      if (got.tooBig) return send(res, 413, { error: 'body too large' })
      if (!got.body) return send(res, 400, { error: 'json body required' })
      const body = got.body
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(body.email || '')) return send(res, 400, { error: 'email required' })
      if (!String(body.name || '').trim()) return send(res, 400, { error: 'name required' })

      const idem = req.headers['idempotency-key']
      if (idem) {
        const all = await load()
        const dup = all.find((o) => o.idempotency === idem)
        if (dup) return send(res, 200, dup) // إعادة إرسال نفس الطلب لا تنشئ طلبًا جديدًا
      }

      return send(res, 201, await makeOrder(body, { idempotency: idem || null }))
    }

    /* ——— الفاتورة: قبل مسار /orders/:id، لأنه يقرأ آخرَ مقطعٍ معرّفًا ——— */
    if (req.method === 'GET' && /^\/orders\/[^/]+\/invoice$/.test(u.pathname)) {
      const id = decodeURIComponent(u.pathname.split('/')[2])
      const hit = (await load()).find((o) => o.id === id)
      // مفتاحُ الترخيص شرطٌ: فاتورةٌ فيها اسمُ المشتري وبريده لا تُفتح برقم الطلب وحده
      if (!hit) return send(res, 404, { error: 'not found' })
      if (String(u.searchParams.get('key') || '').toUpperCase() !== String(hit.key || '').toUpperCase())
        return send(res, 403, { error: 'licence key required' })
      const payment = await payments.statusOf(id)
      res.setHeader('access-control-allow-origin', '*')
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      return res.end(invoiceHtml(hit, { env: process.env, lang: u.searchParams.get('lang') === 'en' ? 'en' : 'ar', payment, siteUrl: SITE }))
    }

    /* ——— المدفوعات: إنشاءُ جلسة، وحالة، وإبلاغُ تحويل، وإشعارُ بوّابة ——— */
    if (req.method === 'POST' && u.pathname === '/payments') {
      // جلسةُ دفعٍ تكتب سطرًا في الدفتر **وتُرسل بريدًا** للمشتري: فبلا حدٍّ يصير
      // المسار أداة إغراق لصندوق أيّ مشتري يعرف المهاجم رقم طلبه
      if (sessions.add(clientIp(req, process.env)) > SESSION_MAX) return send(res, 429, { error: 'too many payment sessions — wait a few minutes' })
      const got = await readBody(req, DEFAULT_MAX_BODY)
      if (got.tooBig) return send(res, 413, { error: 'body too large' })
      const body = got.body || {}
      const rec = await payments.create({ orderId: String(body.order || '').trim(), method: body.method || null })
      // بريدٌ فوريٌّ بتعليمات الدفع قبل أن يغلق المشتري التبويب
      const order = (await load()).find((o) => o.id === rec.order)
      if (order && rec.status !== 'paid') {
        const m = receiptMail(order, { lang: 'ar', payment: rec, downloadUrl: orderUrl(order), invoiceUrl: invoiceUrl(order) })
        await mail.send({ to: order.email, subject: m.subject, text: m.text, html: m.html })
      }
      return send(res, 201, rec)
    }

    if (req.method === 'POST' && /^\/payments\/[^/]+\/transfer$/.test(u.pathname)) {
      const id = decodeURIComponent(u.pathname.split('/')[2])
      const got = await readBody(req, DEFAULT_MAX_BODY)
      if (got.tooBig) return send(res, 413, { error: 'body too large' })
      const body = got.body || {}
      return send(res, 200, await payments.noteTransfer(id, body.ref))
    }

    if (req.method === 'POST' && /^\/payments\/webhook\/[^/]+$/.test(u.pathname)) {
      const which = u.pathname.split('/').pop().toLowerCase()
      // النصّ الخام: توقيعُ Stripe يُحسَب على البايتات لا على ما ينتجه JSON.parse —
      // بسقفٍ هو الآخر، فإشعارُ بوّابة لا يبلغ ميجابايت
      const got = await readBody(req, MAX_WEBHOOK_BODY)
      if (got.tooBig) return send(res, 413, { error: 'body too large' })
      const r = await payments.handleWebhook(which, got.raw || '', req.headers)
      return send(res, r.ok ? 200 : 401, r)
    }

    if (req.method === 'GET' && u.pathname.startsWith('/payments/')) {
      const id = decodeURIComponent(u.pathname.split('/').pop())
      const cur = await payments.statusOf(id)
      if (!cur) return send(res, 404, { error: 'no payment for this order' })
      // حالةٌ معلّقة مع بوّابة: يُسأل المصدرُ نفسُه، فلا نقول «مدفوع» من دفترنا وحده
      const fresh = cur.status === 'paid' ? cur : await payments.verifyRemote(id)
      return send(res, 200, fresh || cur)
    }

    if (req.method === 'GET' && u.pathname.startsWith('/orders/')) {
      if (lookupBlocked(req)) return send(res, 429, { error: 'too many lookups — wait a few minutes' })
      const id = decodeURIComponent(u.pathname.split('/').pop())
      const hit = (await load()).find((o) => o.id === id)
      return hit ? send(res, 200, hit) : send(res, 404, { error: 'not found' })
    }

    if (req.method === 'GET' && u.pathname === '/orders') {
      if (lookupBlocked(req)) return send(res, 429, { error: 'too many lookups — wait a few minutes' })
      const email = (u.searchParams.get('email') || '').toLowerCase()
      const all = await load()
      /**
       * بلا بريدٍ هذه قائمةُ المتجر كلِّها، وفيها اسمُ كلِّ مشتري وجواله ومفتاحُ
       * ترخيصه — فلا تُقرأ إلا بجلسة موظف. والواجهة لا تستدعيها أصلًا: مسار
       * الإيصالات (`?email=`) هو ما تستعمله صفحةُ «تتبّع طلبك»، وهو يعيد نسخةً
       * منقوصة بقائمة سماح (`buyerView`) لا مفتاح فيها ولا جوال ولا رمز مؤسسة.
       */
      if (!email) {
        if (!admin.who(req)) return send(res, 401, { error: 'staff session required' })
        return send(res, 200, all.slice(0, 50))
      }
      return send(res, 200, all.filter((o) => String(o.email).toLowerCase() === email).map(buyerView))
    }

    if (req.method === 'GET' && u.pathname.startsWith('/licences/')) {
      if (lookupBlocked(req)) return send(res, 429, { error: 'too many lookups — wait a few minutes' })
      const key = decodeURIComponent(u.pathname.split('/').pop()).toUpperCase()
      const hit = (await load()).find((o) => o.key === key)
      return send(res, 200, hit ? { valid: true, order: hit.id, seats: 1, domains: '*' } : { valid: false })
    }

    send(res, 404, { error: 'no such route' })
  } catch (e) {
    /**
     * رسائلُ التحقق وحدها تصل العميل: هي قواعدُ شراءٍ يحتاجها (سعرٌ تغيّر، رمزٌ
     * منتهٍ، قالبٌ مسحوب). وما عداها — عطلٌ في Supabase أو مسارٌ داخلي — يُسجَّل
     * هنا ويصل العميلَ بعنوانٍ عام، فلا تُطبع تفاصيلُ الخادم في متصفحه.
     */
    const msg = String(e?.message || e)
    if (PUBLIC_ERROR.test(msg)) return send(res, 400, { error: msg })
    console.warn(`qalb api · ${req.method} ${u.pathname} refused: ${msg.slice(0, 200)}`)
    send(res, 400, { error: 'bad request' })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  admin.enabled() // يهيّئ حساب المالك من ADMIN_PASSWORD قبل أول طلب، فلا تُخبر /health بغير الحقيقة
  console.log(
    `qalb api · http://0.0.0.0:${PORT} · store=${remote ? 'supabase' : 'jsonl'} · admin=${admin.enabled() ? 'on' : 'off'} · re-sealed=${SEALED.length}`,
  )
})
