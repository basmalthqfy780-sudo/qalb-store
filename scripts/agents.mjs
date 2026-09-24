/**
 * أصولُ القراءة الآلية: robots.txt و llms.txt.
 *
 * لماذا ملفٌ واحد للمولَّدين؟ لأن الوكلاء الآليين يقرؤون أرقامًا لا وعْدًا: كلُّ سعرٍ
 * وكلُّ عددِ مقاعدٍ هنا يُسحَب من `src/data/*` كما يقرأها المتجرُ نفسه — فلا ينجرف
 * ملفٌ عامٌّ عن الكتالوج. و`scripts/seo.mjs` يستدعيهما قبل البناء (prebuild)، والفحص
 * في `tests/smoke.mjs` يعيد توليدهما ويقارنهما بما على القرص سطرًا بسطر.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
// نفسُ بناء الروابط الذي تستعمله الواجهة وscripts/seo.mjs: نصٌّ خام، لا Markdown.
import { rawUrl } from '../src/data/links.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const imp = (rel) => import(path.join(ROOT, rel))

/** ما يخصُّ شخصًا واحدًا أو يغيّر البيانات: ممنوعٌ على كلِّ وكيل، بلا استثناء. */
export const PRIVATE_PATHS = ['/checkout', '/order', '/cart', '/admin', '/studio', '/account', '/sell']

/** وكلاءُ الذكاء الاصطناعي الذين نرحّب بهم على المحتوى العامّ صراحةً، لا ضمنيًّا. */
export const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'CCBot',
  'cohere-ai',
  'DuckAssistBot',
  'MistralAI',
  'MistralAI-User',
  'Amazonbot',
]

