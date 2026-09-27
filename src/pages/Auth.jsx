import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSeo } from '../components/Seo'
import { Btn, Icon, Pill } from '../components/ui'
import { Logo } from '../components/Navbar'
import { auth } from '../api/auth'
import { reasonTextKey } from '../data/auth'

/**
 * الدخول والتسجيل — صفحةٌ واحدة بشكلين، بلا كلمة سر.
 *
 * لماذا بلا كلمة سر؟ لأن هذا النشر يعمل في وضعٍ محلي (لا خادم، `VITE_QALB_API=local`):
 * حقلُ كلمة سرٍّ هنا لا يحمي شيئًا — لا خادمَ يتحقّق منها، والقيمةُ نفسها تُقرأ من
 * مخزن المتصفح. فالصفحة تقول ما يحدث فعلًا: «الحساب محفوظ في هذا المتصفح»، وتترك
 * المصادقة الحقيقية (`server/admin.js` بكوكي HttpOnly وscrypt) للوحة الإدارة وحدها.
 *
 * وما تفعله فعلًا:
 *   • التسجيل: بريدٌ (+ اسمٌ اختياري) ⇒ سجلُّ حسابٍ يُفتح به `/account`، وجلسة.
 *   • الدخول: بريدٌ سُجّل على هذا الجهاز ⇒ استرجاعُ سلّته ومفضّلته وما أنجزه.
 *   • وبريدٌ مجهول لا يُنشئ حسابًا صامتًا: يُقال «لا حساب بهذا البريد» مع رابط التسجيل.
 *
 * والقوالب الجاهزة في الأعلى (`حسابات هذا الجهاز`) ليست تزيينًا: هي الطريقة الوحيدة
 * لتبديل حسابين على جهازٍ واحد بلا كلمة سر — تُملأ بالبريد بنقرة، ولا يُعرض أي سرّ.
 */

/** قائمةُ حسابات هذا الجهاز مرتَّبةً بالأحدث — تُقرأ من `auth.users()` ولا تخرج من المتصفح */
function listKnown() {
  return Object.values(auth.users()).sort((a, b) => String(b.last).localeCompare(String(a.last)))
}

