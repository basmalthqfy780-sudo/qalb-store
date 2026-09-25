/**
 * مقاعد المؤسسات: سجلّ جهة واحدة = رمزٌ + عدد مقاعد + سنة.
 *
 * لا شيء هنا «يدفع»: العقد والفاتورة ورقةٌ موقَّعة خارج المتجر، والمقعد يُخصم لحظة
 * استبدال الطالب ترخيصه. مسار الطلب نفسه (‎makeOrder‎ عند worker.js) هو ما يُنشئ
 * الترخيص — فلا مسار ثانٍ للتسليم ولا مفتاح بصيغة مختلفة، والتلميذ يأخذ نفس ما يأخذه
 * المشتري: مفتاحًا، وحزمةً موقّعة، وسيرةً تُولَّد من مولّدات القالب.
 *
 * ما لا يُعرَض أبدًا للوحة: بريد الطالب. السجلّ يحفظه ليمنع استبدال المقعد مرتين،
 * واللوحة ترى العددَ والقوالبَ فقط (‎orgRowForStaff‎).
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  B2B_TIERS,
  ORG_CODE_RE,
  SEAT_TEMPLATES,
  makeOrg,
  makeOrgCode,
  normalizeCode,
  orgCsv,
  orgRowForStaff,
  orgSummary,
  redeemReason,
  seatLeft,
} from '../src/data/b2b.js'
import { sanitizePersonal } from '../src/data/deliverable.js'
import { writePrivateJson } from './seal.js'
import { SlidingWindow, clientIp, readBody as readBodyShared } from './http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_BODY = 32 * 1024
const FAIL_WINDOW = 60_000 // رموز المقاعد تُخمَّن: ثلاث محاولات فاشية في الدقيقة تُقفَل
const FAIL_MAX = 3

const json = (res, code, body, extra = {}) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    ...extra,
  })
  res.end(JSON.stringify(body))
}
const text = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' })
  res.end(body)
}

/**
 * يعيد [القيمة, هل تجاوز الحجم] — نفس العقد، والقراءة من `server/http.js`: حدٌّ
 * صريح يُرفض عنده الجسم قبل تخزينه، وتجميعٌ بـ`Buffer` فلا ينشقّ حرفٌ عربيٌّ بين
 * قطعتين (`buf += c` كانت تحوّل كل قطعة وحدها utf-8 فتُفسد الاسم العربي).
 */
const readBody = async (req) => {
  const got = await readBodyShared(req, MAX_BODY)
  return [got.tooBig ? null : got.body, got.tooBig]
}

const mailOf = (v) => {
  const s = String(v == null ? '' : v)
    .trim()
    .toLowerCase()
  return EMAIL_RE.test(s) && s.length <= 160 ? s : null
}

/**
 * @param {{dir:string, env?:object, admin?:object, makeOrder?:(b:object,x:object)=>Promise<object>}} cfg
 */
