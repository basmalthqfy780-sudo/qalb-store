/**
 * الحساب المحلي: من بريدٍ واحد إلى جلسةٍ على هذا الجهاز، وسلّةٍ ومفضّلةٍ تتبع البريد.
 *
 * ما هذا الملف وما ليس هو:
 *   • **هو** مصدرُ الحقيقة لثلاثة أشياء فقط: قائمةُ الحسابات التي أُنشئت على هذا
 *     الجهاز (`qalb.users.v1`)، الجلسةُ القائمة (`qalb.session.v1`)، ومفاتيحُ
 *     التخزين المشتقّة من البريد (`qalb.cart.v2.<email>` و`qalb.wish.v2.<email>`).
 *   • **ليس** خادمَ مصادقة. لا كلمة سرّ ولا رمز تحقّق ولا كوكي HttpOnly: لا خادم
 *     في هذا النشر أصلًا (وضع `local`). ولهذا يقول زرُّ الدخول في الواجهة صراحةً
 *     إن الجلسة محفوظةٌ في هذا المتصفح، وإن اسمًا وكلمةَ سرٍّ يُنتحلان هنا أسوأ
 *     من غيابهما: قفلٌ وهميّ يوهم صاحبه بالأمان.
 *
 * ولماذا السلّة والمفضّلة مربوطتان بالبريد؟
 *   الحاجةُ حقيقية: زائرٌ أضاف ثلاثة قوالب ثم أراد أن يفتحها من جلسةٍ لاحقة.
 *   فكلُّ تغييرٍ يُكتب في مفتاح صاحبه، وعند الدخول تُدمج سلّةُ الضيف في سلّة
 *   الحساب (لا يُفقد ما أُضيف قبل الدخول)، وعند الخروج يعود المتجر إلى سلّة
 *   الضيف — فلا يرى زائرٌ سلّةَ غيره على جهازٍ مشترك.
 *
 * والقواعد كلها دوالُّ صافية تُختبر بلا متصفح: التنقية، الدمج، وتحويل البريد إلى
 * مفتاح. فالواجهة والخادم (حين يُوصل) يقرآن الملف نفسه.
 */
import { EMAIL_RE, sanitizeAccount } from './account.js'

/** حسابٌ أُنشئ على هذا الجهاز — باسمه وبريده وتاريخه (لا كلمة سر: لا سرّ يُحفظ) */
export const USERS_KEY = 'qalb.users.v1'
/** الجلسة القائمة الآن: `{ email, at }` أو لا شيء */
export const SESSION_KEY = 'qalb.session.v1'
/** سلّةُ ومفضّلةُ الضيف (قبل الدخول) — المفاتيح القديمة نفسها، فلا يفقد أحدٌ سلّته */
export const GUEST_CART_KEY = 'qalb.cart.v1'
export const GUEST_WISH_KEY = 'qalb.wish.v1'

/** مفتاحُ التخزين لصاحب البريد؛ وبلا بريدٍ يبقى مفتاحُ الضيف كما كان */
export const cartKeyFor = (email) => (email ? `qalb.cart.v2.${String(email).toLowerCase()}` : GUEST_CART_KEY)
export const wishKeyFor = (email) => (email ? `qalb.wish.v2.${String(email).toLowerCase()}` : GUEST_WISH_KEY)

/** سقوفُ الدمج: سلّةٌ لا تنمو بلا حدّ حين يُدمج حسابٌ قديم في حسابٍ جديد */
export const MAX_LINES = 60
export const MAX_QTY = 9
export const MAX_WISH = 60

const str = (v, max) =>
  String(v == null ? '' : v)
    .trim()
    .slice(0, max)

/** بريدٌ صالح: نفسُ القاعدة التي تقبلها الطلبات ودفتر الجهات — لا نسخة ثانية */
export const isEmail = (v) => EMAIL_RE.test(str(v, 160).toLowerCase())
export const cleanEmail = (v) => str(v, 160).toLowerCase()

/** سطرٌ واحد من السلّة: `{ id, qty }` بعد تنقية — ما لا يُقرأ لا يُحفظ */
const cleanLine = (l) =>
  l && typeof l === 'object' && typeof l.id === 'string' && l.id
    ? { id: str(l.id, 28), qty: Math.max(1, Math.min(MAX_QTY, Math.round(Number(l.qty) || 1))) }
    : null

