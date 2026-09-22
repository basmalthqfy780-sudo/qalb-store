/**
 * بيانات التواصل في مكان واحد بدل نسخها في كل صفحة.
 * qalb@qalb.store هو البريد الرسمي للموقع؛ يمكن تجاوزه مؤقتًا بـ VITE_QALB_MAIL في .env.
 */
const env = (k) =>
  String(import.meta.env?.[k] || '')
    .trim()
    .replace(/^"|"$/g, '')

export const SUPPORT_MAIL = (env('VITE_QALB_MAIL') || 'qalb@qalb.store').trim()
export const SUPPORT_MAILTO = `mailto:${SUPPORT_MAIL}`

/**
 * حسابات التواصل الاجتماعي — أيقونات التذييل و`sameAs` في JSON-LD تقرأان من هنا.
 * القيم الافتراضية روابطُ العلامة المبدئية، ولربط حساباتك الحقيقية ضعها في `.env`
 * (VITE_QALB_X وVITE_QALB_IG وVITE_QALB_LI وVITE_QALB_BE) — لا تُحرَّر الملفات.
 * أيقونات بلا رابط مُوثَّق لا تُنشر: الحقل الفارغ يُبقي الرابط الافتراضي، وحذف
 * السطر من هنا يُسقط الأيقونة من التذييل ومن sameAs معًا.
 */
export const SOCIAL = [
  { k: 'x', label: 'X', href: env('VITE_QALB_X') || 'https://x.com/qalbstore' },
  { k: 'ig', label: 'Instagram', href: env('VITE_QALB_IG') || 'https://instagram.com/qalbstore' },
  { k: 'li', label: 'LinkedIn', href: env('VITE_QALB_LI') || 'https://linkedin.com/company/qalbstore' },
  { k: 'be', label: 'Behance', href: env('VITE_QALB_BE') || 'https://behance.net/qalbstore' },
]

/**
 * بياناتٌ لا نعرفها ولا نختلقها: يبقى الحقلان null ما لم يضعهما المالك في .env
 * (VITE_QALB_PHONE وVITE_QALB_BOOKING)، فلا تظهر على الصفحة ولا في الطباعه ولا في
 * عرض السعر — ولا زرٌّ يقول «اتصل» ورقمه فراغ.
 */
import { COMPANY } from './company.js'
export const SUPPORT_PHONE = COMPANY.phone
export const BOOKING_URL = COMPANY.bookingUrl
