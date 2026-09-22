/**
 * الإضافات والخدمات — كلُّ ما يُشترى في هذا المتجر وليس قالبًا.
 *
 * مصدرٌ واحد تقرأ منه أربعةُ وجوه، فلا يختلف سعرٌ بينها أبدًا:
 *   1. السلة والدفع (group: 'checkout') — إضافاتٍ تُلحَق بالطلب من صفحة السلة وخطوة الدفع.
 *   2. صفحة الخدمات /services (group: 'services') — خدمات Done-For-You يؤديها فريقنا لا ملفٌ يُنزَّل.
 *   3. فاحص ATS (group: 'ats') — التقرير التفصيلي المدفوع بعد الفحص المجاني.
 *   4. اشتراك Qalb Pro في الرئيسية (group: 'pro') — شهري وسنوي، موازيًا للشراء لمرة واحدة.
 *
 * والخادم يحسب أسعارها بنفسه في server/worker.js من هذا الجدول — لا يُصدَّق سعرٌ
 * قادم من المتصفح، كما لا يُصدَّق سعرُ قالب. وما هو بشريُّ التسليم (مراجعة، كتابة،
 * تركيب) تُسلَّم بالبريد خلال مهلةٍ معلنة، فلا «تحميل فوري» على خدمةٍ يقوم بها إنسان.
 */

export const UPSELL_GROUPS = ['checkout', 'services', 'ats', 'pro']

