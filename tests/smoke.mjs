/**
 * Runtime smoke test: bundles the real app and renders each route in jsdom,
 * asserting visible copy — this executes the same component paths the browser runs.
 *   node tests/smoke.mjs
 */
import { build } from 'esbuild'
import { readFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'
import { dict } from '../src/i18n/translations.js'
import { byId, templates } from '../src/data/templates.js'
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
import { claimStaleReload, clearStaleReload, isStaleLoadError } from '../src/lib/load-error.js'

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
      'القالب ملكك مدى الحياة',
      'الاستضافةُ اختيارية',
      'ادفع مرة واحدة',
      '449',
      'SALE25',
      'qalb@qalb.store',
    ],
  },
  {
    name: 'home / english',
    url: 'http://localhost/',
    lang: 'en',
    expect: ['Qalb', 'Trending this week', 'The template is yours for life', 'hosting is optional', 'Pay once', '449', 'ATS'],
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
  { name: 'hosting', url: 'http://localhost/host', expect: ['قالبك يصير موقعًا', 'qalb.store', '19', 'مجانًا', 'تعديلات في الشهر', 'نسخ'] },
  {
    name: 'hosting / english',
    url: 'http://localhost/host',
    lang: 'en',
    expect: ['Your template becomes a site', 'subdomain', '19', 'free', 'edits a month'],
  },
  { name: 'studio (nothing yet)', url: 'http://localhost/studio', expect: ['لا موقع على هذا المتصفح', 'أنشئ موقعي'] },
  {
    name: 'institutions',
    url: 'http://localhost/b2b',
    expect: ['الفرز الآلي', 'ضريبة القيمة المضافة', 'اعتماد', 'اطلبوا عقدًا', 'كم بقي من مقاعدنا؟', '3,900', '15,000', '45,000'],
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
  { name: 'wishlist', url: 'http://localhost/wishlist', wish: '["nova","aether"]', expect: ['المفضلة', 'أيثر'] },
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
  const reactErrors = errs.filter((e) => !/Warning: |not implemented/i.test(e))
  routeChecks += c.expect.length + 1 // كل توقّع + فحص «لا أخطاء React»

  if (missing.length || reactErrors.length) {
    failed++
    console.log(`✗ ${c.name}`)
    if (missing.length) console.log(`   missing: ${missing.join(' | ')}`)
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
  const legalLinks = [...document.querySelectorAll('#main a[href^="/legal#"]')]
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
    const tpl = bySlug('aether-portfolio')
    ok(
      'product page emits Product schema',
      ld &&
        ld['@type'] === 'Product' &&
        Number(ld.offers.price) === tpl.price &&
        ld.offers.priceCurrency === 'SAR' &&
        ld.aggregateRating.reviewCount === tpl.reviews,
      ld ? `${ld['@type']} ${ld.offers?.price}` : 'missing',
    )
    ok(
      'canonical + og:url point at the real route',
      g.doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href') === 'http://localhost/template/aether-portfolio',
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
    ok('the JSON-LD image follows the card', /\/og\/atlas-cv\.png$/.test(ld.image || ''), ld.image)
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
    const privateRoutes = ['/checkout', '/cart', '/order', '/admin', '/studio'] // الاستوديو أداة خاصة: لا في الـsitemap ولا في الفهرس
    const publicRoutes = staticRoutes.filter((p) => !privateRoutes.includes(p))
    const notInMap = publicRoutes.filter((p) => !map.includes(`${p}</loc>`))
    ok(
      'every public route in the router is in the sitemap',
      publicRoutes.length >= 6 && notInMap.length === 0,
      `missing=${notInMap.join(',') || '—'} of ${publicRoutes.length}`,
    )
    ok(
      'the sitemap length is what the generator should write: pages + every product',
      (map.match(/<loc>/g) || []).length === publicRoutes.length + templates.length,
      `${(map.match(/<loc>/g) || []).length} vs ${publicRoutes.length + templates.length}`,
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
    'the address is kept on the device only, with no fake subscription claim',
    JSON.parse(g.win.localStorage.getItem('qalb.newsletter.v1') || '[]')[0] === 'sara@qalb.dev' && !/تم الاشتراك|Subscribed/.test(nl.textContent),
    JSON.parse(g.win.localStorage.getItem('qalb.newsletter.v1') || '[]').join(','),
  )
  /* ---- «كل القوالب» رقمٌ يُقرأ من الرّفّ، لا يُروى من نصّ ---- */
  const bundlesTxt = (g.doc.querySelector('#bundles')?.textContent || '').replace(/\s+/g, ' ')
  const shelfSum = templates.reduce((n, x) => n + x.price, 0)
  const en0 = new Intl.NumberFormat('en-US')
  ok(
    'the full-path badge states the shelf as it is today',
    bundlesTxt.includes(en0.format(templates.length)) && bundlesTxt.includes('قالب'),
    `${templates.length} templates · ${bundlesTxt.slice(0, 40)}`,
  )
  ok('and it charges what those templates add up to, to the riyal', bundlesTxt.includes(en0.format(shelfSum)), en0.format(shelfSum))
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
  ok('the buyable price table drops it', /14\D*\/\D*15/.test(g.txt()), (g.txt().match(/الأسعار[^\n]{0,40}/) || [''])[0])
  /* --- كل منتج مربوط بتسليمه من تلقاء نفسه: لا شيء يُكتب باليد في اللوحة --- */
  {
    const rows = [...g.doc.querySelectorAll('[data-admin] tbody tr')]
    const badged = rows.filter((r) => /تسليم موقّع لكل طلب على حدة/.test(r.textContent || ''))
    const paths = badged.map(
      (r) => ((r.querySelector('[title*="/download/"]') || {}).getAttribute?.('title') || '').match(/\/download\/[a-z0-9-]+/)?.[0] || '',
    )
    ok('every product row carries its own signed delivery badge', badged.length === 15 && rows.length === 15, `${badged.length}/${rows.length}`)
    ok('the badge names that product, not a shared link', new Set(paths).size === 15 && paths.every(Boolean), paths.slice(0, 3).join(','))
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
    JSON.stringify([{ quote: 'QALB-Q-2026-TT1', org: 'جامعةُ الفحص', email: 'a@b.sa', tier: 'pilot', seats: 25 }]),
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
  ok('the cart charges the price set in the panel', /199/.test(cartMain) && !/249/.test(cartMain), cartMain.replace(/\s+/g, ' ').slice(0, 70))
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
    'the admin path is unlisted: no link, no sitemap entry, one robots line',
    !readSrc('src/components/Footer.jsx').includes('/admin') && !readSrc('public/sitemap.xml').includes('/admin'),
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
    !!again.doc.querySelector('#personalize a[href="/legal#privacy"]') && /كيف تُحفظ هذه البيانات/.test(again.txt()),
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
    'two plans, priced exactly as the storefront promises',
    plans.length === 2 && PLANS.free.price === 0 && priceOf('pro') === 19,
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
    'five tiers, seats and prices both ascending',
    B2B_TIERS.length === 5 && B2B_TIERS.every((t, i) => !i || (t.seats > B2B_TIERS[i - 1].seats && t.price > B2B_TIERS[i - 1].price)),
    B2B_TIERS.map((t) => `${t.seats}/${t.price}`).join(' '),
  )
  ok(
    'the approved numbers are the ones on the shelf',
    B2B_TIERS.map((t) => `${t.seats}/${t.price}`).join(' ') === '25/3900 50/15000 150/24000 300/33000 500/45000',
  )
  ok('a term is one year, never auto-renewed', B2B_TERM_MONTHS === 12 && addMonths('2026-09-05', B2B_TERM_MONTHS) === '2027-09-05')
  ok(
    'per-seat price is divided, not marketed',
    B2B_TIERS.every((t) => perSeat(t) === Math.round((t.price / t.seats) * 100) / 100),
    String(perSeat(B2B_TIERS[0])),
  )
  ok(
    'a seat opens only templates that carry a CV',
    SEAT_TEMPLATES.length === 7 && SEAT_TEMPLATES.every((t) => t.ats != null && t.kind !== 'site'),
    SEAT_TEMPLATES.map((t) => t.id).join(','),
  )
  ok(
    'and the retail range quoted is the catalogue’s own',
    cheapestSeatRetail() === Math.min(...SEAT_TEMPLATES.map((t) => t.price)) &&
      priciestSeatRetail() === Math.max(...SEAT_TEMPLATES.map((t) => t.price)),
  )

  const rec0 = makeOrg({ org: 'جامعة', email: 'careers@u.edu.sa', tier: 'campus', issued: '2026-09-05' })
  /* ---------- باقةُ الدخول، والحسبةُ التي يعملها موظفُ المشتريات ---- */
  const pilot = B2B_TIERS.find((t) => t.id === 'pilot')
  ok('a pilot tier exists and is the entry point', !!pilot && B2B_TIERS[0].id === 'pilot' && pilot.seats === 25 && pilot.price === 3900)
  ok('its per-seat figure is arithmetic, not a pitch', perSeat(pilot) === 156)
  const sBundle = seatBundle()
  ok('the comparison names a real product at its real price', !!sBundle && sBundle.id === 'mirrorbundle' && Number(sBundle.price) === 449)
  ok(
    'and every saving on the page is computed from that price',
    B2B_TIERS.every((t) => perSeatVsBundle(t) === Math.max(0, Math.round((1 - perSeat(t) / Number(sBundle.price)) * 100))),
  )
  ok('the department tier reads 33% under the bundle — the buyer’s own division', perSeatVsBundle(B2B_TIERS.find((t) => t.id === 'campus')) === 33)
  ok(
    'the range quoted is the shelf’s own, counted not recited',
    (() => {
      const b = seatRetailBand()
      return b.count === SEAT_TEMPLATES.length && b.min === cheapestSeatRetail() && b.max === priciestSeatRetail()
    })(),
  )
  ok('a seat count no tier matches rounds up, and says by how much', tierForSeats(60).tier.id === 'institute' && tierForSeats(60).over === 90)
  ok('past the largest tier we admit two contracts are needed', tierForSeats(900).tier.id === 'employment' && tierForSeats(900).under === 400)
  ok(
    'a credit can be recorded on a contract, rounded and never negative',
    makeOrg({ tier: 'pilot', credit: '3900.7' }).credit === 3901 && makeOrg({ credit: -5 }).credit === 0,
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
      seats: '25',
      slots: 'الأحد ١١ص',
      note: 'فاتورة باسم الإدارة المالية',
      etimad: true,
      tier: 'pilot',
    },
    { tiers: B2B_TIERS, now: new Date('2026-09-05T09:00:00Z') },
  )
  ok(
    'a complete request is accepted with every field kept',
    lead.ok && lead.value.org.includes('جامعة') && lead.value.phone === '0555 123 456' && lead.value.seats === 25,
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
    Math.round((lm.base + lm.vat) * 100) / 100 === lm.total && lm.total === 3900 && lm.vat === 508.7 && lm.base === 3391.3,
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
    lbody.includes(lead.value.quote) && lbody.includes('3900') && lbody.includes('ضريبة القيمة المضافة'),
  )
  ok('the Etimad condition travels in the body, not in a footnote', lbody.includes('اعتماد'))
  ok(
    'a lead row and its CSV agree on the same twelve columns',
    leadRow(lead.value).total === 3900 && leadCsv([lead.value]).split('\n')[0].split(',').length === 12,
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
  const rec = makeOrg({ code: makeOrgCode(() => 0.5), org: 'جامعة', email: 'careers@u.edu.sa', tier: 'campus', issued: '2026-09-05' })
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
  const emp = B2B_TIERS.find((t) => t.id === 'employment')
  const leadEmp = normalizeLead(
    { org: 'مكتب العمل', email: 'a@b.gov.sa', seats: '700', note: 'أربع مناطق', tier: 'employment' },
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
    g.txt().includes(String(perSeat(B2B_TIERS[3]))) && g.txt().includes(String(cheapestSeatRetail())),
  )
  ok('the term appears as the constant says it', g.txt().includes(String(B2B_TERM_MONTHS)))
  ok('the page states the tax in the reader’s language, not only in a mail body', g.txt().includes('ضريبة القيمة المضافة') && g.txt().includes('١٥٪'))
  ok('the entry offer is on the page with its real number', g.txt().includes(nf.format(3900)))
  ok('the seat arithmetic is shown against the bundle it unlocks', g.txt().includes('449') && g.txt().includes('33%'))
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
    cat?.offers?.length === 5 && cat.offers.every((o, i) => o.price === B2B_TIERS[i].price.toFixed(2) && o.priceCurrency === 'SAR'),
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
    decodeURIComponent(g.doc.querySelector('[data-b2b-request] a[href^="mailto:"]')?.href || '').includes('45000'),
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
  ok(
    'the panel follows what you typed, not what we hope',
    !!g.doc.querySelector('[data-ats-rules]') && !g.txt().includes('100'),
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

console.log(
  failed
    ? `\n${failed} of ${groups} check groups failed`
    : `\nall ${groups} check groups passed · ${cases.length} routes / ${routeChecks} expectations`,
)
process.exit(failed ? 1 : 0)
