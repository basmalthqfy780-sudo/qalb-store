/**
 * ما يُسلَّم فعلًا لكل قالب.
 *
 * هذه الوحدة مصدر الحقيقة الوحيد للحزمة: يستوردها المتجر (يبني منها Blob في الوضع
 * المحلي `VITE_QALB_API=local`) ويستوردها الخادم (`server/deliver.js` في وضع REST).
 * فلا يمكن أن يتفاوت «ما ستستلمه» في الإيصال مع الملف المُرسَل فعليًا: الاثنان يخرجان
 * من نفس الدالة ومن نفس بيانات `templates.js`.
 *
 * كل حزمة تحمل:
 *   بيانات المشتري  ما كتبه في «تخصيص القالب» يُطبع داخل content/profile.json وindex.html
 *                    وresume.* — بعد تنقيته في sanitizePersonal (سطر واحد، بلا وسوم، بسقف طول).
 *   LICENSE.txt  رخصة مقيدة باسم المشتري ورقم طلبه ومفتاحه (مضادة لإعادة التوزيع).
 *   watermark    نفس المعرّفات في تعليق أعلى كل ملف نصي، فأي تسريب قابل للتتبّع.
 *   محتوى حيّ    بيانات العرض نفسها التي شاهدها المشتّر في معاينة الموقع.
 */
import { PALETTE, byId, demoFor, siteFor, accentHex, fontCss } from './templates.js'
import { ATS_LINKS, ATS_TARGET, atsRuleTable } from './ats-table.js'
import { zipStore } from './zip.js'
import { SUPPORT_MAIL } from './contact.js'
import { badgeHtml, badgeState } from './badge.js'

export const PROTECTED_PATH_RE = /^\/download\/[a-z0-9][a-z0-9-]{1,38}$/
/** مسار تنزيل محمي يقدّمه الخادم بعد التحقق من الطلب — يُقبل في حقل `download` بدل رابط عام يمكن مشاركته */
export const isProtectedDownload = (v) => typeof v === 'string' && PROTECTED_PATH_RE.test(v.trim())
/** الرابط المحمي صالح فقط لما له حزمة مولّدة فعلًا — فلا يُكتب مسار لا يقدّم شيئًا */
export const protectedPathOk = (v) => isProtectedDownload(v) && !!byId(v.trim().slice('/download/'.length))

export const kindOf = (tpl) => (tpl && tpl.type === 'cv' ? 'cv' : tpl && tpl.type === 'bundle' ? 'bundle' : 'site')

const BRAND_HEX = '#34d399'
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const pick = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) ? String(v[lang] || v.ar || v.en || '') : String(v == null ? '' : v))
const list = (v, lang) =>
  Array.isArray(v) ? v.map((x) => pick(x, lang)) : v && typeof v === 'object' ? (v[lang] || v.ar || v.en || []).map((x) => pick(x, lang)) : []
/** اسم ملف لاتيني آمن داخل الأرشيف؛ والعناوين العربية تصير case-N */
const slug = (s, i) => {
  const a = String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return a.length > 3 ? a : `case-${(i || 0) + 1}`
}

/** سطر التتبّع: يُطبع داخل كل ملف، فلا تُفصل النسخة المتداولة عن صاحبها */
export function markOf(order = {}) {
  const who = [order.name, order.email].filter(Boolean).join(' ')
  return [
    'Qalb · قالب — licensed deliverable',
    order.id ? `order ${order.id}` : 'unlicensed review copy',
    order.key ? `licence ${order.key}` : '',
    who ? `licensee ${who}` : '',
    order.date ? `issued ${order.date}` : '',
    'single-seat · not for resale or redistribution',
  ]
    .filter(Boolean)
    .join(' · ')
}

const commentFor = (path, text) => {
  if (/\.(json|map|txt)$/i.test(path)) return '' // لا تقبل التعليقات
  if (/\.css$/i.test(path)) return `/* ${text} */\n`
  if (/\.(js|mjs|cjs|jsx|ts|astro|vue|svelte)$/i.test(path)) return `// ${text}\n`
  if (/\.(md|html|xhtml|xml|svg|toml)$/i.test(path)) return `<!-- ${text} -->\n`
  if (/\.(ya?ml)$/i.test(path)) return `# ${text}\n`
  return `# ${text}\n`
}

/* =============================== الرخصة =============================== */

/**
 * رخصة مقيدة — الصلاحيات والممنوعات مكتوبة صراحة، ومعرّفات الطلب مطبوعة داخلها،
 * فتطابق أي نسخة متداولة مع سجلّ الطلبات يكفي لإثبات من أزال الترخيص.
 */
export function licenceText(tpl, order = {}) {
  const k = kindOf(tpl)
  const scope =
    k === 'cv'
      ? 'ملفّات السيرة وخطاب التقديم (resume.* و cover-letter.md)'
      : k === 'bundle'
        ? 'ملفّات الموقع مع ملفّات السيرة في حزمة واحدة'
        : 'ملفّات الموقع (index.html وملحقاتها)'
  const v = (x, fb) => x || fb || '—'
  return `رخصة استخدام قالب — Qalb (قالب)
Qalb single-seat licence — English follows the Arabic
${'='.repeat(68)}

صاحب الرخصة / Licensee .............. ${v(order.name)}
البريد / E-mail ...................... ${v(order.email)}
رقم الطلب / Order .................... ${v(order.id)}
مفتاح الرخصة / Licence key .......... ${v(order.key)}
تاريخ الإصدار / Issued .............. ${v(order.date)}
القالب / Template ................... ${pick(tpl.name, 'ar')} (${tpl.id}) — ${k === 'cv' ? 'سيرة ذاتية' : k === 'bundle' ? 'حزمة موقع + سيرة' : 'موقع بورتفوليو'}
نطاق الترخيص / Scope ................ ${scope}
المقاعد / Seats ................ 1 — رخصة مقعد واحد: أصل واحد تعمل عليه بحرية، مع نسخ احتياط لأجهزتك)

١) ما تسمح به الرخصة
   • استخدام القالب في مشروع واحد لك أو لعميل واحد، وتعديله بالكامل.
   • نشر الناتج على نطاقك، وحفظه في مستودع خاص.
   • استخدامه في ملفّات التقدّم الوظيفية الخاصة بك.
   1) You MAY use and modify this template for one project (yours or one client's),
      deploy the result on your own domain, keep it in a private repository, and use
      the CV files for your own job applications.

٢) ما لا تسمح به
   • بيع القالب أو تأجيره أو توزيعه كما هو أو بعد تعديله، أو نشره في سوق قوالب.
   • مشاركة رابط التنزيل أو الملف المضغوط أو مفتاح الرخصة مع غير المذكور أعلاه.
   • حذف LICENSE.txt أو سطر التتبّع في أعلى الملفات — كل ملف يحمل رقم طلبك.
   • تقديم القالب عملًا أصليًا في معرض أعمال غيرك أو في مسابقة تصميم.
   2) You MAY NOT resell, rent, redistribute or re-host these files (modified or
      not), share the download link, the archive, or the key, delete this licence or
      the per-file watermark, or submit the template as original work elsewhere.

٣) لماذا التتبّع مطبوع في الملفات؟
   لحماية المشتري أولًا: إن نُشرت نسخة مسروقة، يظهر رقم الطلب في الملف فتُعرف النسخة
   الأصلية ومالكها. وقد يُلغى المفتاح عند الإخلال بالبند (٢) فتتوقف التحديثات.
   التحقق العام من المفتاح: ${order.key ? `/licence?key=${encodeURIComponent(order.key)}` : '/licence'}

٤) الحدود والدعم
   القالب يُسلَّم «كما هو» بلا ضمان على نتائج تجارية أو وظيفية، وبلا التزام بإطار عمل
   أو خدمة طرف ثالث مذكورة في README (الاستضافة والنطاق ولوحات المحتوى على حسابك).
   الدعم والتحديثات لنفس البريد أعلاه خلال يوم عمل: ${SUPPORT_MAIL}
   The template is provided "as is" with no warranty of commercial or hiring outcomes.
   Support (one business day): ${SUPPORT_MAIL}

سطر مطابق مفتاحك — لا تنسخه لغيرك: ${v(order.key)} | ${v(order.id)}
`
}

