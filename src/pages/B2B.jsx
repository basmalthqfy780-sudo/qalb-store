import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { orgs } from '../api/orgs'
import { leads } from '../api/leads'
import {
  B2B_TERM_MONTHS,
  B2B_TIERS,
  SEAT_TEMPLATES,
  normalizeCode,
  perSeat,
  perSeatVsBundle,
  seatBundle,
  seatRetailBand,
  tierForSeats,
  COHORT_MAX,
} from '../data/b2b'
import { SUPPORT_MAIL, SUPPORT_MAILTO, SUPPORT_PHONE } from '../data/contact'
import { COMPANY, isSet, quoteMissing } from '../data/company'
import { leadMailto, normalizeLead, quoteMath } from '../data/leads'
import { ATS_TARGET, analyzeAts } from '../data/ats'
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

/** الفاصل بين سيرةٍ وأخرى في مقياس الدفعة — سطرٌ فيه ثلاثُ شرطات */
const COHORT_SPLIT = /^\s*-{3,}\s*$/m

/**
 * طبقة المؤسسات: عقدٌ سنويٌّ بمقاعد، الطالب يستبدل مقعدًا فلا يدفع.
 * كل رقم هنا مقروء من B2B_TIERS ومن أسعار القوالب؛ وما هو بشري (العقد والفاتورة
 * وإصدار الرمز وتثبيت الخصم) مكتوبٌ أنه بشري — لا زرّ «تم إنشاء العقد».
 */
