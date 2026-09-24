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
import { existsSync, openSync, fstatSync, readSync, closeSync } from 'node:fs'
import path from 'node:path'
import { PRIVATE } from './seal.js'

const MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
const endsWithNewline = (file) => {
  let fd
  try {
    fd = openSync(file, 'r')
    const size = fstatSync(fd).size
    if (!size) return true
    const buf = Buffer.alloc(1)
    readSync(fd, buf, 0, 1, size - 1)
    return buf[0] === 0x0a
  } catch {
    return true
  } finally {
    if (fd != null) closeSync(fd)
  }
}

export function createSubscribersApi({ dir, env = process.env, orders = async () => [], makeOrder, apiPublic = '', freeId } = {}) {
  const FILE = path.join(dir, 'subscribers.jsonl')
  const FREE = freeId || String(env.QALB_FREE_TEMPLATE || 'folio').trim()
  const HITS = new Map() // خانقٌ بسيط بالذاكرة: لا حملَ إضافي لبوّابةٍ تُفتح للعامّة

  const throttled = (ip) => {
    if (!ip) return false
    const now = Date.now()
    const hits = (HITS.get(ip) || []).filter((t) => now - t < 60_000)
    hits.push(now)
    HITS.set(ip, hits)
    return hits.length > 8
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

  const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || ''

  async function subscribe({ email, name, source, locale }) {
    const who = String(email || '').trim().toLowerCase()
    if (!MAIL_RE.test(who)) return { ok: false, why: 'bad email' }
    const subs = await loadSubs()
    const first = !subs.some((s) => s.email === who)
    await appendFile(
      FILE,
      (endsWithNewline(FILE) ? '' : '\n') +
        JSON.stringify({
          email: who,
          name: String(name || '').trim().slice(0, 80) || null,
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
    const who = String(email || '').trim().toLowerCase()
    if (!MAIL_RE.test(who)) return { ok: false, why: 'bad email' }
    const id = String(template || FREE).trim()
    const all = await orders()
    const before = all.find((o) => String(o.email || '').toLowerCase() === who && Array.isArray(o.lines) && o.lines.some((l) => l.id === id) && o.source === 'lead-magnet')
    const order = before || (await makeOrder({ email: who, name: String(name || '').trim() || 'صديق قالب', total: 0, lines: [{ id, qty: 1 }], method: 'free', methodLabel: 'قالب مجاني' }, { couponPct: 100, coupon: 'FREE-TEMPLATE', source: 'lead-magnet' }))
    await subscribe({ email: who, name, source: 'free-template' })
    return {
      ok: true,
      repeat: !!before,
      template: id,
      order: { id: order.id, key: order.key, date: order.date, total: order.total },
      download: `${apiPublic}/download/${encodeURIComponent(id)}?order=${encodeURIComponent(order.id)}&key=${encodeURIComponent(order.key)}`,
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
    if (u.pathname !== '/subscribe' && u.pathname !== '/free') return false
    if (throttled(ipOf(req))) return (json(res, 429, { ok: false, error: 'too many requests — wait a minute' }), true)
    const raw = await new Promise((r) => {
      let b = ''
      req.on('data', (c) => (b += c))
      req.on('end', () => r(b))
    })
    let body
    try {
      body = JSON.parse(raw || '{}')
    } catch {
      return (json(res, 400, { ok: false, error: 'json body required' }), true)
    }
    if (u.pathname === '/subscribe') {
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
