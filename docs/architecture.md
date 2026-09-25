# البنية والملاحظات

> مستخرج من README الأصلي لتسهيل الصيانة — المصدر الوحيد للحقيقة هو الكود.

## أصول الظهور والخطوط

- `scripts/seo.mjs` (يعمل قبل كل `build`) يولّد `robots.txt` و`sitemap.xml` (٢٤ رابطًا) وبطاقة
  `og-cover.png` مرسومة برمجيًا بـ Pillow (`scripts/og-cover.py`) — بدون صور مخزّنة في المستودع.
  يولّد أيضًا **بطاقة لكل منتج** في `public/og/` (تُقرأ من نفس `src/data/templates.js`)؛ لو لم تتوفّر
  Pillow يُتخطّى الرسم وتبقى البطاقات السابقة — لا يفشل البناء لهذا السبب.
- الروابط العميقة لا وجود لها على القرص — يولّدها الراوتر في المتصفح — فتحتاج إعادةَ كتابةٍ على كل
  منصّة: `public/_redirects` (`/* /index.html 200`) لـ Netlify وCloudflare Pages، و`vercel.json` في جذر
  المستودع لـ Vercel، وبمحتًى واحد: `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
  الفحص يقرأ الملفين معًا ويؤكد أن `/ats` و`/admin` و`/studio` تقع داخل النمط نفسه؛ من اعتمد على أن
  Vercel «يكتشف مشاريع Vite تلقائيًا» رآها بيضاء عند أول تحديثٍ على `/template/…`.
  `SITE_URL=https://mydomain.com npm run gen:seo` يعيد توليدها بنطاقك، أو ضع
  `SITE_URL=https://mydomain.com` في `.env` مرة واحدة فتُقرأ في كل `npm run build`.
- البريد الرسمي `qalb@qalb.store` هو الافتراضي في `src/data/contact.js`، ويظهر في الواجهات
  والإيصالات و`JSON-LD/Organization`. لتغييره مؤقتًا اضبط `VITE_QALB_MAIL` في `.env` بدل تعديل الملفات واحدًا واحدًا.
- **الروابط نصٌّ خام، لا صيغة Markdown**: `src/data/links.js` هو البنّاء الوحيد — `rawSite`
  و`rawUrl` و`rawText` — ويستعمله `scripts/seo.mjs` و`scripts/agents.mjs` و`src/components/Seo.jsx`
  معًا. فلا `marked` ولا أيّ مُحوِّل Markdown في أيّ منها، وقيمةُ `SITE_URL` الملصوقة من محرّر
  Markdown (`[https://x.app](https://x.app)`) تُنزَع صيغتُها وتُبقي مضيفَها وحدَه. الناتجُ في الـHTML
  الخام `https://qalb-store.vercel.app/templates` لا `[https://…](https://…)`، وsitemap.xml
  وllms.txt مثلهما (روابط llms.txt صارت `— الاسم — الرابط —` بدل `[الاسم](الرابط)`)، و`seo.mjs`
  يوقف البناء إذا تسرّبت الصيغة إلى أيّ ملفٍّ مولَّد.
- `src/components/Seo.jsx` يضبط لكل مسار: `title`، `description`، `og:*` (بما فيها `og:locale`)،
  `canonical`، و**`robots: index, follow` افتراضيًا لكل صفحة عامة** (والوسم مكتوبٌ أيضًا في
  `index.html` قبل أي JavaScript)، و`noindex,follow` على السلة/الدفع/الإيصال، و**JSON-LD**:
  `WebSite` + `Organization` + `SearchAction` في الرئيسية، و`Product` كامل
  (`name` + `image` + `description` + `offers` بسعرٍ بالريال وحالة `InStock`) في صفحة القالب
  **وفي كل عنصرٍ من ItemList في `/templates`**، و`AggregateRating` حيث تتوفّر تقييمات.
