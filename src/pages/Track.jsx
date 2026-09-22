import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { listOrders } from '../api'
import { byId } from '../data/templates'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Skeleton } from '../components/ui'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const KEEP = 'qalb.trackEmail'

/** Receipt lookup by email — works off the local registry or the order server. */
export default function Track() {
  const [params] = useSearchParams()
  const { t, L } = useI18n()
  const [email, setEmail] = useState(() => {
    if (params.get('email')) return params.get('email')
    try {
      return localStorage.getItem(KEEP) || ''
    } catch {
      return ''
    }
  })
  const [status, setStatus] = useState('idle')
  const [rows, setRows] = useState([])

  useSeo(`${t('track.title')} · ${t('brand.name')}`, t('meta.trackDesc'))

  async function ask(e) {
    e?.preventDefault()
    const who = email.trim().toLowerCase()
    if (!EMAIL.test(who)) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    try {
      localStorage.setItem(KEEP, who)
    } catch {
      /* localStorage may be full or blocked — never a hard requirement */
    }
    try {
      const list = (await listOrders(who)) || []
      setRows(list)
      setStatus(list.length ? 'done' : 'empty')
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1000px] py-14">
        <Head as="h1" kicker={t('track.kicker')} title={t('track.title')} sub={t('track.sub')} />

        <form onSubmit={ask} className="mt-9 rounded-3xl border border-line bg-panel p-5 sm:p-7">
          <label className="block text-[13px] font-semibold text-dim" htmlFor="co-email">
            {t('track.label')}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="tk-email"
              type="email"
              name="email"
              dir="ltr"
              autoComplete="email"
              placeholder={t('track.ph')}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={status === 'invalid' ? true : undefined}
              className="h-12 w-full min-w-0 rounded-xl border border-line bg-bg px-3.5 text-[14px] outline-none transition focus:border-brand/60 sm:max-w-[420px]"
            />
            <Btn type="submit" size="md" className="sm:ms-auto">
              <Icon n="search" className="size-4" />
              {status === 'loading' ? t('track.loading') : t('track.btn')}
            </Btn>
          </div>
          {status === 'invalid' ? <p className="mt-3 text-[13px] font-semibold text-danger">{t('track.invalid')}</p> : null}
          {status === 'err' ? (
            <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-danger">
              <Icon n="pulse" className="size-4" />
              {t('track.err')}
            </p>
          ) : null}
        </form>

        <div aria-live="polite" className="mt-8">
          {status === 'loading' ? (
            <div className="grid gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-line bg-panel p-4">
                  <Skeleton className="h-4 w-44" rounded="rounded" />
                  <Skeleton className="mt-3 h-3 w-64" rounded="rounded" />
                  <Skeleton className="mt-4 h-10 w-full" rounded="rounded-xl" />
                </div>
              ))}
            </div>
          ) : null}

          {status === 'done' ? (
            <>
              <p className="mb-4 text-[13px] font-semibold text-dim">{t('track.found', { n: num(rows.length) })}</p>
              <ul className="grid gap-3">
                {rows.map((o) => (
                  <li key={o.id} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p dir="ltr" className="truncate font-mono text-[13px] font-bold sm:text-[15px]">
                          {o.id}
                        </p>
                        <p className="mt-1 text-[12px] text-dim">
                          {t('track.date')}: <span className="num">{o.date}</span> · {t('track.items', { n: num(o.count || o.lines?.length || 0) })}
                          {o.methodLabel || o.method ? ` · ${t('track.method')}: ${o.methodLabel || o.method}` : ''}
                        </p>
                        {Array.isArray(o.lines) && o.lines.length ? (
                          <p className="mt-2 text-[12px] text-dim">
                            {o.lines
                              .map((l) => {
                                const name = byId(l.id) ? L(byId(l.id).name) : l.slug
                                return l.qty > 1 ? `${name} ×${num(l.qty)}` : name
                              })
                              .join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <Money v={o.total} size="text-lg" />
                        <Link
                          to={`/order?id=${encodeURIComponent(o.id)}`}
                          state={{ order: o }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-3 py-2 text-[12px] font-semibold transition-colors hover:border-brand/50 hover:text-brand"
                        >
                          {t('track.open')}
                          <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {status === 'empty' ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-line bg-bg text-dim">
                <Icon n="file" className="size-6" />
              </span>
              <h2 className="mt-5 font-display text-xl font-extrabold">{t('track.empty')}</h2>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-dim">{t('track.emptyHint')}</p>
              <Pill tone="glass" className="mt-5">
                <Icon n="mail" className="size-3.5" />
                <span dir="ltr">{email.trim().toLowerCase()}</span>
              </Pill>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
