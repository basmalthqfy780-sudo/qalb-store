/**
 * فحص تكامل حقيقي لطبقة الإدارة: يشغّل server/worker.js كعملية فعلية ويتكلم
 * معها بـ HTTP (لا محاكاة) داخل مجلد بيانات مؤقت — لا يمسّ server/orders.jsonl
 * ولا admins.json ولا products.json عندك إطلاقًا، ثم يحذف المؤقت.
 *   node tests/admin-api.mjs        (أو npm test — يشغّله بعد فحص الواجهة)
 * يغطّي: المصادقة والتجزئة، الحدود (آخر مالك/الحذف الذاتي/ترقية الدور)،
 * خانق المحاولات، حارس CSRF، وتنقية الحقول — وأن سعر المنتج المخفيّ أو المعدَّل
 * يسري فعلًا على /orders، لا على الواجهة وحدها.
 */
import { spawn } from 'node:child_process'
import { existsSync, rmSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 8899
const BASE = `http://127.0.0.1:${PORT}`
const PW = 'integration-test-pass-1'
let pass = 0
const fails = []
const ok = (n, c, got) => {
  if (c) {
    pass++
    console.log(`  ✓ ${n}`)
  } else {
    fails.push(n)
    console.log(`  ✗ ${n}${got === undefined ? '' : `  → got: ${String(got).slice(0, 160)}`}`)
  }
}

// a fresh temp data dir: the suite writes and deletes only here, never in server/
const DATA = mkdtempSync(join(tmpdir(), 'qalb-admin-api-'))

const srv = spawn(process.execPath, ['server/worker.js'], {
  env: { ...process.env, PORT: String(PORT), ADMIN_PASSWORD: PW, ADMIN_EMAIL: 'boss@qalb.store', ADMIN_NAME: 'Boss', QALB_DATA_DIR: DATA },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
srv.stdout.on('data', (d) => (log += d))
srv.stderr.on('data', (d) => (log += d))

async function wait() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/health`)
      if (r.ok) return r.json()
    } catch {
      /* لم يصعد الخادم بعد — نعاود في الدورة التالية */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('server did not start\n' + log)
}

const call = async (method, path, { body, token, header = true, raw = false } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(header ? { 'x-qalb-admin': '1' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  })
  if (raw) return { status: res.status, text: await res.text(), headers: res.headers }
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* استجابة غير JSON: نتركها فارغة ويقرّر الفحص */
  }
  return { status: res.status, json, text, headers: res.headers }
}

try {
  const h = await wait()
  ok('health reports admin enabled after bootstrap', h.admin === true, JSON.stringify(h))
  ok('bootstrap wrote admins.json into the data dir', existsSync(join(DATA, 'admins.json')))

  /* --- auth --- */
  const bad = await call('POST', '/admin/login', { body: { password: 'wrong-password-xx' }, header: false })
  ok('wrong password → 401', bad.status === 401, bad.status)
  const good = await call('POST', '/admin/login', { body: { password: PW }, header: false })
  const TOKEN = good.json?.token
  ok('correct password → 200 + user + token', good.status === 200 && !!TOKEN && good.json.user.role === 'owner', JSON.stringify(good.json))
  const cookie = good.headers.get('set-cookie') || ''
  ok('session cookie is HttpOnly + SameSite=Strict', /httponly/i.test(cookie) && /samesite=strict/i.test(cookie), cookie)
  const anon = await call('GET', '/admin/stats')
  ok('admin routes refuse anonymous callers', anon.status === 401, anon.status)
  const noHdr = await call('PATCH', '/admin/products/aether', { body: { price: 199 }, token: TOKEN, header: false })
  ok('mutations without x-qalb-admin are blocked (CSRF guard)', noHdr.status === 403, JSON.stringify(noHdr.json))
  const sess = await call('GET', '/admin/session', { token: TOKEN })
  ok('bearer token authenticates /admin/session', sess.status === 200 && sess.json.user.email === 'boss@qalb.store', JSON.stringify(sess.json))
  const forged = await call('GET', '/admin/session', { token: 'owner.9999999999999.deadbeef' })
  ok('a forged token is rejected', forged.status === 401, forged.status)

  /* --- products --- */
  const list = await call('GET', '/admin/products', { token: TOKEN })
  ok(
    'product list returns overrides + limits',
    list.status === 200 && list.json.limits.max === 99999 && list.json.prices.aether === 249,
    JSON.stringify(list.json?.prices?.aether),
  )
  const patch = await call('PATCH', '/admin/products/aether', { body: { price: 199, download: 'https://dl.qalb.store/aether.zip' }, token: TOKEN })
  ok('price edit persists to the price table', patch.json?.prices?.aether === 199, JSON.stringify(patch.json?.prices?.aether))
  const rejected = await call('PATCH', '/admin/products/aether', { body: { price: -3, download: 'javascript:alert(1)' }, token: TOKEN })
  ok(
    'bad price and non-http link are rejected with field errors',
    rejected.status === 400 && rejected.json.errors.price && rejected.json.errors.download,
    JSON.stringify(rejected.json),
  )
  const injected = await call('PATCH', '/admin/products/aether', { body: { price: 150, __proto__: 1, id: 'hacked', type: 'x' }, token: TOKEN })
  const afterInject = JSON.parse(readFileSync(join(DATA, 'products.json'), 'utf8'))
  ok(
    'unknown fields never reach the store',
    injected.status === 200 && afterInject.aether.price === 150 && !('id' in afterInject.aether),
    JSON.stringify(afterInject.aether),
  )

  /* --- the storefront/server price coupling, end to end --- */
  const stale = await call('POST', '/orders', { body: { email: 'a@b.co', name: 'A', total: 249, lines: [{ id: 'aether', qty: 1 }] }, header: false })
  ok(
    'an order priced at the OLD price is refused',
    stale.status === 400 && /total mismatch/.test(stale.json?.error || ''),
    JSON.stringify(stale.json),
  )
  const fresh = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 150, subtotal: 150, lines: [{ id: 'aether', qty: 1 }] },
    header: false,
  })
  ok('the NEW price is what a buyer pays', fresh.status === 201 && fresh.json.total === 150, JSON.stringify(fresh.json?.total))
  const cat = await call('GET', '/catalog', { header: false })
  ok(
    'public /catalog hands the override to the storefront',
    cat.json?.overrides?.aether?.download === 'https://dl.qalb.store/aether.zip',
    JSON.stringify(cat.json?.overrides?.aether),
  )

  /* --- hide / restore --- */
  const hide = await call('DELETE', '/admin/products/nova', { token: TOKEN })
  const catHidden = await call('GET', '/catalog', { header: false })
  ok(
    'hiding a product removes it from the buyable price table',
    hide.json?.hidden === true && !('nova' in catHidden.json.prices) && catHidden.json.overrides.nova.published === false,
    JSON.stringify(catHidden.json.prices?.nova),
  )
  const hiddenBuy = await call('POST', '/orders', { body: { email: 'a@b.co', name: 'A', total: 89, lines: [{ id: 'nova', qty: 1 }] }, header: false })
  ok(
    'a hidden product cannot be ordered',
    hiddenBuy.status === 400 && /unknown template/.test(hiddenBuy.json?.error || ''),
    JSON.stringify(hiddenBuy.json),
  )
  const restore = await call('POST', '/admin/products/nova/restore', { token: TOKEN })
  const catBack = await call('GET', '/catalog', { header: false })
  ok(
    'restore puts the base price back',
    restore.status === 200 && catBack.json.prices.nova === 89 && !('nova' in catBack.json.overrides),
    JSON.stringify(catBack.json.prices?.nova),
  )

  /* --- new custom product --- */
  const created = await call('POST', '/admin/products', {
    body: { id: 'qalb-test', type: 'cv', price: 75, nameAr: 'منتج تجريبي', nameEn: 'Test product', clone: 'novacv' },
    token: TOKEN,
  })
  const catCreated = await call('GET', '/catalog', { header: false })
  ok(
    'a new product becomes buyable through the same table',
    created.status === 201 && catCreated.json.prices['qalb-test'] === 75,
    JSON.stringify(created.json),
  )
  const dup = await call('POST', '/admin/products', { body: { id: 'aether', type: 'cv', price: 10 }, token: TOKEN })
  ok('an id that already exists is refused', dup.status === 409 && dup.json.errors.id === 'exists', JSON.stringify(dup.json))
  const badId = await call('POST', '/admin/products', { body: { id: 'Bad ID!', type: 'cv', price: 10 }, token: TOKEN })
  ok('an unsafe slug is refused', badId.status === 400 && badId.json.errors.id === 'id', JSON.stringify(badId.json))
  const rmCustom = await call('DELETE', '/admin/products/qalb-test', { token: TOKEN })
  ok(
    'deleting a custom product erases it (not just hides)',
    rmCustom.json?.removed === true && !('qalb-test' in (await call('GET', '/catalog', { header: false })).json.overrides),
    JSON.stringify(rmCustom.json),
  )

  /* --- users --- */
  const created2 = await call('POST', '/admin/users', {
    body: { name: 'Nouf', email: 'nouf@qalb.store', password: 'second-admin-99', role: 'admin' },
    token: TOKEN,
  })
  ok(
    'a second admin can be added',
    created2.status === 201 && created2.json.users.some((u) => u.email === 'nouf@qalb.store'),
    JSON.stringify(created2.json),
  )
  ok('stored users never expose the password hash', !/pass|salt/.test(JSON.stringify(created2.json.users)), JSON.stringify(created2.json.users))
  const weak = await call('POST', '/admin/users', { body: { name: 'X', email: 'x@y.co', password: 'short' }, token: TOKEN })
  ok('a short password is refused', weak.status === 400 && weak.json.errors.password === 'length', JSON.stringify(weak.json))
  const dupe = await call('POST', '/admin/users', { body: { name: 'Nouf', email: 'nouf@qalb.store', password: 'another-pass-12' }, token: TOKEN })
  ok('duplicate e-mail is refused', dupe.json?.errors?.email === 'exists', JSON.stringify(dupe.json))
  const adminTok = (await call('POST', '/admin/login', { body: { email: 'nouf@qalb.store', password: 'second-admin-99' }, header: false })).json.token
  const noufDeletesOwner = await call('DELETE', '/admin/users/owner', { token: adminTok })
  ok('deleting the last owner is refused', noufDeletesOwner.status === 409, JSON.stringify(noufDeletesOwner.json))
  const selfDelete = await call('DELETE', '/admin/users/owner', { token: TOKEN })
  ok(
    'you cannot delete the account you are using',
    selfDelete.status === 409 && /signed in/.test(selfDelete.json?.error || ''),
    JSON.stringify(selfDelete.json),
  )
  const noufPromotes = await call('POST', '/admin/users', {
    body: { name: 'Salma', email: 'salma@qalb.store', password: 'third-pass-123', role: 'owner' },
    token: adminTok,
  })
  ok(
    'only an owner may create an owner (admin gets role=admin)',
    noufPromotes.json.users.find((u) => u.email === 'salma@qalb.store').role === 'admin',
    JSON.stringify(noufPromotes.json.users),
  )
  const resetByPeer = await call('POST', '/admin/users/owner/password', { body: { password: 'not-my-call-12' }, token: adminTok })
  ok('an admin cannot reset someone else’s password', resetByPeer.status === 403, resetByPeer.status)
  const resetSelf = await call('POST', '/admin/users/nouf/password', { body: { password: 'nouf-new-pass-1' }, token: TOKEN })
  ok('the owner can reset an admin password', resetSelf.status === 200, resetSelf.status)
  const noufOld = await call('POST', '/admin/login', { body: { email: 'nouf@qalb.store', password: 'second-admin-99' }, header: false })
  const noufNew = await call('POST', '/admin/login', { body: { email: 'nouf@qalb.store', password: 'nouf-new-pass-1' }, header: false })
  ok('after a reset the old password stops working', noufOld.status === 401 && noufNew.status === 200, `${noufOld.status}/${noufNew.status}`)
  const delNouf = await call('DELETE', '/admin/users/nouf', { token: TOKEN })
  ok(
    'an admin can be removed',
    delNouf.status === 200 && !delNouf.json.users.some((u) => u.email === 'nouf@qalb.store'),
    JSON.stringify(delNouf.json),
  )

  /* --- finance --- */
  const st = await call('GET', '/admin/stats', { token: TOKEN })
  const s = st.json
  ok(
    'stats: revenue equals the paid order total',
    s.revenue === 150 && s.orders === 1 && s.buyers === 1,
    JSON.stringify({ r: s.revenue, o: s.orders, b: s.buyers }),
  )
  ok('stats: VAT extracted from a VAT-inclusive total (15%)', Math.abs(s.vat - (150 - 150 / 1.15)) < 0.02, s.vat)
  ok(
    'stats: today is in the 30-day series with the sale',
    s.series.length === 30 && s.series.at(-1).total === 150 && s.series.at(-1).orders === 1,
    JSON.stringify(s.series.at(-1)),
  )
  ok(
    'stats: top products carry qty + attributed revenue + a real name',
    s.top[0]?.id === 'aether' && s.top[0].qty === 1 && s.top[0].revenue === 150 && typeof s.top[0].name === 'string' && s.top[0].name.length > 1,
    JSON.stringify(s.top[0]),
  )
  /* a reprice after a sale must not rewrite what the sale earned */
  const again = await call('PATCH', '/admin/products/aether', { token: TOKEN, body: { price: '199' } })
  ok('repricing an already-sold product is accepted', again.status === 200 && again.json.prices?.aether === 199, String(again.json.prices?.aether))
  const st2 = await call('GET', '/admin/stats', { token: TOKEN })
  ok(
    'the money already collected stays as paid, not as priced today',
    st2.json.revenue === 150 && st2.json.top[0].revenue === 150,
    JSON.stringify({ rev: st2.json.revenue, top: st2.json.top[0].revenue }),
  )
  ok('the same row still shows the current price next to it', st2.json.top[0].price === 199, String(st2.json.top[0].price))
  const ords = await call('GET', '/admin/orders?limit=5', { token: TOKEN })
  ok(
    'the stored order line carries the price that was charged',
    ords.json.orders?.[0]?.lines?.[0]?.price === 150 && ords.json.orders?.[0]?.lines?.[0]?.id === 'aether',
    JSON.stringify(ords.json.orders?.[0]?.lines?.[0]),
  )
  const csv = await call('GET', '/admin/export.csv', { token: TOKEN, raw: true })
  ok(
    'CSV export is real csv with the order inside',
    csv.status === 200 &&
      csv.text.startsWith('id,date,name') &&
      csv.text.includes('a@b.co') &&
      /qalb-orders-\d{4}-\d{2}-\d{2}\.csv/.test(csv.headers.get('content-disposition')),
    csv.text.slice(0, 60),
  )

  /* --- throttling --- */
  for (let i = 0; i < 6; i++) await call('POST', '/admin/login', { body: { password: 'nope-nope-nope-1' }, header: false })
  const limited = await call('POST', '/admin/login', { body: { password: PW }, header: false })
  ok('repeated failures lock the endpoint with 429 + retryAfter', limited.status === 429 && limited.json.retryAfter > 0, JSON.stringify(limited.json))
} catch (e) {
  fails.push('threw: ' + e.message)
  console.log(e)
} finally {
  srv.kill('SIGKILL')
  rmSync(DATA, { recursive: true, force: true }) // the temp dir is ours; server/ was never touched
  console.log(`\n${pass} passed, ${fails.length} failed`)
  if (fails.length) console.log('failed:\n - ' + fails.join('\n - '))
  if (log) console.log('\n--- server log ---\n' + log.trim())
  process.exit(fails.length ? 1 : 0)
}
