import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useI18n, moneyParts } from '../i18n'
import { useStore } from '../store/StoreContext'

/* ============================ icons ============================ */
const P = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.2l1.6 9.4a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 2-1.6L20.5 7H6" />
      <circle cx="10" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />,
  check: <path d="m4 12.5 5 5L20 6.5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h11" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  moon: <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5Z" />,
  star: <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8L12 3.6Z" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 12h10" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5h6v2" />
      <path d="M3 12h18" />
    </>
  ),
  cap: (
    <>
      <path d="m3 9 9-4 9 4-9 4-9-4Z" />
      <path d="M7 11v4c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M5 17h13" />
    </>
  ),
  code: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </>
  ),
  pulse: <path d="M3 12h4l2-5 3 10 2-5h7" />,
  crown: (
    <>
      <path d="m4 8 3 8h10l3-8-5 3-3-5-3 5-5-3Z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5H6a2 2 0 0 0-2 2v9" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12.5h2" />
    </>
  ),
  bank: (
    <>
      <path d="m4 9 8-5 8 5" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
      <path d="M4 20h16" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 6h14M5 12h14M5 18h9" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  spark: <path d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.6 10.4 11.2 6 9.6 10.4 8 12 3.5Z" />,
  quote: (
    <path d="M9 6c-3 1.4-4.5 3.8-4.5 7.2 0 2.6 1.4 4.3 3.4 4.3 1.8 0 3-1.3 3-3.1 0-1.7-1.1-2.9-2.7-2.9-.3 0-.6 0-.8.1.3-1.6 1.4-2.8 3-3.6L9 6Zm9 0c-3 1.4-4.5 3.8-4.5 7.2 0 2.6 1.4 4.3 3.4 4.3 1.8 0 3-1.3 3-3.1 0-1.7-1.1-2.9-2.7-2.9-.3 0-.6 0-.8.1.3-1.6 1.4-2.8 3-3.6L18 6Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: <path d="M6 3h3l2 5-2.4 1.5a11 11 0 0 0 5.9 5.9L16 13l5 2v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />,
  pin: (
    <>
      <path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4c2.6 3 2.6 13 0 16-2.6-3-2.6-13 0-16Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h7l5 5v13H6V3Z" />
      <path d="M13 3v5h5" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  palette: (
    <>
      <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.4 3.4c.6.7.2 2.6-2.6 2.6Z" />
      <circle cx="8" cy="10" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16" cy="10" r="1" />
    </>
  ),
  type: (
    <>
      <path d="M5 6h14" />
      <path d="M12 6v13" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4.5L4 9" />
      <path d="M4 13a8 8 0 0 0 14 4.5L20 15" />
      <path d="M4 5v4h4M20 19v-4h-4" />
    </>
  ),
  bolt: <path d="M13 3 5 14h5l-1 7 8-11h-5l1-7Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14v3" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="9" width="17" height="11" rx="2" />
      <path d="M3.5 13h17M12 9v11" />
      <path d="M8.5 9a2.5 2.5 0 1 1 0-5C10.5 4 12 9 12 9M15.5 9a2.5 2.5 0 1 0 0-5C13.5 4 12 9 12 9" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m4 12.5 8 4.3 8-4.3" />
      <path d="m4 16.8 8 4.2 8-4.2" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5h3.5L8.5 6h7L17.5 8.5H21v11H3v-11Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
      <path d="M17 3.5 20.5 7" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m10.4 9 5 3-5 3V9Z" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16.5V20" />
    </>
  ),
  tablet: (
    <>
      <rect x="5.5" y="3" width="13" height="18" rx="2.4" />
      <path d="M11 18h2" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
      <path d="M11 19h2" />
    </>
  ),
  rocket: (
    <>
      <path d="M13.5 4.5C16 2 20 3 20 3s1 4-1.5 6.5L14 14l-4-4 3.5-5.5Z" />
      <path d="m10 14-4 4M6.5 10.5 4 11l2 2 2-2-1.5-.5ZM13.5 17.5 13 20l-2-2 .5-2 2 1.5Z" />
    </>
  ),
  cursor: <path d="M6 3.5 17 11l-4.6 1.2L15 18l-2.6 1.2-2.6-5.6L6 16V3.5Z" />,
  code2: (
    <>
      <path d="m8.5 8-4 4 4 4" />
      <path d="m15.5 8 4 4-4 4" />
      <path d="M13 5.5 11 18.5" />
    </>
  ),
}

export function Icon({ n, className = '', sw = 1.6, fill = false, style, ...rest }) {
  const d = P[n] || P.spark
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {d}
    </svg>
  )
}