export const UPSELLS = [
  {
    // ————— إضافات السلة والدفع —————
    id: 'cover-letter',
    groups: ['checkout'],
    price: 39,
    icon: 'pen',
    sla: 48,
    name: { ar: 'خطاب تقديم مكتوب', en: 'A cover letter, written' },
    tagline: { ar: 'نكتبه لك على إعلان الوظيفة الذي تحدده', en: 'We write it against the job post you pick' },
    desc: {
      ar: 'أرسل إعلان الوظيفة وسيرتك، فيصلك خطاب تقديم من صفحة واحدة: لماذا أنت لهذا الدور تحديدًا، وبنقاطٍ تنتهي بأرقام مثل سيرتك. مكتوب بالعربية أو الإنجليزية على لغة الإعلان.',
      en: 'Send the job post and your CV; you get a one-page letter: why you for this role, in bullets that end in numbers like your CV does. Written in the language of the post.',
    },
  },
  {
    id: 'cv-tailor',
    groups: ['checkout'],
    price: 79,
    icon: 'wand',
    sla: 72,
    name: { ar: 'سيرة مطابقة للإعلان', en: 'A CV matched to the post' },
    tagline: { ar: 'نعيد ترتيب سيرتك على مفردات إعلانٍ واحد', en: 'Your CV re-ordered around one posting’s words' },
    desc: {
      ar: 'نأخذ سيرتك الحالية وإعلان الوظيفة، فنعيد ترتيب الأقسام والمهارات على مفردات الإعلان نفسها — بلا اختلاق خبرة ولا رقم. تعود لك نسخة Word وPDF مع قائمة ما تغيّر ولماذا.',
      en: 'We take your current CV and the posting, and re-order sections and skills around its exact wording — inventing neither experience nor numbers. Back come Word and PDF files plus a list of what changed and why.',
    },
  },
  {
    id: 'ats-review',
    groups: ['checkout'],
    price: 149,
    icon: 'scan',
    sla: 72,
    name: { ar: 'مراجعة ATS بشرية', en: 'A human ATS review' },
    tagline: { ar: 'إنسانٌ يقرأ سيرتك سطرًا سطرًا لا regex', en: 'A person reads your CV line by line, not a regex' },
    desc: {
      ar: 'الفاحص المجاني يقيس البنية؛ هذه مراجعة مكتوبة من مختص: تعليقٌ على كل قسم، إعادة صياغة لأضعف ثلاث نقاط، وقراءة نهائية بعد تعديلك. تصل بريدك ملفًا من صفحتين.',
      en: 'The free checker measures structure; this is a specialist’s written review: a note per section, rewritten versions of your three weakest bullets, and a final read after your edit. Two pages, by e-mail.',
    },
  },
  {
    // ————— خدمات Done-For-You — تُعرض في /services وفي السلة معًا —————
    id: 'deploy-setup',
    groups: ['checkout', 'services'],
    price: 249,
    icon: 'globe',
    sla: 72,
    name: { ar: 'تركيب الموقع ونطاقك', en: 'Site setup on Vercel + your domain' },
    tagline: { ar: 'نشتريه مرة واحدة عنا: Vercel والنطاق والنشر', en: 'The launch, done for you: Vercel, domain, live' },
    desc: {
      ar: 'نُنشئ مشروعك على Vercel، نربط نطاقك، نضبط SSL وصفحة 404 والتحويلات، ونشرح لك بالفيديو أين تعدّل محتواك — فتصلك «رابط حيّ» لا ملفات. يشترط أن يكون النطاق حاصلًا عليه؛ ثمنه ليس منّا.',
      en: 'We create the Vercel project, connect your domain, set SSL, the 404 page and redirects, and record where you edit your content — you receive a live URL, not files. The domain itself is yours to buy; its price is not ours.',
    },
  },
  {
    id: 'cv-write',
    groups: ['services'],
    price: 299,
    icon: 'file',
    sla: 120,
    name: { ar: 'كتابة السيرة من الصفر', en: 'A CV written from scratch' },
    tagline: { ar: 'مقابلة قصيرة، ثم سيرةٌ نكتبها كلها', en: 'A short interview, then we write the whole CV' },
    desc: {
      ar: 'مكالمة عشرين دقيقة نسأل فيها عن عملك بالتفصيل — ثم نكتب سيرتك كاملة: ملخص، خبرة بنقاطٍ مقاسة، ومهارات مصنّفة. تصلك نسختان (Word وPDF) ومراجعة واحدة بعد ملاحظاتك.',
      en: 'A twenty-minute call about your work in detail — then we write the whole CV: summary, metric-led experience, grouped skills. Two files (Word and PDF) and one revision after your notes.',
    },
  },
  {
    id: 'brand-identity',
    groups: ['services'],
    price: 899,
    icon: 'palette',
    sla: 240,
    name: { ar: 'الهوية كاملة', en: 'The full identity' },
    tagline: { ar: 'موقع وسيرة وخطاب بهويةٍ واحدة نرسمها لك', en: 'Site, CV and letter in one identity we design' },
    desc: {
      ar: 'نرسم هويتك: لوحة ألوان، اقتراح خطّين، شعار مصغّر، ثم نبني موقعك من قوالبنا وسيرتك وخطابك على الهوية نفسها. جلستان للمراجعة، والتسليم ملفات جاهزة للنشر.',
      en: 'We design your identity: colour board, two type picks, a compact mark — then build your site from our templates plus your CV and letter on the same identity. Two review sessions; delivery is publish-ready files.',
    },
  },
  {
    // ————— تقرير ATS المدفوع — يُعرض بعد الفحص المجاني في /ats —————
    id: 'ats-report',
    groups: ['ats'],
    price: 29,
    icon: 'scan',
    sla: 48,
    name: { ar: 'تقرير ATS تفصيلي', en: 'A detailed ATS report' },
    tagline: { ar: 'تحليلٌ مكتوب لنصّك أنت، لا للقواعد عمومًا', en: 'A written analysis of your text, not of the rules in general' },
    desc: {
      ar: 'بعد الفحص المجاني: تقرير من صفحتين يقرأ سيرتك أنت — أول عشرين كلمة ومتى يوقفها القارئ، نقاطك بلا أرقام وكيف تُقاس، وترتيب إصلاحٍ بأثرِ كل خطوة. معه توصيات قوالب حسب مجالك.',
      en: 'After the free check: a two-page report that reads your CV — your first twenty words and where a reader stops, your bullets without numbers and how to measure them, and a fix order by impact. Field-matched template picks included.',
    },
  },
  {
    // ————— اشتراك Qalb Pro — في الرئيسية، موازيًا للشراء لمرة واحدة —————
    id: 'pro-month',
    groups: ['pro'],
    price: 39,
    icon: 'refresh',
    period: 'month',
    name: { ar: 'Qalb Pro — شهري', en: 'Qalb Pro — monthly' },
    tagline: { ar: 'كل القوالب وتحديثاتها، شهرًا بشهر', en: 'Every template and its updates, month to month' },
    desc: {
      ar: 'اشتراك شهر واحد: كل قوالب المتجر الحالية تصير لك ما دام اشتراكك حيًّا، وكل قالبٍ جديدٍ يُضاف في أشهرك يدخل بلا زيادة. لا تجديد تلقائي: نذكّرك قبل نهايته والتجديد بيدك.',
      en: 'One month of Pro: every template in the store is yours while the subscription is live, and every new release during your months is included at no extra cost. No auto-renewal: we remind you before it ends, you renew by hand.',
    },
  },
  {
    id: 'pro-year',
    groups: ['pro'],
    price: 349,
    icon: 'crown',
    period: 'year',
    name: { ar: 'Qalb Pro — سنوي', en: 'Qalb Pro — yearly' },
    tagline: { ar: 'سنةٌ كاملة، بسعر سبعة أشهر ونصف', en: 'A full year, priced at seven and a half months' },
    desc: {
      ar: 'سنة كاملة من كل القوالب والتحديثات والإصدارات الجديدة، بنسخٍ تُحمَّل مجددًا بلا إعادة شراء. لا تجديد تلقائي — يصلك تذكير قبل الشهر الأخير.',
      en: 'A full year of every template, update and new release, with re-downloadable copies at no re-purchase. No auto-renewal — a reminder arrives before your last month.',
    },
  },
]

