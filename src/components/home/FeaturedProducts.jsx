'use client'

import { ArrowRight } from 'lucide-react'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'

// Хиты продаж на главной

const FeaturedProducts = ({ products = [] }) => {
  const navigate = useShop((state) => state.navigate)
  const t = useT()

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-label="Hits of the week">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">
            <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-orange-300 bg-clip-text text-transparent">
              {t('home.hits')}
            </span>
          </h2>
          <p className="mt-2 text-base font-semibold text-muted-foreground">{t('home.hitsSub')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('catalog')}
          className="glass-btn glass-btn-ghost flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-sm font-bold text-purple-200"
        >
          {t('home.viewAllShort')} <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </Reveal>
      <ProductGrid products={products.slice(0, 8)} />
    </section>
  )
}

export default FeaturedProducts