/* ========================= بيانات المشتّر المُحقَنة ========================= */

/** سقف لكل حقل: ما يدخل الحزمة لا يتجاوز هذا مهما أرسل المتصفّح */
export const PERSONAL_LIMITS = { name: 80, role: 90, email: 160, phone: 40, website: 160, bio: 700 }

/**
 * سطر واحد، بلا محارف تحكّم، ولا أقواس وسوم: الحقل يُطبع في HTML وJSON وMarkdown.
 * المحارف تُصفّى بالشفرة لا بنمط — `no-control-regex` مقصود: محرف تحكّم داخل ملف
 * مُسلَّم يُفسد سطر التتبّع أعلى الحزمة ويطير منه رقم الطلب.
 * ومن كتب وسمًا يُتجاهل حقله كلّه (null) بدل أن تُطبع نسخة مشوَّهة في سيرة المشتّر:
 * لا يُسلَّم نصّ مُحرَّف للناس، والواجهة تُخبره أن الحقل لن يُطبع.
 */
const flat = (v, max) => {
  const s =
    Array.from(String(v == null ? '' : v), (c) => {
      const n = c.charCodeAt(0)
      return n < 32 || n === 127 ? ' ' : c
    })
      .join('')
      .replace(/\s+/g, ' ')
      .trim() || ''
  if (/[<>]/.test(s)) return null
  return s.slice(0, max) || null
}

/**
 * تنقية تخصيص المشتّر قبل أن يصير جزءًا من ملف مُسلَّم — ترجع null حين لا تخصيص،
 * فتبقى نصوص النموذج كما هي ولا تُستبدل بخواء. يستدعيها المتجر (البناء المحلي في
 * صفحة الإيصال) ويستدعيها الخادم (server/worker.js عند الحفظ)، فلا يختلف ما يراه
 * المشتّر في الإيصال عمّا يُلغَه رابط التنزيل.
 */
export function sanitizePersonal(raw) {
  if (!raw || typeof raw !== 'object' || raw.on === false) return null
  const out = {}
  for (const key of Object.keys(PERSONAL_LIMITS)) {
    const v = flat(raw[key], PERSONAL_LIMITS[key])
    if (v) out[key] = v // null = حقل مرفوض: يبقى نص القالب التجريبي ولا يُطبع شيء
  }
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) delete out.email
  if (out.phone && !/^[+\d][\d\s().+-]{5,39}$/.test(out.phone)) delete out.phone
  if (out.website) {
    // مضيف نظيف فقط (بلا مسار ولا مصادقة ولا مخطّط آخر): يُطبع كنص لا كرابط
    const host = out.website
      .replace(/^(?:https?:)?\/\//i, '')
      .split('/')[0]
      .split('@')
      .pop()
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(host)) delete out.website
    else out.website = host.toLowerCase()
  }
  if (out.bio) out.bio = (out.bio.replace(/[।.\s]*$/, '') + '.').slice(0, PERSONAL_LIMITS.bio) // النبذة جملة: تُطبع بعد نقطة في القوالب
  return Object.keys(out).length ? out : null
}

/** تُبدّل قيم النموذج ببيانات المشتّر؛ الحقل الذي لم يُكتب يبقى كما هو */
function applyPersonal(p, w) {
  if (w.name) p.name = { ar: w.name, en: w.name }
  if (w.role) p.role = { ar: w.role, en: w.role }
  if (w.bio) p.blurb = { ar: w.bio, en: w.bio }
  if (w.email) p.contact = { ...p.contact, email: w.email }
  if (w.phone) p.contact = { ...p.contact, phone: w.phone }
  if (w.website) p.host = w.website
  p.qalb = { ...p.qalb, personalized: true }
  return p
}

/* ============================ مولّدات الملفات ============================ */

/** لون النص فوق لون التمييز: داكن على الفاتح وفاتح على الغامق (AA في الحالتين) */
const inkOn = (hex) => {
  const c = String(hex || '').replace('#', '')
  const n =
    c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c.slice(0, 6)
  const lum = [0, 2, 4]
    .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
  return lum > 0.4 ? '#04140d' : '#f7f8fa'
}

const accentFor = (tpl, site) => {
  const id = (site && site.accent) || tpl.accent
  return id && PALETTE.some((c) => c.id === id) ? accentHex(id) : BRAND_HEX
}

export const profileFor = (tpl, k, personal = null) => {
  const site = k !== 'cv' ? siteFor(tpl) : null
  const demo = k !== 'site' ? demoFor(tpl) : null
  const base = site || demo || {}
  const prof = {
    // الشارة: «صُنع بواسطة Qalb Store» تُطبع في فوتر كلِّ قالب إلا أن تُشترى
    // رخصةُ White-label (`badge-off`) أو يكن اشتراكُ Pro (أو Plus) — القرارُ في
    // badgeState، والطباعةُ هنا.
    qalb: { template: tpl.id, slug: tpl.slug || null, kind: k, seats: 1, price: tpl.price, badge: true },
    lang: 'ar',
    dir: 'rtl',
    name: { ar: pick(base.name, 'ar') || 'اسمك هنا', en: pick(base.name, 'en') || 'Your name' },
    role: { ar: pick(base.role, 'ar') || pick(tpl.tagline, 'ar'), en: pick(base.role, 'en') || pick(tpl.tagline, 'en') },
    blurb: { ar: pick(base.blurb, 'ar') || pick(tpl.desc, 'ar'), en: pick(base.blurb, 'en') || pick(tpl.desc, 'en') },
    city: { ar: pick(base.city, 'ar') || 'جدة، السعودية', en: pick(base.city, 'en') || 'Jeddah, Saudi Arabia' },
    host: (base && base.host) || 'your-name.com',
    contact: { email: '', phone: '', links: ['linkedin.com/in/username', 'github.com/username'] },
    theme: tpl.theme === 'light' ? 'light' : 'dark',
    accent: accentFor(tpl, site),
    font: fontCss(tpl.font),
    fontId: tpl.font || 'sans',
    hero: (site && site.hero) || 'split',
    gallery: (site && site.gallery) || 'grid3',
    layout: tpl.layout || 'single',
    pages: tpl.pages || 1,
    nav: { ar: list(site && site.nav, 'ar'), en: list(site && site.nav, 'en') },
    stats: Array.isArray(site && site.stats) ? site.stats : [],
    sections: { ar: list(tpl.sections, 'ar'), en: list(tpl.sections, 'en') },
    skills: { ar: list(demo && demo.skills, 'ar'), en: list(demo && demo.skills, 'en') },
    jobs: Array.isArray(demo && demo.jobs)
      ? demo.jobs.map((j) => ({
          title: { ar: pick(j.t, 'ar'), en: pick(j.t, 'en') },
          period: { ar: pick(j.p, 'ar'), en: pick(j.p, 'en') },
          bullets: { ar: list(j.b, 'ar'), en: list(j.b, 'en') },
        }))
      : [],
    edu: { ar: pick(demo && demo.edu, 'ar'), en: pick(demo && demo.edu, 'en') },
    projects: Array.isArray(site && site.projects)
      ? site.projects.map((x, i) => ({
          title: { ar: pick(x.t, 'ar'), en: pick(x.t, 'en') },
          cat: { ar: pick(x.c, 'ar'), en: pick(x.c, 'en') },
          year: x.y || '',
          hue: x.hue == null ? 200 : x.hue,
          file: `projects/${slug(pick(x.t, 'en'), i)}.md`,
        }))
      : [],
    services: { ar: list(tpl.bestFor, 'ar'), en: list(tpl.bestFor, 'en') },
  }
  return personal ? applyPersonal(prof, personal) : prof
}

