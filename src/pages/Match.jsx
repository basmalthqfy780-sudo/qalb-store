import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { num, useI18n } from '../i18n'
import { MATCH_BANDS, MATCH_DEMO_JOB, editPoints, fieldOf, fieldLabel, matchCv, matchReport, pickTemplates } from '../data/match'
import { ATS_DEMO } from '../data/ats'
import { matchUpsells } from '../data/upsells'
import { MARKET_CITIES, MARKET_FIELDS, saveSignal } from '../data/market'
import { templates } from '../data/templates'
import { useStore } from '../store/StoreContext'
import { toolLd, useSeo } from '../components/Seo'
import ShareCard from '../components/ShareCard'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/**
 * مطابقةُ السيرة بإعلان الوظيفة — الفحصُ الأول مجاني (النسبة وحدها)، والتقريرُ
 * المفصّل (الكلمات الناقصة + نقاط التعديل + القالب المناسب) يُباع مفردًا أو خمسة.
 *
 * لماذا النسبةُ مجانية؟ لأنها وحدها تكفي لتجربةٍ صادقة: من رأى ٤٤٪ عرف أن سيرته
 * لا تُقرأ بلغةِ هذا الإعلان، والذي يبيعُ ليس الرقمُ بل ما بعده — الكلماتُ بعينها
 * والسطرُ الذي يُكتب مكانها. لذلك تُقفَل المفرداتُ نفسها لا النتيجة.
 *
 * ولا شيء مما يُلصق هنا يخرج من المتصفح: لا حساب، ولا رفع، ولا حفظ لنصِّ السيرة.
 */
