import { useI18n, num } from '../i18n'
import { serviceUpsells, addonDelivery } from '../data/upsells'
import { useStore } from '../store/StoreContext'
import { useSeo, breadcrumbLd, graph, itemList } from '../components/Seo'
import { Btn, Head, Icon, Money, Pill, Reveal } from '../components/ui'

/**
 * صفحة الخدمات — Done-For-You يؤديها فريقنا لا ملفٌّ يُنزَّل.
 *
 * كلُّ سعرٍ هنا من src/data/upsells.js (نفس الجدول الذي تُسعَّر به السلة
 * والخادم)، وكلُّ مهلةٍ معلنة هناك أيضًا (sla بالساعات) فلا يَعِدُ النصُّ
 * بما لا يُسلَّم. الزرُّ يضيف الخدمة إلى السلة: تُدفع مع أي قوالب، ويبدأ
 * التسليم بمراسلتك على بريد الطلب.
 */
export default function Services() {
  const { t, L } = useI18n()
  const { toggleAddon, hasAddon, toast } = useStore()
  const services = serviceUpsells()

  useSeo(`${t('services.title')} · ${t('brand.name')}`, t('meta.servicesDesc'), {
    jsonLd: graph(
      breadcrumbLd([
        { name: t('crumb.home'), path: '/' },
        { name: t('services.title'), path: '/services' },
      ]),
      itemList(services.map((s) => ({ name: L(s.name), path: '/services' }))),
    ),
  })

  const steps = [
    ['cart', 'services.s1t', 'services.s1d'],
    ['mail', 'services.s2t', 'services.s2d'],
    ['clock', 'services.s3t', 'services.s3d'],
  ]

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 grad-mesh" />
      <div className="page-x relative mx-auto max-w-[1100px] pb-20 pt-12 sm:pt-14">
        <Head
          as="h1"
          kicker={t('services.kicker')}
          title={t('services.title')}
          sub={t('services.sub')}
          right={
            <Pill tone="brand">
              <Icon n="clock" className="size-3" />
              {t('services.byHand')}
            </Pill>
          }
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {services.map((s, k) => {
            const on = hasAddon(s.id)
            const delivery = addonDelivery(s.id)
            return (
              <Reveal key={s.id} delay={k * 80} className="h-full">
                <article
                  data-service={s.id}
                  className={`flex h-full flex-col justify-between rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
                    k === 0 ? 'border-brand/40 bg-panel' : 'border-line bg-panel/60 hover:border-brand/30'
                  }`}
                >
                  <span className="grid size-11 place-items-center rounded-xl border border-line bg-bg text-brand">
                    <Icon n={s.icon || 'spark'} className="size-5" />
                  </span>
                  <h2 className="mt-4 font-display text-[19px] font-extrabold">{L(s.name)}</h2>
                  <p className="mt-1.5 text-[12.5px] font-semibold text-dim">{L(s.tagline)}</p>
                  <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-dim">{L(s.desc)}</p>
                  <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
                    <Money v={s.price} size="text-[24px]" />
                    <span className="num text-[11px] font-semibold text-dim">
                      {delivery?.kind === 'email' ? t('services.within', { h: num(delivery.hours) }) : t('services.byHand')}
                    </span>
                  </div>
                  <Btn
                    variant={on ? 'outline' : k === 0 ? 'primary' : 'outline'}
                    size="lg"
                    className="mt-5 w-full"
                    data-service-add={s.id}
                    onClick={() => {
                      const added = toggleAddon(s.id)
                      toast(added ? t('cart.addonAdded', { n: L(s.name) }) : t('cart.addonRemoved', { n: L(s.name) }))
                    }}
                  >
                    <Icon n={on ? 'check' : 'cart'} className="size-4" />
                    {on ? t('services.inCart') : t('services.add')}
                  </Btn>
                </article>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12 rounded-3xl border border-line bg-panel/55 p-6 sm:p-8">
          <h2 className="font-display text-[20px] font-extrabold">{t('services.flowTitle')}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {steps.map(([icon, title, desc], i) => (
              <div key={title} className="flex gap-3.5">
                <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-bg text-brand">
                  <Icon n={icon} className="size-4" />
                  <span className="num absolute -top-2 -end-2 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-extrabold text-bg light:bg-brand light:text-brandink">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-ink">{t(title)}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t(desc)}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-line pt-4 text-[12px] leading-relaxed text-dim">{t('services.honestNote')}</p>
        </Reveal>
      </div>
    </div>
  )
}
