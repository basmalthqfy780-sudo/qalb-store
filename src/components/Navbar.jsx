import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n, dateLabel } from '../i18n'
import { useStore } from '../store/StoreContext'
import { categories, templates, couponInfo } from '../data/templates'
import { Icon, Btn } from './ui'
import { ArtTile } from './Preview'

/* ============================ بيانات القائمة الشاملة ============================
 * روابطُ المنصة كلُّها في موضعٍ واحد: تقرأها قائمةُ ☰ الشاملة ودرجُ الجوال معًا.
 * كلُّ مفتاحِ ترجمةٍ مكتوبٌ صريحًا في `k` — الفحص يمنع مفتاحًا في القاموس لا يُستعمل،
 * ومنعٌ كذلك مفتاحًا يُطلب من القاموس ولا يوجد. أدواتُ التوظيف التسعُ معدودةٌ من
 * الجدول نفسه (MENU_TOOLS.length) فلا رقمَ في الشاشة لا يسنده سطرٌ هنا.
 */
const MENU_TOOLS = [
  { to: '/ats', k: 'nav.ats', icon: 'scan' },
  { to: '/match', k: 'footer.match', icon: 'briefcase' },
  { to: '/kit', k: 'footer.kit', icon: 'spark' },
  { to: '/u/noura-alharbi', k: 'home.suiteLink', icon: 'globe' },
  { to: '/studio', k: 'studio.kicker', icon: 'pen' },
  { to: '/talent', k: 'footer.talent', icon: 'grid' },
  { to: '/market', k: 'footer.market', icon: 'pulse' },
  { to: '/embed', k: 'footer.embed', icon: 'code2' },
  { to: '/b2b', k: 'footer.b2b', icon: 'cap' },
]
const MENU_SUPPORT = [
  { to: '/#faq', k: 'footer.help', icon: 'phone' },
  { to: '/#guide', k: 'nav.guide', icon: 'book' },
  { to: '/blog', k: 'footer.blog', icon: 'quote' },
  { to: '/track', k: 'footer.track', icon: 'clock' },
  { to: '/licence', k: 'footer.licenseCheck', icon: 'lock' },
  { to: '/#contact', k: 'footer.contact', icon: 'mail' },
]

export function Logo({ compact = false }) {
  const { t } = useI18n()
  return (
    <Link to="/" aria-label={t('brand.name')} className="group inline-flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-[11px] bg-ink text-bg transition-transform duration-300 group-hover:-rotate-6 light:bg-brand light:text-brandink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M7 4.5h6.2a4.3 4.3 0 0 1 .8 8.5L17 19.5h-3l-2.4-5.4" />
          <path d="M7 4.5v15" />
        </svg>
        <span className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-gold ring-2 ring-bg" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[19px] font-extrabold tracking-tight">{t('brand.name')}</span>
          <span className="mt-0.5 text-[10px] font-medium tracking-wide text-dim">{t('brand.tag')}</span>
        </span>
      )}
    </Link>
  )
}

function Count({ n }) {
  if (!n) return null
  return (
    <span className="absolute -end-1 -top-1 grid min-w-[18px] animate-pop place-items-center rounded-full bg-brand px-1 py-0.5 text-[10px] font-bold leading-none text-brandink ring-2 ring-bg">
      {n > 9 ? '9+' : n}
    </span>
  )
}

