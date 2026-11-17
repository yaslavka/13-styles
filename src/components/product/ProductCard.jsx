'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import useHoverSlider from '@/hooks/useHoverSlider'
import useCart from '@/store/useCart'
import useShop from '@/store/useShop'
import { styleGradient } from '@/lib/constants'
import ProductBadges from '@/components/product/ProductBadges'
import PriceTag from '@/components/motion/PriceTag'

// Карточка товара:
//  - фото-слайдер, перелистывающийся при наведении мыши
//  - лейблы (скидка/акция/хит), название, краткое описание
//  - крупная текущая цена + мелкая перечёркнутая прошлая

const ProductCard = ({ product }) => {
  const { index, hovering, handlers, setIndex, hasMultiple, progress } = useHoverSlider(product.images)
  const addToCart = useCart((state) => state.add)
  const openCart = useCart((state) => state.open)
  const navigate = useShop((state) => state.navigate)

  const categoryStyle = product.category?.style ?? 2
  const image = product.images?.[index] || product.images?.[0] || ''

  const quickAdd = (event) => {
    event.stopPropagation()
    addToCart(product, { size: product.sizes?.[0] || '', qty: 1 })
    toast.success('Добавлено в корзину', { description: product.name })
    openCart()
  }

  const openProduct = () => navigate('product', { slug: product.slug })

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      onClick={openProduct}
      className="group pixel-corners glow-frame relative cursor-pointer overflow-hidden bg-card/85 backdrop-blur-sm transition-shadow hover:shadow-[0_18px_50px_rgba(139,92,246,0.25)]"
      itemScope
      itemType="https://schema.org/Product"
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: styleGradient(categoryStyle) }}>
        <ProductBadges label={product.label} discountPercent={product.discountPercent} />

        {image ? (
          <motion.img
            key={image}
            src={image}
            alt={`${product.name} — фото ${index + 1}`}
            initial={{ opacity: 0.25, scale: 1.04 }}
            animate={{ opacity: 1, scale: hovering && hasMultiple ? 1.07 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 h-full w-full object-cover image-pixelated"
            loading="lazy"
            itemProp="image"
          />
        ) : null}

        <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-orange-400 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>

        {hasMultiple ? (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
            {product.images.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Фото ${dotIndex + 1}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setIndex(dotIndex)
                }}
                className={`h-1.5 transition-all duration-300 ${
                  dotIndex === index ? 'w-5 bg-orange-400' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        ) : null}

        <div className="absolute inset-x-3 bottom-3 translate-y-[130%] transition-transform duration-300 group-hover:translate-y-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={quickAdd}
            className="pixel-corners-sm flex w-full items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-purple-600 py-2.5 font-display text-sm text-white shadow-[0_0_20px_rgba(249,115,22,0.45)]"
            aria-label={`Добавить ${product.name} в корзину`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            В корзину
          </motion.button>
        </div>
      </div>

      <div className="space-y-1.5 p-3.5">
        <h3
          className="truncate font-display text-base text-white transition-colors group-hover:text-orange-300"
          itemProp="name"
        >
          {product.name}
        </h3>
        <p className="line-clamp-2 min-h-[2.4rem] text-xs leading-relaxed text-muted-foreground" itemProp="description">
          {product.shortDesc}
        </p>

        <div className="flex items-center justify-between pt-1">
          <PriceTag price={product.price} oldPrice={product.oldPrice} size="md" />
          <span className="flex items-center gap-1 text-xs text-purple-300">
            <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" aria-hidden />
            {product.rating?.toFixed(1)}
            <span className="text-muted-foreground">({product.reviews})</span>
          </span>
        </div>
      </div>
    </motion.article>
  )
}

export default ProductCard
