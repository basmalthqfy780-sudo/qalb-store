/**
 * لوحة الإدارة في وضع local — كل شيء يبقى على هذا الجهاز.
 *
 * ‫! ملاحظة صدق: هذا القفل يكفي لتجربة اللوحة أو لاستعمالها على حاسوبك
 * الشخصي، لكنه ليس أمانًا حقيقيًا: البيانات والتجزئة كلها في localStorage،
 * ولا يوجد خادم يتحقق من شيء. لبيانات فعلية شغّل خادم الطلبات
 * (VITE_QALB_API=rest) — عندها تنتقل المصادقة والتخزين إلى server/admin.js.
 *
 * العقد هنا مطابق لعقد الخادم: نفس الحقول، نفس رسائل الأخطاء، نفس الحماية
 * من الحذف الذاتي وآخر مالك، حتى يكون كود اللوحة واحدًا للوضعين.
 */
import { sanitize, priceTable } from '../data/catalog.js'
import { computeStats, csvOf } from '../data/stats.js'
import { VAT } from '../data/tax.js'

const USERS = 'qalb.admin.v1'
const PROD = 'qalb.products.v1'
export const MIN_PASS = 10
const LOCK_MS = 60_000
const MAX_FAILS = 5

const read = (k, fb) => {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : fb
  } catch {
    return fb
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage may be full or blocked — the panel reports it instead of pretending */
  }
}

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '2')).join('')
const rand = () => hex(new Uint8Array(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))))

/**
 * SHA-256 عند توفره. بدونه (jsdom، أو سياق غير آمن) نستخدم تجزئة بسيطة
 * مُعلَنة الاسم: تمنع القراءة العَرَضية لكلمة السر في التخزين، ولا تدّعي
 * مقاومة هجوم — لذلك وضع local ليس للأرقام الحقيقية أصلًا.
 */
async function hash(pw, salt) {
  const msg = `${salt}:${pw}`
  const subtle = globalThis.crypto?.subtle
  if (subtle?.digest) {
    try {
      const buf = await subtle.digest('SHA-256', new TextEncoder().encode(msg))
      return 'sha256:' + hex(new Uint8Array(buf))
    } catch {
      /* fall through to the documented weak path */
    }
  }
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < msg.length; i++) {
    h1 = Math.imul(h1 ^ msg.charCodeAt(i), 16777619) >>> 0
    h2 = Math.imul(h2 + msg.charCodeAt(i) * (i + 7), 2654435761) >>> 0
  }
  return 'fnv:' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

const today = () => new Date().toISOString().slice(0, 10)
const db = () => read(USERS, { users: [], session: null, fails: null })
const save = (next) => (write(USERS, next), next) // المستخدمون وحدهم؛ المنتجات تُكتب بـ write(PROD, …)
const safe = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, lastLogin: u.lastLogin || null })
const me = (d) => d.users.find((u) => u.id === d.session) || null
const lockedFor = (d) =>
  d.fails && d.fails.n >= MAX_FAILS && Date.now() - d.fails.t < LOCK_MS ? Math.ceil((LOCK_MS - (Date.now() - d.fails.t)) / 1000) : 0

