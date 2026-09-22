/**
 * مطابقة السيرة بإعلان الوظيفة — القياسُ كله في المتصفح، بلا حسابٍ وبلا إرسال.
 *
 * لماذا هذا الملف وحده؟ لأن المطابقة تُستهلك في أربعة وجوه يجب أن تقيس الشيء نفسه:
 *   1. /match — الفحص المجاني (نسبةٌ عامة) والتقرير المدفوع (الكلمات الناقصة ونقاط
 *      التعديل والقالب المناسب).
 *   2. /kit — مولّد ملف التقديم: نفس الكلمات الناقصة تُبنى عليها نقاط السيرة والخطاب.
 *   3. /embed — نسخة الـB2B المضمّنة: ذات المحرّك بذات الأوزان.
 *   4. دليل المواهب وتقرير السوق: يقرآن «جاهزية المطابقة» من هنا، لا من رقمٍ مكتوب.
 *
 * المنهج: لا ذكاءً اصطناعيًّا ولا خدمةً خارجية. الإعلان يُجزّأ إلى كلماتٍ وعباراتٍ
 * موزونة (كلمةٌ في العنوان أثقل منها في المتن)، ثم يُنظر أيُّها حاضرٌ في السيرة
 * وأيُّها غائب. النسبةُ هي وزنُ الحاضر من وزنِ المطلوب — لا «عدد الكلمات المطابقة»
 * التي تجعل إعلانًا طويلًا أسهل من إعلانٍ قصير.
 *
 * ولا نبيعُ وهمًا: الكلمةُ الغائبةُ ليست خبرةً ناقصة. كلُّ نقطةِ تعديلٍ تُخرجها
 * `editPoints` مشروطةٌ بـ«إن كنت تعمل بها» — المطلوبُ أن تُكتب ما تعرفه بلغة
 * الإعلان، لا أن تُضاف كلمةٌ إلى سيرةٍ لا تسندها.
 */
import { analyzeAts } from './ats.js'
import { categories, templates } from './templates.js'

/* ───────────────────────────── التنقية والتطبيع ───────────────────────────── */

const DIACRITICS = /[ً-ْٰـ]/g
const ALEF = /[أإآٱ]/g