- الخطوط مستضافة محليًا (`public/fonts` + `src/fonts.css`) بلا طلبات خارجية؛ `npm run gen:fonts` يحدّثها،
  ونصّ ترخيص SIL OFL 1.1 لكل عائلة منسوخ حرفيًا بجانبها (`public/fonts/OFL-*.txt` و`public/fonts/README.md`).
- البناء يفصل الإطار: `react-vendor` (165 kB) وحده، فتبقى حزمة التطبيق 229.7 kB / 78.2 kB مضغوطة في الكاش عند تعديل المحتوى؛ صفحة اللوحة ونصوصها في chunk مستقل (`Admin` 47.49 kB / 14.16 kB) لا يُحمَّل إلا عند `/admin`، وكذلك `/legal` (3.31 kB / 1.17 kB)، وحزم المسارات بين 1.5 و47.5 kB.

---

## هيكل المشروع

```
src/
├── main.jsx                 النقطة الرئيسية + المزوّدات
├── App.jsx                  المسارات (lazy) + هيكل التحميل + إدارة التمرير
├── index.css                tokens داكن/فاتح + utilities مخصّصة (Tailwind v4)
├── fonts.css                @font-face محلي — يولّده scripts/fonts.mjs
├── i18n/                    translations.js (٧٥٩ مفتاحًا للمتجر) + admin-strings.js (١٧٤ للوحة) × لغتان
│                            متطابقتان — والفحص يرفض مفتاحًا ناقصًا أو ميتًا
├── data/templates.js        ١٥ منتجًا · المجالات · لوحات التحكم · آراء · كوبونات · download: /download/<id>
├── data/links.js            ★ بناءُ الروابط الخام: rawSite/rawUrl/rawText — لا Markdown في canonical ولا og:image ولا sitemap ولا llms.txt
├── data/ats-table.js        ★ جدول قواعد ATS الواحد — يقيس الفاحص المجاني وشارةَ القالب وسكربت الحزمة scripts/check-ats.mjs منه جميعًا
├── data/ats.js              analyzeAts + تقريرٌ من سبعة أسطر · ATS_DEMO = 100 · لا fetch ولا تخزين: الملف لا يغادر المتصفح
├── data/hosting.js          PLANS (مجاني · ٥٠٠ ريال/شهر، من جدول الخطط) · HOST_LIMITS · sanitizeSite/slugify/editKey — يُقرأ في الواجهة والخادم
├── data/b2b.js              خمسُ باقات (٢٥/٥٠/١٥٠/٣٠٠/٥٠٠ مقعد · ٣٩٠٠–٤٥٠٠٠ ريالًا/سنة) · seatBundle/seatRetailBand/tierForSeats · القابل للقياس فقط يدخل العقد
├── data/leads.js              دفترُ طلبات الجهات: normalizeLead/quoteNo/quoteMath/leadCsv + دفترُ المتصفح qalb.leads.v1
├── data/company.js            الهويةُ القانونية من `VITE_QALB_LEGAL_*`: ما لم يُضبط لا يُطبع، وحسابُ ١٥٪
├── data/deliverable.js      ★ ما يُسلَّم فعلًا لكل قالب: ملفات الحزمة + LICENSE.txt باسم المشتري + حقنه ببياناته (يتشاركه المتجر والخادم)
├── lib/load-error.js          تمييز «وحدات قديمة» عن عطل التصيير، وإعادة تحميل واحدة لا تتكرر
├── data/zip.js              ZIP stored بلا اعتماديات — للتوليد داخل المتصفح وللتوليد على الخادم
├── data/catalog.js            طبقة تجاوزات اللوحة: sanitize · applyOverlay · priceTable · adminRows
├── data/stats.js · tax.js     الدخل والـ CSV (وحدة واحدة يقرأها الخادم واللوحة) · VAT = ١٥٪
├── store/StoreContext.jsx   السلة، المفضلة، الكوبون، «شاهدتها مؤخرًا»، إجماليات VAT، Toasts، وبيانات التخصيص (تُتبع المشتري من صفحة المنتج إلى الدفع)
├── api/index.js             النقل: local | rest — نفس العقد لبوابة لاحقة + deliveryHref/deliveryAllHref
├── api/hosting.js           مواقع المضيف: قائمة/تحديث/إصدار رابط توليد — تُقرأ من اللوحة وصفحة /studio
├── api/orgs.js              بوابة المقاعد (rest فقط): redeem(code) — بلا خادم لا تُختلق عملية استهلاك
├── api/adminLocal.js        اللوحة بلا خادم: حساب + جلسة + تجاوزات على localStorage (قفل جهاز، لا أمن)
├── components/
│   ├── Personalize.jsx      ★ حقول التخصيص الاختياري — صندوق واحد في صفحة المنتج والدفع، مع زرّ «امسح بياناتي» ورابط إلى /legal#privacy
│   ├── Preview.jsx          موجّه: موقع أم سيرة + ArtTile للمصغّرات
│   ├── SitePreview.jsx      ★ الموقع داخل إطار متصفح (٣ شاشات، ٣ ترويسات، ٤ شبكات)
│   ├── ResumePreview.jsx    ★ صفحة A4 حقيقية بخمسة تخطيطات + تكبير
│   ├── QuickView.jsx        معاينة ملء الشاشة (portal + inert + مصيدة تركيز)
│   ├── Seo.jsx              title/description/og(:image)/canonical + robots + JSON-LD لكل مسار — كلُّ رابطٍ عبر links.js
│   ├── ErrorBoundary.jsx    شاشة استرجاع لكل مسار بدل فراغ `#main`
│   ├── RecentlyViewed.jsx   آخر ٦ منتجات مفتوحة
│   └── TemplateCard.jsx · Navbar.jsx · Footer.jsx · ui.jsx
└── pages/                   Home · Catalog · Product · Cart · Checkout · Success · Wishlist · Track · Licence · Legal · Host · Studio · Ats · B2B · **Admin** · NotFound

