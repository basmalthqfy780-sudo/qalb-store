import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n, num, dec } from '../i18n'
import { admin as api, apiMode } from '../api'
import { categories, templates } from '../data/templates'
import { adminRows } from '../data/catalog'
import { isProtectedDownload } from '../data/deliverable'
import '../i18n/admin-strings' // نصوص اللوحة تُحمّل معها فقط، فلا وزنها على صفحات المتجر
import { useStore } from '../store/StoreContext'
import { Btn, Icon, Money, Pill, Skeleton } from '../components/ui'
import { useSeo } from '../components/Seo'

const TABS = [
  { id: 'overview', icon: 'grid' },
  { id: 'products', icon: 'layers' },
  { id: 'orders', icon: 'cart' },
  { id: 'users', icon: 'briefcase' },
]

const INPUT = 'h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none transition focus:border-brand/60'
const EMPTY = {
  id: '',
  type: 'portfolio',
  clone: '',
  price: '',
  oldPrice: '',
  download: '',
  nameAr: '',
  nameEn: '',
  taglineAr: '',
  taglineEn: '',
  cat: '',
  published: true,
  featured: false,
}

/* ============================ small pieces ============================ */

function Field({ id, label, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-dim" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-danger">
          <Icon n="close" className="size-3" sw={2.4} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-dim">{hint}</p>
      ) : null}
    </div>
  )
}

function Text({ id, value, onChange, type = 'text', dir, placeholder, autoComplete = 'off', invalid }) {
  return (
    <input
      id={id}
      type={type}
      dir={dir}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid ? true : undefined}
      className={`${INPUT} ${dir === 'ltr' ? 'num text-left' : ''}`}
    />
  )
}

function Tick({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold select-none">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--c-brand)]" />
      {children}
    </label>
  )
}

function Panel({ children, className = '' }) {
  return <section className={`rounded-3xl border border-line bg-panel p-5 sm:p-6 ${className}`}>{children}</section>
}

function StatCard({ label, value, unit, foot, icon }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-dim">
        <Icon n={icon} className="size-3.5 text-brand" />
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="num font-display text-[26px] leading-none font-extrabold">{value}</span>
        {unit && <span className="text-[12px] font-semibold text-dim">{unit}</span>}
      </p>
      {foot && <p className="mt-1.5 text-[11.5px] leading-snug text-dim">{foot}</p>}
    </div>
  )
}

