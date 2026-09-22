/**
 * Qalb Link — رابطٌ مهنيٌّ واحد: qalb.store/u/ahmed يعرض السيرة والبورتفوليو وزرَّ
 * تواصل وتحميل السيرة، ومعها تحليلات: كم فُتح، ومن أيِّ بلد، وكم مُرّة نُزّلت السيرة.
 *
 * ثلاثُ حقائقَ يبنى عليها الملف، ولا يُدّعى سواها:
 *
 *   ١. الرابطُ يُبنى من الاسم بمحرّكِ `slugify` نفسه الذي يبني روابط الاستضافة،
 *      فاسمُك يصير رابطًا مقروءًا بالعربية قبل لاتينيتها.
 *   ٢. التحليلاتُ محلية: تُسجَّل في هذا المتصفح إلا إن وُصل خادم. والبلدُ مستنتجٌ
 *      من المنطقة الزمنية لجهاز الزائر لا من عنوانه — تُكتب هذه الجملة في الصفحة،
 *      فلا نزعم معرفةَ موقعٍ لا نعرفه.
 *   ٣. ما يُعرض في /u/:slug هو بياناتُ الرابط وحدها: لا بريدٌ ينشر إلا إن اختار
 *      صاحبه إظهاره، ولا سيرةٌ تُعرض إلا برابطٍ أنشأه صاحبها هنا.
 */
import { slugify } from './hosting.js'
import { SITE_URL } from './site.js'

export const LINK_KEY = 'qalb.links.v1'
export const LINK_EVENTS_KEY = 'qalb.linkevents.v1'
export const LINK_LIMITS = { handle: 32, name: 80, role: 90, city: 60, bio: 400, email: 160, site: 160, cv: 300 }
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,31}$/

export const LINK_PLANS = {
  free: {
    id: 'free',
    price: 0,
    period: null,
    name: { ar: 'مجاني مع كل قالب', en: 'Free with every template' },
    note: { ar: 'رابطٌ فرعي، وعددُ الزيارات وتنزيلات السيرة', en: 'A sub-path link, with view and CV-download counts' },
    geo: false,
    history: 7,
    domain: false,
  },
  plus: {
    id: 'plus',
    price: 29,
    period: 'month',
    name: { ar: 'رابط بلس', en: 'Link Plus' },
    note: {
      ar: 'البلدان والمصدر وسجلُّ ثلاثين يومًا، ونطاقُك الخاص على الرابط',
      en: 'Countries, sources and a 30-day log, plus your own domain on the link',
    },
    geo: true,
    history: 30,
    domain: true,
  },
}

export const planOf = (v) => (v === 'plus' ? 'plus' : 'free')
export const linkPath = (handle) => `/u/${handle}`
export const linkUrl = (handle) => `${SITE_URL}/u/${handle}`

/** ───────────────────────────── البيانات ───────────────────────────── */

const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)
const clip = (v, n) =>
  String(v ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n)
/** وسومًا من أي نوع لا تُخزَّن: الحقلُ كله يُرفض، فلا نسخةٌ مشوَّهة تُعرض للناس */
const clean = (v, n) => {
  const s = clip(v, n)
  return /[<>]/.test(s) ? '' : s
}

/**
 * تنقيةُ سجلّ الرابط: الرابطُ من الاسم (بمحرّكِ التحويل نفسه)، والبريدُ إن لم يكن
 * بريدًا يُلغى، والحقولُ كلها بسقوفها. تُستعمل في المتصفح وحده اليوم، وبنفسِ
 * القواعد على الخادم متى وُصل.
 */
export function sanitizeLink(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  const name = clean(src.name, LINK_LIMITS.name)
  if (name) out.name = name
  const handle = slugify(src.handle || name) || ''
  if (HANDLE_RE.test(handle)) out.handle = handle
  for (const k of ['role', 'city', 'bio', 'email', 'site']) {
    const v = clean(src[k], LINK_LIMITS[k])
    if (v) out[k] = v
  }
  if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(out.email)) delete out.email
  if (out.site && !/^(https?:)?\/\//i.test(out.site) && !/^[\w-]+(\.[\w-]+)+$/.test(out.site)) delete out.site
  out.cv = clean(src.cv, LINK_LIMITS.cv)
  out.template = clean(src.template, 32)
  out.showEmail = src.showEmail !== false
  out.showCv = src.showCv !== false
  out.plan = planOf(src.plan)
  out.at = typeof src.at === 'string' && src.at ? src.at : new Date().toISOString()
  return out
}