scripts/  seo.mjs (robots + sitemap + og-cover + بطاقةٌ لكل منتج · حاجزٌ يمنع Markdown في أيّ ملفٍّ مولَّد) · og-cover.py · fonts.mjs · deliverables.mjs (١٥ حزمة، وكل حزمة CV تحمل scripts/check-ats.mjs مولَّدًا من src/data/ats.js) · revenue-i18n.py (نصوص الإيراد في اللغتين، بحاجزٍ يرفض الكتابة إن انحرف عن القاموس) · agents.mjs · dotenv.mjs
server/   worker.js (Node، بلا اعتماديات) · http.js (قراءة الجسد Buffer.concat بسقف، وIP العميل خلف الوسيط) · admin.js (بوابة اللوحة: scrypt + كوكي + خنق المحاولات) · payments.js (Moyasar/Stripe: لا وسمَ مدفوعًا إلا بقول البوّابة) · deliver.js (تسليم موقّع: HMAC · ١٠ دقائق · مرة واحدة) · mail.js + invoice.js (الإيصال والفاتورة) · leads.js · market.js · subscribers.js · sites.js (مواقع الاستضافة وحصص التحرير) · orgs.js (عقود المقاعد وأبواب /org) · seal.js (كل ملف حالة 0600، ختمٌ عند الإقلاع أيضًا) · schema.sql · README.md
tests/    entry.jsx · smoke.mjs (الحزمة الحقيقية في jsdom — ٧٨ مجموعة، ٥١ مسارًا، ٣١٨ توقّعًا، منها ٥٠ للتخصيص و١٧ للتسليم و٩٣ للمقاعد و٥٨ لفاحص ATS) · admin-api.mjs (خادم فعلي على :8899 — ٢٦٨ فحصًا: اللوحة، التوقيع، صلاحيات الملفات، المقاعد، الحدود والأجساد)
public/   fonts/ · robots.txt · sitemap.xml · _redirects · og-cover.png · og/ (بطاقات مولّدة)

