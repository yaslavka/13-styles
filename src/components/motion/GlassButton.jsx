'use client'

import { Button } from '@/components/ui/button'

// Стеклянная выпуклая кнопка — базовый интерактивный элемент витрины

const TONES = {
  primary: {
    className:
      'glass-btn glass-btn-primary text-white font-display tracking-wide shadow-[0_10px_26px_rgba(139,92,246,0.4)]',
  },
  orange: {
    className:
      'glass-btn glass-btn-orange text-white font-display tracking-wide shadow-[0_10px_26px_rgba(249,115,22,0.4)]',
  },
  ghost: {
    className: 'glass-btn glass-btn-ghost text-purple-100 font-display tracking-wide',
  },
  dark: {
    className:
      'glass-btn glass-btn-ghost text-purple-100/90 border-purple-400/40 font-display tracking-wide',
  },
}

const GlassButton = ({ children, tone = 'primary', className = '', ...props }) => {
  const toneConfig = TONES[tone] || TONES.primary
  return (
    <Button className={`${toneConfig.className} ${className}`} {...props}>
      {children}
    </Button>
  )
}

export default GlassButton
