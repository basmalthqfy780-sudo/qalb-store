/**
 * تقريرُ السوق المجهول: بعد كلِّ فحصٍ يُسألُ صاحبُ السيرة أربعةَ أسئلةٍ اختيارية
 * (تخصصه، مدينته، هل حصل على مقابلة، أيَّ قالبٍ استعمل). لا اسمٌ ولا بريد ولا نصُّ
 * سيرة: أربعةُ حقولٍ تُجمع، ومنها يخرج ما يُسوَّق به وما يُباع للجامعات.
 *
 * لماذا هذا مفيدٌ لمن يملأها؟ لأن الناتج يُنشر: «أكثرُ القوالب حصولًا على مقابلات
 * للمهندسين في الرياض» رقمٌ لا يملكه أحدٌ اليوم، وهو وحده ما يجعل السؤال يستحق
 * الضغطة. ولماذا هو آمن؟ لأن الإجابةُ تُحفظ في جهازه إلا إن وُصل خادم، ولا تُربط
 * بطلبٍ ولا بحساب: أربعةُ حقولٍ لا تكفي لتعريف أحد.
 *
 * والصدقُ شرطٌ في العرض: تحت كلِّ نسبةٍ عددُ الإجابات التي خرجت منها. نسبةٌ من
 * ثلاثةٍ تُنشر بوصفها نسبةً من ثلاثة، لا «٦٧٪ من المهندسين».
 */
import { categories } from './templates.js'
import { byId } from './templates.js'

export const MARKET_KEY = 'qalb.market.v1'
export const MARKET_LIMITS = { field: 24, city: 40, template: 32 }
/** بدون هذا العدد لا تُنشر نسبة: ثلاثةٌ آراء ليست سوقًا */
export const MARKET_MIN = 5

export const MARKET_FIELDS = categories.map((c) => ({ id: c.id, ar: c.ar, en: c.en }))
export const MARKET_CITIES = [
  { id: 'riyadh', ar: 'الرياض', en: 'Riyadh' },
  { id: 'jeddah', ar: 'جدة', en: 'Jeddah' },
  { id: 'dammam', ar: 'الدمام', en: 'Dammam' },
  { id: 'other', ar: 'مدينة أخرى', en: 'Another city' },
  { id: 'remote', ar: 'أبحث عن بُعد', en: 'Remote' },
]
const CITY_OF = (id) => MARKET_CITIES.find((c) => c.id === id) || { id, ar: id, en: id }
const FIELD_OF = (id) => MARKET_FIELDS.find((c) => c.id === id) || { id, ar: 'عام', en: 'General' }

const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)

/**
 * إجابةٌ واحدة: أربعةُ حقول، كلُّها اختياري. ما لم يُملأ يُلغى لا يُخمَّن، و«حصلتُ على
 * مقابلة» حقلٌ واحد ثنائي: نعم أو لا — أما «لم أتقدّم بعد» فلا يُسجَّل، لأنه ليس
 * نتيجةَ قالب.
 */
export function normalizeSignal(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const field = MARKET_FIELDS.some((c) => c.id === src.field) ? src.field : ''
  const city = MARKET_CITIES.some((c) => c.id === src.city) ? src.city : ''
  const template = byId(String(src.template || '')) ? String(src.template) : ''
  const months = Math.max(0, Math.min(36, Number(String(src.months ?? '').replace(/[^\d]/g, '')) || 0))
  const interview = src.interview === true || src.interview === 'yes' ? 1 : src.interview === false || src.interview === 'no' ? 0 : null
  return { at: new Date().toISOString(), field, city, template, months, interview }
}

/** لا شيء يُحفظ إن كانت الإجابةُ فارغة: سطرٌ بلا معنى يُفسد النسب */
export const signalHas = (s) => !!s && (!!s.field || !!s.city || !!s.template || s.interview != null)

export function readSignals() {
  try {
    const v = JSON.parse(store()?.getItem(MARKET_KEY) || '[]')
    return Array.isArray(v) ? v.filter((s) => s && s.at) : []
  } catch {
    return []
  }
}

export function saveSignal(raw = {}) {
  const s = normalizeSignal(raw)
  if (!signalHas(s)) return { ok: false, value: s }
  const all = readSignals()
  const day = String(s.at).slice(0, 10)
  // إجابةٌ واحدة في اليوم: التكرارُ يُضخّم النسبة بلا معنى
  if (all.some((x) => String(x.at).slice(0, 10) === day && x.field === s.field && x.interview === s.interview && x.template === s.template)) {
    return { ok: true, value: s, duplicate: true }
  }
  try {
    store()?.setItem(MARKET_KEY, JSON.stringify([...all, s].slice(-500)))
  } catch {
    return { ok: false, value: s }
  }
  return { ok: true, value: s }
}

export const clearSignals = () => {
  try {
    store()?.removeItem(MARKET_KEY)
  } catch {
    /* لا شيء */
  }
}

