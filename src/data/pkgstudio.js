/**
 * استوديو تخصيص الحزمة — للمشترين الموثّقين.
 *
 * طبقةُ حالتٍ واحدة يقرؤها `src/components/PkgStudio.jsx`:
 *   التوثيق  رقم الطلب + مفتاح الرخصة يُطابقان سجلَّ الطلب (نفس المطابقة التي
 *            يفرضها `/download/:id` على الخادم) — لا استوديو لغير المشتري.
 *   المسودّات كل تعديل (نصوص · صور · أقسام · أرقام) يُحفَظ تحت
 *            `qalb.pkgstudio.v1` لكل طلبٍ وكل قالب، فيُستأنف من حيث توقّف.
 *   التصدير  نفس مولّدات الحزمة في `src/data/deliverable.js` — ما يراه في المعاينة
 *            هو ما ينزل في الـZIP حرفًا بحرف، والبيانات مطبوعة في الملفّات النهائية.
 */
import { CUSTOM_LIMITS, kindOf, packageName, sanitizeCustom, sanitizeImage, studioZip } from './deliverable.js'
import { byId } from './templates.js'
import { fetchOrder, read, verifyKey, write } from '../api/index.js'

export const PKG_STORE = 'qalb.pkgstudio.v1'
export { CUSTOM_LIMITS, sanitizeImage }

/** أقسام القالب بترتيبها الأصلي — مربوطة بمعرّفات يقرأها المولّد */
export const sectionsOf = (tpl) =>
  kindOf(tpl) === 'cv' ? ['summary', 'experience', 'skills', 'education', 'languages'] : ['work', 'about', 'services', 'contact']

export const fieldsOf = (tpl) =>
  kindOf(tpl) === 'cv' ? ['name', 'role', 'city', 'email', 'phone', 'website', 'bio'] : ['name', 'role', 'city', 'email', 'phone', 'website', 'bio']

/** مسودّة فارغة: ما لم يُكتب يبقى نصّ القالب التجريبي في الملف المُسلَّم */
export const blankDraft = () => ({
  personal: { name: '', role: '', city: '', email: '', phone: '', website: '', bio: '' },
  custom: { city: '', hidden: [], order: [], stats: [], images: [] },
})

/** تنقية المسودّة من مصدرٍ محفوظ — لا يُقبل منها ما لا يقبله المولّد */
export function cleanDraft(raw, tpl) {
  const b = blankDraft()
  const src = raw && typeof raw === 'object' ? raw : {}
  const personal = { ...b.personal, ...(src.personal || {}) }
  for (const k of Object.keys(personal)) personal[k] = String(personal[k] == null ? '' : personal[k])
  const custom = sanitizeCustom({ ...b.custom, ...(src.custom || {}) }, kindOf(tpl))
  return { personal, custom: custom || { ...b.custom } }
}

/** سياق المولّد: بيانات الطلب للرخصة والتتبّع، والتخصيص من الاستوديو */
export function draftCtx(order, draft) {
  return {
    id: order.id,
    key: order.key,
    name: order.name,
    email: order.email,
    date: order.date,
    personalize: { on: true, ...draft.personal },
    custom: draft.custom,
  }
}

/* ------------------------------ التوثيق ------------------------------ */

/**
 * التحقق من ملكية الشراء: الطلب موجود، ورقم الطلب هو رقمه، والمفتاح مفتاحه —
 * نفس الشروط التي لا يُسلَّم بعدها ملف. تُستدعى في الوضعين (محلي وREST).
 */
export async function verifyPurchase(id, key) {
  const wantId = String(id || '').trim()
  const wantKey = String(key || '')
    .trim()
    .toUpperCase()
  if (!wantId || !wantKey) return { ok: false, why: 'missing' }
  let order
  try {
    order = await fetchOrder(wantId)
  } catch {
    return { ok: false, why: 'offline' }
  }
  if (!order || String(order.id) !== wantId) return { ok: false, why: 'missing' }
  if (String(order.key || '').toUpperCase() !== wantKey) return { ok: false, why: 'bad-key' }
  // مطابقةٌ ثانية في سجلّ الرخص حين يجيب الخادم — فلا يكفي حفظُ الطلب وحده
  try {
    const v = await verifyKey(wantKey)
    if (v && v.valid === false) return { ok: false, why: 'bad-key' }
    if (v && v.valid && v.order && v.order !== wantId) return { ok: false, why: 'bad-key' }
  } catch {
    /* لا خادم = لا سجلّ خارجي؛ مطابقة الطلب المحفوظ تكفي في الوضع المحلي */
  }
  return { ok: true, order }
}

