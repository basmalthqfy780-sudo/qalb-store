/**
 * فاحصُ ATS قابلًا للتضمين — نسخةٌ تُباع للجامعات والمعاهد ومكاتب التوظيف ومدرّبي
 * السير: كودُ iframe واحد في صفحتهم، فيعمل الفاحص عندهم كما يعمل عندنا.
 *
 * الحقيقةُ التقنيةُ أولًا، فهي سببُ السعر: الفحصُ كله في متصفحِ الزائر — لا تُرفع
 * سيرةٌ إلى خادم، ولا نستطيع أن نعرف نتائجَ من فحصوا. الذي يُباع إذًا هو «موضعُ
 * الفاحص» ومقعدُ استعمالٍ شهري، لا بياناتِ الطلاب؛ ولهذا يخرج التقريرُ للجامعة
 * بعددِ مرّاتِ التحميل لا بدرجاتِ من فحصوا — لأن الثانية لا نملكها.
 *
 * والاستهلاكُ يُعدّ عندنا: كلُّ تحميلٍ للصفحة المضمّنة يُسجَّل مرة. في هذا المتجر
 * (بلا خادم) يُسجَّل في المتصفح الذي يجرّب الكود، والصفحةُ تقول ذلك صراحةً:
 * عدّادٌ حقيقيٌّ يحتاجُ خادم الطلبات.
 */
import { SITE_URL } from './site.js'

export const EMBED_TIERS = [
  {
    id: 'embed-500',
    checks: 500,
    price: 199,
    period: 'month',
    name: { ar: 'فاحص مضمّن — ٥٠٠ فحص', en: 'Embedded checker — 500 checks' },
    for: { ar: 'مدرّبُ سيرٍ أو مكتبُ توظيفٍ صغير', en: 'A CV coach or a small placement office' },
    includes: {
      ar: [
        'كودُ iframe واحد، بأيِّ لغةٍ وأيِّ اتجاه',
        '٥٠٠ تحميلٍ للفاحص في الشهر',
        'بلا شعارٍ في الإطار، وبلا إعلان',
        'الغاءٌ في أيِّ شهر، بلا تجديدٍ تلقائي',
      ],
      en: [
        'One iframe snippet, any language, either direction',
        '500 checker loads a month',
        'No badge inside the frame, no advertising',
        'Cancel any month — no auto-renewal',
      ],
    },
  },
  {
    id: 'embed-2000',
    checks: 2000,
    price: 499,
    period: 'month',
    best: true,
    name: { ar: 'فاحص مضمّن — ٢٠٠٠ فحص', en: 'Embedded checker — 2,000 checks' },
    for: { ar: 'كليةٌ أو مركزُ مهنةٍ يخدم فوجًا كاملًا', en: 'A college or a career centre serving a whole cohort' },
    includes: {
      ar: [
        '٢٠٠٠ تحميلٍ في الشهر، وأكثرُ من صفحةٍ مضمّنة',
        'نسخةٌ موسومةٌ باسمِ جهتكم في أعلى الإطار',
        'تقريرُ استهلاكٍ شهري نكتبه من العدّاد',
        'سعرُ المقعدِ الجامعي يبقى منفصلًا عن هذا الاشتراك',
      ],
      en: [
        '2,000 loads a month, across more than one embedded page',
        'A frame headed with your institution’s name',
        'A monthly consumption report we write from the counter',
        'University seat pricing stays separate from this subscription',
      ],
    },
  },
  {
    id: 'embed-uni',
    checks: 5000,
    price: null,
    period: 'month',
    uni: true,
    name: { ar: 'الجامعات — سعرٌ خاص', en: 'Universities — special pricing' },
    for: { ar: 'عقدُ جهةٍ واحدة فوق ٢٠٠٠ فحص في الشهر', en: 'One institution’s contract above 2,000 checks a month' },
    includes: {
      ar: [
        'سعرٌ يُحدَّد بعددِ الكليات والأفواج لا بعددٍ ثابت',
        'يُدمج مع مقاعدِ الطلاب في فاتورةٍ واحدة',
        'يُطلب بالبريد: لا زرَّ دفعٍ لرقمٍ لم يُتفق عليه',
      ],
      en: [
        'Priced by colleges and cohorts, not by a fixed count',
        'Combined with student seats on one invoice',
        'Requested by e-mail: no pay button for a figure we have not agreed',
      ],
    },
  },
]

export const embedTier = (id) => EMBED_TIERS.find((t) => t.id === id) || EMBED_TIERS[0]
export const EMBED_KEY = 'qalb.embed.v1'
export const monthKey = (d = new Date()) => String(d.toISOString()).slice(0, 7)

const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)

/**
 * كودُ التضمين: سطران لا يحتاجان مطوّرًا. `embed=1` يُسقط ترويسة المتجر داخل
 * الإطار، و`org` يربط التحميلَ بحسابِ الجهة في العدّاد.
 */
