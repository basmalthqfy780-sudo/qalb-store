import { useEffect } from 'react'
import { SOCIAL, SUPPORT_MAIL } from '../data/contact'
import { SITE_URL } from '../data/site'
import { rawText, rawUrl } from '../data/links'

/**
 * كلُّ رابطٍ يخرج من هذه الوحدة يمرّ ببناءٍ واحد: `rawUrl` من `data/links.js`.
 * لا مُحوِّل Markdown هنا ولا في أي مكان، والناتجُ سلسلةٌ خامٌ كما تُكتب في
 * الوسم حرفًا بحرف: `https://qalb-store.vercel.app/templates` — لا
 * `[https://…](https://…)`. والفحص في `tests/smoke.mjs` يقرأ الـhead بعد الرسم
 * ويرفض أيّ قوسٍ أو نجمةٍ في canonical وog:image وhreflang.
 */
const abs = (path) => rawUrl(path, SITE_URL)

/** الصفحاتُ العامة تُفهرَس صراحةً: غيابُ الوسم كان يُترك للظنّ، فنكتبه فعلًا. */
export const DEFAULT_ROBOTS = 'index, follow'

const setMeta = (attr, key, value) => {
  if (value == null) return
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', value)
}

/** Structured data — one node so repeated navigations just swap the payload. */
function setJsonLd(data) {
  const id = 'qalb-jsonld'
  let el = document.getElementById(id)
  if (!data) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/** رابط hreflang يُحدَّث لا يُنسَخ — تبديل اللغة في الجلسة يبقي الطاقم مكتملًا */
function setHreflang(hreflang, href) {
  let tag = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
  if (!tag) {
    tag = document.createElement('link')
    tag.rel = 'alternate'
    tag.setAttribute('hreflang', hreflang)
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

function apply({ title, desc, jsonLd, type = 'website', robots, image }) {
  if (title) document.title = rawText(title)
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar'
  // canonical وog:url من SITE_URL لا من أصل التصفّح: هكذا يتحد canonical مع
  // sitemap.xml مهما فُتحت الصفحة من نطاق معاينة أو من نطاق ثانٍ.
  const path = window.location.pathname
  const url = abs(path || '/')
  const plain = desc == null ? desc : rawText(desc)
  setMeta('name', 'description', plain)
  // الوسم موجودٌ في كل صفحة: عامّةً index, follow، وإلا فما تطلبه الصفحة صراحةً
  // (سلّة/دفع/إدارة) — فلا تبقى قيمةُ الصفحة السابقة معلّقةً بعد تنقّلٍ داخلي.
  setMeta('name', 'robots', robots || DEFAULT_ROBOTS)
  setMeta('property', 'og:title', rawText(title) || document.title)
  setMeta('property', 'og:description', plain)
  setMeta('property', 'og:type', type)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:locale', lang === 'ar' ? 'ar_SA' : 'en_US')
  setMeta('property', 'og:locale:alternate', lang === 'ar' ? 'en_US' : 'ar_SA')
  // per-page social card; index.html keeps the site cover as the no-JS default
  if (image) {
    const href = abs(image)
    setMeta('property', 'og:image', href)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')
    setMeta('name', 'twitter:image', href)
    setMeta('name', 'twitter:card', 'summary_large_image')
  }
  setMeta('name', 'twitter:title', rawText(title) || document.title)
  setMeta('name', 'twitter:description', plain)

  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', url)

  // hreflang للنسختين: ar على المسار نفسه (وهي x-default)، وen على ?lang=en —
  // وQueryParam نفسه تقرأه الواجهة عند الفتح فتُظهر الإنجليزية فعلًا.
  setHreflang('ar', url)
  setHreflang('en', `${url}?lang=en`)
  setHreflang('x-default', url)

  setJsonLd(jsonLd)
}

/**
 * Per-route title/description/social/structured data.
 * (No SSR here, so a tiny effect does the job — and unlike the static
 * index.html tags it survives client-side navigation.)
 */
export function useSeo(title, desc, extra = {}) {
  const key = JSON.stringify(extra)
  useEffect(() => {
    apply({ title, desc, ...extra })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, desc, key])
}

export default function Seo({ title, desc, ...extra }) {
  useSeo(title, desc, extra)
  return null
}

/* ---------- builders shared by the routes ---------- */
/** طقم JSON-LD واحد: العُقد هنا أفراد، و`graph` تجمعهم في مستند @graph واحد */
export const graph = (...items) => ({
  '@context': 'https://schema.org',
  '@graph': items
    .flat()
    .filter(Boolean)
    .flatMap((x) => x['@graph'] || [x]),
})

/**
 * مسار التنقّل — البيع بالتجزئة يقرأه بحث Google لعرض «المسار» في النتيجة،
 * وهو هنا مطابق لحقيقته: لا خبز مُخترَع فوق صفحة المنتج.
 */
export const breadcrumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    url: abs(it.path),
  })),
})

