/**
 * بناءُ الروابط — نصٌّ خامٌ صريح، لا صيغةَ Markdown فيه.
 *
 * لماذا ملفٌّ ثالثٌ بجانب `site.js`؟ لأن `SITE_URL` وحدَه لا يمنع التسرّب:
 * قيمةٌ جاءت من `.env` بلصقِ رابطٍ من محرّر Markdown تصل هكذا
 * `[https://qalb-store.vercel.app](https://qalb-store.vercel.app)`، فتُكتب
 * حرفيةً في `<link rel="canonical">` وفي `sitemap.xml` — أي رابطٌ لا يفكّه
 * محرّك بحث ولا قارئ شاشة. القاعدة هنا واحدة، وكلُّ مَن يبني رابطًا يمرّ بها:
 *
 *   • `rawSite`  — نطاقٌ نظيف: يُنزَع Markdown، وتُضاف `https://` إن غابت،
 *                  ويُبقي المضيفَ وحدَه (المسار والاستعلام يسقطان).
 *   • `rawUrl`   — رابطٌ مطلق من مسارٍ أو رابط: يأخذ الرابطَ من أي صيغة
 *                  Markdown، ويُبقي الناتج خامًا بلا أقواسٍ ولا نجوم.
 *   • `rawText`  — نصٌّ عادي يُكتب في وسم description أو في llms.txt: يبقى
 *                  المعنى (نصُّ الرابط) ويسقط قوسُه.
 *
 * ولا يوجد هنا أي مُحوِّل Markdown (لا `marked()` ولا شبيهه): الدوالُ تُرجع
 * سلاسل نصّية خامًا، والفحص في `tests/smoke.mjs` يمنع رجوع الصيغة إلى أيّ ملفٍّ
 * مولَّد — في الـHTML وsitemap.xml وllms.txt معًا.
 */

/** النطاق الافتراضي — نفسُ ما في `src/data/site.js` قبل أي ضبطٍ من البيئة. */
export const DEFAULT_SITE = 'https://qalb.store'

/** [نص](رابط) — الصيغةُ التي كانت تتسرّب إلى الوسوم. */
const MD_LINK = /\[([^\]\n]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g
const MD_IMAGE = /!\[([^\]\n]*)\]\(\s*<?[^)\s>]+>?\s*\)/g
const MD_REF = /\[([^\]\n]*)\]\[[^\]\n]*\]/g

/**
 * ينزع صيغة Markdown من أي نصٍّ ويُبقي الكلمات وحدها.
 * يُستعمل للعناوين والأوصاف، فهو لا يلمس نصًّا عربيًّا عاديًّا.
 */
export function rawText(value) {
  return String(value ?? '')
    .replace(MD_IMAGE, '$1') // الصورة أولًا: وإلا بقي تعجّبُها وحدها
    .replace(MD_LINK, (_, label) => label.trim())
    .replace(MD_REF, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/**
 * نطاقٌ صريح: https، بلا شرطةٍ أخيرة، وبلا أي صيغة Markdown.
 * `rawSite('[https://x.app](https://x.app)/')` → `https://x.app`
 */
export function rawSite(site, fallback = DEFAULT_SITE) {
  let s = String(site ?? '').trim()
  // اللصقُ من محرّر Markdown: خُذ الرابطَ لا العنوان، ولو كان العنوانُ رابطًا فهو هو.
  s = s.replace(MD_LINK, (_, label, href) => (/^(https?:)?\/\//i.test(label.trim()) ? label.trim() : href))
  s = s
    .replace(/^<+|>+$/g, '')
    .replace(/^[`"']+|[`"']+$/g, '')
    .replace(/\/+$/, '')
    .trim()
  if (!s) return rawSite(fallback, DEFAULT_SITE)
  if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, '')}`
  // النطاقُ أصلٌ لا صفحة: `https://x.app/templates` ← `https://x.app`، وإلا صار
  // كلُّ مسارٍ يُبنى عليه مسارًا مزدوجًا (`/templates/templates`).
  const origin = s.match(/^(https?):\/\/([^/?#\s]+)/i)
  return origin ? `${origin[1].toLowerCase()}://${origin[2]}` : s
}

/**
 * رابطٌ مطلق نظيف من مسارٍ نسبي أو رابطٍ كامل أو صيغة Markdown.
 *   rawUrl('/templates', 'https://x.app')            → https://x.app/templates
 *   rawUrl('[https://x.app/t](https://x.app/t)')     → https://x.app/t
 *   rawUrl('templates', 'https://x.app')             → https://x.app/templates
 *   rawUrl('/t', 'https://x.app/deep/path')          → https://x.app/t
 */
export function rawUrl(value, site = DEFAULT_SITE) {
  const base = rawSite(site)
  let s = String(value ?? '').trim()
  // [نص](رابط): إن كان النصُّ نفسَه رابطًا فهو المقصود، وإلا فالرابطُ هو المقصود.
  s = s.replace(MD_LINK, (_, label, href) => (/^(https?:)?\/\/|^\/|^(mailto|tel):/i.test(label.trim()) ? label.trim() : href))
  s = s
    .replace(/^<+|>+$/g, '')
    .replace(/^[`"']+|[`"']+$/g, '')
    .trim()
  if (!s) return `${base}/`
  if (/^(mailto|tel):/i.test(s)) return s
  if (/^\/\//.test(s)) return `https:${s}`
  if (/^https?:\/\//i.test(s)) return s
  // نطاقٌ مكتوبٌ بلا مخطط (`x.app/templates`): لا يُلصق بالموقع فيصير مسارًا مزدوجًا
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(s)) return `https://${s}`
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`
}

/** الرابطُ المطلق لمسارٍ داخل الموقع نفسه — اسمٌ مقروء في مواضع الوسوم. */
export const absUrl = rawUrl
export const canonicalUrl = (path, site) => rawUrl(path || '/', site)

/** هل يحمل النصُّ صيغةَ رابط Markdown؟ — يُستعمل في الفحوص، لا في البناء. */
export const hasMarkdownLink = (value) => /\[[^\]\n]*\]\(\s*<?[^)\s>]+>?\s*\)/.test(String(value ?? ''))

/** أيُّ سطرٍ في ملفٍّ مولَّد ما زال يحمل صيغة Markdown؟ — لتقرير الفحص. */
export function markdownLines(text) {
  return String(text ?? '')
    .split('\n')
    .filter((line) => hasMarkdownLink(line))
}

export default { DEFAULT_SITE, rawSite, rawUrl, absUrl, canonicalUrl, rawText, hasMarkdownLink, markdownLines }
