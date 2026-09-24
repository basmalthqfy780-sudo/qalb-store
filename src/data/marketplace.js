/**
 * سوق المصممين — العمولة، التقسيم، التأمين، والترخيص.
 *
 * القواعد كما أُعلنت، وكلُّ رقمٍ هنا مصدره الوحيد (تقرأه الواجهة والخادم):
 *   • عمولة المنصة 25% (المدى المعلَن 20–30%).
 *   • رسوم معالجة الدفع **يخصمها مزوّد الدفع** (Stripe · Tap · Moyasar) لا نحن؛
 *     نعرض تقديرًا معلَن النسبة وموسومًا بأنه تقدير، فلا يُحسب في صافي البائع
 *     على أنه مبلغٌ نقبضه.
 *   • حدٌّ أدنى للسحب 100 ريال.
 *   • تأمين المبلغ 14 يومًا بعد البيع (المدى المعلَن 7–14) لتقليل الاسترجاع.
 *   • ترخيصٌ صريح: لا إعادة بيع، لا مشاركة، لا مشاريع متعددة بلا ترخيص.
 *
 * وما لا يفعله هذا الملف: لا يقبض مالًا. لا بوابة دفع موصولة في هذه النسخة،
 * فالبيع **يُسجَّل** في الدفتر بتاريخه ويُحسب تقسيمه، وتبقى قبضته الحقيقية
 * على بوابة الدفع حين تُوصل — وهذا مكتوب في الواجهة كما هو هنا.
 */
import { entitlements } from './plans.js'

export const CURRENCY = 'SAR'

/** العمولة: 25% — داخل المدى المعلَن 20–30% */
export const COMMISSION = 0.25
export const COMMISSION_RANGE = [0.2, 0.3]

/** الحد الأدنى للسحب */
export const MIN_PAYOUT = 100

/** أيام التأمين بعد البيع: 14 — داخل المدى المعلَن 7–14 */
export const ESCROW_DAYS = 14
export const ESCROW_RANGE = [7, 14]

/** حدود السعر المقبول لقالبٍ في السوق — أدناه لا يغطّي عمولةً ولا فحصًا */
export const PRICE_MIN = 29
export const PRICE_MAX = 2000

/**
 * تقدير رسوم المعالجة. **تقدير** لا قبض: النسبة من مزوّد الدفع، ونحن نعرضها
 * ليرى البائع رقمًا قريبًا من الواقع قبل أن يبيع. `labelled` يمنع قراءتها
 * على أنها خصمٌ منّا.
 */
export const PROCESSING_ESTIMATE = { pct: 0.029, flat: 1, labelled: true }

/** مزوّدو الدفع الذين ستُخصم منهم الرسوم حين تُوصل بوابة */
export const PROVIDERS = ['Stripe', 'Tap', 'Moyasar']

/** حالات الإدراج — تُشتق من نتيجة الفحص الآلي ومن البلاغات، لا من مزاج موظف */
export const STATES = ['draft', 'published', 'quarantined', 'rejected', 'frozen', 'delisted']
export const stateOf = (v) => (STATES.includes(v) ? v : 'draft')
/** ما يُرى في السوق: المنشور وحده */
export const isVisible = (v) => stateOf(v) === 'published'

/**
 * عدد بلاغات حقوق الملكية التي تُجمّد الإدراج فورًا. ثلاثة لا واحد:
 * بلاغٌ واحد قد يكون كيدًا، والثالث نمط.
 */
export const REPORT_FREEZE = 3

/**
 * تقسيم السعر — يُحسب **قبل** إتمام البيع ويُعرض للبائع، كما ينصّ النموذج:
 * «صافي البائع يظهر قبل إتمام البيع».
 *
 * الأرقام تُقرَّب إلى هللتين، ومجموع العمولة والصافي يساوي السعر تمامًا
 * (الفحص يتحقق من ذلك بمئة سعر مختلف، فلا ينشأ فرق هللة ضائع).
 */
