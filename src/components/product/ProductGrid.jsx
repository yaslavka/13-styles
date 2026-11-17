'use client'

import ProductCard from '@/components/product/ProductCard'
import useT from '@/hooks/useT'

// Сетка товаров с адаптивом и пустым состоянием

const GRID_COLS = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

const ProductGrid = ({ products = [], className = '' }) => {
  const t = useT()

  if (!products.length) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="font-display text-4xl text-purple-400/70 animate-blink">✦ ✧ ✦</span>
        <p className="font-display text-2xl font-bold text-white">{t('catalog.emptyTitle')}</p>
        <p className="max-w-sm text-sm font-semibold text-muted-foreground">{t('catalog.emptyText')}</p>
      </div>
    )
  }

  return (
    <div className={`${GRID_COLS} ${className}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export default ProductGrid
