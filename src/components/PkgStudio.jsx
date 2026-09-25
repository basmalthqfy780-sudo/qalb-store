import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { kindOf, packageFiles } from '../data/deliverable'
import {
  CUSTOM_LIMITS,
  blankDraft,
  blankStat,
  draftCtx,
  exportZip,
  imageSlots,
  localOrders,
  ownedTemplates,
  packagePreviewPaths,
  readDraft,
  sanitizeImage,
  saveDraft,
  sectionsOf,
  verifyPurchase,
} from '../data/pkgstudio'
import { byId } from '../data/templates'
import { saveZip } from '../lib/download'
import { Btn, Head, Icon, Pill } from './ui'

/**
 * استوديو تخصيص القالب داخل /studio — لمشترين تحقّقنا من طلبه بمفتاحه.
 *
 * كل حرفٍ يُكتب في المحرّر يُرى فورًا في الصفحة الحيّة (نفس مولّدات الحزمة لا
 * رسمٌ تجميلي)، وكل رفعٍ للصورة يصير ملفًا في `assets/img/` داخل الـZIP، وكل
 * إخفاء/ترتيب للأقسام يُطبَّق في الملفّات النهائية نفسها. زرُّ التصدير يبني
 * الحزمة هنا بالمتصفح — بنصوصك وصورك مطبوعة — ويُنزّلها باسم طلبك.
 */
const FIELDS = [
  { k: 'name', key: 'personal.name', wide: true },
  { k: 'role', key: 'personal.role' },
  { k: 'city', key: 'host.field.city' },
  { k: 'email', key: 'personal.email', type: 'email', dir: 'ltr' },
  { k: 'phone', key: 'personal.phone', dir: 'ltr', mode: 'tel' },
  { k: 'website', key: 'personal.site', dir: 'ltr', mode: 'url' },
  { k: 'bio', key: 'personal.bio', wide: true, multiline: true },
]
const CAP = { name: 80, role: 90, city: 60, email: 160, phone: 40, website: 160, bio: 700 }
const SEC_LABEL = {
  work: 'studio.pkg.sec.work',
  about: 'studio.pkg.sec.about',
  services: 'studio.pkg.sec.services',
  contact: 'studio.pkg.sec.contact',
  summary: 'studio.pkg.sec.summary',
  experience: 'studio.pkg.sec.experience',
  skills: 'studio.pkg.sec.skills',
  education: 'studio.pkg.sec.education',
  languages: 'studio.pkg.sec.languages',
}