/**
 * أسئلة الصفحة نفسها حرفيًا — لا نصّ ثانٍ يخالف ما يقرؤه الزائر.
 * `faqLd` عقدٌ صافٍ يُدمج في أي @graph (الرئيسية مثلًا بجانب Organization).
 */
export const faqLd = (pairs) => ({
  '@type': 'FAQPage',
  mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

export const siteGraph = (t, extraNodes = []) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: t('brand.name'),
      alternateName: 'Qalb',
      url: abs('/'),
      foundingLocation: { '@type': 'Place', name: 'Jeddah, Saudi Arabia' },
      sameAs: SOCIAL.map((s) => s.href),
      contactPoint: {
        '@type': 'ContactPoint',
        email: SUPPORT_MAIL,
        contactType: 'customer support',
        availableLanguage: ['ar', 'en'],
      },
    },
    {
      '@type': 'WebSite',
      name: t('brand.name'),
      url: abs('/'),
      inLanguage: ['ar', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${abs('/templates')}?q={query}`,
        'query-input': 'required name=query',
      },
    },
    ...extraNodes.flat(),
  ],
})

export const itemList = (list) => ({
  '@type': 'ItemList',
  numberOfItems: list.length,
  itemListElement: list.slice(0, 12).map((x, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: x.name?.[document.documentElement.lang === 'en' ? 'en' : 'ar'] || x.name?.ar,
    url: abs(`/template/${x.slug}`),
  })),
})

/**
 * قائمةُ الكتالوج `/templates`: عناصرُها عُقَد Product كاملة (اسمٌ وصورةٌ ووصفٌ
 * وعرضٌ بسعرٍ بالريال وحالةِ توفّر InStock) لا أسماءً وروابطَ فقط — فالعنصرُ
 * الناقصُ عرضًا لا يُنتج نتيجةً غنيّة، والقائمةُ هنا تُغني صفحةَ القوالب كما
 * تُغنيها صفحةُ المنتج. السعرُ من بيانات الرّفّ نفسها، فلا يُعلن البحث رقمًا
 * لا تراه الصفحة.
 */
export const productItemList = (list, lang, t) => ({
  '@type': 'ItemList',
  name: t('catalog.title'),
  numberOfItems: list.length,
  itemListElement: list.slice(0, 24).map((x, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: productLd(x, lang, t),
  })),
})

/**
 * أداة مجانية في البحث: صفرُ سعرٍ معلن، وأسئلتها هي أسئلة الصفحة نفسها —
 * لا نصّ ثانٍ يخالف ما يقرؤه الزائر.
 */
export const toolLd = ({ name, desc, path = '/ats', faq = [] }) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name,
      url: abs(path),
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any — runs in the browser',
      inLanguage: ['ar', 'en'],
      isAccessibleForFree: true,
      description: desc,
      offers: { '@type': 'Offer', price: '0.00', priceCurrency: 'SAR' },
    },
    ...(faq.length ? [faqLd(faq)] : []),
  ],
})

/**
 * باقات المؤسسات: كتالوج عروضٍ بأسعار العقد السنوي نفسها — الأرقام من B2B_TIERS،
 * فلا يُعلن البحث سعرًا غير الذي تراه الصفحة، والأسئلة هي أسئلتها حرفيًا.
 */
export const orgLd = ({ tiers, faq = [], lang = 'ar', t }) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'OfferCatalog',
      name: t('b2b.title'),
      url: abs('/b2b'),
      inLanguage: ['ar', 'en'],
      applicationCategory: 'BusinessApplication',
      offers: tiers.map((tier) => ({
        '@type': 'Offer',
        name: `${tier.name[lang] || tier.name.ar} · ${tier.seats}`,
        price: Number(tier.price).toFixed(2),
        priceCurrency: 'SAR',
        category: 'Annual',
        eligibleQuantity: tier.seats,
        description: tier.for[lang] || tier.for.ar,
      })),
    },
    ...(faq.length ? [faqLd(faq)] : []),
  ],
})

/**
 * عقد Product كامل — يُدمج مع BreadcrumbList عبر `graph` في صفحة المنتج،
 * وتُستدعى نفسُه من كل عنصرٍ في قائمة `/templates`:
 *
 *   name · image · description        الحقولُ الثلاثة المطلوبة، ولا واحدَ منها فارغ
 *   offers.price / priceCurrency      السعرُ والريال، من بيانات الرّفّ نفسها
 *   offers.availability               InStock — لا رقمٌ يُعلَن عن منتجٍ لا يُباع
 *
 * والوصفُ والصورةُ يمرّان بـ`rawText`/`rawUrl` كسائر ما يُكتب في الرأس.
 */
export const productLd = (tpl, lang, t) => {
  const url = abs(`/template/${tpl.slug}`)
  // بطاقةُ og الخاصة بالمنتج تُرسم في كل بناء (public/og/<slug>.png)، فلا
  // يُعلن البحث صورةً لا ملفَّ لها.
  const image = abs(`/og/${tpl.slug}.png`)
  const description = tpl.tagline?.[lang] || tpl.desc?.[lang] || tpl.tagline?.ar || tpl.desc?.ar || tpl.name?.[lang] || tpl.name?.ar || ''
  const available = tpl.price != null && Number(tpl.price) >= 0
  return {
    '@type': 'Product',
    name: rawText(tpl.name?.[lang] || tpl.name?.ar),
    image,
    description: rawText(description),
    sku: tpl.id,
    category: t(`types.${tpl.type}`),
    brand: { '@type': 'Brand', name: t('brand.name') },
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: Number(tpl.price).toFixed(2),
      priceCurrency: 'SAR',
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      seller: { '@type': 'Organization', name: t('brand.name') },
    },
    ...(tpl.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: tpl.rating,
            reviewCount: tpl.reviews,
            bestRating: 5,
          },
        }
      : {}),
  }
}

/** المدوّنة: فهرس المقالات ومقال واحد — بنفس قاعدة «أرقامٌ من بيانات الرّفّ» */
export const blogLd = (t) => ({
  '@type': 'Blog',
  name: `${t('blog.title')} · ${t('brand.name')}`,
  url: abs('/blog'),
  inLanguage: ['ar', 'en'],
  description: t('meta.blogDesc'),
})

export const blogPostingLd = (post, lang, t) => ({
  '@type': 'BlogPosting',
  headline: post.title?.[lang] || post.title?.ar,
  description: post.excerpt?.[lang] || post.excerpt?.ar,
  datePublished: post.date,
  dateModified: post.date,
  inLanguage: lang,
  mainEntityOfPage: abs(`/blog/${post.slug}`),
  articleSection: (post.tags?.[lang] || post.tags?.ar || []).join(', '),
  author: { '@type': 'Organization', name: t('brand.name') },
  publisher: { '@type': 'Organization', name: t('brand.name') },
})
