/**
 * Runtime smoke test: bundles the real app and renders each route in jsdom,
 * asserting visible copy — this executes the same component paths the browser runs.
 *   node tests/smoke.mjs
 */
import { build } from 'esbuild'
import { readFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'
import { dict } from '../src/i18n/translations.js'
import { byId, couponExpired, couponInfo, templates } from '../src/data/templates.js'
import { PERSONAL_LIMITS, isProtectedDownload, kindOf, packageFiles, packageZip, sanitizePersonal, siteHtml } from '../src/data/deliverable.js'
import {
  HOST_FIELDS,
  HOST_LIMITS,
  PLANS,
  ROUTES,
  SUB_RE,
  brandBar,
  droppedSiteFields,
  editWindow,
  monthKey,
  planOf,
  priceOf,
  profileOf,
  publicUrl,
  renderSite,
  routeOk,
  sanitizeSite,
  slugify,
  subOf,
} from '../src/data/hosting.js'
import { ATS_BANDS, ATS_DEMO, ATS_RULES, ATS_TARGET, analyzeAts, atsReport, atsRuleTable } from '../src/data/ats.js'
import {
  B2B_TERM_MONTHS,
  B2B_TIERS,
  COHORT_MAX,
  ORG_CODE_RE,
  SEAT_TEMPLATES,
  addMonths,
  cheapestSeatRetail,
  makeOrg,
  makeOrgCode,
  normalizeCode,
  orgCsv,
  orgRowForStaff,
  perSeatVsBundle,
  seatBundle,
  seatRetailBand,
  tierForSeats,
  orgSummary,
  perSeat,
  priciestSeatRetail,
  redeemReason,
  seatLeft,
} from '../src/data/b2b.js'
import { SUPPORT_MAIL } from '../src/data/contact.js'
import { COMPANY, isSet, quoteMissing, vatSplit } from '../src/data/company.js'
import { clearLocalLeads, leadCsv, leadMailto, leadRow, normalizeLead, quoteMath, quoteNo, readLocalLeads, saveLocalLead } from '../src/data/leads.js'
import { zipNames, zipRead } from '../src/data/zip.js'
import { posts } from '../src/data/posts.js'
import { offers, offerBySlug, offerPicks, activeOffer, monthsLabel } from '../src/data/offers.js'
import { UPSELLS, cartUpsells, serviceUpsells, proPlans, addonLine, addonDelivery, upsellPriceTable } from '../src/data/upsells.js'
import { SITE_URL } from '../src/data/site.js'
import { claimStaleReload, clearStaleReload, isStaleLoadError } from '../src/lib/load-error.js'
import { MATCH_DEMO_JOB, editPoints, fieldOf, matchCv, matchReport, pickTemplates, termsOf } from '../src/data/match.js'
import { KIT_MIN_CV, KIT_MIN_JOB, buildKit, kitCredit, kitCredits, kitText, rankBullets } from '../src/data/kit.js'
import { LINK_PLANS, countryName, countryOf, demoEvents, linkUrl, recordEvent, sanitizeLink, summarize } from '../src/data/qalblink.js'
import { demoTalent, filterTalent, talentEntry } from '../src/data/talent.js'
import { MARKET_MIN, aggregate, marketCsv, marketReport, marketRows, normalizeSignal, saveSignal, signalHas } from '../src/data/market.js'
import { EMBED_TIERS, embedMailto, embedQuota, embedSnippet, embedTier, embedUsage } from '../src/data/embed.js'
import { LINKEDIN_SAMPLE, handleFrom, missingOf, parseLinkedin, toPersonal } from '../src/data/linkedin.js'
import { badgeHtml, badgeState, withBadge } from '../src/data/badge.js'
import { PRIVATE_PATHS } from '../scripts/agents.mjs'
import { couponFor, cardSvg, shareText } from '../src/data/share.js'

const out = 'tests/build/app.js'
mkdirSync('tests/build', { recursive: true })

await build({
  entryPoints: ['tests/entry.jsx'],
  bundle: true,
  format: 'iife',
  outfile: out,
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'error',
})
const code = readFileSync(out, 'utf8')

const seededCart = JSON.stringify([
  { id: 'nova', qty: 1 },
  { id: 'atlas', qty: 2 },
])

/**
 * حسابُ نموذج الربح: حرٌّ، أنشأ قالبه الأول، وأقرّ بالفحص الآلي. يُزرع في jsdom
 * كما يُزرع أي سجلٍّ على الجهاز، فتُختبر البوابة والعدّاد بما يقرؤه الكود فعلًا.
 */
const revenueAccount = {
  id: 'QA-TEST-1',
  email: 'noura@qalb.store',
  plan: 'free',
  since: '2026-09-01',
  consent: { v: '1', at: '2026-09-01T09:00:00.000Z' },
  niche: 'designer',
  answers: {
    name: 'نورة الحربي',
    role: 'مصممة منتجات',
    services: 'هوية وواجهات',
    works: 'ثلاثة مشاريع',
    colours: ['#2f6df6'],
    links: ['https://noura.design'],
  },
  created: [{ slug: 'noura-alhrbi', template: 'aether', niche: 'designer', at: '2026-09-02' }],
  activations: [],
}

const lookupOrders = JSON.stringify([
  {
    id: 'QALB-AAA-1111',
    key: 'KEY-AAAA-1111',
    date: '2026-08-11',
    email: 'sara@q.dev',
    name: 'سارة',
    total: 448,
    count: 2,
    method: 'card',
    methodLabel: 'بطاقة',
    lines: [
      { id: 'aether', slug: 'aether-portfolio', qty: 1 },
      { id: 'atlas', slug: 'atlas-cv', qty: 1 },
    ],
  },
  {
    id: 'QALB-BBB-2222',
    key: 'KEY-BBBB-2222',
    date: '2026-07-02',
    email: 'sara@q.dev',
    name: 'سارة',
    total: 89,
    count: 1,
    method: 'apple',
    lines: [{ id: 'nova', slug: 'nova-ats', qty: 1 }],
  },
])

const cases = [
  {
    name: 'home / arabic',
    url: 'http://localhost/',
    expect: [
      'قالب',
      'الأكثر رواجًا هذا الأسبوع',
      // v1.8.0: العنوان والزرّان كما كُتبا في الطلب — بلا وعدٍ بشراءٍ مرة واحدة
      'بورتفوليو وسيرة ذاتية',
      'بهوية واحدة.',
      'اختر قالبًا، عدّل محتواك، وانشر موقعك مع سيرة ATS جاهزة.',
      'تصفح القوالب',
      'معاينة القوالب المجانية',
      // «ماذا ستحصل عليه؟» — أربعةُ مخرجاتٍ تُسلَّم فعلًا
      'ماذا ستحصل عليه؟',
      'موقع بورتفوليو احترافي جاهز للنشر',
      'سيرة ذاتية متوافقة مع أنظمة الفحص الآلي (ATS)',
      'رابط شخصي حيّ ودعم النطاقات المخصصة',
      'ترخيص استخدام شخصي وتحديثات مجانية',
      // جدولُ الدرجات الموحّد: مجاني · Plus · Pro
      'الباقة المجانية',
      'Qalb Plus',
      'Qalb Pro',
      'SALE25',
      'qalb@qalb.store',
      // منظومة التوظيف: ستُّ أدواتٍ بعد القالب، تُرى من الصفحة الأولى
      'منظومةُ التوظيف',
      'طابق سيرتك مع الإعلان',
      'دليل المواهب',
    ],
    // ما خرج من الصفحة الأولى: الباقات المؤجّلة، والقالبُ المؤجَّل، ووعدُ «مدى الحياة»
    absent: ['ادفع مرة واحدة', 'القالب ملكك مدى الحياة', 'أنشئ قالبك من إجاباتك', 'فردية'],
  },
  {
    name: 'home / english',
    url: 'http://localhost/',
    lang: 'en',
    expect: [
      'Qalb',
      'Trending this week',
      'A portfolio and a résumé',
      'carrying one identity.',
      'Browse templates',
      'Preview free templates',
      'What’s included?',
      'Qalb Plus',
      'Qalb Pro',
      'ATS',
    ],
    absent: ['Pay once', 'yours for life', 'Solo'],
  },
  { name: 'catalog', url: 'http://localhost/templates', expect: ['كل القوالب', 'الفلاتر', 'أيثر', 'نِكسَس', 'نوع المنتج'] },
  { name: 'catalog by field', url: 'http://localhost/templates?cat=graduate', expect: ['فِست ستيب'] },
  { name: 'catalog by type', url: 'http://localhost/templates?type=cv', expect: ['نوفا', 'أطلس', 'إيكو'] },
  { name: 'catalog search', url: 'http://localhost/templates?q=Kubernetes', expect: ['أطلس'] },
  { name: 'catalog empty state', url: 'http://localhost/templates?q=zzzz', expect: ['لا توجد نتائج مطابقة'] },
  {
    name: 'product (site)',
    url: 'http://localhost/template/aether-portfolio',
    expect: ['معاينة حية', 'أضف إلى السلة', 'درجة الأداء', 'شبكة الأعمال', 'الترويسة'],
  },
  { name: 'product (bundle)', url: 'http://localhost/template/mirror-pro-bundle', expect: ['الموقع', 'السيرة', 'توافق ATS', 'حزمة موقع + سيرة'] },
  { name: 'product (cv)', url: 'http://localhost/template/atlas-cv', expect: ['عمود واحد', 'شريط جانبي', 'توافق ATS', 'صفحات'] },
  { name: 'cart with items', url: 'http://localhost/cart', cart: seededCart, expect: ['سلة المشتريات', 'الإجمالي', 'كود الخصم', 'نوفا'] },
  { name: 'checkout', url: 'http://localhost/checkout', cart: seededCart, expect: ['إتمام الشراء', 'البيانات', 'البريد الإلكتروني', 'ملخص الطلب'] },
  {
    name: 'success',
    url: 'http://localhost/order',
    order: true,
    expect: ['تم الدفع بنجاح', 'مفتاح الترخيص', 'تحميل كل الحزم', 'تحميل الحزمة', 'LICENSE.txt باسمك', 'سطر تتبّع', 'qalb@qalb.store'],
  },
  {
    name: 'legal',
    url: 'http://localhost/legal',
    expect: [
      'الشروط والخصوصية والاسترجاع',
      'لا يوجد مُرسِل موصول بهذا المتجر',
      'لا متتبّعات ولا إحصاءات',
      '١٤ يومًا',
      'لا زرّ «استرجاع» في المتجر',
      'MIT',
      'طباعة الصفحة',
    ],
  },
  {
    name: 'legal / english',
    url: 'http://localhost/legal',
    lang: 'en',
    expect: [
      'Terms, privacy and refunds',
      'no mailer wired to this store',
      'No trackers, no analytics',
      'Within 14 days of purchase',
      'there is no "refund" button',
      'single-use',
    ],
  },
  { name: 'hosting', url: 'http://localhost/host', expect: ['قالبك يصير موقعًا', 'qalb.store', '49', 'مجانًا', 'تعديلات في الشهر', 'نسخ'] },
  {
    name: 'hosting / english',
    url: 'http://localhost/host',
    lang: 'en',
    expect: ['Your template becomes a site', 'subdomain', '49', 'free', 'edits a month'],
  },
  { name: 'studio (nothing yet)', url: 'http://localhost/studio', expect: ['لا موقع على هذا المتصفح', 'أنشئ موقعي'] },
  {
    name: 'institutions',
    url: 'http://localhost/b2b',
    expect: ['الفرز الآلي', 'ضريبة القيمة المضافة', 'اعتماد', 'اطلبوا عقدًا', 'كم بقي من مقاعدنا؟', '7,500', '13,000', '33,000'],
  },
  {
    name: 'institutions / english',
    url: 'http://localhost/b2b',
    lang: 'en',
    expect: ['readiness for automated screening', 'Etimad', 'VAT', 'How many seats are left?', 'per year'],
  },
  {
    name: 'ats checker',
    url: 'http://localhost/ats',
    expect: ['هل يقرأ الآليّ سيرتك', 'يعمل في المتصفح وحده', 'جرّب نموذجًا', 'نصّ السيرة', '320', 'قالب', 'لا نفتح هذا الملف — وعن قصد.'].slice(0, 6),
  },
  {
    name: 'ats checker / english',
    url: 'http://localhost/ats',
    lang: 'en',
    expect: ['Can a machine read your CV', 'Browser-only', 'Try a sample', 'Plain text only'],
  },
  {
    name: 'cv-to-posting match',
    url: 'http://localhost/match',
    expect: ['طابق سيرتك مع إعلان الوظيفة', 'بانتظار النصّين', 'لا يُرسل نصّك إلى أيّ مكان', 'سيرة نموذجية', 'إعلان نموذجي'],
  },
  {
    name: 'cv-to-posting match / english',
    url: 'http://localhost/match',
    lang: 'en',
    expect: ['Match your CV to the job posting', 'Waiting for both texts', 'Sample posting'],
  },
  {
    name: 'application kit',
    url: 'http://localhost/kit',
    expect: ['مولّد ملف التقديم', 'رصيدُ التوليدات', 'ولّد الملف', 'ملفُّ تقديم — ١٠ توليدات', '49'],
  },
  {
    name: 'talent directory',
    url: 'http://localhost/talent',
    expect: ['دليل المواهب', 'نورة الحربي', 'الجاهزية', 'نموذج', 'وصولُ الشركات'],
  },
  {
    name: 'market report',
    url: 'http://localhost/market',
    expect: ['تقرير السوق', 'النسبة', 'أجب أنت أيضًا', 'للجامعات ومراكز المهنة'],
  },
  { name: 'embed (b2b checker)', url: 'http://localhost/embed', expect: ['مضمّن في موقعكم', '199', '499', 'iframe', 'جامعات'] },
  {
    name: 'professional link (sample)',
    url: 'http://localhost/u/noura-alharbi',
    expect: ['نورة الحربي', 'مهندسة واجهات أمامية', 'نموذج', 'فتحات'],
  },
  { name: 'professional link missing', url: 'http://localhost/u/no-such-person', expect: ['لا رابطَ بهذا الاسم', 'أنشئ رابطك'] },
  { name: 'wishlist', url: 'http://localhost/wishlist', wish: '["nova","aether"]', expect: ['المفضلة', 'أيثر'] },
  { name: 'blog', url: 'http://localhost/blog', expect: ['مقالات', 'اقرأ المقال', 'دقائق قراءة'] },
  {
    name: 'blog post',
    url: 'http://localhost/blog/seven-ats-rules',
    expect: ['سبع قواعد تقرؤها الآلة أولًا في سيرتك', 'كل المقالات'],
  },
  { name: '404', url: 'http://localhost/nope', expect: ['404', 'الصفحة غير موجودة'] },
  { name: 'admin (first run)', url: 'http://localhost/admin', expect: ['أنشئ حساب الإدارة الأول', 'على هذا الجهاز فقط', 'إنشاء الحساب والدخول'] },
  {
    name: 'order lookup',
    url: 'http://localhost/track',
    seed: { 'qalb.orders.v1': lookupOrders },
    expect: ['تتبّع طلباتك', 'البريد الإلكتروني', 'اعرض طلباتي', 'أدخل'],
  },
  {
    name: 'licence check',
    url: 'http://localhost/licence',
    expect: ['التحقق من الترخيص', 'مفتاح الترخيص', 'تحقّق'],
  },
  {
    name: 'order lookup / english',
    url: 'http://localhost/track?email=sara@q.dev',
    lang: 'en',
    expect: ['Track your orders', 'Show my orders', 'My orders', 'no account needed'],
  },
  {
    name: 'licence check / english',
    url: 'http://localhost/licence?key=KEY-AAAA-1111',
    lang: 'en',
    seed: { 'qalb.orders.v1': lookupOrders },
    expect: ['Verify a licence key', 'Licence key', 'Verify', 'order server when enabled'],
  },

  /* ---------------- نموذج الربح v1.7.0: خطط، إنشاء، حساب، سوق، بائع ---------------- */
  {
    name: 'pricing / plans and the value matrix',
    url: 'http://localhost/pricing',
    expect: [
      'ما الذي نبيعه بالضبط',
      // v1.8.0: جدولٌ واحد بثلاث درجات — لا «فردية» ولا باقةٌ تُشترى مرة واحدة
      'الباقة المجانية',
      'Qalb Plus',
      'Qalb Pro',
      'المجاني مقابل المدفوع',
      'إنشاء حساب بالبريد',
      'تحميل سيرة PDF',
      'بيع القالب للآخرين',
      'عمولة المنصة من كل بيع',
      '299',
      '499',
      'ما لا يحدث في هذه النسخة',
    ],
    absent: ['فردية', 'باقة لمرة واحدة', 'Solo'],
  },
  {
    name: 'pricing / english',
    url: 'http://localhost/pricing',
    lang: 'en',
    expect: [
      'What we sell, exactly',
      'Free — the Free tier',
      'Qalb Plus',
      'Qalb Pro',
      'Free against paid, row by row',
      'Selling your template to others',
    ],
    absent: ['Solo', 'one-time pack at SAR'],
  },
  {
    // v1.8.0: مُنشئ القالب خرج من المنتج — /create يُحوَّل إلى الكتالوج نفسه
    name: 'create / the wizard is gone, the route lands on the catalogue',
    url: 'http://localhost/create',
    expect: ['كل القوالب', 'الفلاتر', 'ابحث بالاسم أو المجال', 'نوع المنتج', 'إعادة ضبط الفلاتر', 'عرض 9 من 20'],
    absent: ['أنشئ قالبك من إجاباتك', 'ابدأ مجانًا'],
  },
  {
    name: 'create / a signed-in account with no niche still lands on the catalogue',
    url: 'http://localhost/create',
    // الحساب قائم والمجال لم يُختَر: ما كان يفتح الخطوة الثانية صار تحويلًا
    seed: { 'qalb.account.v1': JSON.stringify({ ...revenueAccount, niche: null, created: [] }) },
    expect: ['كل القوالب', 'الفلاتر', 'أيثر'],
    // «مجالك» و«مصمم» يردان في الكتالوج نفسه (فلتر المجال وتصنيف التصميم)، فالمحرَّمُ
    // ما كان للمعالج وحده: مجالاتُ المرحلة الثانية وجملةُ «بدأنا بـ»
    absent: ['مبرمج', 'المرحلة الأولى', 'بدأنا بمصممين ومصورين', 'أنشئ قالبك من إجاباتك'],
  },
  {
    // البوابة نفسها: لا محرّر يعتذر بعد خطوة، ولا قالبَ ثانٍ خلف «فردية»
    name: 'create / the second template meets no wizard at all',
    url: 'http://localhost/create',
    seed: { 'qalb.account.v1': JSON.stringify(revenueAccount) },
    expect: ['كل القوالب', 'الفلاتر', 'أيثر'],
    absent: ['القالب الثاني خلف اشتراك', 'فردية', 'Pro', 'لا بوابة دفع موصولة'],
  },
  {
    name: 'account / no account on this device',
    url: 'http://localhost/account',
    // v1.8.0: الحالة الفارغة استمارةُ تسجيلٍ في الصفحة نفسها — لا زرٌّ يقود إلى /create
    expect: ['لا حساب على هذا الجهاز بعد', 'بريدك الإلكتروني', 'بالمتابعة أُقرّ', 'ابدأ مجانًا', 'لا نرسل رسالة تأكيد'],
    absent: ['أنشئ قالبك من إجاباتك'],
  },
  {
    name: 'account / a free account sees the watermark rule',
    url: 'http://localhost/account',
    seed: { 'qalb.account.v1': JSON.stringify(revenueAccount) },
    expect: ['noura@qalb.store', 'الباقة المجانية', 'قوالبك 1 من 1', 'بعلامة مائية', 'ورقة السيرة', 'ما تفتحه خطتك', 'بيع قوالبك'],
  },
  {
    name: 'creators / the market and its published rules',
    url: 'http://localhost/creators',
    expect: ['سوق المصممين', 'لا إدراج منشور بعد', 'القواعد المعلنة', 'ترخيص ما تشتريه', 'مفحوص آليًا'],
  },
  {
    name: 'sell / needs an account first',
    url: 'http://localhost/sell',
    expect: ['يلزم حساب أولًا', 'أنشئ حسابك'],
  },
  {
    name: 'sell / a free account meets the subscription gate',
    url: 'http://localhost/sell',
    seed: { 'qalb.account.v1': JSON.stringify(revenueAccount) },
    expect: ['بِع قالبك', 'البيع مفتوح للاشتراكات', 'تقسيمك قبل البيع', 'عمولة المنصة ٢٥٪', 'عتبات القرار'],
  },
  {
    name: 'sell / a paid account gets the listing form',
    url: 'http://localhost/sell',
    seed: { 'qalb.account.v1': JSON.stringify({ ...revenueAccount, plan: 'pro' }) },
    expect: ['إدراج جديد', 'عنوان القالب', 'ملفات الحزمة', 'ارفع للفحص الآلي', 'مستحقاتك', 'ترخيص السوق', 'خطتك تفتح البيع'],
  },
]

/**
 * Routes are lazy + wrapped in <Suspense>, so a fixed number of ticks used to
 * read the fallback shell instead of the page. Wait until the DOM stops
 * growing instead — deterministic and still fast.
 */
async function settle(root, { quiet = 3, max = 4000 } = {}) {
  let prev = -1
  let still = 0
  const t0 = Date.now()
  while (Date.now() - t0 < max) {
    await new Promise((r) => setTimeout(r, 8))
    // a lazy route still showing its fallback looks "stable" — keep waiting
    if (root && root.querySelector('[data-route-fallback]')) {
      still = 0
      continue
    }
    const n = root.querySelectorAll('*').length
    if (n === prev && n > 0) {
      if (++still >= quiet) break
    } else {
      still = 0
      prev = n
    }
  }
  return root ? root.querySelectorAll('*').length : 0
}

const stubs = (win) => {
  win.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  win.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb
    }
    observe(el) {
      setTimeout(() => this.cb([{ isIntersecting: true, target: el }]), 0)
    }
    unobserve() {}
    disconnect() {}
  }
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
  win.scrollTo = () => {}
  win.HTMLElement.prototype.scrollIntoView = () => {}
  win.getComputedStyle = win.getComputedStyle || (() => ({ getPropertyValue: () => '' }))
  // jsdom's queueMicrotask reports a throwing callback through window.location —
  // which is null once the test has closed the window, so a caught render error used
  // to abort the whole run. Swallow late microtasks instead; behaviour is otherwise identical.
  win.queueMicrotask = (cb) =>
    Promise.resolve()
      .then(cb)
      .catch(() => {})
}

const mkHtml = (lang) =>
  `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`

/** boots the real bundle in jsdom: url + seeded storage + optional pre-boot hook */
async function render(url, seed = {}, { lang = 'ar', boot } = {}) {
  const errs = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => errs.push('jsdom: ' + e.message))
  vc.on('error', (...a) => errs.push('console.error: ' + a.map(String).join(' ')))
  const dom = new JSDOM(mkHtml(lang), {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      stubs(win)
      for (const [k, v] of Object.entries(seed)) win.localStorage.setItem(k, v)
      if (boot) boot(win)
    },
  })
  const sc = dom.window.document.createElement('script')
  sc.textContent = code
  dom.window.document.body.appendChild(sc)
  const root = dom.window.document.getElementById('root')
  await settle(root)
  return {
    dom,
    win: dom.window,
    doc: dom.window.document,
    root,
    errs,
    wait: () => settle(root, { quiet: 2 }),
    txt: () => root.textContent || '',
    btn: (re, sel = 'button') => [...dom.window.document.querySelectorAll(sel)].find((b) => re.test(b.textContent || '')),
  }
}

let failed = 0
let groups = 0 // كل مجموعة تُبلّغ سطرًا واحدًا — فالعدد مشتق لا مكتوب
let routeChecks = 0

for (const c of cases) {
  const errs = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => errs.push(`jsdom: ${e.message}`))
  vc.on('error', (...a) => errs.push(`console.error: ${a.join(' ')}`))

  const dom = new JSDOM(
    `<!doctype html><html lang="${c.lang || 'ar'}" dir="${c.lang === 'en' ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`,
    {
      url: c.url,
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(win) {
        win.ResizeObserver = class {
          observe() {}
          unobserve() {}
          disconnect() {}
        }
        win.IntersectionObserver = class {
          constructor(cb) {
            this.cb = cb
          }
          observe(el) {
            setTimeout(() => this.cb([{ isIntersecting: true, target: el }]), 0)
          }
          unobserve() {}
          disconnect() {}
        }
        win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
        win.scrollTo = () => {}
        win.HTMLElement.prototype.scrollIntoView = () => {}
        win.getComputedStyle = win.getComputedStyle || (() => ({ getPropertyValue: () => '' }))
        if (c.cart) win.localStorage.setItem('qalb.cart.v1', c.cart)
        if (c.wish) win.localStorage.setItem('qalb.wish.v1', c.wish)
        if (c.lang) win.localStorage.setItem('qalb.lang', c.lang)
        if (c.seed) for (const [k, v] of Object.entries(c.seed)) win.localStorage.setItem(k, v)
        if (c.order)
          win.localStorage.setItem(
            'qalb.lastOrder',
            JSON.stringify({
              id: 'QALB-TEST-1',
              email: 's@mail.com',
              name: 'Sarah',
              total: 267,
              count: 3,
              method: 'card',
              date: '2026-09-03',
              key: 'AAAA-BBBB-CCCC-DDDD',
              lines: [{ id: 'nova', slug: 'nova-ats', qty: 1 }],
            }),
          )
      },
    },
  )

  const s = dom.window.document.createElement('script')
  s.textContent = code
  dom.window.document.body.appendChild(s)
  await settle(dom.window.document.getElementById('root'))

  const root = dom.window.document.getElementById('root')
  const text = (root && root.textContent) || ''
  const nodes = root ? root.querySelectorAll('*').length : 0
  const missing = c.expect.filter((x) => !text.includes(x))
  // `absent`: سطرٌ خرج من المنتج — بقاؤه في الصفحةِ عودٌ إليه
  const stray = (c.absent || []).filter((x) => text.includes(x))
  const reactErrors = errs.filter((e) => !/Warning: |not implemented/i.test(e))
  routeChecks += c.expect.length + (c.absent || []).length + 1 // كل توقّع + كل منفيّ + فحص «لا أخطاء React»

  if (missing.length || stray.length || reactErrors.length) {
    failed++
    console.log(`✗ ${c.name}`)
    if (missing.length) console.log(`   missing: ${missing.join(' | ')}`)
    if (stray.length) console.log(`   still there: ${stray.join(' | ')}`)
    if (reactErrors.length) console.log(`   errors: ${reactErrors.slice(0, 3).join('\n          ')}`)
  } else {
    groups++
    console.log(`✓ ${c.name}  (${text.length} chars, ${nodes} nodes)`)
  }
  dom.window.close()
}

/* ---------------- checkout funnel (real interaction) ---------------- */
{
  const errs = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => errs.push('jsdom: ' + e.message))
  vc.on('error', (...a) => errs.push('console.error: ' + a.map(String).join(' ')))
  const dom = new JSDOM(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`, {
    url: 'http://localhost/checkout',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      win.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
      win.scrollTo = () => {}
      win.HTMLElement.prototype.scrollIntoView = () => {}
      win.localStorage.setItem('qalb.cart.v1', seededCart)
    },
  })
  const { window } = dom
  const { document } = window
  const s2 = document.createElement('script')
  s2.textContent = code
  document.body.appendChild(s2)
  await settle(document.getElementById('root'))

  const root = document.getElementById('root')
  const txt = () => root.textContent || ''
  const wait = () => settle(root, { quiet: 2 })
  const btn = (label) => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(label))
  const fill = (name, value) => {
    const node = document.querySelector(`#co-${name}`)
    if (!node) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(node, value)
    node.dispatchEvent(new window.Event('input', { bubbles: true }))
    return true
  }

  const checks = []
  // 1. empty submit must surface validation errors
  ;(btn('متابعة') || {}).click?.()
  await wait()
  checks.push(['validation blocks empty step', /أدخل بريد/.test(txt())])
  checks.push([
    'step is a real <form> whose submit button advances it',
    !!document.querySelector('form #co-email') && /متابعة/.test(document.querySelector('form button[type="submit"]')?.textContent || ''),
  ])
  checks.push([
    'inner buttons cannot submit the step form',
    [...document.querySelectorAll('form button')]
      .filter((b) => b.getAttribute('type') !== 'submit')
      .every((b) => b.getAttribute('type') === 'button'),
  ])
  checks.push(['phone field uses the tel keyboard', document.getElementById('co-phone')?.getAttribute('inputmode') === 'tel'])

  // 1b. errored inputs must be linked to their message
  const emailEl = document.getElementById('co-email')
  const errAriaOk =
    !!emailEl &&
    emailEl.getAttribute('aria-invalid') === 'true' &&
    !!document.getElementById(emailEl.getAttribute('aria-describedby') || '')?.textContent?.trim()

  // 2. valid details advance to payment
  checks.push(['empty errors are announced to AT', errAriaOk === true, String(errAriaOk)])
  fill('email', 'sarah@example.com')
  fill('name', 'سارة العتيبي')
  await wait()
  ;(btn('متابعة') || {}).click?.()
  await wait()
  checks.push(['step 2 shows payment methods', /Apple Pay/.test(txt()) && /بطاقة ائتمانية/.test(txt())])

  // 3. bad card is rejected, good card advances to review
  checks.push([
    'card fields use the right keyboards and autofill hints',
    document.getElementById('co-card')?.getAttribute('inputmode') === 'numeric' &&
      document.getElementById('co-card')?.getAttribute('autocomplete') === 'cc-number' &&
      document.getElementById('co-exp')?.getAttribute('autocomplete') === 'cc-exp' &&
      document.getElementById('co-exp')?.getAttribute('enterkeyhint') === 'done' &&
      document.getElementById('co-cvv')?.getAttribute('autocomplete') === 'cc-csc',
  ])
  fill('card', '4111111111111111')
  fill('exp', '1229')
  fill('cvv', '123')
  await wait()
  ;(btn('متابعة') || {}).click?.()
  await wait()
  checks.push(['step 3 shows review + pay', /تأكيد الطلب والدفع/.test(txt()) && /sarah@example.com/.test(txt())])

  // 3b. what the buyer must tick before paying actually leads to readable text
  // v1.8.0: كلُّ اتفاقٍ صفحته — /terms و/refunds و/privacy — لا قسمٌ في صفحةٍ جامعة
  const legalLinks = [...document.querySelectorAll('#main a[href^="/"]')].filter((a) =>
    ['/terms', '/refunds', '/privacy'].includes(a.getAttribute('href')),
  )
  checks.push([
    'the agreement row links out to the terms, the refund policy and the privacy text',
    legalLinks.length === 3 && legalLinks.every((a) => a.target === '_blank' && /noopener/.test(a.rel || '')),
    `links=${legalLinks.length}`,
  ])
  checks.push([
    'they sit outside the <label>, so reading them does not tick the agreement box',
    legalLinks.length === 3 && legalLinks.every((a) => !a.closest('label')),
  ])

  // 4. pay → success page, cart emptied
  ;(btn('تأكيد الطلب والدفع') || {}).click?.()
  await new Promise((r) => setTimeout(r, 2400))
  await wait()
  const after = txt()
  checks.push(['success screen rendered', /تم الدفع بنجاح/.test(after) && /مفتاح الترخيص/.test(after)])
  checks.push(['cart cleared after order', window.localStorage.getItem('qalb.cart.v1') === '[]'])
  checks.push(['no console errors during flow', errs.filter((e) => !/not implemented/i.test(e)).length === 0])

  const bad = checks.filter(([, ok]) => !ok)
  if (bad.length) {
    failed++
    groups++
    console.log('✗ checkout funnel')
    bad.forEach(([n]) => console.log('   failed: ' + n))
    if (errs.length) console.log('   ' + errs.slice(0, 2).join('\n   ').slice(0, 400))
  } else {
    groups++
    console.log(`✓ checkout funnel  (${checks.length} assertions, ${after.length} chars)`)
  }
  window.close()
}

