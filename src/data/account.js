/**
 * الحساب — من «بريدٌ واحد» إلى قالبٍ أول مجانًا، ثم بوابة الاشتراك.
 *
 * تسلسل النموذج كما نُفّذ هنا، خطوة بخطوة:
 *   1. يسجّل المستخدم ببريده — **البريد وحده** في البداية، فلا كلمة سر ولا تأكيد:
 *      لا مُرسِل بريد موصول في هذا المستودع، ومن يَعِد برسالة تأكيد يكذب.
 *      المفتاح الذي يُصدره الحساب يُحفظ على جهاز صاحبه (كما في مفاتيح التحرير
 *      في src/api/hosting.js) — جهازٌ آخر يعني مفتاحًا آخر.
 *   2. يختار مجاله من ستة (مصمم، مصور، مبرمج، طالب، كاتب، مهندس).
 *   3. يجيب على أسئلة قصيرة: الاسم، المهنة، الخدمات، الأعمال، الألوان، الروابط.
 *   4. يُولَّد **قالبه الأول مجانًا** من إجاباته — بمولّد الحزمة نفسه
 *      (`renderSite`/`siteHtml` في src/data/deliverable.js) لا بنسخة عرض ثانية.
 *   5. يُحفظ العمل في حسابه مجانًا.
 *   6. عند القالب الثاني أو النشر الاحترافي: تظهر الخطة (src/data/plans.js).
 *
 * القاعدة التي تحكم الملف كله، وهي قاعدة المستودع: **لا نخترع شيئًا**. حقلٌ لا
 * يُجاب عنه يبقى فارغًا فيظهر القالب بنصّه التجريبي، ومجالٌ لا يُختَر لا يُخمن،
 * وقالبٌ لا يولّد «خبرة» لم تُكتب.
 */
import { HOST_LIMITS } from './hosting.js'
import { entitlements, planOf } from './plans.js'
import { byId } from './templates.js'

export const ACCOUNT_KEY = 'qalb.account.v1'
export const ACCOUNT_KEYS_KEY = 'qalb.account-keys.v1'

/** بريدٌ واحد يكفي — نفس النموذج المستعمل في الطلبات وفي دفتر الجهات */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** سقوف الحقول: ما زاد يُبتَر لا يُطبع، والحقول المشتركة تأخذ سقوف التخصيص نفسها */
export const ACCOUNT_LIMITS = {
  name: HOST_LIMITS.name, // 80
  role: HOST_LIMITS.role, // 90
  email: HOST_LIMITS.email, // 160
  services: 220,
  works: 420,
  colours: 24,
  links: 300,
}

/**
 * المجالات الستة. `stage: 1` يعني «المرحلة الأولى» التي يُبدأ بها — مصممون
 * ومصورون أولًا ثم نتوسع، لأن قوالبهم هي الأكثر اكتمالًا في الكتالوج اليوم
 * (أيثر، أتيليه، فوليو) فالتجربة الأولى لا تُقابل بقالبٍ نصفه فارغ.
 *
 * `starters` معرّفات قوالب **حقيقية** من src/data/templates.js: القالب المولّد
 * يُبنى من أحدها، والفحص يرفض معرّفًا لا وجود له.
 */
