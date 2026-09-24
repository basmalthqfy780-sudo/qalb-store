/**
 * الاستضافة: كل موقع سجلّ واحد، وكل صفحة تُبنى لحظة الطلب من نفس مولّدات الحزمة.
 *
 * لا ملفات تُكتب في `public/` ولا HTML محفوظ على القرص: ما يُخزَّن هو **البيانات**
 * (اسم ومسمى وبريد وجوال ورابط ونبذة ومدينة + القالب والخطة)، والـHTML يُولَّد عند
 * الطلب عبر `src/data/hosting.js`. فالموقع المستضاف والحزمة المنزّولة حرفٌ بحرف
 * من نفس الدالة، ولا نسخة ثانية تنفصم عن الأصل.
 *
 * مفاتيح التحرير: `key` الذي يُعطى مرة واحدة عند الإنشاء هو ما يملك التعديل — يُرسَل
 * في `x-qalb-site`. لا جلسة ولا كوكي، فلا يختلط أمرُ الموقع بأمرِ اللوحة.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { PLANS, droppedSiteFields, editWindow, planOf, publicUrl, quotaNotice, renderSite, sanitizeSite, slugify } from '../src/data/hosting.js'
import { writePrivateJson } from './seal.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_BODY = 64 * 1024
const json = (res, code, body, extra = {}) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    ...extra,
  })
  res.end(JSON.stringify(body))
}
/** يعيد [القيمة, هل تجاوز الحجم] دائمًا — Promise تُحلّ بقيمة واحدة، فالزوج لا بد صريح */
/** يعيد [القيمة, هل تجاوز الحجم] دائمًا — Promise تُحلّ بقيمة واحدة، فالزوج لا بد صريح */
const readBody = (req) =>
  new Promise((done) => {
    let buf = ''
    let tooBig = false
    let settled = false
    const finish = (v) => {
      if (settled) return
      settled = true
      done(v)
    }
    req.on('data', (c) => {
      if (tooBig) return // نكمل الابتلاع دون تخزين: القفل على المنفذ يبقى سليمًا
      buf += c
      if (buf.length > MAX_BODY) {
        tooBig = true
        finish([null, true])
      }
    })
    req.on('end', () => {
      if (tooBig) return
      if (!buf) return finish([{}, false])
      try {
        finish([JSON.parse(buf), false])
      } catch {
        finish([null, false])
      }
    })
    req.on('error', () => finish([null, false]))
  })

const tok = (n = 20) => randomBytes(n).toString('base64url')
const today = () => new Date().toISOString().slice(0, 10)
/** لا HTML ولا وسوم في حقل البريد: 160 حرفًا كحدٍّ أقصى، وهو حقل نصٌّ واحد */
const mailOf = (v) => {
  const s = String(v == null ? '' : v)
    .trim()
    .toLowerCase()
  return EMAIL_RE.test(s) && s.length <= 160 ? s : null
}

