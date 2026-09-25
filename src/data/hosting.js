/**
 * الاستضافة بالاشتراك — مصدر واحد للمتجر والخادم.
 *
 * الفكرة: بدل أن يأخذ المشتري ملفًا ويمشي، يعبّي بياناته هنا فيستضيفها المتجر على
 * `اسمه.qalb.store` وتُبنى صفحته من **نفس** مولّدات الحزمة في `src/data/deliverable.js`
 * (`profileFor` ثم `siteHtml`/`siteCssFor`/`resumeFor`). لا نسخة ثانية من القالب للعرض:
 * ما يراه على الرابط هو ما ينزل في الـZIP، وحقل واحد يحرّك الاثنين.
 *
 * الخطة تُترجم إلى سلوك لا إلى كلام: `free` تحمل شريط العلامة أدناه وسقف تعديلات
 * شهريًا يُحتسب فعلًا، و`pro` تُسقط الشريط وتفتح النطاق الخاص وتُلغي السقف.
 * وسعرُ الدرجة المدفوعة مقروءٌ من جدول الاشتراكات الموحّد (src/data/plans.js) لا
 * مكتوبٌ هنا: فلا يُعرض سعرُ الاستضافة برقمٍ ويُعرض سعرُ الاشتراك برقمٍ آخر.
 */
import { PERSONAL_LIMITS, kindOf, profileFor, resumeFor, sanitizePersonal, siteCssFor, siteHtml } from './deliverable.js'
import { byId, templates } from './templates.js'
import { priceOf as tierPrice } from './plans.js'
import { BADGE_ID, SITE_HOME, badgeState, badgeText } from './badge.js'

export const HOST_ROOT = 'qalb.store'
// كل حقل هنا يجب أن يحرّك شيئًا في المولّد: `heading` حُذف لأنه لا يقرأه أحد،
// و`city` بقي لأنه يصل إلى `profileFor` ثم إلى ترويسة الصفحة.
export const HOST_FIELDS = ['name', 'role', 'email', 'phone', 'website', 'bio', 'city']
/** سقوف الحقول: نفس سقوف التخصيص، ويُضاف لها المدينة — تُطبَّق في المتجر والخادم معًا */
export const HOST_LIMITS = { ...PERSONAL_LIMITS, city: 60 }

/**
 * Single Source of Truth: الأسعار تُقرأ حيًا من src/data/plans.js عبر priceOf()
 * لا أرقام مكررة هنا — أي تغيير في PLANS هناك ينعكس فورًا في الاستضافة والفواتير.
 */
export const PLANS = {
  free: {
    id: 'free',
    name: { ar: 'مجاني', en: 'Free' },
    get price() {
      return tierPrice('free')
    },
    period: null,
    brand: true,
    domain: false,
    editQuota: 10,
    note: {
      ar: 'رابط فرعي + سطر «صُنع بواسطة Qalb Store» + ١٠ تعديلات شهريًا',
      en: 'Subdomain, a “Made with Qalb Store” credit line, 10 edits a month',
    },
  },
  pro: {
    id: 'pro',
    name: { ar: 'Qalb Pro', en: 'Qalb Pro' },
    get price() {
      return tierPrice('pro')
    },
    period: 'month',
    brand: false,
    domain: true,
    editQuota: null,
    note: {
      ar: 'نطاقك الخاص، بلا شريط علامة، تعديلات بلا سقف، ورقة A4 للطباعة أو الحفظ PDF',
      en: 'Your own domain, no branding bar, unlimited edits, an A4 sheet to print or save as PDF',
    },
  },
}

export const planOf = (v) => (v === 'pro' ? 'pro' : 'free')
export const priceOf = (v) => PLANS[planOf(v)].price

/** حرف لاتيني واحد لكل حرف عربي: اسمك يصبح رابطك، ومن لا اسم لاتيني له يأخذ رابطًا رمزياً. */
const AR_LATIN = {
  أ: 'a',
  إ: 'i',
  آ: 'aa',
  ا: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'zh',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'ou',
  ي: 'i',
  ى: 'a',
  ة: 'a',
  ء: '',
  ؤ: 'o',
  ئ: 'e',
}

