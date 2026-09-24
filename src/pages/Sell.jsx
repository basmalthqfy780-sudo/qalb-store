import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dec, useI18n, num } from '../i18n'
import { useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill } from '../components/ui'
import { account } from '../api/account'
import { market } from '../api/market'
import { hashImage } from '../data/phash'
import { BANDS, LAYERS, PIPELINE_VERSION, VERDICTS, appealsLayer, reportText } from '../data/inspect'
import {
  CATEGORIES,
  COMMISSION,
  ESCROW_DAYS,
  LICENCE,
  MIN_PAYOUT,
  PRICE_MAX,
  PRICE_MIN,
  listingErrors,
  payoutState,
  sanitizeListing,
  split,
} from '../data/marketplace'
import { canSell } from '../data/marketplace'
import { PLANS } from '../data/plans'

/**
 * لوحة البائع — سوق المصممين من جهة من يبيع.
 *
 * ما يحدث فعلًا هنا:
 *   • **التقسيم يُحسب قبل البيع**: كل تغيير في السعر يعيد `split()` فيظهر
 *     للبائع نصيبه قبل أن يرفع، كما ينصّ النموذج.
 *   • **خط الفحص يُشغَّل لحظة الرفع** من src/data/inspect.js — الوحدة نفسها
 *     التي يستوردها الخادم — وتُعرض الطبقات الأربع بدرجة الخطر والمخالفات
 *     وسبب كل مخالفة، لا «قيد المراجعة» بلا سبب.
 *   • **الحالة تُشتق من القرار**: `stateFromVerdict` وحدها تكتب «منشور»، فلا
 *     زرّ هنا ينشر إدراجًا مرفوضًا.
 *   • **المستحقات** تُحسب من مدة التأمين (14 يومًا) والحد الأدنى (100):
 *     ما تحرّر وما انتظر، وكم ينقص.
 *
 * وما لا يحدث: لا قبض. لا بوابة دفع موصولة، فالبيع يُسجَّل وتبقى الواجهة
 * تقول ذلك.
 */

