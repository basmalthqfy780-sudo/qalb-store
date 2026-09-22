/**
 * «ابنِ سيرتك من LinkedIn» — الاستيرادُ من نصٍّ يلصقه المستخدم، لا من حسابه.
 *
 * لماذا لصقًا لا رابطًا؟ لأن الوصولَ إلى ملفِّ شخصٍ على LinkedIn يحتاج ترخيصًا من
 * الشركة وواجهةً مدفوعة، ولا نملكُ واحدًا منهما — والادّعاءُ بأننا نقرأ حسابك من
 * رابطٍ هو أولُ ما يكذّبه المستخدم حين يجربه. الذي نملكه: «انسخ ملفّك» (زرٌّ في
 * LinkedIn نفسه) ثم الصق هنا، فتُملأ الحقول في ثانية.
 *
 * والمحرّكُ بسيطٌ ومفتوح: أقسامٌ تُعرَف بعناوينها (النبذة، الخبرة، التعليم، المهارات)
 * وسطورٌ تُقرأ تحتها. ما لم يعرفه يتركه فارغًا ليملأه صاحبه — ولا يخترعُ مسمّى ولا
 * تاريخًا: سطرٌ غيرُ مفهومٍ يُترك، فلا سيرةٌ مزوّرة تُسلَّم للناس.
 */
export const LI_LIMITS = { name: 80, role: 90, city: 60, summary: 700, job: 120, company: 80, school: 120, skill: 40 }

const SECTIONS = [
  { key: 'about', re: /^(about|نبذة|نبذه|ملخص|summary|الملخص|حول|about me)\b/i },
  { key: 'experience', re: /^(experience|الخبرة|الخبرات|خبرة|work experience|employment|العمل)\b/i },
  { key: 'education', re: /^(education|التعليم|التعليم والشهادات|education & certifications)\b/i },
  { key: 'skills', re: /^(skills|المهارات|مهارات|top skills|skills & endorsements)\b/i },
  { key: 'certs', re: /^(licenses|certifications|الشهادات|certificates|الدورات)\b/i },
]

const clean = (v, n = 160) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n)

/** الرابطُ وحده لا يكفي: نأخذ منه المعرّف ونطلب النصّ — بلا ادّعاءِ قراءةِ حساب */
export function handleFrom(input = '') {
  const m = String(input || '').match(/linkedin\.com\/in\/([\w-]{2,60})/i)
  return m ? m[1].toLowerCase() : ''
}

/** «شركة نماء · ٢٠٢١ — الآن» أو «شركة نماء · full-time · ٢٠٢١ - present» */
const DATES_RE = /(?:^|\s|·|\||,)\s*((?:19|20)\d{2})\s*[—–-]\s*((?:19|20)\d{2}|present|current|now|الآن|حاليا|حتى الان|حتى الآن)/i
const PERIOD_RE = /\b(\d{4})\s*[-–—]\s*(\d{4}|present|current|الآن)\b/i

function periodOf(line) {
  const m = String(line).match(DATES_RE) || String(line).match(PERIOD_RE)
  if (!m) return ''
  const end = /present|current|now|الآن|حاليا|حتى/i.test(m[2]) ? 'الآن' : m[2]
  return `${m[1]} — ${end}`
}

