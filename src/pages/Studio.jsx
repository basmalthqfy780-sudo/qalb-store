import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { sites } from '../api/hosting'
import { HOST_LIMITS, PLANS, renderSite, sanitizeSite } from '../data/hosting'
import { TYPES, templates } from '../data/templates'
import { SUPPORT_MAIL } from '../data/contact'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon, Pill } from '../components/ui'
import StudioTools from '../components/StudioTools'
import PkgStudio from '../components/PkgStudio'

/**
 * استوديو التحرير: يقرأ سجلّ الموقع ويعيد نفس مولّدات الحزمة في iframe، فكل
 * حرف تكتبه يُرى كما سيُخدَم بالضبط — لأن `renderSite` هي نفسها التي يناديها
 * `server/sites.js` على القرص. الحفظ يمرّ على القواعد نفسها (السقف، التنقية،
 * الخطة)، واللوحة وحدها تقلب الخطة: لا زرّ هنا يرقّي نفسه.
 */
const FIELDS = [
  { k: 'name', key: 'personal.name', wide: true, auto: 'name' },
  { k: 'role', key: 'personal.role' },
  { k: 'city', key: 'host.field.city' },
  { k: 'email', key: 'personal.email', type: 'email', dir: 'ltr' },
  { k: 'phone', key: 'personal.phone', dir: 'ltr', mode: 'tel' },
  { k: 'website', key: 'personal.site', dir: 'ltr', mode: 'url' },
  { k: 'bio', key: 'personal.bio', wide: true, multiline: true },
]
const TYPE_LABEL = Object.fromEntries(TYPES.map((x) => [x.id, x]))
const HOSTABLE = templates.filter((t) => t && t.id)
const emptyForm = { name: '', role: '', city: '', email: '', phone: '', website: '', bio: '', theme: 'dark', lang: 'ar', template: HOSTABLE[0].id }

/**
 * صفحة /studio بمساحتين تحت سقفٍ واحد:
 *   ?tab=site  (الافتراضي) استوديو المواقع المستضافة — كما هو تمامًا.
 *   ?tab=pkg   استوديو تخصيص القالب للمشترين الموثّقين (نصوص · صور · أقسام · تصدير ZIP).
 */
