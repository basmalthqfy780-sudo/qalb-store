/**
 * بياناتُ المشاركة لكل منتج — مصدرٌ واحد تقرؤه الواجهةُ ويقرؤه مولّدُ الـHTML.
 *
 * العلّةُ التي وُلد من أجلها: الوسومُ الاجتماعية في هذا المتجر تُبنى في المتصفح
 * (`src/components/Seo.jsx`)، و`index.html` وحدها تحمل وسومًا ثابتة، وهي وسومُ
 * الرئيسية. فالزاحفُ الذي لا يشغّل JavaScript — واتساب، X، تيليجرام، سلَاك —
 * يرى لكل قالبٍ عنوانَ الرئيسية وصورتها: عشرون رابطًا تتبادل بطاقةً واحدة.
 *
 * الحلُّ قسمان:
 *   • هذه الدوالُ تعرّف العنوان والوصف والصورة مرّةً واحدة.
 *   • `scripts/share-html.mjs` يكتب منها، بعد البناء، نسخةً ثابتة في
 *     `dist/template/<slug>/index.html` يقرؤها الزاحفُ قبل أن يصل إلى التطبيق.
 * و`tests/smoke.mjs` يرسم الصفحة في jsdom ويقارن ما تكتبه الواجهة بما في الملف
 * الثابت — فلا تنجرف النسختان ولا يعود ذلك التبدّلُ في المعاينات.
 *
 * (اسمُ الملفّ `share-meta` لا `share`: الأولُ محجوزٌ لبطاقة الفاحص وأمر
 * `couponFor` — انظر `src/data/share.js` و`src/components/ShareCard.jsx`.)
 */
/** مسارُ الصفحة الذي يُشارَك — يُبنى مرةً واحدة، ويُقرأ منه canonical وog:url */
export const sharePath = (tpl) => `/template/${tpl.slug}`
/** بطاقةُ القالب نفسها التي رسمها `scripts/og-cover.py` لهذا الـslug */
export const shareImage = (tpl) => `/og/${tpl.slug}.png`
/** اسمُ القالب بلغة الصفحة — نفسُ ما يراه القارئ في الصفحة، لا نسخةٌ ثانية */
export const shareName = (tpl, lang) => (lang === 'en' ? tpl.name.en : tpl.name.ar)

/**
 * عنوانُ المشاركة ووصفُها: يُستدعى بـ`t` (من الواجهة) أو ببديلٍ يقرأ القاموس
 * (من Node في مولّد الـHTML). العنوانُ يحمل اسمَ القالب، والوصفُ يبدأ بنبذته —
 * فيختلف كلُّ رابطٍ عن أخيه، ولا يتكرّر عنوانان في عشرين بطاقة.
 */
export const productShare = (tpl, lang, t) => {
  const tagline = lang === 'en' ? tpl.tagline.en : tpl.tagline.ar
  return {
    path: sharePath(tpl),
    image: shareImage(tpl),
    title: `${shareName(tpl, lang)} · ${t('brand.name')}`,
    desc: t('meta.productDesc', { tag: tagline }),
  }
}

/** هل البطاقاتُ فريدة فعلًا؟ — تُستعمل في الفحوص، لا في البناء */
export const uniqueShare = (list) => new Set(list).size === list.length

export default { sharePath, shareImage, shareName, productShare, uniqueShare }
