import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store/StoreContext'
import { byId } from '../data/templates'
import { ArtTile } from './Preview'
import { Icon, Money } from './ui'

/**
 * Last few products opened on this device (localStorage, max 6).
 * Renders nothing until there is at least one visit — so first-time
 * visitors never see an empty rail.
 */
export default function RecentlyViewed({ variant = 'strip', exclude }) {
  const { t, L } = useI18n()
  const { recent, add } = useStore()
  const list = recent
    .map(byId)
    .filter(Boolean)
    .filter((x) => x.id !== exclude)

  if (!list.length) return null

  return (
    <section
      data-recent={list.length}
      aria-label={t('featured.recent')}
      className={`page-x mx-auto w-full max-w-[1400px] ${variant === 'grid' ? 'py-16' : 'pt-6'}`}
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
            <Icon n="clock" className="size-3.5 text-brand" />
            {t('featured.recent')}
          </p>
          <p className="mt-1 text-[12.5px] text-dim">{t('featured.recentSub')}</p>
        </div>
        <Link to="/wishlist" className="shrink-0 text-[12px] font-bold text-brand hover:underline">
          {t('nav.viewAll')}
        </Link>
      </div>

      <div className="no-bar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {list.map((x) => (
          <div
            key={x.id}
            data-recent-item={x.slug}
            className="group flex w-[300px] shrink-0 items-center gap-3 rounded-2xl border border-line bg-panel p-3 transition hover:-translate-y-0.5 hover:border-brand/35"
          >
            <Link to={`/template/${x.slug}`} className="shrink-0">
              <ArtTile tpl={x} size={54} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/template/${x.slug}`} className="block truncate text-[14px] font-bold transition group-hover:text-brand">
                {L(x.name)}
              </Link>
              <p className="mt-0.5 truncate text-[11.5px] text-dim">{L(x.tagline)}</p>
              <Money v={x.price} size="text-[13px]" />
            </div>
            <button
              type="button"
              onClick={() => add(x.id)}
              title={t('product.addCart')}
              aria-label={`${t('product.addCart')} — ${L(x.name)}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-dim transition hover:border-brand/40 hover:text-brand"
            >
              <Icon n="cart" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
