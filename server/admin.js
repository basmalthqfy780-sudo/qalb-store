#!/usr/bin/env node
/**
 * Qalb · طبقة الإدارة (Node بدون أي اعتماديات)
 *
 * تُستعمل من server/worker.js فقط. كل المسارات تحت /admin، ما عدا /catalog
 * العام الذي يعيد «استثناءات الكتالوج» لتطبّقها الواجهة في المتصفح.
 *
 * الدخول: أول تشغيل مع ADMIN_PASSWORD يُنشئ حساب المالك في server/admins.json،
 * ثم تُدير اللوحة بقية المستخدمين من هناك (أو ALLOW_ADMIN_SETUP=1 لإعداد أول
 * حساب من الواجهة نفسها على جهاز جديد).
 * الجلسة: توكن موقّع HMAC في Cookie ‏HttpOnly SameSite=Strict، أو هيدر
 * Authorization: Bearer ‏(مفيد لـ curl وللفحص الآلي). مدة الجلسة ١٢ ساعة.
 * كل كتابة تتطلب هيدر x-qalb-admin: 1 — يمنع الطلبات العَرَضية من مواقع أخرى.
 *
 * لا شيء هنا يثق بأرقام يرسلها المتصفح: الإيرادات تُشتق من سجل الطلبات،
 * وجدول الأسعار من src/data + server/products.json عبر نفس الوحدة التي
 * يستعملها المتجر (src/data/catalog.js).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { writePrivateJson } from './seal.js'
import path from 'node:path'
import { sanitize, priceTable, MIN_PRICE, MAX_PRICE } from '../src/data/catalog.js'
import { computeStats, csvOf } from '../src/data/stats.js'

const COOKIE = 'qalb_admin'
const SESSION_MS = 12 * 3600e3
const MIN_PASS = 10
const WINDOW_MS = 10 * 60e3
const MAX_FAILS = 6

const today = () => new Date().toISOString().slice(0, 10)

export function createAdminApi({ dir, vat = 0.15, env = process.env, orders = async () => [], baseIds = () => [], onChange = null } = {}) {
  const ADMINS = path.join(dir, 'admins.json')
  const SECRET_FILE = path.join(dir, '.admin-secret')
  const PRODUCTS = path.join(dir, 'products.json')

  /* ---------- files ---------- */
  const readJson = (file, fb) => {
    if (!existsSync(file)) return fb
    try {
      return JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      return fb
    }
  }
  // كاتب واحد لكل ملفات الحالة — انظر server/seal.js
  const writeJson = writePrivateJson

  /* ---------- secret + hashing ---------- */
  let secretCache = null
  const secret = () => {
    if (secretCache) return secretCache
    if (env.ADMIN_SECRET && String(env.ADMIN_SECRET).length >= 24) return (secretCache = String(env.ADMIN_SECRET))
    if (existsSync(SECRET_FILE)) return (secretCache = readFileSync(SECRET_FILE, 'utf8').trim())
    const s = randomBytes(32).toString('hex')
    writeFileSync(SECRET_FILE, s + '\n', { mode: 0o600 })
    return (secretCache = s)
  }
  const sign = (v) => createHmac('sha256', secret()).update(v).digest('base64url')
  const hashPass = (pw, salt) => scryptSync(String(pw), salt, 64).toString('hex')
  const same = (a, b) => {
    const x = Buffer.from(String(a), 'hex')
    const y = Buffer.from(String(b), 'hex')
    return x.length > 0 && x.length === y.length && timingSafeEqual(x, y)
  }

  /* ---------- users ---------- */
  const listUsers = () => readJson(ADMINS, [])
  const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, lastLogin: u.lastLogin || null })

  function bootstrap() {
    const users = listUsers()
    if (users.length) return users
    const pw = env.ADMIN_PASSWORD
    if (!pw) return users
    if (String(pw).length < MIN_PASS) {
      console.warn('admin: ADMIN_PASSWORD أقصر من ١٠ أحرف — لا يُنشأ أي حساب وتبقى الإدارة معطّلة')
      return users
    }
    const salt = randomBytes(16).toString('hex')
    const owner = {
      id: 'owner',
      name: env.ADMIN_NAME || 'Owner',
      email: env.ADMIN_EMAIL || 'admin@qalb.store',
      role: 'owner',
      salt,
      pass: hashPass(pw, salt),
      createdAt: today(),
      lastLogin: null,
    }
    writeJson(ADMINS, [owner])
    console.log(`admin: أُنشئ حساب المالك ${owner.email} من ADMIN_PASSWORD — احذف ${ADMINS} لإعادة التهيئة`)
    return [owner]
  }

  /* ---------- product overrides ---------- */
  const overrides = () => readJson(PRODUCTS, {})
  const saveOverrides = (next) => {
    writeJson(PRODUCTS, next)
    if (onChange) onChange(next)
    return next
  }

  /* ---------- login throttling ---------- */
  const fails = new Map()
  const waitLeft = (key) => {
    const hit = fails.get(key)
    if (!hit || hit.n < MAX_FAILS) return 0
    const left = WINDOW_MS - (Date.now() - hit.t)
    if (left <= 0) {
      fails.delete(key)
      return 0
    }
    return Math.ceil(left / 1000)
  }
  const noteFail = (key) => fails.set(key, { n: (fails.get(key)?.n || 0) + 1, t: Date.now() })

  /* ---------- session tokens ---------- */
  const token = (uid) => {
    const body = `${uid}.${Date.now() + SESSION_MS}`
    return `${body}.${sign(body)}`
  }
  const verify = (t) => {
    const m = /^([^.]+)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(String(t || ''))
    if (!m) return null
    const want = Buffer.from(sign(`${m[1]}.${m[2]}`))
    const got = Buffer.from(m[3])
    if (Number(m[2]) < Date.now() || want.length !== got.length || !timingSafeEqual(want, got)) return null
    return m[1]
  }
  const bearerFrom = (req) => {
    const h = req.headers.authorization || ''
    if (/^Bearer /i.test(h)) return h.slice(7).trim()
    return (req.headers.cookie || '')
      .split(/;\s*/)
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1)
  }
  const who = (req) => {
    const uid = verify(decodeURIComponent(bearerFrom(req) || ''))
    return uid ? listUsers().find((u) => u.id === uid) || null : null
  }

  /* ---------- http helpers ---------- */
  const json = (res, code, data, headers = {}) => {
    res.writeHead(code, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': env.ADMIN_ORIGIN || '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type, x-qalb-admin, authorization',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'cache-control': 'no-store',
      ...headers,
    })
    res.end(data == null ? '' : JSON.stringify(data))
  }
  const readBody = async (req) => {
    const raw = await new Promise((r) => {
      let b = ''
      req.on('data', (c) => (b += c))
      req.on('end', () => r(b))
    })
    if (raw.length > 200000) return null
    try {
      return JSON.parse(raw || '{}')
    } catch {
      return null
    }
  }

  /* ---------- finance: نفس دوال اللوحة في وضع local ---------- */
  const stats = async () => computeStats(await orders(), { vat, overrides: overrides() })
  const csv = async () => csvOf(await orders())

  /* ---------- router ---------- */
  async function handle(req, res, u) {
    if (u.pathname === '/catalog' && req.method === 'GET') return (json(res, 200, { overrides: overrides(), prices: priceTable(overrides()) }), true)
    if (!u.pathname.startsWith('/admin')) return false
    if (req.method === 'OPTIONS') return (json(res, 204, null), true)

    const users = bootstrap()
    const enabled = users.length > 0
    const me = who(req)

    if (u.pathname === '/admin/session')
      return (json(res, me ? 200 : 401, me ? { ok: true, user: safeUser(me), mode: 'rest' } : { ok: false, enabled, minPass: MIN_PASS }), true)

    if (u.pathname === '/admin/login' && req.method === 'POST') {
      const b = await readBody(req)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      const key = req.socket.remoteAddress || '?'
      const left = waitLeft(key)
      if (left) return (json(res, 429, { error: 'too many attempts', retryAfter: left }), true)

      if (!enabled) {
        if (env.ALLOW_ADMIN_SETUP !== '1') {
          return (json(res, 503, { error: 'admin disabled — set ADMIN_PASSWORD (or ALLOW_ADMIN_SETUP=1) then restart' }), true)
        }
        const pw = String(b.password || '')
        if (pw.length < MIN_PASS) return (json(res, 400, { errors: { password: 'length' } }), true)
        const salt = randomBytes(16).toString('hex')
        const owner = {
          id: 'owner',
          name: b.name || 'Owner',
          email: b.email || 'admin@qalb.store',
          role: 'owner',
          salt,
          pass: hashPass(pw, salt),
          createdAt: today(),
          lastLogin: today(),
        }
        writeJson(ADMINS, [owner])
        return (json(res, 200, { ok: true, user: safeUser(owner), token: token(owner.id), setup: true }, cookieHeader(token(owner.id))), true)
      }

      const mail = String(b.email || '')
        .trim()
        .toLowerCase()
      const hit = users.find((x) => (mail ? String(x.email).toLowerCase() === mail : users.length === 1))
      if (!hit || !same(hashPass(String(b.password || ''), hit.salt), hit.pass)) {
        noteFail(key)
        return (json(res, 401, { error: 'bad credentials' }), true)
      }
      fails.delete(key)
      const all = listUsers().map((x) => (x.id === hit.id ? { ...x, lastLogin: today() } : x))
      writeJson(ADMINS, all)
      const t = token(hit.id)
      return (json(res, 200, { ok: true, user: safeUser(hit), token: t }, cookieHeader(t)), true)
    }

    if (u.pathname === '/admin/logout' && req.method === 'POST') {
      return (json(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` }), true)
    }

    if (!me) return (json(res, 401, { ok: false, error: 'unauthorized', enabled }), true)
    if (req.method !== 'GET' && req.headers['x-qalb-admin'] !== '1') return (json(res, 403, { error: 'missing x-qalb-admin header' }), true)

    if (u.pathname === '/admin/stats') return (json(res, 200, await stats()), true)
    if (u.pathname === '/admin/orders')
      return (json(res, 200, { orders: (await orders()).slice(0, Math.min(Number(u.searchParams.get('limit')) || 25, 200)) }), true)
    if (u.pathname === '/admin/export.csv') {
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="qalb-orders-${today()}.csv"` })
      res.end(await csv())
      return true
    }

    if (u.pathname === '/admin/products' && req.method === 'GET') {
      const ov = overrides()
      return (json(res, 200, { overrides: ov, prices: priceTable(ov), limits: { min: MIN_PRICE, max: MAX_PRICE } }), true)
    }
    if (u.pathname === '/admin/products' && req.method === 'POST') {
      const b = await readBody(req)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      const { out, errors } = sanitize(b, { isNew: true })
      if (Object.keys(errors).length) return (json(res, 400, { errors }), true)
      const all = overrides()
      if (all[out.id] || baseIds().includes(out.id)) return (json(res, 409, { errors: { id: 'exists' } }), true)
      all[out.id] = { ...out, custom: true, type: b.type, clone: b.clone || null }
      saveOverrides(all)
      return (json(res, 201, { ok: true, id: out.id, overrides: all, prices: priceTable(all) }), true)
    }
    const mProd = /^\/admin\/products\/([^/]+?)(\/restore)?$/.exec(u.pathname)
    if (mProd) {
      const id = decodeURIComponent(mProd[1])
      const all = overrides()
      const isBase = baseIds().includes(id)
      const isCustom = !!all[id]?.custom
      if (!isBase && !isCustom) return (json(res, 404, { error: 'unknown product' }), true)
      if (mProd[2]) {
        delete all[id] // المخفيّ يعود لأصله، والمُضاف من اللوحة يُحذف تمامًا
        saveOverrides(all)
        return (json(res, 200, { ok: true, restored: id, overrides: all, prices: priceTable(all) }), true)
      }
      if (req.method === 'DELETE') {
        if (isCustom) delete all[id]
        else all[id] = { ...all[id], published: false }
        saveOverrides(all)
        return (json(res, 200, { ok: true, removed: isCustom, hidden: !isCustom, overrides: all, prices: priceTable(all) }), true)
      }
      if (req.method !== 'PATCH') return (json(res, 405, { error: 'method not allowed' }), true)
      const b = await readBody(req)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      const { out, errors } = sanitize(b)
      if (Object.keys(errors).length) return (json(res, 400, { errors }), true)
      all[id] = { ...all[id], ...out }
      saveOverrides(all)
      return (json(res, 200, { ok: true, overrides: all, prices: priceTable(all) }), true)
    }

    if (u.pathname === '/admin/users' && req.method === 'GET') return (json(res, 200, { users: listUsers().map(safeUser) }), true)
    if (u.pathname === '/admin/users' && req.method === 'POST') {
      const b = await readBody(req)
      const all = listUsers()
      const name = String(b?.name || '')
        .trim()
        .slice(0, 60)
      const email = String(b?.email || '')
        .trim()
        .toLowerCase()
        .slice(0, 120)
      const pw = String(b?.password || '')
      const role = b?.role === 'owner' && me.role === 'owner' ? 'owner' : 'admin'
      const errors = {}
      if (name.length < 2) errors.name = 'name'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) errors.email = 'email'
      else if (all.some((x) => String(x.email).toLowerCase() === email)) errors.email = 'exists'
      if (pw.length < MIN_PASS) errors.password = 'length'
      if (Object.keys(errors).length) return (json(res, 400, { errors }), true)
      let id =
        email
          .split('@')[0]
          .replace(/[^a-z0-9._-]/g, '')
          .slice(0, 24) || `u${randomBytes(3).toString('hex')}`
      if (all.some((x) => x.id === id)) id = `${id}-${randomBytes(2).toString('hex')}`
      const salt = randomBytes(16).toString('hex')
      writeJson(ADMINS, [...all, { id, name, email, role, salt, pass: hashPass(pw, salt), createdAt: today(), lastLogin: null }])
      return (json(res, 201, { ok: true, users: listUsers().map(safeUser) }), true)
    }
    const mUser = /^\/admin\/users\/([^/]+?)(\/password)?$/.exec(u.pathname)
    if (mUser) {
      const id = decodeURIComponent(mUser[1])
      const all = listUsers()
      const hit = all.find((x) => x.id === id)
      if (!hit) return (json(res, 404, { error: 'unknown user' }), true)
      if (mUser[2] && req.method === 'POST') {
        const b = await readBody(req)
        const pw = String(b?.password || '')
        if (pw.length < MIN_PASS) return (json(res, 400, { errors: { password: 'length' } }), true)
        if (me.id !== hit.id && me.role !== 'owner') return (json(res, 403, { error: 'only the owner may reset another admin password' }), true)
        const salt = randomBytes(16).toString('hex')
        const next = all.map((x) => (x.id === hit.id ? { ...x, salt, pass: hashPass(pw, salt) } : x))
        writeJson(ADMINS, next)
        return (json(res, 200, { ok: true, users: next.map(safeUser) }), true)
      }
      if (req.method !== 'DELETE') return (json(res, 405, { error: 'method not allowed' }), true)
      if (hit.id === me.id) return (json(res, 409, { error: 'you cannot remove the account you are signed in with' }), true)
      if (hit.role === 'owner' && all.filter((x) => x.role === 'owner').length <= 1)
        return (json(res, 409, { error: 'at least one owner must remain' }), true)
      writeJson(
        ADMINS,
        all.filter((x) => x.id !== hit.id),
      )
      return (json(res, 200, { ok: true, users: listUsers().map(safeUser) }), true)
    }

    return (json(res, 404, { error: 'no admin route' }), true)
  }

  const cookieHeader = (t) => ({
    'set-cookie': `${COOKIE}=${encodeURIComponent(t)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`,
  })

  return { handle, overrides, prices: () => priceTable(overrides()), minPass: MIN_PASS, enabled: () => bootstrap().length > 0, who }
}