const readmeFor = (tpl, k, order, personal = null) => {
  const hasSite = k !== 'cv'
  const hasCv = k !== 'site'
  const files = []
  if (hasSite) {
    files.push('- `index.html` — الصفحة كاملة: ترويسة ثابتة، ترويسة رئيسية، معرض أعمال، «لمن أعمل»، نموذج تواصل.')
    files.push('- `styles.css` — التصميم كله بمتغيّرات `--*` (لون، خط، تباعد). لا إطار عمل ولا خطوة بناء.')
    files.push('- `projects/*.md` — ملف دراسة حالة لكل عمل، بنفس العناوين التي في `content/profile.json`.')
    files.push('- `assets/content.js` — يقرأ JSON ويبدّل اللغة والاتجاه؛ وعند الفتح من القرص يستخدم النسخة المضمّنة.')
    files.push('- `server.mjs` — خادم تطوير محلي بلا أي حزم (Node 18+ فقط).')
    files.push('- `vercel.json` و`netlify.toml` — نشر مباشر كموقع ثابت، بلا إعداد.')
    files.push('- `framework/` — نفس الأقسام مكوّنات جاهزة لـ Astro وNext، مع دليل النقل في `framework/README.md`.')
  }
  if (hasCv) {
    files.push('- `resume.html` — السيرة بمقاس A4 جاهزة للطباعة إلى PDF (Ctrl/Cmd + P ← Save as PDF).')
    files.push('- `resume.md` — المحتوى نفسه نصًّا: يلصق في Word أو Google Docs ثم يصدَّر PDF.')
    files.push('- `cover-letter.md` — خطاب تقديمي بنفس الهوية، وجاهز للتعبئة في حقول [الأقواس].')
    files.push('- `scripts/check-ats.mjs` — فاحص فرز آلي: يقرأ ملفّاتك ويعطي نسبة جاهزية وملاحظات.')
  }
  files.push('- `content/profile.json` — بياناتك كلها في مكان واحد (الاسم، المهنة، النبذة، الخبرات، الأعمال، التواصل).')
  files.push('- `LICENSE.txt` — رخصتك باسمك ورقم طلبك. لا تحذفه: هو ما يميّز نسختك عن أي نسخة متداولة.')
  const stack = list(tpl.stack, 'en')
  const cms = /sanity|supabase|contentful|strapi|airtable/i.test(stack.join(' '))
  return `# ${pick(tpl.name, 'en')} · ${pick(tpl.name, 'ar')}

> ${pick(tpl.tagline, 'en')}
> ${pick(tpl.tagline, 'ar')}

حزمة مُسلَّمة من **قالب / Qalb**${order.id ? ` — طلب \`${order.id}\`` : ''}${order.key ? ` · مفتاح رخصة \`${order.key}\`` : ''}${
    personal ? `\n\n> طُبعت بياناتك في الحزمة عند التوليد: ${Object.keys(personal).join(' · ')}. الحقول الأخرى ما زالت نصوصًا تجريبية.` : ''
  }
${order.name ? `مرخّصة لـ ${order.name}${order.email ? ` (${order.email})` : ''} — رخصة مقعد واحد، التفاصيل في \`LICENSE.txt\`.\n` : ''}
## ما في الحزمة

${files.join('\n')}

## البدء

    cd ${tpl.id}
    npm run dev        # خادم محلي على http://localhost:5173 — بلا npm install
${hasCv ? '    npm run check      # تقرير جاهزية ATS لملفّات السيرة وملاحظات قابلة للتنفيذ\n' : ''}
بلا Node؟ \`index.html\` و\`resume.html\` يفتحان من القرص مباشرةً (من البيانات المضمّنة في كل
ملف). أما \`npm run dev\` فيقرأ \`content/profile.json\` حيًّا، فتعدّل الملف وتُحدِّث الصفحة.

## تعديل المحتوى

كل النصوص في \`content/profile.json\`. العربية والاتجاه \`rtl\` هما الافتراض؛ بدّل
\`"lang": "en"\` و\`"dir": "ltr"\` للنسخة الإنجليزية، أو اضغط زر اللغة أعلى الموقع (يحفظ اختيارك).
اللون والخط في أعلى \`styles.css\`:

    --accent: ${accentFor(tpl, k !== 'cv' ? siteFor(tpl) : null)};   /* من لوحة ألوان قالب */
    --font: ${fontCss(tpl.font)};

${hasCv ? '## الطباعة والتصدير\n\nمن `resume.html`: طباعة ← Save as PDF ← المقاس A4 ← الهوامش None ← تفعيل Background graphics.\nالملف مضبوط على ~' + (tpl.pages || 1) + ' صفحة، وشبكة الطباعة تحافظ على ترقيم الأرقام (tabular-nums) فلا تهتزّ التواريخ.\n\n' : ''}## النشر
${hasSite ? '\nموقع ثابت: اربط المستودع بـ Vercel أو Netlify وستُقرأ `vercel.json` / `netlify.toml` تلقائيًا\n(مجلد الإخراج هو جذر الحزمة، ولا خطوة بناء). للدومين الشخصي: أضف CNAME أو دوّن A record\nكما تشرح منصتك.\n' : '\nالسيرة لا تُنشر؛ اكتفِ بتصدير PDF وارفعه على رابط خاص إن أردت مشاركته.\n'}
## ما تعنيه «التقنيات» في صفحة القالب

${stack.length ? `صفحة \`${tpl.slug || tpl.id}\` في المتجر تذكر: ${stack.join(' · ')}.\n` : ''}هذه الحزمة تعمل بلا أي منها حتى تفتحها بلا إنترنت ولا \`npm install\`: \`styles.css\` يعرّف
أسماء أصناف مطابقة للفئات التي رأيتها في المعاينة، و\`framework/\` فيه الأقسام نفسها مكتوبة
مكوّنات${/astro/i.test(stack.join(' ')) ? ' لـ Astro' : ''}${/next/i.test(stack.join(' ')) ? ' وNext' : ''} جاهزة للنسخ في مشروعك.${cms ? '\n`docs/CMS.md` يحوّل حقول `profile.json` إلى مخطط محتوى (Sanity/Supabase) بدون تغيير الواجهة.' : ''}

## الدعم

${SUPPORT_MAIL}${order.id ? ` — اذكر رقم الطلب \`${order.id}\`.` : '.'}
حالة مفتاحك والتحديثات: \`/licence?key=${order.key || '…'}\` على qalb.store
كل ملف نصي في الحزمة يبدأ بسطر تتبّع فيه رقم طلبك؛ إن نُشرّت نسختك في سوق قوالب،
يظهر رقمك في الملف وتثبت نسختك الأصلية — هذا يحميك أنت أيضًا.
`.replace(/\n{3,}/g, '\n\n')
}

