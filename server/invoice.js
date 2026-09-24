/**
 * الفاتورة وإيصالُ البريد — ورقةٌ واحدة تُطبع من الطلبِ المخزَّن، لا ممّا قاله المتصفح.
 *
 * كلُّ رقمٍ هنا من سجلِّ الطلب بعدَ إعادةِ حسابه في الخادم (`recompute` في
 * server/worker.js): سعرُ كلِّ سطرٍ مختومٌ لحظةَ الشراء، والخصمُ من جدول
 * الكوبونات، والضريبةُ مُستخرَجةٌ من الصافي لا مضافةٌ فوقه. وبياناتُ البائع
 * تُقرأ من البيئة: **ما لم يُوثَّق يُكتب مكانه «قيد التوثيق»** — فلا سجلٌّ
 * تجاريٌّ مُختلَق في ورقةٍ تُقدَّم لمشترياتٍ تتصل لتتحقّق.
 */
import { byId } from '../src/data/templates.js'
import { upsellById } from '../src/data/upsells.js'
import { VAT as VAT_RATE } from '../src/data/tax.js'

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const envOf = (env, ...keys) => {
  for (const k of keys) {
    const v = String(env?.[k] || '').trim()
    if (v) return v
  }
  return ''
}

/** هويةُ البائع كما تُطبع — الفراغُ «قيد التوثيق» لا حقلٌ فارغ */
export const seller = (env = process.env) => ({
  name: envOf(env, 'QALB_LEGAL_NAME', 'VITE_QALB_LEGAL_NAME') || 'قالب — Qalb',
  cr: envOf(env, 'QALB_LEGAL_CR', 'VITE_QALB_LEGAL_CR'),
  vat: envOf(env, 'QALB_LEGAL_VAT', 'VITE_QALB_LEGAL_VAT'),
  iban: envOf(env, 'QALB_LEGAL_IBAN', 'VITE_QALB_LEGAL_IBAN'),
  bank: envOf(env, 'QALB_LEGAL_BANK', 'VITE_QALB_LEGAL_BANK'),
  address: envOf(env, 'QALB_LEGAL_ADDRESS', 'VITE_QALB_LEGAL_ADDRESS') || 'جدة — المملكة العربية السعودية',
  phone: envOf(env, 'QALB_PHONE', 'VITE_QALB_PHONE'),
  pendingLabel: 'قيد التوثيق',
})

const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** صفوفُ الفاتورة: القوالب والإضافات معًا، بأسمائها من جدولها لا من الطلب */
export function invoiceLines(order, lang = 'ar') {
  const rows = []
  for (const l of order.lines || []) {
    const tpl = byId(l.id)
    const nm = tpl ? tpl.name?.[lang] || tpl.name?.ar || l.id : l.id
    rows.push({ name: nm, qty: l.qty || 1, unit: l.price, total: (l.price || 0) * (l.qty || 1) })
  }
  for (const a of order.addons || []) {
    const up = upsellById(a.id)
    const nm = up ? up.name?.[lang] || up.name?.ar || a.id : a.id
    rows.push({ name: nm, qty: 1, unit: a.price, total: a.price || 0 })
  }
  return rows
}

/**
 * فاتورةٌ ضريبيةٌ مطبوعة (HTML مستقلّ) — تُفتح من المتصفح وتُطبع PDF منه.
 * الرابطُ محميٌّ بمفتاحِ الترخيص: فاتورةٌ فيها اسمُ المشتري وبريده لا تُكشف
 * برقمِ الطلب وحده.
 */
