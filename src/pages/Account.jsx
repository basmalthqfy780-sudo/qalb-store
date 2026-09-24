import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill } from '../components/ui'
import { account } from '../api/account'
import { sites } from '../api/hosting'
import { answerSummary, canCreate } from '../data/account'
import { PLANS, planById, withWatermark } from '../data/plans'
import { renderSite } from '../data/hosting'
import { canSell } from '../data/marketplace'

/**
 * لوحة الحساب — ما تملكه الخطة، مترجمًا إلى أفعال لا إلى كلام.
 *
 * ثلاثة أشياء تُرى هنا كما تحدث فعلًا:
 *   • **العدّاد** من `canCreate` نفسها التي يقرؤها الخادم (قالبٌ واحد مجانًا).
 *   • **ورقة السيرة** تُبنى بمولّد الحزمة (`renderSite(…, '/print')`) وتُختم
 *     بالعلامة المائية حين تكون الخطة مجانية (`withWatermark`) — فالوعد في
 *     مصفوفة القيمة («PDF بعلامة مائية») يُرى في المتصفح لا يُقرأ في جدول.
 *   • **التصدير والنشر والبيع** أزرارٌ تُفتح أو تُقفل من `entitlements`، ومع كل
 *     زرٍّ مقفل سطرٌ يقول أيُّ خطة تفتحه.
 *
 * ولا شيء هنا يُرقّي خطة نفسه: التفعيل يُسجَّل (لا بوابة دفع في هذه النسخة)،
 * وفي وضع `rest` يرفضه الخادم من المتصفح فيُسجَّل طلبًا.
 */
