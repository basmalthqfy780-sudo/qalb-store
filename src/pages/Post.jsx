import { Link, useParams } from 'react-router-dom'
import { useI18n, num } from '../i18n'
import { postBySlug, dateLabel } from '../data/posts'
import { useSeo, blogPostingLd, breadcrumbLd, graph } from '../components/Seo'
import { Btn, Icon } from '../components/ui'

/** صفحة مقال واحد — المتن من data/posts.js بنسختيه، وJSON-LD BlogPosting + مسار تنقّل */
export default function Post() {
  const { slug } = useParams()
  const post = postBySlug(slug)
  const { t, L, lang } = useI18n()

  useSeo(post ? `${L(post.title)} · ${t('brand.name')}` : `${t('misc.404')} · ${t('brand.name')}`, post ? L(post.excerpt) : t('meta.notFoundDesc'), {
    jsonLd: post
      ? graph(
          blogPostingLd(post, lang, t),
          breadcrumbLd([
            { name: t('crumb.home'), path: '/' },
            { name: t('blog.title'), path: '/blog' },
            { name: L(post.title), path: `/blog/${post.slug}` },
          ]),
        )
      : null,
  })

  if (!post) {
    return (
      <div className="page-x mx-auto max-w-[1100px] py-28 text-center">
        <h1 className="font-display text-3xl font-extrabold">{t('misc.404')}</h1>
        <p className="mt-3 text-[14px] text-dim">{t('misc.404sub')}</p>
        <Btn to="/blog" className="mt-6">
          {t('blog.back')}
        </Btn>
      </div>
    )
  }

  const sections = post.body?.[lang] || post.body?.ar || []

  return (
    <article className="page-x mx-auto max-w-[760px] pb-20 pt-12">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-dim transition hover:text-ink">
        <Icon n="arrow" className="size-3.5 ltr:-scale-x-100" />
        {t('blog.back')}
      </Link>

      <header className="mt-6 border-b border-line pb-7">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-dim">
          <span>
            {t('blog.published')} {dateLabel(post.date, lang)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {num(post.minutes)} {t('blog.min')}
          </span>
          {(post.tags?.[lang] || post.tags?.ar || []).map((tag) => (
            <span key={tag} className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10.5px] font-bold">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-3 font-display text-[clamp(1.7rem,4vw,2.5rem)] font-extrabold leading-[1.2]">{L(post.title)}</h1>
        <p className="mt-4 text-[15.5px] leading-[1.9] text-dim">{L(post.excerpt)}</p>
      </header>

      <div className="mt-9 space-y-9">
        {sections.map((s, i) => (
          <section key={i}>
            {s.h ? <h2 className="font-display text-[21px] font-extrabold leading-snug">{s.h}</h2> : null}
            <div className="space-y-3.5">
              {(s.p || []).map((para, j) => (
                <p key={j} className={`text-[15.5px] leading-[1.95] text-dim ${s.h && j === 0 ? 'mt-3' : ''}`}>
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-7">
        <Btn to="/blog" variant="outline" size="md">
          {t('blog.back')}
        </Btn>
        <Btn to="/ats" size="md">
          {t('nav.ats')}
        </Btn>
      </footer>
    </article>
  )
}
