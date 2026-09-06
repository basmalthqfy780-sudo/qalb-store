/**
 * بيانات التواصل في مكان واحد بدل نسخها في كل صفحة.
 * qalb@qalb.store هو البريد الرسمي للموقع؛ يمكن تجاوزه مؤقتًا بـ VITE_QALB_MAIL في .env.
 */
export const SUPPORT_MAIL = (import.meta.env?.VITE_QALB_MAIL || 'qalb@qalb.store').trim()
export const SUPPORT_MAILTO = `mailto:${SUPPORT_MAIL}`

/**
 * بياناتٌ لا نعرفها ولا نختلقها: يبقى الحقلان null ما لم يضعهما المالك في .env
 * (VITE_QALB_PHONE وVITE_QALB_BOOKING)، فلا تظهر على الصفحة ولا في الطباعه ولا في
 * عرض السعر — ولا زرٌّ يقول «اتصل» ورقمه فراغ.
 */
import { COMPANY } from './company.js'
export const SUPPORT_PHONE = COMPANY.phone
export const BOOKING_URL = COMPANY.bookingUrl
