#!/usr/bin/env python3
"""يولّد أقسام القاموس الخمسة الجديدة (ar + en) ويحقنها في src/i18n/translations.js.

التوليد لا الكتابة اليدوية: ٣٤٤ مفتاحًا بلغتين، وأي اختلاف بين اللغتين يُسقط
الفحص — فالتوليد من جدول واحد يضمن التطابق.
"""
import json, re, sys

# key -> (ar, en)
S = {}

def add(ns, k, ar, en):
    S[f"{ns}.{k}"] = (ar, en)

# ---------------------------------------------------------------- nav / footer
add('nav', 'plans', 'الخطط والأسعار', 'Plans & pricing')
add('nav', 'creators', 'سوق المصممين', 'Designer market')
add('footer', 'plans', 'الخطط ومصفوفة القيمة', 'Plans & the value matrix')
add('footer', 'creators', 'سوق المصممين', 'Designer market')

# ---------------------------------------------------------------- account.q
add('account', 'q.name', 'ما اسمك الكامل؟', 'What is your full name?')
add('account', 'q.role', 'ما مهنتك أو تخصصك؟', 'What is your role or field?')
add('account', 'q.services', 'ما الخدمات التي تقدمها؟', 'What services do you offer?')
add('account', 'q.works', 'اذكر أبرز أعمالك', 'List your notable work')
add('account', 'q.colours', 'ألوانك المفضلة', 'Your preferred colours')
add('account', 'q.links', 'روابط أعمالك', 'Links to your work')

# field labels reused from the questions table
add('account', 'services', 'الخدمات', 'Services')
add('account', 'works', 'الأعمال', 'Work')
add('account', 'colours', 'الألوان', 'Colours')
add('account', 'links', 'الروابط', 'Links')

# ---------------------------------------------------------------- account
A = {
 'seoTitle': ('حسابي', 'My account'),
 'seoDesc': ('قوالبك وخطتك وما تفتحه: العدّاد وورقة السيرة والتصدير من جدول واحد.', 'Your templates and plan and what it opens: the counter, the résumé sheet and the export, from one table.'),
 'kicker': ('حسابك', 'Your account'),
 'emptyTitle': ('لا حساب على هذا الجهاز بعد', 'No account on this device yet'),
 'emptySub': ('التسجيل بريدٌ واحد وإقرار، وبلا كلمة سر في هذه النسخة: لا مُصادقة في المتصفح تُصدَّق، وما هنا حافظةُ عملك.', 'Sign-up is one e-mail and a consent box, with no password in this build: no browser authentication is trusted, and what lives here is your working copy.'),
 'sub': ('خطتك: {p} · قوالبك {n} من {max}', 'Your plan: {p} · templates {n} of {max}'),
 'yourTemplates': ('قوالبك', 'Your templates'),
 'noTemplates': ('لا قالب بعد — تصفّح القوالب الجاهزة واختر واحدًا، أو ابدأ بصفحة مجانية على رابطك الفرعي.', 'No template yet — browse the ready templates and pick one, or start with a free page on your own subdomain.'),
 'makeAnother': ('تصفّح المزيد من القوالب', 'Browse more templates'),
 'gated': ('بلغت سقف خطتك ({max})', 'You reached your plan’s ceiling ({max})'),
 'editInStudio': ('عدّله في الاستوديو', 'Edit it in the studio'),
 'unlimited': ('غير محدودة', 'Unlimited'),
 'sheetTitle': ('ورقة السيرة', 'The résumé sheet'),
 'sheetSub': ('تُبنى بمولّد الحزمة نفسه وتُختم بالعلامة المائية إن كانت خطتك مجانية — فالوعد يُرى لا يُقرأ.', 'Built by the same package generator and stamped with the watermark on the free plan — the promise is seen, not read.'),
 'sheetFrame': ('معاينة ورقة السيرة', 'Résumé sheet preview'),
 'sheetLoading': ('تُبنى الورقة…', 'Building the sheet…'),
 'noSheet': ('لهذا القالب ورقة سيرة تُطبع — لكن السجلّ لا يُقرأ هنا الآن. افتحه من الاستوديو.', 'This template has a printable sheet — but its record cannot be read here right now. Open it from the studio.'),
 'pickFirst': ('اختر قالبًا من القائمة أعلاه لتُبنى ورقته هنا.', 'Pick a template above and its sheet is built here.'),
 'sheetHow': ('الطباعة أو «حفظ PDF» من المتصفح تُخرج الملف نفسه: العلامة المائية تُطبع لأنها طبقة في الورقة لا زينة على الشاشة.', 'Printing or “save as PDF” from the browser yields the same file: the watermark prints because it is a layer in the sheet, not decoration on screen.'),
 'wmLabel': ('نسخة مجانية — قالب', 'Free copy — Qalb'),
 'wmOn': ('بعلامة مائية', 'Watermarked'),
 'wmOff': ('بلا علامة مائية', 'No watermark'),
 'entTitle': ('ما تفتحه خطتك', 'What your plan opens'),
 'seeMatrix': ('مصفوفة القيمة كاملة', 'The full value matrix'),
 'answersTitle': ('إجاباتك', 'Your answers'),
 'answersSub': ('كُتب {n} حقلًا، و{c} لونًا، و{l} رابطًا. الفارغ يبقى فارغًا فيظهر القالب بنصّه التجريبي.', '{n} fields filled, {c} colours, {l} links. What is left blank stays blank, so the template keeps its sample copy.'),
 'editPage': ('عدّل صفحتك المنشورة', 'Edit your published page'),
 'planTitle': ('خطتك', 'Your plan'),
 'since': ('مشترك منذ {d}', 'A member since {d}'),
 'free': ('مجاني', 'Free'),
 'noGateway': ('لا بوابة دفع موصولة في هذه النسخة: يُسجَّل التفعيل هنا ولا يُخصم من بطاقة. في وضع الخادم يرفضه الخادم من المتصفح فيُسجَّل طلبًا يُفعّله الموظف.', 'No payment gateway is connected in this build: the activation is recorded here and nothing is charged to a card. Against the server, the server refuses a browser-side upgrade and records a request a person activates.'),
 'activations': ('{n} تفعيل مسجّل', '{n} recorded activations'),
 'planRecorded': ('سُجّل تفعيل «{p}» على هذا الجهاز', 'The “{p}” activation was recorded on this device'),
 'planPending': ('سُجّل طلب الخطة — يُفعّلها الموظف، فالخادم لا يقبل ترقية من المتصفح', 'The plan request was recorded — a person activates it, as the server accepts no browser-side upgrade'),
 'planFail': ('لم يُسجَّل التفعيل', 'The activation was not recorded'),
 'sellTitle': ('بيع قوالبك', 'Sell your templates'),
 'sellOpen': ('خطتك تفتح سوق المصممين — كل قالب يمرّ بخط الفحص الآلي قبل أن يُنشر.', 'Your plan opens the designer market — every template goes through the automated pipeline before it is published.'),
 'sellLocked': ('البيع خلف اشتراك: أي خطة مدفوعة تفتحه، والفحص الآلي شرطٌ ثانٍ بعده.', 'Selling sits behind a subscription: any paid plan opens it, and the automated check is a second condition after it.'),
 'sellCta': ('افتح لوحة البائع', 'Open the seller console'),
 'dataTitle': ('بياناتك', 'Your data'),
 'dataSub': ('ما هنا محفوظ على هذا الجهاز وحده. زرّ المسح يمسحه من المتصفح، وما لزم طلبًا سابقًا يبقى في سجلّ الخادم حتى تكتب لنا.', 'What is here is stored on this device alone. The wipe clears it from the browser; whatever a past order needed stays in the server ledger until you write to us.'),
 'forget': ('امسح حسابي من هذا المتصفح', 'Wipe my account from this browser'),
 'forgot': ('مُسح الحساب من هذا المتصفح — وما على الخادم لم يُمسح', 'The account was wiped from this browser — what is on the server was not touched'),
 'row.templates': ('عدد القوالب', 'Templates'),
 'row.pdf': ('سيرة PDF', 'Résumé PDF'),
 'row.publish': ('النشر المباشر', 'Direct publishing'),
 'row.export': ('تصدير ملفات الموقع', 'Site-file export'),
 'row.badge': ('شارة «صُنع بقالب»', 'The “made with Qalb” badge'),
 'row.domain': ('نطاق خاص', 'Custom domain'),
 'row.sell': ('بيع القوالب', 'Selling templates'),
 'row.yes': ('متاح', 'Included'),
 'row.no': ('غير متاح', 'Not included'),
 'row.pdfWm': ('بعلامة مائية', 'Watermarked'),
 'row.pdfClean': ('بلا علامة', 'Clean'),
 'row.badgeOn': ('تظهر', 'Shown'),
 'row.badgeOff': ('لا تظهر', 'Removed'),
 'colourN': ('اللون رقم {n}', 'Colour {n}'),
 'linkN': ('الرابط رقم {n}', 'Link {n}'),
}
for k, v in A.items(): add('account', k, *v)

