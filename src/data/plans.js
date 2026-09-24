/**
 * نموذج الربح — جدول اشتراكات واحد متدرّج.
 *
 * بعد جولة التوحيد (v1.8.0) لم يبقَ في المتجر سعرَان لنفس الشيء: لا باقةٌ تُشترى
 * مرة واحدة، ولا جدولُ اشتراكاتٍ قديمٌ يناقض غيره. الجدول هنا وحده هو المصدر:
 * ثلاثُ درجاتٍ متتالية، كلٌّ منها تفتح ما فوقها ولا تُغلق ما تحته.
 *
 *   • مجانية ‎0‎ — قالبٌ واحدٌ للتجربة، معاينةٌ حيّة، وتصدير PDF بعلامة مائية.
 *   • Qalb Plus ‎19‎ شهريًا / ‎100‎ سنويًا — ثلاثةُ قوالب، نشرٌ على رابط فرعي،
 *     PDF نظيف، بلا شعار المنصة، وأداة المطابقة.
 *   • Qalb Pro ‎49‎ شهريًا / ‎299‎ سنويًا — كلُّ القوالب بلا سقف، نطاقٌ خاص،
 *     تصديرُ ملفات المصدر، وأولويةُ الدعم.
 *
 * ثلاثةُ مبادئَ تحكم هذا الملف، وهي نفسها التي تحكم بقية المستودع:
 *
 *   1. **رقمٌ واحد لكل سعر.** ما يتقاطع مع هذه الدرجات من الإضافات يُقرأ سعره
 *      من جدوله الأصلي (`pro-month` و`pro-year` في src/data/upsells.js يحملان
 *      سعرَي Pro نفسيهما) — فلا يختلف رقمٌ بين صفحتين.
 *   2. **كلُّ صفٍّ في مصفوفة القيمة يُنفَّذ في كود.** كلُّ وعدٍ في `FEATURE_MATRIX`
 *      يحمل `enforcedBy` يشير إلى الوحدة والدالة التي تُحقّقه فعلًا، والفحص في
 *      tests/smoke.mjs يرفض صفًّا يشير إلى دالةٍ غير موجودة.
 *   3. **الأسعار شاملة الضريبة** (معدّل src/data/tax.js)، كبقية المتجر.
 *
 * ما لا يفعله هذا الملف: لا يُفعّل اشتراكًا ولا يمسك مالًا. لا بوابة دفع موصولة
 * في هذه النسخة — التفعيل يُسجَّل (محليًا أو في دفتر الخادم) ويُفعّله الموظف،
 * تمامًا كما تُرقّى خطة الاستضافة في server/sites.js لا من المتصفح.
 */
import { upsellById } from './upsells.js'
import { VAT } from './tax.js'

export const CURRENCY = 'SAR'
export { VAT }

/**
 * الدرجات الثلاث. `templates: null` تعني «بلا سقف» لا «صفر» — والفرق يظهر في
 * `entitlements()` وفي الواجهة («قوالب غير محدودة» بدل رقم).
 *
 * المدى السعري المعلَن (مكتوب هنا لا في الذاكرة، فتُراجع الأرقام أمامه):
 * الدرجة الفردية ‎19‎، والاحترافية ‎49‎، وسنةُ الأولى ‎100‎ وسنةُ الثانية ‎299‎.
 * ولا شيء فوق ‎49‎ في الاشتراك: ما فوقها خدماتٌ تُشترى مرةً واحدة من جدول
 * src/data/upsells.js لا درجاتٌ في الاشتراك.
 */
