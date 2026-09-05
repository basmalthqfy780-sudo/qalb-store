/**
 * جدول قواعد الفحص وحده — صغير ومجرّد من الشرح العربي، فيستهلكه مولّد الحزمة
 * (src/data/deliverable.js ← atsScript) دون أن يجرّ نصّ صفحة الفاحص إلى حزمة البداية.
 * الشرح الذي يقرؤه الزائر يبقى في src/data/ats.js، وكلاهما يشتقّ من هنا: درجة
 * البطاقة، ونتائج الفاحص المجاني، وسكربت scripts/check-ats.mjs المرفق مع القالب.
 */

/** الأرقام التي تُحسب من النصّ نفسه، لا من regex واحد */
export const ATS_TARGET = {
  minWords: 320,
  maxWords: 900,
  minBullets: 4,
  /** نصف النقاط على الأقل تحمل رقمًا */
  measuredHalf: true,
  /** تحت هذا الحد لا نخرج بدرجة: النصّ ليس سيرة بعد */
  minWordsToScore: 40,
  /** تحت هذه الدرجة يُرجع سكربت الحزمة رمز فشل */
  pass: 70,
}

export const ATS_LINKS = ['linkedin.com', 'github.com', 'gitlab.com', 'behance.net', 'mailto:']

/** المسميات الإنجليزية هي نفسها ما يُطبع في سكربت الحزمة: لا ترجمة ثانية للقياس */
export const ATS_RULE_DEFS = [
  { id: 'summary', label: 'a summary / profile section', re: /ملخص|خلاصة|summary|profile|about me/i },
  { id: 'experience', label: 'an experience section with a known heading', re: /خبرة|خبراتي|المهنية|experience|employment|work history/i },
  { id: 'skills', label: 'a separate skills section', re: /مهارات|skills|تقنيات|technical skills/i },
  { id: 'education', label: 'an education section', re: /تعليم|أكاديم|education|degree|بكالوريوس|دبلوم|ماجستير/i },
  { id: 'email', label: 'an e-mail a parser can grab', re: /@[a-z0-9.-]+\.[a-z]{2,}/i },
  { id: 'dates', label: 'date ranges in a fixed shape (2021 — present)', re: /\d{4}\s*[—–-]\s*(\d{4}|present|current|الآن|hاضر)/i },
  // رقمٌ مع وحدة، أو نسبتان، أو من–إلى: كل ما يشبه أثرًا مقاسًا لا صفةً مرسلة
  {
    id: 'numbers',
    label: 'bullets that end in a number',
    re: /\d+\s*[%٪]|\d+[.,]\d+|\d+\s*(users|clients|releases|projects|people|services|components|partnerships|hours|days|minutes|seconds|sar|qar|ryal|m|k|b|million|billion|مستخدم|عميل|مشروع|شريك|ساعة|يوم|دقيقة|ريال)|\b\d{2,}\b[^.\n]{0,24}\b\d{2,}\b/i,
  },
]

/** ما يُلصق في سكربت الحزمة: اسمٌ وقالب regex، بلا اعتماديات ولا نصوص عربية */
export const atsRuleTable = () => ATS_RULE_DEFS.map((r) => ({ name: r.label, src: r.re.source, flags: r.re.flags.replace('i', '') }))

export default { ATS_TARGET, ATS_LINKS, ATS_RULE_DEFS, atsRuleTable }
