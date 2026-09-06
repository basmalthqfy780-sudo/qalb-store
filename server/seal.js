/**
 * كل ما يتعلمه المتجر عن مشتري ينتهي في ملف بجانب الكود: دفتر الطلبات (الاسم
 * والبريد والجوال والنبذة التي كتبها بنفسه)، دفتر التنزيلات (عنوان IP وأي طلب
 * فُتح برابطه)، hashes حسابات الإدارة، ومفاتيح التوقيع.
 *
 * `{ mode: 0o600 }` في `writeFile` يُطبَّق عند **الإنشاء فقط** — فإن كان المجلد
 * سابقًا لهذا الشرط (أو أنشأه مشغّل بمضيف مشترك) بقيت الملفات مقروءة للجميع إلى
 * الأبد. لهذا نعيد ختم الموجود عند كل إقلاع، ونستعمل نفس الوضع عند كل إلحاق سطر.
 */
import { chmodSync, existsSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const PRIVATE = 0o600
/** الملف الذي يوضع بمفرده في مجلد البيانات ولا يجوز أن يقرأه سواك. */
export const PRIVATE_FILES = ['orders.jsonl', 'downloads.jsonl', 'admins.json', 'sites.json', 'leads.json', '.admin-secret', '.download-secret']

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

/**
 * كتابة ذرّية بوضع خاص: ملف مؤقت ثم `rename`، فلا يقرأ أحد نصف JSON إن ماتت العملية
 * في أثناء الحفظ. `mode` يسري عند الإنشاء و`chmod` يرمّم الموجود — والاثنان معًا لأن
 * `0600` وحده لا يكفي لمجلد وُجد قبل هذا الشرط.
 */
export function writePrivateJson(file, data) {
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: PRIVATE })
  renameSync(tmp, file)
  sealFile(file)
}

/** نفس الوضع لملف سطرٍ بسطر (الدفاتر): إنشاء خاص وترميم ما وُجد قبله */
export function appendPrivateLine(file, line) {
  writeFileSync(file, line, { encoding: 'utf8', flag: 'a', mode: PRIVATE })
  sealFile(file)
}
