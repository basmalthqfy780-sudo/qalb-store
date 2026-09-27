#!/usr/bin/env node
/**
 * نسخةٌ ثابتة لكل صفحة قالب — يقرؤها الزاحفُ الذي لا يشغّل JavaScript.
 *
 *   npm run build        (يشغّلها postbuild بعد vite build)
 *   node scripts/share-html.mjs
 *
 * العلّة: `index.html` وحدها تحمل وسومًا، وهي وسومُ الرئيسية. وكلُّ تخصيصٍ بعد
 * ذلك يجري في المتصفح (`src/components/Seo.jsx`) — أي بعد أن يكون واتساب أو X
 * أو تيليجرام قد قرأ البطاقة. فعشرون رابطَ قالبٍ تشارك عنوانَ الرئيسية وصورتها.
 *
 * ما يفعله هذا الملفّ: ينسخ `dist/index.html` — بعلاماتِ البناء نفسها، فتبقى
 * الأصولُ المجزّأة بأسمائها المُبصَّمة — إلى `dist/template/<slug>/index.html`
 * ويستبدل في الرأس العنوانَ والوصف ووسوم og/twitter وcanonical وhreflang بوسوم
 * القالب. المسارُ له أسبقيةٌ على إعادة الكتابة في Vercel وNetlify (الملفُّ
 * الموجود يُخدَم قبل قاعدة `/* → /index.html`)، والتطبيقُ يقلع من النسخة نفسها
 * فيُكمل الرسم. والقيمُ من `src/data/share-meta.js` — الوحدةِ التي تقرأ منها الصفحة
 * الحيّة أيضًا، فيقارن الفحصُ النسختين ولا يسمح بانجرافٍ بينهما.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDotEnv } from './dotenv.mjs'
import { rawSite } from '../src/data/links.js'
import { productShare } from '../src/data/share-meta.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
loadDotEnv(ROOT)

// النطاقُ من البيئة ثم الافتراضي — نفسُ قاعدة `scripts/seo.mjs` حرفًا بحرف،
// فلا يعلن canonical هنا نطاقًا آخر هناك.
const SITE = rawSite(process.env.SITE_URL || 'https://qalb.store')
const abs = (p) => `${SITE}${p.startsWith('/') ? '' : '/'}${p}`

const basePath = path.join(DIST, 'index.html')
if (!existsSync(basePath)) {
  // لا `exit 1`: الملفّ يُشغَّل من postbuild، ومن يشغّله يدويًا قبل البناء
  // يستحقّ سطرًا يقول السبب لا فشلًا لا يفهمه.
  console.log('share: لا dist/index.html — يُشغَّل بعد البناء (npm run build).')
  process.exit(0)
}

const { templates } = await import(path.join(ROOT, 'src/data/templates.js'))
const dict = (await import(path.join(ROOT, 'src/i18n/translations.js'))).default

/** بديلُ `t` خارج React: نفسُ صيغة القاموس `{var}` ونفسُ السقوط إلى العربية */
const tOf = (lang) => (key, vars) => {
  const d = lang === 'en' ? dict.en : dict.ar
  let out = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), d)
  if (typeof out !== 'string') out = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict.ar) || key
  return vars ? out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : out
}

/** وسمُ meta مفرد — يُبنى هنا لا من قالب نصّي، فيسهل قراءته وفحصه */
const meta = (attr, key, value) => `    <meta ${attr}="${key}" content="${value}" />`
const link = (rel, href, extra = '') => `    <link rel="${rel}" href="${href}"${extra ? ` ${extra}` : ''} />`

const base = readFileSync(basePath, 'utf8')
const genRe = /[ \t]*<!-- seo:generated:start[\s\S]*?<!-- seo:generated:end -->/

/** يحوّل نسخةً من الأساس: العنوان، والوصف، ووسومُ المشاركة، والكتلة المولَّدة */
function pageFor(share, lang, extraBlock = []) {
  let html = base
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${share.title}</title>`)
  // الوصفُ يظهر مرّتين (meta description و og:description) — كلاهما من نفس النصّ
  html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${share.desc}" />`)
  html = html.replace(/<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${share.title}" />`)
  html = html.replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${share.desc}" />`)
  // بطاقةُ twitter تُكتب مرةً واحدة: نسخةُ الأساس قبل الكتلة تُنزع، والوسمُ
  // الكامل يأتي داخل الكتلة المولَّدة (وإلا ظهر الوسم مرّتين)
  html = html.replace(/[ \t]*<meta name="twitter:card"[^>]*>\n?/, '')
  const ar = abs(share.path)
  const block = [
    `    <!-- seo:generated:start — كتبه scripts/share-html.mjs، ولا يُنقل يدويًا؛ المصدر src/data/share-meta.js -->`,
    meta('name', 'robots', 'index, follow'),
    meta('property', 'og:type', 'product'),
    meta('property', 'og:site_name', 'Qalb · قالب'),
    meta('property', 'og:url', ar),
    meta('property', 'og:image', abs(share.image)),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', share.title),
    meta('property', 'og:locale', lang === 'en' ? 'en_US' : 'ar_SA'),
    meta('property', 'og:locale:alternate', lang === 'en' ? 'ar_SA' : 'en_US'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', share.title),
    meta('name', 'twitter:description', share.desc),
    meta('name', 'twitter:image', abs(share.image)),
    meta('name', 'twitter:image:alt', share.title),
    link('canonical', ar),
    link('alternate', ar, 'hreflang="ar"'),
    link('alternate', `${ar}?lang=en`, 'hreflang="en"'),
    link('alternate', ar, 'hreflang="x-default"'),
    ...extraBlock,
    `    <!-- seo:generated:end -->`,
  ].join('\n')
  return genRe.test(html) ? html.replace(genRe, block) : html
}

let written = 0
for (const tpl of templates) {
  /*
   * نسخةٌ واحدة لكل قالب (بالعربية، وهي اللغة الافتراضية وx-default). أما
   * `?lang=en` فلا يغيّر الملفَّ الذي يُخدَم — الاستعلامُ لا يدخل في مسار
   * الملفّ — لكن المعاينةَ تبقى **بطاقةَ هذا القالب** لا بطاقةَ الرئيسية، وهو
   * المطلوب؛ وتبديلُ اللغة يجري في المتصفح كما يجري اليوم.
   */
  const share = productShare(tpl, 'ar', tOf('ar'))
  const dir = path.join(DIST, 'template', tpl.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), pageFor(share, 'ar'), 'utf8')
  written++
}

console.log(`share: ${written} صفحة ثابتة (لكل قالب نسخةٌ في dist/template/<slug>/) — الزاحفُ بلا JavaScript يقرأ بطاقتَه لا بطاقةَ الرئيسية.`)
