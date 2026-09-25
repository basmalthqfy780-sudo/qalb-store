# قالب — Qalb · متجر قوالب معرض الأعمال + السيرة الذاتية

متجر واجهة-أمامية يبيع **قوالب مواقع بورتفوليو شخصية** و**سير ذاتية** و**حزمًا تجمع الاثنين بهوية واحدة**.
الفكرة المحورية: ملفك المهني كله (الموقع + الـCV + الخطاب) يخرج من نفس متغيرات التصميم — وتعاين الموقع **حيةً داخل إطار متصفح** قبل الشراء.

**التقنيات**: React 18 + Vite 6 + Tailwind CSS v4 (بدون مكتبة UI) + React Router. ثنائي اللغة `ar ⇄ en` مع تبديل `RTL/LTR` لحظيًا.

**النسخة**: `1.9.0` وما بعدها تحت «Unreleased» — التفاصيل في [`CHANGELOG.md`](CHANGELOG.md) ومصدرها `npm test`.

---

## التشغيل

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # إنتاج dist/
npm run preview    # معاينة الإنتاج
npm test           # ٧٧ مجموعة / ١٤٧٣ فحصًا + ٢٦٨ فحص خادم
npm run lint && npm run format:check
npm run gen:seo    # robots.txt + sitemap.xml (قبل كل build)
npm run api        # خادم الطلبات على :8787
```

> **وضع المعاينة المحلي**: افتراضيًا `VITE_QALB_API=local` — الطلبات والمفاتيح في `localStorage` فقط، تجربة سريعة بدون خادم. للبيع الحقيقي اضبط `VITE_QALB_API=rest` وشغّل `server/worker.js`.

## المنتجات

20 قالبًا: 8 مواقع بورتفوليو (تصميم، تصوير، برمجة، موشن، كتابة، 3D، استوديو، بسيط) + 6 سير ذاتية + 4 حزم موقع+سيرة + حزمة LinkedIn + حزمة خطابات. كل قالب يحمل `download: /download/<id>` ويُسلَّم كحزمة كاملة (انظر [docs/delivery.md](docs/delivery.md)).

| النوع     | أمثلة                                         | السعر       |
| --------- | --------------------------------------------- | ----------- |
| بورتفوليو | Aether 199، Atelier 249، Nexus 199، Folio 149 | 149–399 ر.س |
| سيرة      | Nova 89، Atlas 99، Apex 129، Echo 59          | 59–129 ر.س  |
| حزمة      | Mirror Pro 449، DevPack 379، FirstStep 199    | 199–449 ر.س |

معاينة حية داخل إطار متصفح (3 شاشات، 3 ترويسات، 4 شبكات)، تبديل حزمة موقع↔سيرة، ودرجات ATS/أداء.

## الوضع المحلي مقابل الخادم

| الوضع             | الإعداد                                     | السلوك                                                  |
| ----------------- | ------------------------------------------- | ------------------------------------------------------- |
| `local` (افتراضي) | بدون إعداد                                  | `QALB-…` ومفتاح في `localStorage`                       |
| `rest`            | `VITE_QALB_API=rest` + `VITE_QALB_API_BASE` | `POST /orders`، `GET /orders/:id`، `GET /licences/:key` |

التفاصيل في [`docs/architecture.md`](docs/architecture.md) و [`server/README.md`](server/README.md).

## التسليم والتخصيص

الحزم تُبنى من `src/data/deliverable.js` — 13 ملفًا للسيرة و20–24 للموقع/الحزمة، مع `LICENSE.txt` باسم المشتري. التخصيص الاختياري (الاسم، المسمى، البريد، الجوال، الرابط، نبذة) **طُبعت بياناتك في الحزمة** نفسها: الاسم في `<h1>` و`og:title`، والمسمى في السيرة، والبريد/الجوال في `resume.html`، والرابط كمضيف نظيف، والنبذة كجملة مختومة بنقطة. كل حقل يُنقّى عبر `sanitizePersonal` (سقف 80–700، رفض `<>`، تحقق بريد/جوال).

> التفاصيل الكاملة: [docs/delivery.md](docs/delivery.md)

## الشارة والخطط

- شارة `«صُنع بواسطة Qalb Store»` في كل قالب/صفحة — تُسقط برخصة White-label (50 ر.س) أو اشتراك Pro/Plus.
- الخطط من جدول واحد `src/data/plans.js`: Plus 300/3000، Pro 500/5000 — تُقرأ في الواجهة والسلة والخادم والاستضافة (`hosting.js` يقرأها حيًا عبر `priceOf()`).
- التفاصيل: [docs/brand-and-plans.md](docs/brand-and-plans.md)

## لوحة الإدارة

`/admin` — نظرة عامة، منتجات (سعر/إخفاء/منتج مخصص)، طلبات مع CSV، صلاحيات. الحماية `scrypt + HttpOnly` في وضع الخادم، و`localStorage` في الوضع المحلي (قفل جهاز فقط). التفاصيل: [docs/admin.md](docs/admin.md)

## أصول الظهور

- `scripts/seo.mjs` يولّد `robots.txt` و`sitemap.xml` (52 رابط) و`public/og/*.png`.
- الخطوط محليًا `public/fonts` + `src/fonts.css` (OFL).
- `src/components/Seo.jsx` يضبط `title` و`og:image` و`JSON-LD` لكل مسار.

## هيكل المشروع

```
src/
├── App.jsx, main.jsx, index.css, fonts.css
├── i18n/ (translations 759 + admin-strings 174)
├── data/ (templates, plans, hosting, b2b, deliverable, catalog, ats...)
├── components/ (Preview, SitePreview, ResumePreview, Seo, TemplateCard...)
├── pages/ (Home, Catalog, Product, Checkout, Success, Admin...)
├── store/StoreContext.jsx
└── api/index.js (local | rest)
scripts/ seo.mjs, agents.mjs, fonts.mjs, deliverables.mjs
server/ worker.js, admin.js, deliver.js, payments.js, seal.js...
tests/ smoke.mjs, admin-api.mjs
public/ fonts/, robots.txt, sitemap.xml, og/
```

التفاصيل: [docs/architecture.md](docs/architecture.md)

## ملاحظات تنفيذية

- تحجيم تلقائي `useFitWidth` + `contain: layout paint` + `aspect-ratio` يمنع اهتزاز المعاينة.
- أسعار شاملة 15% VAT تُستخرج لا تُضاف.
- RTL بمسافات منطقية و`.num` للأرقام.
- `ErrorBoundary` + `Suspense` لكل مسار.
- تباين عالي في الرئيسية: `text-slate-100` للعناوين و`text-slate-200` للنصوص — كل الأقسام واضحة بدون إجهاد.

## النشر

`github.com/basmalthqfy780-sudo/qalb-store` — الوسوم `v1.0.0…` و CI يشغّل `lint → format → build → test`.

```bash
ADMIN_PASSWORD='...' npm run api   # ثم VITE_QALB_API=rest npm run dev
# Vercel: vercel.json يعيد كتابة SPA، و public/_redirects لـ Netlify
```

التفاصيل: [docs/deployment.md](docs/deployment.md) و `server/README.md`

## تعديل سريع

- ألوان/خطوط: `src/index.css` → `:root` و `.light`
- منتجات: `src/data/templates.js`
- نصوص: `src/i18n/locales/ar.js` + `admin-strings.js`
- اسم المتجر: `brand.name` + `Logo` في `Navbar.jsx`

---

### توثيق مفصّل

| الملف                                              | ما فيه                                   |
| -------------------------------------------------- | ---------------------------------------- |
| [docs/architecture.md](docs/architecture.md)       | بنية المجلدات، التقنيات، ملاحظات التنفيذ |
| [docs/brand-and-plans.md](docs/brand-and-plans.md) | الشارة White-label والخطط وتوحيد الأسعار |
| [docs/delivery.md](docs/delivery.md)               | التسليم، الروابط الموقعة، التخصيص        |
| [docs/b2b-and-hosting.md](docs/b2b-and-hosting.md) | مقاعد الجامعات، فاحص ATS، استضافة القالب |
| [docs/admin.md](docs/admin.md)                     | لوحة الإدارة والصلاحيات                  |
| [docs/deployment.md](docs/deployment.md)           | النشر على Vercel/Netlify و CI            |
| [docs/history.md](docs/history.md)                 | جولات الإصلاح والتشذيب (v1.5–v1.9)       |
