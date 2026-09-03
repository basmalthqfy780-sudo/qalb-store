#!/usr/bin/env node
/**
 * يضيف الخطوط محليًا بدل Google Fonts:
 *   node scripts/fonts.mjs
 * ينزل ملفات woff2 إلى public/fonts ويكتب src/fonts.css بـ @font-face.
 * رُخص الخطوط (SIL OFL 1.1) منسوخة حرفيًا بجانبها في public/fonts/OFL-*.txt.
 * لا يحتاج إعادة تشغيل بعد ذلك: الواجهة مكتفية بذاتها، وأول زيارة أسرع
 * لأن الطلب لا يخرج لشبكة خارجية.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FONTS = path.join(ROOT, 'public', 'fonts')
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const URL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;700;800&family=Inter:wght@400;500;600;700&display=swap'

mkdirSync(FONTS, { recursive: true })

const css = spawnSync('curl', ['-fsSL', '-A', UA, URL], { encoding: 'utf8', maxBuffer: 8 << 20 })
if (css.status !== 0 || !css.stdout.includes('@font-face')) {
  console.error('fonts: لم أستطع جلب CSS من Google Fonts — اترك الوسم الحالي في index.html')
  process.exit(1)
}

let out = css.stdout
const urls = [...new Set([...out.matchAll(/url\((https:[^)]+\.woff2)\)/g)].map((m) => m[1]))]
let ok = 0
for (const u of urls) {
  const name = path.basename(u)
  const target = path.join(FONTS, name)
  if (!existsSync(target)) {
    const dl = spawnSync('curl', ['-fsSL', '-o', target, u], { encoding: 'utf8' })
    if (dl.status !== 0) {
      console.warn('skip', name)
      continue
    }
  }
  out = out.split(u).join(`/fonts/${name}`)
  ok++
}

out = out.replace(/\/\*\s*([\w-]+)\s*\*\//g, '/* $1 */')
writeFileSync(path.join(ROOT, 'src', 'fonts.css'), `/* self-hosted by scripts/fonts.mjs — do not edit by hand */\n${out}`)
console.log(`fonts: ${ok}/${urls.length} ملفات في public/fonts · src/fonts.css جاهز`)
