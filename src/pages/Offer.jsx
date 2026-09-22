import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { offers, offerBySlug, offerPicks, monthsLabel, activeOffer, OFFER_COUPON } from '../data/offers'
import { useStore } from '../store/StoreContext'
import { useSeo, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Head, Icon, Pill, Reveal } from '../components/ui'
import TemplateCard from '../components/TemplateCard'

/**
 * صفحة موسمٍ واحد — المتن بنسختيه من src/data/offers.js، والمنتجات المُوصى بها
 * بطاقاتٌ حقيقية من الكتالوج، وزرٌّ يضيفها كلها للسلة دفعةً واحدة.
 */
export default function Offer() {
  const { slug } = useParams()
  const offer = offerBySlug(slug)
  const { t, L, lang } = useI18n()
  const { addMany, toast } = useStore()
  const now = activeOffer()

  useSeo(offer ? `${L(offer.title)} · ${t('brand.name')}` : `${t('misc.404')} · ${t('brand.name')}`, offer ? L(offer.sub) : t('meta.notFoundDesc'), {
    jsonLd: offer
      ? graph(
          breadcrumbLd([
            { name: t('crumb.home'), path: '/' },
            { name: t('offers.title'), path: '/offers' },
            { name: L(offer.title), path: `/offers/${offer.slug}` },
          ]),
        )
      : null,
  })

  if (!offer) {
    return (
      <div className="page-x mx-auto max-w-[1100px] py-28 text-center">
        <h1 className="font-display text-3xl font-extrabold">{t('misc.404')}</h1>
        <p className="mt-3 text-[14px] text-dim">{t('misc.404sub')}</p>
        <Btn to="/offers" className="mt-6">
          {t('offers.title')}
        </Btn>
      </div>
    )
  }

  const picks = offerPicks(offer)
  const paragraphs = offer.body?.[lang] || offer.body?.ar || []
  const live = now?.slug === offer.slug
  const others = offers.filter((o) => o.slug !== offer.slug)

  return (
    <div className="page-x mx-auto max-w-[1100px] pb-20 pt-12">
      <Link to="/offers" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-dim transition hover:text-ink">
        <Icon n="arrow" className="size-3.5 ltr:-scale-x-100" />
        {t('offers.title')}
      </Link>

      <div className="mt-6">
        <Head
          as="h1"
          kicker={monthsLabel(offer, lang)}
          title={L(offer.title)}
          sub={L(offer.sub)}
          right={
            live ? (
              <Pill tone="brand">
                <Icon n="spark" className="size-3" fill sw={0} />
                {t('offers.liveNow')}
              </Pill>
            ) : undefined
          }
        />
      </div>

      <Reveal className="mt-8 space-y-4 rounded-3xl border border-line bg-panel/60 p-6 sm:p-8">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[14.5px] leading-[1.9] text-ink/85">
            {p}
          </p>
        ))}
        <p className="num rounded-2xl border border-brand/30 bg-brand/[0.06] px-4 py-3 text-[13px] font-bold text-brand">
          {t('offers.couponLine', { c: OFFER_COUPON })}
        </p>
      </Reveal>

      <section className="mt-12" data-offer-picks>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[22px] font-extrabold">{t('offers.picksTitle')}</h2>
          {picks.length > 0 && (
            <Btn
              size="sm"
              onClick={() => {
                addMany(picks.map((p) => p.id))
                toast(t('offers.picksAdded', { n: picks.length }))
              }}
            >
              <Icon n="cart" className="size-4" />
              {t('offers.addAll')}
            </Btn>
          )}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((p) => (
            <TemplateCard key={p.id} tpl={p} />
          ))}
        </div>
      </section>

      {others.length > 0 && (
        <section className="mt-14">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">{t('offers.others')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                to={`/offers/${o.slug}`}
                className="group flex flex-col gap-1.5 rounded-2xl border border-line bg-panel/50 p-4 transition hover:border-brand/35"
              >
                <span className="text-[11.5px] font-semibold text-dim">{monthsLabel(o, lang)}</span>
                <span className="text-[14px] font-extrabold text-ink group-hover:text-brand">{L(o.title)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
