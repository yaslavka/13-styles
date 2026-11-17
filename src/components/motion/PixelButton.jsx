'use client'

import { Button } from '@/components/ui/button'

// Пиксельная кнопка с градиентом и свечением (обёртка над shadcn Button)

const TONES = {
  primary: {
    className:
      'text-white font-display tracking-wide bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 hover:brightness-110 shadow-[0_0_18px_rgba(139,92,246,0.45)] hover:shadow-[0_0_26px_rgba(249,115,22,0.55)]',
  },
  orange: {
    className:
      'text-white font-display tracking-wide bg-gradient-to-r from-orange-600 via-orange-500 to-purple-600 hover:brightness-110 shadow-[0_0_18px_rgba(249,115,22,0.45)]',
  },
  outline: {
    className:
      'text-purple-200 border border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 hover:text-white font-display tracking-wide',
  },
  ghost: {
    className: 'text-muted-foreground hover:text-white font-display tracking-wide',
  },
  dark: {
    className:
      'text-purple-100 bg-[#14102a] border border-purple-500/40 hover:border-orange-500/70 hover:text-white font-display tracking-wide',
  },
}

const PixelButton = ({ children, tone = 'primary', className = '', ...props }) => {
  const toneConfig = TONES[tone] || TONES.primary
  return (
    <Button className={`pixel-corners-sm ${toneConfig.className} ${className}`} {...props}>
      {children}
    </Button>
  )
}

export default PixelButton
