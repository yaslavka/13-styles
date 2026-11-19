'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart, Star, Truck, RotateCcw, ShieldCheck, ZoomIn } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay } from 'swiper/modules'
import 'swiper/css'
import { toast } from 'sonner'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import useT from '@/hooks/useT'
import { styleGradient, formatPrice, AGE_LABEL } from '@/lib/constants'
import ProductBadges from '@/components/product/ProductBadges'
import LightboxGallery from '@/components/product/LightboxGallery'
import SmartImage from '@/components/product/SmartImage'
import { productImageAlt } from '@/lib/dto'
import PriceTag from '@/components/motion/PriceTag'
import GlassButton from '@/components/motion/GlassButton'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'

// Детальная страница товара: данные приходят с сервера (SSR — SEO-ready),
// большой слайдер-галерея на Swiper: перетаскивание/свайп, стрелки, дотсы,
// автолистание при наведении — плавное скольжение без миганий, зум-лайтбокс

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

  // Большой слайдер на Swiper: индекс синхронизируется с дотсами и превью,
  // при наведении — автолистание, при перетаскивании клик по зуму не срабатывает.
  // Порог сдвига 8px отслеживается напрямую по pointer-событиям — надёжно и для мыши, и для пальца.
  const images = product?.images || []
  const hasMultiple = images.length > 1
  const swiperRef = useRef(null)
  const dragMovedRef = useRef(false)
  const pointerStartRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const progress = hovering && hasMultiple ? ((index + 1) / images.length) * 100 : 0

  // Сброс выбора при переходе на другой товар (клиентская навигация между карточками):
  // подстройка состояния прямо в рендере — без каскадных ререндеров
  const [lastProductId, setLastProductId] = useState(product?.id)
  if (lastProductId !== product?.id) {
    setLastProductId(product?.id)
    setSize((product?.sizes || [])[0] || '')
    setQty(1)
    setLightboxOpen(false)
    setIndex(0)
  }

  if (!product) return null

  const soldOut = (product.stock ?? 0) <= 0

  const attachSwiper = (swiper) => {
    swiperRef.current = swiper
    swiper.autoplay?.stop()
  }

  // Перетаскивание слайдера не должно открывать лайтбокс — только настоящий клик/тап
  const onScenePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    dragMovedRef.current = false
  }

  const onScenePointerUp = (event) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return
    if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) {
      dragMovedRef.current = true
    }
  }

  const handleSceneClick = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    openLightbox()
  }

  const startHoverCycle = () => {
    setHovering(true)
    if (hasMultiple) swiperRef.current?.autoplay?.start()
  }

  const stopHoverCycle = () => {
    setHovering(false)
    if (hasMultiple) {
      swiperRef.current?.autoplay?.stop()
      swiperRef.current?.slideToLoop(0)
    }
  }

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

  const categoryHref = product.category
    ? href('subcategory', { slug: product.category.slug, sub: product.subcategory?.slug || '' })
    : href('catalog')

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Хлебные крошки (SEO + навигация) */}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold sm:mb-6 sm:text-sm">
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

      {/* grid-cols-1 (minmax(0,1fr)) обязателен: без явной колонки auto-трек +
          Swiper внутри aspect-square создаёт цикл по ширине — слайдер раздувается до 33Мpx на мобильных */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <div onMouseEnter={startHoverCycle} onMouseLeave={stopHoverCycle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="glow-frame relative aspect-square cursor-zoom-in overflow-hidden rounded-[1.8rem]"
            style={{ background: styleGradient(product.category?.style ?? 2) }}
            onClick={handleSceneClick}
            onPointerDownCapture={onScenePointerDown}
            onPointerUpCapture={onScenePointerUp}
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
            <div className="absolute inset-0 z-10">
              <ProductBadges label={product.label} discountPercent={product.discountPercent} />
            </div>

            <Swiper
              key={product.id}
              modules={[A11y, Autoplay]}
              onSwiper={attachSwiper}
              onSlideChange={(swiper) => setIndex(swiper.realIndex)}
              loop={hasMultiple}
              speed={550}
              grabCursor={hasMultiple}
              autoplay={{ delay: 850, disableOnInteraction: false, stopOnMouseEnter: false }}
              className="absolute inset-0 h-full w-full"
            >
              {images.map((src, slideIndex) => (
                <SwiperSlide key={src} className="h-full w-full">
                  <SmartImage
                    src={src}
                    alt={productImageAlt(product, slideIndex)}
                    spinner="lg"
                    className={`h-full w-full object-cover transition-transform duration-[600ms] ease-out ${
                      hovering && hasMultiple ? 'scale-[1.05]' : 'scale-100'
                    }`}
                    loading={slideIndex === 0 ? 'eager' : 'lazy'}
                    itemProp="image"
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="absolute inset-x-6 top-0 h-1 bg-black/25">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-purple-400 to-orange-400 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
                aria-hidden
              />
            </div>

            {hasMultiple ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    swiperRef.current?.slidePrev()
                  }}
                  className="glass-btn glass-btn-ghost absolute left-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center sm:left-3 sm:h-11 sm:w-11"
                  aria-label={t('product.prevPhoto')}
                >
                  <ChevronLeft className="h-5 w-5 text-white" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    swiperRef.current?.slideNext()
                  }}
                  className="glass-btn glass-btn-ghost absolute right-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center sm:right-3 sm:h-11 sm:w-11"
                  aria-label={t('product.nextPhoto')}
                >
                  <ChevronRight className="h-5 w-5 text-white" aria-hidden />
                </button>

                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                  {images.map((_, dotIndex) => (
                    <button
                      key={dotIndex}
                      type="button"
                      aria-label={`Photo ${dotIndex + 1}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        swiperRef.current?.slideToLoop(dotIndex)
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        dotIndex === index ? 'w-7 bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.7)]' : 'w-2 bg-white/60 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}

            <span className="glass-btn glass-btn-ghost absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-purple-200">
              <ZoomIn className="h-3.5 w-3.5 shrink-0 text-orange-300" aria-hidden />
              <span className="hidden sm:inline">{t('product.zoomHint')}</span>
            </span>
          </motion.div>

          {hasMultiple ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5 sm:mt-4 sm:gap-4">
              {images.map((thumb, thumbIndex) => (
                <button
                  key={thumb}
                  type="button"
                  onClick={() => swiperRef.current?.slideToLoop(thumbIndex)}
                  onMouseEnter={() => swiperRef.current?.slideToLoop(thumbIndex)}
                  aria-label={`Photo ${thumbIndex + 1}`}
                  className={`relative aspect-square overflow-hidden rounded-2xl transition-all duration-300 ${
                    thumbIndex === index ? 'ring-2 ring-orange-400 shadow-[0_8px_24px_rgba(249,115,22,0.4)]' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ background: styleGradient(product.category?.style ?? 2) }}
                >
                  <SmartImage src={thumb} alt="" spinner="sm" className="h-full w-full object-cover" />
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

          {product.brand ? (
            <p className="mt-2 font-display text-sm font-bold uppercase tracking-widest text-orange-300">
              {product.brand}
            </p>
          ) : null}
          <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">{product.name}</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">{product.shortDesc}</p>

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

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
            <div className={`glass-btn glass-btn-ghost flex items-center justify-center self-center rounded-full ${soldOut ? 'pointer-events-none opacity-50' : ''}`}>
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
              className={`h-12 w-full justify-center px-7 sm:w-auto ${soldOut ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => handleAdd(false)}
              disabled={soldOut}
            >
              <ShoppingCart className="mr-2 h-4 w-4" aria-hidden /> {soldOut ? t('product.outOfStock') : t('product.addToCart')}
            </GlassButton>
            <GlassButton
              tone="primary"
              className={`h-12 w-full justify-center px-7 sm:w-auto ${soldOut ? 'pointer-events-none opacity-50' : ''}`}
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

          <div className="glass-panel mt-7 p-4 sm:p-6">
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">{t('product.description')}</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-muted-foreground">{product.description}</p>
            <dl className="mt-5 grid grid-cols-1 gap-y-2.5 text-sm font-semibold sm:grid-cols-2 sm:gap-x-6">
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
        <section className="mt-12 sm:mt-16" aria-label="Related products">
          <Reveal>
            <h2 className="mb-6 font-display text-2xl font-extrabold text-white sm:mb-8 sm:text-4xl">{t('product.related')}</h2>
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
        alt={productImageAlt(product, index)}
      />
    </div>
  )
}

export default ProductView