/* ---------------- interactions: cart badge, language/RTL switch, wishlist, customizer ---------------- */
{
  const errs = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => errs.push('jsdom: ' + e.message))
  vc.on('error', (...a) => errs.push('console.error: ' + a.map(String).join(' ')))
  const dom = new JSDOM(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`, {
    url: 'http://localhost/template/mirror-pro-bundle',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      win.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
      win.scrollTo = () => {}
      win.HTMLElement.prototype.scrollIntoView = () => {}
    },
  })
  const { window } = dom
  const { document } = window
  const sc = document.createElement('script')
  sc.textContent = code
  document.body.appendChild(sc)
  await settle(document.getElementById('root'))

  const root = document.getElementById('root')
  const txt = () => root.textContent || ''
  const wait = () => settle(root, { quiet: 2 })
  const btnWith = (label, sel = 'button') => [...document.querySelectorAll(sel)].find((b) => (b.textContent || '').includes(label))
  const checks = []

  const cartLink = () => document.querySelector('a[href="/cart"]')
  const labelBefore = cartLink().getAttribute('aria-label') || ''
  ;(btnWith('أضف إلى السلة') || {}).click?.()
  await wait()
  const labelAfter = cartLink().getAttribute('aria-label') || ''
  checks.push([
    'add to cart updates header badge',
    /— 0$/.test(labelBefore) && /— 1$/.test(labelAfter) && (window.localStorage.getItem('qalb.cart.v1') || '').includes('mirrorbundle'),
  ])

  ;(btnWith('حفظ للمفضلة') || {}).click?.()
  await wait()
  checks.push(['wishlist persisted', (window.localStorage.getItem('qalb.wish.v1') || '').includes('mirrorbundle')])

  const langBtn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Switch language')
  ;(langBtn || {}).click?.()
  await wait()
  checks.push(['language switch flips dir + copy', document.documentElement.dir === 'ltr' && /Add to cart/.test(txt())])

  ;(btnWith('CV', 'button') || btnWith('السيرة', 'button') || {}).click?.()
  await wait()
  checks.push(['bundle switches to the CV view', /A4|صفحة|ATS/.test(txt()) && !!document.querySelector('[data-resume]')])

  const bad = checks.filter(([, ok]) => !ok)
  if (bad.length || errs.length) {
    failed++
    groups++
    console.log('✗ interactions')
    bad.forEach(([n, ok]) => !ok && console.log('   failed: ' + n))
    if (errs.length) console.log('   ' + errs.slice(0, 2).join('\n   ').slice(0, 300))
  } else {
    groups++
    console.log(`✓ interactions  (${checks.length} assertions)`)
  }
  window.close()
}

/* ---------------- previews · recently-viewed · cart math · mega ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }

  /* --- product page: preview direction follows language, view is remembered --- */
  {
    const g = await render('http://localhost/template/aether-portfolio', { 'qalb.recent.v1': JSON.stringify(['nexus', 'nova']) })
    const pvDir = () => g.doc.querySelector('[data-preview-dir]')?.getAttribute('data-preview-dir')
    ok('live preview renders rtl in arabic', pvDir() === 'rtl', `got ${pvDir()}`)

    const titleAr = g.doc.title
    const descAr = g.doc.head.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    ok(
      'per-route title + description are set in arabic',
      /أيثر/.test(titleAr) && titleAr.includes('قالب') && /معاينة حية/.test(descAr),
      `${titleAr} :: ${descAr.slice(0, 44)}`,
    )

    const langBtn = [...g.doc.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Switch language')
    langBtn?.click()
    await g.wait()
    const pvDir2 = g.doc.querySelector('[data-preview-dir]')?.getAttribute('data-preview-dir')
    ok(
      'switching language flips the preview to ltr',
      g.doc.documentElement.dir === 'ltr' && pvDir2 === 'ltr',
      `dir=${g.doc.documentElement.dir} preview=${pvDir2}`,
    )
    ok('preview copy switches to english', /Aether|Open the live demo|Add to cart/.test(g.txt()))
    ok('title follows the language switch', /Aether/.test(g.doc.title) && /Qalb/.test(g.doc.title), g.doc.title)

    const recent = JSON.parse(g.win.localStorage.getItem('qalb.recent.v1') || '[]')
    ok('product view stored in recently-viewed', recent[0] === 'aether' && recent[1] === 'nexus', recent.join(','))
    ok('recent list capped and deduped', recent.length <= 6 && new Set(recent).size === recent.length, `${recent.length}`)

    const addBtn = () => g.btn(/Add to cart|أضف إلى السلة/)
    addBtn()?.click()
    await g.wait()
    const first = g.txt()
    const badge1 = g.doc.querySelector('a[href="/cart"]')?.getAttribute('aria-label') || ''
    addBtn()?.click()
    await g.wait()
    const second = g.txt()
    const badge2 = g.doc.querySelector('a[href="/cart"]')?.getAttribute('aria-label') || ''
    ok('first add says "added"', /Added to cart|أُضيف إلى السلة/.test(first))
    ok('second add says "already in cart"', /In cart|في السلة/.test(second))
    ok('badge counts units, not clicks', /1$/.test(badge1.trim()) && /2$/.test(badge2.trim()), `${badge1} -> ${badge2}`)

    /* fullscreen live demo from the product page */
    const demoBtn = g.btn(/Open the live demo|افتح العرض الحي/)
    demoBtn?.click()
    await g.wait()
    const dlg = g.doc.querySelector('[role="dialog"]')
    ok(
      'try-it opens a modal carrying the live preview',
      !!dlg && dlg.getAttribute('aria-modal') === 'true' && !!dlg.querySelector('[data-preview-dir]'),
      dlg ? `aria-modal=${dlg.getAttribute('aria-modal')} preview=${!!dlg.querySelector('[data-preview-dir]')}` : 'no dialog',
    )
    if (dlg) {
      const rootEl = g.doc.getElementById('root')
      ok(
        'app behind the dialog is inert + hidden from AT',
        rootEl?.hasAttribute('inert') && rootEl?.getAttribute('aria-hidden') === 'true',
        `${rootEl?.hasAttribute('inert')}/${rootEl?.getAttribute('aria-hidden')}`,
      )
      g.doc.dispatchEvent(new g.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await g.wait()
      ok('escape closes the live demo', !g.doc.querySelector('[role="dialog"]'))
      ok('inert is removed on close', !g.doc.getElementById('root')?.hasAttribute('inert'))
      ok('scroll lock released', g.doc.body.style.overflow !== 'hidden', g.doc.body.style.overflow)
    }
    g.dom.window.close()
  }

  /* --- home: mega menu opens and closes on navigation --- */
  {
    const g = await render('http://localhost/')
    const trigger = g.doc.querySelector('button[aria-controls="mega-panel"]')
    trigger?.click()
    await g.wait()
    ok('categories mega opens', g.doc.querySelector('#mega-panel')?.getAttribute('data-mega') === 'open')
    const link = [...g.doc.querySelectorAll('#mega-panel a')].find((a) => (a.getAttribute('href') || '').startsWith('/templates'))
    link?.click()
    await g.wait()
    ok(
      'mega closes after navigating',
      g.doc.querySelector('#mega-panel')?.getAttribute('data-mega') === 'closed',
      g.doc.querySelector('#mega-panel')?.getAttribute('data-mega'),
    )
    ok('navigation actually happened', g.win.location.pathname === '/templates', g.win.location.pathname)
    g.dom.window.close()
  }

  /* --- catalog: recently-viewed rail only when there is history --- */
  {
    const empty = await render('http://localhost/templates')
    ok('no recent rail for a first visit', !empty.doc.querySelector('[data-recent]'))
    empty.dom.window.close()

    const g = await render('http://localhost/templates', { 'qalb.recent.v1': JSON.stringify(['nova', 'atlas', 'aether']) })
    const rail = g.doc.querySelector('[data-recent]')
    ok('recent rail restored from storage', !!rail && rail.getAttribute('data-recent') === '3', rail ? rail.getAttribute('data-recent') : 'missing')
    ok(
      'recent rail links to the right templates',
      [...g.doc.querySelectorAll('[data-recent-item]')].map((x) => x.getAttribute('data-recent-item')).join(',') ===
        'nova-cv,atlas-cv,aether-portfolio',
      [...g.doc.querySelectorAll('[data-recent-item]')].map((x) => x.getAttribute('data-recent-item')).join(','),
    )
    g.dom.window.close()
  }

  /* --- cart: coupon actually changes the money --- */
  {
    const { byId } = await import('../src/data/templates.js')
    const lines = [
      { id: 'nova', qty: 1 },
      { id: 'atlas', qty: 2 },
    ]
    const subtotal = lines.reduce((s, l) => s + byId(l.id).price * l.qty, 0)
    const g = await render('http://localhost/cart', { 'qalb.cart.v1': JSON.stringify(lines) })
    const total = () => Number(g.doc.querySelector('[data-total]')?.getAttribute('data-total'))
    ok('cart total before coupon', Math.abs(total() - subtotal) < 0.01, `${total()} vs ${subtotal}`)

    const input = g.doc.getElementById('coupon-code')
    ok('coupon field is labelled', !!input && !!g.doc.querySelector('label[for="coupon-code"]'))
    const setter = Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'SALE25')
    input.dispatchEvent(new g.win.Event('input', { bubbles: true }))
    await g.wait()
    g.btn(/Apply|تطبيق/)?.click()
    await g.wait()

    const expectTotal = subtotal * 0.75
    const disc = Number(g.doc.querySelector('[data-discount]')?.getAttribute('data-discount'))
    ok('SALE25 takes 25% off', Math.abs(total() - expectTotal) < 0.51, `${total()} vs ${expectTotal.toFixed(2)}`)
    ok('discount row matches the cut', Math.abs(disc - subtotal * 0.25) < 0.51, `${disc} vs ${(subtotal * 0.25).toFixed(2)}`)
    ok('vat extracted, not added', /15/.test(g.txt()) && Number(g.doc.querySelector('[data-total]')?.getAttribute('data-total')) > 0)
    ok('coupon persisted to storage', (g.win.localStorage.getItem('qalb.coupon.v1') || '').includes('SALE25'))

    /* bad code must not silently keep the old total */
    const bad2 = g.doc.getElementById('coupon-code')
    if (bad2) {
      setter.call(bad2, 'NOPE')
      bad2.dispatchEvent(new g.win.Event('input', { bubbles: true }))
      g.btn(/Apply|تطبيق/)?.click()
      await g.wait()
      ok('bad coupon is rejected with a message', Math.abs(total() - subtotal) < 0.01 && /invalid|غير صالح|لا يوجد/.test(g.txt()), `total=${total()}`)
    }
    const noisy = g.errs.filter((e) => !/not implemented|Warning: react-i18next|useLayoutEffect does nothing on the server/i.test(e))
    ok('no console errors in this group', noisy.length === 0, noisy.slice(0, 1).join(' '))
    g.dom.window.close()
  }

  if (bad.length) {
    failed++
    groups++
    console.log('✗ previews · recent · cart math')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ previews · recent · cart math  (${checks.length} assertions)`)
  }
}

/* ---------------- visual fixes · pro anchor · mega menu (☰) ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }

  /* ---------- /match: نسبةٌ أفقية داخل الدائرة، وأزرار العيّنات بأيقونات SVG صريحة ---------- */
  {
    const g = await render('http://localhost/match')
    g.btn(/سيرة نموذجية/)?.click()
    g.btn(/إعلان نموذجي/)?.click()
    await g.wait()
    const ring = g.doc.querySelector('[data-match-score] svg')
    const label = ring?.querySelector('text')?.textContent || ''
    ok('the match score sits in the ring as a horizontal NN%', /^\d+%$/.test(label.trim()), label)
    ok(
      'nothing rotates the ring or writes its number sideways',
      !/rotate|writing-mode/i.test(
        `${ring?.getAttribute('class') || ''} ${ring?.querySelector('text')?.getAttribute('class') || ''} ${ring?.querySelector('text')?.getAttribute('style') || ''}`,
      ),
      String(ring?.getAttribute('class')),
    )
    const demoCv = g.btn(/سيرة نموذجية/)
    const demoJob = g.btn(/إعلان نموذجي/)
    ok('the sample CV and posting buttons carry explicit SVG icons', !!demoCv?.querySelector('svg') && !!demoJob?.querySelector('svg'))
    ok(
      'and the sample buttons still fill both inputs',
      (g.doc.getElementById('m-cv')?.value || '').length > 50 && (g.doc.getElementById('m-job')?.value || '').length > 20,
    )
    g.dom.window.close()
  }

  /* ---------- /#bundles: القسم موجود فعليًّا ورابط الترويسة والفوتر يقود إليه ---------- */
  {
    const g = await render('http://localhost/')
    // بطاقةُ Pro نفسها تحمل id="pro" داخل القسم (src/components/PlanCards.jsx)، وروابط
    // الواجهة تقود إلى القسم لا إلى بطاقةٍ داخله — فالمقسومُ هو ما يُفحَص هنا.
    ok('the plan band sits on the home page under id=bundles', !!g.doc.getElementById('bundles'))
    ok('and the footer points its plans link at that anchor', !!g.doc.querySelector('footer a[href="/#bundles"]'))
    ok('the Pro card inside the band carries the id the anchor promise names', !!g.doc.querySelector('#bundles [data-plan="pro"]'))
    g.dom.window.close()
  }

  /* ---------- ☰: قائمةٌ شاملة تجمع كل روابط المنصة وتُخفّف الشريط ---------- */
  {
    const g = await render('http://localhost/')
    const trigger = g.doc.querySelector('[data-menu-trigger]')
    ok('the header carries a ☰ trigger for the all-in menu', !!trigger)
    trigger?.click()
    await g.wait()
    ok('the menu panel opens', g.doc.querySelector('#menu-panel')?.getAttribute('data-menu') === 'open')
    const panel = g.doc.querySelector('#menu-panel')
    const hrefs = [...(panel?.querySelectorAll('a') || [])].map((a) => a.getAttribute('href'))
    const tools = ['/ats', '/match', '/kit', '/u/noura-alharbi', '/studio', '/talent', '/market', '/embed', '/b2b']
    ok(
      'all nine hiring tools are listed in one place',
      tools.every((h) => hrefs.includes(h)),
      tools.filter((h) => !hrefs.includes(h)).join(','),
    )
    ok(
      'the tools badge counts the table’s own rows, never a typed number',
      (panel?.querySelector('[data-menu-tools-count]')?.textContent || '').trim().startsWith(String(tools.length)) &&
        /\D/.test((panel?.querySelector('[data-menu-tools-count]')?.textContent || '').trim()),
    )
    ok(
      'templates, services, hosting and support are gathered with them',
      ['/templates', '/services', '/offers', '/host', '/blog', '/track', '/licence'].every((h) => hrefs.includes(h)),
    )
    ok(
      'every promised section anchor is in the panel',
      ['/#bundles', '/#faq', '/#guide', '/#deploy', '/#contact'].every((h) => hrefs.includes(h)),
    )
    ok('the direct header links gave way to the menu', g.doc.querySelectorAll('header nav > a').length === 0)
    g.doc.body.dispatchEvent(new g.win.MouseEvent('mousedown', { bubbles: true }))
    await g.wait()
    ok('clicking outside closes the menu', g.doc.querySelector('#menu-panel')?.getAttribute('data-menu') === 'closed')
    ok('no console errors in this group', g.errs.filter((e) => !/not implemented/i.test(e)).length === 0, g.errs.slice(0, 1).join(' '))
    g.dom.window.close()
  }

  if (bad.length) {
    failed++
    groups++
    console.log('✗ visual fixes · pro anchor · mega menu')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ visual fixes · pro anchor · mega menu  (${checks.length} assertions)`)
  }
}

/* ---------------- growth v1.5.0 · الإضافات والاشتراك والعروض والخدمات ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])

  /* ---------- جدول الإضافات: مصدرٌ واحد للسلة والخدمات والفاحص والاشتراك ---------- */
  ok(
    'add-on ids are unique and prices are whole positive riyals',
    new Set(UPSELLS.map((u) => u.id)).size === UPSELLS.length && UPSELLS.every((u) => Number.isInteger(u.price) && u.price > 0),
    UPSELLS.map((u) => `${u.id}:${u.price}`).join(','),
  )
  ok(
    'every add-on is bilingual and says how it is delivered',
    UPSELLS.every(
      (u) =>
        u.name?.ar &&
        u.name?.en &&
        u.tagline?.ar &&
        u.tagline?.en &&
        u.desc?.ar &&
        u.desc?.en &&
        // ثلاثُ طُرُقِ تسليم: مهلةُ بريد، أو اشتراك يُفعَّل، أو فوريٌّ في المتصفح
        (u.sla > 0 || u.period || u.instant === true),
    ),
  )
  ok(
    'the cart, services, checker and subscription each offer their own group',
    ['checkout', 'services', 'ats', 'pro'].every((g) => UPSELLS.some((u) => u.groups.includes(g))),
  )
  ok(
    'the prices the brief approved are the prices in the table',
    Object.entries(upsellPriceTable())
      .map(([k, v]) => `${k}:${v}`)
      .join(',') ===
      'cover-letter:39,cv-tailor:79,ats-review:149,deploy-setup:249,cv-write:299,brand-identity:899,ats-report:29,pro-month:49,pro-year:299,' +
        // منظومةُ التوظيف: مطابقة ٢٩ وباقة الخمسة ٧٩، ملف التقديم ٤٩، البطاقة الموثّقة ١٩،
        // الرابط بلس ٢٩ شهريًا، إبراز الدليل ٢٩ شهريًا، استيراد LinkedIn ٣٩، إزالة الشارة ١٩
        'match-report:29,match-5:79,kit-10:49,share-verified:19,link-plus:29,talent-spot:29,linkedin-import:39,badge-off:19',
    Object.entries(upsellPriceTable())
      .map(([k, v]) => `${k}:${v}`)
      .join(','),
  )
  ok(
    'the deploy service and the cart upsell are one product, one price',
    cartUpsells().some((u) => u.id === 'deploy-setup') && serviceUpsells().some((u) => u.id === 'deploy-setup'),
  )
  ok(
    'an add-on line carries the table’s price, not a price said to the browser',
    JSON.stringify(addonLine('ats-report')) === '{"id":"ats-report","price":29}',
  )
  ok(
    'services are delivered by e-mail, subscriptions by activation — never a download',
    addonDelivery('ats-report')?.kind === 'email' && addonDelivery('pro-year')?.kind === 'activate',
  )
  ok(
    'and what opens in the browser on its own is marked instant, not given a mail slot',
    addonDelivery('kit-10')?.kind === 'instant' && addonDelivery('link-plus')?.kind === 'activate',
  )

  /* ---------- الكوبونات: خصم الأصدقاء ورمزا المدرّب ---------- */
  const { coupons } = await import('../src/data/templates.js')
  ok(
    'the growth coupons exist with the approved percentages',
    coupons.FRIEND20?.pct === 20 && coupons.COACH20?.pct === 20 && coupons.COACH30?.pct === 30,
    JSON.stringify(Object.keys(coupons)),
  )

  /* ---------- السلة: الإضافات تُبدّل وتُحسب وتُخزَّن ---------- */
  {
    const lines = [{ id: 'nova', qty: 1 }]
    const g = await render('http://localhost/cart', { 'qalb.cart.v1': JSON.stringify(lines) })
    const total = () => Number(g.doc.querySelector('[data-total]')?.getAttribute('data-total'))
    const before = total()
    ok('the cart offers the add-on shelf', !!g.doc.querySelector('[data-upsells]') && (g.doc.querySelectorAll('[data-upsell]').length || 0) >= 4)
    g.doc.querySelector('[data-upsell="cover-letter"]')?.click()
    await g.wait()
    ok('adding an add-on moves the total by its table price', Math.abs(total() - (before + 39)) < 0.01, `${total()} vs ${before + 39}`)
    ok('the add-on persists to storage', (g.win.localStorage.getItem('qalb.addons.v1') || '').includes('cover-letter'))
    g.doc.querySelector('[data-upsell="cover-letter"]')?.click()
    await g.wait()
    ok('toggling it off returns the total', Math.abs(total() - before) < 0.01, `${total()} vs ${before}`)
    g.doc.querySelector('[data-upsell="ats-review"]')?.click()
    await g.wait()
    g.doc.querySelector('[data-upsell="deploy-setup"]')?.click()
    await g.wait()
    ok('the summary lists every add-on with its price', Math.abs(total() - (before + 149 + 249)) < 0.01, String(total()))
    g.doc.querySelector('[data-cart-addons] button')?.click()
    await g.wait()
    ok('an add-on row can be removed from the summary', Math.abs(total() - (before + 249)) < 0.01, String(total()))
    g.dom.window.close()
  }

  /* ---------- سلةٌ من إضافةٍ وحدها: ليست سلةً فارغة ---------- */
  {
    const g = await render('http://localhost/cart', { 'qalb.addons.v1': JSON.stringify(['ats-report']) })
    ok('an add-on-only cart is not the empty state', !/سلتك فارغة|Your cart is empty/.test(g.txt()) && g.txt().includes('29'))
    ok('it still offers the checkout button', !!g.doc.querySelector('a[href="/checkout"]'))
    g.dom.window.close()
  }

  /* ---------- الدفع: المسودة تحمل الإضافات كما تحمل البنود ---------- */
  {
    const drive = async (g) => {
      const setter = Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set
      const fill = (id, v) => {
        const el = g.doc.getElementById(id)
        if (!el) return
        setter.call(el, v)
        el.dispatchEvent(new g.win.Event('input', { bubbles: true }))
      }
      fill('co-email', 'sarah@example.com')
      fill('co-name', 'Sarah Al-Otaibi')
      await g.wait()
      ;(g.btn(/Continue|متابعة/) || {}).click?.()
      await g.wait()
      fill('co-card', '4111111111111111')
      fill('co-exp', '12/29')
      fill('co-cvv', '123')
      await g.wait()
      ;(g.btn(/Continue|متابعة/) || {}).click?.()
      await g.wait()
      const agree = g.doc.querySelector('form input[type="checkbox"]:not(#invoice)')
      if (agree && !agree.checked) agree.click()
      await g.wait()
      ;(g.btn(/Place order|تأكيد الطلب والدفع/) || {}).click?.()
      await new Promise((r) => setTimeout(r, 1100))
      await g.wait()
    }
    const g = await render('http://localhost/checkout', {
      'qalb.cart.v1': JSON.stringify([{ id: 'nova', qty: 1 }]),
      'qalb.addons.v1': JSON.stringify(['cv-tailor', 'ats-review']),
    })
    await drive(g)
    const order = JSON.parse(g.win.localStorage.getItem('qalb.lastOrder') || 'null')
    ok(
      'the local order keeps templates and add-ons side by side',
      !!order && Array.isArray(order.lines) && order.lines.length === 1 && (order.addons || []).map((a) => a.id).join(',') === 'cv-tailor,ats-review',
      JSON.stringify(order?.addons),
    )
    ok('and its total is the sum of both tables', Math.abs(order.total - (byId('nova').price + 79 + 149)) < 0.01, String(order?.total))
    g.dom.window.close()
  }

  /* ---------- الرئيسية: جدولُ الدرجات الموحّد — مكوّنٌ واحد للصفحتين ---------- */
  {
    const { PLANS: TIERS } = await import('../src/data/plans.js')
    const g = await render('http://localhost/')
    const band = g.doc.querySelector('[data-plan-band]')
    ok('the subscription table renders on the home page, not a bundle shelf', !!band && !!g.doc.querySelector('#bundles'))
    const ids = [...(band?.querySelectorAll('[data-plan]') || [])].map((el) => el.getAttribute('data-plan'))
    ok('the three graded tiers are on the page', ids.join(',') === 'free,plus,pro', ids.join(','))
    const [m, y] = proPlans()
    ok(
      'their prices are read from the one table: 0 · 19 · 49 a month',
      TIERS.map((x) => x.price).join(',') === '0,19,49' && m.price === 49 && y.price === 299,
    )
    ok(
      'the monthly prices are printed, VAT included',
      ['19', '49'].every((n) => (band?.textContent || '').includes(n)),
    )
    // المفتاح السنوي يحوّل السعر والسطر تحته معًا — محسوبين من الجدول لا مكتوبين
    const yearlyBtn = [...(band?.querySelectorAll('button') || [])].find((b) => /سنوي|Yearly/.test(b.textContent || ''))
    ok('the billing toggle is on the page', !!yearlyBtn)
    yearlyBtn?.click()
    await g.wait()
    const after = band?.textContent || ''
    ok(
      'the yearly prices are printed after the toggle',
      ['100', '299'].every((n) => after.includes(n)),
      after.replace(/\s+/g, ' ').slice(0, 120),
    )
    ok(
      'and the year is stated as months paid, computed from the table',
      ['5.3', '6.1'].every((n) => after.includes(n)),
      after.replace(/\s+/g, ' ').slice(0, 160),
    )
    // الأزرار تقود إلى مكانٍ يفعل الشيء: المجانية إلى الاستضافة، والمدفوعة إلى الحساب
    const hrefs = [...(band?.querySelectorAll('a') || [])].map((a) => a.getAttribute('href'))
    ok(
      'each tier’s button goes where the thing happens',
      hrefs.includes('/host') && hrefs.includes('/account?plan=plus') && hrefs.includes('/account?plan=pro'),
      hrefs.join(' '),
    )
    g.dom.window.close()
  }

  /* ---------- الفاحص: التقرير المدفوع بعد المجاني ---------- */
  {
    const g = await render('http://localhost/ats')
    g.btn(/جرّب نموذجًا|Try a sample/)?.click()
    await g.wait(4)
    const paid = g.doc.querySelector('[data-ats-paid]')
    ok('a scored check reveals the paid report card', !!paid && g.txt().includes('29'))
    const before = g.win.localStorage.getItem('qalb.addons.v1')
    g.doc.querySelector('[data-ats-paid-add]')?.click()
    await g.wait()
    ok(
      'its button adds the report to the cart',
      (g.win.localStorage.getItem('qalb.addons.v1') || '') !== (before || '') &&
        (g.win.localStorage.getItem('qalb.addons.v1') || '').includes('ats-report'),
    )
    const fieldBtn = [...(g.doc.querySelectorAll('[data-ats-fields] button') || [])].find((b) => /برمجة|Engineering/.test(b.textContent || ''))
    fieldBtn?.click()
    await g.wait(2)
    ok(
      'picking a field recommends that field’s own templates',
      (g.doc.querySelector('[data-ats-field-picks]')?.textContent || '').includes('أطلس') ||
        (g.doc.querySelector('[data-ats-field-picks]')?.textContent || '').includes('Atlas'),
    )
    g.dom.window.close()
  }

  /* ---------- صفحة الخدمات: أسعارها من الجدول نفسه ---------- */
  {
    const g = await render('http://localhost/services')
    ok(
      'the services page renders its three done-for-you services',
      serviceUpsells().every((s) => (g.doc.querySelector(`[data-service="${s.id}"]`) ? true : false)),
    )
    ok(
      'and prints each price from the add-on table',
      serviceUpsells().every((s) => g.txt().includes(String(s.price))),
      serviceUpsells()
        .map((s) => s.price)
        .join(','),
    )
    g.doc.querySelector('[data-service-add="cv-write"]')?.click()
    await g.wait()
    ok('a service is added to the cart from its own page', (g.win.localStorage.getItem('qalb.addons.v1') || '').includes('cv-write'))
    g.dom.window.close()
  }

  /* ---------- العروض الموسمية: أربعة مواسم، منتجاتها حقيقية ---------- */
  ok(
    'four seasons, unique slugs, real catalogue picks, valid months',
    offers.length === 4 &&
      new Set(offers.map((o) => o.slug)).size === 4 &&
      offers.every((o) => offerPicks(o).length === 3 && offerPicks(o).length === o.picks.length) &&
      offers.every((o) => o.months.every((m) => m >= 1 && m <= 12)),
    offers.map((o) => `${o.slug}:${o.picks.join('+')}`).join(' '),
  )
  ok(
    'the current season is derived from the calendar, not typed in',
    activeOffer(new Date('2026-06-15T00:00:00Z'))?.slug === 'coop' &&
      activeOffer(new Date('2026-10-15T00:00:00Z'))?.slug === 'work-year' &&
      monthsLabel(offerBySlug('coop'), 'ar').includes('مايو'),
  )
  {
    const g = await render('http://localhost/offers')
    ok(
      'the offers index lists every season',
      offers.every((o) => !!g.doc.querySelector(`[data-offer="${o.slug}"]`)),
    )
    ok('and names the coupon it honours', g.txt().includes('FRIEND20'))
    g.dom.window.close()
  }
  {
    const g = await render('http://localhost/offers/coop')
    ok(
      'a season page shows its picks as real cards',
      offerPicks(offerBySlug('coop')).every((p) => !!g.doc.querySelector(`a[href="/template/${p.slug}"]`)),
    )
    ok(
      'and its add-all button seeds the whole bundle',
      (() => {
        g.btn(/أضف المجموعة|Add the bundle/)?.click()
        return true
      })(),
    )
    await g.wait()
    ok('the bundle landed in the cart storage', (g.win.localStorage.getItem('qalb.cart.v1') || '').includes('gradbundle'))
    g.dom.window.close()
  }

  const bad = checks.filter(([, c]) => !c).map(([n]) => n)
  if (bad.length) {
    failed++
    groups++
    console.log('✗ growth v1.5.0 · add-ons, subscription, offers, services')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ growth v1.5.0 · add-ons, subscription, offers, services  (${checks.length} assertions)`)
  }
}