export default function PkgStudio() {
  const { t, L } = useI18n()
  const [params] = useSearchParams()
  const [stage, setStage] = useState('gate')
  const [oid, setOid] = useState(() => params.get('order') || '')
  const [key, setKey] = useState(() => params.get('key') || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [order, setOrder] = useState(null)
  const [tplId, setTplId] = useState('')
  const [draft, setDraft] = useState(blankDraft)
  const [view, setView] = useState('site')
  const [note, setNote] = useState(null)
  const [imgErr, setImgErr] = useState(null)

  const tpl = tplId ? byId(tplId) : null
  const owned = useMemo(() => (order ? ownedTemplates(order) : []), [order])
  const k = tpl ? kindOf(tpl) : 'site'

  async function activateWith(wantId, wantKey) {
    setBusy(true)
    setErr(null)
    const r = await verifyPurchase(wantId, wantKey)
    setBusy(false)
    if (!r.ok) {
      setErr(r.why)
      return
    }
    const list = ownedTemplates(r.order)
    if (!list.length) {
      setErr('empty')
      return
    }
    const want = params.get('tpl') && list.some((x) => x.id === params.get('tpl')) ? params.get('tpl') : list[0].id
    setOrder(r.order)
    setTplId(want)
    setDraft(readDraft(r.order.id, byId(want)))
    setView(kindOf(byId(want)) === 'cv' ? 'sheet' : 'site')
    setStage('work')
  }

  const activate = (e) => {
    if (e) e.preventDefault()
    return activateWith(oid, key)
  }

  // تفعيلٌ تلقائي من رابط الإيصال: /studio?tab=pkg&order=…&key=…&tpl=…
  useEffect(() => {
    const o = params.get('order')
    const k = params.get('key')
    if (!o || !k || stage !== 'gate') return undefined
    const timer = setTimeout(() => activateWith(o, k), 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // كل تعديلٍ يُحفَظ في الحال — فالاستوديو يُستأنف من حيث توقّف
  useEffect(() => {
    if (stage === 'work' && order && tpl) saveDraft(order.id, tpl, draft)
  }, [stage, order, tpl, draft])

  const page = useMemo(() => {
    if (!tpl || !order) return null
    const want = view === 'sheet' && k !== 'site' ? 'resume.html' : 'index.html'
    if (want === 'index.html' && k === 'cv') return null
    let files
    try {
      files = packageFiles(tpl, draftCtx(order, draft))
    } catch {
      return null
    }
    const hit = files.find((f) => f.path === want)
    if (!hit) return null
    let html = hit.body
      .replace(/<link rel="stylesheet" href="[^"]*styles\.css"\s*\/?>/i, '')
      .replace(/<script src="(?:\.\/)?assets\/content\.js"[^>]*>\s*<\/script>/i, '')
      .replace(/<head>/i, '<head><base target="_blank" />')
    for (const im of draft.custom.images || []) html = html.split(`src="./${im.path}"`).join(`src="${im.dataUrl}"`)
    return { html, file: want }
  }, [tpl, order, draft, view, k])

  const setP = (kk, v) => setDraft((d) => ({ ...d, personal: { ...d.personal, [kk]: v } }))
  const setC = (kk, v) => setDraft((d) => ({ ...d, custom: { ...d.custom, [kk]: v } }))
  const toggleSec = (id) =>
    setDraft((d) => ({
      ...d,
      custom: {
        ...d.custom,
        hidden: d.custom.hidden.includes(id) ? d.custom.hidden.filter((x) => x !== id) : [...d.custom.hidden, id],
      },
    }))
  const moveSec = (id, dir) =>
    setDraft((d) => {
      const seq = [...(d.custom.order.length ? d.custom.order : sectionsOf(tpl))]
      const i = seq.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= seq.length) return d
      ;[seq[i], seq[j]] = [seq[j], seq[i]]
      return { ...d, custom: { ...d.custom, order: seq } }
    })

  function upload(slot, file) {
    setImgErr(null)
    if (!file) return
    const r = new FileReader()
    r.onload = () => {
      const hit = sanitizeImage(slot, String(r.result || ''))
      if (!hit) {
        setImgErr(t('studio.pkg.images.rejected'))
        return
      }
      setDraft((d) => ({
        ...d,
        custom: { ...d.custom, images: [...d.custom.images.filter((im) => im.slot !== slot), { slot: hit.slot, dataUrl: hit.dataUrl }] },
      }))
    }
    r.onerror = () => setImgErr(t('studio.pkg.images.rejected'))
    r.readAsDataURL(file)
  }

  function doExport() {
    if (!tpl || !order) return
    const out = exportZip(tpl, order, draft)
    saveZip(out.name, out.bytes)
    setNote({ tone: 'ok', text: t('studio.pkg.export.done', { f: out.name }) })
  }

  /* ------------------------------ بوابة التوثيق ------------------------------ */
  if (stage === 'gate') {
    const known = localOrders()
    return (
      <div className="mx-auto max-w-[760px] py-10">
        <Head kicker={t('studio.pkg.kicker')} title={t('studio.pkg.title')} sub={t('studio.pkg.sub')} />
        <form onSubmit={activate} className="mt-7 rounded-3xl border border-line bg-panel p-5" data-pkg-gate>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t('studio.pkg.gate.order')}</span>
              <input
                id="pk-order"
                value={oid}
                dir="ltr"
                autoComplete="off"
                spellCheck="false"
                onChange={(e) => setOid(e.target.value)}
                placeholder="QALB-…"
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 font-mono text-[13px] outline-none focus:border-brand/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t('studio.pkg.gate.key')}</span>
              <input
                id="pk-key"
                value={key}
                dir="ltr"
                autoComplete="off"
                spellCheck="false"
                onChange={(e) => setKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 font-mono text-[13px] outline-none focus:border-brand/60"
              />
            </label>
          </div>
          {err ? (
            <p role="alert" className="mt-3 rounded-xl border border-danger/40 bg-danger/[0.07] px-3 py-2 text-[12.5px] font-semibold">
              {err === 'missing'
                ? t('studio.pkg.gate.miss')
                : err === 'bad-key'
                  ? t('studio.pkg.gate.bad')
                  : err === 'empty'
                    ? t('studio.pkg.gate.none')
                    : t('studio.pkg.gate.offline')}
            </p>
          ) : null}
          <Btn type="submit" size="md" className="mt-4" disabled={busy}>
            <Icon n="check" className="size-4" sw={2.8} />
            {busy ? t('studio.busy') : t('studio.pkg.gate.go')}
          </Btn>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('studio.pkg.gate.warn')}</p>
        </form>
        {known.length ? (
          <div className="mt-6 rounded-3xl border border-line bg-panel/70 p-5" data-pkg-known>
            <p className="text-[12.5px] font-extrabold">{t('studio.pkg.gate.known')}</p>
            <ul className="mt-2.5 grid gap-2">
              {known.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    data-pkg-known-open
                    onClick={() => {
                      setOid(o.id)
                      setKey(o.key)
                      activateWith(o.id, o.key)
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-bg/60 px-3 py-2 text-start transition hover:border-brand/50"
                  >
                    <code dir="ltr" className="truncate font-mono text-[12.5px] font-semibold">
                      {o.id}
                    </code>
                    <span className="shrink-0 text-[11.5px] font-bold text-brand">{t('studio.pkg.gate.go')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }

  /* ------------------------------ مساحة العمل ------------------------------ */
  const seq = draft.custom.order.length ? draft.custom.order : sectionsOf(tpl)
  const slots = imageSlots(tpl)
  const imgOf = (slot) => (draft.custom.images || []).find((im) => im.slot === slot) || null
  const paths = packagePreviewPaths(tpl, draft)

  return (
    <div className="mx-auto max-w-[1400px] py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Head kicker={t('studio.pkg.kicker')} title={L(tpl.name)} sub={t('studio.pkg.for', { o: order.id })} />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Btn variant="outline" size="sm" onClick={() => setStage('gate')}>
            <Icon n="arrow" className="size-3.5 rotate-180" />
            {t('studio.pkg.gate.change')}
          </Btn>
          <Btn size="sm" onClick={doExport} data-pkg-export>
            <Icon n="file" className="size-3.5" />
            {t('studio.pkg.export.go')}
          </Btn>
        </div>
      </div>

      {owned.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2" data-pkg-tpls>
          {owned.map((x) => (
            <button
              key={x.id}
              type="button"
              data-pkg-tpl={x.id}
              aria-pressed={x.id === tplId}
              onClick={() => {
                setTplId(x.id)
                setDraft(readDraft(order.id, x))
                setView(kindOf(x) === 'cv' ? 'sheet' : 'site')
              }}
              className={`h-9 rounded-xl border px-3 text-[12.5px] font-bold transition ${x.id === tplId ? 'border-brand/55 bg-brand/10 text-ink' : 'border-line bg-bg text-dim hover:border-brand/40'}`}
            >
              {L(x.name)}
            </button>
          ))}
        </div>
      ) : null}

      {note ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/[0.06] px-3 py-2 text-[12.5px] leading-relaxed"
        >
          <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-brand" sw={2.8} />
          <span className="min-w-0">{note.text}</span>
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        {/* المحرّر */}
        <div className="rounded-3xl border border-line bg-panel p-5">
          <p className="flex items-center gap-2 font-display text-[15.5px] font-extrabold">
            <Icon n="pen" className="size-4 text-brand" />
            {t('studio.pkg.editor')}
          </p>

          <div className="mt-4 grid gap-3.5 sm:grid-cols-2" data-pkg-fields>
            {FIELDS.map((f) => (
              <label key={f.k} className={`block ${f.wide ? 'sm:col-span-2' : ''}`}>
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t(f.key)}</span>
                {f.multiline ? (
                  <textarea
                    id={`pk-${f.k}`}
                    rows={3}
                    maxLength={CAP[f.k]}
                    value={draft.personal[f.k] || ''}
                    onChange={(e) => setP(f.k, e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-[13.5px] leading-relaxed outline-none focus:border-brand/60"
                  />
                ) : (
                  <input
                    id={`pk-${f.k}`}
                    type={f.type || 'text'}
                    inputMode={f.mode}
                    dir={f.dir}
                    maxLength={CAP[f.k]}
                    value={draft.personal[f.k] || ''}
                    onChange={(e) => setP(f.k, e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-brand/60"
                  />
                )}
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t('studio.pkg.city2')}</span>
              <input
                id="pk-city"
                maxLength={CUSTOM_LIMITS.city}
                value={draft.custom.city || ''}
                onChange={(e) => setC('city', e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-brand/60"
              />
            </label>
          </div>

          {/* الأرقام */}
          <section className="mt-5 border-t border-line pt-4" data-pkg-stats>
            <p className="flex items-center justify-between gap-2 text-[13.5px] font-extrabold">
              {t('studio.pkg.stats.title')}
              <Btn variant="outline" size="sm" onClick={() => setC('stats', [...draft.custom.stats, blankStat()])} data-pkg-stat-add>
                {t('studio.pkg.stats.add')}
              </Btn>
            </p>
            <ul className="mt-2.5 grid gap-2">
              {draft.custom.stats.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    id={`pk-stat-${i}-v`}
                    maxLength={CUSTOM_LIMITS.statValue}
                    value={s.v}
                    onChange={(e) =>
                      setC(
                        'stats',
                        draft.custom.stats.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)),
                      )
                    }
                    placeholder={t('studio.pkg.stats.value')}
                    className="h-9 w-28 rounded-xl border border-line bg-bg px-2.5 text-[13px] outline-none focus:border-brand/60"
                  />
                  <input
                    id={`pk-stat-${i}-l`}
                    maxLength={CUSTOM_LIMITS.statLabel}
                    value={s.en}
                    onChange={(e) =>
                      setC(
                        'stats',
                        draft.custom.stats.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)),
                      )
                    }
                    placeholder={t('studio.pkg.stats.label')}
                    className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-bg px-2.5 text-[13px] outline-none focus:border-brand/60"
                  />
                  <button
                    type="button"
                    aria-label={t('studio.pkg.stats.drop')}
                    data-pkg-stat-drop={i}
                    onClick={() =>
                      setC(
                        'stats',
                        draft.custom.stats.filter((_, j) => j !== i),
                      )
                    }
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-dim transition hover:border-danger/50 hover:text-danger"
                  >
                    <Icon n="close" className="size-3.5" sw={2.6} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* الأقسام */}
          <section className="mt-5 border-t border-line pt-4" data-pkg-sections>
            <p className="text-[13.5px] font-extrabold">{t('studio.pkg.sections.title')}</p>
            <ul className="mt-2.5 grid gap-2">
              {seq.map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2" data-pkg-sec-row={id}>
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-bold">
                    <input
                      id={`pk-sec-${id}`}
                      type="checkbox"
                      checked={!draft.custom.hidden.includes(id)}
                      onChange={() => toggleSec(id)}
                      data-pkg-sec={id}
                      className="size-4 accent-[var(--c-brand,#2f6df6)]"
                    />
                    <span className="truncate">{t(SEC_LABEL[id] || id)}</span>
                  </label>
                  <button
                    type="button"
                    aria-label="up"
                    data-pkg-sec-up={id}
                    onClick={() => moveSec(id, -1)}
                    className="grid size-7 place-items-center rounded-lg border border-line text-dim hover:text-ink"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="down"
                    data-pkg-sec-down={id}
                    onClick={() => moveSec(id, 1)}
                    className="grid size-7 place-items-center rounded-lg border border-line text-dim hover:text-ink"
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* الصور */}
          {slots.length ? (
            <section className="mt-5 border-t border-line pt-4" data-pkg-images>
              <p className="text-[13.5px] font-extrabold">{t('studio.pkg.images.title')}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{t('studio.pkg.images.hint')}</p>
              {imgErr ? (
                <p role="alert" className="mt-2 rounded-xl border border-danger/40 bg-danger/[0.07] px-3 py-2 text-[12px] font-semibold">
                  {imgErr}
                </p>
              ) : null}
              <ul className="mt-2.5 grid gap-2">
                {slots.map(({ slot, label }) => {
                  const hit = imgOf(slot)
                  return (
                    <li key={slot} className="flex items-center gap-3 rounded-xl border border-line bg-bg/60 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
                        {slot === 'avatar' ? t('studio.pkg.images.avatar') : t('studio.pkg.images.project', { n: label.split('-')[1] })}
                      </span>
                      {hit ? <img src={hit.dataUrl} alt="" className="size-9 rounded-lg object-cover" data-pkg-thumb={slot} /> : null}
                      <input
                        id={`pk-img-${label}`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        aria-label={t('studio.pkg.images.upload')}
                        onChange={(e) => upload(slot, e.target.files && e.target.files[0])}
                        className="max-w-[150px] text-[11px]"
                      />
                      {hit ? (
                        <button
                          type="button"
                          aria-label={t('studio.pkg.images.clear')}
                          data-pkg-img-clear={slot}
                          onClick={() =>
                            setC(
                              'images',
                              draft.custom.images.filter((im) => im.slot !== slot),
                            )
                          }
                          className="grid size-7 shrink-0 place-items-center rounded-lg border border-line text-dim transition hover:border-danger/50 hover:text-danger"
                        >
                          <Icon n="close" className="size-3.5" sw={2.6} />
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
            <Btn size="md" onClick={doExport} data-pkg-export-2>
              <Icon n="file" className="size-4" />
              {t('studio.pkg.export.go')}
            </Btn>
            <Btn size="md" variant="outline" onClick={() => setDraft(blankDraft())} data-pkg-reset>
              <Icon n="refresh" className="size-4" />
              {t('studio.pkg.reset')}
            </Btn>
            <span className="text-[11.5px] text-dim">{t('studio.pkg.export.note')}</span>
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-dim" dir="ltr" data-pkg-paths>
            {paths.join(' · ')}
          </p>
        </div>

        {/* المعاينة الحيّة */}
        <div className="lg:sticky lg:top-[92px]">
          <div className="overflow-hidden rounded-3xl border border-line bg-panel">
            <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">
              {[
                { v: 'site', ic: 'monitor', label: 'studio.view.site' },
                { v: 'sheet', ic: 'file', label: 'studio.view.sheet' },
              ]
                .filter((x) => x.v !== 'sheet' || k !== 'site')
                .map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    aria-pressed={view === x.v}
                    data-pkg-view={x.v}
                    onClick={() => setView(x.v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition ${view === x.v ? 'bg-brand/12 text-ink' : 'text-dim hover:bg-panel2'}`}
                  >
                    <Icon n={x.ic} className="size-3.5" />
                    {t(x.label)}
                  </button>
                ))}
              <Pill tone="brand" className="ms-auto">
                {t('studio.pkg.live')}
              </Pill>
            </div>
            {page ? (
              <iframe title={t('studio.pkg.previewTitle')} sandbox="" srcDoc={page.html} className="h-[440px] w-full bg-bg" data-pkg-frame />
            ) : (
              <div className="grid h-[440px] place-items-center text-[12.5px] text-dim">{t('studio.loading')}</div>
            )}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{t('studio.pkg.previewNote')}</p>
        </div>
      </div>
    </div>
  )
}
