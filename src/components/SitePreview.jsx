import { useLayoutEffect, useRef, useState } from 'react'
import { accentHex, fontCss, siteFor } from '../data/templates'
import { useI18n } from '../i18n'

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => setW(el.getBoundingClientRect().width)
    set()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', set)
      return () => window.removeEventListener('resize', set)
    }
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

const DEVICE = {
  desktop: { w: 1280, h: 820 },
  tablet: { w: 768, h: 900 },
  mobile: { w: 420, h: 860 },
}

/* gradient artwork standing in for project imagery — no image files involved */
const art = (hue) =>
  [
    `radial-gradient(120% 100% at 18% 8%, hsl(${hue} 88% 64% / .95), transparent 58%)`,
    `radial-gradient(110% 90% at 88% 92%, hsl(${(hue + 46) % 360} 82% 52% / .85), transparent 55%)`,
    `linear-gradient(150deg, hsl(${hue} 32% 12%), hsl(${(hue + 200) % 360} 26% 7%))`,
  ].join(', ')

const Art = ({ hue, className = '', style, seed = 0 }) => (
  <div className={`relative overflow-hidden ${className}`} style={{ background: art(hue), ...style }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.22,
        backgroundImage:
          seed % 2 ? 'repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 13px)' : 'radial-gradient(#fff 1px, transparent 1.4px)',
        backgroundSize: seed % 2 ? 'auto' : '11px 11px',
      }}
    />
    <div
      style={{
        position: 'absolute',
        width: '44%',
        aspectRatio: '1',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.4)',
        top: '14%',
        insetInlineEnd: '12%',
      }}
    />
  </div>
)

/* ---------------------------------- pieces ---------------------------------- */
function Bar({ w = 100, h = 10, c, o = 0.16, r = 4 }) {
  return <div style={{ width: `${w}%`, height: h, borderRadius: r, background: c, opacity: o }} />
}