/** بصمات الصور: تُحسب في المتصفح، ويُقال صراحة إن لم يعمل قارئ الصور */
function ImageHasher({ images, onAdd }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [why, setWhy] = useState('')

  async function pick(e) {
    const files = [...(e.target.files || [])].slice(0, 6)
    if (!files.length) return
    setBusy(true)
    const out = []
    for (const f of files) out.push(await hashImage(f))
    setBusy(false)
    setWhy(out.every((o) => o.source === 'unavailable') ? out[0]?.reason || 'unavailable' : '')
    onAdd(out)
    e.target.value = ''
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/50 p-4">
      <p className="text-[13px] font-bold">{t('sell.imgTitle')}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('sell.imgSub')}</p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2 text-[12.5px] font-bold">
        <Icon n="plus" className="size-3.5" />
        {busy ? t('sell.imgBusy') : t('sell.imgPick')}
        <input type="file" accept="image/*" multiple className="sr-only" onChange={pick} disabled={busy} />
      </label>
      {why ? <p className="num mt-2 text-[11.5px] font-semibold text-gold">{t('sell.imgSkipped', { r: why })}</p> : null}
      {images.length ? (
        <ul className="mt-3 space-y-1.5">
          {images.map((i, k) => (
            <li key={k} className="num flex items-center justify-between gap-2 rounded-lg border border-line bg-panel/60 px-2.5 py-1.5 text-[11px]">
              <span className="truncate font-bold">{i.name}</span>
              <span className="truncate text-dim">{i.a || i.phash ? `${i.a || i.phash} · ${i.source}` : t('sell.imgNoHash')}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** ملف واحد في الحزمة: اسم + محتوى — وهو ما يفحصه الخط فعلًا */
function FileRow({ f, i, onChange, onRemove }) {
  const { t } = useI18n()
  return (
    <div className="rounded-2xl border border-line bg-bg/50 p-3">
      <div className="flex items-center gap-2">
        <input
          aria-label={t('sell.filePath', { n: i + 1 })}
          dir="ltr"
          value={f.path}
          onChange={(e) => onChange({ ...f, path: e.target.value })}
          placeholder="index.html"
          className="num h-9 flex-1 rounded-lg border border-line bg-panel px-2.5 text-[12px] outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('sell.fileRemove', { n: i + 1 })}
          className="grid size-9 place-items-center rounded-lg border border-line text-dim hover:text-[#ff8080]"
        >
          <Icon n="trash" className="size-3.5" />
        </button>
      </div>
      <textarea
        aria-label={t('sell.fileBody', { n: i + 1 })}
        dir="ltr"
        rows={4}
        value={f.body}
        onChange={(e) => onChange({ ...f, body: e.target.value })}
        className="num mt-2 w-full rounded-lg border border-line bg-panel p-2.5 text-[11.5px] leading-relaxed outline-none focus:border-brand"
      />
    </div>
  )
}

/** تقرير الفحص — الطبقات والدرجة والقرار، كما يرجعها الخط */
function Report({ report, lang }) {
  const { t, L } = useI18n()
  if (!report) return null
  const tone =
    report.verdict === 'accept'
      ? 'text-[#3ecf8e] border-[#3ecf8e]/35 bg-[#3ecf8e]/10'
      : report.verdict === 'quarantine'
        ? 'text-gold border-gold/35 bg-gold/10'
        : 'text-[#ff8080] border-[#ff8080]/35 bg-[#ff8080]/10'
  return (
    <div data-report className="rounded-3xl border border-line bg-panel/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-extrabold">{t('sell.reportTitle')}</p>
        <span className={`num rounded-xl border px-3 py-1.5 text-[13px] font-black ${tone}`}>
          {report.score}/100 · {report.verdict}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-dim">{L(VERDICTS[report.verdict])}</p>

      {/* الطبقات: ماذا فُحص وماذا وُجد — لا «تم الفحص» مبهمة */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { k: 'tech', d: t('sell.layerTech', { n: report.layers.tech.scanned, v: report.layers.tech.violations }) },
          { k: 'visual', d: t('sell.layerVisual', { n: report.layers.visual.scanned, v: report.layers.visual.violations }) },
          { k: 'policy', d: t('sell.layerPolicy', { v: report.layers.policy.violations }) },
        ].map((x) => (
          <li key={x.k} className="rounded-xl border border-line bg-bg/60 px-3 py-2.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-dim">{t(`sell.layer.${x.k}`)}</span>
            <span className="mt-0.5 block text-[12px] font-semibold">{x.d}</span>
          </li>
        ))}
      </ul>

      {report.layers.visual.referenceMissing ? (
        <p className="mt-3 rounded-xl border border-gold/30 bg-gold/8 px-3 py-2 text-[11.5px] font-semibold text-gold">{t('sell.noReference')}</p>
      ) : null}

      {report.reasons.length ? (
        <ul className="mt-4 space-y-2">
          {report.reasons.map((r, i) => (
            <li key={i} className="rounded-xl border border-line bg-bg/50 px-3 py-2.5">
              <span className="flex items-center gap-2">
                <Pill tone={r.level === 'block' ? 'gold' : 'line'}>{r.layer}</Pill>
                <span className="num text-[12px] font-bold">{r.rule}</span>
                <span className="num ms-auto text-[11px] text-dim">+{r.weight}</span>
              </span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-ink/80">{L(r.why)}</span>
              {r.path ? <span className="num mt-0.5 block truncate text-[11px] text-dim">{r.path}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-[#3ecf8e]/30 bg-[#3ecf8e]/8 px-3 py-2 text-[12.5px] font-semibold text-[#3ecf8e]">
          {t('sell.clean')}
        </p>
      )}

      <details className="mt-4 rounded-xl border border-line bg-bg/50 px-3 py-2">
        <summary className="cursor-pointer text-[12px] font-bold text-dim">{t('sell.rawJson')}</summary>
        <pre dir="ltr" className="num mt-2 max-h-64 overflow-auto text-[10.5px] leading-relaxed text-dim">
          {JSON.stringify(report, null, 2)}
        </pre>
      </details>
      <p className="num mt-2 text-[11px] text-dim">{t('sell.pipelineVersion', { v: PIPELINE_VERSION, lang, layers: LAYERS.length })}</p>
    </div>
  )
}

export default function Sell() {
  const { t, lang, L } = useI18n()
  const [rec] = useState(() => account.local())
  const [nonce, setNonce] = useState(0) // إعادة القراءة بعد كل فعل: الأثر يعتمد عليه، لا يُنادى setState في جسمه
  const [draft, setDraft] = useState({
    title: '',
    desc: '',
    category: 'portfolio',
    price: 149,
    tags: '',
    rights: false,
    files: [{ path: 'index.html', body: '' }],
    images: [],
  })
  const [mine, setMine] = useState([])
  const [sales, setSales] = useState([])
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [appealFor, setAppealFor] = useState(null)
  const [appealText, setAppealText] = useState('')

  useSeo(`${t('sell.seoTitle')} · ${t('brand.name')}`, t('sell.seoDesc'), { robots: 'noindex' })

  const allowed = rec ? canSell(rec.plan) : false
  const clean = useMemo(
    () =>
      sanitizeListing({
        ...draft,
        tags: String(draft.tags || '')
          .split(/[,\s]+/)
          .filter(Boolean),
      }),
    [draft],
  )
  const errs = useMemo(() => listingErrors(clean), [clean])
  const parts = useMemo(() => split(draft.price), [draft.price])
  const payout = useMemo(() => payoutState(sales), [sales])
  const say = (tone, text) => setNote({ tone, text })

  // القراءة في أثرٍ واحد يعتمد على `nonce`: الأفعال تُزيد العدّاد فتُعاد القراءة،
  // ولا يُنادى setState داخل جسم الأثر (وهو ما تمنعه قواعد react-hooks هنا).
  useEffect(() => {
    if (!rec?.email) return
    let live = true
    Promise.all([market.mine(rec.email), market.sales(rec.email)]).then(([m, s]) => {
      if (!live) return
      setMine(m.listings || [])
      setSales(s.sales || [])
    })
    return () => {
      live = false
    }
  }, [rec, nonce])

  async function submit(e) {
    e?.preventDefault?.()
    if (Object.keys(errs).length) return say('bad', t('sell.fixFirst', { n: Object.keys(errs).length }))
    setBusy(true)
    const r = await market.submit(clean, { email: rec.email })
    setBusy(false)
    if (!r.ok) return say('bad', t('sell.submitFail'))
    setReport(r.report)
    setNonce((n) => n + 1)
    say(r.report.verdict === 'accept' ? 'good' : r.report.verdict === 'quarantine' ? 'warn' : 'bad', t(`sell.after.${r.report.verdict}`))
  }

  async function reinspect(id) {
    setBusy(true)
    const r = await market.reinspect(id, { email: rec.email })
    setBusy(false)
    if (!r.ok) return say('bad', t('sell.reinspectFail'))
    setReport(r.report)
    setNonce((n) => n + 1)
    say('good', t('sell.reinspected'))
  }

  async function appeal(id) {
    const r = await market.appeal(id, appealText, { email: rec.email })
    if (!r.ok) return say('bad', t('sell.appealFail'))
    setAppealFor(null)
    setAppealText('')
    setNonce((n) => n + 1)
    say('good', t('sell.appealOpen'))
  }

  if (!rec) {
    return (
      <div className="page-x mx-auto max-w-[720px] pb-24 pt-16">
        <Head as="h1" kicker={t('sell.kicker')} title={t('sell.needAccount')} sub={t('sell.needAccountSub')} />
        <Btn to="/create" size="lg" className="mt-6">
          {t('sell.createCta')}
        </Btn>
      </div>
    )
  }

  return (
    <div className="page-x mx-auto max-w-[1200px] pb-24 pt-12 sm:pt-14">
      <Head
        as="h1"
        kicker={t('sell.kicker')}
        title={t('sell.title')}
        sub={t('sell.sub')}
        right={
          <Pill tone={allowed ? 'brand' : 'gold'}>
            <Icon n={allowed ? 'check' : 'lock'} className="size-3" />
            {allowed ? t('sell.canSell') : t('sell.cannotSell')}
          </Pill>
        }
      />

      {note ? (
        <p
          role={note.tone === 'bad' ? 'alert' : 'status'}
          className={`mt-5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold ${
            note.tone === 'bad'
              ? 'border-[#ff8080]/35 bg-[#ff8080]/10 text-[#ff9a9a]'
              : note.tone === 'warn'
                ? 'border-gold/35 bg-gold/10 text-gold'
                : 'border-[#3ecf8e]/35 bg-[#3ecf8e]/10 text-[#3ecf8e]'
          }`}
        >
          {note.text}
        </p>
      ) : null}

      {!allowed ? (
        <section data-sell-gate className="mt-8 rounded-3xl border border-gold/40 bg-gold/8 p-6">
          <p className="flex items-center gap-2 text-[15px] font-extrabold text-gold">
            <Icon n="lock" className="size-4" />
            {t('sell.gateTitle')}
          </p>
          <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-dim">{t('sell.gateSub')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {PLANS.filter((p) => p.price > 0).map((p) => (
              <Link
                key={p.id}
                to={`/create?plan=${p.id}`}
                className="rounded-2xl border border-line bg-bg/70 px-4 py-3 transition hover:border-brand/40"
              >
                <span className="block text-[13.5px] font-extrabold">{L(p.name)}</span>
                <span className="num block text-[12px] text-dim">
                  {num(p.price)} {t('sell.perMonth')}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('sell.gateWhy')}</p>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* نموذج الإدراج */}
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-panel/60 p-5">
            <h2 className="text-[15px] font-extrabold">{t('sell.formTitle')}</h2>

            <div>
              <label htmlFor="l-title" className="text-[13px] font-bold">
                {t('sell.fTitle')}
              </label>
              <input
                id="l-title"
                value={draft.title}
                maxLength={70}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                aria-invalid={!!errs.title}
                aria-describedby="l-title-e"
                className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-4 text-[13.5px] outline-none focus:border-brand"
              />
              {errs.title ? (
                <p id="l-title-e" role="alert" className="mt-1.5 text-[11.5px] font-semibold text-gold">
                  {t('sell.eTitle')}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="l-desc" className="text-[13px] font-bold">
                {t('sell.fDesc')}
              </label>
              <textarea
                id="l-desc"
                rows={5}
                maxLength={600}
                value={draft.desc}
                onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
                aria-invalid={!!errs.desc}
                aria-describedby="l-desc-e"
                className="mt-2 w-full rounded-xl border border-line bg-bg p-3 text-[13px] leading-relaxed outline-none focus:border-brand"
              />
              <p id="l-desc-e" className="num mt-1.5 text-[11.5px] text-dim">
                {errs.desc ? t('sell.eDesc') : t('sell.descCount', { n: draft.desc.length })}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="l-price" className="text-[13px] font-bold">
                  {t('sell.fPrice')}
                </label>
                <input
                  id="l-price"
                  type="number"
                  dir="ltr"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                  aria-invalid={!!errs.price}
                  aria-describedby="l-price-e"
                  className="num mt-2 h-11 w-full rounded-xl border border-line bg-bg px-4 text-[13.5px] outline-none focus:border-brand"
                />
                <p id="l-price-e" className="num mt-1.5 text-[11.5px] text-dim">
                  {errs.price ? t('sell.ePrice') : t('sell.priceRange', { a: num(PRICE_MIN), b: num(PRICE_MAX) })}
                </p>
              </div>
              <div>
                <label htmlFor="l-cat" className="text-[13px] font-bold">
                  {t('sell.fCat')}
                </label>
                <select
                  id="l-cat"
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-brand"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`sell.cat.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="l-tags" className="text-[13px] font-bold">
                {t('sell.fTags')}
              </label>
              <input
                id="l-tags"
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-4 text-[13.5px] outline-none focus:border-brand"
              />
              <p className="mt-1.5 text-[11.5px] text-dim">{t('sell.tagsHint')}</p>
            </div>

            {/* ملفات الحزمة — ما يفحصه الخط فعلًا */}
            <div>
              <p className="text-[13px] font-bold">{t('sell.fFiles')}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('sell.filesHint')}</p>
              <div className="mt-3 space-y-3">
                {draft.files.map((f, i) => (
                  <FileRow
                    key={i}
                    f={f}
                    i={i}
                    onChange={(nf) => setDraft((d) => ({ ...d, files: d.files.map((x, k) => (k === i ? nf : x)) }))}
                    onRemove={() => setDraft((d) => ({ ...d, files: d.files.filter((_, k) => k !== i) }))}
                  />
                ))}
              </div>
              <Btn
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setDraft((d) => ({ ...d, files: [...d.files, { path: '', body: '' }] }))}
              >
                {t('sell.addFile')}
              </Btn>
              {errs.files ? (
                <p role="alert" className="mt-2 text-[11.5px] font-semibold text-gold">
                  {t('sell.eFiles')}
                </p>
              ) : null}
            </div>

            <ImageHasher images={draft.images} onAdd={(imgs) => setDraft((d) => ({ ...d, images: [...d.images, ...imgs].slice(0, 12) }))} />

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-bg/60 p-4">
              <input
                type="checkbox"
                checked={draft.rights}
                onChange={(e) => setDraft((d) => ({ ...d, rights: e.target.checked }))}
                className="mt-0.5 size-4 accent-[var(--c-brand)]"
              />
              <span className="text-[12.5px] leading-relaxed text-ink/85">{t('sell.rights')}</span>
            </label>
            {errs.rights ? (
              <p role="alert" className="text-[11.5px] font-semibold text-gold">
                {t('sell.eRights')}
              </p>
            ) : null}

            <Btn type="submit" size="lg" disabled={busy || !allowed}>
              {t('sell.submit')}
            </Btn>
            <p className="text-[11.5px] leading-relaxed text-dim">{t('sell.submitNote')}</p>
          </form>

          <Report report={report} lang={lang} />

          {/* إدراجاتي */}
          <section className="rounded-3xl border border-line bg-panel/60 p-5">
            <h2 className="text-[15px] font-extrabold">{t('sell.mineTitle')}</h2>
            {mine.length ? (
              <ul className="mt-4 space-y-3">
                {mine.map((l) => {
                  const ap = appealsLayer(l)
                  return (
                    <li key={l.id} className="rounded-2xl border border-line bg-bg/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13.5px] font-extrabold">{l.title}</span>
                        <span className="flex items-center gap-2">
                          <Money v={l.price} size="text-[13px]" />
                          <Pill tone={ap.state === 'published' ? 'brand' : ap.state === 'quarantined' ? 'gold' : 'line'}>
                            {t(`sell.state.${ap.state}`)}
                          </Pill>
                        </span>
                      </div>
                      <p className="num mt-1.5 text-[11.5px] text-dim">
                        {t('sell.scoreLine', { s: l.report?.score ?? '—', v: l.report?.verdict ?? '—', n: l.sales || 0 })}
                      </p>
                      {l.report ? (
                        <pre
                          dir="ltr"
                          className="num mt-2 max-h-28 overflow-auto rounded-lg border border-line bg-panel/60 p-2 text-[10.5px] leading-relaxed text-dim"
                        >
                          {reportText(l.report, lang)}
                        </pre>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Btn type="button" size="sm" variant="outline" onClick={() => reinspect(l.id)} disabled={busy}>
                          {t('sell.reinspect')}
                        </Btn>
                        {ap.state === 'rejected' || ap.state === 'quarantined' || ap.state === 'frozen' ? (
                          <Btn type="button" size="sm" variant="ghost" onClick={() => setAppealFor(appealFor === l.id ? null : l.id)}>
                            {t('sell.appeal')}
                          </Btn>
                        ) : null}
                        <Link
                          to="/creators"
                          className="inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-bold text-brand underline decoration-2 underline-offset-2"
                        >
                          {t('sell.seeMarket')}
                        </Link>
                      </div>
                      {appealFor === l.id ? (
                        <div className="mt-3 rounded-xl border border-line bg-panel/60 p-3">
                          <label htmlFor={`ap-${l.id}`} className="text-[12.5px] font-bold">
                            {t('sell.appealLabel')}
                          </label>
                          <textarea
                            id={`ap-${l.id}`}
                            rows={3}
                            value={appealText}
                            onChange={(e) => setAppealText(e.target.value)}
                            className="mt-2 w-full rounded-lg border border-line bg-bg p-2.5 text-[12.5px] outline-none focus:border-brand"
                          />
                          <Btn type="button" size="sm" className="mt-2" onClick={() => appeal(l.id)}>
                            {t('sell.appealSend')}
                          </Btn>
                          <p className="mt-2 text-[11px] leading-relaxed text-dim">{t('sell.appealNote')}</p>
                        </div>
                      ) : null}
                      {ap.reports.total ? (
                        <p className="num mt-2 text-[11px] font-semibold text-gold">
                          {t('sell.reported', { n: ap.reports.total, r: ap.reports.rights, t: ap.threshold })}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-relaxed text-dim">{t('sell.noListings')}</p>
            )}
          </section>
        </div>

        {/* العمود: التقسيم والمستحقات والترخيص */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div data-split className="rounded-3xl border border-line bg-panel/60 p-5">
            <p className="text-[13px] font-extrabold">{t('sell.splitTitle')}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('sell.splitSub')}</p>
            <dl className="num mt-4 space-y-2 text-[12.5px]">
              {/* الأرقام بالهللة لا بالريال الصحيح: num() يُقرّب، وتقسيمُ بائع
                  على ١٤٩ ريالًا يُقرَّب إلى ١١٢ فيخفي هللاته — dec() يُبقيها */}
              {[
                ['sell.splitPrice', dec(parts.price)],
                ['sell.splitCommission', `− ${dec(parts.commission)}`],
                ['sell.splitNet', dec(parts.sellerNet)],
                ['sell.splitFees', `≈ ${dec(parts.processing.estimate)}`],
                ['sell.splitAfter', dec(parts.sellerAfterFeesEstimate)],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  className={`flex items-center justify-between gap-3 ${i === 2 ? 'border-t border-line pt-2 font-extrabold text-brand' : ''}`}
                >
                  <dt className="text-dim">{t(k)}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="num mt-3 text-[11px] leading-relaxed text-dim">{t('sell.splitNote', { p: Math.round(COMMISSION * 100) })}</p>
          </div>

          <div className="rounded-3xl border border-line bg-panel/60 p-5">
            <p className="text-[13px] font-extrabold">{t('sell.payoutTitle')}</p>
            <dl className="num mt-3 space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-dim">{t('sell.payoutReleased')}</dt>
                <dd className="font-bold">{dec(payout.releasedTotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-dim">{t('sell.payoutHeld', { d: ESCROW_DAYS })}</dt>
                <dd className="font-bold">{dec(payout.heldTotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <dt className="text-dim">{t('sell.payoutMin')}</dt>
                <dd className="font-bold">{num(MIN_PAYOUT)}</dd>
              </div>
            </dl>
            <p
              className={`num mt-3 rounded-xl border px-3 py-2 text-[11.5px] font-bold ${payout.eligible ? 'border-[#3ecf8e]/30 bg-[#3ecf8e]/8 text-[#3ecf8e]' : 'border-line bg-bg/60 text-dim'}`}
            >
              {payout.eligible ? t('sell.payoutReady') : t('sell.payoutMissing', { n: num(payout.missing) })}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-dim">{t('sell.payoutNote')}</p>
          </div>

          <div className="rounded-3xl border border-line bg-panel/60 p-5">
            <p className="text-[13px] font-extrabold">{t('sell.licenceTitle')}</p>
            <p className="num mt-1 text-[11px] text-dim">{LICENCE.id}</p>
            <ul className="mt-3 space-y-2">
              {LICENCE.rules.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
                  <Icon n="lock" className="mt-0.5 size-3.5 shrink-0 text-dim" />
                  <span>{t(`sell.licence.${r}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-line bg-panel/40 p-5">
            <p className="text-[13px] font-extrabold">{t('sell.bandsTitle')}</p>
            <ul className="num mt-3 space-y-2">
              {BANDS.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-bg/60 px-3 py-2">
                  <span className="text-[12px] font-bold">
                    {b.min}–{b.max}
                  </span>
                  <span className="text-[11.5px] leading-relaxed text-dim">{L(VERDICTS[b.verdict])}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
