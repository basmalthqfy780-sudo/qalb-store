/**
 * الحسابات وسوق المصممين — طبقة واحدة لأن الحساب موجودٌ ليُبَوِّب البيع.
 *
 * قاعدتان لا تُكسران هنا، وهما قاعدتا بقية الخادم:
 *
 *   1. **لا يُصدَّق ما يأتي من المتصفح.** سعر البيع يُختم من الإدراج المخزّن،
 *      وتقرير الفحص **يُعاد تشغيله هنا** من `src/data/inspect.js` — الوحدة نفسها
 *      التي يستوردها المتصفح — فإدراجٌ يحمل تقرير «accept» مُلفَّقًا يُفحص من
 *      جديد وتُشتق حالته من قرار الخادم.
 *   2. **الخطة لا تُرقّى من المتصفح.** `POST /accounts/:id/plan` بلا جلسة موظف
 *      يعيد 202 ويسجّل `planPending`، كما في خطط الاستضافة. التفعيل بيد موظف
 *      في اللوحة، لأن لا بوابة دفع موصولة تؤكده.
 *
 * الملفات (accounts.json · market.json · market-sales.json) تُختم 0600 عبر
 * `writePrivateJson`: فيها بريد البائع ومشتريه ومفاتيح الحسابات.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { sanitizeAccount, canCreate } from '../src/data/account.js'
import { planOf as planOfTier } from '../src/data/plans.js'
import { inspectListing, stateFromVerdict, kindOfReport, appealsLayer } from '../src/data/inspect.js'
import { applyReports, appealStateOf, payoutState, sanitizeListing, split, stateOf } from '../src/data/marketplace.js'
import { writePrivateJson, PRIVATE } from './seal.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_BODY = 256 * 1024 // حزمة قالب نصية كاملة، لا صورة
/**
 * خناق المحاولات **لكل صنف مسار**، لا حدًّا واحدًا على العنوان: تدفقٌ مشروع واحد
 * (حساب ← رفع قالب ← بيع) يمرّ بعدة طلبات، وحدٌّ عام كان يخنقه بينما يبقى
 * قصفُ مسارٍ واحد مفتوحًا. الأرقام لكل دقيقة ولكل عنوان IP.
 */
const RATE_WINDOW = 60_000
const RATE_MAX = { account: 5, listing: 10, sale: 12, report: 10, appeal: 6 }

const json = (res, code, body) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
  })
  res.end(JSON.stringify(body))
}

const readBody = (req) =>
  new Promise((done) => {
    let buf = ''
    let tooBig = false
    let settled = false
    const finish = (v) => {
      if (settled) return
      settled = true
      done(v)
    }
    req.on('data', (c) => {
      if (tooBig) return
      buf += c
      if (buf.length > MAX_BODY) {
        tooBig = true
        finish([null, true])
      }
    })
    req.on('end', () => {
      if (tooBig) return
      if (!buf) return finish([{}, false])
      try {
        finish([JSON.parse(buf), false])
      } catch {
        finish([null, false])
      }
    })
    req.on('error', () => finish([null, false]))
  })

const secret = (n = 20) => randomBytes(n).toString('base64url').slice(0, n)
const nowIso = () => new Date().toISOString()
const today = () => nowIso().slice(0, 10)

/** ما يُنشر للعامة: لا بريد بائع، ولا تفاصيل مخالفة، ولا مفاتيح */
function publicListing(row) {
  return {
    id: row.id,
    title: row.title,
    desc: row.desc,
    category: row.category,
    price: row.price,
    tags: row.tags,
    seller: row.sellerName || null,
    state: stateOf(row.state),
    score: row.report?.score ?? null,
    verdict: row.report?.verdict ?? null,
    sales: row.sales || 0,
    createdAt: row.createdAt,
  }
}

/** ما يراه صاحبه: كل شيء عدا مفتاح الحساب */
function ownerListing(row) {
  const { ...rest } = row
  return rest
}

