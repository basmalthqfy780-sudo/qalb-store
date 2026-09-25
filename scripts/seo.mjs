#!/usr/bin/env node
/**
 * يولّد أصول الظهور العام: robots.txt و sitemap.xml و og-cover.png.
 *   node scripts/seo.mjs
 *   SITE_URL=https://mydomain.com node scripts/seo.mjs
 * يعمل تلقائيًا قبل `npm run build` (انظر package.json → prebuild).
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { loadDotEnv } from './dotenv.mjs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
// بناءُ الروابط الخام: الدالةُ نفسها التي تستعملها الواجهة (src/data/links.js)
// — فلا يخرج من هنا قوسُ Markdown في sitemap ولا في canonical ولا في og:image.
import { rawUrl, rawSite, markdownLines } from '../src/data/links.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUB = path.join(ROOT, 'public')

loadDotEnv(ROOT) // النطاق والمفاتيح من .env إن وُجد (node لا يقرأه وحده)

// `rawSite` ينزع صيغة Markdown ويضيف https إن غابت ويحذف الشرطة الأخيرة — فقيمةُ
// `SITE_URL` الملصوقة من محرّر Markdown (`[https://x](https://x)`) تُصلَّح مرةً واحدة.
const SITE = rawSite(process.env.SITE_URL || 'https://qalb.store')
/** كلُّ رابطٍ في هذا الملف: مسارٌ نسبي ← رابطٌ مطلق خام. */
const abs = (loc) => rawUrl(loc, SITE)
const { templates, PALETTE } = await import(path.join(ROOT, 'src/data/templates.js'))
const dict = (await import(path.join(ROOT, 'src/i18n/translations.js'))).default

mkdirSync(PUB, { recursive: true })

/* ---------------- robots.txt و llms.txt: أصولُ القراءة الآلية ---------------- */
const agents = await import(path.join(ROOT, 'scripts/agents.mjs'))
const robotsTxt = agents.buildRobots({ site: SITE })
const llmsTxt = await agents.buildLlms({ site: SITE })
writeFileSync(path.join(PUB, 'robots.txt'), robotsTxt)
writeFileSync(path.join(PUB, 'llms.txt'), llmsTxt)