export default function Auth({ mode = 'login' }) {
  const { t } = useI18n()
  const nav = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const isRegister = mode === 'register'
  const [mail, setMail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [note, setNote] = useState(null)

  // صفحةُ حساب: لا تُفهرس، ولا تُشارَك في بطاقة
  useSeo(`${isRegister ? t('auth.registerTitle') : t('auth.loginTitle')} · ${t('brand.name')}`, t('auth.seoDesc'), { robots: 'noindex' })

  /** حساباتُ هذا الجهاز: تُعرض للتبديل، وليست قائمةً عامة (لا شيء يخرج من المتصفح) */
  const [known, setKnown] = useState(() => listKnown())
  const refreshKnown = () => setKnown(listKnown())
  /** بعد الدخول نعود إلى ما كان الزائر يقصده (`?next=/cart`) — لا إلى صفحةٍ لم يطلبها */
  const next = (() => {
    const raw = sp.get('next') || ''
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : loc.state?.from || '/account'
  })()

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setNote(null)
    const r = isRegister ? await auth.register({ email: mail, name }) : await auth.login({ email: mail })
    setBusy(false)
    refreshKnown()
    if (r.ok) {
      setNote(isRegister ? t('auth.welcomeNew') : t('auth.welcomeBack'))
      nav(next, { replace: true })
      return
    }
    const key = reasonTextKey(r.reason)
    setErr(key ? t(key) : t('auth.errGeneric'))
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 grad-mesh" />
      <div className="page-x relative mx-auto grid max-w-[1180px] items-start gap-10 py-14 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:py-20">
        {/* ---------- البطاقة ---------- */}
        <section className="rounded-3xl border border-line bg-panel/70 p-6 shadow-soft sm:p-7" data-auth-form={mode}>
          <Logo />
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{t('auth.kicker')}</p>
          <h1 className="mt-2 font-display text-[27px] font-extrabold leading-tight">
            {isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{isRegister ? t('auth.registerSub') : t('auth.loginSub')}</p>

          <form className="mt-6" noValidate onSubmit={submit}>
            <label className="block text-[12.5px] font-bold" htmlFor="auth-mail">
              {t('auth.email')}
            </label>
            <input
              id="auth-mail"
              name="mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              placeholder="you@studio.sa"
              aria-invalid={err ? true : undefined}
              className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none transition focus:border-brand/50"
            />

            {isRegister && (
              <>
                <label className="mt-4 block text-[12.5px] font-bold" htmlFor="auth-name">
                  {t('auth.name')} <span className="font-medium text-dim">({t('auth.optional')})</span>
                </label>
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePh')}
                  className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-[13.5px] outline-none transition focus:border-brand/50"
                />
                {/* الإقرار كما في إنشاء الحساب: يُختم في السجلّ، فلا يُقال «وافق» على نصٍّ لم يُعرض */}
                <p className="mt-3 text-[11.5px] leading-relaxed text-dim">{t('create.consent')}</p>
              </>
            )}

            {err && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12.5px] font-bold text-danger"
                data-auth-error
              >
                {err}
              </p>
            )}
            {note && (
              <p role="status" className="mt-4 text-[12.5px] font-bold text-brand">
                {note}
              </p>
            )}

            <Btn type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
              {busy ? t('auth.working') : isRegister ? t('auth.registerCta') : t('auth.loginCta')}
            </Btn>

            <p className="mt-3 text-center text-[12.5px] text-dim">
              {isRegister ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
              <Link
                className="font-bold text-brand underline-offset-4 hover:underline"
                to={`${isRegister ? '/login' : '/register'}?next=${encodeURIComponent(next)}`}
              >
                {isRegister ? t('auth.loginCta') : t('auth.registerCta')}
              </Link>
            </p>
          </form>

          {/* حساباتُ هذا الجهاز: تبديلٌ بنقرة. لا كلمة سرٍّ تُعرض، ولا بريدٍ يخرج من المتصفح */}
          {known.length > 0 && (
            <div className="mt-6 border-t border-line pt-5" data-auth-known>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">
                {t('auth.onDevice')}
                <span className="num rounded-md border border-line bg-bg px-1.5 py-0.5 text-[10px]">{known.length}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {known.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => {
                      setMail(u.email)
                      setErr(null)
                    }}
                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-bg/60 px-2.5 py-1.5 text-[12px] font-semibold transition hover:border-brand/40 hover:text-brand"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/12 text-[10px] font-extrabold text-brand">
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate" dir="ltr">
                      {u.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-bg/60 p-3 text-[11.5px] leading-relaxed text-dim">
            <Icon n="lock" className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <span>{t('auth.localNote')}</span>
          </p>
        </section>

        {/* ---------- ما يفتحه الحساب ---------- */}
        <section className="lg:pt-6">
          <Pill tone="brand" className="mb-4">
            <Icon n="layers" className="size-3" />
            {t('auth.benefitsKicker')}
          </Pill>
          <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.1rem)] font-extrabold leading-snug">{t('auth.benefitsTitle')}</h2>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-slate-200 light:text-slate-600">{t('auth.benefitsSub')}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {['cart', 'wish', 'files', 'licence'].map((k) => (
              <li key={k} className="flex items-start gap-3 rounded-2xl border border-line bg-panel/50 p-4" data-auth-benefit={k}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
                  <Icon n={k === 'cart' ? 'cart' : k === 'wish' ? 'heart' : k === 'files' ? 'file' : 'shield'} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold">{t(`auth.b${k}`)}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-dim">{t(`auth.b${k}Sub`)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[12px] leading-relaxed text-dim">{t('auth.noMail')}</p>
        </section>
      </div>
    </div>
  )
}
