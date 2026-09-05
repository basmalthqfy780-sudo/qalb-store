import { useEffect } from 'react'
import { SUPPORT_MAIL } from '../data/contact'

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

function apply({ title, desc, jsonLd, type = 'website', robots, image }) {
  if (title) document.title = title
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar'
  const url = `${window.location.origin}${window.location.pathname}`
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
    const abs = new URL(image, window.location.origin).href
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
export const siteGraph = (t) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: t('brand.name'),
      alternateName: 'Qalb',
      url: `${window.location.origin}/`,
      foundingLocation: { '@type': 'Place', name: 'Jeddah, Saudi Arabia' },
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
      url: `${window.location.origin}/`,
      inLanguage: ['ar', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${window.location.origin}/templates?q={query}`,
        'query-input': 'required name=query',
      },
    },
  ],
})

export const itemList = (list) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  numberOfItems: list.length,
  itemListElement: list.slice(0, 12).map((x, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: x.name?.[document.documentElement.lang === 'en' ? 'en' : 'ar'] || x.name?.ar,
    url: `${window.location.origin}/template/${x.slug}`,
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
      url: `${window.location.origin}${path}`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any — runs in the browser',
      inLanguage: ['ar', 'en'],
      isAccessibleForFree: true,
      description: desc,
      offers: { '@type': 'Offer', price: '0.00', priceCurrency: 'SAR' },
    },
    ...(faq.length
      ? [
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
          },
        ]
      : []),
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
      url: `${window.location.origin}/b2b`,
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
    ...(faq.length
      ? [
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
          },
        ]
      : []),
  ],
})

export const productLd = (tpl, lang, t) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: tpl.name?.[lang] || tpl.name?.ar,
  description: tpl.tagline?.[lang] || tpl.desc?.[lang] || tpl.tagline?.ar,
  sku: tpl.id,
  category: t(`types.${tpl.type}`),
  brand: { '@type': 'Brand', name: t('brand.name') },
  url: `${window.location.origin}/template/${tpl.slug}`,
  image: `${window.location.origin}/og/${tpl.slug}.png`,
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
