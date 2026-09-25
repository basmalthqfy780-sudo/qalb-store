import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { TYPES, categories, demoFor, siteFor } from '../data/templates'
import { useStore } from '../store/StoreContext'
import TemplateCard from '../components/TemplateCard'
import QuickView from '../components/QuickView'
import { Btn, Head, Icon, Pill, Reveal } from '../components/ui'
import RecentlyViewed from '../components/RecentlyViewed'
import { useSeo, productItemList, breadcrumbLd, graph } from '../components/Seo'

const SORTS = [
  ['pop', 'catalog.sortPop'],
  ['new', 'catalog.sortNew'],
  ['low', 'catalog.sortLow'],
  ['high', 'catalog.sortHigh'],
  ['rate', 'catalog.sortRate'],
]
const LEVELS = ['beginner', 'mid', 'senior', 'exec']
const PRICE_BUCKETS = [
  { id: 'any', max: Infinity },
  { id: 'p79', max: 79 },
  { id: 'p99', max: 99 },
  { id: 'p129', max: 129 },
]

export default function Catalog() {
  const { t, lang } = useI18n()
  // لقطةُ الكتالوج من المخزن لا المصفوفة المصدرية: حين تصل تعديلات لوحة الإدارة (سعرٌ
  // جديد، منتجٌ مخفي) تُعاد الفلترة فورًا، بدل أن تبقى البطاقاتُ على أرقام أول رسم
  const { catalog: templates, catalogStatus, refreshCatalog } = useStore()
  const [sp, setSp] = useSearchParams()
  const [openFilters, setOpenFilters] = useState(false)
  const [quick, setQuick] = useState(null)

  const cat = sp.get('cat') || 'all'
  const type = sp.get('type') || 'all'
  const q = sp.get('q') || ''
  const level = sp.get('level') || 'all'
  const price = sp.get('price') || 'any'
  const sort = sp.get('sort') || 'pop'
  const flagsRaw = sp.get('flags') || ''
  // مثبَّتة بـ useMemo لتبقى نفس المرجع بين الرندرات (مصدرها الرابط، لا حالة)
  const flags = useMemo(() => flagsRaw.split(',').filter(Boolean), [flagsRaw])

  const patch = (key, value) => {
    const next = new URLSearchParams(sp)
    if (!value || value === 'all' || value === 'any' || value === 'pop') next.delete(key)
    else next.set(key, value)
    setSp(next, { replace: true })
  }
  const toggleFlag = (f) => {
    const next = new URLSearchParams(sp)
    const set = new Set(flags)
    set.has(f) ? set.delete(f) : set.add(f)
    if (set.size) next.set('flags', [...set].join(','))
    else next.delete('flags')
    setSp(next, { replace: true })
  }
  const reset = () => setSp(new URLSearchParams(), { replace: true })

  const list = useMemo(() => {
    const max = (PRICE_BUCKETS.find((b) => b.id === price) || PRICE_BUCKETS[0]).max
    let out = templates.filter((x) => {
      if (type !== 'all' && x.type !== type) return false
      if (cat !== 'all' && !x.cats.includes(cat)) return false
      if (level !== 'all' && x.level !== level) return false
      if (x.price > max) return false
      if (flags.includes('perf') && (x.perf || 0) < 98) return false
      if (flags.includes('ats') && (x.ats || 0) < 97) return false
      if (flags.includes('new') && !x.isNew) return false
      if (flags.includes('sale') && !x.oldPrice) return false
      if (q) {
        const cv = demoFor(x)
        const site = siteFor(x)
        const hay = [
          x.name?.ar,
          x.name?.en,
          x.tagline?.ar,
          x.tagline?.en,
          x.desc?.ar,
          x.desc?.en,
          ...(x.stack || []),
          ...[].concat(x.sections?.ar || [], x.sections?.en || [], x.highlights?.ar || [], x.highlights?.en || []),
          ...(site
            ? [
                site.name?.ar,
                site.name?.en,
                site.role?.ar,
                site.role?.en,
                ...(site.nav?.ar || []),
                ...(site.projects || []).flatMap((p) => [p.t?.ar, p.t?.en, p.c?.ar, p.c?.en]),
              ]
            : []),
          ...(cv
            ? [cv.role?.ar, cv.role?.en, ...(cv.skills?.ar || []), ...(cv.skills?.en || []), ...(cv.jobs || []).flatMap((j) => [j.t?.ar, j.t?.en])]
            : []),
          ...x.cats,
          x.type,
          x.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q.trim().toLowerCase())) return false
      }
      return true
    })
    const cmp = {
      pop: (a, b) => b.sales - a.sales,
      new: (a, b) => a.addedDays - b.addedDays,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      rate: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    }[sort]
    out = [...out].sort(cmp)
    return out
  }, [templates, cat, type, q, level, price, sort, flags])

  // حجم الصفحة مشتقّ من مفتاح الفلاتر: أي تغيير فيها يعيده إلى ٩ تلقائيًا —
  // لا effect ولا setState أثناء الرندر، ولا جولة رسم إضافية
  const filterKey = `${cat}|${type}|${q}|${level}|${price}|${sort}|${flagsRaw}`
  const [page, setPage] = useState({ at: filterKey, size: 9 })
  const per = page.at === filterKey ? page.size : 9
  const loadMore = () => setPage({ at: filterKey, size: per + 6 })

  const shown = list.slice(0, per)

  useSeo(`${t('catalog.title')} · ${t('brand.name')}`, t('meta.catalogDesc', { n: num(list.length) }), {
    // Product كاملٌ لكل قالبٍ معروض — لا ItemList بالأسماء والروابط وحدها:
    // الاسمُ والصورةُ والوصفُ والعرضُ (سعرٌ بالريال · InStock) تُقرأ من صفحة
    // القوالب كما تُقرأ من صفحة المنتج.
    jsonLd: graph(
      productItemList(list, lang, t),
      breadcrumbLd([
        { name: t('crumb.home'), path: '/' },
        { name: t('nav.templates'), path: '/templates' },
      ]),
    ),
    type: 'website',
  })
  const active = [
    type !== 'all' && { k: 'type', label: t(`types.${type}`) },
    cat !== 'all' && { k: 'cat', label: lang === 'ar' ? categories.find((c) => c.id === cat)?.ar : categories.find((c) => c.id === cat)?.en },
    level !== 'all' && { k: 'level', label: t(`catalog.${level}`) },
    price !== 'any' && { k: 'price', label: `${t('catalog.under', { n: PRICE_BUCKETS.find((b) => b.id === price).max })}` },
    ...flags.map((f) => ({
      k: `flag:${f}`,
      label: f === 'perf' ? t('catalog.fast') : f === 'ats' ? t('catalog.ats') : f === 'sale' ? `${t('card.off')} 20%+` : t('card.new'),
    })),
    q && { k: 'q', label: `“${q}”` },
  ].filter(Boolean)

  const FilterBody = (
    <div className="space-y-7">
      <Field label={t('catalog.search')}>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 transition focus-within:border-brand/50">
          <Icon n="search" className="size-4 shrink-0 text-dim" />
          <input
            value={q}
            onChange={(e) => patch('q', e.target.value)}
            placeholder={t('catalog.search')}
            className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
          {q && (
            <button type="button" onClick={() => patch('q', '')} aria-label={t('nav.close')} className="text-dim hover:text-ink">
              <Icon n="close" className="size-3.5" />
            </button>
          )}
        </div>
      </Field>

      <Field label={t('catalog.kind')}>
        <div className="grid grid-cols-2 gap-1.5">
          {TYPES.map((ty) => (
            <button
              type="button"
              key={ty.id}
              onClick={() => patch('type', ty.id)}
              className={`rounded-lg border px-2 py-2 text-[12px] font-bold transition ${
                type === ty.id ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line text-dim hover:text-ink'
              }`}
            >
              {lang === 'ar' ? ty.ar : ty.en}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t('catalog.category')}>
        <div className="space-y-0.5">
          {[{ id: 'all', ar: t('catalog.all'), en: t('catalog.all') }, ...categories].map((c) => {
            const n = c.id === 'all' ? templates.length : templates.filter((x) => x.cats.includes(c.id)).length
            const on = cat === c.id
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => patch('cat', c.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold transition ${
                  on ? 'bg-brand/12 text-brand' : 'text-dim hover:bg-panel2 hover:text-ink'
                }`}
              >
                {c.id === 'all' ? <Icon n="grid" className="size-4" /> : <Icon n={c.icon} className="size-4" />}
                <span className="flex-1 text-start">{lang === 'ar' ? c.ar : c.en}</span>
                <span className="num text-[11.5px] opacity-70">{n}</span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field label={t('catalog.level')}>
        <div className="space-y-1.5">
          {['all', ...LEVELS].map((lv) => (
            <Radio
              key={lv}
              name="lv"
              checked={level === lv}
              onChange={() => patch('level', lv)}
              label={lv === 'all' ? t('catalog.any') : t(`catalog.${lv}`)}
            />
          ))}
        </div>
      </Field>

      <Field label={t('catalog.price')}>
        <div className="space-y-1.5">
          {PRICE_BUCKETS.map((b) => (
            <Radio
              key={b.id}
              name="pr"
              checked={price === b.id}
              onChange={() => patch('price', b.id)}
              label={b.id === 'any' ? t('catalog.any') : t('catalog.under', { n: b.max })}
            />
          ))}
        </div>
      </Field>

      <Field label={t('catalog.extra')}>
        <div className="space-y-2">
          {[
            ['perf', t('catalog.fast')],
            ['ats', t('catalog.ats')],
            ['new', t('card.new')],
            ['sale', `${t('card.off')} 20%+`],
          ].map(([f, label]) => (
            <label key={f} className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold">
              <input type="checkbox" checked={flags.includes(f)} onChange={() => toggleFlag(f)} className="peer sr-only" />
              <span className="grid size-[18px] place-items-center rounded-[6px] border border-line bg-panel text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brandink">
                <Icon n="check" className="size-3" sw={3} />
              </span>
              <span className={flags.includes(f) ? 'text-ink' : 'text-dim'}>{label}</span>
            </label>
          ))}
        </div>
      </Field>

      <button
        type="button"
        onClick={reset}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-[13px] font-bold text-dim transition hover:border-danger/40 hover:text-danger"
      >
        <Icon n="refresh" className="size-4" />
        {t('catalog.reset')}
      </button>
    </div>
  )

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1400px] pb-4 pt-12">
        <Head as="h1" kicker={t('nav.templates')} title={t('catalog.title')} sub={t('catalog.sub', { n: num(templates.length) })} />
      </div>

      <div className="page-x mx-auto grid max-w-[1400px] items-start gap-8 pb-20 lg:grid-cols-[268px_minmax(0,1fr)]">
        {/* sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] max-h-[calc(100vh-116px)] overflow-y-auto rounded-2xl border border-line bg-panel/60 p-5 thin-bar">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 font-display text-[15px] font-extrabold">
                <Icon n="filter" className="size-4 text-brand" />
                {t('catalog.filters')}
              </p>
              {active.length > 0 && <Pill tone="brand">{active.length}</Pill>}
            </div>
            {FilterBody}
          </div>
        </aside>

        <div>
          {/* toolbar */}
          <div className="sticky top-[76px] z-30 -mx-1 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg/85 px-3 py-2.5 backdrop-blur-xl">
            <p className="num text-[12.5px] font-semibold text-dim">{t('catalog.results', { a: num(shown.length), b: num(list.length) })}</p>
            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenFilters(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[12.5px] font-bold lg:hidden"
              >
                <Icon n="filter" className="size-4" />
                {t('catalog.filters')}
                {active.length > 0 && (
                  <span className="num grid size-4 place-items-center rounded-full bg-brand text-[10px] text-brandink">{active.length}</span>
                )}
              </button>
              <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-3">
                <span className="hidden text-[11.5px] font-bold uppercase tracking-wide text-dim sm:inline">{t('catalog.sort')}</span>
                <select
                  value={sort}
                  onChange={(e) => patch('sort', e.target.value)}
                  className="cursor-pointer bg-transparent pe-1 text-[12.5px] font-bold outline-none [&>option]:bg-panel"
                >
                  {SORTS.map(([v, k]) => (
                    <option key={v} value={v}>
                      {t(k)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {active.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {active.map((a) => (
                <button
                  type="button"
                  key={a.k}
                  onClick={() => (a.k.startsWith('flag:') ? toggleFlag(a.k.split(':')[1]) : patch(a.k, ''))}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] font-bold transition hover:border-danger/40"
                >
                  {a.label}
                  <Icon n="close" className="size-3 text-dim group-hover:text-danger" sw={2.4} />
                </button>
              ))}
              <button type="button" onClick={reset} className="text-[12px] font-bold text-dim underline-offset-4 hover:text-ink hover:underline">
                {t('catalog.reset')}
              </button>
            </div>
          )}

          {/* الخادم لم يُجب: نقولها بسطرٍ واحد وزرّ، والبطاقاتُ تبقى من النسخة المنشورة */}
          {catalogStatus === 'offline' && (
            <div
              role="status"
              data-catalog-offline
              className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-[12.5px] font-semibold text-ink/85"
            >
              <Icon n="pulse" className="size-4 shrink-0 text-gold" />
              <span className="min-w-0 flex-1">{t('catalog.offline')}</span>
              <Btn size="sm" variant="outline" onClick={() => refreshCatalog()} data-catalog-retry>
                <Icon n="refresh" className="size-3.5" />
                {t('catalog.retry')}
              </Btn>
            </div>
          )}

          {/* ارتفاعٌ أدنى ثابت للنتائج: تبديلُ الفلاتر أو وصولُ الكتالوج لا يُقفز الفوتر (CLS) */}
          <div className="min-h-[70vh]" data-catalog-results aria-busy={catalogStatus === 'syncing' ? 'true' : undefined}>
            {list.length ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((tpl, k) => (
                    <Reveal key={tpl.id} delay={(k % 3) * 70} className="h-full">
                      <TemplateCard tpl={tpl} onQuick={setQuick} />
                    </Reveal>
                  ))}
                </div>
                {per < list.length && (
                  <div className="mt-10 flex justify-center">
                    <Btn variant="outline" size="lg" onClick={loadMore} data-load-more>
                      {t('catalog.loadMore')}
                      <Icon n="chevron" className="size-4" />
                    </Btn>
                  </div>
                )}
              </>
            ) : (
              <div data-empty-state className="rounded-3xl border border-dashed border-line bg-panel/50 px-6 py-20 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-line bg-bg text-dim">
                  <Icon n="search" className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-extrabold">{t('catalog.noResults')}</h3>
                <p className="mx-auto mt-2 max-w-sm text-[14px] text-dim">{t('catalog.noResultsHint')}</p>
                <Btn onClick={reset} className="mt-6" data-reset-filters>
                  {t('catalog.reset')}
                </Btn>
              </div>
            )}
          </div>

          <RecentlyViewed exclude={null} />
        </div>
      </div>

      {/* mobile filter sheet — اللوح مخفيٌّ بـvisibility وهو مغلق: لا يتدلّى خارج
          الشاشة فيجرّ التجاوز الأفقي، ولا يبقى في شجرة قارئات الشاشة ولا مسار Tab */}
      <div className={`fixed inset-0 z-[80] lg:hidden ${openFilters ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${openFilters ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpenFilters(false)}
        />
        <div
          className={`absolute inset-y-0 start-0 flex w-[min(380px,90vw)] flex-col border-e border-line bg-bg transition-[transform,visibility] duration-300 ${
            openFilters ? 'visible translate-x-0' : `invisible ${lang === 'ar' ? 'translate-x-full' : '-translate-x-full'}`
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <p className="flex items-center gap-2 font-display text-[16px] font-extrabold">
              <Icon n="filter" className="size-4 text-brand" />
              {t('catalog.filters')}
            </p>
            <button
              type="button"
              onClick={() => setOpenFilters(false)}
              aria-label={t('nav.close')}
              className="grid size-9 place-items-center rounded-lg border border-line"
            >
              <Icon n="close" className="size-4" />
            </button>
          </div>
          <div className="thin-bar flex-1 overflow-y-auto p-5">{FilterBody}</div>
          <div className="border-t border-line p-4">
            <Btn size="lg" className="w-full" onClick={() => setOpenFilters(false)}>
              {t('catalog.apply')} ({list.length})
            </Btn>
          </div>
        </div>
      </div>

      {quick && <QuickView tpl={quick} onClose={() => setQuick(null)} />}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{label}</p>
      {children}
    </div>
  )
}

function Radio({ checked, onChange, label, name }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`grid size-[17px] place-items-center rounded-full border transition ${checked ? 'border-brand' : 'border-line bg-panel'}`}>
        <span className={`size-2 rounded-full bg-brand transition ${checked ? 'scale-100' : 'scale-0'}`} />
      </span>
      <span className={checked ? 'font-bold text-ink' : 'text-dim'}>{label}</span>
    </label>
  )
}