# ---------------------------------------------------------------- create
C = {
 'seoTitle': ('أنشئ قالبك', 'Build your template'),
 'seoDesc': ('بريدٌ واحد، ستّ إجابات، وقالبٌ أول يُولَّد مجانًا برابطٍ حيّ — ثم خطةٌ عند القالب الثاني.', 'One e-mail, six answers, and a first template generated free with a live URL — then a plan at the second.'),
 'kicker': ('قالبك الأول مجانًا', 'Your first template, free'),
 'title': ('أنشئ قالبك من إجاباتك', 'Build a template from your answers'),
 'sub': ('لا نبيعك «قوالب بلا حدود مجانًا» — نعطيك قالبًا واحدًا كاملًا لتقيس القيمة، ونفتح ما بعده باشتراك.', 'We do not sell you “unlimited templates for free” — you get one complete template to judge the value, and what comes after it opens with a plan.'),
 'stepOf': ('الخطوة {n} من {m}', 'Step {n} of {m}'),
 'step.mail': ('البريد والإقرار', 'E-mail and consent'),
 'step.niche': ('مجالك', 'Your field'),
 'step.answers': ('أسئلة قصيرة', 'Short questions'),
 'step.done': ('قالبك', 'Your template'),
 'mailLabel': ('بريدك الإلكتروني', 'Your e-mail address'),
 'noMailer': ('لا نرسل رسالة تأكيد: لا مُرسِل بريد موصول في هذه النسخة، فمن وَعَد برسالةٍ يكذب. بريدك يربط عملك برخصته، والمفتاح يبقى على جهازك.', 'No confirmation is mailed: no mailer is connected in this build, and a promise of one would be a lie. Your e-mail ties your work to its licence, and the key stays on your device.'),
 'consent': ('بالمتابعة أُقرّ بأن القالب يخضع للفحص الآلي للترخيص والأصالة، وأنني أملك حقوق استخدام كافة الأصول والمحتويات المرفقة.', 'By continuing I acknowledge that the template is subject to automated licence and originality inspection, and that I hold the usage rights to every asset and content item attached.'),
 'consentVersion': ('نسخة الإقرار v{v} — تُختم بتاريخها في سجلّك', 'Consent version v{v} — stamped with its date in your record'),
 'needConsent': ('يلزم قبول الإقرار بالفحص الآلي قبل المتابعة', 'The automated-inspection consent is required before continuing'),
 'badMail': ('بريدٌ غير صالح', 'That e-mail is not valid'),
 'start': ('ابدأ مجانًا', 'Start free'),
 'welcome': ('أُنشئ الحساب — اختر مجالك', 'Account created — pick your field'),
 'savedOffline': ('أُنشئ الحساب على هذا الجهاز: الخادم لم يُجب، فبقي عملك هنا', 'The account was created on this device: the server did not answer, so your work stayed here'),
 'stageOne': ('المرحلة الأولى', 'First wave'),
 'whyStageOne': ('بدأنا بمصممين ومصورين لأن قوالبهم في الكتالوج هي الأكمل اليوم — فلا تُقابل تجربتك الأولى بقالبٍ نصفه فارغ. بقية المجالات تعمل، وقوالبها تتحسن.', 'We started with designers and photographers because their catalogue templates are the most complete today — so your first try does not meet a half-empty template. The other fields work, and their templates keep improving.'),
 'nicheNote': ('مجالك يحدد القالب الذي يُولَّد لك، لا ما يُسمح لك به: كل القوالب متاحة في الاستوديو بعده.', 'Your field decides which template is generated, not what you may use: every template is open in the studio afterwards.'),
 'next': ('متابعة', 'Continue'),
 'back': ('رجوع', 'Back'),
 'optional': ('اختياري', 'optional'),
 'colourHint': ('#rgb أو #rrggbb — لونان كحد أقصى', '#rgb or #rrggbb — two at most'),
 'dropped': ('{n} حقلًا لن يُطبع كما كُتب (وسم أو صيغة غير مقبولة) — بقي نصّ القالب مكانه', '{n} fields will not print as written (a tag or an unacceptable format) — the template’s own copy stayed'),
 'willBuild': ('ما سيُبنى', 'What will be built'),
 'willBuildBody': ('قالب «{tpl}» من إجاباتك: الاسم في الترويسة، المهنة تحتها، خدماتك في «عني»، ورابط أعمالك في التواصل. ما تُرك فارغًا يبقى بنصّه التجريبي.', 'The “{tpl}” template from your answers: your name in the header, your role beneath it, your services in “about”, and your work link in the contact line. What you left blank keeps its sample copy.'),
 'needNiche': ('اختر مجالك أولًا — ولا نخمّن مجالًا لم تُقل', 'Pick your field first — we do not guess a field you did not state'),
 'generate': ('ولّد قالبى الأول مجانًا', 'Generate my first template, free'),
 'genFail': ('لم يُبنَ القالب — أعد المحاولة', 'The template was not built — try again'),
 'generated': ('بُني قالبك الأول ورُبط بحسابك', 'Your first template was built and tied to your account'),
 'saveFail': ('لم تُحفظ الإجابات', 'The answers were not saved'),
 'doneTitle': ('قالبك الأول جاهز', 'Your first template is ready'),
 'doneSub': ('محفوظ في حسابك مجانًا، ورابطه حيّ. عدّله في الاستوديو، وحمّل ورقة السيرة من لوحة الحساب.', 'Saved to your account for free, and its URL is live. Edit it in the studio and download the résumé sheet from your account.'),
 'openStudio': ('افتح الاستوديو', 'Open the studio'),
 'openAccount': ('لوحة الحساب', 'Account dashboard'),
 'yourPlan': ('خطتك الآن', 'Your plan now'),
 'counter': ('قوالبك {n} من {max}', 'Templates {n} of {max}'),
 'editIt': ('عدّله', 'Edit it'),
 'gateTitle': ('القالب الثاني خلف اشتراك', 'The second template sits behind a plan'),
 'gateSub': ('أنشأت {n} من {max} المسموحة في خطتك. الخطة تفتح القوالب الإضافية والنشر الاحترافي وتصديرًا بلا علامة مائية.', 'You built {n} of the {max} your plan allows. A plan opens the extra templates, professional publishing, and an export with no watermark.'),
 'noGateway': ('لا بوابة دفع موصولة في هذه النسخة: الضغط يُسجّل التفعيل على جهازك ويقول ذلك، ولا يُخصم من بطاقة.', 'No payment gateway is connected in this build: pressing this records the activation on your device and says so, and charges no card.'),
 'comparePlans': ('قارن الخطط ومصفوفة القيمة', 'Compare the plans and the value matrix'),
 'planRecorded': ('سُجّل تفعيل «{p}»', 'The “{p}” activation was recorded'),
 'planPending': ('سُجّل طلب الخطة — يُفعّلها الموظف', 'The plan request was recorded — a person activates it'),
 'planFail': ('لم يُسجَّل التفعيل', 'The activation was not recorded'),
 'activating': ('يُفعَّل «{p}»…', 'Activating “{p}”…'),
 'anotherTitle': ('قالبٌ آخر؟', 'Another template?'),
 'anotherSub': ('خطتك تسمح بالمزيد — ابدأ من الأسئلة نفسها، واختر قالبًا آخر لمجالك.', 'Your plan allows more — start from the same questions and pick another template for your field.'),
 'makeAnother': ('أنشئ قالبًا آخر', 'Build another template'),
 'gated': ('أنشأت {n} من {max} — الخطة تفتح التالي', 'You built {n} of {max} — a plan opens the next one'),
 'sideTitle': ('ما يحدث في كل خطوة', 'What happens at each step'),
 'side1': ('البريد وحده أولًا — لا كلمة سر، ولا تأكيد يُرسل لأنه لا مُرسِل هنا.', 'Just the e-mail first — no password, and no confirmation is sent because no mailer exists here.'),
 'side2': ('المجال يحدد القالب الذي يُولَّد، لا ما يُسمح لك به.', 'Your field picks which template is generated, not what you may use.'),
 'side3': ('ستّ إجابات قصيرة: الاسم والمهنة مطلوبان، والباقي اختياري.', 'Six short answers: name and role are required, the rest optional.'),
 'side4': ('القالب يُولَّد من مولّد الحزمة نفسه — ما تراه على الرابط هو ما يُصدَّر.', 'The template is built by the same package generator — what you see at the URL is what gets exported.'),
 'freeWhat': ('ما تحصل عليه مجانًا', 'What you get for free'),
 'seePlans': ('الخطط ومصفوفة القيمة', 'Plans and the value matrix'),
 'missingFields': ('ينقص {n} حقلًا ليكتمل سجلّك', '{n} fields are still missing from your record'),
 'showKicker': ('قبل أن تقرر', 'Before you decide'),
 'showTitle': ('ثلاثة قوالب حقيقية، تُرسم الآن', 'Three real templates, rendered now'),
 'showSub': ('لا لقطة شاشة ولا وصف: هذه القوالب نفسها تُرسم بمعاينة المتجر، وتُقلَّب بين سطح المكتب والجوال. اخترت مجالًا؟ ترى قوالبه.', 'No screenshot and no blurb: these are the templates themselves, rendered by the store’s own preview, and switchable between desktop and phone. Picked a field? You see its templates.'),
 'showDevice': ('مقاس الشاشة', 'Screen size'),
 'device.desktop': ('سطح المكتب', 'Desktop'),
 'device.tablet': ('لوحي', 'Tablet'),
 'device.mobile': ('جوال', 'Phone'),
 'showOpen': ('افتح صفحة القالب', 'Open the template page'),
 'showYours': ('هذا ما سيُبنى لمجالك', 'This is what gets built for your field'),
 'showNote': ('القالب الذي يُولَّد لك هو أحد هذه، ببياناتك أنت. وإن لم يعجبك، فالاستوديو يفتح كل قوالب الكتالوج بعد التوليد.', 'The template generated for you is one of these, with your own data. And if you dislike it, the studio opens every catalogue template after generation.'),
}
for k, v in C.items(): add('create', k, *v)