export const PLANS = [
  {
    id: 'free',
    order: 0,
    price: 0,
    period: null,
    yearly: 0,
    /** سقف القوالب: واحد. القالب الأول كامل، والثاني هو الذي يُقابل بالاشتراك */
    templates: 1,
    watermark: true,
    publish: false,
    exportSite: false,
    badge: true,
    domain: false,
    sell: false,
    ats: false,
    support: { ar: 'الوثائق والأسئلة الشائعة', en: 'Docs and the FAQ' },
    name: { ar: 'الباقة المجانية', en: 'Free' },
    tagline: {
      ar: 'جرّب قالبًا واحدًا كاملًا، بمعاينة حية وتصدير PDF بعلامة مائية',
      en: 'One template to try in full, with a live preview and a watermarked PDF',
    },
    cta: { ar: 'ابدأ مجانًا', en: 'Start free' },
    bullets: {
      ar: ['تجربة واستخدام قالب مجاني واحد.', 'معاينة حية متكاملة للموقع والسيرة.', 'تصدير PDF بعلامة مائية.'],
      en: ['One free template to try and use.', 'A full live preview of the site and the résumé.', 'A PDF export carrying a watermark.'],
    },
  },
  {
    id: 'plus',
    order: 1,
    price: 19, // الدرجة الفردية المعلنة
    period: 'month',
    yearly: 100, // سنةٌ بسعر نحو خمسة أشهر (١٩ × ٥ = ٩٥، والسنة أرخص من التجديد الشهري)
    templates: 3,
    watermark: false,
    publish: true,
    exportSite: false,
    badge: false,
    domain: false,
    sell: false,
    ats: true,
    support: { ar: 'دعمٌ بالبريد خلال يومي عمل', en: 'E-mail support within two working days' },
    name: { ar: 'Qalb Plus', en: 'Qalb Plus' },
    tagline: {
      ar: 'ثلاثة قوالب، نشرٌ على رابطك الفرعي، وسيرةٌ بلا علامة مائية',
      en: 'Three templates, publishing on your own subdomain, and a clean résumé',
    },
    cta: { ar: 'فعّل Plus', en: 'Activate Plus' },
    bullets: {
      ar: [
        'فتح حتى 3 قوالب مختلفة.',
        'نشر مباشر على رابط فرعي (name.qalb.store).',
        'تصدير PDF نظيف وبلا علامة مائية.',
        'إزالة شعار المنصة وتفعيل أداة المطابقة.',
      ],
      en: [
        'Up to three different templates.',
        'Direct publishing on a subdomain (name.qalb.store).',
        'A clean PDF export with no watermark.',
        'Our logo taken off, and the matching tool switched on.',
      ],
    },
  },
  {
    id: 'pro',
    order: 2,
    price: 49, // الدرجة الاحترافية المعلنة
    period: 'month',
    yearly: 299, // سنةٌ بسعر ستة أشهر (٤٩ × ٦ = ٢٩٤، والسنة أرخص من التجديد الشهري)
    templates: null, // بلا سقف
    watermark: false,
    publish: true,
    exportSite: true,
    badge: false,
    domain: true,
    sell: true,
    ats: true,
    support: { ar: 'أولوية الدعم — ردٌّ خلال ساعات العمل', en: 'Priority support — a reply within working hours' },
    name: { ar: 'Qalb Pro', en: 'Qalb Pro' },
    tagline: {
      ar: 'كل القوالب بلا حدود، نطاقك الخاص، وملفات المصدر كاملة',
      en: 'Every template with no ceiling, your own domain, and the full source files',
    },
    cta: { ar: 'فعّل Pro', en: 'Activate Pro' },
    bullets: {
      ar: [
        'استخدام واستعراض جميع القوالب بلا حدود.',
        'ربط نطاق خاص مخصص (Custom Domain).',
        'تصدير كافة ملفات المصدر بالكامل.',
        'أولوية الدعم الفني وتحديثات مستمرة.',
      ],
      en: [
        'Every template, used and browsed with no ceiling.',
        'A custom domain of your own (Custom Domain).',
        'An export of all the source files, complete.',
        'Priority support and continuous updates.',
      ],
    },
  },
]

/** التدرّج من الأضعف: تُقارَن به خطةٌ بخطة (هل هذه أعلى من تلك؟) */
export const PLAN_ORDER = Object.fromEntries(PLANS.map((p) => [p.id, p.order]))

export const planIds = () => PLANS.map((p) => p.id)
export const planById = (id) => PLANS.find((p) => p.id === id) || null
/** خطةٌ مجهولة تسقط إلى المجانية — لا «أعلى خطة افتراضًا» */
export const planOf = (v) => (planById(v) ? v : 'free')
export const priceOf = (id) => planById(planOf(id))?.price ?? 0

/**
 * اشتراك Qalb Pro نفسه كما يُشترى من جدول الإضافات (السلة): سعره مقروءٌ من هناك
 * لا منسوخٌ هنا، فتُعرض الدرجاتُ في /pricing والسلةُ تحسب الرقم نفسه.
 */
export const storePro = () => upsellById('pro-month')
export const storeProYear = () => upsellById('pro-year')

/**
 * خدمة «أنشرها لك» — خدمةٌ once-one لا درجةٌ في الاشتراك: درجتان، كلٌّ منهما من
 * جدولها (src/data/upsells.js):
 *   • الخفيفة (`deploy-setup`) — تركيب Vercel والنطاق.
 *   • الكاملة (`publish-done`) — إعداد المحتوى + النطاق + النشر + SEO أساسي.
 */
