/**
 * Catalog data for a Portfolio + CV template store.
 * Prices are in SAR (VAT included) — this is a front-end demo, so every
 * number here is illustrative content, not a real charge.
 *
 * type: 'portfolio' (موقع) | 'cv' (سيرة ذاتية) | 'bundle' (حزمة: موقع + سيرة)
 */

export const TYPES = [
  { id: 'all', ar: 'كل المنتجات', en: 'All products' },
  { id: 'portfolio', ar: 'موقع بورتفوليو', en: 'Portfolio site' },
  { id: 'cv', ar: 'سيرة ذاتية', en: 'Resume / CV' },
  { id: 'bundle', ar: 'حزمة موقع + سيرة', en: 'Site + CV bundle' },
]

export const categories = [
  { id: 'design', ar: 'تصميم وجرافيك', en: 'Design & graphic', icon: 'palette' },
  { id: 'photo', ar: 'تصوير وفيديو', en: 'Photo & film', icon: 'camera' },
  { id: 'dev', ar: 'برمجة وتطوير', en: 'Engineering', icon: 'code' },
  { id: 'motion', ar: 'موشن وثلاثي الأبعاد', en: 'Motion & 3D', icon: 'play' },
  { id: 'content', ar: 'كتابة ومحتوى', en: 'Writing & content', icon: 'pen' },
  { id: 'general', ar: 'عام وبسيط', en: 'General', icon: 'grid' },
  { id: 'corporate', ar: 'شركات ومؤسسسات', en: 'Corporate', icon: 'briefcase' },
  { id: 'graduate', ar: 'طلبة وخريجون', en: 'Students', icon: 'cap' },
]

/* ---------- site preview controls ---------- */
export const HEROES = [
  { id: 'split', ar: 'مقسوم', en: 'Split' },
  { id: 'center', ar: 'وسط', en: 'Centered' },
  { id: 'media', ar: 'صورة كاملة', en: 'Media' },
]
export const GALLERIES = [
  { id: 'grid3', ar: '٣ أعمدة', en: '3-up grid' },
  { id: 'grid2', ar: 'عمودان', en: '2-up grid' },
  { id: 'list', ar: 'قائمة', en: 'List' },
  { id: 'spotlight', ar: 'عمل مميّز', en: 'Spotlight' },
]
export const DEVICES = [
  { id: 'desktop', ar: 'سطح المكتب', en: 'Desktop', w: 1280, h: 800 },
  { id: 'tablet', ar: 'لوحي', en: 'Tablet', w: 768, h: 900 },
  { id: 'mobile', ar: 'جوال', en: 'Mobile', w: 390, h: 780 },
]

/* ---------- shared controls ---------- */
export const LAYOUTS = [
  { id: 'single', ar: 'عمود واحد', en: 'Single column' },
  { id: 'side', ar: 'شريط جانبي', en: 'Side bar' },
  { id: 'band', ar: 'شريط علوي', en: 'Top band' },
  { id: 'timeline', ar: 'خط زمني', en: 'Timeline' },
  { id: 'serif', ar: 'كلاسيكي', en: 'Classic' },
]

export const PALETTE = [
  { id: 'ink', hex: '#1f2937', ar: 'حبري', en: 'Graphite' },
  { id: 'azure', hex: '#2563eb', ar: 'أزرق', en: 'Azure' },
  { id: 'pine', hex: '#0f7a58', ar: 'أخضر داكن', en: 'Pine' },
  { id: 'plum', hex: '#6d28d9', ar: 'برقوقي', en: 'Plum' },
  { id: 'rust', hex: '#b45309', ar: 'نحاسي', en: 'Copper' },
  { id: 'rose', hex: '#be123c', ar: 'عنابي', en: 'Rose' },
  { id: 'teal', hex: '#0e7490', ar: 'بترولي', en: 'Teal' },
]

export const FONTS = [
  { id: 'sans', ar: 'حديث', en: 'Modern sans', css: "'Inter','IBM Plex Sans Arabic',sans-serif" },
  { id: 'humanist', ar: 'إنساني', en: 'Humanist', css: "'IBM Plex Sans Arabic','Inter',sans-serif" },
  { id: 'serif', ar: 'كلاسيكي', en: 'Serif', css: "Georgia,'Times New Roman',serif" },
]

/* ================= resume demo content ================= */
const cvDemo = {
  nova: {
    name: { ar: 'سارة العتيبي', en: 'Sarah Al-Otaibi' },
    role: { ar: 'مديرة منتج رقمي', en: 'Digital Product Manager' },
    city: { ar: 'جدة، السعودية', en: 'Jeddah, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'مديرة منتج أول — نُمو', en: 'Senior PM — Numu' },
        p: { ar: '2021 — الآن', en: '2021 — Present' },
        b: [
          { ar: 'رفعت تحويل التسجيل من ١٨٪ إلى ٣٤٪', en: 'Lifted signup conversion from 18% to 34%' },
          { ar: 'قدت ٣ فرق لإطلاق ٧ إصدارات', en: 'Led 3 squads through 7 releases' },
        ],
      },
      {
        t: { ar: 'مديرة منتج — أُفق', en: 'Product Manager — Ufuq' },
        p: { ar: '2018 — 2021', en: '2018 — 2021' },
        b: [
          { ar: 'أطلقت تطبيق iOS بـ ١٢٠ ألف تحميل', en: 'Shipped iOS app: 120k installs' },
          { ar: 'أسّست مكتبة مؤشرات لـ ٤ منتجات', en: 'Built a metrics layer for 4 products' },
        ],
      },
    ],
    skills: { ar: ['استراتيجية المنتج', 'بحث المستخدمين', 'Figma', 'تحليل البيانات'], en: ['Product strategy', 'Research', 'Figma', 'Analytics'] },
    edu: { ar: 'بكالوريوس علوم حاسب — جامعة الملك عبدالعزيز', en: 'BSc CS — KAU' },
  },
  atlas: {
    name: { ar: 'فيصل الدوسري', en: 'Faisal Al-Dosari' },
    role: { ar: 'مهندس برمجيات أول · منصات سحابية', en: 'Senior Engineer · Platform' },
    city: { ar: 'الرياض، السعودية', en: 'Riyadh, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'مهندس أول — سحابة', en: 'Staff Engineer — Saha' },
        p: { ar: '2020 — الآن', en: '2020 — Present' },
        b: [
          { ar: 'خفّض تكلفة الاستضافة ٦٢٪', en: 'Cut hosting spend by 62%' },
          { ar: 'هاجر ٤٠ خدمة إلى Kubernetes بدون انقطاع', en: 'Migrated 40 services with zero downtime' },
        ],
      },
      {
        t: { ar: 'مهندس برمجيات — مسار', en: 'SWE — Masar' },
        p: { ar: '2017 — 2020', en: '2017 — 2020' },
        b: [
          { ar: 'نظام مصادقة يخدم ٢ مليون مستخدم', en: 'Auth service for 2M daily users' },
          { ar: 'مراجعات كود آلية قلّلت الأخطاء ٣٥٪', en: 'Review gates, −35% defects' },
        ],
      },
    ],
    skills: { ar: ['Go', 'Kubernetes', 'PostgreSQL', 'Terraform', 'CI/CD'], en: ['Go', 'Kubernetes', 'PostgreSQL', 'Terraform', 'CI/CD'] },
    edu: { ar: 'بكالوريوس هندسة برمجيات — جامعة الملك فهد', en: 'BSc SE — KFUPM' },
  },
  echo: {
    name: { ar: 'ريان المطيري', en: 'Rayan Al-Mutairi' },
    role: { ar: 'خريج هندسة كهربائية · بحث طاقة', en: 'EE Graduate · Energy Research' },
    city: { ar: 'الظهران، السعودية', en: 'Dhahran, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'باحث متدرب — معهد الطاقة', en: 'Research Intern — Energy Inst.' },
        p: { ar: '2024', en: '2024' },
        b: [
          { ar: 'نمذج شبكة خفّضت الفقد ٧٪', en: 'Grid model cut losses 7%' },
          { ar: 'ورقة بحثية في مؤتمر IEEE', en: 'Paper at the IEEE regional conf.' },
        ],
      },
      {
        t: { ar: 'رئيس نادي الهندسة —KFUPM', en: 'Eng. Society President — KFUPM' },
        p: { ar: '2023 — 2024', en: '2023 — 2024' },
        b: [
          { ar: 'هاكاثون بـ ٤٠٠ مشارك', en: 'Ran a 400-person hackathon' },
          { ar: 'تخرج بمرتبة الشرف الأولى ٤٫٧', en: 'Honours, GPA 4.7' },
        ],
      },
    ],
    skills: { ar: ['MATLAB', 'Power Systems', 'Python', 'AutoCAD'], en: ['MATLAB', 'Power systems', 'Python', 'AutoCAD'] },
    edu: { ar: 'بكالوريوس هندسة كهربائية — مرتبة الشرف', en: 'BSc EE — Honours' },
  },
  apex: {
    name: { ar: 'نورة الحربي', en: 'Noura Al-Harbi' },
    role: { ar: 'مديرة عامة · تحوّل رقمي', en: 'COO · Digital Transformation' },
    city: { ar: 'الرياض، السعودية', en: 'Riyadh, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'مديرة العمليات — مجموعة أفق', en: 'COO — Afuq Group' },
        p: { ar: '2019 — الآن', en: '2019 — Present' },
        b: [
          { ar: 'برنامج تحول لـ ٣٠٠٠ موظف في ١٤ شهرًا', en: 'Led a 3,000-person transformation' },
          { ar: 'الإيراد من ١٨٠ إلى ٣٣٠ مليون ريال', en: 'Grew revenue SAR 180M → 330M' },
        ],
      },
      {
        t: { ar: 'مديرة استراتيجية — بنك الشرق', en: 'Head of Strategy — East Bank' },
        p: { ar: '2015 — 2019', en: '2015 — 2019' },
        b: [
          { ar: 'خطة ٥ سنوات أقرّها المجلس', en: 'Board-approved 5-year plan' },
          { ar: '٣ شراكات إقليمية بـ ٩٠ مليون ريال', en: '3 partnerships worth SAR 90M' },
        ],
      },
    ],
    skills: { ar: ['قيادة تنفيذية', 'حوكمة', 'تخطيط مالي', 'مجلس إدارة'], en: ['Executive leadership', 'Governance', 'FP&A', 'Board reporting'] },
    edu: { ar: 'MBA — جامعة جورج تاون', en: 'MBA — Georgetown' },
  },
  mirror: {
    name: { ar: 'لمار سيف', en: 'Lamar Sayed' },
    role: { ar: 'مصمّم منتج مستقل', en: 'Independent Product Designer' },
    city: { ar: 'دبي، الإمارات', en: 'Dubai, UAE' },
    jobs: [
      {
        t: { ar: 'مصممة أولى — استوديو أثر', en: 'Lead Designer — Athar Studio' },
        p: { ar: '2020 — الآن', en: '2020 — Present' },
        b: [
          { ar: '١٨ هوية بصرية لعلامات إقليمية', en: '18 brand identities shipped' },
          { ar: 'رفع رضا العملاء إلى ٩٢٪', en: 'CSAT from 71 to 92' },
        ],
      },
      {
        t: { ar: 'مصممة منتج — وكالة مد', en: 'Product Designer — Mudad' },
        p: { ar: '2018 — 2020', en: '2018 — 2020' },
        b: [
          { ar: 'حملات وصلت إلى ١٢ مليون شخص', en: 'Campaigns reached 12M people' },
          { ar: 'نظام تصميم بـ ١٨٠ مكوّنًا', en: '180-component design system' },
        ],
      },
    ],
    skills: { ar: ['Figma', 'نظم التصميم', 'هوية بصرية', 'بحث المستخدم'], en: ['Figma', 'Design systems', 'Brand', 'Research'] },
    edu: { ar: 'بكالوريوس تصميم اتصال — جامعة دار الحكمة', en: 'BA Comm. Design — UDH' },
  },
  // ————— شخصيات التخصصات (v1.5.0): تُقرأها قوالب /templates?type=cv الجديدة —————
  med: {
    name: { ar: 'د. ريم القحطاني', en: 'Dr. Reem Al-Qahtani' },
    role: { ar: 'طبيبة امتياز · باطنة', en: 'Medical Intern · Internal Medicine' },
    city: { ar: 'الرياض، السعودية', en: 'Riyadh, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'امتياز — مستشفى الملك فيصل التخصصي', en: 'Internship — KFSH&RC' },
        p: { ar: '2025 — 2026', en: '2025 — 2026' },
        b: [
          { ar: '٦ دورات سريرية بمعدل تقييم ٤٫٨ من ٥', en: '6 clinical rotations, 4.8/5 evaluations' },
          { ar: '٤٠ حالة حرجة موثّقة في السجل الإلكتروني', en: '40 acute cases documented in the EHR' },
        ],
      },
      {
        t: { ar: 'بحث سريري — وحدة السكري', en: 'Clinical research — Diabetes unit' },
        p: { ar: '2024 — 2025', en: '2024 — 2025' },
        b: [
          { ar: 'تجربة على ١٢٠ مريضًا؛ النتائج في مؤتمر SGICON', en: 'A 120-patient trial; findings at SGICON' },
          { ar: 'تقليص زمن جمع البيانات ٣٠٪ بنموذج موحّد', en: 'Cut data-collection time 30% with one form' },
        ],
      },
    ],
    skills: {
      ar: ['التاريخ المرضي', 'السجل الصحي الموحّد', 'BLS', 'أخلاقيات البحث'],
      en: ['Clinical history', 'Unified health record', 'BLS', 'Research ethics'],
    },
    edu: { ar: 'دكتور طب — جامعة الملك سعود', en: 'MD — KSU' },
  },
  legal: {
    name: { ar: 'عبدالله الشهري', en: 'Abdullah Al-Shehri' },
    role: { ar: 'محامٍ نزاع وتحكيم', en: 'Litigation & arbitration lawyer' },
    city: { ar: 'جدة، السعودية', en: 'Jeddah, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'محامٍ — مكاتب العُلا للحجز والتحكيم', en: 'Associate — Al-Ula Law' },
        p: { ar: '2022 — الآن', en: '2022 — Present' },
        b: [
          { ar: '٣١ مذكرة دفاع قُبلت أصولها كاملة', en: '31 defence briefs accepted as filed' },
          { ar: 'تحكيمٌ قيمته ٤٠ مليون ريال حُسم في ٩ جلسات', en: 'SAR 40M arbitration settled in 9 sessions' },
        ],
      },
      {
        t: { ar: 'باحث قانوني — الهيئة السعودية للمحكمين', en: 'Legal researcher — SCCA' },
        p: { ar: '2020 — 2022', en: '2020 — 2022' },
        b: [
          { ar: 'تلخيص ١٤٠ حكمًا في قاعدة سوابق قابلية البحث', en: 'Summarised 140 awards into a searchable digest' },
          { ar: 'تقليص زمن التحرير ٢٥٪ بقوالب مذكرات', en: 'Cut drafting time 25% with brief templates' },
        ],
      },
    ],
    skills: {
      ar: ['التحكيم التجاري', 'صياغة العقود', 'نظام التنفيذ', 'الإنجليزية القانونية'],
      en: ['Commercial arbitration', 'Contract drafting', 'Enforcement law', 'Legal English'],
    },
    edu: { ar: 'بكالوريوس أنظمة حقوق — جامعة الملك عبدالعزيز', en: 'LLB — KAU' },
  },
  freelance: {
    name: { ar: 'دانة العمري', en: 'Dana Al-Omari' },
    role: { ar: 'مستقلة · هوية ومحتوى', en: 'Freelancer · brand & content' },
    city: { ar: 'الخبر، السعودية', en: 'Khobar, Saudi Arabia' },
    jobs: [
      {
        t: { ar: 'مستقلة — عملاء مباشرون', en: 'Independent — direct clients' },
        p: { ar: '2023 — الآن', en: '2023 — Present' },
        b: [
          { ar: '٢٤ مشروعًا بقيمة ٣٨٠ ألف ريال في سنتين', en: '24 projects worth SAR 380k in two years' },
          { ar: '٩ من كل ١٠ عملاء عادوا بطلبٍ ثانٍ', en: '9 of 10 clients returned with a second job' },
        ],
      },
      {
        t: { ar: 'مسؤولة محتوى — متجر «رسّة»', en: 'Content lead — Rassa store' },
        p: { ar: '2021 — 2023', en: '2021 — 2023' },
        b: [
          { ar: 'بريد إعلاني بمعدل فتح ٤١٪', en: 'Newsletter at a 41% open rate' },
          { ar: 'دليل هوية كامل بقيادة مصممة', en: 'A full brand guide, designer-led' },
        ],
      },
    ],
    skills: {
      ar: ['تسعير المشاريع', 'عقود المستقلين', 'فواتير ومحاسب', 'Figma'],
      en: ['Project pricing', 'Freelance contracts', 'Invoicing', 'Figma'],
    },
    edu: { ar: 'بكالوريوس تسويق — جامعة الدمام', en: 'BSc Marketing — University of Dammam' },
  },
}

