import { useMemo } from 'react'
import { useI18n, num } from '../i18n'
import { templates } from '../data/templates'
import { useStore } from '../store/StoreContext'
import TemplateCard from '../components/TemplateCard'
import QuickView from '../components/QuickView'
import { Btn, Head, Icon, Reveal } from '../components/ui'
import { useSeo } from '../components/Seo'
import { useState } from 'react'

export default function Wishlist() {
  const { t } = useI18n()
  const { wish } = useStore()
  const [quick, setQuick] = useState(null)
  const list = useMemo(() => templates.filter((x) => wish.includes(x.id)), [wish])

  useSeo(`${t('wishlist.title')} · ${t('brand.name')}`, t('meta.wishlistDesc'))

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-60 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1400px] py-14">
        <Head
          kicker={t('nav.wishlist')}
          title={t('wishlist.title')}
          sub={list.length ? t('wishlist.count', { n: num(list.length) }) : t('wishlist.emptyHint')}
          right={
            list.length > 0 ? (
              <Btn to="/templates" variant="outline" size="md">
                {t('cart.browse')}
                <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
              </Btn>
            ) : null
          }
        />

        {list.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((tpl, k) => (
              <Reveal key={tpl.id} delay={(k % 4) * 60}>
                <TemplateCard tpl={tpl} onQuick={setQuick} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-line bg-panel/50 px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-2xl border border-line bg-bg text-danger">
              <Icon n="heart" className="size-7" />
            </span>
            <h2 className="mt-6 font-display text-2xl font-extrabold">{t('wishlist.empty')}</h2>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-dim">{t('wishlist.emptyHint')}</p>
            <Btn to="/templates" size="lg" className="mt-7">
              {t('cart.browse')}
            </Btn>
          </div>
        )}
      </div>
      {quick && <QuickView tpl={quick} onClose={() => setQuick(null)} />}
    </div>
  )
}