/** `نورة الحربي` → `noura-alharbi` · لا نقاط ولا شرطة الطرفين ولا طول فوق 32 */
export function slugify(input) {
  const raw = String(input == null ? '' : input)
  const latin = Array.from(raw)
    .map((c) => (AR_LATIN[c] != null ? AR_LATIN[c] : c))
    .join('')
    .replace(/^ou(?=[a-z])/, 'w') // واو البداية ساكنة: وزارة → wazara، ونورة → noura
    .toLowerCase()
    .replace(/[’'`.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '')
  return /^[a-z0-9][a-z0-9-]{1,31}$/.test(latin) ? latin : ''
}

export const SUB_RE = /^[a-z0-9][a-z0-9-]{1,31}$/
export const subOf = (site) => (site && site.slug ? `${site.slug}.${HOST_ROOT}` : null)
export const pathOf = (site) => (site && site.slug ? `/s/${site.slug}` : null)

/** رابط الموقع العام: النطاق الخاص إن كان مفعّلًا وخطة تسمح، وإلا الرابط الفرعي */
export function publicUrl(site) {
  if (!site) return null
  const plan = PLANS[planOf(site.plan)]
  return plan.domain && site.domain ? `https://${site.domain}` : `https://${subOf(site)}`
}

const clean = (v, max) => {
  const one = Array.from(String(v == null ? '' : v))
    .map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
  // وسومًا من أي نوع لا تُطبع: الحقل كله يُرفض، فلا نسخة مشوَّهة تُسلَّم للناس
  return /[<>]/.test(one) ? '' : one
}

/**
 * تنقية ما يقبله الاستوديو. تُستعمل في المتصفح والخادم معًا، فلا يختلف ما يُعرض عمّا
 * يُرسَل. حقول الهوية تمرّ عبر `sanitizePersonal` نفسه الذي يبني الحزمة — تنقية واحدة.
 */
export function sanitizeSite(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const id = sanitizePersonal({ on: true, ...src }) // الاسم/المسمى/البريد/الجوال/الرابط/النبذة بنفس السقوف
  const out = {}
  for (const k of ['name', 'role', 'email', 'phone', 'website', 'bio']) if (id && id[k]) out[k] = id[k]
  const city = clean(src.city, HOST_LIMITS.city)
  if (city) out.city = city
  const theme = src.theme === 'light' ? 'light' : 'dark'
  out.theme = theme
  const lang = src.lang === 'en' ? 'en' : 'ar'
  out.lang = lang
  const tpl = tplOf(src.template)
  // قالب غير معروف يُرفض ولا يُستبدل بصامت: وإلا دفع المشتري لـ«aether» وهو ظنّ أنه اشترى غيره
  out.template = tpl ? tpl.id : null
  return out
}

/** أي حقلٍ طُلب تعديله ولا يقبله المنقِّي = لن يُطبع: يُقال في الاستوديو لا بعد النشر */
export function droppedSiteFields(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const clean_ = sanitizeSite(src)
  return HOST_FIELDS.filter((k) => String(src[k] || '').trim() && !clean_[k])
}

/** المفتاح الذي يحرّر تعديلات شهرًا: `YYYY-MM` بالتقويم الميلادي، بلا ساعة ولا منطقة زمنية */
export const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

/** سقف التعديلات: مجاني ١٠ في الشهر، و«بلس» بلا سقف — والعدد المُستعمل مخزَّن لا مرسوم */
export function editWindow(site, at = new Date()) {
  const plan = PLANS[planOf(site && site.plan)]
  const mk = monthKey(at)
  const used = site && site.editMonth === mk ? Number(site.editCount) || 0 : 0
  const max = plan.editQuota
  return {
    month: mk,
    used,
    max: max == null ? null : max,
    left: max == null ? null : Math.max(0, max - used),
    canEdit: max == null ? true : used < max,
  }
}

/**
 * شريط العلامة أسفل كل صفحة منشورة: سطر «صُنع بواسطة Qalb Store» برابطٍ نشط إلى
 * الصفحة الرئيسية للمتجر. موجودٌ في المجاني، يُسقطه اشتراكُ Pro تلقائيًا، وتُسقطه
 * رخصة White-label المقلوبة على سجلّ الموقع (`brandOff`) — والقرارُ كله في
 * `badgeState` لا هنا: لا يُقرَّر بالذوق بل بالخطة والرخصة.
 */
export function brandBar(site) {
  const lang = recLang(site)
  if (!badgeState({ plan: planOf(recPlan(site)), addons: recBadges(site) }).shown) return ''
  // الشارة رابطان لا رابط: الأولى هي الشارة نفسها — نصُّها من badgeText وعنوانها
  // الصفحة الرئيسية للمتجر — والثانية دعوةٌ صريحة للزائر — «أنشئ نسختك» إلى
  // الكتالوج حيث يختار قالبًا ويبني صفحته مجانًا. كان الرابط /create قبل v1.8.0،
  // فلما أُزيل المُنشئ صار المسار يحوّل إلى /templates — فالقصدُ مكتوبٌ لا رابطٌ
  // يتبع تحويلًا. كل صفحة منشورة تحمل بابًا، ومن يدفع خطة Pro أو رخصة White-label
  // تُسقطه `brandBar` نفسها.
  const home = `<a href="${SITE_HOME}" target="_blank" rel="noopener"><b>${badgeText(lang)}</b></a>`
  const cta =
    lang === 'en'
      ? `<a href="${SITE_HOME}/templates" target="_blank" rel="noopener"><b>Build your own, free</b></a>`
      : `<a href="${SITE_HOME}/templates" target="_blank" rel="noopener"><b>أنشئ نسختك مجانًا</b></a>`
  return `<div class="qalb-brand" style="position:fixed;inset-inline:0;bottom:0;z-index:99;display:flex;justify-content:center;gap:.5rem;align-items:center;padding:.45rem .8rem;font:600 12px/1.4 system-ui;background:#0a0c11e6;color:#e8ebf2;border-top:1px solid #242b3a">${home} · ${cta}</div>`
}

/** نصّ رفض التعديل الزائد: يقوله الخادم وواجهته من مكان واحد، فلا يختلف الكلامان */
export function quotaNotice(w) {
  return {
    ar: `انتهت تعديلات هذا الشهر (${w.max}). تُصفَّر العدّادة مع الشهر الجديد، أو انتقل إلى «Qalb Pro» بتعديلات بلا سقف.`,
    en: `No edits left this month (${w.max}). The counter resets next month, or move to Qalb Pro for unlimited edits.`,
  }
}

/** القالب بالـid أو بالـslug: الاستوديو والخادم كلاهما يرسل أحدهما */
export const tplOf = (v) => byId(v) || templates.find((t) => t.slug === v) || null
/** السجلّ يحمل بياناته في `site.site`، وقد يُمرَّر كائن بيانات فقط —الاثنان مقبولان */
const recTpl = (rec) => (rec && rec.site && rec.site.template) || (rec && rec.template) || null
const recPlan = (rec) => (rec && rec.plan) || (rec && rec.site && rec.site.plan) || 'free'
const recLang = (rec) => (rec && rec.site && rec.site.lang) || (rec && rec.lang) || 'ar'
/** رخصة White-label مقلوبة على سجلّ الموقع تُمرَّر إلى badgeState كإضافةٍ مشتراة */
const recBadges = (rec) => (rec && rec.brandOff === true ? [BADGE_ID] : [])

/** بيانات المشتري → كائن الملف الشخصي الذي تبني منه المولّدات الصفحة */
export function profileOf(site) {
  const tpl = tplOf(recTpl(site))
  if (!tpl) return null
  const p = profileFor(tpl, kindOf(tpl), sanitizePersonal({ on: true, ...(site.site || {}) }))
  p.qalb = {
    template: tpl.id,
    slug: tpl.slug || null,
    kind: kindOf(tpl),
    seats: 1,
    price: tpl.price,
    hosted: true,
    subdomain: site && site.slug,
    plan: planOf(recPlan(site)),
    // الشارةُ في الفوتر: يُسقطها اشتراك Pro تلقائيًا، وتُسقطها رخصة White-label —
    // القرارُ من badgeState نفسه الذي يقرّر شريطَ العلامة، فلا اجتهادَ ثاني
    badge: badgeState({ plan: planOf(recPlan(site)), addons: recBadges(site) }).shown,
  }
  // المدينة حقل مفرد: يُطبع في اللغتين كما يُطبع الاسم
  if (site.site && site.site.city) p.city = { ar: site.site.city, en: site.site.city }
  if (site.site && site.site.theme) p.theme = site.site.theme === 'light' ? 'light' : 'dark'
  if (site.site && site.site.lang) p.lang = site.site.lang === 'en' ? 'en' : 'ar'
  p.dir = p.lang === 'ar' ? 'rtl' : 'ltr'
  return p
}

/**
 * ثلاث حارات تُقدَّم كلها من نفس البيانات: الصفحة، ورقة الـCV، وملف التنسيق.
 * لا بناء ثانٍ for الاستضافة: `siteHtml` نفسها التي تدخل الـZIP.
 */
export function renderSite(site, route = '/') {
  const tpl = tplOf(recTpl(site))
  if (!tpl) return { status: 404, type: 'text/plain; charset=utf-8', body: 'no such template' }
  const p = profileOf(site)
  const k = kindOf(tpl)
  const css = siteCssFor(tpl, p, k)
  const want = String(route || '/').replace(/\/+$/, '') || '/'
  if (want === '/styles.css')
    return { status: 200, type: 'text/css; charset=utf-8', body: css + `/* qalb · ${site.slug} · plan=${planOf(site.plan)} */` }
  if (want === '/cv' || want === '/resume') {
    if (k === 'site') return { status: 404, type: 'text/plain; charset=utf-8', body: 'this plan has no résumé sheet' }
    return { status: 200, type: 'text/html; charset=utf-8', body: withBrand(resumeFor(tpl, p).html, site) }
  }
  if (want === '/print' || want === '/print.html') {
    if (k === 'site') return { status: 404, type: 'text/plain; charset=utf-8', body: 'no résumé sheet to print' }
    return { status: 200, type: 'text/html; charset=utf-8', body: printSheet(resumeFor(tpl, p).html, site) }
  }
  if (want === '/' || want === '/index.html') {
    if (k === 'cv') return { status: 200, type: 'text/html; charset=utf-8', body: withBrand(resumeFor(tpl, p).html, site) }
    return { status: 200, type: 'text/html; charset=utf-8', body: withBrand(siteHtml(tpl, p), site) }
  }
  return { status: 404, type: 'text/plain; charset=utf-8', body: 'not found' }
}

const withBrand = (html, site) => {
  const bar = brandBar(site)
  return bar ? String(html).replace('</body>', `${bar}\n</body>`) : String(html)
}

/**
 * ورقة A4 للطباعة أو الحفظ PDF: نفس الـHTML بكتلة `@page` وشريط مخفي.
 * لا مكتبة PDF هنا ولا زعم بها — المتصفح هو من يكتب الملف، والسطر في الواجهة يقول هذا.
 */
/** ورقة الطبع: تُعاد كسلسلة HTML، ومن يغلّفها بالردّ هو renderSite وحده */
export function printSheet(html, site) {
  const css =
    `@page{size:A4;margin:14mm}` +
    `@media print{:root,.light{--c-bg:#fff;--c-bg2:#fff;--c-panel:#fff;--c-line:#c8ccd3;--c-text:#000;--c-dim:#3d4450}.qalb-brand{display:none!important}body{background:#fff!important}a{text-decoration:none}}`
  return withBrand(html, site).replace('</head>', `<style>${css}</style>\n</head>`)
}

/** هل يُقبل هذا المسار على الرابط الفرعي؟ (المسارات الثلاث فقط، لا قراءة ملف عشوائي) */
export const ROUTES = ['/', '/index.html', '/styles.css', '/cv', '/resume', '/print', '/print.html']
export const routeOk = (r) => ROUTES.includes(String(r || '/').replace(/\/+$/, '') || '/')

export default {
  HOST_FIELDS,
  HOST_LIMITS,
  HOST_ROOT,
  PLANS,
  ROUTES,
  SUB_RE,
  brandBar,
  droppedSiteFields,
  editWindow,
  monthKey,
  planOf,
  priceOf,
  printSheet,
  profileOf,
  publicUrl,
  quotaNotice,
  renderSite,
  routeOk,
  slugify,
  subOf,
  sanitizeSite,
}