const median = (list) => {
  const s = [...list].sort((a, b) => a - b)
  if (!s.length) return 0
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const rate = (n, hit) => (n > 0 ? Math.round((hit / n) * 100) : 0)

/**
 * التجميع: لكلِّ تخصصٍ عددُ الإجابات وعددُ المقابلات ونسبتُها ووسيطُ أشهرِ البحث،
 * وأكثرُ القوالب تكرارًا بين من حصلوا على مقابلة. كلُّ رقمٍ يحمل معه عددَ مَن خرج
 * منهم، فلا نسبةٌ بلا سند.
 */
export function aggregate(signals, { min = MARKET_MIN } = {}) {
  const list = (Array.isArray(signals) ? signals : []).filter(signalHas)
  const asked = list.filter((s) => s.interview != null)
  const groups = new Map()
  for (const s of list) {
    const k = s.field || 'general'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(s)
  }
  const byField = [...groups.entries()]
    .map(([id, rows]) => {
      const answered = rows.filter((r) => r.interview != null)
      const hit = answered.filter((r) => r.interview === 1)
      const counts = new Map()
      for (const r of hit) if (r.template) counts.set(r.template, (counts.get(r.template) || 0) + 1)
      return {
        id,
        label: FIELD_OF(id),
        n: rows.length,
        asked: answered.length,
        interviews: hit.length,
        rate: rate(answered.length, hit.length),
        months: median(hit.map((r) => r.months).filter((m) => m > 0)),
        top: [...counts.entries()]
          .map(([t, n]) => ({ id: t, n }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 3),
      }
    })
    .sort((a, b) => b.asked - a.asked || b.n - a.n)
  const cityRows = MARKET_CITIES.map((c) => {
    const rows = list.filter((s) => s.city === c.id)
    const answered = rows.filter((s) => s.interview != null)
    return { id: c.id, label: CITY_OF(c.id), n: rows.length, asked: answered.length, interviews: answered.filter((s) => s.interview === 1).length }
  }).filter((r) => r.n > 0)
  return {
    n: list.length,
    asked: asked.length,
    interviews: asked.filter((s) => s.interview === 1).length,
    rate: rate(asked.length, asked.filter((s) => s.interview === 1).length),
    months: median(asked.map((s) => s.months).filter((m) => m > 0)),
    enough: asked.length >= min,
    min,
    byField,
    byCity: cityRows,
  }
}

/** صفوفٌ تُعرض في الجدول وتُصدَّر CSV للجامعات — نفسُ الأرقام بلا إعادة حساب */
export function marketRows(agg) {
  return (agg?.byField || []).map((f) => ({
    field: f.label,
    answers: f.n,
    asked: f.asked,
    interviews: f.interviews,
    rate: `${f.rate}%`,
    months: f.months || '—',
    top: f.top.map((t) => `${t.id} (${t.n})`).join(' ') || '—',
  }))
}

export function marketCsv(rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['field', 'answers', 'asked', 'interviews', 'rate', 'median_months', 'top_templates']
  return [
    head.join(','),
    ...rows.map((r) => [r.field?.ar ?? r.field, r.answers, r.asked, r.interviews, r.rate, r.months, r.top].map(cell).join(',')),
  ].join('\n')
}

/** تقريرٌ نصّي للبيعِ للجامعات: يُقرأ وحده، وفيه عددُ مَن خرجت منهم كلُّ نسبة */
export function marketReport(agg, { lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const L = (o) => (o && (o[lang] || o.en)) || ''
  if (!agg || !agg.n) {
    return ar
      ? 'تقريرُ السوق — قالب (qalb.store)\nلا إجاباتٍ بعد: أولُ تقريرٍ يخرج بعد خمسِ إجابات على الأقل.'
      : 'Market report — qalb.store\nNo answers yet: the first report appears after at least five answers.'
  }
  const lines = [
    ar
      ? `تقريرُ السوق — قالب (qalb.store)\nالإجابات: ${agg.n} · سُئلوا عن المقابلات: ${agg.asked} · حصلوا عليها: ${agg.interviews} (${agg.rate}٪)`
      : `Market report — qalb.store\nAnswers: ${agg.n} · asked about interviews: ${agg.asked} · got one: ${agg.interviews} (${agg.rate}%)`,
    ar ? `وسيطُ أشهرِ البحث قبل أول مقابلة: ${agg.months || '—'}` : `Median months of searching before the first interview: ${agg.months || '—'}`,
    '',
    ...(agg.byField || []).map((f) =>
      ar
        ? `${L(f.label)}: ${f.interviews} مقابلةً من ${f.asked} إجابة (${f.rate}٪) · وسيطُ الأشهر ${f.months || '—'} · القوالب: ${
            f.top.map((t) => `${t.id} (${t.n})`).join('، ') || '—'
          }`
        : `${L(f.label)}: ${f.interviews} interviews from ${f.asked} answers (${f.rate}%) · median months ${f.months || '—'} · templates: ${
            f.top.map((t) => `${t.id} (${t.n})`).join(', ') || '—'
          }`,
    ),
    '',
    ar
      ? `كلُّ نسبةٍ هنا من عددٍ مذكورٍ أمامها${
          agg.enough ? '' : `، وما دون ${agg.min} إجاباتٍ لا يُنشر بوصفه سوقًا`
        }. لا اسمٌ ولا بريد ولا نصُّ سيرة في هذه الإجابات.`
      : `Every rate here carries the count it came from${agg.enough ? '' : `, and fewer than ${agg.min} answers is not published as a market`}. No name, no e-mail and no CV text in these answers.`,
  ]
  return lines.join('\n')
}

export default {
  normalizeSignal,
  saveSignal,
  readSignals,
  clearSignals,
  aggregate,
  marketRows,
  marketCsv,
  marketReport,
  MARKET_KEY,
  MARKET_FIELDS,
  MARKET_CITIES,
  MARKET_MIN,
  signalHas,
}
