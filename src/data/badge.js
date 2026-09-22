/**
 * شارةُ «بُنيَ بقالب» في فوترِ كلِّ قالبٍ منشور.
 *
 * كلُّ موقعِ عميلٍ لوحةُ إعلانٍ لنا — هذه هي الفكرة، وأداتُها سطرٌ صغيرٌ في الفوتر
 * يعود بمن clicking عليه إلى المتجر. والشارةُ تُشترى إزالتُها: برسومٍ رمزيةٍ لمرة،
 * أو مجانًا ضمن باقةِ «قالب بلس» الأعلى — فمن لا يريد الشارة طريقان لإسقاطها،
 * ولا أحدُ محبوسٌ في علامة.
 *
 * ثلاثُ حالاتٍ تُحسب في `badgeState`، وكلها مرئيةٌ لصاحبها قبل الدفع:
 *   • `shown`  — الشارةُ في الفوتر (الوضعُ الافتراضي لكلِّ قالب).
 *   • `plan`   — خطةُ استضافة «بلس» تُسقطها، فمن يدفع اشتراكًا لا يُطلب منه شراءٌ ثانٍ.
 *   • `paid`   — إضافةُ `badge-off` تُسقطها لمرةً واحدة بلا اشتراك.
 *
 * والشارةُ لا تُخبّأ خلف غموض: الصفحةُ تُظهرها قبل الشراء كما ستظهر بعده.
 */
export const BADGE_ID = 'badge-off'
export const SITE_HOME = 'https://qalb.store'

/** أثرُ الشارة في ملفٍّ واحد: سطرٌ في الفوتر، ووصلةٌ واحدة لا غير */
export function badgeHtml({ lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const text = ar ? 'بُنيَ بقالب' : 'Built with Qalb'
  const title = ar ? 'قالب — قوالب مواقع وسِيَر' : 'Qalb — portfolio &amp; résumé templates'
  return `<a class="qalb-badge" href="${SITE_HOME}" target="_blank" rel="noopener" title="${title}" style="display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border:1px solid #2a3242;border-radius:999px;font:600 11px/1.5 system-ui;color:#8b95a8;text-decoration:none">${text}</a>`
}

/**
 * قرارُ الشارة من خطة الاستضافة وإضافات الطلب. `addons` مصفوفةُ معرّفات (كما
 * تُحفظ في الطلب)، و`plan` خطةُ الاستضافة — لا يُقرأ إلا هذان، فالقرارُ في مكانٍ واحد.
 */
export function badgeState({ plan = 'free', addons = [] } = {}) {
  const list = Array.isArray(addons) ? addons.map(String) : []
  const paid = list.includes(BADGE_ID)
  const upgraded = plan === 'pro' || plan === 'plus'
  return {
    shown: !paid && !upgraded,
    reason: paid ? 'paid' : upgraded ? 'plan' : 'default',
    removable: !paid && !upgraded,
    // إزالتها مجانًا في الباقة الأعلى: تُقال هكذا، لا تُخبَّأ
    freeWithPlan: true,
  }
}

/** أين تُدرج الشارة: آخرُ سطرٍ في الفوتر قبل إغلاق الجسم — لا تُحقن في وسط المحتوى */
export function withBadge(html, { lang = 'ar', shown = true } = {}) {
  if (!shown) return String(html || '')
  const mark = badgeHtml({ lang })
  const out = String(html || '')
  return out.includes('</body>') ? out.replace('</body>', `${mark}\n</body>`) : `${out}\n${mark}`
}

export default { badgeHtml, badgeState, withBadge, BADGE_ID, SITE_HOME }