export function split(price, rate = COMMISSION) {
  const p = Math.round((Number(price) || 0) * 100) / 100
  const r = Number.isFinite(Number(rate)) ? Math.min(Math.max(Number(rate), 0), 1) : COMMISSION
  const commission = Math.round(p * r * 100) / 100
  const sellerNet = Math.round((p - commission) * 100) / 100
  return {
    price: p,
    rate: r,
    commission,
    /** ما يبقى للمنصة بعد العمولة — هو العمولة نفسها، ويُسمّى كذلك لا «ربحًا صافيًا» */
    platformGross: commission,
    sellerNet,
    processing: processingEstimate(p),
    /** ما يصل البائع فعلًا بعد رسوم المزوّد التقديرية — تقديرٌ موسوم */
    sellerAfterFeesEstimate: Math.max(0, Math.round((sellerNet - processingEstimate(p).estimate) * 100) / 100),
  }
}

/** تقدير رسوم المزوّد: `{ pct, flat, estimate, labelled: true }` */
export function processingEstimate(price) {
  const p = Math.round((Number(price) || 0) * 100) / 100
  const estimate = Math.round((p * PROCESSING_ESTIMATE.pct + PROCESSING_ESTIMATE.flat) * 100) / 100
  return { ...PROCESSING_ESTIMATE, on: p, estimate, labelled: PROCESSING_ESTIMATE.labelled }
}

/** هل السعر مقبول؟ — يُرفض قبل الفحص لا بعده */
export function priceOk(price) {
  const p = Number(price)
  return Number.isFinite(p) && p >= PRICE_MIN && p <= PRICE_MAX
}

/**
 * تاريخ الإفراج عن مبلغ بيع: بعد `ESCROW_DAYS` يومًا من تاريخ البيع.
 * `at` تُمرَّر في الفحص لتثبيت الحساب.
 */
export function releaseDate(soldAt, at = new Date()) {
  const from = soldAt instanceof Date ? soldAt : new Date(String(soldAt || at.toISOString()))
  const base = Number.isNaN(from.getTime()) ? at : from
  const d = new Date(base.getTime() + ESCROW_DAYS * 86_400_000)
  return d.toISOString().slice(0, 10)
}

/** هل تحرّر مبلغ هذا البيع؟ */
export function isReleased(sale, at = new Date()) {
  return releaseDate(sale?.soldAt, at) <= at.toISOString().slice(0, 10)
}

/**
 * حالة المستحقات: ما تحرّر (يُطلب سحبه) وما زال مؤمَّنًا (يُنتظر).
 * تُعيد أيضًا `missing`: كم ينقص ليبلغ الحد الأدنى — فيُقال للبائع رقمٌ لا وعد.
 */
export function payoutState(sales = [], at = new Date()) {
  const list = (Array.isArray(sales) ? sales : []).filter((s) => s && Number.isFinite(Number(s.price)))
  const released = []
  const held = []
  for (const s of list) (isReleased(s, at) ? released : held).push(s)
  const sum = (xs) => Math.round(xs.reduce((a, s) => a + split(s.price).sellerNet, 0) * 100) / 100
  const releasedTotal = sum(released)
  const heldTotal = sum(held)
  return {
    released,
    held,
    releasedTotal,
    heldTotal,
    min: MIN_PAYOUT,
    eligible: releasedTotal >= MIN_PAYOUT,
    /** كم ينقص للحد الأدنى — صفرٌ إن بلغه */
    missing: releasedTotal >= MIN_PAYOUT ? 0 : Math.round((MIN_PAYOUT - releasedTotal) * 100) / 100,
    escrowDays: ESCROW_DAYS,
    at: at.toISOString().slice(0, 10),
  }
}

/**
 * الترخيص الذي يقبله البائع ويصل المشتري. `rules` مفاتيح تُترجم في القاموس
 * (namespace `market.licence`) — فلا نصّ قانوني منسوخ في الكود.
 */
export const LICENCE = {
  id: 'qalb-market-v1',
  seats: 1,
  rules: ['noResale', 'noSharing', 'noMultiProject', 'attribution', 'updates', 'refund'],
  /** ما يُسقطه قبول الترخيص على الطلب: نسخة النص وتاريخه */
  stamp: (email, at = new Date()) => ({ licence: LICENCE.id, buyer: String(email || '').toLowerCase(), at: at.toISOString().slice(0, 10) }),
}

/**
 * هل يبيع هذا الحساب؟ البيع خلف اشتراك (أي خطة مدفوعة) — لأن السوق يفتح
 * بعد الاشتراكات لا قبلها، والفحص الآلي شرطٌ ثانٍ بعده.
 */
export function canSell(accountOrPlan) {
  const plan = typeof accountOrPlan === 'string' ? accountOrPlan : accountOrPlan?.plan
  return entitlements(plan).sell
}