/** هل يكفي السجلّ ليُنشر؟ الشرطان: رابطٌ صالح واسمٌ مكتوب */
export const linkReady = (rec) => !!rec && HANDLE_RE.test(String(rec.handle || '')) && !!rec.name

export function readLinks() {
  try {
    const v = JSON.parse(store()?.getItem(LINK_KEY) || '[]')
    return Array.isArray(v) ? v.filter(linkReady) : []
  } catch {
    return []
  }
}
export function saveLink(rec) {
  const cleanRec = sanitizeLink(rec)
  if (!linkReady(cleanRec)) return { ok: false, value: null, errors: ['handle'] }
  const all = readLinks().filter((x) => x.handle !== cleanRec.handle)
  const next = [cleanRec, ...all].slice(0, 12)
  try {
    store()?.setItem(LINK_KEY, JSON.stringify(next))
  } catch {
    return { ok: false, value: cleanRec, errors: ['storage'] }
  }
  return { ok: true, value: cleanRec, errors: [] }
}
export const linkByHandle = (handle) => readLinks().find((x) => x.handle === String(handle || '').toLowerCase()) || null

/** ───────────────────────────── التحليلات ───────────────────────────── */

export const EVENT_KINDS = ['view', 'cv', 'contact', 'copy']

/**
 * بلدُ الزائر من منطقته الزمنية: تخمينٌ معلن، لا عنوان. من لا منطقتُه في الجدول
 * يُسجَّل «غير معروف» — ولا نرسلُ شيئًا إلى أيِّ خدمةٍ لتعرفه لنا.
 */
