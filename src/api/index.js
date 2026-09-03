/**
 * Order/licence transport for the storefront.
 *
 * Two adapters, same contract:
 *   local  — everything stays on the device (default, no backend needed)
 *   rest   — POST/GET against VITE_QALB_API_BASE (see server/README.md)
 *
 * Switch with VITE_QALB_API=rest + VITE_QALB_API_BASE=… . Nothing else in the
 * app talks to storage or fetch directly, so a real gateway (Stripe/salla) or a
 * Supabase edge function only has to satisfy these four functions.
 */
/** اللوحة تستورده عند الحاجة فقط: لا يحمل متجرٌ صفحته الأولى كودَ الإدارة */
const localAdmin = () => import('./adminLocal.js').then((m) => m.localAdmin)

const env = (k) => {
  const over = typeof globalThis !== 'undefined' ? globalThis.__QALB_ENV : null
  if (over && over[k] != null) return String(over[k])
  try {
    return import.meta.env?.[k]
  } catch {
    return undefined
  }
}

const BASE = (env('VITE_QALB_API_BASE') || '').replace(/\/+$/, '')
export const apiMode = env('VITE_QALB_API') === 'rest' && BASE ? 'rest' : 'local'

const ORDERS = 'qalb.orders.v1'
const LAST = 'qalb.lastOrder'
const read = (k, fb) => {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : fb
  } catch {
    return fb
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* localStorage may be full or blocked — never a hard requirement */
  }
}

const rand = (n) => Array.from({ length: n }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-')

/** Order id + licence key are issued by the server in rest mode, locally here. */
const stamp = (draft) => ({
  ...draft,
  id: draft.id || `QALB-${rand(1)}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
  key: draft.key || rand(4),
  date: draft.date || new Date().toISOString().slice(0, 10),
})

async function rest(path, init) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText || ''}`.trim())
  return res.status === 204 ? null : res.json()
}

/** @returns {Promise<object>} the stored order */
export async function submitOrder(draft) {
  if (apiMode === 'rest') {
    const order = await rest('/orders', { method: 'POST', body: JSON.stringify(draft) })
    if (order?.id) write(LAST, order)
    return order
  }
  const order = stamp(draft)
  await new Promise((r) => setTimeout(r, 900)) // simulated gateway latency
  const all = read(ORDERS, [])
  write(ORDERS, [order, ...all].slice(0, 50))
  write(LAST, order)
  return order
}

/** Used when someone lands on /order?id=… without router state. */
export async function fetchOrder(id) {
  if (!id) return null
  if (apiMode === 'rest') return rest(`/orders/${encodeURIComponent(id)}`)
  const all = read(ORDERS, [])
  return all.find((o) => o.id === id) || (read(LAST, {})?.id === id ? read(LAST, null) : null)
}

/** Receipts for a buyer — powers the "طلباتي" lookup, no accounts needed. */
export async function listOrders(email) {
  const who = String(email || '')
    .trim()
    .toLowerCase()
  if (!who) return []
  if (apiMode === 'rest') return rest(`/orders?email=${encodeURIComponent(who)}`)
  return read(ORDERS, []).filter((o) => String(o.email).toLowerCase() === who)
}

/** Licence validation endpoint (also checks the local registry). */
export async function verifyKey(key) {
  if (apiMode === 'rest') return rest(`/licences/${encodeURIComponent(key)}`)
  const hit = read(ORDERS, []).find((o) => o.key === key) || (read(LAST, {})?.key === key ? read(LAST, null) : null)
  return hit ? { valid: true, order: hit.id, seats: 1, domains: '*' } : { valid: false }
}

/* ------------------------------------------------------------------ *
 * الكتالوج القابل للتعديل + طبقة لوحة الإدارة.
 * نفس العقد للوضعين: local يخزّن على الجهاز (qalb.products.v1)،
 * وrest يخزّن في server/products.json خلف مصادقة server/admin.js.
 * ------------------------------------------------------------------ */
export const PRODUCTS_KEY = 'qalb.products.v1'
const TOKEN_KEY = 'qalb.admin.token'

const token = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** يعيد استثناءات اللوحة كي تُطبَّق على الكتالوج في المتصفح */
export async function fetchCatalog() {
  if (apiMode === 'rest') {
    try {
      const res = await fetch(`${BASE}/catalog`, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(String(res.status))
      return await res.json()
    } catch {
      /* تعذّر جلب التعديلات: نُبقي ما عندنا ولا نسقط الصفحة — واللوحة تُخبر المستخدم */
      return { overrides: read(PRODUCTS_KEY, {}), offline: true }
    }
  }
  return { overrides: read(PRODUCTS_KEY, {}) }
}

async function restAdmin(path, { method = 'GET', body } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (method !== 'GET') headers['x-qalb-admin'] = '1'
  const t = token()
  if (t) headers.authorization = `Bearer ${t}`
  const res = await fetch(BASE + path, { method, headers, body: body == null ? undefined : JSON.stringify(body), credentials: 'include' })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    /* استجابة غير JSON (وسيط أو خطأ شبكة) — نمرّر الحالة فقط */
  }
  if (data.token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, data.token)
    } catch {
      /* بلا sessionStorage: تبقى جلسة الكوكي كافية */
    }
  }
  if (path === '/admin/logout') {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  }
  return { ok: res.ok, status: res.status, ...data }
}

async function adminCall(path, method, localFn, body, args) {
  if (apiMode !== 'rest') {
    const m = await localAdmin()
    return m[localFn](...(args || (body === undefined ? [] : [body])))
  }
  return restAdmin(path, { method, body: method === 'GET' || method === 'DELETE' ? undefined : (body ?? {}) })
}

export const admin = {
  mode: apiMode,
  session: () => adminCall('/admin/session', 'GET', 'session'),
  login: (p) => adminCall('/admin/login', 'POST', 'login', p),
  setup: (p) => adminCall('/admin/login', 'POST', 'setup', p),
  logout: () => adminCall('/admin/logout', 'POST', 'logout'),
  stats: () => adminCall('/admin/stats', 'GET', 'stats'),
  orders: () => adminCall('/admin/orders?limit=40', 'GET', 'orders'),
  products: () => adminCall('/admin/products', 'GET', 'products'),
  patchProduct: ({ id, patch }) => adminCall(`/admin/products/${encodeURIComponent(id)}`, 'PATCH', 'patchProduct', patch, [id, patch]),
  createProduct: (p) => adminCall('/admin/products', 'POST', 'createProduct', p),
  deleteProduct: (id) => adminCall(`/admin/products/${encodeURIComponent(id)}`, 'DELETE', 'deleteProduct', id, [id]),
  restoreProduct: (id) => adminCall(`/admin/products/${encodeURIComponent(id)}/restore`, 'POST', 'restoreProduct', id, [id]),
  users: () => adminCall('/admin/users', 'GET', 'users'),
  createUser: (p) => adminCall('/admin/users', 'POST', 'createUser', p),
  deleteUser: (id) => adminCall(`/admin/users/${encodeURIComponent(id)}`, 'DELETE', 'deleteUser', id, [id]),
  resetPassword: ({ id, password }) =>
    adminCall(`/admin/users/${encodeURIComponent(id)}/password`, 'POST', 'resetPassword', { password }, [id, password]),
  async csv() {
    if (apiMode !== 'rest') return (await localAdmin()).csv()
    const t = token()
    const res = await fetch(`${BASE}/admin/export.csv`, { headers: t ? { authorization: `Bearer ${t}` } : {}, credentials: 'include' })
    return res.ok ? res.text() : ''
  },
}
