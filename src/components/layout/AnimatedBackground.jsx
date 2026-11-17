'use client'

import { useMemo } from 'react'

// Анимированный мультяшный фон: дрейфующие градиентные пятна, стеклянные боке-сферы,
// мягкое мерцание. Гамма: чёрный/синий/фиолетовый/светло-фиолетовый/оранжевый/персиковый

const AnimatedBackground = () => {
  const bokeh = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        left: (i * 89 + 7) % 100,
        top: (i * 47 + 13) % 100,
        size: 34 + ((i * 53) % 5) * 22,
        delay: ((i * 0.9) % 5).toFixed(2),
        duration: (7 + ((i * 11) % 5)).toFixed(2),
        opacity: 0.35 + ((i * 13) % 10) / 30,
      })),
    []
  )

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08081a]">
      <div
        className="absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full blur-3xl animate-drift-a"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.4), transparent 66%)' }}
      />
      <div
        className="absolute -right-36 top-1/4 h-[500px] w-[500px] rounded-full blur-3xl animate-drift-b"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.3), transparent 66%)' }}
      />
      <div
        className="absolute bottom-[-180px] left-1/3 h-[540px] w-[540px] rounded-full blur-3xl animate-drift-c"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.34), transparent 66%)' }}
      />
      <div
        className="absolute right-[22%] top-[6%] h-[340px] w-[340px] rounded-full blur-3xl animate-drift-a"
        style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.2), transparent 66%)' }}
      />

      {bokeh.map((orb, index) => (
        <span
          key={index}
          className="bokeh animate-float-y"
          style={{
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            width: orb.size,
            height: orb.size,
            opacity: orb.opacity,
            animationDelay: `${orb.delay}s`,
            animationDuration: `${orb.duration}s`,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 38%, transparent 42%, rgba(4,3,14,0.88) 100%)' }}
      />
    </div>
  )
}

export default AnimatedBackground
