/**
 * طبقة المؤسسات: مقاعد سنوية لجامعة أو معهد تدريب أو مكتب توظيف، يدفع عنها عقدٌ
 * واحد فيأخذ كل طالبٍ منها ترخيصًا كاملًا بلا أن يدفع. الأرقام هنا هي الوحيدة:
 * صفحة ‎/b2b‎ واللوحة وفحص الـAPI كلها تقرأ من هذا الملف، فلا سعرٌ مكتوب باليد.
 *
 * ما هو آلي فعلًا: رمز المقاعد، وسجلّ الجهة، وخصم مقعد عند الاستبدال، وإصدار مفتاح
 * ترخيص من نفس مسار الطلب (بلا دفع من الطالب). وما هو بشري صريح: العقد والفاتورة —
 * لا تصدران من هذا المتجر، بل تُطلبان بالبريد. الصفحة تقول ذلك، ولا تُظهر «تم الإرسال».
 */
import { templates } from './templates.js'

export const B2B_TIERS = [
  {
    // بوابةُ الدخول: لا لجنةَ مشتريات ولا منافسة — توقيعُ عميدٍ واحد، ثم تُخصَم في العقد السنوي
    id: 'pilot',
    seats: 25,
    price: 3900,
    name: { ar: 'فصل دراسي واحد — تجريبي', en: 'One cohort — pilot' },
    for: { ar: 'فوجٌ واحد يُقاس قبل أن يوقّع العقد السنوي', en: 'A single cohort, measured before the annual contract' },
    includes: {
      ar: [
        '٢٥ مقعدًا في السنة — مقعدٌ لكل طالبٍ في الفوج',
        'رمزٌ واحد يُوزَّع على الطلاب، ويُستهلك المقعد عند الاستبدال',
        'قالب سيرة + موقع لكل مقعد، ونفس سكربت فحص ATS في الحزمة',
        'يُثبّت الموظف ما دُفع منها خصمًا في العقد السنوي — لا شيء يُخصم آليًا بلا بوابة دفع',
      ],
      en: [
        '25 seats for a year — one per student in the cohort',
        'One code handed out; a seat is spent only on redemption',
        'A CV and a site per seat, with the same ATS script shipped in the package',
        'A staff member credits what was paid against the annual contract — nothing auto-credits without a payment gateway',
      ],
    },
  },
  {
    id: 'campus',
    seats: 50,
    price: 15000,
    name: { ar: 'قسم أو كلية', en: 'A department' },
    for: { ar: 'دفعة واحدة أو برنامج انتقالي', en: 'One cohort or a bridge programme' },
    includes: {
      ar: ['٥٠ مقعدًا في السنة', 'رمز واحد يُوزَّع على الطلاب', 'قالب سيرة + موقع لكل مقعد', 'تقريرُ استخدامٍ نكتبه من دفتر الاستهلاك في آخر السنة'],
      en: [
        '50 seats for a year',
        'One code handed to students',
        'A CV and a site per seat',
        'A year-end usage report we write out of the redemption ledger',
      ],
    },
  },
  {
    id: 'institute',
    seats: 150,
    price: 24000,
    name: { ar: 'معهد تدريب', en: 'A training institute' },
    for: { ar: 'برامج متقطعة ومسارات توظيف', en: 'Short programmes and employment tracks' },
    includes: {
      ar: [
        '١٥٠ مقعدًا تُستهلك عند الحاجة',
        'لا يُشترى المقعد إلا عند الاستبدال',
        'إضافة قوالب مخصصة عند الطلب',
        'تقريرُ منتصفِ سنةٍ من دفتر الاستهلاك، يدويًا وبلا وعدٍ آلي',
      ],
      en: [
        '150 seats drawn as needed',
        'A seat is only spent on redemption',
        'Custom template on request',
        'A mid-year report, written by hand from the ledger',
      ],
    },
  },
  {
    id: 'academy',
    seats: 300,
    price: 33000,
    name: { ar: 'جامعة أو أكاديمية', en: 'A university or academy' },
    for: { ar: 'مركز مهنة يخدم كل الخريجين', en: 'A career centre serving all graduates' },
    includes: {
      ar: ['٣٠٠ مقعد', 'عدة رموز لأفواج مختلفة', 'رمزٌ مستقل لكل فوج على نموذج الاستبدال نفسه', 'تقريرُ نهاية السنة من دفتر الاستهلاك'],
      en: [
        '300 seats',
        'Several codes for several cohorts',
        'Its own code per cohort on the same redemption form',
        'A year-end report from the ledger',
      ],
    },
  },
  {
    id: 'employment',
    seats: 500,
    price: 45000,
    name: { ar: 'مكتب توظيف أو برنامج وطني', en: 'An employment office or national programme' },
    for: { ar: 'مستفيدون مسجَّلون بمئات الآلاف', en: 'Beneficiaries counted in the tens of thousands' },
    includes: {
      ar: ['٥٠٠ مقعد', 'توزيع الرموز على الفروع', 'نُعلمك بالقالب الجديد عند صدوره', 'تقريرٌ فصليّ بعدد المقاعد المستهلكة لكل رمز، من الدفتر'],
      en: [
        '500 seats',
        'Codes distributed across branches',
        'We tell you first when a new template ships',
        'Half-yearly count of seats spent per code, read out of the ledger',
      ],
    },
  },
]

