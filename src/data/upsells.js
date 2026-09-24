/**
 * الإضافات والخدمات — كلُّ ما يُشترى في هذا المتجر وليس قالبًا.
 *
 * مصدرٌ واحد تقرأ منه أربعةُ وجوه، فلا يختلف سعرٌ بينها أبدًا:
 *   1. السلة والدفع (group: 'checkout') — إضافاتٍ تُلحَق بالطلب من صفحة السلة وخطوة الدفع.
 *   2. صفحة الخدمات /services (group: 'services') — خدمات Done-For-You يؤديها فريقنا لا ملفٌ يُنزَّل.
 *   3. فاحص ATS (group: 'ats') — التقرير التفصيلي المدفوع بعد الفحص المجاني.
 *   4. اشتراك Qalb Pro (group: 'pro') — شهري وسنوي، بنفس سعري الدرجة في
 *      src/data/plans.js، فلا يظهر الاشتراك برقمين في مكانين.
 *   5. منظومةُ التوظيف (groups: 'match' و'kit' و'share' و'link' و'talent' و'linkedin'
 *      و'badge') — مطابقةُ الإعلان، ملفُّ التقديم، بطاقة المشاركة، الرابط المهني،
 *      دليل المواهب، الاستيراد من LinkedIn، وإزالة الشارة.
 *
 * والخادم يحسب أسعارها بنفسه في server/worker.js من هذا الجدول — لا يُصدَّق سعرٌ
 * قادم من المتصفح، كما لا يُصدَّق سعرُ قالب. وما هو بشريُّ التسليم (مراجعة، كتابة،
 * تركيب) تُسلَّم بالبريد خلال مهلةٍ معلنة، فلا «تحميل فوري» على خدمةٍ يقوم بها إنسان.
 * وما هو فوريٌّ فعلًا (`instant`) يُفتح في المتصفح بعد الدفع، فلا يُوعد ببريدٍ لا
 * يصل: حقلُ `sla` مخصوصٌ بما يُسلَّم باليد.
 */