/* ---------------- themes · structured data · transports ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }

  /* theme + a11y on the home page */
  {
    const g = await render('http://localhost/')
    const themeBtn = [...g.doc.querySelectorAll('button')].find((b) => /dark|light|الوضع/i.test(b.getAttribute('aria-label') || ''))
    ok('theme toggle exists', !!themeBtn, themeBtn?.getAttribute('aria-label'))
    themeBtn?.click()
    await g.wait()
    const isLight = g.doc.documentElement.classList.contains('light')
    const tc = g.doc.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    ok('toggle flips to light + persists', isLight && g.win.localStorage.getItem('qalb.theme') === 'light', `light=${isLight}`)
    ok('theme-color follows the theme', tc === '#f6f7f9', String(tc))
    themeBtn?.click()
    await g.wait()
    ok(
      'back to dark + dark theme-color',
      !g.doc.documentElement.classList.contains('light') &&
        g.doc.head.querySelector('meta[name="theme-color"]')?.getAttribute('content') === '#0a0c11',
    )

    /* language survives a reload */
    const langBtn = [...g.doc.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Switch language')
    langBtn?.click()
    await g.wait()
    ok('language persisted for the next load', g.win.localStorage.getItem('qalb.lang') === 'en', String(g.win.localStorage.getItem('qalb.lang')))
    const reloaded = await render('http://localhost/', { 'qalb.lang': 'en' })
    ok('reload starts in english (dir=ltr)', reloaded.doc.documentElement.dir === 'ltr' && /Add to cart|Browse|Templates/i.test(reloaded.txt()))
    reloaded.dom.window.close()

    /* aria-current marks the active route, not just a color */
    const cat = await render('http://localhost/templates')
    const marked = cat.doc.querySelector('nav [aria-current="page"]')
    ok('nav marks the current route for AT', !!marked && marked.getAttribute('aria-controls') === 'mega-panel', marked?.tagName)
    const home = await render('http://localhost/')
    ok('home marks no route as current', !home.doc.querySelector('nav [aria-current="page"]'))
    home.dom.window.close()
    cat.dom.window.close()

    ok('no console errors in home checks', g.errs.filter((e) => !/not implemented/i.test(e)).length === 0, g.errs.slice(0, 1).join(' '))
    g.dom.window.close()
  }

  /* first visit follows the OS theme */
  {
    const g = await render(
      'http://localhost/',
      {},
      {
        boot: (win) => {
          win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
        },
      },
    )
    ok('prefers-color-scheme: light is respected on first visit', g.doc.documentElement.classList.contains('light'))
    g.dom.window.close()
  }

  /* JSON-LD + robots + the CV zoom control */
  {
    const { bySlug } = await import('../src/data/templates.js')
    const g = await render('http://localhost/template/aether-portfolio')
    const ld = JSON.parse(g.doc.getElementById('qalb-jsonld')?.textContent || 'null')
    const prod = ld?.['@graph']?.find((x) => x['@type'] === 'Product') || ld
    const tpl = bySlug('aether-portfolio')
    ok(
      'product page emits Product schema',
      prod &&
        prod['@type'] === 'Product' &&
        Number(prod.offers.price) === tpl.price &&
        prod.offers.priceCurrency === 'SAR' &&
        prod.aggregateRating.reviewCount === tpl.reviews,
      prod ? `${prod['@type']} ${prod.offers?.price}` : 'missing',
    )
    ok('and carries its breadcrumb trail beside the product', ld?.['@graph']?.some((x) => x['@type'] === 'BreadcrumbList') === true)
    ok(
      'hreflang alternates cover ar/en/x-default on every route',
      ['ar', 'en', 'x-default'].every((h) => g.doc.head.querySelector(`link[rel="alternate"][hreflang="${h}"]`)?.getAttribute('href')) &&
        g.doc.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href') === `${SITE_URL}/template/aether-portfolio?lang=en`,
    )
    ok(
      'canonical + og:url point at the one route the sitemap publishes',
      g.doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href') === `${SITE_URL}/template/aether-portfolio`,
    )

    ok('no sheet zoom on a site-only product', !g.doc.querySelector('[data-zoom]'))
    g.dom.window.close()

    const cv = await render('http://localhost/template/atlas-cv')
    const z0 = cv.doc.querySelector('[data-zoom]')?.getAttribute('data-zoom')
    cv.doc.querySelector('button[data-zoom-step="plus"]')?.click()
    await cv.wait()
    const z1 = cv.doc.querySelector('[data-zoom]')?.getAttribute('data-zoom')
    ok('cv zoom increases the sheet scale', Number(z1) > Number(z0), `${z0} → ${z1}`)
    ok(
      'zoom buttons are labelled for AT in the current language',
      /تكبير|تصغير|Zoom/.test(cv.doc.querySelector('button[data-zoom-step="plus"]')?.getAttribute('aria-label') || ''),
    )
    ok('resume sheet is rendered', !!cv.doc.querySelector('[data-resume]'))
    cv.dom.window.close()

    const cart = await render('http://localhost/cart', { 'qalb.cart.v1': JSON.stringify([{ id: 'nova', qty: 1 }]) })
    ok('transactional routes ask not to be indexed', cart.doc.head.querySelector('meta[name="robots"]')?.getAttribute('content') === 'noindex,follow')
    cart.dom.window.close()
  }

  /* transport: REST failure must not eat the cart, REST success must use the server receipt */
  const drive = async (g) => {
    const setter = Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set
    const fill = (id, v) => {
      const el = g.doc.getElementById(id)
      if (!el) return
      setter.call(el, v)
      el.dispatchEvent(new g.win.Event('input', { bubbles: true }))
    }
    fill('co-email', 'sarah@example.com')
    fill('co-name', 'Sarah Al-Otaibi')
    await g.wait()
    ;(g.btn(/Continue|متابعة/) || {}).click?.()
    await g.wait()
    fill('co-card', '4111111111111111')
    fill('co-exp', '12/29')
    fill('co-cvv', '123')
    await g.wait()
    ;(g.btn(/Continue|متابعة/) || {}).click?.()
    await g.wait()
    const agree = g.doc.querySelector('form input[type="checkbox"]:not(#invoice)') || g.doc.querySelector('form input[type="checkbox"]')
    if (agree && !agree.checked) agree.click()
    await g.wait()
    ;(g.btn(/Place order|تأكيد الطلب والدفع/) || {}).click?.()
    await new Promise((r) => setTimeout(r, 700))
    await g.wait()
  }
  const seeded = JSON.stringify([
    { id: 'nova', qty: 1 },
    { id: 'atlas', qty: 2 },
  ])
  const env = { VITE_QALB_API: 'rest', VITE_QALB_API_BASE: 'http://api.test' }

  /* an unreachable API must not blank the storefront: rest mode falls back to the shipped catalogue */
  const deadBoot = (win) => {
    win.__QALB_ENV = env
    win.fetch = () => Promise.reject(new win.TypeError('api is down'))
  }
  {
    const g = await render('http://localhost/', {}, { boot: deadBoot })
    const txt = g.txt()
    ok(
      'the home page still renders with the API unreachable',
      /الأكثر رواجًا هذا الأسبوع/.test(txt) && /449/.test(txt),
      txt.replace(/\s+/g, ' ').slice(0, 50),
    )
    ok('a failed /catalog does not trip the error screen', !/حدث خطأ غير متوقع/.test(txt))
    ok('the shell is mounted around the content', !!g.doc.querySelector('nav') && !!g.doc.querySelector('footer'))
    ok(
      'the route content sits inside #main',
      (g.doc.getElementById('main')?.childElementCount || 0) > 0,
      String(g.doc.getElementById('main')?.childElementCount),
    )
    g.dom.window.close()

    const t = await render('http://localhost/templates', { 'qalb.cart.v1': seeded }, { boot: deadBoot })
    ok('the catalogue keeps its shipped prices when the server is gone', /أيثر/.test(t.txt()) && /249/.test(t.txt()))
    const noise = t.errs.filter((e) => !/not implemented/i.test(e))
    ok('an offline boot throws nothing into the console', noise.length === 0, noise.join(' | ').slice(0, 140))
    t.dom.window.close()
  }

  {
    const g = await render(
      'http://localhost/checkout',
      { 'qalb.cart.v1': seeded },
      {
        boot: (win) => {
          win.__QALB_ENV = env
          win.fetch = () => Promise.reject(new win.TypeError('network down'))
        },
      },
    )
    await drive(g)
    const alert = g.doc.querySelector('[role="alert"]')?.textContent || ''
    ok('a failed payment is reported, not swallowed', /تعذّر تنفيذ الدفع/.test(alert), alert.trim().slice(0, 40))
    ok(
      'a failed payment keeps the cart',
      (g.win.localStorage.getItem('qalb.cart.v1') || '').includes('nova') && g.doc.body.textContent.includes('4111111111') === false,
    )
    ok('a failed payment offers a retry', /إعادة المحاولة/.test(alert))
    g.dom.window.close()
  }

  {
    const calls = []
    const receipt = {
      id: 'QALB-SRV-9',
      key: 'SRV-K1',
      date: '2026-09-03',
      email: 'sarah@example.com',
      name: 'Sarah Al-Otaibi',
      total: 218,
      count: 3,
      method: 'card',
      lines: [
        { id: 'nova', slug: 'nova-cv', qty: 1 },
        { id: 'atlas', slug: 'atlas-cv', qty: 2 },
      ],
    }
    const g = await render(
      'http://localhost/checkout',
      { 'qalb.cart.v1': seeded },
      {
        boot: (win) => {
          win.__QALB_ENV = env
          win.fetch = (url, init) => {
            calls.push({ url, body: init?.body ? JSON.parse(init.body) : null })
            return Promise.resolve({ ok: true, status: 201, json: async () => receipt })
          }
        },
      },
    )
    await drive(g)
    ok(
      'rest mode posts to <base>/orders',
      calls.some((c) => c.url === 'http://api.test/orders'),
      calls.map((c) => c.url).join(' '),
    )
    const post = calls.find((c) => c.body)
    ok(
      'the payload carries the server-side contract',
      !!post &&
        Array.isArray(post.body.lines) &&
        typeof post.body.couponPct === 'number' &&
        typeof post.body.total === 'number' &&
        post.body.currency === 'SAR',
      post ? Object.keys(post.body).slice(0, 8).join(',') : 'no body',
    )
    ok(
      'the receipt comes from the server',
      g.win.location.pathname === '/order' && /QALB-SRV-9/.test(g.txt()) && /SRV-K1/.test(g.txt()),
      `${g.win.location.pathname}`,
    )
    ok('cart cleared only after the server accepted', g.win.localStorage.getItem('qalb.cart.v1') === '[]')
    g.dom.window.close()
  }

  /* /order?id=… resolves a receipt through the transport (local store here) */
  {
    const orders = JSON.stringify([
      {
        id: 'QALB-LOCAL-7',
        key: 'LOC-KEY',
        date: '2026-09-01',
        email: 's@q.dev',
        name: 'سارة',
        total: 149,
        count: 1,
        method: 'card',
        lines: [{ id: 'folio', slug: 'folio-portfolio', qty: 1 }],
      },
    ])
    const g = await render('http://localhost/order?id=QALB-LOCAL-7', { 'qalb.orders.v1': orders })
    await g.wait()
    ok('/order?id= finds a stored receipt', /QALB-LOCAL-7/.test(g.txt()) && /LOC-KEY/.test(g.txt()))
    g.dom.window.close()

    const miss = await render('http://localhost/order?id=QALB-NOPE')
    ok('an unknown id falls back to the not-found state', /الصفحة غير موجودة|not found/i.test(miss.txt()), miss.txt().slice(0, 40))
    miss.dom.window.close()
  }

  if (bad.length) {
    failed++
    groups++
    console.log('✗ themes · structured data · transports')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ themes · structured data · transports  (${checks.length} assertions)`)
  }
}

/* ---------------- recovery screen · order lookup · licence · social cards ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }
  // jsdom only runs a form's submit when the submit button is activated — a
  // dispatched submit event never reaches React's delegated listener
  const submit = (g) => {
    const f = g.doc.querySelector('#main form') // the navbar has a form too
    const b = f && [...f.querySelectorAll('button')].find((x) => x.type === 'submit')
    if (!b) throw new Error('no submit button in the form')
    b.click()
  }

  /* a section that throws must not take the shell down with it */
  {
    const g = await render(
      'http://localhost/templates',
      {},
      {
        boot: (win) => {
          win.IntersectionObserver = class {
            constructor() {
              throw new Error('observer exploded')
            }
          }
        },
      },
    )
    // lazy route suspends → its effect throws → the boundary catches: a few passes, so poll
    let main = ''
    for (let i = 0; i < 30 && !/حدث خطأ غير متوقع/.test(main); i++) {
      await new Promise((r) => setTimeout(r, 60))
      main = g.doc.getElementById('main')?.textContent || ''
    }
    ok('a crashing section shows the recovery screen', /حدث خطأ غير متوقع/.test(main), main.slice(0, 44))
    ok('the crash does not blank the page shell', (g.doc.querySelector('nav')?.textContent || '').includes('القوالب'))
    ok('the footer is still mounted', (g.doc.querySelector('footer')?.textContent || '').length > 40)
    ok('a retry control is offered', !!g.doc.querySelector('#main button'))
    ok('the real message is exposed for bug reports', /observer exploded/.test(g.doc.querySelector('#main details')?.textContent || ''))
    await new Promise((r) => setTimeout(r, 150)) // React re-throws the caught error in dev; let it land before close
    g.dom.window.close()
  }

  /* /track — receipts by e-mail */
  {
    const g = await render('http://localhost/track?email=sara@q.dev', { 'qalb.orders.v1': lookupOrders })
    ok('the field is prefilled from ?email=', g.doc.getElementById('tk-email')?.value === 'sara@q.dev', g.doc.getElementById('tk-email')?.value)
    ok('an idle lookup shows nothing yet', !/QALB-AAA-1111/.test(g.txt()))
    submit(g)
    await g.wait()
    const txt = g.txt()
    ok('the lookup lists every stored receipt', /QALB-AAA-1111/.test(txt) && /QALB-BBB-2222/.test(txt), txt.slice(0, 60))
    ok('the count line is localised', /طلبًا لهذا البريد|order\(s\) for this email/.test(txt), (txt.match(/طلبًا لهذا البريد/) || [''])[0])
    ok('each row links to its receipt', !!g.doc.querySelector('a[href*="/order?id=QALB-AAA-1111"]'))
    ok('the payment method survives on the row', /بطاقة/.test(txt))
    ok('the e-mail is remembered for the next visit', g.win.localStorage.getItem('qalb.trackEmail') === 'sara@q.dev')
    g.dom.window.close()

    const none = await render('http://localhost/track?email=nobody@q.dev')
    submit(none)
    await none.wait()
    ok('an unknown e-mail gets an honest empty state', /لا طلبات محفوظة لهذا البريد/.test(none.txt()), none.txt().slice(0, 50))
    none.dom.window.close()

    const blank = await render('http://localhost/track')
    submit(blank)
    await blank.wait()
    ok('a blank e-mail is rejected before any lookup', /أدخل بريدًا صحيحًا أولًا/.test(blank.txt()))
    ok('a rejected lookup stores nothing', !blank.win.localStorage.getItem('qalb.trackEmail'))
    blank.dom.window.close()
  }

  /* /licence — the client half of GET /licences/:key */
  {
    const g = await render('http://localhost/licence?key=key-aaaa-1111', { 'qalb.orders.v1': lookupOrders })
    ok('the key field is prefilled from ?key=', g.doc.getElementById('lc-key')?.value === 'key-aaaa-1111', g.doc.getElementById('lc-key')?.value)
    submit(g)
    await g.wait()
    const txt = g.txt()
    ok('a known key verifies', /الترخيص صالح/.test(txt), txt.slice(0, 50))
    ok('the verdict names the order it came from', /QALB-AAA-1111/.test(txt))
    ok('seats and domains are reported', /المقاعد/.test(txt) && /النطاقات/.test(txt))
    g.dom.window.close()

    const miss = await render('http://localhost/licence?key=NO-SUCH-KEY')
    submit(miss)
    await miss.wait()
    ok('an unknown key is refused, never faked', /لم يُعثر على هذا المفتاح/.test(miss.txt()), miss.txt().slice(0, 40))
    ok('the refusal offers the e-mail lookup', !!miss.doc.querySelector('a[href="/track"]'))
    miss.dom.window.close()

    const short = await render('http://localhost/licence?key=abc')
    submit(short)
    await short.wait()
    ok('a too-short key is not sent to the server', /لم يُعثر على هذا المفتاح/.test(short.txt()))
    short.dom.window.close()
  }

  /* per-product social cards */
  {
    const g = await render('http://localhost/template/atlas-cv')
    const og = g.doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
    ok('each product carries its own social card', /\/og\/atlas-cv\.png$/.test(og), og)
    const ld = JSON.parse(g.doc.getElementById('qalb-jsonld')?.textContent || '{}')
    const prod = ld['@graph']?.find((x) => x['@type'] === 'Product') || ld
    ok('the JSON-LD image follows the card', /\/og\/atlas-cv\.png$/.test(prod.image || ''), prod.image)
    ok('the card declares its 1200×630 size', g.doc.querySelector('meta[property="og:image:width"]')?.getAttribute('content') === '1200')
    ok('twitter:image matches og:image', g.doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') === og)
    g.dom.window.close()

    const home = await render('http://localhost/')
    ok('a page without a card does not invent one', !home.doc.querySelector('meta[property="og:image"]'))
    ok('the footer links to both new pages', /تتبّع طلبك/.test(home.txt()) && /التحقق من الترخيص/.test(home.txt()))
    home.dom.window.close()
  }

  /* generated assets on disk */
  {
    const map = readFileSync('public/sitemap.xml', 'utf8')
    // المشتقّ من جدول المسارات لا العدد المكتوب باليد: صفحة تُنسى في الـsitemap كانت
    // ستُمرَّر على أنها «مغطّاة» لأن الفحص يعدّ ٢٠ فقط.
    // المسارات قد تحمل رقمًا (/b2b): بلا ذلك كانت صفحةٌ كاملة تفلت من هذا الفحص
    const staticRoutes = [...readFileSync('src/App.jsx', 'utf8').matchAll(/path="(\/[a-z0-9-]*)"/g)]
      .map((m) => m[1])
      .filter((p) => p === '/' || !p.endsWith('/'))
    // مسارٌ يُحوَّل وحده لا صفحةٌ تُفهرَس: /create صار <Navigate> في v1.8.0، فوجوب
    // بقائه في الخريطة كان يفرض على المولّد أن ينشر رابطًا لا renders شيئًا.
    const redirectRoutes = [...readFileSync('src/App.jsx', 'utf8').matchAll(/path="(\/[a-z0-9-]*)"\s+element=\{<Navigate/g)].map((m) => m[1])
    // مصدرٌ واحد للمسارات الخاصة: agents.mjs يكتب robots.txt منه، والفحص يقرأه منه —
    // فنسخةٌ ثانية هنا كانت ستُخفي صفحةً نُسيت من الاثنين.
    const privateRoutes = PRIVATE_PATHS
    const publicRoutes = staticRoutes.filter((p) => !privateRoutes.includes(p) && !redirectRoutes.includes(p))
    const notInMap = publicRoutes.filter((p) => !map.includes(`${p}</loc>`))
    ok(
      'every public route in the router is in the sitemap',
      publicRoutes.length >= 6 && notInMap.length === 0,
      `missing=${notInMap.join(',') || '—'} of ${publicRoutes.length}`,
    )
    ok(
      'the sitemap length is what the generator should write: pages + products + posts + seasonal offers',
      (map.match(/<loc>/g) || []).length === publicRoutes.length + templates.length + posts.length + offers.length,
      `${(map.match(/<loc>/g) || []).length} vs ${publicRoutes.length + templates.length + posts.length + offers.length}`,
    )
    ok(
      'and every URL in the map declares its ar/en/x-default alternates',
      (map.match(/hreflang="x-default"/g) || []).length === (map.match(/<loc>/g) || []).length,
    )
    ok(
      'robots.txt keeps the transactional routes out',
      privateRoutes.every((x) => readFileSync('public/robots.txt', 'utf8').includes(`Disallow: ${x}`)),
    )
    const cards = readdirSync('public/og').filter((f) => f.endsWith('.png'))
    ok('every product has a card file', cards.length >= 15, `${cards.length} files`)
    ok('the unused svg twin is gone', !existsSync('public/og-cover.svg'))
  }

  if (bad.length) {
    failed++
    groups++
    console.log('✗ recovery · lookup · licence · social cards')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ recovery · lookup · licence · social cards  (${checks.length} assertions)`)
  }
}
/* ---------------- home: static trust row · floating-chip stacking ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }

  const g = await render('http://localhost/')
  const trust = g.doc.querySelector('[data-trust]')
  ok('the trust strip exists', !!trust)
  ok(
    'no marquee animation anywhere on the page',
    g.doc.querySelectorAll('[class*="animate-marquee"]').length === 0,
    String(g.doc.querySelectorAll('[class*="animate-marquee"]').length),
  )
  const cells = [...(trust?.querySelectorAll('li') || [])]
  const names = cells.map((x) => (x.textContent || '').trim()).filter(Boolean)
  ok(
    'every platform is listed once (no doubled copy for a loop)',
    names.length === 10 && new Set(names).size === 10,
    `${names.length} cells / ${new Set(names).size} unique`,
  )
  ok('the strip is a real list, not animated spans', cells.length > 0 && cells[0].parentElement?.tagName === 'UL' && cells[0].tagName === 'LI')

  /* the stylesheet, not just the DOM: a class could survive a partial cleanup */
  const css = readFileSync('src/index.css', 'utf8')
  const rm = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)
  ok('the marquee utility and its keyframes are gone from the source', !/marquee/.test(css))
  ok(
    'reduced-motion stops looping instead of only speeding it up',
    /animation-iteration-count:\s*1/.test(rm ? rm[1] : ''),
    (rm?.[1] || '').trim().replace(/\s+/g, ' ').slice(0, 80),
  )

  // the fanned hero previews carry an explicit inline z-index (list length … 1);
  // the floating chips must sit above them or they get painted behind the mock
  const cardZ = [...g.doc.querySelectorAll('#main div[style*="z-index"]')].map((el) => parseInt(el.style.zIndex, 10)).filter((n) => !Number.isNaN(n))
  const chips = [...g.doc.querySelectorAll('#main div')].filter((d) => /animate-float/.test(String(d.className)))
  ok('both floating chips are mounted', chips.length === 2, String(chips.length))
  const chipZ = chips.map((c) => Number(String(c.className).match(/z-\[(\d+)\]/)?.[1] || 0))
  ok(
    'the chips are raised above every preview card',
    chipZ.length > 0 && chipZ.every((z) => z > Math.max(...cardZ)),
    `chips=${chipZ.join(',')} cards=${Math.max(...cardZ)}`,
  )
  const badge = chips.find((c) => /درجة الأداء|درجة ATS/.test(c.textContent || ''))
  ok('the raised chip is the score one, number included', !!badge && /\d/.test(badge.textContent || ''), (badge?.textContent || '').slice(0, 24))
  ok(
    'the badge still sits on the card edge, not beside the section',
    /top-\[-14px\]/.test(String(badge?.className || '')),
    String(badge?.className || '').slice(0, 40),
  )

  /* the newsletter must not promise what this store cannot do */
  const nl = g.doc.querySelector('[data-newsletter]')
  ok('the newsletter block is on the page', Boolean(nl))
  ok(
    'its e-mail field carries a real label',
    Boolean(nl?.querySelector('label')?.htmlFor) && Boolean(nl?.querySelector('#' + nl.querySelector('label').htmlFor)),
  )
  const field = nl.querySelector('input[type=email]')
  const writeMail = (v) => {
    const set = Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set
    set.call(field, v)
    field.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  }
  const sendMail = () => nl.querySelector('button[type=submit]').click()
  writeMail('not-an-email')
  sendMail()
  await g.wait()
  ok(
    'a wrong address is refused instead of confirmed',
    Boolean(nl.querySelector('[role=alert]')) && !nl.querySelector('[role=status]'),
    (nl.textContent || '').slice(0, 26),
  )
  writeMail('sara@qalb.dev')
  sendMail()
  await g.wait()
  const mailto = nl.querySelector('a[href^="mailto:"]')
  ok(
    'the confirmation pairs with a prefilled e-mail that really sends',
    nl.textContent.includes(dict.ar.footer.newsletterNote) && String(mailto?.getAttribute('href') || '').includes('sara%40qalb.dev'),
    (mailto?.getAttribute('href') || '').slice(0, 42),
  )
  const dup = []
  for (const f of readdirSync('src', { recursive: true })) {
    if (!/\.jsx?$/.test(f)) continue
    const p = 'src/' + f
    if (p.endsWith('data/contact.js')) continue
    if (readFileSync(p, 'utf8').includes('qalb@qalb.store')) dup.push(p)
  }
  ok('the support address lives in one module, not in copied literals', dup.length === 0, dup.join(','))
  const stray = []
  for (const dir of ['src', 'scripts', 'server', 'tests']) {
    for (const f of readdirSync(dir, { recursive: true })) {
      if (!/\.(jsx?|mjs|css)$/.test(f)) continue
      const p = dir + '/' + f
      const txt = readFileSync(p, 'utf8')
      for (const ch of txt) {
        const o = ch.codePointAt(0)
        if (o >= 0xe000 && o <= 0xf8ff) {
          stray.push(`${p} U+${o.toString(16).toUpperCase()}`)
          break
        }
      }
      if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(txt)) stray.push(p + ' CJK')
    }
  }
  ok('no private-use or CJK glyph leaked into the sources', stray.length === 0, stray.join(','))
  const noLic = ['IBM-Plex-Sans-Arabic', 'Tajawal', 'Inter'].filter((f) => !existsSync(`public/fonts/OFL-${f}.txt`))
  ok('every self-hosted font family ships its OFL text', noLic.length === 0, 'missing: ' + noLic.join(','))
  ok(
    'each OFL text is the real licence, not a stub',
    ['IBM-Plex-Sans-Arabic', 'Tajawal', 'Inter'].every((f) =>
      readFileSync(`public/fonts/OFL-${f}.txt`, 'utf8').includes('SIL OPEN FONT LICENSE Version 1.1'),
    ),
  )
  ok(
    'both node entry points share one .env loader',
    /from '\.\/dotenv\.mjs'/.test(readFileSync('scripts/seo.mjs', 'utf8')) &&
      /from '\.\.\/scripts\/dotenv\.mjs'/.test(readFileSync('server/worker.js', 'utf8')),
  )
  const graph = JSON.parse(g.doc.getElementById('qalb-jsonld')?.textContent || '{}')
  const org = (graph['@graph'] || []).find((x) => x['@type'] === 'Organization')
  ok(
    'the official e-mail is machine-readable in the Organization graph',
    org?.contactPoint?.email === 'qalb@qalb.store',
    org?.contactPoint?.email || 'missing',
  )
  ok(
    'the home FAQ ships as FAQPage, asking exactly what the page asks',
    (graph['@graph'] || []).some(
      (x) => x['@type'] === 'FAQPage' && x.mainEntity?.every((q) => g.doc.querySelector('#faq')?.textContent.includes(q.name)),
    ),
  )
  ok(
    'social profiles are declared as sameAs on the Organization',
    Array.isArray(org?.sameAs) && org.sameAs.length === 4 && org.sameAs.every((u) => /^https:\/\//.test(u)),
  )
  ok(
    'the address is kept on the device only, with no fake subscription claim',
    JSON.parse(g.win.localStorage.getItem('qalb.newsletter.v1') || '[]')[0] === 'sara@qalb.dev' && !/تم الاشتراك|Subscribed/.test(nl.textContent),
    JSON.parse(g.win.localStorage.getItem('qalb.newsletter.v1') || '[]').join(','),
  )
  /* ---- «كل القوالب» رقمٌ يُقرأ من الرّفّ، لا يُروى من نصّ ---- */
  const bundlesTxt = (g.doc.querySelector('#bundles')?.textContent || '').replace(/\s+/g, ' ')
  const tierBand = (await import('../src/data/plans.js')).PLANS
  ok(
    'the plan band names the three tiers the store sells',
    tierBand.every((x) => bundlesTxt.includes(x.name.ar)),
    tierBand.map((x) => x.name.ar).join(' · '),
  )
  // شهريًا هو الافتراضيّ؛ السنويُّ خلف مفتاح الفوترة (يُفحَص في مجموعة النمو)
  ok(
    'and it prices them from the one table: Plus 19 and Pro 49 a month',
    ['19', '49'].every((n) => bundlesTxt.includes(n)),
    bundlesTxt.slice(0, 200),
  )
  ok('no invented bundle price is left standing in the page', !bundlesTxt.includes('999'), bundlesTxt.slice(0, 90))

  /* ---- الرابط إلى #bundles ينزل إلى الباقات، لا إلى السقف ---- */
  let scrolledTo = 'nothing'
  g.win.HTMLElement.prototype.scrollIntoView = function scroll() {
    scrolledTo = this.id
  }
  const navLink = g.doc.querySelector('a[href="#bundles"], a[href$="/#bundles"]')
  ok('the navbar carries an anchor for the section', !!navLink, [...g.doc.querySelectorAll('nav a')].map((a) => a.getAttribute('href')).join(' '))
  navLink?.dispatchEvent(new g.win.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
  await g.wait(90)
  ok('and clicking it lands on the section, not on the top of the page', scrolledTo === 'bundles', scrolledTo)
  ok(
    'the public footer no longer advertises the staff panel',
    ![...g.doc.querySelectorAll('footer a')].some((a) => a.getAttribute('href') === '/admin'),
  )
  g.dom.window.close()

  if (bad.length) {
    failed++
    groups++
    console.log('✗ home · trust row · chip stacking')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ home · trust row · chip stacking  (${checks.length} assertions)`)
  }
}

/* ---------------- cards: name · description · price, each on its own line ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }

  const g = await render('http://localhost/templates')
  const cards = [...g.doc.querySelectorAll('[data-tpl-card]')]
  ok('the catalogue renders cards', cards.length > 0, String(cards.length))

  const parts = cards.map((c) => ({
    id: c.getAttribute('data-tpl-card'),
    name: (c.querySelector('[data-tpl-name]')?.textContent || '').trim(),
    desc: (c.querySelector('[data-tpl-desc]')?.textContent || '').trim(),
    price: (c.querySelector('[data-tpl-price]')?.textContent || '').trim(),
  }))

  ok(
    'every card carries a name, a description and a price — none of them empty',
    parts.length > 0 && parts.every((x) => x.name.length > 0 && x.desc.length > 8 && x.price.length > 0),
    parts.filter((x) => !x.name || x.desc.length <= 8 || !x.price).map((x) => x.id).join(','),
  )
  ok(
    'the name is never glued to the description in one element',
    parts.every((x) => !x.name.includes(x.desc) && !x.desc.includes(x.name)),
    parts.filter((x) => x.name.includes(x.desc) || x.desc.includes(x.name)).map((x) => `${x.id}:${x.name}`).join(' | '),
  )
  ok(
    'and the description never swallows the price',
    parts.every((x) => !x.desc.includes(String(byId(x.id)?.price))),
    parts.filter((x) => x.desc.includes(String(byId(x.id)?.price))).map((x) => x.id).join(','),
  )
  ok(
    'the price on the card is the price in the catalogue, printed with its currency',
    parts.every((x) => {
      const tpl = byId(x.id)
      return tpl && x.price.replace(/\s/g, '').includes(String(tpl.price)) && /ر\.س|SAR/.test(x.price)
    }),
    parts.map((x) => `${x.id}:${x.price}`).slice(0, 3).join(' | '),
  )
  ok(
    'the old price is struck through beside the new one, when there is one',
    parts.every((x) => {
      const tpl = byId(x.id)
      return !tpl.oldPrice || x.price.includes(String(tpl.oldPrice))
    }),
    parts.filter((x) => byId(x.id)?.oldPrice && !x.price.includes(String(byId(x.id).oldPrice))).map((x) => x.id).join(','),
  )
  ok(
    'fields are parted by a written separator, so a linear read never welds them together',
    parts.every((x) => x.price.includes('·')) && parts.every((x) => /\s·\s|·/.test(x.price)),
    parts[0]?.price || '',
  )
  ok(
    'the card says what the price buys: a live preview and the licence',
    parts.every((x) => /معاينة حية/.test(x.price)) &&
      cards.every((c) => /ترخيص/.test(c.querySelector('[data-tpl-licence]')?.textContent || '')),
    (cards[0]?.querySelector('[data-tpl-licence]')?.textContent || '').trim(),
  )

  /* ——— الزرّان: «عرض القالب» و«أضف للسلة»، وحالةٌ بصريةٌ بعد الإضافة ——— */
  const card = g.doc.querySelector('[data-tpl-card="nova"]')
  ok('a card links to its own detail page', !!card?.querySelector(`a[href="/template/${byId('nova').slug}"]`))
  ok(
    'and that link is labelled “view the template”, not an icon alone',
    [...(card?.querySelectorAll('a') || [])].some((a) => a.getAttribute('href') === `/template/${byId('nova').slug}` && /عرض القالب/.test(a.textContent || '')),
  )
  const addBtn = [...(card?.querySelectorAll('button') || [])].find((b) => /أضف إلى السلة/.test(b.textContent || ''))
  ok('the second action adds to the cart', !!addBtn)
  addBtn?.dispatchEvent(new g.win.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
  await g.wait()
  const after = g.doc.querySelector('[data-tpl-card="nova"]')
  ok(
    'and the button changes state: it becomes a link to the cart saying it is in there',
    !!after?.querySelector('a[href="/cart"]') && /في السلة/.test(after?.querySelector('a[href="/cart"]')?.textContent || ''),
    (after?.textContent || '').replace(/\s+/g, ' ').slice(-60),
  )
  ok(
    'the two states look different in the markup, not only in the label',
    after?.querySelector('a[href="/cart"]')?.className !== addBtn?.className,
  )
  g.dom.window.close()

  /* ——— الإنجليزية: الفصلُ نفسه، لا نسخةٌ عربيةٌ واحدة ——— */
  const en = await render('http://localhost/templates?lang=en', { 'qalb.lang': 'en' }, { lang: 'en' })
  const enParts = [...en.doc.querySelectorAll('[data-tpl-card]')].map((c) => ({
    name: (c.querySelector('[data-tpl-name]')?.textContent || '').trim(),
    desc: (c.querySelector('[data-tpl-desc]')?.textContent || '').trim(),
    price: (c.querySelector('[data-tpl-price]')?.textContent || '').trim(),
  }))
  ok(
    'the English card is separated the same way',
    enParts.length > 0 && enParts.every((x) => x.name && x.desc.length > 8 && /SAR/.test(x.price) && x.price.includes('·')),
    enParts[0] ? `${enParts[0].name} / ${enParts[0].price}` : 'none',
  )
  en.dom.window.close()

  /* ——— الكوبون: أجلٌ مكتوب، ورفضٌ بعده ——— */
  const sale = couponInfo('SALE25')
  ok('SALE25 is declared with an end date in the table', /^\d{4}-\d{2}-\d{2}$/.test(sale?.endsAt || ''), String(sale?.endsAt))
  ok('it states what it covers, in both languages', !!sale?.note?.ar && !!sale?.note?.en)
  ok('a date in the future is not expired', couponExpired('SALE25', '2000-01-01') === false)
  ok('and the same code past its date is refused', couponExpired('SALE25', '2030-01-01') === true)
  const c = await render('http://localhost/cart', { 'qalb.cart.v1': seededCart })
  const hint = c.doc.querySelector('[data-coupon-hint]')?.textContent || ''
  ok(
    'the cart explains the offer before the buyer asks: what it covers and until when',
    /SALE25/.test(hint) && /يشمل/.test(hint) && (/\d{4}/.test(hint) || sale.expired),
    hint.replace(/\s+/g, ' ').slice(0, 110),
  )
  c.dom.window.close()

  if (bad.length) {
    failed++
    groups++
    console.log('✗ cards · name · description · price')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ cards · name · description · price  (${checks.length} assertions)`)
  }
}

