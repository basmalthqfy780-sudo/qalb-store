/**
 * البصمة البصرية (Perceptual Hash) — الطبقة الثانية من خط الفحص الآلي.
 *
 * ما تفعله هذه الوحدة فعلًا، وما لا تدّعيه:
 *
 *   • **تحسب بصمةً حقيقية**: صورة → مصفوفة رمادية مصغّرة (٨×٨) → `aHash`
 *     (متوسط الشدة) و`dHash` (فروق الجوار). الاثنان دوالّ نقية تُختبر بمصفوفات
 *     مُصنَّعة في tests/smoke.mjs، فلا يعتمد الفحص على متصفح.
 *   • **تقارن بمسافة هامينغ**: تشابهٌ ≥ 0.90 يعني «على الأرجح نفس الصورة».
 *     الرقم حدٌّ معلَن لا حكمٌ مطلق — والقرار النهائي في الطبقة الرابعة.
 *   • **لا تفكّ صيغ الصور بنفسها**: فكّ البايتات يحتاج قارئ صور، والموجود في
 *     المتصفح هو canvas. فإن غاب (بيئة اختبار، أو متصفحٌ بلا canvas) تُعيد
 *     `{ ok:false, reason:'no-canvas' }` — والطبقة الثانية تُسجَّل «متجاوَزة
 *     بسببٍ معلن» وتُضيف نقاط خطر، بدل أن تُمرَّر على أنها نظيفة. هذا هو الفرق
 *     بين فحصٍ صادق وفحصٍ يزيّن نفسه.
 *   • **بصمة البايتات** (SHA-256 حين يتوفر `crypto.subtle`، وإلا FNV-1a مع
 *     تسمية الخوارزمية في التقرير) تلتقط النسخة الحرفية نفسها ولو اختلف اسم الملف.
 *
 * قاعدة المطابقة: لا قاعدة بيانات صور تجارية موصولة هنا. المرجعُ الموجود هو
 * (١) صور البائع نفسه في إدراجاته السابقة، و(٢) ملف مرجعي يرفعه الموظف
 * (`server/phash-db.json`). فإن خلا المرجع قالت الطبقة «لا مرجع بعد» وأعطت
 * صفر نقاط — لا نجاحًا مُختلَقًا.
 */

/** حجم البصمة: ٨×٨ ⇒ ٦٤ بت ⇒ ١٦ محرفًا ست عشريًا */
export const HASH_SIZE = 8
/** حدّ التشابه الذي يُعدّ عنده «نسخة على الأرجح» — 0.90 */
export const DUP_THRESHOLD = 0.9
/** حدّ أعلى: فوقه تُعدّ مطابقةً شبه حرفية */
export const NEAR_EXACT = 0.97

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))

/**
 * luminance من RGBA — نفس معاملات Rec. 709 التي يستعملها المتصفح لـ`filter: grayscale()`.
 */
export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/**
 * تصغير صورة (بأي مقاس) إلى مصفوفة رمادية `size×size` بمتوسط المربعات.
 * نقية: تُختبر بمصفوفات مُصنَّعة، فلا تحتاج صورة حقيقية.
 *
 * @param {Uint8ClampedArray|number[]} rgba بكسلات RGBA متتابعة
 * @param {number} sw عرض المصدر
 * @param {number} sh ارتفاع المصدر
 * @param {number} size مقاس المصفوفة الناتجة (٨ افتراضيًا)
 * @returns {number[][]} مصفوفة `size×size` من 0–255
 */
export function resampleGray(rgba, sw, sh, size = HASH_SIZE) {
  const n = Math.max(1, Math.min(64, Math.floor(size)))
  const W = Math.max(1, Math.floor(sw))
  const H = Math.max(1, Math.floor(sh))
  const out = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let y = 0; y < n; y++) {
    const y0 = Math.floor((y * H) / n)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * H) / n))
    for (let x = 0; x < n; x++) {
      const x0 = Math.floor((x * W) / n)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * W) / n))
      let sum = 0
      let count = 0
      for (let yy = y0; yy < y1 && yy < H; yy++) {
        for (let xx = x0; xx < x1 && xx < W; xx++) {
          const i = (yy * W + xx) * 4
          sum += luma(rgba[i] || 0, rgba[i + 1] || 0, rgba[i + 2] || 0)
          count++
        }
      }
      out[y][x] = clamp255(count ? sum / count : 0)
    }
  }
  return out
}

