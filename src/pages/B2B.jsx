import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { orgs } from '../api/orgs'
import { B2B_TERM_MONTHS, B2B_TIERS, SEAT_TEMPLATES, cheapestSeatRetail, normalizeCode, orgMailto, perSeat, priciestSeatRetail } from '../data/b2b'
import { SUPPORT_MAIL, SUPPORT_MAILTO } from '../data/contact'
import { orgLd, useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/** رسائل الرفض — مفاتيحها نصٌّ صريح لا تركيبٌ، فيراها فحص «لا مفتاح ميت» */
const errText = (t, why) =>
  ({
    unknown: t('b2b.errUnknown'),
    paused: t('b2b.errPaused'),
    expired: t('b2b.errExpired'),
    exhausted: t('b2b.errExhausted'),
    already: t('b2b.errAlready'),
    template: t('b2b.errTemplate'),
    429: t('b2b.errWait'),
  })[why] || t('b2b.errGeneric')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * طبقة المؤسسات: عقدٌ سنويٌّ بمقاعد، الطالب يستبدل مقعدًا فلا يدفع.
 * كل رقم هنا مقروء من B2B_TIERS؛ وما هو بشري (العقد والفاتورة وإصدار الرمز)
 * مكتوبٌ أنه بشري — لا زرّ «تم إنشاء العقد».
 */
export default function B2B() {
  const { t, L, lang } = useI18n()
  const [picked, setPicked] = useState(B2B_TIERS[0].id)
  const [form, setForm] = useState({ org: '', email: '', seats: '', note: '' })
  const [red, setRed] = useState({ code: '', email: '', name: '', template: SEAT_TEMPLATES[0].id })
  const [redState, setRedState] = useState({ phase: 'idle', why: '', order: null })
  const [ask, setAsk] = useState({ code: '', phase: 'idle', data: null })

  const tier = B2B_TIERS.find((x) => x.id === picked) || B2B_TIERS[0]
  const rest = orgs.mode === 'rest'
  const mailto = orgMailto({ tier: picked, ...form })

  const faq = [
    [t('b2b.q1'), t('b2b.a1')],
    [t('b2b.q2'), t('b2b.a2')],
    [t('b2b.q3'), t('b2b.a3')],
    [t('b2b.q4'), t('b2b.a4')],
  ]
  useSeo(`${t('b2b.title')} · ${t('brand.name')}`, t('meta.b2bDesc'), {
    jsonLd: orgLd({ tiers: B2B_TIERS, faq, lang, t }),
    type: 'website',
  })

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function redeem(e) {
    e.preventDefault()
    const code = normalizeCode(red.code)
    if (!EMAIL.test(red.email)) return setRedState({ phase: 'bad', why: 'email' })
    if (red.name.trim().length < 2) return setRedState({ phase: 'bad', why: 'name' })
    setRedState({ phase: 'busy' })
    const r = await orgs.redeem({ ...red, code, lang })
    if (r.status === 201 && r.body?.order) return setRedState({ phase: 'done', order: r.body.order, left: r.body.remaining })
    setRedState({ phase: 'error', why: String(r.body?.error || r.status) })
  }

  async function seats(e) {
    e.preventDefault()
    setAsk({ ...ask, phase: 'busy' })
    const r = await orgs.seats(normalizeCode(ask.code))
    setAsk({ ...ask, phase: r.status === 200 ? 'done' : 'error', data: r.status === 200 ? r.body : r.body?.error })
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1240px] py-13 sm:py-16">
        <Head
          kicker={t('b2b.kicker')}
          title={t('b2b.title')}
          sub={t('b2b.sub')}
          right={
            <Pill tone="gold">
              <Icon n="cap" className="size-3" />
              {t('b2b.pill')}
            </Pill>
          }
        />

        {/* ---------------- الباقات ---------------- */}
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {B2B_TIERS.map((x) => {
            const on = x.id === picked
            return (
              <article
                key={x.id}
                data-b2b-tier={x.id}
                className={`flex flex-col rounded-3xl border p-5 transition ${on ? 'border-brand/45 bg-panel' : 'border-line bg-panel/55 hover:border-brand/25'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="num text-[11px] font-bold tracking-wide text-brand">{num(x.seats)}</p>
                    <h2 className="mt-0.5 text-[15.5px] font-extrabold leading-tight text-ink">{L(x.name)}</h2>
                  </div>
                  {on && (
                    <span className="grid size-6 place-items-center rounded-full bg-brand text-brandink">
                      <Icon n="check" className="size-3.5" sw={2.6} />
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{L(x.for)}</p>
                <div className="mt-3.5 flex items-end gap-1.5">
                  <Money v={x.price} size="text-[24px]" />
                  <span className="pb-1 text-[11.5px] text-dim">{t('b2b.perYear')}</span>
                </div>
                <p className="num mt-1 text-[11.5px] text-dim">
                  {t('b2b.perSeat')} {num(perSeat(x))} · {t('b2b.retailRange')} {num(cheapestSeatRetail())}–{num(priciestSeatRetail())}
                </p>
                <ul className="mt-3.5 space-y-1.5 border-t border-line pt-3.5">
                  {(x.includes?.[lang] || x.includes.ar).map((line) => (
                    <li key={line} className="flex gap-2 text-[12.5px] leading-relaxed text-dim">
                      <Icon n="check" className="mt-1 size-3 shrink-0 text-brand" sw={2.4} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(x.id)}
                  className={`mt-4 rounded-xl px-3 py-2 text-[12.5px] font-bold transition ${on ? 'bg-brand text-brandink' : 'border border-line bg-bg/50 text-ink hover:border-brand/40'}`}
                >
                  {on ? t('b2b.selected') : t('b2b.choose')}
                </button>
              </article>
            )
          })}
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ---------------- ما يحدث فعلًا ---------------- */}
          <Reveal>
            <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6" data-b2b-flow>
              <h2 className="text-[16px] font-extrabold text-ink">{t('b2b.flowTitle')}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{t('b2b.flowSub')}</p>
              <ol className="mt-5 space-y-4">
                {[
                  ['1', t('b2b.s1t'), t('b2b.s1d')],
                  ['2', t('b2b.s2t'), t('b2b.s2d')],
                  ['3', t('b2b.s3t'), t('b2b.s3d')],
                  ['4', t('b2b.s4t'), t('b2b.s4d')],
                ].map(([n, h, d]) => (
                  <li key={n} className="flex gap-3.5">
                    <span className="num grid size-7 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-[12px] font-extrabold text-brand">
                      {n}
                    </span>
                    <div>
                      <p className="text-[13.5px] font-bold text-ink">{h}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-2xl border border-line bg-bg/50 p-3.5 text-[12px] leading-relaxed text-dim">
                {t('b2b.termsNote').replace('{m}', num(B2B_TERM_MONTHS))}
              </p>
            </section>
          </Reveal>

          {/* ---------------- طلب العقد ---------------- */}
          <section className="rounded-3xl border border-line bg-panel p-5" data-b2b-request>
            <h2 className="text-[15px] font-extrabold text-ink">{t('b2b.reqTitle')}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('b2b.reqSub')}</p>
            <div className="mt-4 space-y-3">
              <Field id="b2b-org" label={t('b2b.org')} value={form.org} onChange={set('org')} placeholder={t('b2b.orgPh')} />
              <Field
                id="b2b-email"
                label={t('b2b.email')}
                value={form.email}
                onChange={set('email')}
                type="email"
                placeholder="careers@university.edu.sa"
              />
              <Field
                id="b2b-seats"
                label={t('b2b.seats')}
                value={form.seats}
                onChange={set('seats')}
                inputMode="numeric"
                placeholder={String(tier.seats)}
                hint={t('b2b.seatsHint').replace('{n}', num(tier.seats))}
              />
              <div>
                <label htmlFor="b2b-note" className="block text-[12px] font-semibold text-dim">
                  {t('b2b.note')}
                </label>
                <textarea
                  id="b2b-note"
                  dir="auto"
                  rows={3}
                  value={form.note}
                  onChange={set('note')}
                  placeholder={t('b2b.notePh')}
                  className="mt-1.5 w-full resize-y rounded-xl border border-line bg-bg/60 p-2.5 text-[13px] leading-relaxed text-ink outline-none transition focus:border-brand/50"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              <Btn href={mailto} size="md" className="w-full">
                <Icon n="mail" className="size-4" />
                {t('b2b.send')}
              </Btn>
              <p className="text-[11.5px] leading-relaxed text-dim">{t('b2b.mailNote').replace('{mail}', SUPPORT_MAIL)}</p>
              <p className="num text-[11.5px] text-dim/80">
                {t('b2b.pick')} {L(tier.name)} · {num(tier.seats)} {t('b2b.seatsUnit')} · {num(tier.price)}
              </p>
            </div>
          </section>
        </div>

        {/* ---------------- الطالب: استبدال المقعد ---------------- */}
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6" data-b2b-redeem>
            <div className="flex items-start gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand">
                <Icon n="lock" className="size-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-extrabold text-ink">{t('b2b.redTitle')}</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('b2b.redSub')}</p>
              </div>
            </div>

            {!rest ? (
              <div className="mt-4 rounded-2xl border border-gold/35 bg-gold/8 p-3.5">
                <p className="text-[12.5px] font-bold text-ink">{t('b2b.localTitle')}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('b2b.localWhy')}</p>
                <Btn
                  href={`${SUPPORT_MAILTO}?subject=${encodeURIComponent(t('b2b.localSubject'))}&body=${encodeURIComponent(`${normalizeCode(red.code) || '—'} · ${red.email || '—'}`)}`}
                  variant="outline"
                  size="xs"
                  className="mt-2.5"
                >
                  <Icon n="mail" className="size-3.5" />
                  {t('b2b.localAsk')}
                </Btn>
              </div>
            ) : redState.phase === 'done' && redState.order ? (
              <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/8 p-4" data-b2b-done>
                <p className="text-[13.5px] font-extrabold text-ink">{t('b2b.doneTitle')}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('b2b.doneSub').replace('{n}', num(redState.left ?? 0))}</p>
                <p className="num mt-3 rounded-xl border border-line bg-bg/60 p-2.5 font-mono text-[12.5px] text-ink">{redState.order.key}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Btn to={`/order?id=${redState.order.id}`} size="xs">
                    {t('b2b.doneGo')}
                  </Btn>
                  <Btn to="/ats" variant="outline" size="xs">
                    {t('b2b.doneAts')}
                  </Btn>
                </div>
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={redeem} data-b2b-red-form>
                <Field
                  id="b2b-code"
                  label={t('b2b.code')}
                  value={red.code}
                  onChange={(e) => setRed({ ...red, code: e.target.value })}
                  placeholder="QALB-XXXX-XXXX"
                  dir="ltr"
                  autoCap="characters"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    id="b2b-remail"
                    label={t('b2b.remail')}
                    value={red.email}
                    onChange={(e) => setRed({ ...red, email: e.target.value })}
                    type="email"
                    placeholder="name@university.edu.sa"
                  />
                  <Field
                    id="b2b-rname"
                    label={t('b2b.rname')}
                    value={red.name}
                    onChange={(e) => setRed({ ...red, name: e.target.value })}
                    placeholder={t('b2b.rnamePh')}
                  />
                </div>
                <div>
                  <label htmlFor="b2b-template" className="block text-[12px] font-semibold text-dim">
                    {t('b2b.template')}
                  </label>
                  <select
                    id="b2b-template"
                    value={red.template}
                    onChange={(e) => setRed({ ...red, template: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-line bg-bg/60 p-2.5 text-[13px] text-ink outline-none focus:border-brand/50"
                  >
                    {SEAT_TEMPLATES.map((x) => (
                      <option key={x.id} value={x.id}>
                        {L(x.name)} · {num(x.price)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11.5px] text-dim">{t('b2b.templateNote')}</p>
                </div>
                {redState.phase === 'bad' && <Err text={redState.why === 'email' ? t('b2b.errEmail') : t('b2b.errName')} />}
                {redState.phase === 'error' && <Err text={errText(t, redState.why)} />}
                <Btn size="md" className="w-full" disabled={redState.phase === 'busy'}>
                  {redState.phase === 'busy' ? t('b2b.busy') : t('b2b.redeem')}
                </Btn>
                <p className="text-[11.5px] leading-relaxed text-dim">{t('b2b.redeemNote')}</p>
              </form>
            )}
          </section>

          <div className="space-y-5">
            {/* ---------------- الجهة: كم بقي من مقاعدها ---------------- */}
            <section className="rounded-3xl border border-line bg-panel p-5" data-b2b-seats>
              <h2 className="text-[15px] font-extrabold text-ink">{t('b2b.checkTitle')}</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('b2b.checkSub')}</p>
              {!rest ? (
                <p className="mt-3.5 rounded-2xl border border-line bg-bg/50 p-3 text-[12.5px] leading-relaxed text-dim">{t('b2b.checkLocal')}</p>
              ) : (
                <form className="mt-3.5 space-y-2.5" onSubmit={seats}>
                  <Field
                    id="b2b-ask"
                    label={t('b2b.code')}
                    value={ask.code}
                    onChange={(e) => setAsk({ ...ask, code: e.target.value })}
                    placeholder="QALB-XXXX-XXXX"
                    dir="ltr"
                  />
                  <Btn variant="outline" size="sm" className="w-full" disabled={ask.phase === 'busy'}>
                    {ask.phase === 'busy' ? t('b2b.busy') : t('b2b.check')}
                  </Btn>
                  {ask.phase === 'done' && ask.data && (
                    <dl className="mt-1 grid grid-cols-2 gap-2" data-b2b-seats-out>
                      {[
                        [t('b2b.kSeats'), num(ask.data.seats)],
                        [t('b2b.kUsed'), num(ask.data.used)],
                        [t('b2b.kLeft'), num(ask.data.left)],
                        [t('b2b.kExpires'), ask.data.expires],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-xl border border-line bg-bg/50 px-2.5 py-2">
                          <dt className="text-[10.5px] text-dim">{k}</dt>
                          <dd className="num text-[13px] font-bold text-ink">{v}</dd>
                        </div>
                      ))}
                      <div className="col-span-2 rounded-xl border border-line bg-bg/50 px-2.5 py-2">
                        <dt className="text-[10.5px] text-dim">{t('b2b.kTemplates')}</dt>
                        <dd className="text-[12.5px] text-ink">{(ask.data.templates || []).join(' · ') || t('b2b.kNone')}</dd>
                      </div>
                      <p className="col-span-2 text-[11px] leading-relaxed text-dim/80">{t('b2b.checkNoNames')}</p>
                    </dl>
                  )}
                  {ask.phase === 'error' && <Err text={ask.data === 'no such code' ? t('b2b.errNoCode') : t('b2b.errGeneric')} />}
                </form>
              )}
            </section>

            <section className="rounded-3xl border border-brand/25 bg-brand/[0.06] p-5" data-b2b-ats>
              <p className="text-[14px] font-extrabold text-ink">{t('b2b.atsTitle')}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('b2b.atsSub')}</p>
              <Btn to="/ats" variant="dark" size="sm" className="mt-3.5">
                <Icon n="scan" className="size-4" />
                {t('b2b.atsCta')}
              </Btn>
            </section>
          </div>
        </div>

        {/* ---------------- الأسئلة ---------------- */}
        <Reveal className="mt-14 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7">
          <h2 className="text-[16px] font-extrabold text-ink">{t('b2b.faqTitle')}</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {faq.map(([q, a]) => (
              <div key={q}>
                <dt className="text-[13px] font-bold text-ink">{q}</dt>
                <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[12.5px] leading-relaxed text-dim">
            {t('b2b.foot')}{' '}
            <Link to="/legal#privacy" className="font-bold text-brand hover:underline">
              {t('b2b.footLink')}
            </Link>
          </p>
        </Reveal>
      </div>
    </div>
  )
}

function Err({ text }) {
  return (
    <p role="alert" className="rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-[12px] leading-relaxed text-ink">
      {text}
    </p>
  )
}

function Field({ id, label, value, onChange, type = 'text', placeholder, hint, dir, inputMode, autoCap }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="block text-[12px] font-semibold text-dim">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        dir={dir}
        inputMode={inputMode}
        autoCapitalize={autoCap}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-line bg-bg/60 p-2.5 text-[13px] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50"
      />
      {hint && <span className="mt-1 block text-[11px] text-dim/80">{hint}</span>}
    </label>
  )
}
