# النشر

> مستخرج من README الأصلي لتسهيل الصيانة — المصدر الوحيد للحقيقة هو الكود.

## النشر

- **المستودع**: `github.com/basmalthqfy780-sudo/qalb-store` — ومساره مكتوب أيضًا في `package.json`
  (`repository.url`)، فلا يضيع إذا فُقد `.git/config` كما يقع في بيئات العمل المؤقتة.
- **الوسوم**: كل نسخة موثومة (`v1.0.0` … `v1.4.0`)، والوسم مشروح (`git tag -n1`) — والـCHANGELOG
  مكتوبٌ من مخرجات الأدوات لا من ذاكرة كاتبه.
- **بوابة الجودة**: `.github/workflows/ci.yml` يشغّل `npm ci` ثم `build` ثم `test` (حزمة jsdom في
  jsdom + خادم فعلي في `tests/admin-api.mjs`)، و`build` قبل `test` لأن فحص طبقات CSS يقرأ
  `dist/assets/*.css` المُسلَّم لا المصدر.
- **بمفتاح نشر للمستودع وحده**: `ssh-keygen -t ed25519 -f /tmp/qalb-deploy -N ''` ثم يُضاف
  `/tmp/qalb-deploy.pub` في Settings → Deploy keys بصلاحية write، ويُدفَع بـ
  `GIT_SSH_COMMAND="ssh -i /tmp/qalb-deploy -o IdentitiesOnly=yes" git push origin HEAD:main --follow-tags`،
  ثم `rm -f /tmp/qalb-deploy /tmp/qalb-deploy.pub`. لا توكن في `~/.git-credentials` ولا
  `git config --global` ولا مفتاح داخل الشجرة — والحارس في `tests/admin-api.mjs` يرفض أي ملف
  اعتمادات داخل المستودع. وفي البيئات التي لا `known_hosts` فيها لـ github.com، verify أولًا بمفاتيح
  `https://api.github.com/meta` ثم مرّر `-o UserKnownHostsFile=<ملف مؤقت>` واحذفه مع المفتاح.
- **لا شيء من البناء يُدفَع**: `dist/` و`dist-deliverables/` و`uploads/` و`node_modules/` في
  `.gitignore`؛ وما يُنشر هو الشجرة + `public/sitemap.xml` المولّد (و`npm run gen:seo` يعيده).

---

## تعديل سريع

- الألوان/الخطوط/الظلال: `src/index.css` ← `:root` و `.light` و `@theme`.
- المنتجات وحقول المعاينة (`site` / `demo`): `src/data/templates.js`.
- النصوص: `src/i18n/translations.js`.
- للاسم الجديد للمتجر: `brand.name` في ملف النصوص + `Logo` في `Navbar.jsx`.

---