/** ثلاثون يومًا من الإيراد، مرسومة svg: لا مكتبة رسم ولا صورة */
function RevenueChart({ series, label }) {
  const max = Math.max(...series.map((s) => s.total), 1)
  const withSales = series.filter((s) => s.total > 0).length
  return (
    <figure className="mt-4">
      <figcaption className="mb-2 flex items-center justify-between text-[11.5px] font-semibold text-dim">
        <span>{label}</span>
        <span className="num">
          {num(withSales)} / {num(series.length)}
        </span>
      </figcaption>
      <svg
        data-chart="revenue-30d"
        viewBox={`0 0 ${series.length * 10} 60`}
        className="h-24 w-full"
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        {series.map((d, i) => {
          const h = d.total > 0 ? Math.max((d.total / max) * 54, 3) : 0.8
          return (
            <rect key={d.date} x={i * 10 + 1.5} y={58 - h} width={7} height={h} rx={1.6} className={d.total > 0 ? 'fill-brand/70' : 'fill-line'}>
              <title>{`${d.date} · ${dec(d.total)} SAR · ${num(d.orders)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] text-dim">
        <span className="num">{series[0]?.date?.slice(5)}</span>
        <span className="num">{series.at(-1)?.date?.slice(5)}</span>
      </div>
    </figure>
  )
}

/* ============================ the gate ============================ */

function Gate({ needSetup, onDone }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ name: '', email: '', password: '', again: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [fieldErr, setFieldErr] = useState({})
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const errorText = (field) => (field === 'oldPrice' ? t('admin.err_price') : field === 'length' ? t('admin.err_password') : t(`admin.err_${field}`))

  async function send(e) {
    e.preventDefault()
    setMsg(null)
    setFieldErr({})
    if (needSetup && form.password !== form.again) return setFieldErr({ again: t('admin.err_again') })
    setBusy(true)
    const r = needSetup
      ? await api.setup({ name: form.name, email: form.email, password: form.password })
      : await api.login({ email: form.email, password: form.password })
    setBusy(false)
    if (r?.ok) return onDone(r.user)
    const errors = r?.errors || {}
    if (Object.keys(errors).length) {
      const next = {}
      for (const field of Object.keys(errors)) next[field] = errorText(field)
      setFieldErr(next)
    }
    setMsg(
      r?.retryAfter
        ? `${t('admin.locked')} · ${num(r.retryAfter)}s`
        : r?.needSetup
          ? t('admin.needSetupHint')
          : r?.status === 503
            ? t('admin.disabled')
            : t('admin.badCreds'),
    )
  }

  return (
    <div className="page-x mx-auto flex min-h-[72vh] max-w-[540px] items-center">
      <form onSubmit={send} className="w-full rounded-[28px] border border-line bg-panel p-6 shadow-soft sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand/12 text-brand">
          <Icon n="lock" className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-[26px] leading-tight font-extrabold">{needSetup ? t('admin.setupTitle') : t('admin.signIn')}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-dim">{needSetup ? t('admin.setupSub') : t('admin.signInSub')}</p>

        <div className="mt-6 flex flex-col gap-4">
          {needSetup && (
            <Field id="ad-name" label={t('admin.name')}>
              <Text id="ad-name" value={form.name} onChange={set('name')} placeholder={t('admin.namePh')} />
            </Field>
          )}
          <Field id="ad-email" label={t('admin.email')} hint={!needSetup ? t('admin.emailOptional') : undefined}>
            <Text
              id="ad-email"
              dir="ltr"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="name@domain.com"
              autoComplete="username"
            />
          </Field>
          <Field id="ad-pass" label={t('admin.password')} error={fieldErr.password} hint={fieldErr.password ? undefined : t('admin.minPass')}>
            <Text
              id="ad-pass"
              dir="ltr"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••••"
              autoComplete={needSetup ? 'new-password' : 'current-password'}
              invalid={!!fieldErr.password}
            />
          </Field>
          {needSetup && (
            <Field id="ad-again" label={t('admin.confirm')} error={fieldErr.again}>
              <Text
                id="ad-again"
                dir="ltr"
                type="password"
                value={form.again}
                onChange={set('again')}
                placeholder="••••••••••"
                autoComplete="new-password"
                invalid={!!fieldErr.again}
              />
            </Field>
          )}
        </div>

        <p role="status" aria-live="polite" className="min-h-[20px]">
          {msg && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-danger/12 px-2.5 py-1.5 text-[12px] font-bold text-danger">
              <Icon n="close" className="size-3.5" sw={2.4} />
              {msg}
            </span>
          )}
        </p>

        <button
          type="submit"
          disabled={busy}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-bold text-brandink transition hover:bg-brand2 disabled:opacity-60"
        >
          {busy && <Icon n="refresh" className="size-4 animate-spin" />}
          {needSetup ? t('admin.createAccount') : t('admin.signIn')}
        </button>

        <p className="mt-5 rounded-xl border border-line bg-bg/50 p-3 text-[11.5px] leading-relaxed text-dim">
          {t(apiMode === 'rest' ? 'admin.noteRest' : 'admin.noteLocal')}
        </p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand hover:underline">
          <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
          {t('admin.backToStore')}
        </Link>
      </form>
    </div>
  )
}

/* ============================ products ============================ */

function ProductEditor({ row, isNew, onClose, onSaved }) {
  const { t, L } = useI18n()
  const [draft, setDraft] = useState(() =>
    isNew
      ? { ...EMPTY }
      : {
          ...EMPTY,
          price: String(row.price ?? ''),
          oldPrice: row.oldPrice ? String(row.oldPrice) : '',
          download: row.download || '',
          nameAr: row.name?.ar || '',
          nameEn: row.name?.en || '',
          cat: row.cat || '',
          published: row.published !== false,
          featured: !!row.featured,
        },
  )
  const [busy, setBusy] = useState(false)
  const [errs, setErrs] = useState({})
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))
  const err = (k) =>
    errs[k] ? t(`admin.err_${errs[k] === 'exists' ? 'exists' : k === 'oldPrice' ? 'price' : k === 'length' ? 'password' : k}`) : undefined

  async function save() {
    setBusy(true)
    setErrs({})
    const patch = { price: draft.price, published: draft.published, featured: draft.featured }
    if (draft.oldPrice) patch.oldPrice = draft.oldPrice
    if (isNew || draft.download !== (row.download || '')) patch.download = draft.download // والتصفير يُرسل كي يُحذف الرابط
    for (const k of ['nameAr', 'nameEn', 'taglineAr', 'taglineEn', 'cat']) if (draft[k]) patch[k] = draft[k]
    const r = isNew
      ? await api.createProduct({ ...patch, id: draft.id, type: draft.type, clone: draft.clone || null })
      : await api.patchProduct({ id: row.id, patch })
    setBusy(false)
    if (!r?.ok) return setErrs(r?.errors || { __: 1 })
    onSaved(isNew ? t('admin.created') : t('admin.saved'))
  }

  return (
    <div className="rounded-2xl border border-brand/25 bg-bg/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] font-extrabold">{isNew ? t('admin.newProduct') : `${t('admin.editing')} · ${L(row.name)}`}</p>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-[12px] font-bold text-dim transition hover:text-ink">
          <Icon n="close" className="size-3.5" />
          {t('admin.cancel')}
        </button>
      </div>

      {isNew && (
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <Field id="np-id" label={t('admin.fId')} error={err('id')} hint={errs.id ? undefined : t('admin.idHint')}>
            <Text id="np-id" dir="ltr" value={draft.id} onChange={set('id')} placeholder="my-new-template" invalid={!!errs.id} />
          </Field>
          <Field id="np-type" label={t('admin.fType')} error={err('type')}>
            <select id="np-type" value={draft.type} onChange={(e) => set('type')(e.target.value)} className={INPUT}>
              {['portfolio', 'cv', 'bundle'].map((x) => (
                <option key={x} value={x}>
                  {t(`types.${x}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="np-clone" label={t('admin.fClone')} hint={t('admin.cloneHint')}>
            <select id="np-clone" value={draft.clone} onChange={(e) => set('clone')(e.target.value)} className={INPUT}>
              <option value="">{t('admin.cloneAuto')}</option>
              {templates
                .filter((x) => !x.custom)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {L(x.name)}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pe-price" label={t('admin.fPrice')} error={err('price')} hint={errs.price ? undefined : t('admin.priceHint')}>
          <Text id="pe-price" dir="ltr" type="number" value={draft.price} onChange={set('price')} placeholder="249" invalid={!!errs.price} />
        </Field>
        <Field id="pe-old" label={t('admin.fOldPrice')} error={err('oldPrice')}>
          <Text id="pe-old" dir="ltr" type="number" value={draft.oldPrice} onChange={set('oldPrice')} placeholder={t('admin.optional')} />
        </Field>
        <Field id="pe-name" label={t('admin.fNameAr')}>
          <Text id="pe-name" value={draft.nameAr} onChange={set('nameAr')} />
        </Field>
        <Field id="pe-nameen" label={t('admin.fNameEn')}>
          <Text id="pe-nameen" dir="ltr" value={draft.nameEn} onChange={set('nameEn')} />
        </Field>
        {isNew && (
          <>
            <Field id="pe-tag" label={t('admin.fTaglineAr')}>
              <Text id="pe-tag" value={draft.taglineAr} onChange={set('taglineAr')} />
            </Field>
            <Field id="pe-tagen" label={t('admin.fTaglineEn')}>
              <Text id="pe-tagen" dir="ltr" value={draft.taglineEn} onChange={set('taglineEn')} />
            </Field>
          </>
        )}
        <Field
          id="pe-dl"
          label={t('admin.fDownload')}
          error={err('download')}
          hint={errs.download ? undefined : t('admin.urlHint')}
          className="sm:col-span-2"
        >
          <Text
            id="pe-dl"
            dir="ltr"
            value={draft.download}
            onChange={set('download')}
            placeholder="https://cdn.example.com/file.zip"
            invalid={!!errs.download}
          />
        </Field>
        <Field id="pe-cat" label={t('admin.fCat')}>
          <select id="pe-cat" value={draft.cat} onChange={(e) => set('cat')(e.target.value)} className={INPUT}>
            <option value="">{t('admin.keepCurrent')}</option>
            {categories
              .filter((c) => c.id !== 'all')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {L(c)}
                </option>
              ))}
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <Tick id="pe-pub" checked={draft.published} onChange={set('published')}>
            {t('admin.fPublished')}
          </Tick>
          <Tick id="pe-feat" checked={draft.featured} onChange={set('featured')}>
            {t('admin.fFeatured')}
          </Tick>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-bold text-brandink transition hover:bg-brand2 disabled:opacity-60"
        >
          {busy && <Icon n="refresh" className="size-3.5 animate-spin" />}
          {busy ? t('admin.saving') : isNew ? t('admin.createProduct') : t('admin.save')}
        </button>
        {errs.__ && (
          <span role="alert" className="text-[12px] font-bold text-danger">
            {t('admin.saveFailed')}
          </span>
        )}
      </div>
    </div>
  )
}

function Products({ rows, overrides, prices, reload }) {
  const { t, L } = useI18n()
  const { toast } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (rows || []).filter((r) => {
      if (filter === 'edited' && !r.edited) return false
      if (filter === 'hidden' && r.published) return false
      if (!needle) return true
      return [r.id, r.slug, r.name?.ar, r.name?.en].join(' ').toLowerCase().includes(needle)
    })
  }, [rows, q, filter])

  async function run(fn, done) {
    const r = await fn()
    if (!r?.ok) return toast(t('admin.saveFailed'))
    await reload()
    setEditing(null)
    toast(done)
  }

  const hiddenCount = (rows || []).filter((r) => !r.published).length
  const editedCount = Object.keys(overrides || {}).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="ad-q">
          {t('admin.searchProducts')}
        </label>
        <div className="flex h-10 min-w-[210px] flex-1 items-center gap-2 rounded-xl border border-line bg-bg px-3">
          <Icon n="search" className="size-4 shrink-0 text-dim" />
          <input
            id="ad-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.searchProducts')}
            className="w-full bg-transparent text-[13.5px] outline-none"
          />
        </div>
        <div className="flex gap-1.5" role="group" aria-label={t('admin.filterLabel')}>
          {['all', 'edited', 'hidden'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`h-10 rounded-xl px-3 text-[12.5px] font-bold transition ${filter === f ? 'bg-ink text-bg light:bg-brand light:text-brandink' : 'border border-line bg-panel/50 text-dim hover:text-ink'}`}
            >
              {t(`admin.filter_${f}`)}
              {f !== 'all' && <span className="num ms-1.5 opacity-70">{num(f === 'hidden' ? hiddenCount : editedCount)}</span>}
            </button>
          ))}
        </div>
        <Btn size="md" onClick={() => setEditing(editing === 'new' ? null : 'new')}>
          <Icon n="plus" className="size-4" sw={2.2} />
          {t('admin.newProduct')}
        </Btn>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] border-collapse text-right">
          <caption className="sr-only">{t('admin.productsCaption')}</caption>
          <thead>
            <tr className="bg-bg/60 text-[11px] font-bold uppercase tracking-[0.1em] text-dim">
              <th scope="col" className="px-4 py-3 text-start">
                {t('admin.colName')}
              </th>
              <th scope="col" className="px-3 py-3">
                {t('admin.colType')}
              </th>
              <th scope="col" className="px-3 py-3">
                {t('admin.colPrice')}
              </th>
              <th scope="col" className="px-3 py-3">
                {t('admin.colSold')}
              </th>
              <th scope="col" className="px-3 py-3">
                {t('admin.colDownload')}
              </th>
              <th scope="col" className="px-3 py-3">
                {t('admin.colStatus')}
              </th>
              <th scope="col" className="px-4 py-3 text-end">
                {t('admin.colActions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <Fragment key={r.id}>
                <tr className={`border-t border-line text-[13px] transition hover:bg-bg/40 ${r.published ? '' : 'opacity-55'}`}>
                  <td className="px-4 py-3 text-start">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{L(r.name)}</span>
                      {r.edited && <Pill tone="brand">{t('admin.editedBadge')}</Pill>}
                      {r.custom && <Pill tone="gold">{t('admin.customBadge')}</Pill>}
                    </span>
                    <span className="num mt-0.5 block text-[11px] text-dim" dir="ltr">
                      {r.slug}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] text-dim">{t(`types.${r.type}`)}</td>
                  <td className="px-3 py-3 text-center">
                    <Money v={r.price} size="text-[13.5px]" />
                    {r.basePrice != null && r.basePrice !== r.price && (
                      <span className="num ms-1.5 text-[11px] text-dim line-through" title={t('admin.basePrice')}>
                        {dec(r.basePrice)}
                      </span>
                    )}
                  </td>
                  <td className="num px-3 py-3 text-center text-[12.5px]">{r.sales ? num(r.sales) : '—'}</td>
                  <td className="px-3 py-3 text-center">
                    {isProtectedDownload(r.download) ? (
                      // لا رابط يُفتح من اللوحة: التسليم يبدأ من إيصال المشتري برقم طلبه ومفتاحه
                      <span
                        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand"
                        title={`${t('admin.protectedDl')} · ${r.download}`}
                      >
                        <Icon n="shield" className="size-3.5 shrink-0" />
                        {t('admin.protectedDl')}
                      </span>
                    ) : r.download ? (
                      <a
                        href={r.download}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-[190px] items-center gap-1 text-[12px] font-bold text-brand hover:underline"
                      >
                        <Icon n="download" className="size-3.5 shrink-0" />
                        <span className="truncate" dir="ltr">
                          {r.download.replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-[12px] text-dim">{t('admin.noDownload')}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.published ? <Pill tone="brand">{t('admin.live')}</Pill> : <Pill>{t('admin.hidden')}</Pill>}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <span className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(editing === r.id ? null : r.id)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold transition hover:bg-panel2"
                      >
                        {t('admin.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run(
                            r.published ? () => api.deleteProduct(r.id) : () => api.restoreProduct(r.id),
                            r.published ? t('admin.hiddenOk') : t('admin.restoredOk'),
                          )
                        }
                        className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold text-dim transition hover:text-ink"
                      >
                        {r.published ? t('admin.hide') : t('admin.restore')}
                      </button>
                    </span>
                  </td>
                </tr>
                {editing === r.id && (
                  <tr>
                    <td colSpan={7} className="border-t border-line px-4 py-3">
                      <ProductEditor row={r} onClose={() => setEditing(null)} onSaved={(msg) => run(async () => ({}), msg)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {editing === 'new' && (
              <tr>
                <td colSpan={7} className="border-t border-line px-4 py-3">
                  <ProductEditor row={null} isNew onClose={() => setEditing(null)} onSaved={(msg) => run(async () => ({}), msg)} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!list.length && <p className="px-4 py-9 text-center text-[13px] text-dim">{t('admin.noProductsFound')}</p>}
      </div>
      <p className="text-[11.5px] leading-relaxed text-dim">
        {t('admin.pricesNote')} <span className="num font-bold">{num(Object.keys(prices || {}).length)}</span> /{' '}
        <span className="num font-bold">{num(rows?.length || 0)}</span>
      </p>
    </div>
  )
}

/* ============================ orders ============================ */

function Orders({ orders }) {
  const { t } = useI18n()
  const { toast } = useStore()
  const rows = orders || []

  async function exportCsv() {
    const text = await api.csv()
    if (!text) return toast(t('admin.exportEmpty'))
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `qalb-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel className="p-0 sm:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-[18px] font-extrabold">{t('admin.ordersTitle')}</h2>
          <p className="mt-0.5 text-[12px] text-dim">{rows.length ? t('admin.ordersSub') : t('admin.noOrdersHint')}</p>
        </div>
        <Btn size="sm" variant="outline" onClick={exportCsv}>
          <Icon n="download" className="size-3.5" />
          {t('admin.exportCsv')}
        </Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-right">
          <caption className="sr-only">{t('admin.ordersTitle')}</caption>
          <thead>
            <tr className="bg-bg/50 text-[11px] font-bold uppercase tracking-[0.1em] text-dim">
              <th scope="col" className="px-5 py-2.5 text-start">
                {t('admin.colId')}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t('admin.colDate')}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t('admin.colCustomer')}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t('admin.colItems')}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t('admin.colTotal')}
              </th>
              <th scope="col" className="px-5 py-2.5">
                {t('admin.colKey')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line text-[12.5px]">
                <td className="num px-5 py-2.5 text-start font-semibold" dir="ltr">
                  {o.id}
                </td>
                <td className="num px-3 py-2.5 text-center text-dim" dir="ltr">
                  {o.date}
                </td>
                <td className="px-3 py-2.5">
                  <span className="block font-bold">{o.name}</span>
                  <span className="num block text-[11px] text-dim" dir="ltr">
                    {o.email}
                  </span>
                </td>
                <td className="num px-3 py-2.5 text-center">
                  {num(o.count || (o.lines || []).length)}
                  {o.personalize ? (
                    // القيم نفسها لا تُعرض في اللوحة: يكفي أنها طُبعت في حزمة هذا الطلب
                    <Pill tone="brand" className="ms-1.5">
                      {t('admin.personalized')}
                    </Pill>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Money v={o.total} size="text-[13px]" />
                </td>
                <td className="num px-5 py-2.5 text-center text-[11.5px] text-dim" dir="ltr">
                  {o.key}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="px-5 py-10 text-center text-[13px] text-dim">{t('admin.noOrders')}</p>}
      </div>
    </Panel>
  )
}

/* ============================ users ============================ */

function Users({ user }) {
  const { t } = useI18n()
  const { toast } = useStore()
  const [list, setList] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', owner: false })
  const [errs, setErrs] = useState({})
  const [open, setOpen] = useState(null)
  const [newPass, setNewPass] = useState('')
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    api.users().then((r) => setList(r?.users || []))
  }, [])
  async function add(e) {
    e.preventDefault()
    setErrs({})
    const r = await api.createUser({ name: form.name, email: form.email, password: form.password, role: form.owner ? 'owner' : 'admin' })
    if (!r?.ok) {
      const map = {}
      for (const [k, v] of Object.entries(r?.errors || {}))
        map[k] = t(v === 'exists' ? 'admin.err_exists' : `admin.err_${k === 'length' ? 'password' : k}`)
      setErrs(map)
      return
    }
    setList(r.users)
    setForm({ name: '', email: '', password: '', owner: false })
    toast(t('admin.userAdded'))
  }

  async function del(id) {
    if (open !== `confirm-${id}`) return setOpen(`confirm-${id}`)
    const r = await api.deleteUser(id)
    setOpen(null)
    if (!r?.ok) return toast(r?.error?.includes('signed in') ? t('admin.cannotDeleteSelf') : t('admin.lastOwner'))
    setList(r.users)
    toast(t('admin.userRemoved'))
  }

  async function reset(id) {
    const r = await api.resetPassword({ id, password: newPass })
    setOpen(null)
    setNewPass('')
    if (!r?.ok) return toast(t('admin.err_password'))
    toast(t('admin.passUpdated'))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <Panel>
        <h2 className="font-display text-[18px] font-extrabold">{t('admin.usersTitle')}</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('admin.usersSub')}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {!list && <Skeleton className="h-14 w-full" rounded="rounded-2xl" />}
          {list?.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bg/40 px-4 py-3">
              <span className="flex min-w-[200px] items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-[13px] font-extrabold text-brand">
                  {(u.name || '?').slice(0, 2)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold">
                    {u.name}
                    {u.id === user?.id && <span className="ms-2 text-[11px] font-semibold text-dim">{t('admin.you')}</span>}
                  </span>
                  <span className="num block truncate text-[11.5px] text-dim" dir="ltr">
                    {u.email} · {u.lastLogin || t('admin.never')}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Pill tone={u.role === 'owner' ? 'gold' : 'line'}>{t(u.role === 'owner' ? 'admin.roleOwner' : 'admin.roleAdmin')}</Pill>
                <button
                  type="button"
                  onClick={() => setOpen(open === `pw-${u.id}` ? null : `pw-${u.id}`)}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold transition hover:bg-panel2"
                >
                  {t('admin.resetPass')}
                </button>
                <button
                  type="button"
                  onClick={() => del(u.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition ${open === `confirm-${u.id}` ? 'bg-danger text-white' : 'border border-line text-dim hover:text-danger'}`}
                >
                  {open === `confirm-${u.id}` ? t('admin.confirmDelete') : t('admin.remove')}
                </button>
              </span>
              {open === `pw-${u.id}` && (
                <span className="flex w-full items-end gap-2 pt-2">
                  <span className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-dim" htmlFor={`pw-${u.id}`}>
                      {t('admin.newPass')}
                    </label>
                    <input id={`pw-${u.id}`} dir="ltr" type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} className={INPUT} />
                  </span>
                  <Btn size="sm" onClick={() => reset(u.id)}>
                    {t('admin.save')}
                  </Btn>
                </span>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-[18px] font-extrabold">{t('admin.addAdmin')}</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('admin.addAdminSub')}</p>
        <form onSubmit={add} className="mt-4 flex flex-col gap-3.5">
          <Field id="au-name" label={t('admin.name')} error={errs.name}>
            <Text id="au-name" value={form.name} onChange={set('name')} placeholder={t('admin.namePh')} invalid={!!errs.name} />
          </Field>
          <Field id="au-mail" label={t('admin.email')} error={errs.email}>
            <Text
              id="au-mail"
              dir="ltr"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="name@domain.com"
              invalid={!!errs.email}
            />
          </Field>
          <Field id="au-pass" label={t('admin.password')} error={errs.password} hint={errs.password ? undefined : t('admin.minPass')}>
            <Text
              id="au-pass"
              dir="ltr"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••••"
              autoComplete="new-password"
              invalid={!!errs.password}
            />
          </Field>
          {user?.role === 'owner' && (
            <Tick id="au-owner" checked={form.owner} onChange={set('owner')}>
              {t('admin.grantOwner')}
            </Tick>
          )}
          <button
            type="submit"
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-bold text-brandink transition hover:bg-brand2"
          >
            <Icon n="plus" className="size-4" sw={2.2} />
            {t('admin.addAdmin')}
          </button>
          <p className="text-[11.5px] leading-relaxed text-dim">{t('admin.usersSecurity')}</p>
        </form>
      </Panel>
    </div>
  )
}

/* ============================ overview ============================ */

function Overview({ stats, rows, onGo }) {
  const { t, L } = useI18n()
  const s = stats
  const maxQty = Math.max(...(s?.top || []).map((x) => x.qty), 1)
  const published = (rows || []).filter((r) => r.published).length
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="wallet" label={t('admin.revenue')} value={dec(s?.revenue || 0)} unit={t('admin.sar')} foot={t('admin.revenueFoot')} />
        <StatCard icon="cart" label={t('admin.ordersCount')} value={num(s?.orders || 0)} foot={`${t('admin.buyers')}: ${num(s?.buyers || 0)}`} />
        <StatCard icon="card" label={t('admin.avg')} value={dec(s?.avg || 0)} unit={t('admin.sar')} foot={t('admin.avgFoot')} />
        <StatCard
          icon="layers"
          label={t('admin.published')}
          value={num(published)}
          unit={`/ ${num(rows?.length || 0)}`}
          foot={t('admin.publishedFoot')}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <h2 className="font-display text-[18px] font-extrabold">{t('admin.last30')}</h2>
          {s?.series?.length ? (
            <RevenueChart series={s.series} label={t('admin.chartLabel')} />
          ) : (
            <p className="mt-4 text-[13px] text-dim">{t('admin.noOrders')}</p>
          )}
          <p className="mt-4 rounded-xl border border-line bg-bg/40 p-3 text-[11.5px] leading-relaxed text-dim">
            {t(apiMode === 'rest' ? 'admin.sourceRest' : 'admin.sourceLocal')}
          </p>
        </Panel>

        <Panel>
          <h2 className="font-display text-[18px] font-extrabold">{t('admin.topProducts')}</h2>
          {(s?.top || []).length ? (
            <ul className="mt-4 flex flex-col gap-3">
              {s.top.map((p) => (
                <li key={p.id}>
                  <p className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-bold">{L({ ar: p.name, en: p.nameEn })}</span>
                    <span className="num text-[12px] text-dim">
                      {num(p.qty)} · <Money v={p.revenue} size="text-[12px]" />
                    </span>
                  </p>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-brand/70" style={{ width: `${Math.max(6, (p.qty / maxQty) * 100)}%` }} />
                  </span>
                  {p.hidden && <span className="mt-1 block text-[11px] font-bold text-gold">{t('admin.topHidden')}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[13px] text-dim">{t('admin.noOrders')}</p>
          )}
          <div className="mt-5 flex gap-2">
            <Btn size="sm" variant="outline" onClick={() => onGo('products')}>
              <Icon n="layers" className="size-3.5" />
              {t('admin.tab_products')}
            </Btn>
            <Btn size="sm" variant="outline" onClick={() => onGo('orders')}>
              <Icon n="cart" className="size-3.5" />
              {t('admin.tab_orders')}
            </Btn>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* ============================ page ============================ */

export default function Admin() {
  const { t } = useI18n()
  const { refreshCatalog, toast } = useStore()
  const [params, setParams] = useSearchParams()
  const [gate, setGate] = useState('loading')
  const [user, setUser] = useState(null)
  const [data, setData] = useState({ stats: null, rows: [], overrides: {}, prices: {}, orders: [] })
  const [loading, setLoading] = useState(false)
  const tab = TABS.some((x) => x.id === params.get('tab')) ? params.get('tab') : 'overview'

  useSeo(`${t('admin.title')} · ${t('brand.name')}`, t('admin.sub'), { robots: 'noindex,follow' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, stats, orders] = await Promise.all([api.products(), api.stats(), api.orders()])
      const sold = Object.fromEntries((stats?.top || []).map((p) => [p.id, p.qty]))
      setData({
        stats: stats || null,
        rows: adminRows(products?.overrides || {}).map((r) => ({ ...r, sales: sold[r.id] || 0 })),
        overrides: products?.overrides || {},
        prices: products?.prices || {},
        orders: orders?.orders || [],
      })
    } catch {
      toast(t('admin.offline'))
    } finally {
      setLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    let alive = true
    api
      .session()
      .then((s) => {
        if (!alive) return
        if (s?.ok) {
          setUser(s.user)
          setGate('in')
          load()
        } else setGate(s?.needSetup ? 'setup' : s?.enabled === false ? 'disabled' : 'login')
      })
      .catch(() => alive && setGate('offline'))
    return () => {
      alive = false
    }
  }, [load])

  const setTab = (id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })

  const afterEdit = useCallback(async () => {
    await refreshCatalog()
    await load()
  }, [refreshCatalog, load])

  if (gate === 'loading')
    return (
      <div className="page-x mx-auto max-w-[1200px] py-16">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-64 w-full" rounded="rounded-3xl" />
      </div>
    )

  if (gate === 'disabled' || gate === 'offline')
    return (
      <div className="page-x mx-auto flex min-h-[70vh] max-w-[540px] items-center">
        <div className="w-full rounded-[28px] border border-line bg-panel p-7">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gold/14 text-gold">
            <Icon n={gate === 'offline' ? 'clock' : 'shield'} className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-[22px] font-extrabold">{t(gate === 'offline' ? 'admin.offline' : 'admin.disabled')}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-dim">{t(gate === 'offline' ? 'admin.offlineSub' : 'admin.disabledSub')}</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand hover:underline">
            <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
            {t('admin.backToStore')}
          </Link>
        </div>
      </div>
    )

  if (gate !== 'in') return <Gate needSetup={gate === 'setup'} onDone={(u) => (setUser(u), setGate('in'), load())} />

  return (
    <div className="page-x mx-auto max-w-[1320px] py-8 sm:py-10" data-admin>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand/12 text-brand">
            <Icon n="sliders" className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-[22px] leading-tight font-extrabold">{t('admin.title')}</h1>
            <p className="text-[12.5px] text-dim">{t('admin.sub')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={apiMode === 'rest' ? 'brand' : 'gold'}>
            <Icon n="shield" className="size-3" />
            {t(apiMode === 'rest' ? 'admin.modeRest' : 'admin.modeLocal')}
          </Pill>
          <span className="text-[12.5px] font-semibold text-dim">
            {user?.name}{' '}
            <span className="num" dir="ltr">
              · {user?.email}
            </span>
          </span>
          <Btn
            size="sm"
            variant="outline"
            onClick={() =>
              api
                .logout()
                .then(() => setGate('login'))
                .catch(() => setGate('login'))
            }
          >
            <Icon n="lock" className="size-3.5" />
            {t('admin.signOut')}
          </Btn>
        </div>
      </header>

      <p
        className={`mt-5 flex items-start gap-2 rounded-2xl border p-3.5 text-[12px] leading-relaxed ${apiMode === 'rest' ? 'border-line bg-panel/60 text-dim' : 'border-gold/35 bg-gold/10'}`}
      >
        <Icon n={apiMode === 'rest' ? 'shield' : 'clock'} className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>{t(apiMode === 'rest' ? 'admin.noteRest' : 'admin.noteLocal')}</span>
      </p>

      <nav className="mt-6 flex gap-1.5 overflow-x-auto border-b border-line" aria-label={t('admin.tabsLabel')}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            aria-current={tab === x.id ? 'page' : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3.5 text-[13px] font-bold transition ${tab === x.id ? 'border-brand' : 'border-transparent text-dim hover:text-ink'}`}
          >
            <Icon n={x.icon} className="size-4" />
            {t(`admin.tab_${x.id}`)}
          </button>
        ))}
        {loading && (
          <span className="ms-auto inline-flex items-center gap-1.5 py-2.5 text-[11.5px] font-bold text-dim">
            <Icon n="refresh" className="size-3.5 animate-spin" />
            {t('misc.loading')}
          </span>
        )}
      </nav>

      <div className="mt-6">
        {tab === 'overview' && <Overview stats={data.stats} rows={data.rows} onGo={setTab} />}
        {tab === 'products' && <Products rows={data.rows} overrides={data.overrides} prices={data.prices} reload={afterEdit} />}
        {tab === 'orders' && <Orders orders={data.orders} />}
        {tab === 'users' && <Users user={user} />}
      </div>

      <p className="mt-12 border-t border-line pt-6 text-[11.5px] leading-relaxed text-dim">
        {t('admin.footerHint', { n: num(data.rows.length) })} · {t('admin.editorHint')}
      </p>
    </div>
  )
}