/** توحيدُ ما يُكتب بأشكالٍ شتّى: الألفات والياء والتاء المربوطة والأرقام العربية */
export function normalizeWord(w) {
  return String(w || '')
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(ALEF, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(48 + d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(48 + d.charCodeAt(0) - 0x06f0))
    .replace(/[^\p{L}\p{N}+#.]/gu, '')
    .trim()
}

/**
 * كلمةٌ عربيةٌ من ثلاثة أحرف فأكثر، أو لاتينيةٌ من حرفين فأكثر (js، ux، qa، ml).
 * واوُ العطفِ الملصقة بكلمةٍ لاتينية («وTypeScript») تُشطب: هي أداةٌ لا جزءٌ من
 * الاسم، وتركها يجعل «TypeScript» و«وTypeScript» كلمتين لا تلتقيان.
 */
const wordOk0 = (w) => /[\p{L}]/u.test(w) && ((/[\p{Script=Arabic}]/u.test(w) && w.length >= 3) || w.length >= 2)
const wordOk = (w) => wordOk0(w.replace(/^[وفبكل](?=[a-z]{2,})/i, ''))

/** نصّ ← كلماتٌ موحّدة، بلا Stopwords وبلا أرقامٍ مفردة */
export function tokens(text) {
  return String(text || '')
    .split(/[\s,;:!?()[\]{}"'`|/\\·،؛؟«»<>+*=~_—–-]+/u)
    .map(normalizeWord)
    .filter((w) => wordOk(w) && !STOP.has(w) && !/^\d+$/.test(w))
}

/* ───────────────────────────── كلماتُ اللغة ───────────────────────────── */
/* حشوٌّ لا معنى له لو حُسب: أدواتٌ وأفعالٌ عامة وصفاتُ إعلانٍ تتكرر في كل وظيفة.
 * تُمرَّر كلها على `normalizeWord`، فـ«على» و«علي» و«عَلِيَ» كلمةٌ واحدة عندنا. */
const RAW_STOP = (
  'من في على عن إلى الى مع أو و او ثم بل لكن كما مثل هذا هذه ذلك تلك الذي التي الذين اللاتي هو هي هم نحن أنت أن إن كان كانت يكون ليست ليس ' +
  'كل بعض كلما عند بعد قبل بين تحت فوق حاليا جدا جيد ممتاز قوي قويه مطلوب مطلوبه يفضل يرجى يجب يمكن سوف قد لم لن ما لا نعم ' +
  'عمل وظيفة وظيفه وظائف شركة شركه مؤسسة فريق فرق مرشح مقدم طلب متقدم خبرة خبرات سنه سنوات عام اعوام شهر اشهر مهارات مهارة ' +
  'قدرة قدرات مجال قطاع بيئة راتب مزايا دوام موقع المدينة مدينه الوظيفي الوظيفية الوصف المهام مسؤول مسؤوليات المتطلبات الشروط ' +
  'الرياض جده جدة الدمام الخبر مكه مكة ابها الطائف السعوديه السعودية الرياض عن بعد حضوري جزئي كامل تقديم المتقدمين المرشحين ' +
  'الدور المسمى الوصف نبذه نحن لدينا منتج منتجات شركتنا وظيفتك دورك المرشحه المرشح نحنها ' +
  +'the a an of in on at to for with and or by from as is are was were be been being will would can could should must have has had ' +
  'we you they our your their its this that these those who whom which what where when how not no yes all any some more most very ' +
  'role job work team company candidate applicants apply application experience years year skills skill ability strong excellent good ' +
  'great plus bonus nice must requirement requirements responsibilities duties tasks salary benefits full time part remote office ' +
  'looking seeking join hiring position opportunity environment culture dynamic fast paced passionate motivated hands degree ' +
  'about us contact send cv resume please join our grow growing help support use using well across within both such own same than'
).split(/\s+/)
const STOP = new Set(RAW_STOP.map(normalizeWord).filter(Boolean))

/* ───────────────────────────── مرادفاتٌ عربية–إنجليزية ─────────────────────────────
 * سيرةٌ عربية وإعلانٌ ثنائيّ اللغة: «مهندسة واجهات أمامية» هي Frontend Engineer،
 * ولا تحليلُ مفرداتٍ يرى هذا وحده. الجدولُ صريحٌ ومفتوح، وفيه ما نثق به فقط:
 * كلمةٌ غائبةٌ من لغةٍ أخرى ليست نقصَ خبرة، وبهذا تُقرأ لا كأنها مطلبٌ جديد. */
const RAW_SYNONYMS = [
  ['مهندس', 'مهندسه', 'engineer', 'engineering', 'مهندسين'],
  ['واجهات اماميه', 'واجهه اماميه', 'frontend', 'front end', 'frondend'],
  ['واجهات خلفيه', 'واجهه خلفيه', 'backend', 'back end'],
  ['مطور', 'مطوره', 'developer', 'develop', 'تطوير', 'برمجه', 'برمجة', 'software'],
  ['اداء', 'performance', 'سرعه', 'سرعة', 'lcp', 'تحسين'],
  ['وصوليه', 'accessibility', 'a11y', 'wcag', 'نفاذ'],
  ['اختبار', 'اختبارات', 'testing', 'test', 'tests', 'qa', 'جوده', 'جودة'],
  ['بيانات', 'data', 'تحليل', 'analytics', 'analysis', 'محلل', 'محلله', 'analyst'],
  ['اداره', 'management', 'manager', 'مدير', 'مديره', 'اداري'],
  ['مشروع', 'مشاريع', 'projects', 'project', 'اداره المشاريع'],
  ['فريق', 'فرق', 'team', 'teams'],
  ['تواصل', 'communication', 'مهارات التواصل', 'اتصال'],
  ['قياده', 'قيادة', 'leadership', 'lead', 'قائد', 'قائده'],
  ['محتوى', 'content', 'كتابه', 'كتابة', 'writing', 'writer', 'كاتب', 'كاتبه'],
  ['تسويق', 'marketing', 'seo', 'تحسين محركات', 'social', 'وسائل التواصل'],
  ['ماليه', 'مالية', 'finance', 'محاسبه', 'محاسبة', 'accounting', 'حسابات'],
  ['عملاء', 'خدمة العملاء', 'customer', 'service', 'دعم', 'support'],
  ['امن', 'أمن', 'security', 'cyber', 'سيبراني'],
  ['سحابه', 'سحابة', 'cloud', 'aws', 'azure', 'gcp'],
  ['شبكات', 'network', 'networking'],
  ['ذكاء', 'ai', 'تعلم الاله', 'machine learning', 'ml', 'الذكاء الاصطناعي'],
  ['react', 'reactjs'],
  ['typescript', 'ts'],
  ['javascript', 'js'],
  ['node', 'nodejs'],
  ['python', 'py'],
  ['git', 'github', 'gitlab', 'version control'],
  ['excel', 'جداول', 'spreadsheet'],
  ['sql', 'mysql', 'postgres', 'قواعد البيانات', 'database'],
  ['docker', 'kubernetes', 'k8s', 'containers', 'حاويات'],
  ['agile', 'scrum', 'kanban', 'رشيق'],
  ['تصميم', 'design', 'designer', 'مصمم', 'مصممه'],
  ['نظام التصميم', 'design system', 'design systems'],
  ['واجهه', 'واجهات', 'ui', 'user interface'],
  ['rtl', 'يمين', 'الاتجاه من اليمين', 'bidi'],
  ['تعليم', 'education', 'degree', 'شهاده', 'شهادة'],
  ['خبرة', 'experience', 'خبرات'],
  ['مهارات', 'skills', 'مهاره'],
  ['تدريب', 'training', 'intern', 'متدرب', 'internship'],
]
const SYN = new Map() // كلمة ← مجموعةُ مرادفاتها (بعد التطبيع نفسه)
for (const group of RAW_SYNONYMS) {
  const set = new Set(group.map(normalizeWord).filter(Boolean))
  for (const w of set) SYN.set(w, new Set([...(SYN.get(w) || []), ...set]))
}
/** مرادفاتُ الكلمة: هي ومجموعتُها — بلا ادّعاءِ فهمٍ للغة */
export const synonymsOf = (term) => [...(SYN.get(normalizeWord(term)) || new Set([normalizeWord(term)]))]

/* عباراتٌ مركّبة: معناها ليس مجموع مفرداتها، فتُقاس وحدها — ولا تُستخرج آليًا،
 * لأن استخراج الأزواج المتلاصقة يُخرج «الرياض كامل» و«نماء الرقمية» مفرداتٍ مطلوبة. */
const PHRASES = [
  'machine learning',
  'deep learning',
  'design system',
  'design systems',
  'user experience',
  'user interface',
  'unit test',
  'unit tests',
  'code review',
  'version control',
  'continuous integration',
  'problem solving',
  'data analysis',
  'data science',
  'project management',
  'product management',
  'quality assurance',
  'customer service',
  'technical support',
  'business development',
  'social media',
  'content strategy',
  'search engine',
  'power bi',
  'react native',
  'node js',
  'cross functional',
  'team player',
  'attention to detail',
  'communication skills',
  'time management',
  'a b testing',
  'react native',
  'cicd',
  'ci cd',
  'تعلم الاله',
  'تعلم الالي',
  'اداء الويب',
  'نظام التصميم',
  'واجهات اماميه',
  'واجهات خلفيه',
  'اختبارات وحده',
  'مراجعه الكود',
  'تحليل البيانات',
  'تحليل بيانات',
  'خدمه العملاء',
  'اداره المشاريع',
  'تجربه المستخدم',
  'قواعد البيانات',
  'وسائل التواصل',
  'العمل الجماعي',
  'حل المشكلات',
  'الاتجاه من اليمين',
  'الفرز الالي',
  'تحسين محركات',
  'الوصوليه',
  'اداره الوقت',
  'مهارات التواصل',
  'العمل عن بعد',
  'اداره الفريق',
  'تحسين الاداء',
]
const PHRASE_NORM = PHRASES.map((x) => x.split(/\s+/).map(normalizeWord).join(' ')).filter((x) => x.includes(' '))

/* ───────────────────────────── الاستخراج الموزون ───────────────────────────── */

/** نصّ ← خريطةُ {كلمة: عدد} مع تجاهل التكرار المتجاور */
function tally(list) {
  const m = new Map()
  for (const w of list) m.set(w, (m.get(w) || 0) + 1)
  return m
}

/**
 * كلماتُ نصٍّ موزونةً: ما ظهر في أول سطرين (العنوان والمسمى) يُضاعَف وزنُه، فليست
 * «مهندس واجهات» في العنوان ككلمةٍ عابرةٍ في المتن. والعباراتُ المركّبة تُحسب
 * وحدها بوزنِ ثلاثِ كلمات، لأن «نظام التصميم» مطلبٌ واحد لا مطلبان.
 */
export function termsOf(text, { limit = 34, headLines = 2 } = {}) {
  const lines = String(text || '')
    .split('\n')
    .filter((l) => l.trim())
  if (!lines.length) return []
  const head = lines.slice(0, headLines).join(' ')
  const body = lines.join(' ')
  const headT = tally(tokens(head))
  const bodyT = tally(tokens(body))
  const flat = tokens(body).join(' ')
  const flatHead = tokens(head).join(' ')
  const w = new Map()
  const add = (k, v) => w.set(k, (w.get(k) || 0) + v)
  for (const [k, v] of bodyT) add(k, v)
  for (const [k, v] of headT) add(k, v * 3)
  for (const p of PHRASE_NORM) {
    if (flat.includes(p)) add(p, flatHead.includes(p) ? 6 : 3)
    else continue
    // مفرداتُ العبارة تُشطب: «تعلم» و«الآلة» لا يُطلبان مرتين مع «تعلم الآلة»
    for (const part of p.split(' ')) w.delete(part)
  }
  // كلمةٌ ظهرت مرةً واحدة في المتن وليست في العنوان = حشوُ إعلان (اسمُ شركة، مدينة،
  // «الدور») لا مطلبًا: تُشطب، فلا تُخفض النسبةَ على من لا يعرف اسمَ الشركة من قبل.
  return [...w.entries()]
    .filter(([, v]) => v >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, weight]) => ({ term, weight: Math.round(weight * 10) / 10 }))
}

/** الكلمات الحاضرة في السيرة وحدها — تُعرض لتقليم ما لا يخدم الإعلان */
function cvTerms(text, limit = 60) {
  const t = tally(tokens(text))
  const flat = tokens(text).join(' ')
  const w = new Map(t)
  for (const p of PHRASE_NORM) if (flat.includes(p)) w.set(p, 3)
  return [...w.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, weight]) => ({ term, weight }))
}

/* ───────────────────────────── القياس ───────────────────────────── */

export const MATCH_BANDS = [
  {
    min: 80,
    label: { ar: 'مطابق — أرسلها كما هي', en: 'Aligned — send it as it is' },
    note: {
      ar: 'مفرداتُ الإعلان حاضرةٌ في سيرتك؛ رتّب الأقسام ولا تزد كلمة.',
      en: 'The posting’s words are already in your CV; re-order, do not add.',
    },
  },
  {
    min: 60,
    label: { ar: 'قريب — فجواتٌ قليلة تُسدّ في عشر دقائق', en: 'Close — a few gaps, ten minutes of work' },
    note: {
      ar: 'ما ينقصك مفرداتٌ لا خبرة: أعد كتابة نقاطك القائمة بلغة الإعلان.',
      en: 'What is missing is wording, not experience: rewrite what you have in the post’s language.',
    },
  },
  {
    min: 40,
    label: { ar: 'مطابقةٌ جزئية — يحتاج إعادة صياغة', en: 'Partial — needs a rewrite pass' },
    note: {
      ar: 'أعد ترتيب المهارات والملخص على الكلمات الناقصة قبل الإرسال.',
      en: 'Re-order your skills and summary around the missing words before you send.',
    },
  },
  {
    min: 0,
    label: { ar: 'بعيد — لا تُرسلها هكذا', en: 'Far — do not send it like this' },
    note: {
      ar: 'إمّا الإعلانُ ليس في مجالك، وإمّا سيرتك مكتوبةٌ بلغةٍ أخرى.',
      en: 'Either the post is not your field, or your CV is written in another language.',
    },
  },
]

/** القسمُ الذي تُوضع فيه الكلمة: مهارةٌ تقنية ← المهارات، وفعلُ أثرٍ ← الخبرة */
const SKILL_HINT =
  /(javascript|typescript|react|vue|angular|node|python|java|php|ruby|go|rust|sql|nosql|docker|kubernetes|aws|azure|gcp|git|figma|photoshop|illustrator|premiere|after|blender|unity|unreal|excel|power|tableau|sap|oracle|linux|css|html|sass|tailwind|vite|next|django|flask|laravel|spring|android|ios|swift|kotlin|flutter|reactnative|seo|crm|erp|jira|agile|scrum|wcag|a11y|api|rest|graphql|ci|cd|jest|cypress|playwright|برمج|موقع|واجهه|واجهات|تصميم|جرافيك|فوتوشوب|اليستريتور|بريميير|مونتاج|تحليل|بيانات|excel|جداول|حساب|ماليه|محاسبه|تسويق|كتابه|كتابة|ترجمه|ترجمة|اداره|إدارة|مشاريع|قياده|قيادة|شبكات|امن|أمن|سحابه|سحابة|قواعد|ذكاء|تعلم|آله|آلة)/i

const whereOf = (term) => (SKILL_HINT.test(term) ? 'skills' : 'experience')

/**
 * القياس نفسه في الوجوه الأربعة.
 * @returns نتيجةٌ فيها النسبةُ والحاضرُ والغائبُ ونقاطُ التعديل والقالب المناسب
 */
export function matchCv(cvText, jobText, { limit = 34 } = {}) {
  const cv = String(cvText || '')
  const job = String(jobText || '')
  const need = termsOf(job, { limit })
  const cvMap = new Map(cvTerms(cv).map((x) => [x.term, x.weight]))
  const cvFlat = normalizeWord(cv.replace(/\s+/g, ' '))

  const has = (term) => {
    if (cvMap.has(term)) return cvMap.get(term)
    for (const v of synonymsOf(term)) {
      if (cvMap.has(v)) return cvMap.get(v)
      // مطابقةٌ متسامحة: «تعلم آله» مقابل «تعلم الآلة»، و«react.js» مقابل «react»
      if (v.length > 3 && cvFlat.includes(v)) return 1
    }
    return 0
  }

  const matched = []
  const missing = []
  let got = 0
  let total = 0
  for (const { term, weight } of need) {
    total += weight
    const n = has(term)
    if (n) {
      got += weight
      matched.push({ term, weight, cv: n })
    } else {
      missing.push({ term, weight, where: whereOf(term) })
    }
  }
  const extra = cvTerms(cv)
    .filter((x) => !need.some((n) => n.term === x.term) && x.term.length > 3 && !/^\d+$/.test(x.term))
    .slice(0, 10)

  const score = total > 0 ? Math.min(100, Math.round((got / total) * 100)) : 0
  const band = MATCH_BANDS.find((b) => score >= b.min) || MATCH_BANDS[MATCH_BANDS.length - 1]
  const ats = analyzeAts(cv)
  return {
    score,
    band,
    keywords: need.length,
    matchedCount: matched.length,
    missingCount: missing.length,
    matched,
    missing,
    extra,
    ats,
    // جاهزيةٌ مركّبة: البنيةُ (ATS) والمفردات (المطابقة) — يُعرضان منفصلين دائمًا،
    // فلا يُخلط «سيرتي مقروءة» بـ«سيرتي مناسبة لهذه الوظيفة».
    ready: ats.score == null ? null : Math.round(score * 0.6 + ats.score * 0.4),
    enough: need.length >= 6,
    tooShort: need.length < 6,
  }
}

/* ───────────────────────────── نقاطُ التعديل ───────────────────────────── */

/**
 * من الكلمات الغائبة إلى سطورٍ تُكتب. كلُّ سطرٍ مشروطٌ بـ«إن كنت»: الأداةُ تقترح
 * صياغةً لما تعرفه، ولا تخترع خبرةً ليس لها أصلٌ في السيرة.
 */
export function editPoints(res, { lang = 'ar', n = 8 } = {}) {
  const ar = lang !== 'en'
  return (res?.missing || []).slice(0, n).map((m) => {
    const skills = m.where === 'skills'
    const where = skills ? (ar ? 'قسم المهارات' : 'your skills block') : ar ? 'نقطة خبرة' : 'an experience bullet'
    const text = skills
      ? ar
        ? `أضف «${m.term}» إلى قسم المهارات إن كنت تعمل بها فعلًا — ولا تُضفه إن لم تعمل به.`
        : `Add “${m.term}” to your skills block if you actually use it — and not otherwise.`
      : ar
        ? `اكتب نقطة خبرة تبدأ بفعلٍ وتذكر «${m.term}» وتنتهي برقم.`
        : `Write an experience bullet that starts with a verb, names “${m.term}”, and ends with a number.`
    const sample = skills
      ? ar
        ? `${m.term} — المستوى: (مبتدئ / متوسط / متقدم)`
        : `${m.term} — level: (basic / working / advanced)`
      : ar
        ? `- فعل + ${m.term} + أثر + رقم: «أعدتُ بناء كذا بـ ${m.term}، فانخفض كذا ٤٠٪ في ثلاثة أشهر».`
        : `- verb + ${m.term} + effect + number: “rebuilt X with ${m.term}, cutting Y 40% in three months”.`
    return { term: m.term, weight: m.weight, where, text, sample }
  })
}

/* ───────────────────────────── القالب المناسب ───────────────────────────── */

/** بذورٌ لكل تصنيف: كلمةٌ في الإعلان تجرّ التصنيفَ الذي يليق به */
const FIELD_SEEDS = [
  {
    id: 'dev',
    re: /برمج|مطوّ?ر|مهندس|تطوير|تقني|software|engineer|develop|frontend|backend|full|stack|devops|data|kubernetes|react|python|api|it|تقنيه|تقنية|شبكات|أمن|security/i,
  },
  { id: 'design', re: /مصمم|تصميم|جرافيك|واجهه|واجهات|تجربه|تجربة|مستخدم|design|ui|ux|graphic|brand|figma|illustrat/i },
  { id: 'photo', re: /مصور|تصوير|فيديو|مونتاج|photo|video|film|camera|edit/i },
  { id: 'motion', re: /موشن|ثلاثي|تحريك|animat|motion|3d|blender|after/i },
  { id: 'content', re: /كاتب|كتابه|كتابة|محتوى|تحرير|ترجمه|ترجمة|تسويق|writer|content|copy|edit|market|seo|social/i },
  {
    id: 'corporate',
    re: /مدير|إداره|إدارة|ماليه|مالية|محاسبه|محاسبة|موارد|مشروعات|مشاريع|manager|finance|account|hr|operations|project|sales|consult/i,
  },
  { id: 'graduate', re: /خريج|طالب|متدرب|تدريب|حديث|جراد|graduate|junior|intern|trainee|entry|fresh/i },
]

/** التصنيفُ الأرجح من نصّ الإعلان — ومنه تُقترح القوالب، لا من تفضيلٍ مكتوب */
export function fieldOf(text) {
  const src = String(text || '')
  const hits = FIELD_SEEDS.map((f) => ({ id: f.id, n: (src.match(new RegExp(f.re.source, 'gi')) || []).length })).sort((a, b) => b.n - a.n)
  return hits[0]?.n > 0 ? hits[0].id : 'general'
}

/**
 * توصيةُ قالب: قوالبُ التصنيف الأرجح مرتّبةً بالتقييم، ثم أعلى سيرةٍ جاهزةٍ للفرز
 * الآلي إن لم يكن في التصنيف ما يكفي. لا قائمةً تُكتب يدويًا.
 */
export function pickTemplates(text, { n = 3, field } = {}) {
  const f = field || fieldOf(text)
  const inField = templates.filter((x) => (x.cats || []).includes(f)).sort((a, b) => (b.rating || 0) - (a.rating || 0))
  const atsCv = templates
    .filter((x) => x.ats != null)
    .sort((a, b) => (b.ats || 0) - (a.ats || 0))
    .slice(0, 2)
  const seen = new Set()
  return [...inField, ...atsCv].filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, n)
}

