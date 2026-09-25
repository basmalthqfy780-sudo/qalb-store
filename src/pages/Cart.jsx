import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, num, dec, dateLabel } from '../i18n'
import { useStore } from '../store/StoreContext'
import { templates, couponInfo } from '../data/templates'
import { cartUpsells, addonDelivery } from '../data/upsells'
import { ArtTile } from '../components/Preview'
import TemplateCard from '../components/TemplateCard'
import { AssureRow, Btn, Icon, Money, Pill } from '../components/ui'
import { useSeo } from '../components/Seo'

export default function Cart() {
  const { t, L, lang } = useI18n()
  const { items, addonItems, totals, setQty, remove, clear, coupon, applyCoupon, clearCoupon, toggleAddon, hasAddon, toast } = useStore()
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)
  const [errExpired, setErrExpired] = useState(false)
  // الكوبونُ المُطبَّق يُقرأ من جدوله: نسبةً وأجلًا وما يشمله — فالسلةُ لا تخترع نصًّا عن خصمٍ لا تعرفه
  const applied = coupon ? couponInfo(coupon.code) : null
  // عرضُ الموسم يُشرح قبل أن يُطلب: ما يشمله، ومتى ينتهي — لا رمزٌ بلا بيان
  const sale = couponInfo('SALE25')

  const suggestions = templates.filter((x) => !items.some((i) => i.id === x.id)).slice(0, 3)
  const upsells = cartUpsells()

  const submitCoupon = (e) => {
    e.preventDefault()
    const ok = applyCoupon(code)
    if (ok && !ok.expired) {
      setErr(false)
      setErrExpired(false)
      setCode('')
      toast(t('cart.couponOk', { c: ok.code, p: ok.pct }))
    } else {
      setErr(true)
      setErrExpired(!!(ok && ok.expired))
    }
  }

  useSeo(`${t('cart.title')} · ${t('brand.name')}`, t('meta.cartDesc'), { robots: 'noindex,follow' })

  if (!items.length && !addonItems.length) {
    return (
      <div className="page-x mx-auto flex max-w-[1400px] flex-col items-center px-6 py-24 text-center">
        <span className="relative grid size-24 place-items-center rounded-3xl border border-line bg-panel">
          <Icon n="cart" className="size-10 text-dim" />
          <span className="absolute -bottom-2 -end-2 grid size-9 place-items-center rounded-full bg-bg ring-1 ring-line">
            <Icon n="search" className="size-4 text-brand" />
          </span>
        </span>
        <h1 className="mt-8 font-display text-3xl font-extrabold">{t('cart.empty')}</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-dim">{t('cart.emptyHint')}</p>
        <Btn to="/templates" size="lg" className="mt-7">
          {t('cart.browse')}
          <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
        </Btn>
        {suggestions.length > 0 && (
          <div className="mt-16 w-full text-start">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">{t('featured.title')}</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((x) => (
                <TemplateCard key={x.id} tpl={x} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-x mx-auto max-w-[1400px] py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-extrabold leading-tight">{t('cart.title')}</h1>
          <p className="num mt-1.5 text-[13px] text-dim">
            {num(totals.count)} {totals.count === 1 ? t('cart.item') : t('cart.items')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/templates" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-dim transition hover:text-ink">
            <Icon n="arrow" className="size-3.5 rotate-180 rtl:rotate-0" />
            {t('cart.continue')}
          </Link>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-dim transition hover:text-danger"
          >
            <Icon n="trash" className="size-4" />
            {t('cart.remove')}
          </button>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="min-w-0">
          <ul className="space-y-3">
            {items.map((it) => {
              const off = it.oldPrice ? Math.round((1 - it.price / it.oldPrice) * 100) : 0
              return (
                <li
                  key={it.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-line bg-panel p-3.5 transition hover:border-brand/30 sm:flex-row"
                >
                  <Link
                    to={`/template/${it.slug}`}
                    className="grid shrink-0 place-items-center self-center rounded-lg border border-line bg-bg p-2 sm:self-start"
                  >
                    <ArtTile tpl={it} size={66} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/template/${it.slug}`} className="block truncate font-display text-[17px] font-extrabold hover:text-brand">
                          {L(it.name)}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-dim">{L(it.tagline)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          remove(it.id)
                          toast(t('toast.removed'))
                        }}
                        aria-label={t('cart.remove')}
                        className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-dim transition hover:border-danger/40 hover:text-danger"
                      >
                        <Icon n="trash" className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Pill tone="solid">{t(`types.${it.type}`)}</Pill>
                      {it.perf && (
                        <Pill tone="brand">
                          {t('product.perfScore')} {it.perf}
                        </Pill>
                      )}
                      {it.ats && (
                        <Pill tone="gold">
                          {t('product.atsScore')} {it.ats}
                        </Pill>
                      )}
                      {off > 0 && <Pill tone="gold">-{off}%</Pill>}
                      {(it.stack || []).slice(0, 3).map((x) => (
                        <Pill key={x}>{x}</Pill>
                      ))}
                    </div>
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-dim">{t('cart.qty')}</span>
                        <div className="inline-flex h-9 items-center rounded-lg border border-line bg-bg">
                          <button
                            type="button"
                            onClick={() => setQty(it.id, it.qty - 1)}
                            aria-label="-"
                            className="grid size-9 place-items-center text-dim transition hover:text-ink"
                          >
                            <Icon n="minus" className="size-3.5" sw={2.2} />
                          </button>
                          <span className="num w-7 text-center text-[13.5px] font-bold">{it.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(it.id, it.qty + 1)}
                            aria-label="+"
                            className="grid size-9 place-items-center text-dim transition hover:text-ink"
                          >
                            <Icon n="plus" className="size-3.5" sw={2.2} />
                          </button>
                        </div>
                      </div>
                      <div className="text-end">
                        {it.oldPrice && <div className="num text-[11.5px] text-dim line-through">{dec(it.oldPrice * it.qty)}</div>}
                        <Money v={it.price * it.qty} size="text-[19px]" />
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* ————— إضافات الطلب: خدماتٌ تُلحَق بالطلب من جدول واحد لا تُكتب أسعارها هنا ————— */}
          {upsells.length > 0 && (
            <section className="mt-6 rounded-3xl border border-line bg-panel/60 p-5" data-upsells aria-label={t('cart.upsellsTitle')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[17px] font-extrabold">{t('cart.upsellsTitle')}</h2>
                <p className="text-[11.5px] text-dim">{t('cart.upsellsSub')}</p>
              </div>
              <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                {upsells.map((u) => {
                  const on = hasAddon(u.id)
                  const delivery = addonDelivery(u.id)
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        data-upsell={u.id}
                        aria-pressed={on}
                        onClick={() => {
                          const added = toggleAddon(u.id)
                          toast(added ? t('cart.addonAdded', { n: L(u.name) }) : t('cart.addonRemoved', { n: L(u.name) }))
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition ${
                          on ? 'border-brand/45 bg-brand/8' : 'border-line bg-bg/50 hover:border-brand/30'
                        }`}
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${on ? 'bg-brand/15 text-brand' : 'bg-panel2/60 text-dim'}`}
                        >
                          <Icon n={on ? 'check' : u.icon || 'spark'} className="size-4" sw={2.4} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-bold text-ink">{L(u.name)}</span>
                          <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-relaxed text-dim">{L(u.tagline)}</span>
                          {delivery?.kind === 'email' && (
                            <span className="num mt-1 block text-[10.5px] font-semibold text-dim/80">
                              {t('cart.addonSla', { h: num(delivery.hours) })}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-end">
                          <Money v={u.price} size="text-[14px]" />
                          <span className={`mt-1 block text-[10.5px] font-bold ${on ? 'text-brand' : 'text-dim'}`}>
                            {on ? t('cart.addonIn') : t('cart.addonAdd')}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-[92px]">
          <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-soft">
            <div className="border-b border-line px-6 py-4">
              <h2 className="font-display text-[17px] font-extrabold">{t('cart.summary')}</h2>
            </div>
            <div className="space-y-3 px-6 py-5 text-[13.5px]">
              {addonItems.length > 0 && (
                <ul data-cart-addons className="space-y-2 border-b border-line pb-3">
                  {addonItems.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Icon n={a.icon || 'spark'} className="size-3.5 shrink-0 text-brand" />
                        <span className="truncate text-[12.5px] font-semibold text-ink">{L(a.name)}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-2">
                        <span className="num text-[12.5px] font-semibold">{dec(a.price)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleAddon(a.id)
                            toast(t('cart.addonRemoved', { n: L(a.name) }))
                          }}
                          aria-label={t('cart.remove')}
                          className="text-dim transition hover:text-danger"
                        >
                          <Icon n="close" className="size-3" sw={2.6} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Line label={t('cart.subtotal')} value={totals.subtotal} />
              {totals.dealSavings > 0 && (
                <div className="flex items-center justify-between text-brand">
                  <span className="font-semibold">{t('card.off')}</span>
                  <span className="num font-bold">− {dec(totals.dealSavings)}</span>
                </div>
              )}
              {coupon && (
                <div className="flex items-center justify-between text-brand">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Icon n="check" className="size-3.5" sw={2.6} />
                    <span className="num">{coupon.code}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearCoupon()
                      toast(t('cart.couponRemoved'))
                    }}
                    className="text-[11.5px] font-bold text-dim hover:text-danger"
                  >
                    {t('cart.remove')}
                  </button>
                </div>
              )}
              {totals.discount > 0 && (
                <div data-discount={dec(totals.discount)} className="flex items-center justify-between">
                  <span className="text-dim">{t('cart.discount')}</span>
                  <span className="num font-bold text-brand">− {dec(totals.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-dim">{t('cart.vat')}</span>
                <span className="num text-[13px] font-semibold">{dec(totals.vat)}</span>
              </div>
              <div data-total={totals.total} className="flex items-end justify-between border-t border-line pt-4">
                <span className="font-display text-[15px] font-extrabold">{t('cart.total')}</span>
                <Money v={totals.total} size="text-[26px]" />
              </div>
              <p className="text-[11px] leading-relaxed text-dim">{t('cart.licenseNote')}</p>
            </div>

            <form onSubmit={submitCoupon} className="border-t border-line px-6 py-4">
              <label htmlFor="coupon-code" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
                {t('cart.coupon')}
              </label>
              <div
                className={`flex gap-2 rounded-xl border bg-bg p-1 transition ${err ? 'border-danger/50' : 'border-line focus-within:border-brand/50'}`}
              >
                <input
                  id="coupon-code"
                  name="coupon"
                  autoComplete="off"
                  spellCheck="false"
                  aria-describedby={err ? 'coupon-msg' : undefined}
                  aria-invalid={err ? true : undefined}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setErr(false)
                  }}
                  placeholder={t('cart.couponPh')}
                  className="num h-9 min-w-0 flex-1 bg-transparent px-2.5 text-[13px] font-semibold outline-none"
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-lg bg-ink px-3.5 text-[12.5px] font-bold text-bg transition hover:opacity-90 light:bg-brand light:text-brandink"
                >
                  {t('cart.apply')}
                </button>
              </div>
              <p
                id="coupon-msg"
                role={err ? 'alert' : undefined}
                className={`mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold ${err ? 'text-danger' : 'text-dim'}`}
              >
                {err ? (
                  <>
                    <Icon n="close" className="size-3" sw={2.6} />
                    {errExpired ? t('cart.couponExpired') : t('cart.couponBad')}
                  </>
                ) : applied ? (
                  <span className="leading-relaxed" data-coupon-note>
                    {applied.endsAt
                      ? t('cart.couponAppliedNote', { c: applied.code, p: applied.pct, d: dateLabel(applied.endsAt, lang) })
                      : t('cart.couponOk', { c: applied.code, p: applied.pct })}
                  </span>
                ) : (
                  <span className="num">SALE25 · FRIEND20 · COACH20 · COACH30</span>
                )}
              </p>
              {!coupon && sale && sale.endsAt && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-dim" data-coupon-hint>
                  {t('cart.couponHint', { d: dateLabel(sale.endsAt, lang) })}
                  {' · '}
                  {t('cart.couponCovers')}
                  {sale.daysLeft != null && ` · ${t('cart.couponDays', { n: sale.daysLeft })}`}
                </p>
              )}
            </form>

            <div className="px-6 pb-6">
              <Btn to="/checkout" size="lg" className="w-full">
                {t('cart.checkout')}
                <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
              </Btn>
              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-semibold text-dim">
                <span className="inline-flex items-center gap-1.5">
                  <Icon n="shield" className="size-3.5 text-brand" />
                  {t('cart.secure')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon n="refresh" className="size-3.5 text-brand" />
                  {t('cart.trustLine')}
                </span>
              </div>
              <AssureRow className="mt-4 border-t border-line pt-4" />
            </div>
          </div>
        </aside>
      </div>

      {suggestions.length > 0 && (
        <section className="mt-20">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
            <Icon n="spark" className="size-3.5 text-gold" fill sw={0} />
            {t('product.related')}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((x) => (
              <TemplateCard key={x.id} tpl={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-dim">{label}</span>
      <span className="num font-semibold">{dec(value)}</span>
    </div>
  )
}
