import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { verifyKey } from '../api'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon } from '../components/ui'

/** Licence lookup — the client half of GET /licences/:key. */
export default function Licence() {
  const [params] = useSearchParams()
  const { t } = useI18n()
  const [key, setKey] = useState(() => params.get('key') || '')
  const [status, setStatus] = useState('idle')
  const [res, setRes] = useState(null)

  useSeo(`${t('licence.title')} · ${t('brand.name')}`, t('meta.licenceDesc'))

  async function ask(e) {
    e?.preventDefault()
    const k = key.trim().toUpperCase()
    if (k.length < 8) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    try {
      const out = await verifyKey(k)
      setRes(out || null)
      setStatus(out?.valid ? 'valid' : 'invalid')
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[820px] py-14">
        <Head kicker={t('licence.kicker')} title={t('licence.title')} sub={t('licence.sub')} />

        <form onSubmit={ask} className="mt-9 rounded-3xl border border-line bg-panel p-5 sm:p-7">
          <label className="block text-[13px] font-semibold text-dim" htmlFor="lc-key">
            {t('licence.label')}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="lc-key"
              name="key"
              dir="ltr"
              autoComplete="off"
              spellCheck="false"
              placeholder={t('licence.ph')}
              value={key}
              onChange={(ev) => setKey(ev.target.value)}
              aria-invalid={status === 'invalid' ? true : undefined}
              className="h-12 w-full min-w-0 rounded-xl border border-line bg-bg px-3.5 font-mono text-[14px] uppercase tracking-[0.08em] outline-none transition focus:border-brand/60"
            />
            <Btn type="submit" size="md" className="sm:ms-auto">
              <Icon n="shield" className="size-4" />
              {status === 'loading' ? t('licence.loading') : t('licence.btn')}
            </Btn>
          </div>
        </form>

        <div aria-live="polite" className="mt-6">
          {status === 'valid' && res ? (
            <div className="rounded-3xl border border-brand/35 bg-brand/[0.07] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand/15 text-brand">
                  <Icon n="check" className="size-6" sw={2.2} />
                </span>
                <h2 className="font-display text-xl font-extrabold text-brand">{t('licence.valid')}</h2>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { k: 'licence.order', v: res.order, mono: true },
                  { k: 'licence.seats', v: res.seats },
                  { k: 'licence.domains', v: res.domains, mono: true },
                ].map((row) => (
                  <div key={row.k} className="rounded-2xl border border-line bg-bg p-4">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-dim">{t(row.k)}</dt>
                    <dd dir="ltr" className={`mt-1.5 block truncate text-[15px] font-bold ${row.mono ? 'font-mono' : ''}`}>
                      {row.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {status === 'invalid' || status === 'err' ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-line bg-bg text-danger">
                <Icon n="lock" className="size-6" />
              </span>
              <h2 className="mt-5 font-display text-xl font-extrabold">{status === 'err' ? t('licence.err') : t('licence.invalid')}</h2>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-dim">{t('licence.invalidHint')}</p>
              <Link to="/track" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
                {t('licence.track')}
                <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
