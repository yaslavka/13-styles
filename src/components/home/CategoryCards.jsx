'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import ICONS_MAP from '@/lib/icons'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import { styleGradient } from '@/lib/constants'
import Reveal from '@/components/motion/Reveal'

// Анимированные стеклянные карточки категорий товаров — ссылки на SEO-страницы
// категорий /catalog/category/[slug]

const CategoryCards = ({ categories = [] }) => {
  const href = useShop((state) => state.href)
  const t = useT()

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-label="Product categories">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">{t('home.categories')}</h2>
          <p className="mt-2 text-base font-semibold text-muted-foreground">{t('home.categoriesSub')}</p>
        </div>
        <Link
          href={href('catalog')}
          className="glass-btn glass-btn-ghost flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-sm font-bold text-purple-200"
        >
          {t('home.viewAll')} <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => {
          const Icon = ICONS_MAP.categoryIcon(category.icon)
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href={href('category', { slug: category.slug })}
                className="group glow-frame relative flex h-full flex-col justify-between overflow-hidden rounded-[1.6rem] p-6 text-left transition-shadow duration-300 hover:shadow-[0_28px_70px_rgba(139,92,246,0.35)]"
                style={{ background: styleGradient(category.style) }}
                aria-label={`${category.name} — ${t('home.items', { count: category.count })}`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-125"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.65) 12%, transparent 72%)' }}
                />
                <span className="glass-btn glass-btn-ghost grid h-14 w-14 place-items-center rounded-2xl">
                  <Icon className="h-7 w-7 text-white" aria-hidden />
                </span>
                <span className="mt-10 block">
                  <span className="block font-display text-2xl font-extrabold text-white drop-shadow-md">{category.name}</span>
                  <span className="mt-1.5 block text-sm font-semibold text-white/80">{category.subtitle}</span>
                  <span className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-black/30 px-3 py-1.5 font-display text-xs font-bold text-white backdrop-blur-sm">
                      {t('home.items', { count: category.count })}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight className="h-5 w-5 text-white" aria-hidden />
                    </span>
                  </span>
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default CategoryCards
