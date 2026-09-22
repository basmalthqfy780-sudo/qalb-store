import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { num, useI18n } from '../i18n'
import { EMBED_TIERS, embedLead, embedMailto, embedQuota, embedSnippet, embedTier, embedUsage } from '../data/embed'
import { leads } from '../api/leads'
import { SUPPORT_MAIL } from '../data/contact'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'
import { useSeo } from '../components/Seo'

/**
 * فاحصُ ATS قابلًا للتضمين (B2B): كودُ iframe واحد يوضع في موقعِ جامعةٍ أو معهدٍ أو
 * مكتبِ توظيف، فيعمل الفاحص في صفحتهم كما يعمل عندنا — وبلا أن تُرفع سيرةٌ إلى
 * خادم، لأنه لا يعمل إلا في متصفحِ الزائر.
 *
 * الشفافيةُ هنا جزءٌ من المنتج لا اعتذارٌ عنه: نبيعُ موضعَ الفاحص وحصةَ تحميلٍ
 * شهرية، ولا نبيعُ بياناتِ من فحصوا — لا نملكها أصلًا. ولذلك يخرج تقريرُ الجهة
 * عددَ مرّاتِ التحميل، لا درجاتِ الطلاب؛ ومن أراد الدرجات فمقاعدُ الطلاب في /b2b هي
 * طريقها، وفيها يُقاس الفوج قبل العقد وبعده.
 */
/** حقلُ الطلب كما يُحفظ في دفتر الجهات: الباقةُ تُمرَّر بمعرّفها لا بسعرها */
const embedLeadOf = (form, tierId, lang) => embedLead({ ...form, tier: tierId, lang })

