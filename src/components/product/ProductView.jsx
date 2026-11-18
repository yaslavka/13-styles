'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingCart, Star, Truck, RotateCcw, ShieldCheck, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import useHoverSlider from '@/hooks/useHoverSlider'
import useT from '@/hooks/useT'
import { styleGradient, formatPrice, AGE_LABEL } from '@/lib/constants'
import ProductBadges from '@/components/product/ProductBadges'
import LightboxGallery from '@/components/product/LightboxGallery'
import PriceTag from '@/components/motion/PriceTag'
import GlassButton from '@/components/motion/GlassButton'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'

// Детальная страница товара: данные приходят с сервера (SSR — SEO-ready),
// скользящая галерея с зум-лайтбоксом, размеры, количество, характеристики

const ProductView = ({ product, related = [] }) => {
  const navigate = useShop((state) => state.navigate)
  const href = useShop((state) => state.href)
  const locale = useShop((state) => state.locale)
  const addToCart = useCart((state) => state.add)
  const openCart = useCart((state) => state.open)
  const t = useT()

  const [size, setSize] = useState((product?.sizes || [])[0] || '')
  const [qty, setQty] = useState(1)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Сброс выбора при переходе на другой товар (клиентская навигация между карточками):
  // подстройка состояния прямо в рендере — без каскадных ререндеров
  const [lastProductId, setLastProductId] = useState(product?.id)
  if (lastProductId !== product?.id) {
    setLastProductId(product?.id)
    setSize((product?.sizes || [])[0] || '')
    setQty(1)
    setLightboxOpen(false)
  }

  const { index, hovering, handlers, setIndex, hasMultiple, progress } = useHoverSlider(product?.images || [])

  if (!product) return null

  const soldOut = (product.stock ?? 0) <= 0

  const handleAdd = (openAfter) => {
    if (soldOut) {
      toast.warning(t('product.outOfStock'), { description: t('product.outOfStockNote') })
      return
    }
    if (product.sizes?.length && !size) {
      toast.warning(t('product.chooseSize'), { description: t('product.chooseSizeHint') })
      return
    }
    addToCart(product, { size, qty })
    if (openAfter) {
      openCart()
    } else {
      toast.success(t('toast.added'), { description: t('product.addedToastDesc', { name: product.name, qty }) })
    }
  }

  const openLightbox = (photoIndex) => {
    setLightboxIndex(Number.isInteger(photoIndex) ? photoIndex : index)
    setLightboxOpen(true)
  }

  const images = product.images || []
  const categoryHref = product.category
    ? href('subcategory', { slug: product.category.slug, sub: product.subcategory?.slug || '' })
    : href('catalog')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Хлебные крошки (SEO + навигация) */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold">
        <Link href={href('home')} className="text-purple-300 transition-colors hover:text-orange-300">
          13 STYLES
        </Link>
        <span className="text-purple-500/60" aria-hidden>/</span>
        <Link
          href={product.category ? href('category', { slug: product.category.slug }) : href('catalog')}
          className="text-purple-300 transition-colors hover:text-orange-300"
        >
          {product.category?.name || t('catalog.title')}
        </Link>
        {product.subcategory ? (
          <>
            <span className="text-purple-500/60" aria-hidden>/</span>
            <Link href={categoryHref} className="text-purple-300 transition-colors hover:text-orange-300">
              {product.subcategory.name}
            </Link>
          </>
        ) : null}
        <span className="text-purple-500/60" aria-hidden>/</span>
        <span className="text-purple-100">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div onMouseEnter={handlers.onMouseEnter} onMouseLeave={handlers.onMouseLeave}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="glow-frame relative aspect-square cursor-zoom-in overflow-hidden rounded-[1.8rem]"
            style={{ background: styleGradient(product.category?.style ?? 2) }}
            onClick={() => openLightbox()}
            role="button"
            tabIndex={0}
            aria-label={`${product.name} — ${t('product.zoomHint')}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openLightbox()
              }
            }}
          >
            <ProductBadges label={product.label} discountPercent={product.discountPercent} />

            <div
              className="absolute inset-0 flex transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {images.map((src, slideIndex) => (
                <img
                  key={src}
                  src={src}
                  alt={`${product.name} — ${slideIndex + 1}`}
                  className={`h-full w-full shrink-0 object-cover transition-transform duration-[650ms] ease-out ${
                    hovering && hasMultiple ? 'scale-[1.05]' : 'scale-100'
                  }`}
                />
              ))}
            </div>

            <div className="absolute inset-x-6 top-0 h-1 bg-black/25">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-purple-400 to-orange-400 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
                aria-hidden
              />
            </div>

            {hasMultiple ? (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-hidden>
                {images.map((_, dotIndex) => (
                  <span key={dotIndex} className={`h-2 rounded-full transition-all duration-300 ${dotIndex === index ? 'w-7 bg-orange-400' : 'w-2 bg-white/60'}`} />
                ))}
              </div>
            ) : null}

            <span className="glass-btn glass-btn-ghost absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-purple-200">
              <ZoomIn className="h-3.5 w-3.5 text-orange-300" aria-hidden />
              {t('product.zoomHint')}
            </span>
          </motion.div>

          {hasMultiple ? (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {images.map((thumb, thumbIndex) => (
                <button
                  key={thumb}
                  type="button"
                  onClick={() => setIndex(thumbIndex)}
                  onMouseEnter={() => setIndex(thumbIndex)}
                  aria-label={`Photo ${thumbIndex + 1}`}
                  className={`aspect-square overflow-hidden rounded-2xl transition-all duration-300 ${
                    thumbIndex === index ? 'ring-2 ring-orange-400 shadow-[0_8px_24px_rgba(249,115,22,0.4)]' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ background: styleGradient(product.category?.style ?? 2) }}
                >
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={product.category ? href('category', { slug: product.category.slug }) : href('catalog')}
              className="glass-btn glass-btn-ghost rounded-full px-3.5 py-1.5 font-display text-xs font-bold text-purple-200"
            >
              {product.category?.name || t('catalog.title')}
            </Link>
            {product.gender !== 'unisex' ? (
              <span className="glass-btn glass-btn-ghost rounded-full px-3.5 py-1.5 font-display text-xs font-bold text-orange-200">
                {product.gender === 'men' ? t('product.men') : t('product.women')}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-sm font-bold text-purple-200">
              <Star className="h-4 w-4 fill-orange-400 text-orange-400" aria-hidden />
              {product.rating?.toFixed(1)} · {t('product.reviews', { count: product.reviews })}
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-extrabold text-white sm:text-5xl">{product.name}</h1>
          <p className="mt-3 text-base font-semibold leading-relaxed text-muted-foreground">{product.shortDesc}</p>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <PriceTag price={product.price} oldPrice={product.oldPrice} size="lg" />
            {product.discountPercent ? (
              <span className="glass-btn glass-btn-orange rounded-full px-4 py-1.5 font-display text-sm font-bold text-white">
                {t('product.youSave', { amount: formatPrice(product.oldPrice - product.price, locale) })}
              </span>
            ) : null}
          </div>

          {product.sizes?.length ? (
            <div className="mt-7">
              <p className="mb-3 font-display text-base font-bold text-purple-200">{t('product.chooseSize')}</p>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSize(option)}
                    aria-pressed={size === option}
                    className={`min-w-12 rounded-full px-4 py-2.5 font-display text-sm font-bold transition-all ${
                      size === option
                        ? 'glass-btn glass-btn-primary text-white'
                        : 'glass-btn glass-btn-ghost text-purple-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <div className={`glass-btn glass-btn-ghost flex items-center rounded-full ${soldOut ? 'pointer-events-none opacity-50' : ''}`}>
              <button
                type="button"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                className="h-12 w-12 font-display text-xl text-purple-200 hover:text-white"
                aria-label="Decrease quantity"
                disabled={soldOut}
              >
                −
              </button>
              <span className="w-10 text-center font-display text-lg font-bold text-white">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(20, value + 1))}
                className="h-12 w-12 font-display text-xl text-purple-200 hover:text-white"
                aria-label="Increase quantity"
                disabled={soldOut}
              >
                +
              </button>
            </div>

            <GlassButton
              tone="orange"
              className={`h-12 px-7 ${soldOut ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => handleAdd(false)}
              disabled={soldOut}
            >
              <ShoppingCart className="mr-2 h-4 w-4" aria-hidden /> {soldOut ? t('product.outOfStock') : t('product.addToCart')}
            </GlassButton>
            <GlassButton
              tone="primary"
              className={`h-12 px-7 ${soldOut ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => handleAdd(true)}
              disabled={soldOut}
            >
              {t('product.buyNow')}
            </GlassButton>
          </div>

          {soldOut ? (
            <p className="mt-4 flex items-center gap-2 font-display text-sm font-bold text-red-400">
              <span className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1" role="status">
                {t('product.outOfStock')}
              </span>
              <span className="text-muted-foreground">{t('product.outOfStockNote')}</span>
            </p>
          ) : (
            <p className="mt-4 text-sm font-bold text-orange-300/90">
              {product.stock > 5
                ? t('product.inStock')
                : product.stock > 0
                  ? t('product.lowStock', { count: product.stock })
                  : t('product.soon')}
            </p>
          )}

          <div className="glass-panel mt-7 p-6">
            <h2 className="font-display text-xl font-bold text-white">{t('product.description')}</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-muted-foreground">{product.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm font-semibold">
              <dt className="text-muted-foreground">{t('product.brand')}</dt>
              <dd className="text-purple-200">13 STYLES</dd>
              <dt className="text-muted-foreground">{t('product.age')}</dt>
              <dd className="text-purple-200">{AGE_LABEL}</dd>
              <dt className="text-muted-foreground">{t('product.colors')}</dt>
              <dd className="text-purple-200">{product.colors?.join(', ') || '—'}</dd>
              <dt className="text-muted-foreground">{t('product.collection')}</dt>
              <dd className="text-purple-200">NEO / 13 STYLES</dd>
            </dl>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, text: t('product.delivery') },
              { icon: RotateCcw, text: t('product.return') },
              { icon: ShieldCheck, text: t('product.payment') },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="glass-btn glass-btn-ghost flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-purple-200">
                <Icon className="h-4 w-4 text-orange-300" aria-hidden />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-16" aria-label="Related products">
          <Reveal>
            <h2 className="mb-8 font-display text-3xl font-extrabold text-white sm:text-4xl">{t('product.related')}</h2>
          </Reveal>
          <ProductGrid products={related} />
        </section>
      ) : null}

      <LightboxGallery
        open={lightboxOpen}
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxOpen(false)}
        alt={product.name}
      />
    </div>
  )
}

export default ProductView
