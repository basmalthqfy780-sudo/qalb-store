import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { num, useI18n } from '../i18n'
import { HANDLE_RE, LINK_PLANS, countryName, demoEvents, linkByHandle, linkUrl, readEvents, recordEvent, summarize } from '../data/qalblink'
import { demoTalent } from '../data/talent'
import { linkUpsell } from '../data/upsells'
import { useStore } from '../store/StoreContext'
import { useSeo } from '../components/Seo'
import { Btn, Icon, Money, Pill } from '../components/ui'

/**
 * الرابطُ المهني: qalb.store/u/ahmed — سيرةٌ وبورتفوليو وزرُّ تواصل وتحميل سيرة،
 * ومعها تحليلاتٌ يراها صاحبُ الرابط وحده.
 *
 * ما يُعرض: الذي كتبه صاحبُ الرابط هنا. بريدُه لا يظهر إلا إن اختار إظهاره، ولا
 * سيرةٌ تُفتح إلا التي أشار إليها. والتحليلاتُ تُسجَّل في المتصفح إلا إن وُصل خادم،
 * والبلدُ مستنتجٌ من منطقةِ الجهاز الزمنية لا من عنوانه — تُقال هذه الجملة في
 * الصفحة كما تُقال هنا، فلا نزعم معرفةَ ما لا نعرفه.
 */