export function invoiceHtml(order, { env = process.env, lang = 'ar', payment = null, siteUrl = '' } = {}) {
  // `<html data-invoice-id>` هو ما تقرؤه الفحوص وما تقرأه الشاشة معًا — والصفوف
  // موسومة بـ[data-invoice-line] فلا يُحصَى البند مرةً اثنتين بالسواكي.
  const s = seller(env)
  const rows = invoiceLines(order, lang)
  const rate = Number(order.vatRate ?? VAT_RATE) || VAT_RATE
  const statusLabel = payment?.status === 'paid' ? (lang === 'ar' ? 'مدفوعة' : 'Paid') : lang === 'ar' ? 'بانتظار الدفع' : 'Awaiting payment'
  const cell = (k) => (s[k] ? esc(s[k]) : `<span class="pending">قيد التوثيق</span>`)
  const row = (r) =>
    `<tr data-invoice-line><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${money(r.unit)}</td><td class="num">${money(r.total)}</td></tr>`
  return `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" data-invoice data-invoice-id="${esc(order.id)}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<title>${lang === 'ar' ? 'فاتورة' : 'Invoice'} ${esc(order.id)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; color: #0b0d12; background: #fff; }
  .wrap { max-width: 780px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #5b6472; font-size: 12.5px; }
  .grid { display: flex; justify-content: space-between; gap: 24px; margin: 28px 0; flex-wrap: wrap; }
  .box { font-size: 12.5px; line-height: 1.9; }
  .box b { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #5b6472; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 9px 10px; border-bottom: 1px solid #e6e8ee; text-align: start; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #5b6472; }
  .num { text-align: end; font-variant-numeric: tabular-nums; }
  tfoot td { border-bottom: none; }
  .total td { font-size: 17px; font-weight: 800; border-top: 2px solid #0b0d12; }
  .pending { color: #b45309; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; background: ${payment?.status === 'paid' ? '#e8f6ef; color:#0f7a58' : '#fdf3e3; color:#b45309'}; }
  .foot { margin-top: 26px; font-size: 11.5px; color: #5b6472; line-height: 1.9; border-top: 1px solid #e6e8ee; padding-top: 14px; }
  code { background: #f4f6fa; padding: 2px 6px; border-radius: 6px; font-size: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>${lang === 'ar' ? 'فاتورة' : 'Invoice'} <span class="num">${esc(order.id)}</span></h1>
  <p class="sub">${lang === 'ar' ? 'تاريخ الطلب' : 'Order date'}: ${esc(order.date)} · <span class="badge">${statusLabel}</span></p>

  <div class="grid">
    <div class="box">
      <b>${lang === 'ar' ? 'البائع' : 'Seller'}</b>
      ${esc(s.name)}<br>
      ${lang === 'ar' ? 'السجل التجاري' : 'CR'}: ${cell('cr')}<br>
      ${lang === 'ar' ? 'الرقم الضريبي' : 'VAT'}: ${cell('vat')}<br>
      ${esc(s.address)}
    </div>
    <div class="box">
      <b>${lang === 'ar' ? 'المشتري' : 'Buyer'}</b>
      ${esc(order.name)}<br>
      ${esc(order.email)}<br>
      ${order.phone ? `${esc(order.phone)}<br>` : ''}
      ${order.vatNo ? `${lang === 'ar' ? 'الرقم الضريبي' : 'VAT no'}: ${esc(order.vatNo)}` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th>${lang === 'ar' ? 'البيان' : 'Item'}</th><th class="num">${lang === 'ar' ? 'الكمية' : 'Qty'}</th><th class="num">${lang === 'ar' ? 'سعر الوحدة' : 'Unit'}</th><th class="num">${lang === 'ar' ? 'الإجمالي' : 'Total'}</th></tr></thead>
    <tbody>${rows.map(row).join('')}</tbody>
    <tfoot>
      <tr><td colspan="3" class="num">${lang === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</td><td class="num">${money(order.subtotal)}</td></tr>
      ${order.coupon ? `<tr><td colspan="3" class="num">${lang === 'ar' ? 'الخصم' : 'Discount'} (${esc(order.coupon)})</td><td class="num">− ${money(order.discount)}</td></tr>` : ''}
      <tr><td colspan="3" class="num">${lang === 'ar' ? `ضريبة القيمة المضافة (${Math.round(rate * 100)}٪) من الصافي` : `VAT (${Math.round(rate * 100)}%) included`}</td><td class="num">${money(order.vat)}</td></tr>
      <tr class="total"><td colspan="3" class="num">${lang === 'ar' ? 'الإجمالي شامل الضريبة' : 'Total, VAT included'}</td><td class="num">${money(order.total)} ${esc(order.currency || 'SAR')}</td></tr>
    </tfoot>
  </table>

  <div class="foot">
    ${lang === 'ar' ? 'مفتاح الترخيص' : 'Licence key'}: <code>${esc(order.key)}</code><br>
    ${lang === 'ar' ? 'طريقة الدفع' : 'Payment method'}: ${esc(order.methodLabel || order.method || '—')}${
      payment?.transferRef ? ` · ${lang === 'ar' ? 'مرجع التحويل' : 'Transfer ref'}: ${esc(payment.transferRef)}` : ''
    }<br>
    ${
      lang === 'ar'
        ? 'الأسعار شاملة ضريبة القيمة المضافة. الترخيص شخصيٌّ لملفٍّ مهنيٍّ واحد، ولا يجوز إعادة بيع القالب أو توزيعه.'
        : 'Prices include VAT. The licence is personal, for one professional profile; resale or redistribution is not permitted.'
    }
    ${siteUrl ? `<br>${esc(siteUrl)}` : ''}
  </div>
</div>
</body>
</html>`
}

