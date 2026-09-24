import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { Toasts } from './components/ui'
import ErrorBoundary from './components/ErrorBoundary'
import { useI18n } from './i18n'
import { lazy, Suspense } from 'react'
import { TemplateCardSkeleton } from './components/ui'

// Route-level splitting keeps the first paint on a light shell.
const Home = lazy(() => import('./pages/Home'))
const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Success = lazy(() => import('./pages/Success'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Track = lazy(() => import('./pages/Track'))
const Licence = lazy(() => import('./pages/Licence'))
const Legal = lazy(() => import('./pages/Legal'))
const LegalDoc = lazy(() => import('./pages/LegalDoc'))
const Host = lazy(() => import('./pages/Host'))
const Blog = lazy(() => import('./pages/Blog'))
const Post = lazy(() => import('./pages/Post'))
const Studio = lazy(() => import('./pages/Studio'))
const Ats = lazy(() => import('./pages/Ats'))
const Match = lazy(() => import('./pages/Match'))
const Kit = lazy(() => import('./pages/Kit'))
const LinkProfile = lazy(() => import('./pages/LinkProfile'))
const Talent = lazy(() => import('./pages/Talent'))
const Market = lazy(() => import('./pages/Market'))
const Embed = lazy(() => import('./pages/Embed'))
const B2B = lazy(() => import('./pages/B2B'))
// نموذج الربح: الخطط، إنشاء القالب الأول، الحساب، سوق المصممين، ولوحة البائع
const Pricing = lazy(() => import('./pages/Pricing'))
const Account = lazy(() => import('./pages/Account'))
const Sell = lazy(() => import('./pages/Sell'))
const Creators = lazy(() => import('./pages/Creators'))
const Services = lazy(() => import('./pages/Services'))
const Offers = lazy(() => import('./pages/Offers'))
const Offer = lazy(() => import('./pages/Offer'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Admin = lazy(() => import('./pages/Admin'))
// النمو: القالب المجاني مقابل البريد — يُحمَّل مع صفحته وحدها
const Free = lazy(() => import('./pages/Free'))

/**
 * هيكل الانتظار بين حزمتين: بطاقاتُ قوالبَ مرسومةٌ بالهيكل نفسه (`TemplateCardSkeleton`)
 * لا نصُّ «جارٍ التحميل…» — فالزائر يرى مكانَ ما سيأتي قبل أن يأتي. والنصُّ
 * البديل لقارئ الشاشة موجودٌ لكنه مخفيٌّ بصريًّا.
 */
function RouteFallback() {
  const { t } = useI18n()
  return (
    <div role="status" aria-live="polite" data-route-fallback className="page-x mx-auto max-w-[1400px] py-16">
      <div className="h-9 w-2/5 animate-pulse rounded-lg bg-panel2" />
      <div className="mt-3 h-4 w-3/5 animate-pulse rounded bg-panel2/70" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <TemplateCardSkeleton key={i} />
        ))}
      </div>
      <p className="sr-only">{t('misc.loading')}</p>
    </div>
  )
}

/** «لطيف» حسب تفضيل النظام: من طلب بلا حركة لا يُدفَع إلى حركةٍ ناعمة */
const smoothBehavior = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  } catch {
    return 'smooth' // بيئة بلا matchMedia (اختبارًا): الحركة لا تضرّ
  }
}

/**
 * Links to a section — `/#bundles` من الترويسة والفوتر؛ وصفحاتُ القانون كلُّها بمسارٍ مستقل.
 * ثغرتان كانتا تجعلانه ميتًا أو ناجزًا إلى الخطأ:
 *   ١) المسار مُحمَّل بالكسل: في أول إطار لا يكون العنصر رُكِّب، فكان يسقط إلى أعلى
 *      الصفحة بدل أن ينتظره. نطلبه بضع إطارات (سقفٌ لا معلَّق).
 *   2) النقر على رابط القسم الذي أنت فيه: لا يتغيّر pathname ولا hash فلا يعود effect
 *      أصلاً. يُنقذها مستمعُ نقرٍ يقرأ الرابط من DOM.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const id = hash ? hash.slice(1) : ''
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' })
      return
    }
    let raf = 0
    let tries = 0
    const go = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
        return
      }
      if (tries++ < 24) raf = requestAnimationFrame(go)
    }
    go()
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])

  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target?.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      let url
      try {
        url = new URL(a.href, window.location.href)
      } catch {
        return
      }
      if (!url.hash || url.pathname !== window.location.pathname) return
      const el = document.getElementById(url.hash.slice(1))
      if (!el) return
      e.preventDefault()
      el.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}

export default function App() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const bareFooter = pathname.startsWith('/checkout') || pathname.startsWith('/order')
  // a new key remounts the subtree: retry after a crash gets a fresh render,
  // and navigating anywhere clears a stale fallback automatically
  const [attempt, setAttempt] = useState(0)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-bg"
      >
        {t('misc.skip')}
      </a>
      <ScrollManager />
      <Navbar />
      <main id="main" className="flex-1">
        <ErrorBoundary key={`${pathname}#${attempt}`} onRetry={() => setAttempt((a) => a + 1)}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/templates" element={<Catalog />} />
              <Route path="/template/:slug" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order" element={<Success />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/track" element={<Track />} />
              <Route path="/licence" element={<Licence />} />
              <Route path="/legal" element={<Legal />} />
              {/* الفوتر القانوني: كلُّ صفحةٍ على حدة بمسارها، لا قسمًا في صفحةٍ واحدة */}
              <Route path="/terms" element={<LegalDoc section="terms" />} />
              <Route path="/privacy" element={<LegalDoc section="privacy" />} />
              <Route path="/refunds" element={<LegalDoc section="refunds" />} />
              <Route path="/contact" element={<LegalDoc section="contact" />} />
              <Route path="/b2b" element={<B2B />} />
              <Route path="/services" element={<Services />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/offers/:slug" element={<Offer />} />
              <Route path="/ats" element={<Ats />} />
              {/* منظومةُ التوظيف: مطابقةُ الإعلان، ملفُّ التقديم، الرابط المهني، دليل المواهب، تقرير السوق، وفاحصٌ مضمّن للجهات */}
              <Route path="/match" element={<Match />} />
              <Route path="/kit" element={<Kit />} />
              <Route path="/u/:slug" element={<LinkProfile />} />
              <Route path="/talent" element={<Talent />} />
              <Route path="/market" element={<Market />} />
              <Route path="/embed" element={<Embed />} />
              <Route path="/host" element={<Host />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<Post />} />
              {/* نموذج الربح: خطةٌ تُفتح، قالبٌ أول مجانًا، وسوقٌ يفحص قبل أن ينشر */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/free" element={<Free />} />
              {/* «أنشئ قالبك» مؤجَّل في v1.8.0: المسار يُحوَّل إلى القوالب الجاهزة،
                  فلا رابطٌ قديم يسقط في صفحةٍ لا وجود لها */}
              <Route path="/create" element={<Navigate to="/templates" replace />} />
              <Route path="/account" element={<Account />} />
              <Route path="/creators" element={<Creators />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!bareFooter && <Footer />}
      <Toasts />
    </div>
  )
}