export default function B2B() {
  const { t, L, lang } = useI18n()
  const [picked, setPicked] = useState(B2B_TIERS[0].id)
  const [form, setForm] = useState({ org: '', email: '', contact: '', phone: '', seats: '', slots: '', note: '', etimad: false })
  const [send, setSend] = useState({ phase: 'idle', where: '', quote: '', errors: {} })
  const [red, setRed] = useState({ code: '', email: '', name: '', template: SEAT_TEMPLATES[0].id })
  const [redState, setRedState] = useState({ phase: 'idle', why: '', order: null })
  const [ask, setAsk] = useState({ code: '', phase: 'idle', data: null })
  const [cohort, setCohort] = useState('')

  const tier = B2B_TIERS.find((x) => x.id === picked) || B2B_TIERS[0]
  const rest = orgs.mode === 'rest'
  const band = seatRetailBand()
  const bundle = seatBundle()

  /* الطلبُ يُبنى مرةً واحدة: نفس الكائن يُحفظ، ونفسه يُطبع في عرض السعر، ونفسه في نصّ البريد */
  const prepared = useMemo(() => normalizeLead({ ...form, tier: picked, lang }, { tiers: B2B_TIERS, now: new Date() }), [form, picked, lang])
  const money = useMemo(() => quoteMath({ ...prepared.value, seats: prepared.ok ? prepared.value.seats : tier.seats }, tier), [prepared, tier])
  const mailto = prepared.ok ? leadMailto(prepared.value, money) : SUPPORT_MAILTO
  const missing = quoteMissing()

  const faq = [
    [t('b2b.q1'), t('b2b.a1', { n: num(SEAT_TEMPLATES.length) })],
    [t('b2b.q2'), t('b2b.a2')],
    [t('b2b.q3'), t('b2b.a3')],
    [t('b2b.q4'), t('b2b.a4')],
    [t('b2b.q5'), t('b2b.a5')],
  ]
  useSeo(`${t('b2b.title')} · ${t('brand.name')}`, t('meta.b2bDesc'), {
    jsonLd: orgLd({ tiers: B2B_TIERS, faq, lang, t }),
    type: 'website',
  })

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [k]: v })
    if (send.phase !== 'idle') setSend({ ...send, phase: 'idle', errors: {} })
  }

  /* ——— الحفظ: دفترُ الخادم حيث يوجد، وإلا دفترُ هذا المتصفح، والبريدُ باقٍ خيارًا ——— */
  async function submit(e) {
    e.preventDefault()
    if (!prepared.ok) return setSend({ phase: 'bad', where: '', quote: '', errors: prepared.errors })
    setSend({ phase: 'busy', where: '', quote: '', errors: {} })
    const r = await leads.submit(prepared.value)
    if (r.status === 201 || r.status === 200) {
      return setSend({ phase: 'saved', where: r.body?.where || 'ledger', quote: r.body?.quote || prepared.value.quote, errors: {} })
    }
    if (r.status === 429) return setSend({ phase: 'wait', where: 'none', quote: prepared.value.quote, errors: {} })
    return setSend({ phase: 'error', where: 'none', quote: prepared.value.quote, errors: {} })
  }

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

  /* ——— الدفعة تُقاس، لا تُوصف: نفس سكربت الفحص، على نصوصٍ كثيرة ——— */
  const cohortResults = useMemo(() => {
    const parts = String(cohort)
      .split(COHORT_SPLIT)
      .map((x) => x.trim())
      .filter((x) => x.length > 40)
    if (!parts.length) return null
    const capped = parts.length > COHORT_MAX
    const rows = (capped ? parts.slice(0, COHORT_MAX) : parts).map((text, i) => {
      const r = analyzeAts(text)
      return { n: i + 1, score: r.score, gaps: r.gaps.length, words: r.words }
    })
    const avg = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
    const pass = rows.filter((r) => r.score >= ATS_TARGET.pass).length
    return { rows, avg, pass, count: rows.length, below: rows.length - pass, capped, seen: parts.length }
  }, [cohort])

  const cohortCsv = useMemo(() => {
    if (!cohortResults) return ''
    return ['member,score,pass,gaps,words']
      .concat(cohortResults.rows.map((r) => `${r.n},${r.score},${r.score >= ATS_TARGET.pass ? 'yes' : 'no'},${r.gaps},${r.words}`))
      .join('\n')
  }, [cohortResults])

  function downloadCohort() {
    if (!cohortCsv) return
    const url = URL.createObjectURL(new Blob([cohortCsv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `qalb-cohort-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-b2b-tiers data-no-print>
          {B2B_TIERS.map((x) => {
            const on = x.id === picked
            const save = perSeatVsBundle(x)
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
                  {t('b2b.perSeat')} {num(perSeat(x))} · {t('b2b.retailRange')} {num(band.min)}–{num(band.max)}
                </p>
                {/* الحسبةُ مكتوبةٌ لا مُضمَرة: من قارن بأرخص قالبٍ أخطأ المرجع */}
                <p
                  className="mt-1.5 rounded-xl border border-brand/25 bg-brand/[0.07] p-2 text-[11.5px] leading-relaxed text-dim"
                  data-b2b-savings={x.id}
                >
                  {t('b2b.vsBundle')
                    .replace('{name}', L(bundle?.name || ''))
                    .replace('{price}', num(Number(bundle?.price) || 0))
                    .replace('{pct}', num(save))}
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
        <p className="mt-3 text-[12px] leading-relaxed text-dim" data-b2b-vat data-no-print>
          <Icon n="bank" className="me-1 inline size-3.5 align-[-2px] text-brand" />
          {t('b2b.vatNote').replace('{pct}', '١٥٪').replace('{n}', num(band.count))}
        </p>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ---------------- ما يحدث فعلًا ---------------- */}
          <Reveal>
            <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6" data-b2b-flow data-no-print>
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
              {/* اعتماد: نقولُها قبل أن يكتشفها أحدٌ في آخر أسبوع من الميزانية */}
              <p className="mt-2.5 rounded-2xl border border-gold/35 bg-gold/8 p-3.5 text-[12px] leading-relaxed text-dim" data-b2b-etimad>
                {COMPANY.etimad === 'none' ? t('b2b.etimadNone') : t('b2b.etimadListed').replace('{id}', String(COMPANY.etimad))}
              </p>
            </section>
          </Reveal>

          {/* ---------------- طلب العقد ---------------- */}
          <section className="rounded-3xl border border-line bg-panel p-5" data-b2b-request data-no-print>
            <h2 className="text-[15px] font-extrabold text-ink">{t('b2b.reqTitle')}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('b2b.reqSub')}</p>
            <form className="mt-4 space-y-3" onSubmit={submit} noValidate>
              <Field id="b2b-org" label={t('b2b.org')} value={form.org} onChange={set('org')} placeholder={t('b2b.orgPh')} bad={send.errors.org} />
              <Field
                id="b2b-email"
                label={t('b2b.email')}
                value={form.email}
                onChange={set('email')}
                type="email"
                placeholder="careers@university.edu.sa"
                bad={send.errors.email}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="b2b-contact" label={t('b2b.contact')} value={form.contact} onChange={set('contact')} placeholder={t('b2b.contactPh')} />
                <Field
                  id="b2b-phone"
                  label={t('b2b.phone')}
                  value={form.phone}
                  onChange={set('phone')}
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="+966 5X XXX XXXX"
                  optional={t('b2b.optional')}
                />
              </div>
              <Field
                id="b2b-seats"
                label={t('b2b.seats')}
                value={form.seats}
                onChange={set('seats')}
                inputMode="numeric"
                placeholder={String(tier.seats)}
                hint={t('b2b.seatsHint').replace('{n}', num(tier.seats))}
                bad={send.errors.seats}
              />
              <Field
                id="b2b-slots"
                label={t('b2b.slots')}
                value={form.slots}
                onChange={set('slots')}
                placeholder={t('b2b.slotsPh')}
                optional={t('b2b.optional')}
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
              <label className="flex items-start gap-2.5 rounded-xl border border-line bg-bg/50 p-2.5 text-[12px] leading-relaxed text-dim">
                <input type="checkbox" checked={form.etimad} onChange={set('etimad')} className="mt-0.5 size-4 shrink-0 accent-brand" />
                <span>{t('b2b.etimadAsk')}</span>
              </label>

              {send.phase === 'bad' && <Err text={t('b2b.errFields')} />}
              {send.phase === 'saved' && (
                <p role="status" className="rounded-xl border border-brand/30 bg-brand/8 p-2.5 text-[12px] leading-relaxed text-ink" data-b2b-saved>
                  {send.where === 'ledger' ? t('b2b.savedLedger').replace('{q}', send.quote) : t('b2b.savedLocal').replace('{q}', send.quote)}
                </p>
              )}
              {send.phase === 'wait' && <Err text={t('b2b.savedWait')} />}
              {send.phase === 'error' && <Err text={t('b2b.savedNone').replace('{q}', prepared.value?.quote || '')} />}

              <Btn size="md" type="submit" className="w-full" disabled={send.phase === 'busy'}>
                {send.phase === 'busy' ? t('b2b.busy') : t('b2b.send')}
              </Btn>
            </form>

            <div className="mt-2.5 space-y-2.5">
              <Btn href={mailto} variant="outline" size="sm" className="w-full">
                <Icon n="mail" className="size-3.5" />
                {t('b2b.mailAlso')}
              </Btn>
              {isSet(SUPPORT_PHONE) ? (
                <a
                  href={`tel:${String(SUPPORT_PHONE).replace(/[^\d+]/g, '')}`}
                  className="num flex items-center justify-center gap-1.5 rounded-xl border border-line bg-bg/40 px-3 py-2 text-[12.5px] font-bold text-ink transition hover:border-brand/40"
                >
                  <Icon n="phone" className="size-3.5" />
                  {SUPPORT_PHONE}
                </a>
              ) : null}
              <p className="text-[11.5px] leading-relaxed text-dim">
                {rest ? t('b2b.mailNote').replace('{mail}', SUPPORT_MAIL) : t('b2b.mailNoteLocal').replace('{mail}', SUPPORT_MAIL)}
              </p>
              <p className="num text-[11.5px] text-dim/80">
                {t('b2b.pick')} {L(tier.name)} · {num(money.seats)} {t('b2b.seatsUnit')} · {num(tier.price)}
              </p>
            </div>
          </section>
        </div>

        {/* ---------------- عرض السعر: ورقةٌ تحمل ما تطلبه المشتريات ---------------- */}
        <section className="sheet-quote mt-6 rounded-3xl border border-line bg-panel p-5 sm:p-6" data-b2b-quote>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-brand">{t('b2b.quoteKicker')}</p>
              <h2 className="mt-1 font-display text-[19px] font-extrabold text-ink">{t('b2b.quoteTitle')}</h2>
              <p className="mt-1 max-w-[64ch] text-[12.5px] leading-relaxed text-dim">{t('b2b.quoteSub')}</p>
            </div>
            <div className="text-end" data-no-print>
              {/* لا بيئةَ تضمن الطباعة: الاستدعاءُ خلف فحصٍ كي لا يرمي الزرُّ في متصفحٍ بلا print */}
              <Btn variant="outline" size="sm" onClick={() => typeof window.print === 'function' && window.print()}>
                <Icon n="file" className="size-3.5" />
                {t('b2b.quotePrint')}
              </Btn>
              <p className="mt-1.5 text-[11px] text-dim">{t('b2b.quotePdfNote')}</p>
            </div>
          </div>

          <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-b2b-quote-head>
            {[
              [t('b2b.quoteNo'), prepared.value?.quote || '—'],
              [t('b2b.quoteDate'), money.date],
              [t('b2b.quoteValid'), `${t('b2b.quoteValidN')} ${money.validUntil}`],
              [t('b2b.quoteParty'), prepared.value?.org || t('b2b.quotePartyPh')],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-bg/50 px-3 py-2">
                <dt className="text-[10.5px] text-dim">{k}</dt>
                <dd className="num mt-0.5 text-[13px] font-bold text-ink" dir="auto">
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-start text-[11px] text-dim">
                  <th className="py-2 pe-3 text-start font-semibold">{t('b2b.quoteDesc')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('b2b.quoteSeats')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('b2b.quoteUnit')}</th>
                  <th className="py-2 ps-3 text-end font-semibold">{t('b2b.quoteLineTotal')}</th>
                </tr>
              </thead>
              <tbody className="num">
                <tr className="border-b border-line/60">
                  <td className="py-2.5 pe-3 text-[12.5px] font-semibold text-ink" dir="auto">
                    {L(tier.name)} · {lang === 'ar' ? 'مقاعد سنوية' : 'annual seats'}
                  </td>
                  <td className="px-3 py-2.5 text-end">{num(money.seats)}</td>
                  <td className="px-3 py-2.5 text-end">{num(money.unitIncl)}</td>
                  <td className="py-2.5 ps-3 text-end font-bold">{num(money.totalIncl)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3" data-b2b-quote-math>
            {[
              [t('b2b.quoteBase'), money.base],
              [t('b2b.quoteVat'), money.vat],
              [t('b2b.quoteTotal'), money.total],
            ].map(([k, v], i) => (
              <p key={k} className={`rounded-xl border px-3 py-2 ${i === 2 ? 'border-brand/35 bg-brand/8' : 'border-line bg-bg/50'}`}>
                <span className="block text-[10.5px] text-dim">{k}</span>
                <span className="num mt-0.5 block text-[14px] font-extrabold text-ink">{num(v)}</span>
              </p>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{t('b2b.quoteMathNote').replace('{pct}', '١٥٪')}</p>

          {/* ترويسةُ الجهةِ النظامية: ما وُثّق يُطبع، وما لم يُوثّق يُسمَّى — لا رقمٌ مفبرك */}
          <dl className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3" data-b2b-quote-co>
            {[
              [t('b2b.coLegal'), COMPANY.legalName],
              [t('b2b.coCr'), COMPANY.crNumber],
              [t('b2b.coVat'), COMPANY.vatNumber],
              [t('b2b.coIban'), COMPANY.iban],
              [t('b2b.coBank'), COMPANY.bank],
              [t('b2b.coMail'), SUPPORT_MAIL],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-bg/40 px-3 py-2" data-quote-field={String(k)}>
                <dt className="text-[10.5px] text-dim">{k}</dt>
                <dd className={`num mt-0.5 text-[12.5px] font-semibold ${isSet(v) ? 'text-ink' : 'text-gold'}`} dir="ltr">
                  {isSet(v) ? v : t('b2b.quoteUnverified')}
                </dd>
              </div>
            ))}
          </dl>
          {missing.length ? (
            <p className="mt-2 rounded-xl border border-gold/35 bg-gold/8 p-2.5 text-[11.5px] leading-relaxed text-dim" data-b2b-quote-todo>
              {t('b2b.quoteTodo').replace('{fields}', missing.join(lang === 'ar' ? '، ' : ', '))}
            </p>
          ) : (
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim" data-b2b-quote-todo>
              {t('b2b.quoteDone')}
            </p>
          )}
          {isSet(COMPANY.bookingUrl) ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim" data-b2b-quote-call>
              {t('b2b.quoteCall')}{' '}
              <a href={COMPANY.bookingUrl} className="font-bold text-brand hover:underline" target="_blank" rel="noreferrer">
                {t('b2b.quoteBook')}
              </a>
            </p>
          ) : null}
        </section>

        {/* ---------------- الدفعة تُقاس: الفاحص أداةُ قياسٍ لا شعار ---------------- */}
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]" data-no-print>
          <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6" data-b2b-cohort>
            <h2 className="text-[16px] font-extrabold text-ink">{t('b2b.cohortTitle')}</h2>
            <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-dim">{t('b2b.cohortSub')}</p>
            <textarea
              dir="auto"
              rows={6}
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              placeholder={t('b2b.cohortPh')}
              aria-label={t('b2b.cohortTitle')}
              className="mt-3.5 w-full resize-y rounded-xl border border-line bg-bg/60 p-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none transition focus:border-brand/50"
            />
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] leading-relaxed text-dim">
              <Icon n="shield" className="size-3.5 text-brand" />
              {t('b2b.cohortNote').replace('{n}', String(ATS_TARGET.pass))}
            </p>
            {cohortResults?.capped ? (
              <p className="mt-2 text-[11.5px] leading-relaxed text-dim" data-b2b-cohort-cap>
                <Icon n="pulse" className="me-1 inline size-3.5 align-[-2px] text-brand" />
                {t('b2b.cohortCapped').replace('{n}', num(COHORT_MAX)).replace('{all}', num(cohortResults.seen))}
              </p>
            ) : null}

            {cohortResults ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-4" data-b2b-cohort-out>
                {[
                  [t('b2b.cohortCount'), num(cohortResults.count)],
                  [t('b2b.cohortAvg'), num(cohortResults.avg)],
                  [t('b2b.cohortPass'), `${num(cohortResults.pass)}/${num(cohortResults.count)}`],
                  [t('b2b.cohortBelow'), num(cohortResults.below)],
                ].map(([k, v]) => (
                  <p key={k} className="rounded-xl border border-line bg-bg/50 px-3 py-2">
                    <span className="block text-[10.5px] text-dim">{k}</span>
                    <span className="num mt-0.5 block text-[16px] font-extrabold text-ink">{v}</span>
                  </p>
                ))}
                <p className="sm:col-span-4 text-[11.5px] leading-relaxed text-dim">{t('b2b.cohortScale').replace('{n}', num(ATS_TARGET.pass))}</p>
                <Btn variant="outline" size="sm" onClick={downloadCohort} className="sm:col-span-2">
                  <Icon n="download" className="size-3.5" />
                  {t('b2b.cohortCsv')}
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setCohort('')} className="sm:col-span-2">
                  {t('b2b.cohortClear')}
                </Btn>
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-dim/80">{t('b2b.cohortEmpty')}</p>
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

        {/* ---------------- الطالب: استبدال المقعد + حاسبةُ عددٍ لا يوافق باقة ---------------- */}
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]" data-b2b-red-wrap data-no-print>
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
                  <p className="mt-1.5 text-[11.5px] text-dim">{t('b2b.templateNote', { n: num(SEAT_TEMPLATES.length) })}</p>
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

          {/* عددٌ لا يوافق باقةً؟ التقريبُ إلى ما يسعك، ويُقال لك السعرُ لا يُخترَع */}
          <section className="rounded-3xl border border-line bg-panel p-5" data-b2b-round>
            <h2 className="text-[15px] font-extrabold text-ink">{t('b2b.roundTitle')}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('b2b.roundSub')}</p>
            <Field
              id="b2b-round-seats"
              label={t('b2b.seats')}
              value={form.seats}
              onChange={set('seats')}
              inputMode="numeric"
              placeholder={String(tier.seats)}
              dir="ltr"
            />
            {(() => {
              const want = Math.round(Number(String(form.seats).replace(/[^\d]/g, '')) || 0)
              if (want < 1) return <p className="mt-3 text-[12px] text-dim/80">{t('b2b.roundEmpty').replace('{n}', num(B2B_TIERS[0].seats))}</p>
              const fit = tierForSeats(want)
              return (
                <div className="mt-3 space-y-2" data-b2b-round-out>
                  <p className="rounded-xl border border-line bg-bg/50 px-3 py-2 text-[12.5px] leading-relaxed text-ink" dir="auto">
                    {L(fit.tier.name)} · <span className="num">{num(fit.tier.seats)}</span> {t('b2b.seatsUnit')} —{' '}
                    <Money v={fit.tier.price} size="text-[13px]" />
                  </p>
                  <p className="num text-[11.5px] leading-relaxed text-dim">
                    {t('b2b.roundSeat')} {num(perSeat(fit.tier))} ·{' '}
                    {t('b2b.vsBundle')
                      .replace('{name}', L(bundle?.name || ''))
                      .replace('{price}', num(Number(bundle?.price) || 0))
                      .replace('{pct}', num(perSeatVsBundle(fit.tier)))}
                  </p>
                  <p className="text-[11.5px] leading-relaxed text-dim">
                    {fit.over > 0 ? t('b2b.roundOver').replace('{n}', num(fit.over)) : t('b2b.roundUnder').replace('{n}', num(fit.under))}
                  </p>
                  <Btn variant="outline" size="xs" onClick={() => setPicked(fit.tier.id)}>
                    {t('b2b.roundPick')}
                  </Btn>
                </div>
              )
            })()}
          </section>
        </div>

        {/* ---------------- الأسئلة ---------------- */}
        <Reveal className="mt-14 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7" data-no-print>
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

function Field({ id, label, value, onChange, type = 'text', placeholder, hint, dir, inputMode, autoCap, optional, bad }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="block text-[12px] font-semibold text-dim">
        {label}
        {optional ? <span className="ms-1 text-[10.5px] font-normal text-dim/70">· {optional}</span> : null}
      </span>
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
        className={`mt-1.5 w-full rounded-xl border bg-bg/60 p-2.5 text-[13px] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50 ${bad ? 'border-gold/60' : 'border-line'}`}
      />
      {hint && <span className="mt-1 block text-[11px] text-dim/80">{hint}</span>}
    </label>
  )
}
