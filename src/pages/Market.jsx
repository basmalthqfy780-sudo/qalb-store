import { useMemo, useState } from 'react'
import { num, useI18n } from '../i18n'
import { MARKET_CITIES, MARKET_FIELDS, MARKET_MIN, aggregate, marketCsv, marketReport, marketRows, readSignals, saveSignal } from '../data/market'
import { templates } from '../data/templates'
import { SUPPORT_MAILTO } from '../data/contact'
import { itemList, useSeo } from '../components/Seo'
import { Btn, Head, Icon, Pill, Reveal } from '../components/ui'

/**
 * تقريرُ السوق — من إجاباتٍ مجهولةٍ على أربعةِ أسئلة: تخصصك، مدينتك، هل حصلت على
 * مقابلة، وأيَّ قالبٍ استعملت.
 *
 * ما يخرج منه شيئان: محتوىً يُسوَّق به («أكثرُ القوالب حصولًا على مقابلات
 * للمهندسين»)، ومنتجٌ B2B يُباع للجامعات ومراكز المهنة — تقريرٌ من هذا القبيل لا
 * تملكه جهةٌ واحدة، وهو ما يجعل الإجابةَ تستحق من صاحبها ضغطةً واحدة.
 *
 * وقاعدةُ النشر: كلُّ نسبةٍ معها عددُ مَن خرجت منهم، وما دون خمسِ إجابات لا يُسمّى
 * سوقًا — ثلاثةُ آراءٍ ليست اتجاهًا، والفرقُ بينهما هو الفرقُ بين إحصاءٍ وإعلان.
 */