export function embedSnippet({ org = '', theme = 'dark', lang = 'ar', height = 760 } = {}) {
  const name = String(org || '')
    .replace(/[^a-z0-9-_]/gi, '')
    .slice(0, 32)
  const src = `${SITE_URL}/ats?embed=1${name ? `&org=${encodeURIComponent(name)}` : ''}${lang === 'en' ? '&lang=en' : ''}`
  return `<iframe
  src="${src}"
  title="${lang === 'en' ? 'ATS readiness checker' : 'فاحص جاهزية الفرز الآلي'}"
  width="100%" height="${height}"
  loading="lazy"
  style="border:0;border-radius:16px;color-scheme:${theme === 'light' ? 'light' : 'dark'}"
  allow="clipboard-write"
></iframe>`
}

/** العدّاد: تحميلٌ واحد في كلِّ مرة تُفتح فيها الصفحة المضمّنة */
export function recordEmbedHit(org = '') {
  const id =
    String(org || 'demo')
      .replace(/[^a-z0-9-_]/gi, '')
      .slice(0, 32) || 'demo'
  const k = monthKey()
  try {
    const all = JSON.parse(store()?.getItem(EMBED_KEY) || '{}')
    const cur = all[id] || {}
    const next = { ...all, [id]: { ...cur, [k]: (Number(cur[k]) || 0) + 1, last: new Date().toISOString() } }
    store()?.setItem(EMBED_KEY, JSON.stringify(next))
    return next[id][k]
  } catch {
    return 0
  }
}

export function embedUsage(org = '', month = monthKey()) {
  try {
    const all = JSON.parse(store()?.getItem(EMBED_KEY) || '{}')
    const cur = all[String(org || 'demo')] || {}
    return { used: Number(cur[month]) || 0, month, last: cur.last || null }
  } catch {
    return { used: 0, month, last: null }
  }
}

/** الحصةُ كما تُقرأ في الصفحة: ما بقي، وما فوقه يُحسب زيادةً لا يُخفى */
export function embedQuota(tierId, used = 0) {
  const t = embedTier(tierId)
  const left = Math.max(0, t.checks - used)
  return { tier: t, used, left, over: Math.max(0, used - t.checks), pct: Math.min(100, Math.round((used / t.checks) * 100)) }
}

/**
 * طلبُ الاشتراك: يُحفظ في دفترِ طلباتِ الجهات (نفسُ الدفتر الذي تقرأه اللوحة) ونصّه
 * جاهزٌ في بريدكم. لا بوابةَ دفعٍ هنا: اشتراكُ جهةٍ عقدٌ وفاتورة، لا سلةُ شراء.
 */
export function embedLead(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const tier = embedTier(src.tier)
  const one = (v, n) =>
    String(v ?? '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, n)
  return {
    org: one(src.org, 90),
    email: one(src.email, 120).toLowerCase(),
    contact: one(src.contact, 60),
    phone: one(src.phone, 24).replace(/[^\d+)( /-]/g, ''),
    note: one(src.note, 600),
    slots: one(src.slots, 120),
    tier: tier.id,
    seats: tier.checks,
    etimad: !!src.etimad,
    source: 'embed',
    lang: src.lang === 'en' ? 'en' : 'ar',
  }
}

/** نصّ البريد: كلُّ ما كتبه الطرفُ الآخر فيه، بلا قالبٍ فارغ */
export function embedMailto(lead, { lang = 'ar', mail = '' } = {}) {
  const t = embedTier(lead.tier)
  const ar = lang !== 'en'
  const price =
    t.price == null ? (ar ? 'سعرٌ خاص يُحدَّد معكم' : 'special pricing, agreed with you') : `${t.price} ${ar ? 'ريالًا في الشهر' : 'SAR a month'}`
  const lines = ar
    ? [
        `الجهة: ${lead.org || '—'}`,
        `مَن نتواصل معه: ${lead.contact || '—'}`,
        `البريد: ${lead.email || '—'}`,
        `الهاتف: ${lead.phone || '—'}`,
        `الباقة: ${t.name.ar} — ${t.checks} فحصًا في الشهر · ${price}`,
        `مواعيدُ تناسبكم لعرضٍ توضيحي (٢٠ دقيقة): ${lead.slots || 'متى شئتم'}`,
        `ملاحظات: ${lead.note || '—'}`,
        '',
        `أرسلوا العقد والفاتورة إلى ${mail || ''}، وإن أردتم دمجَ الاشتراك مع مقاعدِ الطلاب فاكتبوه في الملاحظات.`,
      ]
    : [
        `Organisation: ${lead.org || '—'}`,
        `Contact: ${lead.contact || '—'}`,
        `E-mail: ${lead.email || '—'}`,
        `Phone: ${lead.phone || '—'}`,
        `Plan: ${t.name.en} — ${t.checks} checks a month · ${price}`,
        `Slots that suit you for a 20-minute demo: ${lead.slots || 'any time'}`,
        `Notes: ${lead.note || '—'}`,
        '',
        `Send the contract and invoice to ${mail || ''}; say in the notes if this should be combined with student seats.`,
      ]
  const subject = ar ? `طلبُ اشتراكِ فاحصٍ مضمّن — ${lead.org || 'جهة'}` : `Embedded checker subscription — ${lead.org || 'organisation'}`
  return `mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

export default { EMBED_TIERS, embedTier, embedSnippet, recordEmbedHit, embedUsage, embedQuota, embedLead, embedMailto, monthKey, EMBED_KEY }
