#!/usr/bin/env node
/**
 * يبني حزم التسليم الخمس عشرة إلى مجلد خارج dist/ — لمن يريد أن يستضيفها
 * بنفسه (S3 / R2 / Netlify Files) بدل التوليد لحظة الطلب.
 *
 *   node scripts/deliverables.mjs [outdir]      (الافتراضي: dist-deliverables)
 *
 * النسخة المولّدة هنا «نسخة مراجعة» بلا مشتري: سطر التتبّع يقول unlicensed review copy،
 * وLICENSE.txt بلا اسم ولا مفتاح. ما يصل المشتري فعلًا يُبنى لحظة التنزيل من نفس
 * المولّد (src/data/deliverable.js) فيكون فيه اسمه ورقم طلبه ومفتاحه — لا هذه الملفات.
 *
 * بعد الرفع لديك خياران، وكلاهما يعمل في صفحة الإيصال:
 *   • تترك حقل `download` على /download/<id> → يسلّمه الخادم برابط موقّع 10 دقائق، مرة واحدة.
 *   • تكتب رابطه العام في اللوحة → يذهب المشتري إليه مباشرة (مع فقدان التتبّع الفردي).
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { templates } from '../src/data/templates.js'
import { kindOf, licenceText, packageFiles, packageZip } from '../src/data/deliverable.js'
import { zipNames } from '../src/data/zip.js'

const OUT = path.resolve(process.argv[2] || 'dist-deliverables')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const rows = []
let problems = 0
for (const tpl of templates) {
  const files = packageFiles(tpl, {})
  const zip = packageZip(tpl, {})
  const names = zipNames(zip)
  const missing = files.map((f) => f.path).filter((p) => !names.includes(p))
  if (missing.length) {
    problems++
    console.error(`✗ ${tpl.id}: لم تُقرأ ${missing.length} ملفًا من الأرشيف`)
  }
  const lic = licenceText(tpl, {})
  if (!lic.includes('single-seat') || !lic.includes('مقعد واحد')) {
    problems++
    console.error(`✗ ${tpl.id}: نص الرخصة ناقص`)
  }
  writeFileSync(path.join(OUT, `${tpl.id}.zip`), Buffer.from(zip))
  writeFileSync(path.join(OUT, `${tpl.id}.LICENSE.txt`), lic)
  rows.push({ id: tpl.id, kind: kindOf(tpl), files: files.length, kb: Math.round(zip.length / 1024), price: tpl.price })
}

writeFileSync(
  path.join(OUT, 'MANIFEST.md'),
  [
    '# حزم القوالب — نسخة مراجعة',
    '',
    'مجلّد في `dist-deliverables/` (غير متتبَع في git). هذه الملفات بلا صاحب: سطر التتبّع',
    'فيها يقول `unlicensed review copy`، ورخصة المشتري تُبنى لحظة التنزيل باسمه هو.',
    '',
    '| القالب | النوع | الملفات | الحجم | السعر |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| \`${r.id}\` | ${r.kind} | ${r.files} | ${r.kb} KB | ${r.price} SAR |`),
    '',
    '## رفعها واستضافتها',
    '',
    '1. ارفع الـ zips إلى S3/R2/Netlify Files أو أي CDN (المسار العام: `qalb/<id>.zip`).',
    '2. من لوحة الإدارة → المنتجات → «رابط تحميل المشتري»:',
    '   - اتركه `/download/<id>` ليبقى التسليم موقّعًا ومقيدًا بالطلب (الموصى به).',
    '   - أو ضع رابطه العام فيذهب المشتري إليه مباشرة، بلا انتهاء صلاحية ولا تتبّع فردي.',
    '3. إن غيّرت المحتوى هنا فلا تنسَ أن `src/data/templates.js` هو مصدر ما يراه المشتري',
    '   في المعاينة وما يُبنى في `/download/<id>` — الاستضافة اليدوية نسخة منفصلة عنهما.',
    '',
    `مولّد بـ: node scripts/deliverables.mjs · ${rows.length} حزمة · ${rows.reduce((s, r) => s + r.files, 0)} ملفًا`,
    '',
  ].join('\n'),
)

console.log(`${rows.length} حزمة في ${OUT} · ${rows.reduce((s, r) => s + r.files, 0)} ملفًا · ${problems} مشكلة`)
console.log(
  rows.map((r) => `  ${r.id.padEnd(13)} ${r.kind.padEnd(7)} ${String(r.files).padStart(2)} ملفات ${String(r.kb).padStart(3)} KB`).join('\n'),
)
process.exit(problems ? 1 : 0)
