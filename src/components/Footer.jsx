import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { subscribe, apiMode } from '../api'
import { categories } from '../data/templates'
import { SOCIAL, SUPPORT_MAIL } from '../data/contact'
import { COMPANY, VAT_RATE, isSet } from '../data/company'
import { Btn, Icon } from './ui'
import { Logo } from './Navbar'

export default function Footer() {
  const { t, lang } = useI18n()
  const year = new Date().getFullYear()

  const cols = [
    {
      head: t('footer.shop'),
      links: [
        { to: '/templates', label: t('footer.allTemplates') },
        { to: '/free', label: t('footer.free') },
        { to: '/services', label: t('nav.services') },
        { to: '/offers', label: t('nav.offers') },
        { to: '/host', label: t('nav.host') },
        ...categories.slice(0, 4).map((c) => ({ to: `/templates?cat=${c.id}`, label: lang === 'ar' ? c.ar : c.en })),
        // درجةُ الاشتراك كلُّها في قسمٍ واحد على الرئيسية — ورابطُ «Qalb Pro» كان
        // يقود إلى بطاقةٍ داخل القسم نفسه، فصار القسمُ نفسُه هو الوجه
        { to: '/#bundles', label: t('nav.pricing') },
        // نموذج الربح: الخطط الموحّدة وسوق المصممين
        { to: '/pricing', label: t('footer.plans') },
        { to: '/pricing#matrix', label: t('plans.matrixTitle') },
        { to: '/creators', label: t('footer.creators') },
      ],
    },
    {
      head: t('footer.resources'),
      links: [
        { to: '/#guide', label: t('footer.cvGuide') },
        { to: '/blog', label: t('footer.blog') },
        { to: '/ats', label: t('footer.atsCheck') },
        { to: '/#proof', label: t('footer.atsGuide') },
        { to: '/#deploy', label: t('footer.siteGuide') },
        { to: '/templates?type=cv', label: t('footer.coverLetter') },
        { to: '/#faq', label: t('footer.help') },
        { to: '/track', label: t('footer.track') },
      ],
    },
    {
      head: t('footer.careers'),
      links: [
        { to: '/match', label: t('footer.match') },
        { to: '/kit', label: t('footer.kit') },
        { to: '/talent', label: t('footer.talent') },
        { to: '/market', label: t('footer.market') },
        { to: '/embed', label: t('footer.embed') },
        { to: '/b2b', label: t('footer.b2b') },
      ],
    },
    {
      head: t('footer.company'),
      links: [
        { to: '/#story', label: t('footer.about') },
        { to: '/#testimonials', label: t('footer.stories') },
        { to: '/#contact', label: t('footer.contact') },
        { to: '/b2b', label: t('footer.b2b') },
        // قرارٌ معلن: بابُ الفريق معروضٌ هنا، والحماية كلمةُ السر لا الإخفاء —
        // فالصفحة تبقى noindex وممنوعة في robots.txt وبعيدة عن sitemap.xml.
        // (حتى v1.9.0 كانت مكتوبةً في README بلا رابطٍ في الكود؛ هذا يطابقهما.)
        { to: '/admin', label: t('footer.admin') },
      ],
    },
    {
      head: t('footer.legal'),
      links: [
        // لكلِّ صفحةٍ قانونيةٍ مسارها منذ v1.8.0 — لا قسمٌ يُشارَك في صفحةٍ جامعة
        { to: '/terms', label: t('footer.terms') },
        { to: '/privacy', label: t('footer.privacy') },
        { to: '/refunds', label: t('footer.refund') },
        // نصُّ الترخيص في /licensing، والتحقق من المفتاح في /licence — صفحتان لغرضين
        { to: '/licensing', label: t('footer.license') },
        { to: '/licence', label: t('footer.licenceVerify') },
        { to: '/contact', label: t('legal.contactTitle') },
        { to: '/legal', label: t('legal.allPages') },
      ],
    },
  ]

  return (
    <footer className="relative mt-24 border-t border-line bg-bg2">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      <div className="page-x mx-auto max-w-[1400px] py-14">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <div className="isolate">
              <Logo />
            </div>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-dim">{t('footer.blurb')}</p>
            <div className="mt-5 rounded-2xl border border-line bg-panel p-4">
              <p className="text-[13.5px] font-bold">{t('footer.newsletter')}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('footer.newsletterSub')}</p>
              <Newsletter />
            </div>
            <div className="mt-5 flex items-center gap-2">
              {/* حسابات حقيقية من src/data/contact.js (تُضبط من .env) — لا روابط #contact ميتة */}
              {SOCIAL.map((s) => (
                <a
                  key={s.k}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={s.label}
                  title={s.label}
                  className="grid size-9 place-items-center rounded-xl border border-line bg-panel/60 text-dim transition hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand"
                >
                  <Social k={s.k} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {cols.map((c) => (
              <div key={c.head}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">{c.head}</p>
                <ul className="space-y-2">
                  {c.links.map((l, i) => (
                    <li key={i}>
                      <Link to={l.to} className="text-[13.5px] font-medium text-ink transition hover:text-brand">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div id="legal" className="mt-12 flex scroll-mt-24 flex-col gap-5 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[12.5px] text-dim">
            {t('footer.rights', { y: year })} · {t('footer.made')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {['mada', 'visa', 'mc', 'apple', 'stc'].map((p) => (
              <Pay key={p} k={p} />
            ))}
            {/* شهادة PCI لم تُمنَح لمتجر بلا بوابة دفع — ما يُقال بدلها هو ما يحدث فعلًا */}
            <span className="ms-1 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel/60 px-2 py-1 text-[11px] font-semibold text-dim">
              <Icon n="shield" className="size-3.5 text-brand" />
              {t('cart.secure')}
            </span>
          </div>
        </div>

        {/* الشريط القانوني: تواصلٌ وضريبةٌ معلنان — والحقلُ غير الموثَّق يقال «قيد
            التوثيق» ولا يُطبع رقمٌ لا يملكه أحد (نفسُ قاعدة عرض السعر في /b2b) */}
        <div
          id="legal-contact"
          className="mt-6 flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-line bg-panel/50 p-4 text-[12px] text-dim lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href={`mailto:${SUPPORT_MAIL}`} className="inline-flex items-center gap-1.5 font-bold text-ink transition hover:text-brand">
              <Icon n="mail" className="size-3.5 text-brand" />
              {SUPPORT_MAIL}
            </a>
            <span className="inline-flex items-center gap-1.5">
              <Icon n="pin" className="size-3.5 text-brand" />
              {lang === 'ar' ? COMPANY.address.ar : COMPANY.address.en}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon n="bank" className="size-3.5 text-brand" />
              {t('legal.contactVatIn', { p: Math.round(VAT_RATE * 100) })}
            </span>
            <span className="num inline-flex items-center gap-1.5">
              <Icon n="card" className="size-3.5 text-brand" />
              {t('legal.contactVatNumber')}: {isSet(COMPANY.vatNumber) ? COMPANY.vatNumber : t('legal.contactPending')}
            </span>
          </div>
          <nav aria-label={t('footer.legal')} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/terms" className="font-bold text-ink transition hover:text-brand">
              {t('footer.terms')}
            </Link>
            <Link to="/privacy" className="font-bold text-ink transition hover:text-brand">
              {t('footer.privacy')}
            </Link>
            <Link to="/refunds" className="font-bold text-ink transition hover:text-brand">
              {t('footer.refund')}
            </Link>
            <Link to="/licensing" className="font-bold text-ink transition hover:text-brand">
              {t('footer.license')}
            </Link>
            <Link to="/contact" className="font-bold text-ink transition hover:text-brand">
              {t('legal.contactTitle')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

const MAIL = SUPPORT_MAIL
const LIST = 'qalb.newsletter.v1'
const OK_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * There is no mailing provider here, so we do not claim a subscription.
 * The address is kept on the device (exportable from localStorage) and the
 * visitor gets a prefilled e-mail that really reaches the studio.
 */
function Newsletter() {
  const { t, lang } = useI18n()
  const [saved, setSaved] = useState('')
  const [onServer, setOnServer] = useState(false)
  const [mail, setMail] = useState('')
  const [err, setErr] = useState(false)

  async function ask(e) {
    e.preventDefault()
    const who = mail.trim().toLowerCase()
    if (!OK_MAIL.test(who)) {
      setErr(true)
      return
    }
    /**
     * بخادمٍ موصول يُكتب البريد في دفتر المشتركين على الخادم (مرةً واحدة،
     * ومكرَّرٌ لا يُعاد)؛ وبلا خادم يبقى على الجهاز كما كان — وفي الحالتين
     * يظلّ زرُّ البريد يعمل، فالوعدُ لا يتعلّق بمكان الحفظ.
     */
    if (apiMode === 'rest') {
      const r = await subscribe(who, { source: 'newsletter', locale: lang })
      setOnServer(!!r?.ok)
    }
    try {
      const all = JSON.parse(localStorage.getItem(LIST) || '[]')
      if (!all.includes(who)) localStorage.setItem(LIST, JSON.stringify([...all, who].slice(-50)))
    } catch {
      /* storage blocked — the mail link below still works, so we stay quiet about it */
    }
    setErr(false)
    setSaved(who)
  }

  return (
    <form className="mt-3" data-newsletter noValidate onSubmit={ask}>
      {saved ? (
        <>
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2.5 text-[13px] font-bold text-brand"
          >
            <Icon n="check" className="size-4" sw={2.4} />
            {onServer ? t('footer.subscribedServer') : t('footer.subscribed')}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{onServer ? t('footer.newsletterServerNote') : t('footer.newsletterNote')}</p>
          <Btn
            size="sm"
            variant="outline"
            className="mt-2.5"
            href={`mailto:${MAIL}?subject=${encodeURIComponent(t('footer.newsletter'))}&body=${encodeURIComponent(saved)}`}
          >
            <Icon n="mail" className="size-3.5" />
            {t('footer.sendMail')}
          </Btn>
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor="footer-mail">
            {t('footer.emailPh')}
          </label>
          <div className="flex gap-2">
            <input
              id="footer-mail"
              type="email"
              required
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              placeholder={t('footer.emailPh')}
              aria-invalid={err ? true : undefined}
              className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-[13px] outline-none transition focus:border-brand/50"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-xl bg-ink px-3.5 text-[13px] font-bold text-bg transition hover:opacity-90 light:bg-brand light:text-brandink"
            >
              {t('footer.subscribe')}
            </button>
          </div>
          {err ? (
            <p role="alert" className="mt-2 text-[12px] font-bold text-danger">
              {t('footer.emailBad')}
            </p>
          ) : null}
        </>
      )}
    </form>
  )
}

function Social({ k }) {
  const p = {
    x: <path d="M4 4l6.6 8.2L4.3 20H6l5.5-5.9L16 20h4l-6.9-8.6L19.6 4H18l-5.1 5.5L8.6 4H4Z" />,
    ig: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4.6" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17" cy="7" r="0.9" fill="currentColor" />
      </>
    ),
    li: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 10.5V16M8 7.8v.2M12 16v-3.2a2 2 0 0 1 4 0V16" />
      </>
    ),
    be: (
      <>
        <path d="M3.5 7.5h4.2a2.6 2.6 0 0 1 0 5.2H3.5V7.5Zm0 5.2h4.6a2.7 2.7 0 0 1 0 5.4H3.5v-5.4Z" />
        <path d="M14 9.5h5.4M13.4 14.2h6.4a3 3 0 0 1-3 3.2c-1.7 0-2.7-.9-3.4-3.2Z" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {p[k]}
    </svg>
  )
}

/* أسماء العلامات كما تُكتب عالميًا: بلا رموز خاصة (Private Use Area) لا تظهر إلا على نظام واحد */
const PAY_LABELS = { mada: 'mada', visa: 'VISA', mc: 'Mastercard', apple: 'Apple Pay', stc: 'stc pay' }

function Pay({ k }) {
  const label = PAY_LABELS[k]
  const iconOnly = k === 'mc' || k === 'apple'
  const art =
    k === 'mc' ? (
      <span className="flex items-center">
        <span className="size-3 rounded-full bg-[#eb001b]" />
        <span className="-ms-1.5 size-3 rounded-full bg-[#f79e1b]/90" />
      </span>
    ) : k === 'apple' ? (
      <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
        <path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8s-1.7-.8-2.8-.8c-1.4 0-2.7.9-3.5 2.2-1.5 2.6-.4 6.4 1 8.5.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.1 0 1.9-1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4s-2.2-.9-2.2-3.3ZM14.3 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
      </svg>
    ) : (
      <span className="text-[10.5px] font-extrabold tracking-tight">{label}</span>
    )
  const named = iconOnly ? { role: 'img', 'aria-label': label, title: label } : {}
  return (
    <span className="grid h-7 min-w-[42px] place-items-center rounded-md border border-line bg-panel px-2 text-ink" {...named}>
      {art}
    </span>
  )
}
