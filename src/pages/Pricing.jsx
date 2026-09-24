import { useState } from 'react'
import { useI18n, num } from '../i18n'
import { FEATURE_MATRIX, ONE_TIME, PLANS, PUBLISH_DONE, gainedBy, publishLight, storePro, vatOf, yearlyAsMonths } from '../data/plans'
import { COMMISSION, ESCROW_DAYS, MIN_PAYOUT } from '../data/marketplace'
import { useSeo, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/**
 * صفحة الخطط — «ما الذي نبيعه بالضبط».
 *
 * كلُّ رقمٍ هنا من src/data/plans.js: الخطط، ومصفوفة القيمة بصفوفها العشرة،
 * والباقة لمرة واحدة، وخدمة النشر. ولا سطرَ ميزات مكتوبًا باليد في هذه
 * الصفحة — القوائم تُقرأ من الجدول، فلو تغيّر الجدول تغيّرت الصفحة معه.
 *
 * والصدق شرطٌ هنا كما في كل صفحة: لا بوابة دفع موصولة في هذه النسخة، فالزرّ
 * **يُسجّل التفعيل** ويقول ذلك، ولا يَعِد بخصمٍ من بطاقة.
 */

/** علامة الحالة في المصفوفة: ✔ · ◐ · ✕ — مع نصّ بديل للقارئ الشاشة */
function Mark({ state, note, label }) {
  const map = {
    yes: { i: 'check', cls: 'text-[#3ecf8e] border-[#3ecf8e]/30 bg-[#3ecf8e]/10', sr: 'yes' },
    partial: { i: 'sliders', cls: 'text-gold border-gold/30 bg-gold/10', sr: 'partial' },
    no: { i: 'close', cls: 'text-ink/35 border-line bg-panel/40', sr: 'no' },
  }
  const m = map[state] || map.no
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${m.cls}`}>
        <Icon n={m.i} className="size-3.5" />
      </span>
      <span className="sr-only">{label[m.sr]}</span>
      {note ? <span className="text-[12.5px] font-medium text-dim">{note}</span> : null}
    </span>
  )
}

export default function Pricing() {
  const { t, L, LA } = useI18n()
  const [yearly, setYearly] = useState(false)
  const light = publishLight()
  const pro = storePro()

  useSeo(`${t('plans.seoTitle')} · ${t('brand.name')}`, t('plans.seoDesc'), {
    jsonLd: graph(
      breadcrumbLd([
        { name: t('crumb.home'), path: '/' },
        { name: t('plans.title'), path: '/pricing' },
      ]),
    ),
  })

  const labels = { yes: t('plans.state.yes'), partial: t('plans.state.partial'), no: t('plans.state.no') }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1200px] pb-24 pt-12 sm:pt-16">
        <Head
          as="h1"
          kicker={t('plans.kicker')}
          title={t('plans.title')}
          sub={t('plans.sub')}
          right={
            <div className="flex items-center gap-2 rounded-xl border border-line bg-panel/60 p-1" role="group" aria-label={t('plans.billing')}>
              {[
                { k: false, s: t('plans.monthly') },
                { k: true, s: t('plans.yearly') },
              ].map((o) => (
                <button
                  key={String(o.k)}
                  type="button"
                  aria-pressed={yearly === o.k}
                  onClick={() => setYearly(o.k)}
                  className={`h-9 rounded-lg px-3.5 text-[12.5px] font-bold transition ${yearly === o.k ? 'bg-ink text-bg' : 'text-dim hover:text-ink'}`}
                >
                  {o.s}
                </button>
              ))}
            </div>
          }
        />

        {/* ————— الخطط الثلاث ————— */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, k) => {
            const price = yearly && p.yearly ? p.yearly : p.price
            const per = yearly && p.yearly ? t('plans.perYear') : p.period ? t('plans.perMonth') : ''
            const gained = gainedBy(p.id)
            return (
              <Reveal key={p.id} delay={k * 70} className="h-full">
                <article
                  data-plan={p.id}
                  className={`relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
                    p.id === 'pro' ? 'border-brand/45 bg-panel shadow-lift' : 'border-line bg-panel/60 hover:border-brand/25'
                  }`}
                >
                  {p.id === 'pro' ? (
                    <Pill tone="brand">{t('plans.mostComplete')}</Pill>
                  ) : p.id === 'solo' ? (
                    <Pill tone="gold">{t('plans.mostPicked')}</Pill>
                  ) : (
                    <span />
                  )}
                  <h2 className="mt-3 font-display text-[20px] font-extrabold">{L(p.name)}</h2>
                  <p className="mt-1.5 min-h-10 text-[12.5px] font-semibold leading-relaxed text-dim">{L(p.tagline)}</p>

                  <div className="mt-4 flex items-end gap-2">
                    {p.price === 0 ? (
                      <span className="font-display text-[34px] font-black leading-none">{t('plans.free')}</span>
                    ) : (
                      <Money v={price} size="text-[34px]" />
                    )}
                    <span className="num mb-1 text-[12px] font-bold text-dim">{per}</span>
                  </div>
                  {p.price > 0 ? (
                    <p className="num mt-1 text-[11.5px] text-dim">
                      {yearly && p.yearly ? t('plans.yearlyAs', { m: yearlyAsMonths(p.id) }) : t('plans.vatIn', { v: num(vatOf(price)) })}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11.5px] text-dim">{t('plans.noCard')}</p>
                  )}

                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
                    {LA(p.bullets).map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/80">
                        <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-[#3ecf8e]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {gained.length > 0 ? (
                    <p className="mt-4 rounded-xl border border-line bg-bg/60 px-3 py-2 text-[11.5px] font-semibold text-dim">
                      {t('plans.opensOverFree', { n: gained.length })}
                    </p>
                  ) : null}

                  <Btn
                    to={p.id === 'free' ? '/create' : `/create?plan=${p.id}`}
                    variant={p.id === 'pro' ? 'primary' : 'outline'}
                    size="lg"
                    className="mt-5 w-full"
                  >
                    {L(p.cta)}
                  </Btn>
                </article>
              </Reveal>
            )
          })}
        </div>

        {/* ————— مصفوفة توزيع القيمة: الصفوف العشرة ————— */}
        <section id="matrix" className="mt-20 scroll-mt-24">
          <Head kicker={t('plans.matrixKicker')} title={t('plans.matrixTitle')} sub={t('plans.matrixSub')} />
          <div className="mt-7 overflow-x-auto rounded-3xl border border-line bg-panel/50">
            <table className="w-full min-w-[640px] border-collapse text-start">
              <caption className="sr-only">{t('plans.matrixSub')}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-4 text-start text-[12px] font-bold uppercase tracking-wider text-dim">
                    {t('plans.colFeature')}
                  </th>
                  <th scope="col" className="px-5 py-4 text-start text-[12px] font-bold uppercase tracking-wider text-dim">
                    {t('plans.colFree')}
                  </th>
                  <th scope="col" className="px-5 py-4 text-start text-[12px] font-bold uppercase tracking-wider text-brand">
                    {t('plans.colPaid')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((row) => (
                  <tr key={row.id} data-row={row.id} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="px-5 py-3.5 text-start text-[13.5px] font-bold">
                      {L(row.label)}
                    </th>
                    <td className="px-5 py-3.5">
                      <Mark state={row.free.state} note={L(row.free.note)} label={labels} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Mark state={row.paid.state} note={L(row.paid.note)} label={labels} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
            <Icon n="shield" className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>{t('plans.matrixEnforced')}</span>
          </p>
        </section>

        {/* ————— ما يُشترى بلا اشتراك ————— */}
        <section id="one-time" className="mt-20 grid scroll-mt-24 gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <article data-pack={ONE_TIME.id} className="flex h-full flex-col rounded-3xl border border-line bg-panel/60 p-6">
              <Pill tone="line">
                <Icon n="gift" className="size-3" />
                {t('plans.oneTimeKicker')}
              </Pill>
              <h2 className="mt-3 font-display text-[19px] font-extrabold">{L(ONE_TIME.name)}</h2>
              <p className="mt-1.5 text-[12.5px] font-semibold text-dim">{L(ONE_TIME.tagline)}</p>
              <div className="mt-4 flex items-end gap-2">
                <Money v={ONE_TIME.price} size="text-[30px]" />
                <span className="mb-1 text-[12px] font-bold text-dim">{t('plans.once')}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {LA(ONE_TIME.bullets).map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/80">
                    <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-[#3ecf8e]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Btn to="/templates" variant="outline" size="lg" className="mt-5 w-full">
                {t('plans.pickTemplate')}
              </Btn>
            </article>
          </Reveal>

          <Reveal delay={80} className="h-full">
            <article data-service={PUBLISH_DONE.id} className="flex h-full flex-col rounded-3xl border border-line bg-panel/60 p-6">
              <Pill tone="gold">
                <Icon n="rocket" className="size-3" />
                {t('plans.publishKicker')}
              </Pill>
              <h2 className="mt-3 font-display text-[19px] font-extrabold">{L(PUBLISH_DONE.name)}</h2>
              <p className="mt-1.5 text-[12.5px] font-semibold text-dim">{L(PUBLISH_DONE.tagline)}</p>
              <div className="mt-4 flex items-end gap-2">
                <Money v={PUBLISH_DONE.price} size="text-[30px]" />
                <span className="mb-1 text-[12px] font-bold text-dim">{t('plans.withinHours', { h: num(PUBLISH_DONE.hours) })}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {LA(PUBLISH_DONE.bullets).map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/80">
                    <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-[#3ecf8e]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {light ? (
                <p className="num mt-4 rounded-xl border border-line bg-bg/60 px-3 py-2 text-[11.5px] font-semibold text-dim">
                  {t('plans.lighterTier', { n: num(light.price) })}
                </p>
              ) : null}
              <Btn to="/services" variant="outline" size="lg" className="mt-5 w-full">
                {t('plans.allServices')}
              </Btn>
            </article>
          </Reveal>
        </section>

        {/* ————— سوق المصممين: نسبتنا معلنة ————— */}
        <section id="market" className="mt-20 scroll-mt-24">
          <Head kicker={t('plans.marketKicker')} title={t('plans.marketTitle')} sub={t('plans.marketSub')} />
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              { i: 'wallet', v: `${Math.round(COMMISSION * 100)}%`, s: t('plans.marketCommission') },
              { i: 'lock', v: num(ESCROW_DAYS), s: t('plans.marketEscrow') },
              { i: 'bank', v: num(MIN_PAYOUT), s: t('plans.marketMin') },
            ].map((x, k) => (
              <Reveal key={x.i} delay={k * 60}>
                <div className="rounded-2xl border border-line bg-panel/60 p-5">
                  <span className="grid size-10 place-items-center rounded-xl border border-line bg-bg text-brand">
                    <Icon n={x.i} className="size-4" />
                  </span>
                  <p className="num mt-3 font-display text-[26px] font-black">{x.v}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{x.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Btn to="/sell" variant="outline" size="lg" className="mt-5">
            {t('plans.sellCta')}
          </Btn>
        </section>

        {/* ————— الصدق: ما لا يحدث في هذه النسخة ————— */}
        <section id="honest" className="mt-16 scroll-mt-24 rounded-3xl border border-line bg-panel/40 p-6">
          <h2 className="flex items-center gap-2 font-display text-[17px] font-extrabold">
            <Icon n="shield" className="size-4 text-gold" />
            {t('plans.honestTitle')}
          </h2>
          <ul className="mt-3 space-y-2">
            {[t('plans.honest1', { p: pro ? num(pro.price) : '39' }), t('plans.honest2'), t('plans.honest3')].map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-dim">
                <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-gold" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ————— أسئلة ————— */}
        <section id="faq" className="mt-16 scroll-mt-24">
          <Head kicker={t('plans.faqKicker')} title={t('plans.faqTitle')} />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['plans.faq1q', 'plans.faq1a'],
              ['plans.faq2q', 'plans.faq2a'],
              ['plans.faq3q', 'plans.faq3a'],
              ['plans.faq4q', 'plans.faq4a'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-line bg-panel/50 p-5">
                <p className="text-[14px] font-bold">{t(q)}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-dim">{t(a)}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12.5px] leading-relaxed text-dim">
            {t('plans.storeProNote')}{' '}
            <a href="/#pro" className="font-bold text-brand underline decoration-2 underline-offset-2">
              {t('plans.storeProLink')}
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
