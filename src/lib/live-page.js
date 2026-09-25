/**
 * «الصفحة الحيّة» في صفحة القالب: الملفُّ الذي يُسلَّم في الحزمة نفسه — من
 * `packageFiles` لا من نسخةٍ مرسومةٍ للعرض — مُعَدًّا ليعمل داخل iframe بـ`srcDoc`.
 *
 * ما يتغيّر عن الملفّ المُسلَّم ثلاثةُ أشياء فقط، كلُّها لازمةٌ لأن الإطار بلا مسار:
 *   1. `<link href="styles.css">` يُستبدل بمحتوى styles.css من الحزمة نفسها (مضمّنًا).
 *   2. `assets/content.js` يُحذف: الإطار معزول (`sandbox=""`) فلا سكربت يعمل أصلًا،
 *      والصفحة تحمل محتواها في HTML، فلا يتغيّر ما يُرى.
 *   3. `<base target="_blank">`: النقر على رابطٍ داخل الإطار المعزول لا يفتح شيئًا
 *      (لا allow-popups)، بدل أن يتنقّل الإطار إلى مسارٍ غير موجود.
 */
import { packageFiles } from '../data/deliverable.js'

const cache = new Map()

/** @returns {{ html: string, file: string } | null} */
export function livePage(tpl, kind) {
  if (!tpl) return null
  const want = tpl.type === 'cv' || kind === 'cv' ? 'resume.html' : 'index.html'
  const key = `${tpl.id}:${want}:${tpl.price}`
  if (cache.has(key)) return cache.get(key)
  let files
  try {
    files = packageFiles(tpl)
  } catch {
    return null
  }
  const page = files.find((f) => f.path === want)
  if (!page) return null
  const css = files.find((f) => f.path === 'styles.css')
  const style = `<style>${css ? css.body.replace(/<\/style/gi, '<\\/style') : ''}</style>`
  const html = page.body
    .replace(/<link rel="stylesheet" href="\/?styles\.css"\s*\/?>/i, () => style)
    .replace(/<script src="assets\/content\.js"[^>]*>\s*<\/script>/i, '')
    .replace(/<head>/i, '<head>\n    <base target="_blank" />')
  const out = { html, file: want }
  cache.set(key, out)
  return out
}