export const siteCssFor = (tpl, p, k) => {
  const light = p.theme === 'light'
  const a = p.accent
  return `:root {
  --accent: ${a};
  --accent-ink: ${inkOn(a)}; /* نص عريض فوق لون التمييز */
  --bg: ${light ? '#f7f8fa' : '#0a0c11'};
  --panel: ${light ? '#ffffff' : '#11151d'};
  --text: ${light ? '#14181f' : '#e8ebf2'};
  --muted: ${light ? '#5b6474' : '#98a3b8'};
  --line: ${light ? '#e2e6ee' : '#1d2432'};
  --font: ${p.font};
  --max: 1120px;
}
${
  light
    ? ''
    : `@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg: #f7f8fa;
    --panel: #fff;
    --text: #14181f;
    --muted: #5b6474;
    --line: #e2e6ee;
  }
}
`
}* { box-sizing: border-box }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 16px; line-height: 1.7; -webkit-font-smoothing: antialiased }
img, svg { max-width: 100%; height: auto }
a { color: inherit; text-decoration: none }
.num { font-variant-numeric: tabular-nums }
.wrap { width: min(100% - 2.5rem, var(--max)); margin-inline: auto }
.skip { position: absolute; inset-inline-start: -9999px }
.skip:focus { inset-inline-start: 1rem; top: 1rem; z-index: 50; background: var(--panel); padding: .5rem .75rem; border: 1px solid var(--line); border-radius: 8px }
header.site { position: sticky; top: 0; z-index: 20; background: color-mix(in oklab, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line) }
.bar { display: flex; align-items: center; gap: 1.1rem; padding: .8rem 0 }
.brand { font-weight: 800; letter-spacing: -.02em }
nav.main { display: flex; gap: 1rem; margin-inline-start: auto; font-size: 14px; font-weight: 600 }
nav.main a { color: var(--muted) }
nav.main a:hover { color: var(--text) }
button.ghost { background: none; border: 1px solid var(--line); color: var(--muted); border-radius: 999px; padding: .35rem .7rem; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer }
button.ghost:hover { color: var(--text); border-color: var(--accent) }
.hero { padding: clamp(3rem, 9vw, 6rem) 0 2.25rem; display: grid; gap: 2rem; align-items: end }
.hero[data-layout="split"] { grid-template-columns: 1.15fr .85fr }
.hero[data-layout="media"] { grid-template-columns: 1fr }
.hero h1 { margin: 0; font-size: clamp(2.1rem, 5.4vw, 3.5rem); line-height: 1.1; letter-spacing: -.035em; font-weight: 800 }
.hero p { margin: 0; color: var(--muted); max-width: 54ch }
.cta { display: inline-flex; align-items: center; gap: .5rem; background: var(--accent); color: var(--accent-ink); font-weight: 800; padding: .8rem 1.1rem; border-radius: 14px; font-size: 15px; border: 0; cursor: pointer }
.cta:hover { filter: brightness(1.06) }
.stats { display: flex; flex-wrap: wrap; gap: 1.5rem; padding-top: 1rem }
.stats b { display: block; font-size: 1.55rem; font-weight: 800; letter-spacing: -.03em }
.stats span { color: var(--muted); font-size: 13px }
h2.sec { display: flex; align-items: center; gap: .6rem; margin: 3.25rem 0 1.1rem; font-size: 1.1rem; font-weight: 800; letter-spacing: .01em }
h2.sec::before { content: ""; width: 22px; height: 2px; background: var(--accent) }
.grid { display: grid; gap: 1rem }
.grid[data-gallery="grid3"] { grid-template-columns: repeat(3, minmax(0, 1fr)) }
.grid[data-gallery="grid2"], .grid[data-gallery="spotlight"] { grid-template-columns: repeat(2, minmax(0, 1fr)) }
.grid[data-gallery="list"] { grid-template-columns: 1fr }
.grid[data-gallery="spotlight"] .spot { grid-column: 1 / -1 }
.grid[data-gallery="spotlight"] .spot .thumb { aspect-ratio: 21 / 9 }
.card { border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: var(--panel) }
.card:hover { border-color: color-mix(in oklab, var(--accent) 45%, var(--line)) }
.thumb { aspect-ratio: 4 / 3; background: linear-gradient(140deg, hsl(var(--h) 60% 46% / .92), hsl(calc(var(--h) + 38) 52% 28% / .95)); display: grid; place-items: center; color: #fff; font-weight: 800; letter-spacing: -.02em }
.card .body { padding: .85rem 1rem 1rem }
.card h3 { margin: 0 0 .25rem; font-size: 1rem; font-weight: 800 }
.meta { display: flex; align-items: center; gap: .5rem; margin: 0; color: var(--muted); font-size: 12.5px }
.tag { border: 1px solid var(--line); border-radius: 999px; padding: .05rem .5rem }
ul.clean { display: grid; gap: .5rem; list-style: none; margin: 0; padding: 0 }
ul.clean li { border: 1px solid var(--line); border-radius: 12px; padding: .7rem .9rem; background: var(--panel) }
form.contact { display: grid; gap: .7rem; padding: 1.2rem; border: 1px solid var(--line); border-radius: 18px; background: var(--panel) }
form.contact label { display: grid; gap: .3rem; font-size: 13px; font-weight: 700; color: var(--muted) }
form.contact input, form.contact textarea { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: .6rem .7rem }
form.contact :is(input, textarea):focus-visible, button.ghost:focus-visible, .cta:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
footer.site { margin-top: 3.5rem; border-top: 1px solid var(--line); padding: 1.4rem 0 2.25rem; color: var(--muted); font-size: 13px }
.foot { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between }
@media (max-width: 900px) { .grid[data-gallery="grid3"] { grid-template-columns: repeat(2, minmax(0, 1fr)) } .hero[data-layout="split"] { grid-template-columns: 1fr } }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr } .bar { flex-wrap: wrap } }
@media (prefers-reduced-motion: no-preference) { .reveal { animation: up .5s both } @keyframes up { from { opacity: 0; transform: translateY(8px) } } }
${
  k === 'site'
    ? ''
    : `\n/* ===== السيرة: شاشة وطباعة ===== */
