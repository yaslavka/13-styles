'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import useHoverSlider from '@/hooks/useHoverSlider'
import useCart from '@/store/useCart'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import { styleGradient } from '@/lib/constants'
import ProductBadges from '@/components/product/ProductBadges'
import SmartImage from '@/components/product/SmartImage'
import PriceTag from '@/components/motion/PriceTag'

// Карточка товара:
//  - фото-слайдер с плавным горизонтальным листанием при наведении мыши (без мигания)
//  - лейблы (скидка/акция/хит), название, краткое описание
//  - крупная текущая цена + мелкая перечёркнутая прошлая
//  - товар «нет в наличии» остаётся на витрине, но кнопка покупки отключена

const ProductCard = ({ product }) => {
  const { index, hovering, handlers, setIndex, hasMultiple, progress } = useHoverSlider(product.images)
  const addToCart = useCart((state) => state.add)
  const openCart = useCart((state) => state.open)
  const navigate = useShop((state) => state.navigate)
  const href = useShop((state) => state.href)
  const locale = useShop((state) => state.locale)
  const t = useT()

  // SEO: каждая карточка товара — настоящая ссылка /product/[slug]

  const images = product.images || []
  const soldOut = (product.stock ?? 0) <= 0

  const quickAdd = (event) => {
    event.stopPropagation()
    if (soldOut) {
      toast.warning(t('product.outOfStock'), { description: t('product.outOfStockNote') })
      return
    }
    addToCart(product, { size: product.sizes?.[0] || '', qty: 1 })
    toast.success(t('toast.added'), { description: t('product.addedToastDesc', { name: product.name, qty: 1 }) })
    openCart()
  }

  const openProduct = () => navigate('product', { slug: product.slug })

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      onClick={openProduct}
      className="group glow-frame glass-card relative cursor-pointer overflow-hidden transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(139,92,246,0.3)]"
      itemScope
      itemType="https://schema.org/Product"
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: styleGradient(product.category?.style ?? 2) }}>
        <ProductBadges label={product.label} discountPercent={product.discountPercent} />

        {/* Плавно скользящая лента фотографий */}
        <div
          className="absolute inset-0 flex transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((src, slideIndex) => (
            <div key={src} className="relative h-full w-full shrink-0">
              <SmartImage
                src={src}
                alt={`${product.name} — ${slideIndex + 1}`}
                className={`h-full w-full object-cover transition-transform duration-[600ms] ease-out ${
                  hovering && hasMultiple ? 'scale-[1.07]' : 'scale-100'
                }`}
                itemProp="image"
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 h-1 bg-black/20">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-purple-400 to-orange-400 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>

        {hasMultiple ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
            {images.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Photo ${dotIndex + 1}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setIndex(dotIndex)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  dotIndex === index ? 'w-6 bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.7)]' : 'w-2 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        ) : null}

        {soldOut ? (
          <span
            className="absolute bottom-3 left-3 z-10 rounded-full border border-red-400/50 bg-[#1a0a12]/90 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wide text-red-300"
            role="status"
          >
            {t('product.outOfStock')}
          </span>
        ) : null}

        <div className={`absolute inset-x-4 bottom-4 translate-y-[135%] transition-transform duration-300 ease-out group-hover:translate-y-0 ${soldOut ? 'opacity-90' : ''}`}>
          <motion.button
            type="button"
            whileTap={{ scale: soldOut ? 1 : 0.94 }}
            onClick={quickAdd}
            disabled={soldOut}
            className={`glass-btn flex w-full items-center justify-center gap-2 rounded-full py-3 font-display text-sm font-bold text-white ${
              soldOut ? 'glass-btn-ghost opacity-80' : 'glass-btn-orange'
            }`}
            aria-label={`${soldOut ? t('product.outOfStock') : t('product.addToCart')}: ${product.name}`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {soldOut ? t('product.outOfStock') : t('product.addToCart')}
          </motion.button>
        </div>
      </div>

      <div className="space-y-1.5 p-4">
        <h3 className="truncate font-display text-lg font-bold text-white transition-colors group-hover:text-orange-300" itemProp="name">
          <Link href={href('product', { slug: product.slug })} className="hover:text-orange-300" aria-label={product.name}>
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-relaxed text-muted-foreground" itemProp="description">
          {product.shortDesc}
        </p>

        <div className="flex items-center justify-between pt-1.5">
          <PriceTag price={product.price} oldPrice={product.oldPrice} size="md" />
          <span className="flex items-center gap-1 text-sm font-bold text-purple-300">
            <Star className="h-4 w-4 fill-orange-400 text-orange-400" aria-hidden />
            {product.rating?.toFixed(1)}
            <span className="font-semibold text-muted-foreground">({product.reviews})</span>
          </span>
        </div>
      </div>
    </motion.article>
  )
}

export default ProductCard
