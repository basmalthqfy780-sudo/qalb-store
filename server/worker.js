#!/usr/bin/env node
/**
 * Qalb · خدمة الطلبات (Node بدون أي اعتماديات)
 *
 *   node server/worker.js
 *
 * نقاط النهاية التي تتوقعها الواجهة (src/api/index.js):
 *   POST /orders            → يخزّن الطلب ويعيد id + key + date
 *   GET  /orders/:id        → إيصال واحد (لرابط /order?id=…)
 *   GET  /orders?email=…    → إيصالات المشتري
 *   GET  /licences/:key     → { valid, order, seats, domains }
 *
 * التخزين: إن ضبطتَ SUPABASE_URL + SUPABASE_SERVICE_KEY يُرسَل الطلب إلى
 * PostgREST، وإلا يُكتب في server/orders.jsonl (كافٍ للتجربة ولساعة الصحو).
 *
 * ملاحظة أمان: لا تثق بالمجاميع القادمة من المتصفح — يُعاد حساب
 * subtotal/vat من بنود الطلب ويُرفض أي طلب لا يطابق (400).
 */
import { createServer } from 'node:http'
import { appendFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { templates } from '../src/data/templates.js'
import { loadDotEnv } from '../scripts/dotenv.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadDotEnv(ROOT) // PORT / SUPABASE_* من .env إن وُجد — node لا يقرأه وحده

const PORT = Number(process.env.PORT || 8787)
const VAT = 0.15
const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(HERE, 'orders.jsonl')

const SB = process.env.SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_KEY
const remote = SB && SB_KEY

const cors = (res) => {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type, idempotency-key')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
}
const send = (res, code, body) => {
  cors(res)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}
const now = () => new Date().toISOString().slice(0, 10)
const rand = (n) => Array.from({ length: n }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-')
const rid = () => `QALB-${rand(1)}-${Date.now().toString(36).slice(-4).toUpperCase()}`

async function load() {
  if (remote) {
    const r = await fetch(`${SB}/rest/v1/orders?select=*&order=created_at.desc&limit=500`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
    return r.ok ? r.json() : []
  }
  if (!existsSync(FILE)) return []
  return (await readFile(FILE, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
}

async function save(order) {
  if (remote) {
    const r = await fetch(`${SB}/rest/v1/orders`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json', prefer: 'return=representation' },
      body: JSON.stringify(order),
    })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    return (await r.json())[0] || order
  }
  await appendFile(FILE, JSON.stringify(order) + '\n', 'utf8')
  return order
}

/** المجاميع شاملة الضريبة — تُعاد حسابها هنا ولا تُؤخذ من العميل */
function recompute(body) {
  const lines = Array.isArray(body.lines) ? body.lines : []
  if (!lines.length) throw new Error('lines required')
  const unit = (id) => {
    const hit = PRICES[id]
    if (hit == null) throw new Error(`unknown template: ${id}`)
    return hit
  }
  const subtotal = lines.reduce((s, l) => s + unit(l.id) * (l.qty || 1), 0)
  const pct = Number(body.couponPct) || 0
  const discount = Math.round(subtotal * (pct / 100) * 100) / 100
  const net = Math.round((subtotal - discount) * 100) / 100
  const vat = Math.round((net - net / (1 + VAT)) * 100) / 100
  const drift = Math.abs(net - Number(body.total))
  if (drift > 0.5) throw new Error(`total mismatch (${drift.toFixed(2)} SAR)`)
  return { lines, subtotal, discount, vat, total: net, coupon: pct ? `${body.coupon || ''} ${pct}%` : body.coupon || null }
}

/**
 * كتالوج الأسعار — مصدر واحد للحقيقة: نفس الملف الذي تبني منه الواجهة قوائمها.
 * في الإنتاج الحقيقي اقرأه من جدول products بدل الاستيراد، لكن لا تثق أبدًا
 * بمجموع يرسله المتصفح.
 */
const PRICES = Object.fromEntries(templates.map((t) => [t.id, t.price]))

const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (u.pathname === '/health') return send(res, 200, { ok: true, store: remote ? 'supabase' : 'jsonl', vat: VAT })

  try {
    if (req.method === 'POST' && u.pathname === '/orders') {
      const raw = await new Promise((r) => {
        let b = ''
        req.on('data', (c) => (b += c))
        req.on('end', () => r(b))
      })
      const body = JSON.parse(raw || '{}')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(body.email || '')) return send(res, 400, { error: 'email required' })
      if (!String(body.name || '').trim()) return send(res, 400, { error: 'name required' })

      const idem = req.headers['idempotency-key']
      if (idem) {
        const all = await load()
        const dup = all.find((o) => o.idempotency === idem)
        if (dup) return send(res, 200, dup) // إعادة إرسال نفس الطلب لا تنشئ طلبًا جديدًا
      }

      const math = recompute(body)
      const order = {
        id: rid(),
        key: rand(4),
        date: now(),
        email: body.email,
        name: body.name,
        phone: body.phone || null,
        country: body.country || null,
        currency: 'SAR',
        vatRate: VAT,
        count: body.count || math.lines.reduce((s, l) => s + (l.qty || 1), 0),
        method: body.method || 'card',
        methodLabel: body.methodLabel || null,
        invoice: !!body.invoice,
        vatNo: body.vatNo || null,
        idempotency: idem || null,
        ...math,
      }
      return send(res, 201, await save(order))
    }

    if (req.method === 'GET' && u.pathname.startsWith('/orders/')) {
      const id = decodeURIComponent(u.pathname.split('/').pop())
      const hit = (await load()).find((o) => o.id === id)
      return hit ? send(res, 200, hit) : send(res, 404, { error: 'not found' })
    }

    if (req.method === 'GET' && u.pathname === '/orders') {
      const email = (u.searchParams.get('email') || '').toLowerCase()
      const all = await load()
      return send(res, 200, email ? all.filter((o) => String(o.email).toLowerCase() === email) : all.slice(0, 50))
    }

    if (req.method === 'GET' && u.pathname.startsWith('/licences/')) {
      const key = decodeURIComponent(u.pathname.split('/').pop()).toUpperCase()
      const hit = (await load()).find((o) => o.key === key)
      return send(res, 200, hit ? { valid: true, order: hit.id, seats: 1, domains: '*' } : { valid: false })
    }

    send(res, 404, { error: 'no such route' })
  } catch (e) {
    send(res, 400, { error: String(e.message || e) })
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`qalb api · http://0.0.0.0:${PORT} · store=${remote ? 'supabase' : 'jsonl'}`))
