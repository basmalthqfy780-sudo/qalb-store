import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill } from '../components/ui'
import {
  CONSENT_VERSION,
  NICHES,
  QUESTIONS,
  canCreate,
  droppedAnswers,
  firstStage,
  nicheById,
  readyToGenerate,
  sanitizeAnswers,
  starterFor,
} from '../data/account'
import { account } from '../api/account'
import SitePreview from '../components/SitePreview'
import { byId } from '../data/templates'
import { sites } from '../api/hosting'
import { PLANS, entitlements, planById } from '../data/plans'
import { useStore } from '../store/StoreContext'

/**
 * «أنشئ قالبك» — مسار Freemium كله في أربع خطوات.
 *
 *   1. بريدٌ واحد + إقرار الفحص الآلي. لا كلمة سر ولا رسالة تأكيد: لا مُرسِل
 *      موصول في هذا المستودع، والسطر تحت الحقل يقول ذلك بدل أن يَعِد برسالة.
 *   2. المجال (ستة، ومصممو المرحلة الأولى مُبرزون لأن قوالبهم الأكمل اليوم).
 *   3. أسئلة قصيرة — كلُّ ما عدا الاسم والمهنة اختياري، والفارغ يبقى فارغًا.
 *   4. التوليد: يُبنى القالب من إجاباتك بمولّد الحزمة نفسه (`sites.create` ←
 *      `renderSite`)، فيخرج رابطٌ حيّ لا صورة.
 *
 * والبوابة: من أنشأ قالبه الأول على الخطة المجانية يرى الخطة عند المحاولة
 * الثانية — من `canCreate` نفسها التي يقرؤها الخادم، لا من عدّادٍ في الصفحة.
 */
const STEPS = ['mail', 'niche', 'answers', 'done']

/** شريط الخطوات — مكوّن خارج التصيير (لا يُبنى داخله فتصفَّر حالته كل رسم) */
function Step({ n, children }) {
  const { t } = useI18n()
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= n ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </div>
      <p className="num mt-3 text-[11.5px] font-bold uppercase tracking-wider text-dim">
        {t('create.stepOf', { n: n + 1, m: STEPS.length })} · {t(`create.step.${STEPS[n]}`)}
      </p>
      {children}
    </div>
  )
}

