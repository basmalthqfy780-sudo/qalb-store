/**
 * فحص تكامل حقيقي لطبقة الإدارة: يشغّل server/worker.js كعملية فعلية ويتكلم
 * معها بـ HTTP (لا محاكاة) داخل مجلد بيانات مؤقت — لا يمسّ server/orders.jsonl
 * ولا admins.json ولا products.json عندك إطلاقًا، ثم يحذف المؤقت.
 *   node tests/admin-api.mjs        (أو npm test — يشغّله بعد فحص الواجهة)
 * يغطّي: المصادقة والتجزئة، الحدود (آخر مالك/الحذف الذاتي/ترقية الدور)،
 * خانق المحاولات، حارس CSRF، وتنقية الحقول — وأن سعر المنتج المخفيّ أو المعدَّل
 * يسري فعلًا على /orders، لا على الواجهة وحدها — وتسلّم الملفات نفسه: رابط موقّع
 * لكل طلب، مرة واحدة، بلا ملف ثابت في public/، وحزمة فيها LICENSE.txt باسم المشتري.
 */
import { spawn } from 'node:child_process'
import nodeHttp from 'node:http'
import { existsSync, readdirSync, rmSync, readFileSync, mkdtempSync, writeFileSync, appendFileSync, chmodSync, statSync } from 'node:fs'
import { zipNames, zipRead } from '../src/data/zip.js'
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

// Then we dirty it the way a real host is dirty: the buyer ledgers already exist and
// predate any 0600 rule, so every user on the box could read them. The server has to
// repair that on boot, not merely get new files right.
for (const [name, body] of [
  ['orders.jsonl', ''],
  ['downloads.jsonl', ''],
  ['.admin-secret', 'a'.repeat(32) + '\n'],
  ['.download-secret', 'b'.repeat(32) + '\n'],
  ['sites.json', '{}'],
]) {
  writeFileSync(join(DATA, name), body, { encoding: 'utf8', mode: 0o644 })
  chmodSync(join(DATA, name), 0o644)
}
const modeOf = (f) => statSync(join(DATA, f)).mode & 0o777 // بتّات الوضع وحدها، بلا نوع الملف
const shown = (list) => list.map((f) => `${f}=${modeOf(f).toString(8)}`).join(' ')