/** سلّةٌ محفوظة → مصفوفةٌ نظيفة (يتحمّل JSON قديمًا أو مكسورًا) */
export const cleanLines = (raw) => (Array.isArray(raw) ? raw.map(cleanLine).filter(Boolean).slice(0, MAX_LINES) : [])

/** قائمةُ معرّفات المفضّلة → بلا تكرار وبسقف */
export const cleanWish = (raw) => [...new Set((Array.isArray(raw) ? raw : []).map((x) => str(x, 28)).filter(Boolean))].slice(0, MAX_WISH)

/**
 * دمجُ سلّتين: الكمّيةُ تُجمع (بسقف ٩) والترتيبُ يبدأ بالمحفوظ ثم الجديد، فلا
 * يقفز ما كان في الحساب إلى آخر القائمة عند الدخول.
 */
export function mergeLines(saved, incoming) {
  const out = cleanLines(saved).map((l) => ({ ...l }))
  for (const l of cleanLines(incoming)) {
    const at = out.findIndex((x) => x.id === l.id)
    if (at === -1) out.push(l)
    else out[at] = { ...out[at], qty: Math.min(MAX_QTY, out[at].qty + l.qty) }
  }
  return out.slice(0, MAX_LINES)
}

/** دمجُ المفضّلة: اتحادٌ بلا تكرار، المحفوظ أولًا */
export const mergeWish = (saved, incoming) => cleanWish([...cleanWish(saved), ...cleanWish(incoming)])

/**
 * سجلُّ الحسابات على الجهاز: مفتاحُه البريد، وقيمتُه اسمٌ وتاريخ **وسجلُّ حسابٍ
 * كامل** (`record`، بنفس تنقية `sanitizeAccount`). وجودُ السجلّ الكامل هنا هو ما
 * يجعل «دخولًا» ثانيًا يعيد صاحبَه إلى ما تركه (قالبٌ وُلِّد، خطةٌ سُجّلت) بدل
 * أن يبدأ من صفر — وبدونه كان تبديلُ الحسابات على جهازٍ واحد يمسح عمل الأول.
 */
export function sanitizeUsers(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const out = {}
  for (const [k, v] of Object.entries(src)) {
    const email = cleanEmail(k)
    if (!isEmail(email) || !v || typeof v !== 'object') continue
    const record = v.record ? sanitizeAccount({ ...v.record, email }) : null
    out[email] = {
      email,
      name: str(v.name, 80),
      since: str(v.since, 10) || new Date().toISOString().slice(0, 10),
      last: str(v.last, 32),
      ...(record?.email ? { record } : {}),
    }
  }
  return out
}

/** إضافة/تحديث حسابٍ في السجلّ — تعيد سجلًّا جديدًا (لا تعديلٌ في المكان) */
export function upsertUser(users, { email, name = '', record = null, at = new Date().toISOString() } = {}) {
  const mail = cleanEmail(email)
  const all = sanitizeUsers(users)
  if (!isEmail(mail)) return all
  const prev = all[mail]
  const clean = record ? sanitizeAccount({ ...record, email: mail }) : null
  all[mail] = {
    email: mail,
    name: str(name, 80) || prev?.name || '',
    since: prev?.since || at.slice(0, 10),
    last: at.slice(0, 32),
    ...(clean?.email ? { record: clean } : prev?.record ? { record: prev.record } : {}),
  }
  return all
}

/** الجلسةُ المقروءة: لا جلسة لبريدٍ غير صالح، ولا جلسة بلا تاريخ */
export function sanitizeSession(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const email = cleanEmail(src.email)
  return isEmail(email) ? { email, at: str(src.at, 32) || new Date().toISOString() } : null
}

/**
 * ما يقوله التسجيل/الدخول في الوضع المحلي — دالةٌ واحدة تُستعمل في الفحص وفي
 * الواجهة، فلا تختلف الرسالة عن الحالة: `noAccount` تعني «لا حساب بهذا البريد
 * على هذا الجهاز» (فتُقرأ دعوةٌ إلى التسجيل لا خطأً مبهمًا).
 */
export function reasonTextKey(reason) {
  return (
    {
      email: 'auth.errEmail',
      exists: 'auth.errExists',
      noAccount: 'auth.errNoAccount',
      name: 'auth.errName',
    }[reason] || null
  )
}

export default { USERS_KEY, SESSION_KEY, cartKeyFor, wishKeyFor, mergeLines, mergeWish, sanitizeUsers, upsertUser, sanitizeSession }