/** مدة العقد — سنة واحدة، لا تجديد تلقائي: لا نمدّد على أحد بغير توقيعه */
export const B2B_TERM_MONTHS = 12

/**
 * ما يشتريه المقعد: قوالب السيرة والحزم التي تحمل سيرة — لا مواقع بحتة.
 * المقياس هنا «له قيمة ATS مقيَسة» لا «يرفع شارة ٩٧+ في المتجر»: لذلك يدخل atlas-cv (٩٢)
 * في العقد ولا يظهر تحت فلتر الشارة في Catalog — فرقٌ مقصود، فشرطُ الشارة تسويقٌ للمفرد
 * وشرطُ العقد أن يعرف المشتري ما يسلَّم له. لا يُوَحَّد الرقمان لاحقًا.
 */
export const SEAT_TEMPLATES = templates.filter((t) => t.ats != null)

/** بلا حروف تُخلط بأرقام: لا I ولا O ولا 0 ولا 1 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ORG_CODE_RE = /^QALB-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/

export const normalizeCode = (v) =>
  String(v || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]/g, '-')

/** الرمز يُبنى عشوائيًا في الخادم؛ rand() تُمرَّر في الفحص ليثبت الشكل لا القيمة */
export function makeOrgCode(rand = Math.random) {
  const block = (n) => Array.from({ length: n }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join('')
  return `QALB-${block(4)}-${block(4)}`
}

/** ما يدفعه الطالب لو اشترى المقعد نفسه بالجملة: أدنى سعر قائمةٍ لقالبٍ يملكه المقعد */
export const cheapestSeatRetail = () => Math.min(...SEAT_TEMPLATES.map((t) => Number(t.price)))
export const priciestSeatRetail = () => Math.max(...SEAT_TEMPLATES.map((t) => Number(t.price)))
export const perSeat = (tier) => Math.round((tier.price / tier.seats) * 100) / 100
export const retailValue = (tier) => tier.seats * cheapestSeatRetail()
/** كم من سعر الفرد يدفعه المعهد عن كل مقعد — يُحسب، ولا يُروَّج */
export const perSeatVsRetail = (tier) => Math.round((perSeat(tier) / cheapestSeatRetail()) * 100)

/**
 * ما يقارن به المشتري فعلًا. من يقرأ «٣٠٠ ريال للمقعد» يضربه بأرخص قالبٍ في المتجر، لا
 * بأغلب ما يُسلَّم إليه: فالمقعدُ في عقدٍ مؤسسي يُستهلك عادةً على حزمة الموقع + السيرة،
 * وسعرُها الفردي هو المرجع. نسمّي المنتج ونحسب النسبة من البيانات، ولا نترك الحساب في رأس
 * موظفِ مشترياتٍ يحسب ٥٠ × ١٤٩ ثم يسأل لماذا الدفعُ أضعاف.
 */
export const seatBundle = () => templates.find((t) => t.id === 'mirrorbundle') || null
export const perSeatVsBundle = (tier) => {
  const b = seatBundle()
  if (!b || !b.price) return 0
  return Math.max(0, Math.round((1 - perSeat(tier) / Number(b.price)) * 100))
}

/** ما يفتحه المقعد: عددُه ومدى أسعار قائمته — نطاقٌ مشتقٌّ لا نصٌّ مكتوب باليد */
export const seatRetailBand = () => ({ count: SEAT_TEMPLATES.length, min: cheapestSeatRetail(), max: priciestSeatRetail() })

/**
 * عددُ مقاعدَ يطلبه الطرفُ الآخر ← أقربُ باقةٍ تسعه. لا سعرٌ لكل مقعد يُخترع في المتصفح:
 * من طلب ٦٠ يأخذ «معهد تدريب» (١٥٠) ويحصل على الزائد بلا مقابل، لأن ما تحتها لا يسعه.
 */
export function tierForSeats(seats) {
  const n = Math.max(1, Math.round(Number(seats) || 0))
  const fit = B2B_TIERS.slice()
    .sort((a, b) => a.seats - b.seats)
    .find((t) => t.seats >= n)
  if (fit) return { tier: fit, over: fit.seats - n, under: 0 }
  const top = B2B_TIERS.slice().sort((a, b) => b.seats - a.seats)[0]
  return { tier: top, over: 0, under: Math.max(0, n - top.seats) }
}
export const addMonths = (iso, months) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCMonth(d.getUTCMonth() + Number(months || B2B_TERM_MONTHS))
  return d.toISOString().slice(0, 10)
}