/* ================= site (portfolio) demo content ================= */
const siteDemo = {
  aether: {
    name: { ar: 'لمار سيف', en: 'Lamar Sayed' },
    role: { ar: 'مصمّمة منتجات رقمية', en: 'Digital product designer' },
    blurb: {
      ar: 'أصمّم تجارب عربية/إنجليزية للمنتجات المالية والصحية — من البحث إلى نظام التصميم.',
      en: 'I design bilingual product experiences for fintech and health — research to design system.',
    },
    host: 'lamar.design',
    hero: 'split',
    gallery: 'grid3',
    theme: 'dark',
    font: 'humanist',
    accent: 'plum',
    nav: { ar: ['الأعمال', 'عني', 'الخدمات', 'تواصل'], en: ['Work', 'About', 'Services', 'Contact'] },
    stats: [
      { v: '٩', e: '9' },
      { v: 'سنوات', e: 'yrs' },
    ],
    projects: [
      { t: { ar: 'تطبيق ادّخار للعائلات', en: 'Family savings app' }, c: { ar: 'منتج', en: 'Product' }, y: '2025', hue: 268 },
      { t: { ar: 'نظام تصميم «رفق»', en: 'Rifaq design system' }, c: { ar: 'نظام', en: 'System' }, y: '2024', hue: 200 },
      { t: { ar: 'لوحة عيادة', en: 'Clinic dashboard' }, c: { ar: 'لوحة', en: 'Dash' }, y: '2024', hue: 32 },
      { t: { ar: 'هوية مقهى نُزل', en: 'Nozul café brand' }, c: { ar: 'هوية', en: 'Brand' }, y: '2023', hue: 150 },
    ],
  },
  atelier: {
    name: { ar: 'يوسف بن حمد', en: 'Yousef Bin Hamad' },
    role: { ar: 'مصوّر فوتوغرافي', en: 'Photographer' },
    blurb: {
      ar: 'تصوير معماري وتحرير بصري لمجلات وعلامات في الخليج.',
      en: 'Architecture and editorial photography for magazines and brands across the Gulf.',
    },
    host: 'yousef.photo',
    hero: 'media',
    gallery: 'grid2',
    theme: 'light',
    font: 'serif',
    accent: 'ink',
    nav: { ar: ['مجموعات', 'عن العدسة', 'حجز', 'يومية'], en: ['Series', 'Eye', 'Booking', 'Journal'] },
    stats: [
      { v: '١٤', e: '14' },
      { v: 'معرضًا', e: 'shows' },
    ],
    projects: [
      { t: { ar: 'حجارة الحجاز', en: 'Hijaz Stone' }, c: { ar: 'معماري', en: 'Architecture' }, y: '2025', hue: 28 },
      { t: { ar: 'ليل جدة', en: 'Jeddah at Night' }, c: { ar: 'مديني', en: 'Urban' }, y: '2024', hue: 214 },
      { t: { ar: 'حرفة السدو', en: 'Al-Sadu Craft' }, c: { ar: 'توثيق', en: 'Documentary' }, y: '2024', hue: 340 },
      { t: { ar: 'بحر ونخيل', en: 'Sea & Palm' }, c: { ar: 'مطبوعات', en: 'Print' }, y: '2023', hue: 178 },
    ],
  },
  nexus: {
    name: { ar: 'فيصل الدوسري', en: 'Faisal Al-Dosari' },
    role: { ar: 'مهندس منصات سحابية', en: 'Platform engineer' },
    blurb: {
      ar: 'أبني أنظمة تتحمّل: بنية تحتية، أدوات داخلية، ومكتبات مفتوحة المصدر.',
      en: 'I build systems that hold: infrastructure, internal tooling, and open-source libraries.',
    },
    host: 'faisal.dev',
    hero: 'center',
    gallery: 'list',
    theme: 'dark',
    font: 'sans',
    accent: 'teal',
    nav: { ar: ['مشاريع', 'مقالات', 'مفتوح المصدر', 'تواصل'], en: ['Projects', 'Writing', 'OSS', 'Contact'] },
    stats: [
      { v: '٢٫٤M', e: '2.4M' },
      { v: 'طلب/يوم', e: 'req/day' },
    ],
    projects: [
      { t: { ar: 'موزّع مهام بـ Go', en: 'Go job scheduler' }, c: { ar: 'مفتوح', en: 'OSS' }, y: '2025', hue: 190 },
      { t: { ar: 'منصة نشر داخلية', en: 'Internal deploy platform' }, c: { ar: 'أدوات', en: 'Tooling' }, y: '2024', hue: 250 },
      { t: { ar: 'مراقبة P99', en: 'P99 observability' }, c: { ar: 'بنية', en: 'Infra' }, y: '2024', hue: 96 },
      { t: { ar: 'CLI للتنصيب', en: 'Install CLI' }, c: { ar: 'مفتوح', en: 'OSS' }, y: '2023', hue: 44 },
    ],
  },
  folio: {
    name: { ar: 'عبدالرحمن الشهري', en: 'Abdulrahman Al-Shehri' },
    role: { ar: 'مستقل · استشارات تجربة المستخدم', en: 'Freelance UX consultant' },
    blurb: {
      ar: 'معرض أعمال بسيط وواضح: حالة دراسة واحدة ترويها أفضل من عشر صور.',
      en: 'A quiet portfolio: one well-told case study beats ten screenshots.',
    },
    host: 'abdulrahman.me',
    hero: 'split',
    gallery: 'spotlight',
    theme: 'light',
    font: 'sans',
    accent: 'pine',
    nav: { ar: ['دراسة حالة', 'أسلوب العمل', 'الأسعار', 'تواصل'], en: ['Case study', 'Process', 'Rates', 'Contact'] },
    stats: [
      { v: '٤١', e: '41' },
      { v: 'مشروعًا', e: 'projects' },
    ],
    projects: [
      { t: { ar: 'تحويل رحلة التسجيل', en: 'Rebuilding signup' }, c: { ar: 'منتج', en: 'Product' }, y: '2025', hue: 156 },
      { t: { ar: 'دليل استخدام البنك', en: 'Bank usability audit' }, c: { ar: 'بحث', en: 'Research' }, y: '2024', hue: 210 },
      { t: { ar: 'تطبيق توصيل', en: 'Delivery app' }, c: { ar: 'تطبيق', en: 'App' }, y: '2024', hue: 20 },
      { t: { ar: 'بوابة تدريب', en: 'Training portal' }, c: { ar: 'ويب', en: 'Web' }, y: '2023', hue: 288 },
    ],
  },
  reel: {
    name: { ar: 'هند الفهد', en: 'Hind Al-Fahad' },
    role: { ar: 'مونتاج وموشن جرافيك', en: 'Editor & motion designer' },
    blurb: {
      ar: 'أعمال متحركة للعلامات التجارية: إيقاع، صوت، وحركة لا تتوقف.',
      en: 'Brand motion work: rhythm, sound, and movement that never idles.',
    },
    host: 'hind.motion',
    hero: 'media',
    gallery: 'grid3',
    theme: 'dark',
    font: 'sans',
    accent: 'rose',
    nav: { ar: ['ريل', 'حالات', 'معدات', 'تواصل'], en: ['Reel', 'Cases', 'Kit', 'Contact'] },
    stats: [
      { v: '٦٨', e: '68' },
      { v: 'فيلمًا', e: 'films' },
    ],
    projects: [
      { t: { ar: 'فيلم إطلاق سيارة', en: 'Car launch film' }, c: { ar: 'إعلان', en: 'Ad' }, y: '2025', hue: 342 },
      { t: { ar: 'شعار متحرك لقناة', en: 'Channel ident' }, c: { ar: 'هوية', en: 'Ident' }, y: '2024', hue: 262 },
      { t: { ar: 'موشن لتطبيق مال', en: 'Fintech motion' }, c: { ar: 'منتج', en: 'Product' }, y: '2024', hue: 120 },
      { t: { ar: 'غلاف مهرجان', en: 'Festival titles' }, c: { ar: 'أحداث', en: 'Events' }, y: '2023', hue: 36 },
    ],
  },
  quill: {
    name: { ar: 'دانة العتيبي', en: 'Dana Al-Otaibi' },
    role: { ar: 'كاتبة وصحفية محتوى', en: 'Writer & content editor' },
    blurb: {
      ar: 'تحقيقات ومقالات طويلات، وسير عمل نشرتها ثلاث صحف إقليمية.',
      en: 'Investigations, long-reads and essays published across three regional papers.',
    },
    host: 'dana.writes',
    hero: 'center',
    gallery: 'list',
    theme: 'light',
    font: 'serif',
    accent: 'rust',
    nav: { ar: ['كتابات', 'تحقيقات', 'عن الكاتبة', 'تواصل'], en: ['Writing', 'Investigations', 'About', 'Contact'] },
    stats: [
      { v: '٢١٠', e: '210' },
      { v: 'مقالًا', e: 'pieces' },
    ],
    projects: [
      { t: { ar: 'عمال في الشمس', en: 'Labour in the sun' }, c: { ar: 'تحقيق', en: 'Investigation' }, y: '2025', hue: 22 },
      { t: { ar: 'لغة التصميم العربية', en: 'Arabic design language' }, c: { ar: 'مقال', en: 'Essay' }, y: '2024', hue: 200 },
      { t: { ar: 'سوق الكتب المستعملة', en: 'Second-hand book market' }, c: { ar: 'تقرير', en: 'Report' }, y: '2024', hue: 140 },
      { t: { ar: 'مقابلة: مرمّم آثار', en: 'Interview: a restorer' }, c: { ar: 'مقابلة', en: 'Interview' }, y: '2023', hue: 300 },
    ],
  },
  vertex: {
    name: { ar: 'مازن قاسم', en: 'Mazen Qasim' },
    role: { ar: 'فنّان ثلاثي الأبعاد ومخرج', en: '3D artist & art director' },
    blurb: {
      ar: 'مشاهد rendered للمنتجات والإعلانات — إضاءة، خامات، وتوقيت.',
      en: 'Rendered scenes for product and film — lighting, materials, and timing.',
    },
    host: 'mazen3d.studio',
    hero: 'media',
    gallery: 'grid2',
    theme: 'dark',
    font: 'sans',
    accent: 'azure',
    nav: { ar: ['مشاهد', 'خامات', 'طلب عرض', 'المدونة'], en: ['Scenes', 'Shaders', 'Brief', 'Blog'] },
    stats: [
      { v: '١٢', e: '12' },
      { v: 'مليون إطار', e: 'frames' },
    ],
    projects: [
      { t: { ar: 'إعلان عطر', en: 'Fragrance film' }, c: { ar: 'منتج', en: 'Product' }, y: '2025', hue: 240 },
      { t: { ar: 'أثاث في فراغ', en: 'Furniture in void' }, c: { ar: 'مفروشات', en: 'Interior' }, y: '2024', hue: 30 },
      { t: { ar: 'علبة قهوة', en: 'Coffee pack' }, c: { ar: 'تغليف', en: 'Packaging' }, y: '2024', hue: 12 },
      { t: { ar: 'مشهد آلة', en: 'Machine scene' }, c: { ar: 'صناعي', en: 'Industrial' }, y: '2023', hue: 196 },
    ],
  },
  studio: {
    name: { ar: 'استوديو أثَر', en: 'Athar Studio' },
    role: { ar: 'فريق تصميم من ٤ أشخاص', en: 'A four-person design team' },
    blurb: {
      ar: 'استوديو صغير: هوية، موقع، وتغليف — بمشروع واحد في كل مرة.',
      en: 'A small studio: brand, site, packaging — one project at a time.',
    },
    host: 'athar.studio',
    hero: 'split',
    gallery: 'grid3',
    theme: 'light',
    font: 'humanist',
    accent: 'pine',
    nav: { ar: ['أعمال', 'الاستوديو', 'العمليات', 'تواصل'], en: ['Work', 'Studio', 'Process', 'Contact'] },
    stats: [
      { v: '٦', e: '6' },
      { v: 'عملاء/سنة', e: 'clients/yr' },
    ],
    projects: [
      { t: { ar: 'علامة تمور', en: 'Dates brand' }, c: { ar: 'هوية', en: 'Brand' }, y: '2025', hue: 40 },
      { t: { ar: 'مقهى في الطين', en: 'Clay café' }, c: { ar: 'فضاء', en: 'Space' }, y: '2025', hue: 16 },
      { t: { ar: 'تطبيق museum', en: 'Museum app' }, c: { ar: 'رقمي', en: 'Digital' }, y: '2024', hue: 214 },
      { t: { ar: 'كتاب صور', en: 'Photo book' }, c: { ar: 'مطبوع', en: 'Print' }, y: '2024', hue: 152 },
      { t: { ar: 'مهرجان خط', en: 'Calligraphy fest' }, c: { ar: 'حدث', en: 'Event' }, y: '2023', hue: 274 },
      { t: { ar: 'تغليف تمر فاخر', en: 'Premium dates box' }, c: { ar: 'تغليف', en: 'Packaging' }, y: '2023', hue: 88 },
    ],
  },
  novabundle: {
    name: { ar: 'سارة العتيبي', en: 'Sarah Al-Otaibi' },
    role: { ar: 'مديرة منتج · ملف مهني متكامل', en: 'Product manager · full profile' },
    blurb: {
      ar: 'موقع مهني + سيرة ذاتية بنفس الهوية: السيرة تُفتح، والموقع يُقنع.',
      en: 'A professional site + CV in one identity: the CV opens doors, the site closes them.',
    },
    host: 'sarah.profile',
    hero: 'split',
    gallery: 'grid2',
    theme: 'light',
    font: 'sans',
    accent: 'azure',
    nav: { ar: ['نبذة', 'الأدوار', 'دراسات حالة', 'السيرة', 'تواصل'], en: ['About', 'Roles', 'Case studies', 'CV', 'Contact'] },
    stats: [
      { v: '١١', e: '11' },
      { v: 'منتجًا', e: 'products' },
    ],
    projects: [
      { t: { ar: 'منصة تحويل مالي', en: 'Remittance platform' }, c: { ar: 'منتج', en: 'Product' }, y: '2025', hue: 218 },
      { t: { ar: 'تطبيق ادخار', en: 'Savings app' }, c: { ar: 'تطبيق', en: 'App' }, y: '2024', hue: 156 },
      { t: { ar: 'لوحة تحليلات', en: 'Analytics board' }, c: { ar: 'لوحة', en: 'Dash' }, y: '2024', hue: 28 },
      { t: { ar: 'برنامج ولاء', en: 'Loyalty program' }, c: { ar: 'نمو', en: 'Growth' }, y: '2023', hue: 296 },
    ],
    cv: 'nova',
  },
  devbundle: {
    name: { ar: 'فيصل الدوسري', en: 'Faisal Al-Dosari' },
    role: { ar: 'مهندس برمجيات · موقع + سيرة', en: 'Software engineer · site + CV' },
    blurb: {
      ar: 'ملف هندبي بمقاييس حقيقية: أرقام، مكدّسات، وروابط مستودعات — مع سيرة تتوافق مع ATS.',
      en: 'An engineer profile with real numbers: metrics, stacks, repo links — plus an ATS-safe CV.',
    },
    host: 'faisal.dev',
    hero: 'center',
    gallery: 'list',
    theme: 'dark',
    font: 'sans',
    accent: 'teal',
    nav: { ar: ['الآن', 'المشاريع', 'الخبرة', 'السيرة', 'GitHub'], en: ['Now', 'Projects', 'Experience', 'CV', 'GitHub'] },
    stats: [
      { v: '٩٩', e: '99' },
      { v: 'uptime %', e: 'uptime %' },
    ],
    projects: [
      { t: { ar: 'محرّك نشر', en: 'Deploy engine' }, c: { ar: 'بنية', en: 'Infra' }, y: '2025', hue: 186 },
      { t: { ar: 'مكتبة مصادقة', en: 'Auth library' }, c: { ar: 'OSS', en: 'OSS' }, y: '2024', hue: 250 },
      { t: { ar: 'مقياس زمن حقيقي', en: 'Realtime metrics' }, c: { ar: 'بيانات', en: 'Data' }, y: '2024', hue: 96 },
      { t: { ar: 'أدوات داخلية', en: 'Internal tools' }, c: { ar: 'أدوات', en: 'Tooling' }, y: '2023', hue: 40 },
    ],
    cv: 'atlas',
  },
  gradbundle: {
    name: { ar: 'ريان المطيري', en: 'Rayan Al-Mutairi' },
    role: { ar: 'خريج هندسة · موقع أول + سيرة', en: 'Engineering grad · first site + CV' },
    blurb: {
      ar: 'لا خبرة طويلة؟ اعرض مشاريعك وبحثك في صفحة واحدة، وأرفق سيرة قصيرة مقنعة.',
      en: 'Short on experience? Show projects and research on one page, with a tight CV attached.',
    },
    host: 'rayan.me',
    hero: 'center',
    gallery: 'grid2',
    theme: 'light',
    font: 'humanist',
    accent: 'rust',
    nav: { ar: ['عنّي', 'مشاريع', 'بحث', 'السيرة', 'سجل الدرجات'], en: ['About', 'Projects', 'Research', 'CV', 'Transcript'] },
    stats: [
      { v: '٤٫٧', e: '4.7' },
      { v: 'معدل', e: 'GPA' },
    ],
    projects: [
      { t: { ar: 'نموذج شبكة توزيع', en: 'Grid loss model' }, c: { ar: 'بحث', en: 'Research' }, y: '2025', hue: 34 },
      { t: { ar: 'هاكاثون الإنارة', en: 'Lighting hackathon' }, c: { ar: 'مشروع', en: 'Build' }, y: '2024', hue: 200 },
      { t: { ar: 'حساس طاقة شمسية', en: 'Solar sensor rig' }, c: { ar: 'مختبر', en: 'Lab' }, y: '2024', hue: 150 },
      { t: { ar: 'لوحة متابعة استهلاك', en: 'Usage dashboard' }, c: { ar: 'ويب', en: 'Web' }, y: '2023', hue: 264 },
    ],
    cv: 'echo',
  },
  execsite: {
    name: { ar: 'نورة الحربي', en: 'Noura Al-Harbi' },
    role: { ar: 'مديرة عامة · ملف قيادي', en: 'COO · leadership profile' },
    blurb: {
      ar: 'صفحة تعريفية تنفيذية لمجلس إدارة أو متحدث: سجل، مجالس، ومحاضرات.',
      en: 'An executive profile for boards or stages: record, mandates, and talks.',
    },
    host: 'noura.co',
    hero: 'split',
    gallery: 'spotlight',
    theme: 'light',
    font: 'serif',
    accent: 'ink',
    nav: { ar: ['السجل', 'المجالس', 'الكلمات', 'وسائل إعلام', 'تواصل'], en: ['Record', 'Boards', 'Keynotes', 'Press', 'Contact'] },
    stats: [
      { v: '٣٣٠', e: '330' },
      { v: 'مليون ريال إيراد', e: 'SAR M revenue' },
    ],
    projects: [
      { t: { ar: 'تحوّل مجموعة أفق', en: 'Afuq transformation' }, c: { ar: 'برنامج', en: 'Programme' }, y: '2025', hue: 210 },
      { t: { ar: 'دخول سوقين جديدين', en: 'Two new markets' }, c: { ar: 'استراتيجية', en: 'Strategy' }, y: '2024', hue: 40 },
      { t: { ar: 'برنامج قيادة نسائية', en: 'Women leadership' }, c: { ar: 'تنمية', en: 'Talent' }, y: '2024', hue: 320 },
      { t: { ar: 'حوكمة ورقابة', en: 'Governance reset' }, c: { ar: 'حوكمة', en: 'Board' }, y: '2023', hue: 150 },
    ],
    cv: 'apex',
  },
  motionpack: {
    name: { ar: 'هند الفهد', en: 'Hind Al-Fahad' },
    role: { ar: 'مونتير ومصممة موشن', en: 'Editor & motion designer' },
    blurb: {
      ar: 'موقع يعرض الريل أولًا + سيرة للوكالات والعملاء المباشرين.',
      en: 'A reel-first site plus a CV pitched to agencies and direct clients.',
    },
    host: 'hind.motion',
    hero: 'media',
    gallery: 'grid3',
    theme: 'dark',
    font: 'sans',
    accent: 'rose',
    nav: { ar: ['ريل', 'حالات', 'رسوم', 'تواصل'], en: ['Reel', 'Cases', 'Rates', 'Contact'] },
    stats: [
      { v: '٦٨', e: '68' },
      { v: 'فيلمًا', e: 'films' },
    ],
    projects: [
      { t: { ar: 'فيلم إطلاق', en: 'Launch film' }, c: { ar: 'إعلان', en: 'Ad' }, y: '2025', hue: 344 },
      { t: { ar: 'هوية متحركة', en: 'Animated ident' }, c: { ar: 'هوية', en: 'Ident' }, y: '2024', hue: 268 },
      { t: { ar: 'شرح منتج', en: 'Product explainer' }, c: { ar: 'منتج', en: 'Product' }, y: '2024', hue: 122 },
      { t: { ar: 'عناوين مهرجان', en: 'Festival titles' }, c: { ar: 'حدث', en: 'Event' }, y: '2023', hue: 36 },
    ],
    cv: 'mirror',
  },
  // v1.5.0 · حزمة المستقلين: الموقع التجريبي الذي يُعاين ويُسلَّم مع freelancerkit
  freelancerkit: {
    name: { ar: 'دانة العمري', en: 'Dana Al-Omari' },
    role: { ar: 'مستقلة · هوية ومحتوى وأسعار معلنة', en: 'Freelancer · brand, content, rates on display' },
    blurb: {
      ar: 'مستقلة تحتاج أكثر من سيرة: عرض خدمات، أسعار واضحة، وصفحة تفاوض تُغلق العملية قبل المكالمة.',
      en: 'A freelancer needs more than a CV: a services page, public rates, and a booking page that closes the deal before the call.',
    },
    host: 'dana.work',
    hero: 'split',
    gallery: 'list',
    theme: 'light',
    font: 'humanist',
    accent: 'pine',
    nav: { ar: ['الخدمات', 'الأسعار', 'سجل العمل', 'العقود', 'تواصل'], en: ['Services', 'Rates', 'Track record', 'Contracts', 'Contact'] },
    stats: [
      { v: '٢٤', e: '24' },
      { v: 'مشروعًا', e: 'projects' },
    ],
    projects: [
      { t: { ar: 'هوية مقهى «نسكه»', en: 'Naska café identity' }, c: { ar: 'هوية', en: 'Brand' }, y: '2025', hue: 150 },
      { t: { ar: 'دليل محتوى لمتجر', en: 'Store content guide' }, c: { ar: 'محتوى', en: 'Content' }, y: '2025', hue: 210 },
      { t: { ar: 'حزمة إعلانات مؤسسة', en: 'B2B ad pack' }, c: { ar: 'إعلان', en: 'Ads' }, y: '2024', hue: 34 },
      { t: { ar: 'تدقيق نبرة العلامة', en: 'Brand-voice audit' }, c: { ar: 'استشارة', en: 'Consult' }, y: '2024', hue: 268 },
    ],
    cv: 'freelance',
  },
}

