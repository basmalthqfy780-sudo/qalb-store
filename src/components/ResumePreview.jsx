import { useEffect, useState } from 'react'
import { accentHex, demoFor, fontCss } from '../data/templates'
import { useI18n } from '../i18n'
import { useFitWidth } from '../lib/use-fit-width'

const DESIGN_W = 640
const DESIGN_H = Math.round(DESIGN_W * 1.4142)

/* ---------------- atoms ---------------- */
const Bars = ({ n = 3, c, w = 100, gap = 7, h = 4.5, shrink = 0.82 }) => (
  <div style={{ display: 'grid', gap }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ width: `${w * Math.pow(shrink, i)}%`, height: h, borderRadius: 3, background: c, opacity: 0.15 - i * 0.02 }} />
    ))}
  </div>
)

const Title = ({ children, a }) => (
  <div style={{ marginBottom: 9 }}>
    <div style={{ fontSize: 9.5, letterSpacing: '0.16em', fontWeight: 700, color: a, textTransform: 'uppercase' }}>{children}</div>
    <div style={{ height: 1, background: a, opacity: 0.28, marginTop: 5 }} />
  </div>
)

const Chip = ({ children, a }) => (
  <span
    style={{
      fontSize: 9.5,
      fontWeight: 600,
      color: a,
      border: `1px solid ${a}33`,
      background: `${a}0d`,
      padding: '3px 7px',
      borderRadius: 5,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
)

const Entry = ({ job, a, compact }) => (
  <div style={{ marginBottom: compact ? 10 : 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#12161d', lineHeight: 1.35 }}>{job.t}</div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: '#79808f', whiteSpace: 'nowrap' }}>{job.p}</div>
    </div>
    <div style={{ height: 6 }} />
    <Bars n={compact ? 2 : 3} c={a} w={99} h={4} gap={6} />
  </div>
)

/* ---------------- layouts ---------------- */
function Sheet({ demo, name, layout, a, ff, full, labels, lang }) {
  const role = demo.role
  const city = demo.city
  const skills = (demo.skills || []).slice(0, full ? 6 : 4)
  const jobs = (demo.jobs || []).slice(0, full ? 2 : 1)
  const email = 'name.cv@mail.com'
  const strong = '#12161d'
  const muted = '#79808f'
  const px = full ? 34 : 26
  const py = full ? 30 : 22

  // دالة رسم (لا مكوّن داخل render): نفس الشجرة، بلا هوية متغيّرة
  const contacts = (align = 'start') => (
    <div
      style={{
        display: 'flex',
        gap: 9,
        flexWrap: 'wrap',
        fontSize: 9.5,
        color: muted,
        fontWeight: 500,
        justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
      }}
    >
      {[email, '+966 55 000 0000', city].map((x, i) => (
        <span key={i}>{x}</span>
      ))}
    </div>
  )

  if (layout === 'side') {
    return (
      <div style={{ display: 'flex', height: '100%', fontFamily: ff, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <aside style={{ width: '37%', background: '#f5f6f8', padding: '26px 20px', borderInlineStart: `3px solid ${a}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: strong, lineHeight: 1.15 }}>{name}</div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: a, marginTop: 5 }}>{role}</div>
          <div style={{ height: 16 }} />
          <Title a={a}>{labels.contact}</Title>
          <Bars n={4} c={a} w={82} h={4} gap={7} />
          <div style={{ height: 16 }} />
          <Title a={a}>{labels.skills}</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {skills.map((s, i) => (
              <Chip key={i} a={a}>
                {s}
              </Chip>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <Title a={a}>{labels.edu}</Title>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: '#3d4451' }}>{demo.edu}</div>
        </aside>
        <main style={{ flex: 1, padding: '26px 24px' }}>
          <Title a={a}>{labels.summary}</Title>
          <Bars n={2} c={a} w={99} h={4.5} gap={7} />
          <div style={{ height: 16 }} />
          <Title a={a}>{labels.exp}</Title>
          {jobs.map((j, i) => (
            <Entry key={i} job={j} a={a} compact={!full} />
          ))}
        </main>
      </div>
    )
  }

  if (layout === 'band') {
    return (
      <div style={{ fontFamily: ff, height: '100%', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ background: a, padding: `${py}px ${px}px`, color: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.015em' }}>{name}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.92, marginTop: 5 }}>{role}</div>
        </div>
        <div style={{ padding: `${py - 4}px ${px}px` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {['+34%', '9 yrs', '120k'].map((k) => (
              <div key={k} style={{ border: `1px solid ${a}2e`, background: `${a}0a`, borderRadius: 7, padding: '9px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: a }}>{k}</div>
                <div style={{ height: 5 }} />
                <div style={{ height: 3.5, borderRadius: 3, background: a, opacity: 0.16, width: '62%', margin: '0 auto' }} />
              </div>
            ))}
          </div>
          <div style={{ height: 18 }} />
          <Title a={a}>{labels.exp}</Title>
          {jobs.map((j, i) => (
            <Entry key={i} job={j} a={a} compact={!full} />
          ))}
          <Title a={a}>{labels.skills}</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {skills.map((s, i) => (
              <Chip key={i} a={a}>
                {s}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (layout === 'timeline') {
    return (
      <div style={{ padding: `${py}px ${px}px`, fontFamily: ff, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: `2px solid ${a}`,
            paddingBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: strong, lineHeight: 1.1 }}>{name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: a, marginTop: 4 }}>{role}</div>
          </div>
          <div style={{ textAlign: 'end', fontSize: 9.5, color: muted, lineHeight: 1.7 }}>
            <div>{city}</div>
            <div>{email}</div>
          </div>
        </div>
        <div style={{ height: 18 }} />
        <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
          <div style={{ width: 3, background: `${a}22`, borderRadius: 9, flex: '0 0 auto', position: 'relative' }}>
            {[12, 42, 72].map((top) => (
              <span
                key={top}
                style={{
                  position: 'absolute',
                  top,
                  insetInlineStart: -3.5,
                  width: 10,
                  height: 10,
                  borderRadius: 9,
                  background: a,
                  boxShadow: '0 0 0 3px #fff',
                }}
              />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <Title a={a}>{labels.exp}</Title>
            {jobs.map((j, i) => (
              <Entry key={i} job={j} a={a} compact={!full} />
            ))}
            <Title a={a}>{labels.skills}</Title>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {skills.map((s, i) => (
                <Chip key={i} a={a}>
                  {s}
                </Chip>
              ))}
            </div>
            <Title a={a}>{labels.edu}</Title>
            <Bars n={1} c={a} w={70} h={4} gap={0} />
          </div>
        </div>
      </div>
    )
  }

  if (layout === 'serif') {
    return (
      <div style={{ padding: `${py}px ${px}px`, fontFamily: ff, textAlign: 'center', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: strong, lineHeight: 1.1 }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', margin: '10px 0 12px' }}>
          <span style={{ flex: 1, height: 1, background: `${a}55` }} />
          <span style={{ fontSize: 10.5, fontWeight: 600, color: a, letterSpacing: '0.1em' }}>{role}</span>
          <span style={{ flex: 1, height: 1, background: `${a}55` }} />
        </div>
        {contacts('center')}
        <div style={{ height: 18 }} />
        <div style={{ textAlign: 'start' }}>
          <Title a={a}>{labels.summary}</Title>
          <Bars n={full ? 3 : 2} c={a} w={99} h={4.5} gap={7} />
          <div style={{ height: 16 }} />
          <Title a={a}>{labels.exp}</Title>
          {jobs.map((j, i) => (
            <Entry key={i} job={j} a={a} compact={!full} />
          ))}
          <Title a={a}>{labels.edu}</Title>
          <Bars n={1} c={a} w={62} h={4} gap={0} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${py}px ${px}px`, fontFamily: ff, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800, color: strong, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{name}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: a, marginTop: 5 }}>{role}</div>
        </div>
        <div style={{ maxWidth: 250 }}>{contacts('end')}</div>
      </div>
      <div style={{ height: 18 }} />
      <Title a={a}>{labels.summary}</Title>
      <Bars n={full ? 3 : 2} c={a} w={99} h={4.5} gap={7} />
      <div style={{ height: 16 }} />
      <Title a={a}>{labels.exp}</Title>
      {jobs.map((j, i) => (
        <Entry key={i} job={j} a={a} compact={!full} />
      ))}
      <Title a={a}>{labels.skills}</Title>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: full ? 14 : 8 }}>
        {skills.map((s, i) => (
          <Chip key={i} a={a}>
            {s}
          </Chip>
        ))}
      </div>
      {full && (
        <>
          <Title a={a}>{labels.edu}</Title>
          <div style={{ fontSize: 10.5, color: '#3d4451', lineHeight: 1.6 }}>{demo.edu}</div>
        </>
      )}
    </div>
  )
}

/**
 * Live HTML/A4 preview of a resume template — no images involved.
 * variant: 'compact' (cards) | 'full' (product page)
 */
export default function ResumePreview({ template, layout, accent, font, variant = 'compact', zoom = 1, className = '', style }) {
  const { L, lang } = useI18n()
  const [ref, w] = useFitWidth()
  const [ready, setReady] = useState(false)
  const full = variant === 'full'
  const lay = layout || template.layout
  const a = accent && String(accent).startsWith('#') ? accent : accentHex(accent || template.accent)
  const ff = fontCss(font || template.font)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const raw = demoFor(template) || {}
  const demo = {
    role: L(raw.role),
    city: L(raw.city),
    edu: L(raw.edu),
    skills: L(raw.skills) || [],
    jobs: (raw.jobs || []).map((j) => ({ t: L(j.t), p: L(j.p) })),
  }
  const name = L(raw.name) || L(template.name)
  const labels = {
    contact: lang === 'ar' ? 'التواصل' : 'Contact',
    summary: lang === 'ar' ? 'الملخص المهني' : 'Profile',
    exp: lang === 'ar' ? 'الخبرة المهنية' : 'Experience',
    skills: lang === 'ar' ? 'المهارات' : 'Skills',
    edu: lang === 'ar' ? 'التعليم' : 'Education',
  }

  // see SitePreview: an unmeasured box falls back to scale 1, not to a skeleton
  const scale = w ? (w * zoom) / DESIGN_W : 1

  return (
    <div ref={ref} data-resume={template?.slug} className={`sheet fitbox ${className}`} style={style}>
      <div
        className="fitscale"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          opacity: ready ? 1 : 0,
          transition: 'opacity .45s ease',
        }}
      >
        <Sheet demo={demo} name={name} layout={lay} a={a} ff={ff} full={full} labels={labels} lang={lang} />
      </div>
    </div>
  )
}
