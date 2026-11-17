'use client'

import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryCards from '@/components/home/CategoryCards'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import Advantages from '@/components/home/Advantages'
import Reveal from '@/components/motion/Reveal'
import GradientText from '@/components/motion/GradientText'
import PixelButton from '@/components/motion/PixelButton'
import useShop from '@/store/useShop'

// Главная страница: полностью анимированная витрина маркетплейса

const HomeView = ({ initialProducts, initialCategories }) => {
  const navigate = useShop((state) => state.navigate)

  return (
    <>
      <Hero />
      <Marquee />
      <CategoryCards categories={initialCategories} />
      <FeaturedProducts products={initialProducts} />

      <Reveal className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="pixel-corners relative overflow-hidden border border-purple-500/30 p-8 text-center sm:p-12" style={{ background: 'linear-gradient(120deg, #141126, #4c1d95 45%, #ea580c)' }}>
          <span className="animate-gradient-x absolute inset-0 opacity-30" aria-hidden style={{ background: 'linear-gradient(120deg, transparent 25%, #c4b5fd 50%, transparent 75%)', backgroundSize: '220% 220%' }} />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              <GradientText styleIndex={7}>Скидки пиксельного сезона</GradientText>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-purple-100/85 sm:text-base">
              До 30% на худи, кроссовки и рюкзаки коллекции NEO. Промокод внедрён в цены — просто добавляй в корзину.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <PixelButton tone="orange" className="h-12 px-8" onClick={() => navigate('catalog', { query: { discount: '1' } })}>
                Товары со скидкой
              </PixelButton>
              <PixelButton tone="dark" className="h-12 px-8" onClick={() => navigate('styles')}>
                13 стилей бренда
              </PixelButton>
            </div>
          </div>
        </div>
      </Reveal>

      <Advantages />
    </>
  )
}

export default HomeView
