import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { fetchOrder } from '../api'
import { useI18n, dec } from '../i18n'
import { byId, templates } from '../data/templates'
import { SUPPORT_MAIL } from '../data/contact'
import { Btn, Icon, Money, Pill } from '../components/ui'
import { useSeo } from '../components/Seo'

export default function Success() {
  const { t, lang, L } = useI18n()
  useSeo(`${t('success.title')} · ${t('brand.name')}`, t('meta.successDesc'), { robots: 'noindex,follow' })
  const loc = useLocation()
  const [sp] = useSearchParams()
  const wanted = sp.get('id')
  const [remote, setRemote] = useState(undefined)
  const [copyState, setCopyState] = useState('') // '' | 'ok' | 'fail' — declared before any early return

  // /order?id=QALB-… resolves through the transport, so a receipt link sent by
  // e-mail still opens on a device with no local history
  useEffect(() => {
    if (!wanted) return
    let on = true
    fetchOrder(wanted)
      .then((o) => on && setRemote(o || { missing: true, id: wanted }))
      .catch(() => on && setRemote({ missing: true, id: wanted }))
    return () => {
      on = false
    }
  }, [wanted])

  const order = useMemo(() => {
    if (loc.state?.order) return loc.state.order
    if (wanted) return remote // still undefined while the transport resolves
    try {
      const raw = localStorage.getItem('qalb.lastOrder')
      if (raw) return JSON.parse(raw)
    } catch {
      /* localStorage may be full or blocked — never a hard requirement */
    }
    return null
  }, [loc.state, wanted, remote])

  if (wanted && order === undefined) {
    return (
      <div role="status" className="page-x mx-auto max-w-[1400px] py-28 text-center">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="mt-4 text-[13px] text-dim">{t('misc.loading')}</p>
      </div>
    )
  }

  if (!order || order.missing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
        <h1 className="font-display text-2xl font-extrabold">{t('misc.404')}</h1>
        <Btn to="/templates" className="mt-6">
          {t('cart.browse')}
        </Btn>
      </div>
    )
  }

  const bought = order.lines?.length ? order.lines.map((l) => byId(l.id)).filter(Boolean) : templates.filter((x) => x.featured).slice(0, 3)

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(order.key)
      setCopyState('ok')
    } catch {
      // The clipboard is blocked on insecure origins or without permission.
      // Report that instead of claiming a copy that never happened.
      setCopyState('fail')
    }
    setTimeout(() => setCopyState(''), 2400)
  }

  const saveFile = (filename, body, mime) => {
    const url = URL.createObjectURL(new Blob([body], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  /** A manifest generated from the real order lines — not a copy of the guide. */
  const downloadFiles = () => {
    const rows = (order.lines || [])
      .map((l) => ({ tpl: byId(l.id), qty: l.qty }))
      .filter((r) => r.tpl)
      .flatMap(({ tpl, qty }) => {
        const files = (tpl.stack && tpl.stack.length ? tpl.stack : ['README']).map(
          (tech) =>
            `  · ${tpl.id}/${String(tech)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')}/`,
        )
        return [`\n[${tpl.id}] ${tpl.name.en} — ${tpl.type} x${qty}`, ...files]
      })
    const body = [
      `Qalb — ${lang === 'ar' ? 'حزمة التسليم' : 'delivery manifest'}`,
      `Order: ${order.id}`,
      `Date: ${order.date}`,
      `Licence key: ${order.key}`,
      `Licences: ${order.count}`,
      ...rows,
      '',
      `Support: ${SUPPORT_MAIL}`,
    ].join('\n')
    saveFile(`qalb-${order.id}-files.txt`, body, 'text/plain;charset=utf-8')
  }

  const downloadGuide = () => {
    const body = [
      `# ${lang === 'ar' ? 'دليل التشغيل السريع' : 'Quick-start guide'}`,
      `Order ${order.id} · key ${order.key}`,
      '',
      '```bash',
      'git clone <repo-from-your-email> my-profile && cd my-profile',
      'npm install && cp .env.example .env',
      'npm run dev',
      '```',
      '',
      ...(lang === 'ar'
        ? [
            '1. عدّل content/profile.json: الاسم، الدور، الروابط، وحالة التوفر.',
            '2. لكل عمل ملف content/work/*.mdx: العنوان والصور وماذا فعلت بالضبط.',
            '3. السيرة تُبنى من نفس البيانات: npm run build:cv ثم افحصها بفاحص ATS.',
            '4. الهوية في src/styles/tokens.css — لون وخط واحد يسريان على الموقع والسيرة.',
            '5. النشر: npm run build && npx vercel deploy --prod',
            '',
            `الدعم: ${SUPPORT_MAIL}`,
          ]
        : [
            '1. Edit content/profile.json: name, role, links, availability flag.',
            '2. One MDX file per project: title, images, and what you actually did.',
            '3. The CV builds from the same data: npm run build:cv, then run an ATS check.',
            '4. The identity lives in src/styles/tokens.css - one colour and face drive both files.',
            '5. Deploy: npm run build && npx vercel deploy --prod',
            '',
            `Support: ${SUPPORT_MAIL}`,
          ]),
    ].join('\n')
    saveFile(`qalb-quickstart-${order.id}.md`, body, 'text/markdown;charset=utf-8')
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] grad-mesh" />
      <div className="page-x relative mx-auto max-w-[760px] py-16">
        <div className="flex flex-col items-center text-center">
          <span className="relative grid size-20 animate-pop place-items-center rounded-3xl border border-brand/40 bg-brand/12 text-brand">
            <Icon n="check" className="size-9" sw={2.6} />
            <span className="absolute inset-0 animate-ping rounded-3xl border border-brand/25" />
          </span>
          <h1 className="mt-7 font-display text-[34px] font-extrabold leading-tight sm:text-[42px]">{t('success.title')}</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-dim">{t('success.sub', { email: order.email })}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Pill tone="brand">
              <Icon n="check" className="size-3" sw={2.8} />
              {order.id}
            </Pill>
            <Pill>{order.date}</Pill>
            <Pill>
              {t('checkout.method')}: {order.methodLabel || order.method}
            </Pill>
            <Pill tone="gold">
              <Icon n="shield" className="size-3" />
              {t('cart.total')}
              <Money v={order.total} size="text-[11px]" />
              <span className="opacity-70">· {t('cart.vat')}</span>
            </Pill>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-panel shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <p className="font-display text-[16px] font-extrabold">{t('success.key')}</p>
            <span className="num text-[13px] font-bold text-brand">
              {dec(order.total)} {lang === 'ar' ? 'ر.س' : 'SAR'}
            </span>
          </div>
          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center">
            <code
              dir="ltr"
              className="num flex-1 rounded-xl border border-dashed border-line bg-bg px-4 py-3 text-center text-[14px] font-bold tracking-[0.06em]"
            >
              {order.key}
            </code>
            <button
              type="button"
              onClick={copy}
              className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border bg-bg px-4 text-[13px] font-bold transition ${
                copyState === 'fail' ? 'border-danger/50 text-danger' : 'border-line hover:border-brand/50 hover:text-brand'
              }`}
            >
              <Icon
                n={copyState === 'ok' ? 'check' : copyState === 'fail' ? 'close' : 'copy'}
                className="size-4"
                sw={copyState === 'ok' ? 2.6 : 1.8}
              />
              <span role="status" aria-live="polite">
                {copyState === 'ok' ? t('success.copied') : copyState === 'fail' ? t('success.copyFail') : t('success.copy')}
              </span>
            </button>
          </div>
          <div className="grid gap-3 border-t border-line px-6 py-5 sm:grid-cols-2">
            <Btn size="lg" onClick={downloadFiles}>
              <Icon n="download" className="size-4" />
              {t('success.dl')}
            </Btn>
            <Btn size="lg" variant="outline" onClick={downloadGuide}>
              <Icon n="file" className="size-4" />
              {t('success.guide')}
            </Btn>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-bg/40 px-6 py-4 text-[12.5px]">
            {[
              { to: `/licence?key=${encodeURIComponent(order.key)}`, label: t('licence.title'), icon: 'shield' },
              { to: `/track?email=${encodeURIComponent(order.email)}`, label: t('track.title'), icon: 'mail' },
            ].map((x) => (
              <Link key={x.to} to={x.to} className="inline-flex items-center gap-1.5 font-semibold text-dim transition-colors hover:text-brand">
                <Icon n={x.icon} className="size-3.5" />
                {x.label}
                <Icon n="arrow" className="size-3.5 rtl:-scale-x-100" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-line bg-panel/60 p-6">
          <h2 className="font-display text-[18px] font-extrabold">{t('success.next')}</h2>
          <ol className="mt-5 space-y-4">
            {['n1', 'n2', 'n3', 'n4'].map((k, i) => (
              <li key={k} className="flex gap-4">
                <span className="num grid size-8 shrink-0 place-items-center rounded-full border border-line bg-bg text-[13px] font-extrabold text-brand">
                  {i + 1}
                </span>
                <p className="pt-1.5 text-[14px] leading-relaxed text-dim">{t(`success.${k}`)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
            {lang === 'ar' ? 'أضفتها لطلبك' : 'Included with your order'}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {bought.map((x) => (
              <Link
                key={x.id}
                to={`/template/${x.slug}`}
                className="group rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-1 hover:border-brand/40"
              >
                <p className="truncate font-display text-[15px] font-extrabold group-hover:text-brand">{L(x.name)}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-dim">{L(x.tagline)}</p>
                <p className="num mt-3 text-[11.5px] font-bold text-brand">ATS {x.ats}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-panel p-6">
          <div>
            <p className="font-display text-[16px] font-extrabold">{t('success.support')}</p>
            <p className="mt-1 text-[13px] text-dim">
              {t('product.support')} · {SUPPORT_MAIL}
            </p>
          </div>
          <div className="flex gap-2">
            <Btn to="/templates" variant="outline" size="md">
              {t('cart.browse')}
            </Btn>
            <Btn to="/" size="md">
              {t('success.backHome')}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
