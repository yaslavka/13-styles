'use client'

import { useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import useT from '@/hooks/useT'

// Лайтбокс: слайдер фото товара в увеличенном формате (клик по фото на странице товара).
// ВСЕГДА fixed на весь экран: не более 100vh/100vw и не более 100dvh/100dvw,
// изображение масштабируется внутрь (object-contain) — никогда не обрезается
// и не вылезает за пределы экрана.

const LightboxGallery = ({ open, images = [], index = 0, onIndexChange, onClose, alt = '' }) => {
  const t = useT()
  const total = images.length

  const step = useCallback(
    (delta) => {
      if (total < 2) return
      onIndexChange((index + delta + total) % total)
    },
    [index, onIndexChange, total]
  )

  // Стрелки клавиатуры листают фото, закрытие — Esc (обрабатывает Radix Dialog)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step])

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

        {/* Сцена: изображение всегда внутри вьюпорта — object-contain, без обрезки */}
        <div className="relative h-full w-full overflow-hidden">
          <img
            key={images[index]}
            src={images[index]}
            alt={`${alt} — ${index + 1}`}
            className="absolute inset-0 m-auto h-full max-h-[100vh] max-h-[100dvh] w-full max-w-[100vw] animate-pop object-contain"
            draggable={false}
            itemProp="image"
          />

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                className="glass-btn glass-btn-ghost fixed left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center"
                aria-label={t('product.prevPhoto')}
              >
                <ChevronLeft className="h-6 w-6 text-white" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="glass-btn glass-btn-ghost fixed right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center"
                aria-label={t('product.nextPhoto')}
              >
                <ChevronRight className="h-6 w-6 text-white" aria-hidden />
              </button>

              <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
                {images.map((src, dotIndex) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => onIndexChange(dotIndex)}
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
            <span className="glass-btn glass-btn-ghost pointer-events-none fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-purple-200">
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
