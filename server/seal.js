/**
 * كل ما يتعلمه المتجر عن مشتري ينتهي في ملف بجانب الكود: دفتر الطلبات (الاسم
 * والبريد والجوال والنبذة التي كتبها بنفسه)، دفتر التنزيلات (عنوان IP وأي طلب
 * فُتح برابطه)، hashes حسابات الإدارة، ومفاتيح التوقيع.
 *
 * `{ mode: 0o600 }` في `writeFile` يُطبَّق عند **الإنشاء فقط** — فإن كان المجلد
 * سابقًا لهذا الشرط (أو أنشأه مشغّل بمضيف مشترك) بقيت الملفات مقروءة للجميع إلى
 * الأبد. لهذا نعيد ختم الموجود عند كل إقلاع، ونستعمل نفس الوضع عند كل إلحاق سطر.
 */
import { chmodSync, existsSync } from 'node:fs'
import path from 'node:path'

export const PRIVATE = 0o600
/** الملف الذي يوضع بمفرده في مجلد البيانات ولا يجوز أن يقرأه سواك. */
export const PRIVATE_FILES = ['orders.jsonl', 'downloads.jsonl', 'admins.json', '.admin-secret', '.download-secret']

export function sealFile(file) {
  try {
    if (existsSync(file)) chmodSync(file, PRIVATE)
  } catch {
    /* بعض الأحمال (NFS, mount بقراءة فقط) ترفض chmod: وضع الإنشاء وحده ما يبقى */
  }
}

/** يختم كل ملف موجود في `dir` ويعيد أسماء ما ختمه فعلًا — للعرض في سجل الإقلاع. */
export function sealDir(dir, names = PRIVATE_FILES) {
  const sealed = []
  for (const n of names) {
    const f = path.join(dir, n)
    if (!existsSync(f)) continue
    sealFile(f)
    sealed.push(n)
  }
  return sealed
}
