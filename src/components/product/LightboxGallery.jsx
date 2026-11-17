'use client'

import { useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import useT from '@/hooks/useT'

// Лайтбокс: слайдер фото товара в увеличенном формате (клик по фото на странице товара)

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
        className="left-0 top-0 h-[100dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-none bg-[#050510]/95 p-0 backdrop-blur-xl sm:max-w-none"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">{t('product.zoomHint')}</DialogDescription>

        <div className="relative flex h-full w-full flex-col items-center justify-center">
          <div className="flex h-full w-full items-center justify-center px-4 py-16">
            <img
              key={images[index]}
              src={images[index]}
              alt={`${alt} — ${index + 1}`}
              className="max-h-full max-w-full animate-pop rounded-2xl object-contain shadow-[0_30px_90px_rgba(139,92,246,0.35)]"
              itemProp="image"
            />
          </div>

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                className="glass-btn glass-btn-ghost absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center"
                aria-label={t('product.prevPhoto')}
              >
                <ChevronLeft className="h-6 w-6 text-white" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="glass-btn glass-btn-ghost absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center"
                aria-label={t('product.nextPhoto')}
              >
                <ChevronRight className="h-6 w-6 text-white" aria-hidden />
              </button>

              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
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
            <span className="glass-btn glass-btn-ghost pointer-events-none absolute bottom-6 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-purple-200">
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
