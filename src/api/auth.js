/**
 * عميلُ الجلسة — الواجهةُ كلها تمرّ من هنا، ولا صفحةٌ تكتب مفتاحًا بنفسها.
 *
 * ثلاثُ وظائف فقط:
 *   1. **تسجيل**: بريدٌ (واسمٌ اختياري) ← سجلٌّ في `qalb.users.v1`، وسجلُّ حسابٍ في
 *      `qalb.account.v1` بالمُولّد نفسه الذي يفتح اللوحة (`account.signUp`)، ثم
 *      جلسةٌ قائمة. ولا كلمة سرّ: لا مُراجِعَ يمنح واحدة معنى، ولا خادم يحفظها.
 *   2. **دخول**: بريدٌ لجهازٍ أنشأ الحساب من قبل ← استرجاعُ سجلّه وجلسته.
 *      وبريدٌ مجهول **لا** يُنشئ حسابًا صامتًا: يُقال «لا حساب بهذا البريد على هذا
 *      الجهاز» مع رابط التسجيل (وهو الخطأ الذي يقع فيه كل «دخول» يخترع الحساب).
 *   3. **خروج**: تُمسح الجلسةُ وحدها. سلّةُ الحساب ومفضّلته تبقى في مفاتيحه،
 *      فمن يعود يجد ما تركه؛ ومن يشارك الجهاز لا يرى سلّة غيره (المتجر يعود
 *      إلى مفاتيح الضيف).
 *
 * ومن يريد محوَ الحساب كله من الجهاز: `forgetDevice` — تمسح السجلّ والمفاتيح
 * الثلاثة والجلسة، وتقول ما لا تمسّه (نسخةُ الخادم إن وُجدت).
 */
import { BASE, apiMode, read, write } from './index'
import { ACCOUNT_KEY, sanitizeAccount } from '../data/account'
import { SESSION_KEY, USERS_KEY, cartKeyFor, cleanEmail, isEmail, sanitizeSession, sanitizeUsers, upsertUser, wishKeyFor } from '../data/auth'
import { account } from './account'

const remove = (k) => {
  try {
    localStorage.removeItem(k)
  } catch {
    /* محجوب أو ممتلئ — الحذف ليس شرطًا لتغيير الجلسة */
  }
}

const listeners = new Set()
const emit = () => {
  const s = auth.current()
  for (const fn of listeners) {
    try {
      fn(s)
    } catch {
      /* مستمعٌ سقط لا يُسقط تغيير الجلسة لغيره */
    }
  }
}

export const auth = {
  mode: apiMode,
  /** الجلسة الآن — أو null */
  current: () => sanitizeSession(read(SESSION_KEY, null)),
  /** حساباتُ هذا الجهاز (لعرض «من سجّل هنا» في صفحة الدخول، وليس لغيرها) */
  users: () => sanitizeUsers(read(USERS_KEY, {})),

  /**
   * تغييرُ الجلسة يصل إلى الشريط والمخزن فورًا. تخزينُ المتصفح لا يُطلق حدثًا في
   * التبويب الذي كتب فيه، فالإشعارُ يدويٌّ هنا — وإلا بقي عدّادُ السلّة على رقم
   * الضيف بعد الدخول حتى يُحدَّث أحدٌ الصفحة.
   */
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  /**
   * تسجيلٌ بالبريد. الاسم اختياري: من لا يكتبه يبقى باسمٍ فارغ حتى يكتبه في
   * اللوحة — ولا نخترع اسمًا من البريد (`noura@gmail.com` لا تصير «نورة»).
   */
  async register({ email, name = '' } = {}) {
    const mail = cleanEmail(email)
    if (!isEmail(mail)) return { ok: false, status: 400, reason: 'email' }
    const users = sanitizeUsers(read(USERS_KEY, {}))
    if (users[mail]) return { ok: false, status: 409, reason: 'exists', email: mail }
    const clean = String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80)
    if (clean && /[<>]/.test(clean)) return { ok: false, status: 400, reason: 'name' }
    // سجلُّ الحساب يُبنى بالمُولّد نفسه الذي يفتح اللوحة (src/api/account.js):
    // نسخةٌ ثانية من القواعد هنا كانت ستُنتج سجلًّا لا تقبله الصفحات.
    const r = await account.signUp({ email: mail, consent: true })
    if (!r?.ok) return { ok: false, status: 400, reason: 'email' }
    write(USERS_KEY, upsertUser(users, { email: mail, name: clean, record: r.account }))
    write(SESSION_KEY, { email: mail, at: new Date().toISOString() })
    emit()
    return { ok: true, status: 201, account: r.account, session: auth.current(), offline: !!r.offline }
  },

  /** دخولٌ لبريدٍ سُجّل على هذا الجهاز — وإلا فلا حسابَ يُخترع */
  async login({ email } = {}) {
    const mail = cleanEmail(email)
    if (!isEmail(mail)) return { ok: false, status: 400, reason: 'email' }
    const users = sanitizeUsers(read(USERS_KEY, {}))
    const user = users[mail]
    if (!user) return { ok: false, status: 404, reason: 'noAccount', email: mail }
    // سجلُّ الحساب يعود إلى المفتاح الذي تقرؤه بقيةُ الصفحات (`qalb.account.v1`)
    const active = sanitizeAccount(read(ACCOUNT_KEY, null) || {})
    if (active.email !== mail) {
      // حسابُ شخصٍ آخر على الجهاز: لا نُلغي سجلّه (محفوظٌ في السجلّ)، نُنشِط حساب الداخل
      const mine = user.record || sanitizeAccount({ email: mail, plan: 'free' })
      write(ACCOUNT_KEY, mine)
    }
    write(USERS_KEY, upsertUser(users, { email: mail, name: user.name }))
    write(SESSION_KEY, { email: mail, at: new Date().toISOString() })
    emit()
    return { ok: true, status: 200, session: auth.current(), account: account.local() }
  },

  /** خروجٌ بلا مسح: الجلسةُ تذهب، والسلّةُ المحفوظة لهذا البريد تبقى في مفتاحها */
  signOut() {
    remove(SESSION_KEY)
    emit()
    return { ok: true }
  },

  /** محوُ الحساب من هذا الجهاز: السجلّ والجلسة ومفاتيح سلّته ومفضّلته */
  forgetDevice(email) {
    const mail = cleanEmail(email || auth.current()?.email || '')
    if (mail) {
      const users = sanitizeUsers(read(USERS_KEY, {}))
      delete users[mail]
      write(USERS_KEY, users)
      remove(cartKeyFor(mail))
      remove(wishKeyFor(mail))
    }
    remove(SESSION_KEY)
    emit()
    return { ok: true, note: 'server-copy-remains' }
  },
}

/** عنوانُ الواجهة عند وجود خادم: يُصدَّر للفحوصات والتوثيق — لا يُستعمل في المتصفح */
export const authBase = BASE

export default auth
