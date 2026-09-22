import { useState } from 'react'
import { useI18n, num } from '../i18n'
import { cardName, cardSvg, couponFor, shareText, svgToPng } from '../data/share'
import { shareUpsell } from '../data/upsells'
import { useStore } from '../store/StoreContext'
import { SITE_URL } from '../data/site'
import { Btn, Icon, Money, Pill } from './ui'

/**
 * بطاقةُ الجاهزية القابلة للمشاركة — تُستعمل في /match و/ats، فما يُنشر من الفاحصين
 * هو بطاقةٌ واحدة بقياسٍ واحد، لا صورتان تختلفان.
 *
 * صورتان: مجانيةٌ بشعارنا، و«موثّقة» بلا شعار تُباع (إضافة share-verified). والفرقُ
 * بينهما علامةٌ في الملف لا صورتان: البطاقةُ تُبنى في المتصفح من الرقم نفسه، فلا
 * درجةٌ في صورةٍ تخالف ما قاسه الفاحص فوقها.
 */
export default function ShareCard({ score = 0, bandLabel = '', title = '', stats = [], seed = 'qalb', path = '/ats' }) {
  const { t, lang, L } = useI18n()
  const { hasAddon, toggleAddon, toast } = useStore()
  const [note, setNote] = useState('')
  const paid = shareUpsell()
  const verified = hasAddon(paid.id)
  const url = `${SITE_URL}${path}`
  // الحسابُ رخيص والبطاقةُ تُبنى عند كل رسم: لا useMemo يعطّل مُصرِّف React بلا سبب
  const coupon = couponFor(`${seed}|${score}|${verified ? 'v' : 'f'}`)
  const svg = cardSvg({
    title,
    scoreLabel: `${num(score)}/100`,
    bandLabel,
    byLabel: verified ? t('share.verifiedTag') : t('share.badgeOn'),
    url,
    coupon: verified ? coupon : '',
    couponLabel: t('share.coupon'),
    verified,
    rtl: lang !== 'en',
    stats: stats.slice(0, 3),
  })
  const text = shareText({
    title,
    scoreLabel: `${num(score)}/100`,
    bandLabel,
    url,
    coupon: verified ? coupon : '',
    couponLabel: t('share.coupon'),
    lang,
  })

  function save(kind) {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = cardName({ slug: verified ? 'verified' : 'ats', ext: 'svg' })
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    setNote(kind === 'png' ? t('share.pngFallback') : t('share.saved'))
  }

  async function savePng() {
    const b = await svgToPng(svg)
    if (!b) return save('png')
    const href = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = href
    a.download = cardName({ slug: verified ? 'verified' : 'ats', ext: 'png' })
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    setNote(t('share.saved'))
  }

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(text)
      setNote(t('share.copied'))
    } catch {
      setNote(t('share.copyBlocked'))
    }
  }

  const share = (kind) => {
    const u = encodeURIComponent(url)
    const txt = encodeURIComponent(text)
    const map = {
      wa: `https://wa.me/?text=${txt}`,
      li: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      x: `https://x.com/intent/tweet?text=${txt}&url=${u}`,
    }
    window.open(map[kind], '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="mt-4 rounded-3xl border border-line bg-panel p-5" data-share-card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold text-ink">{t('share.title')}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t('share.sub')}</p>
        </div>
        {verified ? (
          <Pill tone="brand">
            <Icon n="check" className="size-3" sw={2.4} />
            {t('share.verified')}
          </Pill>
        ) : (
          <Pill>{t('share.badgeOn')}</Pill>
        )}
      </div>

      {/* معاينةٌ حيّة: نفسُ تتطابق مع الملف المُنزَّل لأن كليهما من cardSvg */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-bg/60">
        <div className="relative px-5 py-6" style={{ background: 'linear-gradient(120deg,#0b0e14,#131a26)' }}>
          <div className="absolute inset-x-0 top-0 h-1 bg-brand" />
          <p className="text-[13px] font-bold text-brand2" dir={lang === 'en' ? 'ltr' : 'rtl'}>
            {title}
          </p>
          <p className="num mt-2 text-[42px] font-extrabold leading-none text-white">
            {num(score)}
            <span className="text-[18px] text-dim">/100</span>
          </p>
          <p className="mt-1.5 text-[13px] font-bold text-brand">{bandLabel}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            {stats.slice(0, 3).map((s) => (
              <span key={s.k} className="text-[11px] text-dim">
                {s.k} <span className="num ms-1 text-[13px] font-bold text-ink">{s.v}</span>
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <span className="text-[11px] font-semibold text-dim">{verified ? t('share.verifiedTag') : t('share.badgeOn')}</span>
            {verified && (
              <span className="num text-[11px] font-bold text-brand">
                {t('share.coupon')} {coupon}
              </span>
            )}
          </div>
        </div>
      </div>

      {!verified && (
        <div className="mt-3.5 rounded-2xl border border-gold/35 bg-gold/[0.06] p-3.5" data-share-upsell>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-ink">{L(paid.name)}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">{L(paid.tagline)}</p>
            </div>
            <Money v={paid.price} size="text-[17px]" />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-dim">{t('share.verifiedWhy')}</p>
          <Btn
            size="sm"
            className="mt-3 w-full"
            data-share-buy
            onClick={() => {
              const added = toggleAddon(paid.id)
              toast(added ? t('cart.addonAdded', { n: L(paid.name) }) : t('cart.addonRemoved', { n: L(paid.name) }))
            }}
          >
            <Icon n={hasAddon(paid.id) ? 'check' : 'star'} className="size-4" />
            {hasAddon(paid.id) ? t('share.inCart') : t('share.buy')}
          </Btn>
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <Btn variant="outline" size="xs" onClick={() => save('svg')}>
          <Icon n="download" className="size-3.5" />
          {t('share.svg')}
        </Btn>
        <Btn variant="outline" size="xs" onClick={savePng}>
          <Icon n="download" className="size-3.5" />
          {t('share.png')}
        </Btn>
        <Btn variant="outline" size="xs" onClick={copy}>
          <Icon n="copy" className="size-3.5" />
          {t('share.copy')}
        </Btn>
        <Btn variant="ghost" size="xs" onClick={() => share('wa')}>
          {t('share.whatsapp')}
        </Btn>
        <Btn variant="ghost" size="xs" onClick={() => share('li')}>
          {t('share.linkedin')}
        </Btn>
        <Btn variant="ghost" size="xs" onClick={() => share('x')}>
          {t('share.x')}
        </Btn>
      </div>
      {note && (
        <p className="mt-2 text-[11.5px] text-brand" role="status">
          {note}
        </p>
      )}
      <p className="mt-2.5 text-[11px] leading-relaxed text-dim/80">{t('share.note')}</p>
    </section>
  )
}