const bitsToHex = (bits) => {
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nib = bits.slice(i, i + 4).reduce((a, b) => (a << 1) | (b ? 1 : 0), 0)
    hex += nib.toString(16)
  }
  return hex
}

/**
 * aHash: كل بكسل فوق متوسط الشدة ⇒ ١. بصمةٌ سريعة تقاوم تغيير المقاس
 * والسطوع الخفيف، وتضعف أمام القصّ — ولهذا تُرافقها `dHash`.
 */
export function aHash(matrix) {
  const flat = matrix.flat()
  if (!flat.length) return ''
  const avg = flat.reduce((a, b) => a + b, 0) / flat.length
  return bitsToHex(flat.map((v) => v > avg))
}

/**
 * dHash: هل البكسل أفتح من جاره الأيمن؟ فتلتقط الحواف والاتجاه، وهي أقوى من
 * aHash أمام تغيّر التباين.
 *
 * عدد البتات = صفوف × (أعمدة − ١): على مصفوفة ٨×٨ هي ٥٦ بتًا لا ٦٤، ولهذا
 * تُمرّرها `hashMatrix` على `resampleWider` (٩ أعمدة) فتخرج ٦٤ بتًا كاملة
 * مثل aHash — فالبصمتان تُقارنان بطولٍ واحد.
 */
export function dHash(matrix) {
  if (!matrix.length || !matrix[0].length) return ''
  const bits = []
  for (const row of matrix) for (let x = 0; x < row.length - 1; x++) bits.push(row[x] < row[x + 1])
  return bitsToHex(bits)
}

/** البصمتان معًا — تُحفظان في الإدراج وتُطابق إحداهما تكفي للتنبيه */
export function hashMatrix(matrix, size = HASH_SIZE) {
  const m = matrix.length === size && matrix[0]?.length === size ? matrix : resampleGrayFromMatrix(matrix, size)
  return { a: aHash(m), d: dHash(resampleWider(m)) }
}

/** مصفوفة→مصفوفة بمقاس آخر (بمتوسط المربعات) — تستعملها hashMatrix إن اختلف المقاس */
function resampleGrayFromMatrix(matrix, size) {
  const H = matrix.length
  const W = matrix[0]?.length || 0
  const flat = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) flat.set([matrix[y][x], matrix[y][x], matrix[y][x], 255], (y * W + x) * 4)
  return resampleGray(flat, W, H, size)
}

/** نسخة أعرض بعمود واحد لـdHash (٩ أعمدة ⇒ ٦٤ بت على ٨ صفوف) */
function resampleWider(m) {
  const H = m.length
  const W = m[0]?.length || 0
  if (W === HASH_SIZE + 1) return m
  const flat = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) flat.set([m[y][x], m[y][x], m[y][x], 255], (y * W + x) * 4)
  return resampleGray(flat, W, H, HASH_SIZE + 1)
    .map((row, y) => (y < HASH_SIZE ? row : row.slice(0, HASH_SIZE + 1)))
    .slice(0, HASH_SIZE)
}

/** مسافة هامينغ بين بصمتين ست عشريتين — -1 إن اختلف الطول أو فسدت الصيغة */
export function hamming(a, b) {
  const x = String(a || '').toLowerCase()
  const y = String(b || '').toLowerCase()
  if (!x || !y || x.length !== y.length || /[^0-9a-f]/.test(x + y)) return -1
  let d = 0
  for (let i = 0; i < x.length; i++) {
    let v = parseInt(x[i], 16) ^ parseInt(y[i], 16)
    while (v) {
      d += v & 1
      v >>= 1
    }
  }
  return d
}

/** التشابه 0–1: 1 = متطابقتان. تُحسب من هامينغ على طول البصمة */
export function similarity(a, b) {
  const d = hamming(a, b)
  if (d < 0) return 0
  return Math.round((1 - d / (a.length * 4)) * 1000) / 1000
}

/**
 * أقرب مرجعٍ في القاعدة. `db` قائمة `{ ref, a, d }`، وتُعاد أفضل مطابقة
 * فوق الحدّ مع المسافة — فالقرار يحتاج رقمًا لا «نعم/لا».
 */
