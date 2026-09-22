import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { brands, brandsEn, byId, categories, templates, testimonials } from '../data/templates'
import { proPlans } from '../data/upsells'
import { SUPPORT_MAIL, SUPPORT_MAILTO } from '../data/contact'
import Preview, { ArtTile } from '../components/Preview'
import TemplateCard from '../components/TemplateCard'
import QuickView from '../components/QuickView'
import RecentlyViewed from '../components/RecentlyViewed'
import { useSeo, siteGraph, faqLd } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal, Stars } from '../components/ui'
import { useStore } from '../store/StoreContext'

const HERO_IDS = ['aether', 'mirrorbundle', 'nexus', 'nova']
const FAQ_KEYS = ['1', '2', '3', '4', '5', '6']
const DEPLOY_CMDS = [
  'git clone https://github.com/qalb/aether.git my-portfolio',
  'cd my-portfolio && npm i && cp .env.example .env',
  'npm run dev            # localhost:4321 — edit content/profile.json',
  'npm run build && npx vercel deploy --prod',
]

export default function Home() {
  const { t, L } = useI18n()
  const [quick, setQuick] = useState(null)

  // أسئلة الصفحة نفسها حرفيًا — نفس مفاتيح قسم FAQ أدناه، فلا يُعلن البحث عن
  // سؤالٍ لا تراه الصفحة
  const faq = FAQ_KEYS.map((k) => [t(`faq.q${k}`), t(`faq.a${k}`)])
  useSeo(t('meta.title'), t('meta.desc'), { jsonLd: siteGraph(t, [faqLd(faq)]) })

  return (
    <>
      <Hero onQuick={setQuick} />
      <Trust />
      <Categories />
      <Featured onQuick={setQuick} />
      <Identity />
      <HowItWorks />
      <ProofBlock />
      <DeployBlock />
      <Features />
      <Bundles />
      <ProBand />
      <RecentlyViewed />
      <Testimonials />
      <Faq />
      <CtaBand />
      {quick && <QuickView tpl={quick} onClose={() => setQuick(null)} />}
    </>
  )
}

