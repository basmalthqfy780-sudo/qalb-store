/**
 * نموذج الربح — جدول الخطط ومصفوفة القيمة.
 *
 * الفكرةُ التي بُني عليها الجدول: لا تُباع «قوالب بلا حدود مجانًا» لأن ذلك يقتل
 * قيمة القالب، بل تُوزَّع القيمة: القالبُ الأول كاملٌ مجانًا ليقتنع المستخدم،
 * وما بعده (قالبٌ ثانٍ، نشرٌ احترافي، تصديرٌ بلا علامة، بيعٌ للآخرين) خلف اشتراك.
 *
 * ثلاثةُ مبادئَ تحكم هذا الملف، وهي نفسها التي تحكم بقية المستودع:
 *
 *   1. **رقمٌ واحد لكل سعر.** الخطط هنا، وما يتقاطع معها من إضافاتٍ موجودة
 *      (`pro-month`، `deploy-setup` في src/data/upsells.js) يُقرأ سعره من جدوله
 *      الأصلي ولا يُنسخ — فلا يختلف سعرٌ بين صفحتين.
 *   2. **كلُّ صفٍّ في مصفوفة القيمة يُنفَّذ في كود.** كلُّ وعدٍ في `FEATURE_MATRIX`
 *      يحمل `enforcedBy` يشير إلى الوحدة والدالة التي تُحقّقه فعلًا، والفحص في
 *      tests/smoke.mjs يرفض صفًّا يشير إلى دالةٍ غير موجودة. الوعدُ بلا منفِّذ
 *      هو ما أسقط جولاتٍ سابقة، فلا يتكرّر هنا.
 *   3. **الأسعار شاملة الضريبة** (معدّل src/data/tax.js)، كبقية المتجر.
 *
 * ما لا يفعله هذا الملف: لا يُفعّل اشتراكًا ولا يمسك مالًا. لا بوابة دفع موصولة
 * في هذه النسخة — التفعيل يُسجَّل (محليًا أو في دفتر الخادم) ويُفعَّله الموظف،
 * تمامًا كما تُرقّى خطة الاستضافة في server/sites.js لا من المتصفح.
 */
import { upsellById } from './upsells.js'
import { VAT } from './tax.js'

export const CURRENCY = 'SAR'
export { VAT }

/**
 * الخطط الثلاث. `templates: null` تعني «بلا سقف» لا «صفر» — والفرق يظهر في
 * `entitlements()` وفي الواجهة («قوالب غير محدودة» بدل رقم).
 *
 * المدى السعري الذي اختير منه كل رقم (مكتوب هنا لا في الذاكرة، فتُراجع الأرقام
 * أمامه): الخطة الفردية 19–79 شهريًا، وPro ‏199–249 شهريًا، والباقة لمرة واحدة
 * 249–499، وخدمة «أنشرها لك» 299–799.
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
    name: { ar: 'القالب الأول', en: 'The first template' },
    tagline: {
      ar: 'قالبك الأول كاملًا، ومعاينة حية، وسيرة PDF بعلامة مائية',
      en: 'Your first template in full, a live preview, and a watermarked PDF',
    },
    cta: { ar: 'ابدأ مجانًا', en: 'Start free' },
    bullets: {
      ar: [
        'إنشاء حساب بالبريد — بريدٌ واحد، بلا كلمة سر في هذه النسخة',
        'قالبٌ واحد تُنشئه وتعدّل نصوصه وبياناته بالكامل',
        'معاينة حية على نطاق فرعي `اسمك.qalb.store`',
        'تحميل السيرة PDF بعلامة «نسخة مجانية»',
        'لا نشرٌ على Vercel ولا تصدير ملفات ولا بيع',
      ],
      en: [
        'Sign up with an e-mail — one address, no password in this build',
        'One template you build and edit in full',
        'A live preview on a `yourname.qalb.store` subdomain',
        'A résumé PDF carrying a “free copy” watermark',
        'No Vercel deploy, no file export, no selling',
      ],
    },
  },
  {
    id: 'solo',
    order: 1,
    price: 49, // ضمن المدى 19–79
    period: 'month',
    yearly: 399, // ≈ ثمانية أشهر بسعر سنة
    templates: 3,
    watermark: false,
    publish: true,
    exportSite: false,
    badge: true,
    domain: false,
    sell: true,
    ats: false,
    support: { ar: 'دعمٌ بالبريد خلال يومي عمل', en: 'E-mail support within two working days' },
    name: { ar: 'فردية', en: 'Solo' },
    tagline: {
      ar: 'ثلاثة قوالب، سيرة بلا علامة مائية، ونشرٌ مباشر على نطاقك الفرعي',
      en: 'Three templates, an unwatermarked résumé, and direct publishing on your subdomain',
    },
    cta: { ar: 'فعّل الفردية', en: 'Activate Solo' },
    bullets: {
      ar: [
        'حتى ثلاثة قوالب — القالب الثاني والثالث مفتوحان',
        'تعديلٌ كامل لكل قوالبك، لا للأول وحده',
        'تحميل السيرة PDF بلا علامة مائية',
        'نشرٌ مباشر على `اسمك.qalb.store`',
        'بيع قوالبك في سوق المصممين بعد الفحص الآلي',
        'دعمٌ بالبريد',
      ],
      en: [
        'Up to three templates — the second and third unlocked',
        'Full editing on every template, not just the first',
        'A résumé PDF with no watermark',
        'Direct publishing on `yourname.qalb.store`',
        'Sell your templates in the designer market after the automated check',
        'E-mail support',
      ],
    },
  },
  {
    id: 'pro',
    order: 2,
    price: 199, // ضمن المدى 199–249
    period: 'month',
    yearly: 1799, // ≈ تسعة أشهر بسعر سنة
    templates: null,
    watermark: false,
    publish: true,
    exportSite: true,
    badge: false,
    domain: true,
    sell: true,
    ats: true,
    support: { ar: 'أولوية الدعم — ردٌّ خلال ساعات العمل', en: 'Priority support — a reply within working hours' },
    name: { ar: 'Pro', en: 'Pro' },
    tagline: {
      ar: 'قوالب غير محدودة، نطاقك الخاص، بلا شعارنا، وتصدير ملفات الموقع',
      en: 'Unlimited templates, your own domain, no badge of ours, and a site-file export',
    },
    cta: { ar: 'فعّل Pro', en: 'Activate Pro' },
    bullets: {
      ar: [
        'قوالب غير محدودة — لا سقف على ما تُنشئه',
        'نطاقك الخاص يُربط بموقعك',
        'إزالة شعار «صُنع بقالب» من الموقع والسيرة',
        'تصدير ملفات الموقع كاملةً (ZIP) لاستضافتها أينما شئت',
        'سيرة ATS محسّنة — نفس محرّك الفحص الذي يقيس قوالبنا',
        'أولوية الدعم',
      ],
      en: [
        'Unlimited templates — no ceiling on what you build',
        'Your own domain, pointed at your site',
        'The “made with Qalb” badge taken off your site and résumé',
        'A full site-file export (ZIP) to host anywhere',
        'An ATS-optimised résumé — the same engine that scores our own templates',
        'Priority support',
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
 * اشتراك Qalb Pro القديم (كل قوالب المتجر الجاهزة) يبقى منتجًا قائمًا بسعره؛
 * يُقرأ سعره من جدول الإضافات ولا يُنسخ هنا، فتُعرض الخطتان جنبًا إلى جنب
 * بلا رقمين مختلفين لنفس الشيء.
 */
