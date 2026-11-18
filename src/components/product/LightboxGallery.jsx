'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Keyboard } from 'swiper/modules'
import 'swiper/css'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import useT from '@/hooks/useT'

// Лайтбокс: полноэкранный слайдер фото товара на Swiper (swiper/react).
// ВСЕГДА fixed на весь экран: не более 100vh/100vw (и 100dvh/100dvw),
// фото масштабируется внутрь (object-contain) — никогда не обрезается и не вылезает за экран.
// Листается перетаскиванием/свайпом мышью и пальцем (как Swiper React), стрелками
// клавиатуры и нашими кнопками; плавное скольжение слайдов — без миганий и пересоздания img.

const LightboxGallery = ({ open, images = [], index = 0, onIndexChange, onClose, alt = '' }) => {
  const t = useT()
  const total = images.length
  const swiperRef = useRef(null)

  const slideTo = (targetIndex) => {
    swiperRef.current?.slideToLoop(targetIndex)
  }

  const goPrev = () => {
    if (total < 2) return
    swiperRef.current?.slidePrev()
  }

  const goNext = () => {
    if (total < 2) return
    swiperRef.current?.slideNext()
  }

  if (!total) return null

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton
        className="fixed inset-0 left-0 top-0 z-[70] flex h-[100vh] max-h-[100dvh] w-[100vw] max-w-[100dvw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-none bg-[#050510]/95 p-0 backdrop-blur-xl sm:max-w-[100dvw]"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">{t('product.zoomHint')}</DialogDescription>

        {/* Сцена Swiper: все фото смонтированы заранее, слайды скользят — без миганий */}
        <div className="relative h-full w-full overflow-hidden">
          <Swiper
            modules={[A11y, Keyboard]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper
            }}
            onSlideChange={(swiper) => onIndexChange?.(swiper.realIndex)}
            initialSlide={index}
            loop={total > 1}
            speed={500}
            grabCursor={total > 1}
            keyboard={{ enabled: true, onlyInViewport: true }}
            className="h-full w-full"
            wrapperTag="div"
          >
            {images.map((src, slideIndex) => (
              <SwiperSlide key={src} className="!h-full !w-full">
                <img
                  src={src}
                  alt={`${alt} — ${slideIndex + 1}`}
                  className="absolute inset-0 m-auto h-full max-h-[100vh] max-h-[100dvh] w-full max-w-[100vw] object-contain"
                  draggable={false}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  itemProp="image"
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="glass-btn glass-btn-ghost absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center"
                aria-label={t('product.prevPhoto')}
              >
                <ChevronLeft className="h-6 w-6 text-white" aria-hidden />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="glass-btn glass-btn-ghost absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center"
                aria-label={t('product.nextPhoto')}
              >
                <ChevronRight className="h-6 w-6 text-white" aria-hidden />
              </button>

              <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
                {images.map((src, dotIndex) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => slideTo(dotIndex)}
                    aria-label={`Photo ${dotIndex + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      dotIndex === index ? 'w-7 bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.7)]' : 'w-2 bg-white/50 hover:bg-white'
                    }`}
                  />
                ))}
                <span className="ml-2 font-display text-xs font-bold text-purple-200">
                  {index + 1} / {total}
                </span>
              </div>
            </>
          ) : (
            <span className="glass-btn glass-btn-ghost pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-purple-200">
              <ZoomIn className="h-3.5 w-3.5 text-orange-300" aria-hidden />
              {t('product.zoomHint')}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LightboxGallery
