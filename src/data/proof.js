/**
 * شريحةُ صدق المنتج — نصٌّ واحد لكل حالة، مصدرُه وحده.
 *
 * المشكلة التي وُلد منها: كل منتج كان يحمل `rating` و`reviews` و`sales` مكتوبة
 * بخط اليد، فصار المتجر يعرض ١٧٬٦٩٠ «مبيعة» و٤٫٨٥ نجمة في JSON-LD وفي بطاقات
 * المشاركة — وفي دفاتره صفر. حقلٌ مُخترع واحد ينتشر في ستّ واجهات (البطاقة،
 * المعاينة السريعة، صفحة المنتج، الرئيسية، القاموس، بطاقة OG) فتُصحّحه في
 * ستة مواضع أو لا تُصحّحه أبدًا.
 *
 * الحلّ: `proof` مفتاحٌ في بيانات المنتج (`src/data/templates.js`) وقيمتُه محصورة
 * في ثلاث حالات نعرفها فعلًا، والنصُّ في القاموس تحت `chips.*`:
 *   • approved — تصميمٌ مرّ على مراجعةٍ بشرية عندنا ونُشر. لا يعني بيعًا ولا تقييمًا.
 *   • tested   — ملفّاتٌ مقيسة آليًا (درجة ATS/الأداء في نفس السجلّ).
 *   • early    — لا تقييمات بعد: يُقال ذلك صراحةً بدل نجومٍ مُخترعة.
 *
 * و`scoreKeyOf`/`perfKeyOf` لا تُستعملان إلا حين تكون الدرجة موجودة فعلًا؛ فمنتجٌ
 * بلا قياسٍ لا يُعرض بدرجة، والفحص في tests/smoke.mjs يرفض شريحةً بلا نصٍّ في اللغتين.
 */
export const PROOF_KEYS = {
  approved: 'chips.approved',
  tested: 'chips.tested',
  early: 'chips.early',
}

export const PROOF_STATES = Object.keys(PROOF_KEYS)

/** مفتاحُ الترجمة لشريحة المنتج؛ وما لا يُعرف يُقال عنه «تقييمات مبكرة» لا فراغٌ صامت */
export const proofKeyOf = (tpl) => PROOF_KEYS[tpl?.proof] || PROOF_KEYS.early

/** درجةُ الفحص إن قُيست فعلًا — `null` تعني «لا شريحة»، لا صفرًا مضلّلًا */
export const scoreOf = (tpl) => (Number.isFinite(Number(tpl?.ats)) && Number(tpl.ats) > 0 ? Math.round(Number(tpl.ats)) : null)
export const perfOf = (tpl) => (Number.isFinite(Number(tpl?.perf)) && Number(tpl.perf) > 0 ? Math.round(Number(tpl.perf)) : null)

export default { PROOF_KEYS, PROOF_STATES, proofKeyOf, scoreOf, perfOf }
