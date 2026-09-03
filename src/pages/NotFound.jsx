import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { templates } from '../data/templates'
import TemplateCard from '../components/TemplateCard'
import { Btn, Icon } from '../components/ui'
import { useSeo } from '../components/Seo'

export default function NotFound() {
  const { t } = useI18n()
  const picks = templates.filter((x) => x.best).slice(0, 3)

  useSeo(`404 · ${t('misc.404')} · ${t('brand.name')}`, t('meta.notFoundDesc'))
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1400px] py-24 text-center">
        <p className="font-display text-[clamp(4.5rem,18vw,11rem)] font-extrabold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--c-line)] select-none">
          404
        </p>
        <h1 className="-mt-4 font-display text-3xl font-extrabold">{t('misc.404')}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-dim">{t('misc.404sub')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Btn to="/" size="lg">
            <Icon n="arrow" className="size-4 rotate-180 rtl:rotate-0" />
            {t('misc.backHome')}
          </Btn>
          <Link to="/templates" className="text-[13.5px] font-bold text-brand underline-offset-4 hover:underline">
            {t('nav.templates')}
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-5 text-start sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((x) => (
            <TemplateCard key={x.id} tpl={x} />
          ))}
        </div>
      </div>
    </div>
  )
}
