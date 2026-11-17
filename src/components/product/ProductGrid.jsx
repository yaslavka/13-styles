'use client'

import ProductCard from '@/components/product/ProductCard'

// Сетка товаров с адаптивом и пустым состоянием

const GRID_COLS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

const ProductGrid = ({ products = [], className = '' }) => {
  if (!products.length) {
    return (
      <div className="pixel-corners flex flex-col items-center justify-center gap-3 border border-purple-500/25 bg-card/60 py-16 text-center">
        <span className="font-display text-2xl text-purple-300 animate-blink">▚▞▚</span>
        <p className="font-display text-lg text-white">Товары не найдены</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Попробуй изменить фильтры или поисковый запрос — в каталоге ещё 16+ позиций пиксельной коллекции.
        </p>
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