export const PUBLISH_DONE = {
  id: 'publish-done',
  price: 499,
  hours: 168, // مهلة التسليم بالساعات: أسبوع
  name: { ar: '«أنشرها لك» — كاملة', en: '“We publish it for you” — full' },
  tagline: {
    ar: 'إعداد المحتوى، ربط النطاق، النشر، وSEO أساسي',
    en: 'Content setup, domain wiring, the launch, and basic SEO',
  },
  bullets: {
    ar: [
      'نُعدّ محتوى موقعك من إجاباتك: النصوص، الأقسام، روابط الأعمال',
      'نربط نطاقك ونضبط SSL والتحويلات وصفحة 404',
      'ننشر الموقع ونسلّمك رابطه حيًّا',
      'SEO أساسي: العنوان والوصف و`sitemap.xml` و`robots.txt` وبيانات JSON-LD',
    ],
    en: [
      'We build your site content from your answers: copy, sections, work links',
      'We connect your domain and set SSL, redirects and the 404 page',
      'We publish it and hand you the live URL',
      'Basic SEO: title, description, `sitemap.xml`, `robots.txt`, JSON-LD',
    ],
  },
}
export const publishLight = () => upsellById('deploy-setup')

/**
 * مصفوفة توزيع القيمة — الصفوف العشرة كما هي في نموذج الربح، بلا زيادة ولا نقصان.
 * كلُّ صفٍّ يحمل `enforcedBy`: الوحدة والدالة التي تُحقّقه في الكود، والفحص
 * يتأكد أنها موجودة فعلًا. `state` واحدة من: `yes` · `partial` · `no`.
 */
export const FEATURE_MATRIX = [
  {
    id: 'signup',
    label: { ar: 'إنشاء حساب بالبريد', en: 'Sign up with an e-mail' },
    free: { state: 'yes' },
    paid: { state: 'yes' },
    enforcedBy: 'src/data/account.js:sanitizeAccount',
  },
  {
    id: 'preview',
    label: { ar: 'معاينة القالب', en: 'Template preview' },
    free: { state: 'yes' },
    paid: { state: 'yes' },
    enforcedBy: 'src/data/hosting.js:renderSite',
  },
  {
    id: 'edit',
    label: { ar: 'تعديل النصوص والبيانات', en: 'Editing text and data' },
    free: { state: 'partial', note: { ar: 'كامل للقالب الأول', en: 'Full, for the first template' } },
    paid: { state: 'partial', note: { ar: 'كامل لجميع القوالب', en: 'Full, for every template' } },
    enforcedBy: 'src/data/hosting.js:sanitizeSite',
  },
  {
    id: 'pdf',
    label: { ar: 'تحميل سيرة PDF', en: 'Résumé PDF download' },
    free: { state: 'partial', note: { ar: 'بعلامة مائية', en: 'Watermarked' } },
    paid: { state: 'yes', note: { ar: 'بلا علامة مائية', en: 'No watermark' } },
    enforcedBy: 'src/data/plans.js:withWatermark',
  },
  {
    id: 'count',
    label: { ar: 'عدد القوالب المسموحة', en: 'Templates allowed' },
    free: { state: 'partial', note: { ar: 'قالبٌ واحد فقط', en: 'One template only' } },
    paid: { state: 'yes', note: { ar: 'ثلاثةٌ في Plus، وبلا سقف في Pro', en: 'Three on Plus, no ceiling on Pro' } },
    enforcedBy: 'src/data/account.js:canCreate',
  },
  {
    id: 'export',
    label: { ar: 'تصدير ملفات الموقع', en: 'Site-file export' },
    free: { state: 'no' },
    paid: { state: 'yes', note: { ar: 'في خطة Pro', en: 'On the Pro plan' } },
    enforcedBy: 'src/data/plans.js:canExport',
  },
  {
    id: 'deploy',
    label: { ar: 'نشر مباشر على رابط فرعي', en: 'Direct publishing on a subdomain' },
    free: { state: 'no' },
    paid: { state: 'yes' },
    enforcedBy: 'src/data/plans.js:canPublish',
  },
  {
    id: 'badge',
    label: { ar: 'إزالة شعار «صُنع بقالب»', en: 'Removing the “made with Qalb” badge' },
    free: { state: 'no' },
    paid: { state: 'yes', note: { ar: 'من Plus وما فوقها', en: 'From Plus upward' } },
    enforcedBy: 'src/data/hosting.js:brandBar',
  },
  {
    id: 'domain',
    label: { ar: 'ربط نطاق خاص', en: 'Connecting a custom domain' },
    free: { state: 'no' },
    paid: { state: 'yes', note: { ar: 'ميزة Pro وحدها', en: 'A Pro-only feature' } },
    enforcedBy: 'src/data/plans.js:canUseDomain',
  },
  {
    id: 'sell',
    label: { ar: 'بيع القالب للآخرين', en: 'Selling your template to others' },
    free: { state: 'no' },
    paid: { state: 'yes', note: { ar: 'بعد تجاوز الفحص الآلي', en: 'After passing the automated check' } },
    enforcedBy: 'src/data/marketplace.js:canSell',
  },
]

