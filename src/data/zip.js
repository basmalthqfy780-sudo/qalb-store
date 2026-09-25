/**
 * أرشيف ZIP بلا أي اعتماد خارجي، ومكتوب ليستخدمه المتجر والخادم معًا:
 * في الوضع المحلي (`VITE_QALB_API=local`) يُبنى الحزمة داخل المتصفح ويُنزَّل Blob من نفس البايتات،
 * وفي وضع REST يبنيه `server/deliver.js` من نفس مولّد الملفات، فلا يتفاوت ما يراه
 * المشتري في «ما ستستلمه» مع ما يُرسَل إليه فعلًا.
 *
 * تُخزَّن المدخلات بلا ضغط (method 0 — stored): الملفات نصية صغيرة، والميزة هنا
 * سلامة التنزيل لا نسبة الضغط: لا مكتبة إنflater في المتصفح ولا في الخادم، ويظل
 * الأرشيف مقبولًا في `unzip` وFinder و«استخراج الكل» في Windows.
 */

const CRCT = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

/** CRC-32 بنفس كثيرات الحدود التي يطلبها تنسيق ZIP */
export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRCT[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** DOS date/time من طابع زمني JS — حقول إلزامية في رأس ZIP */
function dosTime(ms) {
  const d = new Date(ms)
  const y = Math.max(1980, d.getFullYear())
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f)
  const date = ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

/**
 * @param {{path:string, body:string|Uint8Array}[]} files — النصوص تُرمَّز UTF-8،
 *   وما جاء Uint8Array (صور المستخدم في استوديو التصدير) يُكتب بايتاته كما هي
 * @param {number} [when] طابع تعديل المدخلات، افتراضيًا الآن
 * @returns {Uint8Array} بايتات أرشيف ZIP جاهزة للكتابة أو للـ Blob
 */
export function zipStore(files, when = Date.now()) {
  const enc = new TextEncoder()
  const { time, date } = dosTime(when)
  const parts = []
  const central = []
  let offset = 0

  files.forEach((f) => {
    const name = enc.encode(String(f.path).replace(/\\/g, '/').replace(/^\/+/, ''))
    const body = f.body instanceof Uint8Array ? f.body : enc.encode(String(f.body))
    const crc = crc32(body)

    const local = new Uint8Array(30 + name.length + body.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true) // توقيع رأس الملف المحلي
    lv.setUint16(4, 20, true) // نسخة التنسيقه المطلوبة
    lv.setUint16(6, 0x0800, true) // علم UTF-8 للأسماء (الملفات عربية أحيانًا)
    lv.setUint16(8, 0, true) // طريقة التخزين: 0 = بلا ضغط
    lv.setUint16(10, time, true)
    lv.setUint16(12, date, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, body.length, true)
    lv.setUint32(22, body.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    local.set(body, 30 + name.length)
    parts.push(local)

    const cd = new Uint8Array(46 + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // نسخة المُنشئ
    cv.setUint16(6, 20, true) // نسخة التنسيقه المطلوبة
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, body.length, true)
    cv.setUint32(24, body.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cv.setUint32(38, 0o644 << 16, true) // صلاحيات unix في الحقل الخارجي
    cd.set(name, 46)
    central.push(cd)

    offset += local.length
  })

  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + cdSize + 22)
  let at = 0
  for (const p of [...parts, ...central, end]) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** قراءة قائمة أسماء المدخلات من أرشيف stored — تُستعمل في الاختبارات للتحقق من الحزمة */
export function zipNames(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const enc = new TextDecoder()
  // نمرّ على رؤوس الملفات المحليّة مباشرةً: لا تعتمد على الفهرس المركزي فيكون الفحص أدنى
  const names = []
  let i = 0
  while (i + 30 <= bytes.length && v.getUint32(i, true) === 0x04034b50) {
    const size = v.getUint32(i + 18, true)
    const nLen = v.getUint16(i + 26, true)
    const eLen = v.getUint16(i + 28, true)
    names.push(enc.decode(bytes.subarray(i + 30, i + 30 + nLen)))
    i += 30 + nLen + eLen + size
  }
  return names
}

/**
 * قراءة ملف واحد من أرشيف stored — مع التحقق من CRC، فلا يكتفي الفحص بوجود الاسم.
 * تُستعمل في الاختبارات (للتأكد أن ما يُلغَه المشتّر هو ما كُتب فعلًا) وفي أي مكان
 * يحتاج قراءة ما داخل الحزمة بلا مكتبة فك ضغط.
 */
export function zipRead(bytes, want) {
  const hit = zipBytes(bytes, want)
  return hit ? new TextDecoder().decode(hit) : null
}

/**
 * قراءة ملف واحد كبايتات خام (صور، خطوط) — نفس التحقق بـCRC، وبلا ترميز نصّي
 * يُفسد ما ليس نصًّا.
 */
export function zipBytes(bytes, want) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const enc = new TextDecoder()
  let i = 0
  while (i + 30 <= bytes.length && v.getUint32(i, true) === 0x04034b50) {
    const crc = v.getUint32(i + 14, true)
    const size = v.getUint32(i + 18, true)
    const nLen = v.getUint16(i + 26, true)
    const eLen = v.getUint16(i + 28, true)
    const name = enc.decode(bytes.subarray(i + 30, i + 30 + nLen))
    const body = bytes.subarray(i + 30 + nLen, i + 30 + nLen + size)
    if (name === want) {
      if (crc32(body) !== crc) throw new Error(`zipBytes: crc mismatch in ${name}`)
      return body
    }
    i += 30 + nLen + eLen + size
  }
  return null
}