/* ============================ money ============================ */
export function Money({ v, size = 'text-base', unitClass = 'text-[0.72em] opacity-70' }) {
  const { lang } = useI18n()
  const { value, unit } = moneyParts(v, lang)
  return (
    <span className={`${size} inline-flex items-baseline gap-1 font-semibold`}>
      <span className="num">{value}</span> {/* مسافةٌ نصيّة: «199 ر.س» في النسخ واللصق وقارئ الشاشة، لا «199ر.س» */}
      <span className={`${unitClass} font-medium`}>{unit}</span>
    </span>
  )
}

/* ============================ stars ============================ */
export function Stars({ value = 5, size = 13, show = true }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  const gap = 3
  const total = size * 5 + gap * 4
  const row = (cls) => (
    <span className={`flex items-center ${cls}`} style={{ gap }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} n="star" sw={1.3} fill className="shrink-0" style={{ width: size, height: size }} />
      ))}
    </span>
  )
  return (
    // النجوم مرسومة زخرفية (aria-hidden)، والقيمة المعلنة على الحاوية نفسها role=img
    // فلا يخرج التقييم من قارئ الشاشة حين يُخفى الرقم المرئي (show=false)
    <span className="inline-flex items-center gap-1.5" title={`${value} / 5`} role="img" aria-label={`${value} / 5`}>
      <span className="relative inline-block leading-none" style={{ width: total, height: size }} aria-hidden="true">
        <span className="absolute inset-0 opacity-20">{row('text-ink')}</span>
        <span className="absolute inset-y-0 start-0 overflow-hidden text-gold" style={{ width: `${(pct / 100) * total}px` }}>
          {row('')}
        </span>
      </span>
      {show && <span className="num text-xs font-semibold opacity-80">{value.toFixed(1)}</span>}
    </span>
  )
}

/* ============================ button ============================ */
const BTN = {
  primary: 'bg-brand text-brandink hover:bg-brand2 shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--c-brand)_70%,transparent)]',
  dark: 'bg-ink text-bg hover:opacity-90',
  outline: 'border border-line bg-panel/40 hover:bg-panel2 text-ink',
  ghost: 'hover:bg-panel2/70 text-ink',
  gold: 'bg-gold text-[#1b1405] hover:brightness-105',
}
const SIZE = {
  // xs كانت تنقص من الجدول فتحصل أزرارُ العيّنات (سيرة نموذجية / إعلان نموذجي) على
  // صنف "undefined" بلا ارتفاعٍ ولا مسافةٍ بين الأيقونة والنصّ — فبدا أيقونتُها مكسورة.
  xs: 'h-7 px-2.5 text-[11.5px] gap-1 rounded-md',
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-6 text-[15px] gap-2.5 rounded-xl py-3.5',
}

export function Btn({ as, to, href, variant = 'primary', size = 'md', className = '', children, type, ...rest }) {
  const cls = `inline-flex select-none items-center justify-center font-semibold transition-all duration-200 active:scale-[.975] disabled:opacity-50 disabled:pointer-events-none ${BTN[variant]} ${SIZE[size]} ${className}`
  if (to)
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  if (href)
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    )
  const Cmp = as || 'button'
  // default to "button" so a Btn inside a <form> never submits by accident
  return (
    <Cmp className={cls} type={Cmp === 'button' ? type || 'button' : type} {...rest}>
      {children}
    </Cmp>
  )
}