/* ------------------------------------------------------------------ *
 * ما تُترجَم إليه الخطة: سلوكٌ لا كلام. كل دالة هنا تُنادى من الواجهة
 * ومن الخادم، فلا يختلف ما يُعرض عمّا يُسمح به.
 * ------------------------------------------------------------------ */

/**
 * استحقاقات الحساب: تُشتق من خطته وحدها. الواجهة تسأل هذه الدوال بدل أن
 * تقرأ `plan.templates` من كل مكان — فلو تغيّر الجدول تغيّر السلوك كله.
 */
export function entitlements(planId) {
  const p = planById(planOf(planId))
  return {
    planId: p.id,
    plan: p,
    price: p.price,
    period: p.period,
    maxTemplates: p.templates, // null = بلا سقف
    watermark: p.watermark,
    publish: p.publish,
    exportSite: p.exportSite,
    badge: p.badge,
    domain: p.domain,
    sell: p.sell,
    ats: p.ats,
    paid: p.price > 0,
  }
}

/** هل يفتح هذا الصف في المصفوفة لهذه الخطة؟ (يُستعمل لتلوين الجدول وللفحص) */
export function rowState(rowId, planId) {
  const row = FEATURE_MATRIX.find((r) => r.id === rowId)
  if (!row) return null
  const paid = priceOf(planId) > 0
  return paid ? row.paid : row.free
}

/** تصدير ملفات الموقع: Pro وحدها */
export const canExport = (planId) => !!entitlements(planId).exportSite
/** النشر المباشر: أي خطة مدفوعة */
export const canPublish = (planId) => !!entitlements(planId).publish
/** النطاق الخاص: Pro وحدها */
export const canUseDomain = (planId) => !!entitlements(planId).domain
/** إزالة الشارة: Plus وPro (أو إضافة `badge-off` المشتراة — انظر src/data/badge.js) */
export const badgeOff = (planId) => entitlements(planId).badge === false
/** أداة المطابقة: Plus وPro */
export const canMatch = (planId) => !!entitlements(planId).ats

/**
 * العلامة المائية على ورقة السيرة. تُحقن في HTML المُعاد من `renderSite`
 * (مسار `/print`) فتظهر على الشاشة وفي الطباعة/PDF معًا، لأن `@media print`
 * في المستودع تُخفي شريط العلامة لا هذه الطبقة.
 *
 * `on=false` تُعيد النص كما هو — فلا تُبنى سلسلة HTML بلا سبب.
 */
export function withWatermark(html, { on = true, label = '' } = {}) {
  const body = String(html ?? '')
  if (!on || !body) return body
  const text = String(label || '').slice(0, 40)
  const esc = text.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c])
  const css = `.qalb-wm{position:fixed;inset:0;z-index:9998;pointer-events:none;display:grid;place-content:center;\n    transform:rotate(-28deg);font:800 clamp(2rem,9vw,6rem)/1 system-ui;color:#7c8698;opacity:.16;white-space:nowrap;\n    -webkit-print-color-adjust:exact;print-color-adjust:exact}`
  const layer = `<div class="qalb-wm" aria-hidden="true">${esc}</div>`
  return body.includes('</head>')
    ? body.replace('</head>', `<style>${css}</style></head>`).replace('</body>', `${layer}\n</body>`)
    : `${body}${layer}`
}

/**
 * سطرُ مقارنةٍ صادق: «هذه الخطة تفتح ما لا تفتحه تلك» — يُبنى من الجدول،
 * فلا يكتب أحدٌ قائمة ميزات باليد ثم ينسى منها شيئًا.
 */
export function gainedBy(planId, fromId = 'free') {
  const a = entitlements(fromId)
  const b = entitlements(planId)
  const keys = ['watermark', 'publish', 'exportSite', 'badge', 'domain', 'sell', 'ats']
  const out = []
  if (b.maxTemplates !== a.maxTemplates) out.push('templates')
  for (const k of keys) {
    // `watermark` و`badge`: القيمة `false` هي الأفضل، فتنعكس المقارنة
    const better = k === 'watermark' || k === 'badge' ? a[k] && !b[k] : !a[k] && b[k]
    if (better) out.push(k)
  }
  return out
}

/** الأسعار معلنة شاملة الضريبة — يُستخرج نصيب الضريبة للعرض في صفحة الخطط */
export const vatOf = (price) => {
  const n = Number(price) || 0
  return Math.round((n - n / (1 + VAT)) * 100) / 100
}

/** سعر السنة مقابل الأشهر: كم شهرًا يدفعها المشترك فعلًا؟ (يُعرض كما يُحسب) */
export const yearlyAsMonths = (p) => {
  const plan = planById(planOf(p))
  if (!plan || !plan.yearly || !plan.price) return null
  return Math.round((plan.yearly / plan.price) * 10) / 10
}

export default PLANS
