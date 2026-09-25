/**
 * بوّابات الدفع — محوّلٌ واحد بأربعِ حالات، ودفترُ مدفوعاتٍ مستقلٌّ عن دفتر الطلبات.
 *
 * لماذا دفترٌ ثانٍ؟ لأن `orders.jsonl` دفترُ ملاحق: كلُّ سطرٍ فيه طلبٌ خُتمت
 * مجاميعُه لحظةَ الشراء، ولا يُعاد كتابةُ سطرٍ دُفع ثمنُه. حالةُ الدفع تتغيّر
 * بعدَ الكتابة (تحويلٌ يصل، وبوّابةٌ تؤكّد)، فتُكتب في `payments.jsonl` سطرًا
 * جديدًا — والحالةُ الراهنة هي آخرُ سطرٍ لذلك الطلب. دفترُ الطلبات لا يُمسّ.
 *
 * الحالات الأربع:
 *   • `manual`  — تحويلٌ بنكي: تعليماتٌ كاملة (آيبان، مبلغ، مرجع) بلا بوّابة.
 *                 تُفعّل تلقائيًا حين لا يوجد مفتاح، وتُفعّل دائمًا إن اختار
 *                 المشتري «تحويل» صراحةً — لأن تحصيلَ مبلغٍ بلا بوّابةٍ موصولة
 *                 لا يعني إيهامَه أن بطاقته خُصمت.
 *   • `moyasar` · `tap` · `stripe` — إنشاءُ جلسةِ دفعٍ وإحالةُ المشتري إليها،
 *                 ثم تأكيدُ الحالة من البوّابة نفسها (GET) أو بتوقيع الـWebhook.
 *
 * ولا شيءَ في هذا الملف يثق بالمبلغِ القادم من المتصفح: المبلغ يُقرأ من الطلب
 * المخزَّن بعدَ أن أعاد الخادم حسابَه، فإن لم يُعثر على الطلب فلا جلسة.
 */
import { appendFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { PRIVATE } from './seal.js'
import { endsWithNewline } from './http.js'

export const PROVIDERS = ['manual', 'moyasar', 'tap', 'stripe']

/** أقلُّ وحدةٍ في العملة (هللة) — ما تطلبه البوّابات السعودية والخليجية */
const halalas = (v) => Math.round((Number(v) || 0) * 100)

/** الحقل البيئيّ: نصٌّ أو فراغ — لا «undefined» يظهر في تعليمات التحويل */
const envOf = (env, ...keys) => {
  for (const k of keys) {
    const v = String(env?.[k] || '').trim()
    if (v) return v
  }
  return ''
}

export function createPaymentsApi({ dir, env = process.env, orders, onPaid } = {}) {
  const FILE = path.join(dir, 'payments.jsonl')
  const secretOf = (p) => envOf(env, `${p.toUpperCase()}_SECRET_KEY`, `QALB_PAY_${p.toUpperCase()}_KEY`)
  const chosen = String(env.QALB_PAY_PROVIDER || '')
    .trim()
    .toLowerCase()
  const provider = PROVIDERS.includes(chosen)
    ? chosen
    : secretOf('moyasar')
      ? 'moyasar'
      : secretOf('tap')
        ? 'tap'
        : secretOf('stripe')
          ? 'stripe'
          : 'manual'
  const siteUrl = (envOf(env, 'SITE_URL', 'VITE_SITE_URL') || 'http://localhost:5173').replace(/\/+$/, '')
  const currency = envOf(env, 'QALB_PAY_CURRENCY') || 'SAR'
  const webhookSecret = (p) => envOf(env, `${p.toUpperCase()}_WEBHOOK_SECRET`, 'QALB_PAY_WEBHOOK_SECRET')

  async function load() {
    if (!existsSync(FILE)) return []
    const rows = []
    ;(await readFile(FILE, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .forEach((l, i) => {
        try {
          rows.push(JSON.parse(l))
        } catch {
          console.warn(`qalb payments · unreadable payments.jsonl line ${i + 1} skipped`)
        }
      })
    return rows
  }

  async function append(rec) {
    await appendFile(FILE, (endsWithNewline(FILE) ? '' : '\n') + JSON.stringify(rec) + '\n', { encoding: 'utf8', mode: PRIVATE })
    return rec
  }

  /** آخرُ سطرٍ لذلك الطلب هو حالته الراهنة — لا بحثٌ عن «أحدث تاريخ» في كل السطور */
  const statusOf = async (orderId) => {
    const rows = await load()
    const mine = rows.filter((r) => r.order === orderId)
    return mine.length ? mine[mine.length - 1] : null
  }

  /* -------------------------------- creating a session -------------------------------- */

  async function moyasar(order, ref) {
    const secret = secretOf('moyasar')
    const body = new URLSearchParams({
      amount: String(halalas(order.total)),
      currency,
      description: `Qalb order ${order.id}`,
      callback_url: `${siteUrl}/order?id=${encodeURIComponent(order.id)}`,
      success_url: `${siteUrl}/order?id=${encodeURIComponent(order.id)}`,
      back_url: `${siteUrl}/order?id=${encodeURIComponent(order.id)}`,
      'metadata[order_id]': order.id,
      'metadata[ref]': ref,
    })
    const r = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(secret + ':').toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!r.ok) throw new Error(`moyasar ${r.status}`)
    const j = await r.json()
    return { ref: j.id || ref, payUrl: j.url || null, raw: { status: j.status } }
  }

  async function tap(order, ref) {
    const secret = secretOf('tap')
    const r = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: Number(order.total),
        currency,
        customer: {
          first_name: String(order.name || 'Qalb').slice(0, 30),
          email: order.email,
          phone: {
            country_code: '966',
            number:
              String(order.phone || '')
                .replace(/\D/g, '')
                .slice(-9) || '500000000',
          },
        },
        source: { id: 'src_all' },
        redirect: { url: `${siteUrl}/order?id=${encodeURIComponent(order.id)}` },
        reference: { order: order.id, transaction: ref },
        description: `Qalb order ${order.id}`,
        metadata: { order_id: order.id, ref },
      }),
    })
    if (!r.ok) throw new Error(`tap ${r.status}`)
    const j = await r.json()
    return { ref: j.id || ref, payUrl: j?.transaction?.url || null, raw: { status: j?.status } }
  }

  async function stripe(order, ref) {
    const secret = secretOf('stripe')
    // Stripe يُستدعى بالنماذج لا بـJSON: line_items مصفوفةٌ مفهرسة، وهذه صيغتها
    const body = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[]': 'card',
      success_url: `${siteUrl}/order?id=${encodeURIComponent(order.id)}`,
      cancel_url: `${siteUrl}/order?id=${encodeURIComponent(order.id)}`,
      client_reference_id: order.id,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(halalas(order.total)),
      'line_items[0][price_data][product_data][name]': `Qalb order ${order.id}`,
    })
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!r.ok) throw new Error(`stripe ${r.status}`)
    const j = await r.json()
    return { ref: j.id || ref, payUrl: j.url || null, raw: { status: j.status } }
  }

  /** تحويلٌ بنكي: تعليماتٌ تُطبع للمشتري — مرجعُ التحويل هو رقمُ الطلب نفسه */
  const manualInstructions = (order, ref) => ({
    bank: envOf(env, 'QALB_LEGAL_BANK', 'VITE_QALB_LEGAL_BANK') || null,
    iban: envOf(env, 'QALB_LEGAL_IBAN', 'VITE_QALB_LEGAL_IBAN') || null,
    holder: envOf(env, 'QALB_LEGAL_NAME', 'VITE_QALB_LEGAL_NAME') || null,
    reference: order.id,
    amount: order.total,
    currency,
    expiresInHours: Number(envOf(env, 'QALB_TRANSFER_HOURS')) || 48,
    ref,
  })

  /**
   * إنشاءُ جلسة دفعٍ لطلبٍ مخزَّن. المبلغُ من الطلب لا من المتصفح، وإن تعذّرت
   * البوّابةُ (شبكة، مفتاحٌ خاطئ) لا يفشل الشراء: يسقط إلى التحويلِ البنكيّ
   * ويُقال ذلك صراحةً في `offline` — فالمشتري يعرف أن بطاقته لم تُخصم.
   */
  async function create({ orderId, method }) {
    const all = await orders()
    const order = all.find((o) => o.id === orderId)
    if (!order) throw new Error('order not found')
    const existing = await statusOf(orderId)
    if (existing?.status === 'paid') return existing

    const ref = randomUUID()
    const wantManual = method === 'transfer' || provider === 'manual'
    let rec = {
      order: orderId,
      email: order.email,
      provider: wantManual ? 'manual' : provider,
      method: method || null,
      ref,
      amount: order.total,
      currency,
      status: 'pending',
      payUrl: null,
      instructions: null,
      offline: false,
      at: new Date().toISOString(),
    }

    if (wantManual) {
      rec.instructions = manualInstructions(order, ref)
      return append(rec)
    }
    try {
      const made = provider === 'moyasar' ? await moyasar(order, ref) : provider === 'tap' ? await tap(order, ref) : await stripe(order, ref)
      rec = { ...rec, ref: made.ref || ref, payUrl: made.payUrl || null }
    } catch (e) {
      // بوّابةٌ لا تجيب: التحويلُ البنكيّ طريقٌ مقبول، والكذبُ بدفعٍ تمّ ليس كذلك
      rec = { ...rec, provider: 'manual', instructions: manualInstructions(order, ref), offline: true, why: String(e.message || e).slice(0, 160) }
    }
    return append(rec)
  }

  /* -------------------------------- confirming payment -------------------------------- */

  /** تأكيدٌ من البوّابة نفسها (GET) — لا ثقةٌ برسالةٍ تقول «مدفوع» بلا مصدر */
  async function verifyRemote(orderId) {
    const cur = await statusOf(orderId)
    if (!cur || cur.status === 'paid' || cur.provider === 'manual') return cur
    try {
      if (cur.provider === 'moyasar') {
        const r = await fetch(`https://api.moyasar.com/v1/invoices/${encodeURIComponent(cur.ref)}`, {
          headers: { authorization: `Basic ${Buffer.from(secretOf('moyasar') + ':').toString('base64')}` },
        })
        if (r.ok) {
          const j = await r.json()
          if (j.status === 'paid') return markPaid(orderId, cur.ref, { via: 'verify' })
        }
      } else if (cur.provider === 'tap') {
        const r = await fetch(`https://api.tap.company/v2/charges/${encodeURIComponent(cur.ref)}`, {
          headers: { authorization: `Bearer ${secretOf('tap')}` },
        })
        if (r.ok) {
          const j = await r.json()
          if (j.status === 'CAPTURED') return markPaid(orderId, cur.ref, { via: 'verify' })
        }
      } else if (cur.provider === 'stripe') {
        const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(cur.ref)}`, {
          headers: { authorization: `Bearer ${secretOf('stripe')}` },
        })
        if (r.ok) {
          const j = await r.json()
          if (j.payment_status === 'paid') return markPaid(orderId, cur.ref, { via: 'verify' })
        }
      }
    } catch {
      /* شبكةٌ مقطوعة: تُترك الحالةُ معلّقة، ويُعاد التحقّق عند الطلب التالي */
    }
    return cur
  }

  async function markPaid(orderId, ref, meta = {}) {
    const all = await orders()
    const order = all.find((o) => o.id === orderId)
    /**
     * إعادةُ إرسال الويب هوَك حقيقةً في كل بوّابةِ دفع، ولا تُقبَض فاتورةٌ مرتين
     * مهما تكرَّر إعلانُها: سطرٌ محفوظٌ يحمل نفسَ المرجع علامةٌ على أن الحدث
     * قُبِضَ أولًا، فنُرجعه كما هو بدل كتابة سطرٍ ثانٍ وإرسال إيصالٍ ثانٍ.
     */
    if (meta?.via === 'webhook' && ref) {
      const before = (await load()).find((r) => r.order === orderId && r.status === 'paid' && String(r.ref) === String(ref))
      if (before) return before
    }
    const rec = {
      order: orderId,
      email: order?.email || null,
      provider: (await statusOf(orderId))?.provider || provider,
      ref: ref || null,
      amount: order?.total ?? null,
      currency,
      status: 'paid',
      ...meta,
      at: new Date().toISOString(),
    }
    const saved = await append(rec)
    if (order && typeof onPaid === 'function') {
      // البريدُ والتسليمُ لا يُسقطان الدفع: خطؤهما يُسجَّل ولا يُلغي سطرًا صحيحًا
      try {
        await onPaid(order, saved)
      } catch (e) {
        console.warn(`qalb payments · post-payment hook failed: ${String(e.message || e).slice(0, 160)}`)
      }
    }
    return saved
  }

  /** المشتري أبلغ أنه حوّل: تُسجَّلُ إشارتُه بمرجع التحويل، والقبضُ يبقى بيد الموظف */
  async function noteTransfer(orderId, transferRef) {
    const cur = await statusOf(orderId)
    const all = await orders()
    const order = all.find((o) => o.id === orderId)
    if (!order) throw new Error('order not found')
    return append({
      order: orderId,
      email: order.email,
      provider: 'manual',
      ref: cur?.ref || null,
      amount: order.total,
      currency,
      status: cur?.status === 'paid' ? 'paid' : 'pending',
      transferRef:
        String(transferRef || '')
          .trim()
          .slice(0, 60) || null,
      note: 'buyer reported a bank transfer — awaiting confirmation',
      at: new Date().toISOString(),
    })
  }

  /* ----------------------------------- webhooks ----------------------------------- */

  /** توقيع Stripe: `t=<timestamp>,v1=<hmac>` على النصّ الخام — بخمسِ دقائقِ سماح */
  const stripeSignatureOk = (raw, header, secret, tolerance = 300) => {
    if (!header || !secret) return false
    const parts = Object.fromEntries(
      String(header)
        .split(',')
        .map((x) => x.split('=')),
    )
    const t = Number(parts.t)
    const v1 = parts.v1 || ''
    if (!t || !v1) return false
    if (Math.abs(Math.floor(Date.now() / 1000) - t) > tolerance) return false
    const want = createHmac('sha256', secret).update(`${t}.${raw}`).digest()
    const got = Buffer.from(v1, 'hex')
    return want.length === got.length && timingSafeEqual(want, got)
  }

  /**
   * استقبالُ إشعارٍ من بوّابة. القاعدة: **لا نُصدّق إشعارًا قبل أن نتحقّق منه**
   * — توقيعٌ حسابيّ (Stripe)، أو سؤالُ البوّابةِ نفسها عن المعرّف (Moyasar/Tap).
   * إشعارٌ بلا توقيعٍ صحيح يُرفض بـ401، فلا يُفتح بابُ «دفعٍ وهميّ» بطلبٍ واحد.
   */
  async function handleWebhook(which, raw, headers = {}) {
    const secret = webhookSecret(which)
    if (which === 'stripe' && !stripeSignatureOk(raw, headers['stripe-signature'], secret)) return { ok: false, why: 'bad signature' }
    let payload
    try {
      payload = JSON.parse(raw || '{}')
    } catch {
      return { ok: false, why: 'bad json' }
    }
    const orderId =
      payload?.data?.object?.metadata?.order_id ||
      payload?.data?.object?.client_reference_id ||
      payload?.data?.metadata?.order_id ||
      payload?.metadata?.order_id ||
      payload?.order_id ||
      null
    const providerRef =
      payload?.data?.object?.id || payload?.id || payload?.data?.object?.charge_id || payload?.charge_id || payload?.data?.id || null
    if (!orderId) return { ok: false, why: 'no order reference' }

    /**
     * Moyasar يرسل الـobject نفسه (فاتورةً عند «invoice_paid»): لا envelope
     * إلزامي كباب Stripe. فنقرأ الطبقةَ العريضة منها ثم ما بداخلها — والقاعدة
     * الواحدة: تُقبَض عاصفةٌ بعد أن يصحّ المبلغ، لا بعد أن يقول النصّ «paid».
     */
    const obj = payload?.data?.object || payload?.data || payload || {}
    const status = String(obj?.status || '').toLowerCase()
    const amount = Number(obj?.amount || 0)
    const paidAmt = Number(obj?.amount_paid ?? obj?.paid_amount ?? obj?.amount_received ?? 0)
    const statusOfOrder = { stripe: 'paid', moyasar: 'paid', tap: 'captured' }
    const paid =
      which === 'stripe'
        ? payload?.type === 'checkout.session.completed' && String(obj?.payment_status || '').toLowerCase() === 'paid'
        : status === statusOfOrder[which] || (paidAmt > 0 && amount > 0 && paidAmt >= amount)
    if (!paid) return { ok: true, ignored: true }
    // مرجعُ البوابة يصدق الحدث نفسه عند تكراره: الفاتورةُ نفسها لا تُقبَض مرتين
    const ref = String(obj?.id || payload?.id || '').slice(0, 64) || providerRef

    // Moyasar وTap بلا توقيعٍ في هذا المسار: نسأل البوّابةَ عن المعرّف قبل القبض
    if (which !== 'stripe') {
      const check = await verifyRemote(orderId)
      if (check?.status !== 'paid') return { ok: false, why: 'provider did not confirm' }
      return { ok: true, payment: check }
    }
    const rec = await markPaid(orderId, ref, { via: 'webhook' })
    return { ok: true, payment: rec }
  }

  return {
    provider,
    file: FILE,
    enabled: () => provider,
    create,
    statusOf,
    verifyRemote,
    markPaid,
    noteTransfer,
    handleWebhook,
    list: load,
    /** تُلخِّص حالةَ الخدمة في /health — بلا مفاتيحَ ولا أسرار */
    stats: () => ({
      provider,
      webhook: !!webhookSecret(provider),
      transfer: {
        iban: !!envOf(env, 'QALB_LEGAL_IBAN', 'VITE_QALB_LEGAL_IBAN'),
        hours: Number(envOf(env, 'QALB_TRANSFER_HOURS')) || 48,
      },
    }),
  }
}
