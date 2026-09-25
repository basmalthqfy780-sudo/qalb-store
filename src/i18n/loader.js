/**
 * تحميل لغةٍ واحدة — لا قاموسين.
 *
 * العربية تُستورد استيرادًا ثابتًا: هي لغةُ المتجر الأولى، وهي التي تُطبع فورًا
 * بلا انتظار شبكة. الإنجليزية chunk مستقل يُطلب حين تُختار (أو قبل الرسم إن فتح
 * الزائر الصفحة بـ`?lang=en`)، فلا ينزل زائرٌ عربيٌّ ١٧٦٣ سلسلةٍ إنجليزية مع أول
 * بايت — وهذا كان نحو نصف وزن حزمة الدخول.
 *
 * القاموسان متطابقا المفاتيح (١٧٦٣ في كلٍّ منهما، ويثبّت الفحص ذلك)، فاحتياطُ
 * `t()` إلى الإنجليزية عند مفتاحٍ ناقص لا يلزمه أن تكون الإنجليزية محمّلة.
 */
import ar from './locales/ar.js'

export const LANG_STORE = 'qalb.lang'

export const read = (k, fb) => {
  try {
    return localStorage.getItem(k) || fb
  } catch {
    return fb
  }
}

/**
 * اللغة عند أول فتح: `?lang=en/ar` أولًا (وهو ما تشير إليه hreflang فتفتح النسخة
 * الموعودة فعلًا)، ثم ما حُفظ في الجهاز، ثم العربية.
 */
export const initialLang = () => {
  try {
    const p = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null
    if (p === 'en' || p === 'ar') return p
  } catch {
    /* location غير متاح (بيئة اختبار) — نرجع للمخزَّن */
  }
  return read(LANG_STORE, 'ar')
}

/** ما حُمّل فعلًا: العربية معه منذ البداية */
const cache = { ar }

/** القاموس المتاح الآن لهذه اللغة — العربية إن لم تصل لغةُ الزائر بعد (لا مفاتيح خام) */
export const dictOf = (lang) => cache[lang === 'en' ? 'en' : 'ar'] || cache.ar

/** يطلب الإنجليزية مرة واحدة ويعيد الكاش بعدها */
export async function loadDict(lang) {
  const l = lang === 'en' ? 'en' : 'ar'
  if (cache[l]) return cache[l]
  const mod = await import('./locales/en.js')
  cache[l] = mod.default
  return cache[l]
}
