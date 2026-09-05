import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { ATS_DEMO, ATS_TARGET, analyzeAts, atsReport } from '../data/ats'
import { byId } from '../data/templates'
import { SUPPORT_MAILTO } from '../data/contact'
import { toolLd, useSeo } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

const OK_EXTS = /\.(txt|md|markdown|csv|text)$/i
const MAX_BYTES = 200_000

/**
 * فاحص جاهزية الفرز الآلي — مجانًا، بلا حساب، وبلا تخزين.
 * ما يُقاس هنا هو القياس نفسه المُرفَق بالقالب في scripts/check-ats.mjs، وشارة
 * «ATS 92/100» على البطاقة هي هذه الدرجة على السيرة التجريبية للقالب.
 */
export default function Ats() {
  const { t, L, lang } = useI18n()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [refused, setRefused] = useState('')
  const [note, setNote] = useState('')
  const taRef = useRef(null)
  const fileRef = useRef(null)

  const res = useMemo(() => analyzeAts(text), [text])
  const scored = res.score != null
  const target = byId('nova')

  const faq = [
    [t('ats.q1'), t('ats.a1')],
    [t('ats.q2'), t('ats.a2')],
    [t('ats.q3'), t('ats.a3')],
    [t('ats.q4'), t('ats.a4')],
  ]
  useSeo(`${t('ats.title')} · ${t('brand.name')}`, t('meta.atsDesc'), {
    jsonLd: toolLd({ name: `${t('ats.title')} · ${t('brand.name')}`, desc: t('meta.atsDesc'), faq }),
  })

  const report = useMemo(() => (scored || res.words > 0 ? atsReport(res, { lang }) : ''), [res, lang, scored])

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(report)
      setNote(t('ats.copied'))
    } catch {
      setNote(t('ats.copyBlocked'))
    }
  }

  // كالبطاقة في صفحة النجاح: Blob ورابطٌ محلّي — لا طلبَ إلى خادمٍ في الحكاية
  function save() {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ats-report-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    setNote(t('ats.saved'))
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!OK_EXTS.test(f.name)) return setRefused(f.name)
    if (f.size > MAX_BYTES) return setRefused('>size')
    const fr = new FileReader()
    fr.onload = () => {
      setRefused('')
      setText(String(fr.result || ''))
      setFileName(f.name)
      setNote(t('ats.fileLoaded'))
    }
    fr.onerror = () => setRefused('>error')
    fr.readAsText(f)
  }

  const load = (v, name) => {
    setText(v)
    setFileName(name)
    setRefused('')
    taRef.current?.focus()
  }
  const wordsPct = Math.min(100, Math.round((res.words / ATS_TARGET.maxWords) * 100))
  const inRange = res.words >= ATS_TARGET.minWords && res.words <= ATS_TARGET.maxWords
  const bandTone = !scored ? 'text-dim' : res.score >= 90 ? 'text-brand' : res.score >= ATS_TARGET.pass ? 'text-gold' : 'text-gold'

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1120px] py-13 sm:py-16">
        <Head
          kicker={t('ats.kicker')}
          title={t('ats.title')}
          sub={t('ats.sub')}
          right={
            <Pill tone="brand" className="max-w-full">
              <Icon n="shield" className="size-3" />
              {t('ats.privacy')}
            </Pill>
          }
        />

        <div className="mt-9 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]">
          {/* ------------------------------ المدخل ------------------------------ */}
          <section className="rounded-3xl border border-line bg-panel p-4 sm:p-5" data-ats-input>
            <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3.5">
              <span className="text-[12.5px] font-semibold text-dim">{t('ats.paste')}</span>
              <div className="ms-auto flex flex-wrap items-center gap-1">
                <Btn variant="ghost" size="xs" onClick={() => fileRef.current?.click()}>
                  <Icon n="file" className="size-3.5" />
                  {t('ats.chooseFile')}
                </Btn>
                <Btn variant="ghost" size="xs" onClick={() => load(ATS_DEMO, '')}>
                  <Icon n="spark" className="size-3.5" />
                  {t('ats.useDemo')}
                </Btn>
                <Btn
                  variant="ghost"
                  size="xs"
                  disabled={!text}
                  onClick={() => {
                    load('', '')
                    setNote('')
                  }}
                >
                  <Icon n="refresh" className="size-3.5" />
                  {t('ats.clear')}
                </Btn>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv"
                className="sr-only"
                data-ats-file
                aria-label={t('ats.chooseFile')}
                onChange={pickFile}
              />
            </div>

            <textarea
              ref={taRef}
              dir="auto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={17}
              spellCheck={false}
              aria-label={t('ats.paste')}
              placeholder={t('ats.placeholder')}
              className="mt-3 w-full resize-y rounded-2xl border border-line bg-bg/60 p-3.5 text-[13.5px] leading-[1.85] text-ink outline-none transition placeholder:text-dim/60 focus:border-brand/50"
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11.5px] text-dim">
              <span className="num font-semibold text-ink">
                {num(res.words)} {t('ats.words')}
              </span>
              {fileName && <span className="truncate font-mono text-[11px]">{fileName}</span>}
              <span className="ms-auto">{t('ats.fileHint')}</span>
            </div>

            {refused && (
              <div className="mt-3 rounded-2xl border border-gold/35 bg-gold/8 p-3.5" data-ats-refused>
                <p className="text-[13px] font-bold text-ink">
                  {refused === '>size' ? t('ats.tooBig') : refused === '>error' ? t('ats.readError') : t('ats.refused')}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('ats.refusedWhy')}</p>
                {!refused.startsWith('>') && <p className="mt-1.5 font-mono text-[11px] text-dim/80">{refused}</p>}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Btn variant="outline" size="xs" onClick={() => load(ATS_DEMO, '')}>
                    {t('ats.useDemo')}
                  </Btn>
                  <Btn variant="ghost" size="xs" onClick={() => taRef.current?.focus()}>
                    {t('ats.pasteInstead')}
                  </Btn>
                </div>
              </div>
            )}
          </section>

          {/* ------------------------------ الدرجة ------------------------------ */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-line bg-panel p-5" data-ats-score>
              {!scored ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-bg/70 text-dim">
                    <Icon n="scan" className="size-6" />
                  </div>
                  <p className="mt-3.5 text-[13.5px] font-semibold text-ink">{res.words > 0 ? t('ats.short') : t('ats.idle')}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
                    {res.words > 0
                      ? t('ats.shortWhy').replace('{n}', num(res.needsWords))
                      : t('ats.idleWhy').replace('{min}', num(ATS_TARGET.minWords)).replace('{max}', num(ATS_TARGET.maxWords))}
                  </p>
                  {note && (
                    <p className="mt-2.5 text-[11.5px] text-brand" role="status">
                      {note}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Ring score={res.score} />
                    <div className="min-w-0">
                      <p className={`text-[15px] font-extrabold leading-tight ${bandTone}`}>{L(res.band.label)}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(res.band.note)}</p>
                      <p className="num mt-2 text-[11.5px] font-semibold text-brand">
                        {t('ats.checksN').replace('{ok}', num(res.passed)).replace('{n}', num(res.total))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4.5">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-dim">{t('ats.meterWords')}</span>
                      <span className={`num font-bold ${inRange ? 'text-brand' : 'text-gold'}`}>
                        {num(res.words)} · {num(ATS_TARGET.minWords)}–{num(ATS_TARGET.maxWords)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg/80">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${inRange ? 'bg-brand' : 'bg-gold'}`}
                        style={{ width: `${wordsPct}%` }}
                      />
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <Stat k={t('ats.bullets')} v={num(res.bullets)} />
                      <Stat k={t('ats.quantified')} v={`${num(res.measured)}/${num(res.bullets)}`} />
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-dim/80">{t('ats.passLine')}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3.5">
                    <Btn variant="outline" size="xs" onClick={copy}>
                      <Icon n="copy" className="size-3.5" />
                      {t('ats.copy')}
                    </Btn>
                    <Btn variant="outline" size="xs" onClick={save}>
                      <Icon n="download" className="size-3.5" />
                      {t('ats.save')}
                    </Btn>
                  </div>
                  {note && (
                    <p className="mt-2 text-[11.5px] text-brand" role="status">
                      {note}
                    </p>
                  )}
                </>
              )}
            </div>

            {scored && res.gaps.length > 0 && (
              <div className="mt-4 rounded-3xl border border-brand/25 bg-brand/6 p-4.5" data-ats-cta>
                <p className="text-[13px] font-extrabold text-ink">{t('ats.ctaTitle')}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('ats.ctaSub')}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Link
                    to={`/template/${target.slug}`}
                    className="flex items-center gap-2.5 rounded-2xl border border-line bg-panel p-2.5 transition hover:border-brand/45"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
                      <Icon n="type" className="size-4" />
                    </span>
                    <span className="min-w-0 text-[12.5px] font-semibold text-ink">{t('ats.ctaTemplate')}</span>
                    <span className="ms-auto shrink-0">
                      <Money v={target.price} size="text-[12px]" />
                    </span>
                  </Link>
                  <a
                    href={`${SUPPORT_MAILTO}?subject=${encodeURIComponent(t('ats.ctaManualSubject'))}&body=${encodeURIComponent(report.slice(0, 900))}`}
                    className="flex items-center gap-2.5 rounded-2xl border border-line bg-panel/60 p-2.5 transition hover:border-brand/45"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-bg/80 text-dim">
                      <Icon n="mail" className="size-4" />
                    </span>
                    <span className="min-w-0 text-[12.5px] font-semibold text-ink">{t('ats.ctaManual')}</span>
                  </a>
                  <Link to="/host" className="flex items-center gap-2 px-1 pt-1 text-[12px] text-dim transition hover:text-brand">
                    <Icon n="arrow" className="size-3.5" />
                    {t('ats.ctaHosting')}
                  </Link>
                </div>
              </div>
            )}
            {scored && res.gaps.length === 0 && (
              <p className="mt-3 px-1 text-[12px] leading-relaxed text-dim" data-ats-cta>
                {t('ats.ctaClean')}
              </p>
            )}
          </aside>
        </div>

        {/* ------------------------------ القواعد ------------------------------ */}
        {scored && (
          <section className="mt-6" data-ats-rules>
            <h2 className="text-[15px] font-extrabold text-ink">{t('ats.checks')}</h2>
            <p className="mt-1 text-[12.5px] text-dim">{t('ats.checksSub')}</p>
            <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
              {res.checks.map((c) => (
                <li key={c.id} className={`rounded-2xl border p-3.5 transition ${c.ok ? 'border-line bg-panel/55' : 'border-gold/40 bg-gold/8'}`}>
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full ${c.ok ? 'bg-brand/15 text-brand' : 'bg-gold/25 text-gold'}`}
                    >
                      <Icon n={c.ok ? 'check' : 'close'} className="size-3" sw={2.4} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold leading-snug text-ink">{L(c.name)}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(c.why)}</p>
                      {!c.ok && (
                        <p className="mt-2 rounded-xl border border-line bg-bg/60 p-2.5 text-[12px] leading-relaxed text-ink">
                          <span className="font-bold text-brand">{t('ats.fix')}: </span>
                          {L(c.fix)}
                        </p>
                      )}
                    </div>
                    <span className={`ms-auto shrink-0 text-[10.5px] font-bold ${c.ok ? 'text-brand' : 'text-gold'}`}>
                      {c.ok ? t('ats.okTag') : t('ats.gapTag')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-[11.5px] leading-relaxed text-dim/80">{t('ats.rulesFoot')}</p>
          </section>
        )}

        {/* ------------------------------ الأسئلة ------------------------------ */}
        <Reveal className="mt-14 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7">
          <h2 className="text-[16px] font-extrabold text-ink">{t('ats.faqTitle')}</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[13px] font-bold text-ink">{t('ats.q1')}</dt>
              <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('ats.a1')}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-bold text-ink">{t('ats.q2')}</dt>
              <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('ats.a2')}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-bold text-ink">{t('ats.q3')}</dt>
              <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('ats.a3')}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-bold text-ink">{t('ats.q4')}</dt>
              <dd className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('ats.a4')}</dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </div>
  )
}

function Stat({ k, v }) {
  return (
    <div className="rounded-xl border border-line bg-bg/50 px-2.5 py-2">
      <span className="block text-[10.5px] text-dim">{k}</span>
      <span className="num text-[13px] font-bold text-ink">{v}</span>
    </div>
  )
}

/** حلقة الدرجة — مرسومةٌ من الرقم نفسه، فلا حالة نجاحٍ لا يسندها قياس */
function Ring({ score }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" className="size-[72px] shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--c-line)" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={score >= 90 ? 'var(--c-brand)' : 'var(--c-gold)'}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
        className="transition-all duration-700"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" className="fill-ink text-[19px] font-extrabold">
        {score}
      </text>
    </svg>
  )
}
