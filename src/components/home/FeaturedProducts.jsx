'use client'

import { ArrowRight } from 'lucide-react'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'
import useShop from '@/store/useShop'

// Хиты продаж на главной

const FeaturedProducts = ({ products = [] }) => {
  const navigate = useShop((state) => state.navigate)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-label="Хиты продаж">
      <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
              Хиты недели
            </span>
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Наведи мышь на карточку — фото начнут перелистываться сами
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="flex items-center gap-1.5 font-display text-sm text-purple-300 transition-colors hover:text-orange-300"
        >
          Смотреть все <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </Reveal>
      <ProductGrid products={products.slice(0, 8)} />
    </section>
  )
}

export default FeaturedProducts
