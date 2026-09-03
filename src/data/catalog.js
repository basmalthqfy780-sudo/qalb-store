/**
 * طبقة منتجات الإدارة (Admin) فوق الكتالوج المصدري.
 *
 * لا تلمس اللوحة ملفات src/data أبدًا؛ تكتب «استثناءات» فقط في
 * server/products.json (أو qalb.products.v1 في وضع local)،
 * وهذه الوحدة هي المكان الوحيد الذي يدمجها — فيستعملها المتجر
 * في المتصفح ويستخدمها خادم الطلبات في إعادة حساب المجاميع،
 * فلا يختلف السعر المعروض عن السعر الذي يُحاسَب به المشتري.
 */
import { templates } from './templates.js'
import { protectedPathOk } from './deliverable.js'

/** نسخة نقية من الكتالوج المصدري، تُقارَن إليها التعديلات عند كل تطبيق */
const PRISTINE = templates.map((t) => ({ ...t }))

export const EDITABLE = ['price', 'oldPrice', 'download', 'published', 'featured', 'nameAr', 'nameEn', 'taglineAr', 'taglineEn', 'cat']
export const MIN_PRICE = 1
export const MAX_PRICE = 99999
const ID_RE = /^[a-z0-9][a-z0-9-]{2,28}$/
const URL_RE = /^https?:\/\/[^\s]{4,300}$/i
const CLONE_TYPES = ['portfolio', 'cv', 'bundle']

const str = (v, max = 160) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const money = (v) => {
  const n = Math.round(Number(v) * 100) / 100
  return Number.isFinite(n) && n >= MIN_PRICE && n <= MAX_PRICE ? n : null
}

/**
 * تنقية ما يصل من اللوحة: لا حقول خارج القائمة، ولا سعر مكسور، ولا رابط
 * ليس http(s). الأخطاء تُرجَع رسالةً واضحة بدل ما تُبتلع.
 */
export function sanitize(patch = {}, { isNew = false } = {}) {
  const out = {}
  const errors = {}
  // لا نقرأ إلا ما في EDITABLE (زائد حقول الهوية عند الإضافة) — أي مفتاح آخر يُتجاهل
  const src = patch && typeof patch === 'object' ? patch : {}

  if ('price' in src) {
    const p = money(src.price)
    if (p == null) errors.price = 'price'
    else out.price = p
  }
  if ('oldPrice' in src) {
    if (src.oldPrice === '' || src.oldPrice == null) out.oldPrice = null
    else {
      const p = money(src.oldPrice)
      if (p == null) errors.oldPrice = 'price'
      else out.oldPrice = p
    }
  }
  if ('download' in src) {
    const u = str(src.download, 300)
    if (!u) out.download = null
    else if (URL_RE.test(u) || protectedPathOk(u)) out.download = u
    else errors.download = 'url'
  }
  if ('published' in src) out.published = src.published !== false && src.published !== 'false'
  if ('featured' in src) out.featured = src.featured === true || src.featured === 'true'
  for (const k of ['nameAr', 'nameEn', 'taglineAr', 'taglineEn', 'cat']) {
    if (k in src) out[k] = str(src[k], k === 'cat' ? 24 : 160)
  }

  if (isNew) {
    const id = str(src.id, 28).toLowerCase()
    if (!ID_RE.test(id)) errors.id = 'id'
    else out.id = id
    if (!CLONE_TYPES.includes(src.type)) errors.type = 'type'
    else out.type = src.type
    if (out.price == null) errors.price = errors.price || 'price'
  }
  return { out, errors }
}

/** منتج واحد + استثنائه (النتيجة تحمل published ليقررها المستدعي) */
function withOverride(t, ov = {}) {
  if (!ov) return { ...t, published: true, edited: false, custom: false }
  return {
    ...t,
    price: ov.price ?? t.price,
    oldPrice: ov.oldPrice === null ? undefined : (ov.oldPrice ?? t.oldPrice),
    download: 'download' in ov ? ov.download : t.download || null,
    featured: 'featured' in ov ? !!ov.featured : !!t.featured,
    cat: ov.cat || t.cat,
    name: { ...t.name, ar: ov.nameAr || t.name.ar, en: ov.nameEn || t.name.en },
    tagline: { ...t.tagline, ar: ov.taglineAr || t.tagline.ar, en: ov.taglineEn || t.tagline.en },
    published: ov.published !== false,
    edited: Object.keys(ov).some((k) => !['custom', 'clone', 'type', 'id', 'published'].includes(k) || k === 'published'),
    custom: false,
  }
}