export default function Studio() {
  const [params, setParams] = useSearchParams()
  const { t } = useI18n()
  const tab = params.get('tab') === 'pkg' ? 'pkg' : 'site'
  const go = (v) => setParams(v === 'pkg' ? { tab: 'pkg' } : {})
  return (
    <>
      <div className="page-x mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 pt-8" data-studio-tabs>
        {[
          { v: 'site', label: t('studio.tab.site') },
          { v: 'pkg', label: t('studio.tab.pkg') },
        ].map((x) => (
          <button
            key={x.v}
            type="button"
            data-studio-tab={x.v}
            aria-pressed={tab === x.v}
            onClick={() => go(x.v)}
            className={`h-9 rounded-xl border px-3.5 text-[12.5px] font-bold transition ${tab === x.v ? 'border-brand/55 bg-brand/10 text-ink' : 'border-line bg-bg text-dim hover:border-brand/40'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      {tab === 'pkg' ? <PkgStudio /> : <StudioSite />}
    </>
  )
}

function StudioSite() {
  const { t, lang, L } = useI18n()
  const [params, setParams] = useSearchParams()
  const device = useMemo(() => sites.device(), [])
  const [slug, setSlug] = useState(() => params.get('site') || (device.length === 1 ? device[0].slug : ''))
  const [key, setKey] = useState(
    () => (device.find((x) => x.slug === (params.get('site') || (device.length === 1 ? device[0].slug : ''))) || {}).key || '',
  )
  const [rec, setRec] = useState(null)
  const [state, setState] = useState(slug ? 'loading' : device.length ? 'pick' : 'none')
  const [form, setForm] = useState(emptyForm)
  const [view, setView] = useState('site')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [dropped, setDropped] = useState([])
  const [dom, setDom] = useState('')
  const [domState, setDomState] = useState(null)
  const [keyDraft, setKeyDraft] = useState('')
  const [nonce, setNonce] = useState(0) // إعادة المحاولة بعد انقطاع الشبكة: تُعيد الطلب لا تُعيد الرسم المتسلسل

  // أداة خاصة بمالك الموقع: لا مكان لها في الفهرس
  useSeo(`${t('studio.seoTitle')} · ${t('brand.name')}`, t('studio.seoDesc'), { robots: 'noindex' })

  const fill = (r) => {
    setRec(r)
    const s = r.site || {}
    setForm({
      ...emptyForm,
      ...Object.fromEntries(FIELDS.map((f) => [f.k, s[f.k] || ''])),
      theme: s.theme || 'dark',
      lang: s.lang || 'ar',
      template: s.template || HOSTABLE[0].id,
    })
    setDom(r.domain || '')
    setDomState(null)
  }

  // لا setState متزامن في جسم الأثر: الحالة تُضبط في الحدث الذي غيّر السجلّ، ثم هنا عند الوصول فقط
  useEffect(() => {
    if (!slug) return
    let live = true
    sites
      .data(slug, key)
      .then((r) => {
        if (!live) return
        if (r.status === 401) setState('needsKey')
        else if (!r.ok && r.status !== 200) setState('missing')
        else {
          fill(r)
          setState('ready')
        }
      })
      .catch(() => {
        if (live) setState('offline')
      })
    return () => {
      live = false
    }
  }, [slug, key, nonce])

  const plan = PLANS[rec ? rec.plan : 'free']
  const typed = useMemo(() => sanitizeSite({ ...form }), [form])
  const dirty = rec ? JSON.stringify(typed) !== JSON.stringify(sanitizeSite({ ...rec.site })) : false
  const hasSheet = useMemo(() => {
    if (!rec) return false
    const tpl = HOSTABLE.find((x) => x.id === (rec.site?.template || form.template))
    return !!(tpl && tpl.type !== 'portfolio')
  }, [rec, form.template])

  const page = useMemo(() => {
    if (!rec) return null
    const route = view === 'print' ? '/print' : view === 'sheet' ? '/cv' : '/'
    const r = renderSite({ slug: rec.slug, plan: rec.plan, site: typed }, route)
    if (r.status === 200 && typeof r.body === 'string') return r
    const back = renderSite({ slug: rec.slug, plan: rec.plan, site: typed }, '/')
    return back.status === 200 ? back : null
  }, [rec, typed, view])

  const quota = rec?.quota || { used: 0, max: PLANS.free.editQuota, left: PLANS.free.editQuota }
  const out = quota.max != null && quota.left <= 0

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const say = (tone, text) => setNote({ tone, text })

  async function save() {
    if (!slug) return
    setBusy(true)
    const r = await sites.patch(slug, key, { site: form })
    setBusy(false)
    if (r.status === 401) {
      setState('needsKey')
      return
    }
    if (r.status === 429) {
      say('warn', (lang === 'ar' ? r.ar : r.en) || t('studio.quota.out'))
      if (r.used != null) setRec((x) => ({ ...x, quota: { month: r.month, used: r.used, max: r.max, left: 0 } }))
      return
    }
    if (!r.ok && r.status !== 200) {
      say('err', t('studio.err.save'))
      return
    }
    setDropped(r.dropped || [])
    const fresh = await sites.data(slug, key) // ما قبلته القاعدة لا ما كتبه الحقل: فرقٌ يُرى ولا يُدَّعى
    if (fresh.ok) fill(fresh)
    else setRec((x) => ({ ...x, quota: r.quota }))
    say('ok', t('studio.saved'))
  }

  async function revert() {
    const r = await sites.revert(slug, key)
    if (!r.ok && r.status !== 200) {
      say('warn', r.error === 'nothing to revert' ? t('studio.revert.none') : t('studio.revert.err'))
      return
    }
    const x = await sites.data(slug, key)
    if (x.ok) fill(x)
    say('ok', t('studio.revert.done'))
  }

  async function connectDomain() {
    setBusy(true)
    const r = await sites.patch(slug, key, { domain: dom })
    setBusy(false)
    if (r.status === 402) {
      setDomState({ tone: 'plan', status: 402, price: r.price, plan: r.plan })
      say('warn', t('studio.domain.paid', { n: r.price }))
      return
    }
    if (!r.ok && r.status !== 200) {
      setDomState({ tone: 'err', status: r.status, error: r.error })
      return
    }
    setDomState({ tone: 'ok', status: 200, domain: r.domain })
    setRec((x) => ({ ...x, domain: r.domain }))
  }

  async function verifyDomain() {
    setBusy(true)
    const r = await sites.checkDomain(slug, key)
    setBusy(false)
    setDomState({ ...r, tone: r.ok ? 'ok' : r.status === 501 ? 'local' : 'err' })
  }

  async function askPlus() {
    const r = await sites.requestPlan(slug, key, true)
    if (r.ok || r.status === 200) {
      setRec((x) => ({ ...x, planPending: true }))
      say('ok', t('studio.plan.requested'))
    } else say('err', t('studio.plan.err'))
  }

  async function unlock() {
    const k = String(keyDraft).trim()
    if (!k) return
    sites.remember(slug, k)
    setKey(k)
    setKeyDraft('')
    setState('loading')
  }

  const liveUrl = rec?.url || null
  // رابط الطبع صفحةٌ يقدّمها الخادم: في الوضع المحلي لا صفحة حيّة، فالتبويب «ورقة الطبع» هو السبيل
  const printUrl = sites.mode === 'rest' && liveUrl && rec?.status === 'live' ? `${liveUrl}/print` : null

  /* ---------- لا موقع لهذا الجهاز ---------- */
  if (state === 'none' || state === 'pick' || state === 'missing' || state === 'offline' || state === 'loading') {
    const off = state === 'offline'
    return (
      <div className="page-x mx-auto max-w-[760px] py-16">
        <Head
          kicker={t('studio.kicker')}
          title={
            state === 'loading'
              ? t('studio.loading')
              : off
                ? t('studio.offline.title')
                : state === 'missing'
                  ? t('studio.missing.title')
                  : t('studio.empty.title')
          }
          sub={
            state === 'loading'
              ? t('studio.loadingSub')
              : off
                ? t('studio.offline.sub')
                : state === 'missing'
                  ? t('studio.missing.sub')
                  : t('studio.empty.sub')
          }
        />
        {state === 'pick' ? (
          <ul className="mt-6 grid gap-2.5">
            {device.map((x) => (
              <li key={x.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setSlug(x.slug)
                    setKey(x.key)
                    setParams({ site: x.slug })
                    setState('loading')
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-start transition hover:border-brand/50"
                >
                  <code dir="ltr" className="min-w-0 truncate font-mono text-[13px] font-semibold">
                    {x.slug}.{sites.root}
                  </code>
                  <span className="shrink-0 text-[12px] font-bold text-brand">
                    {t('studio.openSite')}
                    <Icon n="arrow" className="ms-1 inline size-3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-7 flex flex-wrap gap-2.5">
          {off ? (
            <Btn size="lg" onClick={() => setNonce((n) => n + 1)}>
              <Icon n="refresh" className="size-4" />
              {t('studio.offline.retry')}
            </Btn>
          ) : null}
          <Btn to="/host" size="lg">
            <Icon n="rocket" className="size-4" />
            {t('studio.cta')}
          </Btn>
          {state === 'missing' ? (
            <Btn
              variant="outline"
              size="lg"
              onClick={() => {
                setSlug('')
                setRec(null)
                setState(device.length ? 'pick' : 'none')
              }}
            >
              {t('studio.pickOther')}
            </Btn>
          ) : null}
        </div>
      </div>
    )
  }

  /* ---------- مفتاح التحرير مفقود على هذا الجهاز ---------- */
  if (state === 'needsKey') {
    return (
      <div className="page-x mx-auto max-w-[560px] py-16">
        <Head kicker={t('studio.kicker')} title={t('studio.key.title')} sub={t('studio.key.sub')} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            unlock()
          }}
          className="mt-7 rounded-3xl border border-line bg-panel p-5"
        >
          <label htmlFor="st-key" className="block text-[13px] font-semibold text-dim">
            {t('studio.key.label')}
          </label>
          <input
            id="st-key"
            value={keyDraft}
            dir="ltr"
            autoComplete="off"
            spellCheck="false"
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder={t('studio.key.ph')}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-bg px-3 font-mono text-[13px] outline-none focus:border-brand/60"
          />
          <Btn type="submit" size="md" className="mt-3.5">
            {t('studio.key.go')}
          </Btn>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('studio.key.warn')}</p>
        </form>
        <Link to="/host" className="mt-6 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand hover:underline">
          <Icon n="arrow" className="size-3.5 rotate-180" />
          {t('studio.back')}
        </Link>
      </div>
    )
  }

  const bar = [PLANS.free, PLANS.pro].map((p) => (
    <div key={p.id} className={`rounded-2xl border p-4 ${rec.plan === p.id ? 'border-brand/45 bg-brand/[0.05]' : 'border-line bg-bg/50'}`}>
      <p className="flex items-center justify-between gap-2 font-display text-[14.5px] font-extrabold">
        {L(p.name)}
        {rec.plan === p.id ? (
          <Pill tone="brand">{t('studio.plan.current')}</Pill>
        ) : rec.planPending && p.id === 'pro' ? (
          <Pill tone="line">{t('studio.plan.pending')}</Pill>
        ) : null}
      </p>
      <ul className="mt-2.5 grid gap-1.5 text-[12.5px] text-dim">
        <li className="flex items-start gap-1.5">
          <Icon n={p.brand ? 'close' : 'check'} className={`mt-0.5 size-3 shrink-0 ${p.brand ? 'text-dim/60' : 'text-brand'}`} sw={2.6} />
          {t(p.brand ? 'studio.plan.brand.on' : 'studio.plan.brand.off')}
        </li>
        <li className="flex items-start gap-1.5">
          <Icon n={p.domain ? 'check' : 'close'} className={`mt-0.5 size-3 shrink-0 ${p.domain ? 'text-brand' : 'text-dim/60'}`} sw={2.6} />
          {t(p.domain ? 'studio.plan.domain.on' : 'studio.plan.domain.off')}
        </li>
        <li className="flex items-start gap-1.5">
          <Icon n="pen" className="mt-0.5 size-3 shrink-0 text-brand" />
          {p.editQuota ? t('studio.plan.edits.n', { n: p.editQuota }) : t('studio.plan.edits.off')}
        </li>
      </ul>
    </div>
  ))

  return (
    <div className="page-x mx-auto max-w-[1400px] py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{t('studio.kicker')}</p>
          <h1 dir="ltr" className="truncate font-display text-2xl font-extrabold sm:text-[27px]">
            <a href={liveUrl} target="_blank" rel="noopener" className="hover:underline">
              {rec.slug}.{sites.root}
            </a>
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-dim">
            <span>{t('studio.since', { d: rec.since })}</span>
            <span aria-hidden>·</span>
            <span>{L(PLANS[rec.plan].name)}</span>
            {rec.status !== 'live' ? <Pill tone="line">{t('studio.paused')}</Pill> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Btn href={liveUrl} target="_blank" rel="noopener" variant="outline" size="sm">
            <Icon n="globe" className="size-3.5" />
            {t('studio.openLive')}
          </Btn>
          {printUrl ? (
            <Btn href={printUrl} target="_blank" rel="noopener" variant="outline" size="sm">
              <Icon n="file" className="size-3.5" />
              {t('studio.printBtn')}
            </Btn>
          ) : null}
        </div>
      </div>

      {sites.mode !== 'rest' ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-line bg-panel/70 px-4 py-3 text-[12px] leading-relaxed text-dim">
          <Icon n="bolt" className="mt-0.5 size-4 shrink-0 text-brand" fill />
          <span className="min-w-0">{t('studio.local')}</span>
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        {/* المحرَّر */}
        <div className="rounded-3xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-[15.5px] font-extrabold">
              <Icon n="pen" className="size-4 text-brand" />
              {t('studio.editor')}
            </p>
            <p dir="ltr" className="flex items-center gap-2 text-[11.5px] font-semibold text-dim">
              <span className="tabular-nums">
                {quota.used}
                {quota.max != null ? `/${quota.max}` : ''}
              </span>
              <span
                className="inline-block h-1.5 w-20 overflow-hidden rounded-full bg-panel2"
                role="img"
                aria-label={t('studio.quota.aria', { u: quota.used, m: quota.max ?? '' })}
              >
                <span
                  data-quota-bar
                  className="block h-full rounded-full transition-all"
                  style={{
                    width: `${quota.max ? Math.min(100, (quota.used / quota.max) * 100) : 100}%`,
                    background: out ? 'var(--c-danger)' : 'var(--c-brand)',
                  }}
                />
              </span>
            </p>
          </div>

          {out ? (
            <p
              role="status"
              className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/[0.07] px-3 py-2 text-[12px] leading-relaxed font-semibold"
            >
              <Icon n="clock" className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">{t('studio.quota.out', { n: quota.max ?? 0 })}</span>
            </p>
          ) : null}
          {dropped.length ? (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2 text-[12px] leading-relaxed">
              <Icon n="close" className="mt-0.5 size-3.5 shrink-0 text-danger" sw={2.6} />
              <span className="min-w-0">
                {t('studio.droppedList', { f: dropped.map((k) => t(FIELDS.find((x) => x.k === k)?.key || 'studio.dropped.field')).join('، ') })}
              </span>
            </p>
          ) : null}
          {note ? (
            <p
              role="status"
              className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12.5px] leading-relaxed ${note.tone === 'ok' ? 'border-brand/40 bg-brand/[0.06]' : note.tone === 'warn' ? 'border-line bg-bg/60' : 'border-danger/40 bg-danger/[0.07]'}`}
            >
              <Icon
                n={note.tone === 'err' ? 'close' : 'check'}
                className={`mt-0.5 size-3.5 shrink-0 ${note.tone === 'err' ? 'text-danger' : 'text-brand'}`}
                sw={2.6}
              />
              <span className="min-w-0">{note.text}</span>
            </p>
          ) : null}

          <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.k} className={`block ${f.wide ? 'sm:col-span-2' : ''}`}>
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">
                  {t(f.key)}
                  {f.k !== 'email' ? <span className="ms-1 normal-case opacity-70">({t('host.optional')})</span> : null}
                </span>
                {f.multiline ? (
                  <textarea
                    id={`st-${f.k}`}
                    rows={3}
                    maxLength={HOST_LIMITS[f.k]}
                    value={form[f.k]}
                    onChange={(e) => set(f.k, e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-[13.5px] leading-relaxed outline-none focus:border-brand/60"
                  />
                ) : (
                  <input
                    id={`st-${f.k}`}
                    type={f.type || 'text'}
                    inputMode={f.mode}
                    dir={f.dir}
                    autoComplete={f.auto}
                    maxLength={HOST_LIMITS[f.k]}
                    value={form[f.k]}
                    onChange={(e) => set(f.k, e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-brand/60"
                  />
                )}
              </label>
            ))}

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t('studio.pick.label')}</span>
              <select
                id="st-template"
                value={form.template}
                onChange={(e) => {
                  const v = e.target.value
                  set('template', v)
                  const tpl = HOSTABLE.find((x) => x.id === v)
                  if (tpl && tpl.type === 'portfolio') setView('site')
                }}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-brand/60"
              >
                {HOSTABLE.map((x) => (
                  <option key={x.id} value={x.id}>
                    {(TYPE_LABEL[x.type] ? L({ ar: TYPE_LABEL[x.type].ar, en: TYPE_LABEL[x.type].en }) : '') + ' · '}
                    {L(x.name)}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-[11.5px] leading-relaxed text-dim">{t('studio.pick.sub')}</span>
            </label>

            <fieldset className="sm:col-span-2 flex flex-wrap items-center gap-2.5 border-0 p-0">
              <legend className="sr-only">{t('studio.appearance')}</legend>
              {[
                ['ar', 'العربية'],
                ['en', 'English'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={form.lang === v}
                  onClick={() => set('lang', v)}
                  className={`h-9 rounded-xl border px-3 text-[12.5px] font-bold transition ${form.lang === v ? 'border-brand/55 bg-brand/10 text-ink' : 'border-line bg-bg text-dim hover:border-brand/40'}`}
                >
                  {label}
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-line" aria-hidden />
              {[
                ['dark', 'studio.theme.dark', 'moon'],
                ['light', 'studio.theme.light', 'sun'],
              ].map(([v, k, ic]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={form.theme === v}
                  onClick={() => set('theme', v)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-bold transition ${form.theme === v ? 'border-brand/55 bg-brand/10 text-ink' : 'border-line bg-bg text-dim hover:border-brand/40'}`}
                >
                  <Icon n={ic} className="size-3.5" />
                  {t(k)}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
            <Btn size="md" onClick={save} disabled={busy || !dirty || (out && rec.plan !== 'pro')} data-save>
              <Icon n="check" className="size-4" sw={2.8} />
              {busy ? t('studio.busy') : t('studio.save')}
            </Btn>
            <Btn size="md" variant="outline" onClick={revert} disabled={busy}>
              <Icon n="refresh" className="size-4" />
              {t('studio.revertGo')}
            </Btn>
            {!dirty && !out ? <span className="text-[11.5px] text-dim">{t('studio.clean')}</span> : null}
          </div>
        </div>

        {/* المعاينة الحيّة */}
        <div className="lg:sticky lg:top-[92px]">
          <div className="overflow-hidden rounded-3xl border border-line bg-panel">
            <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">
              {[
                ['site', 'studio.view.site', 'monitor'],
                ['sheet', 'studio.view.sheet', 'file'],
                ['print', 'studio.view.print', 'scan'],
              ]
                .filter((x) => x[0] === 'site' || hasSheet)
                .map(([v, k, ic]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition ${view === v ? 'bg-brand/12 text-ink' : 'text-dim hover:bg-panel2'}`}
                  >
                    <Icon n={ic} className="size-3.5" />
                    {t(k)}
                  </button>
                ))}
              <span className="ms-auto flex items-center gap-1.5 text-[11px] font-semibold text-dim">
                <span className={`size-1.5 rounded-full ${dirty ? 'bg-[var(--c-warn,#e8a33d)]' : 'bg-brand'}`} aria-hidden />
                {dirty ? t('studio.unsaved') : t('studio.inSync')}
              </span>
            </div>
            {state === 'loading' || !page ? (
              <div className="grid h-[440px] place-items-center text-[12.5px] text-dim">{t('studio.loading')}</div>
            ) : (
              <iframe
                title={t('studio.frame', { slug: rec.slug })}
                sandbox=""
                srcDoc={page.body}
                className="h-[440px] w-full bg-bg"
                data-studio-frame
              />
            )}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{view === 'print' ? t('studio.printNote') : t('studio.preview.note')}</p>
        </div>
      </div>

      {/* الخطة والنطاق */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="flex items-center gap-2 font-display text-[15.5px] font-extrabold">
            <Icon n="card" className="size-4 text-brand" />
            {t('studio.plan.title')}
          </h2>
          <div className="mt-3.5 grid gap-2.5">{bar}</div>
          {rec.plan === 'pro' ? (
            <p className="mt-3.5 text-[12px] leading-relaxed text-dim">{t('studio.plan.on')}</p>
          ) : rec.planPending ? (
            <div className="mt-3.5 rounded-xl border border-brand/40 bg-brand/[0.06] p-3">
              <p className="text-[12.5px] leading-relaxed font-semibold">{t('studio.plan.pendingNote')}</p>
              <a
                href={`mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(`Qalb Plus · ${rec.slug}.${sites.root}`)}`}
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline"
              >
                <Icon n="mail" className="size-3.5" />
                {SUPPORT_MAIL}
              </a>
            </div>
          ) : (
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-bg/60 p-3">
              <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-dim">{t('studio.plan.off', { n: PLANS.pro.price })}</p>
              <Btn size="sm" onClick={askPlus} disabled={busy}>
                <Icon n="crown" className="size-3.5" />
                {t('studio.plan.ask')}
              </Btn>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="flex items-center gap-2 font-display text-[15.5px] font-extrabold">
            <Icon n="globe" className="size-4 text-brand" />
            {t('studio.domain.title')}
          </h2>
          {plan.domain ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  id="st-domain"
                  value={dom}
                  dir="ltr"
                  spellCheck="false"
                  placeholder="noura.sa"
                  onChange={(e) => setDom(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 font-mono text-[13px] outline-none focus:border-brand/60"
                />
                <Btn size="md" onClick={connectDomain} disabled={busy}>
                  {t('studio.domain.connect')}
                </Btn>
                <Btn size="md" variant="outline" onClick={verifyDomain} disabled={busy || !dom}>
                  <Icon n="scan" className="size-3.5" />
                  {t('studio.domain.verify')}
                </Btn>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{t('studio.domain.cname', { s: rec.slug, r: sites.root })}</p>
              {domState ? (
                <p
                  role="status"
                  className={`mt-2.5 rounded-xl border px-3 py-2 text-[12px] leading-relaxed ${domState.tone === 'ok' ? 'border-brand/40 bg-brand/[0.06]' : 'border-line bg-bg/60'}`}
                >
                  {domState.tone === 'ok'
                    ? t('studio.domain.ok', { d: domState.domain || dom })
                    : domState.tone === 'local'
                      ? lang === 'ar'
                        ? domState.ar
                        : domState.en
                      : domState.status === 404
                        ? t('studio.domain.wait', { d: dom })
                        : t('studio.domain.err', { e: domState.error || domState.why || domState.status })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
              <Icon n="lock" className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">{t('studio.domain.locked', { n: PLANS.pro.price })}</span>
            </p>
          )}
        </section>

        <StudioTools rec={rec} form={form} set={set} />

        <section className="rounded-3xl border border-line bg-bg/50 p-5">
          <h2 className="font-display text-[15.5px] font-extrabold">{t('studio.data.title')}</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-dim">{t('studio.data.sub')}</p>
          <div className="mt-3 grid gap-2">
            <Link to="/privacy" className="text-[12px] font-bold text-brand hover:underline">
              {t('studio.data.how')}
            </Link>
            {rec.email ? (
              <p dir="ltr" className="text-[12px] text-dim">
                {rec.email}
              </p>
            ) : null}
            <Btn
              size="sm"
              variant="outline"
              className="justify-self-start"
              onClick={() => {
                sites.forget(slug)
                setParams({})
                setRec(null)
                setState(sites.device().length ? 'pick' : 'none')
              }}
            >
              <Icon n="trash" className="size-3.5" />
              {t('studio.data.forget')}
            </Btn>
          </div>
        </section>
      </div>
    </div>
  )
}
