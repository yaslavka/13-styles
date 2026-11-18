'use client'

import { motion } from 'framer-motion'

// Базовая анимированная карточка с градиентной рамкой и свечение-шифтом при наведении

const ShineCard = ({ children, className = '', style, onClick, glowColor = '#8b5cf6' }) => (
  <motion.div
    whileHover={{ y: -6 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    className={`group glow-frame pixel-corners relative overflow-hidden bg-card/80 backdrop-blur-sm ${className}`}
    style={style}
    onClick={onClick}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{ background: `radial-gradient(420px circle at 50% 0%, ${glowColor}22, transparent 70%)` }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-8 -top-24 h-40 rotate-6 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-y-[520px]"
    />
    {children}
  </motion.div>
)

export default ShineCard
