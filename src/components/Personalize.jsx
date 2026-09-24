import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store/StoreContext'
import { PERSONAL_LIMITS, sanitizePersonal } from '../data/deliverable'
import { Btn, Icon } from './ui'

/**
 * حقول التخصيص الاختياري. تُكتب مرة واحدة فتُطبع في ملفات الحزمة لحظة التوليد.
 *
 * نسخة واحدة من هذه الحقول تظهر في صفحة المنتج (مختصرة) وفي خطوة الدفع (كاملة)،
 * والمخزن واحد (`personal` في StoreContext)، فالذي يُكتب هنا يصل إلى الطلب، ومن
 * الطلب إلى `packageFiles` في `src/data/deliverable.js` — لا نسخة ثانية من النص
 * ولا حقل يزيّين الشاشة بلا أثر.
 */
export const PERSONAL_FIELDS = [
  { k: 'name', label: 'personal.name', autoComplete: 'name', wide: true },
  { k: 'role', label: 'personal.role' },
  { k: 'email', label: 'personal.email', type: 'email', autoComplete: 'email' },
  { k: 'phone', label: 'personal.phone', dir: 'ltr', mode: 'tel', autoComplete: 'tel' },
  { k: 'website', label: 'personal.site', dir: 'ltr', mode: 'url', autoComplete: 'url' },
  { k: 'bio', label: 'personal.bio', wide: true, multiline: true },
]

const PH = {
  name: { ar: 'سارة العتيبي', en: 'Sarah Al-Otaibi' },
  role: { ar: 'مصممة واجهات · UI/UX', en: 'Product designer · UI/UX' },
  email: { ar: 'sara@studio.com', en: 'sara@studio.com' },
  phone: { ar: '+966 5X XXX XXXX', en: '+966 5X XXX XXXX' },
  website: { ar: 'sara.dev', en: 'sara.dev' },
  bio: {
    ar: 'أصمّم واجهات للمنتجات المالية منذ ست سنوات، وأسلّم نظام تصميم موثّقًا.',
    en: 'Six years designing interfaces for fintech products, shipped with a documented design system.',
  },
}

export default function Personalize({ compact = false, className = '' }) {
  const { t, lang } = useI18n()
  const { personal, setPersonal, resetPersonal } = useStore()
  const [cleared, setCleared] = useState(null)
  const on = !!personal.on
  // يبقى الحقل محفوظًا بعد إلغاء التحديد: فالمسح إذن فعلٌ مستقل له زرّه
  const dirty = PERSONAL_FIELDS.some((f) => String(personal[f.k] || '').length > 0) || on
  const type = (k, v) => {
    if (cleared) setCleared(false)
    setPersonal({ [k]: v })
  }
  // ما سيُحقن فعلًا بعد التنقية — نفس الدالة التي يستعملها الخادم قبل الكتابة
  const going = on ? sanitizePersonal(personal) : null
  const shown = going ? Object.entries(going).filter(([k]) => k !== 'on') : []
  // كتبتَ شيئًا ولم يُقبل: نقولها على الحقل نفسه، لا بعد التنزيل
  const dropped = (k) => on && String(personal[k] || '').trim() && !(going || {})[k]

  return (
    <div id="personalize" className={`rounded-2xl border ${on ? 'border-brand/40 bg-brand/[0.04]' : 'border-line bg-bg'} p-4 ${className}`}>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setPersonal({ on: e.target.checked })}
          className="mt-0.5 size-4 shrink-0 accent-[var(--c-brand)]"
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-display text-[14.5px] font-extrabold">
              <Icon n="spark" className="size-4 text-brand" />
              {t('personal.title')}
            </span>
            <span className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10.5px] font-bold text-dim">{t('personal.optional')}</span>
          </span>
          <span className="mt-1 block text-[11.5px] leading-relaxed text-dim">{on ? t('personal.note') : t('personal.off')}</span>
        </span>
      </label>

      {on ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PERSONAL_FIELDS.map((fd) => (
              <label key={fd.k} className={`block ${fd.wide ? 'sm:col-span-2' : ''}`}>
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-dim">{t(fd.label)}</span>
                {dropped(fd.k) ? (
                  <span role="alert" className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-danger">
                    <Icon n="close" className="size-3" sw={2.6} />
                    {t('personal.dropped')}
                  </span>
                ) : null}
                {fd.multiline ? (
                  <textarea
                    id={`pe-${fd.k}`}
                    name={fd.k}
                    rows={compact ? 2 : 3}
                    maxLength={PERSONAL_LIMITS[fd.k]}
                    value={personal[fd.k] || ''}
                    placeholder={PH[fd.k][lang]}
                    onChange={(e) => type(fd.k, e.target.value)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13.5px] leading-relaxed outline-none transition focus:border-brand/60"
                  />
                ) : (
                  <input
                    id={`pe-${fd.k}`}
                    name={fd.k}
                    type={fd.type || 'text'}
                    inputMode={fd.mode}
                    dir={fd.dir}
                    autoComplete={fd.autoComplete}
                    maxLength={PERSONAL_LIMITS[fd.k]}
                    value={personal[fd.k] || ''}
                    placeholder={PH[fd.k][lang]}
                    onChange={(e) => type(fd.k, e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-panel px-3 text-[13.5px] outline-none transition focus:border-brand/60"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line bg-panel/70 px-3 py-2 text-[11.5px] leading-relaxed text-dim">
            <Icon n="check" className="size-3.5 shrink-0 text-brand" sw={2.8} />
            <span className="font-bold text-ink/80">{t('personal.preview')}</span>
            {shown.length ? (
              <span className="min-w-0">{shown.map(([k, v]) => `${t(k === 'website' ? 'personal.site' : `personal.${k}`)}: ${v}`).join(' · ')}</span>
            ) : (
              <span>{t('personal.previewEmpty')}</span>
            )}
          </div>
          {!compact ? <p className="mt-2 text-[11px] leading-relaxed text-dim">{t('personal.autofill')}</p> : null}
        </>
      ) : null}

      {dirty ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <Link to="/privacy" className="text-[11.5px] font-semibold text-brand hover:underline">
            {t('personal.privacy')}
          </Link>
          <Btn
            variant="outline"
            size="sm"
            className="!h-8 !px-2.5 !text-[11.5px]"
            onClick={() => {
              resetPersonal()
              setCleared({ sites: 0 })
              // مواقع الاستضافة تحمل النصوص نفسها: تُمسح من الجهاز في اللحظة نفسها، ويُبلَّغ عددها
              import('../api/hosting').then((m) => setCleared(m.sites.eraseAll())).catch(() => setCleared({ sites: 0 }))
            }}
          >
            <Icon n="close" className="size-3.5" sw={2.6} />
            {t('personal.clear')}
          </Btn>
        </div>
      ) : null}
      {cleared ? (
        <p role="status" className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-dim">
          <Icon n="check" className="mt-px size-3.5 shrink-0 text-brand" sw={2.8} />
          <span>
            {t('personal.cleared')}
            {cleared.sites ? t('personal.clearedSites', { n: cleared.sites }) : ''}
          </span>
        </p>
      ) : null}
    </div>
  )
}