/** @type {Array<object>} */
export const templates = [
  {
    id: 'aether',
    slug: 'aether-portfolio',
    download: '/download/aether',
    type: 'portfolio',
    site: 'aether',
    demo: null,
    name: { ar: 'أيثر', en: 'Aether' },
    designer: { ar: 'نور فؤاد', en: 'Nour Fouad' },
    tagline: { ar: 'بورتفوليو للمصممين — نمط داكن', en: 'Portfolio for designers — dark mode' },
    desc: {
      ar: 'موقع صفحة واحدة بمعاينة أعمال كبيرة، قسم «متاح لمشروع واحد»، وسير ذاتية قابلة للعرض داخل الموقع. مبني على Astro بسرعة تصير فيها الصفحة قبل أن تقرأها.',
      en: 'A one-pager with large work thumbs, an “open for one project” strip, and a CV view inside the site. Built on Astro so it paints before you finish reading.',
    },
    cats: ['design'],
    level: 'mid',
    price: 249,
    oldPrice: 329,
    rating: 4.9,
    reviews: 236,
    sales: 1180,
    perf: 99,
    theme: 'dark',
    best: true,
    featured: true,
    isNew: false,
    addedDays: 70,
    stack: ['Astro', 'Tailwind', 'Sanity CMS', 'Vercel'],
    sections: {
      ar: [
        'ترويسة بتأثير حركي',
        '٣ أنماط لمعرض الأعمال',
        'دراسة حالة بصفحة داخلية',
        'مدوّنة مختصرة',
        'نموذج تواصل مضاد للسبام',
        'لوحة تحكم بالسيرة الذاتية',
      ],
      en: ['Animated masthead', '3 gallery layouts', 'Case-study page', 'Short journal', 'Spam-safe contact', 'CV panel'],
    },
    highlights: {
      ar: ['وضع ليلي/نهاري جاهز', 'صور WebP مع placeholder مدمج', 'بيانات SEO و Open Graph لكل عمل'],
      en: ['Night/day modes built in', 'WebP with inline placeholder', 'Per-project SEO + OG tags'],
    },
    bestFor: {
      ar: ['مصممي منتج وهوية', 'مستقلون يبحثون عن عملاء', 'معرض أعمال لدراسات حالة'],
      en: ['Product and brand designers', 'Freelancers hunting for clients', 'Case-study-heavy portfolios'],
    },
  },
  {
    id: 'atelier',
    slug: 'atelier-photography',
    download: '/download/atelier',
    type: 'portfolio',
    site: 'atelier',
    name: { ar: 'أتيلييه', en: 'Atelier' },
    designer: { ar: 'خالد عثمان', en: 'Khaled Othman' },
    tagline: { ar: 'قالب للتصوير — الصور تتحدث أولًا', en: 'Photography template — images lead' },
    desc: {
      ar: 'شبكة صور بلا هوامش مع صفحة حجز جلسة وجدول أسعار. الطباعة على الشاشة تُدار تلقائيًا بحجم الصورة، فلا يوجد أي سطر زائد يزاحم العمل.',
      en: 'A borderless image grid with a booking page and a rate card. Screen printing is handled by image sizing, so nothing competes with the work.',
    },
    cats: ['photo'],
    level: 'mid',
    price: 279,
    oldPrice: 349,
    rating: 4.8,
    reviews: 158,
    sales: 720,
    perf: 96,
    theme: 'light',
    featured: true,
    addedDays: 150,
    stack: ['Next.js', 'Tailwind', 'Sanity', 'Cal.com'],
    sections: {
      ar: ['مجموعات بصندوق ضوء', 'صفحة حجز جلسة', 'جدول باقات', 'خوارزمية تحميل كسول', 'علامة مائية للتحميل التجريبي'],
      en: ['Lightbox series', 'Session booking page', 'Package rates', 'Lazy loading', 'Watermarked previews'],
    },
    highlights: {
      ar: ['٤ مقاسات شبكة', 'روابط متجرك مباشرة', 'ألبومات خاصة برابط'],
      en: ['4 grid densities', 'Print-shop links', 'Password-protected albums'],
    },
    bestFor: {
      ar: ['مصوّرو معمار وتحرير', 'مصورو مناسبات', 'معرض أعمال مطبوعة'],
      en: ['Architecture & editorial', 'Event photographers', 'Print-selling galleries'],
    },
  },
  {
    id: 'nexus',
    slug: 'nexus-engineer',
    download: '/download/nexus',
    type: 'portfolio',
    site: 'nexus',
    name: { ar: 'نِكسَس', en: 'Nexus' },
    designer: { ar: 'سلطان راشد', en: 'Sultan Rashed' },
    tagline: { ar: 'موقع للمهندسين — أرقام قبل الصور', en: 'Site for engineers — numbers before images' },
    desc: {
      ar: 'قائمة مشاريع بأسطر مدمجة مع إحصاءات مباشرة من GitHub، وقسم «الآن» الذي يخبر أين تعمل وماذا تتعلّم. كل شيء نصّي، لذا يقرأه recruiters في ٢٠ ثانية.',
      en: 'A compact project ledger with live GitHub stats and a “Now” page saying where you work and what you are learning. All text — readable by a recruiter in 20 seconds.',
    },
    cats: ['dev'],
    level: 'senior',
    price: 219,
    oldPrice: 289,
    rating: 4.9,
    reviews: 301,
    sales: 1440,
    perf: 100,
    theme: 'dark',
    best: true,
    featured: true,
    addedDays: 34,
    isNew: true,
    stack: ['Astro', 'TypeScript', 'MDX', 'Cloudflare'],
    sections: {
      ar: ['صفحة «الآن»', 'سجل مشاريع بقابلية فرز', 'كتيبات تقنية للـ MDX', 'استيراد مساهمات GitHub', 'زر تنزيل السيرة PDF'],
      en: ['Now page', 'Sortable project ledger', 'MDX notes', 'GitHub imports', 'One-click CV download'],
    },
    highlights: {
      ar: ['بلا جافاسكربت تقريبًا', 'وضع فاتح تلقائي للطباعة', 'روابط مستودعات حية'],
      en: ['Nearly zero JS', 'Light print mode', 'Live repo links'],
    },
    bestFor: {
      ar: ['مهندسو الواجهة والخلفية', 'DevOps والمنصات', 'من يريدها سريعة وناقدة'],
      en: ['Frontend & backend', 'DevOps and platform', 'People who want it fast'],
    },
  },
  {
    id: 'folio',
    slug: 'folio-minimal',
    download: '/download/folio',
    type: 'portfolio',
    site: 'folio',
    name: { ar: 'فوليو', en: 'Folio' },
    designer: { ar: 'ريم الحمود', en: 'Reem Alhamoud' },
    tagline: { ar: 'أبسط بداية لمعرض أعمال', en: 'The simplest honest start' },
    desc: {
      ar: 'عمل واحد مميّز بالأسفل، وثلاثة أعمال مساندة، ونموذج تواصل. إن كنت مستقلًا وتريد إغلاق صفقات لا إعجابات، فهذا قالبك.',
      en: 'One spotlight project, three supporting pieces, a contact form. If you are freelancing and want closed deals rather than likes, this is your template.',
    },
    cats: ['general', 'design'],
    level: 'beginner',
    price: 149,
    oldPrice: 199,
    rating: 4.7,
    reviews: 214,
    sales: 1310,
    perf: 98,
    theme: 'light',
    addedDays: 210,
    stack: ['HTML', 'Tailwind', 'Formspree'],
    sections: {
      ar: ['ترويسة بسيطة', 'دراسة حالة واحدة', '٣ أعمال مساندة', 'أسعار الخدمات', 'تواصل عبر واتساب'],
      en: ['Quiet masthead', 'One case study', '3 supporting pieces', 'Service rates', 'WhatsApp contact'],
    },
    highlights: {
      ar: ['ملف واحد بدون بناء', 'جاهز لأي استضافة ثابتة', '٣٠ كيلوبايت أول طلب'],
      en: ['Single file, no build', 'Any static host', '30KB first request'],
    },
    bestFor: {
      ar: ['مستقلون ومشاريع جانبية', 'خريجون يبدؤون', 'أول موقع شخصي'],
      en: ['Freelancers and side projects', 'Graduates starting out', 'First personal site'],
    },
  },
  {
    id: 'reel',
    slug: 'reel-motion',
    download: '/download/reel',
    type: 'portfolio',
    site: 'reel',
    name: { ar: 'ريل', en: 'Reel' },
    designer: { ar: 'عمرو سعيد', en: 'Amro Saeed' },
    tagline: { ar: 'موشن وفديو بدون تقطيع', en: 'Motion and video, unstuttered' },
    desc: {
      ar: 'الريل يُشغّل تلقائيًا عند الظهور بدون صوت، مع ترميز متزامن للأعمال وروابط تحميل للاختبارات. مبني على Video.js مع poster ذكي.',
      en: 'The reel autoplays muted on view, with chapters per project and download links for review. Video.js with a smart poster pipeline.',
    },
    cats: ['motion', 'photo'],
    level: 'mid',
    price: 299,
    rating: 4.8,
    reviews: 96,
    sales: 410,
    perf: 92,
    theme: 'dark',
    isNew: true,
    addedDays: 12,
    stack: ['React', 'Vite', 'Video.js', 'Mux'],
    sections: {
      ar: ['ريل بملء الشاشة', 'فصول لكل عمل', 'معاينة GIF خفيفة', 'صفحة رسوم وساعات', 'روابط تسليم العملاء'],
      en: ['Full-bleed reel', 'Chapters per job', 'Light GIF previews', 'Rates page', 'Client delivery links'],
    },
    highlights: {
      ar: ['تشغيل تلقائي بدون صوت', 'Poster مولّد من الفيديو', 'مشاركة برابط محمي'],
      en: ['Muted autoplay', 'Generated video posters', 'Share-locked links'],
    },
    bestFor: { ar: ['مونتير ومخرجون', 'فرق موشن', 'محتوى اجتماعي'], en: ['Editors and directors', 'Motion teams', 'Social content'] },
  },
  {
    id: 'quill',
    slug: 'quill-writer',
    download: '/download/quill',
    type: 'portfolio',
    site: 'quill',
    name: { ar: 'كوِل', en: 'Quill' },
    designer: { ar: 'منى الشهري', en: 'Mona Al-Shehri' },
    tagline: { ar: 'موقع للكتّاب — قراءة قبل زخرفة', en: 'Site for writers — reading first' },
    desc: {
      ar: 'قائمة كتابات بخط serif مضبوط، أرشيف بسنوات، وصفحة «اقتباسات» للصحف التي نشرتك. لا صور إطلاقًا إن لم ترد.',
      en: 'A serif typeset list of published work, a year archive, and a “clips” page for outlets that ran you. No images at all if you prefer.',
    },
    cats: ['content'],
    level: 'mid',
    price: 179,
    oldPrice: 219,
    rating: 4.9,
    reviews: 132,
    sales: 640,
    perf: 99,
    theme: 'light',
    font: 'serif',
    addedDays: 120,
    stack: ['Eleventy', 'Markdown', 'Netlify'],
    sections: {
      ar: ['أرشيف بسنوات ومنافذ', 'صفحة اقتباسات', 'اشتراك بريدية', 'نسخة طباعة لكل مقال', 'RSS كامل'],
      en: ['Year + outlet archive', 'Clips page', 'Newsletter block', 'Print view per piece', 'Full RSS'],
    },
    highlights: {
      ar: ['سطر طول مقروء ٧٢ حرفًا', 'اقتباس قابل للمشاركة', 'SEO لمقال مفرد'],
      en: ['72-char measure', 'Shareable pull quotes', 'Per-article SEO'],
    },
    bestFor: {
      ar: ['صحفيون وكتّاب محتوى', 'محرّرون ومستشارون', 'ترجمة وأكاديميون'],
      en: ['Journalists and content leads', 'Editors and consultants', 'Translators and academics'],
    },
  },
  {
    id: 'vertex',
    slug: 'vertex-3d',
    download: '/download/vertex',
    type: 'portfolio',
    site: 'vertex',
    name: { ar: 'فِرتِكس', en: 'Vertex' },
    designer: { ar: 'مازن قاسم', en: 'Mazen Qasim' },
    tagline: { ar: 'ثلاثي الأبعاد دون انتظار تحميل', en: '3D that loads instantly' },
    desc: {
      ar: 'عارض نماذج ثلاثي الأبعاد بـ draco مضغوط، مع تبديل خامات ولقطات جاهزة للوكلاء الذين لا يملّون من الانتظار.',
      en: 'A Draco-compressed model viewer with material swaps and baked stills, for clients who refuse to wait.',
    },
    cats: ['motion'],
    level: 'senior',
    price: 349,
    oldPrice: 429,
    rating: 4.7,
    reviews: 74,
    sales: 290,
    perf: 88,
    theme: 'dark',
    featured: true,
    addedDays: 55,
    stack: ['React', 'Three.js', 'R3F', 'Draco'],
    sections: {
      ar: ['عارض نموذج تفاعلي', 'لقطات ثابتة بديلًا', 'صفحة خط أنابيب', 'جدول سعات الإنتاج', 'طلب عرض سعر سريع'],
      en: ['Interactive viewer', 'Baked stills fallback', 'Pipeline page', 'Capacity sheet', 'Quick brief form'],
    },
    highlights: {
      ar: ['تحميل تدريجي للنموذج', 'بديل بدون WebGL', 'تعريض بالنقر للمنتج'],
      en: ['Progressive model load', 'No-WebGL fallback', 'Click-to-zoom product'],
    },
    bestFor: { ar: ['فنانون ثلاثيو الأبعاد', 'مصيمو منتجات', 'مكاتب العمارة'], en: ['3D artists', 'Product designers', 'Architecture offices'] },
  },
  {
    id: 'studio',
    slug: 'studio-team',
    download: '/download/studio',
    type: 'portfolio',
    site: 'studio',
    name: { ar: 'ستوديو', en: 'Studio' },
    designer: { ar: 'نور فؤاد', en: 'Nour Fouad' },
    tagline: { ar: 'موقع لاستوديوهات من ٢ إلى ٦ أشخاص', en: 'Site for studios of 2–6' },
    desc: {
      ar: 'موقع استوديو: الأعمال، الفريق، العمليات، والسعات. فيه صفحة «كيف نعمل» التي تختصر مكالمات البيع.',
      en: 'A studio site: work, people, process, capacity. Includes the “how we work” page that shortens sales calls.',
    },
    cats: ['design', 'corporate'],
    level: 'exec',
    price: 399,
    rating: 4.8,
    reviews: 61,
    sales: 220,
    perf: 95,
    theme: 'light',
    best: true,
    addedDays: 180,
    stack: ['Astro', 'Tailwind', 'Sanity', 'Resend'],
    sections: {
      ar: ['٦ أنماط شبكة أعمال', 'صفحة الفريق بالسير', 'العمليات والأسعار', 'صفحة وظائف شاغرة', 'نموذج طلب عرض'],
      en: ['6 grid layouts', 'Team with bios', 'Process and rates', 'Careers slot', 'Brief intake form'],
    },
    highlights: {
      ar: ['تعدد اللغات تلقائي', 'لوحة نشر للأعمال', 'فواتير وشروط مرفقة'],
      en: ['Built-in i18n', 'Work publishing flow', 'Terms and invoicing page'],
    },
    bestFor: { ar: ['استوديوهات تصميم', 'فرق صغيرة', 'وكالات مستقلة'], en: ['Design studios', 'Small teams', 'Boutique agencies'] },
  },
  {
    id: 'mirrorbundle',
    slug: 'mirror-pro-bundle',
    download: '/download/mirrorbundle',
    type: 'bundle',
    site: 'mirrorbundle',
    demo: 'mirror',
    name: { ar: 'مِرآة برو', en: 'Mirror Pro' },
    designer: { ar: 'فريق قالب', en: 'Qalb Studio' },
    tagline: { ar: 'موقع + سيرة بهوية واحدة', en: 'Site + CV, one identity' },
    desc: {
      ar: 'الحزمة الأشمل للمبدعين: موقع بورتفوليو كامل، سيرة PDF/Word بنفس الخطوط والألوان، خطاب تقديمي، وصفحة «متاح للعمل» بحالة مباشرة.',
      en: 'The full creative kit: a complete portfolio site, a CV in PDF/Word on the same type and colour, a cover letter, and a live “available for work” page.',
    },
    cats: ['design', 'content'],
    level: 'mid',
    price: 449,
    oldPrice: 619,
    rating: 5,
    reviews: 188,
    sales: 960,
    perf: 98,
    ats: 100,
    theme: 'dark',
    best: true,
    featured: true,
    addedDays: 90,
    stack: ['Astro', 'Tailwind', 'Word', 'Google Docs', 'Figma'],
    sections: {
      ar: ['موقع من ٥ صفحات', 'سيرة A4 بنسختين', 'خطاب تقديمي', 'بطاقة عمل رقمية', '٣ لوحات ألوان'],
      en: ['5-page site', 'Two A4 CV variants', 'Cover letter', 'Digital business card', '3 colour boards'],
    },
    highlights: {
      ar: ['نفس التصميم في الموقع والسيرة', 'تبديل الألوان ينعكس على الملفين', 'إرشادات مكتوبة داخل الملفات'],
      en: ['Same design in site and CV', 'Colour switch applies to both', 'Written guidance inside files'],
    },
    bestFor: {
      ar: ['مصممون ومستقلون', 'من يغيّر مهنته', 'تقديم لوكالات عالمية'],
      en: ['Designers and freelancers', 'Career switchers', 'Global agency applications'],
    },
  },
  {
    id: 'devbundle',
    slug: 'devpack-bundle',
    download: '/download/devbundle',
    type: 'bundle',
    site: 'devbundle',
    demo: 'atlas',
    name: { ar: 'دِب باك', en: 'DevPack' },
    designer: { ar: 'فريق قالب', en: 'Qalb Studio' },
    tagline: { ar: 'حزمة المهندسين — موقع + سيرة ATS', en: 'Engineers’ bundle — site + ATS CV' },
    desc: {
      ar: 'موقع هندسي بنمط طرفية مع سيرة نصية تتجاوز الفرز الآلي، وملف JSON/Scholarly للموقع، وصفحة الآن للوظائف عن بُعد.',
      en: 'A terminal-style engineer site with a plain-text CV that clears parsing, JSON-LD on the site, and a Now page for remote roles.',
    },
    cats: ['dev', 'corporate'],
    level: 'senior',
    price: 379,
    oldPrice: 479,
    rating: 4.9,
    reviews: 164,
    sales: 830,
    perf: 100,
    ats: 100,
    theme: 'dark',
    featured: true,
    addedDays: 45,
    stack: ['Astro', 'TypeScript', 'Markdown CV', 'JSON-LD'],
    sections: {
      ar: ['سجل مشاريع', 'صفحة الآن', 'سيرة بنمط طرفية', 'مولّد PDF من Markdown', 'مختبر ATS مرفق'],
      en: ['Project ledger', 'Now page', 'Plain-text CV', 'PDF from Markdown', 'Included ATS test'],
    },
    highlights: {
      ar: ['بناء بـ GitHub Actions', 'سيرة ونسخة موقع من نفس الملف', 'دراسة ATS موثّقة'],
      en: ['GitHub Actions build', 'CV and site from one file', 'Documented ATS test'],
    },
    bestFor: {
      ar: ['مهندسو برمجيات وبيانات', 'قيادات تقنية', 'تقديم خارجي وشركات عالمية'],
      en: ['Software and data eng', 'Tech leads', 'Overseas applications'],
    },
  },
  {
    id: 'gradbundle',
    slug: 'firststep-bundle',
    download: '/download/gradbundle',
    type: 'bundle',
    site: 'gradbundle',
    demo: 'echo',
    name: { ar: 'فِست ستيب', en: 'First Step' },
    designer: { ar: 'فريق قالب', en: 'Qalb Studio' },
    tagline: { ar: 'حزمة الخريج — موقع وسيرة معًا', en: 'Graduate bundle — site + CV together' },
    desc: {
      ar: 'أرخص نقطة دخول: صفحة مشاريع تخرجك وبحثك، مع سيرة من صفحة واحدة صُممت لمن لا يملك سجلًا طويلًا بعد.',
      en: 'The cheapest way in: a page for your capstone and research, plus a one-page CV designed for short records.',
    },
    cats: ['graduate', 'general'],
    level: 'beginner',
    price: 199,
    oldPrice: 259,
    rating: 4.8,
    reviews: 277,
    sales: 1620,
    perf: 99,
    ats: 100,
    theme: 'light',
    best: true,
    addedDays: 60,
    stack: ['HTML', 'Tailwind', 'Docs CV'],
    sections: {
      ar: ['مشاريع ومقررات', 'أنشطة وتطوّع', 'سيرة صفحة واحدة', 'قوالب رسائل تقديم', 'إرشادات داخل الملف'],
      en: ['Projects and coursework', 'Volunteering', 'One-page CV', 'Outreach note templates', 'Inline guidance'],
    },
    highlights: {
      ar: ['يُملأ في ساعة', 'أمثلة مكتوبة لحالتك', 'قابل للنمو مع أول وظيفة'],
      en: ['Fillable in an hour', 'Written examples for you', 'Grows with your first job'],
    },
    bestFor: { ar: ['خريجون وطلبة', 'تدرب تعاوني', 'منح ودرجات عليا'], en: ['Students and grads', 'Internships', 'Scholarship applications'] },
  },
  {
    id: 'nova',
    slug: 'nova-cv',
    download: '/download/nova',
    type: 'cv',
    site: null,
    demo: 'nova',
    name: { ar: 'نوفا', en: 'Nova' },
    designer: { ar: 'نور فؤاد', en: 'Nour Fouad' },
    tagline: { ar: 'سيرة ATS بعمود واحد', en: 'Single-column ATS CV' },
    desc: {
      ar: 'عمود واحد، تسلسل قراءة مثالي لأنظمة الفرز، وشبكة طباعية تمنح كل سطر وزنًا. الخيار الآمن للوظائف الإدارية والتقنية.',
      en: 'One column, a parse-friendly reading order, and a type grid that gives every line weight. The safe pick for corporate and tech roles.',
    },
    cats: ['corporate', 'graduate'],
    level: 'mid',
    price: 89,
    oldPrice: 129,
    rating: 4.9,
    reviews: 412,
    sales: 2140,
    ats: 100,
    layout: 'single',
    accent: 'azure',
    font: 'sans',
    pages: 2,
    best: true,
    featured: true,
    addedDays: 240,
    stack: ['Word', 'PDF', 'Google Docs'],
    sections: {
      ar: ['ملخص مهني', 'خبرة بنقاط قابلة للقياس', 'مهارات مصنّفة', 'تعليم وشهادات'],
      en: ['Summary', 'Metric-led experience', 'Grouped skills', 'Education and certs'],
    },
    highlights: {
      ar: ['نسختان: مصممة + نص خام', 'إرشادات داخلية بلون رمادي', 'ضبط الأرقام العربية والإنجليزية'],
      en: ['Designed + plain-text files', 'Inline grey guidance', 'Arabic/Latin numerals handled'],
    },
    bestFor: { ar: ['إدارة منتج وتشغيل', 'خبرة ٢–٥ سنوات', 'شركات كبرى'], en: ['Product and ops roles', '2–5 years exp', 'Large employers'] },
  },
  {
    id: 'atlas',
    slug: 'atlas-cv',
    download: '/download/atlas',
    type: 'cv',
    site: null,
    demo: 'atlas',
    name: { ar: 'أطلس', en: 'Atlas' },
    designer: { ar: 'سلطان راشد', en: 'Sultan Rashed' },
    tagline: { ar: 'سيرة المهندسين والتقنيين', en: 'The engineer’s CV' },
    desc: {
      ar: 'شريط جانبي يحمل المكدّس التقني والروابط، والمساحة الرئيسية للأرقام. يُبرز الأثر لا المهام.',
      en: 'A side rail for the stack and repo links, main column reserved for impact. It shows outcomes, not duties.',
    },
    cats: ['dev', 'corporate'],
    level: 'senior',
    price: 99,
    oldPrice: 139,
    rating: 4.8,
    reviews: 287,
    sales: 1580,
    ats: 92,
    layout: 'side',
    accent: 'ink',
    font: 'sans',
    pages: 2,
    featured: false,
    addedDays: 120,
    stack: ['Word', 'PDF', 'Google Docs'],
    sections: {
      ar: ['مكدّس مصنّف', 'مشاريع بروابط', 'خبرة بمقاييس', 'شهادات'],
      en: ['Grouped stack', 'Projects with links', 'Metric experience', 'Certifications'],
    },
    highlights: { ar: ['كتلة GitHub ومختبرات', 'رقم أداء لكل دور', 'نسخة نص خام'], en: ['GitHub block', 'A metric per role', 'Plain-text export'] },
    bestFor: { ar: ['برمجيات و DevOps', 'بيانات وذكاء آلة', 'خبرة ٥+ سنوات'], en: ['Software, DevOps', 'Data and ML', '5+ years exp'] },
  },
  {
    id: 'apexcv',
    slug: 'apex-cv',
    download: '/download/apexcv',
    type: 'cv',
    site: null,
    demo: 'apex',
    name: { ar: 'أبيكس', en: 'Apex' },
    designer: { ar: 'منى الشهري', en: 'Mona Al-Shehri' },
    tagline: { ar: 'سيرة تنفيذية بخط serif', en: 'Executive CV in serif' },
    desc: {
      ar: 'ملخص تنفيذي ثم إنجازات بمقاييس مالية، بخط سيريف هادئ يعطي الصفحة وزنًا إداريًا.',
      en: 'An executive summary then board-scale results, in a quiet serif that gives the page weight.',
    },
    cats: ['corporate'],
    level: 'exec',
    price: 129,
    oldPrice: 169,
    rating: 5,
    reviews: 142,
    sales: 620,
    ats: 100,
    layout: 'serif',
    accent: 'rust',
    font: 'serif',
    pages: 3,
    addedDays: 300,
    stack: ['Word', 'PDF', 'InDesign'],
    sections: {
      ar: ['ملخص تنفيذي', 'مجلس وإنجازات', 'مقاييس مالية', 'مجالس سابقة'],
      en: ['Exec summary', 'Board and mandates', 'Financial scale', 'Prior mandates'],
    },
    highlights: { ar: ['خطاب تقديمي تنفيذي', 'جدول مقاييس', 'نسخة للمحاميد'], en: ['Executive cover letter', 'Metrics table', 'Headhunter variant'] },
    bestFor: { ar: ['مدراء عموم', 'C-level', 'تغيير مستوى'], en: ['General managers', 'C-suite', 'Leveling up'] },
  },
  {
    id: 'echocv',
    slug: 'echo-cv',
    download: '/download/echocv',
    type: 'cv',
    site: null,
    demo: 'echo',
    name: { ar: 'إيكو', en: 'Echo' },
    designer: { ar: 'نور فؤاد', en: 'Nour Fouad' },
    tagline: { ar: 'سيرة لخريج بلا خبرة طويلة', en: 'A CV for graduates with no long record' },
    desc: {
      ar: 'يقدّم المشروع والتدرب على سنوات العمل، مع مربعات معلّمة توجّهك ماذا تكتب.',
      en: 'Puts the capstone and internship ahead of work history, with marked prompts on what to write.',
    },
    cats: ['graduate'],
    level: 'beginner',
    price: 59,
    oldPrice: 89,
    rating: 4.8,
    reviews: 331,
    sales: 1970,
    ats: 100,
    layout: 'single',
    accent: 'teal',
    font: 'sans',
    pages: 1,
    best: true,
    addedDays: 90,
    stack: ['Word', 'Google Docs', 'PDF'],
    sections: { ar: ['مشاريع ومقررات', 'أنشطة', 'مهارات', 'دورات'], en: ['Projects, coursework', 'Activities', 'Skills', 'Courses'] },
    highlights: {
      ar: ['أمثلة جاهزة لكل قسم', 'رسالة تغطية قصيرة', 'صفحة واحدة صارمة'],
      en: ['Ready examples per part', 'Short cover note', 'Strict one page'],
    },
    bestFor: { ar: ['خريجون جدد', 'تدرب تعاوني', 'منح دراسية'], en: ['New graduates', 'Internships', 'Scholarships'] },
  },

  /* ————— v1.5.0 · خطة النمو: منتجاتٌ جديدة — حزمة LinkedIn، قوالب خطابات،
     حزمة المستقلين، وسيرتا التخصصات (الطبي والقانوني) ————— */
  {
    id: 'linkedinkit',
    slug: 'linkedin-kit',
    download: '/download/linkedinkit',
    type: 'cv',
    site: null,
    demo: 'nova',
    name: { ar: 'حزمة LinkedIn', en: 'LinkedIn Kit' },
    designer: { ar: 'فريق قالب', en: 'Qalb Studio' },
    tagline: { ar: 'ملفك المهني يقرؤه المستشغل قبل سيرتك', en: 'The profile a recruiter reads before your CV' },
    desc: {
      ar: 'ليس كل التوظيف يبدأ بسيرة: المستشغل يفتح ملفك أولًا. الحزمة: صيغ عنوان مهني لستة مسارات، نص «نبذة» من ثلاث فقرات، إطار صورة وبانر بألوانك، ونصوص تواصل مع المستشغلين ومدراء التوظيف.',
      en: 'Not every hire starts with a CV: the recruiter opens your profile first. The kit: headline formulas for six tracks, a three-paragraph About, a photo frame and banner in your colours, and outreach scripts for recruiters and hiring managers.',
    },
    cats: ['corporate', 'graduate'],
    level: 'mid',
    price: 119,
    oldPrice: 159,
    rating: 4.8,
    reviews: 96,
    sales: 410,
    pages: 1,
    layout: 'single',
    accent: 'azure',
    font: 'sans',
    best: true,
    addedDays: 12,
    stack: ['Word', 'PDF', 'قابل للنسخ'],
    sections: {
      ar: ['٦ صيغ عنوان مهني', 'نبذة من ثلاث فقرات', 'إطار صورة وبانر', 'نصوص تواصل ورسائل'],
      en: ['Six headline formulas', 'A three-paragraph About', 'Photo frame + banner', 'Outreach message scripts'],
    },
    highlights: {
      ar: ['مناسب لملف عربي أو إنجليزي', 'أمثلة مكتوبة لكل مسار', 'يُستكمل في جلسة واحدة'],
      en: ['Fits an Arabic or English profile', 'Written examples per track', 'Done in one sitting'],
    },
    bestFor: { ar: ['باحثون عن عمل', 'تغيير مسار مهني', 'خريجون جدد'], en: ['Job seekers', 'Career switchers', 'Fresh graduates'] },
  },
  {
    id: 'letterpack',
    slug: 'cover-letter-pack',
    download: '/download/letterpack',
    type: 'cv',
    site: null,
    demo: 'echo',
    name: { ar: 'قوالب خطاب التقديم', en: 'Cover Letter Pack' },
    designer: { ar: 'نور فؤاد', en: 'Nour Fouad' },
    tagline: { ar: 'اثنا عشر خطابًا لمواقف التقديم كلها', en: 'Twelve letters for every application moment' },
    desc: {
      ar: 'خطاب التقديم لا يُكتب من الصفر كل مرة: اثنا عشر قالبًا — وظيفة معلنة، تواصل بارد، تغيير مسار، عودة بعد انقطاع، ترشيح داخلي — كلٌّ بمثالٍ مكتوب وإرشادات ما تُذكَر وما يُترك. بنفس خطوط وألوان قوالب سيرتنا فتصل بهويةٍ واحدة.',
      en: 'A cover letter is not written from scratch each time: twelve templates — a posted role, a cold intro, a career switch, a return after a break, an internal move — each with a worked example and what to leave out. On the same type and colours as our CVs, so one identity arrives.',
    },
    cats: ['graduate', 'general'],
    level: 'beginner',
    price: 49,
    oldPrice: 79,
    rating: 4.9,
    reviews: 128,
    sales: 560,
    pages: 1,
    layout: 'single',
    accent: 'teal',
    font: 'sans',
    addedDays: 10,
    stack: ['Word', 'Google Docs', 'PDF'],
    sections: {
      ar: ['١٢ قالب خطاب', 'مثال مكتوب لكل موقف', 'جُمل افتتاح جاهزة', 'إرشادات طول ونبرة'],
      en: ['12 letter templates', 'A worked example each', 'Ready opening lines', 'Length and tone guidance'],
    },
    highlights: {
      ar: ['تُكمل في عشرين دقيقة', 'بنفس هوية قوالب السيرة', 'نسخة عربية وإنجليزية لكل قالب'],
      en: ['Done in twenty minutes', 'Same identity as the CVs', 'Arabic and English version each'],
    },
    bestFor: {
      ar: ['تقديم على وظائف معلنة', 'تواصل مع شركات', 'طلبة التدريب التعاوني'],
      en: ['Posted-role applications', 'Cold outreach', 'Co-op students'],
    },
  },
  {
    id: 'freelancerkit',
    slug: 'freelancer-kit',
    download: '/download/freelancerkit',
    type: 'bundle',
    site: 'freelancerkit',
    demo: 'freelance',
    name: { ar: 'حزمة المستقلين', en: 'Freelancer Kit' },
    designer: { ar: 'فريق قالب', en: 'Qalb Studio' },
    tagline: { ar: 'موقع وسيرة وعقود وأسعار — دكانٌ كامل', en: 'Site, CV, contracts, rates — a whole shop' },
    desc: {
      ar: 'للمستقل حاجةٌ غير الخريج: صفحة خدمات بأسعار معلنة، سيرة تُقفل الصفقة، ونماذج عرض سعر وعقد وفاتورة تُرسل فورًا. الحزمة تجمعها كلها بهويةٍ واحدة، مع صفحة «متاح للعمل» تُحدَّث بحالةٍ واحدة.',
      en: 'A freelancer needs more than a graduate: a services page with public rates, a CV that closes the deal, and quote, contract and invoice forms ready to send. The kit bundles all of it in one identity, with an “available for work” page toggled in one line.',
    },
    cats: ['design', 'content'],
    level: 'mid',
    price: 279,
    oldPrice: 359,
    rating: 4.9,
    reviews: 87,
    sales: 340,
    perf: 99,
    ats: 100,
    theme: 'light',
    featured: true,
    addedDays: 8,
    stack: ['Astro', 'Tailwind', 'Word', 'Google Docs'],
    sections: {
      ar: ['موقع بخدمات وأسعار معلنة', 'سيرة ATS على هوية الموقع', 'نماذج عرض سعر وعقد وفاتورة', 'صفحة «متاح للعمل»'],
      en: [
        'A site with services and public rates',
        'An ATS CV on the site’s identity',
        'Quote, contract and invoice forms',
        'An “available for work” page',
      ],
    },
    highlights: {
      ar: ['عقود مراجعة بصياغة سعودية', 'الأسعار تُحدَّث من ملف واحد', 'سكربت فحص ATS مرفق'],
      en: ['Contracts reviewed for Saudi wording', 'Rates edited from one file', 'The ATS check script included'],
    },
    bestFor: { ar: ['مستقلون ومستقلات', 'وكالات صغيرة', 'أصحاب أعمال جانبية'], en: ['Freelancers', 'Micro agencies', 'Side-business owners'] },
  },
  {
    id: 'medcv',
    slug: 'med-cv',
    download: '/download/medcv',
    type: 'cv',
    site: null,
    demo: 'med',
    name: { ar: 'سيرة التخصص الطبي', en: 'The Medical CV' },
    designer: { ar: 'منى الشهري', en: 'Mona Al-Shehri' },
    tagline: { ar: 'من الامتياز إلى الإقامة بلغة اللجان', en: 'From internship to residency, in boards’ language' },
    desc: {
      ar: 'سيرات الأطباء تقرؤها لجانٌ لا أنظمة فرز فقط: الدورات السريرية بأسمائها وتقييماتها، البحث والتسجيلات، والتراخيص. القالب يرتبها بالترتيب الذي تسأل عنه لجنة الإقامة، ويبقى نصًّا يقرؤه الفرز الآلي.',
      en: 'Doctors’ CVs are read by boards, not only parsers: clinical rotations with names and evaluations, research and registrations, licences. The template orders them the way a residency committee asks, while staying machine-readable text.',
    },
    cats: ['corporate', 'graduate'],
    level: 'beginner',
    price: 119,
    oldPrice: 159,
    rating: 4.9,
    reviews: 74,
    sales: 260,
    ats: 100,
    layout: 'side',
    accent: 'pine',
    font: 'humanist',
    pages: 2,
    addedDays: 6,
    stack: ['Word', 'PDF', 'Google Docs'],
    sections: {
      ar: ['الدورات السريرية بتقييماتها', 'البحث والملخصات المقبولة', 'التراخيص والشهادات (BLS/ACLS)', 'مقررات وساعات معتمدة'],
      en: ['Rotations with evaluations', 'Research and accepted abstracts', 'Licences and certs (BLS/ACLS)', 'CME hours and courses'],
    },
    highlights: {
      ar: ['ترتيبٌ تسأل عنه لجان الإقامة', 'مصطلحات إنجليزية طبية مثبتة', 'نسخة نص خام للفرز'],
      en: ['The order residency boards ask for', 'Medical English terms kept exact', 'A plain-text copy for parsing'],
    },
    bestFor: {
      ar: ['طلبة الامتياز', 'التقديم على الإقامة', 'أطباء خارجون لتوّهم'],
      en: ['Internship students', 'Residency applicants', 'Newly licensed physicians'],
    },
  },
  {
    id: 'legalcv',
    slug: 'legal-cv',
    download: '/download/legalcv',
    type: 'cv',
    site: null,
    demo: 'legal',
    name: { ar: 'سيرة القانونيين', en: 'The Legal CV' },
    designer: { ar: 'سلطان راشد', en: 'Sultan Rashed' },
    tagline: { ar: 'قضايا ومذكرات بأرقامها، لا صفاتٍ عامة', en: 'Cases and briefs in numbers, not adjectives' },
    desc: {
      ar: 'سيرة المحامي تُقاس بما حُسم: عدد المذكرات المقبولة، قيم التحكيمات، ونوع النزاعات. القالب يعطي كل قضية سطرًا بنتيجتها، ويفصل «التقاضي» عن «التحكيم» عن «الصياغة» — والفرز الآلي يقرؤها كلها.',
      en: 'A lawyer’s CV is measured by outcomes: briefs accepted, arbitration values, dispute types. The template gives each matter a line with its result, and splits litigation from arbitration from drafting — all machine-readable.',
    },
    cats: ['corporate'],
    level: 'senior',
    price: 109,
    oldPrice: 149,
    rating: 4.8,
    reviews: 58,
    sales: 190,
    ats: 100,
    layout: 'band',
    accent: 'ink',
    font: 'serif',
    pages: 2,
    addedDays: 6,
    stack: ['Word', 'PDF', 'InDesign'],
    sections: {
      ar: ['قضايا بنتائجها لا بأسمائها', 'تحكيم تجاري بقيمه', 'صياغة عقود ومراجعتها', 'التراخيص والعضويات'],
      en: ['Matters with outcomes, not names', 'Commercial arbitration by value', 'Contract drafting and review', 'Licences and memberships'],
    },
    highlights: {
      ar: ['سرية القضايا محفوظة بنمط «النوع والنتيجة»', 'خط سيريف يعطي الصفحة وزنًا', 'نسخة نص خام للفرز'],
      en: ['Confidentiality kept by type-and-result pattern', 'A serif that carries weight', 'A plain-text copy for parsing'],
    },
    bestFor: {
      ar: ['محامون ومستشارون قانونيون', 'مراجعو عقود', 'خريجو الحقوق الجدد'],
      en: ['Lawyers and counsel', 'Contract reviewers', 'Fresh law graduates'],
    },
  },
]

