import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import {
  FONTS,
  LAYOUTS,
  PALETTE,
  HEROES,
  GALLERIES,
  DEVICES,
  categories,
  accentHex,
  bySlug,
  siteFor,
  templates,
  testimonials,
} from '../data/templates'
import { packageIndex } from '../data/deliverable'
import Preview, { showSite } from '../components/Preview'
import TemplateCard from '../components/TemplateCard'
import QuickView from '../components/QuickView'
import { useSeo, productLd, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal, Stars } from '../components/ui'
import { useStore } from '../store/StoreContext'
import Personalize from '../components/Personalize'

export default function Product() {
  const { slug } = useParams()
  const tpl = bySlug(slug)
  const { t, L, LA, lang } = useI18n()
  const pkg = useMemo(() => (tpl ? packageIndex(tpl) : null), [tpl]) // حزمة التسليم الحقيقية، من نفس مولّد الملفات
  const { add, inCart, toast, toggleWish, wish, pushRecent } = useStore()
  const nav = useNavigate()

  const isBundle = tpl?.type === 'bundle'
  const raw = tpl ? siteFor(tpl) || {} : {}
  const [kind, setKind] = useState(showSite(tpl || {}) ? 'site' : 'cv')
  const [device, setDevice] = useState('desktop')
  const [theme, setTheme] = useState(tpl?.theme || raw.theme || 'light')
  const [hero, setHero] = useState(raw.hero || 'split')
  const [gallery, setGallery] = useState(raw.gallery || 'grid3')
  const [layout, setLayout] = useState(tpl?.layout || 'single')
  const [accent, setAccent] = useState(tpl?.accent || raw.accent || 'azure')
  const [font, setFont] = useState(tpl?.font || raw.font || 'sans')
  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState('details')
  const [demo, setDemo] = useState(false)

  const related = useMemo(() => (tpl ? templates.filter((x) => x.id !== tpl.id && x.cats.some((c) => tpl.cats.includes(c))).slice(0, 3) : []), [tpl])

  useSeo(
    tpl ? `${L(tpl.name)} · ${t('brand.name')}` : `${t('catalog.noResults')} · ${t('brand.name')}`,
    tpl ? t('meta.productDesc', { tag: L(tpl.tagline) }) : t('meta.notFoundDesc'),
    {
      jsonLd: tpl
        ? graph(
            productLd(tpl, lang, t),
            breadcrumbLd([
              { name: t('crumb.home'), path: '/' },
              { name: t('nav.templates'), path: '/templates' },
              { name: L(tpl.name), path: `/template/${tpl.slug}` },
            ]),
          )
        : null,
      type: 'product',
      image: tpl ? `/og/${tpl.slug}.png` : undefined,
    },
  )

  // "recently viewed" only counts real product views
  useEffect(() => {
    if (tpl) pushRecent(tpl.id)
  }, [tpl, pushRecent])

  if (!tpl) {
    return (
      <div className="page-x mx-auto max-w-[1400px] py-28 text-center">
        <h1 className="font-display text-3xl font-extrabold">{t('catalog.noResults')}</h1>
        <p className="mt-3 text-[14px] text-dim">{t('product.noResults')}</p>
        <Btn to="/templates" className="mt-6">
          {t('nav.templates')}
        </Btn>
      </div>
    )
  }

  const viewingSite = isBundle ? kind === 'site' : showSite(tpl)
  const off = tpl.oldPrice ? Math.round((1 - tpl.price / tpl.oldPrice) * 100) : 0
  const hex = accentHex(accent)
  const saved = wish.includes(tpl.id)
  const cat = categories.find((c) => tpl.cats.includes(c.id))

  const doAdd = () => {
    const fresh = add(tpl.id)
    toast(fresh ? `${t('toast.cartAdded')} — ${L(tpl.name)}` : t('catalog.inCart'))
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 grad-mesh" />

      <div className="page-x relative mx-auto max-w-[1400px] pt-7">
        <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-dim">
          <Link to="/" className="hover:text-ink">
            {t('brand.name')}
          </Link>
          <Icon n="chevron" className="size-3 -rotate-90 rtl:rotate-90" />
          <Link to="/templates" className="hover:text-ink">
            {t('nav.templates')}
          </Link>
          {cat && (
            <>
              <Icon n="chevron" className="size-3 -rotate-90 rtl:rotate-90" />
              <Link to={`/templates?cat=${cat.id}`} className="hover:text-ink">
                {lang === 'ar' ? cat.ar : cat.en}
              </Link>
            </>
          )}
          <Icon n="chevron" className="size-3 -rotate-90 rtl:rotate-90" />
          <span className="text-ink">{L(tpl.name)}</span>
        </nav>
      </div>

      <div className="page-x relative mx-auto grid max-w-[1400px] gap-10 pb-6 pt-8 lg:grid-cols-[minmax(0,1.18fr)_400px]">
        {/* ---------- preview ---------- */}
        <div>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-panel p-4 sm:p-6">
            <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
            <div className="relative mb-4 flex flex-wrap items-center gap-2">
              <Pill tone="brand">
                <Icon n={viewingSite ? 'monitor' : 'file'} className="size-3" />
                {t('product.preview')}
              </Pill>
              {isBundle && (
                <span role="group" aria-label={t('product.kind')} className="inline-flex rounded-lg border border-line bg-bg p-0.5">
                  {[
                    ['site', t('product.siteView'), 'globe'],
                    ['cv', t('product.cvView'), 'file'],
                  ].map(([v, lb, ic]) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setKind(v)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-bold transition ${
                        kind === v ? 'bg-ink text-bg light:bg-brand light:text-brandink' : 'text-dim hover:text-ink'
                      }`}
                    >
                      <Icon n={ic} className="size-3.5" />
                      {lb}
                    </button>
                  ))}
                </span>
              )}
              <button
                type="button"
                onClick={() => setDemo(true)}
                title={t('product.tryIt')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[12px] font-bold text-dim transition hover:border-brand/40 hover:text-brand"
              >
                <Icon n="play" className="size-3" />
                {t('product.tryIt')}
              </button>
              {viewingSite && (
                <div role="group" aria-label={t('product.device')} className="ms-auto flex items-center gap-1">
                  {DEVICES.map((dv) => (
                    <button
                      type="button"
                      key={dv.id}
                      onClick={() => setDevice(dv.id)}
                      title={L(dv)}
                      aria-label={L(dv)}
                      className={`grid size-8 place-items-center rounded-lg border transition ${
                        device === dv.id ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line bg-bg text-dim hover:text-ink'
                      }`}
                    >
                      <Icon n={dv.id === 'desktop' ? 'monitor' : dv.id === 'tablet' ? 'tablet' : 'smartphone'} className="size-4" />
                    </button>
                  ))}
                </div>
              )}
              {!viewingSite && (
                <div className="ms-auto flex items-center gap-1">
                  {[
                    ['minus', () => setZoom((z) => Math.max(0.85, +(z - 0.15).toFixed(2)))],
                    ['plus', () => setZoom((z) => Math.min(1.35, +(z + 0.15).toFixed(2)))],
                  ].map(([ic, fn]) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={fn}
                      data-zoom-step={ic}
                      aria-label={t(ic === 'plus' ? 'misc.zoomIn' : 'misc.zoomOut')}
                      className="grid size-8 place-items-center rounded-lg border border-line bg-bg text-dim transition hover:text-ink"
                    >
                      <Icon n={ic} className="size-3.5" sw={2.2} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="thin-bar relative overflow-auto rounded-2xl" style={{ maxHeight: 'min(72vh, 760px)' }}>
              <div
                data-zoom={viewingSite ? undefined : zoom}
                className="mx-auto"
                style={
                  viewingSite
                    ? { width: device === 'desktop' ? '100%' : device === 'tablet' ? '62%' : '33%', minWidth: 220 }
                    : { width: `${Math.round(74 * zoom)}%`, minWidth: 300 }
                }
              >
                <Preview
                  tpl={tpl}
                  kind={isBundle ? kind : undefined}
                  device={device}
                  theme={viewingSite ? theme : undefined}
                  hero={hero}
                  gallery={gallery}
                  layout={layout}
                  accent={hex}
                  font={font}
                  variant="full"
                  chrome={viewingSite}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* ---------- customizer ---------- */}
          <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-panel/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <p className="sm:col-span-2 lg:col-span-4 -mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('product.customize')}</p>
            <Group label={t('product.color')}>
              <div className="flex flex-wrap items-center gap-2">
                {PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    title={L(c)}
                    aria-label={L(c)}
                    onClick={() => setAccent(c.id)}
                    className={`size-7 rounded-full border-2 transition-all duration-200 ${
                      accent === c.id ? 'scale-110 border-ink' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </Group>

            {viewingSite ? (
              <>
                <Group label={t('product.theme')}>
                  <div className="flex gap-1.5">
                    {[
                      ['light', t('product.light')],
                      ['dark', t('product.dark')],
                    ].map(([v, lb]) => (
                      <Swatch key={v} on={theme === v} onClick={() => setTheme(v)}>
                        {lb}
                      </Swatch>
                    ))}
                  </div>
                </Group>
                <Group label={t('product.heroStyle')}>
                  <div className="flex flex-wrap gap-1.5">
                    {HEROES.map((o) => (
                      <Swatch key={o.id} on={hero === o.id} onClick={() => setHero(o.id)}>
                        {L(o)}
                      </Swatch>
                    ))}
                  </div>
                </Group>
                <Group label={t('product.gallery')}>
                  <div className="flex flex-wrap gap-1.5">
                    {GALLERIES.map((o) => (
                      <Swatch key={o.id} on={gallery === o.id} onClick={() => setGallery(o.id)}>
                        {L(o)}
                      </Swatch>
                    ))}
                  </div>
                </Group>
              </>
            ) : (
              <>
                <Group label={t('product.layout')} wide>
                  <div className="flex flex-wrap gap-1.5">
                    {LAYOUTS.map((o) => (
                      <Swatch key={o.id} on={layout === o.id} onClick={() => setLayout(o.id)}>
                        {L(o)}
                      </Swatch>
                    ))}
                  </div>
                </Group>
                <Group label={t('product.font')}>
                  <div className="flex flex-wrap gap-1.5">
                    {FONTS.map((o) => (
                      <Swatch key={o.id} on={font === o.id} onClick={() => setFont(o.id)} style={{ fontFamily: o.css }}>
                        {L(o)}
                      </Swatch>
                    ))}
                  </div>
                </Group>
              </>
            )}
          </div>

          {/* ---------- tabs ---------- */}
          <div id="reviews" className="mt-12 scroll-mt-28">
            <div className="no-bar flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
              {[
                ['details', t('product.details')],
                ['sections', `${t('product.sections')}`],
                ['reviews', `${t('product.reviews')} (${num(tpl.reviews)})`],
              ].map(([v, label]) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setTab(v)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-[13.5px] font-bold transition ${tab === v ? 'bg-ink text-bg light:bg-brand light:text-brandink' : 'text-dim hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <List
                  icon="check"
                  title={t('product.whatYouGet')}
                  items={[...LA(tpl.highlights), `${t('product.stack')}: ${(tpl.stack || []).join(' · ')}`, t('product.updates')]}
                />
                <List icon="spark" title={t('product.bestFor')} items={LA(tpl.bestFor)} />
                <p className="md:col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-dim" title={t('product.filesNote')}>
                  <Icon n="file" className="size-3.5 shrink-0" />
                  <span className="font-bold">{pkg ? t('product.files', { n: num(pkg.count) }) : ''}</span>
                  <span className="flex flex-wrap gap-1">
                    {['index.html', 'styles.css', 'content/profile.json', 'resume.html', 'scripts/check-ats.mjs', 'LICENSE.txt']
                      .filter((f) => pkg && pkg.paths.includes(f))
                      .map((f) => (
                        <code key={f} dir="ltr" className="rounded-md border border-line bg-bg px-1.5 py-0.5 text-[11px]">
                          {f}
                        </code>
                      ))}
                  </span>
                </p>
                <div className="md:col-span-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('product.details')}</p>
                  <p className="text-[15px] leading-[1.9] text-ink/85">{L(tpl.desc)}</p>
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-panel p-4">
                    <Icon n="rocket" className="mt-0.5 size-5 shrink-0 text-brand" />
                    <div>
                      <p className="text-[13.5px] font-bold">{t('product.deploy')}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-dim">{t('product.deployNote')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'sections' && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LA(tpl.sections).map((x, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition hover:border-brand/30">
                    <span className="num grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-bg text-[12px] font-bold text-brand">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] font-semibold">{x}</span>
                  </div>
                ))}
                <div className="rounded-xl border border-dashed border-line bg-panel/40 px-4 py-3 text-[13px] text-dim">
                  {tpl.type === 'cv' ? `${t('product.pages')}: ${tpl.pages}` : `${t('product.editing')}: ${t('product.easy')}`}
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-line bg-panel p-5 text-center">
                  <p className="num font-display text-[42px] font-extrabold leading-none">{tpl.rating.toFixed(1)}</p>
                  <div className="mt-2 flex justify-center">
                    <Stars value={tpl.rating} size={15} show={false} />
                  </div>
                  <p className="mt-2 text-[12px] text-dim">{t('product.basedOn', { n: num(tpl.reviews) })}</p>
                  <div className="mt-4 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((sv) => {
                      const p = sv === 5 ? 88 : sv === 4 ? 9 : sv === 3 ? 2 : sv === 2 ? 1 : 0
                      return (
                        <div key={sv} className="flex items-center gap-2">
                          <span className="num w-3 text-[10px] font-bold text-dim">{sv}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                            <span className="block h-full rounded-full bg-gold" style={{ width: `${p}%` }} />
                          </span>
                          <span className="num w-7 text-[10px] text-dim">{p}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {testimonials.slice(0, 4).map((rv, i) => (
                    <article key={rv.id} className="rounded-2xl border border-line bg-panel p-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 font-display text-[14px] font-extrabold text-brand">
                          {L(rv.name).trim().charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-bold">{L(rv.name)}</p>
                          <p className="truncate text-[11.5px] text-dim">{L(rv.role)}</p>
                        </div>
                        <span className="ms-auto flex items-center gap-1">
                          <Stars value={rv.stars} size={11} show={false} />
                        </span>
                      </div>
                      <p className="mt-3 text-[13.5px] leading-[1.85] text-ink/85">{L(rv.text)}</p>
                      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-brand">
                        <Icon n="check" className="size-3" sw={2.8} />
                        {t('testimonials.verified')} · {['2026-06', '2026-03', '2025-12', '2025-09'][i]}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------- buy box ---------- */}
        <div className="lg:sticky lg:top-[92px] lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-soft">
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${hex}, ${hex}44)` }} />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone="solid">
                  <Icon n={tpl.type === 'cv' ? 'file' : tpl.type === 'bundle' ? 'layers' : 'globe'} className="size-3" />
                  {t(`types.${tpl.type}`)}
                </Pill>
                {tpl.best && <Pill tone="gold">{t('card.best')}</Pill>}
                {tpl.isNew && <Pill tone="brand">{t('card.new')}</Pill>}
                {off > 0 && <Pill tone="gold">-{off}%</Pill>}
              </div>
              <h1 className="mt-3 font-display text-[28px] font-extrabold leading-tight">{L(tpl.name)}</h1>
              <p className="mt-1.5 text-[14px] text-dim">{L(tpl.tagline)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Stars value={tpl.rating} />
                <a href="#reviews" className="text-[12px] font-semibold text-brand hover:underline">
                  {num(tpl.reviews)} {t('misc.reviews')}
                </a>
                <span className="num text-[12px] text-dim">
                  · {num(tpl.sales)} {t('misc.sold')}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between border-y border-line py-5">
                <div>
                  {/* سطرُ السعر موسومٌ بـ data-price: الفحصُ يقرأ الرقم من هنا لا من نصِّ الصفحة كلها */}
                  <div className="flex items-baseline gap-2" data-price={tpl.price}>
                    <Money v={tpl.price} size="text-[34px]" />
                    {tpl.oldPrice && <span className="num text-[15px] font-medium text-dim line-through">{tpl.oldPrice}</span>}
                  </div>
                  <p className="mt-1 text-[11.5px] font-semibold text-dim">{t('pricing.f4')}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/10 px-2 py-1 text-[11px] font-bold text-brand">
                  <Icon n="bolt" className="size-3" fill sw={0} />
                  {t('product.inStock').split('—')[0].trim()}
                </span>
              </div>

              <div className="mt-5 grid gap-2">
                <Btn size="lg" onClick={doAdd} className="w-full">
                  <Icon n="cart" className="size-[18px]" />
                  {inCart(tpl.id) ? t('catalog.inCart') : t('product.addCart')}
                </Btn>
                <div className="grid grid-cols-2 gap-2">
                  <Btn
                    size="md"
                    variant="dark"
                    onClick={() => {
                      add(tpl.id)
                      nav('/checkout')
                    }}
                  >
                    {t('product.buyNow')}
                  </Btn>
                  <Btn size="md" variant="outline" onClick={() => toggleWish(tpl.id)}>
                    <Icon n="heart" className={`size-4 ${saved ? 'text-danger' : ''}`} fill={saved} />
                    {saved ? t('wishlist.saved') : t('wishlist.save')}
                  </Btn>
                </div>
                <Link
                  to={`/host?template=${tpl.id}`}
                  className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-dim transition hover:text-brand"
                >
                  <Icon n="globe" className="size-3.5" />
                  {t('host.fromProduct')}
                </Link>
                {inCart(tpl.id) && (
                  <Link
                    to="/cart"
                    className="mt-1 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-brand hover:underline"
                  >
                    {t('cart.checkout')}
                    <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
                  </Link>
                )}
              </div>

              {/* يُكتب هنا ويُدفَع هنا: نفس الحقول في خطوة الدفع، ونفس المخزن يربطهما */}
              <Personalize compact className="mt-5" />

              <ul className="mt-6 space-y-2.5">
                {[
                  [tpl.type === 'cv' ? 'file' : 'layers', `${t('product.formats')}: ${(tpl.stack || []).join(' · ')}`],
                  ['grid', `${t('product.sections')}: ${LA(tpl.sections).length}`],
                  ...(tpl.pages ? [['layout', `${t('product.pages')}: ${tpl.pages} A4`]] : []),
                  ['shield', `${t('product.license')}: ${t('product.personal')}`],
                  ['refresh', t('product.updates')],
                  ['mail', t('product.support')],
                  ['spark', `${t('product.reviewFree')} — ${t('product.reviewFreeNote')}`],
                ].map(([ic, txt]) => (
                  <li key={txt} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                    <Icon n={ic} className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span className="text-dim">{txt}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3 rounded-2xl border border-line bg-bg p-4">
                {[
                  [t('product.perfScore'), tpl.perf, 'bolt'],
                  [t('product.atsScore'), tpl.ats, 'scan'],
                ]
                  .filter(([, v]) => v)
                  .map(([label, v, ic]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
                          <Icon n={ic} className={`size-3.5 ${label === t('product.atsScore') ? 'text-gold' : 'text-brand'}`} />
                          {label}
                        </p>
                        <p className="num text-[13px] font-extrabold">{v}/100</p>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ${label === t('product.atsScore') ? 'bg-gold' : 'bg-gradient-to-r from-brand2 to-brand'}`}
                          style={{ width: `${v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                <p className="text-[11px] leading-relaxed text-dim">{t('proof.sub')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="page-x mx-auto max-w-[1400px] py-16">
          <Reveal>
            <Head title={t('product.related')} />
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r, k) => (
              <Reveal key={r.id} delay={k * 70} className="h-full">
                <TemplateCard tpl={r} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {demo && <QuickView tpl={tpl} onClose={() => setDemo(false)} initial={{ kind, hero, gallery, layout, accent, font }} />}
    </div>
  )
}

function Group({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{label}</p>
      {children}
    </div>
  )
}

function Swatch({ on, onClick, children, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition ${
        on ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line text-dim hover:text-ink'
      }`}
      {...rest}
    >
      {children}
    </button>
  )
}

function List({ items, title, icon }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="mb-3 flex items-center gap-2 font-display text-[15px] font-extrabold">
        <Icon n={icon} className="size-4 text-brand" />
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-dim">
            <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-brand" sw={2.6} />
            {x}
          </li>
        ))}
      </ul>
    </div>
  )
}
