/* ------------------------------------------------------------------ *
 * عميل الاستضافة لواجهة المتجر.
 *
 * وحدة قائمة بذاتها تُستورد مع /host و/studio فقط، لأن القواعد كلها تجرّ
 * src/data/hosting.js ← src/data/deliverable.js (المولّدات)، وحملُ ذلك على
 * chunk المدخل كان يضيف ~29 kB لكلّ صفحة في المتجر.
 *
 * وضعان بنفس العقد، كما في الطلبات تمامًا:
 *   local — السجلّ على الجهاز تحت qalb.sites.v1، والقواعد تُقرأ من
 *           src/data/hosting.js الذي يقرأه server/sites.js أيضًا: السقف
 *           والخطة والتنقية والرفض أرقامٌ واحدة في الوضعين، لا حكايتان.
 *   rest  — server/sites.js خلفه مباشرة؛ الخطة لا تُرقَّى من المتصفح هناك،
 *           فلا نمنحها هنا أيضًا: نُسجّل planPending فقط.
 * مفتاح التحرير يُحفظ على جهاز صاحبه (qalb.site-keys.v1) ولا يصل إلى اللوحة.
 * ------------------------------------------------------------------ */
import { BASE, apiMode, read, write } from './index'
import { HOST_ROOT, PLANS, droppedSiteFields, editWindow, planOf, quotaNotice, sanitizeSite, slugify } from '../data/hosting'

/* ------------------------------------------------------------------ *
 * الاستضافة: قالبٌ يصير صفحة حيّة.
 *
 * وضعان بنفس العقد، كما في الطلبات تمامًا:
 *   local — السجلّ على الجهاز تحت qalb.sites.v1، والقواعد تُقرأ من
 *           src/data/hosting.js الذي يقرأه server/sites.js أيضًا: السقف
 *           والخطة والتنقية والرفض أرقامٌ واحدة في الوضعين، لا حكايتان.
 *   rest  — server/sites.js خلفه مباشرة؛ الخطة لا تُرقَّى من المتصفح هناك،
 *           فلا نمنحها هنا أيضًا: نُسجّل planPending فقط.
 * مفتاح التحرير يُحفظ على جهاز صاحبه (qalb.site-keys.v1) ولا يصل إلى اللوحة.
 * ------------------------------------------------------------------ */
export const SITES_KEY = 'qalb.sites.v1'
const SITE_KEYS = 'qalb.site-keys.v1'
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const secret = (n) => {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint8Array(n)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf)
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
  return Array.from(buf, (b) => abc[b % abc.length]).join('')
}

const objOf = (k) => {
  const m = read(k, {})
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {}
}
const sitesMap = () => objOf(SITES_KEY)
const keyring = () => objOf(SITE_KEYS)
const rememberKey = (slug, key) => {
  const r = keyring()
  r[slug] = key
  write(SITE_KEYS, r)
}
const todayS = () => new Date().toISOString().slice(0, 10)

/** نفس شكل pub() في server/sites.js — تنسخه الواجهة ولا تعيد بناءه */
function localPub(rec, mine) {
  const w = editWindow(rec)
  return {
    slug: rec.slug,
    url: `https://${rec.slug}.${HOST_ROOT}`,
    plan: planOf(rec.plan),
    template: rec.site.template,
    lang: rec.site.lang,
    domain: rec.domain || null,
    status: rec.status,
    since: rec.createdAt,
    updatedAt: rec.updatedAt,
    quota: { month: w.month, used: w.used, max: w.max, left: w.left },
    planPending: !!rec.planPending && planOf(rec.plan) === 'free',
    // نفس ما يعيده pub() هناك: الحقول لمالك المفتاح وحده، ولا نسخة ثانية من العقد
    ...(mine ? { editKey: rec.key, email: rec.email || null, public: rec.public !== false, planPending: !!rec.planPending, site: rec.site } : {}),
  }
}

const uniqSlug = (base, map) => {
  if (!map[base]) return base
  for (let i = 2; i < 500; i++) {
    const s = `${base}-${i}`.slice(0, 32)
    if (!map[s]) return s
  }
  return `${base}-${secret(3)}`.slice(0, 32)
}

