import { useState } from 'react'
import { Link } from 'react-router-dom'
import { claimFree, subscribe, apiMode } from '../api'
import { useI18n } from '../i18n'
import { useSeo } from '../components/Seo'
import { byId } from '../data/templates'
import { SUPPORT_MAIL, SUPPORT_MAILTO } from '../data/contact'
import Preview from '../components/Preview'
import { Btn, Icon, Pill } from '../components/ui'

/**
 * القالب المجاني مقابل البريد — صفحةٌ واحدة، ووعدٌ واحد: ملفٌ يُسلَّم الآن.
 *
 * لماذا قالبٌ كاملٌ لا «دليل من عشر صفحات»؟ لأن الزائر يملك عشرة أدلة ولا يقرأ
 * واحدًا، ولا يملك موقعًا. القالبُ يُنزَّل ويُنشر، والنشرةُ بعدَهُ اختيارٌ لا شرط:
 * خانةٌ واحدةٌ محدَّدةٌ سلفًا، تُفصَل عن التسليم — فمن أراد الملف وحده أخذه.
 *
 * والفرقُ بين الوضعين صريحٌ في الصفحة: مع خادمٍ موصول يعطيها رابطًا موقّعًا
 * ومفتاح ترخيص؛ وبلا خادم (تجربة محلية) تقول ذلك وتفتح بريدًا يصل فعلًا،
 * بدل زرٍّ يفتح على فراغ.
 */
export default function Free() {
  const { t, lang, L } = useI18n()
  const id = byId('folio') ? 'folio' : null
  const tpl = id ? byId(id) : null
  const [mail, setMail] = useState('')
  const [name, setName] = useState('')
  const [wantNews, setWantNews] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [got, setGot] = useState(null)

  useSeo(t('freebie.title'), t('freebie.meta'), {})

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.trim())) return setErr(t('freebie.errMail'))
    setErr('')
    setBusy(true)
    // النشرةُ خطوةٌ مستقلة: من أراد الملف وحده فالتسليم لا يتوقف عليها
    if (wantNews) await subscribe(mail.trim(), { name: name || null, source: 'free-template', locale: lang })
    const res = await claimFree(mail.trim(), name, id)
    setBusy(false)
    if (res?.ok) return setGot(res)
    setErr(t('freebie.errFail'))
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grad-mesh" />
      <div className="page-x relative mx-auto grid max-w-[1180px] items-start gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-24">
        <div>
          <Pill tone="brand">
            <Icon n="gift" className="size-3.5" />
            {t('freebie.kicker')}
          </Pill>
          <h1 className="mt-5 font-display text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.1] tracking-tight">{t('freebie.title')}</h1>
          <p className="mt-4 max-w-xl text-[16px] leading-[1.85] text-dim">{t('freebie.sub')}</p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {['i1', 'i2', 'i3', 'i4'].map((k) => (
              <li key={k} className="flex gap-2.5 rounded-2xl border border-line bg-panel/70 p-3.5">
                <Icon n="check" className="mt-0.5 size-4 shrink-0 text-brand" sw={2.6} />
                <span className="text-[13px] leading-relaxed">{t(`freebie.${k}`)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-3xl border border-line bg-panel/60 p-5">
            <p className="font-display text-[15px] font-extrabold">{t('freebie.newsletterTitle')}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{t('freebie.newsletterSub')}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-panel p-6 shadow-lift">
          {tpl ? (
            <div className="overflow-hidden rounded-2xl border border-line">
              <Preview tpl={tpl} device="desktop" chrome />
            </div>
          ) : null}

          {got ? (
            <div className="mt-5" data-free-done>
              <p className="font-display text-[16px] font-extrabold">{t('freebie.done')}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{t('freebie.doneSub')}</p>
              <a
                href={got.download}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-bold text-bg transition hover:bg-brand light:bg-brand light:text-brandink"
              >
                <Icon n="download" className="size-4" />
                {t('freebie.download')}
              </a>
              <dl className="mt-4 grid gap-2 rounded-2xl border border-line bg-bg p-4 text-[12.5px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-dim">{t('freebie.order')}</dt>
                  <dd className="num font-bold">{got.order?.id}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-dim">{t('freebie.key')}</dt>
                  <dd className="num font-bold">{got.order?.key}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('freebie.note')}</p>
              <Link to="/track" className="mt-3 inline-block text-[12.5px] font-bold text-brand hover:underline">
                {t('freebie.track')}
              </Link>
            </div>
          ) : apiMode !== 'rest' ? (
            <div className="mt-5 rounded-2xl border border-line bg-bg p-4" data-free-local>
              <p className="text-[13px] leading-relaxed text-dim">{t('freebie.localNote')}</p>
              <a
                href={SUPPORT_MAILTO}
                className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand/45 bg-brand/10 px-4 text-[13px] font-bold text-brand transition hover:bg-brand/20"
              >
                <Icon n="mail" className="size-4" />
                {SUPPORT_MAIL}
              </a>
            </div>
          ) : (
            <form className="mt-5" onSubmit={submit} noValidate data-free-form>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('freebie.mail')}</span>
                <input
                  type="email"
                  value={mail}
                  onChange={(e) => setMail(e.target.value)}
                  placeholder="you@work.com"
                  dir="ltr"
                  className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[13.5px] font-semibold outline-none focus:border-brand/50"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{t('freebie.name')}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'ar' ? 'سارة العتيبي' : 'Sarah Al-Otaibi'}
                  className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[13.5px] font-semibold outline-none focus:border-brand/50"
                />
              </label>
              <label className="mt-4 flex items-start gap-2.5">
                <input type="checkbox" checked={wantNews} onChange={(e) => setWantNews(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
                <span className="text-[12px] leading-relaxed text-dim">{t('freebie.optIn')}</span>
              </label>
              {err ? (
                <p role="alert" className="mt-3 text-[12px] font-bold text-danger">
                  {err}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-bold text-bg transition hover:bg-brand disabled:opacity-60 light:bg-brand light:text-brandink"
              >
                <Icon n={busy ? 'refresh' : 'download'} className="size-4" />
                {busy ? t('freebie.busy') : t('freebie.submit')}
              </button>
              <p className="mt-3 text-[11px] leading-relaxed text-dim">{t('freebie.privacy')}</p>
            </form>
          )}
        </div>
      </div>

      <div className="page-x mx-auto max-w-[1180px] pb-20">
        <Btn to="/templates" variant="outline" size="md">
          {t('freebie.browse')}
          <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
        </Btn>
      </div>
    </div>
  )
}