const TZ_COUNTRY = {
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Asia/Jerusalem': 'PS',
  'Asia/Gaza': 'PS',
  'Asia/Cairo': 'EG',
  'Asia/Khartoum': 'SD',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Tripoli': 'LY',
  'Africa/Khartoum': 'SD',
  'Africa/Nairobi': 'KE',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Johannesburg': 'ZA',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kampala': 'UG',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Athens': 'GR',
  'Europe/Lisbon': 'PT',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Santiago': 'CL',
  'America/Buenos_Aires': 'AR',
  'America/Sao_Paulo': 'BR',
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Kabul': 'AF',
  'Asia/Tehran': 'IR',
  'Asia/Baku': 'AZ',
  'Asia/Tbilisi': 'GE',
  'Asia/Tashkent': 'UZ',
  'Asia/Almaty': 'KZ',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Singapore': 'SG',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Seoul': 'KR',
  'Asia/Tokyo': 'JP',
  'Asia/Shanghai': 'CN',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Yangon': 'MM',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
}
export const COUNTRIES = {
  SA: { ar: 'السعودية', en: 'Saudi Arabia' },
  AE: { ar: 'الإمارات', en: 'UAE' },
  KW: { ar: 'الكويت', en: 'Kuwait' },
  QA: { ar: 'قطر', en: 'Qatar' },
  BH: { ar: 'البحرين', en: 'Bahrain' },
  OM: { ar: 'عمان', en: 'Oman' },
  JO: { ar: 'الأردن', en: 'Jordan' },
  LB: { ar: 'لبنان', en: 'Lebanon' },
  SY: { ar: 'سوريا', en: 'Syria' },
  IQ: { ar: 'العراق', en: 'Iraq' },
  PS: { ar: 'فلسطين', en: 'Palestine' },
  EG: { ar: 'مصر', en: 'Egypt' },
  SD: { ar: 'السودان', en: 'Sudan' },
  MA: { ar: 'المغرب', en: 'Morocco' },
  DZ: { ar: 'الجزائر', en: 'Algeria' },
  TN: { ar: 'تونس', en: 'Tunisia' },
  LY: { ar: 'ليبيا', en: 'Libya' },
  KE: { ar: 'كينيا', en: 'Kenya' },
  NG: { ar: 'نيجيريا', en: 'Nigeria' },
  GH: { ar: 'غانا', en: 'Ghana' },
  ZA: { ar: 'جنوب أفريقيا', en: 'South Africa' },
  TZ: { ar: 'تنزانيا', en: 'Tanzania' },
  UG: { ar: 'أوغندا', en: 'Uganda' },
  GB: { ar: 'بريطانيا', en: 'United Kingdom' },
  IE: { ar: 'أيرلندا', en: 'Ireland' },
  DE: { ar: 'ألمانيا', en: 'Germany' },
  FR: { ar: 'فرنسا', en: 'France' },
  ES: { ar: 'إسبانيا', en: 'Spain' },
  IT: { ar: 'إيطاليا', en: 'Italy' },
  NL: { ar: 'هولندا', en: 'Netherlands' },
  BE: { ar: 'بلجيكا', en: 'Belgium' },
  AT: { ar: 'النمسا', en: 'Austria' },
  CH: { ar: 'سويسرا', en: 'Switzerland' },
  SE: { ar: 'السويد', en: 'Sweden' },
  PL: { ar: 'بولندا', en: 'Poland' },
  CZ: { ar: 'التشيك', en: 'Czechia' },
  HU: { ar: 'المجر', en: 'Hungary' },
  GR: { ar: 'اليونان', en: 'Greece' },
  PT: { ar: 'البرتغال', en: 'Portugal' },
  TR: { ar: 'تركيا', en: 'Türkiye' },
  RU: { ar: 'روسيا', en: 'Russia' },
  UA: { ar: 'أوكرانيا', en: 'Ukraine' },
  US: { ar: 'الولايات المتحدة', en: 'United States' },
  CA: { ar: 'كندا', en: 'Canada' },
  MX: { ar: 'المكسيك', en: 'Mexico' },
  CO: { ar: 'كولومبيا', en: 'Colombia' },
  PE: { ar: 'بيرو', en: 'Peru' },
  CL: { ar: 'تشيلي', en: 'Chile' },
  AR: { ar: 'الأرجنتين', en: 'Argentina' },
  BR: { ar: 'البرازيل', en: 'Brazil' },
  PK: { ar: 'باكستان', en: 'Pakistan' },
  IN: { ar: 'الهند', en: 'India' },
  BD: { ar: 'بنغلاديش', en: 'Bangladesh' },
  LK: { ar: 'سريلانكا', en: 'Sri Lanka' },
  NP: { ar: 'نيبال', en: 'Nepal' },
  AF: { ar: 'أفغانستان', en: 'Afghanistan' },
  IR: { ar: 'إيران', en: 'Iran' },
  AZ: { ar: 'أذربيجان', en: 'Azerbaijan' },
  GE: { ar: 'جورجيا', en: 'Georgia' },
  UZ: { ar: 'أوزبكستان', en: 'Uzbekistan' },
  KZ: { ar: 'كازاخستان', en: 'Kazakhstan' },
  TH: { ar: 'تايلند', en: 'Thailand' },
  ID: { ar: 'إندونيسيا', en: 'Indonesia' },
  PH: { ar: 'الفلبين', en: 'Philippines' },
  MY: { ar: 'ماليزيا', en: 'Malaysia' },
  SG: { ar: 'سنغافورة', en: 'Singapore' },
  HK: { ar: 'هونغ كونغ', en: 'Hong Kong' },
  TW: { ar: 'تايوان', en: 'Taiwan' },
  KR: { ar: 'كوريا الجنوبية', en: 'South Korea' },
  JP: { ar: 'اليابان', en: 'Japan' },
  CN: { ar: 'الصين', en: 'China' },
  VN: { ar: 'فيتنام', en: 'Vietnam' },
  MM: { ar: 'ميانمار', en: 'Myanmar' },
  AU: { ar: 'أستراليا', en: 'Australia' },
  NZ: { ar: 'نيوزيلندا', en: 'New Zealand' },
}
export const countryName = (code, lang = 'ar') => (code && COUNTRIES[code] ? COUNTRIES[code][lang] || COUNTRIES[code].en : '')