/** قوالب هذا الطلب: ما هو في سطوره وموجودٌ في الكتالوج — لا غير */
export const ownedTemplates = (order) => {
  const ids = [...new Set(((order && order.lines) || []).map((l) => l && l.id))]
  return ids.map((id) => byId(id)).filter(Boolean)
}

/** طلباتٌ على هذا الجهاز (عمود الاستوديو في الوضع المحلي) — للتفعيل بنقرة */
export const localOrders = () => {
  const all = read('qalb.orders.v1', []) || []
  const last = read('qalb.lastOrder', null)
  const out = []
  for (const o of [...(Array.isArray(all) ? all : []), last]) {
    if (o && o.id && o.key && !out.some((x) => x.id === o.id)) out.push({ id: o.id, key: o.key, name: o.name || '', email: o.email || '' })
  }
  return out.slice(0, 8)
}

/* ------------------------------ المسودّات ------------------------------ */

const load = () => read(PKG_STORE, {}) || {}
const save = (m) => write(PKG_STORE, m)

/** مسودّة هذا القالب في هذا الطلب — نظيفة دائمًا عند القراءة */
export function readDraft(orderId, tpl) {
  const m = load()
  const rec = m[String(orderId)] || {}
  return cleanDraft((rec.drafts || {})[tpl.id], tpl)
}

/** الحفظ يمرّ بالتنقية نفسها التي يمرّ بها التصدير — فلا مفاجأة لحظة التنزيل */
export function saveDraft(orderId, tpl, draft) {
  const m = load()
  const id = String(orderId)
  const rec = m[id] || { drafts: {} }
  rec.drafts[tpl.id] = cleanDraft(draft, tpl)
  m[id] = rec
  save(m)
  return rec.drafts[tpl.id]
}

export function clearDrafts(orderId) {
  const m = load()
  delete m[String(orderId)]
  save(m)
}

/* ------------------------------ التصدير ------------------------------ */

/**
 * الـZIP النهائي: مبنيةٌ كلّيًّا هنا من نفس المولّدات — لا نسخة تجميلية —
 * وصور المستخدم مضمّنة في `assets/img/` بمساراتٍ نسبية نظيفة.
 */
export function exportZip(tpl, order, draft) {
  const clean = cleanDraft(draft, tpl)
  return {
    name: packageName(tpl, order),
    bytes: studioZip(tpl, draftCtx(order, clean)),
    draft: clean,
  }
}

/** أزواج الفتحات/الصور الجاهزة للعرض في المعاينة ومربعات الرفع */
export function imageSlots(tpl) {
  const slots = []
  if (acceptsImages(tpl)) {
    slots.push({ slot: 'avatar', label: 'avatar' })
    // فتحة لكل عملٍ في معرض القالب — بمقدارٍ يطابق ما يُعرض في الصفحة
    for (let i = 0; i < 7; i++) slots.push({ slot: `project:${i}`, label: `project-${i + 1}` })
  }
  return slots.slice(0, CUSTOM_LIMITS.images)
}

/** حقل «الأرقام»: صفٌّ من صفوف القالب نفسها (value + سطر تحته) */
export const blankStat = () => ({ v: '', en: '' })

/** هل القالب يقبل صورًا (موقع أو حزمة)؟ السيرة ورقة طبع لا صور فيها */
export const acceptsImages = (tpl) => kindOf(tpl) !== 'cv'

/** أسماء الملفات النهائية في الحزمة — لعرضها قبل التنزيل */
export const packagePreviewPaths = (tpl, draft) => {
  const clean = cleanDraft(draft, tpl)
  const imgs = (clean.custom.images || []).map((im) => im.path)
  const base = kindOf(tpl) === 'cv' ? ['resume.html', 'resume.md', 'styles.css'] : ['index.html', 'styles.css', 'content/profile.json']
  return [...base, ...imgs.map((p) => `./${p}`)]
}

export default {
  blankDraft,
  cleanDraft,
  draftCtx,
  verifyPurchase,
  ownedTemplates,
  localOrders,
  readDraft,
  saveDraft,
  clearDrafts,
  exportZip,
  sectionsOf,
  fieldsOf,
  imageSlots,
  blankStat,
  acceptsImages,
  packagePreviewPaths,
  PKG_STORE,
  CUSTOM_LIMITS,
  sanitizeImage,
}
