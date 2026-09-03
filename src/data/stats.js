/**
 * حسابات الإدارة — دالة واحدة يستعملها الخادم (server/admin.js) ووضع local
 * (src/api/adminLocal.js)، فلا تختلف الأرقام بحسب من يفتح اللوحة.
 * كل الأرقام مشتقة من سجل الطلبات نفسه؛ لا يُقبل رقم «إيراد» من المتصفح.
 */
import { effective, priceTable } from './catalog.js'

const money = (n) => Math.round(Number(n || 0) * 100) / 100
const dayOf = (offset) => new Date(Date.now() - offset * 86400e3).toISOString().slice(0, 10)

/** @param orders قائمة الطلبات كما خزّنها الخادم أو localStorage */
export function computeStats(orders = [], { vat = 0.15, overrides = {}, days = 30, topN = 6 } = {}) {
  const prices = priceTable(overrides)
  const names = {}
  for (const t of effective(overrides)) names[t.id] = t.name

  const series = []
  for (let i = days - 1; i >= 0; i--) series.push({ date: dayOf(i), total: 0, orders: 0 })
  const dayAt = new Map(series.map((d, i) => [d.date, i]))

  const byProduct = new Map()
  const buyers = new Set()
  let revenue = 0
  let vatSum = 0
  for (const o of orders) {
    const total = Number(o.total || 0)
    revenue += total
    vatSum += total - total / (1 + vat)
    buyers.add(String(o.email || '').toLowerCase())
    const at = dayAt.get(String(o.date || ''))
    if (at != null) {
      series[at].total = money(series[at].total + total)
      series[at].orders += 1
    }
    const sub = Number(o.subtotal || 0) || 1
    for (const l of o.lines || []) {
      const cur = byProduct.get(l.id) || { id: l.id, qty: 0, revenue: 0, price: prices[l.id] ?? null, hidden: prices[l.id] == null }
      cur.qty += Number(l.qty || 1)
      // حصة الإيراد تُقسَّم من صافي الطلب نفسه، بسعر السطر المسجَّل وقت الدفع؛
      // الطلبات الأقدم (بلا سعر مختم) تُحسب بالسعر الحالي — لا اختلاق رقم
      const paid = Number(l.price ?? prices[l.id] ?? 0)
      cur.revenue = money(cur.revenue + total * ((paid * (l.qty || 1)) / sub))
      byProduct.set(l.id, cur)
    }
  }

  const top = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, topN)
    .map((p) => ({ ...p, revenue: money(p.revenue), name: names[p.id]?.ar || names[p.id]?.en || p.id, nameEn: names[p.id]?.en || p.id }))

  return {
    currency: 'SAR',
    revenue: money(revenue),
    vat: money(vatSum),
    orders: orders.length,
    buyers: buyers.size,
    avg: orders.length ? money(revenue / orders.length) : 0,
    series: series.map((d) => ({ ...d, total: money(d.total) })),
    top,
    generatedAt: new Date().toISOString(),
  }
}

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

/** تصدير الطلبات كما هي — بلا أرقام مخترعة */
export function csvOf(orders = []) {
  const head = ['id', 'date', 'name', 'email', 'method', 'items', 'subtotal', 'discount', 'vat', 'total', 'key', 'lines', 'personalized']
  const rows = orders.map((o) =>
    [
      o.id,
      o.date,
      o.name,
      o.email,
      o.method || 'card',
      o.count,
      o.subtotal,
      o.discount,
      o.vat,
      o.total,
      o.key,
      (o.lines || []).map((l) => `${l.id}×${l.qty}`).join(' '),
      o.personalize ? 'yes' : 'no', // القيمة نفسها لا تُصدَّر: يكفي أن الطلب مُخصَّص
    ]
      .map(esc)
      .join(','),
  )
  return [head.join(','), ...rows].join('\n')
}
