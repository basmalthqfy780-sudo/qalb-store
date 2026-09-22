/**
 * مقالات المدوّنة — محتوى تحريري حقيقي منشور داخل الحزمة، لا نصوص تسويقية:
 * كل ما فيها مسنود إلى ما يقيسه فاحص ATS نفسه (src/data/ats.js) وإلى مسار
 * التسليم الفعلي للقوالب. تُقرأ من هنا من ثلاث وجوه: صفحة /blog، وصفحة
 * /blog/:slug، وscripts/seo.mjs الذي يكتبها في sitemap.xml.
 */

/** تنسيق التاريخ للعرض — ميلادي في اللغتين فلا يقفز التقويم بين النسختين */
export const dateLabel = (iso, lang) => {
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return iso
  }
}

export const posts = [
  {
    slug: 'seven-ats-rules',
    date: '2026-08-12',
    minutes: 6,
    tags: { ar: ['ATS', 'سيرة ذاتية'], en: ['ATS', 'CV'] },
    title: {
      ar: 'سبع قواعد تقرؤها الآلة أولًا في سيرتك',
      en: 'Seven rules a machine reads first in your CV',
    },
    excerpt: {
      ar: 'الفرز الآلي لا يقيّم تصميمك؛ يقيّم بنية نصّك. هذه القواعد السبع بالترتيب الذي يفحصه بها مقياسنا — وكلٌّ منها معه علاجه.',
      en: 'Automated screening grades your structure, not your design. These are the seven rules our own checker scores, in order — each with its fix.',
    },
    body: {
      ar: [
        {
          p: [
            'قبل أن يقرأ مسؤول توظيف سيرتك، تمرّ على نظام فرز آلي (ATS) يستخرج منها الأقسام والخبرة والمهارات، ثم يرتبك في قائمة. رتبتك في تلك القائمة لا يصنعها جمال الصفحة؛ يصنعها نصٌّ تقرؤه الآلة دون أن تضيع منه سطر.',
            'هذه ليست نظريات تسويق: القواعد التالية هي نفسها سبع قواعد يقيسها فاحصنا المجاني (/ats) على النصّ الملصوق في متصفحك، وسكربت الحزمة يقيس البنية نفسها على السيرة التي تخرج مع القالب.',
          ],
        },
        {
          h: '١ — افتح بملخص، لا بسطر طموح',
          p: [
            'سطران إلى ثلاثة في أول الصفحة: من أنت، وما الذي تُنجزه، وفي أي مجال. بلا ملخص يقرأ الآليّ صفحتك كقائمة مهام بلا سياق، فيعجز عن مطابقتك مع الوظيفة قبل أن يبدأ.',
          ],
        },
        {
          h: '٢ — عناوين الأقسام معيارية لا مبتكرة',
          p: [
            'سمِّ الأقسام «الخبرة المهنية» و«المهارات» و«التعليم» — أو Experience وSkills وEducation بالإنجليزية. القسم الموجود بعنوان مبتكر مثل «رحلتي» هو قسم غير موجود عند الآلة: العنوان المبتكر لا يُطابَق.',
          ],
        },
        {
          h: '٣ — المهارات قسمٌ قائم بذاته',
          p: [
            'اجمعها في كتلة مستقلة من ٨ إلى ١٤ مهارة، لا مبعثرة داخل الجُمل. المطابقة على المسميات الوظيفية تُبنى على هذا القسم وحده، فمهارة مدفونة في جملة كأنها غير مكتوبة.',
          ],
        },
        {
          h: '٤ — سطر تعليم واحد يكفي',
          p: [
            'الدرجة والتخصيص وسنة التخرج في سطر واحد. كثير من الفلاتر تطلب وجود قسم التعليم قبل أن تقرأ مضمونه، ومن ليس لديه درجة جامعية يذكر الشهادة المهنية أو المعمل بدل تركه فارغًا.',
          ],
        },
        {
          h: '٥ — بريدٌ يمكن نسخه',
          p: ['بريد إلكتروني نصّي قابل للتحديد والنسخ، لا صورة ولا نصٌّ مشوَّه في التصميم. بريدٌ غير قابل للنسخ هو طلبٌ لا يُجاب.'],
        },
        {
          h: '٦ — تواريخٌ لا تُناقِض نفسها',
          p: [
            'نفس الصيغة في كل سطر خبرة: من – إلى (أو «حتى الآن»). حساب الأقدمية والخبرة السنوية في أنظمة الفرز يعتمد على هذا النمط وحده، والقفز في الصيغ يُقرأ فجوةً في السيرة.',
          ],
        },
        {
          h: '٧ — أرقامٌ في نقاط الخبرة',
          p: [
            'الفرز المرتّب بالترشيح يقارن الأرقام لا الصفات: «رفعتُ التحويل ٣٤٪ في ربع» أقوى من «حسّنتُ الأداء» في أي محكّ. أربع نقاط خبرة على الأقل، واجعل نصفها يحمل رقمًا.',
          ],
        },
        {
          h: 'العتبات الهيكلية التي يُقاس عليها الباقي',
          p: [
            'الطول الصالح ٣٢٠–٩٠٠ كلمة، وأربع نقاط فصاعداً، ومستندٌ فارغ يأخذ صفرًا فلا مجاملة في المقياس. هذه الأرقام معلنة في صفحة الفاحص لأن المقياس الذي تخفى أرقامه ليس مقياسًا.',
            'جرّب سيرتك الآن على /ats: بلا حساب ولا رفع ملف ولا تخزين — النصّ يبقى في تبويبك، وكل فجوة تخرج ومعها علاجها.',
          ],
        },
      ],
      en: [
        {
          p: [
            'Before a recruiter reads your CV, an Applicant Tracking System parses it into sections, experience and skills, then ranks you in a list. Your place in that list is not made by a pretty page; it is made by text a machine can parse without losing a line.',
            'These are not marketing theories: the seven rules below are exactly what our free checker (/ats) scores on text pasted in your own browser, and the package script grades the same structure on the CV your template ships.',
          ],
        },
        {
          h: '1 — Open with a summary, not a slogan',
          p: [
            'Two to three lines at the top: who you are, what you ship, in which field. Without one, the parser reads your page as a task list with no context — and cannot match you to the role before it even starts.',
          ],
        },
        {
          h: '2 — Standard section headings, not creative ones',
          p: [
            'Title the sections “الخبرة المهنية” or “Experience”, “المهارات” or “Skills”, “التعليم” or “Education”. A section with an invented heading like “my journey” is a missing section to a machine: free-form headings do not match.',
          ],
        },
        {
          h: '3 — Skills get their own block',
          p: [
            'Keep 8–14 skills in one standalone block, not scattered inside sentences. Role matching is built on this section alone — a skill buried in prose counts as unwritten.',
          ],
        },
        {
          h: '4 — One education line is enough',
          p: [
            'Degree, field, graduation year on one line. Many filters require the section’s presence before its content; no formal degree? List the professional certificate or the lab instead of leaving it empty.',
          ],
        },
        {
          h: '5 — An e-mail a parser can grab',
          p: [
            'A plain, selectable, copyable e-mail address — not an image, not styled text. An address that cannot be copied is an application that goes unanswered.',
          ],
        },
        {
          h: '6 — Dates that do not contradict each other',
          p: [
            'One format across every role: from – to (or “present”). Years-of-experience math in screening systems runs on this pattern only, and inconsistent formats read as a gap in your history.',
          ],
        },
        {
          h: '7 — Numbers inside the bullets',
          p: [
            'Ranked screening compares numbers, not adjectives: “raised conversion 34% in one quarter” outranks “improved performance” in any comparison. Four bullets at least — and put a figure in half of them.',
          ],
        },
        {
          h: 'The structural thresholds the rest is measured against',
          p: [
            'The healthy length is 320–900 words, with at least four bullet lines; an empty document scores 0, so the scale has no participation floor. These numbers are published on the checker page because a measure that hides its thresholds is not a measure.',
            'Try your own CV at /ats: no account, no upload, nothing stored — the text stays in your tab, and every gap comes out with its fix.',
          ],
        },
      ],
    },
  },
  {
    slug: 'portfolio-or-cv',
    date: '2026-08-27',
    minutes: 5,
    tags: { ar: ['بورتفوليو', 'سيرة ذاتية'], en: ['Portfolio', 'CV'] },
    title: {
      ar: 'بورتفوليو أم سيرة ذاتية: بماذا يبدأ ملفك المهني؟',
      en: 'Portfolio or CV: which one first?',
    },
    excerpt: {
      ar: 'السيرة تفتح الباب، والبورتفوليو يُقنع من فُتح له. الترتيب ليس ذوقًا — ومتى يكفيك ملفٌ واحد منهما.',
      en: 'The CV opens the door; the portfolio convinces whoever opened it. The order is not a taste call — and sometimes one file is enough.',
    },
    body: {
      ar: [
        {
          p: [
            'سؤال يُسأل في كل رسالة تصلنا: أبدأ بموقع معرض أعمال أم بسيرة ذاتية؟ الجواب المختصر: السيرة أولًا في كل الحالات تقريبًا، والبورتفوليو بعدها بخطوة — لا بديلاً عنها.',
          ],
        },
        {
          h: 'لماذا السيرة أولًا',
          p: [
            'لأنها الوحيدة التي تقرؤها الآلة قبل البشر. طلبُ وظيفة يمرّ بأتمتة تفرز وتقصّي وتقارن بالأرقام، والبورتفوليو — مهما كان جميلًا — لا يمرّ من تلك البوابة في صورته الأولى. السيرة هي الشكل المقبول قانونًا وعمليًا للطلب.',
            'وهي أسرع ما تُنجز: صفحة واحدة تكفي الخريج، وصفحتان تكفيان من خبرته فوق خمس سنوات.',
          ],
        },
        {
          h: 'ومتى يأتي البورتفوليو',
          p: [
            'حين يُطلب منك «أرِني عملك»: التصميم، التصوير، التطوير، الموشن، الكتابة. عند تلك النقطة يصبح الرابط واحدًا أهم من عشرين مرفقًا — لكنه رابط يُفتح بعد أن فتحت السيرة الباب، لا قبله.',
            'ومع ذلك: لو كنت في مجالٍ بصري بحت وخبرتك كلها في الأعمال، فابدأ بموقع بورتفوليو تحمل سيرتك المختصرة داخله — وسنرجع للقاعدة التالية.',
          ],
        },
        {
          h: 'الهوية الواحدة هي الميزة الحقيقية',
          p: [
            'ما يميّز الملف المهني القوي ليس عدد الملفات، بل أن كلها صادرة عن هوية واحدة: نفس الخطوط، نفس الألوان، نفس الصوت في السيرة والموقع والخطاب التقديمي. الاختلاف بينها هو ما يجعل الثلاثة تبدو كثلاثة أشخاص.',
            'هذا هو بالضبط سبب بيعنا «الموقع + السيرة» كحزمة واحدة لا كقطعتين: المتغيرات التصميمية الواحدة تخرج منها الملفات كلها.',
          ],
        },
        {
          h: 'ابدأ اليوم بخطوة واحدة',
          p: [
            'إن لم تكن سيرتك تجتاز الفرز الآلي فابدأ منها: انسخها على /ats وخذ درجتك وفجواتك مجانًا، ثم أصلح الفجوات قبل أن تشتري قالبًا أو تبني موقعًا. الدرجة أولًا، والتصميم بعدها.',
          ],
        },
      ],
      en: [
        {
          p: [
            'Every other message we get asks the same: should I start with a portfolio site or a CV? The short answer: the CV first in almost every case, and the portfolio one step later — never instead of it.',
          ],
        },
        {
          h: 'Why the CV comes first',
          p: [
            'It is the only file a machine reads before a human does. A job application passes through automation that parses, filters and compares numbers — and a portfolio, however beautiful, does not clear that gate in its first shape. The CV is the accepted legal and practical shape of an application.',
            'It is also the fastest thing you can ship: one page is enough for a graduate, two for five-plus years of experience.',
          ],
        },
        {
          h: 'When the portfolio steps in',
          p: [
            'When someone says “show me your work”: design, photography, engineering, motion, writing. At that point one link beats twenty attachments — but it is a link opened after the CV opened the door, not before it.',
            'One exception: if your field is purely visual and your evidence lives in the work, start with a portfolio site that carries a compact CV inside it — and then the rule below matters even more.',
          ],
        },
        {
          h: 'One identity is the real edge',
          p: [
            'What makes a professional file strong is not how many pieces it has, but that all of them come from one identity: same typefaces, same palette, same voice across CV, site and cover letter. Drift between them is what makes three files look like three different people.',
            'This is exactly why we sell “site + CV” as one bundle rather than two products: one set of design variables emits every file.',
          ],
        },
        {
          h: 'Start today with one step',
          p: [
            'If your CV would not clear automated screening, start there: paste it into /ats and take your score and your gaps for free, then fix the gaps before you buy a template or build a site. The score first, the design after.',
          ],
        },
      ],
    },
  },
  {
    slug: 'publish-in-ten-minutes',
    date: '2026-09-08',
    minutes: 4,
    tags: { ar: ['نشر', 'بورتفوليو'], en: ['Deploy', 'Portfolio'] },
    title: {
      ar: 'انشر معرض أعمالك في عشر دقائق — بلا خادم ولا فاتورة',
      en: 'Publish your portfolio in ten minutes — no server, no invoice',
    },
    excerpt: {
      ar: 'ثلاث خطوات من الحزمة إلى رابط حيّ تعمل عليه: نسخ، تعبئة ملف بيانات واحد، ثم زرّ نشر. والنطاق الخاص يأتي بعد ذلك بدقيقتين.',
      en: 'Three steps from the download to a live link: clone, fill one data file, press deploy. Your own domain is two minutes after that.',
    },
    body: {
      ar: [
        {
          p: [
            'أثقل ما يمنع الناس من نشر معرض أعمالهم ليس الوقت ولا التصميم — بل تخيل أن النشر مشروع بناء. القوالب الثابتة (Astro/HTML) صُمّمت لتُنتهي من هذا التخيّل: لا خادم تشغّله، ولا قاعدة بيانات، ولا فاتورة شهرية ما لم ترد واحدة.',
          ],
        },
        {
          h: 'الخطوة ١ — خُذ الشيفرة',
          p: [
            'نزّل حزمتك من إيصال الطلب (أو /track بريدك وحده)، وفكّ ضغطها. داخلها ملف بيانات واحد اسمه profile.json أو content/profile.json وفيه اسمك ودورك ومشاريعك — هذا الملف هو كل ما ستعيّره.',
          ],
        },
        {
          h: 'الخطوة ٢ — اكتب نصوصك مكان النصوص التجريبية',
          p: [
            'افتح الملف بأي محرّر نصوص واكتب: الاسم، الدور، أربعة مشاريع بأسطر قصيرة تحمل أرقامًا، وبريدك. لا HTML ولا CSS ولا build config — التعديل نصّي بحت، والفيديو المرفق (٨ دقائق) يمشي معك خطوة خطوة.',
          ],
        },
        {
          h: 'الخطوة ٣ — انشر بزرّ',
          p: [
            'ارفع المجلد إلى Vercel أو Netlify أو Cloudflare Pages — قراءة vercel.json/netlify.toml المُرفقة تلقائية، ومجلد الإخراج هو جذر الحزمة فلا خطوة بناء. خلال دقيقة يصلك رابط حيّ مثل my-name.vercel.app.',
            'وإن أردت نطاقك الخاص (مثل yourname.com): أضف النطاق في لوحة المنصة ووجّه سجلّ CNAME من مزوّد النطاق — دقيقتان من لوحة DNS، والشهادة تصدر تلقائيًا.',
          ],
        },
        {
          h: 'بعد النشر',
          p: [
            'ضع الرابط في أول سطر من سيرتك وفي لينكدإن وفي التوقيع البريدي — وفاحص جاهزية /ats بجانبه: الموقع يثبت الأثر، والسيرة تمرّ من بوابة الفرز. ملفٌ واحد يمثّلك في المكانين.',
          ],
        },
      ],
      en: [
        {
          p: [
            'The heaviest thing stopping people from publishing a portfolio is neither time nor design — it is imagining deployment as a construction project. The static templates (Astro/HTML) are built to end that imagining: no server to run, no database, and no monthly bill unless you want one.',
          ],
        },
        {
          h: 'Step 1 — take the code',
          p: [
            'Download your package from the receipt (or /track with your e-mail alone) and unzip it. Inside is one data file named profile.json or content/profile.json holding your name, role and projects — that file is everything you will edit.',
          ],
        },
        {
          h: 'Step 2 — write your words over the demo copy',
          p: [
            'Open the file in any text editor: name, role, four projects in short lines that carry numbers, and your e-mail. No HTML, no CSS, no build config — the editing is plain text, and the bundled video (8 minutes) walks with you step by step.',
          ],
        },
        {
          h: 'Step 3 — deploy with one button',
          p: [
            'Push the folder to Vercel, Netlify or Cloudflare Pages — the bundled vercel.json/netlify.toml is read automatically and the bundle root is the output directory, so there is no build step. Within a minute you have a live link like my-name.vercel.app.',
            'Want your own domain (like yourname.com)? Add it in the platform dashboard and point a CNAME record from your registrar — two minutes of DNS, and the certificate issues itself.',
          ],
        },
        {
          h: 'After the launch',
          p: [
            'Put the link on the first line of your CV, in LinkedIn and in your mail signature — and keep the /ats readiness checker next to it: the site proves the work, the CV clears the screening gate. One file represents you in both places.',
          ],
        },
      ],
    },
  },
]

export const postBySlug = (slug) => posts.find((p) => p.slug === slug) || null

export default posts
