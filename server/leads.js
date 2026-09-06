/**
 * دفترُ طلبات الجهات. قبل هذا الملف كان «اطلبوا عقدًا» رسالةَ بريدٍ تُرمى في صندوق
 * واردٍ عام: تدخل عشرون جامعةٍ في شهر فلا يبقى منها سجلٌّ ولا حالةٌ ولا مَن تابع مَن.
 *
 * هنا يُكتب الطلبُ سطرًا في server/leads.json (خاضعٌ لنفس شرط 0600 الذي يخضع له دفتر
 * الطلبات)، وله رقمُ عرضٍ مشتقٌّ من محتواه فيطابق ما يقوله المتصفح وما يقرؤه الموظف.
 *
 * ما لا يفعله هذا الملف: لا يُرسل بريدًا، ولا يخلق حسابًا، ولا يَعِد بردٍّ في وقتٍ محدد.
 * ولا يُظهر قائمة الطلبات للعامة أبدًا — المسار العام POST فقط، والقراءةُ من /admin/*.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { B2B_TIERS } from '../src/data/b2b.js'
import { LEAD_STATUSES, leadCsv, normalizeLead } from '../src/data/leads.js'
import { PRIVATE, writePrivateJson } from './seal.js'

const json = (res, code, body) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
  })
  res.end(JSON.stringify(body))
}

const MAX_BODY = 24 * 1024
/** العنوانُ العام يُقنص: خمسُ طلباتٍ في الدقيقَة لكل IP، والسادسُ يُنتظر */
const RATE_WINDOW = 60_000
const RATE_MAX = 5
const STAFF_KEYS = ['status', 'staffNote', 'creditApplied'] // لا تُلمس من بابٍ عامّ

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

export function createLeadsApi({ dir, env = process.env, admin = null } = {}) {
  const FILE = path.join(dir, 'leads.json')
  const ON = () => env.QALB_LEADS !== 'off'

  const all = () => {
    if (!existsSync(FILE)) return {}
    try {
      const v = JSON.parse(readFileSync(FILE, 'utf8'))
      return v && typeof v === 'object' ? v : {}
    } catch {
      console.warn('qalb leads · leads.json unreadable — serving an empty ledger')
      return {}
    }
  }
  const save = (map) => writePrivateJson(FILE, map)
  const list = () =>
    Object.values(all())
      .filter((x) => x && typeof x === 'object')
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))

  const hits = new Map()
  const throttled = (ip) => (hits.get(ip) || []).filter((t) => Date.now() - t < RATE_WINDOW).length >= RATE_MAX
  const touch = (ip) => {
    const kept = (hits.get(ip) || []).filter((t) => Date.now() - t < RATE_WINDOW)
    kept.push(Date.now())
    hits.set(ip, kept)
  }
  const ipOf = (req) =>
    String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local')
      .split(',')[0]
      .trim()

  async function handle(req, res, u) {
    if (!ON()) return false

    /* ——— عام: تسجيلُ طلبٍ فقط، بلا قراءةٍ ولا عدٍّ ——— */
    if (u.pathname === '/leads' && req.method === 'POST') {
      const ip = ipOf(req)
      if (throttled(ip)) return (json(res, 429, { error: 'too many requests — wait a minute' }), true)
      const [b, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!b) return (json(res, 400, { error: 'json body required' }), true)
      const r = normalizeLead({ ...b, source: 'b2b' }, { tiers: B2B_TIERS, now: new Date() })
      if (!r.ok) return (json(res, 400, { error: 'fields missing', fields: Object.keys(r.errors) }), true)
      const map = all()
      const prev = map[r.value.quote]
      const first = !prev
      const next = prev ? { ...prev } : { ...r.value }
      if (prev) {
        /*
         * الطلبُ الثاني في نفس اليوم يحمل نفسَ الرقم: لا يمسح ما كُتب أول مرة، ولا يلمس
         * ما يملكه الموظف. الحقلُ الفارغُ في الإعادة فراغٌ لا تصحيحٌ — فلا يُكتب فوق قيمته.
         */
        for (const [k, v] of Object.entries(r.value)) {
          if (STAFF_KEYS.includes(k)) continue
          const empty = v === '' || v == null || v === false
          if (!empty || prev[k] === undefined) next[k] = v
        }
      }
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        map[r.value.quote] = next
        save(map)
      }
      if (first) touch(ip)
      return (json(res, first ? 201 : 200, { ok: true, quote: r.value.quote, at: next.at, where: 'ledger', money: next.money }), true)
    }
    if (u.pathname === '/leads') return (json(res, 405, { error: 'method not allowed' }), true)

    /* ——— اللوحة: القراءةُ والتصديرِ والتصنيف ——— */
    if (u.pathname.startsWith('/admin/leads')) {
      if (!admin) return (json(res, 503, { error: 'admin layer off' }), true)
      if (!admin.who(req)) return (json(res, 401, { error: 'session required' }), true)

      if (u.pathname === '/admin/leads' && req.method === 'GET') return (json(res, 200, { leads: list(), statuses: LEAD_STATUSES }), true)

      if (u.pathname === '/admin/leads.csv' && req.method === 'GET') {
        const rows = list()
        res.writeHead(200, {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="qalb-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
        })
        return (res.end(leadCsv(rows)), true)
      }

      const edit = u.pathname.match(/^\/admin\/leads\/([A-Z0-9-]+)$/)
      if (edit && req.method === 'PATCH') {
        const [b, tooBig] = await readBody(req)
        if (tooBig || !b) return (json(res, 400, { error: 'json body required' }), true)
        const map = all()
        const key = edit[1]
        if (!map[key]) return (json(res, 404, { error: 'no such lead' }), true)
        const next = { ...map[key] }
        if (b.status != null) {
          if (!LEAD_STATUSES.includes(b.status)) return (json(res, 400, { error: 'unknown status' }), true)
          next.status = b.status
        }
        if (b.staffNote != null) next.staffNote = String(b.staffNote).slice(0, 400)
        // ما دفعته الجهةُ في الباقة التجريبية: رقمٌ يُدخله الموظف، لا خصمٌ يُختلَع
        if (b.credit != null) {
          const c = Math.round(Number(b.credit) || 0)
          if (!Number.isFinite(c) || c < 0 || c > 1_000_000) return (json(res, 400, { error: 'credit must be 0..1000000' }), true)
          next.creditApplied = c
        }
        map[key] = next
        save(map)
        return (json(res, 200, { lead: next }), true)
      }
      if (u.pathname.startsWith('/admin/leads') && req.method !== 'GET' && req.method !== 'PATCH')
        return (json(res, 405, { error: 'method not allowed' }), true)
      if (u.pathname.startsWith('/admin/leads')) return (json(res, 404, { error: 'no such route' }), true)
    }

    return false
  }

  return {
    enabled: () => ON(),
    file: () => FILE,
    mode: () => (existsSync(FILE) ? 'file' : 'empty'),
    stats: () => {
      const rows = list()
      return { total: rows.length, open: rows.filter((r) => r.status === 'new').length, file: existsSync(FILE) ? '0600' : 'none' }
    },
    seal: () => PRIVATE,
    handle,
  }
}

export default createLeadsApi