export const storePro = () => upsellById('pro-month')
export const storeProYear = () => upsellById('pro-year')

/**
 * خدمة «أنشرها لك». درجتان، كلٌّ منهما من جدولها:
 *   • الخفيفة (`deploy-setup`) — تركيب Vercel والنطاق، سعرها من src/data/upsells.js.
 *   • الكاملة (`publish-done`) — إعداد المحتوى + النطاق + النشر + SEO أساسي.
 * ضمن المدى المعلَن 299–799 للخدمة الكاملة.
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
 * باقة لمرة واحدة: قالبٌ محدد + ترخيص استخدام شخصي + ملفات المصدر + تحديثات سنة.
 * ضمن المدى المعلَن 249–499. تُعرض بجانب الاشتراك لمن يكره الاشتراكات.
 */
export const ONE_TIME = {
  id: 'one-time-pack',
  price: 349,
  updatesMonths: 12,
  name: { ar: 'باقة لمرة واحدة', en: 'A one-time pack' },
  tagline: {
    ar: 'قالبٌ محدد، ترخيص شخصي، ملفات المصدر، وتحديثات سنة',
    en: 'One template, a personal licence, the source files, and a year of updates',
  },
  bullets: {
    ar: [
      'قالبٌ واحد تختاره من الكتالوج — ملكك مدى الحياة',
      'ترخيص استخدام شخصي (مقعد واحد) باسمك',
      'ملفات المصدر كاملة: HTML/CSS و`content/profile.json`',
      'تحديثات القالب لمدة سنة من تاريخ الشراء',
      'بلا اشتراك وبلا تجديد',
    ],
    en: [
      'One template from the catalogue — yours for life',
      'A personal (single-seat) licence in your name',
      'The full source files: HTML/CSS and `content/profile.json`',
      'Twelve months of that template’s updates from the purchase date',
      'No subscription, no renewal',
    ],
  },
}

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
    paid: { state: 'yes', note: { ar: 'قوالب متعددة بالاشتراك', en: 'Multiple templates on a plan' } },
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
    label: { ar: 'نشر مباشر على Vercel أو Netlify', en: 'Direct deploy to Vercel or Netlify' },
    free: { state: 'no' },
    paid: { state: 'yes' },
    enforcedBy: 'src/data/plans.js:canPublish',
  },
  {
    id: 'badge',
    label: { ar: 'إزالة شعار «صُنع بقالب»', en: 'Removing the “made with Qalb” badge' },
    free: { state: 'no' },
    paid: { state: 'yes', note: { ar: 'في خطة Pro', en: 'On the Pro plan' } },
    enforcedBy: 'src/data/hosting.js:brandBar',
  },
  {
    id: 'domain',
    label: { ar: 'ربط نطاق خاص', en: 'Connecting a custom domain' },
    free: { state: 'no' },
    paid: { state: 'yes', note: { ar: 'ميزة مدفوعة في Pro', en: 'A paid feature on Pro' } },
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
/** إزالة الشارة: Pro وحدها (أو إضافة `badge-off` المشتراة — انظر src/data/badge.js) */
export const badgeOff = (planId) => entitlements(planId).badge === false

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
  const css = `.qalb-wm{position:fixed;inset:0;z-index:9998;pointer-events:none;display:grid;place-content:center;
    transform:rotate(-28deg);font:800 clamp(2rem,9vw,6rem)/1 system-ui;color:#7c8698;opacity:.16;white-space:nowrap;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}`
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
    // `watermark` و`badge`: القيمة `false` هي الأفضل، فتنعقد المقارنة
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
