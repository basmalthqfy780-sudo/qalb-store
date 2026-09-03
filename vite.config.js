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
const PROXY_PATHS = ['/orders', '/licences', '/catalog', '/admin/', '/health']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: Object.fromEntries(PROXY_PATHS.map((p) => [p, { target: API, changeOrigin: true }])),
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
  },
})