/* ============================ pill / badge ============================ */
export function Pill({ children, tone = 'line', className = '' }) {
  const tones = {
    line: 'border border-line bg-panel/60 text-dim',
    brand: 'bg-brand/12 text-brand border border-brand/25',
    gold: 'bg-gold/14 text-gold border border-gold/30',
    solid: 'bg-ink text-bg',
    glass: 'border border-line/70 bg-bg/50 backdrop-blur text-ink',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

/* ============================ skeleton ============================ */
export function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return <div className={`animate-pulse bg-panel2 ${rounded} ${className}`} aria-hidden="true" />
}

export function PreviewSkeleton({ variant = 'cv', ratio, className = '', style, label }) {
  const ar = ratio || (variant === 'site' ? 1280 / 820 : '1 / 1.4142')
  return (
    <div
      className={`relative overflow-hidden bg-panel2 ${className}`}
      style={{ aspectRatio: ar, ...style }}
      aria-label={label ? `${'…'}` : undefined}
      role="presentation"
    >
      <div className="absolute inset-0 animate-pulse p-[7%]">
        <div className="h-[9%] w-[42%] rounded bg-line" />
        <div className="mt-[4%] h-[5%] w-[62%] rounded bg-line/70" />
        <div className="mt-[10%] h-[5%] w-[88%] rounded bg-line/50" />
        <div className="mt-[3%] h-[5%] w-[74%] rounded bg-line/50" />
        <div className="mt-[3%] h-[5%] w-[81%] rounded bg-line/40" />
        <div className="mt-[10%] grid grid-cols-3 gap-[4%]">
          <div className="aspect-[4/3] rounded bg-line/45" />
          <div className="aspect-[4/3] rounded bg-line/35" />
          <div className="aspect-[4/3] rounded bg-line/25" />
        </div>
      </div>
    </div>
  )
}

/**
 * هيكل بطاقة قالب أثناء التحميل — نسخةٌ طبق الأصل من `TemplateCard` في الأبعاد:
 * نفسُ الحشو والإطار ونسبةِ المعاينة، ثم اسمٌ (h3)، ووصفٌ بسطرين، وسطرُ السعر،
 * وسطرُ التصنيف، وصفُّ الزرّين بارتفاع h-9 — فلا تقفز الشبكة (CLS) حين تصل
 * البطاقات الحقيقية. الحركة من `animate-pulse` وحده، وتخضع لـ`prefers-reduced-motion`.
 */
export function TemplateCardSkeleton({ className = '' }) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel p-2.5 ${className}`}
      aria-hidden="true"
      data-card-skeleton
    >
      <PreviewSkeleton variant="site" className="rounded-xl" />
      <div className="flex flex-1 flex-col px-1.5 pt-3.5">
        {/* الاسم: 17px بسطرٍ مضغوط */}
        <div className="h-[21px] w-2/5 animate-pulse rounded bg-panel2" data-sk="name" />
        {/* الوصف: سطران بارتفاع 12.5px × 1.625 */}
        <div className="mt-1 space-y-1.5 py-[3px]" data-sk="desc">
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-panel2/70" />
          <div className="h-3.5 w-3/5 animate-pulse rounded bg-panel2/60" />
        </div>
        {/* السعر */}
        <div className="mt-2.5 h-7 w-1/2 animate-pulse rounded bg-panel2" data-sk="price" />
        {/* التصنيف والتقييم */}
        <div className="mt-2.5 flex items-center gap-2" data-sk="meta">
          <div className="h-5 w-20 animate-pulse rounded bg-panel2/60" />
          <div className="h-5 w-12 animate-pulse rounded bg-panel2/50" />
          <div className="ms-auto h-4 w-16 animate-pulse rounded bg-panel2/40" />
        </div>
        {/* الزرّان */}
        <div className="mt-auto pt-3.5" data-sk="actions">
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
            <div className="h-9 animate-pulse rounded-lg bg-panel2/70" />
            <div className="h-9 animate-pulse rounded-lg bg-panel2" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ضماناتُ الشراء — أربعةُ أسطرٍ قصيرة تُوضع بجانب كلِّ زرِّ شراءٍ رئيسي (صفحة القالب،
 * السلة، الدفع). كلُّ سطرٍ منها وعدٌ ينفّذه المتجر فعلًا: التسليم من بوابة التسليم
 * الموقّعة بعد تأكيد الدفع، والترخيص نصٌّ منشور في /licensing، والدعم على بريد
 * المتجر، والتحديثات لنفس بريد الطلب. رابطُ الترخيص حقيقي، لا زخرفة.
 */
export function AssureRow({ className = '' }) {
  const { t } = useI18n()
  const items = [
    ['bolt', t('assure.instant'), null],
    ['shield', t('assure.licence'), '/licensing'],
    ['mail', t('assure.support'), '/contact'],
    ['refresh', t('assure.updates'), null],
  ]
  return (
    <ul aria-label={t('assure.label')} data-assure className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] font-semibold text-dim ${className}`}>
      {items.map(([ic, label, to]) => (
        <li key={ic} className="flex min-w-0 items-center gap-1.5">
          <Icon n={ic} className="size-3.5 shrink-0 text-brand" />
          {to ? (
            <Link to={to} className="underline-offset-2 transition hover:text-brand hover:underline">
              {label}
            </Link>
          ) : (
            <span>{label}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/* ============================ scroll reveal ============================ */
/**
 * إعدادات مراقب الظهور — مصدرٌ واحد لكلِّ من يُشعل حركةً عند الوصول (بطاقاتُ
 * `Reveal` وعدّادات الرئيسية على السواء). والغايةُ ألّا يرتبط الظهورُ بالوصول نفسه:
 *
 * - `rootMargin: '150px 0px'` توسّع منطقةَ الرصد 150px من أعلى وأسفل —
 *   فيبدأ الانتقالُ قبل أن يبلغ العنصرُ حدَّ الشاشة، ولا يظهر «مقفلًا» لحظةَ
 *   دخوله ثم يقفز. (اليمينُ واليسار صفرًا: التوسّعُ رأسيّ لا أفقيّ.)
 * - `threshold: 0.1` تكفي معها عُشرُ البطاقة ليُعدّ السطرُ ظاهرًا.
 *
 * ولا يتكرّر الرقمان: من احتاج مراقبًا استوردهما من هنا.
 */
export const REVEAL_OBSERVER = { rootMargin: '150px 0px', threshold: 0.1 }

export function Reveal({ children, delay = 0, y = 22, className = '', as: Cmp = 'div' }) {
  const ref = useRef(null)
  // بدون IntersectionObserver لا معنى للانتظار: نظهر فورًا من الحالة الأولية
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      })
    }, REVEAL_OBSERVER)
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Cmp
      ref={ref}
      className={`${seen ? 'reveal reveal-in' : 'reveal'} ${className}`}
      style={{ transitionDelay: `${delay}ms`, transform: seen ? undefined : `translateY(${y}px)` }}
    >
      {children}
    </Cmp>
  )
}