function localCreate(payload) {
  const mail = String(payload?.email || '')
    .trim()
    .toLowerCase()
  if (!EMAIL_OK.test(mail)) return { ok: false, status: 400, error: 'a valid email is required to hold a site' }
  const raw = { ...(payload?.site || {}), email: mail, template: payload?.template || payload?.site?.template }
  const site = sanitizeSite(raw)
  const dropped = droppedSiteFields(raw)
  if (!site.template) return { ok: false, status: 400, error: 'unknown template' }
  const map = sitesMap()
  const base = slugify(site.name || '') || slugify(mail.split('@')[0]) || `site-${secret(2)}`
  const slug = uniqSlug(base, map)
  const rec = {
    slug,
    id: `QS-${secret(3).toUpperCase()}`,
    key: secret(20),
    email: mail,
    plan: 'free',
    public: payload?.public !== false,
    planPending: !!payload?.planPending,
    domain: null,
    status: 'live',
    site,
    createdAt: todayS(),
    updatedAt: todayS(),
    editMonth: editWindow({}).month,
    editCount: 0,
    history: [],
  }
  map[slug] = rec
  write(SITES_KEY, map)
  return {
    ok: true,
    status: 201,
    ...localPub(rec, true),
    notice: 'احتفظ بمفتاح التحرير: لا يُستعاد من الخادم',
    ...(dropped.length ? { dropped } : {}),
  }
}

