# خادم الطلبات · Qalb

الواجهة تعمل بدونه (الوضع الافتراضي `VITE_QALB_API=local` يخزّن كل شيء في
`localStorage`). هذا المجلد هو الحدّ الأدنى الذي يحوّل المتجر إلى متجر حقيقي
دون تغيير أي مكوّن في الواجهة.

## التشغيل

```bash
node server/worker.js          # 0.0.0.0:8787 · يكتب في server/orders.jsonl
```

ثم في الجذر:

```bash
cp .env.example .env
# VITE_QALB_API=rest
# VITE_QALB_API_BASE=http://localhost:8787
npm run dev
```

ستلاحظ أن زر الدفع صار يحمل نقطة خضراء بدل الذهبية («متصل بخدمة الطلبات») —
هذا مؤشر الوضع الذي تعرضه صفحة إتمام الشراء نفسها، لا إعدادًا إضافيًا.

## العقد (نفسه `src/api/index.js`)

| الطريقة | المسار           | وظيفة                                                                              |
| ------- | ---------------- | ---------------------------------------------------------------------------------- |
| `POST`  | `/orders`        | يستقبل المسودة ويعيد `{ id, key, date, subtotal, discount, vat, total, lines, … }` |
| `GET`   | `/orders/:id`    | الإيصال — يُفتح منه `/order?id=…`                                                  |
| `GET`   | `/orders?email=` | إيصالات المشتري (بلا حسابات)                                                       |
| `GET`   | `/licences/:key` | `{ valid, order, seats, domains }`                                                 |
| `GET`   | `/health`        | الحالة ونوع التخزين وهل لوحة الإدارة مفعّلة (`admin: true/false`)                  |

قواعد يطبّقها الخادم فعليًا (تحقّقتُ منها بـ`curl`):

- **إعادة حساب المجاميع**: `subtotal` و`discount` و`vat` تُحسب من جدول
  الأسعار الحيّ (`admin.prices()` فوق `src/data/templates.js`)؛ لو فرق `total`
  المرسل عن المحسوب أكثر من 0.50 ر.س يُرفض الطلب بـ`400 total mismatch`. لا
  تصديق لأرقام المتصفح، وتعديل سعر من اللوحة يُقبل فورًا في الدفع لأنه يغيّر
  الجدول نفسه — يغطّي هذا الفحصَ `npm run test:api`.
- **Idempotency-Key**: نفس المفتاح يعيد نفس الطلب ولا ينشئ ثانٍ
  (`server/orders.jsonl` يبقى سطرًا واحدًا).
- **بريد واسم صحيحان** وإلا `400`، و`404` لمنطقة غير معروفة.

## لوحة الإدارة (`server/admin.js`)

نفس الملف يخدم `/admin/*` و`GET /catalog`؛ يفعَّل تلقائيًا إذا وُجدت
`ADMIN_PASSWORD`، أو بتهيئة أولى من الصفحة نفسها عند `ALLOW_ADMIN_SETUP=1`.
بدونهما تعمل المتاجر كما هي وترجع اللوحة `503` بجملة واضحة.

| الطريقة    | المسار                                                                                      | وظيفة                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET`      | `/catalog`                                                                                  | `{ overrides, prices }` — يقرأه المتجر عند الإقلاع ليطبّق طبقة اللوحة                                 |
| `POST`     | `/admin/login` · `/admin/logout` · `/admin/session`                                         | جلسة: كوكي `qalb_admin` (HttpOnly · SameSite=Strict) أو `Bearer` للوضع المحلي                         |
| `GET`      | `/admin/stats`                                                                              | دخل، ضريبة مستخرجة من ١٥٪ تشملها الأسعار، عدد الطلبات، المشترون، متوسط السلة، ٣٠ يومًا، الأكثر مبيعًا |
| `GET`      | `/admin/orders?limit=` · `/admin/export.csv`                                                | آخر الطلبات · تصدير CSV باثني عشر عمودًا                                                              |
| `GET/POST` | `/admin/products` · `PATCH/DELETE /admin/products/:id` · `POST /admin/products/:id/restore` | جدول التجاوزات: سعر، سعر قبل الخصم، رابط تنزيل، نصوص، فئة، نشر/إخفاء، منتج مخصّص                      |
| `GET/POST` | `/admin/users` · `DELETE /admin/users/:id` · `POST /admin/users/:id/password`               | المسؤولون: إضافة، حذف، إعادة تعيين كلمة السر                                                          |

ما يُطبَّق فعليًا (كله مغطّى بفحوص `npm run test:api`):

- كلمة السر تُخزَّن **scrypt + ملح** ولا تُكتب نصًا أبدًا؛ أقل طول ١٠ أحرف.
- ست محاولات فاشلة في عشر دقائق لنفس IP ⇒ `429` مع `retryAfter`.
- كل طلب تغيير (ما عدا `GET`) يحتاج ترويسة `x-qalb-admin: 1` — منع CSRF؛ و`Origin`
  تُتحقّق من `ADMIN_ORIGIN` إن ضبطتها.
- `POST /admin/users` بمحاولة رفع شخص إلى `owner` من مسؤول عادي تُخفَّض إلى `admin`
  بصمت؛ ولا حذف للنفس، ولا حذف لآخر مالك (`409`).
- الكتابة ذرّية: ملف مؤقت + `rename`، والصلاحيات `0600` لملفات `admins.json` و`products.json`
  و`.admin-secret` (جميعها خارج git).
- `DELETE` على منتج أساسي = `published:false` فيختفي من `prices` ومن `/catalog`،
  فيصبح طلبه مستحيلًا عند الدفع بـ`unknown template`. المنتجات المخصّصة تُحذف فعلًا.
- `/admin` نفسها `noindex,follow` وممنوعة في `robots.txt`.

> في وضع `local` (بلا خادم) تعمل اللوحة من `src/api/adminLocal.js` فوق
> `localStorage`: قفل على الجهاز لتجربة سريعة — لا تعده أمنًا. لهذا تبقى
> `VITE_QALB_API=rest` هي المسار الصحيح لكل استخدام حقيقي.

## قاعدة البيانات

`schema.sql` لـ Postgres/Supabase: `orders` + `order_items` + `licences` +
`idempotency`، مع دالة `licence_is_valid(text)` وسياسة RLS تقرأ المستخدم
إيصالات بريدِه فقط. اضبط `SUPABASE_URL` و`SUPABASE_SERVICE_KEY` فيتحول
التخزين إلى PostgREST بدل الملف.

## الدفع الحقيقي

هذا الخادم **لا يلمس البطاقات** — الدفع يبقى محاكى في الواجهة. لربط بوابة:

1. أنشئ Session عند `POST /orders` (Stripe `mode=payment`, `currency=sar`,
   `line_items` من `lines`) وأعِد `url` للواجهة.
2. أنشئ السجل النهائي في `orders` من **Webhook** (`checkout.session.completed`)
   لا من المتصفح، ثم ولّد `key` هناك.
3. بقية الواجهة لا يتغير: `src/api/index.js` هو المكان الوحيد الذي يعرف
   العنوان، فلو أصبحت `VITE_QALB_API=rest` تعمل كل الصفحات على نفس العقد.