const agentBlock = (ua) => [`User-agent: ${ua}`, 'Allow: /', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`)].join('\n')

/** robots.txt: عامٌّ مفتوحٌ للوكلاء، والخاصُّ ممنوعٌ على الكلّ — بلا تفاوتٍ بينهم. */
export function buildRobots({ site = 'https://qalb.store' } = {}) {
  return [
    [
      '# Qalb · قالب — قواعدُ الزحف',
      '# النصوصُ العامةُ (القوالبُ والأسعارُ وفاحصُ الجاهزية وصفحةُ المؤسسات) مفتوحةٌ للقراءة،',
      '# ومن فيها وكلاءُ الذكاء الاصطناعي مسموحٌ بهم صراحةً في أسفله. الممنوعُ ما يخصُّ شخصًا',
      '# واحدًا أو يكتب بيانات: السلّةُ وإتمامُ الطلب والإيصالُ ولوحةُ الإدارة ومحرّر الطالب.',
      '# ملخّصٌ بلغةٍ آلية للموقع: /llms.txt · خريطةُ المسارات: /sitemap.xml',
    ].join('\n'),
    agentBlock('*'),
    '# ——— وكلاءُ الذكاء الاصطناعي: نفسُ العامّ مسموحٌ به، ونفسُ الخاصّ ممنوعٌ به ———\n' + AI_AGENTS.map(agentBlock).join('\n\n'),
    `Sitemap: ${rawUrl('/sitemap.xml', site)}`,
    '',
  ].join('\n\n')
}

const num = (v) => Number(v || 0).toLocaleString('en-US')
const arNum = (v) => String(num(v)).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)))

/**
 * llms.txt: نسخةٌ مسطّحةٌ صادقةٌ للمتجر — إنجليزيةٌ ثم عربية.
 * كلُّ رقمٍ هنا مقروءٌ من بيانات الواجهة؛ والعبارةُ التي لا سندَ لها عندنا لا تُكتب.
 */
export async function buildLlms({ site = 'https://qalb.store' } = {}) {
  const { templates } = await imp('src/data/templates.js')
  const { B2B_TIERS, B2B_TERM_MONTHS, SEAT_TEMPLATES, perSeat, perSeatVsBundle, seatBundle, seatRetailBand, COHORT_MAX } =
    await imp('src/data/b2b.js')
  const { ATS_RULES, ATS_TARGET, ATS_DEMO, analyzeAts } = await imp('src/data/ats.js')
  const { MARKET_MIN } = await imp('src/data/market.js')
  const { COMPANY, VAT_RATE, QUOTE_VALID_DAYS, quoteReady, quoteMissing, isSet } = await imp('src/data/company.js')
  const { SUPPORT_MAIL, SUPPORT_PHONE, BOOKING_URL } = await imp('src/data/contact.js')
  const { PLANS } = await imp('src/data/hosting.js')
  // نموذج الربح: الخطط ومصفوفة القيمة، وقواعد السوق (العمولة، التأمين، الحد الأدنى)
  const { PLANS: TIERS, FEATURE_MATRIX, PUBLISH_DONE } = await imp('src/data/plans.js')
  const { COMMISSION, MIN_PAYOUT, ESCROW_DAYS, REPORT_FREEZE, split: splitPrice, LICENCE } = await imp('src/data/marketplace.js')
  const { BANDS, LAYERS } = await imp('src/data/inspect.js')
  const { offers } = await imp('src/data/offers.js')
  const { UPSELLS, cartUpsells, serviceUpsells, proPlans } = await imp('src/data/upsells.js')
  const { coupons } = await imp('src/data/templates.js')

  // رابطٌ واحد صريح في الملف كله: بلا `[نص](رابط)` — القارئُ الآليّ قد لا يُحوِّل
  // Markdown أصلًا، فيبقى العنوانُ عنوانًا والرابطُ رابطًا.
  const U = (p) => rawUrl(p, site)
  const prices = templates.map((t) => Number(t.price)).filter(Boolean)
  const band = seatRetailBand()
  const bundle = seatBundle()
  const pro = PLANS.pro
  const free = PLANS.free
  const vatPct = Math.round(VAT_RATE * 100)
  const legalReady = quoteReady()
  const missing = quoteMissing()
  const demoScore = analyzeAts(ATS_DEMO).score
  const sampleSplit = splitPrice(199)
  const tiersLine = TIERS.map(
    (t) =>
      `${t.name.en}: ${t.price ? `SAR ${num(t.price)}/${t.period}` : 'free'} · ${
        t.templates == null ? 'unlimited templates' : `${t.templates} template${t.templates > 1 ? 's' : ''}`
      }${t.watermark ? ' · watermarked résumé PDF' : ''}${t.publish ? ' · direct publishing' : ''}${t.exportSite ? ' · site-file export' : ''}${
        t.domain ? ' · custom domain' : ''
      }${t.badge ? '' : ' · no badge'}${t.sell ? ' · selling allowed' : ''}`,
  ).join('\n- ')
  const tiersLineAr = TIERS.map(
    (t) =>
      `${t.name.ar}: ${t.price ? `${arNum(t.price)} ريالًا/${t.period === 'month' ? 'شهرًا' : 'سنة'}` : 'مجانًا'} · ${
        t.templates == null ? 'قوالب غير محدودة' : `${arNum(t.templates)} قالبًا`
      }${t.watermark ? ' · سيرة PDF بعلامة مائية' : ''}${t.publish ? ' · نشر مباشر' : ''}${t.exportSite ? ' · تصدير ملفات الموقع' : ''}${
        t.domain ? ' · نطاق خاص' : ''
      }${t.badge ? '' : ' · بلا شارة'}${t.sell ? ' · يُسمح بالبيع' : ''}`,
  ).join('\n- ')
  const bandsLine = BANDS.map((b) => `${b.min}–${b.max} → ${b.verdict}`).join('; ')

  const tiersEn = B2B_TIERS.map(
    (t) =>
      `- ${t.seats} seats · SAR ${num(t.price)} for ${B2B_TERM_MONTHS} months · SAR ${perSeat(t)} per seat · ${
        perSeatVsBundle(t) > 0 ? `${perSeatVsBundle(t)}% under buying the same product one by one` : 'the volume tier'
      }`,
  ).join('\n')
  const tiersAr = B2B_TIERS.map(
    (t) =>
      `- ${arNum(t.seats)} مقعدًا · ${arNum(t.price)} ريالًا لكل ${arNum(B2B_TERM_MONTHS)} شهرًا · ${arNum(perSeat(t))} ريالًا للمقعد · أقلُّ بـ${arNum(perSeatVsBundle(t))}٪ من شرائه فرديًا`,
  ).join('\n')
  const tplEn = templates
    .map(
      (t) =>
        `- ${t.name.en} — ${U('/template/' + t.slug)} — ${t.tagline.en} — SAR ${num(t.price)}${
          t.ats != null ? ', ships an ATS-readable CV as well as the site' : ', site only'
        }`,
    )
    .join('\n')
  const tplAr = templates
    .map(
      (t) =>
        `- ${t.name.ar} — ${U('/template/' + t.slug)} — ${t.tagline.ar} — ${arNum(t.price)} ريالًا${
          t.ats != null ? ' · يُخرِج سيرةً ذاتية يقرؤها الفرزُ الآلي مع الموقع' : ' · موقعٌ فقط'
        }`,
    )
    .join('\n')

  const legalEn = legalReady
    ? [
        'The seller of record, printed on every quotation sheet:',
        ...[
          ['Registered name', COMPANY.legalName],
          ['Commercial registration', COMPANY.crNumber],
          ['VAT registration', COMPANY.vatNumber],
          ['IBAN', COMPANY.iban],
          ['Bank', COMPANY.bank],
        ]
          .filter(([, v]) => isSet(v))
          .map(([k, v]) => `- ${k}: ${v}`),
      ].join('\n')
    : [
        `No VAT registration number, commercial-registration number, IBAN or bank name is published by this storefront, because none is entered by the owner — the site will not print an invented one. The quotation sheet prints “pending verification” in each empty field and lists what is missing; today that list is: ${
          missing.length ? missing.join(', ') : 'empty'
        }. Every price is inclusive of ${vatPct}% Saudi VAT and the printed sheet separates net amount, tax and total on three lines so a finance department can redo the arithmetic.`,
      ].join('\n')

  const legalAr = legalReady
    ? `الاسمُ المسجَّل، رقمُ السجلِّ التجاري، الرقمُ الضريبي، IBAN والبنك — كلها مطبوعةٌ على ورقةِ عرضِ السعر من بياناتِ المالك.`
    : `لا يُنشر رقمٌ ضريبيٌّ ولا سجلٌّ تجاريٌّ ولا IBAN ولا اسمُ بنك في أيِّ ملفٍّ من ملفات الموقع، لأن صاحبَ المتجر لم يُدخلها بعد — ولن نطبع رقمًا من عندنا. ورقةُ عرضِ السعر تطبع «قيدَ التوثيق» في كلِّ خانةٍ فارغة وتُسقِط قائمةَ الناقص، وهي اليوم: ${
        missing.length ? missing.join('، ') : 'فارغة'
      }. كلُّ سعرٍ مشتملٌ على ضريبة القيمة المضافة ${vatPct}٪، والورقةُ تفصل الأساسَ والضريبةَ والإجماليَ في ثلاثة أسطرٍ ليعيدَ القسمُ الماليُّ الحسابَ بنفسه.`

  const phoneEn = SUPPORT_PHONE
    ? `Sales phone: ${SUPPORT_PHONE}${BOOKING_URL ? ` · book a 20-minute demo: ${BOOKING_URL}` : ''}`
    : `No sales phone number and no booking link are published, because none is configured on this deployment; the site says that plainly instead of showing a call button that reaches nothing. The working channel is ${SUPPORT_MAIL}${
        BOOKING_URL ? `, and a demo can be booked at ${BOOKING_URL}` : ''
      }.`
  const phoneAr = SUPPORT_PHONE
    ? `هاتفُ المبيعات: ${SUPPORT_PHONE}${BOOKING_URL ? ` وحجزُ عرضٍ من عشرين دقيقة: ${BOOKING_URL}` : ''}`
    : `لا هاتفَ مبيعات ولا رابطَ حجزٍ منشورًا — لا شيء مضبوطًا في هذا النشر، والصفحةُ تقول ذلك بصريح العبارة بدل زرِّ «اتصل» لا يوصل إلى شيء. القناةُ العاملةُ هي الكتابةُ إلى ${SUPPORT_MAIL}${
        BOOKING_URL ? ` مع إمكانية حجزِ عرضٍ على ${BOOKING_URL}` : ''
      }.`

  const parts = [
    '# Qalb · قالب',
    '',
    `> Qalb sells a CV and a site that a recruiter’s parser can actually read, gives away the measurement tool that proves it, and licenses that tool to whole graduating cohorts. Arabic-first RTL interface with a complete English mirror; prices in Saudi riyals, VAT ${vatPct}% included. Every page here is a client-rendered React app, so this file — not a crawl of the DOM — is the plain-text authority for what the site is.`,
    '',
    `Every address below is written raw (\`${U('/template/nova-cv')}\`), never as a Markdown link, so a reader that does not render Markdown still sees the URL itself.`,
    '',
    '## What is sold',
    '',
    `${templates.length} published templates, SAR ${num(Math.min(...prices))}–${num(Math.max(...prices))} each. ${SEAT_TEMPLATES.length} of them also produce an ATS-readable CV, and that subset is what an institutional seat unlocks: a seat buys a machine-readable document, not decoration.`,
    '',
    '### Templates',
    tplEn,
    '',
    '## Free tool: ATS readiness checker',
    '',
    `${U('/ats')} · no account, no upload, nothing stored. ${ATS_RULES.length} rules are scored out of 100 against text pasted in your own browser, in Arabic or English, and every gap comes with the fix for that gap. The passing line is ${ATS_TARGET.pass}, and the structural thresholds behind it are public: ${ATS_TARGET.minWords}–${ATS_TARGET.maxWords} words and at least ${ATS_TARGET.minBullets} bullet lines; an empty document scores 0, so the scale has no participation floor. The sample CV in the repository scores ${demoScore}. The paid templates emit the same structure this checker reads.`,
    '',
    '## The hiring suite (six tools around one job application)',
    '',
    `The checker answers “can a machine read my CV?”. The hiring suite answers the next question — “is my CV written in the language of this posting?” — and it is priced per application, not per month, because a job seeker applies twenty times and then stops.`,
    '',
    `${U('/match')} — paste a CV and a posting: the overall match percentage is free; the detailed report (the missing words ordered by weight, a suggested line for each with the section it belongs in, and three templates that fit the field) is SAR 29, or five reports for SAR 79. The score is the weight present over the weight required, where a word in the post’s title outweighs one in its body; company names and cities are not counted as requirements.`,
    `${U('/kit')} — SAR 49 for ten generations. Each generation turns one posting into four artefacts: the CV bullets re-ordered around the post’s words, a cover letter, a LinkedIn note and an e-mail with its subject line. It invents nothing: whatever it cannot find in your CV is left in brackets for you to write.`,
    `${U('/u/<name>')} — a professional link holding a CV, work, a contact button and a CV download, with analytics the owner can see: opens, CV downloads and contact taps, plus countries with the SAR 29 a month plan. The country is inferred from the visitor’s device time zone, never from an address, and no view is tied to a person.`,
    `${U('/talent')} — a directory of profiles their owners switched on, searchable by field, city and readiness score; listing is free and removal is one click, and no e-mail is shown unless its owner says so. Companies reach it on a subscription; a featured spot is SAR 29 a month.`,
    `${U('/market')} — four optional, anonymous answers after every check (field, city, did you get an interview, which template) aggregated into a public report: interviews per field, median months before a first interview, and which templates interviewees used. No rate is published before ${MARKET_MIN} answers, and every rate carries the count it came from.`,
    `${U('/embed')} — the readiness checker as one iframe on a university, institute or placement site: SAR 199 a month for 500 loads, SAR 499 for 2,000, and universities above that by agreement. The check runs in the visitor’s browser, so the institution buys placement and a monthly allowance — never student data, which we do not have.`,
    '',
    '## For universities, colleges and employment offices',
    '',
    `Annual seat contracts of ${B2B_TERM_MONTHS} months, no auto-renewal. A seat is redeemed once by one student e-mail on one template with an institution code (\`QALB-XXXX-XXXX\`, excluding letters that read as digits), and it issues a licence key for that student’s own download. Prices are contract figures, not promotions:`,
    '',
    tiersEn,
    '',
    `The university ladder is three packages: a cohort of 50 seats, a college of 100 with the coach panel — the cohort code’s page shows the coach seats spent and seats left, with no student names — and a campus of 300 that adds a workshop run by our team, scheduled with the university after signing. More than 300 students is a second contract; the page says so rather than inventing a bigger tier.`,
    `A seat is compared with what a seat opens, never with the cheapest item on the shelf: the reference product is ${
      bundle ? `“${bundle.name.en}” at SAR ${num(bundle.price)}` : 'the CV-and-site bundle'
    }, and the individual-purchase range across the ${band.count} measurable templates is SAR ${num(band.min)}–${num(band.max)}.`,
    '',
    '### Measuring a cohort (the part we ask to be judged on)',
    '',
    `On ${U('/b2b')} the shipped checker runs over a whole cohort: paste up to ${COHORT_MAX} CV texts separated by a line of three hyphens and you get the average score, how many cleared ${
      ATS_TARGET.pass
    }, the total number of gaps, and a CSV of exactly those numbers. Text never leaves the browser tab — it is not stored, not uploaded, and not logged; the export carries scores, not students. Institutions are offered the same measurement twice, before and after a term, so employability is reported as a delta in a number rather than an adjective — and it is the same code path as the free tool, not a second, gentler algorithm built for marketing.`,
    '',
    '### What an institution gets on paper',
    '',
    `A printable quotation sheet: quote number (\`QALB-Q-<year>-<4>\`), date, validity ${QUOTE_VALID_DAYS} days, seats and tier, then net amount, ${vatPct}% VAT and total on separate lines, with the seller’s registration block below. The identical number goes into the lead ledger together with the organisation, contact e-mail, phone, requested seat count, meeting slots and note — one record, one figure, three places (ledger, printed sheet, e-mail). Student names and student addresses are not part of it at any point.`,
    '',
    `Buying through the Etimad (اعتماد) government procurement platform: we are not listed there${
      COMPANY.etimad !== 'none' ? ` — our registration number is published` : ' yet'
    }, and the page says so. An institution whose procurement must run through Etimad is asked to tell us first, and no “registered” badge is shown to look better.`,
    '',
    phoneEn,
    '',
    '## Services, subscriptions and seasonal offers',
    '',
    `Done-for-you services on ${U('/services')}, priced in the same table the cart prices: ${serviceUpsells()
      .map((x) => `${x.name.en} at SAR ${num(x.price)} (delivered by e-mail within ${x.sla} working hours)`)
      .join(
        ', ',
      )}. They are paid in the same cart as templates, but nothing is auto-delivered: a person reads the order and writes the reply, which is why each card prints a deadline instead of “instant”.`,
    `One subscription table, shown by the same component on the home page and on ${U('/pricing')}: ${proPlans()
      .map((x) => `SAR ${num(x.price)} ${x.period === 'month' ? 'a month' : 'a year'}`)
      .join(
        ' or ',
      )} for every template, a custom domain, the source-file export and priority support. There is no auto-renewal and no card on file: a reminder is sent before it ends, and renewing is the buyer’s own action.`,
    `Seasonal offer pages on ${U('/offers')}: ${offers
      .map((o) => `${o.title.en} (${o.months.map((m) => m).join('/')})`)
      .join('; ')} — each recommends real catalogue products and runs on the coupon FRIEND20.`,
    `Coupons the store actually honours: ${Object.entries(coupons)
      .map(([code, c]) => `${code} −${c.pct}%`)
      .join(
        ', ',
      )}. A coach code (COACH20/COACH30) is stamped on the order ledger so a coach’s referral is settled manually from the ledger — no commission moves automatically.`,
    `Order add-ons offered in the cart and checkout: ${cartUpsells()
      .map((x) => `${x.name.en} at SAR ${num(x.price)}`)
      .join(', ')}. The server re-prices every add-on from the same table and rejects unknown ones, exactly as it does for templates.`,
    '',
    '## Personal hosting',
    '',
    `A hosted page on \`<name>.qalb.store\`: ${
      free.price ? `SAR ${num(free.price)}/${free.period || 'month'}` : 'free'
    } with ${free.editQuota} edits a month and a made-with bar, or SAR ${num(pro.price)}/${pro.period} with your own domain, no branding bar${
      pro.editQuota == null ? ' and no edit ceiling' : ` and ${pro.editQuota} edits`
    }. Pages are static HTML generated from the same record as the CV, so the printed A4 sheet and the browser page are the same file.`,
    '',
    '## Graded subscription tiers and the designer market',
    '',
    `- ${tiersLine}`,
    `- The free tier is one template to try and use: a full live preview of the site and the résumé, and a résumé PDF carrying a watermark. More templates, publishing on a subdomain, the clean PDF export and the matching tool sit on Qalb Plus at SAR 19 a month; every template, a custom domain, the source-file export and priority support sit on Qalb Pro at SAR 49 a month (SAR 349 a year). This build sells no one-time pack.`,
    `- The value matrix has ${FEATURE_MATRIX.length} rows (${FEATURE_MATRIX.map((r) => r.id).join(', ')}). Each row names the module and function that enforces it, and the test suite rejects a row pointing at a function that does not exist.`,
    `- There is no one-time pack in this build: the subscription is one graded ladder (Free · Plus · Pro) that can be stopped any month, and the yearly prices are SAR ${num(TIERS.find((t) => t.id === 'plus').yearly)} and SAR ${num(TIERS.find((t) => t.id === 'pro').yearly)}. What sits above the subscription is a once-one service: ${PUBLISH_DONE.name.en} at SAR ${num(PUBLISH_DONE.price)}, delivered within ${num(PUBLISH_DONE.hours)} hours.`,
    `- Designer market: a platform commission of ${Math.round(COMMISSION * 100)}% per sale (published range 20–30%). Example at SAR 199: commission SAR ${num(sampleSplit.commission)}, seller net SAR ${num(sampleSplit.sellerNet)}, shown before the sale completes. Processing fees are deducted by the payment provider (Stripe · Tap · Moyasar), not by us; the displayed figure is a labelled estimate.`,
    `- Payouts: a minimum of SAR ${num(MIN_PAYOUT)}, and a seller's amount is held ${ESCROW_DAYS} days after a sale to reduce refunds. Licence ${LICENCE.id}: no resale, no sharing, no use across multiple projects without an extra licence; delivered files carry a tracking line with the buyer's name and key.`,
    `- Every submitted template runs a ${LAYERS.length}-layer automated inspection pipeline: file and code linting (banned extensions, eval/new Function/javascript: URIs, external scripts, path traversal, size ceilings), perceptual-hash image fingerprints, a deterministic policy guard (no LLM call — no model key is wired here), and a verdict from the risk score: ${bandsLine}. A listing freezes at ${REPORT_FREEZE} ownership reports, and appeals are opened but never closed automatically.`,
    '- Sign-up is one e-mail and a consent line acknowledging automated licence and originality inspection. There is no password and no confirmation e-mail, because no mailer is connected in this build.',
    '',
    '## Payment, invoicing, and what we do not claim',
    '',
    '- There is no card gateway and no card data is stored; an institutional purchase is settled as a signed contract and a bank transfer. The storefront’s checkout is a demo: order records are written for real, money does not move.',
    `- Refunds follow ${U('/legal')}: full refund within 14 days provided the files were not redistributed; a seat already redeemed is a licence already issued, so it is not refundable after redemption.`,
    '- We do not issue ZATCA e-invoices and do not claim to. The VAT invoice is produced by the owner from the printed quotation once their fiscal details are registered on the site.',
    '- A template licence is perpetual for the person and domain it was issued to; seats and hosting are annual because the institution’s contract is annual.',
    '',
    '## Legal identity of the seller',
    '',
    legalEn,
    '',
    '## Index',
    '',
    `- E-mail: ${SUPPORT_MAIL}\n- Legal, licence and refund terms: ${U('/legal')}\n- Catalogue: ${U('/templates')}\n- ATS checker: ${U('/ats')}\n- Done-for-you services: ${U('/services')}\n- Seasonal offers: ${U('/offers')}\n- Institutional seats and cohort measurement: ${U('/b2b')}\n- Hosting: ${U('/host')}\n- Plans and the value matrix: ${U('/pricing')}\n- Pick a template and build your page free: ${U('/templates')}\n- Designer market: ${U('/creators')}\n- Journal (CV and portfolio guides): ${U('/blog')}\n- Track an order: ${U(
      '/track',
    )}\n- Verify a licence key: ${U('/licence')}\n- Sitemap: ${U('/sitemap.xml')}\n- Crawling rules: ${U('/robots.txt')}`,
    '',
    '---',
    '',
    '# قالب — بالعربية',
    '',
    `> قالبُ واحدٌ وسيرةٌ ذاتيةٌ واحدة: موقعٌ وسيرةٌ يقرؤهما فرزُ الشركات الآلي فعلًا، وأداةُ قياسٍ مجانيةٌ تُثبت ذلك، وعقودُ مقاعد سنوية للجامعات والمعاهد ومكاتب التوظيف تقيس بها جاهزيةَ دفعةٍ كاملة. الواجهةُ عربيةٌ من اليمين إلى اليسار بنسخةٍ إنجليزيةٍ كاملة، والأسعارُ بالريال السعودي مشتملةً على ضريبة القيمة المضافة ${vatPct}٪. كلُّ صفحةٍ هنا تطبيقُ React يُبنى في المتصفح، فهذا الملفُّ هو المرجعُ المسطّحُ لما لا يستطيع الفاحصُ تنفيذَه.`,
    '',
    `كلُّ رابطٍ في هذا الملف مكتوبٌ خامًا (\`${U('/template/nova-cv')}\`) لا بصيغة رابط Markdown، فمَن يقرؤه بلا مُحوِّل Markdown يرى العنوانَ نفسَه.`,
    '',
    '## ما يُباع',
    '',
    `${templates.length} قالبًا منشورًا من ${arNum(Math.min(...prices))} إلى ${arNum(Math.max(...prices))} ريالًا؛ ${
      SEAT_TEMPLATES.length
    } منها يُخرِج مع الموقع سيرةً ذاتيةً بمعايير الفرز الآلي، وهذا الجزءُ وحدَه هو ما تفتحه المقاعدُ المؤسسية: المقعدُ يشتري وثيقةً تقرؤها الآلة، لا زينةً.`,
    '',
    '### القوالب',
    tplAr,
    '',
    '## الأداةُ المجانية: فاحصُ جاهزية الفرز الآلي',
    '',
    `${U('/ats')} — بلا حسابٍ ولا رفعِ ملفٍ ولا تخزين: ${ATS_RULES.length} قواعدَ تُحسب من مئةٍ على النصِّ الملصوق في متصفحك أنت، بالعربية أو الإنجليزية، وكلُّ فجوةٍ معها علاجُها. حدُّ العبور ${ATS_TARGET.pass}، والمدى المطلوب ${arNum(
      ATS_TARGET.minWords,
    )}–${arNum(ATS_TARGET.maxWords)} كلمةً و${arNum(ATS_TARGET.minBullets)} نقطةً على الأقل، والمستندُ الفارغُ يأخذ صفرًا فلا مجاملةَ في المقياس. ونموذجُ السيرة المرفق مع المشروع يأخذ ${arNum(
      demoScore,
    )}. القالبُ المدفوع يُخرِج البنيةَ نفسَها التي يقرأها هذا الفاحص.`,
    '',
    '## منظومةُ التوظيف (ستُّ أدواتٍ حول تقديمٍ واحد)',
    '',
    `الفاحصُ يجيب: هل يقرأ الآليّ سيرتي؟ وهذه تجيب السؤالَ الذي بعده: هل سيرتي مكتوبةٌ بلغةِ هذا الإعلان؟ وسُعِّرت بالتقديم لا بالشهر، لأن الباحثَ عن عمل يقدّم عشرين مرة ثم يتوقف.`,
    '',
    `${U('/match')} — الصق سيرةً وإعلانًا: نسبةُ المطابقة العامة مجانية، والتقريرُ المفصّل (الكلماتُ الناقصة مرتّبةً بوزنها، وسطرٌ مقترحٌ لكلٍّ منها مع قسمه، وثلاثةُ قوالبَ تليق بالمجال) بـ٢٩ ريالًا، أو خمسةُ تقاريرَ بـ٧٩. النسبةُ هي وزنُ الحاضر من وزنِ المطلوب، وكلمةُ العنوان أثقلُ من كلمةِ المتن، واسمُ الشركة والمدينة لا يُحسبان مطلبًا.`,
    `${U('/kit')} — ٤٩ ريالًا لعشرِ توليدات. كلُّ توليدٍ يُخرج من إعلانٍ واحد أربعةَ أشياء: نقاطُ السيرة مرتّبةً على مفردات الإعلان، خطابُ تقديم، رسالةُ LinkedIn، وإيميلٌ بموضوعه جاهز. لا يخترعُ شيئًا: ما لا يجده في سيرتك يتركه بين قوسين لتكتبه أنت.`,
    `${U('/u/<name>')} — رابطٌ مهني فيه سيرةٌ وأعمالٌ وزرُّ تواصل وتحميل سيرة، وتحليلاتٌ يراها صاحبُه: الفتحات وتنزيلات السيرة وطلبات التواصل، ومعها البلدان في خطة الـ٢٩ ريالًا شهريًا. البلدُ مستنتجٌ من المنطقة الزمنية لجهاز الزائر لا من عنوانه، ولا زيارةٌ منسوبةٌ إلى شخص.`,
    `${U('/talent')} — دليلُ ملفاتٍ فعّلها أصحابها، يُبحث بالتخصص والمدينة ودرجةِ الجاهزية؛ الإدراجُ مجاني والإخراجُ بضغطة، والبريدُ لا يظهر إلا باختيار صاحبه. الشركات تصل إليه باشتراك، والإبرازُ ٢٩ ريالًا في الشهر.`,
    `${U('/market')} — أربعةُ أسئلةٍ اختياريةٍ مجهولة بعد كلِّ فحص (التخصص، المدينة، هل حصلت على مقابلة، أيُّ قالبٍ استعملت) تُجمَع في تقريرٍ منشور: المقابلاتُ لكلِّ تخصص، ووسيطُ الأشهر قبل أول مقابلة، والقوالبُ التي استعملها من حصلوا عليها. لا تُنشر نسبةٌ قبل ${MARKET_MIN} إجابات، وكلُّ نسبةٍ معها عددُ مَن خرجت منهم.`,
    `${U('/embed')} — الفاحصُ نفسُه إطارًا واحدًا في موقعِ جامعةٍ أو معهدٍ أو مكتبِ توظيف: ١٩٩ ريالًا في الشهر لـ٥٠٠ تحميل، و٤٩٩ لـ٢٠٠٠، وما فوقها للجامعات بالاتفاق. الفحصُ يعمل في متصفح الزائر، فالجهةُ تشتري الموضعَ وحصةً شهرية — لا بياناتِ الطلاب التي لا نملكها.`,
    '',
    '## للجامعات والمعاهد ومكاتب التوظيف',
    '',
    `عقودُ مقاعد بمدّة ${arNum(B2B_TERM_MONTHS)} شهرًا وبلا تجديدٍ تلقائي. المقعدُ يُستبدل مرةً واحدةً لبريدِ طالبٍ واحد على قالبٍ واحد برمزٍ مؤسسيّ (\`QALB-XXXX-XXXX\`، بلا حروفٍ تُقرأ أرقامًا)، ويصدر معه مفتاحُ ترخيصٍ لصاحبِه. الأسعارُ أرقامُ عقدٍ لا عروضُ ترويجية:`,
    '',
    tiersAr,
    '',
    `سلّمُ الجامعات ثلاثُ باقات: فوجٌ بخمسين مقعدًا، وكليةٌ بمئة مقعد مع لوحةِ المدرّب — صفحةُ رمز الفوج تُظهر للمدرّب ما استُهلك وما بقي بلا أسماء طلاب — وجامعةٌ بثلاثِمئة مقعد تضيف ورشةَ عملٍ يقدمها فريقنا تُنسَّق مواعيدها بعد التوقيع. وما زاد على الثلاثِمئة بعقدٍ ثانٍ؛ الصفحةُ تقول ذلك بدل أن تختلق باقةً أكبر.`,
    `المقعدُ يُقارَن بما يفتحه هو، لا بأرخص شيءٍ على الرف: المرجعُ ${
      bundle ? `«${bundle.name.ar}» بـ${arNum(bundle.price)} ريالًا` : 'حزمةُ القالب والسيرة'
    }، ونطاقُ الشراء الفردي للّ${arNum(band.count)} القابلة للقياس ${arNum(band.min)}–${arNum(band.max)} ريالًا.`,
    '',
    '### قياسُ جاهزية الدفعة',
    '',
    `في ${U('/b2b')} يعمل الفاحصُ المشحون نفسه على الدفعة كلِّها: تُلصق حتى ${arNum(COHORT_MAX)} سيرةٍ مفصولةً بسطرٍ من ثلاثِ شرطات فتحصل متوسطَ الدرجات، وعددَ مَن جاوز حدَّ ${
      ATS_TARGET.pass
    }، ومجموعَ الفجوات، وملفَّ CSV بتلك الأرقام وحدَها. نصُّ السيرة لا يُخزَّن ولا يُرفَع ولا يغادر الصفحة، والتصديرُ نتائجُ لا أسماءَ ولا عناوينَ طلاب. يُعرض على الجهة قياسُ الدفعة مرّتَين — قبل الفصل وبعده — ليكونُ أثرُ التوظيف فرقًا في رقمٍ لا صفةً إنشائية، ومن نفس مسارِ الكود لا من نسخةٍ ألينَ أُعدّت للتسويق.`,
    '',
    '## ما تحصل عليه الجهةُ ورقًا',
    '',
    `ورقةُ عرضِ سعرٍ تُطبع PDF: رقمُ العرض (\`QALB-Q-<سنة>-<٤>\`)، التاريخ، الصلاحية ${arNum(
      QUOTE_VALID_DAYS,
    )} يومًا، عددُ المقاعد والباقة، ثم الأساسُ والضريبةُ (${vatPct}٪) والإجمالي في أسطرٍ منفصلة، وتحتها كتلةُ بيانات البائع التجارية. الرقمُ نفسه يذهب إلى دفتر الطلبات مع الجهة وبريدِها وهاتفها والمقاعد المطلوبة ومواعيدُ العرض والملاحظة — سجلٌّ واحدٌ ورقمٌ واحد في ثلاثة مواضع (الدفتر، الورقة، البريد)، ولا اسمَ طالبٍ ولا بريدَ طالبٍ في أيِّها.`,
    '',
    `الشراءُ عبر منصة اعتماد: لسنا مُدرَجين هناك${
      COMPANY.etimad !== 'none' ? ' وقد نُشر رقمُ تسجيلنا' : ' بعد'
    }، والصفحةُ تقول ذلك ولا تُظهر شارةَ «مسجَّل» لتبدو أفضل؛ ومَن تشترطُ الشراءَ من اعتماد تُخبرنا أولًا لِنُكمل المسارَ معها.`,
    '',
    phoneAr,
    '',
    '## الخدماتُ والاشتراكُ والعروضُ الموسمية',
    '',
    `خدماتٌ نؤديها نحن في ${U('/services')}، مُسعَّرةٌ من الجدول نفسه الذي تُحسب به السلة: ${serviceUpsells()
      .map((x) => `${x.name.ar} بـ${arNum(x.price)} ريالًا (تُسلَّم بالبريد خلال ${arNum(x.sla)} ساعة عمل)`)
      .join(
        '، ',
      )}. تُدفع في السلة نفسها مع القوالب، لكن لا شيء يُسلَّم آليًا: إنسانٌ يقرأ الطلب ويكتب الرد — ولهذا تطبع كلُّ بطاقةٍ مهلةً لا «فورًا».`,
    `اشتراك Qalb Pro في الرئيسية، موازيًا للشراء لمرة واحدة: ${proPlans()
      .map((x) => `${arNum(x.price)} ريالًا ${x.period === 'month' ? 'شهريًا' : 'سنويًا'}`)
      .join(
        ' أو ',
      )} لكل قوالب المتجر وكل إصدارٍ في أشهر الاشتراك. لا تجديدَ تلقائي ولا بطاقة محفوظة: يصلك تذكيرٌ قبل النهاية والتجديدُ فعلُ المشتري.`,
    `صفحاتُ العروض الموسمية في ${U('/offers')}: ${offers
      .map((o) => `${o.title.ar}`)
      .join('، ')} — كلٌّ منها يوصي بمنتجاتٍ حقيقية من الكتالوج ويعمل بكوبون FRIEND20.`,
    `الكوبونات التي يعرفها المتجر فعلًا: ${Object.entries(coupons)
      .map(([code, c]) => `${code} بخصم ${arNum(c.pct)}٪`)
      .join('، ')}. ورمزُ المدرّب (COACH20/COACH30) يُختم على سجلِّ الطلب فتُسوّى عمولتُه من الدفتر يدويًا — لا عمولة تُحوَّل آليًا.`,
    `إضافاتُ الطلب في السلة والدفع: ${cartUpsells()
      .map((x) => `${x.name.ar} بـ${arNum(x.price)} ريالًا`)
      .join('، ')}. الخادم يُعيد تسعيرَ كل إضافةٍ من الجدول نفسه ويرفض المجهول منها، كما يفعل مع القوالب تمامًا.`,
    '',
    '## الاستضافة الشخصية',
    '',
    `صفحةٌ مستضافةٌ على \`<الاسم>.qalb.store\`: ${
      free.price ? `بـ${arNum(free.price)} ريالًا` : 'بالمجان'
    } مع ${arNum(free.editQuota)} تعديلاتٍ في الشهر وشريطِ العلامة، أو بـ${arNum(pro.price)} ريالًا في الشهر لنطاقِكَ الخاصّ بلا شريطِ علامة${
      pro.editQuota == null ? ' وبلا سقفِ تعديل' : ` و${arNum(pro.editQuota)} تعديلًا`
    }. الصفحاتُ HTML ثابتةٌ تُولَّد من سجلِّ بيانات الطالب نفسِه، فورقةُ A4 المطبوعة والصفحةُ في المتصفح ملفٌّ واحد.`,
    '',
    '## الخططُ المتدرّجة وسوقُ المصممين',
    '',
    `- ${tiersLineAr}`,
    `- الدرجةُ المجانية قالبٌ واحدٌ تُجرّبه وتستخدمه: معاينةٌ حيّةٌ متكاملةٌ للموقع والسيرة، وسيرةُ PDF بعلامةٍ مائية. والقوالبُ الإضافية والنشرُ على رابطٍ فرعي وتصديرُ PDF نظيفٌ وأداةُ المطابقة في Qalb Plus بـ١٩ ريالًا شهريًا؛ وكلُّ القوالب والنطاقُ الخاص وتصديرُ ملفات المصدر وأولويةُ الدعم في Qalb Pro بـ٤٩ ريالًا شهريًا (٣٤٩ سنويًا). ولا باقةَ تُشترى مرة واحدة في هذه النسخة.`,
    `- مصفوفةُ القيمة ${arNum(FEATURE_MATRIX.length)} صفوفٍ (${FEATURE_MATRIX.map((r) => r.id).join('، ')}). كلُّ صفٍّ يحمل اسمَ الوحدة والدالة التي تُنفّذه، والفحصُ يرفض صفًّا يشير إلى دالةٍ غير موجودة.`,
    `- لا باقةً تُشترى مرة واحدة في هذه النسخة: الاشتراكُ درجةٌ واحدة متدرّجة (مجاني · Plus · Pro) تُوقَف في أي شهر، وسنتاها ${arNum(TIERS.find((t) => t.id === 'plus').yearly)} و${arNum(TIERS.find((t) => t.id === 'pro').yearly)} ريالًا. وما فوق الاشتراك خدمةٌ Once-One: ${PUBLISH_DONE.name.ar} بـ${arNum(PUBLISH_DONE.price)} ريالًا خلال ${arNum(PUBLISH_DONE.hours)} ساعة.`,
    `- سوقُ المصممين: عمولةُ المنصة ${arNum(Math.round(COMMISSION * 100))}٪ من كلِّ بيع (المدى المعلَن ٢٠–٣٠٪). مثالٌ على ١٩٩ ريالًا: العمولةُ ${arNum(sampleSplit.commission)} ريالًا، وصافي البائع ${arNum(sampleSplit.sellerNet)} ريالًا، ويُعرضان قبل إتمام البيع. رسومُ المعالجة يخصمها مزوّدُ الدفع (Stripe · Tap · Moyasar) لا نحن، والمعروضُ تقديرٌ موسوم.`,
    `- السحب: حدٌّ أدنى ${arNum(MIN_PAYOUT)} ريالًا، ومبلغُ البائع مؤمَّنٌ ${arNum(ESCROW_DAYS)} يومًا بعد البيع لتقليل الاسترجاع. الترخيص ${LICENCE.id}: لا إعادةَ بيع، ولا مشاركة، ولا مشاريعَ متعددةً بلا ترخيصٍ إضافي، والملفاتُ المُسلَّمة تحمل سطرَ تتبّعٍ باسم المشتري ومفتاحه.`,
    `- كلُّ قالبٍ مرفوع يمرُّ بخطِّ فحصٍ آليٍّ من ${arNum(LAYERS)} طبقات: فحصُ الملفات والكود (الامتداداتُ المحظورة، وeval وnew Function وروابط javascript:، والسكربتاتُ الخارجية، ومسارات ../، وسقوفُ الحجم)، وبصمةُ الصور الإدراكية، وحارسُ سياسةٍ حتميُّ القواعد (بلا نداءٍ لنموذجِ لغة — لا مفتاحَ موصول هنا)، وقرارٌ من درجةِ الخطر: ${bandsLine}. ويتجمّد الإدراجُ عند ${arNum(REPORT_FREEZE)} بلاغاتِ ملكية، والتظلّمُ يُفتح ولا يُغلق آليًا.`,
    '- التسجيلُ بريدٌ واحدٌ وسطرُ إقرارٍ بالفحص الآلي للترخيص والأصالة. لا كلمةَ سرٍّ ولا رسالةَ تأكيد، لأنه لا مُرسِلَ بريد موصولٌ في هذه النسخة.',
    '',
    '## الدفعُ والفواتيرُ وما لا ندّعيه',
    '',
    '- لا بوابةَ دفعٍ بالبطاقة ولا بياناتِ بطاقةٍ محفوظة؛ شراءُ الجهة عقدٌ موقَّعٌ وتحويلٌ بنكيّ، ومسارُ الدفعِ في المتجر تجريبيّ: سجلُّ الطلب يُكتب فعلًا وحركةُ المال لا تقع.',
    `- الاسترجاعُ كما في ${U('/legal')}: كاملٌ خلال ١٤ يومًا ما لم تُعَد توزيعُ الملفات، والمقعدُ المستبدَل رخصةٌ صُدِرت فلا يُسترجَع بعد الاستبدال.`,
    '- لا نُصدر فاتورةً إلكترونية مطابقةً لـZATCA ولا ندّعي ذلك؛ الفاتورةُ الضريبية يُصدرها المالك من ورقةِ العرض بعد ضبطِ بياناته التجارية.',
    '- رخصةُ القالب دائمةٌ لصاحبها ونطاقها، والمقاعدُ والاستضافةُ سنويةٌ لأن عقدَ الجهة سنويّ.',
    '',
    '## هويةُ البائع القانونية',
    '',
    legalAr,
    '',
    '## الفهرس',
    '',
    `- البريد: ${SUPPORT_MAIL}\n- العقودُ والترخيصُ والاسترجاع: ${U('/legal')}\n- الكتالوج: ${U('/templates')}\n- فاحصُ الجاهزية: ${U('/ats')}\n- الخدمات: ${U('/services')}\n- العروضُ الموسمية: ${U('/offers')}\n- مقاعدُ المؤسسات وقياسُ الدفعة: ${U('/b2b')}\n- الاستضافة: ${U('/host')}\n- الخططُ ومصفوفةُ القيمة: ${U('/pricing')}\n- اختر قالبًا وابنِ صفحتك مجانًا: ${U('/templates')}\n- سوقُ المصممين: ${U('/creators')}\n- المدوّنة (أدلة السيرة والمعرض): ${U('/blog')}\n- تتبّعُ طلب: ${U(
      '/track',
    )}\n- التحققُ من مفتاح: ${U('/licence')}\n- خريطةُ المسارات: ${U('/sitemap.xml')}\n- قواعدُ الزحف: ${U('/robots.txt')}`,
    '',
  ]

  return (
    parts
      .filter((x) => x !== null)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

export default { buildRobots, buildLlms, PRIVATE_PATHS, AI_AGENTS }
