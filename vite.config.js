import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `npm run api` serves the order + admin contract on :8787. Vite forwards it on the
// dev server's own origin, so `VITE_QALB_API=rest` with an empty
// VITE_QALB_API_BASE works in the browser — and in any environment that only
// exposes one port — without the page ever calling localhost itself.
const API = process.env.QALB_API_TARGET || 'http://127.0.0.1:8787'
// '/admin/' with the slash, not '/admin': the panel's own page is a client-side
// route on that exact path and must keep coming from Vite, while its API calls
// (/admin/login, /admin/stats, …) are what get forwarded.
// '/download' (and '/download-all') are the per-order delivery endpoints and '/dl/' is the
// signed one-shot link they redirect to. They stay on the page's own origin, so the browser
// never needs to know a second host or port.
// Note: '/download' is a prefix match, and the storefront has no client route of that name.
// '/org' is the seat ledger (/org/redeem and /org/<code>); no client route starts with it, so the
// prefix is safe — and without it a redemption would be answered by index.html, not by the server.
// '/payments' جلسات الدفع وحالتها وإشعارات البوّابات؛ و'/api' مساراتُ النمو (النشرة
// والقالب المجاني) — سُمِّيت كذلك لأن '/free' صفحةٌ في المتجر لا مسارُ خادم.
const PROXY_PATHS = ['/orders', '/org', '/leads', '/licences', '/catalog', '/admin/', '/download', '/dl/', '/health', '/payments', '/api']
const PROXY = Object.fromEntries(PROXY_PATHS.map((p) => [p, { target: API, changeOrigin: true }]))

/*
 * بناءُ إنتاجٍ بوضعٍ محلي = متجرٌ بلا بيع: لا طلبٌ يُسجَّل عندك، ولا بوابةُ تقبض،
 * والحزمُ المدفوعة تُولَّد في متصفح المشتري. الوضعُ المحلي للتجربة على الجهاز،
 * والنشرُ الجاد يريد VITE_QALB_API=rest مع server/worker.js شغّالًا. فالبناءُ
 * يقول ذلك بصوتٍ عالٍ بدل أن يكتشفه المالك من غياب الإيراد.
 */
if (process.argv.includes('build') && (process.env.VITE_QALB_API || 'local') !== 'rest') {
  console.warn(
    '[qalb] building PRODUCTION in LOCAL mode: no order server, no payments — paid packages will be generated in the buyer’s browser. Set VITE_QALB_API=rest (and run server/worker.js) to sell for real.',
  )
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: PROXY,
  },
  build: {
    // react/router rarely changes — a separate chunk keeps the cache warm
    // across content deploys instead of invalidating one 400 kB file
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy: PROXY, // نفس الجسر في npm run preview، فتُختبر الحزمة كما ستُخدم
  },
})