export function createSitesApi({ dir, env = process.env, admin = null } = {}) {
  const FILE = path.join(dir, 'sites.json')
  const ON = () => env.QALB_HOSTING !== 'off'
  const ROOT = env.QALB_HOST_ROOT || 'qalb.store'

  const all = () => {
    if (!existsSync(FILE)) return {}
    try {
      const v = JSON.parse(readFileSync(FILE, 'utf8'))
      return v && typeof v === 'object' ? v : {}
    } catch {
      // سجلّ تالف لا يطفئ كل المواقع: نبدأ من فارغ ونقول ذلك في السجل
      console.warn('qalb sites · sites.json unreadable — serving an empty registry')
      return {}
    }
  }
  const save = (map) => writePrivateJson(FILE, map)
  const get = (slug) => all()[slug] || null

  /** ما يراه العالم: لا مفتاح تحرير ولا بريد كامل إن طلب صاحبه الإخفاء */
  const pub = (site, { mine = false } = {}) => {
    const w = editWindow(site)
    return {
      slug: site.slug,
      url: `https://${site.slug}.${ROOT}`,
      plan: planOf(site.plan),
      /** رخصة White-label على هذا الموقع: قلبها الموظف بعد طلبٍ مدفوع — تُسقط الشارة والشريط */
      brandOff: !!site.brandOff,
      template: site.site.template,
      lang: site.site.lang,
      domain: site.domain || null,
      status: site.status,
      since: site.createdAt,
      updatedAt: site.updatedAt,
      quota: { month: w.month, used: w.used, max: w.max, left: w.left },
      // «بانتظار الترقية»: يشتريها المشتري من هنا ويُفعّلها الموظف من اللوحة — لا أكثر
      planPending: !!site.planPending && planOf(site.plan) === 'free',
      // مع مفتاح التحرير نعيد الحقول نفسها: الاستوديو يحرّر ما طُبِع، بلا نسخة ثانية من البيانات
      ...(mine ? { editKey: site.key, email: site.email || null, public: !!site.public, planPending: !!site.planPending, site: site.site } : {}),
    }
  }

  const uniq = (base, map) => {
    let s = base
    for (let i = 2; map[s] && i < 500; i++) s = `${base}-${i}`.slice(0, 32)
    return s
  }

  const isAdmin = (req) => !!(admin && admin.who && admin.who(req))

  async function handle(req, res, u) {
    if (!ON()) return false
    const me = isAdmin(req)

    /* ---------- الاستوديو والتسجيل ---------- */
    if (u.pathname === '/sites' && req.method === 'POST') {
      const [b, tooBig] = await readBody(req)
      if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
      if (!b) return (json(res, 400, { error: 'bad json' }), true)
      const email = mailOf(b.email)
      if (!email) return (json(res, 400, { error: 'a valid email is required to hold a site' }), true)
      const raw = { ...(b.site || {}), email: (b.site && b.site.email) || email, template: b.template || (b.site && b.site.template) }
      const site = sanitizeSite(raw)
      const dropped = droppedSiteFields(raw)
      if (!site.template) return (json(res, 400, { error: 'unknown template' }), true)
      const map = all()
      const taken = Object.keys(map)
      let slug = slugify(site.name || '') || slugify(email.split('@')[0]) || `site-${tok(2)}`
      if (taken.includes(slug)) slug = uniq(slug, map)
      if (taken.includes(slug)) return (json(res, 409, { error: 'no subdomain left for that name' }), true)
      const rec = {
        slug,
        id: `QS-${tok(3).toUpperCase()}`,
        key: tok(20),
        email,
        plan: 'free', // لا تُمنح خطة مدفوعة من المتصفح: التفعيل من الطلب أو من اللوحة
        brandOff: false, // رخصة White-label لا تُمنح من المتصفح هي الأخرى: قلبٌ من اللوحة بعد طلبٍ مدفوع
        public: b.public !== false,
        planPending: !!b.planPending, // المشتري يطلب «بلس»: لا نرفع الخطة من المتصفح، نسجّل الطلب فقط
        domain: null,
        status: 'live',
        site,
        createdAt: today(),
        updatedAt: today(),
        editMonth: editWindow({}).month,
        editCount: 0,
        history: [],
      }
      map[slug] = rec
      save(map)
      return (
        json(res, 201, {
          ...pub(rec, { mine: true }),
          notice: 'احتفظ بمفتاح التحرير: لا يُستعاد من الخادم',
          ...(dropped.length ? { dropped } : {}), // الحقل المرفوض يُذكر للمشتري، لا يُبتلع في الصمت
        }),
        true
      )
    }

    const edit = u.pathname.match(/^\/sites\/([a-z0-9][a-z0-9-]{1,31})(?:\/(.*))?$/)
    if (edit) {
      const slug = edit[1]
      const sub = edit[2] || ''
      const site = get(slug)
      if (!site) return (json(res, 404, { error: 'no such site' }), true)
      const mine = req.headers['x-qalb-site'] === site.key

      if (sub === '' && req.method === 'GET') {
        if (site.status !== 'live') return (json(res, 503, { error: 'site paused' }), true)
        // الحقول والمفتاح لمالك المفتاح فقط؛ الموظف يدير بلا نسخة من بيانات البائع
        return (json(res, 200, pub(site, { mine })), true)
      }
      if (sub === '' && req.method === 'PATCH') {
        if (!mine && !me) return (json(res, 401, { error: 'edit key required' }), true)
        const [b, tooBig] = await readBody(req)
        if (tooBig) return (json(res, 413, { error: 'body too large' }), true)
        if (!b) return (json(res, 400, { error: 'bad json' }), true)
        const map = all()
        const cur = map[slug]
        const plan = PLANS[planOf(cur.plan)]
        let editDropped = []

        if (b.domain != null) {
          if (!plan.domain)
            return (json(res, 402, { error: 'plan needed: connect a domain on Qalb Pro', plan: plan.id, price: PLANS.pro.price }), true)
          const d = String(b.domain || '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
          if (!/^[a-z0-9.-]{3,190}$/.test(d) || !d.includes('.')) return (json(res, 400, { error: 'bad domain' }), true)
          if (Object.values(map).some((x) => x.slug !== slug && x.domain === d)) return (json(res, 409, { error: 'domain already connected' }), true)
          cur.domain = d || null
          cur.domainCheckedAt = null
        }
        if (b.site) {
          const w = editWindow(cur)
          if (!w.canEdit)
            // نفس الجُملة التي تُطبع في الاستوديو: من hosting.js، لا نسخة ثانية هنا
            return (json(res, 429, { error: 'edit quota', month: w.month, used: w.used, max: w.max, plan: plan.id, ...quotaNotice(w) }), true)
          const merged = { ...cur.site, ...b.site, template: b.site.template || cur.site.template }
          const next = sanitizeSite(merged)
          if (!next.template) next.template = cur.site.template // تعديل يحمل قالبًا مكسورًا لا يهدم الموقع
          editDropped = droppedSiteFields(merged)
          cur.history = [{ at: new Date().toISOString(), site: cur.site }, ...(cur.history || [])].slice(0, 20)
          cur.site = next
          cur.editMonth = w.month
          cur.editCount = w.used + 1
        }
        if (b.public != null) cur.public = !!b.public
        if (b.planPending != null) cur.planPending = plan.id === 'free' ? !!b.planPending : false
        if (b.status && me) cur.status = b.status === 'paused' ? 'paused' : 'live'
        if (b.plan != null) {
          if (!me) return (json(res, 403, { error: 'only staff can change a plan' }), true)
          cur.plan = planOf(b.plan)
        }
        if (b.brandOff != null) {
          // رخصة White-label مثل الخطة: تُقلب من اللوحة بعد طلبٍ مدفوع — لا يشتريها الموقع لنفسه
          if (!me) return (json(res, 403, { error: 'only staff can grant the white-label licence' }), true)
          cur.brandOff = !!b.brandOff
        }
        cur.updatedAt = today()
        map[slug] = cur
        save(map)
        return (json(res, 200, { ...pub(cur, { mine }), ...(editDropped.length ? { dropped: editDropped } : {}) }), true)
      }
      if (sub === 'revert' && req.method === 'POST') {
        if (!mine && !me) return (json(res, 401, { error: 'edit key required' }), true)
        const cur0 = get(slug)
        const last = (cur0.history || [])[0]
        if (!last) return (json(res, 409, { error: 'nothing to revert' }), true)
        const map = all()
        const cur = map[slug]
        cur.site = last.site
        cur.history = cur.history.slice(1)
        cur.updatedAt = today()
        save(map)
        return (json(res, 200, pub(cur, { mine: mine || me })), true)
      }
      if (sub === 'check-domain' && req.method === 'POST') {
        if (!mine && !me) return (json(res, 401, { error: 'edit key required' }), true)
        const cur = get(slug)
        if (!cur.domain) return (json(res, 400, { error: 'no domain connected' }), true)
        // فحص حقيقي عبر DNS لا ادّعاء: إن لم يُحلّ الاسم نقول ذلك صراحةً
        const { promises: dns } = await import('node:dns')
        try {
          const recs = await dns.resolveCname(cur.domain).catch(() => [])
          const ips = await dns.resolve4(cur.domain).catch(() => [])
          const ok = recs.length > 0 || ips.length > 0
          const map = all()
          map[slug] = { ...cur, domainCheckedAt: new Date().toISOString(), domainOk: ok }
          save(map)
          return (
            json(res, ok ? 200 : 404, {
              ok,
              domain: cur.domain,
              records: [...recs, ...ips].slice(0, 4),
              ar: ok ? 'اسمك يحلّ فعلًا — سنقدّم له نفس الصفحة.' : 'لم يُحلّ الاسم بعد: أضف CNAME إلى ' + cur.slug + '.' + ROOT + ' ثم أعد الفحص.',
              en: ok
                ? 'the name resolves — the same page will be served for it.'
                : `not resolving yet: add a CNAME to ${cur.slug}.${ROOT} and check again.`,
            }),
            true
          )
        } catch (e) {
          return (json(res, 502, { ok: false, error: 'dns lookup failed', why: String(e.message || e).slice(0, 120) }), true)
        }
      }
      return (json(res, 405, { error: 'method not allowed' }), true)
    }

    /* ---------- اللوحة: القائمة والتفعيل ---------- */
    if (u.pathname === '/admin/sites' && req.method === 'GET') {
      if (!me) return (json(res, 401, { error: 'unauthorized' }), true)
      return (json(res, 200, { sites: Object.values(all()).map((s) => pub(s)) }), true)
    }
    const ad = u.pathname.match(/^\/admin\/sites\/([a-z0-9][a-z0-9-]{1,31})$/)
    if (ad) {
      if (!me) return (json(res, 401, { error: 'unauthorized' }), true)
      const map = all()
      const cur = map[ad[1]]
      if (!cur) return (json(res, 404, { error: 'no such site' }), true)
      const [b] = await readBody(req)
      if (b && b.plan != null) {
        cur.plan = planOf(b.plan)
        if (cur.plan !== 'free') cur.planPending = false // قلب الموظف للخطة يُسقط الانتظار: لا يبقى علم معلّق كاذب
      }
      if (b && b.status) cur.status = b.status === 'paused' ? 'paused' : 'live'
      if (b && b.brandOff != null) cur.brandOff = !!b.brandOff // رخصة White-label: يقلبها الموظف عند تحصيل طلب badge-off
      cur.updatedAt = today()
      map[cur.slug] = cur
      save(map)
      return (json(res, 200, pub(cur)), true) // اللوحة ترى الخطة والحالة والنطاق: لا المفتاح ولا نصّ البائع
    }

    /* ---------- التقديم: /s/<slug>/… أو <slug>.qalb.store/… ---------- */
    let slug = null
    let route = '/'
    const sp = u.pathname.match(/^\/s\/([a-z0-9][a-z0-9-]{1,31})(\/.*)?$/)
    if (sp) {
      slug = sp[1]
      route = sp[2] || '/'
    } else {
      const host = String(req.headers.host || '')
        .split(':')[0]
        .toLowerCase()
      const m = host.match(new RegExp(`^([a-z0-9][a-z0-9-]{1,31})\\.${ROOT.replace(/\./g, '\\.')}$`))
      const connected = m ? null : Object.values(all()).find((x) => x.domain === host) || null
      if (m) {
        slug = m[1]
        route = u.pathname || '/'
      } else if (connected) {
        slug = connected.slug
        route = u.pathname || '/'
      }
    }
    if (slug) {
      const site = get(slug)
      if (!site) return (json(res, 404, { error: 'no such site' }), true)
      if (site.status !== 'live') {
        res.writeHead(503, { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' })
        res.end(
          '<!doctype html><meta charset="utf-8"><title>متوقف</title><p style="font:16px system-ui;padding:2rem">هذا الموقع موقوف مؤقتًا من الاستوديو.</p>',
        )
        return true
      }
      const r = renderSite(site, route)
      if (r.status !== 200) {
        res.writeHead(r.status, { 'content-type': r.type, 'x-robots-tag': 'noindex' })
        res.end(r.body)
        return true
      }
      res.writeHead(200, {
        'content-type': r.type,
        'cache-control': 'public, max-age=60',
        // كانonical للنطاق الذي يملكه الموقع — على مستوى النقل كي لا تمس بايتات المولّد المشترك
        ...(route === '/' || route === '/index.html' ? { link: `<${publicUrl(site)}/>; rel="canonical"` } : {}),
        'x-qalb-site': `${site.slug}/${planOf(site.plan)}`,
        etag: `"${site.updatedAt}"`,
      })
      res.end(r.body)
      return true
    }

    return false
  }

  return {
    handle,
    enabled: ON,
    root: () => ROOT,
    plans: () => PLANS,
    list: () => Object.values(all()).map((s) => pub(s)),
    /** ما يراه المحاسب: كم موقعًا حيًّا وكم مشتركًا مدفوعًا */
    stats: () => {
      const v = Object.values(all())
      return {
        total: v.length,
        live: v.filter((x) => x.status === 'live').length,
        paid: v.filter((x) => planOf(x.plan) === 'pro').length,
        domains: v.filter((x) => x.domain).length,
        pending: v.filter((x) => x.planPending && planOf(x.plan) === 'free').length,
      }
    },
  }
}
