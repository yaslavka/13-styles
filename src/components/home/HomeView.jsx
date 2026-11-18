'use client'

import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryCards from '@/components/home/CategoryCards'
import ProductGrid from '@/components/product/ProductGrid'
import Advantages from '@/components/home/Advantages'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'
import Reveal from '@/components/motion/Reveal'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'

// Главная страница: витрина 13 STYLES — все категории, по 8 товаров в каждой.
// Каждая категория ведёт на свою SEO-страницу /catalog/category/[slug].

const HomeView = ({ sections = [], categories = [] }) => {
  const navigate = useShop((state) => state.navigate)
  const href = useShop((state) => state.href)
  const t = useT()

  return (
    <>
      <Hero />
      <Marquee />
      <CategoryCards categories={categories} />

      {/* Все категории, по 8 товаров в каждой — каждая ведёт на страницу категории */}
      {sections.map((section) => (
        <section
          key={section.category.id}
          className="mx-auto max-w-7xl px-4 py-10 sm:px-6"
          aria-label={section.category.name}
          id={section.category.slug}
        >
          <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
                <Link href={href('category', { slug: section.category.slug })} className="transition-colors hover:text-orange-300">
                  {section.category.name}
                </Link>
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
                {t('home.items', { count: section.category.count })} · {section.category.subtitle}
              </p>
            </div>
            <Link
              href={href('category', { slug: section.category.slug })}
              className="glass-btn glass-btn-ghost flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-sm font-bold text-purple-200"
              aria-label={`${section.category.name} — ${t('home.viewAll')}`}
            >
              {t('home.viewAll')} <ArrowRight className="h-4 w-4 text-orange-300" aria-hidden />
            </Link>
          </Reveal>
          <ProductGrid products={section.products} />
        </section>
      ))}

      <Reveal className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="glow-frame relative overflow-hidden rounded-[2rem] p-10 text-center sm:p-14" style={{ background: 'linear-gradient(120deg, #1a1038, #5b21b6 45%, #ea580c)' }}>
          <span className="animate-gradient-x absolute inset-0 opacity-30" aria-hidden style={{ background: 'linear-gradient(120deg, transparent 25%, #c4b5fd 50%, transparent 75%)', backgroundSize: '220% 220%' }} />
          <div className="relative">
            <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">
              <GradientText styleIndex={7}>{t('home.saleTitle')}</GradientText>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-purple-100/90">{t('home.saleSub')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <GlassButton tone="orange" className="h-13 px-9 text-lg" onClick={() => navigate('catalog', { query: { discount: '1' } })}>
                {t('home.saleBtn')}
              </GlassButton>
              <GlassButton tone="ghost" className="h-13 px-9 text-lg" onClick={() => navigate('styles')}>
                {t('home.stylesBtn')}
              </GlassButton>
            </div>
          </div>
        </div>
      </Reveal>

      <Advantages />

      {/* SEO: все подкатегории сайта индексируемыми ссылками */}
      <Reveal className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <h2 className="mb-5 font-display text-xl font-bold text-purple-200">{t('catalog.subcategories')}</h2>
        <nav aria-label="All subcategories" className="flex flex-wrap gap-2">
          {categories.flatMap((category) =>
            (category.subcategories || []).map((sub) => (
              <Link
                key={sub.id}
                href={href('subcategory', { slug: category.slug, sub: sub.slug })}
                className="glass-btn glass-btn-ghost inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-purple-200 transition-colors hover:text-white"
              >
                {sub.name} <ArrowUpRight className="h-3 w-3 text-orange-300/80" aria-hidden />
              </Link>
            ))
          )}
        </nav>
      </Reveal>
    </>
  )
}

export default HomeView
