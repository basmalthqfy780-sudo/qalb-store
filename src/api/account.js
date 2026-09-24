/**
 * عميل الحساب — نفس العقد في الوضعين، كما في الطلبات والاستضافة.
 *
 *   local — السجلّ على الجهاز تحت `qalb.account.v1`، ومفتاحه تحت
 *           `qalb.account-keys.v1`. لا كلمة سر: لا مُصادقة في المتصفح تُصدَّق،
 *           ومن ادّعى «تسجيل دخول آمن» بلا خادم يكذب. ما هنا حافظةُ عمل.
 *   rest  — server/accounts.js خلفه مباشرة؛ **الخطة لا تُرقّى من المتصفح**،
 *           كما في خطط الاستضافة: يُسجَّل `planPending` ويُفعّلها الموظف.
 *
 * والقواعد (السقوف، بوابة القالب الثاني، التنقية) تُقرأ من src/data/account.js
 * وsrc/data/plans.js — الوحدتان اللتان يقرؤهما الخادم أيضًا، فلا يختلف ما يُعرض
 * عمّا يُقبل.
 */
import { BASE, apiMode, read, write } from './index'
import { ACCOUNT_KEY, ACCOUNT_KEYS_KEY, CONSENT_VERSION, EMAIL_RE, canCreate, sanitizeAccount } from '../data/account'

const todayS = () => new Date().toISOString().slice(0, 10)
const stamp = () => new Date().toISOString()

const secret = (n) => {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint8Array(n)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf)
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
  return Array.from(buf, (b) => abc[b % abc.length]).join('')
}

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

/** المفتاح المحفوظ على هذا الجهاز — لا يُرسل إلى اللوحة ولا يظهر في أي قائمة */
const keyOf = (id) => {
  const m = read(ACCOUNT_KEYS_KEY, {})
  return (m && typeof m === 'object' && m[id]) || ''
}
const rememberKey = (id, key) => {
  const m = read(ACCOUNT_KEYS_KEY, {}) || {}
  m[id] = key
  write(ACCOUNT_KEYS_KEY, m)
}

export const account = {
  mode: apiMode,
  consentVersion: CONSENT_VERSION,

  /** ما على هذا الجهاز — null يعني «لم يسجّل بعد» */
  local() {
    const raw = read(ACCOUNT_KEY, null)
    if (!raw || typeof raw !== 'object' || !raw.email) return null
    return sanitizeAccount(raw)
  },

  /**
   * التسجيل: بريدٌ واحد وإقرار. لا كلمة سر ولا رسالة تأكيد — لا مُرسِل
   * موصول في هذا المستودع، والواجهة تقول ذلك صراحة.
   */
  async signUp({ email, consent = false, niche = null, answers = {} } = {}) {
    const mail = String(email || '')
      .trim()
      .toLowerCase()
    if (!EMAIL_RE.test(mail)) return { ok: false, status: 400, error: 'email' }
    if (consent !== true) return { ok: false, status: 400, error: 'consent' }
    const rec = sanitizeAccount({
      id: `QA-${secret(3).toUpperCase()}`,
      email: mail,
      plan: 'free',
      since: todayS(),
      consent: { v: CONSENT_VERSION, at: stamp() },
      niche,
      answers,
    })
    if (apiMode === 'rest') {
      const r = await rest('/accounts', { method: 'POST', body: rec })
      if (r.ok) {
        write(ACCOUNT_KEY, sanitizeAccount(r.account || rec))
        if (r.key) rememberKey(rec.id || r.account?.id, r.key)
        return { ok: true, status: 201, account: sanitizeAccount(r.account || rec), key: r.key || null, note: r.note || null }
      }
      // خادمٌ غير موصول أو رفض: لا ندّعي حسابًا على الخادم — يبقى العمل على الجهاز
      write(ACCOUNT_KEY, rec)
      return { ok: true, status: 201, account: rec, offline: true, error: r.error || 'server-unreachable' }
    }
    write(ACCOUNT_KEY, rec)
    return { ok: true, status: 201, account: rec }
  },

  /** تحديث الأجوبة/المجال — يمرّ على التنقية نفسها */
  async update(patch = {}) {
    const cur = account.local()
    if (!cur) return { ok: false, status: 401, error: 'no-account' }
    const next = sanitizeAccount({ ...cur, ...patch, email: cur.email, plan: cur.plan, created: cur.created })
    if (apiMode === 'rest') {
      const r = await rest(`/accounts/${encodeURIComponent(cur.id)}`, { method: 'PATCH', body: patch, key: keyOf(cur.id) })
      if (r.ok && r.account) {
        write(ACCOUNT_KEY, sanitizeAccount(r.account))
        return { ok: true, status: 200, account: sanitizeAccount(r.account) }
      }
    }
    write(ACCOUNT_KEY, next)
    return { ok: true, status: 200, account: next }
  },

  /**
   * بوابة Freemium في مكان واحد: تُضاف قالبًا إلى الحساب إن سمحت الخطة،
   * وتُعيد `{ok:false, error:'limit', gate}` حين لا تسمح — فتعرض الواجهة
   * الخطة بدل أن تفتح محرّرًا ثم تعتذر.
   */
  async addTemplate(entry = {}) {
    const cur = account.local()
    if (!cur) return { ok: false, status: 401, error: 'no-account' }
    const gate = canCreate(cur)
    if (!gate.allowed) return { ok: false, status: 402, error: 'limit', gate }
    const created = [
      ...cur.created,
      { slug: String(entry.slug || ''), template: String(entry.template || ''), niche: entry.niche || cur.niche, at: todayS() },
    ].filter((c) => c.slug)
    return account.update({ created })
  },

  /**
   * تفعيل خطة. `local`: يُسجَّل التفعيل على الجهاز (لا بوابة دفع في هذه
   * النسخة — والواجهة تقول ذلك). `rest`: يُطلب من الخادم، والخادم يرفض
   * الترقية من المتصفح فيُسجَّل `planPending`.
   */
  async requestPlan(planId) {
    const cur = account.local()
    if (!cur) return { ok: false, status: 401, error: 'no-account' }
    if (apiMode === 'rest') {
      const r = await rest(`/accounts/${encodeURIComponent(cur.id)}/plan`, { method: 'POST', body: { plan: planId }, key: keyOf(cur.id) })
      return { ...r, pending: r.status === 202 || r.pending === true }
    }
    const next = sanitizeAccount({
      ...cur,
      plan: planId,
      activations: [...cur.activations, { plan: planId, at: stamp(), method: 'recorded' }],
    })
    write(ACCOUNT_KEY, next)
    return { ok: true, status: 200, account: next, recorded: true }
  },

  /** بوابة القالب التالي كما يراها هذا الجهاز الآن */
  gate() {
    const cur = account.local()
    return canCreate(cur || {})
  },

  /** «امسح حسابي من هذا المتصفح»: يمسح ما هنا ويقول ما لا يمسّه */
  forget() {
    const cur = account.local()
    if (cur?.id) {
      const m = read(ACCOUNT_KEYS_KEY, {}) || {}
      delete m[cur.id]
      write(ACCOUNT_KEYS_KEY, m)
    }
    try {
      localStorage.removeItem(ACCOUNT_KEY)
    } catch {
      /* محجوب أو ممتلئ — لا يُفشِل العملية */
    }
    return { ok: true, note: 'server-copy-remains' }
  },
}

export default account