export const fieldLabel = (id) => categories.find((c) => c.id === id) || { id, ar: 'عام', en: 'General' }

/* ───────────────────────────── التقرير ───────────────────────────── */

const line = (s) => s.replace(/\s*\n\s*/g, ' · ').trim()

/** تقريرٌ نصّي يُنسخ أو يُنزَّل — من نفس الأرقام المعروضة، لا حاشيةً من عنده */
export function matchReport(res, { lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const L = (o) => (o && (o[lang] || o.en)) || ''
  if (!res || res.tooShort) {
    return ar
      ? `مطابقةُ سيرةٍ بإعلان — قالب (qalb.store)\nالإعلانُ أقصر من أن تُستخرج منه مفردات: ${res?.keywords || 0} كلمةٍ مفيدة (٦ أدنى).\nالصق الإعلان كاملًا: العنوان والمتطلبات والمهام.`
      : `CV-to-posting match — qalb.store\nThe posting is too short to extract terms from: ${res?.keywords || 0} useful words (6 minimum).\nPaste the whole post: title, requirements and duties.`
  }
  const head = ar
    ? `مطابقةُ سيرةٍ بإعلان — قالب (qalb.store)\nالنسبة: ${res.score}٪ · ${L(res.band.label)}\nالمفردات المطلوبة: ${res.keywords} · الحاضر: ${res.matchedCount} · الغائب: ${res.missingCount}\nجاهزيةُ الفرز الآلي (بنيةُ السيرة وحدها): ${res.ats.score == null ? '—' : res.ats.score + '٪'}\n`
    : `CV-to-posting match — qalb.store\nScore: ${res.score}% · ${L(res.band.label)}\nRequired terms: ${res.keywords} · present: ${res.matchedCount} · missing: ${res.missingCount}\nATS structure score (the sheet alone): ${res.ats.score == null ? '—' : res.ats.score + '%'}\n`
  const miss = res.missing
    .slice(0, 14)
    .map((m, i) => `${ar ? 'غائب' : 'MISS'} ${i + 1}. ${m.term}  (${m.weight})`)
    .join('\n')
  const edits = editPoints(res, { lang, n: 8 })
    .map((e, i) => `${ar ? 'تعديل' : 'EDIT'} ${i + 1}. ${line(e.text)}\n        ${line(e.sample)}`)
    .join('\n')
  const foot = ar
    ? `\n${L(res.band.note)}\nالكلمةُ الغائبةُ ليست خبرةً ناقصة بالضرورة: اكتب ما تعرفه بلغة الإعلان، ولا تُضف أداةً لم تعمل بها.`
    : `\n${L(res.band.note)}\nA missing word is not necessarily missing experience: write what you know in the post’s language, and add no tool you have not used.`
  return `${head}\n${miss}\n\n${edits}\n${foot}\n`
}

/* ───────────────────────────── نموذجٌ للتجربة ───────────────────────────── */

/** إعلانٌ تِقَنيٌّ عربيّ — يُجرَّب به الفاحص على شيءٍ حقيقي، وهو من وحيِ إعلاناتٍ واقعية */
export const MATCH_DEMO_JOB = `مهندسة واجهات أمامية (Frontend Engineer) — شركة نماء الرقمية · الرياض · دوام كامل

عن الدور
نبحث عن مهندسة واجهات أمامية تبني منتجات مالية وتعليمية تُقرأ على الجوال أولًا. ستعملين مع فريق المنتج والتصميم من التشخيص إلى التسليم، وتتحملين مسؤولية الأداء والوصولية في شبكاتٍ ضعيفة وأجهزةٍ قديمة.

المسؤوليات
- بناء واجهات تفاعلية بـ React وTypeScript على Vite، مع نظام تصميم مشترك بين ستة فرق.
- قياس أداء الويب (LCP وINP) وتحسينه على شبكة 3G حتى يصبح التحميل الأول أقل من ثانيتين.
- تطبيق معايير الوصولية WCAG 2.2 وبناء اختبار آلي يرفض الإصدار المُخِلّ.
- دعم الاتجاه من اليمين (RTL) وتصميم واجهات عربية في منتجٍ بلغتين.
- كتابة اختبارات وحدة وتكامل، والمشاركة في مراجعة الكود وتوثيق القرارات التقنية.

المتطلبات
- ثلاث سنوات فأكثر في React وTypeScript، ومعرفةٌ عمليةٌ بـ Node وCSS الحديث.
- خبرةٌ في أداء الويب وقياسه، وفي اختبار الوصولية آليًا.
- إلمامٌ بـ Git ومراجعة الكود والعمل بنظام Agile.
- ميزة: خبرةٌ في أنظمة التصميم، أو GraphQL، أو بناء أدوات داخلية للفرق.`

export default { matchCv, matchReport, editPoints, termsOf, fieldOf, pickTemplates, fieldLabel, MATCH_BANDS, MATCH_DEMO_JOB, normalizeWord, tokens }