export const upsellById = (id) => UPSELLS.find((u) => u.id === id) || null

/** أسعار الخادم: مثل priceTable للقوالب — جدولٌ واحد يُصدَّق به ما يأتي من المتصفح */
export const upsellPriceTable = () => Object.fromEntries(UPSELLS.map((u) => [u.id, u.price]))

const inGroup = (g) => UPSELLS.filter((u) => u.groups.includes(g))

/** ما تعرضه السلة وخطوة الدفع — إضافاتٍ تُلحَق بأي طلب */
export const cartUpsells = () => inGroup('checkout')

/** ما تعرضه صفحة /services — خدمات يؤديها الفريق */
export const serviceUpsells = () => inGroup('services')

/** خطتا Qalb Pro في الرئيسية */
export const proPlans = () => inGroup('pro')

/** التقرير المدفوع الذي يُعرض بعد الفحص المجاني في /ats */
export const atsReportUpsell = () => upsellById('ats-report')

/**
 * كيف يُسلَّم — كلُّ ما هنا ليس ملفًا يُنزَّل لحظة الدفع: الخدمات بالبريد خلال
 * مهلتها (sla بالساعات)، والاشتراك يُفعَّل بعد الدفع بيد الفريق. تقرأها صفحة
 * الإيصال وصفحة الخدمات فلا تَعِدَ زرَّ تحميلٍ لما لا يُنزَّل.
 */
export const addonDelivery = (id) => {
  const u = upsellById(id)
  if (!u) return null
  return u.period ? { kind: 'activate', period: u.period } : { kind: 'email', hours: u.sla }
}

/**
 * سطر الإضافة في الطلب — نفس شكل سطر القالب تقريبًا، بلا slug وبتسليمٍ بشري.
 * يستعملها المتصفح في مسودة الدفع، والخادم يُعيد ختم السعر منها قبل الحفظ.
 */
export const addonLine = (id) => {
  const u = upsellById(id)
  return u ? { id: u.id, price: u.price } : null
}

export default UPSELLS
