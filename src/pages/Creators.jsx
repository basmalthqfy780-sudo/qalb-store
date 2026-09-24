import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { useSeo, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'
import { market } from '../api/market'
import { account } from '../api/account'
import { CATEGORIES, COMMISSION, ESCROW_DAYS, LICENCE, PROCESSING_ESTIMATE, PROVIDERS, REPORT_FREEZE, releaseDate, split } from '../data/marketplace'
import { REPORT_KINDS } from '../data/inspect'

/**
 * سوق المصممين — ما يُشترى من المبدعين لا منّا.
 *
 * القاعدة التي تحكم الصفحة: **لا يُعرض إلا ما اجتاز الفحص**. القائمة تُقرأ من
 * `market.browse()` التي تُرجع `published` وحدها، والحالة تُشتق من قرار خط
 * الفحص لا من اختيار بائع — فإدراجٌ رفضته الطبقات لا يصل إلى هنا ولو ضغط
 * صاحبه ألف زر.
 *
 * والشراء **تسجيلٌ لا قبض**: لا بوابة دفع موصولة في هذه النسخة. يُسجَّل البيع
 * بسعره المختم من الإدراج، ويُحسب تقسيمه وتاريخ إفراجه (بعد 14 يومًا)، وتقول
 * الواجهة ذلك بدل زرّ «تم الدفع» لا يسنده شيء.
 */
export default function Creators() {
  const { t, L } = useI18n()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState(null)
  const [reportFor, setReportFor] = useState(null)
  const [rec] = useState(() => account.local())

  useSeo(`${t('creators.seoTitle')} · ${t('brand.name')}`, t('creators.seoDesc'), {
    jsonLd: graph(
      breadcrumbLd([
        { name: t('crumb.home'), path: '/' },
        { name: t('creators.title'), path: '/creators' },
      ]),
    ),
  })

  useEffect(() => {
    let live = true
    market.browse({}).then((r) => live && setRows(r.listings || []))
    return () => {
      live = false
    }
  }, [])

  const shown = useMemo(
    () =>
      rows
        .filter((r) => !cat || r.category === cat)
        .filter((r) => !q || `${r.title} ${r.desc} ${(r.tags || []).join(' ')}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q, cat],
  )

  const say = (tone, text) => setNote({ tone, text })

  async function buy(l) {
    const r = await market.buy(l.id, { buyer: rec?.email || '' })
    if (!r.ok) {
      if (r.error === 'email') return say('bad', t('creators.needMail'))
      return say('bad', t('creators.buyFail'))
    }
    say('good', t('creators.bought', { n: num(r.sale.price), d: releaseDate(r.sale.soldAt) }))
    setOpen(null)
  }

  async function report(l, kind) {
    const r = await market.report(l.id, { kind })
    if (!r.ok) return say('bad', t('creators.reportFail'))
    setReportFor(null)
    say(r.reports.frozen ? 'warn' : 'good', r.reports.frozen ? t('creators.frozen') : t('creators.reported', { n: r.reports.rights, t: r.threshold }))
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1200px] pb-24 pt-12 sm:pt-16">
        <Head
          as="h1"
          kicker={t('creators.kicker')}
          title={t('creators.title')}
          sub={t('creators.sub')}
          right={
            <Pill tone="brand">
              <Icon n="shield" className="size-3" />
              {t('creators.checked')}
            </Pill>
          }
        />

        {/* شريط البحث والتصفية */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-56">
            <Icon n="search" className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-dim" />
            <input
              aria-label={t('creators.searchLabel')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('creators.searchPh')}
              className="h-11 w-full rounded-xl border border-line bg-panel/60 ps-10 pe-4 text-[13.5px] outline-none focus:border-brand"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!cat}
              onClick={() => setCat('')}
              className={`h-9 rounded-lg border px-3 text-[12.5px] font-bold transition ${!cat ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-panel/50 text-dim hover:text-ink'}`}
            >
              {t('creators.allCats')}
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(cat === c ? '' : c)}
                className={`h-9 rounded-lg border px-3 text-[12.5px] font-bold transition ${cat === c ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-panel/50 text-dim hover:text-ink'}`}
              >
                {t(`sell.cat.${c}`)}
              </button>
            ))}
          </div>
        </div>

        {note ? (
          <p
            role={note.tone === 'bad' ? 'alert' : 'status'}
            className={`mt-5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold ${
              note.tone === 'bad'
                ? 'border-[#ff8080]/35 bg-[#ff8080]/10 text-[#ff9a9a]'
                : note.tone === 'warn'
                  ? 'border-gold/35 bg-gold/10 text-gold'
                  : 'border-[#3ecf8e]/35 bg-[#3ecf8e]/10 text-[#3ecf8e]'
            }`}
          >
            {note.text}
          </p>
        ) : null}

        {/* القائمة */}
        {shown.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((l, k) => {
              const parts = split(l.price)
              return (
                <Reveal key={l.id} delay={k * 50} className="h-full">
                  <article
                    data-listing={l.id}
                    className="flex h-full flex-col rounded-3xl border border-line bg-panel/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone="line">{t(`sell.cat.${l.category}`)}</Pill>
                      <Money v={l.price} size="text-[17px]" />
                    </div>
                    <h2 className="mt-3 font-display text-[16.5px] font-extrabold">{l.title}</h2>
                    <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-dim">{l.desc}</p>

                    {l.tags?.length ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {l.tags.map((x) => (
                          <li key={x} className="num rounded-md border border-line bg-bg/60 px-2 py-0.5 text-[10.5px] font-semibold text-dim">
                            {x}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {/* أثر الفحص: الدرجة والقرار — يُرى قبل الشراء لا بعده */}
                    <div className="num mt-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-dim">
                        <Icon n="shield" className="size-3.5 text-[#3ecf8e]" />
                        {t('creators.scored', { s: l.report?.score ?? 0 })}
                      </span>
                      <span className="text-[11px] font-bold text-dim">{t('creators.salesN', { n: l.sales || 0 })}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Btn size="sm" onClick={() => setOpen(open === l.id ? null : l.id)}>
                        {t('creators.buy')}
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setReportFor(reportFor === l.id ? null : l.id)}>
                        {t('creators.report')}
                      </Btn>
                    </div>

                    {open === l.id ? (
                      <div data-buy className="mt-4 rounded-2xl border border-line bg-bg/70 p-4">
                        <p className="text-[12.5px] font-extrabold">{t('creators.splitShown')}</p>
                        <dl className="num mt-2 space-y-1.5 text-[12px]">
                          {[
                            ['creators.youPay', num(parts.price)],
                            ['creators.platformTakes', num(parts.commission)],
                            ['creators.sellerGets', num(parts.sellerNet)],
                          ].map(([kk, v]) => (
                            <div key={kk} className="flex items-center justify-between gap-3">
                              <dt className="text-dim">{t(kk)}</dt>
                              <dd className="font-bold">{v}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="num mt-2 text-[10.5px] leading-relaxed text-dim">
                          {t('creators.feesNote', { p: PROCESSING_ESTIMATE.pct * 100, f: PROCESSING_ESTIMATE.flat, list: PROVIDERS.join(' · ') })}
                        </p>
                        <p className="mt-2 text-[11px] leading-relaxed text-dim">{t('creators.escrowNote', { d: ESCROW_DAYS })}</p>
                        <Btn size="sm" className="mt-3 w-full" onClick={() => buy(l)}>
                          {t('creators.confirmBuy')}
                        </Btn>
                        <p className="mt-2 text-[11px] leading-relaxed text-gold">{t('creators.noCharge')}</p>
                        {!rec ? <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{t('creators.needMail')}</p> : null}
                      </div>
                    ) : null}

                    {reportFor === l.id ? (
                      <div className="mt-3 rounded-2xl border border-line bg-bg/70 p-3">
                        <p className="text-[12px] font-bold">{t('creators.reportWhy')}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {REPORT_KINDS.map((kk) => (
                            <Btn key={kk} size="xs" variant="outline" onClick={() => report(l, kk)}>
                              {t(`creators.kind.${kk}`)}
                            </Btn>
                          ))}
                        </div>
                        <p className="mt-2 text-[10.5px] leading-relaxed text-dim">{t('creators.freezeNote', { n: REPORT_FREEZE })}</p>
                      </div>
                    ) : null}
                  </article>
                </Reveal>
              )
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-line bg-panel/50 p-8 text-center">
            <p className="text-[15px] font-extrabold">{t('creators.emptyTitle')}</p>
            <p className="mx-auto mt-2 max-w-[60ch] text-[13px] leading-relaxed text-dim">{t('creators.emptySub')}</p>
            <Btn to="/sell" size="lg" className="mt-5">
              {t('creators.sellCta')}
            </Btn>
          </div>
        )}

        {/* القواعد المعلنة */}
        <section id="rules" className="mt-16 grid scroll-mt-24 gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-panel/60 p-6">
            <h2 className="text-[16px] font-extrabold">{t('creators.rulesTitle')}</h2>
            <ul className="mt-4 space-y-2.5">
              {[
                t('creators.rule1', { p: Math.round(COMMISSION * 100) }),
                t('creators.rule2', { d: ESCROW_DAYS }),
                t('creators.rule3'),
                t('creators.rule4', { n: REPORT_FREEZE }),
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-dim">
                  <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-[#3ecf8e]" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-line bg-panel/60 p-6">
            <h2 className="text-[16px] font-extrabold">{t('creators.licenceTitle')}</h2>
            <p className="num mt-1 text-[11px] text-dim">{LICENCE.id}</p>
            <ul className="mt-3 space-y-2">
              {LICENCE.rules.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
                  <Icon n="lock" className="mt-0.5 size-3.5 shrink-0 text-dim" />
                  <span>{t(`sell.licence.${r}`)}</span>
                </li>
              ))}
            </ul>
            <Link to="/licence" className="mt-4 inline-flex text-[12.5px] font-bold text-brand underline decoration-2 underline-offset-2">
              {t('creators.fullLicence')}
            </Link>
          </div>
        </section>

        <p className="mt-8 text-[12.5px] leading-relaxed text-dim">
          {t('creators.pipelineNote')}{' '}
          <Link to="/sell" className="font-bold text-brand underline decoration-2 underline-offset-2">
            {t('creators.sellLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