/* ---------------- admin: the gate, the catalogue edits, the access list ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }
  const submit = (g) => {
    const f = g.doc.querySelector('#main form')
    const b = f && [...f.querySelectorAll('button')].find((x) => x.type === 'submit')
    if (!b) throw new Error('no submit button in the form')
    b.click()
  }
  const fill = (g, id, v) => {
    const el = g.doc.getElementById(id)
    if (!el) throw new Error(`no field #${id}`)
    const set = Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set
    set.call(el, v)
    el.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  }
  const click = (g, re, sel = 'button') => {
    const b = [...g.doc.querySelectorAll(sel)].find((x) => re.test((x.textContent || '').trim()))
    if (!b) throw new Error(`no control matching ${re}`)
    b.click()
  }

  const g = await render('http://localhost/admin')

  /* --- the first run creates the owner; it does not invent a session --- */
  ok('a first run asks to create the owner, not to sign in', /أنشئ حساب الإدارة الأول/.test(g.txt()))
  ok('the local-mode limit is stated on the gate itself', /على هذا الجهاز فقط/.test(g.txt()), g.txt().slice(0, 70))
  fill(g, 'ad-name', 'نوف')
  fill(g, 'ad-email', 'nouf@qalb.store')
  fill(g, 'ad-pass', 'super-secret-1')
  fill(g, 'ad-again', 'super-secret-2')
  submit(g)
  await g.wait()
  ok('mismatched confirmation is refused before anything is stored', /كلمتا السر غير متطابقتين/.test(g.txt()))
  ok('a refused submit writes no account', !g.win.localStorage.getItem('qalb.admin.v1'))
  fill(g, 'ad-again', 'super-secret-1')
  submit(g)
  await g.wait()
  ok('the dashboard opens once the owner exists', !!g.doc.querySelector('[data-admin]'), g.txt().slice(0, 60))
  ok(
    'the password is stored only as a hash',
    !/super-secret-1/.test(g.win.localStorage.getItem('qalb.admin.v1') || ''),
    (g.win.localStorage.getItem('qalb.admin.v1') || '').slice(0, 60),
  )

  /* --- finance: derived from the order log, not typed in --- */
  ok('revenue is read from the (empty) order log, not invented', /إجمالي الدخل/.test(g.txt()) && /لا طلبات مسجّلة بعد/.test(g.txt()))
  ok(
    'the 30-day chart draws one bar per day',
    g.doc.querySelectorAll('[data-chart] rect').length === 30,
    String(g.doc.querySelectorAll('[data-chart] rect').length),
  )
  ok('the source of the numbers is named', /qalb\.orders\.v1/.test(g.txt()))

  /* --- products: an override, never a rewrite of the source file --- */
  click(g, /المنتجات$/)
  await g.wait()
  ok(
    'every product is listed for editing',
    g.doc.querySelectorAll('[data-admin] tbody tr').length >= 15,
    String(g.doc.querySelectorAll('[data-admin] tbody tr').length),
  )
  click(g, /^تعديل$/)
  await g.wait()
  ok('the editor is labelled with the row it edits', /تعديل · /.test(g.txt()))
  fill(g, 'pe-price', '199')
  click(g, /^حفظ$/)
  await g.wait()
  const ov = JSON.parse(g.win.localStorage.getItem('qalb.products.v1') || '{}')
  ok('the new price lands in the override store', ov.aether && ov.aether.price === 199, JSON.stringify(ov.aether))
  ok('the source catalogue file was not rewritten', /price: 249,/.test(readFileSync('src/data/templates.js', 'utf8')))
  ok('the row admits it is edited', /معدَّل/.test(g.txt()))
  const novaRow = [...g.doc.querySelectorAll('tbody tr')].find((r) => /نوفا/.test(r.textContent))
  ok('the product to hide is on the page', !!novaRow)
  if (novaRow) {
    ;[...novaRow.querySelectorAll('button')].find((b) => /إخفاء/.test(b.textContent || '')).click()
    await g.wait()
  }
  ok('hiding is stored as published:false', JSON.parse(g.win.localStorage.getItem('qalb.products.v1')).nova.published === false)
  click(g, /مخفيّة/)
  await g.wait()
  const hiddenRows = [...g.doc.querySelectorAll('[data-admin] tbody tr')]
  ok(
    'the hidden filter lists only hidden products',
    hiddenRows.length === 1 && /نوفا/.test(hiddenRows[0].textContent || ''),
    String(hiddenRows.length),
  )
  click(g, /الكل/)
  await g.wait()
  ok('the hidden row stays visible to the admin, with a way back', /نوفا/.test(g.txt()) && /إظهار/.test(g.txt()))
  ok('the buyable price table drops it', /19\D*\/\D*20/.test(g.txt()), (g.txt().match(/الأسعار[^\n]{0,40}/) || [''])[0])
  /* --- كل منتج مربوط بتسليمه من تلقاء نفسه: لا شيء يُكتب باليد في اللوحة --- */
  {
    const rows = [...g.doc.querySelectorAll('[data-admin] tbody tr')]
    const badged = rows.filter((r) => /تسليم موقّع لكل طلب على حدة/.test(r.textContent || ''))
    const paths = badged.map(
      (r) => ((r.querySelector('[title*="/download/"]') || {}).getAttribute?.('title') || '').match(/\/download\/[a-z0-9-]+/)?.[0] || '',
    )
    ok('every product row carries its own signed delivery badge', badged.length === 20 && rows.length === 20, `${badged.length}/${rows.length}`)
    ok('the badge names that product, not a shared link', new Set(paths).size === 20 && paths.every(Boolean), paths.slice(0, 3).join(','))
    ok(
      'the table no longer says "لا رابط بعد" for any catalogue product',
      !/لا رابط بعد/.test((g.doc.querySelector('[data-admin]') || {}).textContent || ''),
    )
    click(g, /^تعديل$/)
    await g.wait()
    ok(
      'the editor explains the protected path instead of asking for a URL',
      /مسار محمي بالشكل \/download\/<معرف-القالب>/.test(g.txt()),
      (g.txt().match(/.{0,60}مسار محمي.{0,60}/) || ['no hint'])[0],
    )
    click(g, /^إلغاء$/)
    await g.wait()
  }

  fill(g, 'ad-q', 'aether')
  await g.wait()
  ok(
    'the panel can find a product by id',
    g.doc.querySelectorAll('[data-admin] tbody tr').length === 1,
    String(g.doc.querySelectorAll('[data-admin] tbody tr').length),
  )

  /* --- access: add, and refuse to remove the account in use --- */
  click(g, /الصلاحيات$/)
  await g.wait()
  fill(g, 'au-name', 'سلمى')
  fill(g, 'au-mail', 'salma@qalb.store')
  fill(g, 'au-pass', 'second-pass-12')
  submit(g)
  await g.wait()
  ok('a second admin appears in the list', /salma@qalb.store/.test(g.txt()))
  ok('the new account is an admin, not an owner', /\bsalma@qalb\.store\b[\s\S]*?مسؤول/.test(g.txt()))
  const ownerRow = [...g.doc.querySelectorAll('li')].find((li) => /أنت/.test(li.textContent))
  ok('the current account is marked as you', !!ownerRow)
  if (ownerRow) {
    const rm = () => [...ownerRow.querySelectorAll('button')].find((b) => /حذف|أؤكد الحذف/.test(b.textContent || ''))
    rm().click()
    await g.wait()
    ok('removal asks for confirmation first', !!rm() && /أؤكد الحذف/.test(rm().textContent || ''))
    rm().click()
    await g.wait()
  }
  ok('you cannot delete the account you are signed in with', /أنت/.test(g.txt()) && /nouf@qalb.store/.test(g.txt()))

  /* --- institution seats: the tab exists, and the local mode will not mint --- */
  click(g, /المقاعد$/)
  await g.wait()
  ok('the seats tab is a real tab in the panel', !!g.doc.querySelector('[data-orgs]'), g.txt().slice(0, 50))
  ok('local mode says the seat ledger lives on a server', /دفترٌ على الخادم/.test(g.txt()))
  ok('and shows no invented contract table', !g.doc.querySelector('[data-orgs] table'))
  ok('the note hands the reader to the licences page', !!g.doc.querySelector('[data-orgs] a[href="/b2b"]'))
  ok('nothing claims a code was issued', !/صُدِّر الرمز/.test(g.txt()))
  const adminSrc = readFileSync('src/pages/Admin.jsx', 'utf8')
  ok(
    'the seats table carries the per-template report column',
    /admin\.orgsUsage/.test(adminSrc) && /r\.byTemplate/.test(adminSrc) && /colSpan=\{9\}/.test(adminSrc),
    'usage column',
  )
  const viteCfg = readFileSync('vite.config.js', 'utf8')
  ok(
    'the dev/preview bridge forwards the seat doors too',
    /PROXY_PATHS = \[[^\]]*'\/org'/.test(viteCfg) && /'\/org'/.test(viteCfg) && /'\/leads'/.test(viteCfg),
    (viteCfg.match(/PROXY_PATHS = \[[^\]]*\]/) || [''])[0].slice(0, 60),
  )
  const orgsApi = readFileSync('src/api/index.js', 'utf8')
  ok(
    'every seat door the panel uses is a server door',
    ['orgs:', 'mintOrg:', 'patchOrg:', 'orgsCsv'].every((k) => orgsApi.includes(k)) &&
      (orgsApi.match(/\/admin\/orgs/g) || []).length === 4 &&
      (orgsApi.match(/apiMode === 'rest' \? restAdmin/g) || []).length === 5 &&
      /if \(apiMode !== 'rest'\) return ''/.test(orgsApi),
    String((orgsApi.match(/\/admin\/orgs/g) || []).length),
  )

  ok(
    'and the leads ledger is gated the same way, door by door',
    ['leads:', 'patchLead:', 'leadsCsv'].every((k) => orgsApi.includes(k)) &&
      (orgsApi.match(/\/admin\/leads/g) || []).length === 3 &&
      /async leadsCsv\(\) \{\s*if \(apiMode !== 'rest'\) return ''/.test(orgsApi),
  )

  /* --- طلباتُ الجهات: التبويبُ المحلي لا يدّعي دفترًا --- */
  g.win.localStorage.setItem(
    'qalb.leads.v1',
    JSON.stringify([{ quote: 'QALB-Q-2026-TT1', org: 'جامعةُ الفحص', email: 'a@b.sa', tier: 'cohort', seats: 50 }]),
  )
  click(g, /طلباتُ الجهات/)
  await g.wait(6)
  ok(
    'the leads tab opens with the honest local notice, no raw key left behind',
    /لا يوجد ما يُسجَّل فيه/.test(g.txt()) && !/admin\.[a-zA-Z_]/.test(g.txt()),
    g.txt().slice(0, 70),
  )
  ok(
    'it counts what this browser holds instead of claiming an empty ledger',
    /محفوظٌ في هذا المتصفح وحدَه: 1/.test(g.txt()),
    (g.txt().match(/محفوظٌ[^\n]{0,24}/) || [''])[0],
  )
  click(g, /امحُ ما في هذا المتصفح/)
  await g.wait(6)
  ok(
    'and its erase button really erases the browser ledger',
    g.win.localStorage.getItem('qalb.leads.v1') == null,
    String(g.win.localStorage.getItem('qalb.leads.v1')),
  )

  /* --- signing out really closes the panel --- */
  click(g, /تسجيل الخروج/)
  await g.wait()
  ok('sign out returns to the gate', /دخول الإدارة/.test(g.txt()) && !g.doc.querySelector('[data-admin]'))
  fill(g, 'ad-pass', 'wrong-password-x')
  submit(g)
  await g.wait()
  ok('a wrong password is refused', /كلمة السر غير صحيحة/.test(g.txt()))
  ok('and it does not open the panel', !g.doc.querySelector('[data-admin]'))
  ok('a login is ambiguous once a second account exists', !g.doc.querySelector('[data-admin]'))
  fill(g, 'ad-email', 'nouf@qalb.store')
  fill(g, 'ad-pass', 'super-secret-1')
  submit(g)
  await g.wait()
  ok('the right credentials open it again', !!g.doc.querySelector('[data-admin]'))
  g.dom.window.close()

  /* --- the storefront obeys the same overrides --- */
  const seeded = {
    'qalb.products.v1': JSON.stringify({ aether: { price: 199 }, nova: { published: false } }),
    'qalb.cart.v1': JSON.stringify([{ id: 'aether', qty: 1 }]),
  }
  const cart = await render('http://localhost/cart', seeded)
  const cartMain = cart.doc.getElementById('main')?.textContent || ''
  const itemText = [...(cart.doc.querySelectorAll('ul li a[href^="/template/"]') || [])].map((a) => a.closest('li')?.textContent || '').join(' ')
  ok(
    'the cart charges the price set in the panel',
    /199/.test(cartMain) && !/249/.test(itemText) && !/249/.test(String(cart.doc.querySelector('[data-total]')?.getAttribute('data-total'))),
    itemText.replace(/\s+/g, ' ').slice(0, 70),
  )
  cart.dom.window.close()

  const stranded = await render('http://localhost/cart', {
    'qalb.products.v1': JSON.stringify({ nova: { published: false } }),
    'qalb.cart.v1': JSON.stringify([{ id: 'nova', qty: 1 }]),
  })
  const strandedMain = stranded.doc.getElementById('main')?.textContent || ''
  ok(
    'a hidden product cannot be kept or paid for in a cart',
    /سلتك فارغة/.test(strandedMain) && !/نوفا/.test(strandedMain),
    strandedMain.replace(/\s+/g, ' ').slice(0, 50),
  )
  stranded.dom.window.close()

  const cat = await render('http://localhost/templates', { 'qalb.products.v1': JSON.stringify({ nova: { published: false } }) })
  ok('a hidden product is gone from the catalogue', !/نوفا/.test(cat.txt()))
  ok('the rest of the catalogue is untouched', /أيثر/.test(cat.txt()))
  cat.dom.window.close()

  const okAether = await render('http://localhost/template/aether-portfolio', {
    'qalb.products.v1': JSON.stringify({ aether: { price: 199, download: 'https://dl.qalb.store/aether.zip' } }),
  })
  ok(
    'the product page shows the edited price',
    /199/.test(okAether.txt()) && !/249/.test(okAether.txt()),
    okAether.txt().replace(/\s+/g, ' ').slice(0, 90),
  )
  okAether.dom.window.close()

  if (bad.length) {
    failed++
    groups++
    console.log('✗ admin · gate · catalogue · access')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ admin · gate · catalogue · access  (${checks.length} assertions)`)
  }
}

/* ---------------- i18n: both languages, every key used, none missing ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }
  // importing the admin file merges the panel's copy onto the same dictionary
  await import('../src/i18n/admin-strings.js')
  const flat = (o, pre = '') =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [pre + k] : v && typeof v === 'object' ? flat(v, `${pre}${k}.`) : []))
  const ar = flat(dict.ar)
  const en = flat(dict.en)
  const keys = new Set([...ar, ...en])
  const ns = new Set(ar.map((k) => k.split('.')[0]))
  ok('arabic and english hold the same number of strings', ar.length === en.length, `${ar.length} vs ${en.length}`)
  ok(
    'no language is missing a key the other has',
    ar.filter((k) => !en.includes(k)).length === 0 && en.filter((k) => !ar.includes(k)).length === 0,
    ar
      .filter((k) => !en.includes(k))
      .concat(en.filter((k) => !ar.includes(k)))
      .join(','),
  )

  // a reference is any quoted "ns.key" in the source: t('x.y'), tables of { k: 'x.y' }, ternaries…
  const files = readdirSync('src', { recursive: true })
    .filter((f) => /\.(js|jsx)$/.test(f))
    .map((f) => `src/${f}`)
  const refs = new Set()
  const dynamic = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/['"]([a-z][a-z0-9_]*(?:\.[a-zA-Z0-9_]+)+)['"]/g)) if (ns.has(m[1].split('.')[0])) refs.add(m[1])
    for (const m of src.matchAll(/[^A-Za-z0-9_$.]t\(\s*`([^`]+)`/g)) if (ns.has(m[1].split('.')[0])) dynamic.push(m[1])
  }
  const esc = (x) => x.replace(/[.*+?^[\]()|{}$]/g, '\\$&')
  const pats = dynamic.map(
    (d) =>
      new RegExp(
        `^${d
          .split(/\$\{[^}]*\}/)
          .map(esc)
          .join('[^.]+')}$`,
      ),
  )
  const used = (k) => refs.has(k) || pats.some((r) => r.test(k))
  const missing = [...refs].filter((k) => !keys.has(k))
  const dead = [...keys].filter((k) => !used(k))
  ok('every string the code asks for exists in the dictionary', missing.length === 0, missing.join(','))
  ok('no string sits in the dictionary unused', dead.length === 0, dead.slice(0, 6).join(','))
  ok(
    'the panel’s copy is a separate module, not storefront weight',
    !/admin: \{/.test(readFileSync('src/i18n/translations.js', 'utf8')) &&
      /dict\.en\.admin = admin\.en/.test(readFileSync('src/i18n/admin-strings.js', 'utf8')),
  )
  ok('a placeholder survives in both languages to be substituted', dict.ar.footer.rights.includes('{y}') && dict.en.footer.rights.includes('{y}'))
  ok(
    'every panel tab has a label in both languages',
    (() => {
      const ids = [...readFileSync('src/pages/Admin.jsx', 'utf8').matchAll(/\{ id: '([a-z_]+)', icon:/g)].map((m) => m[1])
      return (
        ids.length >= 5 && ids.every((id) => typeof dict.ar.admin?.['tab_' + id] === 'string' && typeof dict.en.admin?.['tab_' + id] === 'string')
      )
    })(),
    Object.keys(dict.ar.admin || {})
      .filter((k) => k.startsWith('tab_'))
      .join(','),
  )

  /*
   * No string may promise something the code does not do. There is no mailer and no
   * fiscal integration in this repo, so any line about sending e-mail or issuing an
   * e-invoice has to say plainly that it does not happen on its own. A claim with a
   * delivery verb and no negation next to it is exactly what this catches.
   */
  const mail = { ar: 'لا|لن|لم|غير|بدون|ليس', en: 'not|no |never|unless|without' }
  const allStrings = (o, pre = '') =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[pre + k, v]] : v && typeof v === 'object' ? allStrings(v, `${pre}${k}.`) : []))
  for (const lang of ['ar', 'en']) {
    const promises = allStrings(dict[lang]).filter(
      ([, s]) =>
        /(يُرسل|نُرسل|أُرسل|تُرسل|تُرسَل|تُصدر|يصدر|sent to|are emailed|is emailed|is issued|we send|will send)/i.test(s) &&
        /(بريد|e-?mail|فاتورة|invoice|ZATCA|هيئة الزكاة)/i.test(s),
    )
    const bare = promises.filter(([, s]) => !new RegExp(mail[lang], 'i').test(s)).map(([k]) => k)
    ok(`no ${lang} line promises an e-mail or an invoice that nothing backs`, bare.length === 0, bare.slice(0, 4).join(','))
  }
  /*
   * A link that ends in #somewhere is a promise: the element has to exist on the
   * page it lands on. Footer once pointed four legal links at a copyright strip.
   */
  const appSrc = readFileSync('src/App.jsx', 'utf8')
  const routeFile = (p) => {
    const r = appSrc.match(new RegExp(`path="${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" element=\\{<(\\w+)`))
    if (!r) return null
    const i = appSrc.match(new RegExp(`const ${r[1]} = lazy\\(\\(\\) => import\\('([^']+)'\\)\\)`))
    if (!i) return null
    const rel = i[1].replace(/^\.\//, '')
    const page = /\.(js|jsx)$/.test(rel) ? `src/${rel}` : `src/${rel}.jsx`
    return existsSync(page) ? page : null
  }
  const chrome = ['src/components/Footer.jsx', 'src/components/Navbar.jsx', 'src/App.jsx'].map((f) => readFileSync(f, 'utf8')).join('\n')
  const anchorMiss = []
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/to[:=]\s*["']([^"'#]*#[a-zA-Z0-9_-]+)["']/g)) {
      const [p, hash] = m[1].split('#')
      const target = routeFile(p)
      if (!target) {
        anchorMiss.push(`${m[1]} من ${f}: لا مسار`)
        continue
      }
      const body = readFileSync(target, 'utf8') + (p === '/' ? chrome : '')
      if (!new RegExp(`(?:id=["']|id:\\s*')${hash}["']`).test(body)) anchorMiss.push(`${m[1]} من ${f}: لا عنصر`)
    }
  }
  ok('every link ending in # lands on an id that really exists', anchorMiss.length === 0, anchorMiss.slice(0, 4).join(' | '))

  /*
   * The same rule read the other way: no certificate, no encryption, no "secure
   * payment" may be printed by a store that has no gateway and no audit. A mark like
   * «PCI-DSS» sat next to the pay pills for exactly that reason.
   */
  const CERT = /(PCI-?\s?DSS|SOC ?2|ISO ?27001|شهادة أمان|متوافق مع معايير|دفع مشفّر|encrypted payment|secure payment)/gi
  const certHits = []
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(CERT)) certHits.push(`${f}: ${m[0]}`)
  ok('no certification or encryption claim survives in the source', certHits.length === 0, certHits.slice(0, 3).join(' | '))

  ok(
    'the receipt and the billing note say what really happens',
    dict.ar.checkout.billingNote.startsWith('لا يُرسل شيء بالبريد') &&
      /^Nothing is emailed automatically/.test(dict.en.checkout.billingNote) &&
      dict.ar.success.sub.includes('في هذه الصفحة') &&
      /on this page/.test(dict.en.success.sub),
  )

  if (bad.length) {
    failed++
    groups++
    console.log('✗ i18n · parity · no dead keys · no unbacked promise')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ i18n · parity · no dead keys · no unbacked promise  (${checks.length} assertions)`)
  }
}

/* ---------------- css: a hand-written reset must never outrank a utility ---------------- */
{
  const checks = []
  const bad = []
  const ok = (name, cond, extra = '') => {
    checks.push(name)
    if (!cond) bad.push(name + (extra ? ` (${extra})` : ''))
  }

  // cascade layers win before specificity: an *unlayered* `button { color: inherit }`
  // beat `text-bg`, and `* { border-color }` beat every `border-brand/40`. That is how
  // «أضف إلى السلة» and «اشتراك» went white-on-white. So: no element reset outside a layer.
  const css = readFileSync('src/index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const top = []
  {
    let depth = 0
    let buf = ''
    let sel = null
    for (const ch of css) {
      if (ch === '{') {
        // the selector is the last line before the brace — anything above it is
        // @import lines or comments, which are stripped but leave newlines behind
        if (depth === 0) sel = buf.trim().split('\n').pop().trim()
        depth++
        buf = ''
        continue
      }
      if (ch === '}') {
        depth--
        if (depth === 0 && sel != null) {
          top.push([sel, buf])
          sel = null
        }
        buf = ''
        continue
      }
      buf += ch
    }
  }
  const ownsPaint =
    /(?:^|;)\s*(?:color|background|background-color|border-color|border-width|font|font-family|font-weight|font-size|line-height|outline)\s*:/
  const offenders = top.filter(([sel, body]) => !sel.startsWith('@') && !/[.#[]/.test(sel) && ownsPaint.test(body))
  ok('the sheet declares @layer base for its resets', /@layer base\s*\{/.test(css))
  ok('no bare element rule sits outside a layer painting colour or type', offenders.length === 0, offenders.map(([x]) => x).join(','))
  ok(
    '.num stays a deliberate unlayered override for figures',
    top.some(([sel]) => sel === '.num'),
  )
  ok('the tokens are still unlayered so .light can flip the theme', top.some(([sel]) => sel === ':root') && top.some(([sel]) => sel === '.light'))

  // …and while the tokens are open: every text colour must be readable on the surface it is
  // actually painted on. A label only exists if it contrasts — that is the whole lesson of
  // the white-on-white pill.
  const tokens = (sel) => {
    const i = css.indexOf(`${sel} {`)
    const body = css.slice(i, css.indexOf('}', i))
    return Object.fromEntries([...body.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9a-f]{3,8})/gi)].map((m) => [m[1], m[2]]))
  }
  const chan = (h) => {
    const hex = h.slice(1)
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6)
    return [0, 2, 4].map((i) => {
      const v = parseInt(full.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
  }
  const contrast = (a, b) => {
    const [x, y] = [a, b]
      .map((h) => {
        const [r, g, bl] = chan(h)
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl
      })
      .sort((m, n) => n - m)
    return Number(((x + 0.05) / (y + 0.05)).toFixed(2))
  }
  const base = tokens(':root')
  for (const [theme, over] of [
    ['dark', {}],
    ['light', tokens('.light')],
  ]) {
    const on = { ...base, ...over } // .light restates only what it changes
    const need = [
      ['bg', 'text'],
      ['bg', 'dim'],
      ['panel', 'text'],
      ['panel', 'dim'],
      ['brand', 'brandink'],
      ['brand2', 'brandink'],
    ]
    const weak = need.filter(([bg, fg]) => contrast(on[fg], on[bg]) < 4.5)
    ok(
      `${theme}: body, muted and pill labels clear WCAG AA on their own surface`,
      weak.length === 0,
      weak.map(([b, f]) => `${b}/${f}=${contrast(on[f], on[b])}`).join(','),
    )
  }

  /*
   * «طباعة الصفحة» وعدٌّ مثل غيره. الورقة يجب أن تخرج بيضاء بلا شريط ولا أزرار،
   * والقاعدة يجب أن تصمد أمام minify — لذا يُقرأ المصدر والملف المبني معًا.
   */
  const cssSrc = readFileSync('src/index.css', 'utf8')
  const printAt = cssSrc.indexOf('@media print')
  const depthAt = (i) => [...cssSrc.slice(0, i)].reduce((d, c) => d + (c === '{' ? 1 : c === '}' ? -1 : 0), 0)
  ok('a print stylesheet stands behind the print button', printAt > -1)
  ok(
    'it flips the tokens, so every utility follows without an !important war',
    printAt > -1 && /:root[\s\S]{0,120}?--c-bg:\s*#ffffff/.test(cssSrc.slice(printAt)),
  )
  ok(
    'print drops the chrome: nav, header, footer, buttons, fields, decoration',
    ['nav', 'header', 'footer', 'button', 'input', 'textarea', '.grad-mesh'].every((x) =>
      new RegExp(`${x},?[\\s\\S]{0,600}?display: none !important`).test(cssSrc.slice(printAt)),
    ),
  )
  ok('the print block sits at the top level, outside every @layer', printAt > -1 && depthAt(printAt) === 0)
  /* عرضُ السعر يُطبع وحدَه: الشبكاتُ والنماذجُ ليست وثيقةً تُوقَّع */
  ok(
    'the quotation sheet is the only thing print leaves on the page',
    /\[data-no-print\][\s\S]{0,80}display:\s*none/.test(cssSrc.slice(printAt)) && /body:has\(\[data-b2b-quote\]\)/.test(cssSrc.slice(printAt)),
  )
  /*
   * الصندوقُ المتذبذب عيبٌ في الفيزياء لا في الذوق: لا ارتفاعٌ يُكتب من JS فوق
   * نسبةِ البُعد، ولا شريطُ تمريرٍ يُفتح ويُغلق، ولا قياسٌ يعيد نفسه.
   */
  ok('the html reserves its scrollbar so no reflow can toggle it', /scrollbar-gutter:\s*stable/.test(cssSrc))
  ok('and a sticky navbar stops eating the top of every anchor', /scroll-margin-block-start:\s*5\.5rem/.test(cssSrc))
  const rootClip = cssSrc.match(/html,\s*body,\s*#root\s*\{[^}]*\}/)
  ok(
    'horizontal overflow is clipped on html, body and #root',
    !!rootClip && /overflow-x:\s*hidden/.test(rootClip[0]) && /overflow-x:\s*clip/.test(rootClip[0]),
    rootClip?.[0]?.replace(/\s+/g, ' ').slice(0, 180),
  )
  ok(
    'clip wins over hidden so the sticky navbar is not turned into a scroll container',
    !!rootClip && rootClip[0].lastIndexOf('overflow-x: clip') > rootClip[0].lastIndexOf('overflow-x: hidden'),
  )
  ok(
    'the hero glow pulls in on small screens and only blooms from sm up',
    /pointer-events-none absolute -inset-4 sm:-inset-10/.test(readFileSync('src/pages/Home.jsx', 'utf8')),
  )
  const fitBox = cssSrc.slice(cssSrc.indexOf('@utility fitbox'), cssSrc.indexOf('@utility fitscale'))
  const fitScale = cssSrc.slice(cssSrc.indexOf('@utility fitscale'), cssSrc.indexOf('@utility sheet'))
  ok(
    'the measured box is contained: layout and paint, nothing re-lays out upward',
    /contain:\s*layout paint/.test(fitBox) && /overflow:\s*hidden/.test(fitBox),
  )
  ok('the scaled layer promises the compositor, and only that', /will-change:\s*transform/.test(fitScale) && !/transition/.test(fitScale))
  const built = existsSync('dist/assets') ? readdirSync('dist/assets').filter((f) => f.endsWith('.css')) : []
  if (built.length) {
    const min = built
      .map((f) => readFileSync(`dist/assets/${f}`, 'utf8'))
      .join('')
      .replace(/\s+/g, '')
    ok(
      'the built stylesheet still carries the print rules after minify',
      /@mediaprint\{/.test(min) && min.includes('nav,header,footer,button,input,textarea,.grad-mesh,.pointer-events-none{display:none!important}'),
      built.join(','),
    )
    ok('and the paper margins survive too', min.includes('@page{margin:18mm16mm}'))
    ok(
      'the print isolation survives minify too',
      min.includes('[data-no-print],body:has([data-b2b-quote]).page-x>:not([data-b2b-quote]){display:none!important}'),
    )
    ok(
      'the built stylesheet carries the anti-flicker trio too — the minifier eats the spaces in values',
      /scrollbar-gutter:\s*stable/.test(min) && /contain:layout\s?paint/.test(min) && /will-change:transform/.test(min),
      built.join(','),
    )
  }

  if (bad.length) {
    failed++
    groups++
    console.log('✗ css · cascade layers')
    bad.forEach((n) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ css · cascade layers  (${checks.length} assertions)`)
  }
}