/** سببُ المنع مقروءًا: يُعرض بدل زرٍّ معطّل بلا شرح */
export function sellBlock(accountOrPlan) {
  if (canSell(accountOrPlan)) return null
  return 'plan'
}

/**
 * تنقية مسوّدة إدراج. الخادم يمرّ عليها قبل الفحص الآلي، فلا يدخل خطَّ
 * الأنابيب إدراجٌ بحقلٍ مكسور — الفحص يقيس المحتوى لا صحة الشكل.
 */
export const LISTING_LIMITS = { title: 70, desc: 600, seller: 60, tags: 120 }

export const CATEGORIES = ['portfolio', 'cv', 'bundle', 'kit']
export const categoryOf = (v) => (CATEGORIES.includes(v) ? v : 'portfolio')

/** سطرٌ واحد بلا محارف تحكّم — تُصفّى بالشفرة لا بنمط (كما في بقية المستودع) */
const str = (v, max) =>
  (
    Array.from(String(v == null ? '' : v), (c) => {
      const n = c.charCodeAt(0)
      return n < 32 || n === 127 ? ' ' : c
    })
      .join('')
      .replace(/\s+/g, ' ')
      .trim() || ''
  ).slice(0, max)

export function sanitizeListing(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const price = Math.round((Number(src.price) || 0) * 100) / 100
  const tags = (Array.isArray(src.tags) ? src.tags : String(src.tags || '').split(/[,\s]+/))
    .map((x) => str(x, 24))
    .filter(Boolean)
    .slice(0, 6)
  return {
    title: str(src.title, LISTING_LIMITS.title),
    desc: str(src.desc, LISTING_LIMITS.desc),
    category: categoryOf(src.category),
    seller: str(src.seller, LISTING_LIMITS.seller),
    price: priceOk(price) ? price : null,
    tags,
    /** ملفاتٌ نصية يفحصها الخط (الاسم + المحتوى) — لا أرشيفات تُفكّ على الخادم */
    files: (Array.isArray(src.files) ? src.files : [])
      .filter((f) => f && typeof f === 'object')
      .map((f) => ({ path: str(f.path, 120), body: typeof f.body === 'string' ? f.body.slice(0, 200_000) : '' }))
      .filter((f) => f.path)
      .slice(0, 80),
    /** بصمات الصور: يُحسب في المتصفح (src/data/phash.js) ويُرسَل نصًّا */
    images: (Array.isArray(src.images) ? src.images : [])
      .filter((i) => i && typeof i === 'object')
      .map((i) => ({ name: str(i.name, 80), phash: str(i.phash, 32), bytes: str(i.bytes, 64), algo: str(i.algo, 16), source: str(i.source, 16) }))
      .slice(0, 24),
    /** إقرار البائع بحقوق الأصول — شرطٌ لا يمرّ بدونه */
    rights: src.rights === true,
  }
}

/** هل الإدراج صالح ليُفحص؟ — ناقصٌ يُعاد سببه، فلا يُهدر فحص على مسوّدة */
export function listingErrors(l) {
  const e = {}
  if (!l.title || l.title.length < 6) e.title = 'title'
  if (!l.desc || l.desc.length < 40) e.desc = 'desc'
  if (l.price == null) e.price = 'price'
  if (!l.files.length) e.files = 'files'
  if (!l.rights) e.rights = 'rights'
  return e
}

/**
 * أثر البلاغات: بلاغات حقوق الملكية تُجمّد الإدراج عند `REPORT_FREEZE`.
 * لا تحذف شيئًا ولا تحكم — التجميد إجراءٌ احترازي والتظلّم مفتوح.
 */
export function applyReports(reports = []) {
  const list = (Array.isArray(reports) ? reports : []).filter((r) => r && r.kind)
  const rights = list.filter((r) => r.kind === 'rights').length
  const other = list.length - rights
  return {
    total: list.length,
    rights,
    other,
    frozen: rights >= REPORT_FREEZE,
    threshold: REPORT_FREEZE,
  }
}

/** حالات التظلّم */
export const APPEAL_STATES = ['none', 'open', 'upheld', 'dismissed']
export const appealStateOf = (v) => (APPEAL_STATES.includes(v) ? v : 'none')

export default { COMMISSION, MIN_PAYOUT, ESCROW_DAYS, split, payoutState, canSell, sanitizeListing }