# ---------------------------------------------------------------- plans
P = {
 'seoTitle': ('الخطط والأسعار', 'Plans & pricing'),
 'seoDesc': ('اشتراكٌ متدرّج واحد: مجاني · Qalb Plus ‎19‎ · Qalb Pro ‎49‎، ومصفوفة قيمة من عشرة صفوف كلُّ صفٍّ يُنفّذه كود.', 'One graded subscription: Free · Qalb Plus 19 · Qalb Pro 49, with a ten-row value matrix where every row is enforced by code.'),
 'kicker': ('الخطط', 'Plans'),
 'title': ('ما الذي نبيعه بالضبط', 'What we sell, exactly'),
 'sub': ('درجةٌ واحدة متدرّجة تبدأ من الصفر: قالبٌ واحد مجانًا لترى النتيجة، وثلاثةٌ في Plus، وكلُّ القوالب في Pro. ولا باقةٌ تُشترى مرة واحدة في هذه النسخة.', 'One graded ladder starting at zero: one template free so you see the result, three on Plus, every template on Pro. This build sells no one-time pack.'),
 'billing': ('طريقة الفوترة', 'Billing period'),
 'monthly': ('شهري', 'Monthly'),
 'yearly': ('سنوي', 'Yearly'),
 'perMonth': ('في الشهر', 'a month'),
 'perYear': ('في السنة', 'a year'),
 'free': ('مجانًا', 'Free'),
 'noCard': ('بلا بطاقة وبلا تجديد', 'No card, no renewal'),
 'vatIn': ('شامل الضريبة · منها {v} ضريبة', 'VAT included · {v} of it is tax'),
 'yearlyAs': ('سنةٌ بسعر {m} شهرًا', 'A year priced at {m} months'),
 'mostPicked': ('الأكثر اختيارًا', 'Most picked'),
 'mostComplete': ('الأكمل', 'The most complete'),
 'opensOverFree': ('تفتح {n} ميزات لا في المجانية', 'Opens {n} things the free plan does not'),
 'matrixKicker': ('توزيع القيمة', 'How the value is split'),
 'matrixTitle': ('المجاني مقابل المدفوع، صفًّا صفًّا', 'Free against paid, row by row'),
 'matrixSub': ('عشرة صفوف: ما يبقى مجانيًا للأبد، وما يُفتح بالاشتراك. بلا سطر «وميزات أخرى».', 'Ten rows: what stays free forever, and what a plan opens. No “and more” line.'),
 'colFeature': ('الميزة', 'Feature'),
 'colFree': ('مجاني — القالب الأول', 'Free — the first template'),
 'colPaid': ('مدفوع — باشتراك', 'Paid — on a plan'),
 'state.yes': ('متاح', 'Included'),
 'state.partial': ('جزئي', 'Partial'),
 'state.no': ('غير متاح', 'Not included'),
 'matrixEnforced': ('كل صفٍّ هنا يُنفّذه كود، لا وعد: مصفوفة القيمة تحمل اسم الوحدة والدالة التي تُحقّقه، والفحص يرفض صفًّا يشير إلى دالةٍ غير موجودة.', 'Every row here is enforced in code, not promised: the matrix carries the name of the module and function behind it, and the test suite rejects a row pointing at a function that does not exist.'),
 'publishKicker': ('خدمة', 'A service'),
 'subKicker': ('من السلة أيضًا', 'From the cart too'),
 'withinHours': ('خلال {h} ساعة', 'within {h} hours'),
 'lighterTier': ('درجة أخفّ: تركيب Vercel والنطاق بـ{n} — من جدول الخدمات نفسه', 'A lighter tier: Vercel and domain setup at {n} — from the same services table'),
 'allServices': ('كل الخدمات', 'All services'),
 'marketKicker': ('سوق المصممين', 'The designer market'),
 'marketTitle': ('نِسبتنا معلنة قبل أن تبيع', 'Our cut, published before you sell'),
 'marketSub': ('لا نسبة تُكتشف في صفحة السحب. الأرقام ثلاثة وهي في الكود مصدرٌ واحد.', 'No commission discovered on the payout page. Three numbers, and one source for them in the code.'),
 'marketCommission': ('عمولة المنصة من كل بيع (المدى المعلَن ٢٠–٣٠٪)', 'The platform commission on every sale (published range 20–30%)'),
 'marketEscrow': ('يومًا يُؤمَّن فيها المبلغ بعد البيع قبل أن يُسحب', 'days the amount is held after a sale before it can be withdrawn'),
 'marketMin': ('ريال حدٌّ أدنى للسحب', 'SAR minimum payout'),
 'sellCta': ('افتح لوحة البائع', 'Open the seller console'),
 'honestTitle': ('ما لا يحدث في هذه النسخة', 'What does not happen in this build'),
 'honest1': ('جدولٌ واحد للاشتراك في هذه النسخة: الدرجاتُ الثلاث هنا هي نفسها المعروضة في الرئيسية، وسعرُ Qalb Pro ({p} شهريًا) هو نفسه في السلة — لا رقمَان لنفس المنتج.', 'One subscription table in this build: the three tiers here are the ones shown on the home page, and the Qalb Pro price ({p} a month) is the same in the cart — never two numbers for one product.'),
 'honest2': ('لا بوابة دفع موصولة: أزرار التفعيل تُسجّل الاشتراك وتقول ذلك، ولا تُخصم من بطاقة ولا تُصدر فاتورة موثّقة.', 'No payment gateway is connected: the activation buttons record the subscription and say so — nothing is charged to a card and no certified invoice is issued.'),
 'honest3': ('الأسعار شاملة ضريبة القيمة المضافة، ونصيب الضريبة معروض كما يُحسب لا كما يُقدَّر.', 'Prices include VAT, and the tax portion is shown as it is computed, not as it is estimated.'),
 'faqKicker': ('أسئلة', 'Questions'),
 'faqTitle': ('ما يُسأل قبل الاشتراك', 'What is asked before subscribing'),
 'faq1q': ('هل القالب المجاني مجاني فعلًا؟', 'Is the free tier really free?'),
 'faq1a': ('نعم: قالبٌ واحد كامل بمعاينة حية للموقع والسيرة، وتصدير PDF بعلامة مائية. والذي يُفتح بالاشتراك هو القوالب الإضافية والنشر على رابطك الفرعي والتصدير بلا علامة.', 'Yes: one template in full, with a live preview of the site and the résumé and a watermarked PDF export. What the subscription opens is more templates, publishing on your own subdomain, and the clean export.'),
 'faq2q': ('لماذا سيرة PDF بعلامة مائية في المجانية؟', 'Why a watermarked résumé PDF on the free plan?'),
 'faq1x': ('', ''),
 'faq2a': ('لأن الورقة نتيجة احترافية تُقدَّم لجهة توظيف، والعلامة هي الفرق بين التجربة والنتيجة. الخطة المدفوعة تُسقطها، والعلامة طبقة في الورقة نفسها فتُطبع معها.', 'Because the sheet is a professional result you hand to an employer, and the watermark is the line between trying it and using it. A paid plan removes it, and the watermark is a layer inside the sheet, so it prints with it.'),
 'faq3q': ('هل يمكنني الشراء مرة واحدة بلا اشتراك؟', 'Can I buy once, with no subscription?'),
 'faq3a': ('لا: هذه النسخة بلا باقةٍ تُشترى مرة واحدة. الاشتراكُ درجةٌ متدرّجة (مجاني · Plus · Pro) ويمكن إيقافه في أي شهر، وما فوق الاشتراك خدماتٌ Once-One في صفحة الخدمات.', 'No: this build has no one-time pack. The subscription is a graded ladder (Free · Plus · Pro) you can stop any month, and what sits above it is once-one services on the services page.'),
 'faq4q': ('كيف تربحون من سوق المصممين؟', 'How do you earn from the designer market?'),
 'faq4a': ('عمولة معلنة من كل بيع، ورسوم المعالجة يخصمها مزوّد الدفع لا نحن، وحدٌّ أدنى للسحب، ومدة تأمين تقلّل الاسترجاع. كل رقم معروض قبل إتمام البيع.', 'A published commission on each sale; processing fees are deducted by the payment provider, not by us; there is a minimum payout and a holding period that reduces refunds. Every number is shown before the sale is completed.'),
 'storeProNote': ('نفسُ الجدول معروضٌ في الرئيسية بالمكوّن نفسه — لا سعرَ مختلفًا بين الصفحتين:', 'The same table sits on the home page in the same component — never a different price between two pages:'),
 'storeProLink': ('جدول الدرجات في الرئيسية', 'the tier table on the home page'),
}
for k, v in P.items():
    if k == 'faq1x': continue
    add('plans', k, *v)

