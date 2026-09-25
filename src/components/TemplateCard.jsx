import { Link } from 'react-router-dom'
import Preview from './Preview'
import { Icon, Money, Pill, Stars, Heart } from './ui'
import { useI18n } from '../i18n'
import { useStore } from '../store/StoreContext'
import { categories } from '../data/templates'

const typeLabel = {
  portfolio: { ar: 'موقع', en: 'Site' },
  cv: { ar: 'سيرة', en: 'CV' },
  bundle: { ar: 'حزمة', en: 'Bundle' },
}

/**
 * بطاقة القالب في المعرض — كلُّ حقلٍ في عنصرٍ مستقل، لا عقدةٌ نصيّةٌ واحدة.
 *
 * المشكلةُ الأصلية: كان الاسمُ والتصنيفُ والوصفُ والسعرُ تتجاور بلا فاصل، فتُقرأ
 * عند استخراج نصِّ الصفحة كلمةً واحدة («أثيربورتفوليو…» و«منظومة التوظيف9»).
 * البنيةُ الآن، من الأعلى إلى الأسفل:
 *
 *   [المعاينة]                                   ← رابطٌ إلى صفحة القالب
 *   <h3  data-tpl-name>   أثير                    ← الاسم وحده
 *   <p   data-tpl-desc>   بورتفوليو للمصممين…     ← الوصف وحده
 *   <span data-tpl-price> 199 ر.س — ترخيص لمرة واحدة   (والقديمُ مشطوبًا «بدل 249»)
 *   <div data-tpl-cat>    التصنيف · النوع · التقييم  ← شاراتٌ منفصلة
 *   [معاينة حية] [أضف للسلة]                     ← صفٌّ واحد بعمودين
 *
 * الفواصل («—» و«·») مكتوبةٌ في النصِّ نفسه لا في الهوامش، وبين كلِّ عنصرين مسافةٌ
 * نصيّةٌ حقيقية (`{' '}`): `textContent` يلصق العناصر الكتليّة ببعضها، وهو ما تقرؤه
 * أدواتُ الفحص ومحرّكاتُ البحث والنسخ واللصق — فلا «أثيربورتفوليو» في أيٍّ منها.
 * و`TemplateCardSkeleton` في ui.jsx نسخةٌ من هذه البنية بالأبعاد نفسها.
 */
export default function TemplateCard({ tpl, onQuick, className = '' }) {
  const { t, lang, L } = useI18n()
  const { add, inCart, toast } = useStore()
  const hasCart = inCart(tpl.id)
  const off = tpl.oldPrice ? Math.round((1 - tpl.price / tpl.oldPrice) * 100) : 0
  const cat = categories.find((c) => tpl.cats.includes(c.id))
  const kind = typeLabel[tpl.type] || typeLabel.portfolio
  const href = `/template/${tpl.slug}`

  const doAdd = () => {
    const fresh = add(tpl.id)
    toast(fresh ? `${t('toast.cartAdded')} — ${L(tpl.name)}` : t('catalog.inCart'))
  }

  return (
    <article
      data-tpl-card={tpl.id}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel p-2.5 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/35 hover:shadow-lift ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-20 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" data-tpl-badges>
          {tpl.best && <Pill tone="solid">{t('card.best')}</Pill>}
          {tpl.isNew && <Pill tone="brand">{t('card.new')}</Pill>}
          {off > 0 && (
            <Pill tone="gold">
              {t('card.off')} {off}٪
            </Pill>
          )}
        </div>
        <Heart id={tpl.id} className="pointer-events-auto" />
      </div>

      <Link to={href} className="relative block overflow-hidden rounded-xl" aria-label={`${t('card.view')} — ${L(tpl.name)}`}>
        <Preview tpl={tpl} device="desktop" className="transition-transform duration-500 group-hover:scale-[1.02]" style={{ borderRadius: 10 }} />
        {onQuick ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-center bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onQuick(tpl)
              }}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-[#0b0d12] shadow-soft transition hover:bg-white"
            >
              <Icon n="eye" className="size-3.5" />
              {t('card.quick')}
            </button>
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col px-1.5 pt-3.5">
        {/* ١. الاسم — عنوان البطاقة وحده */}
        <h3 data-tpl-name className="font-display text-[17px] font-extrabold leading-tight text-ink">
          <Link to={href} className="transition hover:text-brand">
            {L(tpl.name)}
          </Link>
        </h3>{' '}
        {/* ٢. الوصف — سطرٌ مستقل */}
        <p data-tpl-desc className="mt-1 text-[12.5px] leading-relaxed text-dim">
          {L(tpl.tagline)}
        </p>{' '}
        {/* ٣. السعر — «199 ر.س — ترخيص لمرة واحدة»، والقديمُ مشطوبًا إن وُجد */}
        <span data-tpl-price className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[12px]">
          <Money v={tpl.price} size="text-[19px]" />
          <span className="font-bold text-dim" aria-hidden="true">
            —
          </span>{' '}
          <span data-tpl-licence className="font-bold text-ink/80">
            {t('card.oneTime')}
          </span>
          {tpl.oldPrice ? (
            <>
              {' '}
              <span className="text-dim" aria-hidden="true">
                ·
              </span>{' '}
              <s className="num text-[11px] font-medium text-dim">{t('card.was', { n: tpl.oldPrice })}</s>
            </>
          ) : null}
        </span>{' '}
        {/* ٤. الشارات — التصنيف والنوع والتقييم في عنصرٍ مستقل بعد السعر */}
        <div data-tpl-cat className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-brand">
          {cat ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon n={cat.icon} className="size-3.5" />
              {lang === 'ar' ? cat.ar : cat.en}
            </span>
          ) : null}
          <span className="font-bold text-dim" aria-hidden="true">
            ·
          </span>{' '}
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-bg/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-dim">
            <Icon n={tpl.type === 'cv' ? 'file' : tpl.type === 'bundle' ? 'layers' : 'globe'} className="size-3" />
            {lang === 'ar' ? kind.ar : kind.en}
          </span>{' '}
          <span className="num ms-auto inline-flex items-center gap-1 text-[11px] font-semibold text-dim">
            <Stars value={tpl.rating} size={11} show={false} /> {tpl.reviews} {t('misc.reviews')}
          </span>
        </div>{' '}
        {/* ٥. زرّانِ صريحان في صفٍّ واحد — mt-auto يُلصقهما بالأسفل فتتساوى ارتفاعات الشبكة */}
        <div className="mt-auto pt-3.5">
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3" data-tpl-actions>
            <Link
              to={href}
              data-tpl-live
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-bg/60 text-[12.5px] font-bold text-ink transition hover:border-brand/40 hover:text-brand"
            >
              <Icon n="eye" className="size-3.5" />
              {t('card.live')}
            </Link>{' '}
            {hasCart ? (
              <Link
                to="/cart"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand/50 bg-brand/15 text-[12.5px] font-bold text-brand transition hover:bg-brand/25"
              >
                <Icon n="check" className="size-3.5" sw={2.6} />
                {t('catalog.inCart')}
              </Link>
            ) : (
              <button
                type="button"
                onClick={doAdd}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-ink text-[12.5px] font-bold text-bg transition hover:bg-brand light:bg-brand light:text-brandink"
              >
                <Icon n="cart" className="size-3.5" />
                {t('product.addCart')}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
