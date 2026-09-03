/**
 * بيانات التواصل في مكان واحد بدل نسخها في كل صفحة.
 * qalb@qalb.store هو البريد الرسمي للموقع؛ يمكن تجاوزه مؤقتًا بـ VITE_QALB_MAIL في .env.
 */
export const SUPPORT_MAIL = (import.meta.env?.VITE_QALB_MAIL || 'qalb@qalb.store').trim()
export const SUPPORT_MAILTO = `mailto:${SUPPORT_MAIL}`
