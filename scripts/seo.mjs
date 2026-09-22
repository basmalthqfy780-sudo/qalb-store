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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUB = path.join(ROOT, 'public')

loadDotEnv(ROOT) // النطاق والمفاتيح من .env إن وُجد (node لا يقرأه وحده)

const SITE = (process.env.SITE_URL || 'https://qalb.store').replace(/\/+$/, '')
const { templates, PALETTE } = await import(path.join(ROOT, 'src/data/templates.js'))
const dict = (await import(path.join(ROOT, 'src/i18n/translations.js'))).default

mkdirSync(PUB, { recursive: true })

/* ---------------- robots.txt و llms.txt: أصولُ القراءة الآلية ---------------- */
const agents = await import(path.join(ROOT, 'scripts/agents.mjs'))
writeFileSync(path.join(PUB, 'robots.txt'), agents.buildRobots({ site: SITE }))
writeFileSync(path.join(PUB, 'llms.txt'), await agents.buildLlms({ site: SITE }))

/* ---------------- sitemap.xml ---------------- */
const { posts } = await import(path.join(ROOT, 'src/data/posts.js'))
const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: '/', pri: '1.0', freq: 'daily' },
  { loc: '/templates', pri: '0.9', freq: 'daily' },
  { loc: '/wishlist', pri: '0.3', freq: 'weekly' },
  { loc: '/track', pri: '0.5', freq: 'monthly' },
  { loc: '/licence', pri: '0.5', freq: 'monthly' },
  { loc: '/legal', pri: '0.3', freq: 'yearly' },
  { loc: '/host', pri: '0.8', freq: 'weekly' },
  { loc: '/ats', pri: '0.9', freq: 'weekly' },
  { loc: '/b2b', pri: '0.8', freq: 'monthly' },
  { loc: '/blog', pri: '0.8', freq: 'weekly' },
  ...templates.map((t) => ({ loc: `/template/${t.slug}`, pri: t.featured ? '0.9' : '0.8', freq: 'weekly' })),
  ...posts.map((p) => ({ loc: `/blog/${p.slug}`, pri: '0.7', freq: 'monthly' })),
]
// كل مسار يعلن نسختيه: hreflang في الخريطة يطابق ما يكتبه Seo.jsx في كل صفحة،
// وcanonical هو الرابط ar نفسه — فلا يرى البحث ثلاث نسخ من الحقيقة.
const alternates = (loc) =>
  [
    `    <xhtml:link rel="alternate" hreflang="ar" href="${loc}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${loc}?lang=en"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`,
  ].join('\n')
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...urls.map((u) => {
    const loc = `${SITE}${u.loc}`
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
if (py.status !== 0) console.warn('og-cover: تخطّي —', (py.stderr || py.stdout).trim().split('\n').pop())

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
if (cards.status !== 0) console.warn('og/ بطاقات: تخطّي —', (cards.stderr || cards.stdout).trim().split('\n').pop())

/* ---------------- index.html meta block (idempotent) ---------------- */
// الكتلة بين العلامتين تُعاد كتابتها مع كل بناء، فيصحّح SITE_URL الجديد
// og:image وcanonical وhreflang دفعةً واحدة بدل أن تبقى أقدم قيمة كُتبت يومًا.
const htmlPath = path.join(ROOT, 'index.html')
let html = readFileSync(htmlPath, 'utf8')
const block = [
  `    <!-- seo:generated:start — يجدّده scripts/seo.mjs مع كل بناء (SITE_URL)، لا تكتب هنا يدويًا -->`,
  `    <meta property="og:type" content="website" />`,
  `    <meta property="og:site_name" content="Qalb · قالب" />`,
  `    <meta property="og:url" content="${SITE}/" />`,
  `    <meta property="og:image" content="${SITE}/og-cover.png" />`,
  `    <meta property="og:image:width" content="1200" />`,
  `    <meta property="og:image:height" content="630" />`,
  `    <meta name="twitter:image" content="${SITE}/og-cover.png" />`,
  `    <link rel="canonical" href="${SITE}/" />`,
  `    <link rel="alternate" hreflang="ar" href="${SITE}/" />`,
  `    <link rel="alternate" hreflang="en" href="${SITE}/?lang=en" />`,
  `    <link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
  `    <!-- seo:generated:end -->`,
].join('\n')
const genRe = /[ \t]*<!-- seo:generated:start[\s\S]*?<!-- seo:generated:end -->/
if (genRe.test(html)) html = html.replace(genRe, block)
else html = html.replace(/(\n\s*<link\s*\n\s*rel="icon")/, `\n${block}$1`) // أول تهيئة فقط
writeFileSync(htmlPath, html)

console.log(
  `seo: ${urls.length} urls in sitemap · robots.txt (${agents.AI_AGENTS.length} AI agents allowed) · llms.txt · og-cover.png=${rasterized ? 'ok' : 'skipped (no pillow)'} · public/og=${ogCount} بطاقات`,
)