export function duplicateOf(hash, db = [], threshold = DUP_THRESHOLD) {
  const list = Array.isArray(db) ? db : []
  let best = null
  for (const item of list) {
    const s = Math.max(similarity(hash?.a || '', item.a || ''), similarity(hash?.d || '', item.d || ''))
    if (s >= threshold && (!best || s > best.similarity)) best = { ...item, similarity: s }
  }
  return best
}

/** مطابقات داخل الإدراج نفسه: صورتان بالبصمة ذاتها = ملف مكرر */
export function innerDuplicates(images = [], threshold = DUP_THRESHOLD) {
  const list = (Array.isArray(images) ? images : []).filter((i) => i && (i.a || i.phash))
  const hits = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const s = similarity(list[i].a || list[i].phash, list[j].a || list[j].phash)
      if (s >= threshold) hits.push({ a: list[i].name || i, b: list[j].name || j, similarity: s })
    }
  }
  return hits
}

/* ------------------------------------------------------------------ *
 * من ملف صورة إلى مصفوفة — الطبقة التي تحتاج متصفحًا، ومعها الاعتراف
 * حين لا يتوفر.
 * ------------------------------------------------------------------ */

const canvasOk = () => {
  try {
    if (typeof document === 'undefined') return false
    const c = document.createElement('canvas')
    return !!(c && typeof c.getContext === 'function' && c.getContext('2d'))
  } catch {
    return false
  }
}

/**
 * فكّ صورة إلى مصفوفة رمادية ٨×٨.
 * @returns {Promise<{ok:true, matrix:number[][], width:number, height:number}|{ok:false, reason:string}>}
 */
export async function imageMatrix(file) {
  if (!file) return { ok: false, reason: 'no-file' }
  if (!canvasOk()) return { ok: false, reason: 'no-canvas' }
  try {
    const bmp =
      typeof createImageBitmap === 'function'
        ? await createImageBitmap(file)
        : await new Promise((res, rej) => {
            const img = new Image()
            img.onload = () => res(img)
            img.onerror = () => rej(new Error('decode'))
            img.src = URL.createObjectURL(file)
          })
    const w = bmp.width || 1
    const h = bmp.height || 1
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) return { ok: false, reason: 'no-canvas' }
    ctx.drawImage(bmp, 0, 0)
    const data = ctx.getImageData(0, 0, w, h).data
    if (bmp.close) bmp.close()
    return { ok: true, matrix: resampleGray(data, w, h, HASH_SIZE), width: w, height: h }
  } catch (e) {
    return { ok: false, reason: `decode-failed:${String(e?.message || e).slice(0, 40)}` }
  }
}

/* ------------------------------------------------------------------ *
 * بصمة البايتات — SHA-256 حين يوجد، وFNV-1a مُسمّى حين لا يوجد.
 * ------------------------------------------------------------------ */

/** FNV-1a ‏32 بت: بديلٌ مسمّى حين يغيب crypto.subtle — لا يُدّعى أنه SHA */
export function fnv1a(bytes) {
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `fnv1a:${h.toString(16).padStart(8, '0')}`
}

/**
 * بصمة محتوى الملف. `algo` يقول أي خوارزمية أُنتجت — فالتقرير لا يوحي
 * بشدةٍ ليست فيه.
 */
export async function byteDigest(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
  try {
    if (globalThis.crypto?.subtle?.digest) {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', arr)
      return { algo: 'sha-256', value: Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('') }
    }
  } catch {
    /* يسقط إلى البديل المسمّى */
  }
  return { algo: 'fnv-1a', value: fnv1a(arr) }
}

/** بصمة كاملة لصورة واحدة: ما يُرسَل في الإدراج */
export async function hashImage(file) {
  const out = { name: file?.name || 'image', source: 'unavailable', a: '', d: '', bytes: '', algo: '', width: 0, height: 0, reason: '' }
  if (file?.arrayBuffer) {
    try {
      const digest = await byteDigest(new Uint8Array(await file.arrayBuffer()))
      out.bytes = digest.value
      out.algo = digest.algo
    } catch {
      out.reason = 'read-failed'
    }
  }
  const m = await imageMatrix(file)
  if (m.ok) {
    const h = hashMatrix(m.matrix)
    out.a = h.a
    out.d = h.d
    out.source = 'canvas'
    out.width = m.width
    out.height = m.height
  } else {
    out.reason = out.reason || m.reason
  }
  return out
}

export default { HASH_SIZE, DUP_THRESHOLD, resampleGray, aHash, dHash, hamming, similarity, duplicateOf, hashImage }
