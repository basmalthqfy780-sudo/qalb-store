import { useState } from 'react'
import { submitOrder, apiMode } from '../api'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n, dec } from '../i18n'
import { useStore, VAT } from '../store/StoreContext'
import Personalize from '../components/Personalize'
import { sanitizePersonal } from '../data/deliverable'
import { Logo } from '../components/Navbar'
import { Btn, Icon, Money } from '../components/ui'
import { useSeo } from '../components/Seo'

const METHODS = [
  { id: 'card', icon: 'card', k: 'checkout.card' },
  { id: 'apple', icon: 'wallet', k: 'checkout.apple' },
  { id: 'stc', icon: 'phone', k: 'checkout.stc' },
  { id: 'transfer', icon: 'bank', k: 'checkout.transfer' },
]
const methodById = (id) => METHODS.find((m) => m.id === id)

export default function Checkout() {
  const { t, lang, L } = useI18n()
  const { items, totals, coupon, clear, personal } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [payErr, setPayErr] = useState('')
  const [err, setErr] = useState({})
  const [f, setF] = useState({
    email: '',
    name: '',
    phone: '',
    country: lang === 'ar' ? 'السعودية' : 'Saudi Arabia',
    city: '',
    company: '',
    vat: '',
    method: 'card',
    card: '',
    exp: '',
    cvv: '',
    holder: '',
    agree: true,
  })
  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }))
    setErr((p) => (p[k] ? { ...p, [k]: undefined } : p))
  }

  useSeo(`${t('checkout.title')} · ${t('brand.name')}`, t('meta.checkoutDesc'), { robots: 'noindex,follow' })

  if (!items.length) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
        <span className="grid size-16 place-items-center rounded-2xl border border-line bg-panel text-dim">
          <Icon n="cart" className="size-7" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-extrabold">{t('cart.empty')}</h1>
        <Btn to="/templates" className="mt-6">
          {t('cart.browse')}
        </Btn>
      </div>
    )
  }

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = t('checkout.errEmail')
      if (f.name.trim().length < 3) e.name = t('checkout.errName')
    }
    if (step === 1 && f.method === 'card') {
      if (f.card.replace(/\D/g, '').length !== 16) e.card = t('checkout.errCard')
      if (!/^\d{2}\/\d{2}$/.test(f.exp)) e.exp = t('checkout.errExp')
      if (!/^\d{3,4}$/.test(f.cvv)) e.cvv = t('checkout.errCvv')
    }
    if (step === 2 && !f.agree) e.agree = t('checkout.errAgree')
    setErr(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate()) return
    if (step < 2) return setStep(step + 1)
    setBusy(true)
    setPayErr('')

    // id, licence key and timestamps are issued by the transport (src/api):
    // local by default, REST the moment VITE_QALB_API=rest is set.
    const draft = {
      email: f.email,
      name: f.name,
      phone: f.phone,
      country: f.country,
      total: totals.total,
      subtotal: totals.subtotal,
      discount: totals.discount,
      vat: totals.vat,
      vatRate: VAT,
      currency: 'SAR',
      count: totals.count,
      method: f.method,
      methodLabel: t(methodById(f.method)?.k || 'checkout.card'),
      coupon: coupon?.code || null,
      personalize: inject, // null = لا تخصيص، فتصل الحزمة بنصوصها التجريبية
      couponPct: coupon?.pct || 0,
      invoice: !!f.invoice,
      vatNo: f.vat || null,
      lines: items.map((i) => ({ id: i.id, slug: i.slug, qty: i.qty, price: i.price })),
    }

    submitOrder(draft)
      .then((order) => {
        clear()
        nav('/order', { state: { order } })
      })
      .catch(() => {
        // a failed call must never eat the cart
        setPayErr(t('checkout.payFail'))
      })
      .finally(() => setBusy(false))
  }

  const steps = [t('checkout.step1'), t('checkout.step2'), t('checkout.step3')]

  /**
   * بيانات المشتّر التي تُطبع في الحزمة: الحقل الفارغ يُؤخذ من الفاتورة، وما لا
   * يُقبل يُهمل في sanitizePersonal — فتبقى المعاينة هنا هي البايتات نفسها لاحقًا.
   */
  const inject = personal.on
    ? sanitizePersonal({ ...personal, name: personal.name || f.name, email: personal.email || f.email, phone: personal.phone || f.phone })
    : null
  const injectText = inject
    ? Object.entries(inject)
        .map(([k, v]) => `${t(k === 'website' ? 'personal.site' : `personal.${k}`)}: ${v}`)
        .join(' · ')
    : ''

  return (
    <div className="min-h-[80vh]">
      <div className="border-b border-line bg-bg2/60">
        <div className="page-x mx-auto flex max-w-[1180px] items-center justify-between gap-4 py-4">
          <Logo />
          <div className="hidden items-center gap-2 text-[12px] font-semibold text-dim sm:flex">
            <Icon n="lock" className="size-3.5 text-brand" />
            SSL · {t('cart.secure')}
          </div>
          <Link to="/cart" className="text-[12.5px] font-bold text-dim transition hover:text-ink">
            {t('cart.title')}
          </Link>
        </div>
      </div>

      <div className="page-x mx-auto grid max-w-[1180px] gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <div className="mb-6">
            <h1 className="font-display text-[30px] font-extrabold leading-tight">{t('checkout.title')}</h1>
            <p className="mt-1.5 text-[13px] text-dim">
              {t('cart.summary')} · <span className="num">{items.length}</span> {t('nav.templates')}
            </p>
          </div>

          {/* stepper */}
          <ol className="mb-8 flex items-center gap-2">
            {steps.map((label, k) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => k < step && setStep(k)}
                  className={`flex items-center gap-2 rounded-full border px-1 py-1 pe-3 transition ${
                    k <= step ? 'border-brand/40 bg-brand/10' : 'border-line'
                  } ${k < step ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full text-[12px] font-extrabold ${
                      k < step ? 'bg-brand text-brandink' : k === step ? 'bg-ink text-bg light:bg-brand light:text-brandink' : 'bg-panel2 text-dim'
                    }`}
                  >
                    {k < step ? <Icon n="check" className="size-3.5" sw={3} /> : k + 1}
                  </span>
                  <span className={`text-[12.5px] font-bold ${k === step ? 'text-ink' : 'text-dim'}`}>{label}</span>
                </button>
                {k < steps.length - 1 && <span className={`h-px flex-1 ${k < step ? 'bg-brand/50' : 'bg-line'}`} />}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <Section title={t('checkout.step1')} note={t('checkout.billingNote')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field k="email" label={t('checkout.email')} type="email" ph="name@company.com" f={f} set={set} err={err.email} wide />
                <Field k="name" label={t('checkout.name')} ph={lang === 'ar' ? 'سارة العتيبي' : 'Sarah Al-Otaibi'} f={f} set={set} err={err.name} />
                <Field k="phone" label={t('checkout.phone')} ph="+966 5X XXX XXXX" f={f} set={set} dir="ltr" mode="tel" />
                <Field k="city" label={t('checkout.city')} ph={lang === 'ar' ? 'جدة' : 'Jeddah'} f={f} set={set} />
                <Field k="country" label={t('checkout.country')} f={f} set={set} />
                <Field k="company" label={t('checkout.company')} f={f} set={set} />
                <Field k="vat" label={t('checkout.vatNo')} ph="300000000000003" f={f} set={set} dir="ltr" />
                <label className="flex items-start gap-2.5 rounded-xl border border-line bg-bg p-3.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!f.invoice}
                    onChange={(e) => set('invoice', e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--c-brand)]"
                  />
                  <span>
                    <span className="block text-[13px] font-bold">{t('checkout.invoice')}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dim">{t('checkout.invoiceNote')}</span>
                  </span>
                </label>
              </div>

              <Personalize className="mt-6" />
            </Section>
          )}

          {step === 1 && (
            <Section title={t('checkout.method')} note={t('cart.secure')}>
              <div className="grid gap-2 sm:grid-cols-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set('method', m.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3.5 text-start transition ${
                      f.method === m.id ? 'border-brand/60 bg-brand/[0.07] shadow-soft' : 'border-line hover:border-dim/40'
                    }`}
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-lg ${f.method === m.id ? 'bg-brand text-brandink' : 'bg-panel2 text-dim'}`}
                    >
                      <Icon n={m.icon} className="size-4" />
                    </span>
                    <span className="text-[13.5px] font-bold">{t(m.k)}</span>
                    {f.method === m.id && <Icon n="check" className="ms-auto size-4 text-brand" sw={2.6} />}
                  </button>
                ))}
              </div>

              {f.method === 'card' && (
                <div className="mt-6 grid gap-4 rounded-2xl border border-line bg-bg p-4 sm:grid-cols-2">
                  <Field k="holder" label={t('checkout.holder')} f={f} set={set} wide />
                  <Field
                    k="card"
                    label={t('checkout.cardNumber')}
                    ph="4111 1111 1111 1111"
                    f={f}
                    set={(k, v) =>
                      set(
                        k,
                        v
                          .replace(/\D/g, '')
                          .slice(0, 16)
                          .replace(/(.{4})/g, '$1 ')
                          .trim(),
                      )
                    }
                    err={err.card}
                    dir="ltr"
                    wide
                    hint="next"
                  />
                  <Field
                    k="exp"
                    label={t('checkout.exp')}
                    ph="MM/YY"
                    f={f}
                    set={(k, v) => {
                      const d = v.replace(/\D/g, '').slice(0, 4)
                      set(k, d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                    }}
                    err={err.exp}
                    dir="ltr"
                    hint="done"
                  />
                  <Field
                    k="cvv"
                    label={t('checkout.cvv')}
                    ph="123"
                    f={f}
                    set={(k, v) => set(k, v.replace(/\D/g, '').slice(0, 4))}
                    err={err.cvv}
                    dir="ltr"
                    hint="done"
                  />
                  <p className="flex items-center gap-2 text-[11.5px] text-dim sm:col-span-2">
                    <Icon n="shield" className="size-3.5 text-brand" />
                    {lang === 'ar' ? 'وضع تجريبي — لا تُجرى أي عملية دفع فعلية.' : 'Demo mode — no real charge is made.'}
                  </p>
                </div>
              )}

              {f.method === 'transfer' && (
                <div className="mt-6 rounded-2xl border border-line bg-bg p-5 text-[13.5px] leading-relaxed text-dim">
                  <p className="font-bold text-ink">{lang === 'ar' ? 'بيانات الحساب' : 'Bank details'}</p>
                  <p className="num mt-2">IBAN SA03 8000 0000 6080 1016 7519 · {lang === 'ar' ? 'بنك الرياض' : 'Riyad Bank'}</p>
                  <p className="mt-1">
                    {lang === 'ar' ? 'تُفعَّل الملفات خلال ٢٤ ساعة من تأكيد الحوالة.' : 'Files unlock within 24h of transfer confirmation.'}
                  </p>
                </div>
              )}
              {(f.method === 'apple' || f.method === 'stc') && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-bg p-5 text-[13.5px] text-dim">
                  <Icon n={f.method === 'apple' ? 'wallet' : 'phone'} className="size-5 text-brand" />
                  {lang === 'ar' ? 'ستُفتح نافذة المحفظة لإتمام الدفع بعد التأكيد.' : 'The wallet sheet will open to authorise the payment.'}
                </div>
              )}
            </Section>
          )}

          {step === 2 && (
            <Section title={t('checkout.step3')} note={t('cart.secure')}>
              <div className="space-y-2 rounded-2xl border border-line bg-bg p-4">
                <Review label={t('checkout.email')} value={f.email} />
                <Review label={t('checkout.name')} value={f.name} />
                <Review label={t('checkout.method')} value={t(methodById(f.method)?.k || 'checkout.card')} />
                {f.invoice && <Review label={t('checkout.invoice')} value={f.vat ? `VAT ${f.vat}` : t('checkout.yes')} />}
                {f.card && <Review label={t('checkout.cardNumber')} value={`•••• ${f.card.slice(-4)}`} />}
                {inject ? (
                  <div className="rounded-xl border border-brand/30 bg-brand/[0.05] px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
                      <Icon n="spark" className="size-3.5" />
                      {t('personal.preview')}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-dim">{injectText}</p>
                  </div>
                ) : null}
                <Review label={t('checkout.promo')} value={coupon?.code || '—'} />
              </div>
              <ul className="mt-5 space-y-2.5">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon n="file" className="size-4 shrink-0 text-brand" />
                      <span className="truncate font-semibold">{L(it.name)}</span>
                      <span className="num text-dim">×{it.qty}</span>
                    </span>
                    <span className="num shrink-0 font-bold">{dec(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
              <label className="mt-6 flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} className="peer sr-only" />
                <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[6px] border border-line bg-bg text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brandink">
                  <Icon n="check" className="size-3" sw={3} />
                </span>
                <span className={`text-[13px] leading-relaxed ${err.agree ? 'text-danger' : 'text-dim'}`}>
                  {t('checkout.agree')} · {t('footer.refund')}
                </span>
              </label>
            </Section>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-dim transition hover:text-ink"
              >
                <Icon n="arrow" className="size-4 rotate-180 rtl:rotate-0" />
                {t('checkout.back')}
              </button>
            ) : (
              <Link to="/cart" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-dim transition hover:text-ink">
                <Icon n="arrow" className="size-4 rotate-180 rtl:rotate-0" />
                {t('cart.title')}
              </Link>
            )}
            {payErr && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/[0.07] p-3 text-[12.5px] font-semibold leading-relaxed text-danger"
              >
                <Icon n="close" className="mt-0.5 size-3.5 shrink-0" sw={2.6} />
                <span className="flex-1">{payErr}</span>
                <button type="button" onClick={next} className="shrink-0 underline decoration-2 underline-offset-2">
                  {t('checkout.retry')}
                </button>
              </div>
            )}
            <Btn size="lg" type="submit" onClick={next} disabled={busy} className="min-w-[180px]">
              {busy ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('checkout.processing')}
                </>
              ) : (
                <>
                  {step < 2 ? t('checkout.next') : t('checkout.place')}
                  {step < 2 && <Icon n="arrow" className="size-4 rtl:-scale-x-100" />}
                </>
              )}
            </Btn>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-dim">
              <span className={`size-1.5 rounded-full ${apiMode === 'rest' ? 'bg-brand' : 'bg-gold'}`} />
              {apiMode === 'rest' ? t('checkout.liveMode') : t('checkout.demoMode')}
            </p>
          </div>
        </form>

        {/* order rail */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-line bg-panel">
            <p className="border-b border-line px-5 py-4 font-display text-[16px] font-extrabold">{t('checkout.orderSummary')}</p>
            <ul className="space-y-3 px-5 py-4">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-bg">
                    <Icon n="file" className="size-4 text-brand" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{L(it.name)}</span>
                    <span className="num block text-[11.5px] text-dim">
                      ×{it.qty} · {it.pages}p
                    </span>
                  </span>
                  <span className="num text-[13.5px] font-bold">{dec(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-line px-5 py-4 text-[13px]">
              <Row label={t('cart.subtotal')} v={totals.subtotal} />
              {totals.discount > 0 && <Row label={`${t('cart.discount')} ${coupon?.code ? `(${coupon.pct}%)` : ''}`} v={-totals.discount} brand />}
              <Row label={t('cart.vat')} v={totals.vat} dim />
              <div className="flex items-end justify-between border-t border-line pt-3">
                <span className="font-display text-[14px] font-extrabold">{t('cart.total')}</span>
                <Money v={totals.total} size="text-[22px]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-4">
              {['mada', 'VISA', 'Apple Pay', 'stc pay'].map((p) => (
                <span key={p} className="num rounded-md border border-line bg-bg px-2 py-1 text-[10.5px] font-bold text-dim">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-dim">
            <Icon n="refresh" className="mt-0.5 size-3.5 shrink-0 text-brand" />
            {t('faq.a5')}
          </p>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, note, children }) {
  return (
    <div className="animate-fadeup rounded-3xl border border-line bg-panel p-6">
      <div className="mb-5">
        <h2 className="font-display text-[20px] font-extrabold">{title}</h2>
        {note && <p className="mt-1 text-[12.5px] text-dim">{note}</p>}
      </div>
      {children}
    </div>
  )
}

const INPUT_MODE = { phone: 'tel', card: 'numeric', exp: 'numeric', cvv: 'numeric', vat: 'numeric', email: 'email' }

function Field({ k, label, f, set, err, ph, type = 'text', wide, dir, mode, hint = 'next' }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-dim">{label}</span>
      <input
        id={`co-${k}`}
        name={k}
        type={type}
        value={f[k] ?? ''}
        placeholder={ph}
        dir={dir}
        inputMode={mode || INPUT_MODE[k]}
        enterKeyHint={hint}
        autoComplete={
          k === 'email'
            ? 'email'
            : k === 'name'
              ? 'name'
              : k === 'phone'
                ? 'tel'
                : k === 'card'
                  ? 'cc-number'
                  : k === 'exp'
                    ? 'cc-exp'
                    : k === 'cvv'
                      ? 'cc-csc'
                      : k === 'holder'
                        ? 'cc-name'
                        : undefined
        }
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `co-${k}-err` : undefined}
        onChange={(e) => set(k, e.target.value)}
        className={`h-12 w-full rounded-xl border bg-bg px-3.5 text-[14px] outline-none transition ${
          err ? 'border-danger/60 bg-danger/[0.04]' : 'border-line focus:border-brand/60'
        }`}
      />
      {err && (
        <span id={`co-${k}-err`} role="alert" className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-danger">
          <Icon n="close" className="size-3" sw={2.6} />
          {err}
        </span>
      )}
    </label>
  )
}

function Review({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-dim">{label}</span>
      <span className="truncate font-bold">{value || '—'}</span>
    </div>
  )
}

function Row({ label, v, dim, brand }) {
  return (
    <div className="flex items-center justify-between">
      <span className={dim ? 'text-dim' : 'text-ink/80'}>{label}</span>
      <span className={`num font-semibold ${brand ? 'text-brand' : ''}`}>
        {v < 0 ? '− ' : ''}
        {dec(Math.abs(v))}
      </span>
    </div>
  )
}