const srv = spawn(process.execPath, ['server/worker.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    ADMIN_PASSWORD: PW,
    ADMIN_EMAIL: 'boss@qalb.store',
    ADMIN_NAME: 'Boss',
    QALB_DATA_DIR: DATA,
    DOWNLOAD_TTL: '300',
    DOWNLOAD_MAX: '60',
  },
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

const ORG_RE = /^QALB-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/

const NL = '\n'
const call = async (method, path, { body, token, header = true, raw = false, headers = {} } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(header ? { 'x-qalb-admin': '1' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers, // مفتاح الحساب مثلًا — يُضاف بلا أن يلغي ما قبله
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
  ok('the admin file lands private: password hashes are not world-readable', modeOf('admins.json') === 0o600, modeOf('admins.json').toString(8))
  const SEALED = ['orders.jsonl', 'downloads.jsonl', '.admin-secret', '.download-secret', 'sites.json']
  ok(
    'boot re-seals every pre-existing buyer file to 0600',
    SEALED.every((f) => modeOf(f) === 0o600),
    shown(SEALED),
  )

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
  ok('appending an order does not loosen the ledger back to world-readable', modeOf('orders.jsonl') === 0o600, modeOf('orders.jsonl').toString(8))
  ok('that private file really is the one holding buyer data', readFileSync(join(DATA, 'orders.jsonl'), 'utf8').includes('"email":"a@b.co"'))
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

  /* --- v1.5.0 · الإضافات: يُسعّرها الخادم من الجدول لا من المتصفح --- */
  const reportOnly = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 29, lines: [], addons: [{ id: 'ats-report', price: 29 }] },
    header: false,
  })
  ok(
    'an add-on-only order (the paid ATS report) is accepted',
    reportOnly.status === 201 && reportOnly.json.total === 29 && reportOnly.json.addons?.[0]?.price === 29,
    JSON.stringify({ st: reportOnly.status, total: reportOnly.json?.total, addons: reportOnly.json?.addons }),
  )
  ok('and the empty template list stays empty, the add-on is not smuggled into lines', (reportOnly.json.lines || []).length === 0)

  const tampered = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 49, lines: [{ id: 'nova', qty: 1 }], addons: [{ id: 'ats-report', price: 1 }] },
    header: false,
  })
  ok(
    'a price said to the browser does not buy the add-on at it',
    tampered.status === 400 && /total mismatch/.test(tampered.json?.error || ''),
    JSON.stringify(tampered.json),
  )
  const honest = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 89 + 29, lines: [{ id: 'nova', qty: 1 }], addons: [{ id: 'ats-report', price: 1 }] },
    header: false,
  })
  ok(
    'the server re-stamps the add-on at the table price whatever was sent',
    honest.status === 201 && honest.json.addons?.[0]?.price === 29 && honest.json.total === 118,
    JSON.stringify({ st: honest.status, addons: honest.json?.addons, total: honest.json?.total }),
  )
  const ghost = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 89, lines: [{ id: 'nova', qty: 1 }], addons: [{ id: 'free-money', price: 0 }] },
    header: false,
  })
  ok(
    'an unknown add-on is refused like an unknown template',
    ghost.status === 400 && /unknown add-on/.test(ghost.json?.error || ''),
    JSON.stringify(ghost.json),
  )

  /* --- v1.5.0 · الكوبون: نسبته من الجدول لا من العميل --- */
  const lying = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 89 * 0.1, coupon: 'COACH30', couponPct: 90, lines: [{ id: 'nova', qty: 1 }] },
    header: false,
  })
  ok(
    'a real code with an invented percentage is not honoured',
    lying.status === 400 && /total mismatch/.test(lying.json?.error || ''),
    JSON.stringify(lying.json),
  )
  const coach = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 89 * 0.7, coupon: 'COACH30', couponPct: 30, lines: [{ id: 'nova', qty: 1 }] },
    header: false,
  })
  ok(
    'a coach coupon takes its table percentage and is stamped on the order',
    coach.status === 201 && coach.json.total === 62.3 && /COACH30 30%/.test(coach.json.coupon || ''),
    JSON.stringify({ st: coach.status, total: coach.json?.total, coupon: coach.json?.coupon }),
  )
  const fake = await call('POST', '/orders', {
    body: { email: 'a@b.co', name: 'A', total: 89, coupon: 'FRIEND99', couponPct: 0, lines: [{ id: 'nova', qty: 1 }] },
    header: false,
  })
  ok(
    'a coupon the store never issued is refused by name',
    fake.status === 400 && /unknown coupon/.test(fake.json?.error || ''),
    JSON.stringify(fake.json),
  )

  /* --- التسليم المحمي: رابط لكل طلب، موقّع وأحادي الاستعمال --- */
  const dlGet = async (path) => {
    const res = await fetch(BASE + path, { redirect: 'manual' })
    return {
      status: res.status,
      loc: res.headers.get('location'),
      type: res.headers.get('content-type'),
      disp: res.headers.get('content-disposition'),
      cc: res.headers.get('cache-control'),
      nosniff: res.headers.get('x-content-type-options'),
      buf: Buffer.from(await res.arrayBuffer()),
    }
  }
  const dlAnon = await dlGet('/download/nova')
  ok(
    'a bare /download/<id> is a protected endpoint, never a dead link',
    dlAnon.status === 401 && /authentication required/.test(dlAnon.buf.toString()) && /للمشتري/.test(dlAnon.buf.toString()),
    dlAnon.status + ' ' + dlAnon.buf.toString().slice(0, 60),
  )
  const order = fresh.json // aether عند سعر اللوحة، مع رابط استضافه البائع في الكتالوج
  const badKey = await dlGet(`/download/aether?order=${order.id}&key=ZZZZ-ZZZZ-ZZZZ-ZZZZ`)
  ok('a wrong licence key is refused with 403', badKey.status === 403, badKey.status)
  const wrongOrder = await dlGet('/download/aether?order=QALB-NOPE-0000&key=' + order.key)
  ok('an unknown order id is refused with 404', wrongOrder.status === 404, wrongOrder.status)
  const notMine = await dlGet(`/download/atlas?order=${order.id}&key=${order.key}`)
  ok('a template outside that order cannot be pulled', notMine.status === 403 && /not in this order/.test(notMine.buf.toString()), notMine.status)
  const delegated = await dlGet(`/download/aether?order=${order.id}&key=${order.key}`)
  ok(
    'a seller-hosted link is delegated only after the check passes',
    delegated.status === 302 && delegated.loc === 'https://dl.qalb.store/aether.zip',
    delegated.loc,
  )
  const buy2 = await call('POST', '/orders', {
    body: { email: 'cv@qalb.store', name: 'سارة', total: 89, subtotal: 89, lines: [{ id: 'nova', qty: 1 }] },
    header: false,
  })
  const o2 = buy2.json
  const dlGrant = await dlGet(`/download/nova?order=${o2.id}&key=${o2.key}`)
  ok(
    'a valid order gets a short signed token, not the file itself',
    dlGrant.status === 302 && /^\/dl\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(dlGrant.loc || ''),
    dlGrant.status + ' ' + dlGrant.loc,
  )
  const dlFirst = await dlGet(dlGrant.loc)
  ok(
    'the token streams the package as an attachment',
    dlFirst.status === 200 &&
      dlFirst.type === 'application/zip' &&
      dlFirst.nosniff === 'nosniff' &&
      dlFirst.cc === 'no-store' &&
      /^attachment; filename="qalb-nova-/.test(dlFirst.disp || '') &&
      dlFirst.buf.length > 5000,
    `${dlFirst.status} ${dlFirst.type} ${dlFirst.buf.length}B ${dlFirst.disp}`,
  )
  const dlNames = zipNames(new Uint8Array(dlFirst.buf))
  const dlLic = dlFirst.buf.toString('latin1')
  ok(
    'the package ships the buyer-tied licence and watermarks',
    dlNames.includes('LICENSE.txt') &&
      dlNames.includes('resume.html') &&
      dlNames.includes('scripts/check-ats.mjs') &&
      dlLic.includes(o2.id) &&
      dlLic.includes(o2.key) &&
      dlLic.includes('cv@qalb.store'),
    dlNames.slice(0, 4).join(','),
  )
  const dlSecond = await dlGet(dlGrant.loc)
  ok(
    'the same link cannot be used twice (single-use nonce)',
    dlSecond.status === 403 && /redeemed|expired/.test(dlSecond.buf.toString()),
    dlSecond.status,
  )
  const dlTamper = await dlGet(dlGrant.loc.slice(0, -6) + 'A'.repeat(6))
  ok('a tampered token fails the HMAC check', dlTamper.status === 403, dlTamper.status)
  const paidFirst = await call('POST', '/orders', {
    body: { email: 'x@qalb.store', name: 'X', total: 99, subtotal: 99, lines: [{ id: 'atlas', qty: 1 }] },
    header: false,
  })
  const hideAgain = await call('DELETE', '/admin/products/atlas', { token: TOKEN })
  const orphan = await dlGet(`/download/atlas?order=${paidFirst.json.id}&key=${paidFirst.json.key}`)
  ok(
    'a product hidden mid-flight stops delivering',
    paidFirst.status === 201 && hideAgain.status === 200 && orphan.status === 404 && /unpublished/.test(orphan.buf.toString()),
    `${paidFirst.status}/${hideAgain.status} → ${orphan.status} ${orphan.buf.toString().slice(0, 60)}`,
  )
  await call('POST', '/admin/products/atlas/restore', { token: TOKEN })
  // السعر يُقرأ من جدول الأسعار الحالي، لا من رقم مكتوب يدويًا — يتبع الفحص اللوحة دائمًا
  const live = (await call('GET', '/catalog', { header: false })).json.prices
  const two = Math.round((live.nova + live.aether) * 100) / 100
  const twoLines = await call('POST', '/orders', {
    body: {
      email: 'both@qalb.store',
      name: 'B',
      total: two,
      subtotal: two,
      lines: [
        { id: 'nova', qty: 1 },
        { id: 'aether', qty: 1 },
      ],
    },
    header: false,
  })
  const allGrant = await dlGet(`/download-all?order=${twoLines.json.id}&key=${twoLines.json.key}`)
  const allZip = allGrant.loc ? await dlGet(allGrant.loc) : { status: 0, buf: Buffer.from('') }
  const allNames = allZip.status === 200 ? zipNames(new Uint8Array(allZip.buf)) : []
  ok(
    'one click pulls every package in the order, each in its own folder',
    allGrant.status === 302 &&
      allZip.status === 200 &&
      allNames.some((n) => n.startsWith('nova/resume.html')) &&
      allNames.includes('aether/SELLER-LINK.txt'),
    `order=${twoLines.status} ${JSON.stringify(twoLines.json).slice(0, 70)} grant=${allGrant.status}/${allZip.status} ${allNames.slice(0, 3).join(',')}`,
  )
  ok(
    'nothing is ever written into public/ or the data dir as a static file',
    readdirSync(DATA).filter((f) => f.endsWith('.zip')).length === 0 &&
      !existsSync('public/qalb-nova-' + o2.id + '.zip') &&
      existsSync(join(DATA, 'downloads.jsonl')),
    readdirSync(DATA).join(','),
  )
  /* --- كل قالب في الكتالوج مربوط بتسليمه من نفسه: لا أحد يكتب 15 رابطًا باليد --- */
  {
    const ids = Object.keys(live)
    const sum = Math.round(ids.reduce((a, id) => a + live[id], 0) * 100) / 100
    const whole = await call('POST', '/orders', {
      body: {
        email: 'all-catalog@qalb.store',
        name: 'نورة',
        total: sum,
        subtotal: sum,
        lines: ids.map((id) => ({ id, qty: 1 })),
      },
      header: false,
    })
    let grants = 0
    let zips = 0
    let seller = 0
    for (const id of ids) {
      const g = await dlGet(`/download/${id}?order=${whole.json?.id}&key=${whole.json?.key}`)
      if (g.status !== 302 || !g.loc) continue
      grants++
      // رابط يضيفه البائع من عنده يُمرَّر كما هو؛ الباقي حزمة تُولَّد وتُقاس
      if (/^https?:\/\//i.test(g.loc)) seller++
      else {
        const d = await dlGet(g.loc)
        if (d.status === 200 && d.type === 'application/zip' && d.buf.length > 900 && d.buf.subarray(0, 2).toString() === 'PK') zips++
      }
    }
    ok(
      'every catalogue product grants its own protected download',
      whole.status === 201 && grants === ids.length && ids.length >= 15,
      `order=${whole.status} grants=${grants}/${ids.length}`,
    )
    ok(
      'each protected path is real zip bytes, and only the hand-added URL is passed through',
      zips + seller === ids.length && seller === 1,
      `zips=${zips} seller=${seller} of ${ids.length}`,
    )
  }

  /* --- تخصيص المشتّر: ما يُكتب عند الدفع يجب أن يكون داخل الملفات المُسلَّمة --- */
  {
    const typed = {
      on: true,
      name: 'نورة الحربي',
      role: 'مديرة <b onmouseover=alert(1)>منتج</b>',
      email: 'noura@studio.sa',
      phone: '+966 55 123 4567',
      website: 'https://noura.studio.sa/work?x=1',
      bio: 'أبني واجهات للمنتجات المالية ' + 'ز'.repeat(900),
    }
    const buy = await call('POST', '/orders', {
      body: {
        email: 'noura@studio.sa',
        name: 'نورة الحربي',
        total: live.nova,
        subtotal: live.nova,
        lines: [{ id: 'nova', qty: 1 }],
        personalize: typed,
      },
      header: false,
    })
    const po = buy.json || {}
    ok(
      'an order accepts the optional personalisation',
      buy.status === 201 && !!po.personalize && po.personalize.name.length <= 80,
      JSON.stringify(po.personalize || {}).slice(0, 90),
    )
    ok(
      'a field carrying markup is dropped, and the clean ones still go in',
      !po.personalize.role && po.personalize.name === 'نورة الحربي' && /مصممة|نورة/.test(JSON.stringify(po.personalize)),
      JSON.stringify(po.personalize),
    )
    ok(
      'the link becomes a host and the blurb one capped line',
      po.personalize.website === 'noura.studio.sa' && po.personalize.bio.length === 700,
      `${po.personalize.website}/${po.personalize.bio.length}`,
    )
    const again = await call('GET', '/orders/' + po.id, { header: false })
    ok('it is stored with the order, so a second download is identical', JSON.stringify(again.json.personalize) === JSON.stringify(po.personalize))
    const pg = await dlGet(`/download/nova?order=${po.id}&key=${po.key}`)
    const pd = await dlGet(pg.loc)
    const pbuf = new Uint8Array(pd.buf)
    const prof = JSON.parse(zipRead(pbuf, 'content/profile.json'))
    const res = zipRead(pbuf, 'resume.html')
    ok(
      'the delivered profile.json prints the buyer, not the demo',
      prof.name.ar === 'نورة الحربي' && prof.name.en === prof.name.ar && prof.qalb.personalized === true,
      JSON.stringify(prof.name),
    )
    ok(
      'the CV shows the name, the phone and the buyer’s own link',
      /نورة الحربي/.test(res) && /\+966 55 123 4567/.test(res) && /noura\.studio\.sa/.test(res),
    )
    ok(
      'the rejected field never reaches the delivered file at all',
      (res.match(/<script/g) || []).length === 2 && !/alert\(1\)/.test(res) && !/onmouseover/.test(res),
      (res.match(/<script[^>]*>/g) || []).join(','),
    )
    ok('and the licence still names the licensee', zipRead(pbuf, 'LICENSE.txt').includes('نورة الحربي'))
    const plain = await call('POST', '/orders', {
      body: { email: 'plain@qalb.store', name: 'عادي', total: live.nova, subtotal: live.nova, lines: [{ id: 'nova', qty: 1 }] },
      header: false,
    })
    const pg2 = await dlGet(`/download/nova?order=${plain.json.id}&key=${plain.json.key}`)
    const pd2 = await dlGet(pg2.loc)
    const prof2 = JSON.parse(zipRead(new Uint8Array(pd2.buf), 'content/profile.json'))
    ok(
      'an order that skipped the fields ships the demo copy untouched',
      plain.json.personalize === null && prof2.name.ar === 'سارة العتيبي' && !prof2.qalb.personalized,
      JSON.stringify(prof2.name),
    )
    const csv = await call('GET', '/admin/export.csv', { token: TOKEN, raw: true })
    const mine = csv.text.split('\n').find((l) => l.includes(po.id)) || ''
    ok(
      'the export flags a personalised order without carrying its text',
      /personalized/.test(csv.text.split('\n')[0]) && /"?yes"?\s*$/.test(mine) && !csv.text.includes('أبني واجهات'),
      mine.slice(-40),
    )
  }

  const dlLedger = readFileSync(join(DATA, 'downloads.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
  ok(
    'every grant, delivery and rejection is logged with the order id',
    dlLedger.some((r) => r.kind === 'deliver' && r.order === o2.id) &&
      dlLedger.some((r) => r.kind === 'reject' && r.why === 'licence key mismatch') &&
      dlLedger.every((r) => r.at),
    dlLedger
      .slice(0, 2)
      .map((r) => r.kind)
      .join(','),
  )
  const dlHead = await fetch(`${BASE}/health`)
  const dlHealth = await dlHead.json()
  ok(
    'health reports the delivery layer and its TTL',
    dlHealth.deliver?.ttl === 300 && dlHealth.deliver?.perIp === 60,
    JSON.stringify(dlHealth.deliver),
  )
  for (let i = 0; i < 60; i++) await dlGet('/download/nova')
  const burst = await dlGet(`/download/nova?order=${o2.id}&key=${o2.key}`)
  ok('a flooding address gets throttled with 429 on the delivery routes too', burst.status === 429, burst.status)

  /* --- سطر تالف واحد لا يُسقط لوحة الإدارة --- */
  appendFileSync(join(DATA, 'orders.jsonl'), 'this line was cut off mid-writ', 'utf8')
  const afterGarbage = await call('GET', '/admin/orders?limit=50', { token: TOKEN })
  ok(
    'an unreadable ledger line is skipped, and the good rows survive',
    afterGarbage.status === 200 && afterGarbage.json.orders.some((o) => o.id === fresh.json.id),
    JSON.stringify({ status: afterGarbage.status, n: afterGarbage.json.orders?.length }),
  )
  ok(
    'the server names the broken line in its log rather than failing quietly',
    /unreadable orders\.jsonl line \d+ skipped/.test(log),
    log
      .split('\n')
      .filter((l) => /unreadable/.test(l))
      .join('|')
      .slice(0, 90),
  )
  ok('the ledger keeps 0600 after a raw append too', modeOf('orders.jsonl') === 0o600, modeOf('orders.jsonl').toString(8))

  /* --- الاستضافة: قالب يصير صفحة حيّة، والخطة مفتاحًا يُطفئ فعلًا --- */
  {
    // fetch يتجاهل Host المخصوص (undici يشتقه من URL) — فننزِل إلى node:http للفحصين المبنيين على المضيف
    const hostGet = (host) =>
      new Promise((done, fail) => {
        const r = nodeHttp.request({ port: PORT, path: '/', method: 'GET', headers: { host } }, (res) => {
          let body2 = ''
          res.on('data', (d) => (body2 += d))
          res.on('end', () => done(body2))
        })
        r.on('error', fail)
        r.end()
      })
    const siteCall = async (method, path, body, key) => {
      const res = await fetch(BASE + path, {
        method,
        headers: { 'content-type': 'application/json', ...(key ? { 'x-qalb-site': key } : {}) },
        body: body == null ? undefined : JSON.stringify(body),
      })
      const text = await res.text()
      let json = null
      try {
        json = JSON.parse(text)
      } catch {
        /* HTML/نصّ: نتركه كما هو */
      }
      return { status: res.status, json, text, headers: res.headers }
    }
    const noMail = await siteCall('POST', '/sites', { template: 'aether' })
    ok(
      'hosting: no e-mail means no site, and it says which is missing',
      noMail.status === 400 && /email/.test(noMail.json.error),
      JSON.stringify(noMail.json),
    )
    const bogus = await siteCall('POST', '/sites', { email: 'a@b.co', template: 'not-a-template' })
    ok(
      'hosting: an unknown template is refused, not swapped for the first one',
      bogus.status === 400 && /template/.test(bogus.json.error),
      JSON.stringify(bogus.json),
    )

    const made = await siteCall('POST', '/sites', {
      email: 'noura@studio.sa',
      template: 'aether',
      site: { name: 'نورة الحربي', role: 'مصممة واجهات', city: 'جدة', bio: 'ست سنوات في واجهات المنتجات المالية', lang: 'ar' },
    })
    const SLUG = made.json?.slug
    const KEY = made.json?.editKey
    ok(
      'hosting: a new site is a live free one',
      made.status === 201 && made.json.plan === 'free' && made.json.status === 'live',
      JSON.stringify(made.json && { s: made.status, p: made.json.plan }),
    )
    ok(
      'hosting: an Arabic name becomes a latin subdomain we can actually serve',
      /^[a-z0-9][a-z0-9-]{1,31}$/.test(SLUG || '') && !/[\u0600-\u06ff]/.test(SLUG || '') && made.json.url === `https://${SLUG}.qalb.store`,
      `${SLUG} · ${made.json && made.json.url}`,
    )
    ok('hosting: the edit key is shown once and the notice says so', !!KEY && /لا يُستعاد/.test(made.json.notice || ''), KEY && KEY.length)
    ok(
      'hosting: the ceiling is enforced by the server, and counted back to the buyer',
      made.json.quota.max === 10 && made.json.quota.left === 10 && made.json.quota.used === 0,
      JSON.stringify(made.json.quota),
    )
    const inj = await siteCall('POST', '/sites', {
      email: 'inj@studio.sa',
      template: 'aether',
      site: { name: '<script>alert(1)</script>', role: 'سليمة' },
    })
    ok(
      'hosting: a name carrying markup is refused and the buyer is told which field',
      inj.status === 201 && Array.isArray(inj.json.dropped) && inj.json.dropped.includes('name'),
      JSON.stringify(inj.json),
    )
    ok('hosting: the good field survives the refused one, and the tag is nowhere', inj.json.slug && !inj.text.includes('alert(1)'), inj.json.slug)
    const pend = await siteCall('PATCH', `/sites/${inj.json.slug}`, { planPending: true }, inj.json.editKey)
    ok(
      'hosting: asking for the paid plan records a request and hands out no plan',
      pend.status === 200 && pend.json.planPending === true && pend.json.plan === 'free',
      JSON.stringify({ pp: pend.json.planPending, p: pend.json.plan }),
    )
    const hPend = await call('GET', '/health', { header: false })
    ok('health counts the upgrades that wait for a human', hPend.json.hosting?.pending === 1, JSON.stringify(hPend.json.hosting))
    const pendNoKey = await siteCall('PATCH', `/sites/${inj.json.slug}`, { planPending: true })
    ok('and a pending request is not something anyone can file', pendNoKey.status === 401, pendNoKey.status)

    const pub1 = await siteCall('GET', `/sites/${SLUG}`)
    ok(
      'hosting: the public view of a site carries no edit key',
      pub1.status === 200 && !('editKey' in pub1.json) && !('key' in pub1.json),
      JSON.stringify(Object.keys(pub1.json)),
    )
    ok('hosting: nor does it leak the buyer’s words', !('site' in pub1.json) && !pub1.text.includes('نورة الحربي'), pub1.text.slice(0, 60))
    const own1 = await siteCall('GET', `/sites/${SLUG}`, null, KEY)
    ok('with the key you get your own e-mail back', own1.status === 200 && own1.json.editKey === KEY && own1.json.email === 'noura@studio.sa')
    ok(
      'and your own fields, so the editor edits what is stored',
      own1.json.site?.name === 'نورة الحربي' && own1.json.site?.city === 'جدة',
      JSON.stringify(own1.json.site),
    )
    ok(
      'without the key the same record exposes neither fields nor key',
      !('site' in pub1.json) && !('editKey' in pub1.json),
      JSON.stringify(Object.keys(pub1.json)),
    )

    const page = await siteCall('GET', `/s/${SLUG}`)
    ok(
      'hosting: the live page is HTML with the buyer’s name printed in it',
      page.status === 200 && /text\/html/.test(page.headers.get('content-type')) && page.text.includes('نورة الحربي'),
      `${page.status}/${page.text.length}`,
    )
    ok('hosting: the role and the city are there too', page.text.includes('مصممة واجهات') && page.text.includes('جدة'))
    ok('hosting: the free plan wears our bar', /class="qalb-brand"/.test(page.text) && page.text.includes('href="https://qalb.store"'))
    ok('hosting: the served page is stamped with slug and plan', page.headers.get('x-qalb-site') === `${SLUG}/free`, page.headers.get('x-qalb-site'))
    const css1 = await siteCall('GET', `/s/${SLUG}/styles.css`)
    ok(
      'hosting: the stylesheet is css, not a fallback page',
      css1.status === 200 && /text\/css/.test(css1.headers.get('content-type')) && /plan=free/.test(css1.text),
      css1.headers.get('content-type'),
    )
    const hostHtml = await hostGet(`${SLUG}.qalb.store`)
    ok('hosting: the subdomain host serves the very same bytes as /s/', hostHtml === page.text, `${hostHtml.length} vs ${page.text.length}`)
    const miss = await siteCall('GET', '/s/nobody-here')
    ok('hosting: an unknown subdomain 404s as json, not as the storefront', miss.status === 404 && miss.json.error === 'no such site')
    const sneak = await siteCall('GET', `/s/${SLUG}/orders.jsonl`)
    ok(
      'hosting: a path inside a site that we do not render is a 404, not a file read',
      sneak.status === 404 && !/QALB-/.test(sneak.text),
      sneak.text.slice(0, 60),
    )

    const noKey = await siteCall('PATCH', `/sites/${SLUG}`, { site: { role: 'محاولة' } })
    ok('hosting: editing without the key is refused', noKey.status === 401 && /edit key/.test(noKey.json.error))
    let quotaOk = true
    let lastQ = null
    for (let i = 1; i <= 10; i++) {
      const r = await siteCall('PATCH', `/sites/${SLUG}`, { site: { role: `دور ${i}` } }, KEY)
      lastQ = r.json && r.json.quota
      if (r.status !== 200 || !lastQ || lastQ.left !== 10 - i) quotaOk = false
    }
    ok('hosting: ten edits on the free plan all go through, each one counted', quotaOk, JSON.stringify(lastQ))
    const over = await siteCall('PATCH', `/sites/${SLUG}`, { site: { role: 'دور 11' } }, KEY)
    ok(
      'hosting: the eleventh edit is refused with 429 and a sentence in Arabic',
      over.status === 429 && over.json.max === 10 && /انتهت تعديلات/.test(over.json.ar || '') && /resets next month/.test(over.json.en || ''),
      JSON.stringify(over.json).slice(0, 140),
    )
    const page2 = await siteCall('GET', `/s/${SLUG}`)
    ok(
      'hosting: the refused edit never reaches the page',
      page2.text.includes('دور 10') && !page2.text.includes('دور 11'),
      page2.text.includes('دور 11'),
    )
    const bigBody = await fetch(`${BASE}/sites/${SLUG}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-qalb-site': KEY },
      body: JSON.stringify({ site: { bio: 'س'.repeat(70 * 1024) } }),
    })
    ok('hosting: a body past the cap is refused before it is parsed', bigBody.status === 413, bigBody.status)

    const domFree = await siteCall('PATCH', `/sites/${SLUG}`, { domain: 'noura.sa' }, KEY)
    ok(
      'hosting: a custom domain on the free plan costs what the storefront says — 19 SAR',
      domFree.status === 402 && domFree.json.price === 19 && domFree.json.plan === 'free',
      JSON.stringify(domFree.json),
    )
    const selfUpgrade = await siteCall('PATCH', `/sites/${SLUG}`, { plan: 'pro' }, KEY)
    ok(
      'hosting: the browser cannot promote itself',
      selfUpgrade.status === 403 && /staff/.test(selfUpgrade.json.error),
      JSON.stringify(selfUpgrade.json),
    )
    const up = await call('PATCH', `/admin/sites/${SLUG}`, { body: { plan: 'pro' }, token: TOKEN })
    ok('hosting: staff promotion returns the new plan', up.status === 200 && up.json.plan === 'pro', JSON.stringify(up.json && up.json.plan))
    ok(
      'hosting: the dashboard gets the plan, not the buyer’s words or key',
      up.status === 200 && !('editKey' in up.json) && !('site' in up.json) && !up.text.includes('نورة الحربي'),
      JSON.stringify(Object.keys(up.json)),
    )
    const page3 = await siteCall('GET', `/s/${SLUG}`)
    ok(
      'hosting: paying really takes the bar off the page',
      page3.status === 200 && !/qalb-brand/.test(page3.text) && page3.text.includes('نورة الحربي'),
      page3.headers.get('x-qalb-site'),
    )
    ok('hosting: pro has no ceiling in its own quota block', up.json.quota.max === null && up.json.quota.left === null, JSON.stringify(up.json.quota))
    const domPro = await siteCall('PATCH', `/sites/${SLUG}`, { domain: 'Noura.SA/' }, KEY)
    ok(
      'hosting: on pro the domain is accepted and normalised to a bare host',
      domPro.status === 200 && domPro.json.domain === 'noura.sa',
      JSON.stringify(domPro.json.domain),
    )
    const injUp = await call('PATCH', `/admin/sites/${inj.json.slug}`, { body: { plan: 'pro' }, token: TOKEN }) // خطة تسمح بالنطاق، وإلا فالرفض يسبق التكرار
    const hFlip = await call('GET', '/health', { header: false })
    ok(
      'hosting: the staff flip turns the plan on and the waiting flag off at once',
      injUp.status === 200 && injUp.json.plan === 'pro' && injUp.json.planPending === false && hFlip.json.hosting?.pending === 0,
      JSON.stringify({ p: injUp.json.plan, pp: injUp.json.planPending, h: hFlip.json.hosting }),
    )
    const dupe = await siteCall('PATCH', `/sites/${inj.json.slug}`, { domain: 'noura.sa' }, inj.json.editKey)
    ok(
      'hosting: a plan that may pay still cannot take a domain someone holds',
      dupe.status === 409 && /already connected/.test(dupe.json.error),
      JSON.stringify(dupe.json),
    )
    const domPage = await hostGet('noura.sa')
    ok('hosting: the connected domain serves the owner’s page, not ours', domPage === page3.text, `${domPage.length} vs ${page3.text.length}`)
    const chk = await siteCall('POST', `/sites/${inj.json.slug}/check-domain`, {}, inj.json.editKey)
    ok(
      'hosting: without a connected domain the check refuses to pretend',
      chk.status === 400 && /no domain/.test(chk.json.error),
      JSON.stringify(chk.json),
    )
    const chk2 = await siteCall('POST', `/sites/${SLUG}/check-domain`, {}, KEY)
    ok(
      'hosting: the domain check is a real DNS lookup, and its answer matches its status',
      typeof chk2.json.ok === 'boolean' &&
        ((chk2.status === 200 && chk2.json.ok === true) || (chk2.status === 404 && chk2.json.ok === false) || chk2.status === 502) &&
        chk2.json.domain === 'noura.sa',
      JSON.stringify(chk2.json).slice(0, 150),
    )
    const back = await siteCall('POST', `/sites/${SLUG}/revert`, {}, KEY)
    const backPage = await siteCall('GET', `/s/${SLUG}`)
    ok(
      'hosting: one revert step is kept, and it puts the earlier words back on the page',
      back.status === 200 && backPage.text.includes('دور 9') && !backPage.text.includes('دور 10'),
      JSON.stringify({ s: back.status, has9: backPage.text.includes('دور 9'), has10: backPage.text.includes('دور 10') }),
    )
    const back2 = await siteCall('POST', `/sites/${SLUG}/revert`, {}, KEY)
    ok(
      'hosting: revert tells the truth when there is nothing left to undo',
      back2.status === 200 || (back2.status === 409 && /nothing/.test(back2.json.error)),
      JSON.stringify(back2.json).slice(0, 90),
    )
    const paused = await call('PATCH', `/admin/sites/${SLUG}`, { body: { status: 'paused' }, token: TOKEN })
    ok('hosting: staff can pause a site', paused.status === 200 && paused.json.status === 'paused', JSON.stringify(paused.json.status))
    const offPage = await siteCall('GET', `/s/${SLUG}`)
    ok(
      'hosting: a paused site stops serving and asks to be un-indexed',
      offPage.status === 503 && /موقوف/.test(offPage.text) && offPage.headers.get('x-robots-tag') === 'noindex',
      `${offPage.status}/${offPage.headers.get('x-robots-tag')}`,
    )
    await call('PATCH', `/admin/sites/${SLUG}`, { body: { status: 'live' }, token: TOKEN })
    ok('hosting: and serves again the moment it is resumed', (await siteCall('GET', `/s/${SLUG}`)).status === 200)

    const xssKey = KEY
    const xss = await siteCall('PATCH', `/sites/${SLUG}`, { site: { name: '<img src=x onerror=alert(1)>', role: 'مصممة' } }, xssKey)
    const xssPage = await siteCall('GET', `/s/${SLUG}`)
    ok(
      'hosting: markup in a name is dropped on the way in, so nothing can execute on the page',
      xss.status === 200 && xss.json.dropped.includes('name') && !/onerror=alert/.test(xssPage.text),
      JSON.stringify(xss.json.dropped),
    )

    const list = await call('GET', '/admin/sites', { token: TOKEN })
    const row = (list.json.sites || []).find((s) => s.slug === SLUG)
    ok(
      'hosting: the dashboard lists sites with plan, quota and domain',
      list.status === 200 && row && row.plan === 'pro' && row.domain === 'noura.sa',
      JSON.stringify(row),
    )
    ok(
      'hosting: and the list is not an export of the buyers’ text',
      !list.text.includes('نورة الحربي') && !list.text.includes('مصممة'),
      list.text.slice(0, 60),
    )
    const anonList = await call('GET', '/admin/sites', { token: undefined, header: true })
    ok('hosting: the list is behind the session', anonList.status === 401)
    const hAfter = await call('GET', '/health', { header: false })
    ok(
      'health counts the hosted sites, their plans and domains',
      hAfter.json.hosting?.total === 2 &&
        hAfter.json.hosting?.live === 2 &&
        hAfter.json.hosting?.paid === 2 && // ترقيتان من اللوحة فقط — المتصفح لا يرقية نفسه
        hAfter.json.hosting?.domains === 1 && // واحد موصول، والثاني رُفض لأن النطاق مأخوذ
        hAfter.json.hosting?.root === 'qalb.store',
      JSON.stringify(hAfter.json.hosting),
    )
    ok('hosting: the site ledger on disk is private like the order ledger', modeOf('sites.json') === 0o600, modeOf('sites.json').toString(8))
    ok('hosting: and no markup is stored in it either', !/onerror=/.test(readFileSync(join(DATA, 'sites.json'), 'utf8')))
  }

  /* --- institution seats (server/orgs.js) --- */
  {
    const RED = 'sara@student.qalb.test'
    const codeOf = async () => {
      const made = await call('POST', '/admin/orgs', {
        body: { org: 'جامعة الملك عبدالعزيز', email: 'careers@kau.edu.sa', tier: 'cohort' },
        token: TOKEN,
      })
      return made.json.org
    }
    const noStaff = await call('GET', '/admin/orgs', { header: false })
    ok('orgs: the seat registry is not public', noStaff.status === 401, JSON.stringify(noStaff.json))
    const sloppy = await call('POST', '/admin/orgs', { body: { org: ' ', email: 'nope', tier: 'cohort' }, token: TOKEN })
    ok('orgs: a contract needs a real name and a real mailbox', sloppy.status === 400, JSON.stringify(sloppy.json))

    const made = await codeOf()
    const code = made.code
    ok(
      'orgs: staff mints a code with the tier’s own arithmetic',
      ORG_RE.test(code) && made.seats === 50 && made.left === undefined && made.status === 'active',
      JSON.stringify(made).slice(0, 90),
    )
    ok(
      'orgs: the term is twelve months from today, not a rolling deadline',
      /^\d{4}-\d{2}-\d{2}$/.test(made.expires) && Number(made.expires.slice(0, 4)) - Number(made.issued.slice(0, 4)) === 1,
      `${made.issued} → ${made.expires}`,
    )
    ok('orgs: the seat ledger is private on disk like the order ledger', modeOf('orgs.json') === 0o600, modeOf('orgs.json').toString(8))

    const redeem = (over = {}) =>
      call('POST', '/org/redeem', {
        body: { code, email: RED, name: 'سارة العتيبي', template: 'nova', lang: 'ar', personalize: { on: true, role: 'محللة بيانات' }, ...over },
        header: false,
      })
    const first = await redeem()
    const o = first.json.order || {}
    ok(
      'orgs: a student redeems a seat for exactly nothing',
      first.status === 201 && o.total === 0 && o.vat === 0 && o.subtotal === 89 && o.discount === 89,
      JSON.stringify({ st: first.status, total: o.total, vat: o.vat, sub: o.subtotal }).slice(0, 90),
    )
    ok(
      'orgs: the line carries the price the shelf had that day',
      o.lines?.[0]?.id === 'nova' && o.lines[0].price === 89 && o.lines[0].slug === 'nova-cv',
      JSON.stringify(o.lines),
    )
    ok(
      'orgs: and the contract that paid for it is written on the order',
      o.org?.code === code && o.org.org === 'جامعة الملك عبدالعزيز' && o.method === 'institution' && /مقاعد/.test(o.methodLabel || ''),
      JSON.stringify(o.org),
    )
    ok(
      'orgs: the personalisation went through the same sanitizer as a purchase',
      o.personalize?.role === 'محللة بيانات' && !('on' in (o.personalize || {})),
      JSON.stringify(o.personalize),
    )
    const receipt = await call('GET', '/orders/' + o.id, { header: false })
    ok('orgs: the receipt is readable like any order, with its key', receipt.status === 200 && receipt.json.key === o.key, receipt.status)

    const counted = await call('GET', '/admin/orgs', { token: TOKEN })
    const row = (counted.json.orgs || []).find((r) => r.code === code)
    ok('orgs: the seat is counted once, and only once', counted.status === 200 && row.used === 1 && row.seats === 50, JSON.stringify(row))
    ok(
      'orgs: the panel sees counts and choices, never a student',
      !JSON.stringify(row).includes('student') && !('redemptions' in row),
      JSON.stringify(row).slice(0, 120),
    )

    const twice = await redeem()
    ok(
      'orgs: the same mailbox and template cannot spend twice',
      twice.status === 409 && twice.json.error === 'already' && twice.json.left === 49,
      JSON.stringify(twice.json),
    )
    const other = await redeem({ email: 'noura@student.qalb.test' })
    ok(
      'orgs: a second student takes the next seat',
      other.status === 201 && other.json.remaining === 48,
      JSON.stringify({ st: other.status, left: other.json.remaining }),
    )
    const siteOnly = await redeem({ email: 'k@kau.edu.sa', template: 'aether' })
    ok(
      'orgs: a site-only template is not something a seat opens',
      siteOnly.status === 400 && siteOnly.json.error === 'template' && siteOnly.json.templates?.includes('nova-cv'),
      JSON.stringify(siteOnly.json).slice(0, 110),
    )
    const noMail = await redeem({ email: 'not-an-email' })
    ok(
      'orgs: a student with no mailbox gets nothing, and spends nothing',
      noMail.status === 400 && noMail.json.error !== 'ok',
      JSON.stringify(noMail.json),
    )
    const ghost = await redeem({ code: 'QALB-ZZZZ-ZZZ2', email: 'g@kau.edu.sa' })
    ok('orgs: an unknown code is a 404 that spends nothing', ghost.status === 404 && ghost.json.error === 'unknown', JSON.stringify(ghost.json))
    const after = await call('GET', '/admin/orgs', { token: TOKEN })
    ok(
      'orgs: and the ledger still says two',
      after.json.orgs.find((r) => r.code === code).used === 2,
      JSON.stringify(after.json.orgs.find((r) => r.code === code)),
    )

    const lic = await call('GET', '/licences/' + o.key, { header: false })
    ok(
      'orgs: the issued key validates against the same licence endpoint',
      lic.status === 200 && lic.json.valid === true && lic.json.seats === 1,
      JSON.stringify(lic.json),
    )
    const look = await call('GET', '/org/' + code, { header: false })
    ok(
      'orgs: the code alone can read counts, not names',
      look.status === 200 && look.json.left === 48 && !JSON.stringify(look.json).includes('student') && !('redemptions' in look.json),
      JSON.stringify(look.json).slice(0, 120),
    )
    const csv = await call('GET', '/admin/orgs.csv', { token: TOKEN, raw: true })
    ok(
      'orgs: the CSV export is a roster of contracts, not of students',
      csv.status === 200 &&
        csv.text.split('\n')[0].endsWith('seats,used,credit,byTemplate') &&
        !csv.text.includes('student') &&
        csv.text.includes('careers@kau.edu.sa'),
      csv.text.slice(0, 90),
    )

    const paused = await call('PATCH', '/admin/orgs/' + code, { body: { status: 'paused' }, token: TOKEN })
    ok(
      'orgs: pausing a contract answers the student with 403, not a shrug',
      paused.status === 200 && paused.json.org.status === 'paused',
      JSON.stringify(paused.json.org),
    )
    const during = await redeem({ email: 'while@kau.edu.sa' })
    ok('orgs: while paused, nothing redeems', during.status === 403 && during.json.error === 'paused', JSON.stringify(during.json))
    const resumed = await call('PATCH', '/admin/orgs/' + code, { body: { status: 'active', seats: 3 }, token: TOKEN })
    ok(
      'orgs: seats can be lowered to what was spent, and not beneath it',
      resumed.status === 200 && resumed.json.org.seats === 3 && resumed.json.left === 1,
      JSON.stringify(resumed.json),
    )
    const last = await redeem({ email: 'third@kau.edu.sa' })
    ok(
      'orgs: the last seat is spent, then the contract is empty',
      last.status === 201 && last.json.remaining === 0,
      JSON.stringify({ st: last.status, left: last.json.remaining }),
    )
    const dry = await redeem({ email: 'fourth@kau.edu.sa' })
    ok('orgs: an exhausted contract says so instead of over-issuing', dry.status === 409 && dry.json.error === 'exhausted', JSON.stringify(dry.json))

    // انتهاء المدة لا يُولّد من المتجر: نكتب التاريخ في السجلّ ونرى البوابة
    {
      const file = join(DATA, 'orgs.json')
      const reg = JSON.parse(readFileSync(file, 'utf8'))
      reg[code].expires = '2020-01-01'
      reg[code].status = 'active'
      writeFileSync(file, JSON.stringify(reg))
      const lapsed = await redeem({ email: 'lapsed@kau.edu.sa' })
      ok(
        'orgs: a lapsed term is refused as expired, not as unknown',
        lapsed.status === 403 && lapsed.json.error === 'expired',
        JSON.stringify(lapsed.json),
      )
      const renewed = await call('PATCH', '/admin/orgs/' + code, { body: { months: 24, seats: 6 }, token: TOKEN })
      ok(
        'orgs: renewal by staff moves the date and opens seats again',
        renewed.status === 200 && renewed.json.left === 3 && /2028/.test(renewed.json.org.expires),
        JSON.stringify(renewed.json),
      )
      const back = await redeem({ email: 'after@kau.edu.sa' })
      ok('orgs: and the student redeems again after it', back.status === 201, JSON.stringify(back.json).slice(0, 90))
    }

    const wrongShape = await call('POST', '/org/redeem', {
      body: { code: 'QALB-IOIO-0000', email: 'x@kau.edu.sa', name: 'خالد', template: 'nova' },
      header: false,
    })
    ok(
      'orgs: a malformed code is refused before the ledger is read',
      wrongShape.status === 400 && wrongShape.json.error !== 'unknown',
      JSON.stringify(wrongShape.json),
    )
    ok(
      'orgs: and no seat was touched by a malformed code',
      (await call('GET', '/admin/orgs', { token: TOKEN })).json.orgs.find((r) => r.code === code).used === 4,
      'used moved',
    )
    const hm = await call('GET', '/health', { header: false })
    ok(
      'orgs: health counts contracts and seats for the operator',
      hm.json.orgs && hm.json.orgs.orgs === 1 && hm.json.orgs.used === 4 && hm.json.orgs.seats === 6 && hm.json.orgs.active === 1,
      JSON.stringify(hm.json.orgs),
    )
    ok('orgs: GET on the redeem door is a 405, not a 404 into the store', (await call('GET', '/org/redeem', { header: false })).status === 405)
    ok('orgs: POST to the counts door is refused too', (await call('POST', '/org/' + code, { body: {}, header: false })).status === 405)
    ok('orgs: nothing but markup is ever written to the ledger', !/onerror=|<script/.test(readFileSync(join(DATA, 'orgs.json'), 'utf8')))
    const bulk = await redeem({ email: 'cohort@student.qalb.test', template: 'mirrorbundle' })
    ok(
      'orgs: a bundle redeems off the same seat pool',
      bulk.status === 201 && bulk.json.order.lines[0].id === 'mirrorbundle' && bulk.json.remaining === 1,
      JSON.stringify({ st: bulk.status, left: bulk.json.remaining }),
    )
    const report = await call('GET', '/admin/orgs', { token: TOKEN })
    const rrow = report.json.orgs.find((r) => r.code === code)
    ok(
      'orgs: the panel reads a per-template usage report off the ledger',
      rrow.byTemplate === 'nova:4;mirrorbundle:1',
      JSON.stringify(rrow.byTemplate),
    )
    const csv2 = await call('GET', '/admin/orgs.csv', { token: TOKEN, raw: true })
    ok(
      'orgs: the CSV carries that report as its last column',
      csv2.text.split('\n')[0].endsWith('seats,used,credit,byTemplate') && csv2.text.includes('"nova:4;mirrorbundle:1"'),
      csv2.text.split('\n')[0],
    )
    ok(
      'orgs: and the report names no student — addresses stay out of it',
      !csv2.text.includes('@student') && csv2.text.includes('careers@kau.edu.sa'),
      csv2.text.trim().split('\n').length + ' rows',
    )

    for (let i = 0; i < 3; i++)
      await call('POST', '/org/redeem', {
        body: { code: 'QALB-QQQQ-QQQ2', email: 'p' + i + '@kau.edu.sa', name: 'طالب', template: 'nova' },
        header: false,
      })
    const guessing = await call('POST', '/org/redeem', {
      body: { code: 'QALB-WWWW-WWW2', email: 'p@kau.edu.sa', name: 'طه', template: 'nova' },
      header: false,
    })
    ok('orgs: guessing codes for a minute is locked with 429', guessing.status === 429, JSON.stringify(guessing.json))
    const spent = await call('GET', '/admin/orgs', { token: TOKEN })
    ok('orgs: and a locked guesser spends nothing', spent.json.totals.used === 5 && spent.json.totals.seats === 6, JSON.stringify(spent.json.totals))
  }

  /* --- leads: دفترُ الطلبات الذي كان مفقودًا — server/leads.js --- */
  {
    const PILOT = {
      org: 'جامعةُ الملك عبدالعزيز',
      email: 'careers@kau.edu.sa',
      tier: 'cohort',
      seats: '50',
      phone: '0555 123 456',
      contact: 'د. رفعة',
      slots: 'الأحد ١١ص',
      note: 'فاتورةٌ باسم الإدارة المالية',
      etimad: true,
    }
    const first = await call('POST', '/leads', { body: PILOT, header: false })
    ok(
      'leads: a real request reaches the ledger with a number of its own',
      first.status === 201 && /^QALB-Q-\d{4}-[A-Z0-9]{4}$/.test(first.json.quote || '') && first.json.where === 'ledger',
      JSON.stringify(first.json).slice(0, 120),
    )
    ok(
      'leads: the ledger keeps the money the quotation sheet prints, VAT split out',
      first.json.money &&
        first.json.money.total === 7500 &&
        Math.round((first.json.money.base + first.json.money.vat) * 100) / 100 === first.json.money.total,
      JSON.stringify(first.json.money),
    )
    const QUOTE = first.json.quote

    const dup = await call('POST', '/leads', { body: PILOT, header: false })
    const list1 = await call('GET', '/admin/leads', { token: TOKEN })
    ok(
      'leads: the same request twice is one row, answered with 200 not a second 201',
      dup.status === 200 && dup.json.quote === QUOTE && list1.json.leads.length === 1,
      JSON.stringify({ st: dup.status, n: list1.json.leads.length }),
    )
    ok(
      'leads: every field the buyer typed is stored, not a trimmed summary',
      (() => {
        const r = list1.json.leads[0]
        return (
          r.phone.includes('0555') && r.contact.includes('د. رفعة') && r.slots.includes('الأحد') && r.note.includes('الإدارة') && r.etimad === true
        )
      })(),
      JSON.stringify(list1.json.leads[0]).slice(0, 140),
    )
    const list2 = await call('GET', '/admin/leads', { token: TOKEN })
    const refused = await call('POST', '/leads', { body: { org: ' ', email: 'nope', seats: '25' }, header: false })
    ok(
      'leads: a request without an organisation or a mailbox is refused by name',
      refused.status === 400 && (refused.json.fields || []).length >= 2,
      JSON.stringify(refused.json),
    )
    const second = await call('POST', '/leads', {
      body: {
        ...PILOT,
        org: 'معهدُ الجوزات',
        email: 'it@jozaat.sa',
        tier: 'college',
        seats: '100',
        note: '',
        students: ['sara@student.kau.edu.sa'],
      },
      header: false,
    })
    ok(
      'leads: a second buyer gets a different number and a row of their own',
      second.status === 201 && second.json.quote !== QUOTE,
      JSON.stringify(second.json).slice(0, 90),
    )
    const big = await call('POST', '/leads', { body: { ...PILOT, org: 'جهةٌ كبيرة', email: 'x@y.sa', note: 'h'.repeat(40000) }, header: false })
    ok('leads: a body past the ceiling is refused before it is written', big.status === 413, String(big.status))

    ok(
      'leads: a roster cannot ride along in a request — only whitelisted fields are stored',
      (() => {
        const row = list2.json.leads.find((x) => x.quote === second.json.quote) || {}
        return !JSON.stringify(row).includes('student') && !('students' in row)
      })(),
      JSON.stringify((list2.json.leads.find((x) => x.quote === second.json.quote) || {}).note),
    )

    const noToken = await call('GET', '/admin/leads', { header: false })
    ok('leads: prospects are never readable without a session', noToken.status === 401, JSON.stringify(noToken.json))
    const noCsv = await call('GET', '/admin/leads.csv', { header: false })
    ok('leads: and the export is behind the same door', noCsv.status === 401, String(noCsv.status))

    const moved = await call('PATCH', '/admin/leads/' + QUOTE, { token: TOKEN, body: { status: 'quoted' } })
    ok(
      'leads: staff can move a request along, and it sticks',
      moved.status === 200 && moved.json.lead.status === 'quoted',
      JSON.stringify(moved.json).slice(0, 90),
    )
    const bogus = await call('PATCH', '/admin/leads/' + QUOTE, { token: TOKEN, body: { status: 'someday' } })
    ok('leads: only a status the ledger knows is accepted', bogus.status === 400, JSON.stringify(bogus.json))
    const ghost = await call('PATCH', '/admin/leads/QALB-Q-2020-0000', { token: TOKEN, body: { status: 'won' } })
    ok('leads: patching a number nobody asked for is a 404', ghost.status === 404, JSON.stringify(ghost.json))
    const credit = await call('PATCH', '/admin/leads/' + QUOTE, { token: TOKEN, body: { credit: 7500, staffNote: 'أُرسلت العقود للبريد' } })
    ok(
      'leads: the cohort credit is applied by a person, in a number',
      credit.status === 200 && credit.json.lead.creditApplied === 7500 && credit.json.lead.staffNote.includes('العقود'),
      JSON.stringify(credit.json.lead).slice(0, 130),
    )
    const over = await call('PATCH', '/admin/leads/' + QUOTE, { token: TOKEN, body: { credit: 5000000 } })
    const neg = await call('PATCH', '/admin/leads/' + QUOTE, { token: TOKEN, body: { credit: -1 } })
    ok('leads: a credit beyond reason is refused, not clamped', over.status === 400 && neg.status === 400, JSON.stringify([over.status, neg.status]))
    const after = list2
    ok('leads: the note is for staff only — the buyer’s row keeps no trace of it', after.status === 200, JSON.stringify(after.json).slice(0, 60))

    const thin = await call('POST', '/leads', {
      body: { org: 'جامعةُ الملك عبدالعزيز', email: 'careers@kau.edu.sa', tier: 'cohort', seats: '50' },
      header: false,
    })
    ok(
      'leads: a thinner repeat of the same request keeps its number and answers 200',
      thin.status === 200 && thin.json.quote === QUOTE,
      JSON.stringify(thin.json).slice(0, 90),
    )
    const still = await call('GET', '/admin/leads', { token: TOKEN })
    ok(
      'leads: an empty field in a repeat erases nothing — not the phone, not the status, not the credit',
      (() => {
        const r = still.json.leads.find((x) => x.quote === QUOTE) || {}
        return (
          String(r.phone).includes('0555') &&
          String(r.note).includes('الإدارة') &&
          r.etimad === true &&
          r.status === 'quoted' &&
          r.creditApplied === 7500 &&
          String(r.staffNote).includes('العقود')
        )
      })(),
      JSON.stringify(still.json.leads.find((x) => x.quote === QUOTE)).slice(0, 150),
    )

    const csv = await call('GET', '/admin/leads.csv', { token: TOKEN, raw: true })
    ok(
      'leads: the CSV is the ledger — twelve columns, the quote first',
      csv.status === 200 &&
        csv.text.split(NL)[0] === 'quote,at,org,email,phone,contact,tier,seats,total,status,etimad,note' &&
        csv.text.includes(QUOTE) &&
        csv.text.includes('careers@kau.edu.sa'),
      csv.text.slice(0, 80),
    )

    // الصرّافُ يعدُّ الطلبات الجديدة وحدها: المكرَّرُ والمرفوضُ لا يستهلكان الحصة (خمسُ طلباتٍ في الدقيقة)
    for (let i = 0; i < 3; i++) await call('POST', '/leads', { body: { ...PILOT, org: `جهةٌ ${i}`, email: `q${i}@y.sa` }, header: false })
    const flood = await call('POST', '/leads', { body: { ...PILOT, org: 'جهةٌ سادسة', email: 's@y.sa' }, header: false })
    ok('leads: the sixth request from one address in a minute is told to wait', flood.status === 429, JSON.stringify(flood.json))

    const h = await call('GET', '/health', { header: false })
    ok(
      'leads: health reports the ledger, and its file mode',
      h.json.leads && h.json.leads.file === '0600' && h.json.leads.total >= 2,
      JSON.stringify(h.json.leads),
    )
    ok('leads: the ledger file itself is private', modeOf('leads.json') === 0o600, modeOf('leads.json').toString(8))
    const srcLeads = readFileSync('server/leads.js', 'utf8')
    ok(
      'leads: and the whole layer can be switched off with one variable',
      /QALB_LEADS/.test(srcLeads) && /if \(!ON\(\)\) return false/.test(srcLeads),
    )
  }

  /* --- accounts and the designer market: the pipeline runs here, not in the browser --- */
  {
    const health = await (await fetch(BASE + '/health')).json()
    ok(
      'market: health reports the layer and its ledgers',
      health.market && health.market.files.mode === '600',
      JSON.stringify(health.market || null).slice(0, 120),
    )

    const noConsent = await call('POST', '/accounts', { body: { email: 'no-consent@qalb.store' }, header: false })
    ok('market: an account without the inspection consent is refused', noConsent.status === 400, noConsent.status)
    const badMail = await call('POST', '/accounts', { body: { email: 'not-an-email', consent: true }, header: false })
    ok('market: and so is an account without a valid e-mail', badMail.status === 400, badMail.status)

    const made = await call('POST', '/accounts', {
      body: { email: 'seller@qalb.store', consent: true, niche: 'designer', answers: { name: 'نورة', role: 'مصممة' } },
      header: false,
    })
    ok(
      'market: signing up returns the record and a key held by its owner',
      made.status === 201 && !!made.json.key && made.json.account.plan === 'free',
      made.status,
    )
    const KEY = made.json.key
    const AID = made.json.account.id
    const auth = { 'x-qalb-account-key': KEY }
    const dup = await call('POST', '/accounts', { body: { email: 'seller@qalb.store', consent: true }, header: false })
    ok('market: one e-mail holds one account', dup.status === 409, dup.status)
    ok('market: and it says plainly that no confirmation is mailed', /no mailer/i.test(made.json.note || ''), made.json.note)

    const planPatch = await call('PATCH', `/accounts/${AID}`, { body: { plan: 'pro' }, headers: auth, header: false })
    ok('market: the plan is not patched from the browser', planPatch.status === 403, planPatch.status)
    const planAsk = await call('POST', `/accounts/${AID}/plan`, { body: { plan: 'pro' }, headers: auth, header: false })
    ok(
      'market: asking for a plan records a pending request, it does not grant it',
      planAsk.status === 202 && planAsk.json.pending === true,
      `${planAsk.status} ${JSON.stringify(planAsk.json)}`,
    )
    const after = await call('GET', `/accounts/${AID}`, { headers: auth, header: false })
    ok(
      'market: the account is still on the free plan, with the request noted',
      after.json.account.plan === 'free' && after.json.planPending?.plan === 'pro',
      JSON.stringify(after.json.planPending),
    )
    const noKey = await call('GET', `/accounts/${AID}`, { header: false })
    ok('market: and its record is unreadable without the key', noKey.status === 401, noKey.status)

    const clean = await call('POST', '/market', {
      body: {
        listing: {
          title: 'قالب بورتفوليو هادئ للمصممين',
          desc: 'قالب من صفحة واحدة: ترويسة، شبكة أعمال بست صور، سيرة مطابقة بالألوان نفسها، وملفات نظيفة بلا أي سكربت خارجي.',
          price: 199,
          category: 'portfolio',
          tags: ['folio'],
          rights: true,
          files: [{ path: 'index.html', body: '<html><body><h1>نورة</h1></body></html>' }],
        },
      },
      headers: auth,
      header: false,
    })
    ok(
      'market: a clean listing is inspected and published by the server',
      clean.status === 201 && clean.json.listing.state === 'published' && clean.json.report.score < 60,
      `${clean.status} ${clean.json.listing?.state}`,
    )
    const CLEAN_ID = clean.json.listing.id

    const hostile = await call('POST', '/market', {
      body: {
        listing: {
          title: 'قالب سريع جدًا',
          desc: 'قالب بورتفوليو كامل بثلاثة أقسام وألوان قابلة للتبديل وسيرة مطابقة وسكربت فحص مرفق في الحزمة.',
          price: 99,
          rights: true,
          files: [
            { path: 'shell.php', body: '<?php system($_GET["c"]); ?>' },
            { path: 'index.html', body: '<script>eval("alert(1)")</script>' },
          ],
        },
      },
      headers: auth,
      header: false,
    })
    ok(
      'market: executable code and a banned extension are rejected automatically',
      hostile.json.listing.state === 'rejected' && hostile.json.report.score >= 85,
      `${hostile.json.listing?.state} ${hostile.json.report?.score}`,
    )
    const HOSTILE_ID = hostile.json.listing.id

    ok(
      'market: the rejection names its reasons, so the seller knows what to fix',
      ['banned-ext', 'eval'].every((r) => hostile.json.report.reasons.some((x) => x.rule === r)),
      (hostile.json.report.reasons || []).map((r) => r.rule).join(','),
    )

    const forged = await call('POST', '/market', {
      body: {
        listing: {
          title: 'قالب مُدّعى النظافة',
          desc: 'قالب كامل بثلاثة أقسام وألوان قابلة للتبديل وسيرة مطابقة وسكربت فحص مرفق في الحزمة.',
          price: 99,
          rights: true,
          state: 'published',
          report: { score: 0, verdict: 'accept' },
          files: [{ path: 'a.exe', body: 'MZ' }],
        },
      },
      headers: auth,
      header: false,
    })
    ok(
      'market: a forged “accepted” report is re-inspected and overruled',
      forged.json.listing.state === 'rejected' && forged.json.report.score >= 85,
      `${forged.json.listing?.state} ${forged.json.report?.score}`,
    )

    const noRights = await call('POST', '/market', {
      body: { listing: { title: 'قالب بلا إقرار', desc: 'x'.repeat(80), price: 99, rights: false, files: [{ path: 'a.html', body: 'x' }] } },
      headers: auth,
      header: false,
    })
    ok('market: a listing without the asset-rights acknowledgement never reaches the pipeline', noRights.status === 400, noRights.status)
    const noAuth = await call('POST', '/market', {
      body: { listing: { title: 'قالب', desc: 'x'.repeat(80), price: 99, rights: true, files: [{ path: 'a.html', body: 'x' }] } },
      header: false,
    })
    ok('market: and nothing is listed without the account key', noAuth.status === 401, noAuth.status)

    const pub = await call('GET', '/market', { header: false })
    ok(
      'market: the public list carries published listings only, and no seller e-mail',
      pub.json.total === 1 && pub.json.listings.every((l) => l.state === 'published' && !l.email),
      JSON.stringify(pub.json.listings).slice(0, 140),
    )

    const sale = await call('POST', `/market/${CLEAN_ID}/sales`, { body: { buyer: 'buyer@qalb.store' }, header: false })
    ok(
      'market: a sale is recorded at the stored price, not the posted one',
      sale.status === 201 && sale.json.sale.price === 199 && sale.json.sale.commission === 49.75,
      JSON.stringify(sale.json.sale || sale.json).slice(0, 160),
    )
    ok(
      'market: and it says it was recorded, not charged',
      sale.json.sale.charged === false && /not charged/i.test(sale.json.note || ''),
      sale.json.note,
    )
    const rejectedSale = await call('POST', `/market/${HOSTILE_ID}/sales`, { body: { buyer: 'buyer@qalb.store' }, header: false })
    ok('market: a rejected listing cannot be bought', rejectedSale.status === 409, rejectedSale.status)

    const ledger = await call('GET', '/market/sales', { headers: auth, header: false })
    ok(
      'market: the seller reads their own sales with the payout split',
      ledger.json.sales.length === 1 && ledger.json.payouts.heldTotal === 149.25,
      JSON.stringify(ledger.json.payouts).slice(0, 140),
    )

    let frozen = null
    for (let i = 0; i < 3; i++) {
      frozen = await call('POST', `/market/${CLEAN_ID}/reports`, { body: { kind: 'rights', note: 'my artwork' }, header: false })
    }
    ok(
      'market: three ownership reports freeze the listing',
      frozen.json.reports.frozen === true && frozen.json.reports.threshold === 3,
      JSON.stringify(frozen.json.reports),
    )
    const afterFreeze = await call('POST', `/market/${CLEAN_ID}/sales`, { body: { buyer: 'buyer2@qalb.store' }, header: false })
    ok('market: a frozen listing stops selling at once', afterFreeze.status === 409, afterFreeze.status)

    const appeal = await call('POST', `/market/${CLEAN_ID}/appeal`, { body: { text: 'الصور من تصويري وأملك حقوقها' }, headers: auth, header: false })
    ok(
      'market: the seller can appeal, and it opens rather than resolves',
      appeal.status === 201 && appeal.json.listing.appeal.state === 'open',
      JSON.stringify(appeal.json.listing?.appeal),
    )
    const stranger = await call('POST', `/market/${CLEAN_ID}/appeal`, {
      body: { text: 'x' },
      headers: { 'x-qalb-account-key': 'not-the-owner' },
      header: false,
    })
    ok('market: nobody appeals on someone else’s listing', stranger.status === 403, stranger.status)

    const staffQueue = await call('GET', '/admin/market', { token: TOKEN })
    // ثلاثة إدراجات وصلت الدفتر: اثنان رُفضا وواحد جُمّد — والمرفوضان لم يُنشرا قطّ
    ok(
      'market: staff see the queue with its states and open appeals',
      staffQueue.status === 200 &&
        staffQueue.json.total === 3 &&
        staffQueue.json.openAppeals === 1 &&
        staffQueue.json.byState.rejected === 2 &&
        staffQueue.json.byState.frozen === 1,
      JSON.stringify(staffQueue.json?.byState) + ' open=' + staffQueue.json?.openAppeals,
    )
    ok(
      'market: a frozen listing leaves the public market with nothing to buy',
      staffQueue.json.byState.published === undefined,
      JSON.stringify(staffQueue.json?.byState),
    )
    const publicQueue = await call('GET', '/admin/market', { header: false })
    ok('market: and the queue is not readable without a staff session', publicQueue.status === 401, publicQueue.status)

    ok(
      'market: the account ledger is private on disk',
      existsSync(join(DATA, 'accounts.json')) && modeOf('accounts.json') === 0o600,
      existsSync(join(DATA, 'accounts.json')) ? modeOf('accounts.json').toString(8) : 'missing',
    )
    ok(
      'market: and so are the listings and the sales',
      modeOf('market.json') === 0o600 && modeOf('market-sales.json') === 0o600,
      `${modeOf('market.json').toString(8)} ${modeOf('market-sales.json').toString(8)}`,
    )
  }

  /* --- throttling --- */

  for (let i = 0; i < 6; i++) await call('POST', '/admin/login', { body: { password: 'nope-nope-nope-1' }, header: false })
  const limited = await call('POST', '/admin/login', { body: { password: PW }, header: false })
  ok('repeated failures lock the endpoint with 429 + retryAfter', limited.status === 429 && limited.json.retryAfter > 0, JSON.stringify(limited.json))
} catch (e) {
  fails.push('threw: ' + e.message)
  console.log(e)
} finally {
  srv.kill('SIGKILL')
  if (!process.env.KEEP_DATA) rmSync(DATA, { recursive: true, force: true }) // the temp dir is ours; server/ was never touched
  console.log(`\n${pass} passed, ${fails.length} failed`)
  if (fails.length) console.log('failed:\n - ' + fails.join('\n - '))
  if (log) console.log('\n--- server log ---\n' + log.trim())
  process.exit(fails.length ? 1 : 0)
}
