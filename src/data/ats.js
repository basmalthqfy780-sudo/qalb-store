/**
 * الشرح والعرض لفاحص جاهزية الفرز الآلي. القواعد نفسها (regex والأرقام) في
 * src/data/ats-table.js، وهو المستهلك الواحد لثلاثة وجوه:
 *
 *   1. صفحة الفحص المجانية (src/pages/Ats.jsx) — analyzeAts(text)
 *   2. سكربت الحزمة scripts/check-ats.mjs — يُولَّد من ats-table.js في
 *      src/data/deliverable.js ← atsScript، فلا يختلف ما نقيس به مجّانًا عمّا
 *      نسلّمه مع القالب.
 *   3. شارة «ATS 92/100» على البطاقة — تُحاسب بنفس القواعد على السيرة التجريبية
 *      التي يطبعها القالب (فحص smoke يثبت التطابق)، فلا رقم تسويقي غائب المصدر.
 *
 * لا تخزين ولا إرسال: لا fetch ولا localStorage ولا شبكة هنا. من هنا الاسم.
 */
import { ATS_LINKS, ATS_RULE_DEFS, ATS_TARGET, atsRuleTable } from './ats-table.js'

export { ATS_LINKS, ATS_TARGET, atsRuleTable }

/**
 * شرحٌ لكل قاعدة، مربوطًا بمعرّفها في ats-table.js — القواعد نفسها، والقياس واحد:
 * ما يراه الزائر هنا هو ما يطبعه سكربت الحزمة وما تُحاسب عليه شارة البطاقة.
 */
const ATS_COPY = {
  summary: {
    name: { ar: 'قسم «ملخص» أو «نبذة»', en: 'a summary / profile section' },
    fix: {
      ar: 'افتتح بسطرَين إلى ثلاثة: من أنت، وما الذي تُنجزه، وفي أي مجال. الفرز الآلي يبحث عن هذا القسم أولًا.',
      en: 'Open with two or three lines: who you are, what you ship, in which field. Parsers look for this section first.',
    },
    why: { ar: 'بلا ملخص يقرأ الآليّ صفحتك كقائمة مهام بلا سياق.', en: 'without it the parser sees a task list with no context.' },
  },
  experience: {
    name: { ar: 'قسم خبرة بعنوان مفهوم', en: 'an experience section with a known heading' },
    fix: {
      ar: 'سمِّ القسم «الخبرة المهنية» أو «Experience» — لا «رحلتي» ولا «أشيائي». الأسماء الحرة لا تُطابَق.',
      en: 'Title it “الخبرة المهنية” or “Experience” — not “my journey”. Free-form headings do not match.',
    },
    why: {
      ar: 'القسم موجود لكن بعنوان مبتكر = قسم غير موجود عند الآلة.',
      en: 'a section with an invented heading is a missing section to a machine.',
    },
  },
  skills: {
    name: { ar: 'قسم مهارات مستقل', en: 'a separate skills section' },
    fix: {
      ar: 'اجعل المهارات قسمًا قائمًا بذاته (٨–١٤ عنصرًا)، ولا تدفنها داخل الجُمل.',
      en: 'Keep skills their own block (8–14 items); do not bury them inside sentences.',
    },
    why: { ar: 'المطابقة على المسميات الوظيفية تُبنى على هذا القسم.', en: 'role matching is built on this section.' },
  },
  education: {
    name: { ar: 'قسم تعليم', en: 'an education section' },
    fix: {
      ar: 'الدرجة والتخصيص وسنة التخرج في سطر واحد. إن لم يوجد تعليم رسمي اذكر الشهادة المهنية أو المعمل.',
      en: 'Degree, field, graduation year on one line. No degree? List the professional certificate or the lab.',
    },
    why: { ar: 'كثير من الفلاتر تطلب هذا القسم وجودًا لا مضمونًا.', en: 'many filters require its presence before its content.' },
  },
  email: {
    name: { ar: 'بريد يمكن للآلة التقاطه', en: 'an e-mail a parser can grab' },
    fix: {
      ar: 'اكتب البريد نصًّا صريحًا في الأعلى: لا صورة، ولا «بريدي (انقر)»، ولا رابط مختصر.',
      en: 'Put the address as plain text at the top: not an image, not “click for my e-mail”.',
    },
    why: { ar: 'بريد غير قابل للنسخ = طلب لا يُجاب.', en: 'an address that cannot be copied is an application that goes unanswered.' },
  },
  dates: {
    name: { ar: 'مدد بمعايير ثابتة (٢٠٢١ — الآن)', en: 'date ranges in a fixed shape (2021 — present)' },
    fix: {
      ar: 'استعمل «٢٠٢١ — ٢٠٢٤» أو «2021 — present» لكل وظيفة. «منذ ثلاث سنوات» لا تُحسب.',
      en: 'Use “2021 — 2024” or «٢٠٢١ — الآن» per role. “three years ago” is not counted.',
    },
    why: { ar: 'حساب الأقدمية والخبرة السنوية يعتمد على هذا النمط وحده.', en: 'years-of-experience math is done on this pattern only.' },
  },
  numbers: {
    name: { ar: 'نقاط تنتهي برقم', en: 'bullets that end in a number' },
    fix: {
      ar: 'في كل نقطة: فعل + شيء + رقم. «خفّضت زمن الاستجابة ٤٠٪» لا «شاركت في تحسين الأداء».',
      en: 'verb + object + number: “cut response time 40%”, not “helped improve performance”.',
    },
    why: { ar: 'الفرز المرتّب بالترشيح يقارن الأرقام، لا الصفات.', en: 'ranked screening compares numbers, not adjectives.' },
  },
}