function Chrome({ url, dark, children, device }) {
  return (
    <div
      style={{
        height: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 18px',
        background: dark ? '#15161c' : '#eceef2',
        borderBottom: `1px solid ${dark ? '#262832' : '#dfe3ea'}`,
      }}
    >
      <span style={{ display: 'flex', gap: 7 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <i key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c, display: 'block' }} />
        ))}
      </span>
      <span
        style={{
          flex: device === 'mobile' ? '1 1 auto' : '0 1 340px',
          height: 26,
          borderRadius: 8,
          background: dark ? '#0d0e13' : '#fff',
          border: `1px solid ${dark ? '#23252e' : '#dde1e8'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 10px',
          fontSize: 12,
          color: dark ? '#8d94a6' : '#6a7282',
          minWidth: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', unicodeBidi: 'isolate' }}>{url}</span>
      </span>
      {children}
    </div>
  )
}

/* ---------------------------------- the site --------------------------------- */
function Site({ d, hero, gallery, theme, accent, ff, device, c, rtl }) {
  const dark = theme === 'dark'
  const a = accent
  const bg = dark ? '#0c0d12' : '#ffffff'
  const panel = dark ? '#14161d' : '#f4f5f8'
  const text = dark ? '#f2f4f8' : '#12151c'
  const dim = dark ? '#9aa2b4' : '#606a7c'
  const line = dark ? '#22242e' : '#e4e7ee'
  const narrow = device !== 'desktop'

  const Nav = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: narrow ? '18px 22px' : '26px 40px', borderBottom: `1px solid ${line}` }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 16, color: text }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: a, display: 'inline-block' }} />
        {d.name}
      </span>
      {!narrow && (
        <span style={{ display: 'flex', gap: 22, marginLeft: 'auto', marginRight: 'auto' }}>
          {(d.nav || []).slice(0, 4).map((n) => (
            <span key={n} style={{ fontSize: 13.5, color: dim, fontWeight: 500 }}>
              {n}
            </span>
          ))}
        </span>
      )}
      <span
        style={{
          marginInlineStart: narrow ? 'auto' : 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 12.5,
          fontWeight: 700,
          color: '#fff',
          background: a,
          padding: '8px 13px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}
      >
        <i style={{ width: 6, height: 6, borderRadius: 99, background: '#fff', display: 'inline-block' }} />
        {narrow ? c.hire : c.available}
      </span>
    </div>
  )

  const statRow = (
    <div style={{ display: 'flex', gap: 26, marginTop: 26 }}>
      {(d.stats || []).map((s, i) => (
        <div key={i}>
          <div style={{ fontSize: 24, fontWeight: 800, color: text, lineHeight: 1 }}>{s.v}</div>
          <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>{s.e}</div>
        </div>
      ))}
    </div>
  )

  // دالة رسم لا مكوّن: يُنشأ عنصرٌ جديد بهوية ثابتة بدل مكوّن يتولّد كل render
  const projectCard = (p, i, big = false, key = i) => (
    <div
      key={key}
      style={{
        background: panel,
        border: `1px solid ${line}`,
        borderRadius: 14,
        padding: big ? 14 : 11,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Art hue={p.hue} seed={i} style={{ borderRadius: 9, height: big ? 240 : narrow ? 130 : 148 }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: a }}>{p.c}</span>
        <span style={{ fontSize: 11, color: dim, marginInlineStart: 'auto' }}>{p.y}</span>
      </div>
      <div style={{ fontSize: big ? 19 : 14.5, fontWeight: 700, color: text, lineHeight: 1.3 }}>{p.t}</div>
      {!big && <Bar w={72} h={6} c={text} o={0.12} />}
    </div>
  )

  let heroBlock
  if (hero === 'media') {
    heroBlock = (
      <div style={{ position: 'relative', padding: narrow ? '0' : '0' }}>
        <Art hue={(d.projects?.[0]?.hue ?? 220) + 10} seed={1} style={{ height: narrow ? 300 : 430 }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: narrow ? '20px 22px' : '34px 40px',
            background: 'linear-gradient(to top, rgba(6,7,10,.86), rgba(6,7,10,.1) 62%)',
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.14em', color: '#fff', opacity: 0.7, textTransform: 'uppercase' }}>
            {d.role}
          </div>
          <div style={{ fontSize: narrow ? 26 : 44, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 10, maxWidth: 720 }}>{d.name}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginTop: 12, maxWidth: 560, lineHeight: 1.7 }}>{d.blurb}</div>
        </div>
      </div>
    )
  } else if (hero === 'center') {
    heroBlock = (
      <div style={{ textAlign: 'center', padding: narrow ? '34px 22px 26px' : '64px 40px 46px' }}>
        <span
          style={{
            display: 'inline-flex',
            gap: 8,
            alignItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: a,
            background: `${a}1a`,
            padding: '7px 13px',
            borderRadius: 999,
          }}
        >
          <i style={{ width: 7, height: 7, borderRadius: 99, background: a, display: 'inline-block' }} />
          {d.role}
        </span>
        <div style={{ fontSize: narrow ? 30 : 56, fontWeight: 800, color: text, lineHeight: 1.08, marginTop: 20, letterSpacing: '-0.02em' }}>
          {d.name}
        </div>
        <div style={{ fontSize: 15, color: dim, marginTop: 16, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
          {d.blurb}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26 }}>
          <span
            style={{ fontSize: 13.5, fontWeight: 700, color: dark ? '#0c0d12' : '#fff', background: text, padding: '12px 20px', borderRadius: 10 }}
          >
            {narrow ? '→' : c.work}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: text, border: `1px solid ${line}`, padding: '12px 20px', borderRadius: 10 }}>
            {narrow ? '↓' : c.cv}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 26, justifyContent: 'center', marginTop: 30 }}>
          {(d.stats || []).map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: text }}>{s.v}</div>
              <div style={{ fontSize: 11.5, color: dim }}>{s.e}</div>
            </div>
          ))}
        </div>
      </div>
    )
  } else {
    heroBlock = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : '1.15fr .85fr',
          gap: narrow ? 22 : 40,
          alignItems: 'center',
          padding: narrow ? '30px 22px' : '54px 40px',
        }}
      >
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: a }}>{d.role}</span>
          <div style={{ fontSize: narrow ? 28 : 46, fontWeight: 800, color: text, lineHeight: 1.1, marginTop: 14, letterSpacing: '-0.02em' }}>
            {d.name}
          </div>
          <div style={{ fontSize: 14.5, color: dim, marginTop: 16, maxWidth: 520, lineHeight: 1.8 }}>{d.blurb}</div>
          <div style={{ display: 'flex', gap: 11, marginTop: 24 }}>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: dark ? '#0c0d12' : '#fff', background: text, padding: '11px 18px', borderRadius: 10 }}
            >
              {narrow ? '→' : c.work}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: text, border: `1px solid ${line}`, padding: '11px 18px', borderRadius: 10 }}>
              {narrow ? '↓' : c.contact}
            </span>
          </div>
          {statRow}
        </div>
        <div style={{ position: 'relative' }}>
          <Art hue={d.projects?.[0]?.hue ?? 240} seed={0} style={{ borderRadius: 16, height: narrow ? 200 : 330 }} />
          <div
            style={{
              position: 'absolute',
              bottom: -18,
              insetInlineStart: 18,
              background: bg,
              border: `1px solid ${line}`,
              borderRadius: 12,
              padding: '11px 14px',
              boxShadow: '0 18px 40px -20px rgba(0,0,0,.5)',
            }}
          >
            <div style={{ fontSize: 11.5, color: dim }}>{narrow ? '★ 5.0' : c.latest}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: text, marginTop: 3 }}>{d.projects?.[0]?.t}</div>
          </div>
        </div>
      </div>
    )
  }

  const items = d.projects || []
  let galleryBlock
  if (gallery === 'list') {
    galleryBlock = (
      <div style={{ padding: narrow ? '10px 22px 30px' : '10px 40px 44px' }}>
        {items.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 0', borderTop: `1px solid ${line}` }}>
            <Art hue={p.hue} seed={i} style={{ width: 74, height: 52, borderRadius: 8, flex: '0 0 auto' }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: text }}>{p.t}</div>
              <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{p.c}</div>
            </div>
            <div style={{ fontSize: 12.5, color: dim }}>{p.y}</div>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 99,
                border: `1px solid ${line}`,
                display: 'grid',
                placeItems: 'center',
                color: a,
                fontSize: 13,
              }}
            >
              →
            </div>
          </div>
        ))}
      </div>
    )
  } else if (gallery === 'spotlight') {
    galleryBlock = (
      <div
        style={{ padding: narrow ? '0 22px 30px' : '0 40px 44px', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.35fr .65fr', gap: 20 }}
      >
        {projectCard(items[0], 0, true)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {items.slice(1, 4).map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: 12,
                background: panel,
                border: `1px solid ${line}`,
                borderRadius: 12,
              }}
            >
              <Art hue={p.hue} seed={i + 1} style={{ width: 58, height: 46, borderRadius: 8, flex: '0 0 auto' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: text }}>{p.t}</div>
                <div style={{ fontSize: 11.5, color: dim }}>
                  {p.c} · {p.y}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  } else {
    const cols = gallery === 'grid3' && !narrow ? 3 : 2
    galleryBlock = (
      <div style={{ padding: narrow ? '0 22px 30px' : '0 40px 44px', display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 18 }}>
        {items.slice(0, cols === 3 ? 3 : 4).map((p, i) => projectCard(p, i))}
      </div>
    )
  }

  return (
    <div
      style={{ background: bg, fontFamily: ff, height: '100%', display: 'flex', flexDirection: 'column' }}
      dir={rtl ? 'rtl' : 'ltr'}
      data-preview-dir={rtl ? 'rtl' : 'ltr'}
    >
      {Nav}
      {heroBlock}
      <div style={{ padding: narrow ? '14px 22px 6px' : '18px 40px 8px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: text }}>
          {narrow ? c.work : c.selected}
        </span>
        <span style={{ flex: 1, height: 1, background: line }} />
        <span style={{ fontSize: 12, color: a, fontWeight: 700 }}>→</span>
      </div>
      {galleryBlock}
      <div
        style={{
          marginTop: 'auto',
          padding: narrow ? '16px 22px' : '18px 40px',
          borderTop: `1px solid ${line}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
          color: dim,
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 5, background: a }} />© {d.name} — {d.host}
        <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 10 }}>
          {(d.nav || []).slice(0, 3).map((x) => (
            <span key={x}>{x}</span>
          ))}
        </span>
      </div>
    </div>
  )
}

