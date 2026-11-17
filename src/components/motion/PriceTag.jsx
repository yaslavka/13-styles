'use client'

import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/constants'
import useShop from '@/store/useShop'

// Цена товара: крупная текущая + мелкая перечёркнутая прошлая, в евро и локали витрины

const SIZES = {
  sm: { current: 'text-xl', old: 'text-xs' },
  md: { current: 'text-2xl', old: 'text-sm' },
  lg: { current: 'text-4xl', old: 'text-base' },
}

const PriceTag = ({ price, oldPrice, size = 'md', className = '' }) => {
  const locale = useShop((state) => state.locale)
  const scale = SIZES[size] || SIZES.md
  const hasOld = oldPrice && Number(oldPrice) > Number(price)
  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <motion.span
        key={`${price}-${locale}`}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`font-display font-bold ${scale.current} bg-gradient-to-r from-orange-300 via-orange-400 to-purple-400 bg-clip-text text-transparent`}
      >
        {formatPrice(price, locale)}
      </motion.span>
      {hasOld ? (
        <span className={`${scale.old} text-muted-foreground line-through decoration-orange-500/80 decoration-2`}>
          {formatPrice(oldPrice, locale)}
        </span>
      ) : null}
    </div>
  )
}

export default PriceTag