export const NICHES = [
  {
    id: 'designer',
    stage: 1,
    icon: 'palette',
    name: { ar: 'مصمم', en: 'Designer' },
    hint: { ar: 'هوية، واجهات، منتجات', en: 'Identity, interfaces, product' },
    starters: ['aether', 'folio', 'mirrorbundle'],
    palette: ['#2f6df6', '#12b886'],
  },
  {
    id: 'photographer',
    stage: 1,
    icon: 'camera',
    name: { ar: 'مصوّر', en: 'Photographer' },
    hint: { ar: 'أعمال بصرية ومعارض', en: 'Visual work and galleries' },
    starters: ['atelier', 'folio', 'aether'],
    palette: ['#e0a33e', '#2f6df6'],
  },
  {
    id: 'developer',
    stage: 2,
    icon: 'code',
    name: { ar: 'مبرمج', en: 'Developer' },
    hint: { ar: 'مشاريع ومستودعات', en: 'Projects and repositories' },
    starters: ['nexus', 'devbundle', 'atlas'],
    palette: ['#12b886', '#7c5cff'],
  },
  {
    id: 'student',
    stage: 2,
    icon: 'cap',
    name: { ar: 'طالب', en: 'Student' },
    hint: { ar: 'تدريب تعاوني وأول سيرة', en: 'Co-op and a first résumé' },
    starters: ['gradbundle', 'nova', 'folio'],
    palette: ['#2f6df6', '#e0a33e'],
  },
  {
    id: 'writer',
    stage: 2,
    icon: 'pen',
    name: { ar: 'كاتب', en: 'Writer' },
    hint: { ar: 'مقالات ومحتوى وتحرير', en: 'Articles, content, editing' },
    starters: ['quill', 'letterpack', 'nova'],
    palette: ['#e0a33e', '#12b886'],
  },
  {
    id: 'engineer',
    stage: 2,
    icon: 'bolt',
    name: { ar: 'مهندس', en: 'Engineer' },
    hint: { ar: 'مشاريع ميدانية وشهادات', en: 'Field projects and certifications' },
    starters: ['nexus', 'atlas', 'vertex'],
    palette: ['#7c5cff', '#2f6df6'],
  },
]

export const nicheById = (id) => NICHES.find((n) => n.id === id) || null
export const nicheOf = (v) => (nicheById(v) ? v : null)
/** مجالات المرحلة الأولى — تُبرزها الواجهة «ابدأ هنا» بلا ادّعاء أنها الأفضل */
export const firstStage = () => NICHES.filter((n) => n.stage === 1)

/**
 * الأسئلة القصيرة. `opt: true` يعني أن تركه فارغًا لا يُفسد القالب — وهذا هو
 * المسار الطبيعي: بريدٌ واحد أولًا، والباقي عند الحاجة.
 */
export const QUESTIONS = [
  { k: 'name', q: 'account.q.name', key: 'personal.name', auto: 'name', opt: false, limit: ACCOUNT_LIMITS.name },
  { k: 'role', q: 'account.q.role', key: 'personal.role', opt: false, limit: ACCOUNT_LIMITS.role },
  { k: 'services', q: 'account.q.services', key: 'account.services', multiline: true, opt: true, limit: ACCOUNT_LIMITS.services },
  { k: 'works', q: 'account.q.works', key: 'account.works', multiline: true, opt: true, limit: ACCOUNT_LIMITS.works },
  { k: 'colours', q: 'account.q.colours', key: 'account.colours', colours: true, opt: true, limit: ACCOUNT_LIMITS.colours },
  { k: 'links', q: 'account.q.links', key: 'account.links', links: true, opt: true, limit: ACCOUNT_LIMITS.links },
]

/** أجوبةٌ فارغة: «لا تُحقن شيئًا» — فالقالب يصل بنصّه التجريبي لا بـ«غير محدد» */
export const EMPTY_ANSWERS = { name: '', role: '', services: '', works: '', colours: [], links: [] }

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const URL_RE = /^https?:\/\/[^\s]{4,200}$/i
/**
 * سطرٌ واحد بلا محارف تحكّم — تُصفّى بالشفرة لا بنمط (`no-control-regex`
 * مقصود، كما في src/data/deliverable.js): محرف تحكّم داخل سجلّ محفوظ يُفسد
 * سطر JSONL في دفتر الخادم، وهو أسوأ من حرفٍ ناقص.
 */
const str = (v, max) => {
  const s =
    Array.from(String(v == null ? '' : v), (c) => {
      const n = c.charCodeAt(0)
      return n < 32 || n === 127 ? ' ' : c
    })
      .join('')
      .replace(/\s+/g, ' ')
      .trim() || ''
  return s.slice(0, max)
}

