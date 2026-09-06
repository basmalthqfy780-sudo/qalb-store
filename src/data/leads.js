/**
 * طلبات الجهات (العملاء المحتملون): طبقةٌ واحدة يعرفها المتجر والخادم واللوحة.
 *
 * قبل هذا الملف كان «اطلبوا عقدًا» رسالةَ بريدٍ فقط — تدخل twenty جامعةً في شهرٍ واحد
 * فلا يبقى منها سجلّ. هنا يُبنى الطلبُ مرةً واحدة: يُحقَّق من الحقول، ويُولَّد له رقمُ عرضٍ
 * مشتقٌّ من محتواه (لا عشوائي، ليقول المتصفح والخادم الرقمَ نفسه)، ثم يُحفظ في دفتر
 * الخادم أو في هذا المتصفح عند انعدامه، ويُطبع به عرضُ سعرٍ للفريق المالي.
 *
 * لا كذب في الحالات: ما لم يُحفظ فعلًا لا يقال عنه «أُرسل» — والواجهة تقرأ `where`
 * من الردّ فتقول للإنسان أين ذهب طلبه بالضبط.
 */
import { QUOTE_VALID_DAYS, VAT_RATE, vatSplit } from './company.js'
import { SUPPORT_MAIL } from './contact.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** حدودُ الحقول: تُطابق عمود الدفتر، فلا يُحفظ ما لا يُطبع */
export const LEAD_LIMITS = { org: 90, email: 120, contact: 60, phone: 24, note: 600, slots: 120 }

export const LEAD_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost']

/** مفتاح دفتر المتصفح — محليٌّ بلا خادم، ومُصدَّرٌ إلى اللوحة عند وجوده */
export const LEADS_KEY = 'qalb.leads.v1'

const clip = (v, n) =>
  String(v ?? '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, n)
const oneLine = (v, n) => clip(v, n).replace(/\s*\n\s*/g, ' · ')

/** رقم العرض: مشتقّ من المحتوى (FNV-1a) لا عشوائي — نفس الطلب يعطي نفس الرقم في أي مكان */
export function quoteNo(lead = {}) {
  const at = String(lead.at || new Date().toISOString())
  const key = `${oneLine(lead.org, 90)}|${String(lead.email || '').toLowerCase()}|${lead.tier || ''}|${lead.seats || ''}|${at.slice(0, 10)}`
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  // أبجديةُ بلا حروف تُخلط بأرقام، مثل رموز المقاعد تمامًا
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) ((s = A[h % 32] + s), (h = Math.floor(h / 32)))
  return `QALB-Q-${at.slice(0, 4)}-${s}`
}

/**
 * من النيّة إلى سطرٍ في الدفتر. يعيد { ok, errors, value } — والمتجر لا يعرض نجاحًا
 * إلا على `ok`، والحقولُ المُخطئة تُسمّى واحدًا واحدًا بدل «تحقّق من النموذج».
 */
export function normalizeLead(raw = {}, { tiers = [], now = new Date() } = {}) {
  const errors = {}
  const org = oneLine(raw.org, LEAD_LIMITS.org)
  const email = clip(raw.email, LEAD_LIMITS.email).toLowerCase()
  const contact = oneLine(raw.contact, LEAD_LIMITS.contact)
  const phone = clip(raw.phone, LEAD_LIMITS.phone).replace(/[^\d+)( /-]/g, '')
  const note = clip(raw.note, LEAD_LIMITS.note)
  const slots = oneLine(raw.slots, LEAD_LIMITS.slots)
  if (org.length < 2) errors.org = 'org'
  if (!EMAIL_RE.test(email)) errors.email = 'email'
  const seats = Number(String(raw.seats ?? '').replace(/[^\d]/g, '')) || 0
  if (raw.seats != null && String(raw.seats).trim() !== '' && (seats < 1 || seats > 5000)) errors.seats = 'seats'
  const tier = tiers.find((t) => t.id === raw.tier) || tiers[0] || null
  if (!tier) errors.tier = 'tier'
  if (Object.keys(errors).length) return { ok: false, errors, value: null }

  const at = `${now.toISOString()}`
  const value = {
    // يُحسب ويُخزَّن: فلا يقرأ الموظف سطرًا بلا مبلغ، ولا يُعاد الحساب بطريقةٍ ثانية
    money: null,
    quote: quoteNo({ org, email, tier: tier.id, seats, at }),
    at,
    org,
    email,
    contact,
    phone,
    note,
    slots,
    tier: tier.id,
    tierName: tier.name,
    tierSeats: tier.seats,
    tierPrice: tier.price,
    seats: seats || tier.seats,
    etimad: !!raw.etimad,
    source: String(raw.source || 'b2b').slice(0, 24),
    lang: raw.lang === 'en' ? 'en' : 'ar',
    status: 'new',
  }
  value.money = quoteMath(value, tier)
  return { ok: true, errors: {}, value }
}

/**
 * أرقام العرض: الأساسُ والضريبةُ منفصلة كما تطلب المشتريات، والإجماليُّ هو المعروضُ في
 * المتجر (شامل). الكميةُ مقاعدُ الطلب، وسعرُ الوحدة من الباقة — لا تسعيرٌ يُختَرع في المتصفح.
 */