.screen { background: #eef0f5 }
.sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 15mm; background: #fff; color: #12161d; box-shadow: 0 20px 60px -30px rgb(0 0 0 / .5); font-size: 12.8px; line-height: 1.55 }
.sheet h1 { margin: 0 0 .1rem; font-size: 25pt; letter-spacing: -.02em }
.sheet .role { margin: 0 0 .35rem; color: #4b5566; font-weight: 700 }
.sheet .line { margin: 0; font-size: 11.5px; color: #43506a }
.sheet h2 { margin: 1.1rem 0 .4rem; padding-bottom: .25rem; border-bottom: 1px solid #e6e9f0; font-size: 10.5pt; letter-spacing: .05em }
.sheet .job { margin-bottom: .8rem; break-inside: avoid }
.sheet .job .t { margin: 0; font-weight: 800 }
.sheet .job .p { margin: 0; color: #6b7488; font-size: 11.5px }
.sheet ul { margin: .3rem 0 0; padding-inline-start: 1.1rem }
.sheet li { margin-bottom: .18rem }
.sheet[data-layout="side"] { display: grid; grid-template-columns: 1fr 60mm; gap: 0 8mm }
.sheet[data-layout="side"] :is(header, h1, .role, .line) { grid-column: 1 / -1 }
.sheet[data-layout="band"] > header { margin-bottom: 1rem; padding: .55rem 0; border-block: 1px solid #e6e9f0 }
.sheet[data-font="serif"] { font-family: Georgia, 'Times New Roman', serif }
@media print {
  .screen { background: #fff }
  .noscreen { display: none !important }
  .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none }
  h2 { break-after: avoid }
  @page { size: A4; margin: 14mm }
}
`
}
`
}

const contentScript = `/**
 * يقرأ content/profile.json ويبدّل اللغة والاتجاه. عند الفتح من القرص (file://) يفشل
 * الـ fetch، فتُستخدم النسخة المضمّنة في <script type="application/json" id="profile">.
 */
;(function () {
  var root = document.documentElement
  var data = {}
  try {
    data = JSON.parse(document.getElementById('profile').textContent)
  } catch (e) {}

  function value(path) {
    var out = data
    var parts = String(path || '').split('.')
    for (var i = 0; i < parts.length; i++) out = out == null ? out : out[parts[i]]
    return out
  }
  function text(node, lang) {
    var v
    if (node.hasAttribute('data-brand')) v = (data.name || {})[lang]
    else v = value(node.getAttribute('data-f') || node.getAttribute('data-i18n'))
    if (v && typeof v === 'object') v = v[lang] || v.ar || v.en
    if (v != null && v !== '') node.textContent = v
  }
  function setLang(lang) {
    root.setAttribute('lang', lang)
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    var btn = document.getElementById('dirToggle')
    if (btn) btn.textContent = lang === 'ar' ? 'EN' : 'ع'
    document.querySelectorAll('[data-f],[data-i18n],[data-brand]').forEach(function (el) {
      text(el, lang)
    })
    var nav = ((data.nav || {})[lang]) || []
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      var v = nav[+el.getAttribute('data-nav')]
      if (v) el.textContent = v
    })
    document.querySelectorAll('[data-bi]').forEach(function (el) {
      var v = el.getAttribute('data-bi-' + lang)
      if (v) el.textContent = v
    })
    try {
      localStorage.setItem('qalb.starter.lang', lang)
    } catch (e) {}
  }
  function start() {
    var saved = 'ar'
    try {
      saved = localStorage.getItem('qalb.starter.lang') || 'ar'
    } catch (e) {}
    setLang(saved)
    var t = document.getElementById('dirToggle')
    if (t)
      t.addEventListener('click', function () {
        setLang(root.getAttribute('dir') === 'rtl' ? 'en' : 'ar')
      })
    var y = document.getElementById('yr')
    if (y) y.textContent = String(new Date().getFullYear())
    if (location.protocol !== 'file:') {
      fetch('content/profile.json')
        .then(function (r) {
          return r.ok ? r.json() : null
        })
        .then(function (j) {
          if (j) {
            data = j
            setLang(root.getAttribute('lang') || 'ar')
          }
        })
        .catch(function () {})
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
`

const serverScript = `/** خادم ملفات ثابتة للتطوير، بلا اعتمادات: node server.mjs [port] */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
}
const root = resolve('.')
const port = Number(process.argv[2] || 5173)

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const file = join(root, normalize(path === '/' ? '/index.html' : path))
  if (!file.startsWith(root)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('forbidden')
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found')
  }
}).listen(port, '127.0.0.1', () => console.log('qalb starter · http://localhost:' + port))
`

/* سكربت الفحص الذي يُسلَّم داخل الحزمة: يُولَّد من src/data/ats.js، فلا يقيس ما
   نسلّمه بمسطرة غير التي نقيس بها مجّانًا في المتجر. */
const atsScript = `/** فاحص جاهزية ATS — يعمل من جذر الحزمة بـ: node scripts/check-ats.mjs
 * مصدر القواعد: qalb/src/data/ats.js — لا نسخة معدَّلة هنا.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const RULES = ${JSON.stringify(atsRuleTable())}
const TARGET = ${JSON.stringify(ATS_TARGET)}
const LINKS = ${JSON.stringify(ATS_LINKS)}
const read = async (p) => {
  try {
    return await readFile(resolve(p), 'utf8')
  } catch {
    return ''
  }
}
const html = await read('resume.html')
const md = await read('resume.md')
const body = html || md
if (!body) {
  console.error('not found: resume.html or resume.md in the package root / لم أجد ملف السيرة في جذر الحزمة')
  process.exit(1)
}
const clean = body.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim()
const words = (clean.match(/[\\p{L}\\p{N}'’-]+/gu) || []).length
const li = [...body.matchAll(/<li[^>]*>([\\s\\S]*?)<\\/li>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ' ').trim())
const bullets = li.length
const measured = li.filter((x) => /\\d/.test(x)).length
const checks = RULES.map((r) => [r.name, new RegExp(r.src, r.flags + 'i').test(clean)])
checks.push(['length ' + TARGET.minWords + '-' + TARGET.maxWords + ' words', words >= TARGET.minWords && words <= TARGET.maxWords])
checks.push([TARGET.minBullets + '+ experience bullets', bullets >= TARGET.minBullets])
checks.push(['half the bullets carry a number', bullets > 0 && measured * 2 >= bullets])
checks.push(['no layout tables', !/<table/i.test(body)])
checks.push(['a profile link', LINKS.some((l) => clean.toLowerCase().includes(l))])
const score = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100)
for (const [name, ok] of checks) console.log((ok ? ' ok  ' : ' MISS') + '  ' + name)
console.log('ATS readiness / جاهزية الفرز الآلي: ' + score + '% · words: ' + words + ' · bullets: ' + bullets)
if (score < TARGET.pass) console.log('fix: اجعل كل نقطة تبدأ بفعل وتنتهي برقم، وأضف الأقسام الناقصة في content/profile.json')
process.exit(score < TARGET.pass ? 1 : 0)
`

/** شارةُ الفوتر: سطرٌ واحد، ولا تُطبع لمن أسقطها بخطةٍ أعلى أو بإضافةٍ مشتراة */
const badgeMark = (p) => (p?.qalb?.badge === false ? '' : badgeHtml({ lang: p?.lang === 'en' ? 'en' : 'ar' }))

export const siteHtml = (tpl, p) => {
  const nav = p.nav.en.length ? p.nav.en : ['Work', 'About', 'Services', 'Contact']
  const navAr = p.nav.ar.length ? p.nav.ar : nav
  const cards = p.projects
    .map(
      (x, i) => `        <a class="card reveal${p.gallery === 'spotlight' && i === 0 ? ' spot' : ''}" href="${esc(x.file)}" style="--h:${x.hue}">
          <div class="thumb" aria-hidden="true">${esc(x.title.en)}</div>
          <div class="body">
            <h3 data-i18n="projects.${i}.title">${esc(x.title.ar || x.title.en)}</h3>
            <p class="meta"><span class="tag" data-i18n="projects.${i}.cat">${esc(x.cat.ar || x.cat.en)}</span><span class="num">${esc(x.year)}</span></p>
          </div>
        </a>`,
    )
    .join('\n')
  const stats = p.stats.map((s) => `          <div><b class="num">${esc(s.e ?? s.v)}</b><span>${esc(s.en ?? s.e ?? '')}</span></div>`).join('\n')
  const services = p.services.en.map((s, i) => `          <li data-i18n="services.${i}">${esc(s)}</li>`).join('\n')
  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="${p.theme}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title data-brand>${esc(p.name.ar)} — ${esc(p.role.ar)}</title>
    <meta name="description" content="${esc(p.blurb.ar)}" />
    <meta property="og:title" content="${esc(p.name.ar)} — ${esc(p.role.ar)}" />
    <meta property="og:description" content="${esc(p.blurb.ar)}" />
    <meta property="og:type" content="website" />
    <meta name="theme-color" content="${p.theme === 'light' ? '#f7f8fa' : '#0a0c11'}" />
    <link rel="stylesheet" href="styles.css" />
    <script type="application/json" id="profile">${JSON.stringify(p)}</script>
  </head>
  <body>
    <a class="skip" href="#main" data-bi data-bi-ar="تخطّي إلى المحتوى" data-bi-en="Skip to content">تخطّي إلى المحتوى</a>
    <header class="site">
      <div class="wrap bar">
        <a class="brand" href="./" data-brand>${esc(p.name.ar)}</a>
        <nav class="main" aria-label="main">
${nav.map((x, i) => `          <a href="#${slug(x, i)}" data-nav="${i}">${esc(navAr[i] || x)}</a>`).join('\n')}
        </nav>
        <button class="ghost" type="button" id="dirToggle" aria-label="تبديل اللغة والاتجاه / Toggle language">EN</button>
      </div>
    </header>

    <main id="main">
      <section class="wrap hero" data-layout="${esc(p.hero)}">
        <div>
          <h1 data-f="name">${esc(p.name.ar)}</h1>
          <p><span data-f="role">${esc(p.role.ar)}</span> — <span data-f="blurb">${esc(p.blurb.ar)}</span></p>
          <p style="padding-top:.7rem">
            <a class="cta" href="#contact"><span data-bi data-bi-ar="تواصل معي" data-bi-en="Get in touch">تواصل معي</span> ↗</a>
          </p>
        </div>
        <div class="stats">
${stats || '          <div><b class="num">—</b><span>أضف أرقامك في content/profile.json ← stats</span></div>'}
        </div>
      </section>

      <section class="wrap" id="work">
        <h2 class="sec" data-bi data-bi-ar="الأعمال" data-bi-en="Selected work">الأعمال</h2>
        <div class="grid" data-gallery="${esc(p.gallery)}">
${cards || '          <p>أضف أعمالك في <code>content/profile.json → projects</code>، وملف دراسة حالة لكل عمل داخل <code>projects/</code>.</p>'}
        </div>
      </section>

      <section class="wrap" id="about">
        <h2 class="sec" data-bi data-bi-ar="عني" data-bi-en="About">عني</h2>
        <p style="max-width:62ch" data-f="blurb">${esc(p.blurb.ar)}</p>
        <p class="meta">${esc(p.city.ar)} · <span class="num">${esc(p.host)}</span></p>
      </section>

      <section class="wrap" id="services">
        <h2 class="sec" data-bi data-bi-ar="لمن أعمل" data-bi-en="Best for">لمن أعمل</h2>
        <ul class="clean">
${services || '          <li>عدّل <code>content/profile.json → services</code></li>'}
        </ul>
      </section>

      <section class="wrap" id="contact">
        <h2 class="sec" data-bi data-bi-ar="تواصل" data-bi-en="Contact">تواصل</h2>
        <!-- نموذج مضاد للسبام بلا اعتمادات: وجّه action إلى مزوّدك (Netlify Forms / Formspree / API خاص) -->
        <form class="contact" method="post" action="">
          <label><span data-bi data-bi-ar="الاسم" data-bi-en="Name">الاسم</span><input name="name" autocomplete="name" required /></label>
          <label><span data-bi data-bi-ar="البريد الإلكتروني" data-bi-en="E-mail">البريد الإلكتروني</span><input name="email" type="email" autocomplete="email" required /></label>
          <label><span data-bi data-bi-ar="الرسالة" data-bi-en="Message">الرسالة</span><textarea name="message" rows="4" required></textarea></label>
          <label hidden aria-hidden="true" tabindex="-1">Bot trap<input name="company" autocomplete="off" /></label>
          <div><button class="cta" type="submit"><span data-bi data-bi-ar="إرسال" data-bi-en="Send">إرسال</span></button></div>
        </form>
      </section>
    </main>

    <footer class="site">
      <div class="wrap foot">
        <span>© <span class="num" id="yr">2026</span> <span data-brand>${esc(p.name.ar)}</span></span>
        <span data-bi data-bi-ar="قالب · قالب — قالب مُرخّص" data-bi-en="Qalb — licensed template">${badgeMark(p)}</span>
      </div>
    </footer>
    <script src="assets/content.js" defer></script>
  </body>
</html>
`
}

export const resumeFor = (tpl, p) => {
  const layout = ['side', 'band', 'timeline'].includes(p.layout) ? p.layout : 'single'
  const jobs = p.jobs.length
    ? p.jobs
        .map(
          (j) => `      <div class="job">
        <p class="t" data-i18n="jobs.${p.jobs.indexOf(j)}.title">${esc(j.title.ar || j.title.en)}</p>
        <p class="p num" data-i18n="jobs.${p.jobs.indexOf(j)}.period">${esc(j.period.en || j.period.ar)}</p>
        <ul>
${(j.bullets.en || j.bullets.ar || []).map((b) => `          <li>${esc(b)}</li>`).join('\n')}
        </ul>
      </div>`,
        )
        .join('\n')
    : '      <div class="job">\n        <p class="t">المسمى — الشركة</p>\n        <p class="p num">2023 — الآن</p>\n        <ul><li>ابدأ بفعل، واختم برقم: «خفّض زمن الاستجابة ٤٠٪».</li></ul>\n      </div>'
  const skills = (p.skills.en || []).length
    ? p.skills.en.map((s, i) => `<li data-i18n="skills.${i}">${esc((p.skills.ar || [])[i] || s)}</li>`).join('\n')
    : '<li>عدّل content/profile.json ← skills</li>'
  const aside = `      <h2 data-bi data-bi-ar="المهارات" data-bi-en="Skills">المهارات</h2>
      <ul class="clean">
${skills}
      </ul>
      <h2 data-bi data-bi-ar="التعليم" data-bi-en="Education">التعليم</h2>
      <p>${esc(p.edu.en || p.edu.ar || '—')}</p>
      <h2 data-bi data-bi-ar="اللغات" data-bi-en="Languages">اللغات</h2>
      <p>العربية (لغة أم) · الإنجليزية (مهنية)</p>`
  const tail = `      <h2 data-bi data-bi-ar="المهارات" data-bi-en="Skills">المهارات</h2>
      <p>${(p.skills.en || []).join(' · ') || 'عدّل content/profile.json ← skills'}</p>
      <h2 data-bi data-bi-ar="التعليم" data-bi-en="Education">التعليم</h2>
      <p>${esc(p.edu.en || p.edu.ar || '—')}</p>`
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(p.name.ar)} — سيرة ذاتية</title>
    <link rel="stylesheet" href="styles.css" />
    <script type="application/json" id="profile">${JSON.stringify(p)}</script>
  </head>
  <body class="screen">
    <p class="noscreen wrap" style="padding:1rem 0;color:#3c4657;font-size:13px">
      للتصدير إلى PDF: <b>Ctrl/Cmd + P</b> ← «Save as PDF» ← المقاس A4 ← الهوامش None ← فعّل «Background graphics».
      الطباعة مضبوطة على ~<span class="num">${esc(String(p.pages))}</span> صفحة، وهذا الملف جزء من قالب
      <span class="num">${esc(tpl.id)}</span> من قالب / Qalb.
    </p>
    <article class="sheet" data-layout="${layout}" data-font="${(p.font || '').includes('Georgia') ? 'serif' : 'sans'}">
      <header>
        <h1 data-f="name">${esc(p.name.ar)}</h1>
        <p class="role"><span data-f="role">${esc(p.role.ar)}</span> · <span data-f="city">${esc(p.city.ar)}</span></p>
        <p class="line"><span data-f="contact.email">${esc(p.contact.email || 'you@example.com')}</span> · <span data-f="contact.phone">${esc(p.contact.phone || '+966 5X XXX XXXX')}</span> · <span data-f="host">${esc(p.host)}</span></p>
      </header>
      <h2 data-bi data-bi-ar="ملخص مهني" data-bi-en="Summary">ملخص مهني</h2>
      <p data-f="blurb">${esc(p.blurb.ar)}</p>
      <h2 data-bi data-bi-ar="الخبرة" data-bi-en="Experience">الخبرة</h2>
${jobs}
${layout === 'side' ? aside : tail}
    </article>
    <footer class="site"><div class="wrap foot">${badgeMark(p)}</div></footer>
    <script src="assets/content.js" defer></script>
  </body>
</html>
`
  // مشتّر كتب اسمه بلغة واحدة: لا يُكرَّر مرّتين في عنوان السيرة
  const nameLine = p.name.en && p.name.en !== p.name.ar ? `${p.name.ar} — ${p.name.en}` : p.name.ar
  const md = `# ${nameLine}

**${p.role.en || p.role.ar}** · ${p.city.en || p.city.ar} · ${p.contact.email || 'you@example.com'} · ${p.contact.phone || '+966 5X XXX XXXX'} · ${p.host}

## Summary

${p.blurb.en || p.blurb.ar}

## Experience

${p.jobs.length ? p.jobs.map((j) => `### ${j.title.en || j.title.ar}\n${j.period.en || j.period.ar}\n\n${(j.bullets.en || j.bullets.ar || []).map((b) => `- ${b}`).join('\n') || '- ابدأ بفعل واختم برقم.'}`).join('\n\n') : '### Role — Company\n2023 — Present\n\n- Start with a verb, end with a number.'}

## Skills

${p.skills.en.join(' · ') || 'edit content/profile.json'}

## Education

${p.edu.en || p.edu.ar || '—'}

## Languages

Arabic (native) · English (professional)
`
  const cover = `# خطاب تقديمي / Cover letter

إلى: [اسم الشركة / Hiring manager]
بخصوص: [المسمى] · [رابط الإعلان]

السيد/ة [الاسم]،

أقدّم نفسي بصفتي ${p.role.ar || p.role.en}، وأرى في دوركم ما يطابق ما أتقنه: ${p.blurb.ar || p.blurb.en}

ثلاثة أمور أستطيع تقديمها في الربع الأول:

1. [نتيجة رقمية أولى مرتبطة بما طلبتموه في الإعلان].
2. [المهارة الأولى التي ذكرتموها، ودليلها: نقطة من سيرتي الذاتية].
3. [كيف تعملون: منهجية وتوثيق وتواصل — وكيف سأندمج فيها].

أرفقت سيرتي الذاتية، ويسعدني الحديث في الوقت الذي يناسبكم.

${p.name.ar} · ${p.contact.email || 'you@example.com'} · ${p.city.ar || ''}

---

## English

Dear [Hiring manager],

I am writing about the [Role] position. As a ${p.role.en || p.role.ar}, I bring: ${p.blurb.en || p.blurb.ar}

Three things I would deliver in the first quarter:

1. [a measurable outcome tied to what their posting asks for].
2. [the first skill they named, evidenced by one bullet in resume.md].
3. [how their team works — method, documentation, communication — and how I fit it].

My CV is attached; I would be glad to talk at your convenience.

${p.name.en || p.name.ar} · ${p.contact.email || 'you@example.com'}
`
  return { html, md, cover }
}

const caseFor = (x) => `---
title: "${x.title.en || x.title.ar}"
category: "${x.cat.en || ''}"
year: ${x.year || ''}
---

# ${x.title.en || x.title.ar}

${x.title.ar || ''}

> استبدل هذا الملف بدراسة حالتك — العنوان والتصنيف والسنة تُقرأ من \`content/profile.json\`،
> والمتجر يعرض البطاقة نفسها في \`projects\`.

## المشكلة / Problem

سطران: ما الوضع قبل عملك، ولماذا كان يستحق الحل.

## الدور / My role

[بحث · تصميم · واجهات · نظام تصميم] — المدة: [عدد الأسابيع].

## الحل / What I did

1. القرار الأول ولماذا، والبديل الذي رفضته.
2. القرار الثاني مع القيد الذي فرضه (زمن، فريق، تقنية).
3. ما الذي قِسته بعد الإطلاق.

## النتيجة / Outcome

| المقياس | قبل | بعد |
| --- | --- | --- |
| التحويل | % | % |
| زمن إنجاز المهمة | ث | ث |

## الصور / Assets

ضع اللقطات في \`assets/img/\` ثم أشّر عليها: \`![لقطة](../assets/img/shot-1.png)\`
ولكل صورة \`alt\` وصفي — المعاينة على الموقع تعرض نفس الشبكة بلا صور stock.
`

const frameworkFor = (tpl, p) => {
  const astro = `---
// src/pages/index.astro — نفس بنية index.html، بقسم واحد قابل لإعادة الاستخدام
import '../styles/global.css'
import profile from '../content/profile.json'
const lang = Astro.props.lang ?? 'ar'
const t = (o) => (o && (o[lang] || o.ar)) || ''
---
<html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{t(profile.name)} — {t(profile.role)}</title>
    <meta name="description" content={t(profile.blurb)} />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main>
      <section class="wrap hero" data-layout={profile.hero}>
        <div>
          <h1>{t(profile.name)}</h1>
          <p>{t(profile.role)} — {t(profile.blurb)}</p>
        </div>
        <div class="stats">
          {profile.stats.map((s) => <div><b class="num">{s.e ?? s.v}</b><span>{s.en ?? s.e}</span></div>)}
        </div>
      </section>
      <section class="wrap" id="work">
        <h2 class="sec">{lang === 'ar' ? 'الأعمال' : 'Selected work'}</h2>
        <div class="grid" data-gallery={profile.gallery}>
          {profile.projects.map((x) => (
            <a class="card" href={x.file}>
              <div class="body">
                <h3>{t(x.title)}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  </body>
</html>
`
  const next = `// app/page.jsx — نفس البيانات، بلا خطوات بناء إضافية
import data from '../content/profile.json'
import { badgeHtml } from './badge.js'

const t = (o, lang) => (o && (o[lang] || o.ar)) || ''

export default function Page() {
  const lang = 'ar'
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <title>
          {t(data.name, lang)} — {t(data.role, lang)}
        </title>
        <meta name="description" content={t(data.blurb, lang)} />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <main>
          <section className="wrap hero" data-layout={data.hero}>
            <h1>{t(data.name, lang)}</h1>
            <p>{t(data.blurb, lang)}</p>
          </section>
          <section className="wrap" id="work">
            <div className="grid" data-gallery={data.gallery}>
              {data.projects.map((x) => (
                <a key={x.file} className="card" href={x.file}>
                  <div className="body">
                    <h3>{t(x.title, lang)}</h3>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
`
  const readme = `# نقل الحزمة إلى Astro / Next — في جلسة واحدة

المحتوى في \`content/profile.json\` والتصميم في \`styles.css\`، فالنقل ليس إعادة كتابة:
\`index.html\` كل قسم فيه محاط بـ \`<section>\` واحدة، فقط انسخها إلى مكوّن.

## Astro
1. \`npm create astro@latest my-site -- --template minimal\`
2. انسخ \`styles.css\` إلى \`src/styles/global.css\` و\`content/profile.json\` إلى \`src/content/\`.
3. \`index.astro\` في هذا المجلد مثال يعمل: يقرأ JSON في الـ frontmatter ويكرّر \`projects\`.

## Next.js (App Router)
1. \`npx create-next-app@latest my-site --no-lint\`
2. ضع \`styles.css\` في \`app/globals.css\`؛ إن كان \`tailwind.css\` معرّفًا فحذف الـ preflight
   يمنع تعارض إعادة ضبط العناصر مع \`styles.css\`.
3. \`page.jsx\` في هذا المجلد يقرأ JSON مباشرةً (لا حاجة إلى \`getStaticProps\`).
4. لدراسات الحالة: \`fs.readdirSync('projects')\` + \`gray-matter\` في \`generateStaticParams\`.

## هل تحتاج Tailwind؟
لا. \`styles.css\` يعرّف كل قيمة بمتغيّر CSS ويستخدم أسماء أصناف مطابقة للفئات التي
رأيتها في المعاينة (\`wrap\` \`grid\` \`card\` \`cta\`)، فإضافة Tailwind اختيارية.
وإن أردتها: عرّف نفس المتغيّرات في \`theme.extend\` واحذف \`styles.css\` لتفادي مصدرين للون.

## لوحة المحتوى (Sanity / Supabase)
الحقول في \`profile.json\` هي مخطط المحتوى نفسه — راجع \`docs/CMS.md\`.
`
  const fields = Object.keys(p).filter((x) => !['qalb'].includes(x))
  const shape = (key) => {
    const val = p[key]
    if (Array.isArray(val)) return 'array'
    if (val && typeof val === 'object') return 'object'
    return typeof val === 'boolean' ? 'boolean' : 'string'
  }
  const cms = `# مخطط محتوى مطابق لـ content/profile.json

تبقى أسماء الحقول كما هي، فينتقل الموقع من \`fetch('content/profile.json')\` إلى لوحة
محتوى بلا تعديل في الواجهة.

\`\`\`json
${JSON.stringify({ name: 'profile', type: 'document', fields: fields.map((key) => ({ name: key, type: shape(key) })) }, null, 2)}
\`\`\`

## Supabase (جدولان يكفيان)
- \`profile (id int primary key default 1, data jsonb not null)\` — نفس \`profile.json\` كاملًا.
- \`project (id bigint generated always as identity primary key, title jsonb, year int, hue int, body_md text, position int)\`
  ← يملأ \`projects/*.md\`، و\`order by position\` يحافظ على الترتيب الذي تراه في المعاينة.

## ملاحظات
- الحقول ثنائية اللغة (\`{ ar, en }\`) فلا تحتاج تكرار المستند لكل لغة؛ الاتجاه يُشتق من اللغة.
- Publish/Draft يكفي بعمود \`published boolean\` + \`select ... where published\`.
`
  return {
    'framework/astro/index.astro': astro,
    'framework/next/page.jsx': next,
    'framework/README.md': readme,
    'docs/CMS.md': cms,
  }
}

/* ============================== توليد الحزمة ============================== */

/** @returns {{path:string, body:string}[]} حزمة القالب كاملة لمشتّر معيّن */
export function packageFiles(tpl, ctx = {}) {
  if (!tpl) throw new Error('packageFiles: template required')
  const k = kindOf(tpl)
  const order = { id: ctx.id, key: ctx.key, name: ctx.name, email: ctx.email, date: ctx.date }
  const hasSite = k !== 'cv'
  const hasCv = k !== 'site'
  const personal = sanitizePersonal(ctx.personalize)
  const p = profileFor(tpl, k, personal)
  // إزالةُ الشعار والحقوق تُشترى: رخصة White-label في إضافات الطلب تُسقطها،
  // واشتراك Pro (ومعه Plus) يُسقطها تلقائيًا — والقرارُ كله في badgeState لا هنا
  const bought = (Array.isArray(ctx.addons) ? ctx.addons : []).map((a) => (typeof a === 'string' ? a : a && a.id)).filter(Boolean)
  if (!badgeState({ plan: ctx.plan || 'free', addons: bought }).shown) p.qalb.badge = false
  const mark = markOf(order)
  const out = [{ path: 'LICENSE.txt', body: licenceText(tpl, order) }]
  const add = (path, body) => out.push({ path, body: commentFor(path, mark) + body })

  add('README.md', readmeFor(tpl, k, order, personal))

  if (hasSite) {
    add('index.html', siteHtml(tpl, p))
    add('assets/content.js', contentScript)
    add('server.mjs', serverScript)
    for (const [path, body] of Object.entries(frameworkFor(tpl, p))) add(path, body)
    const projects = p.projects.length
      ? p.projects
      : [
          {
            title: { ar: 'عملك الأول', en: 'first project' },
            cat: { ar: 'تصنيف', en: 'category' },
            year: '',
            hue: 200,
            file: 'projects/first-project.md',
          },
        ]
    for (const x of projects) add(x.file || `projects/${slug(x.title.en, projects.indexOf(x))}.md`, caseFor(x))
  }

  if (hasCv) {
    const r = resumeFor(tpl, p)
    add('resume.html', r.html)
    add('resume.md', r.md)
    add('cover-letter.md', r.cover)
    if (!hasSite) {
      add('assets/content.js', contentScript)
      add('server.mjs', serverScript)
    }
    add('scripts/check-ats.mjs', atsScript)
  }

  add('styles.css', siteCssFor(tpl, p, k))
  add('content/profile.json', JSON.stringify(p, null, 2) + '\n')
  add(
    'package.json',
    JSON.stringify(
      {
        name: `qalb-${tpl.id}${k === 'site' ? '-starter' : k === 'cv' ? '-cv' : '-bundle'}`,
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: { dev: 'node server.mjs', start: 'node server.mjs', ...(hasCv ? { check: 'node scripts/check-ats.mjs' } : {}) },
        engines: { node: '>=18' },
        license: 'SEE LICENSE IN LICENSE.txt',
        qalb: { template: tpl.id, order: order.id || null, licence: order.key || null },
      },
      null,
      2,
    ) + '\n',
  )
  if (hasSite) {
    add(
      'vercel.json',
      JSON.stringify(
        {
          cleanUrls: true,
          framework: null,
          headers: [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'same-origin' },
              ],
            },
          ],
        },
        null,
        2,
      ) + '\n',
    )
    add(
      'netlify.toml',
      '[build]\n  command = "echo \\"static site: no build step\\""\n  publish = "."\n\n[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Content-Type-Options = "nosniff"\n    Referrer-Policy = "same-origin"\n',
    )
  }
  add('.gitignore', 'node_modules/\ndist/\n.DS_Store\n.env\n')
  add(
    '.editorconfig',
    'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\nindent_style = space\nindent_size = 2\ninsert_final_newline = true\ntrim_trailing_whitespace = true\n',
  )

  return out.sort((a, b) => a.path.localeCompare(b.path))
}

export function packageName(tpl, order = {}) {
  const tag = order.id
    ? '-' +
      String(order.id)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
    : ''
  return `qalb-${tpl.id}${tag}.zip`
}

/** بايتات الأرشيف — تُستعمل في المتصفح (Blob) وفي الخادم (استجابة التنزيل) */
export function packageZip(tpl, order = {}) {
  return zipStore(packageFiles(tpl, order))
}

/** طلب فيه أكثر من قالب: حزمة واحدة، لكل قالب مجلده — بلا ملفات مكررة ولا روابط ميتة */
export function bundleFiles(tpls, order = {}) {
  const out = []
  for (const tpl of tpls) {
    if (!tpl) continue
    for (const f of packageFiles(tpl, order)) out.push({ path: `${tpl.id}/${f.path}`, body: f.body })
  }
  return out
}

export function bundleZip(tpls, order = {}) {
  return zipStore(bundleFiles(tpls, order))
}

/** دليل التشغيل السريع في الإيصال = نفس README المُسلَّم داخل الحزمة، لا نسخة أخرى منه */
export function readmeText(tpl, order = {}) {
  const f = packageFiles(tpl, order).find((x) => x.path === 'README.md')
  return f ? f.body : ''
}

/**
 * ما الذي سيصلني تحديدًا: عدد الملفّات وحجمها قبل الضغط — بلا بناء أرشيف،
 * حتى تُستدعى أثناء عرض صفحة القالب. (ما يُنزَّل فعلًا أصغر من هذا الرقم.)
 */
export function packageIndex(tpl) {
  const files = packageFiles(tpl, {})
  return { count: files.length, paths: files.map((f) => f.path), kb: Math.max(1, Math.round(files.reduce((s, f) => s + f.body.length, 0) / 1024)) }
}
