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
| `GET`   | `/health`        | الحالة ونوع التخزين                                                                |

قواعد يطبّقها الخادم فعليًا (تحقّقتُ منها بـ`curl`):

- **إعادة حساب المجاميع**: `subtotal` و`discount` و`vat` تُحسب من أسعار
  `src/data/templates.js`؛ لو فرق `total` المرسل عن المحسوب أكثر من 0.50 ر.س
  يُرفض الطلب بـ`400 total mismatch`. لا تصديق لأرقام المتصفح.
- **Idempotency-Key**: نفس المفتاح يعيد نفس الطلب ولا ينشئ ثانٍ
  (`server/orders.jsonl` يبقى سطرًا واحدًا).
- **بريد واسم صحيحان** وإلا `400`، و`404` لمنطقة غير معروفة.

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