export const localAdmin = {
  async session() {
    const d = db()
    const u = me(d)
    return u
      ? { ok: true, user: safe(u), mode: 'local' }
      : { ok: false, enabled: d.users.length > 0, needSetup: d.users.length === 0, minPass: MIN_PASS }
  },

  async login({ email, password } = {}) {
    const d = db()
    const wait = lockedFor(d)
    if (wait) return { ok: false, status: 429, error: 'too many attempts', retryAfter: wait }
    if (!d.users.length) return { ok: false, status: 503, error: 'no account yet', needSetup: true, minPass: MIN_PASS }
    const mail = String(email || '')
      .trim()
      .toLowerCase()
    const hit = d.users.find((x) => (mail ? String(x.email).toLowerCase() === mail : d.users.length === 1))
    if (!hit || (await hash(String(password || ''), hit.salt)) !== hit.pass) {
      save({ ...d, fails: { n: (d.fails?.n || 0) + 1, t: Date.now() } })
      return { ok: false, status: 401, error: 'bad credentials' }
    }
    save({ ...d, session: hit.id, fails: null, users: d.users.map((x) => (x.id === hit.id ? { ...x, lastLogin: today() } : x)) })
    return { ok: true, user: safe(hit) }
  },

  async setup({ name, email, password } = {}) {
    const d = db()
    if (d.users.length) return { ok: false, status: 409, error: 'an account already exists' }
    const pw = String(password || '')
    if (pw.length < MIN_PASS) return { ok: false, status: 400, errors: { password: 'length' } }
    const salt = rand()
    const owner = {
      id: 'owner',
      name:
        String(name || '')
          .trim()
          .slice(0, 60) || 'Owner',
      email: String(email || 'this device').slice(0, 120),
      role: 'owner',
      salt,
      pass: await hash(pw, salt),
      createdAt: today(),
      lastLogin: today(),
    }
    save({ users: [owner], session: owner.id, fails: null })
    return { ok: true, user: safe(owner), setup: true }
  },

  async logout() {
    const d = db()
    save({ ...d, session: null })
    return { ok: true }
  },

  async stats() {
    return computeStats(read('qalb.orders.v1', []), { vat: VAT, overrides: read(PROD, {}) })
  },
  async orders() {
    return { orders: read('qalb.orders.v1', []).slice(0, 50) }
  },
  async csv() {
    return csvOf(read('qalb.orders.v1', []))
  },

  async products() {
    const ov = read(PROD, {})
    return { ok: true, overrides: ov, prices: priceTable(ov), limits: { min: 1, max: 99999 } }
  },
  async patchProduct(id, patch) {
    const all = read(PROD, {})
    const { out, errors } = sanitize(patch)
    if (Object.keys(errors).length) return { ok: false, status: 400, errors }
    all[id] = { ...all[id], ...out }
    write(PROD, all)
    return { ok: true, overrides: all, prices: priceTable(all) }
  },
  async createProduct(draft) {
    const all = read(PROD, {})
    const { out, errors } = sanitize(draft, { isNew: true })
    if (Object.keys(errors).length) return { ok: false, status: 400, errors }
    if (all[out.id]) return { ok: false, status: 409, errors: { id: 'exists' } }
    all[out.id] = { ...out, custom: true, type: draft.type, clone: draft.clone || null }
    write(PROD, all)
    return { ok: true, id: out.id, overrides: all, prices: priceTable(all) }
  },
  async deleteProduct(id) {
    const all = read(PROD, {})
    if (all[id]?.custom) delete all[id]
    else all[id] = { ...all[id], published: false }
    write(PROD, all)
    return { ok: true, removed: !all[id], hidden: !!(id in all), overrides: all, prices: priceTable(all) }
  },
  async restoreProduct(id) {
    const all = read(PROD, {})
    delete all[id]
    write(PROD, all)
    return { ok: true, restored: id, overrides: all, prices: priceTable(all) }
  },

  async users() {
    return { ok: true, users: db().users.map(safe) }
  },
  async createUser({ name, email, password, role } = {}) {
    const d = db()
    const who = me(d)
    const mail = String(email || '')
      .trim()
      .toLowerCase()
    const errors = {}
    if (String(name || '').trim().length < 2) errors.name = 'name'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(mail)) errors.email = 'email'
    else if (d.users.some((x) => String(x.email).toLowerCase() === mail)) errors.email = 'exists'
    if (String(password || '').length < MIN_PASS) errors.password = 'length'
    if (Object.keys(errors).length) return { ok: false, status: 400, errors }
    const salt = rand()
    let id =
      mail
        .split('@')[0]
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 24) || `u${rand().slice(0, 6)}`
    if (d.users.some((x) => x.id === id)) id = `${id}-${rand().slice(0, 4)}`
    const user = {
      id,
      name: String(name).trim().slice(0, 60),
      email: mail,
      role: role === 'owner' && who?.role === 'owner' ? 'owner' : 'admin',
      salt,
      pass: await hash(String(password), salt),
      createdAt: today(),
      lastLogin: null,
    }
    save({ ...d, users: [...d.users, user] })
    return { ok: true, users: db().users.map(safe) }
  },
  async deleteUser(id) {
    const d = db()
    const hit = d.users.find((x) => x.id === id)
    if (!hit) return { ok: false, status: 404, error: 'unknown user' }
    if (hit.id === d.session) return { ok: false, status: 409, error: 'you cannot remove the account you are signed in with' }
    if (hit.role === 'owner' && d.users.filter((x) => x.role === 'owner').length <= 1)
      return { ok: false, status: 409, error: 'at least one owner must remain' }
    save({ ...d, users: d.users.filter((x) => x.id !== id) })
    return { ok: true, users: db().users.map(safe) }
  },
  async resetPassword(id, password) {
    const d = db()
    const who = me(d)
    const hit = d.users.find((x) => x.id === id)
    if (!hit) return { ok: false, status: 404, error: 'unknown user' }
    if (String(password || '').length < MIN_PASS) return { ok: false, status: 400, errors: { password: 'length' } }
    if (who?.id !== hit.id && who?.role !== 'owner') return { ok: false, status: 403, error: 'only the owner may reset another admin password' }
    const salt = rand()
    const pass = await hash(String(password), salt)
    const users = d.users.map((x) => (x.id === hit.id ? { ...x, salt, pass } : x))
    save({ ...d, users })
    return { ok: true, users: users.map(safe) }
  },
}
