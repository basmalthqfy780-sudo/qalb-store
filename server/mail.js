/**
 * البريد الخارج — مُرسِلٌ واحدٌ ببوّابةٍ واحدة، وصندوقُ صادرٍ على القرص حين لا
 * توجد بوّابة.
 *
 * القاعدة: **لا بريدَ يضيع بصمت.** إن ضُبط `RESEND_API_KEY` أُرسل فعلًا عبر
 * Resend؛ وإلا كُتبت الرسالة كاملةً في `server/mail.outbox.jsonl` (بصلاحيات
 * 0600، ففيه عناوينُ المشترين) وأُعلن ذلك في متن الجواب (`queued: true`). فالذي
 * يختبر المتجر على جهازه يرى الرسالةَ التي كانت ستُرسل، والذي يربط مفتاحًا لا
 * يغيّر سطرًا واحدًا من الكود.
 *
 * لماذا بوّابة HTTP لا SMTP؟ لأن الخادم بلا اعتماديات (كما هو شرطُ المشروع)،
 * ومخاطبةُ SMTP بالسوكت الخام عملٌ يُكرَّر بلا طائل. الإضافةُ لبريدٍ آخر موضعُها
 * هذه الدالة وحدها.
 */
import { appendFile, readFile } from 'node:fs/promises'
import { existsSync, openSync, fstatSync, readSync, closeSync } from 'node:fs'
import path from 'node:path'
import { PRIVATE } from './seal.js'

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

export function createMailApi({ dir, env = process.env } = {}) {
  const FILE = path.join(dir, 'mail.outbox.jsonl')
  const KEY = String(env.RESEND_API_KEY || '').trim()
  const FROM = String(env.QALB_MAIL_FROM || env.VITE_QALB_MAIL || 'Qalb <billing@qalb.store>').trim()
  const REPLY = String(env.QALB_MAIL_REPLY || env.VITE_QALB_MAIL || 'qalb@qalb.store').trim()

  async function outbox() {
    if (!existsSync(FILE)) return []
    const rows = []
    ;(await readFile(FILE, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .forEach((l) => {
        try {
          rows.push(JSON.parse(l))
        } catch {
          /* سطرٌ نصفُ مكتوب لا يُسقط صندوقَ الصادر كلّه */
        }
      })
    return rows
  }

  /**
   * إرسالُ رسالةٍ واحدة. النتيجة تُخبر بالحالتين: `sent` (بوّابة) أو `queued`
   * (كُتبت على القرص). لا ترمي استثناءً أبدًا — فخطأُ البريد لا يُسقط دفعًا
   * صحيحًا ولا طلبًا مسجَّلًا.
   */
  async function send({ to, subject, html, text, replyTo }) {
    const rec = { to, subject, text: (text || '').slice(0, 4000), at: new Date().toISOString() }
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(to)) return { ok: false, queued: false, why: 'bad recipient' }
    if (KEY) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: [to], subject, html, text, reply_to: replyTo || REPLY }),
        })
        if (!r.ok) throw new Error(`resend ${r.status}`)
        const j = await r.json().catch(() => ({}))
        return { ok: true, queued: false, id: j.id || null }
      } catch (e) {
        // بوّابةٌ مقطوعة: تُكتب الرسالة على القرص بدل أن تضيع
        await appendFile(FILE, (endsWithNewline(FILE) ? '' : '\n') + JSON.stringify({ ...rec, failed: String(e.message || e).slice(0, 160) }) + '\n', {
          encoding: 'utf8',
          mode: PRIVATE,
        })
        return { ok: false, queued: true, why: String(e.message || e).slice(0, 160) }
      }
    }
    await appendFile(FILE, (endsWithNewline(FILE) ? '' : '\n') + JSON.stringify({ ...rec, queued: true }) + '\n', {
      encoding: 'utf8',
      mode: PRIVATE,
    })
    return { ok: true, queued: true, why: 'no mail provider configured — written to the outbox' }
  }

  return {
    from: FROM,
    replyTo: REPLY,
    enabled: () => !!KEY,
    file: FILE,
    send,
    outbox,
    stats: () => ({ provider: KEY ? 'resend' : 'outbox', from: FROM }),
  }
}
