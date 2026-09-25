import { useState } from 'react'
import { useI18n, dec, num } from '../i18n'
import { PLANS, gainedBy, vatOf, yearlyAsMonths } from '../data/plans'
import { Btn, Icon, Money, Pill, Reveal } from './ui'

/**
 * جدول الاشتراكات الموحّد — الدرجات الثلاث بمصدر واحد.
 *
 * هذا المكوّن هو الوجهُ الوحيد لجدول src/data/plans.js: تقرؤه صفحة الخطط
 * (/pricing) وقسمُ الأسعار في الرئيسية معًا، فلا يُكتب سطرُ ميزةٍ في صفحةٍ ويُنسى
 * في الأخرى. كلُّ رقمٍ هنا من الجدول، وكلُّ زرٍّ يقود إلى مكانٍ يفعل الشيء فعلًا:
 * المجانية إلى صفحة الاستضافة (تُبنى هناك صفحةٌ حيّة)، والمدفوعة إلى الحساب حيث
 * يُسجَّل التفعيل — ولا بوابة دفع في هذه النسخة، فالزرّ يقول ذلك.
 *
 * ومفتاح الفوترة (شهري/سنوي) يحوّل السعر والسطر تحته معًا: «سنةٌ بسعر كذا شهرًا»
 * محسوبةٌ من الجدول (`yearlyAsMonths`) لا مكتوبةٌ يدويًا.
 */
export default function PlanCards({ toggle = true, className = '' }) {
  const { t, L, LA } = useI18n()
  const [yearly, setYearly] = useState(false)

  const Toggle = toggle ? (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-panel/60 p-1" role="group" aria-label={t('plans.billing')}>
      {[
        { k: false, s: t('plans.monthly') },
        { k: true, s: t('plans.yearly') },
      ].map((o) => (
        <button
          key={String(o.k)}
          type="button"
          aria-pressed={yearly === o.k}
          onClick={() => setYearly(o.k)}
          className={`h-9 rounded-lg px-3.5 text-[12.5px] font-bold transition ${yearly === o.k ? 'bg-ink text-bg' : 'text-dim hover:text-ink'}`}
        >
          {o.s}
        </button>
      ))}
    </div>
  ) : null

  return (
    <div className={className} data-plan-cards>
      {Toggle}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {PLANS.map((p, k) => {
          const price = yearly && p.yearly ? p.yearly : p.price
          const per = yearly && p.yearly ? t('plans.perYear') : p.period ? t('plans.perMonth') : ''
          const gained = gainedBy(p.id)
          return (
            <Reveal key={p.id} delay={k * 70} className="h-full">
              <article
                data-plan={p.id}
                id={p.id === 'pro' ? 'pro' : undefined}
                className={`relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
                  p.id === 'pro' ? 'border-brand/45 bg-panel shadow-lift' : 'border-line bg-panel/60 hover:border-brand/25'
                }`}
              >
                {p.id === 'pro' ? (
                  <Pill tone="brand">{t('plans.mostComplete')}</Pill>
                ) : p.id === 'plus' ? (
                  <Pill tone="gold">{t('plans.mostPicked')}</Pill>
                ) : (
                  <span />
                )}
                <h3 className="mt-3 font-display text-[20px] font-extrabold">{L(p.name)}</h3>
                <p className="mt-1.5 min-h-10 text-[12.5px] font-semibold leading-relaxed text-dim">{L(p.tagline)}</p>

                <div className="mt-4 flex items-end gap-2">
                  {p.price === 0 ? (
                    <span className="font-display text-[34px] font-black leading-none">{t('plans.free')}</span>
                  ) : (
                    <Money v={price} size="text-[34px]" />
                  )}
                  <span className="num mb-1 text-[12px] font-bold text-dim">{per}</span>
                </div>
                {p.price > 0 ? (
                  <p className="num mt-1 text-[11.5px] text-dim">
                    {yearly && p.yearly ? t('plans.yearlyAs', { m: dec(yearlyAsMonths(p.id), 1) }) : t('plans.vatIn', { v: num(vatOf(price)) })}
                  </p>
                ) : (
                  <p className="mt-1 text-[11.5px] text-dim">{t('plans.noCard')}</p>
                )}

                <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
                  {LA(p.bullets).map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink">
                      <Icon n="check" className="mt-0.5 size-3.5 shrink-0 text-[#3ecf8e]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {gained.length > 0 ? (
                  <p className="mt-4 rounded-xl border border-line bg-bg/60 px-3 py-2 text-[11.5px] font-semibold text-dim">
                    {t('plans.opensOverFree', { n: gained.length })}
                  </p>
                ) : null}

                <Btn
                  to={p.id === 'free' ? '/host' : `/account?plan=${p.id}`}
                  variant={p.id === 'pro' ? 'primary' : 'outline'}
                  size="lg"
                  className="mt-5 w-full"
                >
                  {L(p.cta)}
                </Btn>
              </article>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
