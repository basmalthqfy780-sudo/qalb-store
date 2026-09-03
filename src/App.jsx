import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { Toasts } from './components/ui'
import ErrorBoundary from './components/ErrorBoundary'
import { useI18n } from './i18n'
import { lazy, Suspense } from 'react'
import { PreviewSkeleton } from './components/ui'

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
const NotFound = lazy(() => import('./pages/NotFound'))
const Admin = lazy(() => import('./pages/Admin'))

function RouteFallback() {
  const { t } = useI18n()
  return (
    <div
      role="status"
      aria-live="polite"
      data-route-fallback
      className="page-x mx-auto grid max-w-[1400px] gap-6 py-16 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="space-y-4">
        <div className="h-9 w-2/5 animate-pulse rounded-lg bg-panel2" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-panel2/70" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <PreviewSkeleton key={i} className="rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-panel2/60" />
      <p className="sr-only">{t('misc.loading')}</p>
    </div>
  )
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' })
  }, [pathname, hash])
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