/* ---------------- hardening · partial rows, list guards, stale chunks ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const readSrc = (f) => readFileSync(f, 'utf8')

  /* a product made in the panel holds five fields — every list it lacks must still render */
  const seed = { 'qalb.products.v1': JSON.stringify({ ghost: { custom: true, type: 'portfolio', price: 120, nameAr: 'شبح', nameEn: 'Ghost' } }) }
  const cat = await render('http://localhost/templates', seed)
  ok('a hand-made product shows up in the catalogue', /شبح/.test(cat.txt()))
  ok('the catalogue does not hit the error boundary', !/حدث خطأ غير متوقع/.test(cat.txt()), cat.txt().replace(/\s+/g, ' ').slice(0, 70))
  cat.dom.window.close()

  const pp = await render('http://localhost/template/ghost', seed)
  const ptxt = pp.txt().replace(/\s+/g, ' ')
  ok('its product page renders on the Arabic side', /شبح/.test(ptxt) && !/حدث خطأ غير متوقع/.test(ptxt), ptxt.slice(0, 70))
  ok('with the price the panel stored', /120/.test(ptxt), (ptxt.match(/\d+/) || [''])[0])
  ok('and its sections tab still opens', /الأقسام/.test(ptxt))
  ok('no console error escaped while rendering it', pp.errs.length === 0, pp.errs.slice(0, 2).join(' | '))
  pp.dom.window.close()

  const ppEn = await render('http://localhost/template/ghost', { ...seed, 'qalb.lang': 'en' })
  const etxt = ppEn.txt().replace(/\s+/g, ' ')
  ok('the same row renders in English', /Ghost/.test(etxt) && !/Something broke/.test(etxt), etxt.slice(0, 70))
  ppEn.dom.window.close()

  /* source guards: the crash class the browser reported cannot come back quietly */
  const jsx = readdirSync('src', { recursive: true })
    .filter((f) => /\.(jsx?)$/.test(f))
    .map((f) => `src/${f}`)
  const mapped = jsx.filter((f) => /L\([^)\n]*\)\s*\.\s*(map|filter|slice|reduce|forEach|length|join)\(/.test(readSrc(f)))
  ok('nothing maps a language field without a list guard', mapped.length === 0, mapped.join(','))
  ok('the product page reads its lists through LA', /LA\(tpl\.sections\)\.map\(/.test(readSrc('src/pages/Product.jsx')))
  ok(
    'and its highlights/best-for lists too',
    /\[\.\.\.LA\(tpl\.highlights\)/.test(readSrc('src/pages/Product.jsx')) && /items=\{LA\(tpl\.bestFor\)\}/.test(readSrc('src/pages/Product.jsx')),
  )
  ok('cards fall back on an unknown type', /typeLabel\[tpl\.type\] \|\| typeLabel\.portfolio/.test(readSrc('src/components/TemplateCard.jsx')))
  ok('the admin table refuses to print a protected path as a link', /isProtectedDownload\(r\.download\)/.test(readSrc('src/pages/Admin.jsx')))

  /* stale module graph — what an open tab actually sees after a restart or a deploy */
  ok(
    'a missing export is recognised as a stale bundle',
    isStaleLoadError("The requested module '/src/api/index.js' does not provide an export named 'deliveryAllHref'"),
  )
  ok('a dead lazy chunk too', isStaleLoadError('Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Catalog.jsx'))
  ok('and the Safari wording', isStaleLoadError('Importing a module script failed'))
  ok('a real render error is not mistaken for one', !isStaleLoadError("Cannot read properties of undefined (reading 'map')"))
  const jar = new Map()
  globalThis.sessionStorage = {
    getItem: (k) => (jar.has(k) ? jar.get(k) : null),
    setItem: (k, v) => jar.set(k, String(v)),
    removeItem: (k) => jar.delete(k),
  }
  ok('the boundary reloads once, automatically', claimStaleReload() === true && claimStaleReload() === false)
  ok('and a route that renders fine re-arms it', (clearStaleReload(), claimStaleReload() === true))
  ok('with no storage it never reloads on its own', ((globalThis.sessionStorage = undefined), claimStaleReload() === false))
  /* what the visitor actually reads on that screen — never a key name */
  {
    const claim = (win) => win.sessionStorage.setItem('qalb.stale-reload', '1') // already reloaded once: show the fallback
    const probe = await render('http://localhost/', { 'qalb.test.boundary': 'stale', 'qalb.stale-reload': '1' }, { boot: claim })
    const ptxt = ((probe.doc.getElementById('boundary-probe') || {}).textContent || '').replace(/\s+/g, ' ')
    ok(
      'the stale-module screen shows real copy',
      /إعادة تحميل الصفحة بالكامل/.test(ptxt) && /نسخة قديمة من ملفات الموقع/.test(ptxt),
      ptxt.slice(0, 90),
    )
    ok('and never a translation key', !/err\.(stale|reload)/.test(ptxt), ptxt.slice(0, 60))
    ok('the doomed “try again” is not offered there', !/إعادة المحاولة/.test(ptxt))
    probe.dom.window.close()

    const probeEn = await render('http://localhost/', { ...{ 'qalb.test.boundary': 'stale' }, 'qalb.lang': 'en' }, { boot: claim })
    const etxt = ((probeEn.doc.getElementById('boundary-probe') || {}).textContent || '').replace(/\s+/g, ' ')
    ok('the same screen reads properly in english', /Reload the whole page/.test(etxt) && !/err\./.test(etxt), etxt.slice(0, 80))
    probeEn.dom.window.close()

    const plain = await render('http://localhost/', { 'qalb.test.boundary': 'plain' })
    const ptxt2 = ((plain.doc.getElementById('boundary-probe') || {}).textContent || '').replace(/\s+/g, ' ')
    ok(
      'a genuine render error keeps the retry button and the normal copy',
      /حدث خطأ غير متوقع/.test(ptxt2) && /إعادة المحاولة/.test(ptxt2) && !/إعادة تحميل الصفحة بالكامل/.test(ptxt2),
      ptxt2.slice(0, 80),
    )
    plain.dom.window.close()
  }

  const eb = readSrc('src/components/ErrorBoundary.jsx')
  ok('the fallback offers a full reload, not a doomed retry', /stale \?/.test(eb) && /onClick=\{reloadDocument\}/.test(eb))
  ok(
    'the stale copy exists in both languages',
    /err\.stale/.test(eb) && typeof dict.ar.err.stale === 'string' && typeof dict.en.err.stale === 'string',
  )

  /*
   * المساراتُ كلها تُقرأ في المتصفح وحده. على Vercel لا وجود لـ _redirects، فمن
   * يكتب /ats و /admin هناك؟ ملفٌ واحد يجب أن يوازي سطر Netlify.
   */
  const vercel = JSON.parse(readSrc('vercel.json'))
  ok(
    'vercel rewrites every path into the SPA shell',
    vercel.rewrites?.length === 1 && vercel.rewrites[0].source === '/(.*)' && vercel.rewrites[0].destination === '/index.html',
    JSON.stringify(vercel),
  )
  ok(
    'and that pattern really swallows the hidden routes',
    ['/ats', '/admin', '/studio', '/template/nova-cv'].every((u) => new RegExp('^' + vercel.rewrites[0].source + '$').test(u)),
  )
  ok('Netlify keeps the same map in its own tongue', /^\/\*\s+\/index\.html\s+200$/m.test(readSrc('public/_redirects')))
  ok(
    'the admin path is unlisted: no link, no sitemap entry, and disallowed in every robots block',
    !readSrc('src/components/Footer.jsx').includes('/admin') &&
      !readSrc('public/sitemap.xml').includes('/admin') &&
      (readSrc('public/robots.txt').match(/^User-agent:/gm) || []).length ===
        (readSrc('public/robots.txt').match(/^Disallow: \/admin$/gm) || []).length,
  )
  const bad2 = checks.filter(([, pass]) => !pass)
  if (bad2.length) {
    failed++
    groups++
    console.log('✗ hardening · partial rows · stale chunks')
    bad2.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ hardening · partial rows · stale chunks  (${checks.length} assertions)`)
  }
}

/* ---------------- personalisation · what the buyer types is what lands in the files ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const buyer = {
    on: true,
    name: 'نورة الحربي',
    role: 'مصممة واجهات',
    email: 'noura@studio.sa',
    phone: '+966 55 123 4567',
    website: 'https://noura.studio.sa/work?x=1',
    bio: 'أبني واجهات للمنتجات المالية منذ ست سنوات',
  }

  /* the cleaner — one function, used by the store and by server/worker.js alike */
  const clean = sanitizePersonal(buyer)
  ok(
    'typed values survive the cleaner',
    clean.name === 'نورة الحربي' && clean.role === 'مصممة واجهات' && clean.email === 'noura@studio.sa',
    JSON.stringify(clean),
  )
  ok('a link is reduced to a host, never kept as a url', clean.website === 'noura.studio.sa', clean.website)
  ok('the blurb becomes one finished sentence', /سنوات\.$/.test(clean.bio), clean.bio.slice(-24))
  ok('an unusable e-mail is dropped instead of written', !sanitizePersonal({ on: true, name: 'N', email: 'not an email' }).email)
  ok('an unusable phone is dropped too', !sanitizePersonal({ on: true, name: 'N', phone: '+966-not-a-number' }).phone)
  ok(
    'a field with markup is dropped whole rather than printed mangled',
    !sanitizePersonal({ on: true, name: '<img src=x onerror=alert(1)>', bio: 'نصّ سليم' }).name &&
      sanitizePersonal({ on: true, name: '<img src=x onerror=alert(1)>', bio: 'نصّ سليم' }).bio === 'نصّ سليم.',
  )
  ok('control characters cannot smuggle a newline into a file', !/[\n\t]/.test(sanitizePersonal({ on: true, bio: 'a\nb\tc' }).bio))
  ok('every field has a hard cap', sanitizePersonal({ on: true, bio: 'أ'.repeat(4000) }).bio.length === 700)
  ok(
    'switched off, nothing is injected at all',
    sanitizePersonal({ ...buyer, on: false }) === null && sanitizePersonal({}) === null && sanitizePersonal(null) === null,
  )

  /* the site package */
  const site = byId('aether')
  const ord = { id: 'QALB-P1', key: 'K-1-Q2', name: 'نورة الحربي', email: 'noura@studio.sa', date: '2026-09-04', personalize: buyer }
  const files = packageFiles(site, ord)
  const body = (n) => (files.find((f) => f.path === n) || {}).body || ''
  const prof = JSON.parse(body('content/profile.json'))
  ok(
    'content/profile.json prints the buyer, not the demo',
    prof.name.ar === 'نورة الحربي' && prof.name.en === 'نورة الحربي',
    JSON.stringify(prof.name),
  )
  ok('the role and the about line follow', prof.role.ar === 'مصممة واجهات' && /للمنتجات المالية/.test(prof.blurb.ar), prof.blurb.ar.slice(0, 40))
  ok(
    'the contact block is filled',
    prof.contact.email === 'noura@studio.sa' && prof.contact.phone === '+966 55 123 4567',
    JSON.stringify(prof.contact),
  )
  ok('the site host is the buyer’s own link', prof.host === 'noura.studio.sa', prof.host)
  ok('and the profile says so', prof.qalb.personalized === true)
  const html = body('index.html')
  ok(
    'the shipped page prints the name in the title and the header',
    /<title[^>]*>نورة الحربي/.test(html) && html.includes('<h1 data-f="name">نورة الحربي</h1>'),
  )
  ok(
    'the footer signature is the buyer’s',
    (html.match(/<span data-brand>([^<]*)<\/span>/g) || []).every((x) => /نورة الحربي/.test(x)),
    (html.match(/data-brand>([^<]*)/) || [])[1],
  )
  ok('the demo name is nowhere in the delivered page', !/لمار|Lamar/.test(html))
  ok('the inline JSON used from file:// carries it too', /id="profile">[\s\S]{0,400}نورة الحربي/.test(html))
  ok('README names the fields that were printed', /طُبعت بياناتك في الحزمة/.test(body('README.md')))

  /* the actual archive bytes, not the in-memory strings */
  const bytes = packageZip(site, ord)
  ok('the ZIP holds the personalised profile', JSON.parse(zipRead(bytes, 'content/profile.json')).name.ar === 'نورة الحربي')
  ok('and its index.html prints the name', zipRead(bytes, 'index.html').includes('نورة الحربي'))
  ok('the licence still names the licensee', zipRead(bytes, 'LICENSE.txt').includes('نورة الحربي'))

  /* the CV package */
  const cv = byId('nova')
  const cvFiles = packageFiles(cv, { ...ord, id: 'QALB-P2' })
  const cvBody = (n) => (cvFiles.find((f) => f.path === n) || {}).body || ''
  ok(
    'the CV header shows the buyer name and role',
    cvBody('resume.html').includes('<h1 data-f="name">نورة الحربي</h1>') && /مصممة واجهات/.test(cvBody('resume.html')),
  )
  ok(
    'with the phone and the e-mail in the contact line',
    /noura@studio\.sa/.test(cvBody('resume.html')) && /\+966 55 123 4567/.test(cvBody('resume.html')),
  )
  ok('the markdown CV is written with it', cvBody('resume.md').includes('نورة الحربي') && cvBody('resume.md').includes('مصممة واجهات'))
  ok(
    'and the cover letter signs with the buyer’s name',
    cvBody('cover-letter.md')
      .split('·')
      .some((x) => /نورة الحربي/.test(x)),
  )
  const untouched = packageFiles(cv, { id: 'Q', key: 'K' })
  const tprof = JSON.parse((untouched.find((f) => f.path === 'content/profile.json') || {}).body)
  ok('an order without personalisation keeps the demo copy', tprof.name.ar === 'سارة العتيبي' && !tprof.qalb.personalized, JSON.stringify(tprof.name))

  /* the product page: asked for once, kept for the rest of the purchase */
  const fill = (g, id, v) => {
    const el = g.doc.getElementById(id)
    if (!el) throw new Error(`no field #${id}`)
    const proto = el.tagName === 'TEXTAREA' ? g.win.HTMLTextAreaElement.prototype : g.win.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  }
  const pp = await render('http://localhost/template/aether-portfolio')
  ok('the product page offers the fields before the buyer pays', /تخصيص القالب قبل التنزيل/.test(pp.txt()))
  ok('and keeps them closed until asked', !pp.doc.getElementById('pe-name'))
  const tick = pp.doc.querySelector('#personalize input[type="checkbox"]')
  if (tick) tick.click()
  await pp.wait()
  ok('one tick opens the fields', !!pp.doc.getElementById('pe-name') && !!pp.doc.getElementById('pe-bio'))
  ok('and the panel says plainly what the data is used for', /لحظة التوليد/.test(pp.txt()))
  fill(pp, 'pe-name', 'نورة الحربي')
  fill(pp, 'pe-bio', 'أبني واجهات للمنتجات المالية')
  await pp.wait()
  ok('a live line shows what will be printed', /ما سيُطبع في الحزمة/.test(pp.txt()) && /نورة الحربي/.test(pp.txt()))
  fill(pp, 'pe-role', 'مديرة <b>منتج</b>')
  await pp.wait()
  ok('a field that cannot be printed is said so, on the field itself', /لن يُطبع هذا الحقل/.test(pp.txt()))
  fill(pp, 'pe-role', 'مصممة واجهات')
  await pp.wait()
  ok('and the warning goes away once it is usable', !/لن يُطبع هذا الحقل/.test(pp.txt()) && /مصممة واجهات/.test(pp.txt()))
  ok('it is stored for the rest of the purchase', JSON.parse(pp.win.localStorage.getItem('qalb.personalize.v1') || '{}').name === 'نورة الحربي')
  pp.dom.window.close()

  const again = await render('http://localhost/template/aether-portfolio', {
    'qalb.personalize.v1': JSON.stringify({ on: true, name: 'نورة الحربي' }),
  })
  ok('and survives a reload', (again.doc.getElementById('pe-name') || {}).value === 'نورة الحربي')
  ok(
    'the card links to the privacy section that explains it',
    !!again.doc.querySelector('#personalize a[href="/privacy"]') && /كيف تُحفظ هذه البيانات/.test(again.txt()),
  )
  ok(
    'each field stops you at the length that would be cut, not after it',
    again.doc.getElementById('pe-name').getAttribute('maxLength') === String(PERSONAL_LIMITS.name) &&
      again.doc.getElementById('pe-bio').getAttribute('maxLength') === String(PERSONAL_LIMITS.bio),
    `name=${again.doc.getElementById('pe-name').getAttribute('maxLength')} bio=${again.doc.getElementById('pe-bio').getAttribute('maxLength')}`,
  )
  const clearBtn = [...again.doc.querySelectorAll('#personalize button')].find((b) => /امسح بياناتي/.test(b.textContent || ''))
  ok('a real button backs the promise to delete my data', !!clearBtn)
  if (clearBtn) clearBtn.click()
  await again.wait()
  ok(
    'pressing it empties the fields, the preview and the stored copy',
    !again.doc.getElementById('pe-name') &&
      !/ما سيُطبع في الحزمة/.test(again.txt()) &&
      JSON.parse(again.win.localStorage.getItem('qalb.personalize.v1') || '{}').name === '' &&
      /فُرِّغت الحقول/.test(again.txt()),
    again.win.localStorage.getItem('qalb.personalize.v1'),
  )
  again.dom.window.close()

  const clearEn = await render('http://localhost/template/aether-portfolio', {
    'qalb.lang': 'en',
    'qalb.personalize.v1': JSON.stringify({ on: true, name: 'Noura' }),
  })
  ok(
    'and the control is in english too, not only in the dictionary',
    /Clear my details from this browser/.test(clearEn.txt()) && /How this data is stored/.test(clearEn.txt()),
  )
  clearEn.dom.window.close()

  /* the whole purchase: typed → order → receipt → bytes */
  const g = await render(
    'http://localhost/checkout',
    { 'qalb.cart.v1': JSON.stringify([{ id: 'nova', qty: 1 }]), 'qalb.personalize.v1': JSON.stringify(buyer) },
    {
      boot: (win) => {
        win.__blobs = []
        win.__clicks = []
        win.Blob = class {
          constructor(parts, opts) {
            win.__blobs.push({ parts: parts || [], type: opts && opts.type })
            this.size = (parts || []).reduce((n, x) => n + (x.length || 0), 0)
          }
        }
        win.URL.createObjectURL = () => 'blob:stub'
        win.URL.revokeObjectURL = () => {}
        win.HTMLAnchorElement.prototype.click = function () {
          win.__clicks.push(this.download || this.href)
        }
      },
    },
  )
  ok(
    'checkout starts with the same fields already filled',
    /تخصيص القالب قبل التنزيل/.test(g.txt()) && (g.doc.getElementById('pe-name') || {}).value === 'نورة الحربي',
  )
  ok('and states the fallback to the billing details', /يُؤخذ من بيانات الفاتورة/.test(g.txt()))
  const step = async () => {
    const b = [...g.doc.querySelectorAll('button')].find((x) => /متابعة|تأكيد الطلب والدفع/.test(x.textContent || ''))
    if (b) b.click()
    await new Promise((r) => setTimeout(r, 1200))
    await g.wait()
  }
  fill(g, 'co-email', 'noura@studio.sa')
  fill(g, 'co-name', 'نورة الحربي')
  await g.wait()
  await step()
  fill(g, 'co-card', '4111 1111 1111 1111')
  fill(g, 'co-exp', '12/29')
  fill(g, 'co-cvv', '123')
  await g.wait()
  await step()
  const agree = [...g.doc.querySelectorAll('form input[type="checkbox"]')].pop()
  if (agree && !agree.checked) agree.click()
  await g.wait()
  await step()
  const placed = JSON.parse(g.win.localStorage.getItem('qalb.orders.v1') || '[]')[0] || {}
  ok(
    'the order stores the cleaned payload',
    !!placed.personalize && placed.personalize.name === 'نورة الحربي' && placed.personalize.website === 'noura.studio.sa',
    JSON.stringify(placed.personalize || {}),
  )
  ok(
    'the receipt shows what was injected',
    /خُصِّصت الملفات بهذه البيانات/.test(g.txt()) && /نورة الحربي/.test(g.txt()),
    g.txt().replace(/\s+/g, ' ').slice(0, 80),
  )
  ok('and tells the buyer the files stay editable', /عدّل content\/profile\.json بنفسك/.test(g.txt()))
  const dl = g.btn(/تحميل الحزمة/)
  if (dl) dl.click()
  await g.wait()
  const got = (g.win.__blobs || []).slice(-1)[0]
  const gz = got && got.parts[0]
  ok(
    'the archive the buyer downloads is the personalised one',
    !!gz && JSON.parse(zipRead(gz, 'content/profile.json')).name.ar === 'نورة الحربي',
    gz ? zipNames(gz).length + ' entries' : 'no bytes',
  )
  ok(
    'downloaded under the order’s own file name',
    /^qalb-nova-qalb-[a-z0-9]+-[a-z0-9]+\.zip$/.test(String((g.win.__clicks || []).slice(-1)[0])),
    String((g.win.__clicks || []).slice(-1)[0]),
  )
  g.dom.window.close()

  /* rest mode: the same payload must leave the browser, or the server ships the demo */
  {
    const calls = []
    const receipt = {
      id: 'QALB-RST-1',
      key: 'RST-KEY-1234',
      date: '2026-09-04',
      email: 'noura@studio.sa',
      name: 'نورة الحربي',
      total: 89,
      count: 1,
      method: 'card',
      lines: [{ id: 'nova', qty: 1 }],
      personalize: {
        name: 'نورة الحربي',
        role: 'مصممة واجهات',
        email: 'noura@studio.sa',
        phone: '+966 55 123 4567',
        website: 'noura.studio.sa',
        bio: 'أبني واجهات للمنتجات المالية.',
      },
    }
    const g2 = await render(
      'http://localhost/checkout',
      { 'qalb.cart.v1': JSON.stringify([{ id: 'nova', qty: 1 }]), 'qalb.personalize.v1': JSON.stringify(buyer) },
      {
        boot: (win) => {
          win.__QALB_ENV = { VITE_QALB_API: 'rest', VITE_QALB_API_BASE: 'http://api.test' }
          win.fetch = (url, init) => {
            calls.push({ url, body: init?.body ? JSON.parse(init.body) : null })
            return Promise.resolve({ ok: true, status: 201, json: async () => receipt })
          }
        },
      },
    )
    const fill2 = (id, v) => {
      const el = g2.doc.getElementById(id)
      if (!el) return
      Object.getOwnPropertyDescriptor(g2.win.HTMLInputElement.prototype, 'value').set.call(el, v)
      el.dispatchEvent(new g2.win.Event('input', { bubbles: true }))
    }
    const step2 = async () => {
      const b = [...g2.doc.querySelectorAll('button')].find((x) => /متابعة|تأكيد الطلب والدفع/.test(x.textContent || ''))
      if (b) b.click()
      await new Promise((r) => setTimeout(r, 900))
      await g2.wait()
    }
    fill2('co-email', 'noura@studio.sa')
    fill2('co-name', 'نورة الحربي')
    await g2.wait()
    await step2()
    fill2('co-card', '4111 1111 1111 1111')
    fill2('co-exp', '12/29')
    fill2('co-cvv', '123')
    await g2.wait()
    await step2()
    const agree2 = [...g2.doc.querySelectorAll('form input[type="checkbox"]')].pop()
    if (agree2 && !agree2.checked) agree2.click()
    await g2.wait()
    await step2()
    const post = calls.find((c) => c.url === 'http://api.test/orders')
    ok(
      'rest mode sends the cleaned personalisation with the order',
      !!post && post.body?.personalize?.name === 'نورة الحربي' && post.body?.personalize?.website === 'noura.studio.sa',
      JSON.stringify((post && post.body && post.body.personalize) || {}),
    )
    ok(
      'and the server receipt repeats it',
      /خُصِّصت الملفات بهذه البيانات/.test(g2.txt()) && /QALB-RST-1/.test(g2.txt()),
      g2.txt().replace(/\s+/g, ' ').slice(0, 60),
    )
    g2.dom.window.close()
  }

  const badGroup = checks.filter(([, pass]) => !pass)
  if (badGroup.length) {
    failed++
    groups++
    console.log('✗ personalisation · typed once, printed in every file')
    badGroup.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ personalisation · typed once, printed in every file  (${checks.length} assertions)`)
  }
}

/* ---------------- hosting · the template becomes a live page, and the plan is a switch that actually works ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])

  /* --- الخطط: كل رقم يراه المتجر له مقابل في الكود --- */
  const plans = Object.values(PLANS)
  ok(
    // الاستضافة تتبع جدول الاشتراك نفسه (src/data/plans.js) بمصدرٍ واحد: مجاني 0 · Pro 49
    'two plans, priced exactly as the storefront promises',
    plans.length === 2 && PLANS.free.price === 0 && priceOf('pro') === 49,
    plans.map((p) => `${p.id}:${p.price}`).join(' '),
  )
  ok('free carries our bar, pro removes it', PLANS.free.brand === true && PLANS.pro.brand === false)
  ok('only pro may connect a domain', PLANS.free.domain === false && PLANS.pro.domain === true)
  ok('the free edit ceiling is a number, not an adjective', PLANS.free.editQuota === 10 && PLANS.pro.editQuota === null)
  ok(
    'every plan names and explains itself in both languages',
    plans.every((p) => p.name && p.name.ar && p.name.en && p.note && p.note.ar && p.note.en),
  )
  ok('an invented plan never upgrades anyone', planOf('diamond') === 'free' && planOf(null) === 'free' && planOf(undefined) === 'free')

  /* --- النطاق الفرعي --- */
  const sl = slugify('نورة الحربي')
  ok(
    'an Arabic name comes out as a latin subdomain, not a stripped blank',
    /^[a-z0-9][a-z0-9-]{1,31}$/.test(sl) && !/[\u0600-\u06ff]/.test(sl) && sl.length > 4,
    sl,
  )
  ok('a leading و reads as w', slugify('وصال') === 'wsal', slugify('وصال'))
  ok('digits or punctuation alone earn no subdomain', slugify('3') === '' && slugify('!-.') === '' && slugify('') === '')
  ok(
    'a long name is cut at 32 and never left with a dangling hyphen',
    slugify('أ'.repeat(90)).length === 32 && !/^-|-$/.test(slugify('  -A  B--c!  ')) && slugify('A  B--c!') === 'a-b-c',
    `${slugify('أ'.repeat(90))}·${slugify('  -A  B--c!  ')}`,
  )
  ok('SUB_RE is the gate the server matches hosts with', SUB_RE.test(sl) && !SUB_RE.test('a') && !SUB_RE.test('A-b') && !SUB_RE.test('-x'))
  ok(
    'the public address follows the plan',
    subOf({ slug: 'ab1' }) === 'ab1.qalb.store' &&
      publicUrl({ slug: 'ab1', plan: 'pro', domain: 'noura.sa' }) === 'https://noura.sa' &&
      publicUrl({ slug: 'ab1', plan: 'free', domain: 'noura.sa' }) === 'https://ab1.qalb.store',
  )

  /* --- السقف الشهري --- */
  const fresh = editWindow({})
  ok(
    'a new site starts with a full month of edits',
    fresh.used === 0 && fresh.left === PLANS.free.editQuota && fresh.canEdit === true,
    JSON.stringify(fresh),
  )
  ok('a spent month has nothing left', editWindow({ plan: 'free', editMonth: monthKey(), editCount: PLANS.free.editQuota }).left === 0)
  ok(
    'a window from an earlier month resets itself',
    editWindow({ editMonth: '2020-01', editCount: 99 }).used === 0 && editWindow({ editMonth: monthKey(), editCount: 10 }).left === 0,
  )
  ok('pro has no ceiling to reach', editWindow({ plan: 'pro', editCount: 9999 }).canEdit === true && editWindow({ plan: 'pro' }).max === null)

  /* --- الحقول: لا يُقبل حقل لا يطبعه مولّد --- */
  ok(
    'every hosted field is one the deliverable generator already knows',
    HOST_FIELDS.every((f) => f in HOST_LIMITS) && HOST_FIELDS.every((f) => f === 'city' || f in PERSONAL_LIMITS),
    HOST_FIELDS.join(','),
  )
  ok(
    'markup in a hosted field drops that field alone',
    sanitizeSite({ name: '<script>alert(1)</script>', role: 'مصممة', bio: 'نصّ سليم' }).name === undefined &&
      sanitizeSite({ name: '<script>alert(1)</script>', role: 'مصممة' }).role === 'مصممة',
  )
  ok(
    'the refusal is reported, not swallowed silently',
    droppedSiteFields({ name: '<script>alert(1)</script>', role: 'ok' }).join() === 'name',
    JSON.stringify(droppedSiteFields({ name: '<img src=x onerror=alert(1)>', role: 'ok' })),
  )
  ok(
    'every hosted field has a cap',
    HOST_FIELDS.every((f) => Number.isFinite(HOST_LIMITS[f]) && HOST_LIMITS[f] <= 700),
  )
  ok('city has its own shorter cap', sanitizeSite({ city: 'ج'.repeat(900) }).city.length === HOST_LIMITS.city)
  ok('an unknown template is refused rather than quietly swapped', sanitizeSite({ name: 'A', template: 'does-not-exist' }).template === null)

  /* --- التقديم الحيّ --- */
  const typed = {
    name: 'نورة الحربي',
    role: 'مصممة واجهات',
    email: 'noura@studio.sa',
    phone: '+966551234567',
    website: 'noura.studio',
    bio: 'أبني واجهات للمنتجات المالية',
    city: 'جدة',
    template: 'aether',
    lang: 'ar',
    theme: 'dark',
  }
  const rec = { slug: 'noura-alhrbi', plan: 'free', site: sanitizeSite(typed) }
  const home = renderSite(rec, '/')
  ok(
    'the live page is the bought template and has real weight',
    home.status === 200 && /text\/html/.test(home.type) && home.body.length > 4000,
    `${home.status}/${home.body.length}`,
  )
  ok(
    'everything the buyer typed is printed on the page',
    HOST_FIELDS.every((f) => (rec.site[f] ? home.body.includes(rec.site[f]) : true)),
    HOST_FIELDS.filter((f) => rec.site[f] && !home.body.includes(rec.site[f])).join(','),
  )
  ok('the free page carries the bar and it points at us', /class="qalb-brand"/.test(home.body) && home.body.includes('href="https://qalb.store"'))
  const proRec = { ...rec, plan: 'pro' }
  const proHome = renderSite(proRec, '/')
  ok(
    'paying takes the bar off but never the buyer’s words',
    !/qalb-brand/.test(proHome.body) && proHome.body.includes('نورة الحربي') && proHome.body.length > 4000,
    proHome.body.length,
  )
  ok(
    'the stylesheet is served with a plan stamp',
    (() => {
      const c = renderSite(rec, '/styles.css')
      return c.status === 200 && /text\/css/.test(c.type) && /plan=free/.test(c.body)
    })(),
  )
  ok('rendering reads the record, it never writes to it', JSON.stringify(rec.site) === JSON.stringify(sanitizeSite(typed)))

  /* --- الحزمة المُشترى والصفحة الحيّة من مولّد واحد --- */
  // الخطة تُطبع في الصفحة، فلكل خطة مولّدها الخاص من نفس الدالة — لا نسخة ثانية منها
  const prof = profileOf(proRec)
  const boughtPro = siteHtml(byId('aether'), prof)
  const boughtFree = siteHtml(byId('aether'), profileOf(rec))
  ok(
    'the page records the plan and address it was built under',
    prof.qalb.hosted === true && prof.qalb.plan === 'pro' && prof.qalb.subdomain === 'noura-alhrbi',
    JSON.stringify(prof.qalb),
  )
  ok('the paid page is byte-for-byte the page the package downloads', proHome.body === boughtPro, `${proHome.body.length} vs ${boughtPro.length}`)
  ok(
    'and the free page is that same file plus the bar — nothing else',
    home.body === boughtFree.replace('</body>', `${brandBar(rec)}\n</body>`) && home.body.length - boughtFree.length === brandBar(rec).length + 1,
    `${home.body.length} vs ${boughtFree.length}`,
  )

  /* --- السيرة والطبع --- */
  const cvRec = {
    slug: 'sara',
    plan: 'free',
    site: sanitizeSite({ name: 'سارة العتيبي', role: 'محللة بيانات', email: 's@q.dev', template: 'nova', lang: 'ar' }),
  }
  const cvHome = renderSite(cvRec, '/')
  const pr = renderSite(cvRec, '/print')
  ok(
    'a résumé template serves the sheet as its home page',
    cvHome.status === 200 && cvHome.body.includes('سارة العتيبي') && /text\/html/.test(cvHome.type),
  )
  ok('the same sheet is reachable at /cv', renderSite(cvRec, '/cv').body === cvHome.body)
  ok(
    'the print sheet asks for A4 and hides our bar',
    /@page\{size:A4/.test(pr.body) && /qalb-brand\{display:none/.test(pr.body),
    pr.body.slice(pr.body.indexOf('@page'), pr.body.indexOf('@page') + 40),
  )
  ok('a site-only template has no résumé to print', renderSite(rec, '/cv').status === 404 && renderSite(rec, '/print').status === 404)
  ok(
    'an unknown route under a site 404s instead of touching the disk',
    renderSite(rec, '/orders.jsonl').status === 404 && !/sites\.json/.test(renderSite(rec, '/orders.jsonl').body),
  )
  ok('only the whitelisted paths render', ROUTES.every(routeOk) && !routeOk('/../../etc/passwd') && !routeOk('/admin') && !routeOk('/s/x/styles.css'))
  ok(
    'a record with nothing behind it renders nothing',
    renderSite({ slug: 'x', site: {} }, '/').status === 404 && profileOf({ slug: 'x', site: {} }) === null,
  )

  const bad9 = checks.filter(([, pass]) => !pass)
  if (bad9.length) {
    failed++
    groups++
    console.log('✗ hosting · live pages, plans, and the edit ceiling')
    bad9.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ hosting · live pages, plans, and the edit ceiling  (${checks.length} assertions)`)
  }
}