/* ---------------- sitemap.xml ---------------- */
const { posts } = await import(path.join(ROOT, 'src/data/posts.js'))
const { offers } = await import(path.join(ROOT, 'src/data/offers.js'))
const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: '/', pri: '1.0', freq: 'daily' },
  { loc: '/templates', pri: '0.9', freq: 'daily' },
  { loc: '/wishlist', pri: '0.3', freq: 'weekly' },
  { loc: '/track', pri: '0.5', freq: 'monthly' },
  { loc: '/licence', pri: '0.5', freq: 'monthly' },
  { loc: '/legal', pri: '0.3', freq: 'yearly' },
  // الفوتر القانوني: كلُّ صفحةٍ بمسارها منذ v1.8.0
  { loc: '/terms', pri: '0.3', freq: 'yearly' },
  { loc: '/privacy', pri: '0.3', freq: 'yearly' },
  { loc: '/refunds', pri: '0.3', freq: 'yearly' },
  { loc: '/licensing', pri: '0.3', freq: 'yearly' },
  { loc: '/contact', pri: '0.3', freq: 'yearly' },
  { loc: '/host', pri: '0.8', freq: 'weekly' },
  { loc: '/ats', pri: '0.9', freq: 'weekly' },
  // منظومةُ التوظيف: مطابقةُ الإعلان، ملفُّ التقديم، الرابط المهني (صفحةٌ واحدة لكلِّ
  // رابط، تُكتشف من صفحة الدليل لا من الخريطة)، دليل المواهب، تقرير السوق، والفاحص المضمّن
  { loc: '/match', pri: '0.9', freq: 'weekly' },
  { loc: '/kit', pri: '0.8', freq: 'weekly' },
  { loc: '/talent', pri: '0.7', freq: 'weekly' },
  { loc: '/market', pri: '0.6', freq: 'monthly' },
  { loc: '/embed', pri: '0.8', freq: 'monthly' },
  { loc: '/b2b', pri: '0.8', freq: 'monthly' },
  // نموذج الربح: الخطط الموحّدة والسوق عامة؛ `/account` و`/sell` خاصّتان (noindex)،
  // و`/create` مؤجَّلٌ في v1.8.0 فليس في الخريطة
  { loc: '/pricing', pri: '0.9', freq: 'weekly' },
  // النمو: صفحة القالب المجاني — صفحة هبوط لها زوّارها من البحث، فتُفهرس
  { loc: '/free', pri: '0.7', freq: 'monthly' },
  { loc: '/creators', pri: '0.8', freq: 'daily' },
  { loc: '/services', pri: '0.8', freq: 'monthly' },
  { loc: '/offers', pri: '0.8', freq: 'weekly' },
  { loc: '/blog', pri: '0.8', freq: 'weekly' },
  ...templates.map((t) => ({ loc: `/template/${t.slug}`, pri: t.featured ? '0.9' : '0.8', freq: 'weekly' })),
  ...posts.map((p) => ({ loc: `/blog/${p.slug}`, pri: '0.7', freq: 'monthly' })),
  // صفحات المواسم — من بيانات offers.js كما تدخل الصفحات نفسها، فلا تنجوّ صفحةٌ عن الخريطة
  ...offers.map((o) => ({ loc: `/offers/${o.slug}`, pri: '0.7', freq: 'monthly' })),
]
// كل مسار يعلن نسختيه: hreflang في الخريطة يطابق ما يكتبه Seo.jsx في كل صفحة،
// وcanonical هو الرابط ar نفسه — فلا يرى البحث ثلاث نسخ من الحقيقة.
const alternates = (loc) =>
  [
    `    <xhtml:link rel="alternate" hreflang="ar" href="${loc}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${abs(`${loc}?lang=en`)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`,
  ].join('\n')
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...urls.map((u) => {
    const loc = abs(u.loc)
    return `  <url>\n    <loc>${loc}</loc>\n${alternates(loc)}\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  }),
  '</urlset>',
  '',
].join('\n')
writeFileSync(path.join(PUB, 'sitemap.xml'), xml)

// البطاقة تُرسم بـ Pillow (تشكيل عربي صحيح)؛ لا نستخدم ImageMagick لأن
// MSVG يفقد النصوص العربية المختلطة بالأرقام/Latin.
const py = spawnSync('python3', [path.join(ROOT, 'scripts', 'og-cover.py')], { encoding: 'utf8' })
const rasterized = py.status === 0 && existsSync(path.join(PUB, 'og-cover.png'))
/**
 * سببُ التخطي كما قاله بايثون فعلًا — لا «no pillow» عامةً مهما كان النقص.
 * (كان التلخيص القديم يطبع «no pillow» والناقصُ `arabic_reshaper`، فيبحث
 * المشغّل عن علةٍ غير الموجودة وتبقى البطاقات قديمة.)
 */
const ogWhy =
  py.status === 0
    ? ''
    : String(py.stderr || py.stdout || '')
        .trim()
        .split('\n')
        .pop()
if (py.status !== 0) console.warn('og-cover: تخطّي —', ogWhy)

/* ---------------- per-template social cards (public/og/<slug>.png) ---------------- */
const hexOf = (id) => (PALETTE.find((c) => c.id === id) || PALETTE[3]).hex
/** نفس قاعدة المتجر: أرقام هندية في البطاقة العربية (لا 249 بل ٢٤٩). */
const arNum = (v) => String(v).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)))
const rows = templates.map((x) => ({
  slug: x.slug,
  name: x.name.ar,
  tagline: x.tagline.ar,
  priceLabel: `${arNum(x.price)} ر.س`,
  oldLabel: x.oldPrice ? `${arNum(x.oldPrice)} ر.س` : '',
  discount: x.oldPrice ? `خصم ${arNum(Math.round((1 - x.price / x.oldPrice) * 100))}٪` : '',
  ratingLabel: x.rating ? `★ ${arNum(x.rating)} · ${arNum(x.reviews || 0)} تقييمًا` : '',
  bestLabel: x.best ? dict.ar.card.best : '',
  typeLabel: dict.ar.types[x.type],
  theme: x.theme || 'light',
  type: x.type,
  accent: hexOf(x.accent),
}))
const cards = spawnSync('python3', [path.join(ROOT, 'scripts', 'og-cover.py'), '--cards'], {
  encoding: 'utf8',
  input: JSON.stringify(rows),
})
const ogCount = cards.status === 0 ? rows.length : 0
const cardsWhy =
  cards.status === 0
    ? ''
    : String(cards.stderr || cards.stdout || '')
        .trim()
        .split('\n')
        .pop()
if (cards.status !== 0) console.warn('og/ بطاقات: تخطّي —', cardsWhy)

/* ---------------- index.html meta block (idempotent) ---------------- */
// الكتلة بين العلامتين تُعاد كتابتها مع كل بناء، فيصحّح SITE_URL الجديد
// og:image وcanonical وhreflang دفعةً واحدة بدل أن تبقى أقدم قيمة كُتبت يومًا.
const htmlPath = path.join(ROOT, 'index.html')
let html = readFileSync(htmlPath, 'utf8')
const home = abs('/')
const cover = abs('/og-cover.png')
const block = [
  `    <!-- seo:generated:start — يجدّده scripts/seo.mjs مع كل بناء (SITE_URL)، لا تكتب هنا يدويًا -->`,
  `    <meta name="robots" content="index, follow" />`,
  `    <meta property="og:type" content="website" />`,
  `    <meta property="og:site_name" content="Qalb · قالب" />`,
  `    <meta property="og:url" content="${home}" />`,
  `    <meta property="og:image" content="${cover}" />`,
  `    <meta property="og:image:width" content="1200" />`,
  `    <meta property="og:image:height" content="630" />`,
  `    <meta name="twitter:image" content="${cover}" />`,
  `    <link rel="canonical" href="${home}" />`,
  `    <link rel="alternate" hreflang="ar" href="${home}" />`,
  `    <link rel="alternate" hreflang="en" href="${abs('/?lang=en')}" />`,
  `    <link rel="alternate" hreflang="x-default" href="${home}" />`,
  `    <!-- seo:generated:end -->`,
].join('\n')
const genRe = /[ \t]*<!-- seo:generated:start[\s\S]*?<!-- seo:generated:end -->/
if (genRe.test(html)) html = html.replace(genRe, block)
else html = html.replace(/(\n\s*<link\s*\n\s*rel="icon")/, `\n${block}$1`) // أول تهيئة فقط
writeFileSync(htmlPath, html)

/* ---------------- حاجزُ الصيغة: لا Markdown في ملفٍّ مولَّد ---------------- */
// نفسُ فكرة «لا رقمَ بلا سند»: لا ملفَّ ظهورٍ يحمل `[نص](رابط)` — لأن الوسمَ
// يقرأه محرّك بحث لا محرّر Markdown. أيُّ تسرّبٍ يوقف البناء ويقول مكانه بالضبط.
for (const [name, text] of [
  ['sitemap.xml', xml],
  ['llms.txt', llmsTxt],
  ['robots.txt', robotsTxt],
  ['index.html', html],
]) {
  const bad = markdownLines(text)
  if (bad.length) {
    console.error(`✗ ${name}: صيغةُ Markdown في ${bad.length} سطرًا — أولها:\n   ${bad[0].trim().slice(0, 120)}`)
    process.exit(1)
  }
}

console.log(
  `seo: ${urls.length} urls in sitemap · robots.txt (${agents.AI_AGENTS.length} AI agents allowed) · llms.txt · روابطُ خام بلا Markdown · og-cover.png=${rasterized ? 'ok' : `skipped — ${ogWhy}`} · public/og=${ogCount} بطاقات${ogCount ? '' : cardsWhy ? ` — ${cardsWhy}` : ''}`,
)
