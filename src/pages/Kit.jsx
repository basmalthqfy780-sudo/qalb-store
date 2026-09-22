import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { num, useI18n } from '../i18n'
import { ATS_DEMO } from '../data/ats'
import { MATCH_DEMO_JOB } from '../data/match'
import { KIT_MIN_CV, KIT_MIN_JOB, KIT_PACK, buildKit, kitCredit, kitCredits, kitText } from '../data/kit'
import { kitUpsell } from '../data/upsells'
import { useStore } from '../store/StoreContext'
import { toolLd, useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/**
 * مولّدُ ملف التقديم: من سيرتك وإعلانٍ واحد يخرج أربعةُ أشياء — نقاطُ سيرتك مرتّبةً
 * على مفردات الإعلان، وخطابُ تقديم، ورسالةُ LinkedIn، وإيميلٌ بموضوعه جاهز.
 *
 * والرصيدُ عشرُ توليدات تُشترى مرة: الباحثُ يقدّم على عشرين وظيفة، فالاشتراكُ الشهري
 * لا يناسبُه والشراءُ لمرةٍ لا يكفيه — عشرٌ برصيد هي الوسط الذي يرجع فيه إلينا.
 *
 * والصدقُ هنا في المولّد لا في التسويق: ما لا يجده في سيرتك يتركه بين قوسين،
 * ولا يخترعُ رقمًا ولا مسمّى ولا اسمَ شركة. الفحصُ في tests/smoke.mjs يُثبت هذا.
 */
export default function Kit() {
  const { t, lang, L } = useI18n()
  const { toggleAddon, hasAddon, toast } = useStore()
  const [cv, setCv] = useState('')
  const [job, setJob] = useState('')
  const [kit, setKit] = useState(null)
  const [note, setNote] = useState('')
  const [credits, setCredits] = useState(() => kitCredits())
  const pack = kitUpsell()

  const ready = cv.trim().length >= KIT_MIN_CV && job.trim().length >= KIT_MIN_JOB

  const faq = [
    [t('kit.q1'), t('kit.a1')],
    [t('kit.q2'), t('kit.a2')],
  ]
  useSeo(`${t('kit.title')} · ${t('brand.name')}`, t('meta.kitDesc'), {
    jsonLd: toolLd({ name: `${t('kit.title')} · ${t('brand.name')}`, desc: t('meta.kitDesc'), path: '/kit', faq }),
  })

  const full = useMemo(() => (kit ? kitText(kit, { lang }) : ''), [kit, lang])

  function generate() {
    if (!ready) return setNote(t('kit.tooShort'))
    if (credits.left < 1) return setNote(t('kit.noCredits'))
    const k = buildKit({ cv, job, lang })
    setKit(k)
    setCredits(kitCredit(1))
    setNote('')
  }

  async function copy(text) {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(text)
      setNote(t('kit.copied'))
    } catch {
      setNote(t('kit.copyBlocked'))
    }
  }
  function save() {
    const blob = new Blob([full], { type: 'text/markdown;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `qalb-kit-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    setNote(t('kit.saved'))
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1120px] py-13 sm:py-16">
        <Head
          as="h1"
          kicker={t('kit.kicker')}
          title={t('kit.title')}
          sub={t('kit.sub')}
          right={
            <Pill tone="brand" className="max-w-full">
              <Icon n="shield" className="size-3" />
              {t('kit.privacy')}
            </Pill>
          }
        />

        <div className="mt-9 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-3xl border border-line bg-panel p-4 sm:p-5" data-kit-input>
            <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3.5">
              <span className="text-[12.5px] font-semibold text-dim">{t('kit.inputs')}</span>
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
                    setKit(null)
                    setNote('')
                  }}
                >
                  <Icon n="refresh" className="size-3.5" />
                  {t('match.clear')}
                </Btn>
              </div>
            </div>

            <label className="mt-3.5 block text-[12px] font-bold text-ink" htmlFor="k-cv">
              {t('kit.cvLabel')}
            </label>
            <textarea
              id="k-cv"
              dir="auto"
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              rows={9}
              spellCheck={false}
              placeholder={t('match.cvPh')}
              className="mt-1.5 w-full resize-y rounded-2xl border border-line bg-bg/60 p-3.5 text-[13.5px] leading-[1.85] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50"
            />
            <label className="mt-4 block text-[12px] font-bold text-ink" htmlFor="k-job">
              {t('kit.jobLabel')}
            </label>
            <textarea
              id="k-job"
              dir="auto"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              rows={9}
              spellCheck={false}
              placeholder={t('match.jobPh')}
              className="mt-1.5 w-full resize-y rounded-2xl border border-line bg-bg/60 p-3.5 text-[13.5px] leading-[1.85] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50"
            />
            <p className="mt-2.5 text-[11px] leading-relaxed text-dim/80">{t('kit.honest')}</p>
          </section>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-line bg-panel p-5" data-kit-credits>
              <p className="text-[13.5px] font-extrabold text-ink">{t('kit.credits')}</p>
              <p className="num mt-1.5 text-[30px] font-extrabold leading-none text-brand">{num(credits.left)}</p>
              <p className="mt-1.5 text-[11.5px] text-dim">
                {t('kit.used')}: <span className="num">{num(credits.used)}</span>
              </p>

              <Btn size="md" className="mt-3.5 w-full" data-kit-generate disabled={!ready} onClick={generate}>
                <Icon n="spark" className="size-4" />
                {t('kit.generate')}
              </Btn>

              {credits.left < 1 && (
                <div className="mt-3.5 rounded-2xl border border-gold/35 bg-gold/[0.06] p-3.5" data-kit-pack>
                  <p className="text-[13px] font-extrabold text-ink">{L(pack.name)}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(pack.tagline)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Money v={pack.price} size="text-[20px]" />
                    <span className="num text-[11px] text-dim">
                      {num(KIT_PACK.credits)} {t('kit.perPack')}
                    </span>
                  </div>
                  <Btn
                    size="sm"
                    className="mt-3 w-full"
                    data-kit-buy
                    onClick={() => {
                      const added = toggleAddon(pack.id)
                      toast(added ? t('cart.addonAdded', { n: L(pack.name) }) : t('cart.addonRemoved', { n: L(pack.name) }))
                    }}
                  >
                    <Icon n={hasAddon(pack.id) ? 'check' : 'cart'} className="size-4" />
                    {hasAddon(pack.id) ? t('kit.inCart') : t('kit.buy')}
                  </Btn>
                  <p className="mt-2 text-[11px] leading-relaxed text-dim/80">{t('kit.afterBuy')}</p>
                </div>
              )}

              {note && (
                <p className="mt-2.5 text-[11.5px] text-brand" role="status">
                  {note}
                </p>
              )}
            </div>

            {kit && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Btn variant="outline" size="xs" onClick={() => copy(full)}>
                  <Icon n="copy" className="size-3.5" />
                  {t('kit.copyAll')}
                </Btn>
                <Btn variant="outline" size="xs" onClick={save}>
                  <Icon n="download" className="size-3.5" />
                  {t('kit.save')}
                </Btn>
                <Link to="/match" className="text-[12px] font-bold text-brand hover:underline">
                  {t('kit.toMatch')}
                </Link>
              </div>
            )}
          </aside>
        </div>

        {/* ------------------------------ المولَّد ------------------------------ */}
        {kit && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2" data-kit-out>
            <Out
              title={t('kit.bullets')}
              note={t('kit.bulletsNote')}
              onCopy={() => copy(kit.ranked.map((b, i) => `${i + 1}. ${b.text}`).join('\n'))}
              data="kit-bullets"
            >
              <ol className="mt-2 flex flex-col gap-1.5">
                {kit.ranked.map((b, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-ink">
                    <span className="num ms-0 font-bold text-brand">{num(i + 1)}.</span> {b.text}
                  </li>
                ))}
              </ol>
            </Out>

            <Out title={t('kit.cover')} note={t('kit.coverNote')} onCopy={() => copy(kit.cover)} data="kit-cover">
              <pre className="mt-2 whitespace-pre-wrap text-[12.5px] leading-[1.9] text-ink" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                {kit.cover}
              </pre>
            </Out>

            <Out title={t('kit.linkedin')} note={t('kit.linkedinNote')} onCopy={() => copy(kit.linkedin)} data="kit-linkedin">
              <p className="mt-2 text-[12.5px] leading-[1.9] text-ink" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                {kit.linkedin}
              </p>
            </Out>

            <Out title={t('kit.email')} note={t('kit.emailNote')} onCopy={() => copy(`${kit.email.subject}\n\n${kit.email.body}`)} data="kit-email">
              <p className="mt-2 text-[12.5px] font-bold text-ink" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                {t('kit.emailSubject')}: {kit.email.subject}
              </p>
              <pre
                className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[12.5px] leading-[1.9] text-dim"
                dir={lang === 'en' ? 'ltr' : 'rtl'}
              >
                {kit.email.body}
              </pre>
            </Out>

            <div className="rounded-3xl border border-brand/25 bg-brand/6 p-5 lg:col-span-2" data-kit-todo>
              <p className="text-[13px] font-extrabold text-ink">{t('kit.todo')}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {kit.todo.length ? (
                  kit.todo.map((x, i) => (
                    <li key={i} className="text-[12.5px] leading-relaxed text-dim">
                      — {x}
                    </li>
                  ))
                ) : (
                  <li className="text-[12.5px] leading-relaxed text-dim">{t('kit.todoNone')}</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <Reveal className="mt-6 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7">
          <h2 className="text-[16px] font-extrabold text-ink">{t('kit.faqTitle')}</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {faq.map(([q, a]) => (
              <div key={q}>
                <dt className="text-[13px] font-bold text-ink">{q}</dt>
                <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{a}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </div>
  )
}

function Out({ title, note, onCopy, children, data }) {
  const { t } = useI18n()
  return (
    <section className="rounded-3xl border border-line bg-panel/70 p-5" data-kit-block={data}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold text-ink">{title}</h3>
          <p className="mt-0.5 text-[11.5px] text-dim">{note}</p>
        </div>
        <Btn variant="ghost" size="xs" onClick={onCopy}>
          <Icon n="copy" className="size-3.5" />
          {t('kit.copy')}
        </Btn>
      </div>
      {children}
    </section>
  )
}
