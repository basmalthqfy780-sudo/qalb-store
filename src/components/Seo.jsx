import { useEffect } from 'react'
import { SOCIAL, SUPPORT_MAIL } from '../data/contact'
import { SITE_URL } from '../data/site'

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
  if (title) document.title = title
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar'
  // canonical وog:url من SITE_URL لا من أصل التصفّح: هكذا يتحد canonical مع
  // sitemap.xml مهما فُتحت الصفحة من نطاق معاينة أو من نطاق ثانٍ.
  const path = window.location.pathname
  const url = `${SITE_URL}${path}`
  setMeta('name', 'description', desc)
  if (robots) setMeta('name', 'robots', robots)
  setMeta('property', 'og:title', title || document.title)
  setMeta('property', 'og:description', desc)
  setMeta('property', 'og:type', type)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:locale', lang === 'ar' ? 'ar_SA' : 'en_US')
  setMeta('property', 'og:locale:alternate', lang === 'ar' ? 'en_US' : 'ar_SA')
  // per-page social card; index.html keeps the site cover as the no-JS default
  if (image) {
    const abs = new URL(image, `${SITE_URL}/`).href
    setMeta('property', 'og:image', abs)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')
    setMeta('name', 'twitter:image', abs)
    setMeta('name', 'twitter:card', 'summary_large_image')
  }
  setMeta('name', 'twitter:title', title || document.title)
  setMeta('name', 'twitter:description', desc)

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
    url: `${SITE_URL}${it.path}`,
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
      url: `${SITE_URL}/`,
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
      url: `${SITE_URL}/`,
      inLanguage: ['ar', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/templates?q={query}`,
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
    url: `${SITE_URL}/template/${x.slug}`,
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
      url: `${SITE_URL}${path}`,
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
      url: `${SITE_URL}/b2b`,
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
 * عقد Product صافٍ — يُدمج مع BreadcrumbList عبر `graph` في صفحة المنتج،
 * والسعر والأرقام من بيانات الرّفّ نفسها فلا يُعلن البحث عن رقمٍ لا تراه الصفحة.
 */
export const productLd = (tpl, lang, t) => ({
  '@type': 'Product',
  name: tpl.name?.[lang] || tpl.name?.ar,
  description: tpl.tagline?.[lang] || tpl.desc?.[lang] || tpl.tagline?.ar,
  sku: tpl.id,
  category: t(`types.${tpl.type}`),
  brand: { '@type': 'Brand', name: t('brand.name') },
  url: `${SITE_URL}/template/${tpl.slug}`,
  image: `${SITE_URL}/og/${tpl.slug}.png`,
  offers: {
    '@type': 'Offer',
    price: Number(tpl.price).toFixed(2),
    priceCurrency: 'SAR',
    availability: 'https://schema.org/InStock',
    priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
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
})

/** المدوّنة: فهرس المقالات ومقال واحد — بنفس قاعدة «أرقامٌ من بيانات الرّفّ» */
export const blogLd = (t) => ({
  '@type': 'Blog',
  name: `${t('blog.title')} · ${t('brand.name')}`,
  url: `${SITE_URL}/blog`,
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
  mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  articleSection: (post.tags?.[lang] || post.tags?.ar || []).join(', '),
  author: { '@type': 'Organization', name: t('brand.name') },
  publisher: { '@type': 'Organization', name: t('brand.name') },
})