export function createMarketApi({ dir, env = process.env, admin = null } = {}) {
  const ACCOUNTS = path.join(dir, 'accounts.json')
  const LISTINGS = path.join(dir, 'market.json')
  const SALES = path.join(dir, 'market-sales.json')
  const enabledFlag = env.QALB_MARKET !== 'off'

  const readJson = (file, fb) => {
    try {
      if (!existsSync(file)) return fb
      const v = JSON.parse(readFileSync(file, 'utf8'))
      return v ?? fb
    } catch {
      return fb // ملف تالف: نبدأ فارغًا ولا نسقط الطبقة
    }
  }
  const accounts = () => {
    const v = readJson(ACCOUNTS, {})
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  }
  const listings = () => {
    const v = readJson(LISTINGS, [])
    return Array.isArray(v) ? v : []
  }
  const sales = () => {
    const v = readJson(SALES, [])
    return Array.isArray(v) ? v : []
  }
  const writeAccounts = (m) => writePrivateJson(ACCOUNTS, m)
  const writeListings = (rows) => writePrivateJson(LISTINGS, rows)
  const writeSales = (rows) => writePrivateJson(SALES, rows)

  /* ---------- معدّل الطلبات: العنوان العام يُقنص ---------- */
  const hits = new Map()
  function rateOk(ip, bucket = 'listing') {
    const t = Date.now()
    const id = `${ip}·${bucket}`
    const max = RATE_MAX[bucket] ?? 10
    const arr = (hits.get(id) || []).filter((x) => t - x < RATE_WINDOW)
    if (arr.length >= max) {
      hits.set(id, arr)
      return false
    }
    arr.push(t)
    hits.set(id, arr)
    return true
  }
  const ipOf = (req) =>
    String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local')
      .split(',')[0]
      .trim()

  /* ---------- مصادقة الحساب: مفتاحٌ واحد لكل سجل ---------- */
  const keyHeader = (req) => String(req.headers['x-qalb-account-key'] || '')
  function findAccount(id) {
    const all = accounts()
    return all[id] ? { id, ...all[id] } : null
  }
  function authed(req, id) {
    const rec = findAccount(id)
    const key = keyHeader(req)
    if (!rec || !key || rec.key !== key) return null
    return rec
  }
  const byEmail = (email) => {
    const all = accounts()
    const id = Object.keys(all).find((k) => String(all[k].account?.email).toLowerCase() === String(email || '').toLowerCase())
    return id ? { id, ...all[id] } : null
  }
  /** خطة الحساب الفعّالة — يقرؤها السوق ليُبَوِّب البيع */
  const planOfAccount = (email) => {
    const rec = byEmail(email)
    return rec ? planOfTier(rec.account?.plan) : 'free'
  }

  /** مرجع الصور: إدراجات البائعين الآخرين على الخادم — لا قاعدة تجارية موصولة */
  function referenceFor(email) {
    const out = []
    for (const row of listings()) {
      if (String(row.email).toLowerCase() === String(email || '').toLowerCase()) continue
      for (const img of row.images || []) if (img.a || img.phash) out.push({ ref: `${row.id}/${img.name}`, a: img.a || img.phash, d: img.d || '' })
    }
    return out
  }

  async function handle(req, res, u) {
    if (!enabledFlag) return false
    const p = u.pathname
    if (!p.startsWith('/accounts') && !p.startsWith('/market') && !p.startsWith('/admin/market')) return false

    const isStaff = typeof admin?.who === 'function' ? !!admin.who(req) : false

    /* ============ الحسابات ============ */
    if (req.method === 'POST' && p === '/accounts') {
      if (!rateOk(ipOf(req), 'account')) return (json(res, 429, { error: 'too many requests', retryAfter: Math.ceil(RATE_WINDOW / 1000) }), true)
      const [body, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!body) return (json(res, 400, { error: 'invalid json' }), true)
      const email = String(body.email || '')
        .trim()
        .toLowerCase()
      if (!EMAIL_RE.test(email)) return (json(res, 400, { error: 'email required' }), true)
      // الإقرار شرطٌ لا يُتجاوز: بلا إقرارٍ بالفحص الآلي لا يُقبل حسابٌ يُرفع منه قالب
      if (body.consent !== true) return (json(res, 400, { error: 'consent required' }), true)
      if (byEmail(email)) return (json(res, 409, { error: 'an account already holds this e-mail' }), true)

      const id = `QA-${secret(3).toUpperCase()}`
      const account = sanitizeAccount({ ...body, id, email, plan: 'free', since: today() })
      const key = secret(24)
      const all = accounts()
      all[id] = { account, key, planPending: null, createdAt: nowIso() }
      writeAccounts(all)
      return (json(res, 201, { ok: true, account, key, note: 'no confirmation is mailed — no mailer is connected' }), true)
    }

    if (p.startsWith('/accounts/')) {
      const rest = p.slice('/accounts/'.length).split('/')
      const id = decodeURIComponent(rest[0])
      const action = rest[1] || ''

      if (req.method === 'GET' && !action) {
        const rec = authed(req, id)
        if (!rec) return (json(res, 401, { error: 'account key required' }), true)
        return (json(res, 200, { ok: true, account: rec.account, gate: canCreate(rec.account), planPending: rec.planPending }), true)
      }

      if (req.method === 'PATCH' && !action) {
        const rec = authed(req, id)
        if (!rec) return (json(res, 401, { error: 'account key required' }), true)
        const [body, tooBig] = await readBody(req)
        if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
        if (!body) return (json(res, 400, { error: 'invalid json' }), true)
        // الخطة ليست من حقّ المتصفح: تُرفض صراحة بدل أن تُتجاهل بصمت
        if ('plan' in body) return (json(res, 403, { error: 'the plan is not upgraded from the browser' }), true)
        const next = sanitizeAccount({ ...rec.account, ...body, email: rec.account.email, plan: rec.account.plan, id })
        const all = accounts()
        all[id] = { ...all[id], account: next }
        writeAccounts(all)
        return (json(res, 200, { ok: true, account: next }), true)
      }

      if (req.method === 'POST' && action === 'plan') {
        const rec = findAccount(id)
        if (!rec) return (json(res, 404, { error: 'no such account' }), true)
        const [body] = await readBody(req)
        const want = planOfTier(body?.plan)
        if (!isStaff) {
          // موظفٌ فقط يفعّل: المتصفح يسجّل طلبًا، كما في planPending للاستضافة
          if (!keyHeader(req) || rec.key !== keyHeader(req)) return (json(res, 401, { error: 'account key required' }), true)
          const all = accounts()
          all[id] = { ...all[id], planPending: { plan: want, at: nowIso() } }
          writeAccounts(all)
          return (json(res, 202, { ok: false, pending: true, plan: want, note: 'a person activates plans — no payment gateway is connected' }), true)
        }
        const all = accounts()
        all[id] = {
          ...all[id],
          account: sanitizeAccount({
            ...rec.account,
            plan: want,
            activations: [...(rec.account.activations || []), { plan: want, at: nowIso(), method: 'staff' }],
          }),
          planPending: null,
        }
        writeAccounts(all)
        return (json(res, 200, { ok: true, account: all[id].account }), true)
      }
    }

    /* ============ لوحة الموظف: الطابور والتظلّمات ============ */
    if (p === '/admin/market' && req.method === 'GET') {
      if (!isStaff) return (json(res, 401, { error: 'staff session required' }), true)
      const rows = listings().map((r) => ({ ...ownerListing(r), appeals: appealsLayer(r) }))
      return (
        json(res, 200, {
          ok: true,
          total: rows.length,
          byState: rows.reduce((a, r) => ({ ...a, [r.state]: (a[r.state] || 0) + 1 }), {}),
          quarantined: rows.filter((r) => r.state === 'quarantined').length,
          openAppeals: rows.filter((r) => r.appeals.appeal === 'open').length,
          listings: rows,
        }),
        true
      )
    }
    if (p.startsWith('/admin/market/') && req.method === 'PATCH') {
      if (!isStaff) return (json(res, 401, { error: 'staff session required' }), true)
      const id = decodeURIComponent(p.slice('/admin/market/'.length))
      const [body] = await readBody(req)
      const rows = listings()
      const at = rows.findIndex((r) => r.id === id)
      if (at === -1) return (json(res, 404, { error: 'no such listing' }), true)
      const patch = {}
      if (body && typeof body.appealState === 'string')
        patch.appeal = { ...(rows[at].appeal || {}), state: appealStateOf(body.appealState), resolvedAt: nowIso() }
      if (body && typeof body.state === 'string' && ['published', 'quarantined', 'rejected', 'frozen', 'delisted'].includes(body.state))
        patch.state = body.state
      rows[at] = { ...rows[at], ...patch, updatedAt: nowIso() }
      writeListings(rows)
      return (json(res, 200, { ok: true, listing: ownerListing(rows[at]) }), true)
    }

    /* ============ السوق ============ */
    if (req.method === 'GET' && (p === '/market' || p === '/market/')) {
      const q = String(u.searchParams.get('q') || '').toLowerCase()
      const cat = String(u.searchParams.get('category') || '')
      const rows = listings()
        .filter((r) => stateOf(r.state) === 'published')
        .filter((r) => !cat || r.category === cat)
        .filter((r) => !q || `${r.title} ${r.desc} ${(r.tags || []).join(' ')}`.toLowerCase().includes(q))
        .map(publicListing)
      return (json(res, 200, { ok: true, listings: rows, total: rows.length }), true)
    }

    if (req.method === 'GET' && p === '/market/mine') {
      const key = keyHeader(req)
      const rec = Object.values(accounts()).find((a) => a.key === key)
      if (!rec) return (json(res, 401, { error: 'account key required' }), true)
      const rows = listings()
        .filter((r) => r.email === rec.account.email)
        .map(ownerListing)
      return (json(res, 200, { ok: true, listings: rows, payouts: payoutState(sales().filter((s) => s.seller === rec.account.email)) }), true)
    }

    if (req.method === 'GET' && p === '/market/sales') {
      const key = keyHeader(req)
      const rec = Object.values(accounts()).find((a) => a.key === key)
      if (!rec) return (json(res, 401, { error: 'account key required' }), true)
      const rows = sales().filter((s) => s.seller === rec.account.email)
      return (json(res, 200, { ok: true, sales: rows, payouts: payoutState(rows) }), true)
    }

    if (req.method === 'POST' && (p === '/market' || p === '/market/')) {
      if (!rateOk(ipOf(req), 'listing')) return (json(res, 429, { error: 'too many requests', retryAfter: Math.ceil(RATE_WINDOW / 1000) }), true)
      const key = keyHeader(req)
      const rec = Object.values(accounts()).find((a) => a.key === key)
      if (!rec) return (json(res, 401, { error: 'account key required' }), true)
      const [body, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!body) return (json(res, 400, { error: 'invalid json' }), true)
      const listing = sanitizeListing(body.listing || body)
      if (!listing.rights) return (json(res, 400, { error: 'asset-rights acknowledgement required' }), true)
      if (listing.price == null) return (json(res, 400, { error: 'price out of range' }), true)
      if (!listing.files.length) return (json(res, 400, { error: 'no files to inspect' }), true)

      // الفحص هنا لا في المتصفح: الحالة تُشتق من قرار الخادم
      const report = inspectListing(listing, { reference: referenceFor(rec.account.email) })
      const row = {
        id: `QM-${secret(3).toUpperCase()}`,
        ...listing,
        sellerName: rec.account.answers?.name || null,
        email: rec.account.email,
        plan: planOfTier(rec.account.plan),
        state: stateFromVerdict(report.verdict),
        report,
        reports: [],
        appeal: null,
        sales: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      writeListings([row, ...listings()])
      return (json(res, 201, { ok: true, listing: ownerListing(row), report }), true)
    }

    if (p.startsWith('/market/')) {
      const rest = p.slice('/market/'.length).split('/')
      const id = decodeURIComponent(rest[0])
      const action = rest[1] || ''
      const rows = listings()
      const at = rows.findIndex((r) => r.id === id)
      if (at === -1) return (json(res, 404, { error: 'no such listing' }), true)
      const row = rows[at]

      if (req.method === 'POST' && action === 'inspect') {
        const owner = byEmail(row.email)
        if (!owner || owner.key !== keyHeader(req)) return (json(res, 403, { error: 'not yours' }), true)
        const report = inspectListing(row, { reference: referenceFor(row.email) })
        const frozen = applyReports(row.reports).frozen
        rows[at] = { ...row, report, state: frozen ? 'frozen' : stateFromVerdict(report.verdict), updatedAt: nowIso() }
        writeListings(rows)
        return (json(res, 200, { ok: true, listing: ownerListing(rows[at]), report }), true)
      }

      if (req.method === 'POST' && action === 'sales') {
        if (!rateOk(ipOf(req), 'sale')) return (json(res, 429, { error: 'too many requests', retryAfter: Math.ceil(RATE_WINDOW / 1000) }), true)
        const [body] = await readBody(req)
        const buyer = String(body?.buyer || '')
          .trim()
          .toLowerCase()
        if (!EMAIL_RE.test(buyer)) return (json(res, 400, { error: 'a valid buyer e-mail is required' }), true)
        if (stateOf(row.state) !== 'published') return (json(res, 409, { error: 'this listing is not available', state: row.state }), true)
        const sale = {
          id: `MS-${secret(3).toUpperCase()}`,
          listingId: id,
          seller: row.email,
          buyer,
          price: row.price, // السعر من الإدراج المخزّن لا من الطلب
          ...split(row.price),
          soldAt: today(),
          charged: false, // لا بوابة دفع: سُجّل ولم يُقبض
          at: nowIso(),
        }
        writeSales([sale, ...sales()])
        rows[at] = { ...row, sales: (row.sales || 0) + 1, updatedAt: nowIso() }
        writeListings(rows)
        return (json(res, 201, { ok: true, sale, note: 'recorded, not charged — no payment gateway is connected' }), true)
      }

      if (req.method === 'POST' && action === 'reports') {
        if (!rateOk(ipOf(req), 'report')) return (json(res, 429, { error: 'too many requests', retryAfter: Math.ceil(RATE_WINDOW / 1000) }), true)
        const [body] = await readBody(req)
        const reports = [...(row.reports || []), { kind: kindOfReport(body?.kind), note: String(body?.note || '').slice(0, 300), at: nowIso() }]
        const effect = applyReports(reports)
        rows[at] = { ...row, reports, state: effect.frozen ? 'frozen' : stateOf(row.state), updatedAt: nowIso() }
        writeListings(rows)
        return (json(res, 201, { ok: true, reports: effect }), true)
      }

      if (req.method === 'POST' && action === 'appeal') {
        const rec = Object.values(accounts()).find((a) => a.key === keyHeader(req))
        if (!rec || rec.account.email !== row.email) return (json(res, 403, { error: 'not yours' }), true)
        const [body] = await readBody(req)
        const text = String(body?.text || '').slice(0, 600)
        if (!text.trim()) return (json(res, 400, { error: 'an appeal needs a reason' }), true)
        rows[at] = { ...row, appeal: { state: 'open', text, at: nowIso() }, updatedAt: nowIso() }
        writeListings(rows)
        return (json(res, 201, { ok: true, listing: ownerListing(rows[at]) }), true)
      }
    }

    return false
  }

  return {
    handle,
    enabled: () => enabledFlag,
    planOf: planOfAccount,
    stats: () => {
      const rows = listings()
      const s = sales()
      return {
        accounts: Object.keys(accounts()).length,
        listings: rows.length,
        published: rows.filter((r) => stateOf(r.state) === 'published').length,
        quarantined: rows.filter((r) => stateOf(r.state) === 'quarantined').length,
        rejected: rows.filter((r) => stateOf(r.state) === 'rejected').length,
        frozen: rows.filter((r) => stateOf(r.state) === 'frozen').length,
        sales: s.length,
        grossRecorded: Math.round(s.reduce((a, x) => a + (Number(x.price) || 0), 0) * 100) / 100,
        files: { accounts: ACCOUNTS, listings: LISTINGS, sales: SALES, mode: PRIVATE.toString(8) },
      }
    },
  }
}

export default createMarketApi
