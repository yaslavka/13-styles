'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Star } from 'lucide-react'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'

// Hero-секция: крупный переливающийся текст, парящие мультяшные товары, возраст 16–50

const FLOATING_ITEMS = [
  { src: '/products/hoodie-neo-violet-1.png', className: 'left-[1%] top-[14%] w-32 lg:w-44', delay: '0s' },
  { src: '/products/sneakers-run-orange-1.png', className: 'right-[2%] top-[22%] w-36 lg:w-48', delay: '1.4s' },
  { src: '/products/dress-neon-violet-1.png', className: 'left-[7%] bottom-[2%] w-28 lg:w-36', delay: '2.2s' },
  { src: '/products/backpack-data-violet-1.png', className: 'right-[9%] bottom-[4%] w-28 lg:w-36', delay: '0.8s' },
]

const Hero = () => {
  const navigate = useShop((state) => state.navigate)
  const t = useT()

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-16 sm:px-6 sm:pt-24" aria-label="13 STYLES — main screen">
      {FLOATING_ITEMS.map((item) => (
        <motion.img
          key={item.src}
          src={item.src}
          alt=""
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.95, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.4 }}
          className={`pointer-events-none absolute hidden animate-float-y rounded-3xl shadow-[0_24px_60px_rgba(109,40,217,0.45)] md:block ${item.className}`}
          style={{ animationDelay: item.delay }}
        />
      ))}

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex flex-wrap items-center justify-center gap-2.5"
        >
          <span className="glass-btn glass-btn-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-xs font-bold tracking-wide text-purple-200">
            <Sparkles className="h-3.5 w-3.5 text-orange-300" aria-hidden />
            {t('hero.badge1')}
          </span>
          <span className="glass-btn glass-btn-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-xs font-bold tracking-wide text-orange-200">
            <Star className="h-3.5 w-3.5" aria-hidden />
            {t('hero.badge2')}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-7 font-display text-6xl font-extrabold leading-[0.98] sm:text-8xl lg:text-9xl"
        >
          <GradientText styleIndex={2}>{t('hero.title1')}</GradientText>
          <br />
          <GradientText styleIndex={4}>{t('hero.title2')}</GradientText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mx-auto mt-6 max-w-xl text-pretty text-lg font-semibold text-purple-100/85"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.34 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
        >
          <GlassButton tone="primary" className="h-13 px-8 text-lg" onClick={() => navigate('catalog')}>
            {t('hero.cta1')}
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
          </GlassButton>
          <GlassButton tone="ghost" className="h-13 px-8 text-lg" onClick={() => navigate('styles')}>
            {t('hero.cta2')}
          </GlassButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-display text-base font-bold tracking-wide text-purple-300/80"
        >
          {[t('hero.word1'), t('hero.word2'), t('hero.word3')].map((word, index) => (
            <span key={word} className="flex items-center gap-3">
              {index > 0 ? <span className="h-2 w-2 rounded-full bg-orange-500 animate-blink" aria-hidden /> : null}
              {word}
            </span>
          ))}
          <span className="rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 font-display text-sm font-bold text-orange-300">
            {t('hero.age')}
          </span>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