/** إيصالُ البريد: النصّ والنسخةُ المقروءة — يُرسلان بعدَ الدفعِ وقبلَه */
export function receiptMail(order, { lang = 'ar', payment = null, downloadUrl = '', invoiceUrl = '' } = {}) {
  const ar = lang !== 'en'
  const rows = invoiceLines(order, lang)
  const paid = payment?.status === 'paid'
  const list = rows.map((r) => `• ${r.name} × ${r.qty} — ${money(r.total)} SAR`).join('\n')
  const subject = ar
    ? paid
      ? `فاتورتك من قالب — طلب ${order.id}`
      : `طلبك ${order.id} قيد الدفع — تعليمات التحويل`
    : paid
      ? `Your Qalb invoice — order ${order.id}`
      : `Order ${order.id} is awaiting payment — transfer details`
  const text = [
    ar ? `مرحبًا ${order.name}،` : `Hello ${order.name},`,
    paid
      ? ar
        ? `شكرًا لك — استلمنا دفع طلب ${order.id} (${money(order.total)} ريال شامل الضريبة).`
        : `Thank you — we received payment for order ${order.id} (${money(order.total)} SAR, VAT included).`
      : ar
        ? `سجّلنا طلبك ${order.id} بمبلغ ${money(order.total)} ريال شامل الضريبة، وهو بانتظار الدفع.`
        : `We recorded your order ${order.id} for ${money(order.total)} SAR including VAT; it is awaiting payment.`,
    '',
    list,
    '',
    ar
      ? `الخصم: ${order.coupon ? `${order.coupon} (− ${money(order.discount)})` : '—'}`
      : `Discount: ${order.coupon ? `${order.coupon} (− ${money(order.discount)})` : '—'}`,
    ar ? `الضريبة (١٥٪) من الصافي: ${money(order.vat)}` : `VAT (15%) included: ${money(order.vat)}`,
    ar ? `الإجمالي: ${money(order.total)} ${order.currency || 'SAR'}` : `Total: ${money(order.total)} ${order.currency || 'SAR'}`,
    '',
    ar ? `مفتاح الترخيص: ${order.key}` : `Licence key: ${order.key}`,
    downloadUrl ? (ar ? `روابط التحميل: ${downloadUrl}` : `Download links: ${downloadUrl}`) : '',
    invoiceUrl ? (ar ? `الفاتورة: ${invoiceUrl}` : `Invoice: ${invoiceUrl}`) : '',
    payment?.instructions?.iban
      ? ar
        ? [
            '',
            'تعليمات التحويل البنكي:',
            `البنك: ${payment.instructions.bank || '—'}`,
            `الآيبان: ${payment.instructions.iban}`,
            `المبلغ: ${money(payment.instructions.amount)} ريال`,
            `المرجع: ${payment.instructions.reference} (اكتبه خانة المرجع)`,
          ].join('\n')
        : [
            '',
            'Bank transfer details:',
            `Bank: ${payment.instructions.bank || '—'}`,
            `IBAN: ${payment.instructions.iban}`,
            `Amount: ${money(payment.instructions.amount)} SAR`,
            `Reference: ${payment.instructions.reference} (put it in the reference field)`,
          ].join('\n')
      : '',
    '',
    ar
      ? 'الترخيص شخصيٌّ لملفٍّ مهنيٍّ واحد، ولا يجوز إعادة البيع.'
      : 'The licence is personal, for one professional profile; resale is not permitted.',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `<div dir="${ar ? 'rtl' : 'ltr'}" style="font-family:system-ui,'IBM Plex Sans Arabic',sans-serif;color:#0b0d12;line-height:1.9">
    <h2 style="margin:0 0 8px">${paid ? (ar ? 'شكرًا لك — تم الدفع' : 'Thank you — payment received') : ar ? 'طلبك بانتظار الدفع' : 'Your order is awaiting payment'}</h2>
    <p style="margin:0 0 12px;color:#5b6472">${ar ? 'طلب' : 'Order'} <b>${esc(order.id)}</b> · ${esc(order.date)} · <b>${money(order.total)} ${esc(order.currency || 'SAR')}</b></p>
    <ul>${rows.map((r) => `<li>${esc(r.name)} × ${r.qty} — ${money(r.total)}</li>`).join('')}</ul>
    ${downloadUrl ? `<p><a href="${esc(downloadUrl)}">${ar ? 'تحميل القوالب' : 'Download your templates'}</a></p>` : ''}
    ${invoiceUrl ? `<p><a href="${esc(invoiceUrl)}">${ar ? 'الفاتورة' : 'Invoice'}</a></p>` : ''}
    ${
      payment?.instructions?.iban
        ? `<p style="background:#f4f6fa;padding:12px;border-radius:10px">
      <b>${ar ? 'تحويل بنكي' : 'Bank transfer'}</b><br>
      ${ar ? 'البنك' : 'Bank'}: ${esc(payment.instructions.bank || '—')}<br>
      IBAN: <b>${esc(payment.instructions.iban)}</b><br>
      ${ar ? 'المبلغ' : 'Amount'}: <b>${money(payment.instructions.amount)} SAR</b><br>
      ${ar ? 'المرجع' : 'Reference'}: <b>${esc(payment.instructions.reference)}</b></p>`
        : ''
    }
    <p style="color:#5b6472;font-size:12.5px">${ar ? 'مفتاح الترخيص' : 'Licence key'}: <code>${esc(order.key)}</code></p>
  </div>`
  return { subject, text, html }
}
