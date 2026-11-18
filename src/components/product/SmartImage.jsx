'use client'

import { useState } from 'react'

// Картинка с прелоадером: пока фото не загрузилось, на его месте — пульсирующий
// стеклянный фон со спиннером (никаких пустых мест), после загрузки оверлей
// плавно растворяется. Оверлей ничего не перекрывает для кликов (pointer-events-none).
// Требование: контейнер вокруг должен иметь position: relative — оверлей
// позиционируется absolute inset-0 внутри ближайшего positioned-родителя.

const SPINNER_SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-7 w-7 border-2',
  lg: 'h-9 w-9 border-[3px]',
}

const SmartImage = ({ src, alt = '', className = '', spinner = 'md', loading = 'lazy', ...props }) => {
  const [ready, setReady] = useState(false)

  // Картинка из кэша бывает полностью готова ещё до onLoad (или вовсе без него) —
  // проверяем в ref-callback сразу при монтировании, без лишнего ререндера
  const attachImg = (node) => {
    if (node?.complete && node.naturalWidth > 0) setReady(true)
  }

  return (
    <>
      <img
        ref={attachImg}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
        className={className}
        {...props}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 grid place-items-center transition-opacity duration-300 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className={`absolute inset-0 bg-white/[0.05] ${ready ? '' : 'animate-pulse'}`} />
        <span
          className={`relative block rounded-full border-white/10 border-t-orange-400 ${
            SPINNER_SIZES[spinner] || SPINNER_SIZES.md
          } ${ready ? '' : 'animate-spin'}`}
        />
      </span>
    </>
  )
}

export default SmartImage
