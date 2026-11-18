'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import { STYLES as STYLE_LIST } from '@/lib/constants'
import SmartImage from '@/components/product/SmartImage'
import GradientText from '@/components/motion/GradientText'
import Reveal from '@/components/motion/Reveal'

// Страница «13 Styles»: витрина фирменных градиентов + галерея мультяшных рендеров коллекции

const PRODUCT_SLUGS = [
  'hoodie-neo-violet', 'tshirt-drip-orange', 'bomber-cyber-blue', 'jeans-grid-blue',
  'dress-neon-violet', 'hoodie-pastel-lilac', 'crop-chic-lilac', 'jacket-retro-orange',
  'sneakers-run-orange', 'sneakers-force-blue', 'boots-urban-night', 'hightops-storm-violet',
  'cap-drip-orange', 'backpack-data-violet', 'sunglasses-cyber-blue', 'watch-time-orange',
]

const StylesView = () => {
  const accentStyle = useShop((state) => state.accentStyle)
  const setAccentStyle = useShop((state) => state.setAccentStyle)
  const t = useT()

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Reveal className="mb-10 text-center">
        <h1 className="font-display text-5xl font-extrabold sm:text-6xl">
          <GradientText styleIndex={2}>{t('styles.title')}</GradientText>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-muted-foreground">
          {t('styles.subtitle')}
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STYLE_LIST.map((style, index) => {
          const isActive = accentStyle === style.id
          return (
            <motion.button
              key={style.id}
              type="button"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: (index % 4) * 0.06 }}
              whileHover={{ y: -8 }}
              onClick={() => setAccentStyle(style.id)}
              className={`group glow-frame relative overflow-hidden rounded-[1.6rem] p-6 text-left transition-shadow ${
                isActive ? 'ring-2 ring-orange-400' : ''
              }`}
              style={{ background: `linear-gradient(135deg, ${style.colors[0]}, ${style.colors[1]}, ${style.colors[2]})` }}
              aria-pressed={isActive}
              aria-label={`${t('styles.styleLabel', { number: style.id + 1 })}: ${style.name}`}
            >
              <span className="animate-gradient-x absolute inset-0 opacity-40" aria-hidden
                style={{ background: `linear-gradient(120deg, transparent 30%, ${style.accent} 50%, transparent 70%)`, backgroundSize: '220% 220%' }}
              />
              <span className="relative block">
                <span className="font-display text-xs font-bold tracking-wider text-white/65">
                  {t('styles.styleLabel', { number: String(style.id + 1).padStart(2, '0') })}
                </span>
                <span className="mt-1.5 block font-display text-2xl font-extrabold text-white drop-shadow-md">{style.name}</span>
                <span className="mt-4 flex gap-2">
                  {style.colors.map((color, colorIndex) => (
                    <span key={`${color}-${colorIndex}`} className="h-5 w-5 rounded-full border border-white/35 shadow-inner" style={{ background: color }} aria-hidden />
                  ))}
                  <span className="h-5 w-5 rounded-full border border-white/35" style={{ background: style.accent }} aria-hidden />
                </span>
                <span className="mt-4 flex items-center justify-between">
                  <span className="font-display text-xs font-bold text-white/70">{style.accent.toUpperCase()}</span>
                  {isActive ? (
                    <span className="glass-btn glass-btn-orange flex items-center gap-1 rounded-full px-3 py-1 font-display text-xs font-bold text-white animate-pop">
                      <Check className="h-3 w-3" aria-hidden /> {t('styles.active')}
                    </span>
                  ) : (
                    <span className="font-display text-xs font-bold text-white/55 transition-colors group-hover:text-orange-200">
                      {t('styles.activate')}
                    </span>
                  )}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>

      <Reveal className="mt-16">
        <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{t('styles.galleryTitle')}</h2>
        <p className="mt-2 text-base font-semibold text-muted-foreground">{t('styles.galleryText')}</p>
      </Reveal>

      <div className="scrollbar-glass glass-panel mt-7 max-h-96 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {PRODUCT_SLUGS.map((slug) =>
            [1, 2, 3].map((shot) => (
              <figure key={`${slug}-${shot}`} className="group relative overflow-hidden rounded-2xl">
                <SmartImage
                  src={`/products/${slug}-${shot}.png`}
                  alt={t('styles.spriteAlt', { sprite: slug.split('-')[0], colorway: slug.split('-').pop() })}
                  className="aspect-square w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </figure>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default StylesView
