/**
 * دليلُ المواهب: مَن يشتري قالبًا ويختار «اعرضني في الدليل» يظهر فيه، والشركات
 * تبحثُ بالتخصص والمدينة ودرجةِ جاهزية السيرة.
 *
 * قاعدتان تحكمان الملف:
 *   ١. لا أحدَ يُدرَج إلا بفعله: الإدراجُ خيارٌ في صفحة الرابط، والسجلُّ في جهازه
 *      حتى يُوصلَ بخادم. لا نُضيفُ أحدًا من بياناتِ شراء.
 *   ٢. درجةُ الجاهزية ليست رأيًا: تُحسب من سيرته نفسُه بمحرّك `analyzeAts` ذاته
 *      الذي يحسب شارة القالب في المتجر — الرقمُ المعروض هو الرقمُ المقيس.
 *
 * والملفُّ يُباع للشركات اشتراكًا، أمّا الصفحةُ فتُظهر للزائر عددَ النتائج وروابطَها
 * فقط: البريدُ لا يظهر إلا لمن فتح صاحبُه إظهاره في رابطه.
 */
import { analyzeAts } from './ats.js'
import { byId, categories } from './templates.js'

export const TALENT_KEY = 'qalb.talent.v1'
export const TALENT_PLAN = { id: 'talent-spot', price: 29, period: 'month' }
export const TALENT_LIMITS = { role: 90, city: 60, bio: 300 }
export const MIN_ATS = 70

/** تخصصاتُ الدليل هي تصنيفاتُ المتجر نفسها، فلا قائمةً ثانية تختلف عن الكتالوج */
export const talentFields = () => categories.map((c) => ({ id: c.id, ar: c.ar, en: c.en, icon: c.icon }))

/** مدنٌ تُقترح في البحث — لا تُقيّد: من ليست مدينتُه فيها يكتبها */
export const CITIES = [
  { id: 'riyadh', ar: 'الرياض', en: 'Riyadh' },
  { id: 'jeddah', ar: 'جدة', en: 'Jeddah' },
  { id: 'dammam', ar: 'الدمام', en: 'Dammam' },
  { id: 'mecca', ar: 'مكة', en: 'Mecca' },
  { id: 'medina', ar: 'المدينة', en: 'Medina' },
  { id: 'dubai', ar: 'دبي', en: 'Dubai' },
  { id: 'doha', ar: 'الدوحة', en: 'Doha' },
  { id: 'kuwait', ar: 'الكويت', en: 'Kuwait' },
  { id: 'amman', ar: 'عمّان', en: 'Amman' },
  { id: 'cairo', ar: 'القاهرة', en: 'Cairo' },
  { id: 'remote', ar: 'عن بُعد', en: 'Remote' },
]
export const cityLabel = (id) => CITIES.find((c) => c.id === id) || { id, ar: id, en: id }
export const fieldLabel = (id) => categories.find((c) => c.id === id) || { id, ar: 'عام', en: 'General' }

const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)
const clip = (v, n) =>
  String(v ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n)
const clean = (v, n) => {
  const s = clip(v, n)
  return /[<>]/.test(s) ? '' : s
}

/**
 * سجلٌّ واحد في الدليل. `ats` إما مقيوسةٌ من نصّ السيرة (`cvText`) أو من درجةِ القالب
 * الذي يستعمله صاحبه — وفي الحالتين من محرّكٍ واحد، لا من تقدير.
 */
export function talentEntry(raw = {}, { cvText = '' } = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const ats = cvText && String(cvText).length > 200 ? analyzeAts(cvText).score : src.template ? (byId(src.template)?.ats ?? null) : null
  return {
    handle: String(src.handle || '')
      .toLowerCase()
      .slice(0, 32),
    name: clean(src.name, 80),
    role: clean(src.role, TALENT_LIMITS.role),
    field: categories.some((c) => c.id === src.field) ? src.field : 'general',
    city: clean(src.city, TALENT_LIMITS.city) || '',
    bio: clean(src.bio, TALENT_LIMITS.bio),
    template: String(src.template || '').slice(0, 32),
    ats: ats == null ? null : Math.max(0, Math.min(100, Math.round(ats))),
    years: Math.max(0, Math.min(40, Number(String(src.years || '').replace(/[^\d]/g, '')) || 0)),
    open: src.open !== false,
    highlighted: src.highlighted === true,
    demo: src.demo === true,
    at: typeof src.at === 'string' && src.at ? src.at : new Date().toISOString(),
  }
}