/**
 * Live HTML preview of a portfolio website template, shown inside a browser frame.
 */
export default function SitePreview({ template, device = 'desktop', theme, hero, gallery, accent, font, chrome = true, className = '', style }) {
  const { lang } = useI18n()
  const raw = siteFor(template) || {}
  const pick = (v) => (v && typeof v === 'object' ? (v[lang] ?? v.en) : v)

  const [ref, w] = useWidth()
  const d = {
    name: pick(raw.name) || template?.name?.[lang] || '',
    role: pick(raw.role),
    blurb: pick(raw.blurb),
    host: raw.host,
    nav: pick(raw.nav) || [],
    stats: raw.stats || [],
    projects: (raw.projects || []).map((p) => ({ ...p, t: pick(p.t), c: pick(p.c) })),
  }

  const ar = lang === 'ar'
  const copy = {
    available: ar ? 'متاح لمشروع' : 'Available for work',
    hire: ar ? 'متاح' : 'Hire',
    work: ar ? 'شاهد الأعمال' : 'View work',
    cv: ar ? 'تنزيل السيرة' : 'Download CV',
    contact: ar ? 'تواصل' : 'Contact',
    latest: ar ? 'آخر عمل' : 'Latest',
    selected: ar ? 'أعمال مختارة' : 'Selected work',
  }
  const dev = DEVICE[device] || DEVICE.desktop
  // w === 0 means the box has not been measured (hidden container, jsdom…) —
  // render the site unscaled instead of leaving an empty box forever.
  const scale = w ? w / dev.w : 1
  const boxH = dev.h * scale

  const themeNow = theme || template?.theme || 'light'
  const accHex = accent && String(accent).startsWith('#') ? accent : accentHex(accent || template?.accent || raw.accent)
  const ff = fontCss(font || template?.font || raw.font)

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ height: w ? boxH : undefined, background: themeNow === 'dark' ? '#0c0d12' : '#fff', ...style }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: dev.w,
          height: dev.h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          opacity: w ? 1 : 0,
          transition: 'opacity .4s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {chrome && <Chrome url={d.host || 'portfolio.local'} dark={themeNow === 'dark'} device={device} />}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Site
            d={d}
            hero={hero || raw.hero || 'split'}
            gallery={gallery || raw.gallery || 'grid3'}
            theme={themeNow}
            accent={accHex}
            ff={ff}
            device={device}
            c={copy}
            rtl={ar}
          />
        </div>
      </div>
    </div>
  )
}