vercel.json (إعادة كتابة SPA) · eslint.config.js · .prettierrc.json · .prettierignore · .github/workflows/ci.yml · LICENSE · .env.example
```

---

## ملاحظات تنفيذية

- **التحجيم التلقائي**: المكوّنان يرسمان على «عرض تصميم» ثابت (640px للسيرة، 1280/768/420 للموقع) ثم
  `transform: scale()` محسوب من عرض الحاوية عبر `useFitWidth()` في `src/lib/use-fit-width.js`، فالمعاينة
  تتبع النافذة فعلًا. والاهتزاز كان ثمنَ هذا: القياسُ يُقرَّب إلى أقرب بكسل، ولا `setState` إلا عند
  تغيّرٍ حقيقي لأن `ResizeObserver` يُطلَق للارتفاع أيضًا، والارتفاعُ لا يُكتب من JS بل من `aspect-ratio`
  في CSS، والصندوقُ `contain: layout paint` مع `scrollbar-gutter: stable` على `html` فلا يفتح شريطُ
  تمريرٍ حلقةَ قياسٍ مغلقة. `@utility fitbox` و`@utility fitscale` مكانُ هاتين القاعدتين الوحيد.
- **الضريبة**: الأسعار شاملة ١٥٪ وتُستخرج في الملخص (لا تُضاف فوقه) كما هو معتاد في المتاجر السعودية.
- **RTL**: مسافات منطقية دائمًا (`ps-/pe-/ms-/me-/start-/end-`)، والأرقام داخل `.num` (tabular-nums + LTR).
  لا نعتمد على ترتيب الكلاسات المتضادة؛ اتجاهات الجرّ تتحدد من `lang` في JS.
- **الوصول**: `focus-visible`، `aria-label/pressed/expanded`، `role="dialog"` + `aria-modal` + `inert` للخلفية،
  مصيدة Tab، منطقة إشعارات `role="status"`، و`prefers-reduced-motion`.
- **الأرقام**: كل الأسعار تُنسّق عبر `dec()` (أرقام لاتارية، فواصل إنجليزية) حتى لا تتكسر المعادلات عند قراءة النص.
- **حدود الخطأ**: `ErrorBoundary` حول `<Suspense>` في `App.jsx` بمفتاح `pathname#attempt`؛ «إعادة
  المحاولة» تزيد `attempt` فتُعاد تركيب الشجرة (يكفي لأخطاء الحزم والبيانات العابرة)، وأي تنقّل يمسح
  الشاشة القديمة وحده. الأخطاء الرامية من `effect` تمرّ من الطريق نفسه.
- **الجودة في CI**: `npm run lint` + `npm run format:check` + `npm test` + `npm run build` في
  `.github/workflows/ci.yml`؛ قواعد `react-hooks` الحديثة تكشف `setState` داخل effect وتوليد المكوّنات
  داخل الرندر، وهي التي دلّت على المواضع أعلاه.
- **الصفحة الأولى**: مجموعة خاصة تتأكد أن شريط المنصات بلا أي كلاس حركة، وأن الشرائح الطافية أعلى من
  كل بطاقة معاينة — تقرأ `style.zIndex` الحقيقية ولا تفترض رقمًا، فلو نمت المروحة لكشف ذلك.
- **الصفحة الأولى**: مجموعة خاصة تقرأ `src/index.css` نفسه — تتأكد أن `marquee` اختفى من المصدر، وأن
  `prefers-reduced-motion` يضبط `animation-iteration-count: 1`، وأن الشرائح الطافية أعلى من كل بطاقة معاينة.

- **اختبار jsdom**: `tests/smoke.mjs` ينتظر استقرار DOM بعد حلّ الحزم الكسولة عبر `settle()` (يكتشف هيكل
  `<Suspense>` ولا يقرأه كصفحة جاهزة) — وهذا بالضبط ما كشف مشكلة الانتظار الثابت القديم.
- **الكوبونات**: `SALE25` · `WELCOME10` · `QALB30`.
- الدفع محاكى بالكامل: لا بوابة دفع، ولا عملية شحن فعلية.

---