export default function Account() {
  const { t, L } = useI18n()
  const [rec, setRec] = useState(() => account.local())
  const [sel, setSel] = useState(() => account.local()?.created?.[0]?.slug || '')
  const [sheet, setSheet] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  // أداة خاصة بصاحب الحساب: لا تُفهرس
  useSeo(`${t('account.seoTitle')} · ${t('brand.name')}`, t('account.seoDesc'), { robots: 'noindex' })

  const gate = useMemo(() => canCreate(rec || {}), [rec])
  const plan = planById(gate.planId)
  const summary = useMemo(() => answerSummary(rec || {}), [rec])
  // `/account?plan=plus` يأتي من جدول الخطط: البطاقة المطلوبة تُبرز وتُمرَّر إليها
  const [sp] = useSearchParams()
  const want = planById(sp.get('plan'))?.id || null
  useEffect(() => {
    if (!want || !rec) return
    const el = document.querySelector(`[data-plan-card="${want}"]`)
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' })
  }, [want, rec])
  const say = (tone, text) => setNote({ tone, text })

  /** ورقة السيرة: نفس مسار `/print` في الاستضافة، مختومة بالعلامة إن كانت الخطة مجانية */
  // لا setState في جسم الأثر (قاعدة react-hooks هنا): حالة «لا اختيار» تُشتق
  // في الرسم (`activeSheet`) بدل أن تُمحى بورقة حالة.
  useEffect(() => {
    if (!sel || !rec) return
    let live = true
    sites
      .data(sel, '')
      .then((r) => {
        if (!live) return
        const site = r?.site ? { slug: sel, plan: 'free', site: r.site } : null
        if (!site) {
          setSheet(null)
          return
        }
        const out = renderSite(site, '/print')
        if (out.status !== 200) {
          setSheet({ ok: false })
          return
        }
        setSheet({
          ok: true,
          html: withWatermark(out.body, { on: plan.watermark, label: t('account.wmLabel') }),
          watermarked: plan.watermark,
        })
      })
      .catch(() => {
        if (live) setSheet({ ok: false })
      })
    return () => {
      live = false
    }
  }, [sel, rec, plan.watermark, t])

  /** ما يُعرض: بلا اختيارٍ لا ورقة — ولا تُقرأ حالةٌ قديمة من اختيارٍ سابق */
  const activeSheet = sel ? sheet : null

  if (!rec) {
    return (
      <div className="page-x mx-auto max-w-[720px] pb-24 pt-16">
        <Head as="h1" kicker={t('account.kicker')} title={t('account.emptyTitle')} sub={t('account.emptySub')} />
        {/* التسجيل هنا لا في «أنشئ قالبك»: بريدٌ واحد وإقرار، ثم تفتح اللوحة.
            ولا رسالةَ تأكيدٍ تُوعد — لا مُرسِل موصول في هذه النسخة (create.noMailer) */}
        <form
          className="mt-6 rounded-3xl border border-line bg-panel/60 p-5"
          data-account-signup
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            const mail = e.currentTarget.elements.mail?.value || ''
            const consent = e.currentTarget.elements.consent?.checked === true
            const r = await account.signUp({ email: mail, consent })
            setRec(account.local())
            say(r.ok ? 'good' : 'bad', r.ok ? t('account.planRecorded', { p: t('account.free') }) : t('account.planFail'))
          }}
        >
          <label className="block text-[12.5px] font-bold" htmlFor="acc-mail">
            {t('create.mailLabel')}
          </label>
          <input
            id="acc-mail"
            name="mail"
            type="email"
            required
            placeholder="you@studio.sa"
            className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none transition focus:border-brand/50"
          />
          <label className="mt-3 flex items-start gap-2.5 text-[12px] leading-relaxed text-dim" htmlFor="acc-consent">
            <input id="acc-consent" name="consent" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--c-brand)]" />
            <span>{t('create.consent')}</span>
          </label>
          <Btn type="submit" size="lg" className="mt-4 w-full">
            {t('create.start')}
          </Btn>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('create.noMailer')}</p>
        </form>
      </div>
    )
  }

  async function activate(planId) {
    setBusy(true)
    const r = await account.requestPlan(planId)
    setBusy(false)
    setRec(account.local())
    if (r.ok) return say('good', t('account.planRecorded', { p: L(planById(planId).name) }))
    if (r.pending) return say('warn', t('account.planPending'))
    return say('bad', t('account.planFail'))
  }

  function forget() {
    account.forget()
    setRec(null)
    say('warn', t('account.forgot'))
  }

  const rows = [
    { i: 'layers', k: 'account.row.templates', v: gate.max == null ? t('account.unlimited') : `${gate.used} / ${gate.max}`, open: true },
    { i: 'download', k: 'account.row.pdf', v: plan.watermark ? t('account.row.pdfWm') : t('account.row.pdfClean'), open: true },
    { i: 'rocket', k: 'account.row.publish', v: plan.publish ? t('account.row.yes') : t('account.row.no'), open: plan.publish },
    { i: 'file', k: 'account.row.export', v: plan.exportSite ? t('account.row.yes') : t('account.row.no'), open: plan.exportSite },
    { i: 'type', k: 'account.row.badge', v: plan.badge ? t('account.row.badgeOn') : t('account.row.badgeOff'), open: !plan.badge },
    { i: 'globe', k: 'account.row.domain', v: plan.domain ? t('account.row.yes') : t('account.row.no'), open: plan.domain },
    { i: 'wallet', k: 'account.row.sell', v: canSell(rec.plan) ? t('account.row.yes') : t('account.row.no'), open: canSell(rec.plan) },
  ]

  return (
    <div className="page-x mx-auto max-w-[1100px] pb-24 pt-12 sm:pt-14">
      <Head
        as="h1"
        kicker={t('account.kicker')}
        title={rec.email}
        sub={t('account.sub', { p: L(plan.name), n: gate.used, max: gate.max == null ? '∞' : gate.max })}
        right={<Pill tone={plan.price > 0 ? 'brand' : 'line'}>{L(plan.name)}</Pill>}
      />

      {note ? (
        <p
          role={note.tone === 'bad' ? 'alert' : 'status'}
          className={`mt-5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold ${
            note.tone === 'bad'
              ? 'border-[#ff6b6b]/35 bg-[#ff6b6b]/10 text-[#ff9a9a]'
              : note.tone === 'warn'
                ? 'border-gold/35 bg-gold/10 text-gold'
                : 'border-[#3ecf8e]/35 bg-[#3ecf8e]/10 text-[#3ecf8e]'
          }`}
        >
          {note.text}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          {/* قوالبك */}
          <section className="rounded-3xl border border-line bg-panel/60 p-5">
            <h2 className="text-[15px] font-extrabold">{t('account.yourTemplates')}</h2>
            {rec.created.length ? (
              <ul className="mt-4 space-y-2">
                {rec.created.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => setSel(c.slug)}
                      aria-pressed={sel === c.slug}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-start transition ${
                        sel === c.slug ? 'border-brand bg-brand/8' : 'border-line bg-bg/50 hover:border-brand/30'
                      }`}
                    >
                      <span>
                        <span className="num block text-[13px] font-bold">{c.slug}</span>
                        <span className="num block text-[11px] text-dim">
                          {c.template} · {c.at}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Icon n="chevron" className="size-4 text-dim rtl:rotate-90" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-relaxed text-dim">{t('account.noTemplates')}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {gate.allowed ? (
                <Btn to="/templates" size="md" variant="outline">
                  {t('account.makeAnother')}
                </Btn>
              ) : (
                <Pill tone="gold">
                  <Icon n="lock" className="size-3" />
                  {t('account.gated', { max: gate.max })}
                </Pill>
              )}
              {sel ? (
                <Btn to={`/studio?site=${sel}`} size="md" variant="ghost">
                  {t('account.editInStudio')}
                </Btn>
              ) : null}
            </div>
          </section>

          {/* ورقة السيرة — العلامة المائية تُرى لا تُحكى */}
          <section className="rounded-3xl border border-line bg-panel/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-extrabold">{t('account.sheetTitle')}</h2>
              <Pill tone={plan.watermark ? 'gold' : 'brand'}>{plan.watermark ? t('account.wmOn') : t('account.wmOff')}</Pill>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">{t('account.sheetSub')}</p>
            {sel ? (
              activeSheet?.ok ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
                  <iframe title={t('account.sheetFrame')} srcDoc={activeSheet.html} className="h-[520px] w-full bg-white" data-sheet-frame />
                </div>
              ) : activeSheet ? (
                <p className="mt-4 rounded-xl border border-line bg-bg/60 px-3.5 py-3 text-[12.5px] text-dim">{t('account.noSheet')}</p>
              ) : (
                <p className="mt-4 rounded-xl border border-line bg-bg/60 px-3.5 py-3 text-[12.5px] text-dim">{t('account.sheetLoading')}</p>
              )
            ) : (
              <p className="mt-4 rounded-xl border border-line bg-bg/60 px-3.5 py-3 text-[12.5px] text-dim">{t('account.pickFirst')}</p>
            )}
            <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('account.sheetHow')}</p>
          </section>

          {/* ما تفتحه خطتك */}
          <section className="rounded-3xl border border-line bg-panel/60 p-5">
            <h2 className="text-[15px] font-extrabold">{t('account.entTitle')}</h2>
            <ul className="mt-4 divide-y divide-line/60">
              {rows.map((r) => (
                <li key={r.k} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                    <Icon n={r.i} className="size-4 text-dim" />
                    {t(r.k)}
                  </span>
                  <span className={`flex items-center gap-1.5 text-[12.5px] font-bold ${r.open ? 'text-[#3ecf8e]' : 'text-dim'}`}>
                    <Icon n={r.open ? 'check' : 'lock'} className="size-3.5" />
                    {r.v}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
              <Link to="/pricing#matrix" className="font-bold text-brand underline decoration-2 underline-offset-2">
                {t('account.seeMatrix')}
              </Link>
            </p>
          </section>

          {/* إجاباتك */}
          <section className="rounded-3xl border border-line bg-panel/60 p-5">
            <h2 className="text-[15px] font-extrabold">{t('account.answersTitle')}</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
              {t('account.answersSub', { n: summary.filled.length, c: summary.colours, l: summary.links })}
            </p>
            <Btn to="/host" size="md" variant="outline" className="mt-4">
              {t('account.editPage')}
            </Btn>
          </section>
        </div>

        {/* العمود: الخطة والتفعيل */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-panel/60 p-5">
            <p className="text-[13px] font-extrabold">{t('account.planTitle')}</p>
            <p className="num mt-2 text-[12.5px] text-dim">{t('account.since', { d: rec.since })}</p>
            <div className="mt-4 space-y-3">
              {PLANS.filter((p) => p.id !== rec.plan).map((p) => (
                <div
                  key={p.id}
                  data-plan-card={p.id}
                  className={`rounded-2xl border p-4 transition ${want === p.id ? 'border-brand/60 bg-brand/[0.07]' : 'border-line bg-bg/60'}`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[13.5px] font-extrabold">{L(p.name)}</span>
                    {p.price ? <Money v={p.price} size="text-[15px]" /> : <span className="text-[13px] font-bold text-dim">{t('account.free')}</span>}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-dim">{L(p.tagline)}</span>
                  {p.price ? (
                    <Btn size="sm" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => activate(p.id)}>
                      {L(p.cta)}
                    </Btn>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('account.noGateway')}</p>
            {rec.activations.length ? (
              <p className="num mt-2 text-[11px] text-dim">{t('account.activations', { n: rec.activations.length })}</p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-line bg-panel/60 p-5">
            <p className="text-[13px] font-extrabold">{t('account.sellTitle')}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">{canSell(rec.plan) ? t('account.sellOpen') : t('account.sellLocked')}</p>
            <Btn to="/sell" size="md" variant={canSell(rec.plan) ? 'outline' : 'ghost'} className="mt-3 w-full">
              {t('account.sellCta')}
            </Btn>
          </div>

          <div className="rounded-3xl border border-line bg-panel/40 p-5">
            <p className="text-[13px] font-extrabold">{t('account.dataTitle')}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">{t('account.dataSub')}</p>
            <Btn size="sm" variant="ghost" className="mt-3 w-full" onClick={forget}>
              {t('account.forget')}
            </Btn>
          </div>
        </aside>
      </div>
    </div>
  )
}
