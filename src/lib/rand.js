/**
 * عشوائيةٌ آمنة في مكانٍ واحد — للمتصفح وللخادم معًا.
 *
 * لماذا لا `Math.random`؟ لأن ما يولَّد هنا **يفتح شيئًا مدفوعًا**: مفتاحُ الترخيص
 * الذي ينزّل الحزمة، ورقمُ الطلب الذي يفتح الإيصال، ورمزُ المؤسسة الذي يصرف
 * مقاعد عقدٍ كامل. و`Math.random` في V8 هو xorshift128+، مولّدٌ غير مشفّر تُستعاد
 * حالتُه الداخلية من مخرجاته — ومخرجاتُه كانت تُوزَّع بلا مصادقة من `/api/free`.
 *
 * `globalThis.crypto` موجود في المتصفح وفي Node منذ ١٩ (والمشروع يشترط ≥٢٠٫١١)،
 * فالسقوط إلى `Math.random` لا يحدث إلا في بيئة اختبارٍ بلا webcrypto.
 */

/** عددٌ في [0,1) من مولّد النظام الآمن، وإلا `Math.random` كأضعف الإيمان */
export function secureRandom() {
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const out = c.getRandomValues(new Uint32Array(1))[0]
    return out / 0x100000000 // 2^32: لا يصل ١ أبدًا، فلا يخرج الفهرس عن الجدول
  }
  return Math.random()
}

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** حرفٌ واحد من 0-9A-Z — نفس الأبجدية التي كان يطبعها `toString(36)` */
export const randChar = () => B36[Math.floor(secureRandom() * B36.length)]

/** مجموعةٌ رباعية: الشكل المطبوع في المفتاح لم يتغير */
export const randGroup = () => Array.from({ length: 4 }, randChar).join('')

/** `randKey(4)` → XXXX-XXXX-XXXX-XXXX */
export const randKey = (groups) => Array.from({ length: Math.max(1, groups) }, randGroup).join('-')
