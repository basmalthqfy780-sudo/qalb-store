/**
 * حصّةُ تصدير الملفات المصدرية — ثلاثةُ قوالبَ في الشهر، لا بلا سقف.
 *
 * لماذا سقفٌ أصلًا؟ لأن ملفات المصدر هي القالب نفسه كما نبيعه: من يملكها يملك
 * ما نبيعه. فالدرجةُ الاحترافية تُعطيها — فهي حقٌّ اشترِك به — لكن بسقفٍ شهريٍّ
 * معلن: ثلاثةُ قوالب، تُحصى على بريد الحساب، وتُصفَّر مع أول يوم من كل شهر.
 * الهدف حماية الملكية لا تضييق الاستخدام، ولذلك الحدُّ مكتوبٌ في صفحة الخطط
 * وفي صفحة الحساب معًا، ويُعرض المتبقّي لا المستهلَك.
 *
 * والعدّادُ على الجهاز هنا (كحساب الزائر نفسه في src/data/account.js): لا خادمَ
 * يملك الحساب في هذه النسخة، والقرارُ الحاسم يبقى للخادم حين يُوصل — ولذلك
 * كلُّ ما يكتبه هذا الملف مفتاحٌ واحد قابل للقراءة والتدقيق، لا حالةٌ مبعثرة.
 */
import { monthKey } from './hosting.js'
import { entitlements } from './plans.js'

const KEY = 'qalb.source-exports.v1'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}
const write = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* storage blocked — the quota still holds for this session in memory */
  }
}

/** مفتاحُ الشهر للحساب: البريدُ مُنزَّلٌ ومُزيَّف، فلا فرقَ بين `Sara@x` و`sara@x` */
const slot = (email, at = new Date()) =>
  `${String(email || '')
    .trim()
    .toLowerCase()}|${monthKey(at)}`

/**
 * السقفُ الشهري لخطةٍ ما: من جدول الخطط نفسه (`sourceExports`) لا رقمٌ مكتوبٌ
 * هنا. القيمة `null` تعني بلا سقف، و0 تعني مغلقًا — والفرق بينهما يظهر في
 * الواجهة كما يظهر في `canExportSource`.
 */
export const sourceQuotaOf = (planId) => {
  const e = entitlements(planId)
  return e && typeof e.sourceExports === 'number' ? e.sourceExports : 0
}

/** ما صُدِّر هذا الشهر: معرّفات القوالب كما سُجّلت، لا أرقامًا مجهولة */
export const sourceUsed = (email, at = new Date()) => {
  const all = read()
  const list = all[slot(email, at)]
  return Array.isArray(list) ? list.slice() : []
}

/** الباقي هذا الشهر — `Infinity` لخطةٍ بلا سقف، وصفرٌ لخطةٍ مغلقة */
export const sourceLeft = (email, planId, at = new Date()) => {
  const quota = sourceQuotaOf(planId)
  if (quota === null) return Infinity
  return Math.max(0, quota - sourceUsed(email, at).length)
}

/**
 * هل يجوز التصدير الآن؟ شرطان: الخطةُ تفتح الميزة، والحصّةُ لم تُستنفد.
 * التصديرُ نفسه لا يُسجَّل هنا — `recordSourceExport` هو ما يخصم، فلا يُخصم
 * شيءٌ بمجرّد السؤال (ولا بزرٍّ فشل بعده التنزيل).
 */
export const canExportSource = (email, planId, at = new Date()) => {
  const e = entitlements(planId)
  if (!e?.exportSite) return false
  return sourceLeft(email, planId, at) > 0
}

/**
 * تسجيلُ تصديرٍ واحد. القالبُ نفسه لا يُكرَّر داخل الشهر: من صدّر قالبًا مرتين
 * في شهره حُسب مرةً واحدة، فالسقفُ على عدد القوالب لا على عدد النقرات — وهو
 * ما يوافق معنى «ثلاثة قوالب شهريًا» لا «ثلاث نقرات».
 *
 * @returns {{ ok: boolean, used: string[], left: number }} — `ok: false` إن كانت الحصّةُ مستنفدة
 */
export const recordSourceExport = (email, planId, tplId, at = new Date()) => {
  const key = slot(email, at)
  const all = read()
  const used = Array.isArray(all[key]) ? all[key].slice() : []
  if (tplId && !used.includes(tplId)) {
    if (sourceLeft(email, planId, at) <= 0) return { ok: false, used, left: 0 }
    used.push(tplId)
    all[key] = used
    // شهرٌ قديم لا يُترك في المخزن: يُحذف كل مفتاحٍ لا يخصّ الشهرين الأخيرين
    for (const k of Object.keys(all)) if (keyOf(k) !== key && monthsBetween(keyOf(k), key) > 1) delete all[k]
    write(all)
  }
  return { ok: !!tplId, used, left: sourceLeft(email, planId, at) }
}

const keyOf = (slotKey) => String(slotKey).split('|').slice(1).join('|')

const monthsBetween = (a, b) => {
  const [ay, am] = String(a).split('-').map(Number)
  const [by, bm] = String(b).split('-').map(Number)
  return Math.abs((by - ay) * 12 + (bm - am))
}

/** أولُ يومٍ من الشهر القادم — يُعرض للحساب متى تُصفَّر حصّته */
export const nextReset = (at = new Date()) => {
  const d = new Date(at)
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}