export const seatLeft = (org) => Math.max(0, (Number(org?.seats) || 0) - (Number(org?.used) || 0))

/**
 * قرار واحد يستعمله الخادم والواجهة والفحص: هل يُستبدَل هذا المقعد الآن؟
 * الأسباب بالإنجليزية الصغيرة لأنها تدخل JSON الردّ، والصفحة تترجمها.
 */
export function redeemReason(org, { email, template, at = new Date() } = {}) {
  if (!org) return 'unknown'
  if (org.status && org.status !== 'active') return 'paused'
  const today = `${at.toISOString().slice(0, 10)}`
  if (org.expires && today > org.expires) return 'expired'
  if (!SEAT_TEMPLATES.some((t) => t.id === template)) return 'template'
  if (seatLeft(org) <= 0) return 'exhausted'
  const who = String(email || '').toLowerCase()
  if ((org.redemptions || []).some((r) => String(r.email).toLowerCase() === who && r.template === template)) return 'already'
  return 'ok'
}

/** السجلّ الرسمي لمقعد مؤسسة — يستعمله الخادم ومحليّ المتجر معًا */
export function makeOrg({ code, org, email, tier, issued, seats, months = B2B_TERM_MONTHS, note = '', credit = 0 }) {
  const start = `${String(issued || new Date().toISOString()).slice(0, 10)}`
  const t = B2B_TIERS.find((x) => x.id === tier) || null
  return {
    code: code || makeOrgCode(),
    org: String(org || '').slice(0, 80),
    email: String(email || '')
      .toLowerCase()
      .slice(0, 120),
    tier: t ? t.id : null,
    seats: Math.max(1, Math.min(5000, Math.round(Number(seats ?? t?.seats) || 0))),
    months,
    issued: start,
    expires: addMonths(start, months),
    status: 'active',
    note: String(note || '').slice(0, 240),
    // ما دفعته الجهة في باقةٍ تجريبية، يثبّته الموظف: لا يُخصم شيءٌ آليًّا بلا بوابة دفع
    credit: Math.max(0, Math.round(Number(credit) || 0)),
    used: 0,
    redemptions: [],
  }
}

/** ما يُرى من السجلّ: لا بريدا إلكترونيًا لطلاب، ولا قائمة أسماء — عددٌ وقوالبُ فقط */
export const orgSummary = (org) => ({
  code: org.code,
  org: org.org,
  tier: org.tier,
  status: org.status,
  issued: org.issued,
  expires: org.expires,
  seats: Number(org.seats) || 0,
  used: Number(org.used) || 0,
  left: seatLeft(org),
  templates: [...new Set((org.redemptions || []).map((r) => r.template))].sort(),
})

/** ما استُهلك لكل قالب — مشتقٌّ من دفتر الاستهلاك ولا يخزّن عن الطالب شيئًا جديدًا */
export const orgUsage = (org) => {
  const counts = {}
  for (const r of org.redemptions || []) counts[r.template] = (counts[r.template] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
}

/** صيغة العمود في تصدير اللوحة: nova:4;mirrorbundle:1 — بلا أسماء ولا بريدا */
export const orgUsageLabel = (org) => {
  const pairs = orgUsage(org)
  return pairs.length ? pairs.map(([k, v]) => `${k}:${v}`).join(';') : '—'
}

/** صفّ اللوحة و‎.csv‎ الصادر عنها: لا نصّ للطالب ولا بريده */
export const orgRowForStaff = (org) => ({
  code: org.code,
  org: org.org,
  email: org.email, // بريد الجهة نفسه، لا بريد المستفيدين
  tier: org.tier,
  status: org.status,
  issued: org.issued,
  expires: org.expires,
  seats: Number(org.seats) || 0,
  used: Number(org.used) || 0,
  credit: Number(org.credit) || 0,
  byTemplate: orgUsageLabel(org),
})

export const orgCsv = (rows) =>
  ['code,org,email,tier,status,issued,expires,seats,used,credit,byTemplate']
    .concat(
      rows.map((r) =>
        [r.code, r.org, r.email, r.tier, r.status, r.issued, r.expires, r.seats, r.used, r.credit, r.byTemplate]
          .map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`)
          .join(','),
      ),
    )
    .join('\n') + '\n'

/* طلبُ الجهة صار في src/data/leads.js: حقلٌ واحد للنصّ والسجلّ وعرض السعر — فلا تتباعد الرسالة عن الدفتر */

export default {
  B2B_TIERS,
  B2B_TERM_MONTHS,
  SEAT_TEMPLATES,
  ORG_CODE_RE,
  normalizeCode,
  makeOrgCode,
  makeOrg,
  perSeat,
  retailValue,
  perSeatVsRetail,
  cheapestSeatRetail,
  priciestSeatRetail,
  addMonths,
  seatLeft,
  redeemReason,
  orgSummary,
  orgUsage,
  orgUsageLabel,
  orgRowForStaff,
  orgCsv,
}