# ---------------------------------------------------------------- sell
SL = {
 'seoTitle': ('بِع قالبك', 'Sell your template'),
 'seoDesc': ('لوحة البائع: التقسيم قبل البيع، وخط فحص آلي بخمس طبقات، ومستحقات بمدة تأمين معلنة.', 'The seller console: the split before the sale, a five-layer automated pipeline, and payouts with a published holding period.'),
 'kicker': ('سوق المصممين', 'The designer market'),
 'title': ('بِع قالبك', 'Sell your template'),
 'sub': ('التقسيم يُحسب قبل أن ترفع، والفحص يُشغَّل لحظة الرفع، والحالة تُشتق من القرار — فلا زرّ هنا ينشر إدراجًا مرفوضًا.', 'The split is computed before you submit, the check runs the moment you do, and the state is derived from the verdict — no button here publishes a rejected listing.'),
 'canSell': ('خطتك تفتح البيع', 'Your plan allows selling'),
 'cannotSell': ('البيع خلف اشتراك', 'Selling needs a plan'),
 'needAccount': ('يلزم حساب أولًا', 'An account comes first'),
 'needAccountSub': ('التسجيل بريدٌ واحد وإقرار. الحساب يحفظ قوالبك وإدراجاتك ومفاتيحها على جهازك.', 'Sign-up is one e-mail and a consent box. The account keeps your templates, listings and their keys on your device.'),
 'createCta': ('أنشئ حسابك', 'Create your account'),
 'gateTitle': ('البيع مفتوح للاشتراكات', 'Selling is open to subscribers'),
 'gateSub': ('السوق يفتح بعد الاشتراكات لا قبلها — لأن الفحص الآلي والترخيص والدعم كلها كلفة تحملها المنصة عن كل بيع. أي خطة مدفوعة تفتحه.', 'The market opens after subscriptions, not before — because the automated check, the licence and the support are a cost the platform carries on every sale. Any paid plan opens it.'),
 'gateWhy': ('وإن كان قالبك لاستخدامك أنت فلا نسبة عليه: تدفع اشتراكك أو ميزات النشر والتصدير وحدها.', 'And if the template is for your own use, no commission applies: you pay for your plan, or for publishing and export features alone.'),
 'perMonth': ('في الشهر', 'a month'),
 'formTitle': ('إدراج جديد', 'A new listing'),
 'fTitle': ('عنوان القالب', 'Template title'),
 'eTitle': ('عنوانٌ أقصر من ٦ أحرف', 'A title under 6 characters'),
 'fDesc': ('الوصف', 'Description'),
 'eDesc': ('الوصف أقصر من ٤٠ حرفًا — لا يشرح ما يُباع', 'The description is under 40 characters — it does not explain what is sold'),
 'descCount': ('{n} حرفًا — ٤٠ حدٌّ أدنى و٦٠٠ سقف', '{n} characters — 40 minimum, 600 ceiling'),
 'fPrice': ('السعر (ريال)', 'Price (SAR)'),
 'ePrice': ('السعر خارج المدى المقبول', 'The price is outside the accepted range'),
 'priceRange': ('من {a} إلى {b} ريال — أدناه لا يغطّي عمولةً ولا فحصًا', 'From {a} to {b} SAR — below that neither the commission nor the check is covered'),
 'fCat': ('التصنيف', 'Category'),
 'cat.portfolio': ('موقع بورتفوليو', 'Portfolio site'),
 'cat.cv': ('سيرة ذاتية', 'Résumé'),
 'cat.bundle': ('حزمة موقع + سيرة', 'Site + résumé bundle'),
 'cat.kit': ('أدوات وملحقات', 'Tools and extras'),
 'fTags': ('وسوم', 'Tags'),
 'tagsHint': ('افصل بمسافة أو فاصلة — ستة كحد أقصى، والحشو يُخصم من درجتك', 'Separate with a space or comma — six at most, and stuffing costs you score'),
 'fFiles': ('ملفات الحزمة', 'Package files'),
 'filesHint': ('اسم الملف ومحتواه — وهذا ما يفحصه الخط فعلًا: الامتدادات المحظورة، والأكواد التنفيذية، والسقوف.', 'The file name and its content — and this is what the pipeline inspects: banned extensions, executable code, and the ceilings.'),
 'addFile': ('أضف ملفًا', 'Add a file'),
 'eFiles': ('لا ملفات في الحزمة — لا شيء يُفحص', 'No files in the package — nothing to inspect'),
 'filePath': ('اسم الملف {n}', 'File name {n}'),
 'fileBody': ('محتوى الملف {n}', 'File content {n}'),
 'fileRemove': ('احذف الملف {n}', 'Remove file {n}'),
 'imgTitle': ('صور المعاينة وبصماتها', 'Preview images and their fingerprints'),
 'imgSub': ('تُحسب لكل صورة بصمة perceptual في متصفحك وتُرسل نصًّا — لا تُرفع الصورة نفسها. وإن لم يعمل قارئ الصور قيل ذلك صراحة.', 'A perceptual fingerprint is computed for each image in your browser and sent as text — the image itself is never uploaded. If no image decoder runs, that is said plainly.'),
 'imgPick': ('اختر صورًا', 'Choose images'),
 'imgBusy': ('تُحسب البصمات…', 'Computing fingerprints…'),
 'imgSkipped': ('لم تُحسب بصمة ({r}) — الطبقة الثانية تُسجَّل متجاوَزة وتُضيف نقاط خطر، فلا تُحسب نظيفة', 'No fingerprint computed ({r}) — layer two is recorded as skipped and adds risk points, so it is not counted clean'),
 'imgNoHash': ('بلا بصمة', 'no fingerprint'),
 'rights': ('أُقرّ بأنني أملك حقوق استخدام كل الأصول والمحتويات المرفقة، وبأن القالب يخضع للفحص الآلي للترخيص والأصالة.', 'I acknowledge that I hold the usage rights to every attached asset and content item, and that the template is subject to automated licence and originality inspection.'),
 'eRights': ('يلزم الإقرار بحقوق الأصول', 'The asset-rights acknowledgement is required'),
 'submit': ('ارفع للفحص الآلي', 'Submit for the automated check'),
 'submitNote': ('يُشغَّل الخط لحظة الرفع: الطبقات الأربع الأولى، ثم قرار من الدرجة. تقرير JSON كامل يظهر تحت النموذج.', 'The pipeline runs the moment you submit: the first four layers, then a verdict from the score. A full JSON report appears below the form.'),
 'submitFail': ('لم يُرفع الإدراج', 'The listing was not submitted'),
 'fixFirst': ('أصلح {n} حقلًا قبل الرفع', 'Fix {n} fields before submitting'),
 'after.accept': ('قُبل آليًا — نُشر في السوق بلا تدخل بشري', 'Accepted automatically — published in the market with no human in the loop'),
 'after.quarantine': ('حجرٌ مؤقت — عدّل ما في التقرير أو أرفق التراخيص ثم أعد الفحص', 'Quarantined — fix what the report lists or attach the licences, then re-run the check'),
 'after.reject': ('رُفض آليًا — السبب البرمجي في التقرير، والتظلّم مفتوح', 'Rejected automatically — the programmatic reason is in the report, and the appeal is open'),
 'reportTitle': ('تقرير الفحص الآلي', 'The automated inspection report'),
 'layer.tech': ('تقني', 'Technical'),
 'layer.visual': ('بصمة بصرية', 'Visual fingerprint'),
 'layer.policy': ('حارس السياسة', 'Policy guard'),
 'layerTech': ('{n} ملفًا فُحص · {v} مخالفة', '{n} files inspected · {v} violations'),
 'layerVisual': ('{n} صورة بُصمت · {v} مخالفة', '{n} images fingerprinted · {v} violations'),
 'layerPolicy': ('{v} مخالفة في النص', '{v} violations in the copy'),
 'noReference': ('لا مرجع صور بعد — طبقة البصمة قارنت داخل إدراجك فقط، ولم تُعطَ «نجاحًا» على مرجعٍ فارغ', 'No image reference yet — the fingerprint layer compared within your listing only, and was not given a “pass” on an empty reference'),
 'clean': ('لا مخالفات في الطبقات الثلاث', 'No violations in the three layers'),
 'rawJson': ('تقرير JSON الخام', 'The raw JSON report'),
 'pipelineVersion': ('خط الفحص v{v} · {layers} طبقات · لغة التقرير: {lang}', 'Pipeline v{v} · {layers} layers · report language: {lang}'),
 'mineTitle': ('إدراجاتي', 'My listings'),
 'noListings': ('لا إدراج بعد. ارفع أول قالب فيمرّ بالخط ثم يُنشر أو يُحجر أو يُرفض — بقرارٍ لا بمزاج.', 'No listing yet. Submit your first template and it goes through the pipeline, then it is published, quarantined or rejected — by a verdict, not by a mood.'),
 'scoreLine': ('الدرجة {s}/100 · {v} · مبيعات {n}', 'Score {s}/100 · {v} · {n} sales'),
 'state.draft': ('مسوّدة', 'Draft'),
 'state.published': ('منشور', 'Published'),
 'state.quarantined': ('حجر مؤقت', 'Quarantined'),
 'state.rejected': ('مرفوض', 'Rejected'),
 'state.frozen': ('مجمّد', 'Frozen'),
 'state.delisted': ('مُسحب', 'Delisted'),
 'reinspect': ('أعد الفحص', 'Re-run the check'),
 'reinspected': ('أُعيد الفحص — الحالة اشتُقّت من القرار الجديد', 'The check ran again — the state was derived from the new verdict'),
 'reinspectFail': ('لم يُعَد الفحص', 'The check did not run again'),
 'appeal': ('تظلّم', 'Appeal'),
 'appealLabel': ('ما الذي تطلب مراجعته؟', 'What are you asking to be reviewed?'),
 'appealSend': ('أرسل التظلّم', 'Send the appeal'),
 'appealNote': ('التظلّم يُفتح ولا يُغلق آليًا: القرار لموظف. التجميد إجراءٌ احترازي لا حكم.', 'An appeal is opened and never closed automatically: the decision belongs to a person. A freeze is a precaution, not a verdict.'),
 'appealOpen': ('فُتح التظلّم — يبقى الإدراج على حالته حتى يراجعه موظف', 'The appeal was opened — the listing keeps its state until a person reviews it'),
 'appealFail': ('لم يُرسل التظلّم', 'The appeal was not sent'),
 'reported': ('{n} بلاغًا، منها {r} لحقوق الملكية — التجميد عند {t}', '{n} reports, {r} of them about ownership — freezing happens at {t}'),
 'seeMarket': ('شاهده في السوق', 'See it in the market'),
 'splitTitle': ('تقسيمك قبل البيع', 'Your split, before the sale'),
 'splitSub': ('يتحدث مع كل تغيير في السعر — وهو الرقم نفسه الذي يُختم على البيع.', 'It updates with every price change — and it is the very number stamped on the sale.'),
 'splitPrice': ('سعر القالب', 'Template price'),
 'splitCommission': ('عمولة المنصة ٢٥٪', 'Platform commission 25%'),
 'splitNet': ('صافي البائع', 'Seller net'),
 'splitFees': ('رسوم المعالجة (تقدير)', 'Processing fees (estimate)'),
 'splitAfter': ('بعد رسوم المزوّد (تقدير)', 'After provider fees (estimate)'),
 'splitNote': ('العمولة {p}٪ من السعر. رسوم المعالجة يخصمها مزوّد الدفع (Stripe · Tap · Moyasar) لا نحن، والنسبة المعروضة تقديرٌ موسوم.', 'The commission is {p}% of the price. Processing fees are deducted by the payment provider (Stripe · Tap · Moyasar), not by us, and the rate shown is a labelled estimate.'),
 'payoutTitle': ('مستحقاتك', 'Your payouts'),
 'payoutReleased': ('تحرّر', 'Released'),
 'payoutHeld': ('مؤمَّن ({d} يومًا)', 'Held ({d} days)'),
 'payoutMin': ('الحد الأدنى للسحب', 'Minimum payout'),
 'payoutReady': ('بلغت الحد الأدنى — يُطلب السحب حين تُوصل بوابة الدفع', 'You reached the minimum — a withdrawal is requested once a payment gateway is connected'),
 'payoutMissing': ('ينقصك {n} ريالًا لتبلغ الحد الأدنى', 'You are {n} SAR short of the minimum'),
 'payoutNote': ('ما تحرّر هو ما مضت عليه مدة التأمين. لا بوابة دفع في هذه النسخة، فالمبيعات مسجّلة لا مقبوضة.', 'What is released is what has passed the holding period. No payment gateway exists in this build, so sales are recorded, not collected.'),
 'licenceTitle': ('ترخيص السوق', 'The market licence'),
 'licence.noResale': ('لا إعادة بيع: القالب يُشترى للاستخدام لا للتوزيع', 'No resale: the template is bought to use, not to distribute'),
 'licence.noSharing': ('لا مشاركة الملف ولا نشره عامًا', 'No sharing the file and no publishing it openly'),
 'licence.noMultiProject': ('لا استخدامه في مشاريع متعددة بلا ترخيص إضافي', 'No use across multiple projects without an extra licence'),
 'licence.attribution': ('ملفات المصدر تحمل سطر تتبّع باسم المشتري ومفتاحه', 'The source files carry a tracking line with the buyer’s name and key'),
 'licence.updates': ('التحديثات سنة من تاريخ الشراء', 'Updates for a year from the purchase date'),
 'licence.refund': ('الاسترجاع خلال مدة التأمين لا بعدها', 'Refunds within the holding period, not after it'),
 'bandsTitle': ('عتبات القرار', 'The verdict thresholds'),
}
for k, v in SL.items(): add('sell', k, *v)