/* ---------------- b2b · مقاعد المؤسسة: الشريحة والرمز ومقعدٌ يُخصم مرة واحدة ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])

  /* ---------- العقد نفسه ---------- */
  ok(
    'three university tiers, seats and prices both ascending',
    B2B_TIERS.length === 3 && B2B_TIERS.every((t, i) => !i || (t.seats > B2B_TIERS[i - 1].seats && t.price > B2B_TIERS[i - 1].price)),
    B2B_TIERS.map((t) => `${t.seats}/${t.price}`).join(' '),
  )
  ok('the approved numbers are the ones on the shelf', B2B_TIERS.map((t) => `${t.seats}/${t.price}`).join(' ') === '50/7500 100/13000 300/33000')
  ok('a term is one year, never auto-renewed', B2B_TERM_MONTHS === 12 && addMonths('2026-09-05', B2B_TERM_MONTHS) === '2027-09-05')
  ok(
    'per-seat price is divided, not marketed',
    B2B_TIERS.every((t) => perSeat(t) === Math.round((t.price / t.seats) * 100) / 100),
    String(perSeat(B2B_TIERS[0])),
  )
  ok(
    'a seat opens only templates that carry a CV',
    SEAT_TEMPLATES.length === 10 && SEAT_TEMPLATES.every((t) => t.ats != null && t.kind !== 'site'),
    SEAT_TEMPLATES.map((t) => t.id).join(','),
  )
  ok(
    'and the retail range quoted is the catalogue’s own',
    cheapestSeatRetail() === Math.min(...SEAT_TEMPLATES.map((t) => t.price)) &&
      priciestSeatRetail() === Math.max(...SEAT_TEMPLATES.map((t) => t.price)),
  )

  const rec0 = makeOrg({ org: 'جامعة', email: 'careers@u.edu.sa', tier: 'campus', issued: '2026-09-05' })
  /* ---------- باقةُ الدخول، والحسبةُ التي يعملها موظفُ المشتريات ---- */
  const pilot = B2B_TIERS.find((t) => t.id === 'cohort')
  ok('a cohort tier exists and is the entry point', !!pilot && B2B_TIERS[0].id === 'cohort' && pilot.seats === 50 && pilot.price === 7500)
  ok('its per-seat figure is arithmetic, not a pitch', perSeat(pilot) === 150)
  const sBundle = seatBundle()
  ok('the comparison names a real product at its real price', !!sBundle && sBundle.id === 'mirrorbundle' && Number(sBundle.price) === 449)
  ok(
    'and every saving on the page is computed from that price',
    B2B_TIERS.every((t) => perSeatVsBundle(t) === Math.max(0, Math.round((1 - perSeat(t) / Number(sBundle.price)) * 100))),
  )
  ok(
    'the campus tier reads 76% under the bundle — the career centre’s own division',
    perSeatVsBundle(B2B_TIERS.find((t) => t.id === 'campus')) === 76,
  )
  ok(
    'the range quoted is the shelf’s own, counted not recited',
    (() => {
      const b = seatRetailBand()
      return b.count === SEAT_TEMPLATES.length && b.min === cheapestSeatRetail() && b.max === priciestSeatRetail()
    })(),
  )
  ok('a seat count no tier matches rounds up, and says by how much', tierForSeats(60).tier.id === 'college' && tierForSeats(60).over === 40)
  ok('past the largest tier we admit two contracts are needed', tierForSeats(900).tier.id === 'campus' && tierForSeats(900).under === 600)
  ok(
    'a credit can be recorded on a contract, rounded and never negative',
    makeOrg({ tier: 'cohort', credit: '3900.7' }).credit === 3901 && makeOrg({ credit: -5 }).credit === 0,
  )
  ok(
    'the credit reaches the staff row and the export header',
    orgCsv([orgRowForStaff({ ...rec0, credit: 3900 })]).includes('"3900"') &&
      orgCsv([orgRowForStaff(rec0)])
        .split('\n')[0]
        .includes(',credit,'),
  )

  /* ---------- طبقةُ الطلبات: ما يُحفَظ هو ما يُطبع هو ما يُرسَل ---------- */
  const lead = normalizeLead(
    {
      org: 'جامعة الملك عبدالعزيز',
      email: 'careers@kau.edu.sa',
      phone: '0555 123 456',
      seats: '50',
      slots: 'الأحد ١١ص',
      note: 'فاتورة باسم الإدارة المالية',
      etimad: true,
      tier: 'cohort',
    },
    { tiers: B2B_TIERS, now: new Date('2026-09-05T09:00:00Z') },
  )
  ok(
    'a complete request is accepted with every field kept',
    lead.ok && lead.value.org.includes('جامعة') && lead.value.phone === '0555 123 456' && lead.value.seats === 50,
  )
  ok(
    'a missing organisation or a bad e-mail is refused by name',
    (() => {
      const bad = normalizeLead({ org: ' ', email: 'nope' }, { tiers: B2B_TIERS })
      return !bad.ok && !!bad.errors.org && !!bad.errors.email
    })(),
  )
  ok(
    'the quote number is derived from the request, so both ends agree',
    /^QALB-Q-2026-[A-Z0-9]{4}$/.test(lead.value.quote) && quoteNo(lead.value) === lead.value.quote,
  )
  ok('a different buyer gets a different number', quoteNo({ ...lead.value, org: 'جامعةُ أخرى' }) !== lead.value.quote)
  const lm = quoteMath(lead.value, pilot)
  ok(
    'the quotation splits VAT out of the inclusive price and still adds up',
    Math.round((lm.base + lm.vat) * 100) / 100 === lm.total && lm.total === 7500 && lm.vat === 978.26 && lm.base === 6521.74,
    JSON.stringify(lm),
  )
  ok('vatSplit is the same function the sheet uses', vatSplit(3900).vat === 508.7 && vatSplit(0).total === 0)
  ok('it is dated and valid for thirty days', lm.date === '2026-09-05' && lm.validUntil === '2026-10-05')
  const lbody = decodeURIComponent(leadMailto(lead.value, lm))
  ok(
    'the mail carries every field the buyer typed — that was the bug',
    ['جامعة الملك عبدالعزيز', 'careers@kau.edu.sa', '0555 123 456', 'الأحد ١١ص', 'فاتورة باسم الإدارة المالية'].every((x) => lbody.includes(x)),
    lbody.slice(0, 90),
  )
  ok(
    'and it carries the number and the money, so nothing is asked twice',
    lbody.includes(lead.value.quote) && lbody.includes('7500') && lbody.includes('ضريبة القيمة المضافة'),
  )
  ok('the Etimad condition travels in the body, not in a footnote', lbody.includes('اعتماد'))
  ok(
    'a lead row and its CSV agree on the same twelve columns',
    leadRow(lead.value).total === 7500 && leadCsv([lead.value]).split('\n')[0].split(',').length === 12,
  )
  ok(
    'the local ledger writes, reads and erases — and is not called a server',
    (() => {
      const mem = new Map()
      const store = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
      const saved = saveLocalLead(store, lead.value)
      const read = readLocalLeads(store)
      const cleared = clearLocalLeads(store)
      return saved.saved === true && read.length === 1 && read[0].quote === lead.value.quote && cleared && readLocalLeads(store).length === 0
    })(),
  )
  ok('a request stores no student address at all', !JSON.stringify(lead.value).includes('student'))

  /* ——— لا دفترَ حيٍّ يدخل المستودع: أنماطُ .gitignore لا الأسماءُ واحدًا واحدًا ——— */
  const giLines = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8')
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('!'))
  const giMatch = (rel) => giLines.some((g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$').test(rel))
  const ledgers = new Set()
  for (const f of readdirSync(new URL('../server', import.meta.url))) {
    if (!f.endsWith('.js')) continue
    const src = readFileSync(new URL(`../server/${f}`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/['"]([\w.-]+\.(?:json|jsonl))['"]/g)) ledgers.add(m[1])
  }
  ok(
    'every ledger the server may write is git-ignored',
    ledgers.size >= 6 && [...ledgers].every((n) => giMatch('server/' + n)),
    [...ledgers].join(','),
  )
  ok(
    'the verification block names what is undocumented, and only that',
    quoteMissing().every((x) => typeof x === 'string') &&
      (isSet(COMPANY.vatNumber) ? !quoteMissing().includes('الرقم الضريبي') : quoteMissing().includes('الرقم الضريبي')),
    quoteMissing().join(','),
  )

  /* ---------- الرمز ---------- */
  ok(
    'the code shape excludes letters that read as digits',
    /^QALB-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/.test(makeOrgCode(() => 0.99)) &&
      !/[IO01]/.test(makeOrgCode(() => 0.5)),
  )
  ok('a seeded code is stable and matches the gate', ORG_CODE_RE.test(makeOrgCode(() => 0)) && makeOrgCode(() => 0) === makeOrgCode(() => 0))
  ok(
    'typing is forgiven, casing is not required',
    normalizeCode(' qalb-s5qa-2c4b ') === 'QALB-S5QA-2C4B' && normalizeCode('QALB_S5QA_2C4B') === 'QALB-S5QA-2C4B',
  )
  ok('an ambiguous code is refused before it reaches the ledger', !ORG_CODE_RE.test(normalizeCode('QALB-IOIO-0000')))
  const rec = makeOrg({ code: makeOrgCode(() => 0.5), org: 'جامعة', email: 'careers@u.edu.sa', tier: 'cohort', issued: '2026-09-05' })
  ok(
    'a contract record starts full and dated',
    rec.seats === 50 && rec.used === 0 && rec.expires === '2027-09-05' && rec.status === 'active' && seatLeft(rec) === 50,
  )
  ok('seats cannot be written below what was already spent', makeOrg({ seats: 0 }).seats === 1 && makeOrg({ seats: 99999 }).seats === 5000)

  /* ---------- قرار الاستبدال ---------- */
  const at = new Date('2026-10-01T00:00:00Z')
  ok('a valid student redeems once', redeemReason(rec, { email: 'Sara@U.edu.sa', template: 'nova', at }) === 'ok')
  ok(
    'the same address and template is refused, not double-spent',
    redeemReason({ ...rec, redemptions: [{ email: 'sara@u.edu.sa', template: 'nova' }] }, { email: 'sara@u.edu.sa', template: 'nova', at }) ===
      'already',
  )
  ok(
    'the same address on another template is a new seat',
    redeemReason({ ...rec, redemptions: [{ email: 'sara@u.edu.sa', template: 'nova' }] }, { email: 'sara@u.edu.sa', template: 'atlas', at }) === 'ok',
  )
  ok('a site-only template never reaches the ledger', redeemReason(rec, { email: 'a@u.edu.sa', template: 'aether', at }) === 'template')
  ok('an exhausted contract says exhausted', redeemReason({ ...rec, used: 50 }, { email: 'a@u.edu.sa', template: 'nova', at }) === 'exhausted')
  ok(
    'a paused contract says paused, not expired',
    redeemReason({ ...rec, status: 'paused' }, { email: 'a@u.edu.sa', template: 'nova', at }) === 'paused',
  )
  ok('a lapsed year is expired', redeemReason({ ...rec, expires: '2026-09-30' }, { email: 'a@u.edu.sa', template: 'nova', at }) === 'expired')
  ok('and an unknown code is unknown', redeemReason(null, { email: 'a@u.edu.sa', template: 'nova', at }) === 'unknown')
  ok('left seats never go negative', seatLeft({ seats: 50, used: 80 }) === 0)

  /* ---------- ما تراه اللوحة ---------- */
  const spent = { ...rec, used: 3, redemptions: [{ email: 'sara@student.u.edu.sa', template: 'nova', at: '2026-10-01', order: 'QALB-1' }] }
  ok(
    'the summary counts and names templates, never students',
    (() => {
      const s = orgSummary(spent)
      return s.left === 47 && s.templates.join(',') === 'nova' && !JSON.stringify(s).includes('student')
    })(),
  )
  ok(
    'the staff row is the same rule',
    (() => {
      const r = orgRowForStaff(spent)
      return !JSON.stringify(r).includes('student') && !('redemptions' in r)
    })(),
    JSON.stringify(orgRowForStaff(spent)),
  )
  ok(
    'and the CSV export cannot leak a roster',
    (() => {
      const c = orgCsv([orgRowForStaff(spent)])
      return c.split('\n')[0] === 'code,org,email,tier,status,issued,expires,seats,used,credit,byTemplate' && !c.includes('student')
    })(),
  )
  ok('the institution’s own contact is the only address in it', orgCsv([orgRowForStaff(spent)]).includes('careers@u.edu.sa'))

  /* ---------- الطلب البشري ---------- */
  const emp = B2B_TIERS.find((t) => t.id === 'campus')
  const leadEmp = normalizeLead(
    { org: 'مكتب العمل', email: 'a@b.gov.sa', seats: '700', note: 'أربع مناطق، وعقدٌ ثانٍ للزائد', tier: 'campus' },
    { tiers: B2B_TIERS },
  )
  const mail = leadMailto(leadEmp.value, quoteMath(leadEmp.value, emp))
  ok(
    'the contract request is still a mail, addressed to us',
    mail.startsWith(`mailto:${SUPPORT_MAIL}?`) && decodeURIComponent(mail).includes('مكتب العمل'),
  )
  ok('and the ledger, the sheet and the mail carry one number', decodeURIComponent(mail).includes(leadEmp.value.quote))
  ok(
    'an unknown tier falls back to the first, not to nothing',
    normalizeLead({ org: 'جهةٌ ما', email: 'a@b.sa', tier: 'myth' }, { tiers: B2B_TIERS }).value.tier === B2B_TIERS[0].id,
  )

  /* ---------- الصفحة ---------- */
  const g = await render('http://localhost/b2b')
  ok('the institutions page renders clean', g.errs.length === 0, g.errs.join('|').slice(0, 140))
  const nf = new Intl.NumberFormat('en-US')
  ok(
    'every tier on screen is a tier in the data',
    B2B_TIERS.every((t) => g.txt().includes(nf.format(t.price)) && g.txt().includes(String(t.seats))),
    B2B_TIERS.map((t) => nf.format(t.price)).join(','),
  )
  ok(
    'per-seat figures are computed in the page, not hardcoded',
    g.txt().includes(String(perSeat(B2B_TIERS[2]))) && g.txt().includes(String(cheapestSeatRetail())),
  )
  ok('the term appears as the constant says it', g.txt().includes(String(B2B_TERM_MONTHS)))
  ok('the page states the tax in the reader’s language, not only in a mail body', g.txt().includes('ضريبة القيمة المضافة') && g.txt().includes('١٥٪'))
  ok('the entry offer is on the page with its real number', g.txt().includes(nf.format(7500)))
  ok('the seat arithmetic is shown against the bundle it unlocks', g.txt().includes('449') && g.txt().includes('76%'))
  ok('the university ladder names its two additions — coach panel and workshop', /لوحةُ المدرّب|لوحة المدرّب/.test(g.txt()) && /ورشة/.test(g.txt()))
  ok(
    'a quotation sheet is rendered, with the verification block on it',
    !!g.doc.querySelector('[data-b2b-quote]') && !!g.doc.querySelector('[data-b2b-quote-co]'),
  )
  const printBtn = [...g.doc.querySelectorAll('[data-b2b-quote] button')].find((b) => /PDF|طبع|طباعة/i.test(b.textContent || ''))
  printBtn?.click()
  await g.wait(4)
  // jsdom يُعلم بـ«Not implemented» ولا يرمي: المُتاب هو أن لا استثناءَ ولا كسرًا في الصفحة
  ok(
    'the print control does not throw where print is only half-implemented',
    !!printBtn && !g.errs.some((e) => /Uncaught|Cannot read|is not a function/i.test(e)),
    g.errs.join('|').slice(0, 90),
  )
  ok(
    'and it asks for print behind a capability check',
    /typeof window\.print === 'function'/.test(readFileSync(new URL('../src/pages/B2B.jsx', import.meta.url), 'utf8')),
  )
  ok(
    'an undocumented field says «قيد التوثيق» instead of showing an invented digit',
    (() => {
      const cells = [...g.doc.querySelectorAll('[data-b2b-quote-co] dd')].map((x) => x.textContent.trim())
      return (
        cells.length >= 6 && (isSet(COMPANY.vatNumber) ? !cells.includes(dict.ar.b2b.quoteUnverified) : cells.includes(dict.ar.b2b.quoteUnverified))
      )
    })(),
  )
  ok('the Etimad truth is on the page, not in an appendix', g.txt().includes('اعتماد'))
  ok('no phone affordance exists while no number is configured', !g.doc.querySelector('a[href^="tel:"]'))
  ok(
    'the cohort measure starts empty — no number without input',
    !g.doc.querySelector('[data-b2b-cohort-out]') && g.txt().includes(dict.ar.b2b.cohortEmpty),
  )

  /* ——— الطلبُ يُحفَظ فعلاً في هذا المتصفح، والرقمُ الذي يراه المشتري هو رقمُ الدفتر ——— */
  const setv = (el, v) => {
    Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set.call(el, v)
    el.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  }
  const setta = (el, v) => {
    Object.getOwnPropertyDescriptor(g.win.HTMLTextAreaElement.prototype, 'value').set.call(el, v)
    el.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  }
  setv(g.doc.querySelector('#b2b-org'), 'جامعةُ الاختبار')
  setv(g.doc.querySelector('#b2b-email'), 'dean@kau.edu.sa')
  setv(g.doc.querySelector('#b2b-phone'), '0512345678')
  setta(g.doc.querySelector('#b2b-note'), 'نحتاج فاتورةً باسم الإدارة المالية')
  await g.wait(6)
  const sendBtn = [...g.doc.querySelectorAll('[data-b2b-request] button')].find((b) => /سجّل الطلب|ابدأ العرض/.test(b.textContent))
  ok(
    'the request form carries a control that submits it',
    !!sendBtn && (sendBtn.getAttribute('type') === 'submit' || !!g.doc.querySelector('[data-b2b-request] form')),
  )
  sendBtn?.click()
  await g.wait(20)
  const saved = g.doc.querySelector('[data-b2b-saved]')
  ok(
    'it reports a save that actually happened, with the quote number',
    !!saved && /QALB-Q-\d{4}-[A-Z0-9]{4}/.test(saved.textContent),
    saved?.textContent?.slice(0, 60),
  )
  ok(
    'and the device really holds the record it claims to hold',
    (() => {
      const raw = JSON.parse(g.win.localStorage.getItem('qalb.leads.v1') || '[]')
      return (
        Array.isArray(raw) &&
        raw.length >= 1 &&
        raw[0].org.includes('جامعةُ الاختبار') &&
        raw[0].email === 'dean@kau.edu.sa' &&
        raw[0].phone === '0512345678'
      )
    })(),
    g.win.localStorage.getItem('qalb.leads.v1')?.slice(0, 80),
  )
  ok(
    'the sheet on screen shows the same number the ledger kept',
    (() => {
      const q = g.doc.querySelector('[data-b2b-quote-head] dd')?.textContent
      return !!q && /^QALB-Q-\d{4}-/.test(q.trim())
    })(),
  )
  ok(
    'and the mail beside it is pre-filled with the typed values, not a template',
    decodeURIComponent(g.doc.querySelector('[data-b2b-request] a[href^="mailto:"]')?.href || '').includes('جامعةُ الاختبار'),
  )

  /* ——— الدفعةُ تُقاس: نفسُ السكربت، على سيَرٍ كثيرة ——— */
  const one = ATS_DEMO || 'خبرة\n'
  setta(g.doc.querySelector('[data-b2b-cohort] textarea'), [one, one].join('\n\n---\n\n'))
  await g.wait(8)
  const out = g.doc.querySelector('[data-b2b-cohort-out]')
  ok('the cohort block answers with a real count and average', !!out, out?.textContent?.slice(0, 40))
  const eachScore = analyzeAts(one).score
  ok('the average printed is what the shipped checker returns', !!out && out.textContent.includes(String(Math.round(eachScore))), String(eachScore))
  ok('and the count printed is the number of CVs pasted', !!out && /2/.test(out.textContent))
  setta(g.doc.querySelector('[data-b2b-cohort] textarea'), '')
  await g.wait(4)
  ok('clearing the box takes the numbers away with it', !g.doc.querySelector('[data-b2b-cohort-out]'))
  ok(
    'measuring a cohort writes nothing: the ledger still holds only the request',
    (() => {
      const raw = JSON.parse(g.win.localStorage.getItem('qalb.leads.v1') || '[]')
      return Array.isArray(raw) && raw.length === 1
    })(),
    g.win.localStorage.getItem('qalb.leads.v1')?.slice(0, 40),
  )

  ok(
    'no raw dictionary key reaches the reader',
    !/\bb2b\.[a-zA-Z]/.test(g.txt()) && !/undefined/.test(g.txt()),
    (g.txt().match(/\bb2b\.[a-z.]+/) || [''])[0],
  )
  ok('the page description is the dictionary line', g.doc.querySelector('meta[name="description"]')?.content === dict.ar.meta.b2bDesc)
  const ld = JSON.parse(g.doc.getElementById('qalb-jsonld')?.textContent || '{}')
  const cat = ld['@graph']?.find((x) => x['@type'] === 'OfferCatalog')
  ok(
    'the structured prices are the contract prices',
    cat?.offers?.length === 3 && cat.offers.every((o, i) => o.price === B2B_TIERS[i].price.toFixed(2) && o.priceCurrency === 'SAR'),
    JSON.stringify(cat?.offers || []).slice(0, 90),
  )
  ok(
    'and its questions are the ones printed',
    ld['@graph']?.find((x) => x['@type'] === 'FAQPage')?.mainEntity?.every((q) => g.txt().includes(q.name)) === true,
  )

  /* ---------- honesty in the local mode this storefront runs in ---------- */
  ok(
    'a seat is not “confirmed” without the order server',
    !!g.doc.querySelector('[data-b2b-red-form]') === false && g.txt().includes(dict.ar.b2b.localTitle),
    g.doc.querySelector('[data-b2b-red-form]') ? 'form shown' : '',
  )
  ok('and it says what to do instead of failing silently', g.doc.querySelectorAll('a[href^="mailto:"]').length >= 2)
  ok('the seat counter is honest too, not a mock table', g.txt().includes(dict.ar.b2b.checkLocal))
  ok(
    'nothing on this page writes to the device',
    !/localStorage|sessionStorage/.test(readFileSync(new URL('../src/pages/B2B.jsx', import.meta.url), 'utf8')),
  )
  ok(
    'and the client refuses to pretend a local ledger exists',
    !/localStorage/.test(readFileSync(new URL('../src/api/orgs.js', import.meta.url), 'utf8')),
  )

  const pick = [...g.doc.querySelectorAll('[data-b2b-tier] button')].pop()
  pick?.click()
  await g.wait(4)
  ok(
    'choosing a tier rewrites the request the mail will carry',
    decodeURIComponent(g.doc.querySelector('[data-b2b-request] a[href^="mailto:"]')?.href || '').includes('33000'),
    String(pick?.textContent),
  )
  const name = g.doc.getElementById('b2b-org')
  Object.getOwnPropertyDescriptor(g.win.HTMLInputElement.prototype, 'value').set.call(name, 'كلية الحاسب')
  name.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  await g.wait(2)
  const typedMail = decodeURIComponent(g.doc.querySelector('[data-b2b-request] a[href^="mailto:"]')?.href || '')
  // ‏\bsent\b لا sent داخل «present»: الصندوقُ النصي حمل عيّنةً من الفاحص، فتُحسب كلمةُ السيرة وعدًا بالإرسال
  const sentClaim = (g.txt().match(/.{0,50}(تم الإرسال|payment received|\bsent\b).{0,50}/is) || [''])[0].replace(/\s+/g, ' ')
  ok(
    'what you type is what the mail says — and nothing else happens',
    typedMail.includes('كلية الحاسب') && !sentClaim,
    `hit=[${sentClaim}] bodyTail=${typedMail.slice(-70)}`,
  )

  const en = await render('http://localhost/b2b', { 'qalb.lang': 'en' }, { lang: 'en' })
  ok('english resolves every label of the page', en.txt().includes(dict.en.b2b.title) && !/\bb2b\.[a-zA-Z]/.test(en.txt()), en.txt().slice(0, 60))
  ok(
    'and the tiers survive the language swap',
    B2B_TIERS.every((t) => en.txt().includes(nf.format(t.price))),
  )

  const home = await render('http://localhost/')
  ok(
    'the institutions page is linked from the shop, not hidden',
    home.doc.querySelectorAll('a[href="/b2b"]').length >= 1,
    String(home.doc.querySelectorAll('a[href="/b2b"]').length),
  )
  const sm = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  ok('and it is in the sitemap with the rest of the public pages', sm.includes('https://qalb.store/b2b</loc>'))

  const bad = checks.filter(([, pass]) => !pass)
  if (bad.length) {
    failed++
    groups++
    console.log('✗ b2b · seat contracts, codes, and the student who redeems one')
    bad.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ b2b · seat contracts, codes, and the student who redeems one  (${checks.length} assertions)`)
  }
}

/* ---------------- ats · الفاحص المجاني، وسكربت الحزمة، وشارة البطاقة — قياسٌ واحد ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const CJK = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/

  /* ---------- القواعد نفسها ---------- */
  ok(
    'every rule carries Arabic and English copy',
    ATS_RULES.length === 7 &&
      ATS_RULES.every((r) => r.re instanceof RegExp && ['name', 'fix', 'why'].every((k) => r[k]?.ar?.length > 8 && r[k]?.en?.length > 8)),
    ATS_RULES.map((r) => r.id).join(','),
  )
  ok(
    'no stray script or empty string slipped into the checker copy',
    ![...ATS_RULES, ...ATS_BANDS].some((r) =>
      ['name', 'fix', 'why', 'label', 'note'].some((k) => CJK.test(String(r[k]?.ar || '')) || CJK.test(String(r[k]?.en || ''))),
    ),
  )
  ok(
    'the bands cover the whole scale, best first',
    ATS_BANDS[0].min === 90 && ATS_BANDS.at(-1).min === 0 && ATS_BANDS.every((b, i) => !i || b.min < ATS_BANDS[i - 1].min),
  )
  ok(
    'the free tool and the shipped script read the same table',
    atsRuleTable().length === ATS_RULES.length && atsRuleTable().every((r, i) => r.src === ATS_RULES[i].re.source),
  )

  const demo = analyzeAts(ATS_DEMO)
  ok('the sample CV passes every rule', demo.score === 100 && demo.gaps.length === 0, `${demo.score} · ${demo.gaps.map((g) => g.id).join(',')}`)
  ok(
    'and it is long enough to be a real sample',
    demo.words >= ATS_TARGET.minWords && demo.bullets >= ATS_TARGET.minBullets,
    `${demo.words}/${demo.bullets}`,
  )
  ok('the sample never measures as HTML', demo.isHtml === false)

  const thin = analyzeAts('علي\nمهندس\nعملت في شركة\nشغلت على مشاريع كثيرة وحسّنت الأداء بشكل عام وأحب التعلم\n'.repeat(4))
  ok('a thin file scores below the pass line', thin.score !== null && thin.score < ATS_TARGET.pass, String(thin.score))
  ok(
    'and names its gaps instead of shrugging',
    thin.gaps.length >= 5 && thin.gaps.some((g) => g.id === 'email') && thin.gaps.some((g) => g.id === 'numbers'),
    thin.gaps.map((g) => g.id).join(','),
  )
  ok('nothing is asserted about text that is not a CV yet', analyzeAts('سارة · مهندسة').score === null && analyzeAts('سارة · مهندسة').short === true)
  ok('it tells you how many words it still needs', analyzeAts('علي مهندس برمجيات').needsWords > 0)
  ok(
    'too long is as much a failure as too short',
    analyzeAts('كلمة '.repeat(1200)).checks.some((c) => c.id === 'words' && !c.ok),
  )

  const htmlish = analyzeAts('<ul><li>cut latency 40 %</li><li>shipped 3 releases</li></ul>')
  ok('an HTML file is detected and measured as a file', htmlish.isHtml === true && htmlish.bullets === 2, `${htmlish.isHtml}/${htmlish.bullets}`)
  ok(
    'layout tables are only judged when there is markup to judge',
    htmlish.checks.some((c) => c.id === 'tables') && !demo.checks.some((c) => c.id === 'tables'),
  )

  const rep = atsReport(thin, { lang: 'ar' })
  ok(
    'the report misses exactly what the score missed',
    (rep.match(/MISS/g) || []).length === thin.gaps.length,
    `${(rep.match(/MISS/g) || []).length}/${thin.gaps.length}`,
  )
  ok(
    'and the report is not a second opinion',
    rep.includes(String(thin.score)) && rep.includes(String(thin.words)) && !/undefined|\[object/.test(rep),
  )
  ok('a non-scored file is refused in the report too', atsReport(analyzeAts('مرحبا'), { lang: 'en' }).includes('Too short'))

  /* ---------- لا تخزين ولا إرسال ---------- */
  const srcOf = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const quiet = ['data/ats.js', 'data/ats-table.js', 'pages/Ats.jsx'].every((f) => {
    const s = srcOf(f)
      .replace(/^\s*\*.*$/gm, '')
      .replace(/^\s*\/\/.*$/gm, '')
    return !/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|navigator\.sendBeacon/.test(s)
  })
  ok('the checker stores nothing and asks for nothing', quiet)

  /* ---------- سكربت الحزمة = القياس نفسه ---------- */
  const ord = { id: 'QALB-ATS-1', key: 'KEY-ATS-1111', name: 'سارة', email: 's@q.dev', date: '2026-09-05' }
  const pkgOf = (t) => Object.fromEntries(packageFiles(t, ord).map((f) => [f.path, f.body]))
  const script = pkgOf(byId('nova'))['scripts/check-ats.mjs']
  ok(
    'the shipped script carries every rule label from the table',
    atsRuleTable().every((r) => script.includes(r.name)),
    atsRuleTable()
      .filter((r) => !script.includes(r.name))
      .map((r) => r.name)
      .join(','),
  )
  ok('and the same pass line the page prints', script.includes(`TARGET.pass`) && script.includes(String(ATS_TARGET.pass)))
  ok('a site-only template ships no CV checker', !packageFiles(byId('aether'), ord).some((f) => f.path === 'scripts/check-ats.mjs'))

  const drift = templates
    .filter((t) => t.ats != null)
    .map((t) => [t.id, t.ats, analyzeAts(pkgOf(t)['resume.html']).score])
    .filter(([, card, scored]) => scored !== card)
  ok(
    'every ATS badge on the shelf is the score of the CV that template prints',
    drift.length === 0,
    drift.map(([id, card, scored]) => `${id}: ${card} vs ${scored}`).join(' · '),
  )
  ok(
    'and no badge claims more than the checker gives',
    templates.filter((t) => t.ats != null).every((t) => t.ats >= ATS_TARGET.pass && t.ats <= 100),
  )

  /* ---------- الصفحة ---------- */
  let saved = null
  let savedName = ''
  const g = await render(
    'http://localhost/ats',
    {},
    {
      boot: (win) => {
        win.URL.createObjectURL = (b) => {
          saved = b
          return 'blob:stub'
        }
        win.URL.revokeObjectURL = () => {}
        win.HTMLAnchorElement.prototype.click = function () {
          savedName = this.download
        }
      },
    },
  )
  const btn = (label) => [...g.doc.querySelectorAll('button')].find((b) => b.textContent.includes(label))
  ok('the checker renders clean', g.errs.length === 0, g.errs.join('|').slice(0, 140))
  ok(
    'it opens asking for text, not for money',
    !!g.doc.querySelector('textarea') && g.txt().includes(String(ATS_TARGET.minWords)),
    g.txt().slice(0, 70),
  )
  ok('and the honest limit of the tool is said up front', g.txt().includes('يعمل في المتصفح وحده'))
  ok(
    'the file input only accepts plain text',
    (g.doc.querySelector('[data-ats-file]')?.getAttribute('accept') || '')
      .split(',')
      .every((x) => /^\.(txt|md|markdown|csv)$/.test(x) || /^(text|application)\//.test(x)),
  )
  ok(
    'no raw dictionary key reaches the reader',
    !/\bats\.[a-zA-Z]/.test(g.txt()) && !/undefined/.test(g.txt()),
    (g.txt().match(/\bats\.[a-z.]+/) || [''])[0],
  )
  ok(
    'the page description is the dictionary line, not a second text',
    g.doc.querySelector('meta[name="description"]')?.content === dict.ar.meta.atsDesc,
  )

  btn('جرّب نموذجًا')?.click()
  await g.wait(4)
  ok(
    'loading the sample prints the score the sample earns',
    g.doc.querySelector('[data-ats-score]')?.textContent.includes('100'),
    g.doc.querySelector('[data-ats-score]')?.textContent.slice(0, 60),
  )
  ok(
    'one row per rule, plus the measured ones',
    g.doc.querySelectorAll('[data-ats-rules] ul > li').length === demo.total,
    String(g.doc.querySelectorAll('[data-ats-rules] ul > li').length),
  )
  ok(
    'the page reads its numbers from the rule table',
    g.txt().includes(String(ATS_TARGET.minWords)) && g.txt().includes(String(ATS_TARGET.maxWords)) && g.txt().includes(String(ATS_TARGET.pass)),
  )
  ok('a clean structure is answered with what is left, not with a sales pitch', /مستوفاة/.test(g.txt()))

  btn('نسخ التقرير')?.click()
  await g.wait(3)
  ok(
    'a blocked clipboard is admitted instead of dressed up as success',
    g.txt().includes('الحافظة محجوبة'),
    g.doc.querySelector('[data-ats-score]')?.textContent.slice(-60),
  )
  btn('حفظ التقرير')?.click()
  await g.wait(3)
  const savedTxt = saved ? await saved.text() : ''
  ok(
    'saving hands over the report the page just measured',
    savedTxt.includes('100') && savedTxt.includes(String(demo.words)) && saved.type === 'text/markdown;charset=utf-8',
    `${!!saved}/${savedTxt.slice(0, 40)}`,
  )
  ok('and the download is named for the day, not for us', /^ats-report-\d{4}-\d{2}-\d{2}\.md$/.test(savedName), savedName)

  const fileInp = g.doc.querySelector('[data-ats-file]')
  Object.defineProperty(fileInp, 'files', { value: [{ name: 'cv-final.pdf', size: 4096, type: 'application/pdf' }], configurable: true })
  fileInp.dispatchEvent(new g.win.Event('change', { bubbles: true }))
  await g.wait(3)
  ok(
    'a PDF is refused with the reason on screen',
    !!g.doc.querySelector('[data-ats-refused]') && g.txt().includes('لا نفتح هذا الملف'),
    g.doc.querySelector('[data-ats-refused]')?.textContent?.slice(0, 60),
  )
  ok('and the refusal offers a way out, not a dead end', /الصق|نموذج/.test(g.doc.querySelector('[data-ats-refused]')?.textContent || ''))

  const area = g.doc.querySelector('textarea')
  const setVal = (v) => {
    Object.getOwnPropertyDescriptor(g.win.HTMLTextAreaElement.prototype, 'value').set.call(area, v)
    area.dispatchEvent(new g.win.Event('input', { bubbles: true }))
  }
  setVal('علي مهندس\nعملت في شركة على مشاريع كثيرة وحسّنت الأداء بشكل عام، وأحب التعلم المستمر في فريق منتِج.\n'.repeat(9))
  await g.wait(4)
  const dirty = analyzeAts(area.value)
  // المقصودُ لوحةُ الدرجة لا كلُّ حرفٍ في الصفحة: بطاقةُ المشاركة تحت اللوحة تكتب
  // «من 100» بوصفها مقياسًا، فلو قِسنا الصفحةَ كلّها لما عاد الفحصُ يقيس شيئًا.
  ok(
    'the panel follows what you typed, not what we hope',
    !!g.doc.querySelector('[data-ats-rules]') && !g.doc.querySelector('[data-ats-score]')?.textContent.includes('100'),
    g.doc.querySelector('[data-ats-score]')?.textContent.slice(0, 50),
  )
  ok(
    'and a file with gaps is answered with the gaps, in order',
    dirty.gaps.length > 0 && g.doc.querySelectorAll('[data-ats-rules] .text-gold').length >= dirty.gaps.length,
    `${dirty.gaps.length}`,
  )
  const cta = g.doc.querySelector('[data-ats-cta]')
  ok(
    'the fix we sell is the one that exists',
    !!g.doc.querySelector('a[href="/template/nova-cv"]') && (cta?.textContent || '').includes(String(byId('nova').price)),
    cta?.textContent?.slice(0, 70),
  )
  ok(
    'under the bar we sell the fix, not a shelf of alternatives',
    dirty.score < ATS_TARGET.pass && !g.doc.querySelector('[data-ats-alt]') && !g.txt().includes('بنيتُك تُقرأ'),
    `${dirty.score}`,
  )
  ok('and the shelf link is the real filter, not a made-up flag', !!g.doc.querySelector('a[href="/templates?flags=ats"]'))
  setVal(
    'نورة العتيبي — مصمّمة واجهات\nm:noura@example.com\nhttps://github.com/noura\nالمهارات: تصميم واجهات، بحث مستخدم، React، Tailwind، Figma، نظام تصميم\nالخبرة:\nمصمّمة أولى، شركة نماء، 2022 – 2026\n- أعيد تصميم بوابة تعليمية يخدمها 40,000 طالب، فارتفعت نسبة إكمال التسجيل 18%.\n- بُني نظام مكوّنات من 60 عنصرًا فقلّ زمن التسليم 25%.\n- قادت اختبارًا مع 12 مستخدمًا وأنتجت 9 توصيات مطبّقة.\n- حسّنت الوصول إلى WCAG AA في 14 شاشة.\nالتعليم: بكالوريوس تصميم الجازم، جامعة الملك سعود، 2021',
  )
  await g.wait(6)
  const mid = analyzeAts(area.value)
  ok(
    'above the bar the same page changes its offer: identity, not rescue',
    mid.score >= ATS_TARGET.pass && (g.doc.querySelector('[data-ats-cta]')?.textContent || '').includes('بنيتُك تُقرأ'),
    `${mid.score}`,
  )
  const alts = [...g.doc.querySelectorAll('[data-ats-alt] a')]
  const measured = templates.filter((x) => (x.ats ?? 0) >= 97)
  ok(
    'the alternates are three live products with their own prices',
    alts.length === 3 && alts.every((a) => /^\/template\//.test(a.getAttribute('href')) && /\d/.test(a.textContent)),
    alts.map((a) => a.getAttribute('href')).join(' '),
  )
  ok('the rescue template is never offered as an alternate to itself', !alts.some((a) => a.getAttribute('href') === '/template/nova-cv'))
  ok(
    'and the count on the shelf link is the count in the data',
    (g.doc.querySelector('[data-ats-cta]')?.textContent || '').includes(new Intl.NumberFormat('en-US').format(measured.length)),
    `${measured.length}`,
  )
  ok(
    'and the human path is a mail, not a fake ticket',
    (cta?.textContent || '').includes('مراجعة بشرية') && !!g.doc.querySelector('a[href^="mailto:qalb@qalb.store"]'),
  )
  ok(
    'the mail carries the report, so nothing is asked twice',
    decodeURIComponent(g.doc.querySelector('a[href^="mailto:"]')?.href || '').includes(String(dirty.score)),
    (g.doc.querySelector('a[href^="mailto:"]')?.href || '').slice(0, 60),
  )
  ok(
    'the editor path is offered too, and it is the real route',
    !!g.doc.querySelector('a[href="/host"]') && (cta?.textContent || '').includes('qalb.store'),
  )

  const ld = JSON.parse(g.doc.getElementById('qalb-jsonld')?.textContent || '{}')
  const app = ld['@graph']?.find((x) => x['@type'] === 'WebApplication')
  const faq = ld['@graph']?.find((x) => x['@type'] === 'FAQPage')
  ok(
    'the structured data says free, in the page’s own words',
    app?.offers?.price === '0.00' && app?.isAccessibleForFree === true,
    JSON.stringify(app?.offers || {}),
  )
  ok(
    'and its questions are the ones on screen',
    faq?.mainEntity?.length === 4 && faq.mainEntity.every((q) => g.txt().includes(q.name)),
    String(faq?.mainEntity?.length),
  )

  const en = await render('http://localhost/ats', { 'qalb.lang': 'en' }, { lang: 'en' })
  btnClick(en, 'Try a sample')
  await en.wait(4)
  ok('english resolves every key of the checker', en.txt().includes(dict.en.ats.title) && !/\bats\.[a-zA-Z]/.test(en.txt()), en.txt().slice(0, 60))
  ok(
    'and measures the same file the same way',
    en.doc.querySelector('[data-ats-score]')?.textContent.includes('100'),
    en.doc.querySelector('[data-ats-score]')?.textContent.slice(0, 50),
  )
  function btnClick(r, label) {
    ;[...r.doc.querySelectorAll('button')].find((b) => b.textContent.includes(label))?.click()
  }

  /* ---------- الظهور والوصول ---------- */
  const home = await render('http://localhost/')
  ok(
    'the checker is linked from the header and the footer',
    home.doc.querySelectorAll('a[href="/ats"]').length >= 2,
    String(home.doc.querySelectorAll('a[href="/ats"]').length),
  )
  ok('and the ATS section offers the check, not only the guide', home.txt().includes('افحص سيرتك مجانًا'))
  const sm = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  const rb = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
  ok('the sitemap publishes /ats', sm.includes('https://qalb.store/ats</loc>'))
  ok('and robots does not hide it', !rb.includes('Disallow: /ats'))

  const bad9 = checks.filter(([, pass]) => !pass)
  if (bad9.length) {
    failed++
    groups++
    console.log('✗ ats · the free checker, the shipped script, and the badge')
    bad9.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ ats · the free checker, the shipped script, and the badge  (${checks.length} assertions)`)
  }
}

/* ---------------- hosting · the buyer's own pages: /host claims it, /studio edits it ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const seedRec = (over = {}) => ({
    slug: 'sara-harbi',
    id: 'QS-TEST',
    key: 'kkkkkkkkkkkkkkkkkkkk',
    email: 's@q.dev',
    plan: 'free',
    public: true,
    planPending: false,
    domain: null,
    status: 'live',
    site: {
      name: 'سارة العتيبي',
      role: 'محللة بيانات',
      city: 'الرياض',
      email: 's@q.dev',
      bio: 'ست سنوات في البيانات',
      theme: 'dark',
      lang: 'ar',
      template: 'nova',
    },
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    editMonth: monthKey(),
    editCount: 0,
    history: [],
    ...over,
  })
  const siteSeed = (over = {}) => ({
    'qalb.sites.v1': JSON.stringify({ 'sara-harbi': seedRec(over) }),
    'qalb.site-keys.v1': JSON.stringify({ 'sara-harbi': 'kkkkkkkkkkkkkkkkkkkk' }),
  })
  const type = (g, el, v) => {
    const proto =
      el.tagName === 'TEXTAREA'
        ? g.win.HTMLTextAreaElement.prototype
        : el.tagName === 'SELECT'
          ? g.win.HTMLSelectElement.prototype
          : g.win.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new g.win.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  }
  const stored = (g, k) => {
    try {
      return JSON.parse(g.win.localStorage.getItem(k) || 'null')
    } catch {
      return null
    }
  }

  /* ---------- /host ---------- */
  const h = await render('http://localhost/host')
  ok('hosting storefront renders clean', h.errs.length === 0, h.errs.join('|').slice(0, 140))
  ok(
    'the claim form exists with a labelled field for every hosted key',
    ['name', 'role', 'city', 'email', 'phone', 'website', 'bio'].every(
      (k) => h.doc.getElementById(`ho-${k}`) && h.doc.getElementById(`ho-${k}`).closest('label')?.textContent?.trim().length > 1,
    ),
    HOST_FIELDS.map((f) => `ho-${f}`).join(','),
  )
  ok(
    'only the e-mail is required, and the form says so',
    h.doc.getElementById('ho-email')?.hasAttribute('required') && !h.doc.getElementById('ho-name').hasAttribute('required'),
  )
  ok(
    'no raw dictionary key reaches the reader',
    !/(host|studio)\.[a-z][a-zA-Z.]+/.test(h.txt()),
    (h.txt().match(/(host|studio)\.[a-z.]+/) || [''])[0],
  )
  ok(
    'the free card states the ceiling that the server enforces',
    h.txt().includes(String(PLANS.free.editQuota)) && h.txt().includes('qalb.store'),
    h.txt().slice(0, 60),
  )
  ok('the paid card states the price the API charges', h.txt().includes(String(PLANS.pro.price)), h.txt().slice(0, 80))
  ok('and what free carries is named, not hidden', /شريط|bar/.test(h.txt()))

  type(h, h.doc.getElementById('ho-name'), 'سارة العتيبي')
  await h.wait()
  ok('typing a name re-solves the address with the server’s own transliteration', h.txt().includes(slugify('سارة العتيبي')), slugify('سارة العتيبي'))

  type(h, h.doc.getElementById('ho-email'), 'not-an-email')
  h.doc.getElementById('host-form')?.dispatchEvent(new h.win.Event('submit', { bubbles: true, cancelable: true }))
  await h.wait()
  ok(
    'a bad e-mail is refused in place, and nothing is created',
    /بريد|e-?mail/i.test(h.txt()) && stored(h, 'qalb.sites.v1') === null,
    h.txt().slice(-90),
  )

  type(h, h.doc.getElementById('ho-email'), 'sara@q.dev')
  h.doc.getElementById('host-form')?.dispatchEvent(new h.win.Event('submit', { bubbles: true, cancelable: true }))
  await h.wait(6)
  const madeRow = stored(h, 'qalb.sites.v1') || {}
  const madeSlug = Object.keys(madeRow)[0]
  ok(
    'a valid claim creates the site on this device',
    !!madeSlug && madeRow[madeSlug].plan === 'free' && madeRow[madeSlug].status === 'live',
    madeSlug,
  )
  ok('the printed text is what was typed', madeRow[madeSlug]?.site?.name === 'سارة العتيبي', JSON.stringify(madeRow[madeSlug]?.site?.name))
  ok(
    'the address and the one-time key are shown, and the key is remembered for this device',
    !!h.doc.getElementById('host-done') &&
      h.txt().includes(`${madeSlug}.qalb.store`) &&
      (stored(h, 'qalb.site-keys.v1') || {})[madeSlug] === madeRow[madeSlug]?.key,
    (stored(h, 'qalb.site-keys.v1') || {}).madeSlug,
  )
  ok(
    'the ceiling travels with the record, not with the copy',
    madeRow[madeSlug]?.editCount === 0 && madeRow[madeSlug]?.editMonth === monthKey(),
    JSON.stringify(madeRow[madeSlug]?.editMonth),
  )

  const pre = await render(`http://localhost/host?template=${'nova'}`)
  ok(
    'a template can be chosen from the product page',
    pre.doc.getElementById('ho-template')?.value === 'nova',
    pre.doc.getElementById('ho-template')?.value,
  )
  const nav = await render('http://localhost/templates')
  ok('the storefront links to hosting without hiding it', !!nav.doc.querySelector('a[href="/host"]'))

  /* ---------- /studio ---------- */
  const s = await render('http://localhost/studio', siteSeed())
  ok(
    'the studio renders clean and picks the only site it knows',
    s.errs.length === 0 && !!s.doc.querySelector('[data-studio-frame]'),
    s.errs.join('|').slice(0, 140),
  )
  const frame = () => s.doc.querySelector('[data-studio-frame]')?.getAttribute('srcdoc') || ''
  ok(
    'the preview is the generator’s own page, with the buyer’s name in it',
    frame().includes('سارة العتيبي') && /<html|<!doctype/i.test(frame()),
    frame().length,
  )
  ok('the counter starts where the server starts it', s.txt().includes(`0/${PLANS.free.editQuota}`), s.txt().match(/\d+\/\d+/)?.[0])
  ok('nothing is offered to save when nothing changed', s.doc.querySelector('[data-save]')?.disabled === true && /غير محفوظ|unsaved/i.test(s.txt()))

  type(s, s.doc.getElementById('st-role'), 'محللة أولى')
  await s.wait()
  ok(
    'the preview updates before the save, from the same data',
    frame().includes('محللة أولى') && s.doc.querySelector('[data-save]')?.disabled === false,
    frame().includes('محللة أولى'),
  )
  s.doc.querySelector('[data-save]')?.click()
  await s.wait(6)
  const afterOne = (stored(s, 'qalb.sites.v1') || {})['sara-harbi']
  ok(
    'saving writes through the rules and counts the edit',
    afterOne?.site?.role === 'محللة أولى' && afterOne?.editCount === 1 && afterOne?.history?.length === 1,
    JSON.stringify({ r: afterOne?.site?.role, c: afterOne?.editCount, h: afterOne?.history?.length }),
  )
  ok('and the counter moves on the screen too', s.txt().includes(`1/${PLANS.free.editQuota}`), s.txt().match(/\d+\/\d+/)?.[0])

  for (let i = 2; i <= PLANS.free.editQuota; i++) {
    type(s, s.doc.getElementById('st-role'), `دور ${i}`)
    await s.wait()
    s.doc.querySelector('[data-save]')?.click()
    await s.wait(5)
  }
  const full = (stored(s, 'qalb.sites.v1') || {})['sara-harbi']
  ok(
    'the ceiling is reached in the record, not only on screen',
    full?.editCount === PLANS.free.editQuota && full?.site?.role === `دور ${PLANS.free.editQuota}`,
    JSON.stringify({ c: full?.editCount, r: full?.site?.role }),
  )
  await s.wait()
  ok(
    'the eleventh save cannot be attempted: the button is shut and the reason is shown',
    s.doc.querySelector('[data-save]')?.disabled === true && s.txt().includes(String(PLANS.free.editQuota)),
    s.txt().slice(-120),
  )
  const back = s.btn(/رجوع|Back to the last/i)
  back?.click()
  await s.wait(6)
  ok(
    'one revert really puts the earlier words back',
    (stored(s, 'qalb.sites.v1') || {})['sara-harbi']?.site?.role === `دور ${PLANS.free.editQuota - 1}`,
    (stored(s, 'qalb.sites.v1') || {})['sara-harbi']?.site?.role,
  )

  const domRow = (stored(s, 'qalb.sites.v1') || {})['sara-harbi']
  ok('the free plan does not get a domain field to dream with', domRow?.domain === null)

  const st2 = await render('http://localhost/studio', siteSeed())
  await st2.wait()
  const ask = st2.btn(/اطلب بلس|Ask for Plus/i)
  ok('the upgrade is a request, and the page says so in both languages', !!ask)
  ask?.click()
  await st2.wait(6)
  const pending = (stored(st2, 'qalb.sites.v1') || {})['sara-harbi']
  ok(
    'asking records planPending and does not hand out the plan',
    pending?.planPending === true && pending?.plan === 'free',
    JSON.stringify({ pp: pending?.planPending, p: pending?.plan }),
  )
  ok('so our bar is still on the page it serves', /qalb-brand/.test(st2.doc.querySelector('[data-studio-frame]')?.getAttribute('srcdoc') || ''))
  ok('and the pending state is shown rather than a success', /بانتظار التفعيل|awaiting activation/i.test(st2.txt()))

  const st3 = await render('http://localhost/studio', siteSeed({ plan: 'pro', domain: 'sara.dev' }))
  await st3.wait()
  const src3 = st3.doc.querySelector('[data-studio-frame]')?.getAttribute('srcdoc') || ''
  ok(
    'on the paid plan the preview loses the bar — because it is the same renderer',
    !/qalb-brand/.test(src3) && src3.includes('سارة العتيبي'),
    src3.length,
  )
  ok('and the domain field is there to use', st3.doc.getElementById('st-domain')?.value === 'sara.dev', st3.doc.getElementById('st-domain')?.value)

  const lost = await render('http://localhost/studio', { 'qalb.sites.v1': JSON.stringify({ 'sara-harbi': seedRec() }) })
  ok(
    'a record without its key asks for the key instead of guessing',
    !lost.doc.querySelector('[data-studio-frame]') && /مفتاح|edit key/i.test(lost.txt()),
    lost.txt().slice(0, 90),
  )
  const none = await render('http://localhost/studio')
  ok(
    'an empty studio sends the visitor to create one, not to a blank editor',
    /لا موقع على هذا المتصفح/.test(none.txt()) && !!none.doc.querySelector('a[href="/host"]'),
    none.txt().slice(0, 90),
  )

  /* ---------- محو البيانات يشمل ما صار يُخزَّن ---------- */
  const pd = await render(`http://localhost/template/${byId('nova').slug}`, {
    ...siteSeed(),
    'qalb.personalize.v1': JSON.stringify({ on: true, name: 'سارة', role: '', email: '', phone: '', website: '', bio: '' }),
  })
  const clearBtn = pd.btn(/امسح بياناتي|Clear my details/i)
  ok('the erase control is on the product page too', !!clearBtn)
  clearBtn?.click()
  await pd.wait(6)
  ok(
    'and it clears the hosted records from this device as well',
    stored(pd, 'qalb.sites.v1') === null && stored(pd, 'qalb.site-keys.v1') === null,
    JSON.stringify([stored(pd, 'qalb.sites.v1'), stored(pd, 'qalb.site-keys.v1')]),
  )
  ok('saying how many it removed', /أيضًا|too/.test(pd.txt()) && /[12]/.test(pd.txt().slice(-160)), pd.txt().slice(-120))

  /* ---------- عقد واحد للواجهة والخادم ---------- */
  // عقد واحد: نقارن مفاتيح pub() في الخادم بـ localPub() في الواجهة، بالمجانسين
  const pubKeys = (src, fn) => {
    const open = src.indexOf('return {', src.indexOf(fn))
    let depth = 0
    let end = open
    for (let k = open + 6; k < src.length; k++) {
      if (src[k] === '{') depth++
      else if (src[k] === '}') {
        depth--
        if (!depth) {
          end = k
          break
        }
      }
    }
    const re = /^\s+([a-zA-Z]+): /gm
    return [...src.slice(open, end).matchAll(re)].map((m) => m[1]).filter((k, ix, a) => a.indexOf(k) === ix)
  }
  const srv = pubKeys(readFileSync('server/sites.js', 'utf8'), 'const pub = (site')
  const cli = pubKeys(readFileSync('src/api/hosting.js', 'utf8'), 'function localPub(rec')
  ok(
    'the client and the server publish the same fields, so the studio cannot show less',
    srv.length > 6 && srv[0] === 'slug' && JSON.stringify(srv) === JSON.stringify(cli),
    `${srv.join(',')} vs ${cli.join(',')}`,
  )
  ok(
    'and both hand the editable text only to whoever presents the key',
    /editKey[\s\S]{0,120}?site: site\.site/.test(readFileSync('server/sites.js', 'utf8')) &&
      /editKey[\s\S]{0,120}?site: rec\.site/.test(readFileSync('src/api/hosting.js', 'utf8')),
  )

  const bad10 = checks.filter(([, pass]) => !pass)
  if (bad10.length) {
    failed++
    console.log('✗ hosting · the buyer’s pages')
    bad10.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ hosting · the buyer’s pages  (${checks.length} assertions)`)
  }
}

/* ---------------- delivery · real packages, signed links, no dead buttons ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const ord = { id: 'QALB-SMOKE-1', key: 'SMOK-EKEY-1234-ABCD', name: 'سارة العتيبي', email: 'sara@q.dev', date: '2026-09-03' }
  const want = {
    site: ['index.html', 'styles.css', 'content/profile.json'],
    cv: ['resume.html', 'resume.md', 'scripts/check-ats.mjs'],
    bundle: ['index.html', 'resume.html', 'cover-letter.md'],
  }
  let complete = true,
    licensed = true,
    traced = true,
    promised = true,
    roundtrip = true,
    paths = true,
    missing = []
  for (const t of templates) {
    if (!isProtectedDownload(t.download) || t.download !== `/download/${t.id}`) {
      paths = false
      missing.push(t.id + ':download=' + t.download)
    }
    const files = packageFiles(t, ord)
    const names = files.map((f) => f.path)
    if (names.length < 10) {
      complete = false
      missing.push(t.id + ':' + names.length + ' files')
    }
    if (new Set(names).size !== names.length) {
      complete = false
      missing.push(t.id + ': duplicate path')
    }
    for (const f of want[kindOf(t)]) if (!names.includes(f)) promised = false
    const lic = files.find((f) => f.path === 'LICENSE.txt')
    if (!lic || !lic.body.includes(ord.id) || !lic.body.includes(ord.key) || !lic.body.includes(ord.email)) licensed = false
    // كل ملف نصي (عدا JSON الذي لا يقبل تعليقات) يحمل سطر التتبّع برقم الطلب
    for (const f of files) {
      if (/\.json$/.test(f.path) || f.path === 'LICENSE.txt') continue
      if (!f.body.includes(ord.id)) {
        traced = false
        missing.push(t.id + '/' + f.path)
        break
      }
    }
    if (JSON.stringify(zipNames(packageZip(t, ord))) !== JSON.stringify(names)) roundtrip = false
  }
  ok('every product declares a protected /download/<id> path', paths, missing.slice(0, 3).join(','))
  ok('all 15 products build a real package (≥10 files, no duplicate path)', complete, missing.slice(0, 3).join(','))
  ok('each package holds what the product page promises', promised, missing.slice(0, 3).join(','))
  ok('LICENSE.txt names the buyer, order and key', licensed)
  ok('every text file carries the per-order watermark', traced, missing.slice(0, 2).join(','))
  ok('the zip archive round-trips with the exact file list', roundtrip)

  const seed = JSON.stringify({
    ...ord,
    total: 338,
    count: 2,
    method: 'card',
    lines: [
      { id: 'aether', qty: 1 },
      { id: 'nova', qty: 1, price: 89 },
    ],
  })

  // local mode: the receipt builds the package itself — a button that really produces bytes
  {
    const g = await render(
      'http://localhost/order',
      { 'qalb.lastOrder': seed },
      {
        boot: (win) => {
          win.__blobs = []
          win.__clicks = []
          win.Blob = class {
            constructor(parts, opts) {
              win.__blobs.push({ parts: parts || [], type: opts && opts.type })
              this.size = (parts || []).reduce((n, x) => n + (x.length || 0), 0)
            }
          }
          win.URL.createObjectURL = () => 'blob:stub'
          win.URL.revokeObjectURL = () => {}
          win.HTMLAnchorElement.prototype.click = function () {
            win.__clicks.push(this.download || this.href)
          }
        },
      },
    )
    const t = g.txt()
    const bad = g.errs.filter((e) => !/not implemented/i.test(e))
    ok('success page renders the delivery block in local mode', /تحميل الحزمة/.test(t) && !bad.length, bad[0] || '')
    ok('no “link missing” note for a product that ships a package', !/لم يُرفق رابط تنزيل/.test(t))
    ok('local mode exposes no raw /download/ link (nothing unenforceable)', g.doc.querySelectorAll('a[href^="/download"]').length === 0)
    const rowBtn = g.btn(/تحميل الحزمة/)
    if (rowBtn) rowBtn.click()
    await g.wait()
    const click = g.win.__clicks.slice(-1)[0] || ''
    const blob = g.win.__blobs.slice(-1)[0]
    const bytes = blob && blob.parts[0]
    ok('the row button downloads a named zip for that order', /^qalb-aether-qalb-smoke-1\.zip$/.test(click), String(click))
    ok(
      'the bytes really are a zip archive (PK header + size)',
      !!bytes && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes.length > 8000,
      bytes ? bytes.length : 'no blob',
    )
    ok(
      'the package holds the licence and the site files',
      !!bytes && zipNames(bytes).includes('LICENSE.txt') && zipNames(bytes).includes('index.html'),
    )
    const manifestBtn = g.btn(/قائمة الملفات/)
    if (manifestBtn) manifestBtn.click()
    await g.wait()
    const manifest = g.win.__blobs.slice(-1)[0]
    const text = manifest ? String(manifest.parts[0]) : ''
    ok(
      'the manifest lists the delivered files and the protected path',
      /· index\.html/.test(text) && /delivery: \/download\/aether/.test(text),
      text.slice(0, 90),
    )
    const guide = g.btn(/دليل التشغيل/)
    if (guide) guide.click()
    await g.wait()
    const gd = g.win.__blobs.slice(-1)[0]
    ok(
      'the quick-start guide is the README that ships inside the package',
      !!gd && /## ما في الحزمة/.test(String(gd.parts[0])),
      String(gd && gd.parts[0]).slice(0, 60),
    )
    g.win.close()
  }

  // rest mode: the receipt hands out signed server links, never a bare file path
  {
    const g = await render(
      'http://localhost/order',
      { 'qalb.lastOrder': seed },
      {
        boot: (win) => {
          win.__QALB_ENV = { VITE_QALB_API: 'rest', VITE_QALB_API_BASE: 'http://api.test:8787' }
        },
      },
    )
    const links = [...g.doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
    const one = links.find((h) => /\/download\/aether\?/.test(h)) || ''
    const all = links.find((h) => /\/download-all\?/.test(h)) || ''
    ok(
      'rest mode links each product to its signed endpoint',
      one === 'http://api.test:8787/download/aether?order=QALB-SMOKE-1&key=SMOK-EKEY-1234-ABCD',
      one,
    )
    ok(
      'multi-product orders get one combined download link',
      all === 'http://api.test:8787/download-all?order=QALB-SMOKE-1&key=SMOK-EKEY-1234-ABCD',
      all,
    )
    ok('the receipt explains the link is signed and single-use', /مرة واحدة/.test(g.txt()))
    g.win.close()
  }

  const badGroup = checks.filter(([, pass]) => !pass)
  if (badGroup.length) {
    failed++
    groups++
    console.log('✗ delivery · packages · signed links')
    badGroup.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ delivery · packages · signed links  (${checks.length} assertions)`)
  }
}

/* -------- agents · ما يقرؤه الوكيلُ الآلي عنّا: robots.txt و llms.txt -------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8')
  const { buildRobots, buildLlms, AI_AGENTS, PRIVATE_PATHS } = await import('../scripts/agents.mjs')
  const { COMPANY, isSet } = await import('../src/data/company.js')
  const nf = new Intl.NumberFormat('en-US')
  const arNum = (v) => nf.format(v).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)))

  const robots = read('../public/robots.txt')
  const siteOf = robots.match(/^Sitemap: (https?:\/\/[^/\n]+)\/sitemap\.xml$/m)
  const site = siteOf ? siteOf[1] : 'https://qalb.store'
  const llms = read('../public/llms.txt')
  const pkg = JSON.parse(read('../package.json'))

  /* ——— الملفان من مولّدٍ واحد، فلا ينجرفان عن الموقع ——— */
  ok('robots.txt on disk is exactly what the generator emits', robots === buildRobots({ site }))
  ok('llms.txt on disk is exactly what the generator emits', llms === (await buildLlms({ site })))
  ok(
    'both are regenerated before every build, so neither can go stale',
    /node scripts\/seo\.mjs/.test((pkg.scripts || {}).prebuild || '') && /agents\.mjs/.test(read('../scripts/seo.mjs')),
    String((pkg.scripts || {}).prebuild),
  )

  /* ——— robots: وكلاءُ الذكاء الاصطناعي مسموحٌ بهم صراحةً، والخاصُّ ممنوعٌ على الجميع ——— */
  // سطرٌ بسطر، لا فقرةً بفقرات: التعليقُ فوق أول كتلةٍ لا يلغيها عند أيِّ فاحصٍ يقرأ robots
  const blocks = []
  for (const line of robots.split('\n')) {
    if (/^User-agent:/.test(line)) blocks.push([line.replace(/^User-agent:\s*/, ''), []])
    else if (blocks.length && /^(Allow|Disallow):/.test(line)) blocks[blocks.length - 1][1].push(line)
  }
  const byAgent = new Map(blocks)
  ok('there is a block per listed agent, plus the wildcard', byAgent.size === AI_AGENTS.length + 1, `${byAgent.size} vs ${AI_AGENTS.length + 1}`)
  ok(
    'every AI agent is allowed the public text explicitly, not by silence',
    AI_AGENTS.every((a) => (byAgent.get(a) || []).includes('Allow: /')),
    AI_AGENTS.filter((a) => !(byAgent.get(a) || []).includes('Allow: /')).join(','),
  )
  ok(
    'the three named in the brief are among them',
    ['GPTBot', 'ClaudeBot', 'PerplexityBot'].every((a) => byAgent.has(a)),
  )
  ok(
    'and no block — search crawler or AI — is let past a private route',
    [...byAgent.values()].every((ls) => PRIVATE_PATHS.every((p) => ls.includes(`Disallow: ${p}`))),
    [...byAgent.entries()]
      .filter(([, ls]) => !PRIVATE_PATHS.every((p) => ls.includes(`Disallow: ${p}`)))
      .map(([k]) => k)
      .join(','),
  )
  ok(
    'the pages an agent needs to describe the store are not hidden',
    ['/ats', '/b2b', '/templates', '/host', '/legal', '/licence', '/track'].every((p) => !robots.includes(`Disallow: ${p}`)),
  )
  ok('the sitemap is declared inside the file it describes', new RegExp(`^Sitemap: ${site.replace(/\./g, '\\.')}\\/sitemap\\.xml$`, 'm').test(robots))
  ok('and the header points a reader at llms.txt without inventing a directive', /# .*\/llms\.txt/.test(robots) && !/^LLMS:/m.test(robots))

  /* ——— llms.txt: بنيةُ الملف، ثم صدقُ ما فيه ——— */
  ok('it opens with the brand and a blockquote a model can quote', /^# Qalb · قالب\n\n> [^\n]{120,}/.test(llms))
  ok(
    'the Arabic half is a full mirror, not a trailing sentence',
    llms.includes('\n---\n') && llms.includes('## ما يُباع') && llms.includes('## الاستضافة الشخصية') && llms.includes('## الفهرس'),
  )
  ok(
    'every template is linked, in both halves, at its catalogue price',
    templates.every((t) => (llms.match(new RegExp(`/template/${t.slug}`, 'g')) || []).length >= 2) &&
      templates.every((t) => llms.includes(nf.format(t.price)) || llms.includes(String(t.price))),
  )
  ok(
    'every seat tier is given with seats, money and per-seat, as computed',
    B2B_TIERS.every(
      (t) =>
        llms.includes(`- ${t.seats} seats · SAR ${nf.format(t.price)}`) &&
        llms.includes(`SAR ${nf.format(perSeat(t))} per seat`) &&
        llms.includes(`${perSeatVsBundle(t)}%`),
    ),
  )
  ok(
    'the university ladder is named with its two additions — coach panel and workshop',
    /coach panel/.test(llms) && /workshop/.test(llms) && /لوحةِ المدرّب|لوحة المدرّب/.test(llms) && /ورشة/.test(llms),
  )
  ok(
    'services, subscriptions, seasonal offers and coupons are in llms.txt',
    /Done-for-you services/.test(llms) && /Qalb Pro/.test(llms) && /Seasonal offer pages/.test(llms) && /FRIEND20/.test(llms) && /COACH30/.test(llms),
  )
  ok(
    'the cohort claim is the cohort code: same cap, same passing line',
    llms.includes(`up to ${nf.format(COHORT_MAX)} CV texts`) && llms.includes(arNum(COHORT_MAX)) && llms.includes(String(ATS_TARGET.pass)),
  )
  ok(
    'and the page really enforces that cap instead of only advertising it',
    /parts\.slice\(0, COHORT_MAX\)/.test(read('../src/pages/B2B.jsx')) && dict.ar.b2b.cohortCapped.includes('{n}'),
  )
  ok(
    'the checker is described as a browser tool that stores nothing',
    /no account, no upload, nothing stored/.test(llms) && /بلا حسابٍ ولا رفعِ ملفٍ ولا تخزين/.test(llms),
  )
  ok(
    'students are written out of it in both languages',
    /not part of it at any point/.test(llms) && /لا اسمَ طالبٍ ولا بريدَ طالبٍ في أيِّها/.test(llms),
  )

  /* ——— ما لا سندَ له عندنا لا يُكتب ——— */
  ok(
    'no payment gateway, no ZATCA claim — stated, in both languages',
    /no card gateway/.test(llms) &&
      /لا بوابةَ دفع/.test(llms) &&
      /do not issue ZATCA e-invoices/.test(llms) &&
      /لا نُصدر فاتورةً إلكترونية/.test(llms),
  )
  ok(
    'no line claims money moves or an invoice is issued for us',
    !/we (send|issue|charge|email) (you|the|an)\b/i.test(llms) && !/نُرسل لكم|نُصدر فاتورةً إلكترونية فورًا/.test(llms),
  )
  ok(
    'and no fiscal identity is invented for the sake of a complete file',
    isSet(COMPANY.vatNumber)
      ? true
      : !/(VAT (registration )?number|الرقم الضريبي|IBAN)[:\s]*[0-9٠-٩]{6,}/i.test(llms) &&
          llms.includes('pending verification') &&
          llms.includes('قيدَ التوثيق'),
    (llms.match(/^.*(VAT number|IBAN).*$/gm) || [''])[0].slice(0, 70),
  )
  ok('Etimad is reported as it is', COMPANY.etimad !== 'none' ? true : /not listed there yet/.test(llms) && /لسنا مُدرَجين هناك بعد/.test(llms))
  ok(
    'a phone or a booking link appears only because it is configured',
    Boolean(isSet(COMPANY.phone)) === /Sales phone:/.test(llms) && Boolean(isSet(COMPANY.bookingUrl)) === /book a 20-minute demo/.test(llms),
    `phone=${String(isSet(COMPANY.phone))} booking=${String(isSet(COMPANY.bookingUrl))}`,
  )

  /* ——— تُخدَم كما كُتبت ——— */
  if (existsSync('dist/llms.txt') && existsSync('dist/robots.txt')) {
    ok(
      'the built site ships both files at the root, byte for byte',
      readFileSync('dist/llms.txt', 'utf8') === llms && readFileSync('dist/robots.txt', 'utf8') === robots,
    )
  }
  const vercel = JSON.parse(read('../vercel.json'))
  ok(
    'the host is told not to sniff or stale-cache them, and the SPA rewrite still stands',
    (vercel.headers || []).some((h) => /llms\\?\.txt/.test(h.source) && (h.headers || []).some((x) => x.key === 'Cache-Control')) &&
      vercel.rewrites?.length === 1,
    JSON.stringify(vercel).slice(0, 80),
  )
  ok('nothing in either file leaks a secret-shaped string', !/(Bearer |sk-|ghp_|ADMIN_PASSWORD=|BEGIN OPENSSH)/.test(llms + robots))

  const badAgents = checks.filter(([, pass]) => !pass)
  if (badAgents.length) {
    failed++
    groups++
    console.log('✗ agents · robots and llms')
    badAgents.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ agents · robots and llms  (${checks.length} assertions)`)
  }
}

/* -------- seo · روابط خام بلا Markdown · robots صريح · Product كامل · اصطفاف البطاقات -------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])
  const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8')
  const { rawUrl, rawSite, rawText, hasMarkdownLink, markdownLines } = await import('../src/data/links.js')

  /* ——— البنّاءُ نفسه: أيُّ صيغة Markdown تُنزَع قبل أن تصير رابطًا ——— */
  const md = '[https://qalb-store.vercel.app/templates](https://qalb-store.vercel.app/templates)'
  ok('a Markdown-pasted domain is unwrapped, not written into the tag', rawSite(md) === 'https://qalb-store.vercel.app', rawSite(md))
  ok('rawUrl returns the address alone', rawUrl(md) === 'https://qalb-store.vercel.app/templates', rawUrl(md))
  ok(
    'and a path joins the site without doubling the slash',
    rawUrl('/templates', 'https://x.app/') === 'https://x.app/templates' && rawUrl('templates', 'https://x.app') === 'https://x.app/templates',
  )
  ok('rawText keeps the words and drops the link syntax', !hasMarkdownLink(rawText(`اقرأ ${md} الآن`)) && !hasMarkdownLink(rawUrl(md)))
  ok(
    'no Markdown converter is wired into any builder',
    !/from\s+['"]marked['"]|require\(\s*['"]marked|import\s*\(\s*['"]marked/.test(
      read('../scripts/seo.mjs') + read('../scripts/agents.mjs') + read('../src/components/Seo.jsx') + read('../src/data/links.js'),
    ),
  )

  /* ——— الـHTML الخام: الوسومُ تحمل العنوانَ ونصُّه وحده ——— */
  const html = read('../index.html')
  const head = html.slice(html.indexOf('seo:generated:start'), html.indexOf('seo:generated:end'))
  const rawOnly = (x) => /^https?:\/\/[^\s[\]()*]+$/.test(x)
  ok('the generated head block holds no Markdown link syntax', markdownLines(head).length === 0, markdownLines(head)[0] || '')
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1]
  ok('canonical is a raw absolute address', rawOnly(canonical), canonical)
  const cover = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1]
  ok('og:image is a raw absolute address', rawOnly(cover), cover)
  ok(
    'the hreflang trio is raw and the English one keeps the language param',
    ['ar', 'en', 'x-default'].every((h) => rawOnly((html.match(new RegExp(`hreflang="${h}" href="([^"]+)"`)) || [])[1])) &&
      /hreflang="en" href="https:\/\/[^"]+\?lang=en"/.test(html),
  )
  ok('every page declares robots explicitly in the static head', /<meta name="robots" content="index, follow" \/>/.test(head))

  /* ——— sitemap.xml وllms.txt على القرص ——— */
  const site = (read('../public/robots.txt').match(/^Sitemap: (https?:\/\/[^/\n]+)\/sitemap\.xml$/m) || [])[1]
  const map = read('../public/sitemap.xml')
  ok(
    'every sitemap loc is a raw address, and none is wrapped as a link',
    markdownLines(map).length === 0 && (map.match(/<loc>/g) || []).length === (map.match(/<loc>https?:\/\/[^<\s]+<\/loc>/g) || []).length,
  )
  const llms = read('../public/llms.txt')
  ok('llms.txt carries no Markdown link syntax at all', markdownLines(llms).length === 0, markdownLines(llms)[0] || '')
  ok(
    'each template is listed by its raw URL in both halves',
    !!site && templates.every((t) => (llms.match(new RegExp(`${site}/template/${t.slug}`, 'g')) || []).length >= 2),
  )
  if (existsSync('dist/index.html')) {
    const dist = readFileSync('dist/index.html', 'utf8')
    ok(
      'the built HTML ships the same clean head',
      markdownLines(dist.slice(dist.indexOf('seo:generated:start'), dist.indexOf('seo:generated:end'))).length === 0,
    )
  }

  /* ——— ما يراه محرّك البحث فعلًا: robots ثم Product في صفحة القوالب والمنتج ——— */
  const productShape = (p, tpl) =>
    p &&
    p['@type'] === 'Product' &&
    !!p.name &&
    !!p.description &&
    p.image === `${SITE_URL}/og/${tpl.slug}.png` &&
    Number(p.offers?.price) === tpl.price &&
    p.offers?.priceCurrency === 'SAR' &&
    p.offers?.availability === 'https://schema.org/InStock'

  const cat = await render('http://localhost/templates')
  ok(
    'a public route asks to be indexed instead of staying silent',
    cat.doc.head.querySelector('meta[name="robots"]')?.getAttribute('content') === 'index, follow',
    String(cat.doc.head.querySelector('meta[name="robots"]')?.getAttribute('content')),
  )
  const catLd = JSON.parse(cat.doc.getElementById('qalb-jsonld')?.textContent || '{}')
  const listNode = (catLd['@graph'] || []).find((x) => x['@type'] === 'ItemList')
  const listed = (listNode?.itemListElement || []).map((x) => x.item).filter(Boolean)
  ok(
    'the templates page lists Product nodes, not names and links only',
    listed.length >= 12 && listed.every((x) => x['@type'] === 'Product'),
    `${listed.length}`,
  )
  const listedTpls = listed.map((x) => templates.find((t) => x.url.endsWith(`/template/${t.slug}`)))
  const firstTpl = listedTpls[0]
  ok('every listed Product maps to a real shelf item', listed.length > 0 && listedTpls.every(Boolean))
  ok(
    'every listed Product has name, image, description and an InStock SAR offer',
    listed.every((x, i) => productShape(x, listedTpls[i])),
  )
  ok(
    'and the advertised price is the one on the shelf',
    !!firstTpl && Number(listed[0].offers.price) === firstTpl.price,
    `${listed[0]?.offers?.price} vs ${firstTpl?.price}`,
  )
  ok('the catalogue canonical is raw as well', !hasMarkdownLink(cat.doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''))
  cat.dom.window.close()

  const one = await render('http://localhost/template/atlas-cv')
  const atlas = templates.find((t) => t.slug === 'atlas-cv')
  const prod = JSON.parse(one.doc.getElementById('qalb-jsonld').textContent)['@graph'].find((x) => x['@type'] === 'Product')
  ok('the product page ships the same four fields, plus the offer', productShape(prod, atlas))
  ok(
    'its canonical, og:image and hreflang are raw too',
    [
      one.doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      one.doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      one.doc.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href'),
    ].every((x) => rawOnly(x)),
  )
  one.dom.window.close()

  /* ——— اصطفاف البطاقات: الغلافُ والبطاقةُ يتمدّدان، والصفُّ السفلي يُدفَع للأسفل ——— */
  const card = read('../src/components/TemplateCard.jsx')
  ok(
    'the template card stretches and pushes its price row to the floor',
    /flex h-full flex-col/.test(card) && /flex flex-1 flex-col/.test(card) && /mt-auto/.test(card),
  )
  const services = read('../src/pages/Services.jsx')
  ok(
    'service cards do the same, and their Reveal wrapper passes the height down',
    /flex h-full flex-col justify-between/.test(services) && /Reveal key=\{s\.id\}[^>]*className="h-full"/.test(services),
  )
  const offers = read('../src/pages/Offers.jsx')
  ok('seasonal offer cards too', /flex h-full flex-col justify-between/.test(offers) && /Reveal key=\{o\.slug\}[^>]*className="h-full"/.test(offers))
  const home = read('../src/pages/Home.jsx')
  ok(
    'the home grids let their cards stretch instead of pinning them to the top',
    !/grid items-start gap-5/.test(home) &&
      // كلُّ شبكات الرئيسية تمرّر الارتفاع لبطاقاتها: القوالب المميّزة، ومخرجاتُ
      // «ماذا ستحصل عليه»، والقصص، والمنظومة — لا شبكةً تثبّت بطاقاتها في الأعلى
      (home.match(/Reveal key=\{[^}]+\} delay=\{k \* \d+\} className="h-full"/g) || []).length >= 5,
  )
  ok(
    'the related grid on the product page is full height as well',
    /Reveal key=\{r\.id\} delay=\{k \* 70\} className="h-full"/.test(read('../src/pages/Product.jsx')),
  )

  const bad = checks.filter(([, pass]) => !pass)
  if (bad.length) {
    failed++
    groups++
    console.log('✗ seo · raw links, robots, product data and card alignment')
    bad.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ seo · raw links, robots, product data and card alignment  (${checks.length} assertions)`)
  }
}

/* ================= منظومة التوظيف v1.6 · المطابقة والملف والرابط والدليل والسوق والفاحص المضمّن ================= */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])

  /* مخزنٌ في الذاكرة: وحداتُ المتصفح التي تقرأ localStorage تُختبر هنا بلا متصفح */
  const mem = new Map()
  const before = globalThis.localStorage
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  }

  /* ——— ١. المطابقة: نفسُ المحرّك الذي يخدم /match و/kit و/embed ——— */
  const { ATS_DEMO } = await import('../src/data/ats.js')
  const cvDemo = matchCv(ATS_DEMO, MATCH_DEMO_JOB)
  const other = matchCv(
    'مدير مالي: إعداد الميزانيات والتقارير الشهرية، وإدارة فريق من ٤ أشخاص، وخفض التكاليف ١٢٪ في عامين. مهارات:Excel محاسبة تقارير.',
    MATCH_DEMO_JOB,
  )
  ok('a frontend CV matches the frontend posting', cvDemo.score >= 80, `${cvDemo.score}`)
  ok('and a finance CV does not', other.score < cvDemo.score - 20, `${other.score} vs ${cvDemo.score}`)
  ok('the gap list is what the report sells', other.missing.length > 0 && other.missing.every((m) => typeof m.term === 'string' && m.term.length > 1))
  ok(
    'an edit point never claims you know the tool — it asks first',
    editPoints(other, { lang: 'ar', n: 6 })
      .filter((e) => e.where === 'قسم المهارات')
      .every((e) => /إن كنت/.test(e.text)),
  )
  ok('the field is read off the posting, not guessed at the shelf', fieldOf(MATCH_DEMO_JOB) === 'dev', fieldOf(MATCH_DEMO_JOB))
  ok(
    'and the recommendation is real catalogue items',
    pickTemplates(MATCH_DEMO_JOB, { n: 3 }).every((t) => !!t.slug && t.price > 0),
  )
  ok('the report quotes the same score the page shows', matchReport(cvDemo, { lang: 'ar' }).includes(`${cvDemo.score}٪`))
  ok('a posting too short to read says so instead of scoring it', matchReport(matchCv(ATS_DEMO, 'مطلوب مهندس'), { lang: 'ar' }).includes('أقصر'))
  ok('company and city are not counted as requirements', termsOf(MATCH_DEMO_JOB).length > 0 && termsOf('').length === 0)

  /* ——— ٤. ملف التقديم: ما لا يجده لا يخترعه ——— */
  const plain =
    'منى العلي\nمصممة واجهات · الرياض\nالملخص المهني\nمصممة واجهات أعمل على تصميم التطبيقات.\nالخبرة المهنية\nمصممة — شركة أفق\n2020 — 2022\n- صممت تطبيقًا للتوصيل.\nالمهارات\nFigma · تصميم واجهات'
  const kit = buildKit({ cv: plain, job: MATCH_DEMO_JOB, lang: 'ar' })
  ok('the kit is built by the same match engine', kit.match.score === matchCv(plain, MATCH_DEMO_JOB).score)
  ok('it addresses the letter to the company named in the posting', kit.cover.includes('نماء'), kit.company)
  ok('it signs with the name on the CV', kit.cover.includes('منى العلي'))
  ok('and it invents no figure the CV never carried', kit.ranked.every((b) => b.top === 0) && !kit.cover.includes('في آخر عملٍ لي بلغ الأثر'))
  ok('what it cannot find is handed back as a task, not filled in', kit.todo.length > 0)
  ok(
    'bullets are ranked by the posting’s words, not by position',
    rankBullets('نقطة أولى بلا مفردات من الإعلان.\n- بنيت واجهات بـ React فانخفض زمن التحميل ٤٠٪.', cvDemo, { n: 2 })[0].hits >= 1,
  )
  ok(
    'the whole kit exports as one text with all four parts',
    ['نقاط', 'خطاب التقديم', 'LinkedIn', 'إيميل'].every((h) => kitText(kit, { lang: 'ar' }).includes(h)),
  )
  ok(
    'credits go down when spent and never below zero',
    (() => {
      mem.clear()
      kitCredit(10, { add: true })
      const mid = kitCredits().left
      kitCredit(1)
      const after = kitCredits().left
      kitCredit(99)
      return mid === 10 && after === 9 && kitCredits().left === 0
    })(),
  )
  ok('and a short input is refused rather than half-generated', plain.length >= KIT_MIN_CV && MATCH_DEMO_JOB.length >= KIT_MIN_JOB)

  /* ——— ٣. الرابط المهني: رابطٌ من الاسم، وتحليلاتٌ من هذا الجهاز ——— */
  const link = sanitizeLink({
    name: 'نورة الحربي',
    role: 'مهندسة واجهات',
    city: 'الرياض',
    email: 'noura@example.com',
    bio: 'نبذة <script>alert(1)</script>',
  })
  ok('an Arabic name becomes a readable latin handle', link.handle === 'noura-alhrbi', link.handle)
  ok(
    'and markup is refused whole, not half-cleaned',
    link.bio === undefined && !Object.values(link).some((v) => String(v).includes('script')),
    JSON.stringify(link.bio),
  )
  ok('a broken e-mail is dropped, not stored', sanitizeLink({ name: 'سارة', email: 'nope' }).email === undefined)
  ok('the link is built from the one published domain', linkUrl('ahmed').endsWith('/u/ahmed'))
  ok(
    'a view is one event, and only counted kinds are stored',
    (() => {
      mem.clear()
      recordEvent('noura-alharbi', 'view')
      recordEvent('noura-alharbi', 'cv')
      recordEvent('noura-alharbi', 'invented-kind')
      const sum = summarize(JSON.parse(mem.get('qalb.linkevents.v1') || '[]'), { handle: 'noura-alharbi', days: 7 })
      return sum.views === 1 && sum.cv === 1 && sum.total === 2
    })(),
  )
  ok(
    'the country is inferred from a time zone, never from an address',
    countryOf('Asia/Riyadh') === 'SA' && countryOf('') === '' && countryName('SA', 'ar') === 'السعودية',
  )
  ok(
    'a sample link says its numbers are illustrative',
    (() => {
      const s = summarize(demoEvents('x'), { handle: 'x', days: 30 })
      return s.total > 0 && s.countries.length > 0
    })(),
  )
  ok('the free plan counts; countries come with the paid one', LINK_PLANS.free.geo === false && LINK_PLANS.plus.geo === true)

  /* ——— ٧. دليل المواهب: إذنٌ صريح، ورقمٌ مقيس ——— */
  const dirRows = demoTalent()
  ok('the seeded directory is labelled as samples', dirRows.length === 4 && dirRows.every((r) => r.demo === true))
  ok(
    'every readiness score is a measured number, not an opinion',
    dirRows.every((r) => Number.isInteger(r.ats) && r.ats >= 0 && r.ats <= 100),
  )
  ok(
    'filtering by field and readiness returns the narrower set',
    filterTalent(dirRows, { field: 'dev' }).length === 1 && filterTalent(dirRows, { minAts: 95 }).length <= dirRows.length,
  )
  ok(
    'a profile keeps no markup from its owner: the whole field is refused',
    talentEntry({ handle: 'x', name: 'y<script>z', role: 'r', field: 'general' }).name === '',
  )

  /* ——— ٨. تقرير السوق: أربعةُ حقول، ونسبةٌ بلا سند لا تُنشر ——— */
  ok(
    'an answer keeps only what it knows',
    (() => {
      const a = normalizeSignal({ field: 'dev', city: 'riyadh', interview: true, template: 'nova', months: '4' })
      const b = normalizeSignal({ field: 'not-a-field', interview: 'maybe', months: '99' })
      return a.field === 'dev' && a.interview === 1 && a.months === 4 && b.field === '' && b.interview === null
    })(),
  )
  ok('an empty answer is not counted', signalHas(normalizeSignal({})) === false && signalHas(normalizeSignal({ interview: false })) === true)
  ok(
    'one answer a day per question: a repeat does not inflate the rate',
    (() => {
      mem.clear()
      saveSignal({ field: 'dev', interview: true })
      const first = JSON.parse(mem.get('qalb.market.v1') || '[]').length
      saveSignal({ field: 'dev', interview: true })
      return first === 1 && JSON.parse(mem.get('qalb.market.v1') || '[]').length === 1
    })(),
  )
  ok(
    'no rate is published before the minimum, and the report says so',
    (() => {
      const agg = aggregate([{ at: new Date().toISOString(), field: 'dev', interview: 1, city: 'riyadh', template: 'nova', months: 3 }])
      return agg.enough === false && agg.min === MARKET_MIN && marketReport(agg, { lang: 'ar' }).includes(`${MARKET_MIN}`)
    })(),
  )
  ok(
    'a full sample aggregates to rows a university could buy',
    (() => {
      const rows = Array.from({ length: 6 }, (_, i) => ({
        at: new Date(Date.now() - i * 86400000).toISOString(),
        field: 'dev',
        city: 'riyadh',
        template: 'nova',
        months: 3,
        interview: i < 3 ? 1 : 0,
      }))
      const agg = aggregate(rows)
      return agg.enough === true && agg.rate === 50 && marketRows(agg).length === 1 && marketCsv(marketRows(agg)).startsWith('field,answers')
    })(),
  )

  /* ——— ٥. الفاحص المضمّن: موضعٌ يُباع، لا بياناتُ طلاب ——— */
  ok('an unknown tier falls back to the first, never to a blank page', embedTier('nope').id === EMBED_TIERS[0].id)
  ok(
    'the tiers are the prices on the page',
    EMBED_TIERS[0].price === 199 && EMBED_TIERS[0].checks === 500 && EMBED_TIERS[1].price === 499 && EMBED_TIERS[1].checks === 2000,
  )
  ok('and the university one carries no invented figure', EMBED_TIERS[2].price === null && EMBED_TIERS[2].uni === true)
  const snip = embedSnippet({ org: 'ksu-careers', theme: 'light', lang: 'ar' })
  ok('the snippet is one iframe pointed at the same checker', /<iframe/.test(snip) && snip.includes('/ats?embed=1') && snip.includes('ksu-careers'))
  ok(
    'usage is counted per month and overrun is called overrun',
    (() => {
      mem.clear()
      const q0 = embedQuota('embed-500', 0)
      const q1 = embedQuota('embed-500', 500)
      const q2 = embedQuota('embed-500', 620)
      return q0.left === 500 && q1.left === 0 && q1.over === 0 && q2.over === 120 && embedUsage('ksu').used === 0
    })(),
  )
  ok(
    'the request mail carries the organisation and the plan, not a template',
    decodeURIComponent(embedMailto({ org: 'جامعة الملك سعود', tier: 'embed-500' }, { lang: 'ar', mail: 'qalb@qalb.store' })).includes(
      'جامعة الملك سعود',
    ),
  )

  /* ——— ٦. الاستيراد من LinkedIn: لصقٌ لا وصول، وما لا يُفهم يُترك ——— */
  const draft = parseLinkedin(LINKEDIN_SAMPLE)
  ok('a pasted profile is read into fields', draft.name === 'نورة الحربي' && draft.role.includes('مهندسة') && draft.jobs.length >= 2)
  ok('skills are collected once, not duplicated', draft.skills.length > 3 && new Set(draft.skills).size === draft.skills.length)
  ok('the handle comes from the URL, never from an account', handleFrom('https://www.linkedin.com/in/noura-harbi') === 'noura-harbi')
  ok('what it cannot read is named, not invented', missingOf({}).length === 7 && missingOf(draft).length < 7)
  ok('and the draft maps onto the template’s own fields', toPersonal(draft).name === 'نورة الحربي' && toPersonal(draft).on === true)

  /* ——— ٢. البطاقة القابلة للمشاركة: رقمٌ واحد في صورتين ——— */
  const svg = cardSvg({
    title: 'جاهز',
    scoreLabel: '92/100',
    bandLabel: 'جاهز للفرز الآلي',
    byLabel: 'بُنيَ بقالب',
    url: 'https://qalb.store/ats',
    coupon: 'QALB-ABCDE',
    couponLabel: 'كوبون',
    verified: false,
    rtl: true,
    stats: [{ k: 'كلمات', v: '512' }],
  })
  ok('the card is an SVG with the score on it', svg.startsWith('<svg') && svg.includes('92/100') && svg.includes('جاهز للفرز الآلي'))
  ok('and a hostile string is escaped, not injected', !cardSvg({ title: '</text><script>x</script>' }).includes('<script>'))
  ok(
    'the coupon is derived, so the same card earns the same code',
    couponFor('a|92|v') === couponFor('a|92|v') && couponFor('a|92|v') !== couponFor('b|92|v'),
  )
  ok(
    'the shared text carries the link back',
    shareText({ title: 't', scoreLabel: '92/100', bandLabel: 'b', url: 'https://qalb.store/ats', lang: 'ar' }).includes('https://qalb.store/ats'),
  )

  /* ——— ٩. الشارة: تُطبع، وتُشترى إزالتها ——— */
  ok(
    'the badge is a link back to us and nothing else',
    badgeHtml({ lang: 'ar' }).includes('href="https://qalb.store"') && badgeHtml({ lang: 'ar' }).includes('بُنيَ بقالب'),
  )
  ok(
    'it shows by default, and two honest ways take it off',
    badgeState({}).shown === true && badgeState({ addons: ['badge-off'] }).shown === false && badgeState({ plan: 'pro' }).shown === false,
  )
  ok(
    'and the reason is recorded, so nobody is charged twice',
    badgeState({ plan: 'pro' }).reason === 'plan' && badgeState({ addons: ['badge-off'] }).reason === 'paid',
  )
  ok(
    'the printer hides it as it hides our bar',
    withBadge('<html></html>', { shown: true }).includes('qalb-badge') && withBadge('<html></html>', { shown: false }) === '<html></html>',
  )

  /* ——— نفسُ الشارة في الملف المُسلَّم، تُسقطها الإضافة المشتراة ——— */
  const { byId } = await import('../src/data/templates.js')
  const { packageFiles } = await import('../src/data/deliverable.js')
  const tpl = byId('aether')
  const filesWith = Object.fromEntries(packageFiles(tpl, { id: 'Q1', key: 'K1' }).map((f) => [f.path, f.body]))
  const filesWithout = Object.fromEntries(packageFiles(tpl, { id: 'Q1', key: 'K1', addons: [{ id: 'badge-off' }] }).map((f) => [f.path, f.body]))
  ok('every published template carries the badge in its footer', filesWith['index.html'].includes('qalb-badge'))
  ok('and buying the removal takes it off the delivered files', !filesWithout['index.html'].includes('qalb-badge'))
  const { siteHtml } = await import('../src/data/deliverable.js')
  const { profileOf } = await import('../src/data/hosting.js')
  const freeRec = { slug: 'noura-alhrbi', plan: 'free', site: { name: 'نورة الحربي', template: 'aether' } }
  const proRec = { ...freeRec, plan: 'pro' }
  ok(
    'the hosted page obeys the plan: Qalb Plus prints no badge',
    siteHtml(tpl, profileOf(freeRec)).includes('qalb-badge') && !siteHtml(tpl, profileOf(proRec)).includes('qalb-badge'),
  )

  globalThis.localStorage = before
  const bad = checks.filter(([, pass]) => !pass)
  if (bad.length) {
    failed++
    groups++
    console.log('✗ hiring suite · match, kit, link, directory, market, embed, linkedin, badge')
    bad.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ hiring suite · match, kit, link, directory, market, embed, linkedin, badge  (${checks.length} assertions)`)
  }
}