export default function Market() {
  const { t, lang, L } = useI18n()
  const [signals, setSignals] = useState(() => readSignals())
  const [form, setForm] = useState({ field: '', city: '', interview: '', template: '', months: '' })
  const [note, setNote] = useState('')

  const agg = useMemo(() => aggregate(signals), [signals])
  const rows = useMemo(() => marketRows(agg), [agg])
  const report = useMemo(() => marketReport(agg, { lang }), [agg, lang])

  useSeo(`${t('market.title')} · ${t('brand.name')}`, t('meta.marketDesc'), {
    jsonLd: itemList(rows.slice(0, 10).map((r) => ({ name: String(r.field?.ar ?? r.field), url: '/market' }))),
  })

  function send() {
    const r = saveSignal({
      field: form.field,
      city: form.city,
      interview: form.interview === 'yes' ? true : form.interview === 'no' ? false : null,
      template: form.template,
      months: form.months,
    })
    if (!r.ok) return setNote(t('market.needOne'))
    setSignals(readSignals())
    setForm({ field: '', city: '', interview: '', template: '', months: '' })
    setNote(r.duplicate ? t('market.duplicate') : t('market.thanks'))
  }

  function csv() {
    const blob = new Blob([marketCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `qalb-market-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1120px] py-13 sm:py-16">
        <Head
          as="h1"
          kicker={t('market.kicker')}
          title={t('market.title')}
          sub={t('market.sub')}
          right={
            <Pill tone="brand" className="max-w-full">
              <Icon n="shield" className="size-3" />
              {t('market.privacyPill')}
            </Pill>
          }
        />

        {/* ------------------------------ الأرقام ------------------------------ */}
        <section className="mt-9 grid gap-3 sm:grid-cols-4" data-market-stats>
          <Big k={t('market.answers')} v={num(agg.n)} />
          <Big k={t('market.asked')} v={num(agg.asked)} />
          <Big k={t('market.interviews')} v={num(agg.interviews)} />
          <Big k={t('market.rate')} v={agg.asked ? `${num(agg.rate)}٪` : '—'} />
        </section>

        {!agg.enough && (
          <p className="mt-4 rounded-2xl border border-gold/35 bg-gold/[0.06] p-4 text-[12.5px] leading-relaxed text-ink" data-market-short>
            {t('market.notEnough').replace('{n}', num(MARKET_MIN))}
          </p>
        )}

        {!!rows.length && (
          <section className="mt-6 overflow-x-auto rounded-3xl border border-line bg-panel p-4 sm:p-5" data-market-table>
            <table className="w-full min-w-[620px] text-start text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-dim">
                  <th className="py-2 text-start font-bold">{t('market.colField')}</th>
                  <th className="py-2 text-start font-bold">{t('market.colAnswers')}</th>
                  <th className="py-2 text-start font-bold">{t('market.colInterviews')}</th>
                  <th className="py-2 text-start font-bold">{t('market.colRate')}</th>
                  <th className="py-2 text-start font-bold">{t('market.colMonths')}</th>
                  <th className="py-2 text-start font-bold">{t('market.colTop')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.field?.id ?? r.field)} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 font-semibold text-ink">{L(r.field)}</td>
                    <td className="num py-2.5 text-dim">{num(r.answers)}</td>
                    <td className="num py-2.5 text-dim">
                      {num(r.interviews)} {t('market.of')} {num(r.asked)}
                    </td>
                    <td className="num py-2.5 font-bold text-ink">{r.rate}</td>
                    <td className="num py-2.5 text-dim">{r.months}</td>
                    <td className="py-2.5 text-dim">{r.top}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Btn variant="outline" size="xs" onClick={csv} data-market-csv>
                <Icon n="download" className="size-3.5" />
                {t('market.csv')}
              </Btn>
              <Btn
                variant="outline"
                size="xs"
                onClick={() => {
                  navigator.clipboard?.writeText(report).then(
                    () => setNote(t('market.copied')),
                    () => setNote(t('market.copyBlocked')),
                  )
                }}
              >
                <Icon n="copy" className="size-3.5" />
                {t('market.copy')}
              </Btn>
            </div>
            {note && (
              <p className="mt-2 text-[11.5px] text-brand" role="status">
                {note}
              </p>
            )}
          </section>
        )}

        {/* ------------------------------ أجب بنفسك ------------------------------ */}
        <section className="mt-6 rounded-3xl border border-line bg-panel/70 p-5" data-market-ask>
          <h2 className="text-[15px] font-extrabold text-ink">{t('market.askTitle')}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('market.askSub')}</p>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('market.field')}</span>
              <select
                value={form.field}
                onChange={(e) => setForm({ ...form, field: e.target.value })}
                aria-label={t('market.field')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value="">—</option>
                {MARKET_FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {L(f)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('market.city')}</span>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                aria-label={t('market.city')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value="">—</option>
                {MARKET_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {L(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('market.interview')}</span>
              <div className="flex gap-1.5">
                {['yes', 'no'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={form.interview === v}
                    onClick={() => setForm({ ...form, interview: form.interview === v ? '' : v })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-[12.5px] font-bold transition ${
                      form.interview === v ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line bg-bg/70 text-dim hover:text-ink'
                    }`}
                  >
                    {v === 'yes' ? t('market.yes') : t('market.no')}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('market.template')}</span>
              <select
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                aria-label={t('market.template')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value="">—</option>
                {templates.map((x) => (
                  <option key={x.id} value={x.id}>
                    {L(x.name)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('market.months')}</span>
              <input
                inputMode="numeric"
                value={form.months}
                onChange={(e) => setForm({ ...form, months: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })}
                placeholder="3"
                className="num w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-dim/60 focus:border-brand/50"
              />
            </label>
            <div className="flex items-end">
              <Btn size="sm" className="w-full" data-market-add onClick={send}>
                <Icon n="check" className="size-4" />
                {t('market.add')}
              </Btn>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim/80">{t('market.privacy')}</p>
        </section>

        {/* ------------------------------ البيع للجهات ------------------------------ */}
        <Reveal className="mt-6 rounded-3xl border border-line bg-panel/55 p-5 sm:p-7">
          <h2 className="text-[16px] font-extrabold text-ink">{t('market.b2bTitle')}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('market.b2bSub')}</p>
          <a
            href={`${SUPPORT_MAILTO}?subject=${encodeURIComponent(t('market.b2bSubject'))}&body=${encodeURIComponent(report.slice(0, 1200))}`}
            className="mt-3.5 inline-flex"
          >
            <Btn size="sm">
              <Icon n="mail" className="size-4" />
              {t('market.b2bCta')}
            </Btn>
          </a>
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim/80">{t('market.b2bNote')}</p>
        </Reveal>
      </div>
    </div>
  )
}

function Big({ k, v }) {
  return (
    <div className="rounded-2xl border border-line bg-panel/70 px-4 py-3.5">
      <span className="block text-[11.5px] text-dim">{k}</span>
      <span className="num text-[26px] font-extrabold leading-tight text-ink">{v}</span>
    </div>
  )
}
