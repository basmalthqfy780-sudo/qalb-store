#!/usr/bin/env node
/**
 * node لا يقرأ .env من نفسه (ذلك تفعله Vite وحدها)، فتشارك سكربتاتنا هذا المحمّل:
 * scripts/seo.mjs (أصول الظهور) و server/worker.js (PORT والمفاتيح).
 * القيم الموجودة في البيئة الحقيقية تتقدّم على الملف دائمًا.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function loadDotEnv(root = ROOT) {
  const file = path.join(root, '.env')
  if (!existsSync(file)) return false
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m || process.env[m[1]] !== undefined) continue
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return true
}