export const bySlug = (slug) => templates.find((t) => t.slug === slug)
export const byId = (id) => templates.find((t) => t.id === id)
export const demoFor = (t) => (t?.demo ? cvDemo[t.demo] : null)
export const siteFor = (t) => (t?.site ? siteDemo[t.site] : null)
export const accentHex = (id) => (PALETTE.find((c) => c.id === id) || PALETTE[0]).hex
export const fontCss = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).css

export const testimonials = [
  {
    id: 1,
    name: { ar: 'أسماء الغامدي', en: 'Asma Al-Ghamdi' },
    role: { ar: 'مديرة توظيف — شركة تقنية', en: 'Talent Lead — Tech Co.' },
    text: {
      ar: 'أفتح مئات الملفات أسبوعيًا. من استخدم «دِب باك» صار موقعه وسيرته بنفس الهوية — والحكم الأول كان للموقع.',
      en: 'I open hundreds of files a week. DevPack users show a site and a CV in one identity — the site is what gets the first yes.',
    },
    stars: 5,
  },
  {
    id: 2,
    name: { ar: 'عمر باوزير', en: 'Omar Bawazeer' },
    role: { ar: 'مصمم منتج مستقل — جدة', en: 'Freelance Product Designer — Jeddah' },
    text: {
      ar: 'نشرت «أيثر» بعد عطلة نهاية أسبوع. ثلاثة استفسارات عمل في الأسبوع الأول، وسعر المشروع غطّى التكلفة ٢٠٠ مرة.',
      en: 'Shipped Aether over a weekend. Three inbound leads in week one — the first project paid for it 200 times.',
    },
    stars: 5,
  },
  {
    id: 3,
    name: { ar: 'هيا العنزي', en: 'Haya Al-Anazi' },
    role: { ar: 'خريجة تصميم — الرياض', en: 'Design Graduate — Riyadh' },
    text: {
      ar: '«فِست ستيب» جعل عندي موقع وسيرة في ليلة واحدة. الإرشادات كانت داخل الملفات، فما سألت أحدًا.',
      en: 'First Step gave me a site and a CV in one night. The guidance was inside the files, so I never had to ask.',
    },
    stars: 5,
  },
  {
    id: 4,
    name: { ar: 'بدر القحطاني', en: 'Bader Al-Qahtani' },
    role: { ar: 'مدير مشروع — نيوم', en: 'Programme Manager — NEOM' },
    text: {
      ar: 'طلبت نسخة «نُكسَس» لثلاثة من فريقي. أسرع موقع رأيت أحدًا ينشره: ١٨ دقيقة من git clone إلى رابط حي.',
      en: 'I set up Nexus for three of my team. Fastest site launch I have seen: 18 minutes from clone to live URL.',
    },
    stars: 5,
  },
  {
    id: 5,
    name: { ar: 'لمار سيد', en: 'Lamar Sayed' },
    role: { ar: 'مصمّمة هوية — دبي', en: 'Brand Designer — Dubai' },
    text: {
      ar: 'بدّلت اللون إلى عنابي وتعديلات الخط، فصارت النسخة مطابقة لهويتي. لوحة التحكم بالأعمال سهّلت النشر شهريًا.',
      en: 'Switched to a maroon accent and my type, and it matched my brand exactly. The work panel makes monthly publishing easy.',
    },
    stars: 4,
  },
  {
    id: 6,
    name: { ar: 'فيصل أنور', en: 'Faisal Anwar' },
    role: { ar: 'مصوّر معماري — الدمام', en: 'Architectural Photographer — Dammam' },
    text: {
      ar: 'صفحة الحجز في «أتيلييه» وفّرت عليّ ٦ مكالمات أسبوعيًا. الصور تُحمّل بسرعة حتى على 4G.',
      en: 'Atelier’s booking page removed six calls a week. Images still load fast on 4G.',
    },
    stars: 5,
  },
]