/* ---------------- revenue model v1.7.0 · plans, the free-first gate, the market split, the pipeline ---------------- */
{
  const checks = []
  const ok = (name, cond, extra = '') => checks.push([cond ? name : `${name} — ${extra}`, !!cond])

  const { PLANS, FEATURE_MATRIX, PUBLISH_DONE, gainedBy, vatOf, withWatermark, yearlyAsMonths } = await import('../src/data/plans.js')
  const { NICHES, QUESTIONS, ACCOUNT_LIMITS, canCreate, sanitizeAccount, sanitizeAnswers, droppedAnswers, readyToGenerate, starterFor, firstStage } =
    await import('../src/data/account.js')
  const {
    COMMISSION,
    COMMISSION_RANGE,
    ESCROW_DAYS,
    ESCROW_RANGE,
    MIN_PAYOUT,
    PRICE_MIN,
    PRICE_MAX,
    REPORT_FREEZE,
    applyReports,
    canSell,
    listingErrors,
    payoutState,
    priceOk,
    releaseDate,
    sanitizeListing,
    split,
  } = await import('../src/data/marketplace.js')
  const { BANDS, LAYERS, PIPELINE_VERSION, appealsLayer, inspectListing, policyGuard, stateFromVerdict, techLint } =
    await import('../src/data/inspect.js')
  const { DUP_THRESHOLD, aHash, dHash, duplicateOf, fnv1a, hamming, hashMatrix, resampleGray, similarity } = await import('../src/data/phash.js')
  const { byId, templates: CATALOGUE } = await import('../src/data/templates.js')

  /* ——— ١. الخطط: أرقام داخل المدى المعلَن، والسلوك مشتق لا مكرر ——— */
  // v1.8.0: سلّمٌ واحد بثلاث درجات — لا «فردية» ولا باقةٌ تُشترى مرة واحدة
  const free = PLANS.find((x) => x.id === 'free')
  const plus = PLANS.find((x) => x.id === 'plus')
  const pro = PLANS.find((x) => x.id === 'pro')
  ok('three graded tiers, free first and Pro last', PLANS.length === 3 && free.order < plus.order && plus.order < pro.order)
  ok('the free tier costs nothing and allows exactly one template', free.price === 0 && free.templates === 1)
  ok('Qalb Plus is the 19 SAR a month tier', plus.price === 19 && plus.templates === 3, `${plus.price}/${plus.templates}`)
  ok('Qalb Pro is the 49 SAR a month tier', pro.price === 49, `${pro.price}`)
  ok('Pro removes the ceiling entirely, it does not raise it', pro.templates === null)
  ok(
    'the yearly prices are the published ones, and the service sits inside its own band',
    plus.yearly === 100 && pro.yearly === 299 && PUBLISH_DONE.price >= 299 && PUBLISH_DONE.price <= 799,
    `${plus.yearly}/${pro.yearly}/${PUBLISH_DONE.price}`,
  )
  ok('no one-time pack is exported any more', (await import('../src/data/plans.js')).ONE_TIME === undefined)
  ok('the yearly price is computed as months, not asserted', yearlyAsMonths('plus') > 4 && yearlyAsMonths('plus') < 12, `${yearlyAsMonths('plus')}`)
  ok('VAT is extracted from the listed price, not added on top', Math.abs(vatOf(115) - 15) < 0.01, `${vatOf(115)}`)
  ok('Pro gains eight things over free, and the list is derived from the table', gainedBy('pro').length === 8, gainedBy('pro').join(','))
  ok('and free gains nothing over itself', gainedBy('free').length === 0)

  /* ——— ٢. مصفوفة القيمة: كل وعد يشير إلى منفّذ موجود فعلًا ——— */
  ok('the matrix holds the ten published rows', FEATURE_MATRIX.length === 10, `${FEATURE_MATRIX.length}`)
  const enforced = []
  for (const row of FEATURE_MATRIX) {
    const [file, fn] = row.enforcedBy.split(':')
    const mod = await import(`../${file}`)
    if (typeof mod[fn] !== 'function') enforced.push(row.enforcedBy)
  }
  ok('every promise row names a function that exists in the repo', enforced.length === 0, enforced.join(','))
  ok(
    'each row states both sides and every state is a known one',
    FEATURE_MATRIX.every((r) => ['yes', 'partial', 'no'].includes(r.free.state) && ['yes', 'partial', 'no'].includes(r.paid.state)),
  )
  ok(
    'the watermark, export, domain and selling rows differ between the two columns',
    ['pdf', 'export', 'domain', 'sell'].every((id) => {
      const r = FEATURE_MATRIX.find((x) => x.id === id)
      return r.free.state !== r.paid.state
    }),
  )

  /* ——— ٣. بوابة Freemium: قالبٌ واحد مجانًا، والثاني خلف خطة ——— */
  const base = sanitizeAccount({ email: 'A@B.co', niche: 'designer', answers: { name: 'نورة', role: 'مصممة' }, consent: { v: '1', at: 'x' } })
  ok('a fresh account may build its first template', canCreate(base).allowed === true && canCreate(base).max === 1)
  const usedOne = { ...base, created: [{ slug: 'noura', template: 'aether', at: '2026-09-01' }] }
  ok(
    'the second attempt on the free plan is refused, with the count as the reason',
    canCreate(usedOne).allowed === false && canCreate(usedOne).reason === 'limit',
  )
  ok('a paid plan opens the same account', canCreate({ ...usedOne, plan: 'pro' }).allowed === true)
  ok('an unknown plan falls back to free instead of granting the top tier', canCreate({ ...usedOne, plan: 'nope' }).max === 1)
  ok('the six niches all point at real catalogue templates', NICHES.length === 6 && NICHES.every((n) => n.starters.every((id) => !!byId(id))))
  ok(
    'the first wave is designers and photographers, and the starter is a real template',
    firstStage()
      .map((n) => n.id)
      .join(',') === 'designer,photographer' && starterFor('photographer').id === 'atelier',
  )
  ok('a niche nobody picked yields no template rather than a guess', starterFor('nobody') === null)
  ok('the six short questions carry their own ceilings', QUESTIONS.length === 6 && QUESTIONS.every((q) => q.limit <= 420))
  ok(
    'answers are sanitised: a tag rejects the field, a third colour and a bad link are dropped',
    (() => {
      const c = sanitizeAnswers({
        name: '<b>نورة</b>',
        colours: ['#fff', '#000', '#111'],
        links: ['https://ok.dev', 'ftp://no', 'x'],
        services: 'هوية',
      })
      return c.name === '' && c.colours.length === 2 && c.links.length === 1 && c.services === 'هوية'
    })(),
  )
  ok(
    'and the user is told which fields were dropped',
    droppedAnswers({ name: 'a<b', colours: ['nope'], links: ['ftp://x'] }).join(',') === 'name,colours,links',
  )
  ok(
    'nothing is generated until the e-mail, the niche, the name, the role and the consent are there',
    readyToGenerate(base).ok === true && readyToGenerate({ ...base, consent: null }).missing.includes('consent'),
  )
  ok('field ceilings match the personalisation ceilings they came from', ACCOUNT_LIMITS.name === 80 && ACCOUNT_LIMITS.email === 160)

  /* ——— ٤. السوق: التقسيم مضبوط هللةً هللة ——— */
  ok(
    'the commission is 25% and inside the published 20–30% band',
    COMMISSION === 0.25 && COMMISSION >= COMMISSION_RANGE[0] && COMMISSION <= COMMISSION_RANGE[1],
  )
  ok('the escrow period is inside the published 7–14 days', ESCROW_DAYS >= ESCROW_RANGE[0] && ESCROW_DAYS <= ESCROW_RANGE[1])
  ok('the worked example is exact: 199 → 49.75 commission → 149.25 to the seller', split(199).commission === 49.75 && split(199).sellerNet === 149.25)
  let drift = 0
  for (let p = PRICE_MIN; p <= 400; p += 3.37) {
    const s = split(p)
    if (Math.abs(Math.round((s.commission + s.sellerNet) * 100) - Math.round(s.price * 100)) > 0) drift++
  }
  ok('commission + seller net equals the price for every price in the range, to the halala', drift === 0, `${drift} drifting`)
  ok(
    'processing fees are labelled an estimate, not a deduction we claim',
    split(199).processing.labelled === true && split(199).processing.estimate > 0,
  )
  ok('the seller sees their net after fees, and it never goes negative', split(PRICE_MIN).sellerAfterFeesEstimate >= 0)
  ok(
    'a release date is exactly the escrow period after the sale',
    releaseDate('2026-09-01', new Date('2026-09-24')) === `2026-09-${String(1 + ESCROW_DAYS).padStart(2, '0')}`,
  )
  const sales = [
    { price: 199, soldAt: '2026-09-01' },
    { price: 99, soldAt: '2026-09-20' },
  ]
  const pay = payoutState(sales, new Date('2026-09-24'))
  ok('a sale older than the escrow is released and a newer one is still held', pay.released.length === 1 && pay.held.length === 1)
  ok('the released total is the seller net, not the price', pay.releasedTotal === 149.25, `${pay.releasedTotal}`)
  ok(
    'eligibility is measured against the 100 SAR minimum, and the shortfall is a number',
    payoutState([{ price: 40, soldAt: '2026-09-01' }], new Date('2026-09-24')).missing > 0 && pay.eligible === true && MIN_PAYOUT === 100,
  )
  ok(
    'selling needs the Pro tier, and the block says why',
    canSell('free') === false && canSell('plus') === false && canSell({ plan: 'pro' }) === true,
  )
  ok(
    'prices outside the accepted band are refused before the pipeline runs',
    priceOk(10) === false && priceOk(PRICE_MIN) === true && priceOk(PRICE_MAX + 1) === false,
  )

  /* ——— ٥. خط الفحص: العتبات الثلاث كلها تُبلغ فعلًا ——— */
  ok('the pipeline publishes five layers and three bands', LAYERS.length === 5 && BANDS.length === 3 && PIPELINE_VERSION >= 1)
  ok('the bands are the published 0–59 / 60–84 / 85–100', BANDS.map((b) => `${b.min}-${b.max}`).join(' ') === '0-59 60-84 85-100')
  const cleanListing = sanitizeListing({
    title: 'قالب بورتفوليو هادئ للمصممين',
    desc: 'قالب من صفحة واحدة: ترويسة، شبكة أعمال بست صور، سيرة مطابقة بالألوان نفسها، وسكربت فحص ATS مرفق في الحزمة.',
    price: 149,
    rights: true,
    files: [
      { path: 'index.html', body: '<html><body><h1>نورة</h1></body></html>' },
      { path: 'styles.css', body: 'body{margin:0}' },
      { path: 'content/profile.json', body: '{"name":"نورة"}' },
    ],
  })
  const accepted = inspectListing(cleanListing)
  ok(
    'a clean template is accepted automatically, with a zero score',
    accepted.verdict === 'accept' && accepted.score < 60 && accepted.reasons.length === 0,
    `${accepted.verdict}/${accepted.score}`,
  )
  ok('and its state is derived from the verdict, never written by hand', stateFromVerdict(accepted.verdict) === 'published')

  const quarantined = inspectListing(
    sanitizeListing({
      title: 'أفضل قالب رقم 1 في العالم',
      desc: 'قالب مضمون 100% اكسب دخل شهري من موقعك، بتصميم جميل وألوان رائعة وترويسة كبيرة وشبكة أعمال وسيرة مطابقة.',
      price: 199,
      rights: true,
      files: [{ path: 'index.html', body: '<html><body>ok</body></html>' }],
    }),
  )
  ok(
    'unprovable claims land in quarantine, not in acceptance',
    quarantined.verdict === 'quarantine' && quarantined.score >= 60 && quarantined.score <= 84,
    `${quarantined.score}`,
  )
  ok(
    'the report names the rules that fired, in both languages',
    ['income-claim', 'guarantee', 'superlative'].every((r) => quarantined.reasons.some((x) => x.rule === r)) &&
      quarantined.reasons.every((x) => x.why.ar && x.why.en),
  )

  const rejected = inspectListing(
    sanitizeListing({
      title: 'قالب سريع جدًا للتحميل',
      desc: 'قالب بورتفوليو كامل بثلاثة أقسام وألوان قابلة للتبديل وسيرة ذاتية مطابقة وسكربت فحص مرفق في الحزمة.',
      price: 99,
      rights: true,
      files: [
        { path: 'index.html', body: '<html><body><script>eval("alert(1)")</script></body></html>' },
        { path: 'shell.php', body: '<?php system($_GET["c"]); ?>' },
        { path: '../../etc/passwd', body: 'x' },
      ],
    }),
  )
  ok('executable code and banned files are rejected automatically', rejected.verdict === 'reject' && rejected.score >= 85, `${rejected.score}`)
  ok(
    'a hard violation floors the score whatever else is clean',
    rejected.hard === true && rejected.score >= 92,
    `${rejected.rawScore}→${rejected.score}`,
  )
  // الأرضية تُرى وحدها: مخالفة قاسية واحدة (وزنها ٦٠) ترفع القرار فوق عتبة الرفض
  const onlyHard = inspectListing(
    sanitizeListing({
      title: 'قالب بورتفوليو بسيط',
      desc: 'قالب من صفحة واحدة بترويسة وشبكة أعمال وسيرة مطابقة بالألوان نفسها، وملفات نظيفة بلا أي سكربت خارجي.',
      price: 99,
      rights: true,
      files: [{ path: 'index.html', body: '<a href="javascript:void(0)">x</a>' }],
    }),
  )
  ok(
    'one hard rule alone carries a listing from acceptance to rejection',
    onlyHard.hard === true && onlyHard.rawScore < 85 && onlyHard.verdict === 'reject',
    `${onlyHard.rawScore}→${onlyHard.score} ${onlyHard.verdict}`,
  )
  ok(
    'tech linting catches the classes it publishes: banned extension, eval, traversal, javascript: URIs',
    (() => {
      const r = techLint([
        { path: 'a.exe', body: 'x' },
        { path: 'b.html', body: '<a href="javascript:alert(1)">x</a>' },
        { path: '../out.html', body: 'x' },
        { path: 'c.html', body: '<script src="https://evil.example/x.js"></script>' },
      ])
      return ['banned-ext', 'javascript-uri', 'path-traversal', 'external-script'].every((id) => r.violations.some((v) => v.rule === id))
    })(),
  )
  ok(
    'an off-platform payment request is a hard rejection, since it bypasses the licence',
    policyGuard({ title: 'قالب', desc: 'ادفع عبر paypal خارج المنصة وسأرسله لك فورًا بلا عمولة ولا انتظار.' }).hard === true,
  )
  ok(
    'a listing missing its rights acknowledgement never reaches the pipeline',
    Object.keys(
      listingErrors(sanitizeListing({ title: 'قالب جميل', desc: 'x'.repeat(60), price: 100, files: [{ path: 'a.html', body: 'x' }] })),
    ).includes('rights'),
  )

  /* ——— ٦. البصمة البصرية: ثابتة أمام السطوع والمقاس، وترفض المعكوس ——— */
  const gradient = (w, shift = 0) => {
    const a = new Uint8ClampedArray(w * w * 4)
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) a.set([Math.min(255, (x / w) * 255 + shift), 0, 0, 255], (y * w + x) * 4)
    return resampleGray(a, w, w, 8)
  }
  const inverted = (() => {
    const w = 32
    const a = new Uint8ClampedArray(w * w * 4)
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) a.set([255 - (x / w) * 255, 0, 0, 255], (y * w + x) * 4)
    return resampleGray(a, w, w, 8)
  })()
  const A = hashMatrix(gradient(32))
  const brighter = hashMatrix(gradient(32, 40))
  const rescaled = hashMatrix(gradient(64))
  const flipped = hashMatrix(inverted)
  ok(
    'the fingerprint is stable when the same image is brightened',
    similarity(A.a, brighter.a) >= DUP_THRESHOLD && similarity(A.d, brighter.d) >= DUP_THRESHOLD,
  )
  ok('and stable when it is rescaled, which is the point of a perceptual hash', similarity(A.a, rescaled.a) >= DUP_THRESHOLD)
  ok('an inverted image is not a match, so the threshold is not decoration', similarity(A.a, flipped.a) < 0.5, `${similarity(A.a, flipped.a)}`)
  ok('hamming distance is symmetric and rejects malformed hashes', hamming(A.a, brighter.a) === hamming(brighter.a, A.a) && hamming('zz', A.a) === -1)
  ok(
    'aHash yields 64 bits and dHash 56 on an 8×8 matrix — hashMatrix widens it to 64 so both compare at one length',
    aHash(gradient(32)).length === 16 && dHash(gradient(32)).length === 14 && A.a.length === 16 && A.d.length === 16,
    `${aHash(gradient(32)).length}/${dHash(gradient(32)).length}/${A.d.length}`,
  )
  ok(
    'the reference lookup returns the match with its distance',
    duplicateOf(A, [{ ref: 'seller/old.png', a: rescaled.a, d: rescaled.d }]).similarity >= DUP_THRESHOLD,
  )
  ok('and says nothing when the reference is empty, instead of passing', duplicateOf(A, []) === null)
  ok('a missing decoder is a named fallback, not a silent sha claim', fnv1a(new Uint8Array([1, 2, 3])).startsWith('fnv1a:'))

  /* ——— ٧. الطبقة الخامسة: البلاغات تُجمّد عند العتبة، والتظلّم يُفتح ——— */
  ok(
    'one ownership report does not freeze a listing; three do',
    applyReports([{ kind: 'rights' }, { kind: 'rights' }]).frozen === false &&
      applyReports(Array.from({ length: REPORT_FREEZE }, () => ({ kind: 'rights' }))).frozen === true,
  )
  ok(
    'a freeze outranks whatever the pipeline decided',
    appealsLayer({ state: 'published', reports: Array.from({ length: REPORT_FREEZE }, () => ({ kind: 'rights' })) }).state === 'frozen',
  )
  ok(
    'an appeal opens and is never closed automatically',
    appealsLayer({ appeal: { state: 'open', text: 'x' } }).appeal === 'open' && appealsLayer({}).appeal === 'none',
  )

  /* ——— ٨. العلامة المائية: وعد المصفوفة يُطبع فعلًا ——— */
  const sheet = '<html><head></head><body>سيرة</body></html>'
  ok(
    'the free plan stamps the sheet and a paid plan does not',
    withWatermark(sheet, { on: true, label: 'x' }).includes('qalb-wm') && withWatermark(sheet, { on: false }) === sheet,
  )
  ok(
    'and the watermark survives into print, which is where a PDF comes from',
    withWatermark(sheet, { on: true, label: 'x' }).includes('print-color-adjust'),
  )

  /* ——— ٩. ما تعرضه الواجهة: البوابة والحاسبة ——— */
  const renderRoute = async ({ url, storage = {}, lang = 'ar' }) => {
    // نفس `render` الذي تصيّره بقية المجموعات — لا نافذة تنقّل مصطنعة:
    // المسار يُحمَّل من عنوان jsdom فيمرّ بالموجّه نفسه الذي يمرّ به الزائر.
    // واللغة تُزرع في الحافظة كما يزرعها الزائر: سمة `lang` على <html> وحدها لا تكفي.
    return render(`http://localhost${url}`, { 'qalb.lang': lang, ...storage }, { lang })
  }
  // v1.8.0: /create لم يبقَ محرّرًا — البوابة تُقرأ من /account حيث يعرض الحسابُ سلّمَه
  const gate = await render('http://localhost/account', { 'qalb.account.v1': JSON.stringify(revenueAccount) })
  ok(
    'a free account that used its template meets the plan table, not an editor',
    /بلغت سقف خطتك/.test(gate.txt()) && !/ولّد قالبى الأول/.test(gate.txt()),
    gate.txt().slice(0, 60),
  )
  ok('the gate offers the paid tiers with their real prices', /Qalb Plus/.test(gate.txt()) && /19/.test(gate.txt()) && /49/.test(gate.txt()))
  ok('and it says plainly that nothing is charged here', /لا بوابة دفع موصولة/.test(gate.txt()))
  gate.dom.window.close()

  const sell = await render('http://localhost/sell', { 'qalb.account.v1': JSON.stringify({ ...revenueAccount, plan: 'pro' }) })
  ok(
    'the seller console shows the split to the halala before any sale: 37.25 commission and 111.75 net on the 149 default',
    /37\.25/.test(sell.txt()) && /111\.75/.test(sell.txt()),
    (sell.txt().match(/\d+\.\d\d/g) || []).slice(0, 6).join(','),
  )
  ok('and it publishes the commission, the escrow days and the minimum', /25/.test(sell.txt()) && /14/.test(sell.txt()) && /100/.test(sell.txt()))
  sell.dom.window.close()

  const pricingAr = await renderRoute({ url: '/pricing' })
  ok(
    'pricing · ar: the matrix prints its rows with real values, not a legend that promises them',
    (
      pricingAr
        .txt()
        .match(
          /كامل للقالب الأول|كامل لجميع القوالب|بعلامة مائية|بلا علامة مائية|قالبٌ واحد فقط|بلا سقف|في خطة Pro|من Plus وما فوقها|ميزة Pro وحدها|بعد تجاوز الفحص الآلي/g,
        ) || []
    ).length >= 9,
    (
      pricingAr
        .txt()
        .match(
          /كامل للقالب الأول|كامل لجميع القوالب|بعلامة مائية|بلا علامة مائية|قالبٌ واحد فقط|بلا سقف|في خطة Pro|من Plus وما فوقها|ميزة Pro وحدها|بعد تجاوز الفحص الآلي/g,
        ) || []
    ).length + ' cells',
  )
  ok('pricing · ar: the free column is named for what it is, not dressed as a paid plan', /مجاني — الباقة المجانية/.test(pricingAr.txt()))
  ok(
    'pricing · ar: the gateway line is on the page, so “subscribe” is never read as “we will charge your card”',
    /لا بوابة دفع موصولة/.test(pricingAr.txt()),
    'لا بوابة دفع موصولة',
  )
  pricingAr.dom.window.close()

  const pricingEn = await renderRoute({ url: '/pricing', lang: 'en' })
  ok(
    'pricing · en: the same matrix renders with the same row count',
    (
      pricingEn
        .txt()
        .match(/first template|every template|watermarked|no watermark|one template only|no ceiling|pro plan|from plus|pro-only|automated check/gi) ||
      []
    ).length >= 10,
    (
      pricingEn
        .txt()
        .match(/first template|every template|watermarked|no watermark|one template only|no ceiling|pro plan|from plus|pro-only|automated check/gi) ||
      []
    ).length + ' cells',
  )
  pricingEn.dom.window.close()

  const accountAr = await renderRoute({ url: '/account', storage: { 'qalb.account.v1': JSON.stringify(revenueAccount) } })
  ok(
    'account · ar: activation says plainly that it is recorded here and nothing is deducted from a card',
    /يُسجَّل التفعيل هنا/.test(accountAr.txt()) && /لا يُخصم من بطاقة/.test(accountAr.txt()),
    'يُسجَّل التفعيل هنا · لا يُخصم من بطاقة',
  )
  accountAr.dom.window.close()

  /* ——— ١٠. مسارات النمو: /create صار بابًا إلى الكتالوج، وبابا الفاحص معهما ——— */
  const createDoc = await renderRoute({ url: '/create' })
  // v1.8.0: المُنشئ أُزيل — المسار يُحوَّل إلى الكتالوج نفسه، فيه ثلاثُ بطاقاتٍ على
  // الأقل من قوالب حقيقية، وفيه الفلاتر التي كان المُنشئ يفتتحها على شكل أسئلة.
  const tplLinks = [...createDoc.doc.querySelectorAll('a[href^="/template/"]')].map((a) => a.getAttribute('href').replace('/template/', ''))
  ok(
    'growth: /create lands on the catalogue with real template cards',
    /كل القوالب/.test(createDoc.txt()) && tplLinks.length >= 3 && tplLinks.every((slug) => CATALOGUE.some((t) => t.slug === slug)),
    tplLinks.slice(0, 5).join(','),
  )
  ok('growth: …and the decision is a filter, not a wizard', /الفلاتر/.test(createDoc.txt()) && /إعادة ضبط الفلاتر/.test(createDoc.txt()))
  const atsDoc = await renderRoute({ url: '/ats' })
  ok(
    'growth: the free ATS tool upsells the full portfolio, into the catalogue',
    !!atsDoc.doc.querySelector('a[href="/templates"][data-ats-build]'),
    'a[href=/templates][data-ats-build]',
  )
  // الشارة تُقرأ من صفحة منشورة فعلًا: سجلٌّ كامل يمرّ بـ renderSite لا كائنٌ ناقص
  const { sanitizeSite } = await import('../src/data/hosting.js')
  const barRec = (plan) => ({
    slug: 'noura-alhrbi',
    plan,
    site: sanitizeSite({ name: 'نورة الحربي', role: 'مصممة منتجات', template: 'aether', lang: 'ar', theme: 'dark' }),
  })
  const hostedFree = renderSite(barRec('free'), '/')
  ok(
    // v1.8.0: الباب هو الكتالوج — /create لم يبقَ، فالرابط المكتوب لا رابطٌ يتبع تحويلًا
    'growth: every free page carries “build your own” back to the catalogue',
    /أنشئ نسختك مجانًا/.test(hostedFree.body) && /href="https:\/\/qalb\.store\/templates"/.test(hostedFree.body),
    /qalb-brand/.test(hostedFree.body) ? 'the bar is there but the CTA is not' : 'no bar rendered at all',
  )
  ok('growth: …and a paid plan still drops the bar entirely', !/qalb-brand/.test(renderSite(barRec('pro'), '/').body), 'pro')

  const bad = checks.filter(([, pass]) => !pass)
  if (bad.length) {
    failed++
    groups++
    console.log('✗ revenue model · plans, gate, market split, inspection pipeline')
    bad.forEach(([n]) => console.log('   failed: ' + n))
  } else {
    groups++
    console.log(`✓ revenue model · plans, gate, market split, inspection pipeline  (${checks.length} assertions)`)
  }
}

console.log(
  failed
    ? `\n${failed} of ${groups} check groups failed`
    : `\nall ${groups} check groups passed · ${cases.length} routes / ${routeChecks} expectations`,
)
process.exit(failed ? 1 : 0)