# ------------------------------------------------- ats → the free first template
add('ats', 'buildKicker', 'من الفحص إلى النشر', 'From the check to the launch')
add('ats', 'buildTitle', 'اعرف درجتك؟ الآن انشرها', 'You know your score — now publish it')
add('ats', 'buildSub', 'الفاحص مجاني ويبقى مجانيًا. ومن أراد موقعًا وسيرة بهوية واحدة يولّد قالبه الأول من إجاباته، مجانًا أيضًا — والقالب الثاني هو الذي خلف الاشتراك.', 'The checker is free and stays free. And if you want a site and a résumé in one identity, your first template is generated from your answers, also free — it is the second template that sits behind a plan.')
add('ats', 'build1', 'بريدٌ واحد وستّ إجابات قصيرة — لا كلمة سر في هذه النسخة.', 'One e-mail and six short answers — no password in this build.')
add('ats', 'build2', 'القالب يُولَّد من مولّد الحزمة نفسه: ما تراه على الرابط هو ما يُصدَّر.', 'The template is built by the same package generator: what you see at the URL is what gets exported.')
add('ats', 'build3', 'معاينة حية على نطاق فرعي، وورقة سيرة تُطبع PDF.', 'A live preview on a subdomain, and a résumé sheet that prints to PDF.')
add('ats', 'buildCta', 'أنشئ قالبك الأول مجانًا', 'Build your first template free')
add('ats', 'buildPlans', 'الخطط ومصفوفة القيمة', 'Plans and the value matrix')

