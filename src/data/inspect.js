/**
 * خط الفحص الآلي خماسي الطبقات (Automated Inspection Pipeline).
 *
 * يُشغَّل لحظة رفع أي قالب إلى السوق، ويُعيد تقرير JSON واحدًا فيه درجة الخطر
 * والمخالفات والقرار. الهدف المعلن: ضبط القوالب كلها آليًا بدل مراجعة مئات
 * الملفات يدويًا — ومع ذلك **لا تدّعي هذه الطبقات ما لا تفعله**:
 *
 *   1. **الفحص التقني (tech)** — حظر الامتدادات التنفيذية (`.exe` `.bat` `.php`…)،
 *      وحظر الأكواد التنفيذية غير الآمنة (`eval`, `new Function`, `javascript:`,
 *      سكربتات خارجية غير مسموحة)، وسقوف العدد والحجم، ومسارات `../`.
 *   2. **البصمة البصرية (visual)** — بصمة perceptual لكل صورة (src/data/phash.js)
 *      ومطابقتها بمرجع الصور، وكشف التكرار داخل الإدراج. إن غاب قارئ الصور
 *      تُسجَّل «متجاوَزة بسبب» وتُضيف نقاطًا — لا تُمرَّر نظيفة.
 *   3. **حارس السياسة (policy)** — **قواعد حتمية لا نموذج لغوي**: لا اتصال
 *      بخدمة ذكاء اصطناعي خارجية في هذا المستودع (لا مفتاح ولا مُرسِل)، فالفحص
 *      قائمة قواعد موزونة تُقرأ نتيجتها وتُراجع. من أراد نموذجًا لغويًا يربطه
 *      لاحقًا behind نفس العقد: دالة تُعيد `{score, violations}`.
 *   4. **القرار (decision)** — 0–59 قبولٌ آلي، 60–84 حجرٌ مؤقت وطلب إثبات،
 *      85–100 رفضٌ آلي نهائي مع سببٍ برمجي يُرسل للبائع.
 *   5. **الشكاوى والتظلّم (appeals)** — بلاغٌ آلي متاح، وتجميدٌ فوري عند تكرار
 *      بلاغات حقوق الملكية، وتظلّمٌ يُفتح ولا يُغلق آليًا.
 *
 * كل قاعدة تحمل `id` و`weight` و`why` بالعربية والإنجليزية: التقرير يقول
 * «ماذا، أين، ولماذا» — فلا يصل البائعَ رقمٌ بلا معنى.
 */
import { duplicateOf, innerDuplicates, DUP_THRESHOLD, NEAR_EXACT } from './phash.js'
import { REPORT_FREEZE, applyReports, appealStateOf, stateOf } from './marketplace.js'

export const PIPELINE_VERSION = 1
export const LAYERS = ['tech', 'visual', 'policy', 'decision', 'appeals']

/** القرار: ثلاث عتباتٍ معلنة — وهي نفسها في الواجهة وفي الخادم */
export const BANDS = [
  { id: 'accept', min: 0, max: 59, verdict: 'accept' },
  { id: 'quarantine', min: 60, max: 84, verdict: 'quarantine' },
  { id: 'reject', min: 85, max: 100, verdict: 'reject' },
]
export const bandOf = (score) => BANDS.find((b) => score >= b.min && score <= b.max) || BANDS[2]

/** مجموع أوزان المخالفات، مقصوصًا عند ١٠٠ — تستعمله الطبقات الثلاث */
export const sumWeights = (violations = []) =>
  Math.min(100, Math.round((Array.isArray(violations) ? violations : []).reduce((s, v) => s + (Number(v.weight) || 0), 0)))

/* ================================================================== *
 * الطبقة ١ — الفحص التقني الفوري للملفات والكود
 * ================================================================== */

/** امتدادات تُرفض قطعًا: تنفيذية أو وسيطة خادم أو إعدادات مضيف */
export const BANNED_EXT = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.ps1',
  '.psm1',
  '.sh',
  '.bash',
  '.php',
  '.phtml',
  '.php3',
  '.php5',
  '.jar',
  '.scr',
  '.dll',
  '.msi',
  '.vbs',
  '.vbe',
  '.jsb',
  '.cgi',
  '.pl',
  '.py',
  '.rb',
  '.asp',
  '.aspx',
  '.jsp',
  '.war',
  '.apk',
  '.deb',
  '.bin',
  '.so',
  '.htaccess',
  '.env',
  '.pem',
  '.key',
  '.p12',
]

