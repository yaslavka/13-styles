'use client'

import { useMemo } from 'react'

// Полностью анимированный фон сайта: пиксельная сетка, дрейфующие градиентные пятна,
// парящие пиксели и виньетка. Соответствует гамме: чёрный/синий/фиолетовый/оранжевый

const FLOAT_COLORS = ['#8b5cf6', '#f97316', '#3b82f6', '#c4b5fd', '#fdba74']

const PixelBackground = () => {
  const pixels = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: (i * 137 + 11) % 100,
        top: (i * 61 + 7) % 100,
        size: 4 + ((i * 17) % 3) * 3,
        delay: ((i * 0.73) % 6).toFixed(2),
        duration: (8 + ((i * 13) % 7)).toFixed(2),
        color: FLOAT_COLORS[i % FLOAT_COLORS.length],
        opacity: 0.25 + ((i * 7) % 10) / 22,
      })),
    []
  )

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070f]">
      <div className="absolute inset-0 bg-pixel-grid" />

      <div
        className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl animate-drift-a"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.34), transparent 65%)' }}
      />
      <div
        className="absolute -right-32 top-1/4 h-[460px] w-[460px] rounded-full blur-3xl animate-drift-b"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.26), transparent 65%)' }}
      />
      <div
        className="absolute bottom-[-160px] left-1/3 h-[500px] w-[500px] rounded-full blur-3xl animate-drift-c"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.3), transparent 65%)' }}
      />
      <div
        className="absolute right-1/4 top-[8%] h-[320px] w-[320px] rounded-full blur-3xl animate-drift-a"
        style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.16), transparent 65%)' }}
      />

      {pixels.map((pixel, index) => (
        <span
          key={index}
          className="absolute animate-float-y"
          style={{
            left: `${pixel.left}%`,
            top: `${pixel.top}%`,
            width: pixel.size,
            height: pixel.size,
            background: pixel.color,
            opacity: pixel.opacity,
            animationDelay: `${pixel.delay}s`,
            animationDuration: `${pixel.duration}s`,
            imageRendering: 'pixelated',
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(3,3,8,0.85) 100%)' }}
      />
    </div>
  )
}

export default PixelBackground
