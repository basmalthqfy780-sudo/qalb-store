/**
 * النطاق الأساسي للموقع — المصدر الواحد لكل رابط مطلق في الواجهة:
 * canonical وog:url وog:image وhreflang وجُمل JSON-LD كلها تُبنى منه، فيبقى
 * canonical مطابقًا لما يكتبه scripts/seo.mjs في sitemap.xml وrobots.txt ولا ينجرف
 * أحدهما عن الآخر.
 *
 * التبديل إلى نطاق جديد (مثلًا رابط vercel.app أثناء إصلاح DNS): ضع القيمة نفسها
 * في `SITE_URL` (لمولّد الملفات) و`VITE_SITE_URL` (للواجهة) داخل `.env` ثم
 * `npm run gen:seo` — لا تعديلَ ملفًا ملفًا.
 *
 * القيمةُ تمرّ بـ`rawSite` من `links.js` قبل أن تصير `SITE_URL`: قيمةٌ لُصقت من
 * محرّر Markdown (`[https://x.app](https://x.app)`) تُنزَع صيغتُها هنا مرةً واحدة،
 * فلا يصل قوسٌ إلى canonical ولا إلى og:image ولا إلى أيّ وسم.
 */
import { rawSite } from './links.js'

const env = (k) =>
  String(import.meta.env?.[k] || '')
    .trim()
    .replace(/^"|"$/g, '')

export const SITE_URL = rawSite(env('VITE_SITE_URL'))

export default SITE_URL