/** ما يُسمح به في حزمة قالب — وهي فعليًا ما تُنتجه حزمنا في src/data/deliverable.js */
export const ALLOWED_EXT = [
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.txt',
  '.svg',
  '.webmanifest',
  '.woff',
  '.woff2',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
  '.ico',
  '.map',
  '.xml',
]

export const MAX_FILES = 60
export const MAX_FILE_BYTES = 400_000
export const MAX_TOTAL_BYTES = 8_000_000
/** سطرٌ واحد أطول من هذا = حزمةٌ مضغوطة/مبهمة، لا كودٌ يُقرأ */
export const MAX_LINE = 2400

const ext = (p) => {
  const s = String(p || '').toLowerCase()
  const i = s.lastIndexOf('.')
  return i > 0 ? s.slice(i) : ''
}

/**
 * قواعد الكود. `hard: true` ⇒ القرار رفضٌ مهما كان مجموع النقاط، لأن الخطر
 * هنا نوعي لا كمّي (تنفيذ كود، أو تهريب مسار).
 */
export const CODE_RULES = [
  {
    id: 'eval',
    re: /\beval\s*\(/,
    weight: 60,
    hard: true,
    why: { ar: 'استدعاء eval() — تنفيذ كود من نص', en: 'A call to eval() — code executed from a string' },
  },
  {
    id: 'new-function',
    re: /new\s+Function\s*\(/,
    weight: 60,
    hard: true,
    why: { ar: 'بناء دالة من نص — الوجه الآخر لـeval', en: 'Building a function from a string — eval by another name' },
  },
  {
    id: 'javascript-uri',
    re: /javascript\s*:/i,
    weight: 60,
    hard: true,
    why: { ar: 'رابط javascript:‏ — تنفيذ عند النقر', en: 'A javascript: URI — runs on click' },
  },
  {
    id: 'child-process',
    re: /child_process|execSync|\bspawn\s*\(/,
    weight: 60,
    hard: true,
    why: { ar: 'استدعاء أوامر نظام من قالب', en: 'Shell commands called from a template' },
  },
  {
    id: 'atob-payload',
    re: /\batob\s*\(/,
    weight: 30,
    why: { ar: 'فكّ base64 — يُستعمل لإخفاء حمولة', en: 'Decoding base64 — used to hide a payload' },
  },
  {
    id: 'document-write',
    re: /document\.write\s*\(/,
    weight: 24,
    why: { ar: 'document.write يهدم الصفحة ويُستعمل للحقن', en: 'document.write wrecks the page and is used for injection' },
  },
  {
    id: 'data-uri-html',
    re: /data\s*:\s*text\/html/i,
    weight: 28,
    why: { ar: 'مستند HTML داخل data: — لا يُفحص محتواه', en: 'An HTML document inside a data: URI — its content is not inspectable' },
  },
  {
    id: 'external-script',
    re: /<script[^>]+src\s*=\s*["']https?:/i,
    weight: 34,
    why: { ar: 'سكربت خارجي — يتغيّر بعد الفحص', en: 'An external script — it can change after the check' },
  },
  {
    id: 'remote-frame',
    re: /<iframe[^>]+src\s*=\s*["']https?:/i,
    weight: 26,
    why: { ar: 'إطار خارجي يحمّل صفحة غير مفحوصة', en: 'An iframe loading an uninspected page' },
  },
  {
    id: 'remote-form',
    re: /<form[^>]+action\s*=\s*["']https?:/i,
    weight: 20,
    why: { ar: 'نموذج يُرسل بيانات المشتري إلى نطاق آخر', en: 'A form posting the buyer’s data to another domain' },
  },
  {
    id: 'remote-fetch',
    re: /\bfetch\s*\(\s*["'`]https?:|new\s+XMLHttpRequest/i,
    weight: 22,
    why: { ar: 'طلب شبكة إلى نطاق خارجي', en: 'A network request to an external domain' },
  },
  {
    id: 'tracker',
    re: /google-analytics|googletagmanager|doubleclick|facebook\.net\/tr|hotjar/i,
    weight: 30,
    why: { ar: 'متتبّع تحليلات يُزرع في موقع المشتري بلا إذنه', en: 'An analytics tracker planted on the buyer’s site without consent' },
  },
  {
    id: 'external-style',
    re: /<link[^>]+href\s*=\s*["']https?:[^"']*\.css/i,
    weight: 6,
    why: { ar: 'ورقة أنماط خارجية — تنكسر إن انقطعت', en: 'An external stylesheet — it breaks when offline' },
  },
  {
    id: 'inline-handler',
    re: /\son(?:error|load|click|mouseover)\s*=\s*["'][^"']*(?:fetch|eval|atob)/i,
    weight: 32,
    why: { ar: 'معالج حدث ينفّذ كودًا', en: 'An event handler running code' },
  },
]

/**
 * الطبقة الأولى: ملفاتٌ نصية (اسم + محتوى) تُفحص قاعدةً قاعدة.
 * @returns {{scanned:number, bytes:number, violations:object[], score:number, ok:boolean}}
 */
export function techLint(files = []) {
  const list = (Array.isArray(files) ? files : []).filter((f) => f && typeof f.path === 'string')
  const violations = []
  const push = (rule, path, match, extra = {}) =>
    violations.push({
      layer: 'tech',
      rule: rule.id,
      level: rule.hard ? 'block' : 'warn',
      weight: rule.weight,
      path,
      match: String(match || '').slice(0, 90),
      why: rule.why,
      ...extra,
    })

  let bytes = 0
  const seen = new Set()
  for (const f of list) {
    const body = typeof f.body === 'string' ? f.body : ''
    bytes += body.length
    const p = String(f.path)

    if (/\.\.(?:[\\/]|$)/.test(p) || /^[\\/]/.test(p) || /^[a-z]:/i.test(p)) {
      push(
        {
          id: 'path-traversal',
          weight: 60,
          hard: true,
          why: { ar: 'مسار يخرج من مجلد الحزمة (../)', en: 'A path escaping the package folder (../)' },
        },
        p,
        p,
      )
    }
    if (seen.has(p.toLowerCase())) {
      push({ id: 'duplicate-path', weight: 10, why: { ar: 'مسار مكرر في الحزمة', en: 'A duplicated path in the package' } }, p, p)
    }
    seen.add(p.toLowerCase())

    const e = ext(p)
    if (BANNED_EXT.includes(e)) {
      push(
        {
          id: 'banned-ext',
          weight: 100,
          hard: true,
          why: { ar: `امتداد محظور (${e}) — ملف تنفيذي أو وسيط خادم`, en: `A banned extension (${e}) — executable or server-side` },
        },
        p,
        e,
      )
    } else if (e && !ALLOWED_EXT.includes(e)) {
      push({ id: 'unknown-ext', weight: 12, why: { ar: `امتداد غير معروف (${e})`, en: `An unknown extension (${e})` } }, p, e)
    }
    if (body.length > MAX_FILE_BYTES) {
      push(
        {
          id: 'file-too-large',
          weight: 18,
          why: { ar: `ملف يتجاوز ${Math.round(MAX_FILE_BYTES / 1024)} ك.ب`, en: `A file over ${Math.round(MAX_FILE_BYTES / 1024)} kB` },
        },
        p,
        `${body.length} B`,
      )
    }
    const longest = body.split('\n').reduce((m, l) => Math.max(m, l.length), 0)
    if (longest > MAX_LINE) {
      push(
        {
          id: 'obfuscated',
          weight: 16,
          why: { ar: 'سطر واحد طويل جدًا — كود مضغوط أو مُبهم', en: 'A single very long line — minified or obfuscated code' },
        },
        p,
        `${longest} chars`,
      )
    }
    // محرف null: يُفحص بالشفرة لا بنمط (قاعدة no-control-regex مقصودة في هذا المستودع)
    if (body.includes('\u0000')) {
      push(
        {
          id: 'null-byte',
          weight: 60,
          hard: true,
          why: { ar: 'محرف null في الملف — حيلة تجاوز فحص', en: 'A null byte in the file — a filter-evasion trick' },
        },
        p,
        'NUL',
      )
    }
    for (const rule of CODE_RULES) if (rule.re.test(body)) push(rule, p, (body.match(rule.re) || [''])[0])
  }

  if (list.length > MAX_FILES) {
    violations.push({
      layer: 'tech',
      rule: 'too-many-files',
      level: 'warn',
      weight: 20,
      path: null,
      match: `${list.length}`,
      why: { ar: `أكثر من ${MAX_FILES} ملفًا في حزمة واحدة`, en: `More than ${MAX_FILES} files in one package` },
    })
  }
  if (bytes > MAX_TOTAL_BYTES) {
    violations.push({
      layer: 'tech',
      rule: 'total-too-large',
      level: 'warn',
      weight: 20,
      path: null,
      match: `${bytes} B`,
      why: {
        ar: `حجم الحزمة يتجاوز ${Math.round(MAX_TOTAL_BYTES / 1_000_000)} م.ب`,
        en: `The package exceeds ${Math.round(MAX_TOTAL_BYTES / 1_000_000)} MB`,
      },
    })
  }

  return { scanned: list.length, bytes, violations, score: sumWeights(violations), hard: violations.some((v) => v.level === 'block') }
}

/* ================================================================== *
 * الطبقة ٢ — البصمة البصرية (pHash)
 * ================================================================== */

/**
 * @param {{images:object[], reference?:object[], weights?:object}} opts
 *   `images` بصمات محسوبة في المتصفح: `{name, a, d, bytes, algo, source}`.
 *   `reference` قاعدة المرجع `{ref, a, d}` — من إدراجات البائع السابقة أو ملف الموظف.
 */
export function visualScan({ images = [], reference = [], weights = {} } = {}) {
  const list = (Array.isArray(images) ? images : []).filter(Boolean)
  const violations = []
  const push = (rule, name, match, weight) =>
    violations.push({
      layer: 'visual',
      rule,
      level: weight >= 40 ? 'block' : 'warn',
      weight,
      path: name,
      match: String(match || '').slice(0, 90),
      why: WHY[rule],
    })

  const scanned = list.filter((i) => i.a || i.d || i.phash)
  const skipped = list.filter((i) => !i.a && !i.d && !i.phash)

  // (أ) مطابقة المرجع: نسخة من قالب آخر أو صورة محمية
  for (const img of scanned) {
    const hit = duplicateOf({ a: img.a || img.phash, d: img.d || '' }, reference)
    if (hit) {
      const near = hit.similarity >= NEAR_EXACT
      push(near ? 'exact-duplicate' : 'near-duplicate', img.name, `${hit.ref || 'ref'} · ${(hit.similarity * 100).toFixed(1)}%`, near ? 48 : 30)
    }
  }

  // (ب) التكرار داخل الإدراج نفسه — لا يحتاج مرجعًا
  for (const dup of innerDuplicates(
    scanned.map((i) => ({ name: i.name, a: i.a || i.phash })),
    DUP_THRESHOLD,
  )) {
    push('inner-duplicate', `${dup.a} ↔ ${dup.b}`, `${(dup.similarity * 100).toFixed(1)}%`, 10)
  }

  // (ج) نفس البايتات تحت اسمين — إعادة تسمية لا تُغيّر المحتوى
  const byBytes = new Map()
  for (const img of list) {
    if (!img.bytes) continue
    if (byBytes.has(img.bytes)) push('byte-duplicate', img.name, byBytes.get(img.bytes), 14)
    else byBytes.set(img.bytes, img.name)
  }

  // (د) ما لم يُفحص: يُقال صراحة ويُوزن، فلا يُحسب نجاحًا
  const noCanvas = skipped.filter((i) => /no-canvas/.test(String(i.reason || '')))
  if (noCanvas.length) {
    violations.push({
      layer: 'visual',
      rule: 'layer-skipped',
      level: 'warn',
      weight: weights.skipped ?? 8,
      path: null,
      match: `${noCanvas.length} صورة`,
      why: WHY['layer-skipped'],
    })
  }
  const noRef = scanned.length > 0 && (!reference || reference.length === 0)
  return {
    assets: list.length,
    scanned: scanned.length,
    skipped: skipped.length,
    referenceSize: reference.length,
    /** بلا مرجع لا نقول «نظيفة»: نقول «لا مرجع بعد» وصفر نقاط */
    referenceMissing: noRef,
    algos: [...new Set(list.map((i) => i.algo).filter(Boolean))],
    violations,
    score: sumWeights(violations),
    hard: violations.some((v) => v.level === 'block'),
  }
}

/* ================================================================== *
 * الطبقة ٣ — حارس السياسة: قواعد حتمية موزونة
 * ================================================================== */

const AR = 'ar'
/**
 * قواعد النص. `re` قد تكون مصفوفة (أيٌّ منها يكفي)، و`max` يحدّ كم مرة تُحتسب
 * القاعدة — فعبارة «الأفضل» ثلاث مرات ليست ثلاثة أضعاف الخطر.
 */
export const POLICY_RULES = [
  {
    id: 'superlative',
    weight: 14,
    max: 2,
    re: [/الأفضل\b/, /رقم\s*1/, /#1\b/i, /لا\s*يُ?نافس/, /best in the world/i, /الأول\s*(?:عالميًا|في العالم)/, /الأقوى\b/, /the only/i],
    why: { ar: 'ادّعاء تفضيل لا يُثبت — «الأفضل» و«رقم ١»', en: 'An unprovable superlative — “the best”, “number one”' },
  },
  {
    id: 'guarantee',
    weight: 24,
    re: [/مضمون\s*(?:100|مائة|تمامًا)/, /100%\s*guarantee/i, /بلا\s*مخاطر/, /risk[- ]free/i, /نضمن\s*لك/],
    why: { ar: 'ضمانٌ مطلق لا تملكه المنصة ولا البائع', en: 'An absolute guarantee neither the platform nor the seller can hold' },
  },
  {
    id: 'income-claim',
    weight: 26,
    re: [/اكسب/, /دخل\s*(?:شهري|سلبي)/, /passive income/i, /\b\d{1,3}[kK]\s*(?:شهري|\/mo)/, /ثروة/, /make money fast/i],
    why: { ar: 'وعدٌ بدخل — يبيع أملًا لا قالبًا', en: 'A promise of income — selling hope, not a template' },
  },
  {
    id: 'contact-info',
    weight: 30,
    max: 2,
    re: [/(?:\+?966|0)?5\d{8}/, /واتساب|whatsapp|telegram|تيليجرام|سناب/i, /[\w.+-]+@[\w-]+\.[\w.]{2,}/],
    why: {
      ar: 'وسيلة تواصل مباشرة في الوصف — تتجاوز المنصة وترخيصها',
      en: 'Direct contact details in the description — bypassing the platform and its licence',
    },
  },
  {
    id: 'offplatform-payment',
    weight: 100,
    hard: true,
    re: [/paypal/i, /stc\s*pay/i, /حوالة\s*بنكية/, /خارج\s*المنصة/, /western union/i, /binance|usdt/i],
    why: {
      ar: 'طلب دفع خارج المنصة — يُفقد المشتري حماية الترخيص والاسترجاع',
      en: 'Payment requested off-platform — the buyer loses licence and refund protection',
    },
  },
  {
    id: 'placeholder',
    weight: 20,
    re: [/lorem ipsum/i, /نص\s*تجريبي/, /x{4,}/, /\bTODO\b/, /اكتب\s*هنا/],
    why: { ar: 'نصٌّ نائب لم يُستبدل', en: 'Placeholder text left in place' },
  },
  {
    id: 'unsupported-metric',
    weight: 14,
    re: [/\d{2,}\s*(?:مقابلة|عميل|مشروع|تحميل)/, /\d{2,}\s*(?:interviews|clients|hired)/i],
    why: {
      ar: 'رقمُ نتيجةٍ بلا سند — كل رقم في هذا المتجر معه مصدره',
      en: 'An outcome number with no source — every number in this store carries one',
    },
  },
  {
    id: 'brand-name',
    weight: 5,
    max: 2,
    re: [/\bAdobe\b/i, /\bFigma\b/i, /\bPhotoshop\b/i, /\bCanva\b/i, /\bLinkedIn\b/i],
    why: { ar: 'اسمٌ تجاري لطرف ثالث — يلزم إثبات حق الاستخدام', en: 'A third-party trademark — proof of usage rights is required' },
  },
  {
    id: 'prohibited',
    weight: 100,
    hard: true,
    re: [/قمار|مراهنات|gambling|casino/i, /إباحي|porn|nsfw/i, /سلاح|weapon|firearm/i, /كراهية|hate speech/i, /مخدرات|drugs/i],
    why: { ar: 'محتوى محظور في السوق', en: 'Content prohibited in the market' },
  },
  {
    id: 'free-forever',
    weight: 10,
    re: [/مجانًا\s*للأبد/, /free forever/i],
    why: { ar: '«مجانًا للأبد» مع سعرٍ معلَن — تناقض يُربك المشتري', en: '“Free forever” next to a listed price — a contradiction that misleads' },
  },
]

/** نصوص القواعد في مكان واحد: تستعملها الطبقتان الثانية والثالثة */
export const WHY = {
  'exact-duplicate': {
    ar: 'مطابقة شبه حرفية لصورة في المرجع — على الأرجح نفس الملف',
    en: 'A near-exact match to a reference image — most likely the same file',
  },
  'near-duplicate': { ar: 'تشابه بصري عالٍ مع صورة في المرجع', en: 'A high visual similarity to a reference image' },
  'inner-duplicate': { ar: 'صورتان بالبصمة نفسها داخل الإدراج', en: 'Two images with the same fingerprint inside the listing' },
  'byte-duplicate': { ar: 'الملف نفسه تحت اسمين', en: 'The same file under two names' },
  'layer-skipped': {
    ar: 'لم يعمل قارئ الصور في هذا المتصفح — الطبقة لم تُنفَّذ، فلا تُحسب نظيفة',
    en: 'No image decoder in this browser — the layer did not run, so it is not counted clean',
  },
}

/** كلماتٌ تُعدّ حشوًا إن تكررت: تُقاس بعدّ الظهور لا بوجود الكلمة */
const stuffing = (text) => {
  const words = String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 3)
  const counts = new Map()
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1)
  return [...counts.entries()].filter(([, n]) => n > 6).map(([w, n]) => `${w}×${n}`)
}

const emojiCount = (s) => (String(s || '').match(/\p{Extended_Pictographic}/gu) || []).length

/**
 * الطبقة الثالثة: فحص العنوان والوصف والوسوم والسعر.
 * تُعيد تقرير JSON مصغّرًا — وهو ما يُعرض للبائع حرفيًا.
 */
export function policyGuard({ title = '', desc = '', tags = [], price = null, category = '' } = {}) {
  const text = `${title}\n${desc}`
  const violations = []
  const push = (rule, match, weight, level) =>
    violations.push({
      layer: 'policy',
      rule: rule.id,
      level: level || (rule.hard ? 'block' : 'warn'),
      weight,
      path: null,
      match: String(match || '').slice(0, 90),
      why: rule.why,
    })

  for (const rule of POLICY_RULES) {
    const patterns = Array.isArray(rule.re) ? rule.re : [rule.re]
    let hits = 0
    let first = ''
    for (const re of patterns) {
      const m = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))
      if (m && m.length) {
        hits += m.length
        first = first || m[0]
      }
    }
    if (!hits) continue
    const times = rule.max ? Math.min(hits, rule.max) : 1
    for (let i = 0; i < times; i++) push(rule, first, rule.weight)
  }

  // قواعد بنيوية لا regex لها
  if (String(desc).trim().length < 40) {
    violations.push({
      layer: 'policy',
      rule: 'short-desc',
      level: 'warn',
      weight: 18,
      path: null,
      match: `${String(desc).trim().length}`,
      why: { ar: 'وصفٌ أقصر من ٤٠ حرفًا — لا يشرح ما يُباع', en: 'A description under 40 characters — it does not explain what is sold' },
    })
  }
  for (const s of stuffing(`${title} ${desc}`)) {
    violations.push({
      layer: 'policy',
      rule: 'keyword-stuffing',
      level: 'warn',
      weight: 14,
      path: null,
      match: s,
      why: { ar: 'كلمة مكررة لحشو البحث', en: 'A repeated word, stuffed for search' },
    })
  }
  if (/^[A-Z0-9\s!?.-]{8,}$/.test(String(title).trim()) && /[A-Z]{4,}/.test(String(title))) {
    violations.push({
      layer: 'policy',
      rule: 'shouting',
      level: 'warn',
      weight: 8,
      path: null,
      match: title,
      why: { ar: 'عنوان بحروف كبيرة كلها', en: 'A title in all capitals' },
    })
  }
  if ((String(title).match(/!/g) || []).length > 2) {
    violations.push({
      layer: 'policy',
      rule: 'shouting',
      level: 'warn',
      weight: 8,
      path: null,
      match: '!',
      why: { ar: 'علامات تعجب زائدة في العنوان', en: 'Too many exclamation marks in the title' },
    })
  }
  if (emojiCount(title) + emojiCount(desc) > 6) {
    violations.push({
      layer: 'policy',
      rule: 'emoji-spam',
      level: 'warn',
      weight: 6,
      path: null,
      match: `${emojiCount(title) + emojiCount(desc)}`,
      why: { ar: 'رموز تعبيرية أكثر من النص', en: 'More emoji than text' },
    })
  }
  if (Array.isArray(tags) && tags.length > 6) {
    violations.push({
      layer: 'policy',
      rule: 'too-many-tags',
      level: 'warn',
      weight: 8,
      path: null,
      match: `${tags.length}`,
      why: { ar: 'أكثر من ست وسوم', en: 'More than six tags' },
    })
  }
  if (price != null && Number(price) > 0 && /مجانًا|free\b/i.test(`${title} ${desc}`)) {
    violations.push({
      layer: 'policy',
      rule: 'price-contradiction',
      level: 'warn',
      weight: 12,
      path: null,
      match: `${price}`,
      why: { ar: '«مجاني» في النص وسعر في الحقل', en: '“Free” in the copy and a price in the field' },
    })
  }
  if (category && !['portfolio', 'cv', 'bundle', 'kit'].includes(category)) {
    violations.push({
      layer: 'policy',
      rule: 'bad-category',
      level: 'warn',
      weight: 6,
      path: null,
      match: category,
      why: { ar: 'تصنيف خارج القائمة', en: 'A category outside the list' },
    })
  }

  return {
    text: { titleChars: String(title).length, descChars: String(desc).trim().length, tags: Array.isArray(tags) ? tags.length : 0 },
    violations,
    score: sumWeights(violations),
    hard: violations.some((v) => v.level === 'block'),
  }
}

/* ================================================================== *
 * الطبقة ٤ — مقياس الخطر والقرار
 * ================================================================== */

/**
 * القرار من المجموع. `hard` ترفعه إلى 92 مهما كان المجموع: خطرٌ نوعي
 * (تنفيذ كود، دفع خارجي، محتوى محظور) لا يُعوَّض بنظافة بقية الطبقات.
 */
export function decide({ tech, visual, policy }) {
  const all = [...(tech?.violations || []), ...(visual?.violations || []), ...(policy?.violations || [])]
  const raw = sumWeights(all)
  const hard = !!(tech?.hard || visual?.hard || policy?.hard)
  const score = hard ? Math.max(raw, 92) : raw
  const band = bandOf(score)
  return {
    score,
    raw,
    hard,
    verdict: band.verdict,
    band: band.id,
    min: band.min,
    max: band.max,
    /** كم مخالفة من كل نوع — يُعرض في التقرير */
    counts: {
      block: all.filter((v) => v.level === 'block').length,
      warn: all.filter((v) => v.level === 'warn').length,
      tech: (tech?.violations || []).length,
      visual: (visual?.violations || []).length,
      policy: (policy?.violations || []).length,
    },
  }
}

/** ما يعنيه كل قرار — نصٌّ واحد تستعمله الواجهة والخادم ورسالة البائع */
export const VERDICTS = {
  accept: {
    ar: 'قُبل آليًا — يُنشر فورًا بلا تدخل بشري',
    en: 'Accepted automatically — published at once, no human in the loop',
  },
  quarantine: {
    ar: 'حجرٌ مؤقت — يُطلب من البائع تعديل الأصول أو إرفاق التراخيص',
    en: 'Quarantined — the seller is asked to fix the assets or attach the licences',
  },
  reject: {
    ar: 'رفضٌ آلي نهائي — يُرسل سبب الرفض البرمجي للبائع',
    en: 'Rejected automatically — the programmatic reason is sent to the seller',
  },
}

/* ================================================================== *
 * الطبقة ٥ — الشكاوى والتظلّم
 * ================================================================== */

/** أنواع البلاغ: `rights` هي التي تُجمّد عند التكرار */
export const REPORT_KINDS = ['rights', 'malware', 'spam', 'other']
export const kindOfReport = (v) => (REPORT_KINDS.includes(v) ? v : 'other')

/**
 * حالة الشكاوى والتظلّم لإدراج. لا تحكم ولا تحذف: تُجمّد عند العتبة وتفتح
 * التظلّم — والقرار النهائي لموظف، لأن التجميد الآلي إجراءٌ لا حكم.
 */
export function appealsLayer(listing = {}) {
  const reports = applyReports(listing.reports)
  return {
    reports,
    frozen: reports.frozen,
    threshold: REPORT_FREEZE,
    appeal: appealStateOf(listing.appeal?.state),
    appealText: listing.appeal?.text ? String(listing.appeal.text).slice(0, 600) : '',
    /** الحالة النهائية: التجميد يسبق ما قرره الفحص */
    state: reports.frozen ? 'frozen' : stateOf(listing.state),
  }
}

/* ================================================================== *
 * الخط كله
 * ================================================================== */

/**
 * يشغّل الطبقات الأربع الأولى ويُعيد تقريرًا واحدًا.
 *
 * @param {object} listing إدراج منقّى (sanitizeListing)
 * @param {{reference?:object[], at?:Date}} opts مرجع الصور وساعة ثابتة للفحص
 * @returns {object} تقرير JSON: `{ v, at, layers, score, verdict, reasons }`
 */
export function inspectListing(listing = {}, { reference = [], at = new Date() } = {}) {
  const tech = techLint(listing.files)
  const visual = visualScan({ images: listing.images, reference })
  const policy = policyGuard({ title: listing.title, desc: listing.desc, tags: listing.tags, price: listing.price, category: listing.category })
  const decision = decide({ tech, visual, policy })
  const reasons = [...tech.violations, ...visual.violations, ...policy.violations]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12)
    .map((v) => ({ rule: v.rule, layer: v.layer, level: v.level, weight: v.weight, path: v.path, match: v.match, why: v.why }))

  return {
    v: PIPELINE_VERSION,
    at: at.toISOString(),
    title: listing.title || '',
    layers: {
      tech: {
        scanned: tech.scanned,
        bytes: tech.bytes,
        violations: tech.violations.length,
        score: tech.score,
        hard: tech.hard,
        detail: tech.violations,
      },
      visual: {
        assets: visual.assets,
        scanned: visual.scanned,
        skipped: visual.skipped,
        referenceSize: visual.referenceSize,
        referenceMissing: visual.referenceMissing,
        algos: visual.algos,
        violations: visual.violations.length,
        score: visual.score,
        hard: visual.hard,
        detail: visual.violations,
      },
      policy: { ...policy.text, violations: policy.violations.length, score: policy.score, hard: policy.hard, detail: policy.violations },
    },
    score: decision.score,
    rawScore: decision.raw,
    hard: decision.hard,
    verdict: decision.verdict,
    band: decision.band,
    counts: decision.counts,
    reasons,
    action: VERDICTS[decision.verdict],
  }
}

/** الحالة التي يصير إليها الإدراج من تقرير الفحص */
export const stateFromVerdict = (verdict) => (verdict === 'accept' ? 'published' : verdict === 'quarantine' ? 'quarantined' : 'rejected')

/**
 * التقرير نصًّا — يُطبع في صفحة البائع ويُرفق برسالة الرفض. `lang` تختار
 * لغة `why`؛ البنية واحدة في اللغتين فلا يختلف ما يُفحص عمّا يُقرأ.
 */
export function reportText(report, lang = AR) {
  const L = lang === 'en' ? 'en' : 'ar'
  const lines = [`${L === 'ar' ? 'الدرجة' : 'Score'}: ${report.score}/100 — ${report.verdict}`]
  for (const r of report.reasons)
    lines.push(`• [${r.layer}/${r.rule}] ${r.path ? `${r.path}: ` : ''}${(r.why || {})[L] || r.rule}${r.match ? ` (${r.match})` : ''}`)
  if (!report.reasons.length) lines.push(L === 'ar' ? '• لا مخالفات' : '• No violations')
  if (report.layers.visual.referenceMissing) {
    lines.push(
      L === 'ar'
        ? '• لا مرجع صور بعد — طبقة البصمة قارنت داخل الإدراج فقط'
        : '• No image reference yet — the fingerprint layer compared within the listing only',
    )
  }
  return lines.join('\n')
}

export default { inspectListing, techLint, visualScan, policyGuard, decide, appealsLayer, BANDS }
