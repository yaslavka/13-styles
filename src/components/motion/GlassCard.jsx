'use client'

import { motion } from 'framer-motion'

// Стеклянная мультяшная карточка с переливающейся рамкой и глянец-блеском при наведении

const GlassCard = ({ children, className = '', style, onClick, glowColor = '#8b5cf6' }) => (
  <motion.div
    whileHover={{ y: -8 }}
    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
    className={`group glow-frame glass-card relative overflow-hidden ${className}`}
    style={style}
    onClick={onClick}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{ background: `radial-gradient(460px circle at 50% 0%, ${glowColor}26, transparent 70%)` }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-10 -top-28 h-44 rotate-6 bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 group-hover:translate-y-[560px]"
    />
    {children}
  </motion.div>
)

export default GlassCard
