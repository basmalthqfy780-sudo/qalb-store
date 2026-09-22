import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { num, useI18n } from '../i18n'
import { LINK_PLANS, linkUrl, readLinks, sanitizeLink, saveLink } from '../data/qalblink'
import { readTalent, removeTalent, saveTalent, talentEntry } from '../data/talent'
import { LINKEDIN_SAMPLE, missingOf, parseLinkedin, toPersonal } from '../data/linkedin'
import { badgeState } from '../data/badge'
import { badgeUpsell, linkedinUpsell, linkUpsell } from '../data/upsells'
import { useStore } from '../store/StoreContext'
import { Btn, Icon, Money, Pill } from './ui'

/**
 * أدواتُ الاستوديو: ثلاثٌ تُباع وكلها تعمل في المتصفح — الاستيراد من LinkedIn،
 * والرابط المهني (ودليل المواهب معه)، وشارة «بُنيَ بقالب» في فوتر موقعك.
 *
 * جمعتها هنا لأن مدخلها واحد: بياناتُك التي كتبتها في المحرِّر فوق. الاستيرادُ
 * يملأ الحقول، والرابطُ يُنشأ من الاسم نفسه، والشارةُ تُقرأ من خطةِ الموقع
 * وإضافاتِ الطلب — لا إعدادٌ ثانٍ ولا حساب.
 *
 * بوّابةُ الدفع صريحة: الاستيراد يُقرأ مجانًا وترى ما فُهم منه قبل أن تدفع، والملءُ
 * هو ما يُشترى. هكذا يعرف المشتري ما يشتريه قبل أن يشتريه.
 */
