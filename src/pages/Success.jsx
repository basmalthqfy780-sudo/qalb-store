import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { fetchOrder, deliveryHref, deliveryAllHref, apiMode } from '../api'
import { useI18n, num, dec } from '../i18n'
import { byId, templates } from '../data/templates'
import { upsellById, addonDelivery } from '../data/upsells'
import { bundleZip, isProtectedDownload, kindOf, packageFiles, packageIndex, packageZip, packageName, readmeText } from '../data/deliverable'
import { kitGrantFor } from '../data/kit'
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
  const [busy, setBusy] = useState('') // معرّف القالب قيد التجهيز، أو '*' لكل الطلب
  const [failed, setFailed] = useState('')

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

  /**
   * رصيدُ مولّد التقديم يُمنح هنا وحده: بعد طلبٍ حقيقي يحمل الإضافة، ومرةً واحدة
   * لكلِّ طلب (إعادةُ فتح الإيصال لا تضاعف الرصيد). لا يُمنح شيءٌ لطلبٍ بلا الإضافة.
   */
  useEffect(() => {
    if (!order?.id || !Array.isArray(order.addons) || !order.addons.length) return
    kitGrantFor(order.id, order.addons)
  }, [order?.id, order?.addons])

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

  /** ما في هذا الطلب فعلًا: تُقرأ الحزمة من نفس مولّد التسليم، فلا وعود بلا ملفات */
  const rows = (order.lines || [])
    .map((l) => {
      const tpl = byId(l.id)
      if (!tpl) return null
      const link = deliveryHref(tpl, order)
      const local = !link && isProtectedDownload(tpl.download)
      return { tpl, qty: l.qty || 1, link, local }
    })
    .filter(Boolean)
  const zipped = rows.filter((r) => r.local) // ما يُبنى داخل المتصفح في وضع التجربة المحلي
  const hasCv = rows.some(({ tpl }) => kindOf(tpl) !== 'site')
  const allHref = rows.length > 1 ? deliveryAllHref(order) : null
  // إضافاتُ الطلب كما دُفعت: الاسم من جدول upsells، والسعر كما خُتم على الطلب
  const addonRows = (order.addons || [])
    .map((a) => {
      const u = upsellById(a.id)
      if (!u) return null
      return {
        id: a.id,
        name: lang === 'ar' ? u.name.ar : u.name.en,
        icon: u.icon,
        price: a.price ?? u.price,
        delivery: addonDelivery(a.id),
      }
    })
    .filter(Boolean)

  const saveZip = (filename, bytes) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  /** في وضع محلي بلا خادم: الحزمة تُبنى داخل المتصفح من بيانات الطلب نفسها */
  const grabPackage = async (tpl) => {
    setBusy(tpl.id)
    setFailed('')
    try {
      saveZip(packageName(tpl, order), packageZip(tpl, order))
    } catch {
      setFailed(tpl.id)
    }
    setBusy('')
  }
  const grabAll = async () => {
    setBusy('*')
    setFailed('')
    try {
      saveZip(
        `qalb-${String(order.id)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')}-all.zip`,
        bundleZip(
          rows.map((r) => r.tpl),
          order,
        ),
      )
    } catch {
      setFailed('*')
    }
    setBusy('')
  }

  /** قائمة ملفات حقيقية — لا مجلدات مُختَرَعة: نفس ما سيصلك بالضبط */
  const downloadManifest = () => {
    const blocks = rows.map(({ tpl }) => {
      const files = packageFiles(tpl, order)
      return [
        ``,
        `[${tpl.id}] ${tpl.name?.en || tpl.id} — ${tpl.type}`,
        `  delivery: ${tpl.download || 'not attached yet — ask us and we will send it'}`,
        `  ${files.length} files:`,
        ...files.map((f) => `    · ${f.path}`),
      ].join('\n')
    })
    const body = [
      `Qalb — ${lang === 'ar' ? 'قائمة ملفات التسليم' : 'delivery manifest'}`,
      `Order: ${order.id}`,
      `Date: ${order.date}`,
      `Licence key: ${order.key}`,
      `Licences: ${order.count}`,
      ...blocks,
      '',
      `Support: ${SUPPORT_MAIL}`,
    ].join('\n')
    saveFile(`qalb-${order.id}-files.txt`, body, 'text/plain;charset=utf-8')
  }

  /** الدليل = README نفسه الذي داخل الحزمة، فلا نسخة ثانية تتعارض مع الملف المُسلَّم */
  const downloadGuide = () => {
    const parts = rows.map(({ tpl }) => readmeText(tpl, order).trim()).filter(Boolean)
    const body = parts.length
      ? parts.join('\n\n---\n\n')
      : [
          `# ${lang === 'ar' ? 'دليل التشغيل السريع' : 'Quick-start guide'}`,
          `Order ${order.id} · key ${order.key}`,
          '',
          `Support: ${SUPPORT_MAIL}`,
        ].join('\n')
    saveFile(`qalb-guide-${order.id}.md`, body + '\n', 'text/markdown;charset=utf-8')
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
          {/* التسليم: كل زر هنا يقف وراءه ملف حقيقي — رابط موقّع من الخادم، أو توليد داخل متصفحك في وضع التجربة */}
          <div className="grid gap-3 border-t border-line px-6 py-5 sm:grid-cols-2">
            {rows.length > 0 &&
              (allHref ? (
                <Btn size="lg" href={allHref}>
                  <Icon n="download" className="size-4" />
                  {t('success.dlAll', { n: dec(rows.length) })}
                </Btn>
              ) : (
                <Btn size="lg" onClick={grabAll} disabled={busy === '*'}>
                  <Icon n="download" className="size-4" />
                  <span role="status" aria-live="polite">
                    {busy === '*' ? t('success.preparing') : t('success.dlAll', { n: dec(rows.length) })}
                  </span>
                </Btn>
              ))}
            <Btn size="lg" variant="outline" onClick={downloadGuide}>
              <Icon n="file" className="size-4" />
              {t('success.guide')}
            </Btn>
          </div>
          <div className="border-t border-line px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] font-bold text-muted">{t('success.files')}</p>
              <button
                type="button"
                onClick={downloadManifest}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-dim transition-colors hover:text-brand"
              >
                <Icon n="file" className="size-3.5" />
                {t('success.manifest')}
              </button>
            </div>
            {order.personalize ? (
              <p className="mt-2 flex items-start gap-2 rounded-xl border border-brand/25 bg-brand/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-dim">
                <Icon n="spark" className="mt-0.5 size-3.5 shrink-0 text-brand" />
                <span>
                  <b className="text-ink/85">{t('success.personalized')}</b>{' '}
                  {Object.entries(order.personalize)
                    .map(([k, v]) => `${t(k === 'website' ? 'personal.site' : `personal.${k}`)}: ${v}`)
                    .join(' · ')}{' '}
                  {t('success.personalizedNote')}
                </span>
              </p>
            ) : null}
            {rows.length === 0 ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{t('success.noLines')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {rows.map(({ tpl, qty, link, local }) => {
                  const n = packageIndex(tpl)
                  return (
                    <li key={tpl.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg/60 px-4 py-3">
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-[13px] font-bold">
                          {lang === 'ar' ? tpl.name?.ar : tpl.name?.en} <span className="num text-muted">×{qty}</span>
                        </span>
                        <span className="num text-[11.5px] text-dim">{t('success.pkgFiles', { n: dec(n.count), kb: dec(n.kb) })}</span>
                      </span>
                      {link ? (
                        <a
                          href={link}
                          className="inline-flex items-center gap-2 text-[12.5px] font-bold text-brand hover:underline"
                          title={t('success.signedNote')}
                        >
                          <Icon n="download" className="size-4" />
                          {t('success.dlFile')}
                        </a>
                      ) : local ? (
                        <>
                          <button
                            type="button"
                            onClick={() => grabPackage(tpl)}
                            disabled={busy === tpl.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/12 px-3 py-1.5 text-[12.5px] font-bold text-brand transition hover:bg-brand/20 disabled:opacity-60"
                          >
                            <Icon n="download" className="size-4" />
                            <span role="status" aria-live="polite">
                              {busy === tpl.id ? t('success.preparing') : t('success.dlFile')}
                            </span>
                          </button>
                          {failed === tpl.id && <span className="text-[12px] font-bold text-danger">{t('success.pkgFailed')}</span>}
                        </>
                      ) : (
                        <span className="text-[12px] text-muted">{t('success.noFile')}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {/* الإضافات: ليست ملفات تُنزَّل — تُسلَّم بالبريد خلال مهلتها أو تُفعَّل بعد الدفع، فيُقال ذلك بلا زر تحميل */}
            {addonRows.length > 0 && (
              <ul data-order-addons className="mt-3 flex flex-col gap-2">
                {addonRows.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon n={a.icon || 'spark'} className="size-4 shrink-0 text-gold" />
                      <span className="truncate text-[13px] font-bold">{a.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num text-[12.5px] font-bold">{dec(a.price)}</span>
                      <span className="num text-[11px] font-semibold text-dim">
                        {a.delivery?.kind === 'email' ? t('success.addonSla', { h: num(a.delivery.hours) }) : t('success.addonActivate')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] leading-relaxed text-dim">{t('success.licenceNote')}</p>
            {(apiMode === 'rest' || zipped.length > 0) && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{apiMode === 'rest' ? t('success.signedNote') : t('success.localNote')}</p>
            )}
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
            {['n1', 'n2', hasCv && 'n3', 'n4'].filter(Boolean).map((k, i) => (
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
                <p className="num mt-3 text-[11.5px] font-bold text-brand">
                  {x.ats ? `ATS ${x.ats}` : x.perf ? `Lighthouse ${x.perf}` : t(`nav.${x.type}`)}
                </p>
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
          <div className="flex flex-wrap gap-2">
            {bought[0] ? (
              <Btn to={`/host?template=${bought[0].id}`} size="md">
                <Icon n="globe" className="size-4" />
                {t('host.afterBuy')}
              </Btn>
            ) : null}
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