export const ATS_RULES = ATS_RULE_DEFS.map((r) => ({ ...r, ...ATS_COPY[r.id] }))

export const ATS_BANDS = [
  {
    min: 90,
    label: { ar: 'جاهز للفرز الآلي', en: 'ATS-ready' },
    note: { ar: 'الآلة تقرأه؛ تبقى المطابقة على مفردات الإعلان.', en: 'a machine can read it; matching the job post is the remaining step.' },
  },
  {
    min: 70,
    label: { ar: 'يقبله الفرز مع ملاحظات', en: 'passes with notes' },
    note: { ar: 'الفجوات أدناه محددة؛ كل واحدة تُسدّ في دقائق.', en: 'the gaps below are specific; each is a few minutes of work.' },
  },
  {
    min: 50,
    label: { ar: 'سيُعاد طرحه غالبًا', en: 'likely filtered out' },
    note: {
      ar: 'البنية موجودة لكن القراءة غير مضمونة: أصلح ما وسمّاه الفحص أولًا.',
      en: 'structure exists but parsing does not: fix what the check flagged first.',
    },
  },
  {
    min: 0,
    label: { ar: 'لا يُقرأ آليًا بعد', en: 'not machine-readable yet' },
    note: { ar: 'ابدأ من الصفر البنيوي: الأقسام ثم المدد ثم الأرقام.', en: 'start from structure: sections, then dates, then numbers.' },
  },
]

/** نموذج نصّي للتجربة السريعة: مستوًف القواعد العشر، فيُظهر الفاحص درجة كاملة على
 * شيءٍ حقيقي بدل صفحة فارغة. (فحص smoke يثبت أنه يبقى على 100، وإلا فالمُنتَج أو
 * الفاحص انزلق.)
 */
export const ATS_DEMO = `نورة الحربي — مهندسة واجهات أمامية
الرياض، السعودية · noura.alharbi@example.com · linkedin.com/in/noura-harbi · github.com/noura-h

الملخص المهني
مهندسة واجهات أمامية بخمس سنوات في بناء منتجات مالية وتعليمية تُقرأ على الجوال أولًا. أعمل من التشخيص إلى التسليم: أقيس زمن الاستجابة، ثم أعيد رسم المسار، ثم أوثّق ما تعلّمته للفريق. أعمل بالعربية والإنجليزية في منتج واحد، وأتحمل مسؤولية الوصولية كاملة في الشبكات الضعيفة والأجهزة القديمة، لا في العرض المثالي وحده.

الخبرة المهنية
مهندسة واجهات أولى — شركة نماء الرقمية · الرياض
2021 — present
- رفعت رضا مستخدمي لوحة التحكم من 71 إلى 92 نقطة في ستة أشهر بهوية تصميم جديدة وقابلة للتوسّع.
- هاجرت الواجهة إلى Vite وTypeScript فانخفض زمن التحميل الأول من 4.2 ثانية إلى 1.1 ثانية على شبكة 3G.
- بنت نظام تصميم بـ 180 مكوّنًا معتمدًا في 6 فرق، فقلت الطلبات المكررة إلى الربع في ثلاثة أشهر.
- أسّست اختبار وصولية آليًا في خط النشر يرفض أي إصدار فيه 3 أخطاء حرجة أو أكثر.
- درّبت 14 زميلًا في ورشة شهرية، فأغلق 9 منهم تذاكر الوصولية بأنفسهم بلا مراجعة إضافية.

أمامية — شركة مدار التعليم · جدة
2019 — 2021
- طوّرت مشغّل دروس يحتمل 12 ألف طالب في التوقيت نفسه بتقطيع أقل من 0.4 %.
- خفّضت حجم الحزمة الرئيسية 38 % فصار متوسط التحميل أقل من ثانيتين على الجوال.
- أضفت دعم الاتجاه من اليمين لـ 40 شاشة، وأُغلقت 100 % من تذاكر الاتجاه في الشهر الأول.
- نقلت 26 نموذجًا إلى طبقة تحقق مشتركة فقلت أخطاء الإدخال المرصودة 45 %.

المهارات
TypeScript · React · Vite · CSS حديث · WCAG 2.2 · اختبار الوصولية · أنظمة تصميم · أداء الويب · Node · اختبارات وحدة وتكامل · تصميم واجهات عربية · توثيق تقني · قيادة تقنية فرعية

التعليم
بكالوريوس علوم حاسب — جامعة الملك سعود · 2019 · تقدير 4.7 من 5
شهادة الوصولية المهنية IAAP CPACC · 2023
دبلوم هندسة البرمجيات المتقدمة — منصة رقمية معتمدة · 2022

مشاريع ومبادرات
- متجر النص: مكتبة تفتح الملفات النصية داخل المتصفح بلا رفع ولا خادم، اعتمدتها 3 فرق داخل الشركة.
- قاموس مصطلحات عربي موحّد لواجهات المنتجات: 640 مدخلًا، راجعه قسم الترجمة وقسم التجربة معًا.
- ورشة ملف يُقرأ آليًا: 3 دورات و86 مشاركًا، حدّث 92 % منهم سيرتهم في الأسبوع نفسه.

كيف أعمل
أبدأ من رقمٍ قبل التغيير ورقمٍ بعده، وأكتب القرار في صفحة واحدة يقرؤها المنتج والمهندس والمدير. أستعيش الاختبار قبل إعادة الكتابة، وأترك كل قسم من المنتج أسهل من أوله: ملفًا واحدًا للفهم، وملفًا واحدًا للتشغيل.`