export default function Create() {
  const { t, L, LA } = useI18n()
  const { toast } = useStore()
  const [params] = useSearchParams()
  const askedPlan = planById(params.get('plan'))?.id || null

  const [rec, setRec] = useState(() => account.local())
  // أين يقف من يعود: بلا حساب → البريد، وبلا مجال → المجال (فالقالب يُختار منه
  // ولا يُخمن)، وبلا قالب → الأسئلة، ومن أنشأ قالبه → لوحته وبوابته.
  const [step, setStep] = useState(() => {
    const a = account.local()
    if (!a?.email) return 'mail'
    if (!a.niche) return 'niche'
    return a.created.length ? 'done' : 'answers'
  })
  const [email, setEmail] = useState(() => account.local()?.email || '')
  const [consent, setConsent] = useState(false)
  const [niche, setNiche] = useState(() => account.local()?.niche || '')
  const [ans, setAns] = useState(() => {
    const a = account.local()?.answers || {}
    return {
      name: a.name || '',
      role: a.role || '',
      services: a.services || '',
      works: a.works || '',
      colours: a.colours || [],
      links: a.links || [],
    }
  })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [made, setMade] = useState(null)
  const [dropped, setDropped] = useState([])
  const [upgrading, setUpgrading] = useState(askedPlan)
  const [device, setDevice] = useState('desktop')

  useSeo(`${t('create.seoTitle')} · ${t('brand.name')}`, t('create.seoDesc'), {
    jsonLd: null,
  })

  const gate = useMemo(() => canCreate(rec || {}), [rec])
  // ثلاثة قوالب من مجال المختار (أو من المرحلة الأولى قبل الاختيار) — معرّفات
  // حقيقية من الكتالوج، فما يُعرض هنا هو ما يُبنى فعلًا لا صورةٌ تقريبيةٌ له
  const showcase = useMemo(() => {
    const ids = (nicheById(niche)?.starters || firstStage()[0].starters).slice(0, 3)
    return ids.map((id) => byId(id)).filter(Boolean)
  }, [niche])
  const ready = rec ? readyToGenerate(rec) : null
  const starter = starterFor(niche)
  const blocked = rec ? !gate.allowed : false

  // إعادة القراءة بعد كل حفظ: الحالة تُشتق من السجلّ لا من نسخة في الذاكرة
  const sync = () => setRec(account.local())

  const say = (tone, text) => setNote({ tone, text })

  async function signUp(e) {
    e?.preventDefault?.()
    if (!consent) return say('bad', t('create.needConsent'))
    setBusy(true)
    const r = await account.signUp({ email, consent })
    setBusy(false)
    if (!r.ok) return say('bad', t(r.error === 'consent' ? 'create.needConsent' : 'create.badMail'))
    setRec(r.account)
    say('good', r.offline ? t('create.savedOffline') : t('create.welcome'))
    setStep('niche')
  }

  async function saveAnswers(next) {
    const clean = sanitizeAnswers(next)
    setDropped(droppedAnswers(next))
    setBusy(true)
    const r = await account.update({ niche, answers: clean })
    setBusy(false)
    if (r.ok) {
      setRec(r.account)
      return r.account
    }
    say('bad', t('create.saveFail'))
    return null
  }

  /** الخطوة الأخيرة: توليد القالب الأول — من مولّد الحزمة نفسه */
  async function generate(e) {
    e?.preventDefault?.()
    const clean = sanitizeAnswers(ans)
    setDropped(droppedAnswers(ans))
    if (!starter) return say('bad', t('create.needNiche'))
    setBusy(true)
    const saved = await saveAnswers(clean)
    if (!saved) {
      setBusy(false)
      return
    }
    const g = account.gate()
    if (!g.allowed) {
      setBusy(false)
      setRec(saved)
      setStep('done')
      return say('warn', t('create.gated', { n: g.used, max: g.max }))
    }
    const r = await sites.create({
      email: saved.email,
      template: starter.id,
      site: {
        name: clean.name,
        role: clean.role,
        email: saved.email,
        website: clean.links[0] || '',
        bio: clean.services || clean.works || '',
        template: starter.id,
        lang: 'ar',
        theme: 'dark',
      },
    })
    setBusy(false)
    if (!r.ok) return say('bad', t('create.genFail'))
    const added = await account.addTemplate({ slug: r.slug, template: starter.id, niche })
    setRec(added.account || account.local())
    setMade({ slug: r.slug, url: r.url, template: starter.id })
    setStep('done')
    say('good', t('create.generated'))
  }

  async function activate(planId) {
    setBusy(true)
    const r = await account.requestPlan(planId)
    setBusy(false)
    sync()
    if (r.ok) {
      setUpgrading(null)
      toast(t('create.planRecorded', { p: L(planById(planId).name) }))
      return say('good', t('create.planRecorded', { p: L(planById(planId).name) }))
    }
    if (r.pending) return say('warn', t('create.planPending'))
    return say('bad', t('create.planFail'))
  }

  /* ---------------------------------------------------------------- */

  const noteEl = note ? (
    <p
      role={note.tone === 'bad' ? 'alert' : 'status'}
      className={`mt-4 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold ${
        note.tone === 'bad'
          ? 'border-[#ff6b6b]/35 bg-[#ff6b6b]/10 text-[#ff9a9a]'
          : note.tone === 'warn'
            ? 'border-gold/35 bg-gold/10 text-gold'
            : 'border-[#3ecf8e]/35 bg-[#3ecf8e]/10 text-[#3ecf8e]'
      }`}
    >
      {note.text}
    </p>
  ) : null

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto grid max-w-[1100px] gap-8 pb-24 pt-12 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Head as="h1" kicker={t('create.kicker')} title={t('create.title')} sub={t('create.sub')} />

          {/* ——— الخطوة ١: البريد والإقرار ——— */}
          {step === 'mail' ? (
            <Step n={0}>
              <form onSubmit={signUp} className="mt-4 rounded-3xl border border-line bg-panel/60 p-6">
                <label htmlFor="mail" className="text-[13px] font-bold">
                  {t('create.mailLabel')}
                </label>
                <input
                  id="mail"
                  type="email"
                  dir="ltr"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={note?.tone === 'bad' ? true : undefined}
                  aria-describedby="mail-note"
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-bg px-4 text-[14px] outline-none focus:border-brand"
                />
                <p id="mail-note" className="mt-2 text-[12px] leading-relaxed text-dim">
                  {t('create.noMailer')}
                </p>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-bg/60 p-4">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--c-brand)]"
                  />
                  <span className="text-[12.5px] leading-relaxed text-ink/85">{t('create.consent')}</span>
                </label>
                <p className="num mt-2 text-[11px] text-dim">{t('create.consentVersion', { v: CONSENT_VERSION })}</p>

                <Btn type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
                  {t('create.start')}
                </Btn>
                {noteEl}
              </form>
            </Step>
          ) : null}

          {/* ——— الخطوة ٢: المجال ——— */}
          {step === 'niche' ? (
            <Step n={1}>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {NICHES.map((n) => {
                  const on = niche === n.id
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setNiche(n.id)}
                      aria-pressed={on}
                      className={`rounded-2xl border p-4 text-start transition ${on ? 'border-brand bg-brand/8' : 'border-line bg-panel/50 hover:border-brand/30'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon n={n.icon} className="size-4.5 text-brand" />
                        <span className="text-[14px] font-bold">{L(n.name)}</span>
                        {n.stage === 1 ? <Pill tone="gold">{t('create.stageOne')}</Pill> : null}
                      </span>
                      <span className="mt-1 block text-[12px] text-dim">{L(n.hint)}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-dim">{t('create.whyStageOne')}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Btn
                  size="lg"
                  disabled={!niche}
                  onClick={async () => {
                    await account.update({ niche })
                    sync()
                    setStep('answers')
                  }}
                >
                  {t('create.next')}
                </Btn>
                <Btn size="lg" variant="ghost" onClick={() => setStep('mail')}>
                  {t('create.back')}
                </Btn>
              </div>
              {noteEl}
            </Step>
          ) : null}

          {/* ——— الخطوة ٣: الأسئلة القصيرة ——— */}
          {step === 'answers' ? (
            <Step n={2}>
              <form onSubmit={generate} className="mt-4 space-y-4 rounded-3xl border border-line bg-panel/60 p-6">
                {QUESTIONS.map((q) => (
                  <div key={q.k}>
                    <label htmlFor={`q-${q.k}`} className="text-[13px] font-bold">
                      {t(q.q)}
                      {q.opt ? <span className="ms-2 text-[11px] font-semibold text-dim">{t('create.optional')}</span> : null}
                    </label>
                    {q.multiline ? (
                      <textarea
                        id={`q-${q.k}`}
                        rows={3}
                        maxLength={q.limit}
                        value={ans[q.k] || ''}
                        onChange={(e) => setAns((a) => ({ ...a, [q.k]: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-line bg-bg p-3 text-[13.5px] outline-none focus:border-brand"
                      />
                    ) : q.colours ? (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {[0, 1].map((i) => (
                          <input
                            key={i}
                            id={i === 0 ? 'q-colours' : undefined}
                            aria-label={t('account.colourN', { n: i + 1 })}
                            dir="ltr"
                            placeholder="#2f6df6"
                            maxLength={7}
                            value={ans.colours?.[i] || ''}
                            onChange={(e) => {
                              const c = [...(ans.colours || [])]
                              c[i] = e.target.value
                              setAns((a) => ({ ...a, colours: c.filter(Boolean) }))
                            }}
                            className="num h-11 w-32 rounded-xl border border-line bg-bg px-3 text-[13px] outline-none focus:border-brand"
                          />
                        ))}
                        <span className="self-center text-[11.5px] text-dim">{t('create.colourHint')}</span>
                      </div>
                    ) : q.links ? (
                      <div className="mt-2 space-y-2">
                        {[0, 1, 2].map((i) => (
                          <input
                            key={i}
                            id={i === 0 ? 'q-links' : undefined}
                            aria-label={t('account.linkN', { n: i + 1 })}
                            dir="ltr"
                            type="url"
                            placeholder="https://"
                            value={ans.links?.[i] || ''}
                            onChange={(e) => {
                              const c = [...(ans.links || [])]
                              c[i] = e.target.value
                              setAns((a) => ({ ...a, links: c.filter(Boolean) }))
                            }}
                            className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-[13px] outline-none focus:border-brand"
                          />
                        ))}
                      </div>
                    ) : (
                      <input
                        id={`q-${q.k}`}
                        autoComplete={q.auto || 'off'}
                        maxLength={q.limit}
                        required={!q.opt}
                        value={ans[q.k] || ''}
                        onChange={(e) => setAns((a) => ({ ...a, [q.k]: e.target.value }))}
                        className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-4 text-[13.5px] outline-none focus:border-brand"
                      />
                    )}
                  </div>
                ))}

                {dropped.length ? <p className="text-[12px] font-semibold text-gold">{t('create.dropped', { n: dropped.length })}</p> : null}

                <div className="rounded-2xl border border-line bg-bg/60 p-4">
                  <p className="text-[12.5px] font-bold">{t('create.willBuild')}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                    {starter
                      ? t('create.willBuildBody', { tpl: starter?.name?.ar ? L(starter.name) || starter.id : starter.id })
                      : t('create.needNiche')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Btn type="submit" size="lg" disabled={busy || !starter}>
                    {t('create.generate')}
                  </Btn>
                  <Btn size="lg" variant="ghost" type="button" onClick={() => setStep('niche')}>
                    {t('create.back')}
                  </Btn>
                </div>
                {noteEl}
              </form>
            </Step>
          ) : null}

          {/* ——— الخطوة ٤: تم — أو البوابة ——— */}
          {step === 'done' ? (
            <Step n={3}>
              <div className="mt-4 space-y-5">
                {made ? (
                  <div data-made className="rounded-3xl border border-[#3ecf8e]/35 bg-[#3ecf8e]/8 p-6">
                    <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#3ecf8e]">
                      <Icon n="check" className="size-4" />
                      {t('create.doneTitle')}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-dim">{t('create.doneSub')}</p>
                    <p className="num mt-3 break-all rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] font-bold">{made.url}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Btn to={`/studio?site=${made.slug}`} size="lg">
                        {t('create.openStudio')}
                      </Btn>
                      <Btn to="/account" size="lg" variant="outline">
                        {t('create.openAccount')}
                      </Btn>
                    </div>
                  </div>
                ) : null}

                {/* حالة الحساب: العدّاد من canCreate نفسها */}
                <div className="rounded-3xl border border-line bg-panel/60 p-6">
                  <p className="text-[14px] font-extrabold">{t('create.yourPlan')}</p>
                  <p className="num mt-1 text-[13px] text-dim">
                    {t('create.counter', { n: gate.used, max: gate.max == null ? '∞' : gate.max })} · {L(planById(gate.planId).name)}
                  </p>
                  {rec?.created?.length ? (
                    <ul className="mt-4 space-y-2">
                      {rec.created.map((c) => (
                        <li key={c.slug} className="flex items-center justify-between rounded-xl border border-line bg-bg/60 px-3 py-2">
                          <span className="num text-[12.5px] font-bold">{c.slug}</span>
                          <Link to={`/studio?site=${c.slug}`} className="text-[12px] font-bold text-brand underline decoration-2 underline-offset-2">
                            {t('create.editIt')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {/* البوابة: القالب الثاني خلف اشتراك */}
                {blocked ? (
                  <div data-gate className="rounded-3xl border border-gold/40 bg-gold/8 p-6">
                    <p className="flex items-center gap-2 text-[14px] font-extrabold text-gold">
                      <Icon n="lock" className="size-4" />
                      {t('create.gateTitle')}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-dim">{t('create.gateSub', { n: gate.used, max: gate.max })}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {PLANS.filter((p) => p.price > 0).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => activate(p.id)}
                          className="rounded-2xl border border-line bg-bg/70 p-4 text-start transition hover:border-brand/40"
                        >
                          <span className="flex items-center justify-between">
                            <span className="text-[13.5px] font-extrabold">{L(p.name)}</span>
                            <Money v={p.price} size="text-[16px]" />
                          </span>
                          <span className="mt-1 block text-[12px] leading-relaxed text-dim">{L(p.tagline)}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('create.noGateway')}</p>
                    <Link
                      to="/pricing"
                      className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand underline decoration-2 underline-offset-2"
                    >
                      {t('create.comparePlans')}
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-line bg-panel/60 p-6">
                    <p className="text-[14px] font-extrabold">{t('create.anotherTitle')}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{t('create.anotherSub')}</p>
                    <Btn
                      size="lg"
                      className="mt-4"
                      variant="outline"
                      onClick={() => {
                        setMade(null)
                        setStep('answers')
                      }}
                    >
                      {t('create.makeAnother')}
                    </Btn>
                  </div>
                )}
                {upgrading ? (
                  <p role="status" className="rounded-2xl border border-brand/35 bg-brand/8 px-3.5 py-2.5 text-[12.5px] font-semibold text-brand">
                    {t('create.activating', { p: L(planById(upgrading).name) })}
                  </p>
                ) : null}
                {noteEl}
              </div>
            </Step>
          ) : null}
        </div>

        {/* ——— العمود الجانبي: ما يحدث في كل خطوة ——— */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-panel/50 p-5">
            <p className="text-[13px] font-extrabold">{t('create.sideTitle')}</p>
            <ul className="mt-3 space-y-3">
              {['create.side1', 'create.side2', 'create.side3', 'create.side4'].map((k, i) => (
                <li key={k} className="flex items-start gap-2.5">
                  <span className="num grid size-6 shrink-0 place-items-center rounded-md border border-line bg-bg text-[11px] font-black text-brand">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-dim">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-3xl border border-line bg-panel/50 p-5">
            <p className="text-[13px] font-extrabold">{t('create.freeWhat')}</p>
            <ul className="mt-3 space-y-2">
              {LA(entitlements('free').plan.bullets).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
                  <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-[#3ecf8e]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand underline decoration-2 underline-offset-2"
            >
              {t('create.seePlans')}
            </Link>
          </div>

          {rec && !ready?.ok ? (
            <p className="mt-4 rounded-2xl border border-gold/35 bg-gold/8 p-4 text-[11.5px] leading-relaxed text-gold">
              {t('create.missingFields', { n: ready.missing.length })}
            </p>
          ) : null}

          {firstStage().length ? (
            <p className="mt-4 rounded-2xl border border-line bg-bg/60 p-4 text-[11.5px] leading-relaxed text-dim">{t('create.nicheNote')}</p>
          ) : null}
        </aside>

        {/* ——— ثلاثة قوالب حقيقية قبل أي قرار ———
            لا لقطة شاشة ولا وصف: القوالب نفسها تُرسم بمعاينة المتجر، وتُقلَّب
            بين سطح المكتب والجوال. ومن اخترت مجاله يرى قوالب مجاله. */}
        <section id="showcase" className="mt-16 scroll-mt-24 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">{t('create.showKicker')}</p>
              <h2 className="mt-1.5 font-display text-[22px] font-extrabold">{t('create.showTitle')}</h2>
              <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-dim">{t('create.showSub')}</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-panel/60 p-1" role="group" aria-label={t('create.showDevice')}>
              {[
                { k: 'desktop', i: 'monitor' },
                { k: 'tablet', i: 'tablet' },
                { k: 'mobile', i: 'smartphone' },
              ].map((d) => (
                <button
                  key={d.k}
                  type="button"
                  aria-pressed={device === d.k}
                  aria-label={t(`create.device.${d.k}`)}
                  onClick={() => setDevice(d.k)}
                  className={`grid size-9 place-items-center rounded-lg transition ${device === d.k ? 'bg-ink text-bg' : 'text-dim hover:text-ink'}`}
                >
                  <Icon n={d.i} className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {showcase.map((tpl, k) => (
              <article key={tpl.id} className="overflow-hidden rounded-3xl border border-line bg-panel/60">
                <div className="border-b border-line bg-bg/60 p-2">
                  <SitePreview template={tpl} device={device} className="rounded-2xl" />
                </div>
                <div className="p-4">
                  <p className="text-[14px] font-extrabold">{L(tpl.name)}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(tpl.tagline)}</p>
                  <Link
                    to={`/template/${tpl.slug}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand underline decoration-2 underline-offset-2"
                  >
                    {t('create.showOpen')}
                    <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
                  </Link>
                </div>
                {k === 0 && niche ? (
                  <p className="border-t border-line px-4 py-2 text-[11px] font-semibold text-brand">{t('create.showYours')}</p>
                ) : null}
              </article>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-dim">{t('create.showNote')}</p>
        </section>
      </div>
    </div>
  )
}
