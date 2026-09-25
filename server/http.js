/**
 * مساعدات HTTP المشتركة — نسخة واحدة من أربعة أشياء كانت مكرّرة في ثمانية ملفات،
 * بثلاثة سلوكيات مختلفة في كلٍّ منها:
 *
 *   • `readBody(req, max)` — يقرأ الجسم **بحدٍّ صريح**: عند تجاوز الحدّ يتوقف عن
 *     التخزين ويستمرّ في ابتلاع البايتات (فلا يبقى الاتصال معلّقًا) ويبلّغ
 *     `tooBig`. النسخ القديمة في worker.js وadmin.js وsubscribers.js كانت تخزّن
 *     الجسم كاملًا ثم تفحص طوله — أي أن ١٠٠ ميجابايت تُبتلع في الذاكرة قبل الرفض.
 *
 *     والتجميع بـ`Buffer` لا بـ`+=` على نص: ضمّ قطعةٍ إلى نصّ يحوّلها utf-8
 *     **وحدها**، فأي حرف عربي انقسم بين قطعتين (وهو ما يفعله TCP كلما كبر الجسم)
 *     يصل U+FFFD ويُخزَّن اسمُ المشتري مشوَّهًا. `Buffer.concat` ثم تحويلٌ واحد.
 *
 *   • `clientIp(req, env)` — عنوان العميل. الافتراضي `socket.remoteAddress` لأنه
 *     الوحيد الذي لا يكتبه العميل؛ `X-Forwarded-For` لا يُقرأ إلا عند
 *     `QALB_TRUST_PROXY=1`، وعندها تُؤخذ القفزة التي أضافها وسيطك أنت
 *     (`QALB_PROXY_HOPS`، افتراضيًا ١ = آخر قيمة) لا أول قيمة في القائمة.
 *     reading the first value let anyone rotate the header and walk past every
 *     throttle in the server — and every forged value also parked a new entry in
 *     the limiter's map.
 *
 *   • `SlidingWindow` — عدّادٌ لكل مفتاح داخل نافذة زمنية، **بسقف على عدد
 *     المفاتيح**: بلا سقف تكبر الخريطة بلا حدّ (عناوين مُختلَقة = ذاكرة).
 *
 *   • `endsWithNewline(file)` — آخر بايت في دفتر: فاصلة سطر؟ (كانت في أربعة ملفات)
 */
import { closeSync, fstatSync, openSync, readSync } from 'node:fs'

/** سقف الجسم الافتراضي: طلبُ متجرٍ فيه تخصيصٌ ونبذة لا يقترب منه، وحزمةُ سوقٍ نصية تمرّ */
export const DEFAULT_MAX_BODY = 256 * 1024
/** إشعارُ البوابة يُوقَّع على نصّه الخام، فيُقرأ كاملًا — لكن بسقفٍ هو الآخر */
export const MAX_WEBHOOK_BODY = 1024 * 1024

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || '').trim())

/**
 * @returns {Promise<{body: any, raw: string, tooBig: boolean, parseError: boolean}>}
 * `body` هو الكائن، أو `{}` لجسمٍ فارغ، أو `null` إن تعذّر التحليل أو تجاوز الحدّ.
 * `raw` هو النصّ كما وصل (يلزم لتوقيع Stripe) — ويبقى متاحًا حتى مع فشل التحليل.
 */
export function readBody(req, max = DEFAULT_MAX_BODY) {
  return new Promise((done) => {
    const chunks = []
    let size = 0
    let tooBig = false
    let settled = false
    const finish = (v) => {
      if (settled) return
      settled = true
      done(v)
    }
    req.on('data', (c) => {
      if (tooBig) return // نبتلع بلا تخزين: الذاكرة محفوظة والاتصال يُغلق نظيفًا
      size += c.length
      if (size > max) {
        tooBig = true
        chunks.length = 0
        return finish({ body: null, raw: '', tooBig: true, parseError: false })
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (tooBig) return
      const raw = Buffer.concat(chunks).toString('utf8') // تحويلٌ واحد: لا حرف عربيٌّ ينشقّ
      if (!raw) return finish({ body: {}, raw, tooBig: false, parseError: false })
      try {
        finish({ body: JSON.parse(raw), raw, tooBig: false, parseError: false })
      } catch {
        finish({ body: null, raw, tooBig: false, parseError: true })
      }
    })
    req.on('error', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      finish({ body: null, raw, tooBig, parseError: false })
    })
  })
}