export default function Navbar() {
  const { t, lang, toggleLang, theme, toggleTheme } = useI18n()
  // يُقرأ عند كل رسم: تجاوزُ منتصف الليل في تبويبٍ مفتوح يُخفي الشريط في التنقّل التالي
  const sale = couponInfo('SALE25')
  const { totals, wish } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [mega, setMega] = useState(false)
  const [menu, setMenu] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [sp] = useSearchParams()
  const urlQ = sp.get('q') || ''
  const [q, setQ] = useState(urlQ)
  const nav = useNavigate()
  const loc = useLocation()
  const megaRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // التنقل يُغلق القوائم ويُزامِن حقل البحث مع ?q= — كلها أثناء الرندر، لأن
  // setState داخل effect كان يضيف جولة رسم ثانية لكل نقرة
  const navKey = `${loc.pathname}${loc.search}`
  const [atRoute, setAtRoute] = useState(navKey)
  if (atRoute !== navKey) {
    setAtRoute(navKey)
    setDrawer(false)
    setMega(false)
    setMenu(false)
    setQ(urlQ)
  }

  useEffect(() => {
    const onDoc = (e) => {
      if (megaRef.current && !megaRef.current.contains(e.target)) setMega(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false)
    }
    const onKey = (e) => e.key === 'Escape' && (setMega(false), setMenu(false), setDrawer(false))
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const submit = (e) => {
    e.preventDefault()
    nav(`/templates${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
    setDrawer(false)
    setMenu(false)
  }

  const featured = templates.filter((x) => x.featured).slice(0, 3)

  /** route links and in-page anchors both live in the menu — mark whichever one you are on */
  const isCurrent = (to) => {
    const hashAt = to.indexOf('#')
    if (hashAt >= 0) {
      const path = to.slice(0, hashAt) || '/'
      const hash = to.slice(hashAt + 1)
      return (loc.pathname || '/') === path && (loc.hash || '').replace(/^#/, '') === hash
    }
    return loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to))
  }

  /** صفا القائمة الواحدة: أيقونةُ SVG فوق اسمٍ من القاموس — تُقرأ في ☰ ودرج الجوال */
  const menuRow = (x) => (
    <Link
      key={x.to}
      to={x.to}
      onClick={() => {
        setMenu(false)
        setDrawer(false)
      }}
      aria-current={isCurrent(x.to) ? 'page' : undefined}
      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-panel2"
      data-menu-link={x.to}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-bg text-brand">
        <Icon n={x.icon} className="size-4" />
      </span>
      <span className="text-[13px] font-semibold">{t(x.k)}</span>
    </Link>
  )

  return (
    <>
      {/* announcement — النسبةُ والأجلُ من جدول الكوبونات نفسه الذي تقرؤه السلة والخادم؛
          وبعد الأجل يختفي الشريط وحده، فلا يُعلَن كوبونٌ يرفضه الدفع */}
      {sale && !sale.expired && (
        <div className="relative overflow-hidden bg-ink text-bg light:bg-brand light:text-brandink" data-announce>
          <div className="page-x mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-center text-[12px] font-medium sm:text-[12.5px]">
            <Icon n="bolt" className="size-3.5 shrink-0 text-gold" fill sw={0} />
            {/* لا truncate: نصّ الشريط يلتفّ في سطرين على الجوال بدل أن يُقطع بنهاية مبتورة */}
            <span>{t('announce.text', { p: sale.pct, d: dateLabel(sale.endsAt, lang) })}</span>{' '}
            {/* الكود ظاهرٌ في كل المقاسات: الشريط على الجوال كان يقول «استخدم كود» ثم لا شيء */}
            <span
              className="num inline-block rounded-md border border-current/25 px-1.5 py-0.5 text-[11px] font-bold tracking-wider"
              data-announce-code
            >
              {t('announce.code')}
            </span>{' '}
            <Link
              to="/templates?type=bundle"
              className="hidden shrink-0 items-center gap-1 font-bold underline decoration-2 underline-offset-2 sm:inline-flex"
            >
              {t('announce.link')}
              <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled ? 'border-line bg-bg/80 shadow-soft backdrop-blur-xl' : 'border-transparent bg-bg/40 backdrop-blur-md'
        }`}
      >
        <div className="page-x mx-auto flex h-[68px] max-w-[1400px] items-center gap-3">
          <Logo />

          <nav className="ms-3 hidden items-center gap-0.5 lg:flex">
            {/* categories mega */}
            <div ref={megaRef} className="relative">
              <button
                type="button"
                onClick={() => setMega((v) => !v)}
                aria-expanded={mega}
                aria-current={loc.pathname.startsWith('/templates') ? 'page' : undefined}
                aria-controls="mega-panel"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition ${
                  mega || loc.pathname === '/templates' ? 'text-ink' : 'text-dim hover:text-ink'
                }`}
              >
                {t('nav.categories')}
                <Icon n="chevron" className={`size-3.5 transition-transform ${mega ? 'rotate-180' : ''}`} />
              </button>
              <div
                id="mega-panel"
                data-mega={mega ? 'open' : 'closed'}
                className={`absolute -start-8 top-[calc(100%+10px)] w-[min(720px,88vw)] origin-top rounded-2xl border border-line bg-panel/95 p-4 shadow-lift backdrop-blur-xl transition-all duration-200 ${
                  mega ? 'visible scale-100 opacity-100' : 'invisible scale-[.97] opacity-0'
                }`}
              >
                <div className="grid gap-4 sm:grid-cols-[1.15fr_.85fr]">
                  <div>
                    <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('cats.title')}</p>
                    <Link
                      to="/templates"
                      className="mb-1 flex items-center gap-2 rounded-xl border border-line bg-bg px-2.5 py-2 text-[12.5px] font-bold transition hover:border-brand/40 hover:text-brand"
                    >
                      <Icon n="grid" className="size-4" />
                      {t('nav.allTemplates')}
                    </Link>
                    <div className="grid grid-cols-2 gap-1">
                      {categories.map((c) => (
                        <Link
                          key={c.id}
                          to={`/templates?cat=${c.id}`}
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-panel2"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-bg text-brand">
                            <Icon n={c.icon} className="size-4" />
                          </span>
                          <span className="text-[13px] font-semibold">{lang === 'ar' ? c.ar : c.en}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-bg/60 p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('featured.title')}</p>
                    <div className="grid gap-2">
                      {featured.map((f) => (
                        <Link key={f.id} to={`/template/${f.slug}`} className="group flex items-center gap-2.5">
                          <ArtTile tpl={f} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-bold group-hover:text-brand">
                              {lang === 'ar' ? f.name?.ar : f.name?.en}
                            </span>
                            <span className="block truncate text-[10.5px] text-dim">{lang === 'ar' ? f.tagline?.ar : f.tagline?.en}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                    <Link to="/templates" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline">
                      {t('nav.viewAll')}
                      <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div className="ms-auto flex items-center gap-1.5">
            <form onSubmit={submit} className="hidden xl:block">
              <label className="group flex h-10 w-[230px] items-center gap-2 rounded-xl border border-line bg-panel/60 px-3 transition focus-within:border-brand/50 focus-within:w-[280px]">
                <Icon n="search" className="size-4 shrink-0 text-dim" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('nav.search')}
                  aria-label={t('nav.search')}
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </label>
            </form>

            <Link
              to="/wishlist"
              aria-label={t('nav.wishlist')}
              title={t('nav.wishlist')}
              className="relative grid size-10 place-items-center rounded-xl border border-line bg-panel/50 text-dim transition hover:text-ink"
            >
              <Icon n="heart" className="size-[18px]" />
              <Count n={wish.length} />
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('misc.lightMode') : t('misc.darkMode')}
              title={theme === 'dark' ? t('misc.lightMode') : t('misc.darkMode')}
              className="hidden size-10 place-items-center rounded-xl border border-line bg-panel/50 text-dim transition hover:text-ink sm:grid"
            >
              <Icon n={theme === 'dark' ? 'sun' : 'moon'} className="size-[18px]" />
            </button>

            <button
              type="button"
              onClick={toggleLang}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-panel/50 px-3 text-[12px] font-bold text-ink transition hover:border-brand/40"
              aria-label="Switch language"
            >
              <Icon n="globe" className="size-4 text-brand" />
              <span className="hidden sm:inline">{t('misc.langBtn')}</span>
            </button>

            <Link
              to="/cart"
              className="relative grid size-10 place-items-center rounded-xl border border-line bg-panel/50 text-ink transition hover:border-brand/40"
              aria-label={`${t('nav.cart')} — ${totals.count}`}
            >
              <Icon n="cart" className="size-[18px]" />
              <Count n={totals.count} />
            </Link>

            <Btn to="/templates" size="sm" className="hidden md:inline-flex">
              {t('hero.ctaPrimary')}
            </Btn>

            {/* ☰ القائمة الشاملة على الشاشات الكبيرة: كلُّ روابط المنصة في عمودٍ واحد،
                فلا زحمَةَ روابطَ مباشرةً في الشريط */}
            <div ref={menuRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-controls="menu-panel"
                aria-label={t('nav.menu')}
                title={t('nav.menu')}
                data-menu-trigger
                className="grid size-10 place-items-center rounded-xl border border-line bg-panel/50 text-ink transition hover:border-brand/40"
              >
                <Icon n={menu ? 'close' : 'menu'} className="size-[18px]" />
              </button>
              <div
                id="menu-panel"
                data-menu={menu ? 'open' : 'closed'}
                className={`absolute end-0 top-[calc(100%+10px)] w-[min(880px,90vw)] origin-top-end rounded-2xl border border-line bg-panel/95 p-5 shadow-lift backdrop-blur-xl transition-all duration-200 ${
                  menu ? 'visible scale-100 opacity-100' : 'invisible scale-[.97] opacity-0'
                }`}
              >
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {/* القوالب */}
                  <div>
                    <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('nav.templates')}</p>
                    <Link
                      to="/templates"
                      onClick={() => setMenu(false)}
                      className="mb-1 flex items-center gap-2 rounded-xl border border-line bg-bg px-2.5 py-2 text-[12.5px] font-bold transition hover:border-brand/40 hover:text-brand"
                    >
                      <Icon n="grid" className="size-4" />
                      {t('nav.allTemplates')}
                    </Link>
                    <div className="grid grid-cols-2 gap-1">
                      {categories.map((c) => (
                        <Link
                          key={c.id}
                          to={`/templates?cat=${c.id}`}
                          onClick={() => setMenu(false)}
                          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-panel2"
                        >
                          <Icon n={c.icon} className="size-4 shrink-0 text-brand" />
                          <span className="truncate text-[12.5px] font-semibold">{lang === 'ar' ? c.ar : c.en}</span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      to="/#bundles"
                      onClick={() => setMenu(false)}
                      className="mt-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold transition hover:bg-panel2"
                    >
                      <Icon n="layers" className="size-4 text-brand" />
                      {t('nav.pricing')}
                    </Link>
                    {/* نموذج الربح: الخطط والمصفوفة، إنشاء القالب الأول، وسوق المصممين */}
                    <Link
                      to="/pricing"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold transition hover:bg-panel2"
                    >
                      <Icon n="wallet" className="size-4 text-brand" />
                      {t('nav.plans')}
                    </Link>
                    <Link
                      to="/creators"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold transition hover:bg-panel2"
                    >
                      <Icon n="layers" className="size-4 text-brand" />
                      {t('nav.creators')}
                    </Link>
                  </div>

                  {/* أدوات التوظيف — التسعُ أدوات */}
                  <div>
                    <p className="mb-2 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
                      {t('footer.careers')}{' '}
                      <span
                        className="num rounded-md border border-brand/25 bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand"
                        data-menu-tools-count
                      >
                        {MENU_TOOLS.length} {t('nav.tools')}
                      </span>
                    </p>
                    <div className="grid gap-0.5" data-menu-tools>
                      {MENU_TOOLS.map(menuRow)}
                    </div>
                  </div>

                  {/* الخدمات والاستضافة */}
                  <div className="space-y-4">
                    <div>
                      <Link
                        to="/services"
                        onClick={() => setMenu(false)}
                        className="mb-1 block px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim transition hover:text-ink"
                      >
                        {t('nav.services')}
                      </Link>
                      {menuRow({ to: '/offers', k: 'nav.offers', icon: 'gift' })}
                    </div>
                    <div>
                      <Link
                        to="/host"
                        onClick={() => setMenu(false)}
                        className="mb-1 block px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim transition hover:text-ink"
                      >
                        {t('nav.host')}
                      </Link>
                      {menuRow({ to: '/#deploy', k: 'footer.siteGuide', icon: 'rocket' })}
                    </div>
                  </div>

                  {/* الدعم */}
                  <div>
                    <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('nav.support')}</p>
                    <div className="grid gap-0.5">{MENU_SUPPORT.map(menuRow)}</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={t('nav.menu')}
              className="grid size-10 place-items-center rounded-xl border border-line bg-panel/50 lg:hidden"
            >
              <Icon n="menu" className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer — الـaside مخفيٌّ بـvisibility وهو مغلق: لا يتدلّى على يمين
          الشاشة فيجرّ التجاوز الأفقي على الجوال، ولا يبقى في شجرة قارئات الشاشة */}
      <div className={`fixed inset-0 z-[70] lg:hidden ${drawer ? '' : 'pointer-events-none'}`}>
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${drawer ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 end-0 flex w-[min(400px,92vw)] flex-col border-line bg-bg transition-[transform,visibility] duration-300 ${
            drawer ? 'visible translate-x-0' : `invisible ${lang === 'ar' ? '-translate-x-full' : 'translate-x-full'}`
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <Logo />
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label={t('nav.close')}
              className="grid size-9 place-items-center rounded-lg border border-line"
            >
              <Icon n="close" className="size-4" />
            </button>
          </div>
          <form onSubmit={submit} className="p-4 pb-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3">
              <Icon n="search" className="size-4 text-dim" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('nav.search')}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </form>
          <div className="thin-bar flex-1 overflow-y-auto px-4 pb-6">
            <p className="px-1 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('nav.templates')}</p>
            {menuRow({ to: '/templates', k: 'nav.allTemplates', icon: 'grid' })}
            {menuRow({ to: '/#bundles', k: 'nav.pricing', icon: 'layers' })}
            <p className="px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('cats.title')}</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/templates?cat=${c.id}`}
                  onClick={() => setDrawer(false)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-panel/50 px-2.5 py-2 text-[12.5px] font-semibold"
                >
                  <Icon n={c.icon} className="size-4 text-brand" />
                  <span className="truncate">{lang === 'ar' ? c.ar : c.en}</span>
                </Link>
              ))}
            </div>
            {/* درجُ الجوال يجمع روابط المنصة كلَّها كما تجمعها قائمة ☰ على الشاشات الكبيرة */}
            <p className="flex items-center gap-2 px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
              {t('footer.careers')}{' '}
              <span
                className="num rounded-md border border-brand/25 bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand"
                data-menu-tools-count
              >
                {MENU_TOOLS.length} {t('nav.tools')}
              </span>
            </p>
            {MENU_TOOLS.map(menuRow)}
            <p className="px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('nav.services')}</p>
            {menuRow({ to: '/services', k: 'nav.services', icon: 'pen' })}
            {menuRow({ to: '/offers', k: 'nav.offers', icon: 'gift' })}
            {menuRow({ to: '/host', k: 'nav.host', icon: 'globe' })}
            {menuRow({ to: '/#deploy', k: 'footer.siteGuide', icon: 'rocket' })}
            <p className="px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('nav.support')}</p>
            {MENU_SUPPORT.map(menuRow)}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Btn onClick={toggleLang} variant="outline" size="md">
                {t('misc.langBtn')}
              </Btn>
              <Btn onClick={toggleTheme} variant="outline" size="md">
                {theme === 'dark' ? t('misc.lightMode') : t('misc.darkMode')}
              </Btn>
            </div>
            <Btn to="/cart" size="lg" className="mt-3 w-full">
              <Icon n="cart" className="size-4" />
              {t('nav.cart')} ({totals.count})
            </Btn>
          </div>
        </aside>
      </div>
    </>
  )
}
