import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { num, useI18n } from '../i18n'
import { CITIES, MIN_ATS, TALENT_PLAN, demoTalent, filterTalent, readTalent, removeTalent, saveTalent, talentEntry } from '../data/talent'
import { categories } from '../data/templates'
import { linkByHandle, readLinks } from '../data/qalblink'
import { talentUpsell } from '../data/upsells'
import { SUPPORT_MAILTO } from '../data/contact'
import { useStore } from '../store/StoreContext'
import { itemList, useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/**
 * دليلُ المواهب: ملفاتٌ فعّلها أصحابها، تُبحث بالتخصص والمدينة ودرجةِ الجاهزية.
 *
 * ثلاثُ قواعدَ تُكتب في الصفحة كما تُكتب هنا:
 *   ١. لا ملفَّ بلا إذن: الإدراجُ من صفحة الرابط، والحذفُ بيد صاحبه في أيِّ وقت.
 *   ٢. ما يظهر هو ما اختار صاحبُه إظهاره في رابطه — البريدُ لا يظهر إلا باختياره.
 *   ٣. «الجاهزية» رقمٌ مقيس من سيرته بمحرّك المتجر نفسه، لا تقديرٌ منّا.
 *
 * والسجلّاتُ المعروضة أولَ مرة أربعةُ نماذج موسومة: دليلٌ فارغ لا يُقرأ، وأشخاصٌ
 * حقيقيون بلا إذن لا يُعرضون.
 */
export default function Talent() {
  const { t, L } = useI18n()
  const { toggleAddon, hasAddon, toast } = useStore()
  const [field, setField] = useState('')
  const [city, setCity] = useState('')
  const [minAts, setMinAts] = useState(0)
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(() => readTalent())
  const [note, setNote] = useState('')

  const links = useMemo(() => readLinks(), [])
  const rows = useMemo(() => [...mine, ...demoTalent()], [mine])
  const found = useMemo(() => filterTalent(rows, { field, city, minAts, q }), [rows, field, city, minAts, q])
  const spot = talentUpsell()

  useSeo(`${t('talent.title')} · ${t('brand.name')}`, t('meta.talentDesc'), {
    jsonLd: itemList(found.slice(0, 12).map((r) => ({ name: r.name, url: `/u/${r.handle}` }))),
  })

  function join(handle) {
    const link = linkByHandle(handle)
    if (!link) return setNote(t('talent.needLink'))
    const row = talentEntry({ ...link, handle, city: link.city || '', role: link.role || '', field: 'general' })
    const r = saveTalent(row)
    if (r.ok) {
      setMine(readTalent())
      setNote(t('talent.joined'))
    } else setNote(t('talent.needLink'))
  }

  function leave(handle) {
    setMine(removeTalent(handle))
    setNote(t('talent.left'))
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1120px] py-13 sm:py-16">
        <Head
          as="h1"
          kicker={t('talent.kicker')}
          title={t('talent.title')}
          sub={t('talent.sub')}
          right={
            <Pill tone="brand" className="max-w-full">
              <Icon n="shield" className="size-3" />
              {t('talent.privacy')}
            </Pill>
          }
        />

        {/* ------------------------------ الفلاتر ------------------------------ */}
        <section className="mt-9 rounded-3xl border border-line bg-panel p-4 sm:p-5" data-talent-filters>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('talent.field')}</span>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                aria-label={t('talent.field')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value="">{t('talent.any')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {L(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('talent.city')}</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label={t('talent.city')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value="">{t('talent.any')}</option>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {L(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('talent.minAts')}</span>
              <select
                value={minAts}
                onChange={(e) => setMinAts(Number(e.target.value))}
                aria-label={t('talent.minAts')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value={0}>{t('talent.any')}</option>
                {[MIN_ATS, 85, 92, 97].map((n) => (
                  <option key={n} value={n}>
                    {num(n)}+
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('talent.search')}</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('talent.searchPh')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-dim/60 focus:border-brand/50"
              />
            </label>
          </div>
          <p className="num mt-3 text-[12px] text-dim" data-talent-count>
            {t('talent.results', { n: num(found.length) })}
          </p>
        </section>

        {/* ------------------------------ النتائج ------------------------------ */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-talent-results>
          {found.map((r) => (
            <article key={r.handle} className="rounded-3xl border border-line bg-panel/70 p-4" data-talent-card>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/12 text-[15px] font-extrabold text-brand">
                  {String(r.name || '؟')
                    .trim()
                    .charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-extrabold text-ink">{r.name}</p>
                  <p className="truncate text-[12px] text-dim">{r.role}</p>
                </div>
                {r.demo && <Pill className="ms-auto shrink-0">{t('talent.demo')}</Pill>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-dim">
                {r.city && (
                  <span className="rounded-lg border border-line bg-bg/60 px-2 py-1">
                    <Icon n="pin" className="me-1 inline size-3" />
                    {r.city}
                  </span>
                )}
                <span className="num rounded-lg border border-line bg-bg/60 px-2 py-1 font-bold text-ink">
                  {t('talent.ats')}: {r.ats == null ? '—' : num(r.ats)}
                </span>
                {r.years > 0 && (
                  <span className="num rounded-lg border border-line bg-bg/60 px-2 py-1">{t('talent.years', { n: num(r.years) })}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Btn as={Link} to={`/u/${r.handle}`} size="xs" variant="outline">
                  <Icon n="globe" className="size-3.5" />
                  {t('talent.view')}
                </Btn>
                {!r.demo && mine.some((x) => x.handle === r.handle) && (
                  <Btn size="xs" variant="ghost" data-talent-leave onClick={() => leave(r.handle)}>
                    <Icon n="close" className="size-3.5" />
                    {t('talent.remove')}
                  </Btn>
                )}
              </div>
            </article>
          ))}
          {!found.length && (
            <p
              className="rounded-3xl border border-line bg-panel/60 p-6 text-center text-[13px] text-dim sm:col-span-2 lg:col-span-3"
              data-talent-empty
            >
              {t('talent.empty')}
            </p>
          )}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-dim/80">{t('talent.demoNote')}</p>

        {/* ------------------------------ الانضمام والإبراز ------------------------------ */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-line bg-panel/70 p-5" data-talent-join>
            <h2 className="text-[15px] font-extrabold text-ink">{t('talent.joinTitle')}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('talent.joinSub')}</p>
            {links.length ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {links.map((l) => {
                  const inIt = mine.some((x) => x.handle === l.handle)
                  return (
                    <li key={l.handle} className="flex items-center gap-2.5 rounded-2xl border border-line bg-panel/70 p-2.5">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{l.name}</span>
                      <Btn
                        size="xs"
                        variant={inIt ? 'ghost' : 'outline'}
                        data-talent-toggle
                        onClick={() => (inIt ? leave(l.handle) : join(l.handle))}
                      >
                        <Icon n={inIt ? 'close' : 'check'} className="size-3.5" />
                        {inIt ? t('talent.remove') : t('talent.join')}
                      </Btn>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
                <Link to="/studio" className="font-bold text-brand hover:underline">
                  {t('talent.noLink')}
                </Link>
              </p>
            )}
            {note && (
              <p className="mt-2.5 text-[11.5px] text-brand" role="status">
                {note}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-gold/35 bg-gold/[0.06] p-5" data-talent-spot>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-ink">{L(spot.name)}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{L(spot.tagline)}</p>
              </div>
              <Money v={spot.price} size="text-[20px]" />
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-dim">{L(spot.desc)}</p>
            <Btn
              size="sm"
              className="mt-3 w-full"
              data-talent-buy
              onClick={() => {
                const added = toggleAddon(spot.id)
                toast(added ? t('cart.addonAdded', { n: L(spot.name) }) : t('cart.addonRemoved', { n: L(spot.name) }))
              }}
            >
              <Icon n={hasAddon(spot.id) ? 'check' : 'cart'} className="size-4" />
              {hasAddon(spot.id) ? t('talent.inCart') : t('talent.buy')}
            </Btn>
            <p className="num mt-2 text-center text-[10.5px] text-dim">
              {t('talent.perMonth')} · {num(TALENT_PLAN.price)} {t('common.sar')}
            </p>
          </section>
        </div>

        {/* ------------------------------ وصول الشركات ------------------------------ */}
        <Reveal className="mt-6 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7">
          <h2 className="text-[16px] font-extrabold text-ink">{t('talent.companyTitle')}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('talent.companySub')}</p>
          <a
            href={`${SUPPORT_MAILTO}?subject=${encodeURIComponent(t('talent.companySubject'))}&body=${encodeURIComponent(t('talent.companyBody'))}`}
            className="mt-3.5 inline-flex"
          >
            <Btn size="sm">
              <Icon n="mail" className="size-4" />
              {t('talent.companyCta')}
            </Btn>
          </a>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim/80">{t('talent.companyNote')}</p>
        </Reveal>
      </div>
    </div>
  )
}