function localPatch(slug, key, body = {}) {
  const map = sitesMap()
  const rec = map[slug]
  if (!rec) return { ok: false, status: 404, error: 'no such site' }
  const mine = !!key && rec.key === key
  if (!mine) return { ok: false, status: 401, error: 'edit key required' }
  const plan = PLANS[planOf(rec.plan)]
  let dropped = []

  if (body.domain != null) {
    if (!plan.domain) return { ok: false, status: 402, error: 'plan needed: connect a domain on Qalb Plus', plan: plan.id, price: PLANS.pro.price }
    const d = String(body.domain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
    if (!/^[a-z0-9.-]{3,190}$/.test(d) || !d.includes('.')) return { ok: false, status: 400, error: 'bad domain' }
    if (Object.values(map).some((x) => x.slug !== slug && x.domain === d)) return { ok: false, status: 409, error: 'domain already connected' }
    rec.domain = d || null
    rec.domainCheckedAt = null
  }
  if (body.site) {
    const w = editWindow(rec)
    if (!w.canEdit) return { ok: false, status: 429, error: 'edit quota', month: w.month, used: w.used, max: w.max, plan: plan.id, ...quotaNotice(w) }
    const merged = { ...rec.site, ...body.site, template: body.site.template || rec.site.template }
    const next = sanitizeSite(merged)
    if (!next.template) next.template = rec.site.template
    dropped = droppedSiteFields(merged)
    rec.history = [{ at: new Date().toISOString(), site: rec.site }, ...(rec.history || [])].slice(0, 20)
    rec.site = next
    rec.editMonth = w.month
    rec.editCount = w.used + 1
  }
  if (body.public != null) rec.public = !!body.public
  if (body.planPending != null) rec.planPending = plan.id === 'free' ? !!body.planPending : false
  rec.updatedAt = todayS()
  map[slug] = rec
  write(SITES_KEY, map)
  return { ok: true, status: 200, ...localPub(rec, true), ...(dropped.length ? { dropped } : {}) }
}

function localRevert(slug, key) {
  const map = sitesMap()
  const rec = map[slug]
  if (!rec) return { ok: false, status: 404, error: 'no such site' }
  if (!key || rec.key !== key) return { ok: false, status: 401, error: 'edit key required' }
  const last = (rec.history || [])[0]
  if (!last) return { ok: false, status: 409, error: 'nothing to revert' }
  rec.site = last.site
  rec.history = rec.history.slice(1)
  rec.updatedAt = todayS()
  map[slug] = rec
  write(SITES_KEY, map)
  return { ok: true, status: 200, ...localPub(rec, true) }
}

/** النطاق لا يُفحص من المتصفح: لا DNS فيه. نقول ذلك بدل أن ندّعي أننا فحصنا */
const localDomainCheck = (slug) => {
  const rec = sitesMap()[slug]
  if (!rec) return { ok: false, status: 404, error: 'no such site' }
  if (!rec.domain) return { ok: false, status: 400, error: 'no domain connected' }
  return {
    ok: false,
    status: 501,
    local: true,
    domain: rec.domain,
    ar: `لا يستطيع متصفحك أن يسأل DNS: الفحص يعمل عندما يكون المتجر موصولًا بالخادم. أضف سجلّ CNAME إلى ${slug}.${HOST_ROOT} ثم أعد الفحص من المتجر الموصول بالخادم.`,
    en: `a browser cannot ask DNS: the check runs when the store is wired to the server. Point a CNAME at ${slug}.${HOST_ROOT} and check it there.`,
  }
}

async function siteRest(path, { method = 'GET', body, key } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(key ? { 'x-qalb-site': key } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = {}
  try {
    data = text && text[0] === '{' ? JSON.parse(text) : { body: text }
  } catch {
    /* استجابة غير JSON (وسيط أو خطأ شبكة) — الحالة تكفي */
  }
  return { ok: res.ok, status: res.status, ...data }
}

export const sites = {
  mode: apiMode,
  root: HOST_ROOT,
  /** ما يعرفه هذا الجهاز من مواقع: النطاق + مفتاح التحرير المحفوظ محليًا */
  device: () => Object.entries(keyring()).map(([slug, key]) => ({ slug, key, url: `https://${slug}.${HOST_ROOT}`, stored: !!sitesMap()[slug] })),
  async create(payload) {
    if (apiMode === 'rest') {
      const r = await siteRest('/sites', { method: 'POST', body: payload })
      if (r.ok && r.slug && r.editKey) rememberKey(r.slug, r.editKey)
      return r
    }
    const r = localCreate(payload)
    if (r.ok && r.slug) rememberKey(r.slug, r.editKey)
    return r
  },
  async get(slug, key) {
    if (!slug) return { ok: false, status: 400, error: 'no slug' }
    if (apiMode === 'rest') return siteRest(`/sites/${encodeURIComponent(slug)}`, { key })
    const rec = sitesMap()[slug]
    if (!rec) return { ok: false, status: 404, error: 'no such site' }
    if (rec.status !== 'live') return { ok: false, status: 503, error: 'site paused', ...localPub(rec, rec.key === key) }
    return { ok: true, status: 200, ...localPub(rec, rec.key === key) }
  },
  /** بيانات المُحرَّر نفسها: حتى تُرى في الاستوديو كما تُطبع في الصفحة، من نفس sanitizeSite */
  async data(slug, key) {
    if (apiMode === 'rest') return siteRest(`/sites/${encodeURIComponent(slug)}`, { key })
    const rec = sitesMap()[slug]
    if (!rec) return { ok: false, status: 404, error: 'no such site' }
    return { ok: true, status: 200, ...localPub(rec, true) }
  },
  async patch(slug, key, body) {
    if (apiMode === 'rest') return siteRest(`/sites/${encodeURIComponent(slug)}`, { method: 'PATCH', body, key })
    return localPatch(slug, key, body)
  },
  async revert(slug, key) {
    if (apiMode === 'rest') return siteRest(`/sites/${encodeURIComponent(slug)}/revert`, { method: 'POST', body: {}, key })
    return localRevert(slug, key)
  },
  async checkDomain(slug, key) {
    if (apiMode === 'rest') return siteRest(`/sites/${encodeURIComponent(slug)}/check-domain`, { method: 'POST', body: {}, key })
    return localDomainCheck(slug)
  },
  async requestPlan(slug, key, on = true) {
    if (apiMode === 'rest') return siteRest(`/sites/${encodeURIComponent(slug)}`, { method: 'PATCH', body: { planPending: on }, key })
    return localPatch(slug, key, { planPending: on })
  },
  remember(slug, key) {
    if (slug && key) rememberKey(String(slug), String(key))
  },
  /** ينسى هذا الجهاز الموقع: لا يبقى نصّه ولا مفتاحه هنا */
  forget(slug) {
    const map = sitesMap()
    const had = !!map[slug]
    delete map[slug]
    write(SITES_KEY, map)
    const r = keyring()
    delete r[slug]
    write(SITE_KEYS, r)
    return { ok: true, forgot: had }
  },
  /** «امسح بياناتي»: يمسح ما على الجهاز ويقول ما لا يمسّه */
  eraseAll() {
    const n = Object.keys(sitesMap()).length
    try {
      localStorage.removeItem(SITES_KEY)
      localStorage.removeItem(SITE_KEYS)
    } catch {
      /* localStorage محجوب أصلًا: لا شيء ليُمسح */
    }
    return { ok: true, sites: n }
  },
}
