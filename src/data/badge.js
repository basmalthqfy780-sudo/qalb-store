/**
 * شارةُ «صُنع بواسطة Qalb Store» في فوترِ كلِّ قالبٍ وكلِّ صفحةٍ منشورة.
 *
 * كلُّ موقعِ عميلٍ لوحةُ إعلانٍ لنا — هذه هي الفكرة، وأداتُها سطرٌ صغيرٌ في الفوتر
 * برابطٍ نشط يعود بمن ضغط عليه إلى الصفحة الرئيسية للمتجر (`SITE_HOME`). والشارةُ
 * تُشترى إزالتُها: برخصة White-label لمرةٍ واحدة (إضافةُ `badge-off` من جدول
 * src/data/upsells.js — سعرُها يُقرأ من هناك لا من هنا)، أو مجانًا وتلقائيًا ضمن
 * اشتراك Qalb Pro — ومثله Qalb Plus — فمن لا يريد الشارة طريقان لإسقاطها،
 * ولا أحدُ محبوسٌ في علامة.
 *
 * ثلاثُ حالاتٍ تُحسب في `badgeState`، وكلها مرئيةٌ لصاحبها قبل الدفع:
 *   • `shown`  — الشارةُ في الفوتر (الوضعُ الافتراضي لكلِّ قالب).
 *   • `plan`   — اشتراك Pro (أو Plus) يُسقطها، فمن يدفع اشتراكًا لا يُطلب منه شراءٌ ثانٍ.
 *   • `paid`   — رخصة White-label (`badge-off`) تُسقطها لمرةً واحدة بلا اشتراك.
 *
 * والشارةُ لا تُخبّأ خلف غموض: الصفحةُ تُظهرها قبل الشراء كما ستظهر بعده.
 * اللفظُ نفسُه يُطبع في ثلاثة أماكن — ملفّات الحزمة، والصفحة المستضافة، وشريط
 * الاستضافة — لكنه يُكتب مرةً واحدة هنا (`badgeText`)، فلا تنفصم نسخةٌ عن نسخة.
 */
export const BADGE_ID = 'badge-off'
export const SITE_HOME = 'https://qalb.store'

/** نصُّ الشارة بلا وسوم: يُطبع في الحزمة وفي شريط الاستضافة من مكانٍ واحد */
export function badgeText(lang = 'ar') {
  return lang === 'en' ? 'Made with Qalb Store' : 'صُنع بواسطة Qalb Store'
}

/** أثرُ الشارة في ملفٍّ واحد: سطرٌ في الفوتر، ووصلةٌ واحدة نشطة لا غير */
export function badgeHtml({ lang = 'ar' } = {}) {
  const ar = lang !== 'en'
  const text = badgeText(lang)
  const title = ar ? 'Qalb Store — قوالب مواقع وسِيَر' : 'Qalb Store — portfolio &amp; résumé templates'
  return `<a class="qalb-badge" href="${SITE_HOME}" target="_blank" rel="noopener" title="${title}" style="display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border:1px solid #2a3242;border-radius:999px;font:600 11px/1.5 system-ui;color:#8b95a8;text-decoration:none">${text}</a>`
}

/**
 * قرارُ الشارة من خطة الاشتراك وإضافات الطلب. `addons` مصفوفةُ معرّفات (كما
 * تُحفظ في الطلب)، و`plan` خطةُ الاشتراك أو الاستضافة — لا يُقرأ إلا هذان،
 * فالقرارُ في مكانٍ واحد: الحزمة المنزّلة والصفحة المستضافة والاستوديو كلها
 * تسأل هذه الدالة، فلا تُسقط يدٌ ما تُظهره أخرى.
 */
export function badgeState({ plan = 'free', addons = [] } = {}) {
  const list = Array.isArray(addons) ? addons.map(String) : []
  const paid = list.includes(BADGE_ID)
  const upgraded = plan === 'pro' || plan === 'plus'
  return {
    shown: !paid && !upgraded,
    reason: paid ? 'paid' : upgraded ? 'plan' : 'default',
    removable: !paid && !upgraded,
    // إزالتها مجانًا في الاشتراك: تُقال هكذا، لا تُخبَّأ
    freeWithPlan: true,
  }
}

/** أين تُدرج الشارة: آخرُ سطرٍ في الفوتر قبل إغلاق الجسم — لا تُحقن في وسط المحتوى */
export function withBadge(html, { lang = 'ar', shown = true } = {}) {
  if (!shown) return String(html || '')
  const mark = badgeHtml({ lang })
  const out = String(html || '')
  return out.includes('</body>') ? out.replace('</body>', `${mark}\\n</body>`) : `${out}\\n${mark}`
}

export default { badgeHtml, badgeState, badgeText, withBadge, BADGE_ID, SITE_HOME }
