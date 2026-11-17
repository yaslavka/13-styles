'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Palette, Gamepad2 } from 'lucide-react'
import PixelButton from '@/components/motion/PixelButton'
import GradientText from '@/components/motion/GradientText'
import useShop from '@/store/useShop'

// Hero-секция: крупный переливающийся градиентный текст, парящие пиксель-товары, возраст 16–50

const FLOATING_ITEMS = [
  { src: '/products/hoodie-violet-1.svg', className: 'left-[2%] top-[16%] w-28 lg:w-36', delay: '0s' },
  { src: '/products/sneaker-orange-1.svg', className: 'right-[3%] top-[24%] w-32 lg:w-40', delay: '1.2s' },
  { src: '/products/dress-lilac-1.svg', className: 'left-[8%] bottom-[4%] w-24 lg:w-32', delay: '2s' },
  { src: '/products/backpack-blue-1.svg', className: 'right-[10%] bottom-[8%] w-24 lg:w-28', delay: '0.6s' },
]

const HERO_WORDS = ['ОДЕЖДА', 'ОБУВЬ', 'АКСЕССУАРЫ']

const Hero = () => {
  const navigate = useShop((state) => state.navigate)

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-14 sm:px-6 sm:pt-20" aria-label="PIXART MARKET — главный экран">
      {FLOATING_ITEMS.map((item) => (
        <motion.img
          key={item.src}
          src={item.src}
          alt=""
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.85, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className={`pointer-events-none absolute hidden animate-float-y image-pixelated drop-shadow-[0_0_28px_rgba(139,92,246,0.45)] md:block ${item.className}`}
          style={{ animationDelay: item.delay }}
        />
      ))}

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex flex-wrap items-center justify-center gap-2"
        >
          <span className="pixel-corners-sm inline-flex items-center gap-1.5 border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 font-display text-xs text-purple-200">
            <Gamepad2 className="h-3.5 w-3.5 text-orange-400" aria-hidden />
            8-BIT SHOP UNIVERSE
          </span>
          <span className="pixel-corners-sm inline-flex items-center gap-1.5 border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 font-display text-xs text-orange-300">
            <Palette className="h-3.5 w-3.5" aria-hidden />
            13 ГРАДИЕНТНЫХ СТИЛЕЙ
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 font-display text-5xl font-bold leading-[1.05] sm:text-7xl lg:text-8xl"
        >
          <GradientText styleIndex={2}>PIXART</GradientText>
          <br />
          <GradientText styleIndex={4}>MARKET</GradientText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mx-auto mt-5 max-w-xl text-balance text-base text-purple-100/80 sm:text-lg"
        >
          Маркетплейс одежды, обуви и аксессуаров в пиксель-арт стилистике.
          Для подростков от 16 и взрослых до 50 — кто живёт в ритме ретро-игр.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.34 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <PixelButton tone="primary" className="h-12 px-7 text-base" onClick={() => navigate('catalog')}>
            В каталог
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </PixelButton>
          <PixelButton tone="outline" className="h-12 px-7 text-base" onClick={() => navigate('styles')}>
            13 стилей
          </PixelButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-display text-sm text-purple-300/80"
        >
          {HERO_WORDS.map((word, index) => (
            <span key={word} className="flex items-center gap-2">
              {index > 0 ? <span className="text-orange-500 animate-blink">▚</span> : null}
              {word}
            </span>
          ))}
          <span className="pixel-corners-sm border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-display text-xs text-orange-300">
            16–50
          </span>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
