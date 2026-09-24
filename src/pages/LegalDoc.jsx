import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSeo } from '../components/Seo'
import { SUPPORT_MAIL } from '../data/contact'
import { COMPANY, VAT_RATE, isSet } from '../data/company'
import { SECTIONS, sectionById } from '../data/legal'
import { Btn, Head, Icon } from '../components/ui'

/**
 * صفحةٌ قانونيةٌ واحدة بمسارها — `/terms` و`/privacy` و`/refunds` و`/contact`.
 *
 * الفكرة: روابطُ التذييل كانت تنزل على قسمٍ في صفحةٍ جامعة، فلا عنوانٌ مستقل ولا
 * رابطٌ يُشارَك. اليوم كلُّ قسمٍ صفحةٌ كاملة العنوان والوصف والمسار، ونصُّها هو
 * نصُّ الصفحة الجامعة نفسه (src/data/legal.js) — فلا نسختان يختلفان.
 *
 * وقسمُ التواصل والضريبة يُبنى من COMPANY لا من نصٍّ مكتوب: ما لم يُوثِّقه المالك
 * (رقم ضريبي، سجل تجاري، هاتف) يظهر «قيد التوثيق» صراحةً، ولا يُطبع رقمٌ لا يملكه
 * أحد. وهذا ما يفعله عرض السعر في /b2b أيضًا — قاعدةٌ واحدة في المستودع.
 */
export default function LegalDoc({ section = 'terms' }) {
  const { t, L } = useI18n()
  const sec = sectionById(section)
  const contact = section === 'contact'

  const title = contact ? t('legal.contactTitle') : t(sec?.h || 'legal.title')
  const sub = contact ? t('legal.contactSub') : t('legal.sub')

  useSeo(`${title} · ${t('brand.name')}`, sub)

  const vatNumber = isSet(COMPANY.vatNumber) ? COMPANY.vatNumber : null
  const crNumber = isSet(COMPANY.crNumber) ? COMPANY.crNumber : null

  const rows = contact
    ? [
        { i: 'mail', k: 'legal.contactMail', v: SUPPORT_MAIL, href: `mailto:${SUPPORT_MAIL}` },
        { i: 'pin', k: 'legal.contactAddress', v: L(COMPANY.address) },
        { i: 'bank', k: 'legal.contactVat', v: t('legal.contactVatIn', { p: Math.round(VAT_RATE * 100) }) },
        vatNumber
          ? { i: 'card', k: 'legal.contactVatNumber', v: vatNumber }
          : { i: 'card', k: 'legal.contactVatNumber', v: t('legal.contactPending') },
        crNumber ? { i: 'file', k: 'legal.contactCr', v: crNumber } : { i: 'file', k: 'legal.contactCr', v: t('legal.contactPending') },
      ].filter(Boolean)
    : []

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[820px] py-14">
        <Head as="h1" kicker={t('footer.legal')} title={title} sub={sub} />

        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11.5px] text-dim">
          <span className="inline-flex items-center gap-1.5">
            <Icon n="check" className="size-3.5 text-brand" sw={2.8} />
            {t('legal.updated')}
          </span>
          <span className="text-line">|</span>
          <Btn variant="outline" size="sm" onClick={() => window.print()}>
            {t('legal.print')}
          </Btn>
        </div>

        <nav aria-label={t('legal.jump')} className="mt-5 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to={`/${s.id === 'refund' ? 'refunds' : s.id}`}
              aria-current={s.id === section ? 'page' : undefined}
              className={`rounded-xl border px-3 py-1.5 text-[12.5px] font-bold transition ${
                s.id === section ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-panel text-dim hover:border-brand/50 hover:text-ink'
              }`}
            >
              {t(s.h)}
            </Link>
          ))}
          <Link
            to="/contact"
            aria-current={contact ? 'page' : undefined}
            className={`rounded-xl border px-3 py-1.5 text-[12.5px] font-bold transition ${
              contact ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-panel text-dim hover:border-brand/50 hover:text-ink'
            }`}
          >
            {t('legal.contactTitle')}
          </Link>
        </nav>

        {contact ? (
          <section className="mt-9 scroll-mt-24 rounded-3xl border border-line bg-panel/60 p-5 sm:p-7">
            <h2 className="flex items-center gap-2 font-display text-[21px] font-extrabold">
              <Icon n="mail" className="size-5 text-brand" />
              {t('legal.contactTitle')}
            </h2>
            <dl className="mt-5 divide-y divide-line/60">
              {rows.map((r) => (
                <div key={r.k} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <dt className="flex items-center gap-2 text-[13px] font-semibold">
                    <Icon n={r.i} className="size-4 text-dim" />
                    {t(r.k)}
                  </dt>
                  <dd className="min-w-0 text-[13px] font-bold">
                    {r.href ? (
                      <a href={r.href} className="text-brand underline decoration-2 underline-offset-2">
                        {r.v}
                      </a>
                    ) : (
                      <span className="num">{r.v}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
              <Icon n="shield" className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>{t('legal.contactNote')}</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <Link
                to="/legal"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
              >
                <Icon n="file" className="size-3.5 text-brand" />
                {t('legal.allPages')}
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
              >
                <Icon n="search" className="size-3.5 text-brand" />
                {t('track.title')}
              </Link>
            </div>
          </section>
        ) : sec ? (
          <section id={sec.id} className="mt-9 scroll-mt-24 rounded-3xl border border-line bg-panel/60 p-5 sm:p-7">
            <h2 className="flex items-center gap-2 font-display text-[21px] font-extrabold">
              <Icon n="shield" className="size-5 text-brand" />
              {t(sec.h)}
            </h2>
            <div className="mt-4 space-y-3.5 text-[14px] leading-relaxed text-dim">
              {sec.paras.map((k) => (
                <p key={k}>{t(k, { mail: SUPPORT_MAIL })}</p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <Link
                to="/legal"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
              >
                <Icon n="file" className="size-3.5 text-brand" />
                {t('legal.allPages')}
              </Link>
              {sec.id === 'privacy' ? (
                <a
                  href={`mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(t('legal.deleteAsk'))}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
                >
                  <Icon n="mail" className="size-3.5 text-brand" />
                  {SUPPORT_MAIL}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <p className="mt-10 rounded-2xl border border-line bg-bg px-4 py-3 text-[12px] leading-relaxed text-dim">
          {t('legal.foot', { mail: SUPPORT_MAIL })}
        </p>
      </div>
    </div>
  )
}
