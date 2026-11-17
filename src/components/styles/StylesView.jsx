'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import STYLES_DATA from '@/lib/constants'
import useShop from '@/store/useShop'
import GradientText from '@/components/motion/GradientText'
import PixelButton from '@/components/motion/PixelButton'
import Reveal from '@/components/motion/Reveal'

// Страница «13 стилей»: витрина фирменных градиентов + галерея пиксель-спрайтов

const SPRITES = ['hoodie', 'tshirt', 'jacket', 'pants', 'dress', 'sneaker', 'boot', 'cap', 'backpack', 'sunglasses', 'watch']
const COLORWAYS = ['violet', 'orange', 'blue', 'lilac', 'night']

const StylesView = () => {
  const accentStyle = useShop((state) => state.accentStyle)
  const setAccentStyle = useShop((state) => state.setAccentStyle)
  const styles = STYLES_DATA.STYLES

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Reveal className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">
          <GradientText styleIndex={2}>13 СТИЛЕЙ</GradientText>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Фирменная система градиентов PIXART: чёрный, синий, фиолетовый, светло-фиолетовый, оранжевый и светло-оранжевый
          в 13 комбинациях. Активируй стиль — он подсветит логотип магазина.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {styles.map((style, index) => {
          const isActive = accentStyle === style.id
          return (
            <motion.button
              key={style.id}
              type="button"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: (index % 4) * 0.06 }}
              whileHover={{ y: -6 }}
              onClick={() => setAccentStyle(style.id)}
              className={`group pixel-corners relative overflow-hidden p-5 text-left transition-shadow ${
                isActive ? 'ring-2 ring-orange-400' : ''
              }`}
              style={{ background: `linear-gradient(135deg, ${style.colors[0]}, ${style.colors[1]}, ${style.colors[2]})` }}
              aria-pressed={isActive}
              aria-label={`Стиль ${style.id + 1}: ${style.name}`}
            >
              <span className="animate-gradient-x absolute inset-0 opacity-40" aria-hidden
                style={{ background: `linear-gradient(120deg, transparent 30%, ${style.accent} 50%, transparent 70%)`, backgroundSize: '220% 220%' }}
              />
              <span className="relative block">
                <span className="font-display text-xs text-white/60">STYLE {String(style.id + 1).padStart(2, '0')}</span>
                <span className="mt-1 block font-display text-xl font-bold text-white drop-shadow">{style.name}</span>
                <span className="mt-3 flex gap-1.5">
                  {style.colors.map((color, colorIndex) => (
                    <span key={`${color}-${colorIndex}`} className="h-4 w-4 rounded-sm border border-white/30" style={{ background: color }} aria-hidden />
                  ))}
                  <span className="h-4 w-4 rounded-sm border border-white/30" style={{ background: style.accent }} aria-hidden />
                </span>
                <span className="mt-3 flex items-center justify-between">
                  <span className="font-display text-[11px] text-white/70">{style.accent.toUpperCase()}</span>
                  {isActive ? (
                    <span className="pixel-corners-sm flex items-center gap-1 bg-orange-500 px-2 py-0.5 font-display text-xs text-white animate-pop">
                      <Check className="h-3 w-3" aria-hidden /> АКТИВЕН
                    </span>
                  ) : (
                    <span className="font-display text-[11px] text-white/50 transition-colors group-hover:text-orange-300">
                      активировать →
                    </span>
                  )}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>

      <Reveal className="mt-14">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Пиксель-спрайты коллекции
          <span className="ml-3 text-orange-500 animate-blink">▚</span>
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Все товары рисуются пиксель-арт спрайтами в 5 цветовых схемах — это и есть фото товаров
        </p>
      </Reveal>

      <div className="scrollbar-pixel pixel-corners mt-6 max-h-96 overflow-y-auto border border-purple-500/25 bg-card/60 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SPRITES.map((sprite) =>
            COLORWAYS.map((colorway) => (
              <figure key={`${sprite}-${colorway}`} className="group relative overflow-hidden rounded-sm">
                <img
                  src={`/products/${sprite}-${colorway}-1.svg`}
                  alt={`Пиксель-спрайт ${sprite}, схема ${colorway}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover image-pixelated transition-transform duration-300 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center font-display text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                  {sprite} · {colorway}
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default StylesView