export function quoteMath(lead, tier) {
  const t = tier || {}
  const seats = Math.max(1, Number(lead.seats) || Number(t.seats) || 1)
  const unitIncl = Math.round(((Number(t.price) || 0) / Math.max(1, Number(t.seats) || seats)) * 100) / 100
  const totalIncl = Math.round(unitIncl * seats * 100) / 100
  const { base, vat, total } = vatSplit(totalIncl)
  const at = new Date(String(lead.at || new Date().toISOString()))
  const validUntil = new Date(at.getTime() + QUOTE_VALID_DAYS * 86400000)
  return {
    seats,
    unitIncl,
    totalIncl,
    base,
    vat,
    total,
    vatRate: VAT_RATE,
    date: at.toISOString().slice(0, 10),
    validUntil: validUntil.toISOString().slice(0, 10),
  }
}

/** نصّ الرسالة — كلُّ ما كتبه الطرفُ الآخر فيه، لا قالبٌ فارغ */
export function leadMailto(lead, m) {
  const lines = [
    `الجهة: ${lead.org}`,
    `مَن نتواصل معه: ${lead.contact || '—'}`,
    `البريد: ${lead.email}`,
    `الهاتف: ${lead.phone || '—'}`,
    `الباقة: ${lead.tier} · ${lead.tierName?.ar || ''} (${lead.tierSeats} مقعدًا / ${lead.tierPrice} ريالًا في السنة)`,
    `المقاعد المطلوبة: ${m.seats}`,
    `مواعيد تناسبنا للعرض التوضيحي (٢٠ دقيقة): ${lead.slots || 'متى شئتم'}`,
    `تشتري الجهة عبر منصة اعتماد: ${lead.etimad ? 'نعم — نحتاج مسارًا يوافقها' : 'لا / لا نعرف'}`,
    '',
    `رقم العرض: ${lead.quote}`,
    `تفصيل الفاتورة: الأساس ${m.base} + ضريبة القيمة المضافة ١٥٪ ${m.vat} = ${m.total} ريالًا (شاملًا).`,
    `صالح حتى: ${m.validUntil}`,
    '',
    lead.note ? `ملاحظات: ${lead.note}` : 'ملاحظات: —',
    '',
    `أرسلوا العقد والفاتورة الضريبية إلى ${SUPPORT_MAIL}.`,
  ]
  return `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(`طلب عقد مؤسسي ${lead.quote} — ${lead.org}`)}&body=${encodeURIComponent(lines.join('\n'))}`
}

/** صفّ اللوحة والـ‎.csv‎: الطلب كاملًا — فالموظف يبيع من هذا السطر، لا من بريدٍ ضائع */
export const leadRow = (lead) => ({
  quote: lead.quote,
  at: String(lead.at || '')
    .slice(0, 16)
    .replace('T', ' '),
  org: lead.org,
  email: lead.email,
  phone: lead.phone || '',
  contact: lead.contact || '',
  tier: lead.tier,
  seats: lead.seats,
  total: lead.money?.totalIncl ?? lead.totalIncl ?? lead.total ?? '',
  status: lead.status || 'new',
  // 'no' نصٌّ صحيحٌ في الدفتر: لا ينعكس إلى 'yes' عند إعادة التطبيع
  etimad: lead.etimad === true || lead.etimad === 'yes' ? 'yes' : 'no',
  note: oneLine(lead.note, 160),
})

const CSV_COLS = ['quote', 'at', 'org', 'email', 'phone', 'contact', 'tier', 'seats', 'total', 'status', 'etimad', 'note']

export const leadCsv = (rows) =>
  [CSV_COLS.join(',')]
    .concat(
      rows.map((raw) => {
        // صفٌّ من الدفتر أو طلبٌ خام — يُعاد التطبيع في الحالتين فلا يتغيّر شكل العمود
        const r = leadRow(raw?.lead || raw)
        return CSV_COLS.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')
      }),
    )
    .join('\n') + '\n'

/* ——— الدفتر المحلي: حيث لا خادم، يبقى الطلبُ في هذا المتصفح لا في الهواء ——— */
const readAll = (storage) => {
  try {
    const raw = storage?.getItem?.(LEADS_KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export const saveLocalLead = (storage, lead) => {
  const all = readAll(storage)
  const next = [lead, ...all.filter((x) => x.quote !== lead.quote)].slice(0, 40)
  try {
    storage?.setItem?.(LEADS_KEY, JSON.stringify(next))
    return { saved: true, count: next.length }
  } catch {
    return { saved: false, count: all.length }
  }
}

export const readLocalLeads = (storage) => readAll(storage)

export const clearLocalLeads = (storage) => {
  try {
    storage?.removeItem?.(LEADS_KEY)
    return true
  } catch {
    return false
  }
}

export default {
  LEAD_LIMITS,
  LEAD_STATUSES,
  LEADS_KEY,
  normalizeLead,
  quoteNo,
  quoteMath,
  leadMailto,
  leadRow,
  leadCsv,
  saveLocalLead,
  readLocalLeads,
  clearLocalLeads,
}