/* =============================== HERO =============================== */
function Hero({ onQuick }) {
  const { t, L } = useI18n()
  const heroSet = useMemo(() => HERO_IDS.map((id) => templates.find((x) => x.id === id)).filter(Boolean), [])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setI((v) => (v + 1) % heroSet.length), 5000)
    return () => clearInterval(id)
  }, [paused, heroSet.length])

  const cur = heroSet[i] || templates[0]
  const order = heroSet.map((_, k) => (i + k) % heroSet.length)

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.5] [mask-image:radial-gradient(70%_58%_at_50%_0%,#000,transparent)]" />
      <div className="pointer-events-none absolute inset-0 grad-mesh" />
      <div className="page-x relative mx-auto grid max-w-[1400px] items-center gap-14 pb-24 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:pb-32 lg:pt-20">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 py-1.5 pe-3 ps-1.5 text-[12px] font-semibold shadow-soft backdrop-blur">
              <span className="flex items-center gap-0.5 rounded-full bg-brand/15 px-2 py-1 text-brand">
                {[0, 1, 2, 3, 4].map((k) => (
                  <Icon key={k} n="star" className="size-3" fill sw={0} />
                ))}
              </span>
              {t('hero.pill')}
            </span>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-6 font-display text-[clamp(2.2rem,5.6vw,3.8rem)] font-extrabold leading-[1.08] tracking-tight">
              {t('hero.t1')}{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-b from-brand to-brand2 bg-clip-text text-transparent">{t('hero.t2')}</span>
                <svg
                  viewBox="0 0 300 16"
                  className="absolute inset-x-0 -bottom-1 z-0 h-3 w-full text-brand/35"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M2 12C60 4 120 3 180 7c40 2 80 5 118 2" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-6 max-w-xl text-[16.5px] leading-[1.85] text-dim">{t('hero.sub')}</p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Btn to="/templates" size="lg" className="min-w-[190px]">
                {t('hero.ctaPrimary')}
                <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
              </Btn>
              <Btn size="lg" variant="outline" onClick={() => onQuick(cur)} className="min-w-[190px]">
                <Icon n="monitor" className="size-4 text-brand" />
                {t('hero.ctaSecondary')}
              </Btn>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-dim">
              {t('hero.note')
                .split('·')
                .map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <Icon n="check" className="size-3.5 text-brand" sw={2.6} />
                    {s.trim()}
                  </span>
                ))}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <dl className="mt-11 grid max-w-lg grid-cols-2 gap-x-6 gap-y-7 border-t border-line pt-8 sm:grid-cols-4">
              {[
                [`${num(templates.length)}+`, t('hero.statTemplates')],
                ['4.9', t('hero.statRating')],
                ['24K', t('hero.statHired')],
                ['38', t('hero.statCountries')],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="num text-2xl font-extrabold tracking-tight">{v}</dt>
                  <dd className="mt-1 text-[11.5px] leading-tight text-dim">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* fanned product previews */}
        <Reveal delay={140} className="relative mx-auto w-full max-w-[560px]">
          <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-brand/10 blur-3xl" />
            {order.map((idx, slot) => {
              const tpl = heroSet[idx]
              return (
                <div
                  key={tpl.id}
                  className={slot === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
                  style={{
                    transform:
                      slot === 0
                        ? undefined
                        : `translate(${slot * 3}%, ${slot * 4.5}%) scale(${1 - slot * 0.05}) rotate(${slot % 2 ? slot * 1.1 : -slot * 0.9}deg)`,
                    zIndex: heroSet.length - slot,
                    opacity: slot > 2 ? 0 : 1 - slot * 0.4,
                    transition: 'transform .8s cubic-bezier(.2,.8,.2,1), opacity .7s ease',
                  }}
                >
                  <div className={`overflow-hidden rounded-2xl border border-line bg-panel p-2 shadow-lift ${slot === 0 ? '' : 'hidden sm:block'}`}>
                    <Preview tpl={tpl} variant={tpl.type === 'cv' ? 'full' : undefined} device="desktop" chrome className="rounded-xl" />
                  </div>
                </div>
              )
            })}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ArtTile tpl={cur} size={34} />
                <div>
                  <p className="text-[13.5px] font-extrabold">{L(cur.name)}</p>
                  <p className="text-[11.5px] text-dim">{L(cur.tagline)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {heroSet.map((tpl, k) => (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => setI(k)}
                      aria-label={L(tpl.name)}
                      className={`h-1.5 rounded-full transition-all ${k === i ? 'w-8 bg-brand' : 'w-3 bg-line hover:bg-dim'}`}
                    />
                  ))}
                </div>
                <Link to={`/template/${cur.slug}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline">
                  {t('card.view')}
                  <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
                </Link>
              </div>
            </div>
          </div>

          {/* z-[10]: بطاقات المروحة تحمل zIndex صريحًا (بطول القائمة) فبدون طبقة أعلى
              كانت شارة «درجة الأداء» تُرسم خلف المعاينة وتُقصّ عند حوافها */}
          <div className="absolute -start-4 top-[-14px] z-[10] hidden animate-float rounded-2xl border border-line bg-panel/95 p-3 shadow-lift backdrop-blur sm:block">
            <p className="text-[11px] font-medium text-dim">{cur.perf ? t('product.perfScore') : t('product.atsScore')}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="num text-[17px] font-extrabold text-brand">{cur.perf || cur.ats}</span>
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${cur.perf || cur.ats}%` }} />
              </span>
            </div>
          </div>
          <div className="absolute -end-3 bottom-16 z-[10] hidden animate-float rounded-2xl border border-line bg-panel/95 p-3 shadow-lift backdrop-blur [animation-delay:1.6s] lg:block">
            <p className="text-[11px] font-medium text-dim">{t('product.stack')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(cur.stack || []).slice(0, 3).map((f) => (
                <span key={f} className="num rounded-md border border-line bg-bg px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* =============================== TRUST =============================== */
function Trust() {
  const { t, lang } = useI18n()
  const list = lang === 'ar' ? brands : brandsEn
  return (
    <section className="border-y border-line bg-bg2/70 py-7" data-trust>
      <div className="page-x mx-auto flex max-w-[1400px] flex-col gap-5 md:flex-row md:items-center">
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-dim md:w-44">{t('trust.label')}</p>
        {/* صفّ ثابت: الشريط المتحرّك كان يقفز عند اللفّة — translateX(-50%) لا يساوي عرض نسخة واحدة
            ما دام الـ gap يفصل النسختين، فتظهر القفزة كأنها خطأ برمجي. */}
        <ul className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3 md:justify-between">
          {list.map((b) => (
            <li key={b} className="whitespace-nowrap font-display text-[18px] font-bold opacity-45 transition hover:opacity-100">
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* =============================== CATEGORIES =============================== */
function Categories() {
  const { t, lang } = useI18n()
  return (
    <section className="page-x mx-auto max-w-[1400px] py-20" id="categories">
      <Reveal>
        <Head kicker={t('nav.categories')} title={t('cats.title')} sub={t('cats.sub')} />
      </Reveal>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c, k) => {
          const count = templates.filter((x) => x.cats.includes(c.id)).length
          if (!count) return null
          return (
            <Reveal key={c.id} delay={k * 45} className="h-full">
              <Link
                to={`/templates?cat=${c.id}`}
                className="group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-line bg-panel p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift"
              >
                <span className="absolute -end-8 -top-8 size-20 rounded-full bg-brand/0 blur-2xl transition-all duration-500 group-hover:bg-brand/25" />
                <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-bg text-brand transition-transform duration-300 group-hover:scale-110">
                  <Icon n={c.icon} className="size-5" />
                </span>
                <span className="relative min-w-0">
                  <span className="block truncate font-display text-[15.5px] font-bold">{lang === 'ar' ? c.ar : c.en}</span>
                  <span className="num mt-0.5 block text-[11.5px] text-dim">
                    {num(count)} {t('nav.templates')}
                  </span>
                </span>
                <Icon
                  n="arrow"
                  className="relative ms-auto size-4 shrink-0 text-dim transition-all group-hover:translate-x-1 group-hover:text-brand rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                />
              </Link>
            </Reveal>
          )
        })}
      </div>

      {/* product types */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { id: 'portfolio', icon: 'globe' },
          { id: 'bundle', icon: 'layers' },
          { id: 'cv', icon: 'file' },
        ].map((ty) => {
          const n = templates.filter((x) => x.type === ty.id).length
          return (
            <Link
              key={ty.id}
              to={`/templates?type=${ty.id}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/40 px-4 py-3 transition hover:border-brand/40 hover:bg-panel"
            >
              <Icon n={ty.icon} className="size-5 text-brand" />
              <span className="text-[13.5px] font-bold">{t(`types.${ty.id}`)}</span>
              <span className="num ms-auto text-[12px] font-bold text-dim">{num(n)}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/* =============================== FEATURED =============================== */
function Featured({ onQuick }) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState('all')
  const list = useMemo(() => {
    const base = tab === 'all' ? templates.filter((x) => x.featured || x.best) : templates.filter((x) => x.cats.includes(tab))
    return base.slice(0, 6)
  }, [tab])

  return (
    <section className="border-y border-line bg-bg2/50 py-20">
      <div className="page-x mx-auto max-w-[1400px]">
        <Reveal>
          <Head
            title={t('featured.title')}
            sub={t('featured.sub')}
            right={
              <Btn to="/templates" variant="outline" size="md">
                {t('featured.linkCatalog')}
                <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
              </Btn>
            }
          />
        </Reveal>

        <div className="no-bar mt-8 flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', ar: t('featured.filterAll'), en: t('featured.filterAll') },
            ...categories.filter((c) => templates.some((x) => x.cats.includes(c.id))),
          ].map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setTab(c.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition ${
                tab === c.id ? 'border-brand bg-brand text-brandink' : 'border-line bg-panel text-dim hover:text-ink'
              }`}
            >
              {lang === 'ar' ? c.ar : c.en}
            </button>
          ))}
        </div>

        {list.length ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((tpl, k) => (
              <Reveal key={tpl.id} delay={k * 60} className="h-full">
                <TemplateCard tpl={tpl} onQuick={onQuick} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-line bg-panel p-10 text-center text-[14px] text-dim">{t('featured.empty')}</p>
        )}
      </div>
    </section>
  )
}

/* =============================== IDENTITY =============================== */
function Identity() {
  const { t } = useI18n()
  const bundle = templates.find((x) => x.id === 'mirrorbundle')
  return (
    <section className="page-x mx-auto max-w-[1400px] py-20" id="identity">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <Reveal>
          <Head kicker={t('identity.kicker')} title={t('identity.title')} sub={t('identity.sub')} />
          <ul className="mt-8 space-y-5">
            {['i1', 'i2', 'i3'].map((k, i) => (
              <li key={k} className="flex gap-4">
                <span className="num grid size-8 shrink-0 place-items-center rounded-full border border-brand/30 bg-brand/10 text-[13px] font-extrabold text-brand">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-[16px] font-extrabold">{t(`identity.${k}`)}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{t(`identity.${k}d`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Btn to="/templates?type=bundle" className="mt-9">
            <Icon n="layers" className="size-4" />
            {t('identity.cta')}
          </Btn>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative rounded-[28px] border border-line bg-panel p-5 shadow-lift">
            <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
            <div className="relative flex items-end gap-3">
              <div className="flex-1 overflow-hidden rounded-xl border border-line">
                <Preview tpl={bundle} device="tablet" chrome className="rounded-lg" />
              </div>
              <div className="w-[38%] overflow-hidden rounded-xl border border-line p-1.5">
                <Preview tpl={bundle} kind="cv" variant="full" className="rounded-lg" />
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2.5">
              <span className="flex items-center gap-1.5">
                {['#6d28d9', '#0f7a58', '#2563eb', '#be123c'].map((c) => (
                  <span key={c} className="size-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                ))}
              </span>
              <span className="text-[11.5px] font-semibold text-dim">{t('product.color')}</span>
              <Pill tone="brand" className="ms-auto">
                <Icon n="bolt" className="size-3" fill sw={0} />
                {t('identity.kicker')}
              </Pill>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* =============================== HOW =============================== */
function HowItWorks() {
  const { t } = useI18n()
  const steps = [
    { k: '01', icon: 'grid', title: t('how.s1'), d: t('how.s1d') },
    { k: '02', icon: 'sliders', title: t('how.s2'), d: t('how.s2d') },
    { k: '03', icon: 'rocket', title: t('how.s3'), d: t('how.s3d') },
  ]
  return (
    <section className="border-y border-line bg-bg2/40 py-20" id="guide">
      <div className="page-x mx-auto max-w-[1400px]">
        <Reveal>
          <Head title={t('how.title')} sub={t('how.sub')} align="center" />
        </Reveal>
        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          <div className="pointer-events-none absolute inset-x-10 top-[46px] hidden h-px bg-[repeating-linear-gradient(to_right,var(--c-line)_0_10px,transparent_10px_18px)] md:block" />
          {steps.map((s, k) => (
            <Reveal key={s.k} delay={k * 100} className="h-full">
              <div className="relative flex h-full flex-col items-start rounded-2xl border border-line bg-panel p-6">
                <span className="relative grid size-[52px] place-items-center rounded-2xl bg-bg text-brand ring-1 ring-line">
                  <Icon n={s.icon} className="size-6" />
                </span>
                <span className="num absolute end-5 top-4 font-display text-[34px] font-extrabold leading-none text-line select-none">{s.k}</span>
                <h3 className="mt-5 font-display text-[19px] font-extrabold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-dim">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =============================== PROOF =============================== */
function ProofBlock() {
  const { t } = useI18n()
  const [seen, ref] = useInView(0.25)
  const pct = seen ? 96 : 0

  const bad = ['b1', 'b2', 'b3', 'b4'].map((k) => t(`proof.${k}`))
  const good = ['g1', 'g2', 'g3', 'g4'].map((k) => t(`proof.${k}`))

  return (
    <section className="relative overflow-hidden py-20" id="proof">
      <div className="pointer-events-none absolute inset-0 grad-mesh opacity-70" />
      <div className="page-x relative mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-danger">{t('proof.kicker')}</p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-extrabold leading-[1.2]">{t('proof.title')}</h2>
            <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-dim">{t('proof.sub')}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <ul className="space-y-2.5 rounded-2xl border border-line bg-panel p-4">
                <li className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('proof.bad')}</li>
                {bad.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <Icon n="close" className="mt-0.5 size-4 shrink-0 text-danger" sw={2.4} />
                    <span className="text-dim">{x}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2.5 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
                <li className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">{t('proof.good')}</li>
                {good.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <Icon n="check" className="mt-0.5 size-4 shrink-0 text-brand" sw={2.6} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Btn to="/templates">
                {t('proof.cta')}
                <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
              </Btn>
              <Btn to="/ats" variant="outline">
                <Icon n="scan" className="size-4 text-brand" />
                {t('proof.ctaAts')}
              </Btn>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div ref={ref} className="overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-bold">{t('proof.scanLabel')}</p>
              <Pill tone="brand">
                <Icon n="shield" className="size-3" />
                Qalb Audit v3
              </Pill>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div className="relative grid size-[104px] shrink-0 place-items-center">
                <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-line)" strokeWidth="9" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--c-brand)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 326.7} 326.7`}
                    style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(.2,.8,.2,1)' }}
                  />
                </svg>
                <span className="num text-2xl font-extrabold">{pct}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {[
                  ['LCP 1.1s', 99],
                  ['CLS 0.01', 97],
                  ['CV parsable', 96],
                  ['RTL + i18n', 92],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="flex items-center justify-between text-[11.5px] font-semibold">
                      <span className="text-dim">{l}</span>
                      <span className="num">{pct ? v : 0}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-[1400ms] ease-out"
                        style={{ width: pct ? `${v}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 space-y-2 rounded-2xl border border-line bg-bg p-4 font-mono text-[11.5px] leading-relaxed text-dim">
              {[
                ['✓', 'hero.scan1'],
                ['✓', 'hero.scan2'],
                ['✓', 'hero.scan3'],
                ['!', 'hero.scan4'],
              ].map(([mark, k]) => (
                <p key={k} className={mark === '!' ? 'text-gold' : undefined}>
                  <span className={mark === '!' ? '' : 'text-brand'}>{mark}</span> {t(k)}
                </p>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* =============================== DEPLOY =============================== */
function DeployBlock() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DEPLOY_CMDS.join('\n'))
    } catch {
      /* clipboard may be blocked — still show feedback */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <section className="border-y border-line bg-bg2/40 py-20" id="deploy">
      <div className="page-x mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <Reveal>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">{t('deploy.kicker')}</p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold leading-[1.2]">{t('deploy.title')}</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-dim">{t('deploy.sub')}</p>
            <ul className="mt-7 space-y-2.5">
              {['p1', 'p2', 'p3'].map((k) => (
                <li key={k} className="flex items-center gap-2.5 text-[13.5px]">
                  <Icon n="check" className="size-4 shrink-0 text-brand" sw={2.6} />
                  <span className="text-dim">{t(`deploy.${k}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('deploy.hosts')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Vercel', 'Netlify', 'Cloudflare', 'GitHub Pages'].map((h) => (
                <span key={h} className="num rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-bold text-dim">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={110}>
          <div className="overflow-hidden rounded-2xl border border-line bg-[#0a0c11] shadow-lift">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="flex gap-1.5">
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <i key={c} className="size-2.5 rounded-full" style={{ background: c }} />
                ))}
              </span>
              <span className="num ms-2 text-[11.5px] font-semibold text-dim">zsh — qalb/aether</span>
              <button
                type="button"
                onClick={copy}
                className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[11.5px] font-bold text-ink transition hover:border-brand/40 hover:text-brand"
              >
                <Icon n={copied ? 'check' : 'copy'} className="size-3.5" sw={copied ? 2.6 : 1.8} />
                {copied ? t('deploy.copied') : t('deploy.copy')}
              </button>
            </div>
            <pre className="thin-bar overflow-x-auto px-4 py-4 text-[12.5px] leading-[2] whitespace-pre text-[#c9d3e4]" dir="ltr">
              {DEPLOY_CMDS.map((l, i) => (
                <div key={i}>
                  <span className="me-2 text-brand">$</span>
                  {l}
                </div>
              ))}
              <div className="text-brand">✓ deployed → https://sarah.qalb.app</div>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* =============================== FEATURES =============================== */
function Features() {
  const { t } = useI18n()
  const items = [
    ['bolt', 'f1'],
    ['scan', 'f2'],
    ['globe', 'f3'],
    ['layers', 'f4'],
    ['eye', 'f5'],
    ['file', 'f6'],
  ].map(([icon, k]) => ({ icon, title: t(`features.${k}`), d: t(`features.${k}d`) }))

  return (
    <section className="page-x mx-auto max-w-[1400px] py-20" id="story">
      <Reveal>
        <Head title={t('features.title')} sub={t('features.sub')} align="center" />
      </Reveal>
      <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f, k) => (
          <Reveal key={f.title} delay={k * 55} className="h-full">
            <div className="group h-full bg-panel p-7 transition-colors hover:bg-panel2">
              <span className="grid size-11 place-items-center rounded-xl border border-line bg-bg text-brand transition-transform duration-300 group-hover:-translate-y-0.5">
                <Icon n={f.icon} className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-[17px] font-extrabold">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{f.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* =============================== BUNDLES =============================== */
function Bundles() {
  const { t } = useI18n()
  const { add, toast } = useStore()
  const plans = [
    // السعرُ مشتقٌّ من مَنشورِ كل قالبٍ لا رقمٌ مكتوب تحت البطاقة: ما تراه الباقة
    // هو ما تحسبه السلة بالضبط، وعددُ «كل القوالب» هو عددُ المتجر حقًّا.
    ...['single', 'duo', 'career'].map((key, i) => {
      const ids = key === 'single' ? ['folio'] : key === 'duo' ? ['mirrorbundle'] : templates.map((x) => x.id)
      return {
        key,
        ids,
        price: ids.reduce((n, id) => n + (byId(id)?.price || 0), 0),
        icon: ['globe', 'layers', 'crown'][i],
        pop: key === 'duo',
      }
    }),
  ]
  return (
    <section className="relative border-y border-line bg-bg2/50 py-20" id="bundles">
      <div className="page-x mx-auto max-w-[1400px]">
        <Reveal>
          <Head title={t('pricing.title')} sub={t('pricing.sub')} align="center" />
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((p, k) => (
            <Reveal key={p.key} delay={k * 90} className="h-full">
              <div
                className={`relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 ${
                  p.pop ? 'border-brand/45 bg-panel shadow-lift lg:-mt-4 lg:pb-9 lg:pt-9' : 'border-line bg-panel/60 hover:-translate-y-1'
                }`}
              >
                {p.pop && (
                  <Pill tone="brand" className="absolute -top-3 start-7">
                    {t('pricing.popular')}
                  </Pill>
                )}
                <span className={`grid size-11 place-items-center rounded-xl border border-line bg-bg ${p.pop ? 'text-brand' : 'text-dim'}`}>
                  <Icon n={p.icon} className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-[20px] font-extrabold">{t(`pricing.${p.key}`)}</h3>
                <p className="mt-1.5 min-h-[44px] text-[13.5px] leading-relaxed text-dim">{t(`pricing.${p.key}Desc`)}</p>
                <div className="mt-4 flex items-end gap-2">
                  <Money v={p.price} size="text-4xl" />
                  <span className="pb-2 text-[12px] font-semibold text-dim">/ {t('pricing.perOnce')}</span>
                </div>
                <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
                  {['f1', 'f2', 'f3', 'f4'].map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px]">
                      <Icon n="check" className="mt-0.5 size-4 shrink-0 text-brand" sw={2.6} />
                      <span className="text-dim">{t(`pricing.${f}`)}</span>
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-[13.5px]">
                    <Icon n="file" className="mt-0.5 size-4 shrink-0 text-brand" sw={2.2} />
                    <span className="text-dim">
                      <span className="num">{num(p.ids.length)}</span> {t('nav.templates')}
                    </span>
                  </li>
                </ul>
                <Btn
                  variant={p.pop ? 'primary' : 'outline'}
                  size="lg"
                  className="mt-7 w-full"
                  onClick={() => {
                    p.ids.forEach((id) => add(id))
                    toast(`${t('toast.cartAdded')} — ${p.ids.length}`)
                  }}
                >
                  {t('pricing.choose')}
                </Btn>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =============================== QALB PRO =============================== */
/**
 * الاشتراك، موازيًا للشراء لمرة واحدة: الأسعار من src/data/upsells.js (pro-month
 * وpro-year) لا من هذه الصفحة، فما يظهر هنا هو ما تحسب به السلة والخادم.
 * لا تجديد تلقائي: لا بوابة دفع هنا تُديمه، والنصُّ يقول ذلك.
 */
function ProBand() {
  const { t, L } = useI18n()
  const { toggleAddon, hasAddon, toast } = useStore()
  const plans = proPlans()
  const [month, year] = [plans.find((p) => p.period === 'month'), plans.find((p) => p.period === 'year')]

  return (
    <section className="page-x mx-auto max-w-[1400px] pt-20" id="pro" data-pro>
      <Reveal>
        <Head title={t('pro.title')} sub={t('pro.sub')} align="center" />
      </Reveal>
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        {[month, year].filter(Boolean).map((p, k) => {
          const on = hasAddon(p.id)
          return (
            <Reveal key={p.id} delay={k * 90} className="h-full">
              <div
                data-pro-plan={p.period}
                className={`relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 ${
                  k === 1 ? 'border-brand/45 bg-panel shadow-lift lg:-mt-4 lg:pb-9 lg:pt-9' : 'border-line bg-panel/60 hover:-translate-y-1'
                }`}
              >
                {k === 1 && (
                  <Pill tone="brand" className="absolute -top-3 start-7">
                    {t('pro.bestValue')}
                  </Pill>
                )}
                <span className={`grid size-11 place-items-center rounded-xl border border-line bg-bg ${k === 1 ? 'text-brand' : 'text-dim'}`}>
                  <Icon n={p.icon || 'refresh'} className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-[20px] font-extrabold">{L(p.name)}</h3>
                <p className="mt-1.5 min-h-[44px] text-[13.5px] leading-relaxed text-dim">{L(p.tagline)}</p>
                <div className="mt-4 flex items-end gap-2">
                  <Money v={p.price} size="text-4xl" />
                  <span className="pb-2 text-[12px] font-semibold text-dim">/ {p.period === 'month' ? t('pro.perMonth') : t('pro.perYear')}</span>
                </div>
                <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
                  {['f1', 'f2', 'f3', 'f4'].map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px]">
                      <Icon n="check" className="mt-0.5 size-4 shrink-0 text-brand" sw={2.6} />
                      <span className="text-dim">{t(`pro.${f}`)}</span>
                    </li>
                  ))}
                </ul>
                <Btn
                  variant={k === 1 ? 'primary' : 'outline'}
                  size="lg"
                  className="mt-7 w-full"
                  onClick={() => {
                    const added = toggleAddon(p.id)
                    toast(added ? t('cart.addonAdded', { n: L(p.name) }) : t('cart.addonRemoved', { n: L(p.name) }))
                  }}
                >
                  {on ? t('pro.inCart') : t('pro.cta')}
                </Btn>
              </div>
            </Reveal>
          )
        })}
      </div>
      <p className="mx-auto mt-8 max-w-[640px] text-center text-[12px] leading-relaxed text-dim">
        {t('pro.note')}{' '}
        <a href="#bundles" className="font-bold text-brand hover:underline">
          {t('pro.onceLink')}
        </a>
        {' · '}
        <span className="num">{t('pro.savingNote', { n: num(month && year ? month.price * 12 - year.price : 0) })}</span>
      </p>
    </section>
  )
}

/* =============================== TESTIMONIALS =============================== */
function Testimonials() {
  const { t, L } = useI18n()
  return (
    <section className="page-x mx-auto max-w-[1400px] py-20" id="testimonials">
      <Reveal>
        <Head
          title={t('testimonials.title')}
          sub={t('testimonials.sub')}
          right={
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
              <Stars value={4.9} size={15} />
              <span className="num text-[13px] font-bold">4.9 · 6,214</span>
            </div>
          }
        />
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((x, k) => (
          <Reveal key={x.id} delay={k * 70} className="h-full">
            <figure className="relative flex h-full flex-col rounded-2xl border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-soft">
              <Icon n="quote" className="absolute end-5 top-5 size-8 text-line" fill sw={0} />
              <Stars value={x.stars} size={13} show={false} />
              <blockquote className="mt-4 flex-1 text-[14.5px] leading-[1.85] text-ink/90">{L(x.text)}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/12 font-display text-[15px] font-extrabold text-brand">
                  {L(x.name).trim().charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold">{L(x.name)}</span>
                  <span className="block truncate text-[11.5px] text-dim">{L(x.role)}</span>
                </span>
                <span className="num ms-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-brand/25 bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                  <Icon n="check" className="size-3" sw={2.8} />
                  {t('testimonials.verified')}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* =============================== FAQ =============================== */
function Faq() {
  const { t } = useI18n()
  const keys = FAQ_KEYS
  const [open, setOpen] = useState('1')
  return (
    <section className="border-t border-line bg-bg2/40 py-20" id="faq">
      <div className="page-x mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[.85fr_1.15fr]">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <Head kicker={t('nav.support')} title={t('faq.title')} sub={t('faq.sub')} />
            <div className="mt-7 flex flex-col gap-2">
              <Btn href={SUPPORT_MAILTO} variant="outline" size="md" className="justify-start">
                <Icon n="mail" className="size-4 text-brand" />
                {SUPPORT_MAIL}
              </Btn>
              <Pill className="w-max">
                <Icon n="clock" className="size-3" />
                Sun–Thu · 9:00–18:00 AST
              </Pill>
            </div>
          </div>
        </Reveal>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {keys.map((k) => {
            const isOpen = open === k
            return (
              <div key={k}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? '' : k)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-start transition hover:bg-panel2 ${isOpen ? 'bg-panel2' : ''}`}
                >
                  <span className="flex-1 text-[15px] font-bold leading-snug">{t(`faq.q${k}`)}</span>
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300 ${isOpen ? 'rotate-45 border-brand bg-brand/12 text-brand' : 'border-line text-dim'}`}
                  >
                    <Icon n="plus" className="size-3.5" sw={2.2} />
                  </span>
                </button>
                <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[14px] leading-[1.9] text-dim">{t(`faq.a${k}`)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* =============================== CTA =============================== */
function CtaBand() {
  const { t } = useI18n()
  return (
    <section className="page-x mx-auto max-w-[1400px] py-20" id="contact">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border border-line bg-ink px-7 py-14 text-bg shadow-lift sm:px-12 light:bg-brand light:text-brandink">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.14]" />
          <div className="pointer-events-none absolute -end-24 -top-24 size-64 rounded-full bg-brand/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 start-10 size-72 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="font-display text-[clamp(1.55rem,3.2vw,2.3rem)] font-extrabold leading-[1.25]">{t('cta.title')}</h2>
              <p className="mt-3 text-[15px] leading-relaxed opacity-75">{t('cta.sub')}</p>
              <p className="num mt-5 text-[12.5px] font-semibold opacity-70">
                {num(24128)} · {t('hero.pill')}
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Btn to="/templates" size="lg" variant="gold" className="w-full sm:w-auto">
                {t('cta.primary')}
              </Btn>
              <Btn href={SUPPORT_MAILTO} size="lg" className="w-full border border-bg/25 bg-bg/10 text-bg backdrop-blur hover:bg-bg/20 sm:w-auto">
                {t('cta.secondary')}
              </Btn>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* =============================== helpers =============================== */
/** One-shot "is it on screen yet" flag — used to fire the score meters. */
function useInView(threshold = 0.35) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (ents) => {
        if (ents.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [seen, ref]
}
