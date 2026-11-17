'use client'

import { motion } from 'framer-motion'

// Лейблы на карточке товара: процент скидки + метки NEW / TOP / SALE

const BADGES = {
  new: { text: 'NEW', from: '#2563eb', to: '#60a5fa' },
  hit: { text: 'TOP', from: '#8b5cf6', to: '#c4b5fd' },
  sale: { text: 'SALE', from: '#ea580c', to: '#fdba74' },
}

const ProductBadges = ({ label, discountPercent }) => {
  const badge = label && label !== 'none' ? BADGES[label] : null
  if (!badge && !discountPercent) return null

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
      {discountPercent ? (
        <motion.span
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="rounded-full bg-gradient-to-r from-orange-600 to-orange-400 px-3 py-1 font-display text-xs font-bold text-white shadow-[0_6px_18px_rgba(249,115,22,0.55)]"
        >
          −{discountPercent}%
        </motion.span>
      ) : null}
      {badge ? (
        <span
          className="rounded-full px-3 py-1 font-display text-xs font-bold text-white shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
          style={{ background: `linear-gradient(120deg, ${badge.from}, ${badge.to})` }}
        >
          {badge.text}
        </span>
      ) : null}
    </div>
  )
}

export default ProductBadges
