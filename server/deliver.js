#!/usr/bin/env node
/**
 * Qalb · طبقة التسليم (Node بدون أي اعتماديات)
 *
 * تُستعمل من server/worker.js فقط، وتضيف نقطتين إلى نفس المنفذ:
 *
 *   GET /download/:id?order=…&key=…   → يتحقّق من الطلب ومن مفتاح الرخصة، ثم
 *                                       يعيد 302 إلى رابط موقّع قصير العمر.
 *   GET /dl/<token>                   → يسلّم qalb-<id>-<order>.zip مرة واحدة فقط.
 *
 * لماذا لا تُخزَّن الحزم في public/؟ لأن أي ملف ثابت هناك قابل للمشاركة: يُنسخ
 * رابطه ويعمل عند الجميع بلا طلب ولا رخصة. هنا تُبنى الحزمة من src/data/deliverable.js
 * لحظة الطلب، وتُوقَّع HMAC برقم الطلب، فلا رابط يعمل لغير صاحبه:
 *
 *   • الرابط صالح DOWNLOAD_TTL ثانية (600 افتراضيًا) ويُستهلك بعد أول تنزيل.
 *   • لا يُسلَّم شيء قبل مطابقة مفتاح الرخصة مع سجل الطلبات (timing-safe).
 *   • يجب أن يكون القالب داخل ذلك الطلب نفسه، وإلا 403 — لا تنزيل انتقائي.
 *   • كل عنوان IP محدود بـ DOWNLOAD_MAX محاولة (24 افتراضيًا) داخل نافذة الصلاحية، وإلا 429.
 *   • LICENSE.txt وسطر التتبّع أعلى كل ملف يحملان اسم المشتري ورقم طلبه ومفتاحه،
 *     فأي نسخة أعيد توزيعها تقود إلى صاحبها (ولذا تُسجَّل كل عملية تنزيل).
 *
 * مفتاح التوقيع: DOWNLOAD_SECRET في البيئة، أو server/.download-secret (0600 يُنشأ تلقائيًا).
 * سجلّ التنزيلات: server/downloads.jsonl (محلي للتتبّع؛ الحجب الفعلي في ذاكرة العملية).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { PRIVATE } from './seal.js'
import { SlidingWindow, clientIp } from './http.js'
import path from 'node:path'
import { bundleFiles, packageName, packageZip } from '../src/data/deliverable.js'
import { zipStore } from '../src/data/zip.js'

const b64u = (buf) => Buffer.from(buf).toString('base64url')
const num = (v, fb, lo, hi) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= lo && n <= hi ? n : fb
}

export function createDeliverApi({ dir, env = process.env, orders = async () => [], prices = () => ({}), overrides = () => ({}), tpls = [] } = {}) {
  const SECRET_FILE = path.join(dir, '.download-secret')
  const LEDGER = path.join(dir, 'downloads.jsonl')
  const TTL = Math.max(60, num(env.DOWNLOAD_TTL, 600, 60, 86400))
  // كل تنزيل = طلبان (منح الرابط ثم استهلاكه)، فالسقف ٢٤ تنزيلًا لكل عنوان داخل النافذة
  const MAX_PER_IP = Math.max(1, num(env.DOWNLOAD_MAX, 24, 1, 1000))

  /* ---------- مفتاح التوقيع ---------- */
  let secretCache = null
  const secret = () => {
    if (secretCache) return secretCache
    if (env.DOWNLOAD_SECRET && String(env.DOWNLOAD_SECRET).length >= 24) return (secretCache = String(env.DOWNLOAD_SECRET))
    if (existsSync(SECRET_FILE)) return (secretCache = readFileSync(SECRET_FILE, 'utf8').trim())
    const s = randomBytes(32).toString('hex')
    writeFileSync(SECRET_FILE, s + '\n', { mode: 0o600 })
    try {
      chmodSync(SECRET_FILE, 0o600)
    } catch {
      /* بعض الأنظمة ترفض chmod؛ الوضع فُعّل عند الإنشاء فعلًا */
    }
    return (secretCache = s)
  }
  const sign = (body) => createHmac('sha256', secret()).update(body).digest('base64url')
  const eq = (a, b) => {
    const x = Buffer.from(String(a || ''))
    const y = Buffer.from(String(b || ''))
    return x.length === y.length && timingSafeEqual(x, y)
  }

  /* ---------- الحالة في الذاكرة: nonce مُستهلك + عدّاد لكل IP ---------- */
  // العدّاد نافذةٌ منزلقة بسقفٍ على عدد المفاتيح: كان كل عنوانٍ مُختلَق في
  // `X-Forwarded-For` يترك مدخلًا لا يُطرد قبل انتهاء الصلاحية، فتكبر الذاكرة
  // بطلباتٍ لا تنفع صاحبها
  const hits = new SlidingWindow({ max: MAX_PER_IP, windowMs: TTL * 1000, cap: 20_000 })
  const used = new Map() // nonce → expiry(ms)
  const USED_CAP = 50_000
  const prune = () => {
    const t = Date.now()
    for (const [k, v] of used) if (v < t) used.delete(k)
    // سقفٌ صريح: تُطرد أقدم التذاكر (Map تحفظ ترتيب الإدخال) فلا حدود للذاكرة
    while (used.size > USED_CAP) {
      const oldest = used.keys().next()
      if (oldest.done) break
      used.delete(oldest.value)
    }
  }
  const throttle = (ip) => hits.add(ip) > MAX_PER_IP
  const log = (rec) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...rec }) + '\n'
    appendFile(LEDGER, line, { encoding: 'utf8', mode: PRIVATE }).catch(() => {
      /* السجل اختياري: لا يفشل التنزيل لأن القرص ممتلئ */
    })
  }

  /* ---------- أدوات HTTP ---------- */
  const json = (res, code, body) => {
    res.writeHead(code, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    })
    res.end(JSON.stringify(body))
  }
  const err = (res, code, why, msg) =>
    json(res, code, {
      error: why,
      message: msg,
      ar: 'هذا الرابط للمشتري فقط: افتحه من إيصال الطلب بعد تأكيد الدفع.',
      en: 'Buyer-only link: open it from your order receipt after payment.',
    })
  const redirect = (res, to, code = 302) => {
    res.writeHead(code, { location: to, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' })
    res.end()
  }
  /**
   * العنوان من `server/http.js`. كان أول قيم `X-Forwarded-For` — وهي ترويسة يكتبها
   * العميل — فصار تجاوزُ حدِّ المحاولات طلبًا واحدًا بترويسة جديدة، وبقيت الخريطة
   * تجمع العناوين المُختلَقة.
   */
  const ipOf = (req) => clientIp(req, env)

  const byId = (id) => tpls.find((t) => t.id === id) || null
  const sellerUrl = (id) => {
    const d = (overrides() || {})[id]?.download
    return typeof d === 'string' && /^https?:\/\//i.test(d.trim()) ? d.trim() : null
  }

  /** المطابقة على السجل نفسه: الطلب موجود، والقالب منشور، والقالب داخل ذلك الطلب */
  async function lookup(id, orderId) {
    const tpl = byId(id)
    if (!tpl) return { code: 404, why: 'unknown template' }
    const table = (await Promise.resolve(prices())) || {}
    if (!(id in table)) return { code: 404, why: 'template unpublished' }
    const all = (await orders()) || []
    const order = all.find((o) => String(o.id) === String(orderId || ''))
    if (!order) return { code: 404, why: 'order not found' }
    if (!Array.isArray(order.lines) || !order.lines.some((l) => l.id === id)) return { code: 403, why: 'template not in this order' }
    return { order, tpl }
  }

  /** ما يصلح للتسليم من هذا الطلب: قالب منشور له حزمة، أو رابط استضافه البائع */
  async function deliverables(order) {
    const table = (await Promise.resolve(prices())) || {}
    const ids = [...new Set((order.lines || []).map((l) => l.id))]
    const zips = ids.filter((id) => byId(id) && id in table)
    const hosted = ids.filter((id) => !(id in zips) && sellerUrl(id)).map((id) => ({ id, url: sellerUrl(id) }))
    return { zips, hosted }
  }

  /** لكل الطلب: التحقق من الطلب ومفتاحه فقط، ثم تُجمَّع حزم ما فيه */
  async function orderOnly(orderId) {
    const all = (await orders()) || []
    const order = all.find((o) => String(o.id) === String(orderId || ''))
    return order ? { order } : { code: 404, why: 'order not found' }
  }

  async function authorizeAll(q, req) {
    const orderId = String(q.get('order') || '').trim()
    const key = String(q.get('key') || req.headers['x-qalb-licence'] || '')
      .trim()
      .toUpperCase()
    if (!orderId || !key) return { code: 401, why: 'authentication required' }
    const found = await orderOnly(orderId)
    if (found.code) return found
    if (!eq(found.order.key, key)) return { code: 403, why: 'licence key mismatch' }
    return found
  }

  /** الرابط القادم من الإيصال: رقم طلب ومفتاح رخصة يطابقانه فعلًا (مقارنة timing-safe) */
  async function authorize(id, q, req) {
    const orderId = String(q.get('order') || '').trim()
    const key = String(q.get('key') || req.headers['x-qalb-licence'] || '')
      .trim()
      .toUpperCase()
    if (!orderId || !key) return { code: 401, why: 'authentication required' }
    const found = await lookup(id, orderId)
    if (found.code) return found
    if (!eq(found.order.key, key)) return { code: 403, why: 'licence key mismatch' }
    return found
  }

  function mint(tplId, order) {
    const payload = b64u(JSON.stringify({ o: order.id, t: tplId, e: Math.floor(Date.now() / 1000) + TTL, n: randomBytes(8).toString('hex') }))
    return `${payload}.${sign(payload)}`
  }

  function readToken(token) {
    prune() // التذاكر المنتهية (وما زاد على السقف) تُطرد هنا، فلا تكبر الخريطة بكل رابطٍ قديم
    const [payload, sig] = String(token).split('.')
    // المقارنة timing-safe كسائر مقارنات هذا الملف: `!==` على توقيع تُقارن بايتًا بايت
    if (!payload || !sig || !eq(sign(payload), sig)) return { why: 'bad signature' }
    let body
    try {
      body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    } catch {
      return { why: 'malformed token' }
    }
    if (!body || typeof body.n !== 'string' || !/^[a-f0-9]{8,32}$/.test(body.n)) return { why: 'malformed token' }
    if (Math.floor(Date.now() / 1000) > Number(body.e || 0)) return { why: 'link expired' }
    if (used.has(body.n)) return { why: 'token already redeemed' }
    return { body }
  }

  /** @returns {Promise<boolean>} true إذا تولّت الطبقة الطلب */
  async function handle(req, res, u) {
    const p = u.pathname
    const isAll = p === '/download-all'
    const isGrant = isAll || p === '/download' || p.startsWith('/download/')
    const isRedeem = p.startsWith('/dl/')
    if (!isGrant && !isRedeem) return false

    if (isRedeem) {
      const ip = ipOf(req)
      if (throttle(ip)) {
        log({ kind: 'reject', ip, route: 'dl' })
        err(res, 429, 'too many requests', 'تجاوزت حد المحاولات لهذه الفترة — حاول بعد قليل.')
        return true
      }
      const { body, why } = readToken(decodeURIComponent(p.slice(4)))
      if (!body) {
        log({ kind: 'reject', ip, route: 'dl', why })
        err(res, 403, why, why === 'link expired' ? 'انتهت صلاحية الرابط — أعد الطلب من الإيصال.' : 'رابط غير صالح أو مُستعمَل من قبل.')
        return true
      }
      // التوكن الموقّع هو الدليل هنا: صدر من /download بعد مطابقة المفتاح، ويرتبط برقم
      // الطلب والقالب معا، ويُستهلك بعد أول استخدام. نُعيد التحقق من الحالة الحالية فقط —
      // فقد يُخفى القالب أو يُلغى الطلب بعد إصدار الرابط.
      const all = body.t === '*'
      const ok = all ? await orderOnly(body.o) : await lookup(body.t, body.o)
      if (ok.code) {
        log({ kind: 'reject', ip, route: 'dl', why: ok.why, order: body.o, tpl: body.t })
        err(res, ok.code, ok.why, 'تعذّر التحقق عند التسليم — أعد المحاولة من الإيصال.')
        return true
      }
      // يُعلَّم الاستهلاك قبل الإرسال: التنزيل مرة واحدة حتى لو أعاد المتصفح الطلب
      used.set(body.n, Date.now() + (TTL + 120) * 1000)
      let bytes, name, what
      try {
        if (all) {
          const { zips, hosted } = await deliverables(ok.order)
          if (!zips.length && !hosted.length) {
            err(res, 404, 'no deliverable files', 'لا ملفات تسليم جاهزة في هذا الطلب بعد — راسل الدعم.')
            return true
          }
          const files = bundleFiles(zips.map(byId), ok.order)
          for (const h of hosted)
            files.push({
              path: `${h.id}/SELLER-LINK.txt`,
              body: `رابط الملف الذي يستضيفه البائع لهذا الطلب:\n${h.url}\nThe seller-hosted file link for this order.\n`,
            })
          bytes = zipStore(files)
          name = `qalb-${String(ok.order.id)
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')}-all.zip`
          what = zips.join('+') || 'hosted'
        } else {
          bytes = packageZip(ok.tpl, ok.order)
          name = packageName(ok.tpl, ok.order)
          what = ok.tpl.id
        }
      } catch (e) {
        log({ kind: 'error', ip, order: body.o, tpl: body.t, err: String(e?.message || e) })
        err(res, 500, 'package build failed', 'تعذّر بناء الحزمة الآن — راسل الدعم ونسلّمها يدويًا.')
        return true
      }
      log({ kind: 'deliver', ip, order: ok.order.id, tpl: what, bytes: bytes.length })
      res.writeHead(200, {
        'content-type': 'application/zip',
        'content-length': bytes.length,
        'content-disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'x-robots-tag': 'noindex, nofollow',
      })
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
      return true
    }

    const id = isAll ? '*' : decodeURIComponent(p.replace('/download', '').replace(/^\//, '')).trim()
    const ip = ipOf(req)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      err(res, 405, 'method not allowed', 'التسليم عبر GET فقط.')
      return true
    }
    if (throttle(ip)) {
      log({ kind: 'reject', ip, route: 'grant', tpl: id })
      err(res, 429, 'too many requests', 'محاولات أكثر من اللازم من هذا العنوان — انتظر دقائق.')
      return true
    }
    if (!id) {
      json(res, 404, {
        error: 'template id required',
        ar: 'الصيغة الصحيحة: /download/<معرف-القالب>?order=…&key=…',
        en: 'Expected /download/<template-id>?order=…&key=…',
      })
      return true
    }
    const ok = isAll ? await authorizeAll(u.searchParams, req) : await authorize(id, u.searchParams, req)
    if (ok.code) {
      log({ kind: 'reject', ip, route: 'grant', tpl: id, why: ok.why })
      const msg = {
        'authentication required': 'التنزيل يتطلب رقم الطلب ومفتاح الرخصة — وهما في إيصال شرائك.',
        'licence key mismatch': 'مفتاح الرخصة لا يطابق هذا الطلب.',
        'template not in this order': 'هذا القالب ليس ضمن هذا الطلب.',
        'unknown template': 'لا يوجد قالب بهذا المعرّف.',
        'template unpublished': 'أُزيل هذا القالب من المتجر؛ إن كنت قد اشتريته فراسل الدعم وسنسلّمك الحزمة.',
        'order not found': 'لم يُعثر على هذا الطلب عندنا.',
      }[ok.why]
      err(res, ok.code, ok.why, msg)
      return true
    }
    const hosted = sellerUrl(id)
    if (hosted) {
      // البائع استضاف الملف برابط خاص: نُمرّر بعد التحقق، ولا نكشف الرابط إلا لطلب صحيح
      log({ kind: 'delegate', ip, order: ok.order.id, tpl: id })
      redirect(res, hosted)
      return true
    }
    if (isAll) {
      const { zips, hosted } = await deliverables(ok.order)
      if (!zips.length && !hosted.length) {
        log({ kind: 'reject', ip, route: 'grant', tpl: '*', why: 'no deliverable files', order: ok.order.id })
        err(res, 404, 'no deliverable files', 'لا ملفات تسليم جاهزة في هذا الطلب بعد — راسل الدعم.')
        return true
      }
    }
    log({ kind: 'grant', ip, order: ok.order.id, tpl: id })
    redirect(res, `/dl/${mint(isAll ? '*' : ok.tpl.id, ok.order)}`)
    return true
  }

  return {
    handle,
    enabled: () => true,
    ttl: () => TTL,
    perIp: () => MAX_PER_IP,
  }
}
