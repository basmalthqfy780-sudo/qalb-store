import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { offers, activeOffer, monthsLabel, offerPicks } from '../data/offers'
import { useSeo, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/**
 * فهرس العروض الموسمية — أربعة مواسم من src/data/offers.js، كلٌّ منها يوصي
 * بمنتجاتٍ حقيقية من الكتالوج وبكوبونٍ يعرفه المتجر (FRIEND20). الموسمُ الجاري
 * يوسَم من شهر اليوم، لا من تاريخٍ نكتبه يدويًا.
 */
export default function Offers() {
  const { t, L, lang } = useI18n()
  const now = activeOffer()

  useSeo(`${t('offers.title')} · ${t('brand.name')}`, t('meta.offersDesc'), {
    jsonLd: graph(
      breadcrumbLd([
        { name: t('crumb.home'), path: '/' },
        { name: t('offers.title'), path: '/offers' },
      ]),
    ),
  })

  return (
    <div className="page-x mx-auto max-w-[1100px] pb-20 pt-12">
      <Head kicker={t('offers.kicker')} title={t('offers.title')} sub={t('offers.sub')} />

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {offers.map((o, k) => {
          const picks = offerPicks(o)
          const live = now?.slug === o.slug
          const from = picks.length ? Math.min(...picks.map((p) => p.price)) : 0
          return (
            <Reveal key={o.slug} delay={k * 70}>
              <article
                data-offer={o.slug}
                className={`group relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
                  live ? 'border-brand/45 bg-panel' : 'border-line bg-panel/60 hover:border-brand/30'
                }`}
              >
                {live && (
                  <Pill tone="brand" className="absolute -top-3 start-6">
                    <Icon n="spark" className="size-3" fill sw={0} />
                    {t('offers.liveNow')}
                  </Pill>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-dim">
                  <span>{L(o.kicker)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{monthsLabel(o, lang)}</span>
                </div>
                <h2 className="mt-2 font-display text-[22px] font-extrabold leading-snug">
                  <Link to={`/offers/${o.slug}`} className="transition hover:text-brand">
                    {L(o.title)}
                  </Link>
                </h2>
                <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-dim">{L(o.sub)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {picks.map((p) => (
                    <span key={p.id} className="rounded-md border border-line bg-bg/60 px-2 py-1 text-[11px] font-bold text-dim">
                      {L(p.name)}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-[12px] font-semibold text-dim">
                    {t('offers.from')} <Money v={from} size="text-[13px]" />
                    <span className="ms-2 font-bold text-brand num">{t('offers.couponTag')}</span>
                  </span>
                  <Btn to={`/offers/${o.slug}`} variant={live ? 'primary' : 'outline'} size="sm">
                    {t('offers.open')}
                    <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
                  </Btn>
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-dim">{t('offers.footNote', { n: num(20) })}</p>
    </div>
  )
}