/**
 * تنقية الأجوبة. القواعد نفسها في المتصفح والخادم (الخادم يستورد هذه الوحدة)،
 * فلا يُخزَّن في الدفتر ما لا تقبله الواجهة:
 *   • `<>` في حقل ⇒ يُرفض الحقل كله (يُطبع نصُّ القالب بدل حرفٍ مشوّه).
 *   • الألوان: `#rgb` أو `#rrggbb` فقط، ولونان كحد أقصى — الثالث يسقط.
 *   • الروابط: http(s) فقط، وثلاثة كحد أقصى.
 */
export function sanitizeAnswers(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { ...EMPTY_ANSWERS }
  for (const k of ['name', 'role', 'services', 'works']) {
    const v = str(src[k], ACCOUNT_LIMITS[k])
    // حقلٌ فيه وسمٌ يُرفض كله: طباعة «<b>» حرفيًا أسوأ من ترك النص التجريبي
    out[k] = /[<>]/.test(v) ? '' : v
  }
  const colours = Array.isArray(src.colours) ? src.colours : typeof src.colours === 'string' ? src.colours.split(/[\s,]+/) : []
  out.colours = colours
    .map((c) => str(c, 9))
    .filter((c) => HEX_RE.test(c))
    .slice(0, 2)
  const links = Array.isArray(src.links) ? src.links : typeof src.links === 'string' ? src.links.split(/[\s,]+/) : []
  out.links = links
    .map((l) => str(l, ACCOUNT_LIMITS.links))
    .filter((l) => URL_RE.test(l))
    .slice(0, 3)
  return out
}

/** أي الحقول سقطت في التنقية — تُقال للمستخدم بدل مفاجأة بعد التوليد */
export function droppedAnswers(raw = {}) {
  const whole = raw && typeof raw === 'object' ? raw : {}
  // تُقبل الحالتان: سجلُّ حساب (`{answers:{…}}`) أو أجوبةٌ مجرّدة (`{name:…}`)
  const src = whole.answers && typeof whole.answers === 'object' ? whole.answers : whole
  const clean = sanitizeAnswers(src)
  const out = []
  for (const k of ['name', 'role', 'services', 'works']) {
    const v = str(src[k], ACCOUNT_LIMITS[k])
    if (v && v !== clean[k]) out.push(k)
  }
  const rawColours = (Array.isArray(src.colours) ? src.colours : []).map((c) => str(c, 9))
  if (rawColours.some((c) => c && !clean.colours.includes(c))) out.push('colours')
  const rawLinks = (Array.isArray(src.links) ? src.links : []).map((l) => str(l, ACCOUNT_LIMITS.links))
  if (rawLinks.some((l) => l && !clean.links.includes(l))) out.push('links')
  return out
}

/** القالب الذي سيُولَّد لمجال: أول معرّف حقيقي من قائمة المجال */
export function starterFor(nicheId) {
  const n = nicheById(nicheId)
  if (!n) return null
  return n.starters.map((id) => byId(id)).find(Boolean) || null
}

/**
 * تنقية سجلّ الحساب كله. تُستعمل عند الإنشاء وعند كل تحديث، وفي الخادم قبل
 * الحفظ — فلا مسارَ يكتب سجلًّا لم يمرّ هنا.
 */
export function sanitizeAccount(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const email = str(src.email, ACCOUNT_LIMITS.email).toLowerCase()
  const answers = sanitizeAnswers(src.answers)
  const created = (Array.isArray(src.created) ? src.created : [])
    .filter((c) => c && typeof c === 'object' && typeof c.slug === 'string')
    .map((c) => ({
      slug: str(c.slug, 32),
      template: str(c.template, 28),
      niche: nicheOf(c.niche),
      at: str(c.at, 24) || new Date().toISOString().slice(0, 10),
    }))
    .filter((c) => c.slug)
  return {
    id: str(src.id, 40),
    email: EMAIL_RE.test(email) ? email : '',
    plan: planOf(src.plan),
    since: str(src.since, 10) || new Date().toISOString().slice(0, 10),
    // الإقرار بالفحص الآلي: يُختم بتاريخٍ ونسخة نص، فلا يُقال «وافق» بلا أثر
    consent: src.consent ? { v: str(src.consent.v, 12) || '1', at: str(src.consent.at, 32) || new Date().toISOString() } : null,
    niche: nicheOf(src.niche),
    answers,
    created,
    /** تفعيلات الخطة: تُسجَّل، ولا بوابة دفع في هذه النسخة لتؤكدها */
    activations: (Array.isArray(src.activations) ? src.activations : [])
      .filter((a) => a && typeof a === 'object')
      .map((a) => ({ plan: planOf(a.plan), at: str(a.at, 32), method: str(a.method, 24) || 'recorded' }))
      .filter((a) => a.plan !== 'free'),
  }
}

