import SitePreview from './SitePreview'
import ResumePreview from './ResumePreview'
import { accentHex } from '../data/templates'

/** which preview a product shows by default: a website or an A4 CV */
export const showSite = (tpl) => tpl?.type === 'portfolio' || tpl?.type === 'bundle'

/**
 * Product preview dispatcher.
 * `kind` overrides the default (used by the bundle toggle on the product page).
 */
export default function Preview({ tpl, kind, ...rest }) {
  const site = kind ? kind === 'site' : showSite(tpl)
  return site ? <SitePreview template={tpl} {...rest} /> : <ResumePreview template={tpl} {...rest} />
}

/**
 * Compact brand tile — used where a full live preview would be unreadable
 * (cart rows, mega menu, order summary).
 */
export function ArtTile({ tpl, size = 44, className = '', label }) {
  const a = accentHex(tpl.accent || tpl.siteAccent || 'azure')
  const isSite = showSite(tpl)
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-[7px] ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: isSite ? size * 0.66 : size * 1.34 }}
      aria-hidden="true"
    >
      {isSite ? (
        <>
          <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(140deg, ${a}, ${a}99 55%, #1a2233)` }} />
          <span style={{ position: 'absolute', top: 0, insetInline: 0, height: '22%', background: 'rgba(255,255,255,.22)' }} />
          <span
            style={{
              position: 'absolute',
              bottom: '12%',
              insetInlineStart: '12%',
              width: '44%',
              height: '10%',
              borderRadius: 3,
              background: 'rgba(255,255,255,.55)',
            }}
          />
        </>
      ) : (
        <>
          <span style={{ position: 'absolute', inset: 0, background: '#fff' }} />
          <span style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: '26%', bottom: 0, background: `${a}1f` }} />
          <span style={{ position: 'absolute', top: '10%', insetInlineStart: '34%', width: '46%', height: '7%', borderRadius: 2, background: a }} />
          <span
            style={{ position: 'absolute', top: '24%', insetInlineStart: '34%', width: '52%', height: '4%', borderRadius: 2, background: '#c9ced8' }}
          />
          <span
            style={{ position: 'absolute', top: '36%', insetInlineStart: '34%', width: '40%', height: '4%', borderRadius: 2, background: '#dde1e8' }}
          />
          <span
            style={{ position: 'absolute', top: '48%', insetInlineStart: '34%', width: '48%', height: '4%', borderRadius: 2, background: '#dde1e8' }}
          />
        </>
      )}
      {label && <span className="absolute inset-x-0 bottom-0 bg-black/45 text-center text-[8px] font-bold text-white">{label}</span>}
    </span>
  )
}