export const brands = ['مستقل', 'حسوب', 'منصة', 'أُفق', 'نمو', 'نيوم', 'طيران الرياض', 'مرسول', 'سِمة', 'دار نشر']
export const brandsEn = ['Estqlaal', 'Hasoub', 'Mansa', 'Ufuq', 'Numu', 'NEOM', 'Riyadh Air', 'Mrsool', 'Sima', 'Dar Press']

/**
 * جدول الكوبونات — المصدر الوحيد الذي يقرؤه المتجر (السلة) والخادم (إعادة الختم).
 *
 * كلُّ رمزٍ يحمل تاريخَ انتهاءٍ (`endsAt`) ونطاقًا (`appliesTo`) ونصًّا يشرح ما
 * يشمله (`note`) — لأن خصمًا بلا تاريخٍ ولا نطاقٍ يُقرأ عرضًا دائمًا، وهو أولُ
 * ما يُفقد العرض مصداقيّته. `endsAt: null` يعني رمزًا بلا أجل (رمز مدرّبٍ يُسوَّى
 * يدويًا)، وأيُّ رمزٍ منتهٍ يُرفض في السلة وفي الخادم معًا من هذا الجدول لا من
 * نسخةٍ مكتوبةٍ في مكان ثانٍ.
 */
export const coupons = {
  SALE25: {
    pct: 25,
    ar: 'عرض الموسم',
    en: 'Season sale',
    endsAt: '2026-09-30',
    appliesTo: 'all', // كل المنتجات: القوالب والحزم والإضافات
    note: {
      ar: 'خصم ٢٥٪ على كل منتجات المتجر — القوالب، وحزم الموقع + السيرة، والإضافات — حتى ٣٠ سبتمبر ٢٠٢٦، ويُطبَّق في سلة الشراء قبل الدفع.',
      en: '25% off every product in the store — templates, site + CV bundles and add-ons — until 30 September 2026, applied in the cart before payment.',
    },
  },
  WELCOME10: { pct: 10, ar: 'ترحيبي', en: 'Welcome', endsAt: null, appliesTo: 'all' },
  QALB30: { pct: 30, ar: 'خصم الطلبة', en: 'Student offer', endsAt: null, appliesTo: 'all' },
  // v1.5.0 · خطة النمو: خصمٌ مباشر للأصدقاء، ورمزان تُنسَب لهما العمولة.
  // الرمزُ يُختم على الطلب في دفتر الطلبات (حقل coupon)، فتُحسَب أثريةُ المدرِّب
  // من الدفتر نفسه وتُسوّى يدويًا — لا عمولةٌ تُحوَّل آليًا من هذا المتجر.
  FRIEND20: { pct: 20, ar: 'خصم الأصدقاء', en: 'Friends discount', endsAt: null, appliesTo: 'all' },
  COACH20: { pct: 20, ar: 'رمز مدرّب — ٢٠٪', en: 'Coach code — 20%', endsAt: null, appliesTo: 'all' },
  COACH30: { pct: 30, ar: 'رمز مدرّب — ٣٠٪', en: 'Coach code — 30%', endsAt: null, appliesTo: 'all' },
}