export default function LinkProfile() {
  const { slug = '' } = useParams()
  const { t, lang, L } = useI18n()
  const { toggleAddon, hasAddon, toast } = useStore()
  const [note, setNote] = useState('')
  const [events, setEvents] = useState(() => readEvents())
  const done = useRef(false)

  const handle = String(slug || '').toLowerCase()
  const mine = linkByHandle(handle)
  const demo = demoTalent().find((r) => r.handle === handle) || null
  const rec =
    mine || (demo ? { handle, name: demo.name, role: demo.role, city: demo.city, bio: demo.bio, demo: true, showEmail: false, showCv: true } : null)
  // الرابطُ معروف أو لا: قيمةٌ منطقية ثابتة، فلا يتحرّك الأثر مع كلِّ رسم
  const ready = !!rec

  // مشاهدةٌ واحدة لكلِّ تحميلِ صفحة: لا نعدّ إعادة الرسم ولا تغيّر اللغة
  useEffect(() => {
    if (done.current || !ready || !HANDLE_RE.test(handle)) return
    done.current = true
    recordEvent(handle, 'view')
    setEvents(readEvents())
  }, [handle, ready])

  const owners = !!mine
  const plus = hasAddon(linkUpsell().id) || mine?.plan === 'plus'
  const stats = useMemo(() => {
    const shown = owners ? events : demo ? demoEvents(handle) : []
    return summarize(shown, { handle, days: plus ? 30 : 7 })
  }, [owners, events, demo, handle, plus])

  useSeo(
    rec ? `${rec.name} · ${t('link.title')}` : t('link.title'),
    rec ? `${rec.name}${rec.role ? ` — ${rec.role}` : ''} · ${t('link.sub')}` : t('link.notFoundSub'),
    { robots: 'index, follow' },
  )

  if (!rec) {
    return (
      <div className="page-x mx-auto max-w-[720px] py-20 text-center" data-link-missing>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-line bg-panel text-dim">
          <Icon n="globe" className="size-6" />
        </div>
        <h1 className="mt-4 text-[20px] font-extrabold text-ink">{t('link.notFound')}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{t('link.notFoundSub')}</p>
        <Btn as={Link} to="/studio" size="sm" className="mt-5">
          <Icon n="spark" className="size-4" />
          {t('link.create')}
        </Btn>
      </div>
    )
  }

  const url = linkUrl(handle)

  function downloadCv() {
    recordEvent(handle, 'cv')
    setEvents(readEvents())
    if (rec.cv && /^https?:\/\//i.test(rec.cv)) {
      window.open(rec.cv, '_blank', 'noopener,noreferrer')
      return
    }
    // لا ملفَّ مرفوع؟ يُنزَّل ما كتبه صاحبُ الرابط نصًّا — لا ملفٌ نختلقه
    const body = [rec.name, rec.role, rec.city, '', rec.bio, rec.showEmail && rec.email ? rec.email : '', url].filter(Boolean).join('\n')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `${handle}-cv.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    setNote(t('link.downloaded'))
  }

  async function copyLink() {
    recordEvent(handle, 'copy')
    setEvents(readEvents())
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(url)
      setNote(t('link.copied'))
    } catch {
      setNote(t('link.copyBlocked'))
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[860px] py-13 sm:py-16">
        <div className="rounded-3xl border border-line bg-panel p-5 sm:p-7" data-link-card>
          <div className="flex flex-wrap items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-brand/12 text-[24px] font-extrabold text-brand">
              {String(rec.name || '؟')
                .trim()
                .charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-extrabold leading-tight text-ink">{rec.name}</h1>
              {rec.role && <p className="mt-1 text-[14px] font-semibold text-brand">{rec.role}</p>}
              {rec.city && <p className="mt-0.5 text-[12.5px] text-dim">{rec.city}</p>}
            </div>
            {rec.demo && <Pill>{t('link.demo')}</Pill>}
          </div>

          {rec.bio && <p className="mt-4 text-[13.5px] leading-[1.9] text-dim">{rec.bio}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <Btn size="sm" onClick={downloadCv} data-link-cv>
              <Icon n="download" className="size-4" />
              {t('link.downloadCv')}
            </Btn>
            {rec.showEmail && rec.email && (
              <a
                href={`mailto:${rec.email}`}
                onClick={() => {
                  recordEvent(handle, 'contact')
                  setEvents(readEvents())
                }}
                className="inline-flex"
              >
                <Btn size="sm" variant="outline">
                  <Icon n="mail" className="size-4" />
                  {t('link.contact')}
                </Btn>
              </a>
            )}
            {rec.site && (
              <a
                href={rec.site.startsWith('http') ? rec.site : `https://${rec.site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Btn size="sm" variant="outline">
                  <Icon n="globe" className="size-4" />
                  {t('link.site')}
                </Btn>
              </a>
            )}
            <Btn size="sm" variant="ghost" onClick={copyLink} data-link-copy>
              <Icon n="copy" className="size-4" />
              {t('link.copy')}
            </Btn>
          </div>
          {note && (
            <p className="mt-2.5 text-[11.5px] text-brand" role="status">
              {note}
            </p>
          )}
          <p className="num mt-4 break-all text-[11px] text-dim/80" dir="ltr">
            {url}
          </p>
        </div>

        {/* ------------------------------ التحليلات ------------------------------ */}
        <section className="mt-5 rounded-3xl border border-line bg-panel/70 p-5" data-link-stats>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-ink">{owners ? t('link.ownerTitle') : t('link.publicTitle')}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">{owners ? t('link.ownerSub') : t('link.publicSub')}</p>
            </div>
            <Pill tone={plus ? 'brand' : 'line'}>{plus ? L(LINK_PLANS.plus.name) : L(LINK_PLANS.free.name)}</Pill>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-4">
            <Stat k={t('link.views')} v={num(stats.views)} />
            <Stat k={t('link.downloads')} v={num(stats.cv)} />
            <Stat k={t('link.contacts')} v={num(stats.contact)} />
            <Stat k={t('link.last')} v={stats.lastAt ? String(stats.lastAt).slice(0, 10) : t('link.never')} />
          </div>

          <div className="mt-4">
            <p className="text-[11.5px] font-bold text-dim">{t('link.days', { n: num(stats.days.length) })}</p>
            <div className="mt-2 flex h-16 items-end gap-1" data-link-chart aria-hidden="true">
              {stats.days.map((d) => {
                const max = Math.max(1, ...stats.days.map((x) => x.n))
                return <span key={d.d} className="flex-1 rounded-t bg-brand/70" style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }} />
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11.5px] font-bold text-dim">{t('link.countries')}</p>
            {plus ? (
              stats.countries.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5" data-link-countries>
                  {stats.countries.slice(0, 8).map((c) => (
                    <li key={c.code} className="rounded-lg border border-line bg-bg/60 px-2 py-1 text-[11.5px] text-ink">
                      {countryName(c.code, lang) || c.code} <span className="num text-dim">{num(c.n)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-dim">{t('link.noCountries')}</p>
              )
            ) : (
              <p className="mt-2 text-[12px] leading-relaxed text-dim">{t('link.countriesLocked')}</p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-dim/80">{t('link.geoNote')}</p>
          </div>

          {!plus && owners && (
            <div className="mt-4 rounded-2xl border border-gold/35 bg-gold/[0.06] p-4" data-link-plus>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold text-ink">{L(linkUpsell().name)}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(linkUpsell().tagline)}</p>
                </div>
                <Money v={linkUpsell().price} size="text-[20px]" />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-dim">{t('link.plusWhy')}</p>
              <Btn
                size="sm"
                className="mt-3 w-full"
                data-link-buy
                onClick={() => {
                  const added = toggleAddon(linkUpsell().id)
                  toast(added ? t('cart.addonAdded', { n: L(linkUpsell().name) }) : t('cart.addonRemoved', { n: L(linkUpsell().name) }))
                }}
              >
                <Icon n={hasAddon(linkUpsell().id) ? 'check' : 'cart'} className="size-4" />
                {hasAddon(linkUpsell().id) ? t('link.inCart') : t('link.buyPlus')}
              </Btn>
            </div>
          )}

          {rec.demo && <p className="mt-4 text-[11.5px] leading-relaxed text-dim/80">{t('link.demoNote')}</p>}
          {!owners && (
            <p className="mt-4 text-[11.5px] leading-relaxed text-dim/80">
              <Link to="/studio" className="font-bold text-brand hover:underline">
                {t('link.create')}
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ k, v }) {
  return (
    <div className="rounded-xl border border-line bg-bg/50 px-3 py-2.5">
      <span className="block text-[10.5px] text-dim">{k}</span>
      <span className="num text-[15px] font-bold text-ink">{v}</span>
    </div>
  )
}
