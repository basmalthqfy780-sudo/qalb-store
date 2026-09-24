/**
 * تنزيلٌ من المتصفح — مكانٌ واحد لكل ما يُنزَّل، بلا ثلاث نسخٍ من نفس السطور.
 *
 * الملفاتُ تُبنى في المتصفح (حزمة القالب، وورقة السيرة، وقائمة الملفات)،
 * وكلُّها تُسلَّم بالطريقة نفسها: كائنُ `Blob` وعنصرُ `<a>` يُنشأ ويُزال.
 * وجمعُها هنا يمنع تكرارَها في صفحة الإيصال وصفحة الحساب — ويمنع أن تنسى
 * نسخةٌ تحريرَ الرابط (`revokeObjectURL`) فتُبقي المجلدَ في الذاكرة.
 */

/** تنزيلُ بايتاتٍ باسمٍ ونوع: حزمة ZIP، أو نص، أو أيّ ملفٍ يُبنى هنا */
export function saveBlob(filename, bytes, mime = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const saveZip = (filename, bytes) => saveBlob(filename, bytes, 'application/zip')
export const saveFile = (filename, body, mime) => saveBlob(filename, body, mime)