# ---------------------------------------------------------------- creators
CR = {
 'seoTitle': ('سوق المصممين', 'The designer market'),
 'seoDesc': ('قوالب من مبدعين لا منّا — لا يُعرض منها إلا ما اجتاز خط الفحص الآلي، والتقسيم معروض قبل الشراء.', 'Templates from creators, not from us — only what passed the automated pipeline is listed, and the split is shown before you buy.'),
 'kicker': ('من المصممين', 'From the designers'),
 'title': ('سوق المصممين', 'The designer market'),
 'sub': ('قوالب صنعها مستخدمون ومرّت بخط فحص آلي خماسي الطبقات. العمولة والترخيص ومدة التأمين معلنة قبل أن تدفع.', 'Templates made by users that went through a five-layer automated pipeline. The commission, the licence and the holding period are published before you pay.'),
 'checked': ('مفحوص آليًا', 'Automatically inspected'),
 'searchLabel': ('ابحث في السوق', 'Search the market'),
 'searchPh': ('ابحث بالعنوان أو الوصف أو الوسم', 'Search by title, description or tag'),
 'allCats': ('الكل', 'All'),
 'scored': ('درجة الفحص {s}/100', 'Inspection score {s}/100'),
 'salesN': ('{n} عملية بيع', '{n} sales'),
 'buy': ('اشترِ', 'Buy'),
 'report': ('أبلِغ', 'Report'),
 'splitShown': ('التقسيم قبل إتمام البيع', 'The split before the sale completes'),
 'youPay': ('تدفع', 'You pay'),
 'platformTakes': ('عمولة المنصة', 'Platform commission'),
 'sellerGets': ('يصل البائع', 'The seller receives'),
 'feesNote': ('يخصم مزوّد الدفع رسومه عند القبض (تقدير {p}٪ + {f} ريال) — من {list}، لا منّا.', 'The payment provider deducts its fees on collection (estimated {p}% + {f} SAR) — from {list}, not from us.'),
 'escrowNote': ('يُؤمَّن مبلغ البائع {d} يومًا بعد البيع لتقليل طلبات الاسترجاع.', 'The seller’s amount is held {d} days after the sale to reduce refund requests.'),
 'confirmBuy': ('أكّد الشراء', 'Confirm the purchase'),
 'noCharge': ('لا بوابة دفع موصولة في هذه النسخة: يُسجَّل البيع بسعره المختم وتاريخ إفراجه، ولا يُخصم من بطاقة.', 'No payment gateway is connected in this build: the sale is recorded with its stamped price and release date, and nothing is charged to a card.'),
 'needMail': ('يلزم حساب ببريد لتُسجَّل عملية الشراء باسمك', 'An e-mail account is required so the purchase is recorded in your name'),
 'bought': ('سُجّل الشراء بـ{n} ريالًا — يُفرج عن مبلغ البائع في {d}', 'The purchase was recorded at {n} SAR — the seller’s amount is released on {d}'),
 'buyFail': ('لم تُسجَّل عملية الشراء', 'The purchase was not recorded'),
 'reportWhy': ('لماذا تُبلِغ؟', 'Why are you reporting?'),
 'kind.rights': ('حقوق ملكية', 'Ownership rights'),
 'kind.malware': ('كود ضار', 'Malicious code'),
 'kind.spam': ('إزعاج أو حشو', 'Spam or stuffing'),
 'kind.other': ('سبب آخر', 'Something else'),
 'freezeNote': ('يتجمّد الإدراج فورًا عند {n} بلاغات حقوق ملكية — إجراءٌ احترازي، والتظلّم مفتوح لصاحبه.', 'The listing freezes at once on {n} ownership reports — a precaution, and its owner can appeal.'),
 'reported': ('سُجّل بلاغك — بلاغات الملكية {n} من {t}', 'Your report was recorded — ownership reports {n} of {t}'),
 'frozen': ('تجمّد الإدراج: تكررت بلاغات حقوق الملكية', 'The listing was frozen: ownership reports repeated'),
 'reportFail': ('لم يُسجَّل البلاغ', 'The report was not recorded'),
 'emptyTitle': ('لا إدراج منشور بعد', 'No published listing yet'),
 'emptySub': ('السوق يفتح لمن اشترك ورفع قالبًا اجتاز الفحص. أول إدراج يُنشر هنا يظهر فور قبوله آليًا.', 'The market is open to subscribers who submit a template that passes the check. The first listing published here appears the moment it is accepted automatically.'),
 'sellCta': ('بِع قالبك', 'Sell your template'),
 'rulesTitle': ('القواعد المعلنة', 'The published rules'),
 'rule1': ('عمولة المنصة {p}٪ من كل بيع — تُختم على البيع لحظة تسجيله.', 'A platform commission of {p}% on every sale — stamped on the sale the moment it is recorded.'),
 'rule2': ('مبلغ البائع مؤمَّن {d} يومًا بعد البيع لتقليل الاسترجاع.', 'The seller’s amount is held {d} days after the sale to reduce refunds.'),
 'rule3': ('رسوم معالجة الدفع يخصمها المزوّد (Stripe · Tap · Moyasar)، ونعرض تقديرًا موسومًا لا رقمًا ندّعيه.', 'Payment processing fees are deducted by the provider (Stripe · Tap · Moyasar); we show a labelled estimate, not a number we claim.'),
 'rule4': ('يتجمّد الإدراج عند {n} بلاغات حقوق ملكية، ويُفتح التظلّم لصاحبه.', 'A listing freezes on {n} ownership reports, and its owner can appeal.'),
 'licenceTitle': ('ترخيص ما تشتريه', 'The licence on what you buy'),
 'fullLicence': ('نصّ الترخيص كاملًا', 'The full licence text'),
 'pipelineNote': ('كل إدراج هنا اجتاز خط فحص آلي: فحص الملفات والكود، وبصمة الصور، وحارس السياسة، وقرار من درجة الخطر.', 'Every listing here passed an automated pipeline: file and code linting, image fingerprints, a policy guard, and a verdict from the risk score.'),
 'sellLink': ('كيف يعمل الخط من جهة البائع', 'How the pipeline works from the seller’s side'),
}
for k, v in CR.items(): add('creators', k, *v)

