# الخطوط المستضافة محليًا

ثلاث عائلات، كلها مرخّصة بـ **SIL Open Font License 1.1** — ونصّ الترخيص منسوخ
حرفيًا من المستودع الأصلي لكل عائلة:

| العائلة                | الملف                          | مصدر التنزيل                                  |
| ---------------------- | ------------------------------ | --------------------------------------------- |
| IBM Plex Sans Arabic   | `OFL-IBM-Plex-Sans-Arabic.txt` | `github.com/IBM/plex`                         |
| Tajawal                | `OFL-Tajawal.txt`              | `github.com/googlefonts/tajawal`              |
| Inter                  | `OFL-Inter.txt`                | `github.com/rsms/inter`                       |

- ملفات `*.woff2` يولّدها `npm run gen:fonts` (يقرأ `scripts/fonts.mjs` من Google
  Fonts ثم يكتب `src/fonts.css`)، فلا حاجة لتعديلها يدويًا.
- OFL تسمح بالتضمين والتوزيع مع الحفاظ على النص، وتمنع بيع الخط وحده — لذلك يبقى
  ملفا الترخيص مع الخط عند أي نشر أو إعادة توزيع للقالب.