/** المنطقةُ الزمنيةُ من المتصفح: `Intl` متاحٌ في كل متصفحٍ حقيقي، وغائبٌ في الاختبار */
export function tzOf() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}
export const countryOf = (tz) => TZ_COUNTRY[String(tz || '')] || ''

/** حدثٌ واحد: ما نعرفه عن زيارةٍ بلا اسمٍ ولا عنوان — وقتٌ وبلدٌ مُستنتج ونوع */
export function recordEvent(handle, kind = 'view', { ref = '' } = {}) {
  const h = String(handle || '')
  if (!HANDLE_RE.test(h) || !EVENT_KINDS.includes(kind)) return null
  const tz = tzOf()
  const ev = { at: new Date().toISOString(), handle: h, kind, ref: String(ref || '').slice(0, 120), cc: countryOf(tz) }
  try {
    const all = readEvents()
    all.push(ev)
    store()?.setItem(LINK_EVENTS_KEY, JSON.stringify(all.slice(-2000)))
  } catch {
    return ev
  }
  return ev
}

export function readEvents() {
  try {
    const v = JSON.parse(store()?.getItem(LINK_EVENTS_KEY) || '[]')
    return Array.isArray(v) ? v.filter((e) => e && e.at && e.handle) : []
  } catch {
    return []
  }
}

const dayOf = (iso) => String(iso).slice(0, 10)

/** ملخّصٌ واحد لكلِّ ما تعرضه الصفحة: العدّادات والبلدان والأيام */
export function summarize(events, { handle = '', days = 30, now = new Date() } = {}) {
  const till = now.getTime()
  const from = till - days * 86400000
  const list = (Array.isArray(events) ? events : []).filter((e) => (!handle || e.handle === handle) && new Date(e.at).getTime() >= from)
  const by = {}
  for (const e of list) by[e.kind] = (by[e.kind] || 0) + 1
  const cc = new Map()
  const perDay = new Map()
  for (const e of list) {
    if (e.cc) cc.set(e.cc, (cc.get(e.cc) || 0) + 1)
    const d = dayOf(e.at)
    perDay.set(d, (perDay.get(d) || 0) + 1)
  }
  const daysList = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(till - i * 86400000).toISOString().slice(0, 10)
    daysList.push({ d, n: perDay.get(d) || 0 })
  }
  return {
    views: by.view || 0,
    cv: by.cv || 0,
    contact: by.contact || 0,
    copy: by.copy || 0,
    total: list.length,
    countries: [...cc.entries()].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n),
    days: daysList,
    lastAt: list.length ? list[list.length - 1].at : null,
  }
}

/**
 * أرقامٌ توضيحية لرابطِ العرض: ثلاثون يومًا بلا أسماء ولا عناوين، تُعرض وحدها
 * وموسومةً بأنها تجريبية — فصفحةُ تحليلاتٍ فارغة لا تُقرأ، ورقمٌ حقيقيٌّ مزعومٌ كذبة.
 */
export function demoEvents(handle, { days = 30, now = new Date() } = {}) {
  let h = 0x811c9dc5
  for (const ch of String(handle || 'demo')) ((h ^= ch.charCodeAt(0)), (h = Math.imul(h, 0x01000193) >>> 0))
  const rand = () => ((h = (Math.imul(h, 0x01000193) >>> 0) / 4294967296), h)
  const pool = ['SA', 'SA', 'SA', 'AE', 'EG', 'JO', 'KW', 'GB', 'US', 'IN']
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const n = Math.floor(rand() * 6)
    for (let k = 0; k < n; k++) {
      const kind = rand() < 0.68 ? 'view' : rand() < 0.7 ? 'cv' : 'contact'
      out.push({
        at: new Date(d.getTime() + Math.floor(rand() * 8) * 3600000).toISOString(),
        handle,
        kind,
        cc: pool[Math.floor(rand() * pool.length)],
        ref: '',
      })
    }
  }
  return out
}

export default {
  sanitizeLink,
  saveLink,
  readLinks,
  linkByHandle,
  linkUrl,
  linkPath,
  recordEvent,
  readEvents,
  summarize,
  demoEvents,
  countryName,
  tzOf,
  LINK_PLANS,
  planOf,
  HANDLE_RE,
}