/**
 * عنوان العميل كما يُعتمد للحدود والسجلات. لا يثق بترويسة يكتبها العميل إلا أن
 * يُعلن المشغّل صراحةً أن أمامه وسيطًا، وعندها يقرأ القفزة التي أضافها الوسيط.
 */
export function clientIp(req, env = process.env) {
  const sock = String(req.socket?.remoteAddress || '').trim()
  if (!truthy(env.QALB_TRUST_PROXY || env.TRUST_PROXY)) return sock || 'unknown'
  const hops = Math.max(1, Math.round(Number(env.QALB_PROXY_HOPS) || 1))
  const list = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!list.length) return sock || 'unknown'
  return list[Math.max(0, list.length - hops)] || sock || 'unknown'
}

/**
 * نافذةٌ منزلقة: `add` يسجّل محاولة، و`blocked` يقول هل بلغ المفتاح حدَّه.
 * `cap` سقفُ عدد المفاتيح المحفوظة — عند تجاوزه تُطرد أقدمها، فلا تتحول خريطةُ
 * الحدود نفسها إلى ثغرة ذاكرة.
 */
export class SlidingWindow {
  constructor({ max = 5, windowMs = 60_000, cap = 5_000, now = () => Date.now() } = {}) {
    this.max = Math.max(1, max)
    this.windowMs = Math.max(1, windowMs)
    this.cap = Math.max(16, cap)
    this.now = now
    this.hits = new Map()
  }

  get size() {
    return this.hits.size
  }

  /** يطرد ما خرج من النافذة، ثم — إن بقيت الخريطة فوق سقفها — أقدم المفاتيح لمسًا */
  prune() {
    const t = this.now()
    for (const [k, v] of this.hits) {
      const live = v.times.filter((x) => t - x < this.windowMs)
      if (live.length) this.hits.set(k, { times: live, at: v.at })
      else this.hits.delete(k)
    }
    while (this.hits.size > this.cap) {
      let oldest = null
      for (const [k, v] of this.hits) if (oldest == null || v.at < oldest.at) oldest = { k, at: v.at }
      if (!oldest) break
      this.hits.delete(oldest.k)
    }
  }

  /** يسجّل محاولة ويعيد عدد ما بقي داخل النافذة */
  add(key) {
    this.prune()
    const rec = this.hits.get(key) || { times: [], at: this.now() }
    rec.times.push(this.now())
    rec.at = this.now()
    this.hits.set(key, rec)
    return rec.times.length
  }

  count(key) {
    const rec = this.hits.get(key)
    if (!rec) return 0
    const t = this.now()
    return rec.times.filter((x) => t - x < this.windowMs).length
  }

  blocked(key) {
    return this.count(key) >= this.max
  }

  /** كم ثانيةً تبقى قبل أن ينزل المفتاح تحت الحدّ — لِـ`retryAfter` */
  leftSeconds(key) {
    const rec = this.hits.get(key)
    if (!rec) return 0
    const t = this.now()
    const live = rec.times.filter((x) => t - x < this.windowMs)
    if (live.length < this.max) return 0
    return Math.max(1, Math.ceil((this.windowMs - (t - live[0])) / 1000))
  }

  clear(key) {
    this.hits.delete(key)
  }
}

/** آخر بايت في الملف: فاصلة سطر؟ نقرأ بايتًا واحدًا، لا الدفتر كلّه */
export function endsWithNewline(file) {
  let fd
  try {
    fd = openSync(file, 'r')
    const size = fstatSync(fd).size
    if (!size) return true
    const buf = Buffer.alloc(1)
    readSync(fd, buf, 0, 1, size - 1)
    return buf[0] === 0x0a
  } catch {
    return true // ملف لا يُقرأ: نلحق ولا نخترع فواصل
  } finally {
    if (fd != null) closeSync(fd)
  }
}