export default function Match() {
  const { t, lang, L } = useI18n()
  const { toggleAddon, hasAddon, toast } = useStore()
  const [cv, setCv] = useState('')
  const [job, setJob] = useState('')
  const [note, setNote] = useState('')
  const [survey, setSurvey] = useState({ field: '', city: '', interview: '', template: '', months: '' })
  const [asked, setAsked] = useState(false)

  const res = useMemo(() => matchCv(cv, job), [cv, job])
  const scored = cv.trim().length > 80 && job.trim().length > 40
  const field = useMemo(() => fieldOf(job), [job])
  const picks = useMemo(() => (scored ? pickTemplates(job, { n: 3 }) : []), [job, scored])
  const edits = useMemo(() => (scored ? editPoints(res, { lang, n: 3 }) : []), [res, lang, scored])
  const report = useMemo(() => (scored ? matchReport(res, { lang }) : ''), [res, lang, scored])
  const ups = matchUpsells()
  const one = ups.find((u) => u.id === 'match-report') || ups[0]
  const five = ups.find((u) => u.id === 'match-5') || ups[1]

  const faq = [
    [t('match.q1'), t('match.a1')],
    [t('match.q2'), t('match.a2')],
    [t('match.q3'), t('match.a3')],
  ]
  useSeo(`${t('match.title')} · ${t('brand.name')}`, t('meta.matchDesc'), {
    jsonLd: toolLd({ name: `${t('match.title')} · ${t('brand.name')}`, desc: t('meta.matchDesc'), path: '/match', faq }),
  })

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(report)
      setNote(t('match.copied'))
    } catch {
      setNote(t('match.copyBlocked'))
    }
  }
  function save() {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `qalb-match-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    setNote(t('match.saved'))
  }

  function sendSurvey() {
    const r = saveSignal({
      field: survey.field,
      city: survey.city,
      interview: survey.interview === 'yes' ? true : survey.interview === 'no' ? false : null,
      template: survey.template,
      months: survey.months,
    })
    if (r.ok) setAsked(true)
    else setNote(t('market.needOne'))
  }

  const bandTone = !scored ? 'text-dim' : res.score >= 80 ? 'text-brand' : res.score >= 60 ? 'text-gold' : 'text-gold'

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1120px] py-13 sm:py-16">
        <Head
          as="h1"
          kicker={t('match.kicker')}
          title={t('match.title')}
          sub={t('match.sub')}
          right={
            <Pill tone="brand" className="max-w-full">
              <Icon n="shield" className="size-3" />
              {t('match.privacy')}
            </Pill>
          }
        />

        <div className="mt-9 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]">
          {/* ------------------------------ المدخلان ------------------------------ */}
          <section className="rounded-3xl border border-line bg-panel p-4 sm:p-5" data-match-input>
            <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3.5">
              <span className="text-[12.5px] font-semibold text-dim">{t('match.inputs')}</span>
              <div className="ms-auto flex flex-wrap items-center gap-1">
                <Btn variant="ghost" size="xs" onClick={() => setCv(ATS_DEMO)}>
                  {/* Lucide "file-text" — SVG صريح لا رمز Unicode */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                  {t('match.demoCv')}
                </Btn>
                <Btn variant="ghost" size="xs" onClick={() => setJob(MATCH_DEMO_JOB)}>
                  {/* Lucide "briefcase" — SVG صريح لا رمز Unicode */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
                  {t('match.demoJob')}
                </Btn>
                <Btn
                  variant="ghost"
                  size="xs"
                  disabled={!cv && !job}
                  onClick={() => {
                    setCv('')
                    setJob('')
                    setNote('')
                    setAsked(false)
                  }}
                >
                  <Icon n="refresh" className="size-3.5" />
                  {t('match.clear')}
                </Btn>
              </div>
            </div>

            <label className="mt-3.5 block text-[12px] font-bold text-ink" htmlFor="m-cv">
              {t('match.cvLabel')}
            </label>
            <textarea
              id="m-cv"
              dir="auto"
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={t('match.cvPh')}
              className="mt-1.5 w-full resize-y rounded-2xl border border-line bg-bg/60 p-3.5 text-[13.5px] leading-[1.85] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50"
            />

            <label className="mt-4 block text-[12px] font-bold text-ink" htmlFor="m-job">
              {t('match.jobLabel')}
            </label>
            <textarea
              id="m-job"
              dir="auto"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={t('match.jobPh')}
              className="mt-1.5 w-full resize-y rounded-2xl border border-line bg-bg/60 p-3.5 text-[13.5px] leading-[1.85] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50"
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11.5px] text-dim">
              <span className="num font-semibold text-ink">
                {num(cv.trim().split(/\s+/).filter(Boolean).length)} {t('match.cvWords')}
              </span>
              <span className="num">
                {num(res.keywords)} {t('match.jobTerms')}
              </span>
              {scored && field && (
                <span className="ms-auto rounded-lg border border-line bg-bg/60 px-2 py-1 font-semibold" data-match-field>
                  {t('match.pickedFor')}: {L(fieldLabel(field))}
                </span>
              )}
            </div>
          </section>

          {/* ------------------------------ النتيجة ------------------------------ */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-line bg-panel p-5" data-match-score>
              {!scored ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-bg/70 text-dim">
                    <Icon n="scan" className="size-6" />
                  </div>
                  <p className="mt-3.5 text-[13.5px] font-semibold text-ink">{t('match.idle')}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('match.idleWhy')}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Ring score={res.score} />
                    <div className="min-w-0">
                      <p className={`text-[15px] font-extrabold leading-tight ${bandTone}`}>{L(res.band.label)}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(res.band.note)}</p>
                    </div>
                  </div>

                  <div className="mt-4.5 grid grid-cols-2 gap-2">
                    <Stat k={t('match.need')} v={num(res.keywords)} />
                    <Stat k={t('match.hit')} v={num(res.matchedCount)} />
                    <Stat k={t('match.miss')} v={num(res.missingCount)} />
                    <Stat k={t('match.atsLabel')} v={res.ats.score == null ? '—' : `${num(res.ats.score)}٪`} />
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-dim/80">{t('match.atsNote')}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3.5">
                    <Btn variant="outline" size="xs" onClick={copy}>
                      <Icon n="copy" className="size-3.5" />
                      {t('match.copy')}
                    </Btn>
                    <Btn variant="outline" size="xs" onClick={save}>
                      <Icon n="download" className="size-3.5" />
                      {t('match.save')}
                    </Btn>
                  </div>
                  {note && (
                    <p className="mt-2 text-[11.5px] text-brand" role="status">
                      {note}
                    </p>
                  )}
                </>
              )}
            </div>

            {scored && (
              <div className="mt-4 rounded-3xl border border-gold/35 bg-gold/[0.06] p-4.5" data-match-paid>
                <p className="text-[13.5px] font-extrabold text-ink">{t('match.reportTitle')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('match.reportSub')}</p>

                <ul className="mt-3 flex flex-col gap-1.5 text-[12px] text-dim">
                  <li className="flex items-center gap-2">
                    <Icon n="check" className="size-3.5 text-brand" sw={2.4} />
                    {t('match.reportList', { n: num(res.missingCount) })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon n="check" className="size-3.5 text-brand" sw={2.4} />
                    {t('match.reportEdits')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon n="check" className="size-3.5 text-brand" sw={2.4} />
                    {t('match.reportTemplate')}
                  </li>
                </ul>

                {/* مُموَّهٌ لا مخفيّ: عددُ الكلمات الناقصة معلوم، والكلماتُ نفسها هي what يُباع */}
                <div className="mt-3 flex flex-wrap gap-1.5" data-match-masked aria-hidden="true">
                  {res.missing.slice(0, 3).map((m) => (
                    <span key={m.term} className="rounded-lg border border-line bg-bg/70 px-2.5 py-1.5 text-[11.5px] tracking-[0.35em] text-dim/70">
                      ▪▪▪▪▪
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-dim/80">{t('match.masked')}</p>

                {edits.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-line bg-panel/70 p-3" data-match-sample>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('match.sampleTitle')}</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink">{edits[0].text}</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-brand">{edits[0].sample}</p>
                  </div>
                )}

                <Btn
                  size="md"
                  className="mt-3.5 w-full"
                  data-match-buy-one
                  onClick={() => {
                    const added = toggleAddon(one.id)
                    toast(added ? t('cart.addonAdded', { n: L(one.name) }) : t('cart.addonRemoved', { n: L(one.name) }))
                  }}
                >
                  <Icon n={hasAddon(one.id) ? 'check' : 'cart'} className="size-4" />
                  {hasAddon(one.id) ? t('match.inCart') : `${t('match.buyOne')} · ${num(one.price)} ${t('common.sar')}`}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  data-match-buy-five
                  onClick={() => {
                    const added = toggleAddon(five.id)
                    toast(added ? t('cart.addonAdded', { n: L(five.name) }) : t('cart.addonRemoved', { n: L(five.name) }))
                  }}
                >
                  <Icon n={hasAddon(five.id) ? 'check' : 'layers'} className="size-4" />
                  {hasAddon(five.id) ? t('match.inCart') : `${t('match.buyFive')} · ${num(five.price)} ${t('common.sar')}`}
                </Btn>
                <p className="mt-2 text-center text-[10.5px] font-semibold text-dim">{t('match.packNote')}</p>
              </div>
            )}

            {scored && (
              <ShareCard
                score={res.ready == null ? res.score : res.ready}
                bandLabel={L(res.band.label)}
                title={t('share.title')}
                stats={[
                  { k: t('match.hit'), v: `${num(res.matchedCount)}/${num(res.keywords)}` },
                  { k: t('match.miss'), v: num(res.missingCount) },
                  { k: t('match.atsLabel'), v: res.ats.score == null ? '—' : num(res.ats.score) },
                ]}
                seed={`match-${res.score}-${res.keywords}`}
                path="/match"
              />
            )}
          </aside>
        </div>

        {/* ------------------------------ القوالب المناسبة ------------------------------ */}
        {scored && picks.length > 0 && (
          <section className="mt-6 rounded-3xl border border-line bg-panel/55 p-5" data-match-picks>
            <h2 className="text-[15px] font-extrabold text-ink">{t('match.picksTitle')}</h2>
            <p className="mt-1 text-[12.5px] text-dim">{t('match.picksSub')}</p>
            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
              {picks.map((x) => (
                <Link
                  key={x.id}
                  to={`/template/${x.slug}`}
                  className="flex items-center gap-2.5 rounded-2xl border border-line bg-panel p-3 transition hover:border-brand/45"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
                    <Icon n="type" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-ink">{L(x.name)}</span>
                    <span className="block text-[11px] text-dim">{x.ats != null ? `${t('match.atsLabel')} ${num(x.ats)}` : L(x.tagline)}</span>
                  </span>
                  <span className="ms-auto shrink-0">
                    <Money v={x.price} size="text-[12px]" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ------------------------------ إجابةُ السوق ------------------------------ */}
        {scored && (
          <Reveal className="mt-6 rounded-3xl border border-line bg-panel/55 p-5">
            <h2 className="text-[15px] font-extrabold text-ink">{t('market.askTitle')}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('market.askSub')}</p>
            {asked ? (
              <p className="mt-3 rounded-2xl border border-brand/30 bg-brand/8 p-3.5 text-[12.5px] leading-relaxed text-ink" data-market-done>
                {t('market.thanks')}{' '}
                <Link to="/market" className="font-bold text-brand hover:underline">
                  {t('market.seeReport')}
                </Link>
              </p>
            ) : (
              <div className="mt-3.5 grid gap-3 sm:grid-cols-2" data-market-form>
                <Field label={t('market.field')}>
                  <select
                    value={survey.field}
                    onChange={(e) => setSurvey({ ...survey, field: e.target.value })}
                    className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
                    aria-label={t('market.field')}
                  >
                    <option value="">—</option>
                    {MARKET_FIELDS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {L(f)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('market.city')}>
                  <select
                    value={survey.city}
                    onChange={(e) => setSurvey({ ...survey, city: e.target.value })}
                    className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
                    aria-label={t('market.city')}
                  >
                    <option value="">—</option>
                    {MARKET_CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {L(c)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('market.interview')}>
                  <div className="flex gap-1.5">
                    {['yes', 'no'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={survey.interview === v}
                        onClick={() => setSurvey({ ...survey, interview: survey.interview === v ? '' : v })}
                        className={`flex-1 rounded-xl border px-3 py-2 text-[12.5px] font-bold transition ${
                          survey.interview === v ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line bg-bg/70 text-dim hover:text-ink'
                        }`}
                      >
                        {v === 'yes' ? t('market.yes') : t('market.no')}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={t('market.template')}>
                  <select
                    value={survey.template}
                    onChange={(e) => setSurvey({ ...survey, template: e.target.value })}
                    className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
                    aria-label={t('market.template')}
                  >
                    <option value="">—</option>
                    {templates.map((x) => (
                      <option key={x.id} value={x.id}>
                        {L(x.name)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Btn size="sm" className="sm:col-span-2" data-market-send onClick={sendSurvey}>
                  <Icon n="check" className="size-4" />
                  {t('market.send')}
                </Btn>
                <p className="text-[11px] leading-relaxed text-dim/80 sm:col-span-2">{t('market.privacy')}</p>
              </div>
            )}
          </Reveal>
        )}

        {/* ------------------------------ الأسئلة ------------------------------ */}
        <Reveal className="mt-6 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7">
          <h2 className="text-[16px] font-extrabold text-ink">{t('match.faqTitle')}</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              [t('match.q1'), t('match.a1')],
              [t('match.q2'), t('match.a2')],
              [t('match.q3'), t('match.a3')],
            ].map(([q, a]) => (
              <div key={q}>
                <dt className="text-[13px] font-bold text-ink">{q}</dt>
                <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11.5px] leading-relaxed text-dim/80">{t('match.foot')}</p>
        </Reveal>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{label}</span>
      {children}
    </label>
  )
}

function Stat({ k, v }) {
  return (
    <div className="rounded-xl border border-line bg-bg/50 px-2.5 py-2">
      <span className="block text-[10.5px] text-dim">{k}</span>
      <span className="num text-[13px] font-bold text-ink">{v}</span>
    </div>
  )
}

function Ring({ score }) {
  // القوسُ مسارٌ يبدأ من أعلى الدائرة — لا دائرةُ مُدارة بـrotate: فالرقمُ داخلها
  // يبقى أفقيًّا سليمًا (مثال: 93%) في كلِّ اتجاهِ صفحة.
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  return (
    <svg viewBox="0 0 72 72" className="size-[72px] shrink-0" aria-hidden="true">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--c-line)" strokeWidth="7" />
      <path
        d="M36 6A30 30 0 1 1 36 66A30 30 0 1 1 36 6"
        fill="none"
        stroke={score >= 80 ? 'var(--c-brand)' : 'var(--c-gold)'}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        className="transition-all duration-700"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" className="fill-ink text-[17px] font-extrabold">
        {`${score}%`}
      </text>
    </svg>
  )
}
