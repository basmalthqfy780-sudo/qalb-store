/**
 * العروض الموسمية — صفحاتُ هبوطٍ لأربعة مواسم يعرفها الطالب والخريج السعودي
 * بالتقويم لا بالتخمين: التدريب التعاوني، يوم المهنة، التخرج، وبداية السنة
 * الوظيفية.
 *
 * كلُّ ما هنا مسنودٌ إلى الكتالوج نفسه: المنتجاتُ المُوصى بها معرّفاتُ قوالب
 * حقيقية من src/data/templates.js، والكوبونُ من جدول القوالب نفسه — فلا تُوصي
 * صفحةٌ بمنتجٍ لا يُشترى، ولا تَعِدَ بخصمٍ لا يعرفه المتجر. الأشهرُ (`months`)
 * هي ما يُعلَّم به «الموسم الحالي» في الرئيسية العرضية، لا موعدًا صارمًا.
 */
import { byId } from './templates.js'

export const OFFER_COUPON = 'FRIEND20'

export const offers = [
  {
    slug: 'coop',
    months: [5, 6, 7], // التقديم قبل الصيف وبعده — يبدأ الموسم قبل الإجازة
    title: { ar: 'موسم التدريب التعاوني', en: 'Co-op training season' },
    kicker: { ar: 'التدريب التعاوني', en: 'Co-op' },
    sub: {
      ar: 'طلبة التدريب التعاوني يُقيَّمون على ملفٍّ قبل مقابلةٍ واحدة: موقعٌ يعرض مشاريع الفصل، وسيرةٌ من صفحة واحدة، وخطابُ تقديمٍ يذكر الجامعة والشركة معًا. هذا الموسم كله مجموعتك.',
      en: 'Co-op students are judged on a file before a single interview: a site that shows the term’s projects, a one-page CV, and a cover letter that names both the university and the employer. This season is that bundle.',
    },
    body: {
      ar: [
        'التدريب التعاوني أول ملفٍّ مهني يُسلَّم لجهةٍ حكومية أو شركة، وأول ما يُقارن فيه الطالب بزملائه. لجنة التدريب تفتح مئات الملفات في أسبوع: من جاء بسيرةٍ تُقرأ آليًا وموقعٍ يعمل على جواله، بقي في الكومة الأولى.',
        'المجموعة أدناه تُغطي الملف كاملًا: حزمة الخريج (موقع + سيرة)، قوالب خطابات التقديم لمراسلة الشركات، وفحص ATS المجاني قبل الإرسال — ثم خصم الأصدقاء FRIEND20 على الجميع.',
      ],
      en: [
        'Co-op is the first professional file handed to a government body or a company, and the first time a student is compared with peers. A training committee opens hundreds of files in a week: whoever arrives with a machine-readable CV and a site that works on a phone stays in the first pile.',
        'The bundle below covers the whole file: the graduate pack (site + CV), the cover-letter pack for approaching employers, and the free ATS check before sending — all with the FRIEND20 friends discount.',
      ],
    },
    picks: ['gradbundle', 'letterpack', 'echocv'],
  },
  {
    slug: 'career-day',
    months: [2, 3],
    title: { ar: 'موسم يوم المهنة', en: 'Career-day season' },
    kicker: { ar: 'يوم المهنة', en: 'Career day' },
    sub: {
      ar: 'في يوم المهنة تتكدس الملفات على أخصائيي التوظيف. من يسلم ورقةً تُقرأ في ثلاثين ثانية — سيرة صفحة واحدة بخطابٍ يُطابق إعلان الشركة — يُستدعى قبل من يسلم مجلدًا.',
      en: 'On career day, files pile up in front of recruiters. Whoever hands a page readable in thirty seconds — a one-page CV with a letter matched to that company’s posting — gets called before whoever hands a folder.',
    },
    body: {
      ar: [
        'يوم المهنة ليس معرضًا للتوزيع: إنه ستون اجتماعًا من خمس دقائق، وكلُّ شركةٍ تحضر بمعيارٍ واحد — من يستحق متابعة؟ الإعدادُ يبدأ قبل أسبوعين: فحص السيرة آليًا، طباعة PDF بنسخةٍ نظيفة، وخطابٌ لكل شركةٍ بعينها.',
        'اخترنا لهذا الموسم سيرتنا الأثبت في الفرز الآلي (نوفا)، وحزمة LinkedIn لمن يطلبون ملفك بعد اللقاء، وقوالب الخطابات — وخصم FRIEND20 يجمعها كلها.',
      ],
      en: [
        'A career day is not a giveaway expo: it is sixty five-minute meetings, and every company arrives with one question — who is worth following up with? Preparation starts two weeks out: run the ATS check, print a clean PDF, and carry a letter for each specific company.',
        'For this season we picked our most parser-proof CV (Nova), the LinkedIn Kit for recruiters who ask for your profile afterwards, and the letter pack — all under the FRIEND20 friends discount.',
      ],
    },
    picks: ['nova', 'linkedinkit', 'letterpack'],
  },
  {
    slug: 'graduation',
    months: [4, 5],
    title: { ar: 'موسم التخرج', en: 'Graduation season' },
    kicker: { ar: 'التخرج', en: 'Graduation' },
    sub: {
      ar: 'بعد القبعة يبدأ البحث الجدي: أول وظيفةٍ تُطلب بأول سيرةٍ حقيقية. من جاء بموقعٍ يحمل مشاريع تخرجه وسيرةً مصمَّمة لهذه اللحظة، بدأ مسابقه من أمام الجميع.',
      en: 'After the cap comes the real search: a first job asked for with a first real CV. Whoever arrives with a site carrying the capstone project and a CV designed for this moment starts the race ahead of everyone.',
    },
    body: {
      ar: [
        'الخريج الجديد يملك ما لا يملكه صاحب الخبرة: مشروعًا نهائيًا يستطيع أن يرويه بالأرقام، وبحثًا، وتطوّعًا. الحزمة تُرتب هذا كله حيث يبحث عنه المستشغل، وتُخفي «لا خبرة عملية» خلف ما أُنجز فعلًا.',
        'حزمة فِست ستيب (موقع + سيرة بسعر دخول)، وسيرة إيكو لمن لا يريد إلا ملفًا واحدًا، وحزمة LinkedIn للشركات التي تبحث عنك بالاسم — والخصم FRIEND20 سارٍ عليها جميعًا.',
      ],
      en: [
        'A fresh graduate owns what the experienced do not: a capstone that can be told in numbers, research, and volunteering. The bundle orders all of it where recruiters look, and hides “no work history” behind what was actually shipped.',
        'First Step (site + CV at an entry price), the Echo CV for those who want a single file, and the LinkedIn Kit for companies that search you by name — all with the FRIEND20 friends discount.',
      ],
    },
    picks: ['gradbundle', 'echocv', 'linkedinkit'],
  },
  {
    slug: 'work-year',
    months: [9, 10, 11],
    title: { ar: 'بداية السنة الوظيفية', en: 'The new work year' },
    kicker: { ar: 'السنة الوظيفية', en: 'Work year' },
    sub: {
      ar: 'بعد إجازة نهاية العام تعود الميزانيات والموظفون معًا: أكثر توظيفٍ يُعلن بين سبتمبر وديسمبر. سيرتُك جاهزة قبل أن يعلن منافسك.',
      en: 'After the holiday, budgets and headcount return together: most roles are posted between September and December. Have your CV ready before your rival does.',
    },
    body: {
      ar: [
        'من يبحث عن ترقية أو انتقالًا في الربع الأخير يُقيَّم على الإنجاز بالأرقام: كم، ومتى، وبأي أثر. سيراتنا التنفيذية والمتقدمة مبنية على هذا، والمراجعة البشرية تضع النقاط على أرقامك قبل أن يقرأها مدير التوظيف.',
        'أبيكس للمناصب القيادية، أطلس للمهندسين والتقنيين، وسيرة التخصص الطبي لمن يقدّم على الإقامة هذا الموسم — وخصم FRIEND20 على أيٍّ منها.',
      ],
      en: [
        'Whoever chases a promotion or a move in the last quarter is judged on achievement in numbers: how much, when, with what impact. Our executive and senior CVs are built on exactly that, and a human review puts the numbers straight before a hiring manager reads them.',
        'Apex for leadership roles, Atlas for engineers, and the Medical CV for residency applicants this season — all under the FRIEND20 friends discount.',
      ],
    },
    picks: ['apexcv', 'atlas', 'medcv'],
  },
]

export const offerBySlug = (slug) => offers.find((o) => o.slug === slug) || null

/** المنتجات المُوصى بها كما هي في الكتالوج — لا معرّف ميت يعرض زرًّا لا يقود لصفحة */
export const offerPicks = (offer) => (offer?.picks || []).map((id) => byId(id)).filter(Boolean)

/** الموسم الجاري حسب الشهر — يُستعمل للوسم في /offers لا لفتح شيءٍ تلقائيًا */
export const activeOffer = (at = new Date()) => {
  const m = at.getMonth() + 1
  return offers.find((o) => o.months.includes(m)) || null
}

/** أسماء الشهور للموسم — مشتقّة من `months` لا مكتوبة يدويًا في كل صفحة */
const MONTHS = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
export const monthsLabel = (offer, lang = 'ar') => {
  const names = MONTHS[lang] || MONTHS.ar
  const ms = offer?.months || []
  if (!ms.length) return ''
  const first = names[ms[0] - 1]
  const last = names[ms[ms.length - 1] - 1]
  return ms.length === 1 ? first : `${first} — ${last}`
}

export default offers
