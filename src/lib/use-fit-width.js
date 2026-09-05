import { useLayoutEffect, useRef, useState } from 'react'

/**
 * عرضُ الحاوية التي يُحشَر فيها نموذجٌ بمقاس تصميم ثم يُصغَّر بـ`transform: scale`.
 *
 * النسخة القديمة كانت `setW(el.getBoundingClientRect().width)` بلا تنعيم ولا مقارنة:
 * أيُّ تغيّرٍ في ارتفاع الصندوق — وشريطُ التمرير يظهر ويختفي لأن الصفحة تطول وتقصر،
 * أو حَذْفُ بكسلٍ في القياس بعد تصغيرٍ كسورٍ — كان يعيد الضبط فيعيد القياس، فتاهتزَّت
 * المعاينة بلا توقّف. الإصلاح هنا في ثلاث نقاط، لا في تجميل الحركة:
 *   ١) القياس صحيحًا للبكسل (Math.round): لا فرق دون بكسل واحد يستحق رندرة.
 *   ٢) لا setState إلا عند تغيّرٍ حقيقي: ResizeObserver يُطلَق لكل تغيير في الصندوق،
 *      بما فيه الارتفاع الذي لا دخل له في حسابنا.
 *   ٣) لا نكتب ارتفاعًا من JS إطلاقًا: الحاوية تأخذ ratioها من CSS، فلا حلقة تغذية
 *      راجعة بين القياس والتخطيط.
 */
export function useFitWidth() {
  const ref = useRef(null)
  const last = useRef(-1)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => {
      const next = Math.round(el.getBoundingClientRect().width)
      if (next === last.current) return
      last.current = next
      setW(next)
    }
    set()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', set)
      return () => window.removeEventListener('resize', set)
    }
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export default useFitWidth