export default function StudioTools({ rec = null, form = {}, set = () => {} }) {
  const { t, L } = useI18n()
  const { hasAddon, toggleAddon, toast } = useStore()
  const [raw, setRaw] = useState('')
  const [draft, setDraft] = useState(null)
  const [handle, setHandle] = useState('')
  const [links, setLinks] = useState(() => readLinks())
  const [talent, setTalent] = useState(() => readTalent())
  const [note, setNote] = useState('')

  const liPaid = hasAddon(linkedinUpsell().id)
  const plus = hasAddon(linkUpsell().id)
  const badge = badgeState({ plan: rec?.plan || 'free', addons: [] })

  const suggested = useMemo(() => {
    const name = form.name || rec?.site?.name || ''
    return sanitizeLink({ name }).handle || ''
  }, [form.name, rec])

  function parse() {
    const d = parseLinkedin(raw)
    setDraft(d)
    setNote('')
  }

  function fill() {
    if (!liPaid) return setNote(t('li.gate'))
    if (!draft) return
    const p = toPersonal(draft)
    set('name', p.name || form.name || '')
    if (p.role) set('role', p.role)
    if (p.bio) set('bio', p.bio)
    if (p.website) set('website', p.website)
    // المدينةُ من سطرِ LinkedIn الثاني: تُملأ إن كانت فارغة
    if (!form.city && draft.city) set('city', draft.city)
    setNote(t('li.filled'))
  }

  function createLink() {
    const r = saveLink({
      handle: handle || suggested,
      name: form.name || rec?.site?.name || '',
      role: form.role || rec?.site?.role || '',
      city: form.city || rec?.site?.city || '',
      bio: form.bio || rec?.site?.bio || '',
      email: form.email || rec?.site?.email || '',
      site: form.website || rec?.site?.website || '',
      template: form.template || rec?.site?.template || '',
      plan: plus ? 'plus' : 'free',
    })
    if (!r.ok) return setNote(t('link.needName'))
    setLinks(readLinks())
    setHandle(r.value.handle)
    setNote(t('link.saved'))
  }

  function toggleTalent(h) {
    if (talent.some((x) => x.handle === h)) {
      setTalent(removeTalent(h))
      setNote(t('link.talentOff'))
      return
    }
    const link = links.find((l) => l.handle === h)
    if (!link) return
    saveTalent(talentEntry({ ...link, handle: h }))
    setTalent(readTalent())
    setNote(t('link.talentOn'))
  }

  async function copy(h) {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(linkUrl(h))
      setNote(t('link.copied'))
    } catch {
      setNote(t('link.copyBlocked'))
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-bg/50 p-5" data-studio-tools>
      <h2 className="font-display text-[15.5px] font-extrabold">{t('studio.tools.title')}</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-dim">{t('studio.tools.sub')}</p>

      {/* ------------------------------ ١. من LinkedIn ------------------------------ */}
      <div className="mt-4 rounded-2xl border border-line bg-panel/70 p-4" data-tool-linkedin>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13.5px] font-extrabold text-ink">{t('li.title')}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('li.sub')}</p>
          </div>
          <Pill tone={liPaid ? 'brand' : 'line'}>{liPaid ? t('li.unlocked') : t('li.locked')}</Pill>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-bold text-dim">{t('li.paste')}</span>
          <textarea
            rows={5}
            dir="auto"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t('li.ph')}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-[12.5px] leading-relaxed outline-none placeholder:text-dim/60 focus:border-brand/60"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Btn size="xs" variant="outline" onClick={parse} disabled={raw.trim().length < 20} data-li-parse>
            <Icon n="scan" className="size-3.5" />
            {t('li.parse')}
          </Btn>
          <Btn size="xs" variant="ghost" onClick={() => setRaw(LINKEDIN_SAMPLE)}>
            <Icon n="spark" className="size-3.5" />
            {t('li.sample')}
          </Btn>
          <Btn size="xs" variant="ghost" onClick={fill} disabled={!draft} data-li-fill>
            <Icon n={liPaid ? 'check' : 'lock'} className="size-3.5" />
            {t('li.fill')}
          </Btn>
        </div>

        {draft && (
          <div className="mt-3 rounded-xl border border-line bg-bg/60 p-3" data-li-draft>
            <p className="text-[11.5px] font-bold text-dim">{t('li.found')}</p>
            <ul className="mt-1.5 grid gap-1 text-[12px] text-ink sm:grid-cols-2">
              <li>
                {t('li.name')}: {draft.name || '—'}
              </li>
              <li>
                {t('li.role')}: {draft.role || '—'}
              </li>
              <li>
                {t('li.jobs')}: <span className="num">{num((draft.jobs || []).length)}</span>
              </li>
              <li>
                {t('li.skills')}: <span className="num">{num((draft.skills || []).length)}</span>
              </li>
            </ul>
            {missingOf(draft).length ? (
              <p className="mt-2 text-[11.5px] text-dim">
                {t('li.missing')}:{' '}
                {missingOf(draft)
                  .map((k) => t(`li.m_${k}`))
                  .join('، ')}
              </p>
            ) : null}
          </div>
        )}

        {!liPaid && (
          <div className="mt-3 rounded-xl border border-gold/35 bg-gold/[0.06] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-ink">{L(linkedinUpsell().name)}</p>
                <p className="mt-0.5 text-[11.5px] text-dim">{L(linkedinUpsell().tagline)}</p>
              </div>
              <Money v={linkedinUpsell().price} size="text-[16px]" />
            </div>
            <Btn
              size="xs"
              className="mt-2.5 w-full"
              data-li-buy
              onClick={() => {
                const added = toggleAddon(linkedinUpsell().id)
                toast(added ? t('cart.addonAdded', { n: L(linkedinUpsell().name) }) : t('cart.addonRemoved', { n: L(linkedinUpsell().name) }))
              }}
            >
              <Icon n={hasAddon(linkedinUpsell().id) ? 'check' : 'cart'} className="size-3.5" />
              {hasAddon(linkedinUpsell().id) ? t('li.inCart') : t('li.buy')}
            </Btn>
          </div>
        )}
        <p className="mt-2.5 text-[11px] leading-relaxed text-dim/80">{t('li.note')}</p>
      </div>

      {/* ------------------------------ ٢. الرابط المهني ------------------------------ */}
      <div className="mt-3 rounded-2xl border border-line bg-panel/70 p-4" data-tool-link>
        <p className="text-[13.5px] font-extrabold text-ink">{t('link.createTitle')}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('link.createSub')}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            dir="ltr"
            value={handle || suggested}
            onChange={(e) =>
              setHandle(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, 32),
              )
            }
            placeholder="noura-alharbi"
            aria-label={t('link.handle')}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 font-mono text-[13px] outline-none focus:border-brand/60"
          />
          <Btn size="md" onClick={createLink} data-link-create>
            <Icon n="check" className="size-4" />
            {t('link.save')}
          </Btn>
        </div>

        {links.length ? (
          <ul className="mt-3 flex flex-col gap-1.5">
            {links.map((l) => (
              <li key={l.handle} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-bg/60 p-2">
                <span dir="ltr" className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">
                  {linkUrl(l.handle).replace(/^https?:\/\//, '')}
                </span>
                <Btn size="xs" variant="ghost" onClick={() => copy(l.handle)}>
                  <Icon n="copy" className="size-3.5" />
                  {t('link.copy')}
                </Btn>
                <Link to={`/u/${l.handle}`} className="text-[11.5px] font-bold text-brand hover:underline">
                  {t('link.open')}
                </Link>
                <Btn size="xs" variant={talent.some((x) => x.handle === l.handle) ? 'ghost' : 'outline'} onClick={() => toggleTalent(l.handle)}>
                  <Icon n={talent.some((x) => x.handle === l.handle) ? 'close' : 'pulse'} className="size-3.5" />
                  {talent.some((x) => x.handle === l.handle) ? t('link.talentOff') : t('link.talent')}
                </Btn>
              </li>
            ))}
          </ul>
        ) : null}

        {!plus && (
          <div className="mt-3 rounded-xl border border-gold/35 bg-gold/[0.06] p-3" data-tool-link-plus>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-ink">{L(linkUpsell().name)}</p>
                <p className="mt-0.5 text-[11.5px] text-dim">{L(linkUpsell().tagline)}</p>
              </div>
              <Money v={linkUpsell().price} size="text-[16px]" />
            </div>
            <p className="mt-1.5 text-[11.5px] text-dim">{t('link.plusWhy')}</p>
            <Btn
              size="xs"
              className="mt-2.5 w-full"
              data-link-plus-buy
              onClick={() => {
                const added = toggleAddon(linkUpsell().id)
                toast(added ? t('cart.addonAdded', { n: L(linkUpsell().name) }) : t('cart.addonRemoved', { n: L(linkUpsell().name) }))
              }}
            >
              <Icon n={hasAddon(linkUpsell().id) ? 'check' : 'cart'} className="size-3.5" />
              {hasAddon(linkUpsell().id) ? t('link.inCart') : t('link.buyPlus')}
            </Btn>
          </div>
        )}
        <p className="mt-2.5 text-[11px] leading-relaxed text-dim/80">
          {t('link.planNote')} {plus ? L(LINK_PLANS.plus.name) : L(LINK_PLANS.free.name)}
        </p>
      </div>

      {/* ------------------------------ ٣. الشارة ------------------------------ */}
      <div className="mt-3 rounded-2xl border border-line bg-panel/70 p-4" data-tool-badge>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13.5px] font-extrabold text-ink">{t('badge.title')}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-dim">{t('badge.sub')}</p>
          </div>
          <Pill tone={badge.shown ? 'line' : 'brand'}>
            {badge.shown ? t('badge.on') : badge.reason === 'plan' ? t('badge.offPlan') : t('badge.offPaid')}
          </Pill>
        </div>

        <p className="mt-2.5 rounded-xl border border-line bg-bg/60 p-2.5 text-[12px] leading-relaxed text-dim" data-badge-preview>
          {badge.shown ? t('badge.previewOn') : t('badge.previewOff')}
        </p>

        {badge.shown ? (
          <div className="mt-3 rounded-xl border border-gold/35 bg-gold/[0.06] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-ink">{L(badgeUpsell().name)}</p>
                <p className="mt-0.5 text-[11.5px] text-dim">{L(badgeUpsell().tagline)}</p>
              </div>
              <Money v={badgeUpsell().price} size="text-[16px]" />
            </div>
            <Btn
              size="xs"
              className="mt-2.5 w-full"
              data-badge-buy
              onClick={() => {
                const added = toggleAddon(badgeUpsell().id)
                toast(added ? t('cart.addonAdded', { n: L(badgeUpsell().name) }) : t('cart.addonRemoved', { n: L(badgeUpsell().name) }))
              }}
            >
              <Icon n={hasAddon(badgeUpsell().id) ? 'check' : 'cart'} className="size-3.5" />
              {hasAddon(badgeUpsell().id) ? t('badge.inCart') : t('badge.buy')}
            </Btn>
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              {t('badge.freeWith', { n: num(19) })} ·{' '}
              <Link to="/host" className="font-bold text-brand hover:underline">
                {t('badge.seePlans')}
              </Link>
            </p>
          </div>
        ) : (
          <p className="mt-2.5 text-[11.5px] text-dim">{t('badge.note')}</p>
        )}
      </div>

      {note && (
        <p className="mt-3 text-[11.5px] text-brand" role="status">
          {note}
        </p>
      )}
    </section>
  )
}
