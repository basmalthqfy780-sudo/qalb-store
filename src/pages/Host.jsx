import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { sites } from '../api/hosting'
import { HOST_LIMITS, PLANS, sanitizeSite, slugify } from '../data/hosting'
import { TYPES, templates } from '../data/templates'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill } from '../components/ui'

/**
 * «قالبك يصير موقعًا»: صفحة الادّخار هذه لا تبيع ملفًا يُنزَّل وحده، بل تُنشئ
 * صفحة حيّة على <slug>.qalb.store من نفس المولّدين اللذين تُبنى منهما الحزمة
 * (src/data/hosting.js ← src/data/deliverable.js).
 *
 * كل رقم هنا مقروء من الكود: سعر بلس من PLANS.pro.price، وسقف التعديلات من
 * PLANS.free.editQuota، ومعاينة النطاق الفرعي من slugify نفسها التي يستعملها
 * الخادم — فلا تُوعِد البطاقة بشيء لا ينفّذه السطر.
 */
const EMAIL = /^[^\s@]{1,80}@[^\s@]+\.[^\s@]{2,}$/
const HOSTABLE = templates.filter((t) => t && t.id)

/** الحقول السبعة كلها اختيارية عدا البريد: لا نطبع حقلًا لا يقرأه مولّد */
const FIELDS = [
  { k: 'name', key: 'personal.name', ph: 'نورة الحربي', phEn: 'Noura Al-Harbi', wide: true, auto: 'name' },
  { k: 'role', key: 'personal.role', ph: 'مصممة واجهات', phEn: 'Product designer' },
  { k: 'city', key: 'host.field.city', ph: 'جدة', phEn: 'Jeddah' },
  { k: 'email', key: 'personal.email', ph: 'you@studio.sa', phEn: 'you@studio.sa', type: 'email', auto: 'email', req: true },
  { k: 'phone', key: 'personal.phone', ph: '+966 5X XXX XXXX', phEn: '+966 5X XXX XXXX', dir: 'ltr', auto: 'tel' },
  { k: 'website', key: 'personal.site', ph: 'noura.studio', phEn: 'noura.studio', dir: 'ltr', auto: 'url' },
  {
    k: 'bio',
    key: 'personal.bio',
    ph: 'أصمّم واجهات للمنتجات المالية منذ ست سنوات.',
    phEn: 'Six years designing interfaces for fintech products.',
    wide: true,
    multiline: true,
  },
]

const TYPE_LABEL = Object.fromEntries(TYPES.map((x) => [x.id, x]))

