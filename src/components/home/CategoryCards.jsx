'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import ICONS_MAP from '@/lib/icons'
import useShop from '@/store/useShop'
import { styleGradient } from '@/lib/constants'
import Reveal from '@/components/motion/Reveal'

// Анимированные карточки категорий товаров

const CategoryCards = ({ categories = [] }) => {
  const navigate = useShop((state) => state.navigate)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-label="Категории товаров">
      <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Категории
            <span className="ml-3 text-orange-500 animate-blink">▚</span>
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Четыре мира пиксельной моды — выбирай свой</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="flex items-center gap-1.5 font-display text-sm text-purple-300 transition-colors hover:text-orange-300"
        >
          Весь каталог <ArrowUpRight className="h-4 w-4" aria-hidden />
        </button>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => {
          const Icon = ICONS_MAP.categoryIcon(category.icon)
          return (
            <motion.button
              key={category.id}
              type="button"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -8, scale: 1.015 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('catalog', { query: { category: category.slug } })}
              className="group pixel-corners relative flex flex-col justify-between overflow-hidden p-5 text-left transition-shadow hover:shadow-[0_20px_60px_rgba(139,92,246,0.3)]"
              style={{ background: styleGradient(category.style) }}
              aria-label={`${category.name} — ${category.count} товаров`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 opacity-30 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-125"
                style={{ background: 'radial-gradient(circle, #fff 20%, transparent 70%)' }}
              />
              <span className="pixel-corners-sm grid h-12 w-12 place-items-center bg-black/35 text-white backdrop-blur-sm">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-8 block">
                <span className="block font-display text-xl font-bold text-white">{category.name}</span>
                <span className="mt-1 block text-xs text-white/75">{category.subtitle}</span>
                <span className="mt-3 flex items-center justify-between">
                  <span className="pixel-corners-sm bg-black/30 px-2 py-1 font-display text-xs text-white/90 backdrop-blur-sm">
                    {category.count} товаров
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-white/70 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-orange-300" aria-hidden />
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

export default CategoryCards