export default function Embed() {
  const { t, lang, L, LA } = useI18n()
  const [org, setOrg] = useState('')
  const [theme, setTheme] = useState('dark')
  const [height, setHeight] = useState(760)
  const [tierId, setTierId] = useState(EMBED_TIERS[0].id)
  const [form, setForm] = useState({ org: '', email: '', contact: '', phone: '', note: '', slots: '' })
  // مكانُ الطلب (دفتر الخادم، أو هذا المتصفح، أو لا مكان) وحالةُ النسخ: حالتان منفصلتان
  const [where, setWhere] = useState('')
  const [copied, setCopied] = useState(false)

  const tier = embedTier(tierId)
  const snippet = useMemo(() => embedSnippet({ org: org || 'your-name', theme, lang, height }), [org, theme, lang, height])
  const usage = embedUsage(org || 'demo')
  const quota = embedQuota(tierId, usage.used)

  useSeo(`${t('embed.title')} · ${t('brand.name')}`, t('meta.embedDesc'))

  const lead = { ...embedLeadOf(form, tierId, lang) }
  const mailto = embedMailto(lead, { lang, mail: SUPPORT_MAIL })

  async function submit() {
    const r = await leads.submit(lead)
    setWhere(r.body?.where || 'none')
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1120px] py-13 sm:py-16">
        <Head
          as="h1"
          kicker={t('embed.kicker')}
          title={t('embed.title')}
          sub={t('embed.sub')}
          right={
            <Pill tone="brand" className="max-w-full">
              <Icon n="code2" className="size-3" />
              {t('embed.noData')}
            </Pill>
          }
        />

        {/* ------------------------------ الشرائح ------------------------------ */}
        <div className="mt-9 grid gap-4 lg:grid-cols-3" data-embed-tiers>
          {EMBED_TIERS.map((x) => (
            <article
              key={x.id}
              className={`rounded-3xl border p-5 transition ${tierId === x.id ? 'border-brand/50 bg-brand/[0.06]' : 'border-line bg-panel/70'}`}
              data-embed-tier={x.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-extrabold leading-snug text-ink">{L(x.name)}</h2>
                  <p className="mt-1 text-[12px] text-dim">{L(x.for)}</p>
                </div>
                {x.best && <Pill tone="brand">{t('embed.best')}</Pill>}
              </div>
              <div className="mt-3.5 flex items-baseline gap-1.5">
                {x.price == null ? (
                  <span className="text-[18px] font-extrabold text-ink">{t('embed.ask')}</span>
                ) : (
                  <>
                    <Money v={x.price} size="text-[26px]" />
                    <span className="text-[12px] text-dim">{t('embed.perMonth')}</span>
                  </>
                )}
              </div>
              <p className="num mt-1 text-[12px] text-dim">{t('embed.checks', { n: num(x.checks) })}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {LA(x.includes).map((s) => (
                  <li key={s} className="flex gap-2 text-[12px] leading-relaxed text-dim">
                    <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-brand" sw={2.4} />
                    {s}
                  </li>
                ))}
              </ul>
              <Btn variant={tierId === x.id ? 'primary' : 'outline'} size="sm" className="mt-4 w-full" onClick={() => setTierId(x.id)}>
                <Icon n={tierId === x.id ? 'check' : 'cursor'} className="size-4" />
                {tierId === x.id ? t('embed.chosen') : t('embed.choose')}
              </Btn>
            </article>
          ))}
        </div>

        {/* ------------------------------ الكود ------------------------------ */}
        <section className="mt-6 rounded-3xl border border-line bg-panel p-5" data-embed-builder>
          <h2 className="text-[15px] font-extrabold text-ink">{t('embed.builderTitle')}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('embed.builderSub')}</p>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('embed.org')}</span>
              <input
                value={org}
                onChange={(e) => setOrg(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 32))}
                placeholder="ksu-careers"
                dir="ltr"
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-dim/60 focus:border-brand/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('embed.theme')}</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                aria-label={t('embed.theme')}
                className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              >
                <option value="dark">{t('embed.dark')}</option>
                <option value="light">{t('embed.light')}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('embed.height')}</span>
              <input
                inputMode="numeric"
                value={height}
                onChange={(e) => setHeight(Math.max(420, Math.min(1400, Number(e.target.value.replace(/[^\d]/g, '')) || 760)))}
                dir="ltr"
                className="num w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
              />
            </label>
          </div>
          <pre
            dir="ltr"
            className="mt-3.5 overflow-x-auto rounded-2xl border border-line bg-bg/70 p-3.5 text-[11.5px] leading-[1.7] text-ink"
            data-embed-code
          >
            {snippet}
          </pre>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Btn
              variant="outline"
              size="xs"
              data-embed-copy
              onClick={() =>
                navigator.clipboard?.writeText(snippet).then(
                  () => setCopied(true),
                  () => setCopied(false),
                )
              }
            >
              <Icon n="copy" className="size-3.5" />
              {t('embed.copy')}
            </Btn>
            {copied && (
              <span className="text-[11.5px] text-brand" role="status">
                {t('embed.copied')}
              </span>
            )}
            <Link to={`/ats?embed=1${org ? `&org=${org}` : ''}`} className="text-[12px] font-bold text-brand hover:underline" data-embed-preview>
              {t('embed.preview')}
            </Link>
          </div>

          {/* عدّاد الاستعمال: ما نعدّه نعدّه في المتصفح هنا، ونقول أين يُعدّ حقًا */}
          <div className="mt-4 rounded-2xl border border-line bg-panel/70 p-3.5" data-embed-usage>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="font-bold text-ink">{t('embed.usage')}</span>
              <span className="num text-dim">
                {num(quota.used)} / {num(tier.checks)} · {t('embed.left')}: {num(quota.left)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg/80">
              <div className={`h-full rounded-full ${quota.over ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${Math.max(2, quota.pct)}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-dim/80">{t('embed.usageNote')}</p>
          </div>
        </section>

        {/* ------------------------------ الطلب ------------------------------ */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-3xl border border-line bg-panel/70 p-5" data-embed-form>
            <h2 className="text-[15px] font-extrabold text-ink">{t('embed.formTitle')}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('embed.formSub')}</p>
            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              {[
                ['org', t('embed.fOrg'), 'جامعة الملك سعود — مركز المهنة'],
                ['email', t('embed.fEmail'), 'careers@ksu.edu.sa'],
                ['contact', t('embed.fContact'), 'اسم المسؤول'],
                ['phone', t('embed.fPhone'), '+966 5x xxx xxxx'],
                ['slots', t('embed.fSlots'), 'الأحد أو الثلاثاء، ١١ص – ١م'],
              ].map(([k, label, ph]) => (
                <label key={k} className={`block ${k === 'slots' ? 'sm:col-span-2' : ''}`}>
                  <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{label}</span>
                  <input
                    value={form[k] || ''}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    placeholder={ph}
                    dir={k === 'email' || k === 'phone' ? 'ltr' : undefined}
                    className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-dim/60 focus:border-brand/50"
                  />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11.5px] font-bold text-dim">{t('embed.fNote')}</span>
                <textarea
                  value={form.note || ''}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand/50"
                />
              </label>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Btn size="sm" data-embed-send onClick={submit} disabled={!form.org || !form.email}>
                <Icon n="check" className="size-4" />
                {t('embed.send')}
              </Btn>
              <a href={mailto} className="inline-flex">
                <Btn size="sm" variant="outline">
                  <Icon n="mail" className="size-4" />
                  {t('embed.mail')}
                </Btn>
              </a>
            </div>
            {where && (
              <p className="mt-2.5 text-[11.5px] text-brand" role="status" data-embed-state>
                {t(`embed.where_${where}`)}
              </p>
            )}
            <p className="mt-3 text-[11.5px] leading-relaxed text-dim/80">{t('embed.formNote')}</p>
          </div>

          <Reveal className="rounded-3xl border border-line bg-panel/55 p-5">
            <h2 className="text-[15px] font-extrabold text-ink">{t('embed.whoTitle')}</h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {LA(EMBED_WHO).map((s) => (
                <li key={s} className="flex gap-2 text-[12.5px] leading-relaxed text-dim">
                  <Icon n="arrow" className="mt-0.5 size-3.5 shrink-0 text-brand rtl:-scale-x-100" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-dim/80">{t('embed.whoNote')}</p>
          </Reveal>
        </section>
      </div>
    </div>
  )
}

/** مَن يشتري هذا — سطرٌ لكلِّ جهة، لا سوقٌ مبهم */
const EMBED_WHO = {
  ar: [
    'مركزُ مهنةٍ جامعي: الفاحصُ في صفحةِ الخريج، فيقيس الطالبُ سيرتَه قبل أن يسلّمها للمركز.',
    'معهدُ تدريب: يُضمَّن في صفحةِ الدفعة، فيُقاس الفوج قبل الدورة وبعدها بنفس المقياس.',
    'مكتبُ توظيف: يُوضع في صفحةِ «جهّز سيرتك» بدل مقالٍ عام عن السيرة.',
    'مدرّبُ سير: أداةٌ تُفتح مع العميل في الجلسة، والنتيجةُ أمامهما على الشاشة.',
  ],
  en: [
    'A university career centre: the checker on the graduate page, so a student measures their CV before handing it in.',
    'A training institute: embedded on the cohort page, the same measure before and after the course.',
    'A placement office: on the “prepare your CV” page instead of another generic article about CVs.',
    'A CV coach: a tool opened with the client in session, the result in front of both.',
  ],
}
