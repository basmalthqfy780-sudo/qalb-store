import { Link } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { posts, dateLabel } from '../data/posts'
import { useSeo, blogLd, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Head, Icon, Reveal } from '../components/ui'

/** فهرس المدوّنة — المقالات كلها من src/data/posts.js وتُكتب في sitemap.xml بنفس المصدر */
export default function Blog() {
  const { t, L, lang } = useI18n()

  useSeo(`${t('blog.title')} · ${t('brand.name')}`, t('meta.blogDesc'), {
    jsonLd: graph(
      blogLd(t),
      breadcrumbLd([
        { name: t('crumb.home'), path: '/' },
        { name: t('blog.title'), path: '/blog' },
      ]),
    ),
  })

  return (
    <div className="page-x mx-auto max-w-[1100px] pb-20 pt-12">
      <Head kicker={t('blog.kicker')} title={t('blog.title')} sub={t('blog.sub')} />

      <div className="mt-10 grid gap-5">
        {posts.map((p, k) => (
          <Reveal key={p.slug} delay={k * 70}>
            <article className="group relative flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-lift sm:flex-row sm:items-center sm:gap-8">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-dim">
                  <span>{dateLabel(p.date, lang)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {num(p.minutes)} {t('blog.min')}
                  </span>
                  {(p.tags?.[lang] || p.tags?.ar || []).map((tag) => (
                    <span key={tag} className="rounded-md border border-line bg-bg/60 px-1.5 py-0.5 text-[10.5px] font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-2 font-display text-[21px] font-extrabold leading-snug">
                  <Link to={`/blog/${p.slug}`} className="transition hover:text-brand">
                    {L(p.title)}
                  </Link>
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-dim">{L(p.excerpt)}</p>
              </div>
              <Btn to={`/blog/${p.slug}`} variant="outline" size="md" className="shrink-0">
                {t('blog.read')}
                <Icon n="arrow" className="size-4 rtl:-scale-x-100" />
              </Btn>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