export default function Host() {
  const { t, lang, L } = useI18n()
  const [params] = useSearchParams()
  const preselect = params.get('template') || ''
  const [draft, setDraft] = useState(() => ({
    name: '',
    role: '',
    city: '',
    email: '',
    phone: '',
    website: '',
    bio: '',
    template: HOSTABLE.some((x) => x.id === preselect) ? preselect : HOSTABLE[0].id,
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)
  const mine = sites.device()

  const typed = sanitizeSite(draft)
  const slug = useMemo(() => slugify(typed.name || '') || slugify(String(draft.email || '').split('@')[0]), [typed.name, draft.email])
  // أي حقل كُتب فيه شيء ولم يُقبل بعد التنقية — يُقال لصاحبه فورًا، لا بعد النشر
  const dropped = Object.keys(typed).filter((k) => !typed[k] && String(draft[k] || '').trim())
  const chosen = HOSTABLE.find((x) => x.id === draft.template) || HOSTABLE[0]

  useSeo(`${t('host.seoTitle')} · ${t('brand.name')}`, t('host.seoDesc'))

  // Escape يُغلق نافحة المفتاح: من يفتح نافذةً يتوقع أن يغلقها كما في بقية الصفحات
  useEffect(() => {
    if (!done) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setDone(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [done])
  const set = (k, v) => {
    if (err) setErr('')
    setDraft((d) => ({ ...d, [k]: v }))
  }

  async function claim(e) {
    e?.preventDefault()
    if (!EMAIL.test(String(draft.email).trim())) {
      setErr(t('host.err.email'))
      return
    }
    setBusy(true)
    const r = await sites.create({
      email: draft.email,
      template: draft.template,
      site: {
        name: draft.name,
        role: draft.role,
        city: draft.city,
        email: draft.email,
        phone: draft.phone,
        website: draft.website,
        bio: draft.bio,
        lang,
        theme: 'dark',
      },
    })
    setBusy(false)
    if (!r.ok && r.status !== 201) {
      setErr(r.status === 400 ? t('host.err.bad') : `${t('host.err.network')} (${r.status || r.error || '?'})`)
      return
    }
    setDone(r)
  }

  const preview = (
    <div className="rounded-2xl border border-line bg-bg/60 p-3.5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-dim">{t('host.preview.slug')}</p>
      <p dir="ltr" className="mt-1.5 truncate font-mono text-[13.5px] font-semibold">
        https://
        <span className={slug ? 'text-brand' : 'text-dim line-through'}>{slug || t('host.preview.needName')}</span>.{sites.root}
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{slug ? t('host.preview.free') : t('host.preview.empty')}</p>
    </div>
  )

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1200px] py-14">
        <Head
          as="h1"
          kicker={t('host.kicker')}
          title={t('host.title')}
          sub={t('host.sub')}
          right={
            <Pill tone="brand">
              <Icon n="globe" className="size-3.5" />
              {t('host.live')}
            </Pill>
          }
        />

        {mine.length ? (
          <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/35 bg-brand/[0.06] px-4 py-3">
            <Icon n="bolt" className="size-4 shrink-0 text-brand" fill />
            <span className="min-w-0 text-[13px] font-semibold">
              {t('host.hasSites')}{' '}
              {mine.slice(0, 3).map((x, i) => (
                <span key={x.slug}>
                  {i ? '، ' : ''}
                  <Link to={`/studio?site=${encodeURIComponent(x.slug)}`} dir="ltr" className="font-mono text-brand hover:underline">
                    {x.slug}.{sites.root}
                  </Link>
                </span>
              ))}
            </span>
            <Btn to="/studio" size="sm" variant="outline" className="ms-auto">
              {t('host.toStudio')}
              <Icon n="arrow" className="size-3.5" />
            </Btn>
          </div>
        ) : null}

        {/* الخطة: ما في البطاقة هو ما في الكود، حرفيًا */}
        <div className="mt-9 grid gap-4 lg:grid-cols-2">
          {[PLANS.free, PLANS.pro].map((p) => {
            const pro = p.id === 'pro'
            return (
              <div key={p.id} className={`rounded-3xl border p-5 ${pro ? 'border-brand/45 bg-brand/[0.05]' : 'border-line bg-panel'}`}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-display text-[19px] font-extrabold">
                      {L(p.name)}
                      {pro ? <Icon n="crown" className="size-4 text-brand" fill sw={0} /> : null}
                    </p>
                    <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-dim">{L(p.note)}</p>
                    {pro ? <p className="mt-1.5 text-[11.5px] font-semibold text-brand">{t('host.managedOptional')}</p> : null}
                  </div>
                  <p className="text-end">
                    {p.price ? <Money v={p.price} size="text-2xl" /> : <span className="text-2xl font-extrabold">{t('host.priceFree')}</span>}
                    <span className="block text-[11px] font-semibold text-dim">{pro ? t('host.perMonth') : t('host.forever')}</span>
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 text-[13px]">
                  {(pro
                    ? ['host.plan.pro.f1', 'host.plan.pro.f2', 'host.plan.pro.f3', 'host.plan.pro.f4']
                    : ['host.plan.free.f1', 'host.plan.free.f2', 'host.plan.free.f3']
                  ).map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-brand" sw={2.8} />
                      <span className="min-w-0">{k.includes('free.f2') ? t(k, { n: String(p.editQuota) }) : t(k)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={claim} id="host-form" className="rounded-3xl border border-line bg-panel p-5 sm:p-7">
            <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
              <Icon n="shield" className="mt-px size-4 shrink-0 text-brand" />
              <span>{t('host.form.note')}</span>
            </p>

            <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f.k} className={`block ${f.wide ? 'sm:col-span-2' : ''}`}>
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">
                    {t(f.key)}
                    {f.req ? (
                      <span className="ms-1 text-danger">*</span>
                    ) : (
                      <span className="ms-1 normal-case opacity-70">({t('host.optional')})</span>
                    )}
                  </span>
                  {f.multiline ? (
                    <textarea
                      id={`ho-${f.k}`}
                      name={f.k}
                      rows={3}
                      maxLength={HOST_LIMITS[f.k]}
                      value={draft[f.k]}
                      placeholder={lang === 'ar' ? f.ph : f.phEn}
                      onChange={(e) => set(f.k, e.target.value)}
                      className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-[13.5px] leading-relaxed outline-none transition focus:border-brand/60"
                    />
                  ) : (
                    <input
                      id={`ho-${f.k}`}
                      name={f.k}
                      type={f.type || 'text'}
                      dir={f.dir}
                      autoComplete={f.auto}
                      required={f.req}
                      maxLength={HOST_LIMITS[f.k]}
                      value={draft[f.k]}
                      placeholder={lang === 'ar' ? f.ph : f.phEn}
                      onChange={(e) => set(f.k, e.target.value)}
                      className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none transition focus:border-brand/60"
                    />
                  )}
                </label>
              ))}

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t('host.pick.label')}</span>
                <select
                  id="ho-template"
                  name="template"
                  value={draft.template}
                  onChange={(e) => set('template', e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-brand/60"
                >
                  {HOSTABLE.map((x) => (
                    <option key={x.id} value={x.id}>
                      {(TYPE_LABEL[x.type] ? L({ ar: TYPE_LABEL[x.type].ar, en: TYPE_LABEL[x.type].en }) : '') + ' · '}
                      {L(x.name)}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 block text-[11.5px] leading-relaxed text-dim">
                  {t('host.pick.sub', { n: HOSTABLE.length })}
                  <Link to="/templates" className="ms-1 font-bold text-brand hover:underline">
                    {t('host.pick.browse')}
                  </Link>
                </span>
              </label>
            </div>

            {dropped.length ? (
              <p role="alert" className="mt-3 flex items-start gap-1.5 text-[11.5px] font-semibold text-danger">
                <Icon n="close" className="mt-px size-3.5 shrink-0" sw={2.6} />
                {t('host.dropped', { f: dropped.join('، ') })}
              </p>
            ) : null}
            {err ? (
              <p role="alert" className="mt-3 flex items-start gap-1.5 text-[12px] font-semibold text-danger">
                <Icon n="close" className="mt-px size-3.5 shrink-0" sw={2.6} />
                {err}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Btn type="submit" size="lg" disabled={busy}>
                <Icon n="rocket" className="size-4" />
                {busy ? t('host.busy') : t('host.submitGo')}
              </Btn>
              <span className="text-[11.5px] leading-relaxed text-dim">{t('host.submit.sub')}</span>
            </div>
          </form>

          <div className="space-y-4">
            {preview}
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="flex items-center gap-2 font-display text-[14.5px] font-extrabold">
                <Icon n="monitor" className="size-4 text-brand" />
                {t('host.preview.tpl')}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{t('host.preview.tplSub', { name: L(chosen.name) })}</p>
              <Link
                to={`/template/${chosen.slug}`}
                className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline"
              >
                {t('host.preview.see')}
                <Icon n="arrow" className="size-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-line bg-bg/60 p-4">
              <p className="font-display text-[14.5px] font-extrabold">{t('host.mode.title')}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{sites.mode === 'rest' ? t('host.mode.rest') : t('host.mode.local')}</p>
            </div>
          </div>
        </div>

        {/* صدق الصفحة: ما لا يفعه شيء نقوله صراحةً */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {['host.honest.1', 'host.honest.2', 'host.honest.3', 'host.honest.4'].map((k) => (
            <p key={k} className="flex items-start gap-2 rounded-2xl border border-line bg-panel/70 p-4 text-[12.5px] leading-relaxed text-dim">
              <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-brand" sw={2.8} />
              <span className="min-w-0">{t(k)}</span>
            </p>
          ))}
        </div>

        {done ? (
          <div
            id="host-done"
            className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 sm:place-items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="host-done-t"
          >
            <div className="thin-bar max-h-[86vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-panel p-5 sm:max-w-lg sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3">
                <p id="host-done-t" className="flex items-center gap-2 font-display text-[18px] font-extrabold">
                  <Icon n="check" className="size-4 text-brand" sw={2.8} />
                  {t('host.done.title')}
                </p>
                <button
                  type="button"
                  onClick={() => setDone(null)}
                  aria-label={t('nav.close')}
                  className="rounded-lg p-1.5 text-dim hover:bg-panel2 hover:text-ink"
                >
                  <Icon n="close" className="size-4" sw={2.4} />
                </button>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-dim">{t('host.done.sub', { url: done.url })}</p>
              <div className="mt-4 space-y-3">
                <Row label={t('host.done.url')} value={done.url} href={done.url} copy={t('host.copyLink')} />
                <Row label={t('host.done.key')} value={done.editKey} keyLine secret />
                <Row
                  label={t('host.done.plan')}
                  value={`${L(PLANS[done.plan].name)} · ${done.quota.left}/${done.quota.max} ${t('host.done.left')}`}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Btn to={`/studio?site=${encodeURIComponent(done.slug)}`} size="md">
                  <Icon n="pen" className="size-4" />
                  {t('host.done.edit')}
                </Btn>
                <Btn href={done.url} target="_blank" rel="noopener" variant="outline" size="md">
                  <Icon n="globe" className="size-4" />
                  {t('host.done.open')}
                </Btn>
                <Btn variant="ghost" size="md" onClick={() => setDone(null)}>
                  {t('host.done.later')}
                </Btn>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** سطر القيمة مع نسخٍ حقيقي إلى الحافظة، وبلا وعود بمسح أو باستعادة */
function Row({ label, value, href, keyLine, secret, copy }) {
  const { t } = useI18n()
  const [got, setGot] = useState('')
  const grab = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setGot(t('host.copied'))
    } catch {
      setGot(t('host.copyFail'))
    }
  }
  return (
    <div className="rounded-xl border border-line bg-bg/70 p-3">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-dim">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code
          dir="ltr"
          className={`min-w-0 flex-1 truncate font-mono ${keyLine ? 'text-[12px]' : 'text-[13px]'} ${secret ? 'font-semibold text-brand' : ''}`}
        >
          {value}
        </code>
        {href ? (
          <a href={href} target="_blank" rel="noopener" className="shrink-0 text-[12px] font-bold text-brand hover:underline">
            {t('host.open')}
          </a>
        ) : (
          <button type="button" onClick={grab} className="shrink-0 text-[12px] font-bold text-brand hover:underline">
            {copy || t('host.copy')}
          </button>
        )}
      </div>
      <p aria-live="polite" className="mt-1 min-h-[14px] text-[11px] leading-tight text-dim">
        {got || (secret ? t('host.keyWarning') : '')}
      </p>
    </div>
  )
}