# ---------------------------------------------------------------- emit JS
def emit(lang_idx):
    """يبني كائنات JS متداخلة من المفاتيح المسطحة"""
    tree = {}
    for k, v in sorted(S.items()):
        parts = k.split('.')
        node = tree
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = v[lang_idx]

    def js(node, indent):
        pad = '  ' * indent
        out = []
        for k in node:
            val = node[k]
            key = k if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', k) else json.dumps(k)
            if isinstance(val, dict):
                out.append(f"{pad}{key}: {{\n{js(val, indent + 1)}\n{pad}}},")
            else:
                s = val.replace('\\', '\\\\').replace("'", "\\'")
                out.append(f"{pad}{key}: '{s}',")
        return '\n'.join(out)

    return js(tree, 2)

ar_block = emit(0)
en_block = emit(1)

path = 'src/i18n/translations.js'
src = open(path, encoding='utf8').read()

START = '/* == QALB-REVENUE-I18N =='
END = '/* == QALB-REVENUE-I18N END == */\n'
marker = START
if START in src:
    # إعادة التوليد: تُنزع الكتلة القديمة كلها (من فاتحتها إلى خاتمتها) قبل الحقن،
    # وإلا تكرّر `deepAssign` وسقط الملف عند التحليل.
    i = src.index(START)
    j = src.index(END, i) + len(END)
    print('already injected — replacing the previous block', file=sys.stderr)
    src = src[:i] + src[j:]

inject = f"""{marker}
 * أقسام نموذج الربح (v1.7.0) — مولَّدة بـ scripts/revenue-i18n.py من جدول واحد
 * بالعربية والإنجليزية، فالتطابق بين اللغتين مضمون بالبناء لا بالمراجعة.
 *
 * الدمج عميق لا `Object.assign`: `nav` و`footer` قائمان قبل هذه الكتلة، وتعيينٌ
 * سطحي كان يمحو ما فيهما من مفاتيح المتجر.
 */
const deepAssign = (target, src) => {{
  for (const k of Object.keys(src)) {{
    const v = src[k]
    if (v && typeof v === 'object' && target[k] && typeof target[k] === 'object') deepAssign(target[k], v)
    else target[k] = v
  }}
  return target
}}
deepAssign(dict.ar, {{
{ar_block}
}})
deepAssign(dict.en, {{
{en_block}
}})
/* == QALB-REVENUE-I18N END == */

"""

# الحقن قبل `export default dict`
anchor = 'export default dict'
assert anchor in src
src = src.replace(anchor, inject + anchor)
open(path, 'w', encoding='utf8').write(src)
print(f'injected {len(S)} keys × 2 languages')
