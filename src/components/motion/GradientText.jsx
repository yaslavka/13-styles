'use client'

import { styleTextGradient, STYLES } from '@/lib/constants'

// Переливающийся градиентный текст в фирменных стилях PIXART

const GradientText = ({ children, styleIndex = 2, as = 'span', shimmer = true, className = '' }) => {
  const Tag = as
  const safeIndex = ((Number(styleIndex) || 0) % STYLES.length + STYLES.length) % STYLES.length
  return (
    <Tag
      className={`${shimmer ? 'text-shimmer' : ''} ${className}`}
      style={{ backgroundImage: styleTextGradient(safeIndex) }}
    >
      {children}
    </Tag>
  )
}

export default GradientText
