/**
 * بطاقةُ الجاهزية القابلة للمشاركة.
 *
 * الفكرةُ التجاريةُ بسيطة: كلُّ فاحصٍ ينشر درجته يصبح لوحةَ إعلانٍ لنا، فتُبنى
 * البطاقةُ في المتصفح نفسه (SVG ثم PNG اختياريًا) بلا رفعٍ إلى خدمةِ صور، وبلا
 * حفظٍ لاسمِ صاحبها عندنا — البطاقةُ صورةٌ في جهازه، والرابطُ فيها يعود إلينا.
 *
 * صورتان: مجانيةٌ عليها شعارُ قالب، و«موثّقة» بلا شعار تُباع. الفرقُ عندنا علامةٌ
 * واحدة في الملف لا صورتان: `verified` تُسقط الشعار وتضيف سطرَ التحقق. أما الرقمُ
 * المعروض فهو نفسُ درجة الفاحص بلا زيادة — لا نجمّل ما نبيعه.
 */
const W = 1200
const H = 630

/** كوبونٌ ثابتٌ من البذرة: نفسُ الدرجة والاسم يعطيان نفسَ الكوبون دائمًا */
export function couponFor(seed = '') {
  const key = String(seed || 'qalb')
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 5; i++) ((s += A[h % 32]), (h = Math.floor(h / 32)))
  return `QALB-${s}`
}

/** حرفٌ عربي أو لاتيني: يُهرب قبل دخوله الـSVG، فالنصُّ يأتي من المستخدم */
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * البطاقةُ svg — كلُّ نصٍّ فيها مُمرَّرٌ من الصفحة (مترجمٌ ومُرقَّمٌ بهجائه)،
 * فلا يبنى رقمٌ ولا جملةٌ داخل هذا الملف.
 */
export function cardSvg(o = {}) {
  const {
    title = '',
    scoreLabel = '',
    bandLabel = '',
    byLabel = '',
    url = '',
    coupon = '',
    couponLabel = '',
    verified = false,
    rtl = true,
    stats = [], // [{ k, v }] — كلمات/نقاط/مطابقة كما يحسبها الفاحص
  } = o
  const dir = rtl ? 'rtl' : 'ltr'
  const anchor = rtl ? 'end' : 'start'
  const x = rtl ? W - 72 : 72
  const lang = rtl ? 'ar' : 'en'
  const stat = (s, i) => {
    const y = 470 + i * 46
    return (
      `<text x="${rtl ? W - 72 - i * 300 : 72 + i * 300}" y="${y}" xml:lang="${lang}" direction="${dir}" ` +
      `text-anchor="${rtl ? 'end' : 'start'}" font-family="system-ui, sans-serif" font-size="20" fill="#9aa4b8">${esc(s.k)}</text>` +
      `<text x="${rtl ? W - 72 - i * 300 : 72 + i * 300}" y="${y + 30}" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="#e8ebf2">${esc(
        s.v,
      )}</text>`
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(
    `${title} ${scoreLabel}`,
  )}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0e14"/>
      <stop offset="1" stop-color="#131a26"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="0" y="0" width="${W}" height="8" fill="#4f8cff"/>
  <text x="${x}" y="118" xml:lang="${lang}" direction="${dir}" text-anchor="${anchor}" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="#8fb4ff">${esc(
    title,
  )}</text>
  <text x="${x}" y="252" xml:lang="${lang}" direction="${dir}" text-anchor="${anchor}" font-family="system-ui, sans-serif" font-size="120" font-weight="800" fill="#ffffff">${esc(
    scoreLabel,
  )}</text>
  <text x="${x}" y="312" xml:lang="${lang}" direction="${dir}" text-anchor="${anchor}" font-family="system-ui, sans-serif" font-size="34" font-weight="700" fill="#4f8cff">${esc(
    bandLabel,
  )}</text>
  ${stats.slice(0, 3).map(stat).join('\n  ')}
  <line x1="72" y1="556" x2="${W - 72}" y2="556" stroke="#232b3a" stroke-width="2"/>
  <text x="${x}" y="596" xml:lang="${lang}" direction="${dir}" text-anchor="${anchor}" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#9aa4b8">${esc(
    byLabel,
  )}</text>
  ${
    verified
      ? `<text x="${rtl ? 72 : W - 72}" y="596" text-anchor="${rtl ? 'start' : 'end'}" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#39d98a">${esc(
          couponLabel,
        )} ${esc(coupon)}</text>`
      : `<text x="${rtl ? 72 : W - 72}" y="596" text-anchor="${rtl ? 'start' : 'end'}" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#4f8cff">${esc(
          url.replace(/^https?:\/\//, ''),
        )}</text>`
  }
</svg>`
}

/** اسمُ الملف: من الدرجة والتاريخ، فيبقى كلُّ تنزيلٍ ملفًا قائمًا بذاته */
export const cardName = ({ slug = 'ats', ext = 'svg' } = {}) => `qalb-${slug}-card-${new Date().toISOString().slice(0, 10)}.${ext}`

/**
 * PNG من الـSVG — على المتصفح وحده، بلا خدمةِ تحويل. إن لم تتوفّر canvas (أو في
 * بيئةِ اختبار) تُرجع null فتنزّل الصفحةُ الـSVG، فلا زرٌّ يكذب.
 */
export function svgToPng(svg, { w = W, h = H } = {}) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return Promise.resolve(null)
  return new Promise((done) => {
    try {
      const img = new Image()
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
      let settled = false
      const finish = (v) => {
        if (settled) return
        settled = true
        URL.revokeObjectURL(url)
        done(v)
      }
      img.onload = () => {
        const cv = document.createElement('canvas')
        cv.width = w
        cv.height = h
        const ctx = cv.getContext?.('2d')
        if (!ctx) return finish(null)
        ctx.drawImage(img, 0, 0, w, h)
        try {
          cv.toBlob((b) => finish(b || null), 'image/png')
        } catch {
          finish(null)
        }
      }
      img.onerror = () => finish(null)
      img.src = url
      setTimeout(() => finish(null), 4000)
    } catch {
      done(null)
    }
  })
}

/** نصٌّ جاهزٌ للّصق في LinkedIn أو واتساب — الرابطُ فيه يعود إلى المتجر */
export function shareText({ title = '', scoreLabel = '', bandLabel = '', url = '', coupon = '', couponLabel = '', lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const parts = [title, `${scoreLabel} — ${bandLabel}`]
  if (coupon) parts.push(ar ? `${couponLabel} ${coupon}` : `${couponLabel} ${coupon}`)
  parts.push(url)
  return parts.filter(Boolean).join('\n')
}

export const CARD_W = W
export const CARD_H = H

export default { cardSvg, cardName, couponFor, svgToPng, shareText, CARD_W, CARD_H }
