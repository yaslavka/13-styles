'use client'

import { motion } from 'framer-motion'

// Лейблы на карточке товара: процент скидки + метки NEW / ХИТ / SALE

const BADGES = {
  new: { text: 'NEW', from: '#2563eb', to: '#60a5fa' },
  hit: { text: 'ХИТ', from: '#8b5cf6', to: '#c4b5fd' },
  sale: { text: 'SALE', from: '#ea580c', to: '#fdba74' },
}

const ProductBadges = ({ label, discountPercent }) => {
  const badge = label && label !== 'none' ? BADGES[label] : null
  if (!badge && !discountPercent) return null

  return (
    <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5">
      {discountPercent ? (
        <motion.span
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="pixel-corners-sm bg-gradient-to-r from-orange-600 to-orange-400 px-2 py-1 font-display text-xs font-bold text-white shadow-[0_0_14px_rgba(249,115,22,0.55)]"
        >
          −{discountPercent}%
        </motion.span>
      ) : null}
      {badge ? (
        <span
          className="pixel-corners-sm px-2 py-1 font-display text-xs font-bold text-white shadow-lg"
          style={{ background: `linear-gradient(120deg, ${badge.from}, ${badge.to})` }}
        >
          {badge.text}
        </span>
      ) : null}
    </div>
  )
}

export default ProductBadges