/** سطرُ الخبرة: «مهندسة واجهات أولى — شركة نماء الرقمية · الرياض · 2021 — الآن» */
function jobFrom(line, next = '') {
  const raw = clean(line, 240)
  const period = periodOf(`${raw} ${next}`)
  const noDates = raw.replace(DATES_RE, '').replace(PERIOD_RE, '')
  const parts = noDates
    .split(/\s+[—–-]\s+|\s+·\s+|\s+@\s+|\s+\|\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
  // المسمّى قبل الشرطة، والشركة بعدها: هذا ترتيبُ LinkedIn في كلِّ لغة
  const title = parts[0] || ''
  const company = parts[1] && !/full|part|contract|freelance|دوام|تعاقد|مستقل/i.test(parts[1]) ? parts[1] : parts[2] || ''
  return { title: clean(title, LI_LIMITS.job), company: clean(company, LI_LIMITS.company), period: period || '' }
}

/**
 * من نصٍّ ملصوق إلى مسوّدةِ سيرة. الحقولُ الناقصة تُرجَع فارغة، و`missing` يسمّيها
 * واحدًا واحدًا ليكمّلها صاحبُها — لا نملؤها بتخمين.
 */
export function parseLinkedin(input = '') {
  const raw = String(input || '')
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim())
  const out = {
    handle: handleFrom(raw),
    name: '',
    role: '',
    city: '',
    summary: '',
    jobs: [],
    schools: [],
    skills: [],
    links: [],
    sections: [],
    missing: [],
  }

  if (!lines.length) return out

  // السطر الأول اسمٌ، والثاني مسمّى ومدينة كما يصدرها «نسخ الملفّ الشخصي»
  const first = lines[0].trim()
  if (first.length <= 60 && !/@|linkedin\.com|\|/.test(first)) out.name = clean(first, LI_LIMITS.name)
  const second = (lines[1] || '').trim()
  if (second && !SECTIONS.some((s) => s.re.test(second))) {
    const bits = second
      .split(/\s+·\s+|\s+\|\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
    out.role = clean(bits[0] || '', LI_LIMITS.role)
    const city = bits.find((b) => !/@|linkedin|followers|متابع|connections/i.test(b) && b !== bits[0])
    if (city) out.city = clean(city, LI_LIMITS.city)
  }

  let section = ''
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    const hit = SECTIONS.find((s) => s.re.test(line.replace(/^[#*\s]+/, '')))
    if (hit) {
      section = hit.key
      out.sections.push(hit.key)
      continue
    }
    if (/^\s*[-•*·]\s+/.test(line) && section === 'skills') {
      out.skills.push(clean(line.replace(/^\s*[-•*·]\s+/, ''), LI_LIMITS.skill))
    } else if (section === 'skills') {
      // مهاراتٌ تُنشر سطرًا واحدًا مفصولًا بفواصل
      out.skills.push(
        ...line
          .split(/[,·|]/)
          .map((x) => clean(x, LI_LIMITS.skill))
          .filter((x) => x.length > 1),
      )
    } else if (section === 'experience' && line.length > 6 && !/^\d+\s*(years?|mos?|months?)/i.test(line)) {
      out.jobs.push(jobFrom(line, lines[i + 1] || ''))
    } else if (section === 'education' && line.length > 3) {
      out.schools.push(clean(line, LI_LIMITS.school))
    } else if (section === 'about' && line.length > 10) {
      out.summary = out.summary ? `${out.summary} ${line}` : clean(line, LI_LIMITS.summary)
    } else if (section === 'certs' && line.length > 3) {
      out.schools.push(clean(line, LI_LIMITS.school))
    }
  }
  out.summary = clean(out.summary, LI_LIMITS.summary)
  out.skills = [...new Set(out.skills.filter(Boolean))].slice(0, 24)
  out.jobs = out.jobs.filter((j) => j.title || j.company).slice(0, 8)
  out.schools = [...new Set(out.schools.filter(Boolean))].slice(0, 6)
  const link = raw.match(/linkedin\.com\/in\/[\w-]{2,60}/i)
  if (link) out.links.push(clean(link[0], 80))
  out.missing = missingOf(out)
  return out
}

/** ما لم يجده: يُسمّى ليُكمَل يدويًا، فلا حقلٌ فارغٌ يُسلَّم على أنه مكتمل */
export function missingOf(draft = {}) {
  const miss = []
  if (!draft.name) miss.push('name')
  if (!draft.role) miss.push('role')
  if (!draft.summary) miss.push('summary')
  if (!(draft.jobs || []).length) miss.push('jobs')
  if (!(draft.skills || []).length) miss.push('skills')
  if (!(draft.schools || []).length) miss.push('education')
  if (!draft.city) miss.push('city')
  return miss
}

/** المسوّدة ← حقولُ التخصيص التي تقرأها حزمةُ القالب (نفسُ سقوف PERSONAL_LIMITS) */
export function toPersonal(draft = {}) {
  const jobs = (draft.jobs || []).slice(0, 4)
  const bio = draft.summary || (jobs[0] ? `${draft.role || ''} — ${jobs[0].title} في ${jobs[0].company}`.trim() : '')
  return {
    on: true,
    name: String(draft.name || '').slice(0, 80),
    role: String(draft.role || '').slice(0, 90),
    email: '',
    phone: '',
    website: (draft.links || [])[0] || '',
    bio: String(bio).slice(0, 700),
  }
}

/** نصٌّ تجريبي: يملأ الحقول كلها، فيرى المستخدمُ النتيجة قبل أن ينسخ ملفَّه */
export const LINKEDIN_SAMPLE = `نورة الحربي
مهندسة واجهات أمامية · الرياض، السعودية · linkedin.com/in/noura-harbi

About
مهندسة واجهات أمامية بخمس سنوات في بناء منتجات مالية وتعليمية تُقرأ على الجوال أولًا. أبدأ من رقمٍ قبل التغيير ورقمٍ بعده، وأتحمّل مسؤولية الوصولية كاملة في الشبكات الضعيفة والأجهزة القديمة.

Experience
مهندسة واجهات أولى — شركة نماء الرقمية · الرياض · 2021 — present
رفعت رضا مستخدمي لوحة التحكم من ٧١ إلى ٩٢ نقطة في ستة أشهر.
هاجرت الواجهة إلى Vite فانخفض زمن التحميل الأول من ٤٫٢ إلى ١٫١ ثانية.
أمامية — شركة مدار التعليم · جدة · 2019 — 2021
طوّرت مشغّل دروس يحتمل ١٢ ألف طالب في التوقيت نفسه.

Education
بكالوريوس علوم حاسب — جامعة الملك سعود · 2019

Skills
TypeScript, React, Vite, أداء الويب, الوصولية, أنظمة التصميم, Node, اختبارات الوحدة`

export default { parseLinkedin, missingOf, toPersonal, handleFrom, LINKEDIN_SAMPLE, LI_LIMITS }
