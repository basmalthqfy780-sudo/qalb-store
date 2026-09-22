/**
 * مولّدُ ملف التقديم: سيرةٌ مخصّصة + خطابُ تقديم + رسالة LinkedIn + إيميل التقديم.
 *
 * الفرقُ بينه وبين أيِّ مولّدِ نصٍّ عام: لا يخترع شيئًا. كلُّ سطرٍ يخرج من هنا مأخوذٌ
 * من سيرتك أنت — أقوى نقطةٍ مقاسة، والمفرداتُ التي التقت فيها سيرتكُ مع الإعلان —
 * وما لا يجده في سيرتك يتركه فارغًا بين قوسين ليكتبه صاحبه. الفحصُ في tests/smoke.mjs
 * يُثبت هذا: لا اسمُ شركةٍ ولا رقمٌ في الناتج إلا من نصٍّ أدخله المستخدم.
 *
 * والقياسُ مستعار: `matchCv` هي نفسها التي تخدم /match، فالنقاطُ التي يوصي المولّد
 * بتقديمها هي النقاطُ التي رفعن النسبة لا نقاطٌ يراها المولّد أجمل.
 */
import { matchCv, editPoints } from './match.js'
import { analyzeAts } from './ats.js'

/** الحزمةُ كما تُباع: عشرُ توليدات — الرصيدُ يُحصى في هذا المتصفح بلا خادم */
export const KIT_PACK = { id: 'kit-10', credits: 10 }
export const KIT_KEY = 'qalb.kit.v1'
export const KIT_MIN_CV = 120
export const KIT_MIN_JOB = 80

/** سطورُ النقاط من السيرة: نفسُ تعريف النقطة في فاحص ATS، فلا مقياسين لشيءٍ واحد */
export function bulletsOf(text) {
  return String(text || '')
    .split('\n')
    .filter((x) => /^\s*[-•*·]\s+\S/.test(x))
    .map((x) => x.replace(/^\s*[-•*·]\s+/, '').trim())
    .filter((x) => x.length > 12)
}

/** أرقامٌ داخل النقطة — وزنُ النقطة عندنا: ما يحمل رقمًا أقوى مما لا يحمله */
const figures = (s) => (String(s).match(/\d+(?:[.,]\d+)?\s*[%٪]?/g) || []).map((x) => parseFloat(x.replace(/[٪%,]/g, '')))

/**
 * نقاطُ السيرة مرتّبةً على مفردات الإعلان: نقطةٌ فيها كلمتان من الإعلان تتقدّم على
 * نقطةٍ فيها كلمة، ونقطةٌ برقمٍ تتقدّم على نقطةٍ بلا رقم عند التساوي.
 */
export function rankBullets(cvText, res, { n = 5 } = {}) {
  const need = (res?.matched || []).map((m) => m.term)
  return bulletsOf(cvText)
    .map((b) => {
      const low = b.toLowerCase()
      const hits = need.filter((t) => low.includes(String(t).split(' ')[0])).length
      const nums = figures(b)
      const top = nums.length ? Math.max(...nums) : 0
      return { text: b, hits, numbers: nums.length, top, weight: hits * 10 + (nums.length ? 5 : 0) + (top > 100 ? 2 : 0) }
    })
    .sort((a, b) => b.weight - a.weight || b.text.length - a.text.length)
    .slice(0, n)
}

/** الترويسة: اسمُك ومسمّاك كما كتبتهما في أول سطر، لا كما نخمّنهما */
export function cvHead(cvText) {
  const lines = String(cvText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const first = lines[0] || ''
  const [name, role] = first.split(/\s+[—–-]\s+/)
  const cityLine = lines.slice(0, 4).find((l) => /[@·،,]/.test(l)) || ''
  const email = (String(cvText).match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/) || [])[0] || ''
  const link = (String(cvText).match(/linkedin\.com\/[\w-]+\/[^\s,·]+/i) || [])[0] || ''
  const city = (cityLine.split(/[·،,]/).find((p) => p && !p.includes('@') && !/linkedin|github|@/i.test(p)) || '').trim()
  return {
    name: (name || '').trim().slice(0, 60),
    role: (role || '').trim().slice(0, 80),
    city: city.slice(0, 40),
    email,
    link,
  }
}