export function createOrgsApi({ dir, env = process.env, admin = null, makeOrder = null } = {}) {
  const FILE = path.join(dir, 'orgs.json')
  const ON = () => env.QALB_B2B !== 'off'
  const CODE_RE = ORG_CODE_RE

  const all = () => {
    if (!existsSync(FILE)) return {}
    try {
      const v = JSON.parse(readFileSync(FILE, 'utf8'))
      return v && typeof v === 'object' ? v : {}
    } catch {
      console.warn('qalb orgs · orgs.json unreadable — serving an empty registry')
      return {}
    }
  }
  const save = (map) => writePrivateJson(FILE, map)
  const find = (code) => {
    const map = all()
    const norm = normalizeCode(code)
    return map[norm] || Object.values(map).find((o) => o.code === norm) || null
  }

  // نافذةُ التخمين بسقفٍ على المفاتيح: الرمز يُخمَّن، والخريطةُ لا تُترَك تكبر
  const fails = new SlidingWindow({ max: FAIL_MAX, windowMs: FAIL_WINDOW, cap: 5_000 })
  const blocked = (ip) => fails.blocked(ip)
  const note = (ip) => fails.add(ip)
  const clear = (ip) => fails.clear(ip)

  const isAdmin = (req) => !!(admin && admin.who && admin.who(req))
  /** العنوان من `server/http.js`: السوكت افتراضيًا، وXFF فقط خلف وسيطٍ مُعلن */
  const ipOf = (req) => clientIp(req, env)

  async function handle(req, res, u) {
    if (!ON()) return false
    const me = isAdmin(req)

    /* ---------------- الطالب يستبدل مقعدًا ---------------- */
    if (u.pathname === '/org/redeem' && req.method === 'POST') {
      const ip = ipOf(req)
      if (blocked(ip)) return (json(res, 429, { error: 'too many failed attempts — wait a minute' }), true)
      const [b, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      if (!makeOrder) return (json(res, 503, { error: 'the store cannot issue licences right now' }), true)

      const code = normalizeCode(b.code)
      if (!CODE_RE.test(code)) return (json(res, 400, { error: 'a licence code like QALB-XXXX-XXXX is required' }), true)
      const email = mailOf(b.email)
      if (!email) return (json(res, 400, { error: 'a valid email is required for the licence' }), true)
      const name = String(b.name || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
      if (name.length < 2) return (json(res, 400, { error: 'the licence is printed with your name' }), true)
      const picked = SEAT_TEMPLATES.find((t) => t.id === String(b.template || ''))
      if (!picked) return (json(res, 400, { error: 'template', templates: SEAT_TEMPLATES.map((t) => t.slug) }), true)

      const org = find(code)
      const why = redeemReason(org, { email, template: picked.id })
      if (why !== 'ok') {
        // لا يُعدّ الفشل محاولة تخمين إلا إن كان الرمز غير موجود: مقعدٌ مستعمل أو
        // جهةٌ موقوفة ليست هجوما، ومعاقبة الطالب عليها ظلم من ورائه.
        if (why === 'unknown') note(ip)
        const status = why === 'unknown' ? 404 : why === 'template' ? 400 : why === 'exhausted' || why === 'already' ? 409 : 403
        return (json(res, status, { error: why, left: org ? seatLeft(org) : null, templates: SEAT_TEMPLATES.map((t) => t.slug) }), true)
      }

      const map = all()
      const rec = map[org.code]
      // الخصم والإصدار في عملية واحدة: مقعدان لا يُبيعان لنفس السطر
      const order = await makeOrder(
        {
          email,
          name,
          lines: [{ id: picked.id, slug: picked.slug, qty: 1 }],
          coupon: `ORG ${rec.code}`,
          total: 0,
          method: 'institution',
          methodLabel: String(b.lang || 'ar') === 'en' ? 'Institution seats' : 'مقاعد المؤسسة',
          phone: null,
          country: null,
          invoice: false,
          vatNo: null,
          personalize: sanitizePersonal(b.personalize),
        },
        { org: { code: rec.code, org: rec.org, tier: rec.tier }, couponPct: 100 },
      )
      rec.used = (Number(rec.used) || 0) + 1
      rec.redemptions = [...(rec.redemptions || []), { email, template: picked.id, at: new Date().toISOString().slice(0, 10), order: order.id }]
      map[rec.code] = rec
      save(map)
      clear(ip)
      return (json(res, 201, { order, remaining: seatLeft(rec), org: orgSummary(rec) }), true)
    }

    /* ---------------- الجهة تراجع مقاعدها برمزها ---------------- */
    if (u.pathname === '/org/redeem') return (json(res, 405, { error: 'method not allowed' }), true)
    const look = u.pathname.match(/^\/org\/([A-Za-z0-9-]{6,24})$/)
    if (look && req.method === 'GET') {
      const org = find(look[1])
      if (!org) return (json(res, 404, { error: 'no such code' }), true)
      return (json(res, 200, orgSummary(org)), true)
    }

    /* ---------------- اللوحة ---------------- */
    if (u.pathname === '/admin/orgs' && req.method === 'GET') {
      if (!me) return (json(res, 401, { error: 'unauthorized' }), true)
      const rows = Object.values(all()).map(orgRowForStaff)
      return (
        json(res, 200, {
          orgs: rows,
          totals: {
            seats: rows.reduce((s, r) => s + r.seats, 0),
            used: rows.reduce((s, r) => s + r.used, 0),
            active: rows.filter((r) => r.status === 'active').length,
          },
        }),
        true
      )
    }
    if (u.pathname === '/admin/orgs' && req.method === 'POST') {
      if (!me) return (json(res, 401, { error: 'unauthorized' }), true)
      const [b, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      const orgName = String(b.org || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
      if (orgName.length < 2) return (json(res, 400, { error: 'the organisation name is printed on the contract' }), true)
      const email = mailOf(b.email)
      if (!email) return (json(res, 400, { error: 'a valid contact email is required' }), true)
      const map = all()
      const rec = makeOrg({
        org: orgName,
        email,
        tier: b.tier,
        seats: b.seats,
        months: b.months,
        note: b.note,
        credit: b.credit,
        issued: new Date().toISOString(),
      })
      // credit: خصمُ الباقة التجريبية — رقمٌ يُدخله الموظف، لا دَينٌ يُختلَع
      // رمزٌ مكرّر مستحيل عمليًا، لكنه لا يُقبل أصلًا: نولّد حتى ينفرد المفتاح
      for (let i = 0; map[rec.code] && i < 20; i++) rec.code = makeOrgCode()
      if (map[rec.code]) return (json(res, 503, { error: 'could not allocate a licence code' }), true)
      map[rec.code] = rec
      save(map)
      return (json(res, 201, { org: rec, tiers: B2B_TIERS.map((t) => ({ id: t.id, seats: t.seats, price: t.price })) }), true)
    }
    if (u.pathname === '/admin/orgs.csv' && req.method === 'GET') {
      if (!me) return (json(res, 401, { error: 'unauthorized' }), true)
      return (text(res, 200, orgCsv(Object.values(all()).map(orgRowForStaff)), 'text/csv; charset=utf-8'), true)
    }
    const edit = u.pathname.match(/^\/admin\/orgs\/([A-Za-z0-9-]{6,24})$/)
    if (edit && req.method === 'PATCH') {
      if (!me) return (json(res, 401, { error: 'unauthorized' }), true)
      const [b, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      const map = all()
      const rec = find(edit[1])
      if (!rec) return (json(res, 404, { error: 'no such code' }), true)
      const next = { ...rec }
      if (b.status === 'active' || b.status === 'paused') next.status = b.status
      if (b.seats != null) {
        const seats = Math.max(1, Math.min(5000, Math.round(Number(b.seats) || 0)))
        if (!seats) return (json(res, 400, { error: 'seats must be a number' }), true)
        next.seats = seats // لا نزعم مقاعد أقل مما استُهلك: seatLeft يصفّر الجيب لا السجلّ
      }
      if (b.months != null) {
        const months = Math.max(1, Math.min(60, Math.round(Number(b.months) || 0)))
        if (!months) return (json(res, 400, { error: 'months must be a number' }), true)
        next.months = months
        next.expires = makeOrg({ issued: next.issued, months }).expires
      }
      if (b.note != null) next.note = String(b.note).slice(0, 240)
      if (b.credit != null) {
        const c = Math.round(Number(b.credit) || 0)
        if (!Number.isFinite(c) || c < 0 || c > 1_000_000) return (json(res, 400, { error: 'credit must be 0..1000000' }), true)
        next.credit = c
      }
      map[rec.code] = next
      save(map)
      return (json(res, 200, { org: orgRowForStaff(next), left: seatLeft(next) }), true)
    }

    if (u.pathname.startsWith('/org') || u.pathname.startsWith('/admin/orgs')) return (json(res, 405, { error: 'method not allowed' }), true)
    return false
  }

  const stats = () => {
    const rows = Object.values(all())
    return {
      orgs: rows.length,
      seats: rows.reduce((s, r) => s + (Number(r.seats) || 0), 0),
      used: rows.reduce((s, r) => s + (Number(r.used) || 0), 0),
      active: rows.filter((r) => r.status === 'active').length,
    }
  }

  return {
    handle,
    stats,
    enabled: () => ON(),
    file: FILE,
    tiers: B2B_TIERS.map((t) => ({ id: t.id, seats: t.seats, price: t.price })),
    templates: SEAT_TEMPLATES.map((t) => t.id),
  }
}

export default createOrgsApi
