import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import Preview, { showSite } from './Preview'
import { Btn, Icon, Money, Pill, Stars } from './ui'
import { useI18n } from '../i18n'
import { useStore } from '../store/StoreContext'
import { LAYOUTS, PALETTE, FONTS, HEROES, GALLERIES, DEVICES, accentHex } from '../data/templates'

export default function QuickView({ tpl, onClose, initial = {} }) {
  const { t, L } = useI18n()
  const { add, toast, inCart } = useStore()
  const isBundle = tpl.type === 'bundle'
  const [kind, setKind] = useState(initial.kind || (showSite(tpl) ? 'site' : 'cv'))
  const [device, setDevice] = useState('desktop')
  const [theme, setTheme] = useState(tpl.theme || 'light')
  const [hero, setHero] = useState(initial.hero || tpl.siteHero || 'split')
  const [gallery, setGallery] = useState(initial.gallery || tpl.siteGallery || 'grid3')
  const [layout, setLayout] = useState(initial.layout || tpl.layout || 'single')
  const [acc, setAcc] = useState(initial.accent || tpl.accent || 'azure')
  const [fnt, setFnt] = useState(initial.font || tpl.font || 'sans')

  const boxRef = useRef(null)

  useEffect(() => {
    const prevFocus = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // the dialog is portalled to <body>, so the app behind it leaves the
    // accessibility tree and the tab order
    const app = document.getElementById('root')
    app?.setAttribute('inert', '')
    app?.setAttribute('aria-hidden', 'true')
    const box = boxRef.current
    const focusables = () =>
      box ? [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled) : []
    // focus the dialog itself: the label is announced, and the first Tab lands
    // on the close button
    const t = setTimeout(() => box?.focus?.(), 0)
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      // keep keyboard focus inside the dialog
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      app?.removeAttribute('inert')
      app?.removeAttribute('aria-hidden')
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
  }, [onClose])

  const hex = accentHex(acc)
  const viewingSite = kind === 'site'

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={L(tpl.name)}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={boxRef}
        tabIndex={-1}
        className="thin-bar relative grid max-h-[92vh] w-full max-w-5xl animate-[pop_.3s_cubic-bezier(.2,.9,.3,1.3)] gap-6 overflow-auto rounded-3xl border border-line bg-bg p-5 shadow-lift outline-none md:grid-cols-[minmax(0,1fr)_310px] md:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('misc.closePreview')}
          className="absolute end-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-line bg-panel text-dim transition hover:text-ink"
        >
          <Icon n="close" className="size-4" />
        </button>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill tone="brand">
              <Icon n={viewingSite ? 'monitor' : 'file'} className="size-3" />
              {t('product.preview')}
            </Pill>
            {tpl.perf && (
              <Pill>
                {t('product.perfScore')} {tpl.perf}
              </Pill>
            )}
            {tpl.ats && (
              <Pill>
                {t('product.atsScore')} {tpl.ats}
              </Pill>
            )}
            {isBundle && (
              <span className="ms-auto inline-flex rounded-lg border border-line bg-panel p-0.5">
                {[
                  ['site', t('product.siteView')],
                  ['cv', t('product.cvView')],
                ].map(([v, lb]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setKind(v)}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-bold transition ${kind === v ? 'bg-ink text-bg light:bg-brand light:text-brandink' : 'text-dim hover:text-ink'}`}
                  >
                    {lb}
                  </button>
                ))}
              </span>
            )}
          </div>

          <div className={`mx-auto ${viewingSite ? 'max-w-[560px]' : 'max-w-[380px]'}`}>
            <Preview
              tpl={tpl}
              kind={isBundle ? kind : undefined}
              device={device}
              theme={viewingSite ? theme : undefined}
              hero={hero}
              gallery={gallery}
              layout={layout}
              accent={hex}
              font={fnt}
              variant="full"
              chrome={viewingSite}
              className="rounded-xl"
            />
          </div>

          {viewingSite && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {DEVICES.map((dv) => (
                <button
                  type="button"
                  key={dv.id}
                  onClick={() => setDevice(dv.id)}
                  className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition ${
                    device === dv.id ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line text-dim hover:text-ink'
                  }`}
                >
                  <Icon
                    n={dv.id === 'desktop' ? 'monitor' : dv.id === 'tablet' ? 'tablet' : 'smartphone'}
                    className="me-1 inline size-3.5 align-[-2px]"
                  />
                  {L(dv)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-display text-2xl font-extrabold">{L(tpl.name)}</h3>
            <p className="mt-1 text-[13px] text-dim">{L(tpl.tagline)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Stars value={tpl.rating} />
            <span className="text-[12px] text-dim">({tpl.reviews})</span>
          </div>
          <p className="line-clamp-4 text-[13.5px] leading-relaxed text-dim">{L(tpl.desc)}</p>

          <div className="grid gap-3 rounded-2xl border border-line bg-panel p-3.5">
            <Group label={t('product.color')}>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setAcc(c.id)}
                    title={L(c)}
                    aria-label={L(c)}
                    className={`size-6 rounded-full border-2 transition ${acc === c.id ? 'scale-110 border-ink' : 'border-transparent hover:scale-105'}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </Group>

            {viewingSite ? (
              <>
                <Group label={t('product.theme')}>
                  <div className="flex gap-1.5">
                    {[
                      ['light', t('product.light')],
                      ['dark', t('product.dark')],
                    ].map(([v, lb]) => (
                      <Toggle key={v} on={theme === v} onClick={() => setTheme(v)}>
                        {lb}
                      </Toggle>
                    ))}
                  </div>
                </Group>
                <Group label={t('product.heroStyle')}>
                  <div className="flex flex-wrap gap-1.5">
                    {HEROES.map((o) => (
                      <Toggle key={o.id} on={hero === o.id} onClick={() => setHero(o.id)}>
                        {L(o)}
                      </Toggle>
                    ))}
                  </div>
                </Group>
                <Group label={t('product.gallery')}>
                  <div className="flex flex-wrap gap-1.5">
                    {GALLERIES.map((o) => (
                      <Toggle key={o.id} on={gallery === o.id} onClick={() => setGallery(o.id)}>
                        {L(o)}
                      </Toggle>
                    ))}
                  </div>
                </Group>
              </>
            ) : (
              <>
                <Group label={t('product.layout')}>
                  <div className="flex flex-wrap gap-1.5">
                    {LAYOUTS.map((o) => (
                      <Toggle key={o.id} on={layout === o.id} onClick={() => setLayout(o.id)}>
                        {L(o)}
                      </Toggle>
                    ))}
                  </div>
                </Group>
                <Group label={t('product.font')}>
                  <div className="flex flex-wrap gap-1.5">
                    {FONTS.map((o) => (
                      <Toggle key={o.id} on={fnt === o.id} onClick={() => setFnt(o.id)}>
                        {L(o)}
                      </Toggle>
                    ))}
                  </div>
                </Group>
              </>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-dim">{t('product.inStock')}</span>
              <Money v={tpl.price} size="text-xl" />
            </div>
            <Btn
              size="lg"
              onClick={() => {
                add(tpl.id)
                toast(`${t('toast.cartAdded')} — ${L(tpl.name)}`)
              }}
              className="w-full"
            >
              <Icon n="cart" className="size-4" />
              {inCart(tpl.id) ? t('catalog.inCart') : t('product.addCart')}
            </Btn>
            <Btn as={Link} to={`/template/${tpl.slug}`} variant="outline" size="md" className="w-full">
              {t('card.view')}
              <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
            </Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Group({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-dim">{label}</p>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition ${
        on ? 'border-brand/50 bg-brand/12 text-brand' : 'border-line text-dim hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
