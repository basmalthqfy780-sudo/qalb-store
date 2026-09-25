/**
 * القاموس كاملًا بلغتيه — للقراءة من **Node** لا من حزمة المتجر.
 *
 * من يستورده: `scripts/seo.mjs` (يولّد llms.txt وsitemap من نصوص الصفحات)،
 * والفحوصات (`tests/smoke.mjs` تقارن المعروض في jsdom بما في القاموس). أما
 * التطبيق فيأخذ لغةً واحدة عبر `src/i18n/loader.js` — ولو استورد هذا الملف
 * لدخلت اللغتان معًا في حزمة الدخول، وهذا بالضبط ما قُسّم القاموس لأجله.
 *
 * اللغة الواحدة في `src/i18n/locales/ar.js` و`en.js`، وأقسامُ نموذج الربح فيهما
 * مولَّدة بـ`scripts/revenue-i18n.py`.
 */
import ar from './locales/ar.js'
import en from './locales/en.js'

export const dict = { ar, en }

export default dict