export const UPSELL_GROUPS = ['checkout', 'services', 'ats', 'pro', 'match', 'kit', 'share', 'link', 'talent', 'linkedin', 'badge']

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
    // ————— اشتراك Qalb Pro — نفسُ درجة الاشتراك في جدول الخطط —————
    // السعر هنا هو سعرُ الدرجة نفسها في src/data/plans.js (‎49‎ شهريًا / ‎349‎ سنويًا):
    // جدولٌ واحدٌ للاشتراك، وهذه نسختُه في السلة — لا رقمَان لنفس المنتج.
    id: 'pro-month',
    groups: ['pro'],
    price: 49,
    icon: 'refresh',
    period: 'month',
    name: { ar: 'Qalb Pro — شهري', en: 'Qalb Pro — monthly' },
    tagline: { ar: 'كل القوالب والنطاق الخاص وتصدير الملفات', en: 'Every template, your own domain, and the file export' },
    desc: {
      ar: 'اشتراك شهر واحد: كل قوالب المتجر بلا سقف، ربط نطاقك الخاص، تصدير ملفات المصدر كاملة، وأولوية الدعم. لا تجديد تلقائي: نذكّرك قبل نهايته والتجديد بيدك.',
      en: 'One month of Pro: every template with no ceiling, your own domain connected, the full source-file export, and priority support. No auto-renewal: we remind you before it ends, you renew by hand.',
    },
  },
  {
    id: 'pro-year',
    groups: ['pro'],
    price: 349,
    icon: 'crown',
    period: 'year',
    name: { ar: 'Qalb Pro — سنوي', en: 'Qalb Pro — yearly' },
    tagline: { ar: 'سنةٌ كاملة، بسعر سبعة أشهر', en: 'A full year, priced at seven months' },
    desc: {
      ar: 'سنة كاملة من كل القوالب والنطاق الخاص وتصدير الملفات وأولوية الدعم، بلا تجديد تلقائي — يصلك تذكير قبل الشهر الأخير.',
      en: 'A full year of every template, your own domain, the file export and priority support, with no auto-renewal — a reminder arrives before your last month.',
    },
  },
  {
    // ————— منظومة التوظيف —————
    // ١. مطابقةُ السيرة بإعلان الوظيفة: الفحصُ الأول مجاني، وهذا تقريره المفصّل
    id: 'match-report',
    groups: ['match'],
    price: 29,
    icon: 'scan',
    sla: 24,
    name: { ar: 'تقريرُ مطابقةٍ مفصّل', en: 'A detailed match report' },
    tagline: { ar: 'الكلماتُ الناقصة، ونقاطُ التعديل، والقالبُ الأنسب لإعلانك', en: 'The missing words, the edits, and the template for this post' },
    desc: {
      ar: 'بعد الفحص المجاني (النسبة وحدها): تقريرٌ يقرأ إعلانك أنت — المفرداتُ التي طلبها الإعلان وغابت عن سيرتك مرتّبةً بوزنها، ولكلِّ واحدةٍ سطرٌ مقترحٌ يُكتب في قسمه، ثم ثلاثةُ قوالبَ من كتالوجنا يليقُ بتخصصك. ملفٌّ يُنسخ أو يُنزَّل، ولا يُرسل بالبريد.',
      en: 'After the free check (the percentage alone): a report that reads your posting — the words it asks for and your CV lacks, ordered by weight, each with a suggested line and the section it belongs in, then three templates from our catalogue that fit your field. A file to copy or download; nothing is mailed.',
    },
  },
  {
    id: 'match-5',
    groups: ['match'],
    price: 79,
    icon: 'layers',
    sla: 24,
    name: { ar: 'خمسةُ تقارير مطابقة', en: 'Five match reports' },
    tagline: { ar: 'لمن يقدّم على خمسِ وظائف في شهر', en: 'For five applications in one month' },
    desc: {
      ar: 'خمسةُ تقاريرَ تُستعمل متى شئت في اثني عشر شهرًا: الباحثُ عن عمل يقدّم على عشرين وظيفة، فالتقريرُ الواحد لا يكفيه. كلُّ تقريرٍ لإعلانٍ واحد، والرصيدُ يظهر في صفحة المطابقة قبل أن تفتح تقريرًا جديدًا.',
      en: 'Five reports to spend over twelve months: a job seeker sends twenty applications, and one report does not cover it. Each report is for one posting, and the balance shows on the match page before you open a new one.',
    },
  },
  {
    // ٤. مولّد ملف التقديم: عشرُ توليداتٍ برصيد، لا اشتراك
    id: 'kit-10',
    groups: ['kit'],
    price: 49,
    icon: 'spark',
    instant: true,
    name: { ar: 'ملفُّ تقديم — ١٠ توليدات', en: 'Application kit — 10 generations' },
    tagline: {
      ar: 'سيرةٌ مخصّصة + خطاب + رسالة LinkedIn + إيميل، لإعلانٍ واحد',
      en: 'A tailored CV + letter + LinkedIn note + e-mail, for one posting',
    },
    desc: {
      ar: 'كلُّ توليدٍ يبني من إعلانٍ واحد: نقاطُ سيرتك مرتّبةً على مفردات الإعلان، وخطابُ تقديم، ورسالةٌ قصيرة، وإيميلٌ بموضوعه جاهز. لا يخترعُ خبرةً ولا رقمًا: ما لا يجده في سيرتك يتركه فارغًا لتكتبه. الرصيدُ عشرٌ، يُنقص عند كلِّ توليد، ويبقى في متصفحك.',
      en: 'Each generation builds from one posting: your bullets re-ordered around its words, a cover letter, a short note and an e-mail with its subject ready. It invents neither experience nor numbers — whatever it cannot find in your CV it leaves blank for you. Ten credits, spent one per generation, kept in your browser.',
    },
  },
  {
    // ٧. بطاقة المشاركة: نسخةٌ بلا شعار
    id: 'share-verified',
    groups: ['share'],
    price: 19,
    icon: 'star',
    instant: true,
    name: { ar: 'بطاقةٌ موثّقة بلا شعار', en: 'A verified card, no badge' },
    tagline: { ar: 'نفسُ الدرجة، بلا شعارنا، ومعها كوبونٌ لصديق', en: 'The same score, without our logo, and with a friend coupon' },
    desc: {
      ar: 'البطاقةُ المجانية تحمل شعارَنا في أسفلها؛ هذه نسختُها الموثّقة: الدرجةُ نفسها التي قاسها الفاحص، بلا شعار، وفيها سطرُ كوبونٍ يخصم على صديقك أولَ قالب. تُبنى في متصفحك صورةً (SVG أو PNG) ولا تُرفع إلى خدمةٍ خارجية.',
      en: 'The free card carries our logo at the bottom; this is its verified version: the very score the checker measured, no logo, plus a coupon line that discounts a friend’s first template. Built in your browser as an image (SVG or PNG) and never uploaded anywhere.',
    },
  },
  {
    // ٣. الرابط المهني: تحليلات متقدمة ونطاق خاص
    id: 'link-plus',
    groups: ['link'],
    price: 29,
    icon: 'globe',
    period: 'month',
    name: { ar: 'رابطٌ بلس — تحليلات ونطاق', en: 'Link Plus — analytics and domain' },
    tagline: { ar: 'البلدان والمصدر وسجلُّ ثلاثين يومًا، ونطاقك على الرابط', en: 'Countries, sources, a 30-day log, and your own domain' },
    desc: {
      ar: 'الرابطُ المجاني يعدُّ الزيارات وتنزيلات السيرة. هذه النسخةُ تفتح ما وراء العدد: من أيِّ بلدٍ فُتح (مستنتجًا من منطقةِ الجهاز الزمنية، لا من عنوانه)، ومن أيِّ صفحةٍ جاء الزائر، وسجلُّ ثلاثين يومًا، ونطاقُك الخاص يُربط بالرابط. اشتراكٌ شهريٌّ بلا تجديدٍ تلقائي.',
      en: 'The free link counts views and CV downloads. This one opens what is behind the count: which country it was opened from (inferred from the device’s time zone, not its address), which page the visitor came from, a thirty-day log, and your own domain pointed at the link. Monthly, with no auto-renewal.',
    },
  },
  {
    // ٧. دليل المواهب: إبراز الملف للشركات
    id: 'talent-spot',
    groups: ['talent'],
    price: 29,
    icon: 'pulse',
    period: 'month',
    name: { ar: 'إبرازٌ في دليل المواهب', en: 'A featured spot in the talent directory' },
    tagline: { ar: 'ملفُك أولَ النتائج في تخصصك ومدينتك', en: 'Your profile first in your field and city' },
    desc: {
      ar: 'الدليلُ مجانيٌّ لمن يفعّله، والإبرازُ يجعل ملفَّك أولَ ما تراه الشركاتُ الباحثة في تخصصك ومدينتك. لا نبيعُ بياناتك: الذي يظهر هو ما اخترتَ إظهاره في رابطك، والبريدُ لا يظهر إلا باختيارك. اشتراكٌ شهريٌّ يُلغى في أيِّ وقت.',
      en: 'The directory is free to join, and a featured spot puts your profile first for companies searching your field and city. We sell no data: what appears is what you chose to show on your link, and your e-mail appears only if you say so. Monthly, cancelled any time.',
    },
  },
  {
    // ٦. الاستيراد من LinkedIn
    id: 'linkedin-import',
    groups: ['checkout', 'linkedin'],
    price: 39,
    icon: 'briefcase',
    instant: true,
    name: { ar: 'ابنِ سيرتك من LinkedIn', en: 'Build your CV from LinkedIn' },
    tagline: { ar: 'انسخ ملفّك، الصقه، وتمتلئ الحقول', en: 'Copy your profile, paste it, the fields fill' },
    desc: {
      ar: 'لا نصلُ إلى حسابك ولا نطلب كلمةَ سر: زرٌّ في LinkedIn ينسخ ملفّك نصًّا، وتلصقه هنا فتُقرأ الأقسام (النبذة، الخبرة، التعليم، المهارات) وتُملأ حقولُ القالب في ثانية. الأداةُ تعمل في متصفحك، ولا يُرسل النصُّ إلى خادم، وما لم تفهمه من سطرٍ تتركه فارغًا لتكتبه — لا تُخترع مسمّيات.',
      en: 'We never touch your account and never ask for a password: a button on LinkedIn copies your profile as text, you paste it here, and the sections (About, Experience, Education, Skills) are read into the template’s fields in a second. It runs in your browser, the text is sent to no server, and any line it cannot parse is left blank for you — titles are never invented.',
    },
  },
  {
    // ٩. إزالة شارة «بُنيَ بقالب»
    id: 'badge-off',
    groups: ['checkout', 'badge'],
    price: 19,
    icon: 'type',
    instant: true,
    name: { ar: 'إزالةُ شارة «بُنيَ بقالب»', en: 'Remove the “Built with Qalb” badge' },
    tagline: { ar: 'لمرةٍ واحدة، بلا اشتراك — أو مجانًا مع «قالب بلس»', en: 'One time, no subscription — or free with Qalb Plus' },
    desc: {
      ar: 'كلُّ قالبٍ منشور يحمل شارةً صغيرة في فوتره تعود إلينا. هذه الإضافةُ تُسقطها من سيرتك وموقعك المُولَّدين، لمرةٍ واحدة وبلا اشتراك. طريقٌ ثانٍ بلا مقابل: باقةُ «قالب بلس» تُسقطها ضمن ما تفتحه — نقولها هنا فلا يشتري أحدٌ مرتين ما يُفتح مجانًا في باقةٍ أعلى.',
      en: 'Every published template carries a small badge in its footer that points back to us. This add-on takes it off your generated CV and site, once, with no subscription. There is a second way at no cost: Qalb Plus removes it as part of what it opens — said here so nobody buys twice what a higher tier gives free.',
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

/** تقريرُ المطابقة وباقته — يُعرضان بعد الفحص المجاني في /match */
export const matchUpsells = () => inGroup('match')
/** مولّد ملف التقديم — رصيدُ عشرِ توليدات */
export const kitUpsell = () => upsellById('kit-10')
/** بطاقةُ المشاركة الموثّقة — بلا شعار */
export const shareUpsell = () => upsellById('share-verified')
/** اشتراكُ الرابط المهني — تحليلاتٌ متقدمة ونطاق */
export const linkUpsell = () => upsellById('link-plus')
/** إبرازُ الملف في دليل المواهب */
export const talentUpsell = () => upsellById('talent-spot')
/** استيرادُ السيرة من LinkedIn */
export const linkedinUpsell = () => upsellById('linkedin-import')
/** إزالةُ شارة «بُنيَ بقالب» من الفوتر */
export const badgeUpsell = () => upsellById('badge-off')

/**
 * كيف يُسلَّم — كلُّ ما هنا ليس ملفًا يُنزَّل لحظة الدفع: الخدمات بالبريد خلال
 * مهلتها (sla بالساعات)، والاشتراك يُفعَّل بعد الدفع بيد الفريق. تقرأها صفحة
 * الإيصال وصفحة الخدمات فلا تَعِدَ زرَّ تحميلٍ لما لا يُنزَّل.
 */
export const addonDelivery = (id) => {
  const u = upsellById(id)
  if (!u) return null
  // فوريٌّ: يُفتح في المتصفح بعد الدفع (رصيدٌ أو مِيزة)، فلا بريدَ ولا انتظار
  if (u.instant) return { kind: 'instant' }
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