const BAND = (score) => ATS_BANDS.find((b) => score >= b.min) || ATS_BANDS[ATS_BANDS.length - 1]

/** النصّ الخام أو HTML — يُنظّف ثم يُقاس بنفس المعيار في الحالتين */
export function analyzeAts(source = '', { html = false } = {}) {
  const raw = String(source || '')
  const isHtml = html || /<\s*(html|body|p|ul|li|div)\b/i.test(raw)
  // محتوى التنسيق لا يقرؤه قارئ سير ولا آلة فرز: يُستبعد `<style>` قبل أي قياس، والصيغة
  // نفسها حرفيًا في سكربت الحزمة (deliverable.js ← atsScript) — لا مقياسان في منتجٍ واحد.
  // وفي النصّ الصريح: سطر النقطة ما يبدأ بعلامة، ولا تُحسب الفقرة نقطةً تخنق النسبة.
  const bare = isHtml ? raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ') : raw
  const text = isHtml ? bare.replace(/<[^>]+>/g, ' ') : raw
  const clean = text.replace(/\s+/g, ' ').trim()
  const words = (clean.match(/[\p{L}\p{N}'’-]+/gu) || []).length
  const items = isHtml
    ? [...bare.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ' ').trim()).filter(Boolean)
    : raw
        .split('\n')
        .filter((x) => /^\s*[-•*·]\s+\S/.test(x))
        .map((x) => x.replace(/^\s*[-•*·]\s+/, '').trim())
        .filter((x) => x.length > 8)
  const bullets = items.length
  const measured = items.filter((x) => /\d/.test(x)).length
  const tables = isHtml ? /<table/i.test(bare) : /\t|[│|]{2,}/.test(raw)
  const hasLink = ATS_LINKS.some((l) => clean.toLowerCase().includes(l))

  const checks = []
  for (const r of ATS_RULES) checks.push({ id: r.id, name: r.name, fix: r.fix, why: r.why, ok: r.re.test(clean) })
  checks.push({
    id: 'words',
    name: {
      ar: `طول مناسب (${ATS_TARGET.minWords}–${ATS_TARGET.maxWords} كلمة)`,
      en: `a parseable length (${ATS_TARGET.minWords}–${ATS_TARGET.maxWords} words)`,
    },
    fix: {
      ar:
        words > ATS_TARGET.maxWords
          ? `اختصر إلى ${ATS_TARGET.maxWords} كلمة أو أقل — الطويل يُقطع، لا يُقرأ.`
          : `وسع النصّ إلى ${ATS_TARGET.minWords} كلمة على الأقل بصيغة فعل + رقم.`,
      en:
        words > ATS_TARGET.maxWords
          ? `Cut to under ${ATS_TARGET.maxWords} words — long files get truncated, not read.`
          : `Grow it to ${ATS_TARGET.minWords}+ words in the verb + number shape.`,
    },
    why: { ar: `عندك ${words} كلمة.`, en: `you have ${words} words.` },
    ok: words >= ATS_TARGET.minWords && words <= ATS_TARGET.maxWords,
  })
  checks.push({
    id: 'bullets',
    name: { ar: `${ATS_TARGET.minBullets} نقاط على الأقل تحت كل وظيفة`, en: `${ATS_TARGET.minBullets}+ bullets under a role` },
    fix: {
      ar: 'ثلاث إلى خمس نقاط لكل وظيفة، نقطة واحدة لكل إنجاز. الفقرة تحت المسمى لا تُقرأ نقاطًا.',
      en: 'three to five bullets per role, one achievement each. A paragraph under the title is not read as bullets.',
    },
    why: { ar: `عُثر على ${items.length} نقطة.`, en: `${items.length} found.` },
    ok: items.length >= ATS_TARGET.minBullets,
  })
  checks.push({
    id: 'measured',
    name: { ar: 'نصف النقاط تحمل رقمًا', en: 'half the bullets carry a number' },
    fix: {
      ar: 'ابدأ بفعل واختم برقم: «أطلقنا ٣ إصدارات خفّضت التذمر ٢٥٪».',
      en: 'start with a verb, end with a figure: “shipped 3 releases that cut complaints 25%”.',
    },
    why: { ar: `${measured} من ${items.length} نقطة تحمل رقمًا.`, en: `${measured} of ${items.length} bullets quantify.` },
    ok: items.length > 0 && measured * 2 >= items.length,
  })
  if (isHtml) {
    checks.push({
      id: 'tables',
      name: { ar: 'بلا جداول تخطيطية', en: 'no layout tables' },
      fix: {
        ar: 'اطبع السيرة من القالب: الأعمدة في ملف HTML تُقرأ عمودًا واحدًا ملغومًا.',
        en: 'print the sheet from the template: HTML columns are read as one scrambled stream.',
      },
      why: { ar: 'الجداول تُهرول في الممرّ الخطأ.', en: 'tables take the wrong passage.' },
      ok: !tables,
    })
  }
  checks.push({
    id: 'links',
    name: { ar: 'رابط ملف واحد على الأقل', en: 'at least one profile link' },
    fix: {
      ar: 'أضف LinkedIn أو GitHub أو Behance نصًّا: «linkedin.com/in/…».',
      en: 'Add LinkedIn, GitHub or Behance as text: “linkedin.com/in/…”.',
    },
    why: { ar: 'الروابط تثبت للقارئ أن خلف الاسم أثرٌ يُراجع.', en: 'a link proves there is something to review behind the name.' },
    ok: hasLink,
  })

  const passed = checks.filter((c) => c.ok).length
  const score = words < ATS_TARGET.minWordsToScore ? null : Math.round((passed / checks.length) * 100)
  const band = score == null ? null : BAND(score)
  return {
    short: words < ATS_TARGET.minWordsToScore,
    needsWords: Math.max(0, ATS_TARGET.minWordsToScore - words),
    score,
    band,
    words,
    bullets,
    measured,
    isHtml,
    passed,
    total: checks.length,
    checks,
    gaps: checks.filter((c) => !c.ok),
  }
}

/** تقرير نصّي يسحبه الفاحص أو ينسخه — من نفس الأرقام، لا حاشية من عنده */
export function atsReport(res, { lang = 'ar' } = {}) {
  const L = (o) => (o && (o[lang] || o.en)) || ''
  if (res.short) {
    return lang === 'ar'
      ? `فحص جاهزية ATS — قالب (qalb.store)\nالنصّ أقصر من أن يُدرَّج: ${res.words} كلمة (${ATS_TARGET.minWordsToScore} حدّ أدنى).`
      : `ATS readiness check — qalb.store\nToo short to grade: ${res.words} words (${ATS_TARGET.minWordsToScore} minimum).`
  }
  const line = (c) => `${c.ok ? ' ok  ' : ' MISS'}  ${L(c.name)}${c.ok ? '' : `\n        ← ${L(c.fix)}`}`
  const head =
    lang === 'ar'
      ? `فحص جاهزية ATS — قالب (qalb.store)\nالدرجة: ${res.score}٪ · ${L(res.band.label)}\nالكلمات: ${res.words} · النقاط: ${res.bullets} · منها برقم: ${res.measured}\n`
      : `ATS readiness check — qalb.store\nScore: ${res.score}% · ${L(res.band.label)}\nWords: ${res.words} · bullets: ${res.bullets} · quantified: ${res.measured}\n`
  return head + res.checks.map(line).join('\n') + `\n\n${L(res.band.note)}\n`
}

export default { analyzeAts, atsReport, ATS_RULES, ATS_BANDS, ATS_TARGET, ATS_LINKS, ATS_DEMO, atsRuleTable }