/* ============================ section heading ============================ */
export function Head({ kicker, title, sub, align = 'start', right, as = 'h2' }) {
  const TitleTag = as
  return (
    <div
      className={`flex flex-col gap-4 ${align === 'center' ? 'items-center text-center' : 'items-start'} md:flex-row md:items-end md:justify-between`}
    >
      <div className={`max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>
        {kicker && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            <Icon n="spark" className="size-3.5" fill sw={0} />
            {kicker}
          </div>
        )}
        <TitleTag className="text-3xl leading-[1.15] font-extrabold text-slate-100 sm:text-4xl md:text-[2.6rem] light:text-ink">{title}</TitleTag>
        {sub && <p className="mt-3 text-[15px] leading-relaxed text-slate-200 light:text-slate-600">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ============================ toasts ============================ */
export function Toasts() {
  const { toasts, dismissToast } = useStore()
  const { t } = useI18n()
  if (!toasts.length) return null
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4">
      {toasts.map(({ id, msg, action }) => (
        <div
          key={id}
          className="pointer-events-auto flex w-full max-w-sm animate-[pop_.35s_cubic-bezier(.2,.9,.3,1.4)] items-center gap-3 rounded-xl border border-line bg-panel/95 px-3.5 py-2.5 shadow-lift backdrop-blur"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
            <Icon n="check" className="size-4" sw={2.4} />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium">{msg}</p>
          {action && (
            <Link to={action.to} onClick={() => dismissToast(id)} className="shrink-0 text-[13px] font-bold text-brand hover:underline">
              {action.label || t('toast.viewCart')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => dismissToast(id)}
            aria-label={t('nav.close')}
            className="shrink-0 rounded-md p-1 text-dim hover:bg-panel2 hover:text-ink"
          >
            <Icon n="close" className="size-3.5" sw={2} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ============================ wishlist heart ============================ */
export function Heart({ id, className = '' }) {
  const { wish, toggleWish, toast } = useStore()
  const { t } = useI18n()
  const on = wish.includes(id)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t('wishlist.saved') : t('wishlist.save')}
      title={on ? t('wishlist.saved') : t('wishlist.save')}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleWish(id)
        toast(on ? t('toast.wishRemoved') : t('toast.wishAdded'))
      }}
      className={`grid size-9 place-items-center rounded-full border transition ${
        on ? 'border-danger/40 bg-danger/12 text-danger' : 'border-line bg-bg/70 text-dim backdrop-blur hover:text-ink'
      } ${className}`}
    >
      <Icon n="heart" className="size-4" fill={on} sw={1.7} />
    </button>
  )
}
