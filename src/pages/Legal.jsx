import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSeo } from '../components/Seo'
import { SUPPORT_MAIL } from '../data/contact'
import { Btn, Head, Icon } from '../components/ui'

/**
 * الصفحات القانونية التي كانت تشير إليها روابط التذييل الأربعة.
 *
 * قبل هذا الملف كانت «الشروط» و«الخصوصية» و«الاسترجاع» و«الرخصة» كلها تنزل على
 * شريط حقوق التذييل وحده — لا نص لشيء منها، مع أن المتجر يشترط الموافقة على
 * «الشروط وسياسة الاسترجاع» في آخر خطوة قبل الدفع، ويخزّن اسم المشتري وجواله
 * ونبذته. فكل سطر هنا مكتوب ليطابق الكود: ما لا يفعله المتجر مذكور صراحةً
 * (لا مُرسِل، لا بوابة دفع، لا متتبّع، لا فاتورة موثّقة، لا زر استرجاع)،
 * والمكان الذي يُخزَّن فيه الشيء مسمّى باسمه.
 */
const SECTIONS = [
  { id: 'terms', h: 'legal.terms', paras: ['legal.t1', 'legal.t2', 'legal.t3', 'legal.t4', 'legal.t5'] },
  { id: 'privacy', h: 'legal.privacy', paras: ['legal.p1', 'legal.p2', 'legal.p3', 'legal.p4', 'legal.p5', 'legal.p6'] },
  { id: 'refund', h: 'legal.refund', paras: ['legal.r1', 'legal.r2', 'legal.r3', 'legal.r4'] },
  { id: 'licence', h: 'legal.licence', paras: ['legal.l1', 'legal.l2', 'legal.l3', 'legal.l4'] },
]

export default function Legal() {
  const { t } = useI18n()

  useSeo(`${t('legal.title')} · ${t('brand.name')}`, t('legal.sub'))

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[820px] py-14">
        <Head kicker={t('footer.legal')} title={t('legal.title')} sub={t('legal.sub')} />

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
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-dim transition hover:border-brand/50 hover:text-ink"
            >
              {t(s.h)}
            </a>
          ))}
        </nav>

        <div className="mt-9 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-3xl border border-line bg-panel/60 p-5 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-[21px] font-extrabold">
                <Icon n="shield" className="size-5 text-brand" />
                {t(s.h)}
              </h2>
              <div className="mt-4 space-y-3.5 text-[14px] leading-relaxed text-dim">
                {s.paras.map((k) => (
                  <p key={k}>{t(k, { mail: SUPPORT_MAIL })}</p>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                {s.id === 'privacy' ? (
                  <a
                    href={`mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent('حذف بيانات الطلب')}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
                  >
                    <Icon n="mail" className="size-3.5 text-brand" />
                    {SUPPORT_MAIL}
                  </a>
                ) : null}
                {s.id === 'licence' ? (
                  <Link
                    to="/licence"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
                  >
                    <Icon n="check" className="size-3.5 text-brand" />
                    {t('licence.title')}
                  </Link>
                ) : null}
                {s.id === 'refund' ? (
                  <Link
                    to="/track"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand/50"
                  >
                    <Icon n="search" className="size-3.5 text-brand" />
                    {t('track.title')}
                  </Link>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-2xl border border-line bg-bg px-4 py-3 text-[12px] leading-relaxed text-dim">
          {t('legal.foot', { mail: SUPPORT_MAIL })}
        </p>
      </div>
    </div>
  )
}
