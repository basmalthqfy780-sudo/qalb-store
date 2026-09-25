/**
 * النشرة والقالب المجاني — بريدُ الزائر مقابل شيءٍ يُسلَّم فعلًا.
 *
 * الفكرة: النشرةُ وحدها وعدٌ، والوعدُ لا يُشترى. فالعرضُ هنا **قالبٌ كاملٌ
 * مجانًا مقابل البريد** — يُنشأ له طلبٌ صفريٌّ بقسيمة ١٠٠٪ من الخادم نفسه
 * (لا من المتصفح)، فيمرّ عبر نفس مسار الشراء: سعرٌ مختوم، ومفتاحُ ترخيص،
 * وحزمةٌ تُبنى من `src/data/deliverable.js`، ورابطُ تنزيلٍ موقّع. فالزائر
 * يستلم ملفًا حقيقيًا، ونحن لا نبيعُ وعدًا ببريد.
 *
 * دفترُ المشتركين مستقلٌّ بملفه (`subscribers.jsonl`)، ومقفولٌ ٠٦٠٠ كسائر
 * دفاتر المشترين: البريدُ بياناتٌ شخصية، ولا يُقرأ إلا من هذه الطبقة. ولكلِّ
 * بريدٍ قالبٌ مجانيٌّ واحد: الطلبُ الثاني يعيدُ طلبه الأول، فلا مزرعةُ حسابات.
 */
import { appendFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { PRIVATE } from './seal.js'
import { SlidingWindow, clientIp, endsWithNewline, readBody } from './http.js'

const MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
/** بريدٌ واسمٌ ومنصب: بضعة كيلوبايت تكفي، وما زاد يُرفض قبل التخزين */
const MAX_BODY = 16 * 1024

export function createSubscribersApi({ dir, env = process.env, orders = async () => [], makeOrder, apiPublic = '', freeId } = {}) {
  const FILE = path.join(dir, 'subscribers.jsonl')
  const FREE = freeId || String(env.QALB_FREE_TEMPLATE || 'folio').trim()
  // خانقٌ بالذاكرة: لا حملَ إضافي لبوّابةٍ تُفتح للعامّة — بسقفٍ على عدد المفاتيح،
  // فلا تصير خريطةُ الخانق نفسها ثغرةً بعناوين مُختلَقة
  const HITS = new SlidingWindow({ max: 8, windowMs: 60_000, cap: 5_000 })

  const throttled = (ip) => {
    if (!ip) return false
    return HITS.add(ip) > 8
  }

  async function loadSubs() {
    if (!existsSync(FILE)) return []
    const rows = []
    ;(await readFile(FILE, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .forEach((l) => {
        try {
          rows.push(JSON.parse(l))
        } catch {
          /* سطرٌ تالف لا يُسقط الدفتر */
        }
      })
    return rows
  }

  /** العنوان من `server/http.js`: السوكت وحده، إلا أن يُعلن المشغّل وسيطًا أمامه */
  const ipOf = (req) => clientIp(req, env)

  async function subscribe({ email, name, source, locale }) {
    const who = String(email || '')
      .trim()
      .toLowerCase()
    if (!MAIL_RE.test(who)) return { ok: false, why: 'bad email' }
    const subs = await loadSubs()
    const first = !subs.some((s) => s.email === who)
    await appendFile(
      FILE,
      (endsWithNewline(FILE) ? '' : '\n') +
        JSON.stringify({
          email: who,
          name:
            String(name || '')
              .trim()
              .slice(0, 80) || null,
          source: String(source || 'newsletter').slice(0, 40),
          locale: String(locale || 'ar').slice(0, 5),
          at: new Date().toISOString(),
        }) +
        '\n',
      { encoding: 'utf8', mode: PRIVATE },
    )
    return { ok: true, first, email: who }
  }

  /**
   * القالب المجاني: طلبٌ صفريٌّ يُبنى من الخادم، لا من المتصفح — القسيمةُ ١٠٠٪
   * تمرّ في `extra` لأنها ثمنُ شيءٍ نمنحه نحن، لا خصمًا يختاره الزائر.
   */
  async function claim({ email, name, template }) {
    const who = String(email || '')
      .trim()
      .toLowerCase()
    if (!MAIL_RE.test(who)) return { ok: false, why: 'bad email' }
    const id = String(template || FREE).trim()
    const all = await orders()
    const before = all.find(
      (o) => String(o.email || '').toLowerCase() === who && Array.isArray(o.lines) && o.lines.some((l) => l.id === id) && o.source === 'lead-magnet',
    )
    const order =
      before ||
      (await makeOrder(
        { email: who, name: String(name || '').trim() || 'صديق قالب', total: 0, lines: [{ id, qty: 1 }], method: 'free', methodLabel: 'قالب مجاني' },
        { couponPct: 100, coupon: 'FREE-TEMPLATE', source: 'lead-magnet' },
      ))
    await subscribe({ email: who, name, source: 'free-template' })
    return {
      ok: true,
      repeat: !!before,
      template: id,
      order: { id: order.id, key: order.key, date: order.date, total: order.total },
      /**
       * رابطٌ نسبيّ لا مطلق: المتصفحُ يخاطب الخادم من نفس الأصل (وكيلٌ في التطوير،
       * ونطاقٌ واحد في الإنتاج). ولو كتبنا هنا مضيفًا بعينه لانكسر الرابط عند كل
       * نشرٍ على نطاقٍ آخر — ولأخذ الزائر إلى عنوانٍ لا يملكه أحد من الخارج.
       */
      download: `/download/${encodeURIComponent(id)}?order=${encodeURIComponent(order.id)}&key=${encodeURIComponent(order.key)}`,
      /** والنسخةُ المطلقة للبريد وحده: من يفتح الرسالة ليس على أصل الموقع، فلا يصلح فيها مسارٌ نسبيّ */
      downloadUrl: `${apiPublic}/download/${encodeURIComponent(id)}?order=${encodeURIComponent(order.id)}&key=${encodeURIComponent(order.key)}`,
    }
  }

  const json = (res, code, body) => {
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', 'content-type')
    res.setHeader('access-control-allow-methods', 'POST,OPTIONS')
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
  }

  async function handle(req, res, u) {
    if (req.method !== 'POST') return false
    // تحت /api: فالمسار /free صفحةٌ في المتجر، ولو حُوِّل إلى الخادم لابتلعها الوكيل
    if (u.pathname !== '/api/subscribe' && u.pathname !== '/api/free') return false
    if (throttled(ipOf(req))) return (json(res, 429, { ok: false, error: 'too many requests — wait a minute' }), true)
    const got = await readBody(req, MAX_BODY)
    if (got.tooBig) return (json(res, 413, { ok: false, error: 'body too large' }), true)
    const body = got.body
    if (!body) return (json(res, 400, { ok: false, error: 'json body required' }), true)
    if (u.pathname === '/api/subscribe') {
      const r = await subscribe(body)
      return (json(res, r.ok ? 201 : 400, r), true)
    }
    const r = await claim(body)
    return (json(res, r.ok ? (r.repeat ? 200 : 201) : 400, r), true)
  }

  return {
    file: FILE,
    freeTemplate: () => FREE,
    subscribe,
    claim,
    list: loadSubs,
    handle,
    stats: () => ({ free: FREE, file: 'subscribers.jsonl' }),
  }
}