/**
 * هل يُسمح بإنشاء قالبٍ آخر؟ هذه هي بوابة Freemium كلها في دالة واحدة —
 * الواجهة تُظهر الخطة حين تُعيد `allowed: false`، والخادم يرفض بالرقم نفسه.
 *
 * `at` تُمرَّر في الفحص لتثبيت التاريخ.
 */
export function canCreate(account, { at = new Date() } = {}) {
  const rec = sanitizeAccount(account || {})
  const ent = entitlements(rec.plan)
  const used = rec.created.length
  const max = ent.maxTemplates
  const month = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`
  return {
    allowed: max == null ? true : used < max,
    used,
    max,
    month,
    planId: rec.plan,
    paid: ent.paid,
    /** سببٌ مقروء من الجدول: يُعرض كما هو، فلا تُكتب رسالة يدويًا في كل صفحة */
    reason: max == null ? null : used < max ? null : 'limit',
  }
}

/**
 * ما يفتحه الحساب اليوم، في كائن واحد للواجهة: الخطط والمصفوفة تسأل هذا،
 * فلا تُعاد قراءة `plan` من ست صفحات.
 */
export function accountState(account) {
  const rec = sanitizeAccount(account || {})
  const gate = canCreate(rec)
  const ent = entitlements(rec.plan)
  return {
    signedIn: !!rec.email,
    email: rec.email,
    planId: rec.plan,
    paid: ent.paid,
    ...ent,
    templates: { used: gate.used, max: gate.max, left: gate.max == null ? null : Math.max(0, gate.max - gate.used) },
    canCreate: gate.allowed,
    created: rec.created,
    consent: rec.consent,
    niche: rec.niche,
    answers: rec.answers,
    activations: rec.activations,
  }
}

/**
 * سطرُ الإقرار الذي يُعرض في التسجيل، بنسخته — تُختم في السجلّ فلا يُقال
 * «وافق» على نصٍّ لم يُعرض. النص نفسه في القاموس (`account.consent`) لأن
 * القاموس هو مكان الكلام في هذا المستودع.
 */
export const CONSENT_VERSION = '1'

/**
 * هل يملك الحساب ما يكفي لتوليد قالب؟ الاسم وحده كافٍ (بقية الحقول اختيارية)،
 * والمجال مطلوب لأن القالب يُختار منه — ولا نخمّن مجالًا لم يُقل.
 */
export function readyToGenerate(account) {
  const rec = sanitizeAccount(account || {})
  const missing = []
  if (!rec.email) missing.push('email')
  if (!rec.niche) missing.push('niche')
  if (!rec.answers.name) missing.push('name')
  if (!rec.answers.role) missing.push('role')
  if (!rec.consent) missing.push('consent')
  return { ok: missing.length === 0, missing }
}

/** ملخّصٌ يُطبع في صفحة الحساب: ما كُتب فعلًا وما تُرك فارغًا */
export function answerSummary(account) {
  const a = sanitizeAccount(account || {}).answers
  return {
    filled: ['name', 'role', 'services', 'works'].filter((k) => a[k]),
    colours: a.colours.length,
    links: a.links.length,
    empty: ['name', 'role', 'services', 'works'].filter((k) => !a[k]),
  }
}

export default { NICHES, QUESTIONS, ACCOUNT_LIMITS, sanitizeAccount, sanitizeAnswers, canCreate, accountState }
