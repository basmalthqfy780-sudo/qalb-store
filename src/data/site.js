/**
 * النطاق الأساسي للموقع — المصدر الواحد لكل رابط مطلق في الواجهة:
 * canonical وog:url وog:image وhreflang وجُمل JSON-LD كلها تُبنى منه، فيبقى
 * canonical مطابقًا لما يكتبه scripts/seo.mjs في sitemap.xml وrobots.txt ولا ينجرف
 * أحدهما عن الآخر.
 *
 * التبديل إلى نطاق جديد (مثلًا رابط vercel.app أثناء إصلاح DNS): ضع القيمة نفسها
 * في `SITE_URL` (لمولّد الملفات) و`VITE_SITE_URL` (للواجهة) داخل `.env` ثم
 * `npm run gen:seo` — لا تعديلَ ملفًا ملفًا.
 */
const env = (k) =>
  String(import.meta.env?.[k] || '')
    .trim()
    .replace(/^"|"$/g, '')

export const SITE_URL = (env('VITE_SITE_URL') || 'https://qalb.store').replace(/\/+$/, '')

export default SITE_URL