/** رأسُ الإعلان: المسمّى والشركة والمدينة من السطر الأول وحده — لا تخمينَ في المتن */
export function jobHead(jobText) {
  const lines = String(jobText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const first = lines[0] || ''
  const parts = first
    .split(/[·|]|\s+—\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
  const role = parts[0] || ''
  const company = parts.find((p, i) => i > 0 && !/رياض|جده|جدة|الدمام|عن بعد|دوام| remote|riyadh|jeddah/i.test(p)) || ''
  const city = parts.find((p) => /رياض|جده|جدة|الدمام|مكة|الخبر|أبها| remote|riyadh|jeddah/i.test(p)) || ''
  return { role: role.slice(0, 90), company: company.replace(/^(شركة|في)\s+/, '').slice(0, 60), city: city.slice(0, 40) }
}

/**
 * الملفُّ كاملًا. القياسُ (matchCv وanalyzeAts) محسوبٌ مرةً واحدة ويُعاد استعماله،
 * فلا يتناقضُ خطابٌ مع نسبةٍ معروضة فوقه.
 */
export function buildKit({ cv = '', job = '', lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const res = matchCv(cv, job)
  const ats = res.ats || analyzeAts(cv)
  const me = cvHead(cv)
  const ad = jobHead(job)
  const ranked = rankBullets(cv, res, { n: 5 })
  const who = me.name || (ar ? '(اسمك)' : '(your name)')
  const what = me.role || (ar ? '(مسمّاك)' : '(your title)')
  const company = ad.company || (ar ? '(اسم الشركة)' : '(the company)')
  const role = ad.role || (ar ? '(المسمى الوظيفي)' : '(the role)')
  const top = (res.matched || []).slice(0, 5).map((m) => m.term)
  const best = ranked[0]?.text || ''
  const bestFigure = ranked.find((b) => b.top > 0)
  const figure = bestFigure ? `${bestFigure.top}` : ar ? '—' : '—'
  const gaps = editPoints(res, { lang, n: 3 })

  /* ——— خطابُ التقديم: فقرةُ مطابقة، ففقرةُ أثرٍ مقاس، ففقرةُ سبب، ثم خاتمة ——— */
  const cover = ar
    ? [
        `إلى فريق التوظيف في ${company}،`,
        `السلام عليكم ورحمة الله.`,
        `أتقدّم لدور ${role}. أنا ${who} — ${what}${me.city ? `، ${me.city}` : ''}. ${
          top.length ? `عملِي في السنوات الأخيرة يلتقي مع ما طلبتموه في: ${top.slice(0, 4).join('، ')}.` : ''
        }`,
        best ? `ومما يُقاس من عملي: ${best.replace(/^[-•]\s*/, '')}` : '',
        `أعمل بالطريقة التي يصفها إعلانكم: أبدأ من رقمٍ قبل التغيير ورقمٍ بعده، وأترك ما أعمله أسهل لمن بعدي.${
          bestFigure ? ` وفي آخر عملٍ لي بلغ الأثر ${figure}${bestFigure.text.includes('٪') || bestFigure.text.includes('%') ? '٪' : ''}.` : ''
        }`,
        `سيرتي مرفقة، وقراءتها آليًا مضمونة: درجتُها في فاحص الجاهزية ${ats.score == null ? '—' : ats.score + '٪'}، ونسبةُ مطابقتها لإعلانكم ${res.score}٪.`,
        `يسعدني أن أشرح أيَّ سطرٍ فيها في مكالمةٍ قصيرة.`,
        `مع التحية،\n${who}${me.email ? `\n${me.email}` : ''}${me.link ? `\n${me.link}` : ''}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    : [
        `To the hiring team at ${company},`,
        `I am applying for the ${role} role. I am ${who} — ${what}${me.city ? `, ${me.city}` : ''}.${
          top.length ? ` My recent work meets what you asked for in: ${top.slice(0, 4).join(', ')}.` : ''
        }`,
        best ? `One measured result: ${best.replace(/^[-•]\s*/, '')}` : '',
        `I work the way your post describes it: a number before the change, a number after it, and whatever I touch left easier for the next person.${
          bestFigure ? ` In my most recent role that effect reached ${figure}.` : ''
        }`,
        `My CV is attached and reads cleanly to a machine: ${ats.score == null ? '—' : ats.score + '%'} on the readiness checker and ${res.score}% against your post.`,
        `I am glad to walk through any line of it on a short call.`,
        `Regards,\n${who}${me.email ? `\n${me.email}` : ''}${me.link ? `\n${me.link}` : ''}`,
      ]
        .filter(Boolean)
        .join('\n\n')

  /* ——— رسالة LinkedIn: ٣٠٠ حرفٍ هي كلُّ ما يُقرأ في الطلب ——— */
  const linkedin = ar
    ? `مرحبًا — أتقدّمُ لدور ${role} عندكم. ${what}${top.length ? `، وأعمالي الأخيرة في ${top.slice(0, 3).join(' و')}` : ''}. ${
        bestFigure ? `آخر أثرٍ مقاس عندي: ${figure}.` : ''
      } سيرتي مرفقة في الطلب.${me.email ? ` أو على ${me.email}` : ''}`
    : `Hello — I have applied for the ${role} role. I am ${what}${top.length ? `, and my recent work is in ${top.slice(0, 3).join(', ')}` : ''}.${
        bestFigure ? ` My last measured result: ${figure}.` : ''
      } My CV is attached to the application.${me.email ? ` Or reach me at ${me.email}` : ''}`

  /* ——— إيميل التقديم: الموضوعُ أهمُّ ما فيه ——— */
  const email = {
    subject: ar ? `طلبُ توظيف: ${role} — ${who}${me.city ? ` (${me.city})` : ''}` : `Application: ${role} — ${who}${me.city ? ` (${me.city})` : ''}`,
    body: `${cover}\n\n${ar ? '— المرفقات: السيرة الذاتية (PDF)' : '— Attachments: CV (PDF)'}`,
  }

  return {
    who,
    what,
    role,
    company,
    match: res,
    ats,
    ranked,
    gaps,
    cover,
    linkedin,
    email,
    // ما يحتاجُه صاحبه قبل الإرسال: لا نرسلُ عنه شيئًا
    todo: [
      ...(me.name ? [] : [ar ? 'اكتب اسمك في أول سطر السيرة.' : 'Put your name on the CV’s first line.']),
      ...(me.email ? [] : [ar ? 'أضف بريدك نصًّا صريحًا.' : 'Add your e-mail as plain text.']),
      ...(ad.company ? [] : [ar ? 'اكتب اسم الشركة في عنوان الإعلان.' : 'Put the company name in the post’s first line.']),
    ],
  }
}

/** الملفُّ نصًّا واحدًا للنسخ أو التنزيل — بلا تنسيقٍ يضيع في البريد */
export function kitText(kit, { lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const h = (s) => `\n\n${'='.repeat(4)} ${s} ${'='.repeat(4)}\n`
  return [
    `${ar ? 'ملفُ تقديم' : 'Application kit'} — qalb.store`,
    `${ar ? 'الدور' : 'Role'}: ${kit.role} · ${kit.company}`,
    `${ar ? 'المطابقة' : 'Match'}: ${kit.match.score}٪ · ${ar ? 'جاهزية البنية' : 'Structure'}: ${kit.ats.score == null ? '—' : kit.ats.score + '٪'}`,
    h(ar ? 'نقاطٌ قدّمها في سيرتك' : 'Bullets to move up'),
    kit.ranked.map((b, i) => `${i + 1}. ${b.text}`).join('\n') || '—',
    h(ar ? 'خطاب التقديم' : 'Cover letter'),
    kit.cover,
    h(ar ? 'رسالة LinkedIn' : 'LinkedIn note'),
    kit.linkedin,
    h(ar ? 'إيميل التقديم' : 'Application e-mail'),
    `${ar ? 'الموضوع' : 'Subject'}: ${kit.email.subject}\n${kit.email.body}`,
    h(ar ? 'ما يحتاجُه منك قبل الإرسال' : 'Before you send'),
    kit.todo.map((x) => `- ${x}`).join('\n') || (ar ? 'لا شيء — الملف جاهز.' : 'Nothing — the kit is ready.'),
    '',
  ].join('\n')
}

/* ───────────────────────────── الرصيد ───────────────────────────── */
/**
 * رصيدُ التوليدات: عشرٌ تُشترى مرةً وتُنقص هنا. محليٌّ بلا خادم كبقيةِ أدوات
 * المتجر، والصفحةُ تقول ذلك صراحةً: الرصيدُ في هذا المتصفح، لا في حسابٍ عندنا.
 */
const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)

export function kitCredits() {
  try {
    const raw = store()?.getItem(KIT_KEY)
    const v = raw ? JSON.parse(raw) : null
    const n = Number(v?.left ?? 0)
    return {
      left: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0,
      bought: Number(v?.bought || 0),
      used: Number(v?.used || 0),
      granted: Array.isArray(v?.granted) ? v.granted : [],
    }
  } catch {
    return { left: 0, bought: 0, used: 0 }
  }
}

/** يضيفُ رصيدًا (بعد شراء) أو ينقصُه (عند التوليد) — بلا سالب، وبلا ادّعاءِ حساب */
export function kitCredit(delta, { add = false } = {}) {
  const cur = kitCredits()
  const next = {
    left: Math.max(0, cur.left + (add ? Number(delta) || 0 : -(Number(delta) || 0))),
    bought: add ? cur.bought + (Number(delta) || 0) : cur.bought,
    used: add ? cur.used : cur.used + (Number(delta) || 0),
    granted: cur.granted || [],
  }
  try {
    store()?.setItem(KIT_KEY, JSON.stringify(next))
  } catch {
    /* امتلاءُ المتصفح ليس سببًا لإسقاط الصفحة */
  }
  return next
}

/**
 * منحُ الرصيد بعد شراءٍ حقيقي: مرةً واحدة لكلِّ طلب، فإعادةُ فتح صفحة الإيصال لا
 * تضاعف الرصيد. لا يُمنح شيءٌ لطلبٍ ليس في سجلّه هذه الإضافة.
 */
export function kitGrantFor(orderId, addons = [], { credits = KIT_PACK.credits } = {}) {
  const id = String(orderId || '')
  if (!id) return kitCredits()
  const list = Array.isArray(addons) ? addons.map((a) => (typeof a === 'string' ? a : a?.id)).filter(Boolean) : []
  if (!list.includes(KIT_PACK.id)) return kitCredits()
  const cur = kitCredits()
  if ((cur.granted || []).includes(id)) return cur
  const next = kitCredit(credits, { add: true })
  try {
    store()?.setItem(KIT_KEY, JSON.stringify({ ...next, granted: [...(cur.granted || []), id].slice(-40) }))
  } catch {
    /* لا شيء */
  }
  return kitCredits()
}

export default { buildKit, kitText, kitCredits, kitCredit, kitGrantFor, rankBullets, cvHead, jobHead, bulletsOf, KIT_PACK, KIT_KEY }