function customRecord(id, ov) {
  const parent = PRISTINE.find((t) => t.id === ov.clone) || PRISTINE.find((t) => t.type === ov.type) || PRISTINE[0]
  return {
    ...parent,
    id,
    slug: id,
    type: ov.type || parent.type,
    price: ov.price ?? parent.price,
    oldPrice: ov.oldPrice || undefined,
    download: ov.download || null,
    cat: ov.cat || parent.cat,
    featured: !!ov.featured,
    name: { ar: ov.nameAr || id, en: ov.nameEn || id },
    tagline: { ar: ov.taglineAr || '', en: ov.taglineEn || '' },
    published: ov.published !== false,
    edited: true,
    custom: true,
  }
}

const customOnly = (id, ov) => (ov?.custom ? { ...customRecord(id, ov) } : null)

/** الكتالوج الفعلي: المصدر + الاستثناءات، بلا المخفيّ، مرتّبًا كما هو */
export function effective(overrides = {}) {
  const base = PRISTINE.map((t) => withOverride(t, overrides[t.id]))
  const extra = Object.entries(overrides)
    .map(([id, ov]) => customOnly(id, ov))
    .filter(Boolean)
  return [...base, ...extra].filter((t) => t.published)
}

/** كل ما تحتاجه اللوحة لعرض منتج: بياناته + استثناءه (حتى المخفيّ) + هل هو معدَّل؟ */
export function adminRows(overrides = {}) {
  const base = PRISTINE.map((t) => {
    const m = withOverride(t, overrides[t.id])
    return {
      id: t.id,
      slug: t.slug,
      type: t.type,
      name: m.name,
      tagline: m.tagline,
      price: m.price,
      basePrice: t.price,
      oldPrice: m.oldPrice ?? null,
      download: m.download || null,
      cat: m.cat,
      featured: !!m.featured,
      published: m.published,
      edited: !!overrides[t.id],
      custom: false,
    }
  })
  const extra = Object.entries(overrides)
    .filter(([, ov]) => ov?.custom)
    .map(([id, ov]) => {
      const m = customRecord(id, ov)
      return {
        id,
        slug: id,
        type: m.type,
        name: m.name,
        tagline: m.tagline,
        price: m.price,
        basePrice: null,
        oldPrice: m.oldPrice ?? null,
        download: m.download || null,
        cat: m.cat,
        featured: !!m.featured,
        published: ov.published !== false,
        edited: true,
        custom: true,
      }
    })
  return [...base, ...extra]
}

/** جدول الأسعار الذي يثق به الخادم: المنشور فقط — فالمخفيّ لا يُشترى */
export function priceTable(overrides = {}) {
  return Object.fromEntries(effective(overrides).map((t) => [t.id, t.price]))
}

let version = 0

/**
 * يطبّق الاستثناءات على مصفوفة templates نفسها (التي يقرأها كل المسارات
 * عبر byId/bySlug)، فيرى المتجر التعديل بلا إعادة بناء.
 * تُترك المصفوفة كما هي حين لا توجد تعديلات — لا إعادة رسم بلا سبب.
 */
export function applyOverlay(overrides = {}) {
  const has = overrides && Object.keys(overrides).length > 0
  if (!has) {
    if (templates.length !== PRISTINE.length || version > 0) {
      templates.length = 0
      templates.push(...PRISTINE.map((t) => ({ ...t })))
      version++
    }
    return { version, count: templates.length }
  }
  const list = effective(overrides)
  templates.length = 0
  templates.push(...list)
  version++
  return { version, count: list.length }
}

export const catalogVersion = () => version