/** يومٌ بلا ساعات: يُقارَن كنصٍّ (YYYY-MM-DD) فلا يُقدَّم يومٌ بسبب فارق توقيت. */
export const today = () => new Date().toISOString().slice(0, 10)

/** هل انتهى الرمز؟ `endsAt: null` = بلا أجل. */
export const couponExpired = (code, at = today()) => {
  const c = coupons[String(code || '').trim().toUpperCase()]
  return !!(c && c.endsAt && String(at) > c.endsAt)
}

/**
 * بطاقةُ الرمز كما تعرضها الواجهة: النسبة، والأجل، وما يشمله — بلا أرقامٍ
 * مكتوبةٍ في صفحةٍ ثانية. `expired` يُحسَب من اليوم، و`daysLeft` صفرٌ إن انتهى.
 */
export const couponInfo = (code, at = today()) => {
  const key = String(code || '').trim().toUpperCase()
  const c = coupons[key]
  if (!c) return null
  const expired = !!(c.endsAt && String(at) > c.endsAt)
  const daysLeft = c.endsAt ? Math.max(0, Math.round((new Date(`${c.endsAt}T23:59:59Z`) - new Date(`${at}T00:00:00Z`)) / 86400000)) : null
  return {
    code: key,
    pct: c.pct,
    ar: c.ar,
    en: c.en,
    endsAt: c.endsAt || null,
    appliesTo: c.appliesTo || 'all',
    note: c.note || null,
    expired,
    daysLeft,
  }
}

/*
 * شارة «تمرّ بفاحص ATS» التي نطبعها على البطاقة لها حدٌّ واحد في المتجر كله:
 * 97 فما فوق. قبل هذه الجولة كان الحدُّ مكتوبًا مرّتين في صفحة /ats — رقمٌ
 * يتغيّر بصمتٍ فيصير «المُوصى به» شيئًا آخر. التعريف هنا، والفرز بسعرٍ صاعد
 * لأن من جاء بالفاحص يريد أولًا أرخصَ ما يصلحه.
 */
export const ATS_STORE_MIN = 97
export const atsReadyTemplates = () => templates.filter((x) => (x.ats ?? 0) >= ATS_STORE_MIN).sort((a, b) => a.price - b.price)
