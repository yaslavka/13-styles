'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingCart, Star, Truck, RotateCcw, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import useHoverSlider from '@/hooks/useHoverSlider'
import { styleGradient, formatPrice, AGE_LABEL } from '@/lib/constants'
import ProductBadges from '@/components/product/ProductBadges'
import PriceTag from '@/components/motion/PriceTag'
import PixelButton from '@/components/motion/PixelButton'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'

// Детальная страница товара: галерея с hover-слайдером, размеры, количество, характеристики

const ProductView = () => {
  const route = useShop((state) => state.route)
  const navigate = useShop((state) => state.navigate)
  const addToCart = useCart((state) => state.add)
  const openCart = useCart((state) => state.open)

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)

  const { index, hovering, handlers, setIndex, hasMultiple, progress } = useHoverSlider(product?.images || [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await API.get(`/api/products/${encodeURIComponent(route.slug)}`)
        if (cancelled) return
        setProduct(data.product)
        setSize((data.product.sizes || [])[0] || '')
        setQty(1)
        if (data.product.category?.slug) {
          const relatedData = await API.get(
            `/api/products?category=${data.product.category.slug}&limit=4&offset=0`
          )
          if (!cancelled) setRelated((relatedData.items || []).filter((item) => item.id !== data.product.id).slice(0, 4))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Товар не найден')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [route.slug])

  const handleAdd = (openAfter) => {
    if (product.sizes?.length && !size) {
      toast.warning('Выбери размер', { description: 'Пиксельные вещи нужно мерить!' })
      return
    }
    addToCart(product, { size, qty })
    if (openAfter) {
      openCart()
    } else {
      toast.success('Добавлено в корзину', { description: `${product.name} × ${qty}` })
    }
  }

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div className="pixel-corners aspect-square animate-pulse bg-card/60" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded bg-card/60" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-card/60" />
          <div className="h-24 w-full animate-pulse rounded bg-card/60" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="font-display text-5xl text-orange-500 animate-blink">▚▞</span>
        <h1 className="font-display text-2xl text-white">Товар не найден</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <PixelButton tone="primary" onClick={() => navigate('catalog')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> В каталог
        </PixelButton>
      </div>
    )
  }

  const image = product.images?.[index] || product.images?.[0] || ''

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={() => navigate('catalog')}
        className="mb-5 flex items-center gap-1.5 font-display text-sm text-purple-300 transition-colors hover:text-orange-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Назад в каталог
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div onMouseEnter={handlers.onMouseEnter} onMouseLeave={handlers.onMouseLeave}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="pixel-corners relative aspect-square overflow-hidden"
            style={{ background: styleGradient(product.category?.style ?? 2) }}
          >
            <ProductBadges label={product.label} discountPercent={product.discountPercent} />
            {image ? (
              <motion.img
                key={image}
                src={image}
                alt={`${product.name} — фото ${index + 1}`}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1, scale: hovering && hasMultiple ? 1.06 : 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 h-full w-full object-cover image-pixelated"
              />
            ) : null}
            <div className="absolute inset-x-0 top-0 h-1 bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-orange-400 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
                aria-hidden
              />
            </div>
          </motion.div>

          {hasMultiple ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {product.images.map((thumb, thumbIndex) => (
                <button
                  key={thumb}
                  type="button"
                  onClick={() => setIndex(thumbIndex)}
                  onMouseEnter={() => setIndex(thumbIndex)}
                  aria-label={`Фото ${thumbIndex + 1}`}
                  className={`pixel-corners-sm aspect-square overflow-hidden transition-all ${
                    thumbIndex === index ? 'ring-2 ring-orange-400' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ background: styleGradient(product.category?.style ?? 2) }}
                >
                  <img src={thumb} alt="" className="h-full w-full object-cover image-pixelated" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pixel-corners-sm border border-purple-500/40 bg-purple-500/10 px-2 py-1 font-display text-xs text-purple-200">
              {product.category?.name || 'Каталог'}
            </span>
            {product.gender !== 'unisex' ? (
              <span className="pixel-corners-sm border border-orange-500/40 bg-orange-500/10 px-2 py-1 font-display text-xs text-orange-300">
                {product.gender === 'men' ? 'Мужское' : 'Женское'}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-sm text-purple-200">
              <Star className="h-4 w-4 fill-orange-400 text-orange-400" aria-hidden />
              {product.rating?.toFixed(1)} · {product.reviews} отзывов
            </span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.shortDesc}</p>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <PriceTag price={product.price} oldPrice={product.oldPrice} size="lg" />
            {product.discountPercent ? (
              <span className="pixel-corners-sm bg-gradient-to-r from-orange-600 to-orange-400 px-2.5 py-1 font-display text-sm font-bold text-white">
                Выгода {formatPrice(product.oldPrice - product.price)}
              </span>
            ) : null}
          </div>

          {product.sizes?.length ? (
            <div className="mt-6">
              <p className="mb-2 font-display text-sm text-purple-200">Размер ({AGE_LABEL} лет)</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSize(option)}
                    aria-pressed={size === option}
                    className={`pixel-corners-sm min-w-11 px-3 py-2 font-display text-sm transition-all ${
                      size === option
                        ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-[0_0_14px_rgba(139,92,246,0.5)]'
                        : 'border border-purple-500/40 text-purple-200 hover:bg-purple-500/15'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="pixel-corners-sm flex items-center border border-purple-500/40 bg-[#0d0c1c]">
              <button
                type="button"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                className="h-11 w-11 font-display text-lg text-purple-200 hover:text-white"
                aria-label="Уменьшить количество"
              >
                −
              </button>
              <span className="w-10 text-center font-display text-white">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(20, value + 1))}
                className="h-11 w-11 font-display text-lg text-purple-200 hover:text-white"
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>

            <PixelButton tone="orange" className="h-11 px-6" onClick={() => handleAdd(false)}>
              <ShoppingCart className="mr-2 h-4 w-4" aria-hidden /> В корзину
            </PixelButton>
            <PixelButton tone="primary" className="h-11 px-6" onClick={() => handleAdd(true)}>
              Купить сразу
            </PixelButton>
          </div>

          <p className="mt-3 text-xs text-orange-300/90">
            {product.stock > 5 ? 'В наличии на складе' : product.stock > 0 ? `Осталось всего ${product.stock} шт — пиксели разлетаются!` : 'Скоро в наличии'}
          </p>

          <div className="pixel-corners mt-6 border border-purple-500/25 bg-card/70 p-5 backdrop-blur-sm">
            <h2 className="font-display text-lg text-white">Описание</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Бренд</dt>
              <dd className="text-purple-200">PIXART</dd>
              <dt className="text-muted-foreground">Возраст</dt>
              <dd className="text-purple-200">{AGE_LABEL} лет</dd>
              <dt className="text-muted-foreground">Цвета</dt>
              <dd className="text-purple-200">{product.colors?.join(', ') || 'ассорти'}</dd>
              <dt className="text-muted-foreground">Коллекция</dt>
              <dd className="text-purple-200">NEO / 13 STYLES</dd>
            </dl>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { icon: Truck, text: 'Доставка 1–3 дня' },
              { icon: RotateCcw, text: 'Возврат 14 дней' },
              { icon: ShieldCheck, text: 'Оплата при получении' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="pixel-corners-sm flex items-center gap-2 border border-purple-500/25 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
                <Icon className="h-4 w-4 text-orange-400" aria-hidden />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-14" aria-label="Похожие товары">
          <Reveal>
            <h2 className="mb-6 font-display text-2xl font-bold text-white sm:text-3xl">
              Похожий пиксель-лут
              <span className="ml-3 text-orange-500 animate-blink">▚</span>
            </h2>
          </Reveal>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  )
}

export default ProductView