export const talentReady = (r) => !!r && !!r.handle && !!r.name

export function readTalent() {
  try {
    const v = JSON.parse(store()?.getItem(TALENT_KEY) || '[]')
    return Array.isArray(v) ? v.filter(talentReady) : []
  } catch {
    return []
  }
}
export function saveTalent(rec) {
  const row = talentEntry(rec)
  if (!talentReady(row)) return { ok: false, value: null }
  const all = readTalent().filter((x) => x.handle !== row.handle)
  try {
    store()?.setItem(TALENT_KEY, JSON.stringify([row, ...all].slice(0, 60)))
  } catch {
    return { ok: false, value: row }
  }
  return { ok: true, value: row }
}
export function removeTalent(handle) {
  const all = readTalent().filter((x) => x.handle !== handle)
  try {
    store()?.setItem(TALENT_KEY, JSON.stringify(all))
  } catch {
    /* لا شيء يُفعل: السجلّ يبقى كما هو */
  }
  return all
}

/**
 * أربعةُ سجلاتٍ توضيحية: من سيرِ القوالب التجريبية التي يقيسها فاحصُ المتجر نفسه،
 * وموسومةٌ بـ`demo` فيُقال في الصفحة إنها نماذج — لا أشخاصًا حقيقيين بلا إذن.
 */
export function demoTalent() {
  const rows = [
    { handle: 'noura-alharbi', name: 'نورة الحربي', role: 'مهندسة واجهات أمامية', field: 'dev', city: 'الرياض', template: 'atlas', years: 5 },
    { handle: 'sara-alotaibi', name: 'سارة العتيبي', role: 'مديرة منتج رقمي', field: 'corporate', city: 'جدة', template: 'nova', years: 7 },
    {
      handle: 'omar-alkhateeb',
      name: 'عمر الخطيب',
      role: 'مصمم واجهات وتجربة مستخدم',
      field: 'design',
      city: 'الدمام',
      template: 'freelancerkit',
      years: 4,
    },
    { handle: 'layla-hassan', name: 'ليلى حسن', role: 'كاتبة محتوى تقني', field: 'graduate', city: 'عن بُعد', template: 'echocv', years: 3 },
  ]
  return rows.map((r) => ({ ...talentEntry(r, {}), demo: true, open: true, bio: '' })).sort((a, b) => (b.ats || 0) - (a.ats || 0))
}

/** البحث: تخصصٌ ومدينةٌ وحدٌّ أدنى للجاهزية وكلمةٌ في الاسم أو المسمّى */
export function filterTalent(rows, { field = '', city = '', minAts = 0, q = '' } = {}) {
  const term = String(q || '')
    .trim()
    .toLowerCase()
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => !field || r.field === field)
    .filter((r) => !city || String(r.city || '').includes(city) || r.city === city)
    .filter((r) => !minAts || (r.ats ?? 0) >= minAts)
    .filter((r) => !term || `${r.name} ${r.role} ${r.bio}`.toLowerCase().includes(term))
    .sort((a, b) => Number(b.highlighted) - Number(a.highlighted) || (b.ats || 0) - (a.ats || 0) || String(a.name).localeCompare(String(b.name)))
}

export default {
  talentEntry,
  readTalent,
  saveTalent,
  removeTalent,
  filterTalent,
  demoTalent,
  talentFields,
  cityLabel,
  fieldLabel,
  TALENT_KEY,
  TALENT_PLAN,
  MIN_ATS,
  CITIES,
}
